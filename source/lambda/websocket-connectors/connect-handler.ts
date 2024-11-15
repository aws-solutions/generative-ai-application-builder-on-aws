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
import { APIGatewayProxyEvent } from 'aws-lambda';
import { logger, metrics, tracer } from './power-tools-init';

export const lambdaHandler = async (event: APIGatewayProxyEvent) => {
    const requestContext = event.requestContext;
    logger.debug(
        `Events details are below, context.requestId: ${requestContext.requestId}, context.identity.caller: ${requestContext.identity.caller}, context.requestTime: ${requestContext.requestTime}, context.httpMethod: ${requestContext.httpMethod}, context.resourcePath: ${requestContext.resourcePath}, context.extendedRequestId: ${requestContext.extendedRequestId}`
    );
    return {
        statusCode: 200,
        body: 'Connected'
    };
};

export const handler = middy(lambdaHandler).use([
    captureLambdaHandler(tracer),
    injectLambdaContext(logger),
    logMetrics(metrics)
]);
