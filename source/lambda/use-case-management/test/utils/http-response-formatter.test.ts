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

import { formatResponse, formatError } from '../../utils/http-response-formatters';

describe('When formatting messages as HTTP responses', () => {
    beforeAll(() => {
        process.env.AWS_SDK_USER_AGENT = '{ "customUserAgent": "AwsSolution/SO0999/v9.9.9" }';
        process.env.AWS_REGION = 'us-east-1';
    });

    it('Should format the message into a default response correctly', () => {
        const response = formatResponse('Test response');
        expect(response).toEqual({
            'statusCode': 200,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Headers': 'Origin,X-Requested-With,Content-Type,Accept',
                'Access-Control-Allow-Methods': 'OPTIONS,POST,GET',
                'Access-Control-Allow-Credentials': true,
                'Access-Control-Allow-Origin': '*' // NOSONAR - javascript:S5122 - Domain not known at this point.
            },
            'isBase64Encoded': false,
            'body': 'Test response'
        });
    });

    it('Should format the message into a response correctly with extra headers', () => {
        const response = formatResponse({ 'test-body': 'Test response' }, { 'x-amz-testHeader': 'test-header-value' });
        expect(response).toEqual({
            'statusCode': 200,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Headers': 'Origin,X-Requested-With,Content-Type,Accept',
                'Access-Control-Allow-Methods': 'OPTIONS,POST,GET',
                'Access-Control-Allow-Origin': '*', // NOSONAR - javascript:S5122 - Domain not known at this point.
                'Access-Control-Allow-Credentials': true,
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
        process.env.AWS_SDK_USER_AGENT = '{ "customUserAgent": "AwsSolution/SO0999/v9.9.9" }';
        process.env.AWS_REGION = 'us-east-1';
    });

    it('Should format the error into a default response correctly', () => {
        const response = formatError({
            message: 'Test Error'
        });
        expect(response).toEqual({
            'statusCode': '400',
            'headers': {
                'Content-Type': 'text/plain',
                'x-amzn-ErrorType': 'CustomExecutionError',
                'Access-Control-Allow-Origin': '*'
            },
            'isBase64Encoded': false,
            'body': 'Test Error'
        });
    });

    it('Should format a custom error response correctly', () => {
        expect(
            formatError({
                message: 'Test Error',
                statusCode: '417',
                extraHeaders: { mockHeader: 'mockValue' }
            })
        ).toEqual({
            'statusCode': '417',
            'headers': {
                'Content-Type': 'text/plain',
                'x-amzn-ErrorType': 'CustomExecutionError',
                'Access-Control-Allow-Origin': '*',
                'mockHeader': 'mockValue'
            },
            'isBase64Encoded': false,
            'body': 'Test Error'
        });
    });

    afterAll(() => {
        delete process.env.AWS_SDK_USER_AGENT;
        delete process.env.AWS_REGION;
    });
});
