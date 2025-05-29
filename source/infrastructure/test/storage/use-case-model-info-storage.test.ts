// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0
import * as cdk from 'aws-cdk-lib';
import { Match, Template } from 'aws-cdk-lib/assertions';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import { UseCaseModelInfoStorage } from '../../lib/storage/use-case-model-info-storage';
import { COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME, DynamoDBAttributes, USE_CASE_TYPES } from '../../lib/utils/constants';

describe('Creating a model store with useCaseType as Text and empty existingModelInfoTableName', () => {
    let template: Template;

    beforeAll(() => {
        const app = new cdk.App();
        const stack = new cdk.Stack(app, 'TestStack');

        const mockLambdaFuncProps = {
            code: lambda.Code.fromAsset('../infrastructure/test/mock-lambda-func/node-lambda'),
            runtime: COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME,
            handler: 'index.handler'
        };
        const crLambda = new lambda.Function(stack, 'customResourceLambda', mockLambdaFuncProps);

        new UseCaseModelInfoStorage(stack, 'TestSetup', {
            existingModelInfoTableName: '',
            useCaseType: USE_CASE_TYPES.TEXT,
            customResourceLambdaArn: crLambda.functionArn,
            customResourceRoleArn: crLambda.role!.roleArn
        });
        template = Template.fromStack(stack);
    });

    it('creates a table', () => {
        template.resourceCountIs('AWS::DynamoDB::Table', 1);

        template.hasResource('AWS::DynamoDB::Table', {
            Properties: {
                KeySchema: [
                    {
                        AttributeName: DynamoDBAttributes.MODEL_INFO_TABLE_PARTITION_KEY,
                        KeyType: 'HASH'
                    },
                    {
                        AttributeName: DynamoDBAttributes.MODEL_INFO_TABLE_SORT_KEY,
                        KeyType: 'RANGE'
                    }
                ],
                AttributeDefinitions: [
                    {
                        AttributeName: DynamoDBAttributes.MODEL_INFO_TABLE_PARTITION_KEY,
                        AttributeType: 'S'
                    },
                    {
                        AttributeName: DynamoDBAttributes.MODEL_INFO_TABLE_SORT_KEY,
                        AttributeType: 'S'
                    }
                ],
                BillingMode: 'PAY_PER_REQUEST',
                SSESpecification: {
                    SSEEnabled: true
                },
                TimeToLiveSpecification: {
                    AttributeName: DynamoDBAttributes.TIME_TO_LIVE,
                    Enabled: true
                }
            },
            UpdateReplacePolicy: 'Delete',
            DeletionPolicy: 'Delete',
            Condition: Match.stringLikeRegexp('TestSetupCreateModelInfoTableCondition*')
        });
    });

    it('has the output for model storage table name', () => {
        template.hasOutput('ModelInfoTableName', {
            Value: Match.anyValue(),
            Description: 'Name of the model info table'
        });
    });

    it('creates a custom resource', () => {
        template.hasResource('Custom::CopyModelInfo', {
            Type: 'Custom::CopyModelInfo',
            Properties: {
                ServiceToken: {
                    'Fn::GetAtt': [Match.stringLikeRegexp('customResourceLambda*'), 'Arn']
                },
                SOURCE_BUCKET_NAME: Match.anyValue(),
                SOURCE_PREFIX: Match.anyValue(),
                Resource: 'COPY_MODEL_INFO',
                DDB_TABLE_NAME: {
                    Ref: Match.stringLikeRegexp('TestSetupModelInfoStore*')
                }
            },
            DependsOn: [
                Match.stringLikeRegexp('TestSetupAssetRead*'),
                Match.stringLikeRegexp('TestSetupModelInfoDDBScanDelete*')
            ],
            UpdateReplacePolicy: 'Delete',
            DeletionPolicy: 'Delete',
            Condition: Match.stringLikeRegexp('TestSetupCreateModelInfoTableCondition*')
        });
    });

    it('has the condition that checks both useCaseType and existingModelInfoTableName', () => {
        template.hasCondition('TestSetupCreateModelInfoTableConditionB9BB3F52', {
            'Fn::And': [
                {
                    'Fn::Equals': ['Text', 'Text']
                },
                {
                    'Fn::Equals': ['', '']
                }
            ]
        });
    });
});

describe('Creating a model store with useCaseType as Text and non-empty existingModelInfoTableName', () => {
    let template: Template;

    beforeAll(() => {
        const app = new cdk.App();
        const stack = new cdk.Stack(app, 'TestStack');

        const mockLambdaFuncProps = {
            code: lambda.Code.fromAsset('../infrastructure/test/mock-lambda-func/node-lambda'),
            runtime: COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME,
            handler: 'index.handler'
        };
        const crLambda = new lambda.Function(stack, 'customResourceLambda', mockLambdaFuncProps);

        new UseCaseModelInfoStorage(stack, 'TestSetup', {
            existingModelInfoTableName: 'fake-model-table',
            useCaseType: 'Text',
            customResourceLambdaArn: crLambda.functionArn,
            customResourceRoleArn: crLambda.role!.roleArn
        });
        template = Template.fromStack(stack);
    });

    it('creates a table but with condition that evaluates to false', () => {
        template.resourceCountIs('AWS::DynamoDB::Table', 1);

        template.hasCondition('TestSetupCreateModelInfoTableConditionB9BB3F52', {
            'Fn::And': [
                {
                    'Fn::Equals': ['Text', 'Text']
                },
                {
                    'Fn::Equals': ['fake-model-table', '']
                }
            ]
        });
    });
});

describe('Creating a model store with useCaseType Agent', () => {
    let template: Template;

    beforeAll(() => {
        const app = new cdk.App();
        const stack = new cdk.Stack(app, 'TestStack');

        const mockLambdaFuncProps = {
            code: lambda.Code.fromAsset('../infrastructure/test/mock-lambda-func/node-lambda'),
            runtime: COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME,
            handler: 'index.handler'
        };
        const crLambda = new lambda.Function(stack, 'customResourceLambda', mockLambdaFuncProps);

        new UseCaseModelInfoStorage(stack, 'TestSetup', {
            existingModelInfoTableName: '',
            useCaseType: 'Agent',
            customResourceLambdaArn: crLambda.functionArn,
            customResourceRoleArn: crLambda.role!.roleArn
        });
        template = Template.fromStack(stack);
    });

    it('creates a table but with condition that evaluates to false', () => {
        template.resourceCountIs('AWS::DynamoDB::Table', 1);

        template.hasCondition('TestSetupCreateModelInfoTableConditionB9BB3F52', {
            'Fn::And': [
                {
                    'Fn::Equals': ['Agent', 'Text']
                },
                {
                    'Fn::Equals': ['', '']
                }
            ]
        });
    });
});
