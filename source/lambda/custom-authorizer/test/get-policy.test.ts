// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { denyAllPolicy, getPolicyDocument } from '../utils/get-policy';
import { DynamoDBDocumentClient, BatchGetCommand } from '@aws-sdk/lib-dynamodb';
import { mockClient } from 'aws-sdk-client-mock';
import {
    batchGetItemResponse,
    fakeIdToken,
    fakeIdTokenNoGroups,
    fakeMultiGroupIdToken,
    multiGroupBatchGetItemResponse
} from './event-test-data';
import { CognitoIdTokenPayload } from 'aws-jwt-verify/jwt-model';

describe('Policy Generator test', () => {
    let ddbMockedClient: any;

    beforeAll(() => {
        process.env.AWS_SDK_USER_AGENT = `{ "customUserAgent": "AWSSOLUTION/SO0084/v2.1.0" }`;
        process.env.COGNITO_POLICY_TABLE_NAME = 'fake-table-name';
        ddbMockedClient = mockClient(DynamoDBDocumentClient);
    });

    it('denyAllPolicy should be correctly generated', () => {
        expect(denyAllPolicy()).toEqual({
            principalId: '*',
            policyDocument: {
                Version: '2012-10-17',
                Statement: [
                    {
                        Action: '*',
                        Effect: 'Deny',
                        Resource: '*'
                    }
                ]
            }
        });
    });

    it('should handle retrieving the policy', async () => {
        ddbMockedClient.on(BatchGetCommand).resolves(batchGetItemResponse);

        const expectedPolicy = {
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
                    {
                        'Resource': ['arn:aws:execute-api:us-east-1:111111111111:fake-api-id2/*/*'],
                        'Effect': 'Allow',
                        'Action': 'execute-api:Invoke',
                        'Sid': 'BedrockChatStack-Users-policy-statement'
                    }
                ]
            },
            context: {
                UserId: 'fake-sub',
                TenantId: '',
                Groups: '["admin"]',
                Email: 'fakeuser@example.com'
            }
        };

        await expect(getPolicyDocument(<CognitoIdTokenPayload>fakeIdToken)).resolves.toEqual(expectedPolicy);
    });

    it('should handle when user is in multiple groups', async () => {
        ddbMockedClient.on(BatchGetCommand).resolves(multiGroupBatchGetItemResponse);

        const expectedPolicy = {
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
                    {
                        'Resource': ['arn:aws:execute-api:us-east-1:111111111111:fake-api-id2/*/*'],
                        'Effect': 'Allow',
                        'Action': 'execute-api:Invoke',
                        'Sid': 'BedrockChatStack-Users-policy-statement'
                    },
                    {
                        'Resource': ['arn:aws:execute-api:us-east-1:111111111111:fake-api-id3/*/*'],
                        'Effect': 'Allow',
                        'Action': 'execute-api:Invoke',
                        'Sid': 'AnthropicChatStack-Users-policy-statement'
                    }
                ]
            },
            context: {
                UserId: 'fake-sub',
                TenantId: '',
                Groups: '["admin","group1","group2"]',
                Email: 'fakeuser@example.com'
            }
        };

        await expect(getPolicyDocument(<CognitoIdTokenPayload>fakeMultiGroupIdToken)).resolves.toEqual(
            expectedPolicy
        );
    });

    it('should return a deny policy if we receive no policies for the gorup', async () => {
        ddbMockedClient.on(BatchGetCommand).resolves({});
        await expect(getPolicyDocument(<CognitoIdTokenPayload>fakeMultiGroupIdToken)).resolves.toEqual(
            denyAllPolicy()
        );
    });

    it('should return a deny policy if we have no groups in the token', async () => {
        await expect(getPolicyDocument(<CognitoIdTokenPayload>fakeIdTokenNoGroups)).resolves.toEqual(
            denyAllPolicy()
        );
    });

    afterAll(() => {
        delete process.env.AWS_SDK_USER_AGENT;
        delete process.env.COGNITO_POLICY_TABLE_NAME;

        ddbMockedClient.restore();
    });
});
