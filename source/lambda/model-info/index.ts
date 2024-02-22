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

import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { customAwsConfig } from 'aws-node-user-agent-config';
import { injectLambdaContext } from '@aws-lambda-powertools/logger';
import { captureLambdaHandler } from '@aws-lambda-powertools/tracer';
import middy from '@middy/core';
import { APIGatewayEvent } from 'aws-lambda';
import { logger, tracer } from './power-tools-init';
import { checkEnv } from './utils/check-env';
import { ModelInfoRetriever } from './utils/model-info-retriever';
import { formatError, formatResponse } from './utils/http-response-formatters';

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
