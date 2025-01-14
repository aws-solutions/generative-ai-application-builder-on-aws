// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { injectLambdaContext } from '@aws-lambda-powertools/logger/middleware';
import { logMetrics } from '@aws-lambda-powertools/metrics/middleware';
import { captureLambdaHandler } from '@aws-lambda-powertools/tracer/middleware';
import middy from '@middy/core';
import { APIGatewayProxyEvent } from 'aws-lambda';
import { logger, metrics, tracer } from './power-tools-init';

// prettier-ignore
export const lambdaHandler = async (event: APIGatewayProxyEvent) => { //NOSONAR - declaration as per lambda signature
    return {
        statusCode: 200,
        body: 'Disconnected'
    };
};

export const handler = middy(lambdaHandler).use([
    captureLambdaHandler(tracer),
    injectLambdaContext(logger),
    logMetrics(metrics)
]);
