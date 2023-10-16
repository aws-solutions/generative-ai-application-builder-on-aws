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
 *********************************************************************************************************************/

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
        expect(await disconnect_handler.handler(mockedEvent)).toEqual({
            statusCode: 200,
            body: 'Disconnected'
        });
    });
});
