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

'use strict';

import { CognitoAccessTokenPayload } from 'aws-jwt-verify/jwt-model';
import { APIGatewayRequestAuthorizerEvent } from 'aws-lambda';

export const mockValidWebsocketRequestEvent: Partial<APIGatewayRequestAuthorizerEvent> = {
    type: 'REQUEST',
    methodArn: 'mock-method-arn',
    queryStringParameters: { Authorization: 'very-secret-auth-token' }
};

export const mockValidRestRequestEvent: Partial<APIGatewayRequestAuthorizerEvent> = {
    type: 'REQUEST',
    methodArn: 'mock-method-arn',
    headers: {
        Authorization: 'very-secret-auth-token'
    }
};

export const mockInvalidRequestEvent: Partial<APIGatewayRequestAuthorizerEvent> = {
    type: 'REQUEST',
    methodArn: 'mock-method-arn'
};

export const batchGetItemResponse = {
    '$metadata': {
        'httpStatusCode': 200,
        'requestId': 'fake-request-id',
        'attempts': 1,
        'totalRetryDelay': 0
    },
    'Responses': {
        'fake-table-name': [
            {
                'policy': {
                    'Version': '2012-10-17',
                    'Statement': [
                        {
                            'Resource': ['arn:aws:execute-api:us-east-1:111111111111:fake-api-id/*/*'],
                            'Effect': 'Allow',
                            'Action': 'execute-api:Invoke',
                            'Sid': 'use-case-management-api-admin-policy-statement'
                        },
                        {
                            'Resource': ['arn:aws:execute-api:us-east-1:111111111111:fake-api-id2/*/*'],
                            'Effect': 'Allow',
                            'Action': 'execute-api:Invoke',
                            'Sid': 'HuggingFaceChatStack-Users-policy-statement'
                        }
                    ]
                },
                'group': 'admin'
            }
        ]
    },
    'UnprocessedKeys': {}
};

export const multiGroupBatchGetItemResponse = {
    '$metadata': {
        'httpStatusCode': 200,
        'requestId': 'fake-request-id',
        'attempts': 1,
        'totalRetryDelay': 0
    },
    'Responses': {
        'fake-table-name': [
            {
                'policy': {
                    'Version': '2012-10-17',
                    'Statement': [
                        {
                            'Resource': ['arn:aws:execute-api:us-east-1:111111111111:fake-api-id/*/*'],
                            'Effect': 'Allow',
                            'Action': 'execute-api:Invoke',
                            'Sid': 'use-case-management-api-admin-policy-statement'
                        },
                        {
                            'Resource': ['arn:aws:execute-api:us-east-1:111111111111:fake-api-id2/*/*'],
                            'Effect': 'Allow',
                            'Action': 'execute-api:Invoke',
                            'Sid': 'HuggingFaceChatStack-Users-policy-statement'
                        }
                    ]
                },
                'group': 'admin'
            },
            {
                'policy': {
                    'Version': '2012-10-17',
                    'Statement': [
                        {
                            'Resource': ['arn:aws:execute-api:us-east-1:111111111111:fake-api-id3/*/*'],
                            'Effect': 'Allow',
                            'Action': 'execute-api:Invoke',
                            'Sid': 'AnthropicChatStack-Users-policy-statement'
                        }
                    ]
                },
                'group': 'group1'
            },
            // bad policy to ensure we survive this and skip over it
            {
                'some-bad-object': {
                    'Version': '2012-10-17',
                    'Statement': []
                }
            }
        ]
    },
    'UnprocessedKeys': {}
};

export const fakeIdToken: Partial<CognitoAccessTokenPayload> = {
    sub: 'fake-sub',
    'cognito:groups': ['admin'],
    iss: 'https://cognito-idp.us-east-1.amazonaws.com/user-pool-id',
    'cognito:username': 'fakeuser',
    client_id: 'fake-client-id',
    origin_jti: 'fake-origin-jti',
    event_id: 'fake-event-id',
    token_use: 'access',
    scope: 'aws.cognito.signin.user.fake-sub',
    auth_time: 0,
    exp: 3600,
    iat: 0,
    jti: 'fake-jti',
    username: 'fake-username'
};

export const fakeMultiGroupIdToken: Partial<CognitoAccessTokenPayload> = {
    sub: 'fake-sub',
    'cognito:groups': ['admin', 'group1', 'group2'],
    iss: 'https://cognito-idp.us-east-1.amazonaws.com/user-pool-id',
    'cognito:username': 'fakeuser',
    client_id: 'fake-client-id',
    origin_jti: 'fake-origin-jti',
    event_id: 'fake-event-id',
    token_use: 'access',
    scope: 'aws.cognito.signin.user.fake-sub',
    auth_time: 0,
    exp: 3600,
    iat: 0,
    jti: 'fake-jti',
    username: 'fake-username'
};
