// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0
import { formatResponse, formatError } from '../../utils/http-response-formatters';

describe('HTTP Response Formatters', () => {
    describe('formatResponse', () => {
        it('should format a string body with default status code and headers', () => {
            const response = formatResponse('test message');

            expect(response).toEqual({
                statusCode: 200,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Headers': 'Origin,X-Requested-With,Content-Type,Accept',
                    'Access-Control-Allow-Methods': 'OPTIONS,POST,GET',
                    'Access-Control-Allow-Credentials': true,
                    'Access-Control-Allow-Origin': '*'
                },
                isBase64Encoded: false,
                body: 'test message'
            });
        });

        it('should format an object body by stringifying it', () => {
            const testObj = { key: 'value' };
            const response = formatResponse(testObj);

            expect(response.body).toBe(JSON.stringify(testObj));
        });

        it('should accept custom status code', () => {
            const response = formatResponse('test', 201);

            expect(response.statusCode).toBe(201);
        });

        it('should merge extra headers with defaults', () => {
            const response = formatResponse('test', 200, {
                'Custom-Header': 'test-value'
            });

            expect(response.headers).toEqual({
                'Content-Type': 'application/json',
                'Access-Control-Allow-Headers': 'Origin,X-Requested-With,Content-Type,Accept',
                'Access-Control-Allow-Methods': 'OPTIONS,POST,GET',
                'Access-Control-Allow-Credentials': true,
                'Access-Control-Allow-Origin': '*',
                'Custom-Header': 'test-value'
            });
        });
    });

    describe('formatError', () => {
        it('should format error with default status code', () => {
            const response = formatError({
                message: 'test error'
            });

            expect(response).toEqual({
                statusCode: 400,
                headers: {
                    'Content-Type': 'text/plain',
                    'x-amzn-ErrorType': 'CustomExecutionError',
                    'Access-Control-Allow-Origin': '*'
                },
                isBase64Encoded: false,
                body: 'test error'
            });
        });

        it('should accept custom status code', () => {
            const response = formatError({
                message: 'test error',
                statusCode: 500
            });

            expect(response.statusCode).toBe(500);
        });

        it('should merge extra headers with defaults', () => {
            const response = formatError({
                message: 'test error',
                extraHeaders: {
                    'Custom-Header': 'test-value'
                }
            });

            expect(response.headers).toEqual({
                'Content-Type': 'text/plain',
                'x-amzn-ErrorType': 'CustomExecutionError',
                'Access-Control-Allow-Origin': '*',
                'Custom-Header': 'test-value'
            });
        });
    });
});
