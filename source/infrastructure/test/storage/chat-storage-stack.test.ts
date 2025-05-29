// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import * as cdk from 'aws-cdk-lib';
import * as rawCdkJson from '../../cdk.json';

import { Template } from 'aws-cdk-lib/assertions';
import { BedrockChat } from '../../lib/bedrock-chat-stack';
import { DynamoDBChatStorage } from '../../lib/storage/chat-storage-stack';
import { USE_CASE_TYPES } from '../../lib/utils/constants';

describe('When creating the nested stack for chat storage with useCaseType as Text', () => {
    let nestedStack: DynamoDBChatStorage;
    let template: Template;

    beforeAll(() => {
        const app = new cdk.App();
        const stack = new BedrockChat(app, 'ChatStack', {
            solutionID: rawCdkJson.context.solution_id,
            solutionVersion: rawCdkJson.context.solution_version,
            solutionName: rawCdkJson.context.solution_name,
            applicationTrademarkName: rawCdkJson.context.application_trademark_name
        });
        nestedStack = new DynamoDBChatStorage(stack, 'ChatStorage', {
            parameters: {
                UseCaseType: USE_CASE_TYPES.TEXT
            }
        });
        template = Template.fromStack(nestedStack);
    });

    it('should template to have following parameters', () => {
        template.hasParameter('ConversationTableName', {
            Type: 'String',
            MaxLength: 255,
            AllowedPattern: '^$|^[a-zA-Z0-9_.-]{3,255}$',
            Description: 'DynamoDB table name for the table which will store the conversation state and history.'
        });

        template.hasParameter('ExistingModelInfoTableName', {
            Type: 'String',
            MaxLength: 255,
            AllowedPattern: '^$|^[a-zA-Z0-9_.-]{3,255}$',
            Default: '',
            Description: 'DynamoDB table name for the existing table which contains model info and defaults.'
        });

        template.hasParameter('UseCaseType', {
            Type: 'String',
            Description: 'The UseCaseType. The value is provided as Agent or Text',
            AllowedValues: ['Text', 'Agent']
        });
    });

    it('should create 2 dynamoDB tables when useCaseType is Text', () => {
        template.resourceCountIs('AWS::DynamoDB::Table', 2);

        // Verify conversation table properties
        template.hasResourceProperties('AWS::DynamoDB::Table', {
            'KeySchema': [
                {
                    'AttributeName': 'UserId',
                    'KeyType': 'HASH'
                },
                {
                    'AttributeName': 'ConversationId',
                    'KeyType': 'RANGE'
                }
            ],
            'AttributeDefinitions': [
                {
                    'AttributeName': 'UserId',
                    'AttributeType': 'S'
                },
                {
                    'AttributeName': 'ConversationId',
                    'AttributeType': 'S'
                }
            ],
            'BillingMode': 'PAY_PER_REQUEST',
            'SSESpecification': {
                'SSEEnabled': true
            },
            'TimeToLiveSpecification': {
                'AttributeName': 'TTL',
                'Enabled': true
            }
        });

        // Verify model info table properties
        template.hasResourceProperties('AWS::DynamoDB::Table', {
            'KeySchema': [
                {
                    'AttributeName': 'UseCase',
                    'KeyType': 'HASH'
                },
                {
                    'AttributeName': 'SortKey',
                    'KeyType': 'RANGE'
                }
            ],
            'AttributeDefinitions': [
                {
                    'AttributeName': 'UseCase',
                    'AttributeType': 'S'
                },
                {
                    'AttributeName': 'SortKey',
                    'AttributeType': 'S'
                }
            ],
            'BillingMode': 'PAY_PER_REQUEST',
            'SSESpecification': {
                'SSEEnabled': true
            }
        });
    });
});

describe('When creating the nested stack for chat storage with useCaseType as Agent', () => {
    let nestedStack: DynamoDBChatStorage;
    let template: Template;

    beforeAll(() => {
        const app = new cdk.App();
        const stack = new BedrockChat(app, 'ChatStack', {
            solutionID: rawCdkJson.context.solution_id,
            solutionVersion: rawCdkJson.context.solution_version,
            solutionName: rawCdkJson.context.solution_name,
            applicationTrademarkName: rawCdkJson.context.application_trademark_name
        });
        nestedStack = new DynamoDBChatStorage(stack, 'ChatStorage', {
            parameters: {
                UseCaseType: USE_CASE_TYPES.AGENT
            }
        });
        template = Template.fromStack(nestedStack);
    });

    it('should create the dynamoDB table (ModelInfo) with condition when with useCaseType as Agent', () => {
        // The ModelInfoTable should be conditionally created based on CreateModelInfoTableStorage parameter

        // Still 2 because the resource is defined but with a condition
        template.resourceCountIs('AWS::DynamoDB::Table', 2);

        // Find the model info table and verify it has a condition
        const resources = template.findResources('AWS::DynamoDB::Table');
        const modelInfoTableKey = Object.keys(resources).find((key) =>
            resources[key].Properties.KeySchema.some(
                (schema: { AttributeName: string; KeyType: string }) =>
                    schema.AttributeName === 'UseCase' && schema.KeyType === 'HASH'
            )
        );

        if (modelInfoTableKey) {
            expect(resources[modelInfoTableKey].Condition).toBeDefined();
        } else {
            fail('Model info table not found in template');
        }
    });
});
