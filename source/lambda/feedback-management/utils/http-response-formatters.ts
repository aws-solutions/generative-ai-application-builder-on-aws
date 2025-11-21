// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

/**
 * Utility function to convert any success response into a Http 200/201 response with
 * proper formatting and headers.
 *
 * @param {any} body Response message. This will be stringified and inserted into 'body'
 * @param {number} statusCode HTTP status code for the response (default: 200)
 * @param {[key: string]: string} extraHeaders any extra headers to include in response.
 *         any key in extraHeaders will override any header in the defaultHeaders with the same key.
 * @returns
 */
export const formatResponse = (
    body: string | { [key: string]: any },
    statusCode: number = 200,
    extraHeaders: { [key: string]: string } = {}
) => {
    const defaultHeaders = {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
        'Access-Control-Allow-Methods': 'OPTIONS,POST,GET',
        'Access-Control-Allow-Credentials': 'true',
        'Access-Control-Allow-Origin': '*' // NOSONAR - javascript:S5122 - Domain not known at this point.
    };
    const headers = typeof extraHeaders === 'undefined' ? defaultHeaders : { ...defaultHeaders, ...extraHeaders };
    body = typeof body === 'string' ? body : JSON.stringify(body);
    
    return {
        'statusCode': statusCode,
        'headers': headers,
        'isBase64Encoded': false,
        'body': body
    };
};

/**
 * Formats an error object into a HTTP response with an error status code.
 * If error is a string, it is converted to a Object with parameter key `message`.
 * Always sends a 400 error response for security reasons (masking 500 errors).
 *
 * @param {message} Error message
 * @param {originalStatusCode} Original error status code (will be masked as 400)
 * @param {extraHeaders} any extra headers to include in response.
 * @returns
 */
export const formatError = ({
    message,
    originalStatusCode,
    extraHeaders
}: {
    message: string;
    originalStatusCode?: number;
    extraHeaders?: { [key: string]: string };
}) => {
    const defaultHeaders = {
        'Content-Type': 'application/json',
        'x-amzn-ErrorType': 'CustomExecutionError',
        'Access-Control-Allow-Origin': '*', // NOSONAR - javascript:S5122 - Domain not known at this point.
        'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
        'Access-Control-Allow-Methods': 'OPTIONS,POST,GET'
    };

    // For security reasons, we mask all errors as 400 Bad Request
    // This prevents information leakage about internal server errors
    return {
        statusCode: 400,
        headers: {
            ...defaultHeaders,
            ...extraHeaders
        },
        isBase64Encoded: false,
        body: JSON.stringify({ message, originalStatusCode })
    };
};
