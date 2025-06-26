// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import * as cdk from 'aws-cdk-lib';
import * as rawCdkJson from '../cdk.json';

import { Match, Template } from 'aws-cdk-lib/assertions';

import { SageMakerChat } from '../lib/sagemaker-chat-stack';
import { LANGCHAIN_LAMBDA_PYTHON_RUNTIME } from '../lib/utils/constants';

describe('When Chat use case is created', () => {
    let template: Template;
    let stack: cdk.Stack;

    beforeAll(() => {
        [template, stack] = buildStack();
    });

    it('should create chat provider lambda function with correct env vars set', () => {
        template.hasResourceProperties('AWS::Lambda::Function', {
            'Handler': 'sagemaker_handler.lambda_handler',
            'MemorySize': 256,
            'Runtime': LANGCHAIN_LAMBDA_PYTHON_RUNTIME.name,
            'Timeout': 900,
            'Environment': {
                'Variables': {
                    'CONVERSATION_TABLE_NAME': {
                        'Fn::GetAtt': [
                            Match.stringLikeRegexp(
                                'ChatStorageSetupChatStorageNestedStackChatStorageNestedStackResource*'
                            ),
                            Match.stringLikeRegexp('Outputs.ChatStackChatStorageSetupChatStorageConversationTable*')
                        ]
                    },
                    'KENDRA_INDEX_ID': {
                        'Fn::If': [
                            'DeployKendraIndexCondition',
                            {
                                'Fn::GetAtt': [
                                    Match.stringLikeRegexp(
                                        'KnowledgeBaseSetupKendraKnowledgeBaseNestedStackKendraKnowledgeBaseNestedStackResource*'
                                    ),
                                    Match.stringLikeRegexp('Outputs.ChatStackKnowledgeBaseSetupKendraKnowledgeBase*')
                                ]
                            },
                            {
                                'Ref': 'ExistingKendraIndexId'
                            }
                        ]
                    },
                    'WEBSOCKET_CALLBACK_URL': {
                        'Fn::Join': [
                            '',
                            [
                                'https://',
                                {
                                    'Ref': Match.stringLikeRegexp(
                                        'WebsocketRequestProcessorWebSocketEndpointApiGatewayV2WebSocketToSqsWebSocketApi*'
                                    )
                                },
                                '.execute-api.',
                                {
                                    'Ref': 'AWS::Region'
                                },
                                '.',
                                {
                                    'Ref': 'AWS::URLSuffix'
                                },
                                '/prod'
                            ]
                        ]
                    }
                }
            }
        });
    });

    it('should create chat provider lambda function with permissions to invoke the sagemaker APIs', () => {
        template.hasResourceProperties('AWS::IAM::Policy', {
            'PolicyDocument': {
                'Statement': [
                    {
                        'Action': ['sagemaker:InvokeEndpoint', 'sagemaker:InvokeEndpointWithResponseStream'],
                        'Effect': 'Allow',
                        'Resource': [
                            {
                                'Fn::Join': [
                                    '',
                                    [
                                        'arn:',
                                        {
                                            'Ref': 'AWS::Partition'
                                        },
                                        ':sagemaker:',
                                        {
                                            'Ref': 'AWS::Region'
                                        },
                                        ':',
                                        {
                                            'Ref': 'AWS::AccountId'
                                        },
                                        ':endpoint/*'
                                    ]
                                ]
                            },
                            {
                                'Fn::Join': [
                                    '',
                                    [
                                        'arn:',
                                        {
                                            'Ref': 'AWS::Partition'
                                        },
                                        ':sagemaker:',
                                        {
                                            'Ref': 'AWS::Region'
                                        },
                                        ':',
                                        {
                                            'Ref': 'AWS::AccountId'
                                        },
                                        ':inference-component/*'
                                    ]
                                ]
                            }
                        ]
                    },
                    Match.anyValue(),
                    Match.anyValue(),
                    Match.anyValue(),
                    Match.anyValue(),
                    Match.anyValue()
                ],
                'Version': '2012-10-17'
            }
        });
    });

    it('should create UpdateLlmConfig custom resource with correct properties', () => {
        template.hasResourceProperties('Custom::UpdateLlmConfig', {
            ServiceToken: Match.anyValue(),
            Resource: 'UPDATE_LLM_CONFIG',
            USE_CASE_CONFIG_TABLE_NAME: { 'Ref': 'UseCaseConfigTableName' },
            USE_CASE_CONFIG_RECORD_KEY: { 'Ref': 'UseCaseConfigRecordKey' },
            USE_CASE_UUID: { 'Ref': 'UseCaseUUID' },
            CONVERSATION_TABLE_NAME: Match.anyValue()
        });
    });

    it('should have DynamoDB permissions for updating LLM config table', () => {
        template.hasResourceProperties('AWS::IAM::Policy', {
            PolicyDocument: {
                Statement: Match.arrayWith([
                    {
                        Action: 'dynamodb:UpdateItem',
                        Effect: 'Allow',
                        Resource: Match.objectLike({
                            'Fn::Join': Match.arrayWith([
                                '',
                                Match.arrayWith([
                                    'arn:',
                                    { Ref: 'AWS::Partition' },
                                    ':dynamodb:',
                                    { Ref: 'AWS::Region' },
                                    ':',
                                    { Ref: 'AWS::AccountId' },
                                    ':table/',
                                    { 'Ref': 'UseCaseConfigTableName' }
                                ])
                            ])
                        })
                    }
                ])
            },
            PolicyName: 'UpdateLLMConfigTablePolicy3BA02B6F',
            Roles: Match.arrayWith([
                {
                    Ref: 'UseCaseSetupCustomResourceLambdaRole043CC005'
                }
            ])
        });
    });
});

function buildStack(): [Template, cdk.Stack] {
    let template: Template;

    const app = new cdk.App({
        context: rawCdkJson.context
    });

    const solutionID = process.env.SOLUTION_ID ?? app.node.tryGetContext('solution_id');
    const version = process.env.VERSION ?? app.node.tryGetContext('solution_version');
    const solutionName = process.env.SOLUTION_NAME ?? app.node.tryGetContext('solution_name');

    const stack = new SageMakerChat(app, 'ChatStack', {
        solutionID: solutionID,
        solutionVersion: version,
        solutionName: solutionName,
        applicationTrademarkName: rawCdkJson.context.application_trademark_name
    });
    template = Template.fromStack(stack);

    return [template, stack];
}
