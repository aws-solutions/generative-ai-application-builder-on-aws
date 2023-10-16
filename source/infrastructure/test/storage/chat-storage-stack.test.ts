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

import * as cdk from 'aws-cdk-lib';
import * as rawCdkJson from '../../cdk.json';

import { Template } from 'aws-cdk-lib/assertions';
import { HuggingFaceChat } from '../../lib/hugging-face-chat-stack';
import { DynamoDBChatStorage } from '../../lib/storage/chat-storage-stack';

describe('When creating the nested stack for chat storage', () => {
    let nestedStack: DynamoDBChatStorage;
    let template: Template;

    beforeAll(() => {
        const app = new cdk.App();
        const stack = new HuggingFaceChat(app, 'ChatStack', {
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

        template.hasParameter('UseCaseUUID', {
            Type: 'String',
            AllowedPattern: '^[0-9a-fA-F]{8}$',
            MaxLength: 8,
            ConstraintDescription: 'Please provide an 8 character long UUID',
            Description:
                'UUID to identify this deployed use case within an application. Please provide an 8 character long UUID. If you are editing the stack, do not modify the value (retain the value used during creating the stack). A different UUID when editing the stack will result in new AWS resource created and deleting the old ones'
        });
    });

    it('should create 1 dynamoDB table', () => {
        template.resourceCountIs('AWS::DynamoDB::Table', 1);

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
            'TableName': {
                'Ref': 'ConversationTableName'
            },
            'TimeToLiveSpecification': {
                'AttributeName': 'TTL',
                'Enabled': true
            }
        });
    });
});
