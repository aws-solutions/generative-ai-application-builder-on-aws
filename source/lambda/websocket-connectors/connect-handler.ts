// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

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
