// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

/**
 * Utility function to convert any success response into a Http 200 response with the
 * proper formatting and headers.
 *
 * @param {any} body Response message. This will be stringified and inserted into 'body'
 * @param {[key: string]: string} extraHeaders any extra headers to include in response.
 *         any key in extraHeaders will override any header in the defaultHeaders with the same key.
 * @returns
 */
export const formatResponse = (
    body: string | { [key: string]: string },
    statusCode: number = 200,
    extraHeaders: { [key: string]: string } = {}
) => {
    const defaultHeaders = {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Headers': 'Origin,X-Requested-With,Content-Type,Accept',
        'Access-Control-Allow-Methods': 'OPTIONS,POST,GET',
        'Access-Control-Allow-Credentials': true,
        'Access-Control-Allow-Origin': '*' // NOSONAR - javascript:S5122 - Domain not known at this point.
    };
    const headers = typeof extraHeaders === 'undefined' ? defaultHeaders : { ...defaultHeaders, ...extraHeaders };
    body = typeof body === 'string' ? body : JSON.stringify(body);
    let response = {
        'statusCode': statusCode ?? 200,
        'headers': headers,
        'isBase64Encoded': false,
        'body': body
    };
    return response;
};

/**
 * Formats a error object into a HTTP response with an error status code.
 * If error is a string, it is converted to a Object with parameter key `message`.
 * Sends a 400 error response.
 * @param {message} Error body
 * @param {statusCode} Error status code
 * @param {extraHeaders} any extra headers to include in response.
 * @returns
 */
export const formatError = ({
    message,
    statusCode,
    extraHeaders
}: {
    message: string;
    statusCode?: number;
    extraHeaders?: { [key: string]: string };
}) => {
    const defaultHeaders = {
        'Content-Type': 'text/plain',
        'x-amzn-ErrorType': 'CustomExecutionError',
        'Access-Control-Allow-Origin': '*' // NOSONAR - javascript:S5122 - Domain not known at this point.
    };

    return {
        statusCode: statusCode ?? 400,
        headers: {
            ...defaultHeaders,
            ...extraHeaders
        },
        isBase64Encoded: false,
        body: message
    };
};
