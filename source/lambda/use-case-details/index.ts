// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { DynamoDBClient, GetItemCommand } from '@aws-sdk/client-dynamodb';
import { AWSClientManager } from 'aws-sdk-lib';
import { validateAndParseRequest, castToResponse } from './utils/utils';
import { formatError, formatResponse } from './utils/http-response-formatters';
import { logger, tracer, metrics } from './power-tools-init';
import { MetricUnit } from '@aws-lambda-powertools/metrics';
import { captureLambdaHandler } from '@aws-lambda-powertools/tracer/middleware';
import { injectLambdaContext } from '@aws-lambda-powertools/logger/middleware';
import { logMetrics } from '@aws-lambda-powertools/metrics/middleware';
import { unmarshall } from '@aws-sdk/util-dynamodb';
import middy from '@middy/core';

// Initialize DynamoDB client with retry settings
const dynamoDB = AWSClientManager.getServiceClient<DynamoDBClient>('dynamodb', tracer);

export const lambdaHandler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    try {
        const LLM_CONFIG_TABLE = process.env.LLM_CONFIG_TABLE;

        if (!LLM_CONFIG_TABLE) {
            throw new Error('LLM_CONFIG_TABLE environment variable is not set');
        }

        const useCaseConfigKey = validateAndParseRequest(event);

        const useCaseConfigCommand = new GetItemCommand({
            TableName: LLM_CONFIG_TABLE,
            Key: {
                'key': { S: useCaseConfigKey }
            }
        });

        const result = await dynamoDB.send(useCaseConfigCommand);

        if (!result.Item) {
            const rootTraceId = tracer.getRootXrayTraceId();
            logger.error(`ERROR: Configuration not found.`);
            logger.error(`Error occurred, root trace id: ${rootTraceId}`);

            metrics.addMetric('GetUseCaseConfigError', MetricUnit.Count, 1);

            return formatError({
                statusCode: 404,
                message: `Internal Error - Please contact support and quote the following trace id: ${rootTraceId}`,
                extraHeaders: { '_X_AMZN_TRACE_ID': rootTraceId as string }
            });
        }

        metrics.addMetric('GetUseCaseConfigCount', MetricUnit.Count, 1);

        const useCaseConfig = unmarshall(result.Item).config;

        const cleanedConfig = castToResponse(useCaseConfig);

        return formatResponse(JSON.stringify(cleanedConfig));
    } catch (error) {
        const rootTraceId = tracer.getRootXrayTraceId();
        logger.error(`ERROR: ${error}`);
        logger.error(`Error occurred, root trace id: ${rootTraceId}`);

        metrics.addMetric('GetUseCaseConfigError', MetricUnit.Count, 1);

        return formatError({
            statusCode: 500,
            message: `Internal Error - Please contact support and quote the following trace id: ${rootTraceId}`,
            extraHeaders: { '_X_AMZN_TRACE_ID': rootTraceId as string }
        });
    }
};

export const handler = middy(lambdaHandler).use([
    captureLambdaHandler(tracer),
    injectLambdaContext(logger),
    logMetrics(metrics)
]);
