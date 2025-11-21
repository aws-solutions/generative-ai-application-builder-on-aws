// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { injectLambdaContext } from '@aws-lambda-powertools/logger/middleware';
import { logMetrics } from '@aws-lambda-powertools/metrics/middleware';
import { captureLambdaHandler } from '@aws-lambda-powertools/tracer/middleware';
import middy from '@middy/core';
import { APIGatewayEvent } from 'aws-lambda';
import { logger, metrics, tracer } from './power-tools-init';
import { checkEnv, handleLambdaError, getStackAction } from './utils/utils';
import { formatResponse } from './utils/http-response-formatters';
import { UploadSchemasCommand, ListMCPServersCommand } from './model/commands/mcp-command';
import { McpAdapterFactory, McpOperation } from './model/adapters/mcp-adapter';
import { Status, REQUIRED_MCP_ENV_VARS, McpOperationTypes } from './utils/constants';
import { CaseCommand } from './model/commands/case-command';

import { CreateUseCaseCommand, UpdateUseCaseCommand, DeleteUseCaseCommand, PermanentlyDeleteUseCaseCommand, GetUseCaseCommand } from './model/commands/use-case-command';
import { UseCase } from './model/use-case';
// Command registry
const mcpCommands: Map<string, CaseCommand> = new Map<string, CaseCommand>();
mcpCommands.set(McpOperationTypes.UPLOAD_SCHEMA, new UploadSchemasCommand());
mcpCommands.set(McpOperationTypes.CREATE, new CreateUseCaseCommand());
mcpCommands.set(McpOperationTypes.LIST, new ListMCPServersCommand());
mcpCommands.set(McpOperationTypes.UPDATE, new UpdateUseCaseCommand());
mcpCommands.set(McpOperationTypes.DELETE, new DeleteUseCaseCommand());
mcpCommands.set(McpOperationTypes.PERMANENTLY_DELETE, new PermanentlyDeleteUseCaseCommand());
mcpCommands.set(McpOperationTypes.GET, new GetUseCaseCommand());

const mcpRouteMap = new Map([
    ['POST:/deployments/mcp/upload-schemas', McpOperationTypes.UPLOAD_SCHEMA],
    ['POST:/deployments/mcp', McpOperationTypes.CREATE],
    ['PATCH:/deployments/mcp/{useCaseId}', McpOperationTypes.UPDATE],
    ['DELETE:/deployments/mcp/{useCaseId}', McpOperationTypes.DELETE],
    ['GET:/deployments/mcp/{useCaseId}', McpOperationTypes.GET],
    ['GET:/deployments/mcp', McpOperationTypes.LIST]
]);

/**
 * Adapts the API Gateway event to the appropriate MCP operation
 * @param event - API Gateway event
 * @param mcpAction - The MCP action to perform
 * @returns The adapted MCP operation
 */
export const adaptMcpEvent = (event: APIGatewayEvent, mcpAction: string): McpOperation | UseCase => {
    return McpAdapterFactory.createAdapter(event, mcpAction);
};

/**
 * Lambda handler for MCP operations
 * @param event - API Gateway event
 * @returns Formatted response
 */
export const mcpLambdaHandler = async (event: APIGatewayEvent) => {
    try {
        checkEnv(REQUIRED_MCP_ENV_VARS);

        const mcpAction = getStackAction(event, mcpRouteMap);
        const command = mcpCommands.get(mcpAction);

        if (!command) {
            logger.error(`Invalid MCP action: ${mcpAction}`);
            throw new Error(`Invalid MCP action: ${mcpAction}`);
        }
        const mcpOperation = adaptMcpEvent(event, mcpAction);
        const response = await command.execute(mcpOperation);

        if (response === Status.FAILED) {
            throw new Error('MCP command execution failed');
        }

        return formatResponse(response);
    } catch (error: unknown) {
        const mcpAction = event.httpMethod && event.resource ? `${event.httpMethod}:${event.resource}` : 'unknown';
        return handleLambdaError(error, mcpAction, 'MCP');
    }
};

/**
 * Middy-wrapped handler with powertools middleware
 */
export const mcpHandler = middy(mcpLambdaHandler).use([
    captureLambdaHandler(tracer),
    injectLambdaContext(logger),
    logMetrics(metrics)
]);
