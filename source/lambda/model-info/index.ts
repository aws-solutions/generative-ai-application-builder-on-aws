// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { injectLambdaContext } from '@aws-lambda-powertools/logger/middleware';
import { captureLambdaHandler } from '@aws-lambda-powertools/tracer/middleware';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import middy from '@middy/core';
import { APIGatewayEvent } from 'aws-lambda';
import { customAwsConfig } from 'aws-node-user-agent-config';
import { logger, tracer } from './power-tools-init';
import { checkEnv } from './utils/check-env';
import { formatError, formatResponse } from './utils/http-response-formatters';
import { ModelInfoRetriever } from './utils/model-info-retriever';

const ddbClient = new DynamoDBClient(customAwsConfig());

export const lambdaHandler = async (event: APIGatewayEvent) => {
    checkEnv();
    let response = {};
    try {
        const modelInfoRetriever = new ModelInfoRetriever(ddbClient);

        if (event.httpMethod == 'GET') {
            // Routing the request to the correct action
            switch (event.resource) {
                case '/model-info/use-case-types':
                    response = await modelInfoRetriever.getUseCaseTypes();
                    break;
                case '/model-info/{useCaseType}/providers':
                    response = await modelInfoRetriever.getModelProviders(
                        decodeURIComponent(event.pathParameters!.useCaseType!)
                    );
                    break;
                case '/model-info/{useCaseType}/{providerName}':
                    response = await modelInfoRetriever.getModels(
                        decodeURIComponent(event.pathParameters!.useCaseType!),
                        decodeURIComponent(event.pathParameters!.providerName!)
                    );
                    break;
                case '/model-info/{useCaseType}/{providerName}/{modelId}':
                    response = await modelInfoRetriever.getModelInfo(
                        decodeURIComponent(event.pathParameters!.useCaseType!),
                        decodeURIComponent(event.pathParameters!.providerName!),
                        decodeURIComponent(event.pathParameters!.modelId!)
                    );
                    break;
                default:
                    const msg = `Invalid resource: ${event.resource}`;
                    logger.error(msg);
                    return formatError({
                        message: msg,
                        statusCode: '400'
                    });
            }
        } else {
            const msg = `Invalid HTTP method: ${event.httpMethod}, at resource: ${event.resource}`;
            logger.error(msg);
            return formatError({
                message: msg,
                statusCode: '400'
            });
        }
    } catch (error) {
        const rootTraceId = tracer.getRootXrayTraceId();
        logger.error(`${error}`);
        logger.error(`Error occurred, root trace id: ${rootTraceId}`);
        return formatError({
            message: `Internal Error - Please contact support and quote the following trace id: ${rootTraceId}`,
            extraHeaders: { '_X_AMZN_TRACE_ID': rootTraceId as string }
        });
    }

    return formatResponse(response);
};

export const handler = middy(lambdaHandler).use([captureLambdaHandler(tracer), injectLambdaContext(logger)]);
