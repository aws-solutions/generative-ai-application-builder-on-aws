// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { injectLambdaContext } from '@aws-lambda-powertools/logger/middleware';
import { logMetrics } from '@aws-lambda-powertools/metrics/middleware';
import { captureLambdaHandler } from '@aws-lambda-powertools/tracer/middleware';
import middy from '@middy/core';
import { APIGatewayEvent } from 'aws-lambda';
import { randomUUID } from 'crypto';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
    AdminAddUserToGroupCommand,
    AdminCreateUserCommand,
    AdminUpdateUserAttributesCommand,
    CognitoIdentityProviderClient
} from '@aws-sdk/client-cognito-identity-provider';
import { DynamoDBDocumentClient, PutCommand, ScanCommand } from '@aws-sdk/lib-dynamodb';
import { AWSClientManager } from 'aws-sdk-lib';
import { logger, metrics, tracer } from './power-tools-init';
import { checkEnv, handleLambdaError, parseEventBody } from './utils/utils';
import { formatResponse } from './utils/http-response-formatters';
import {
    CUSTOMER_ADMIN_GROUP_NAME,
    CUSTOMER_USER_GROUP_NAME,
    PLATFORM_ADMIN_GROUP_NAME,
    TENANTS_REQUIRED_ENV_VARS,
    TENANTS_TABLE_NAME_ENV_VAR,
    USER_POOL_ID_ENV_VAR
} from './utils/constants';

type Role = 'customer_admin' | 'customer_user';

const isPlatformAdmin = (event: APIGatewayEvent): boolean => {
    const ctx: any = event.requestContext?.authorizer ?? {};
    const groupsRaw = ctx.Groups;
    if (!groupsRaw) return false;
    try {
        const groups = JSON.parse(groupsRaw);
        return Array.isArray(groups) && groups.includes(PLATFORM_ADMIN_GROUP_NAME);
    } catch {
        // fallback: comma separated
        return String(groupsRaw).split(',').map((s) => s.trim()).includes(PLATFORM_ADMIN_GROUP_NAME);
    }
};

const getTenantIdFromAuthorizer = (event: APIGatewayEvent): string | undefined => {
    const ctx: any = event.requestContext?.authorizer ?? {};
    const tenantId = ctx.TenantId;
    return tenantId ? String(tenantId) : undefined;
};

const ddbDoc = () => DynamoDBDocumentClient.from(AWSClientManager.getServiceClient<DynamoDBClient>('dynamodb', tracer));
const cognito = () =>
    AWSClientManager.getServiceClient<CognitoIdentityProviderClient>('cognito', tracer);

const ok = (body: any) => formatResponse(body);
const badRequest = (message: string) => ({
    statusCode: 400,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message })
});
const conflict = (message: string) => ({
    statusCode: 409,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message })
});

const usernameFromEmailPrefix = (email: string): string => {
    const raw = email.trim().toLowerCase();
    const prefix = raw.includes('@') ? raw.split('@')[0] : raw;
    return prefix;
};

const sanitizeUsername = (username: string): string => {
    // Keep it simple and predictable. Cognito usernames support more chars, but we choose a conservative set.
    // Replace anything outside [a-z0-9._-] with '-'.
    const cleaned = username
        .trim()
        .toLowerCase()
        .replace(/@/g, '') // never allow email format
        .replace(/[^a-z0-9._-]+/g, '-')
        .replace(/^-+/, '')
        .replace(/-+$/, '');
    return cleaned.length <= 128 ? cleaned : cleaned.slice(0, 128);
};

