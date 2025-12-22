// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { APIGatewayEvent } from 'aws-lambda';
import { randomUUID } from 'crypto';
import { APIGatewayClient, GetResourcesCommand } from '@aws-sdk/client-api-gateway';
import { AWSClientManager } from 'aws-sdk-lib';
import { logger, tracer } from '../power-tools-init';
import { REQUIRED_ENV_VARS, ARN_RESOURCE_REGEX_MAP, RETRY_CONFIG, MAX_INPUT_PAYLOAD_SIZE } from './constants';
import { formatError } from './http-response-formatters';
import RequestValidationError from './error';
import { parse, validate } from '@aws-sdk/util-arn-parser';

/**
 * Interface for retry settings
 */
export interface RetrySettings {
    maxRetries: number;
    backOffRate: number;
    initialDelayMs: number;
}

/**
 * Validates that required environment variables are set
 * @param requiredVars - Array of required environment variable names
 */
export const checkEnv = (requiredVars: string[] = REQUIRED_ENV_VARS) => {
    let missingVars = [];
    for (let envVar of requiredVars) {
        if (!process.env[envVar]) {
            missingVars.push(envVar);
        }
    }
    if (missingVars.length > 0) {
        const errMsg = `Missing required environment variables: ${missingVars.join(
            ', '
        )}. This should not happen and indicates an issue with your deployment.`;
        logger.error(errMsg);
        throw new Error(errMsg);
    }
};

/**
 * Retrieves the root resource ID for an API Gateway REST API
 * @param apiId - The API Gateway REST API ID
 * @returns Promise<string> - The root resource ID
 */
export async function getRootResourceId(apiId: string): Promise<string> {
    logger.debug(`Retrieving root resource ID for apiId: ${apiId}`);
    const client = AWSClientManager.getServiceClient<APIGatewayClient>('apigateway', tracer);

    try {
        // NOTE: API Gateway GetResources is paginated; root ("/") isn't guaranteed to appear on the first page.
        let position: string | undefined = undefined;
        do {
            const resp: any = await client.send(
                new GetResourcesCommand({
                    restApiId: apiId,
                    limit: 500,
                    position
                })
            );

            const rootResource = resp.items?.find((resource: any) => resource.path === '/');
            if (rootResource?.id) {
                logger.debug(`Successfully retrieved root resource ID: ${rootResource.id} for apiId: ${apiId}`);
                return rootResource.id;
            }

            position = resp.position;
        } while (position);

        const error = 'Could not find root resource';
        logger.error(`${error} for apiId: ${apiId}`);
        throw new Error(error);
    } catch (error) {
        logger.error(`Error retrieving root resource ID for apiId: ${apiId}, error: ${(error as Error).message}`);
        throw error;
    }
}

/**
 * Generic error handler for Lambda operations
 * @param error - The error that occurred
 * @param action - The action that was being performed
 * @param context - Optional context for error messages (e.g., 'MCP', 'UseCase')
 * @returns Formatted error response
 */
export const handleLambdaError = (error: unknown, action: string, context: string = ''): any => {
    const rootTraceId = tracer.getRootXrayTraceId();
    let errorMessage;
    const contextPrefix = context ? `${context} ` : '';

    if (error instanceof RequestValidationError) {
        logger.error(`Validation of ${contextPrefix} request failed with error: ${error}`);
        logger.error(
            `Error while validating ${contextPrefix} request for action: ${action}, root trace id: ${rootTraceId}`
        );
        errorMessage = `Request Validation Error - Please contact support and quote the following trace id: ${rootTraceId}`;
    } else {
        logger.error(`${contextPrefix} Management Error: ${error}`);
        logger.error(`Error while executing ${contextPrefix} action: ${action}, root trace id: ${rootTraceId}`);
        errorMessage = `Internal Error - Please contact support and quote the following trace id: ${rootTraceId}`;
    }

    return formatError({
        message: errorMessage,
        extraHeaders: { '_X_AMZN_TRACE_ID': rootTraceId as string }
    });
};

/**
 * Safely parses API Gateway event body with basic validations
 * @param event - API Gateway event
 * @returns Parsed and validated event body
 * @throws RequestValidationError if validation fails
 */
