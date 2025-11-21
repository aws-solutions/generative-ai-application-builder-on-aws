// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { injectLambdaContext } from '@aws-lambda-powertools/logger/middleware';
import { logMetrics } from '@aws-lambda-powertools/metrics/middleware';
import { captureLambdaHandler } from '@aws-lambda-powertools/tracer/middleware';
import { logger, tracer, metrics } from './power-tools-init';
import { FileOperationTypes, AMZN_TRACE_ID_HEADER } from './utils/constants';
import { checkEnv, extractUserId, setupMetricsDimensions } from './utils/utils';
import { FileValidator } from './validators/file-validator';
import { FileRequestFactory } from './models/files-factory';
import { formatResponse, formatError } from './utils/http-response-formatters';
import { FileUploadCommand, FileDeleteCommand, FileGetCommand, FileCommand } from './models/file-command';
import middy from '@middy/core';

// Route mapping for file operations
export const fileRouteMap = new Map([
    ['POST:/files/{useCaseId}', FileOperationTypes.UPLOAD],
    ['DELETE:/files/{useCaseId}', FileOperationTypes.DELETE],
    ['GET:/files/{useCaseId}', FileOperationTypes.DOWNLOAD]
]);

export const fileCommandsRegistry = new Map<string, FileCommand>([
    [FileOperationTypes.UPLOAD, new FileUploadCommand()],
    [FileOperationTypes.DELETE, new FileDeleteCommand()],
    [FileOperationTypes.DOWNLOAD, new FileGetCommand()]
]);

/**
 * Gets the file operation type from the API Gateway event
 * @param event - API Gateway event
 * @returns The operation type string
 */
export const getFileOperation = (event: APIGatewayProxyEvent): FileOperationTypes => {
    const routeKey = `${event.httpMethod}:${event.resource}`;
    const operation = fileRouteMap.get(routeKey);

    if (!operation) {
        logger.error(`Unsupported operation - HTTP method: ${event.httpMethod}, resource: ${event.resource}`);
        throw new Error(`Unsupported operation: ${event.httpMethod} ${event.resource}`);
    }

    if (!Object.values(FileOperationTypes).includes(operation)) {
        logger.error(`Invalid operation type: ${operation}`);
        throw new Error(`Unsupported operation: ${operation}`);
    }

    return operation;
};

/**
 * Main Lambda handler for file operations
 */
export const filesHandler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    tracer.getSegment();

    let useCaseId: string;
    const rootTraceId = tracer.getRootXrayTraceId();
    const errorMessage = `Internal Error - Please contact support and quote the following trace id: ${rootTraceId}`;

    try {
        checkEnv();

        logger.info(
            `Processing file operation request - httpMethod: ${event.httpMethod}, path: ${event.path}, resource: ${event.resource}, traceId: ${rootTraceId}`
        );

        const fileOperation = getFileOperation(event);
        const userId = extractUserId(event);

        // Parse request and extract useCaseId and useCaseRecordKey for metrics and validation
        const request = FileRequestFactory.createRequest(event, fileOperation);
        useCaseId = (request).useCaseId;

        // Validate that multimodality is enabled for this use case
        const fileValidator = new FileValidator();
        await fileValidator.validateMultimodalCapability(useCaseId);

        setupMetricsDimensions(useCaseId);

        const command = fileCommandsRegistry.get(fileOperation);
        if (!command) {
            logger.error(`No command found for operation: ${fileOperation}, traceId: ${rootTraceId}`);
            throw new Error(`Unsupported operation: ${fileOperation}`);
        }

        const response = await command.execute(request, userId);
        return formatResponse(response, 200, { [AMZN_TRACE_ID_HEADER]: rootTraceId as string });
    } catch (error) {
        if (error instanceof Error) {
            logger.error(
                `File operation failed: ${error.message}, traceId: ${rootTraceId}, useCaseId: ${useCaseId!}, errorStack: ${error.stack}`
            );
        } else {
            logger.error(`File operation failed with unknown error, traceId: ${rootTraceId}, useCaseId: ${useCaseId!}`);
        }

        return formatError({
            message: errorMessage,
            extraHeaders: { [AMZN_TRACE_ID_HEADER]: rootTraceId as string }
        });
    } finally {
        metrics.publishStoredMetrics();
    }
};

/**
 * Middy-wrapped handler with powertools middleware
 */
export const handler = middy(filesHandler).use([
    captureLambdaHandler(tracer),
    injectLambdaContext(logger),
    logMetrics(metrics)
]);
