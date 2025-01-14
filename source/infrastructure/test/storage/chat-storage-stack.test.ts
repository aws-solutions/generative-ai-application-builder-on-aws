// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import * as cdk from 'aws-cdk-lib';
import * as rawCdkJson from '../../cdk.json';

import { Template } from 'aws-cdk-lib/assertions';
import { BedrockChat } from '../../lib/bedrock-chat-stack';
import { DynamoDBChatStorage } from '../../lib/storage/chat-storage-stack';

describe('When creating the nested stack for chat storage', () => {
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
        nestedStack = new DynamoDBChatStorage(stack, 'ChatStorage', {});
        template = Template.fromStack(nestedStack);
    });

    it('should template to have following parameters', () => {
        template.hasParameter('ConversationTableName', {
            Type: 'String',
            MaxLength: 255,
            AllowedPattern: '^$|^[a-zA-Z0-9_.-]{3,255}$',
            Description: 'DynamoDB table name for the table which will store the conversation state and history.'
        });
    });

    it('should create 2 dynamoDB tables', () => {
        template.resourceCountIs('AWS::DynamoDB::Table', 2);

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
    });
});
