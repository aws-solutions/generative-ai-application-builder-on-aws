/**********************************************************************************************************************
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.                                                *
 *                                                                                                                    *
 *  Licensed under the Apache License, Version 2.0 (the "License"). You may not use this file except in compliance    *
 *  with the License. A copy of the License is located at                                                             *
 *                                                                                                                    *
 *      http://www.apache.org/licenses/LICENSE-2.0                                                                    *
 *                                                                                                                    *
 *  or in the 'license' file accompanying this file. This file is distributed on an 'AS IS' BASIS, WITHOUT WARRANTIES *
 *  OR CONDITIONS OF ANY KIND, express or implied. See the License for the specific language governing permissions    *
 *  and limitations under the License.                                                                                *
 **********************************************************************************************************************/

import { injectLambdaContext } from '@aws-lambda-powertools/logger/middleware';
import { logMetrics } from '@aws-lambda-powertools/metrics/middleware';
import { captureLambdaHandler } from '@aws-lambda-powertools/tracer/middleware';
import middy from '@middy/core';
import { APIGatewayEvent } from 'aws-lambda';
import {
    CaseCommand,
    CreateUseCaseCommand,
    DeleteUseCaseCommand,
    ListUseCasesCommand,
    PermanentlyDeleteUseCaseCommand,
    Status,
    UpdateUseCaseCommand
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

const commands: Map<string, CaseCommand> = new Map<string, CaseCommand>();
commands.set('create', new CreateUseCaseCommand());
commands.set('update', new UpdateUseCaseCommand());
commands.set('delete', new DeleteUseCaseCommand());
commands.set('permanentlyDelete', new PermanentlyDeleteUseCaseCommand());
commands.set('list', new ListUseCasesCommand());

export const lambdaHandler = async (event: APIGatewayEvent) => {
    checkEnv();

    let stackAction: string;

    // Routing the request to the correct action
    if (event.resource == '/deployments' && event.httpMethod == 'GET') {
        stackAction = 'list';
    } else if (event.resource == '/deployments' && event.httpMethod == 'POST') {
        stackAction = 'create';
    } else if (event.resource == '/deployments/{useCaseId}' && event.httpMethod == 'PATCH') {
        stackAction = 'update';
    } else if (event.resource == '/deployments/{useCaseId}' && event.httpMethod == 'DELETE') {
        if (event.queryStringParameters?.permanent === 'true') {
            stackAction = 'permanentlyDelete';
        } else {
            stackAction = 'delete';
        }
    } else {
        logger.error(`Invalid HTTP method: ${event.httpMethod}, at resource: ${event.resource}`);
        throw new Error(`Invalid HTTP method: ${event.httpMethod}, at resource: ${event.resource}`);
    }

    const command = commands.get(stackAction);
    if (!command) {
        logger.error(`Invalid action: ${stackAction}`);
        throw new Error(`Invalid action: ${stackAction}`);
    }
    try {
        const response = await command.execute(adaptEvent(event, stackAction));

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

export const adaptEvent = (event: APIGatewayEvent, stackAction: string): UseCase | ListUseCasesAdapter => {
    if (stackAction === 'list') {
        return new ListUseCasesAdapter(event);
    } else if (stackAction === 'delete' || stackAction === 'permanentlyDelete') {
        return new ChatUseCaseInfoAdapter(event);
    }

    // Parse the event body
    const eventBody = JSON.parse(event.body || '{}');
    const useCaseType = eventBody.UseCaseType;

    // Create the appropriate adapter based on UseCaseType
    switch (useCaseType) {
        case UseCaseTypeFromApiEvent.TEXT:
            return new ChatUseCaseDeploymentAdapter(event);
        case UseCaseTypeFromApiEvent.AGENT:
            return new AgentUseCaseDeploymentAdapter(event);
        default:
            throw new Error(`Unsupported UseCaseType: ${useCaseType}`);
    }
};

export const handler = middy(lambdaHandler).use([
    captureLambdaHandler(tracer),
    injectLambdaContext(logger),
    logMetrics(metrics)
]);
