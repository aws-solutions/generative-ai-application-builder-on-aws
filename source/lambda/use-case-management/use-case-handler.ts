// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { injectLambdaContext } from '@aws-lambda-powertools/logger/middleware';
import { logMetrics } from '@aws-lambda-powertools/metrics/middleware';
import { captureLambdaHandler } from '@aws-lambda-powertools/tracer/middleware';
import middy from '@middy/core';
import { APIGatewayEvent } from 'aws-lambda';
import { CaseCommand } from './model/commands/case-command';
import {
    CreateUseCaseCommand,
    DeleteUseCaseCommand,
    ListUseCasesCommand,
    PermanentlyDeleteUseCaseCommand,
    UpdateUseCaseCommand,
    GetUseCaseCommand
} from './model/commands/use-case-command';
import { ListUseCasesAdapter } from './model/list-use-cases';
import { UseCase } from './model/use-case';
import { logger, metrics, tracer } from './power-tools-init';
import { checkEnv, handleLambdaError, getRootResourceId, parseEventBody, getStackAction } from './utils/utils';
import { formatResponse } from './utils/http-response-formatters';
import { ChatUseCaseDeploymentAdapter, ChatUseCaseInfoAdapter } from './model/adapters/chat-use-case-adapter';
import { AgentUseCaseDeploymentAdapter } from './model/adapters/agent-use-case-adapter';
import { Status, UseCaseTypeFromApiEvent } from './utils/constants';
import { GetUseCaseAdapter } from './model/get-use-case';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand, PutCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { AWSClientManager } from 'aws-sdk-lib';
import { VOICE_ROUTING_TABLE_NAME_ENV_VAR, USE_CASES_TABLE_NAME_ENV_VAR } from './utils/constants';
import { isPlatformAdmin } from './utils/utils';

const commands: Map<string, CaseCommand> = new Map<string, CaseCommand>();
commands.set('create', new CreateUseCaseCommand());
commands.set('update', new UpdateUseCaseCommand());
commands.set('delete', new DeleteUseCaseCommand());
commands.set('permanentlyDelete', new PermanentlyDeleteUseCaseCommand());
commands.set('list', new ListUseCasesCommand());
commands.set('get', new GetUseCaseCommand());

const routeMap = new Map([
    ['GET:/deployments', 'list'],
    ['POST:/deployments', 'create'],
    ['GET:/deployments/{useCaseId}', 'get'],
    ['PATCH:/deployments/{useCaseId}', 'update'],
    ['DELETE:/deployments/{useCaseId}', 'delete'],
    ['POST:/deployments/{useCaseId}/channels/voice', 'assignVoice']
]);

export const lambdaHandler = async (event: APIGatewayEvent) => {
    checkEnv();

    const stackAction = getStackAction(event, routeMap);
    const command = commands.get(stackAction);

    try {
        if (stackAction === 'assignVoice') {
            const response = await assignVoiceChannel(event);
            return formatResponse(response);
        }

        if (!command) {
            logger.error(`Invalid action: ${stackAction}`);
            throw new Error(`Invalid action: ${stackAction}`);
        }

        const response = await command.execute(await adaptEvent(event, stackAction));

        // as create stack and update stack failures don't throw error, but returns a Failure response
        // to render a 500 request in the UI the following error is
        if (response === Status.FAILED) {
            throw new Error('Command execution failed');
        }
        return formatResponse(response);
    } catch (error: unknown) {
        const mcpAction = event.httpMethod && event.resource ? `${event.httpMethod}:${event.resource}` : 'unknown';
        return handleLambdaError(error, mcpAction, 'Usecase');
    }
};

const isE164 = (s: string) => /^\+[1-9]\d{6,14}$/.test(s);