export const parseEventBody = (event: APIGatewayEvent): any => {
    const body = event.body || '{}';

    if (body.length > MAX_INPUT_PAYLOAD_SIZE) {
        logger.error(`Request body too large: ${body.length} bytes (max: ${MAX_INPUT_PAYLOAD_SIZE})`);
        throw new RequestValidationError('Request body exceeds maximum allowed size');
    }

    if (typeof body !== 'string') {
        logger.error('Request body must be a string');
        throw new RequestValidationError('Invalid request body format');
    }

    let parsed: any;
    try {
        parsed = JSON.parse(body);
    } catch (error) {
        logger.error(`Failed to parse JSON: ${(error as Error).message}`);
        throw new RequestValidationError('Invalid JSON in request body');
    }

    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
        // Validate it's an object (not primitive or array)
        throw new RequestValidationError('Invalid request format');
    }

    return parsed;
};

/**
 * Gets retry settings for DynamoDB operations
 * @returns RetrySettings object with default values
 */
export function getRetrySettings(): RetrySettings {
    return {
        maxRetries: RETRY_CONFIG.maxRetries,
        backOffRate: RETRY_CONFIG.backOffRate,
        initialDelayMs: RETRY_CONFIG.initialDelayMs
    };
}

/**
 * Delays execution for the specified number of milliseconds
 * @param delayMillis - Number of milliseconds to delay
 * @returns Promise that resolves after the delay
 */
export function delay(delayMillis: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, delayMillis));
}

/**
 * Extracts user ID from API Gateway event context
 * @param event - The API Gateway event
 * @returns The user ID from the authorizer context
 * @throws Error if authorizer context or UserId is missing
 */
export function extractUserId(event: APIGatewayEvent): string {
    if (!event.requestContext?.authorizer) {
        throw new Error('Missing authorizer context in API Gateway event');
    }

    const userId = event.requestContext.authorizer.UserId;
    if (!userId) {
        throw new Error('Missing UserId in authorizer context');
    }

    return userId;
}

/**
 * Extracts tenant id from API Gateway authorizer context (if present).
 */
export function extractTenantId(event: APIGatewayEvent): string | undefined {
    const tid = (event.requestContext?.authorizer as any)?.TenantId;
    return tid && typeof tid === 'string' && tid.length > 0 ? tid : undefined;
}

/**
 * Extracts Cognito groups from API Gateway authorizer context (stored as a JSON string).
 */
export function extractGroups(event: APIGatewayEvent): string[] {
    const raw = (event.requestContext?.authorizer as any)?.Groups;
    if (!raw || typeof raw !== 'string') return [];
    try {
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed.filter((x) => typeof x === 'string') : [];
    } catch {
        return [];
    }
}

export function isPlatformAdmin(event: APIGatewayEvent): boolean {
    return extractGroups(event).includes('admin');
}

export function isCustomerPrincipal(event: APIGatewayEvent): boolean {
    const groups = extractGroups(event);
    return groups.includes('customer_admin') || groups.includes('customer_user');
}

/**
 * Generates a UUID v4 string using the native crypto.randomUUID() method
 * @param shortUUID - Optional flag to return only the first segment of the UUID
 * @returns A UUID v4 string (full or shortened)
 */
export function generateUUID(shortUUID: boolean = false): string {
    const generatedUuid = randomUUID();
    if (shortUUID) {
        return generatedUuid.split('-')[0];
    }
    return generatedUuid;
}

const is12DigitAccount = (x?: string) => typeof x === 'string' && /^\d{12}$/.test(x);

const hasRegion = (x?: string) => typeof x === 'string' && x.length > 0;

export function isValidArnWithRegexKey(arn: string, service: string, regexKey: string): boolean {
    if (!validate(arn)) return false;

    let parsed;
    try {
        parsed = parse(arn);
    } catch {
        return false;
    }

    // Validate Arn based on Service
    if (parsed.service !== service) return false;
    // Validate Arn has region and account Id values
    if (!hasRegion(parsed.region) || !is12DigitAccount(parsed.accountId)) return false;

    const resourceRe = ARN_RESOURCE_REGEX_MAP[regexKey];
    if (!resourceRe) return false; // unknown regex key
    return resourceRe.test(parsed.resource);
}

export const getStackAction = (event: APIGatewayEvent, routeMap: Map<string, string>): string => {
    const routeKey = `${event.httpMethod}:${event.resource}`;
    const baseAction = routeMap.get(routeKey);

    if (!baseAction) {
        logger.error(`Invalid HTTP method: ${event.httpMethod}, at resource: ${event.resource}`);
        throw new Error(`Invalid HTTP method: ${event.httpMethod}, at resource: ${event.resource}`);
    }

    // Special case for permanent delete
    if (baseAction === 'delete' && event.queryStringParameters?.permanent === 'true') {
        return 'permanentlyDelete';
    }

    return baseAction;
};
