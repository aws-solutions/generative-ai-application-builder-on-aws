// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { formatResponse, formatError } from '../../utils/http-response-formatters';

describe('HTTP Response Formatters', () => {
    describe('formatResponse', () => {
        it('should create a successful response with default status code', () => {
            const body = { message: 'Success' };
            const response = formatResponse(body);

            expect(response).toMatchObject({
                statusCode: 200,
                headers: expect.objectContaining({
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                }),
                body: JSON.stringify(body)
            });
        });

        it('should create a successful response with custom status code', () => {
            const body = { message: 'Created' };
            const response = formatResponse(body, 201);

            expect(response).toMatchObject({
                statusCode: 201,
                headers: expect.objectContaining({
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                }),
                body: JSON.stringify(body)
            });
        });

        it('should create a response with additional headers', () => {
            const body = { message: 'Success' };
            const extraHeaders = { 'X-Custom-Header': 'test' };
            const response = formatResponse(body, 200, extraHeaders);

            expect(response).toMatchObject({
                statusCode: 200,
                headers: expect.objectContaining({
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*',
                    'X-Custom-Header': 'test'
                }),
                body: JSON.stringify(body)
            });
        });
    });

    describe('formatError', () => {
        it('should create an error response with default status code', () => {
            const errorDetails = { message: 'Bad Request' };
            const response = formatError(errorDetails);

            expect(response).toMatchObject({
                statusCode: 400,
                headers: expect.objectContaining({
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                }),
                body: JSON.stringify(errorDetails)
            });
        });

        it('should create an error response with custom status code', () => {
            const errorDetails = {
                message: 'Not Found',
                originalStatusCode: 404
            };
            const response = formatError(errorDetails);

            expect(response).toMatchObject({
                statusCode: 400,
                headers: expect.objectContaining({
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                }),
                body: JSON.stringify(errorDetails)
            });
        });

        it('should create an error response with additional details', () => {
            const errorDetails = {
                message: 'Validation Error',
                errors: ['Invalid field']
            };
            const response = formatError(errorDetails);

            expect(response).toMatchObject({
                statusCode: 400,
                headers: expect.objectContaining({
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                }),
                body: JSON.stringify({ message: errorDetails.message })
            });
        });
    });
});
