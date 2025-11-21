// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

export interface ErrorResponse {
    message: string;
    originalStatusCode?: number;
    extraHeaders?: Record<string, string>;
}

/**
 * Formats success responses for Lambda functions
 * @param body - Response body (string or object)
 * @param statusCode - HTTP status code (default: 200)
 * @param extraHeaders - Additional headers
 * @returns Formatted success response
 */
export const formatResponse = (body: any, statusCode: number = 200, extraHeaders?: Record<string, string>): any => {
    return {
        statusCode,
        headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
            'Access-Control-Allow-Methods': 'OPTIONS,POST,GET',
            'Access-Control-Allow-Credentials': 'true',
            'Access-Control-Allow-Origin': '*', // NOSONAR - javascript:S5122 - Domain not known at this point.
            ...extraHeaders
        },
        isBase64Encoded: false,
        body: typeof body === 'string' ? body : JSON.stringify(body)
    };
};

/**
 * Formats error responses for Lambda functions
 * @param error - Error response object
 * @returns Formatted error response
 */
export const formatError = (error: ErrorResponse): any => {
    const responseBody: any = { message: error.message };
    if (error.originalStatusCode) {
        responseBody.originalStatusCode = error.originalStatusCode;
    }

    return {
        statusCode: 400,
        headers: {
            'Content-Type': 'application/json',
            'x-amzn-ErrorType': 'CustomExecutionError',
            'Access-Control-Allow-Origin': '*', // NOSONAR - javascript:S5122 - Domain not known at this point.
            'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
            'Access-Control-Allow-Methods': 'OPTIONS,POST,GET',
            ...error.extraHeaders
        },
        isBase64Encoded: false,
        body: JSON.stringify(responseBody)
    };
};
