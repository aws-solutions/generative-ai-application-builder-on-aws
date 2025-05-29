// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { injectLambdaContext } from '@aws-lambda-powertools/logger/middleware';
import { logMetrics } from '@aws-lambda-powertools/metrics/middleware';
import { captureLambdaHandler } from '@aws-lambda-powertools/tracer/middleware';
import middy from '@middy/core';
import { APIGatewayEvent } from 'aws-lambda';
import { APIGatewayClient, GetResourcesCommand } from "@aws-sdk/client-api-gateway";
import {
    CaseCommand,
    CreateUseCaseCommand,
    DeleteUseCaseCommand,
    ListUseCasesCommand,
    PermanentlyDeleteUseCaseCommand,
    Status,
    UpdateUseCaseCommand,
    GetUseCaseCommand
    
} from './command';
import { ListUseCasesAdapter } from './model/list-use-cases';
import { UseCase } from './model/use-case';
import { logger, metrics, tracer } from './power-tools-init';
import { checkEnv } from './utils/check-env';
import { formatError, formatResponse } from './utils/http-response-formatters';
import RequestValidationError from './utils/error';
import { ChatUseCaseDeploymentAdapter, ChatUseCaseInfoAdapter } from './model/chat-use-case-adapter';
import { AgentUseCaseDeploymentAdapter } from './model/agent-use-case-adapter';
import { UseCaseTypeFromApiEvent } from './utils/constants';
import { GetUseCaseAdapter } from './model/get-use-case';

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
    ['DELETE:/deployments/{useCaseId}', 'delete']
]);

const getStackAction = (event: APIGatewayEvent): string => {
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

async function getRootResourceId(apiId: string): Promise<string> {
    logger.debug('Retrieving root resource ID', { apiId });
    const client = new APIGatewayClient({});
    
    try {
        const response = await client.send(
            new GetResourcesCommand({
                restApiId: apiId
            })
        );

        const rootResource = response.items?.find(resource => resource.path === '/');
        
        if (!rootResource?.id) {
            const error = 'Could not find root resource';
            logger.error(error, { apiId });
            throw new Error(error);
        }

        logger.debug('Successfully retrieved root resource ID', { 
            apiId, 
            rootResourceId: rootResource.id 
        });

        return rootResource.id;
    } catch (error) {
        logger.error('Error retrieving root resource ID', { 
            apiId, 
            error: error as Error 
        });
        throw error;
    }
}


export const lambdaHandler = async (event: APIGatewayEvent) => {
    checkEnv();

    const stackAction = getStackAction(event);
    const command = commands.get(stackAction);
    
    if (!command) {
        logger.error(`Invalid action: ${stackAction}`);
        throw new Error(`Invalid action: ${stackAction}`);
    }
    try {
        const response = await command.execute(await adaptEvent(event, stackAction));

        // as create stack and update stack failures don't throw error, but returns a Failure response
        // to render a 500 request in the UI the following error is
        if (response === Status.FAILED) {
            throw new Error('Command execution failed');
        }
        return formatResponse(response);
    } catch (error: unknown) {
        return handleError(error, stackAction);
    }
};

export const handleError = (error: unknown, stackAction: string) => {
    const rootTraceId = tracer.getRootXrayTraceId();
    let errorMessage;

    if (error instanceof RequestValidationError) {
        logger.error(`Validation of request failed with error: ${error}`);
        logger.error(`Error while validating request for action: ${stackAction}, root trace id: ${rootTraceId}`);
        errorMessage = `Request Validation Error - Please contact support and quote the following trace id: ${rootTraceId}`;
    } else {
        logger.error(`${error}`);
        logger.error(`Error while executing action: ${stackAction}, root trace id: ${rootTraceId}`);
        errorMessage = `Internal Error - Please contact support and quote the following trace id: ${rootTraceId}`;
    }
    return formatError({
        message: errorMessage,
        extraHeaders: { '_X_AMZN_TRACE_ID': rootTraceId as string }
    });
};

export const adaptEvent = async (event: APIGatewayEvent, stackAction: string): Promise<UseCase | ListUseCasesAdapter | GetUseCaseAdapter> => {
    if (stackAction === 'list') {
        return new ListUseCasesAdapter(event);
    } else if (stackAction === 'delete' || stackAction === 'permanentlyDelete') {
        return new ChatUseCaseInfoAdapter(event);
    }
    else if (stackAction === 'get') {
        return new GetUseCaseAdapter(event);
    }

    // Parse the event body
    const eventBody = JSON.parse(event.body || '{}');
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