export const tenantsLambdaHandler = async (event: APIGatewayEvent) => {
    checkEnv(TENANTS_REQUIRED_ENV_VARS);

    const routeKey = `${event.httpMethod}:${event.resource}`;

    try {
        // Customer/admin: identity endpoint
        if (routeKey === 'GET:/portal/me') {
            return ok({
                userId: (event.requestContext?.authorizer as any)?.UserId ?? null,
                email: (event.requestContext?.authorizer as any)?.Email ?? null,
                tenantId: getTenantIdFromAuthorizer(event) ?? null,
                groups: (() => {
                    const raw = (event.requestContext?.authorizer as any)?.Groups;
                    if (!raw) return [];
                    try {
                        return JSON.parse(raw);
                    } catch {
                        return String(raw).split(',').map((s) => s.trim()).filter(Boolean);
                    }
                })()
            });
        }

        // Admin-only endpoints
        if (!isPlatformAdmin(event)) {
            return {
                statusCode: 403,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: 'Forbidden' })
            };
        }

        if (routeKey === 'POST:/platform/tenants') {
            const body = parseEventBody(event);
            const name = String(body?.name ?? '').trim();
            const slug = String(body?.slug ?? '').trim().toLowerCase();
            if (!name || !slug) {
                return {
                    statusCode: 400,
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ message: 'name and slug are required' })
                };
            }

            const tenantId = randomUUID();
            const now = new Date().toISOString();
            await ddbDoc().send(
                new PutCommand({
                    TableName: process.env[TENANTS_TABLE_NAME_ENV_VAR]!,
                    Item: {
                        tenantId,
                        name,
                        slug,
                        status: 'ACTIVE',
                        createdAt: now,
                        updatedAt: now
                    },
                    ConditionExpression: 'attribute_not_exists(tenantId)'
                })
            );

            return ok({ tenantId, name, slug, status: 'ACTIVE', createdAt: now });
        }

        if (routeKey === 'GET:/platform/tenants') {
            const resp = await ddbDoc().send(
                new ScanCommand({
                    TableName: process.env[TENANTS_TABLE_NAME_ENV_VAR]!,
                    Limit: 100
                })
            );
            return ok({ items: resp.Items ?? [] });
        }

        if (routeKey === 'POST:/platform/tenants/{tenantId}/users') {
            const tenantId = event.pathParameters?.tenantId;
            if (!tenantId) {
                return badRequest('tenantId path parameter is required');
            }

            const body = parseEventBody(event);
            const email = String(body?.email ?? '').trim().toLowerCase();
            const role = String(body?.role ?? '').trim() as Role;
            const requestedUsername = body?.username ? String(body.username) : '';
            if (!email || !['customer_admin', 'customer_user'].includes(role)) {
                return badRequest('email and role (customer_admin|customer_user) are required');
            }

            const userPoolId = process.env[USER_POOL_ID_ENV_VAR]!;
            // Username cannot be an email when email aliases are enabled. Users will sign in with email.
            // We use a readable username derived from the email prefix by default, but admins can override it.
            let usernameBase = requestedUsername.trim().length > 0 ? requestedUsername : usernameFromEmailPrefix(email);
            if (usernameBase.includes('@')) {
                return badRequest('username must not be an email address');
            }
            usernameBase = sanitizeUsername(usernameBase);
            if (!usernameBase) {
                return badRequest('username is invalid');
            }

            try {
                // Handle rare collisions (same username requested for different emails).
                // Retry a couple times with a suffix.
                let createdUsername = usernameBase;
                for (let attempt = 0; attempt < 3; attempt++) {
                    try {
                        await cognito().send(
                            new AdminCreateUserCommand({
                                UserPoolId: userPoolId,
                                Username: createdUsername,
                                DesiredDeliveryMediums: ['EMAIL'],
                                UserAttributes: [
                                    { Name: 'email', Value: email },
                                    { Name: 'email_verified', Value: 'true' }
                                ]
                            })
                        );
                        usernameBase = createdUsername;
                        break;
                    } catch (inner: any) {
                        const innerName = inner?.name ?? inner?.code;
                        if (innerName === 'UsernameExistsException') {
                            const suffix = randomUUID().split('-')[0];
                            createdUsername = sanitizeUsername(`${usernameBase}-${suffix}`);
                            continue;
                        }
                        throw inner;
                    }
                }
            } catch (e: any) {
                const name = e?.name ?? e?.code;
                // If this email already exists (email alias is unique), surface a clear response for the UI.
                if (name === 'AliasExistsException' || name === 'UsernameExistsException') {
                    return conflict('A user with this email already exists.');
                }
                if (name === 'InvalidParameterException') {
                    return badRequest(e?.message ?? 'Invalid request');
                }
                throw e;
            }

            await cognito().send(
                new AdminUpdateUserAttributesCommand({
                    UserPoolId: userPoolId,
                    Username: usernameBase,
                    UserAttributes: [{ Name: 'custom:tenant_id', Value: tenantId }]
                })
            );

            const groupName = role === 'customer_admin' ? CUSTOMER_ADMIN_GROUP_NAME : CUSTOMER_USER_GROUP_NAME;
            await cognito().send(
                new AdminAddUserToGroupCommand({
                    UserPoolId: userPoolId,
                    Username: usernameBase,
                    GroupName: groupName
                })
            );

            return ok({ username: usernameBase, email, tenantId, role, groupName });
        }

        return {
            statusCode: 404,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: `No route for ${routeKey}` })
        };
    } catch (error: unknown) {
        const action = event.httpMethod && event.resource ? `${event.httpMethod}:${event.resource}` : 'unknown';
        return handleLambdaError(error, action, 'Tenant');
    }
};

export const tenantsHandler = middy(tenantsLambdaHandler).use([
    captureLambdaHandler(tracer),
    injectLambdaContext(logger),
    logMetrics(metrics)
]);


