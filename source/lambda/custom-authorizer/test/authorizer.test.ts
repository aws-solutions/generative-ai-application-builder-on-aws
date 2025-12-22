// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

jest.mock('aws-node-user-agent-config', () => ({
    customAwsConfig: jest.fn(() => ({ region: 'us-east-1' }))
}));

import { APIGatewayRequestAuthorizerEvent } from 'aws-lambda';
import {
    mockValidWebsocketRequestEvent,
    mockInvalidRequestEvent,
    mockValidRestRequestEvent,
    batchGetItemResponse,
    fakeIdToken
} from './event-test-data';
import { DynamoDBDocumentClient, BatchGetCommand } from '@aws-sdk/lib-dynamodb';
import { handler as websocketHandler } from '../websocket-authorizer';
import { handler as restHandler } from '../rest-authorizer';
import { mockClient } from 'aws-sdk-client-mock';
import { jwtDecode } from 'jwt-decode';
import {
    CognitoIdentityProviderClient,
    DescribeUserPoolClientCommand
} from '@aws-sdk/client-cognito-identity-provider';

jest.mock('aws-jwt-verify', () => {
    return {
        CognitoJwtVerifier: {
            create: () => {
                return {
                    verify: () => {
                        return fakeIdToken;
                    }
                };
            }
        }
    };
});

jest.mock('@aws-sdk/client-cognito-identity-provider');

jest.mock('jwt-decode', () => {
    return {
        jwtDecode: jest.fn()
    };
});

describe('When the websocket handler receives an authorization event', () => {
    let ddbMockedClient: any;

    beforeAll(() => {
        process.env.AWS_SDK_USER_AGENT = `{ "customUserAgent": "AWSSOLUTION/SO0084/v2.1.0" }`;
        process.env.COGNITO_POLICY_TABLE_NAME = 'fake-table-name';
        ddbMockedClient = mockClient(DynamoDBDocumentClient);
    });

    it('should return an allow policy', async () => {
        ddbMockedClient.on(BatchGetCommand).resolves(batchGetItemResponse);
        const response = await websocketHandler(mockValidWebsocketRequestEvent as APIGatewayRequestAuthorizerEvent);
        expect(response).toEqual({
            principalId: '*',
            policyDocument: {
                'Version': '2012-10-17',
                'Statement': [
                    {
                        'Resource': ['arn:aws:execute-api:us-east-1:111111111111:fake-api-id/*/*'],
                        'Effect': 'Allow',
                        'Action': 'execute-api:Invoke',
                        'Sid': 'use-case-management-api-admin-policy-statement'
                    }
                ]
            },
            context: {
                UserId: 'fake-sub',
                TenantId: '',
                Groups: '["admin"]',
                Email: 'fakeuser@example.com'
            }
        });
    });

    it('should return a deny policy due to jwt verification failure', async () => {
        jest.unmock('aws-jwt-verify');

        jest.mock('aws-jwt-verify', () => {
            return {
                CognitoJwtVerifier: {
                    create: () => {
                        return {
                            verify: () => {
                                throw new Error('Mock-jwt-error');
                            }
                        };
                    }
                }
            };
        });

        try {
            await websocketHandler(mockValidWebsocketRequestEvent as APIGatewayRequestAuthorizerEvent);
        } catch (error: any) {
            expect(error.message).toEqual('Unauthorized');
        }
    });

    it('should return a deny policy when event payload is bad', async () => {
        try {
            await websocketHandler(mockInvalidRequestEvent as APIGatewayRequestAuthorizerEvent);
        } catch (error: any) {
            expect(error.message).toEqual('Unauthorized');
        }
    });

    afterAll(() => {
        delete process.env.AWS_SDK_USER_AGENT;
        delete process.env.COGNITO_POLICY_TABLE_NAME;

        ddbMockedClient.restore();
    });

    afterEach(() => jest.clearAllMocks());
});

