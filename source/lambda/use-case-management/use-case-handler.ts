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

export const lambdaHandler = async (event: APIGatewayEvent) => {
    checkEnv();

    const stackAction = getStackAction(event, routeMap);
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
        const mcpAction = event.httpMethod && event.resource ? `${event.httpMethod}:${event.resource}` : 'unknown';
        return handleLambdaError(error, mcpAction, 'Usecase');
    }
};

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
