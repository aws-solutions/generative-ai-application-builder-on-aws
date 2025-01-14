// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { APIGatewayProxyEvent } from 'aws-lambda';
import * as disconnect_handler from '../disconnect-handler';

describe('when calling disconnect-handler', () => {
    it('should return 200', async () => {
        let mockedEvent: APIGatewayProxyEvent = {
            body: 'empty body for test',
            headers: {},
            multiValueHeaders: {},
            httpMethod: 'POST',
            isBase64Encoded: true,
            path: '/disconnect',
            pathParameters: null,
            queryStringParameters: null,
            multiValueQueryStringParameters: null,
            stageVariables: null,
            requestContext: {
                accountId: '',
                apiId: '',
                authorizer: undefined,
                protocol: '',
                httpMethod: '',
                identity: {
                    clientCert: null,
                    userAgent: null,
                    userArn: null,
                    accessKey: null,
                    accountId: null,
                    apiKey: null,
                    apiKeyId: null,
                    caller: null,
                    cognitoAuthenticationProvider: null,
                    cognitoAuthenticationType: null,
                    cognitoIdentityId: null,
                    cognitoIdentityPoolId: null,
                    principalOrgId: null,
                    sourceIp: '',
                    user: null
                },
                path: '',
                stage: '',
                requestId: '',
                requestTimeEpoch: 0,
                resourceId: '',
                resourcePath: ''
            },
            resource: 'fakeResource'
        };
        expect(await disconnect_handler.lambdaHandler(mockedEvent)).toEqual({
            statusCode: 200,
            body: 'Disconnected'
        });
    });
});
