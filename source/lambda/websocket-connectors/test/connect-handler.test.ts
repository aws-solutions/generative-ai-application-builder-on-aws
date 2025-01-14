// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { APIGatewayProxyEvent } from 'aws-lambda';
import * as connect_handler from '../connect-handler';

describe('when calling connect-handler', () => {
    it('should return 200', async () => {
        let mockedEvent: APIGatewayProxyEvent = {
            body: 'empty body for test',
            headers: {},
            multiValueHeaders: {},
            httpMethod: 'POST',
            isBase64Encoded: true,
            path: '/connect',
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
        expect(await connect_handler.lambdaHandler(mockedEvent)).toEqual({
            statusCode: 200,
            body: 'Connected'
        });
    });
});