async function assignVoiceChannel(event: APIGatewayEvent): Promise<any> {
    // Admin-only for now (customer portal will use different UX)
    if (!isPlatformAdmin(event)) {
        return { statusCode: 403, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message: 'Forbidden' }) };
    }

    const useCaseId = event.pathParameters?.useCaseId;
    if (!useCaseId) {
        return { statusCode: 400, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message: 'useCaseId is required' }) };
    }

    const body = parseEventBody(event);
    const phoneNumber = String(body?.phoneNumber ?? '').trim();
    if (!isE164(phoneNumber)) {
        return { statusCode: 400, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message: 'phoneNumber must be in E.164 format, e.g. +14155550123' }) };
    }

    const useCasesTable = process.env[USE_CASES_TABLE_NAME_ENV_VAR]!;
    const voiceRoutingTable = process.env[VOICE_ROUTING_TABLE_NAME_ENV_VAR]!;

    const ddbDoc = DynamoDBDocumentClient.from(AWSClientManager.getServiceClient<DynamoDBClient>('dynamodb', tracer));
    const useCase = await ddbDoc.send(
        new GetCommand({
            TableName: useCasesTable,
            Key: { UseCaseId: useCaseId }
        })
    );
    const tenantId = (useCase.Item as any)?.TenantId;
    if (!tenantId) {
        return {
            statusCode: 400,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: 'Deployment has no TenantId. Assign it to a customer before enabling voice.' })
        };
    }

    // Prevent accidental reassignment of a phone number
    const existing = await ddbDoc.send(
        new GetCommand({
            TableName: voiceRoutingTable,
            Key: { phoneNumber }
        })
    );
    if (existing.Item && ((existing.Item as any).useCaseId !== useCaseId || (existing.Item as any).tenantId !== tenantId)) {
        return {
            statusCode: 409,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: 'phoneNumber is already assigned', phoneNumber })
        };
    }

    const now = new Date().toISOString();
    await ddbDoc.send(
        new PutCommand({
            TableName: voiceRoutingTable,
            Item: {
                phoneNumber,
                tenantId,
                useCaseId,
                updatedAt: now,
                createdAt: (existing.Item as any)?.createdAt ?? now
            }
        })
    );

    // Also persist on the deployment record so the admin UI can display voice assignment after refresh.
    await ddbDoc.send(
        new UpdateCommand({
            TableName: useCasesTable,
            Key: { UseCaseId: useCaseId },
            UpdateExpression: 'SET VoicePhoneNumber = :p, UpdatedDate = :u',
            ExpressionAttributeValues: {
                ':p': phoneNumber,
                ':u': now
            }
        })
    );

    return { ok: true, phoneNumber, tenantId, useCaseId };
}

export const adaptEvent = async (
    event: APIGatewayEvent,
    stackAction: string
): Promise<UseCase | ListUseCasesAdapter | GetUseCaseAdapter> => {
    if (stackAction === 'list') {
        return new ListUseCasesAdapter(event);
    } else if (stackAction === 'delete' || stackAction === 'permanentlyDelete') {
        return new ChatUseCaseInfoAdapter(event);
    } else if (stackAction === 'get') {
        return new GetUseCaseAdapter(event);
    }

    // Parse the event body
    const eventBody = parseEventBody(event);
    const useCaseType = eventBody.UseCaseType;

    // Only get root resource ID when ExistingRestApiId is provided
    let rootResourceId;
    if (eventBody.ExistingRestApiId) {
        rootResourceId = await getRootResourceId(eventBody.ExistingRestApiId);
    }

    // Create the appropriate adapter based on UseCaseType
    switch (useCaseType) {
        case UseCaseTypeFromApiEvent.TEXT:
            return new ChatUseCaseDeploymentAdapter(event, rootResourceId);
        case UseCaseTypeFromApiEvent.AGENT:
            return new AgentUseCaseDeploymentAdapter(event, rootResourceId);
        default:
            throw new Error(`Unsupported UseCaseType: ${useCaseType}`);
    }
};

export const handler = middy(lambdaHandler).use([
    captureLambdaHandler(tracer),
    injectLambdaContext(logger),
    logMetrics(metrics)
]);
