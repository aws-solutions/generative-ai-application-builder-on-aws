// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { formatResponse, formatError } from '../../utils/http-response-formatters';

describe('When formatting messages as HTTP responses', () => {
    beforeAll(() => {
        process.env.AWS_SDK_USER_AGENT = '{ "customUserAgent": "AWSSOLUTION/SO0999/v9.9.9" }';
        process.env.AWS_REGION = 'us-east-1';
    });

    it('Should format the message into a default response correctly', () => {
        const response = formatResponse('Test response');
        expect(response).toEqual({
            'statusCode': 200,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
                'Access-Control-Allow-Methods': 'OPTIONS,POST,GET',
                'Access-Control-Allow-Credentials': 'true',
                'Access-Control-Allow-Origin': '*' // NOSONAR - javascript:S5122 - Domain not known at this point.
            },
            'isBase64Encoded': false,
            'body': 'Test response'
        });
    });

    it('Should format the message into a response correctly with extra headers', () => {
        const response = formatResponse({ 'test-body': 'Test response' }, 200, {
            'x-amz-testHeader': 'test-header-value'
        });
        expect(response).toEqual({
            'statusCode': 200,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
                'Access-Control-Allow-Methods': 'OPTIONS,POST,GET',
                'Access-Control-Allow-Origin': '*', // NOSONAR - javascript:S5122 - Domain not known at this point.
                'Access-Control-Allow-Credentials': 'true',
                'x-amz-testHeader': 'test-header-value'
            },
            'isBase64Encoded': false,
            'body': '{"test-body":"Test response"}'
        });
    });

    afterAll(() => {
        delete process.env.AWS_SDK_USER_AGENT;
        delete process.env.AWS_REGION;
    });
});

describe('When formatting error responses as HTTP responses', () => {
    beforeAll(() => {
        process.env.AWS_SDK_USER_AGENT = '{ "customUserAgent": "AWSSOLUTION/SO0999/v9.9.9" }';
        process.env.AWS_REGION = 'us-east-1';
    });

    it('Should format the error into a default response correctly', () => {
        const response = formatError({
            message: 'Test Error'
        });
        expect(response).toEqual({
            'statusCode': 400,
            'headers': {
                'Content-Type': 'application/json',
                'x-amzn-ErrorType': 'CustomExecutionError',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
                'Access-Control-Allow-Methods': 'OPTIONS,POST,GET'
            },
            'isBase64Encoded': false,
            'body': '{"message":"Test Error"}'
        });
    });

    it('Should format a custom error response correctly', () => {
        expect(
            formatError({
                message: 'Test Error',
                originalStatusCode: 417,
                extraHeaders: { mockHeader: 'mockValue' }
            })
        ).toEqual({
            'statusCode': 400,
            'headers': {
                'Content-Type': 'application/json',
                'x-amzn-ErrorType': 'CustomExecutionError',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
                'Access-Control-Allow-Methods': 'OPTIONS,POST,GET',
                'mockHeader': 'mockValue'
            },
            'isBase64Encoded': false,
            'body': '{"message":"Test Error","originalStatusCode":417}'
        });
    });

    afterAll(() => {
        delete process.env.AWS_SDK_USER_AGENT;
        delete process.env.AWS_REGION;
    });
});
