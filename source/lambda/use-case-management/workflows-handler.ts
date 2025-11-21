// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { injectLambdaContext } from '@aws-lambda-powertools/logger/middleware';
import { logMetrics } from '@aws-lambda-powertools/metrics/middleware';
import { captureLambdaHandler } from '@aws-lambda-powertools/tracer/middleware';
import middy from '@middy/core';
import { APIGatewayEvent } from 'aws-lambda';
import {
    CreateUseCaseCommand,
    DeleteUseCaseCommand,
    PermanentlyDeleteUseCaseCommand,
    UpdateUseCaseCommand,
    GetUseCaseCommand
} from './model/commands/use-case-command';
import { ListUseCasesAdapter } from './model/list-use-cases';
import { UseCase } from './model/use-case';
import { logger, metrics, tracer } from './power-tools-init';
import { getRootResourceId, parseEventBody, checkEnv, handleLambdaError } from './utils/utils';
import { formatResponse } from './utils/http-response-formatters';
import {
    WorkflowUseCaseDeploymentAdapter,
    WorkflowUseCaseInfoAdapter
} from './model/adapters/workflow-use-case-adapter';
import { AGENT_CORE_DEPLOYMENT_REQUIRED_ENV_VARS, Status, UseCaseTypeFromApiEvent } from './utils/constants';
import { GetUseCaseAdapter } from './model/get-use-case';
import { CaseCommand } from './model/commands/case-command';
import { ListWorkflowCommand } from './model/commands/workflow-command';

const commands: Map<string, CaseCommand> = new Map<string, CaseCommand>();
commands.set('create', new CreateUseCaseCommand());
commands.set('update', new UpdateUseCaseCommand());
commands.set('delete', new DeleteUseCaseCommand());
commands.set('permanentlyDelete', new PermanentlyDeleteUseCaseCommand());
commands.set('list', new ListWorkflowCommand());
commands.set('get', new GetUseCaseCommand());

const routeMap = new Map([
    ['GET:/deployments/workflows', 'list'],
    ['POST:/deployments/workflows', 'create'],
    ['GET:/deployments/workflows/{useCaseId}', 'get'],
    ['PATCH:/deployments/workflows/{useCaseId}', 'update'],
    ['DELETE:/deployments/workflows/{useCaseId}', 'delete']
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

export const workflowsLambdaHandler = async (event: APIGatewayEvent) => {
    checkEnv(AGENT_CORE_DEPLOYMENT_REQUIRED_ENV_VARS);

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
        const workflowAction = event.httpMethod && event.resource ? `${event.httpMethod}:${event.resource}` : 'unknown';
        return handleLambdaError(error, workflowAction, 'Workflow');
    }
};

export const adaptEvent = async (
    event: APIGatewayEvent,
    stackAction: string
): Promise<UseCase | ListUseCasesAdapter | GetUseCaseAdapter> => {
    if (stackAction === 'list') {
        return new ListUseCasesAdapter(event);
    } else if (stackAction === 'delete' || stackAction === 'permanentlyDelete') {
        return new WorkflowUseCaseInfoAdapter(event);
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
    if (useCaseType !== UseCaseTypeFromApiEvent.WORKFLOW) {
        throw new Error(`Unsupported UseCaseType: ${useCaseType}`);
    }
    return new WorkflowUseCaseDeploymentAdapter(event, rootResourceId);
};

export const workflowsHandler = middy(workflowsLambdaHandler).use([
    captureLambdaHandler(tracer),
    injectLambdaContext(logger),
    logMetrics(metrics)
]);