describe('When the rest handler receives an authorization event', () => {
    let ddbMockedClient: any;
    let cognitoMockedClient: any;

    beforeAll(() => {
        process.env.AWS_SDK_USER_AGENT = `{ "customUserAgent": "AWSSOLUTION/SO0084/v2.1.0" }`;
        process.env.COGNITO_POLICY_TABLE_NAME = 'fake-table-name';
        process.env.USER_POOL_ID = 'mock-user-pool-id';
        ddbMockedClient = mockClient(DynamoDBDocumentClient);
        cognitoMockedClient = mockClient(CognitoIdentityProviderClient);
    });

    beforeEach(() => {
        ddbMockedClient.reset();
        cognitoMockedClient.reset();
        (jwtDecode as jest.Mock).mockReturnValue({
            sub: 'mock-user-id',
            aud: 'mock-client-id'
        });
    });

    it('should return an allow policy', async () => {
        cognitoMockedClient.on(DescribeUserPoolClientCommand).resolves({
            UserPoolClient: {
                ClientId: 'mock-client-id',
                UserPoolId: 'mock-user-pool-id'
            }
        });
        ddbMockedClient.on(BatchGetCommand).resolves(batchGetItemResponse);
        const response = await restHandler(mockValidRestRequestEvent as APIGatewayRequestAuthorizerEvent);
        expect(response).toEqual({
            principalId: '*',
            policyDocument: {
                'Version': '2012-10-17',
                'Statement': [
                    {
                        'Resource': ['arn:aws:execute-api:us-east-1:111111111111:fake-api-id/*/*'],
                        'Effect': 'Allow',
                        'Action': 'execute-api:Invoke',
                        'Sid': 'use-case-management-api-admin-policy-statement'
                    }
                ]
            },
            context: {
                UserId: 'fake-sub',
                TenantId: '',
                Groups: '["admin"]',
                Email: 'fakeuser@example.com'
            }
        });
    });

    it('should return an allow policy with Bearer prefix', async () => {
        cognitoMockedClient.on(DescribeUserPoolClientCommand).resolves({
            UserPoolClient: {
                ClientId: 'mock-client-id',
                UserPoolId: 'mock-user-pool-id'
            }
        });
        ddbMockedClient.on(BatchGetCommand).resolves(batchGetItemResponse);

        const eventWithBearer = {
            ...mockValidRestRequestEvent,
            queryStringParameters: {
                Authorization: `Bearer ${mockValidRestRequestEvent.headers?.Authorization}`
            }
        };

        const response = await restHandler(eventWithBearer as APIGatewayRequestAuthorizerEvent);

        expect(response).toEqual({
            principalId: '*',
            policyDocument: {
                'Version': '2012-10-17',
                'Statement': [
                    {
                        'Resource': ['arn:aws:execute-api:us-east-1:111111111111:fake-api-id/*/*'],
                        'Effect': 'Allow',
                        'Action': 'execute-api:Invoke',
                        'Sid': 'use-case-management-api-admin-policy-statement'
                    },
                ]
            },
            context: {
                UserId: 'fake-sub',
                TenantId: '',
                Groups: '["admin"]',
                Email: 'fakeuser@example.com'
            }
        });
    });

    it('should return a deny policy when Cognito client is not found', async () => {
        cognitoMockedClient.on(DescribeUserPoolClientCommand).rejects({
            name: 'ResourceNotFoundException',
            message: 'Client ID not found in User Pool',
            $metadata: {
                httpStatusCode: 400
            }
        });

        try {
            await restHandler(mockValidRestRequestEvent as APIGatewayRequestAuthorizerEvent);
            fail('Should have thrown an error');
        } catch (error: any) {
            expect(error.message).toEqual('Unauthorized');
        }
    });

    it('should return a deny policy when verification fails', async () => {
        jest.unmock('aws-jwt-verify');

        jest.mock('aws-jwt-verify', () => {
            return {
                CognitoJwtVerifier: {
                    create: () => {
                        return {
                            verify: () => {
                                throw new Error('Mock-jwt-error');
                            }
                        };
                    }
                }
            };
        });

        try {
            await restHandler(mockValidRestRequestEvent as APIGatewayRequestAuthorizerEvent);
        } catch (error: any) {
            expect(error.message).toEqual('Unauthorized');
        }
    });

    it('should return a deny policy when event payload is bad', async () => {
        try {
            await restHandler(mockInvalidRequestEvent as APIGatewayRequestAuthorizerEvent);
        } catch (error: any) {
            expect(error.message).toEqual('Unauthorized');
        }
    });

    afterEach(() => jest.clearAllMocks());
    afterAll(() => {
        delete process.env.AWS_SDK_USER_AGENT;
        delete process.env.COGNITO_POLICY_TABLE_NAME;

        ddbMockedClient.restore();
    });
});

jest.clearAllMocks();
