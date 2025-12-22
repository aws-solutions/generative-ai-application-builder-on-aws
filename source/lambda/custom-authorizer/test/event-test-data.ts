// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

'use strict';

import { CognitoIdTokenPayload } from 'aws-jwt-verify/jwt-model';
import { APIGatewayRequestAuthorizerEvent } from 'aws-lambda';

export const mockValidWebsocketRequestEvent: Partial<APIGatewayRequestAuthorizerEvent> = {
    type: 'REQUEST',
    methodArn: 'arn:aws:execute-api:us-east-1:111111111111:fake-api-id/test/GET/users',
    queryStringParameters: { Authorization: 'very-secret-auth-token' }
};

export const mockValidRestRequestEvent: Partial<APIGatewayRequestAuthorizerEvent> = {
    type: 'REQUEST',
    methodArn: 'arn:aws:execute-api:us-east-1:111111111111:fake-api-id/test/GET/users',
    headers: {
        Authorization: 'very-secret-auth-token'
    }
};

export const mockInvalidRequestEvent: Partial<APIGatewayRequestAuthorizerEvent> = {
    type: 'REQUEST',
    methodArn: 'arn:aws:execute-api:us-east-1:111111111111:fake-api-id/test/GET/users'
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
                            'Sid': 'BedrockChatStack-Users-policy-statement'
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
                            'Sid': 'BedrockChatStack-Users-policy-statement'
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

export const fakeIdToken: Partial<CognitoIdTokenPayload> = {
    sub: 'fake-sub',
    'cognito:groups': ['admin'],
    iss: 'https://cognito-idp.us-east-1.amazonaws.com/user-pool-id',
    'cognito:username': 'fakeuser',
    aud: 'fake-client-id',
    at_hash: 'fake-at-hash',
    email: 'fakeuser@example.com',
    email_verified: true,
    'custom:tenant_id': '',
    origin_jti: 'fake-origin-jti',
    event_id: 'fake-event-id',
    token_use: 'id',
    auth_time: 0,
    exp: 3600,
    iat: 0,
    jti: 'fake-jti'
};

export const fakeMultiGroupIdToken: Partial<CognitoIdTokenPayload> = {
    sub: 'fake-sub',
    'cognito:groups': ['admin', 'group1', 'group2'],
    iss: 'https://cognito-idp.us-east-1.amazonaws.com/user-pool-id',
    'cognito:username': 'fakeuser',
    aud: 'fake-client-id',
    at_hash: 'fake-at-hash',
    email: 'fakeuser@example.com',
    email_verified: true,
    'custom:tenant_id': '',
    origin_jti: 'fake-origin-jti',
    event_id: 'fake-event-id',
    token_use: 'id',
    auth_time: 0,
    exp: 3600,
    iat: 0,
    jti: 'fake-jti'
};

export const fakeIdTokenNoGroups: Partial<CognitoIdTokenPayload> = {
    sub: 'fake-sub',
    iss: 'https://cognito-idp.us-east-1.amazonaws.com/user-pool-id',
    'cognito:username': 'fakeuser',
    aud: 'fake-client-id',
    at_hash: 'fake-at-hash',
    email: 'fakeuser@example.com',
    email_verified: true,
    'custom:tenant_id': '',
    origin_jti: 'fake-origin-jti',
    event_id: 'fake-event-id',
    token_use: 'id',
    auth_time: 0,
    exp: 3600,
    iat: 0,
    jti: 'fake-jti'
};
