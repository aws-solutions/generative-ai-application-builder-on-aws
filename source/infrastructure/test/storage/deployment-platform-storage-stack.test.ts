// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import * as cdk from 'aws-cdk-lib';
import * as rawCdkJson from '../../cdk.json';

import { Template } from 'aws-cdk-lib/assertions';
import { DeploymentPlatformStack } from '../../lib/deployment-platform-stack';
import { DynamoDBDeploymentPlatformStorage } from '../../lib/storage/deployment-platform-storage-stack';

describe('When creating the nested stack for chat storage', () => {
    let nestedStack: DynamoDBDeploymentPlatformStorage;
    let template: Template;

    beforeAll(() => {
        const app = new cdk.App();
        const stack = new DeploymentPlatformStack(app, 'DeploymentPlatformStack', {
            solutionID: rawCdkJson.context.solution_id,
            solutionVersion: rawCdkJson.context.solution_version,
            solutionName: rawCdkJson.context.solution_name,
            applicationTrademarkName: rawCdkJson.context.application_trademark_name
        });
        nestedStack = new DynamoDBDeploymentPlatformStorage(stack, 'UseCaseStorage', {});
        template = Template.fromStack(nestedStack);
    });

    it('should pass successfully', async () => {
        expect(template).not.toBe(undefined);
    });

    it('should create 2 dynamoDB tables', () => {
        template.resourceCountIs('AWS::DynamoDB::Table', 3);

        template.hasResource('AWS::DynamoDB::Table', {
            Properties: {
                KeySchema: [
                    {
                        AttributeName: 'UseCaseId',
                        KeyType: 'HASH'
                    }
                ],
                AttributeDefinitions: [
                    {
                        AttributeName: 'UseCaseId',
                        AttributeType: 'S'
                    }
                ],
                BillingMode: 'PAY_PER_REQUEST',
                PointInTimeRecoverySpecification: {
                    PointInTimeRecoveryEnabled: true
                },
                SSESpecification: {
                    SSEEnabled: true
                },
                TimeToLiveSpecification: {
                    AttributeName: 'TTL',
                    Enabled: true
                }
            },
            UpdateReplacePolicy: 'Delete',
            DeletionPolicy: 'Delete'
        });

        template.hasResource('AWS::DynamoDB::Table', {
            Properties: {
                KeySchema: [
                    {
                        AttributeName: 'key',
                        KeyType: 'HASH'
                    }
                ],
                AttributeDefinitions: [
                    {
                        AttributeName: 'key',
                        AttributeType: 'S'
                    }
                ],
                BillingMode: 'PAY_PER_REQUEST',
                PointInTimeRecoverySpecification: {
                    PointInTimeRecoveryEnabled: true
                },
                SSESpecification: {
                    SSEEnabled: true
                },
                TimeToLiveSpecification: {
                    AttributeName: 'TTL',
                    Enabled: true
                }
            },
            UpdateReplacePolicy: 'Delete',
            DeletionPolicy: 'Delete'
        });
    });
});
