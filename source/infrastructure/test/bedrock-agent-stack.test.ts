// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import * as cdk from 'aws-cdk-lib';
import { Match, Template } from 'aws-cdk-lib/assertions';
import * as rawCdkJson from '../cdk.json';
import { BedrockAgent } from '../lib/bedrock-agent-stack';
import {
    CHAT_PROVIDERS,
    COMMERCIAL_REGION_LAMBDA_PYTHON_RUNTIME,
    CONVERSATION_TABLE_NAME_ENV_VAR
} from '../lib/utils/constants';

describe('BedrockAgent Stack', () => {
    let template: Template;
    let stack: cdk.Stack;

    beforeAll(() => {
        [template, stack] = buildStack();
    });

    it('should have a Lambda function created', () => {
        template.hasResourceProperties('AWS::Lambda::Function', {
            Handler: 'handler.lambda_handler',
            Runtime: COMMERCIAL_REGION_LAMBDA_PYTHON_RUNTIME.name,
            Timeout: 900,
            Environment: {
                Variables: {
                    POWERTOOLS_SERVICE_NAME: 'BEDROCK_AGENT',
                    AGENT_ID: { 'Ref': 'BedrockAgentId' },
                    AGENT_ALIAS_ID: { 'Ref': 'BedrockAgentAliasId' }
                }
            }
        });
    });

    it('should have correct IAM permissions for the Lambda function', () => {
        template.hasResourceProperties('AWS::IAM::Policy', {
            PolicyDocument: {
                Statement: Match.arrayWith([
                    {
                        Action: 'bedrock:GetAgent',
                        Effect: 'Allow',
                        Resource: Match.objectLike({
                            'Fn::Join': Match.arrayWith([
                                '',
                                Match.arrayWith([
                                    'arn:',
                                    { Ref: 'AWS::Partition' },
                                    ':bedrock:',
                                    { Ref: 'AWS::Region' },
                                    ':',
                                    { Ref: 'AWS::AccountId' },
                                    ':agent/',
                                    { 'Ref': 'BedrockAgentId' }
                                ])
                            ])
                        })
                    },
                    {
                        Action: 'bedrock:InvokeAgent',
                        Effect: 'Allow',
                        Resource: Match.objectLike({
                            'Fn::Join': Match.arrayWith([
                                '',
                                Match.arrayWith([
                                    'arn:',
                                    { Ref: 'AWS::Partition' },
                                    ':bedrock:',
                                    { Ref: 'AWS::Region' },
                                    ':',
                                    { Ref: 'AWS::AccountId' },
                                    ':agent-alias/',
                                    { 'Ref': 'BedrockAgentId' },
                                    '/',
                                    { 'Ref': 'BedrockAgentAliasId' }
                                ])
                            ])
                        })
                    }
                ])
            }
        });
    });

    it('should have DynamoDB permissions for conversation table', () => {
        template.hasResourceProperties('AWS::IAM::Policy', {
            PolicyDocument: {
                Statement: Match.arrayWith([
                    {
                        Action: Match.arrayWith([
                            'dynamodb:BatchGetItem',
                            'dynamodb:BatchWriteItem',
                            'dynamodb:ConditionCheckItem',
                            'dynamodb:DeleteItem',
                            'dynamodb:DescribeTable',
                            'dynamodb:GetItem',
                            'dynamodb:GetRecords',
                            'dynamodb:GetShardIterator',
                            'dynamodb:PutItem',
                            'dynamodb:Query',
                            'dynamodb:Scan',
                            'dynamodb:UpdateItem'
                        ]),
                        Effect: 'Allow',
                        Resource: Match.arrayWith([
                            {
                                'Fn::GetAtt': Match.arrayWith([
                                    Match.stringLikeRegexp(
                                        'ChatStorageSetupChatStorageNestedStackChatStorageNestedStackResource.*'
                                    ),
                                    Match.stringLikeRegexp('.*ConversationTable.*Arn')
                                ])
                            }
                        ])
                    }
                ])
            },
            PolicyName: Match.stringLikeRegexp('InvokeAgentLambdaRoleDefaultPolicy.*'),
            Roles: Match.arrayWith([
                {
                    Ref: 'InvokeAgentLambdaRole61F85200'
                }
            ])
        });
    });

    it('should set environment variables for conversation table', () => {
        template.hasResourceProperties('AWS::Lambda::Function', {
            Environment: {
                Variables: Match.objectLike({
                    [CONVERSATION_TABLE_NAME_ENV_VAR]: Match.anyValue()
                })
            }
        });
    });

    it('BedrockAgentId parameter is created with correct properties', () => {
        template.hasParameter('BedrockAgentId', {
            Type: 'String',
            AllowedPattern: '^[0-9a-zA-Z]{1,10}$',
            MaxLength: 10,
            Description: 'Bedrock Agent Id',
            ConstraintDescription: 'Please provide a valid Bedrock Agent Id'
        });
    });

    it('BedrockAgentAliasId parameter is created with correct properties', () => {
        template.hasParameter('BedrockAgentAliasId', {
            Type: 'String',
            AllowedPattern: '^[0-9a-zA-Z]{1,10}$',
            MaxLength: 10,
            Description: 'Bedrock Agent Alias',
            ConstraintDescription: 'Please provide a valid Bedrock Agent Alias'
        });
    });

    it('should create a condition that is always false for ModelInfoTable', () => {
        template.hasCondition('NewModelInfoTableCondition', {
            'Fn::Equals': [true, false]
        });
    });

    it('getLlmProviderName returns BEDROCK_AGENT', () => {
        const bedrockAgent = new BedrockAgent(stack, 'TestBedrockAgent2', {
            solutionID: 'SO0999',
            solutionName: 'TestSolution',
            solutionVersion: '1.0.0',
            applicationTrademarkName: 'TestTrademark'
        });
        expect(bedrockAgent.getLlmProviderName()).toBe(CHAT_PROVIDERS.BEDROCK_AGENT);
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

    it('should create FeedbackEnabledCondition for UpdateLlmConfig custom resource', () => {
        template.hasCondition('FeedbackEnabledCondition', {
            'Fn::Equals': [{ 'Ref': 'FeedbackEnabled' }, 'Yes']
        });

        // Verify the condition is applied to the custom resource
        const resources = template.findResources('Custom::UpdateLlmConfig');
        const resourceKeys = Object.keys(resources);
        expect(resourceKeys.length).toBeGreaterThan(0);

        const customResource = resources[resourceKeys[0]];
        expect(customResource.Condition).toBe('FeedbackEnabledCondition');
    });

    it('should have validation rules preventing multimodal parameters for Bedrock Agent use cases', () => {
        const templateJson = template.toJSON();

        expect(templateJson.Rules.NoMultimodalEnabledForBedrockAgentRule).toEqual({
            RuleCondition: {
                'Fn::Equals': [{ 'Ref': 'MultimodalEnabled' }, 'Yes']
            },
            Assertions: [
                {
                    Assert: {
                        'Fn::Equals': ['false', 'true']
                    },
                    AssertDescription:
                        'Multimodal functionality is not supported for Bedrock Agent Use Cases. Please set MultimodalEnabled to No.'
                }
            ]
        });

        expect(templateJson.Rules.NoMultimodalBucketForBedrockAgentRule).toEqual({
            RuleCondition: {
                'Fn::Not': [
                    {
                        'Fn::Equals': [{ 'Ref': 'ExistingMultimodalDataBucket' }, '']
                    }
                ]
            },
            Assertions: [
                {
                    Assert: {
                        'Fn::Equals': ['false', 'true']
                    },
                    AssertDescription:
                        'Multimodal data bucket is not supported for Bedrock Agent Use Cases. Please leave ExistingMultimodalDataBucket empty.'
                }
            ]
        });

        expect(templateJson.Rules.NoMultimodalTableForBedrockAgentRule).toEqual({
            RuleCondition: {
                'Fn::Not': [
                    {
                        'Fn::Equals': [{ 'Ref': 'ExistingMultimodalDataMetadataTable' }, '']
                    }
                ]
            },
            Assertions: [
                {
                    Assert: {
                        'Fn::Equals': ['false', 'true']
                    },
                    AssertDescription:
                        'Multimodal metadata table is not supported for Bedrock Agent Use Cases. Please leave ExistingMultimodalDataMetadataTable empty.'
                }
            ]
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

    const stack = new BedrockAgent(app, 'ChatStack', {
        solutionID: solutionID,
        solutionVersion: version,
        solutionName: solutionName,
        applicationTrademarkName: rawCdkJson.context.application_trademark_name
    });
    template = Template.fromStack(stack);

    return [template, stack];
}
