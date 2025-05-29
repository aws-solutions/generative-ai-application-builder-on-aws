// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import * as cdk from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as rawCdkJson from '../../cdk.json';
import { ChatStorageSetup } from '../../lib/storage/chat-storage-setup';
import { COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME, USE_CASE_TYPES } from '../../lib/utils/constants';

describe('When creating the chat storage construct for text use case', () => {
    let template: Template;
    let nestedStackTemplate: Template;
    beforeAll(() => {
        const app = new cdk.App();
        const stack = new cdk.Stack(app, 'TestStack');

        const mockLambdaFuncProps = {
            code: lambda.Code.fromAsset('../infrastructure/test/mock-lambda-func/node-lambda'),
            runtime: COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME,
            handler: 'index.handler'
        };
        const crLambda = new lambda.Function(stack, 'customResourceLambda', mockLambdaFuncProps);

        const chatStorageSetup = new ChatStorageSetup(stack, 'TestSetup', {
            useCaseUUID: '11111111',
            existingModelInfoTableName: '',
            useCaseType: USE_CASE_TYPES.TEXT,
            newModelInfoTableCondition: new cdk.CfnCondition(stack, 'NewModelInfoTableCondition', {
                expression: cdk.Fn.conditionEquals(
                    new cdk.CfnParameter(stack, 'ExistingModelInfoTableName', {
                        type: 'String',
                        maxLength: 255,
                        allowedPattern: '^$|^[a-zA-Z0-9_.-]{3,255}$',
                        default: '',
                        description: 'DynamoDB table name for the table which contains model info and defaults.'
                    }).valueAsString,
                    ''
                )
            }),
            customResourceLambda: crLambda,
            customResourceRole: crLambda.role! as iam.Role,
            accessLoggingBucket: new s3.Bucket(stack, 'fakeaccesslog'),
            solutionID: rawCdkJson.context.solution_id,
            solutionVersion: rawCdkJson.context.solution_version,
            solutionName: rawCdkJson.context.solution_name,
            applicationTrademarkName: rawCdkJson.context.application_trademark_name
        });
        template = Template.fromStack(stack);
        nestedStackTemplate = Template.fromStack(chatStorageSetup.chatStorage);
    });

    it('nested stack is created', () => {
        template.resourceCountIs('AWS::CloudFormation::Stack', 1);
    });

    it('nested stack has both ddb tables', () => {
        // NOTE: actual table configuration tested in model-info-storage.test.ts
        nestedStackTemplate.resourceCountIs('AWS::DynamoDB::Table', 2);
    });

    it('passes the correct parameters to the nested stack', () => {
        template.hasResourceProperties('AWS::CloudFormation::Stack', {
            Parameters: {
                UseCaseType: USE_CASE_TYPES.TEXT
            }
        });
    });
});

describe('When creating the chat storage construct with an existing model info table', () => {
    let template: Template;
    let nestedStackTemplate: Template;
    beforeAll(() => {
        const app = new cdk.App();
        const stack = new cdk.Stack(app, 'TestStack');

        const mockLambdaFuncProps = {
            code: lambda.Code.fromAsset('../infrastructure/test/mock-lambda-func/node-lambda'),
            runtime: COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME,
            handler: 'index.handler'
        };
        const crLambda = new lambda.Function(stack, 'customResourceLambda', mockLambdaFuncProps);

        const chatStorageSetup = new ChatStorageSetup(stack, 'TestSetup', {
            useCaseUUID: '11111111',
            existingModelInfoTableName: 'fake-model-table',
            useCaseType: USE_CASE_TYPES.TEXT,
            newModelInfoTableCondition: new cdk.CfnCondition(stack, 'NewModelInfoTableCondition', {
                expression: cdk.Fn.conditionEquals(
                    new cdk.CfnParameter(stack, 'ExistingModelInfoTableName', {
                        type: 'String',
                        maxLength: 255,
                        allowedPattern: '^$|^[a-zA-Z0-9_.-]{3,255}$',
                        default: '',
                        description: 'DynamoDB table name for the table which contains model info and defaults.'
                    }).valueAsString,
                    ''
                )
            }),
            customResourceLambda: crLambda,
            customResourceRole: crLambda.role! as iam.Role,
            accessLoggingBucket: new s3.Bucket(stack, 'fakeaccesslog'),
            solutionID: rawCdkJson.context.solution_id,
            solutionVersion: rawCdkJson.context.solution_version,
            solutionName: rawCdkJson.context.solution_name,
            applicationTrademarkName: rawCdkJson.context.application_trademark_name
        });
        template = Template.fromStack(stack);
        nestedStackTemplate = Template.fromStack(chatStorageSetup.chatStorage);
    });

    it('nested stack is created', () => {
        template.resourceCountIs('AWS::CloudFormation::Stack', 1);
    });

    it('nested stack has 2 ddb tables', () => {
        // NOTE: actual table configuration tested in model-info-storage.test.ts
        nestedStackTemplate.resourceCountIs('AWS::DynamoDB::Table', 2);
    });
});

describe('When creating the chat storage construct for agent use case', () => {
    let template: Template;
    let nestedStackTemplate: Template;
    beforeAll(() => {
        const app = new cdk.App();
        const stack = new cdk.Stack(app, 'TestStack');

        const mockLambdaFuncProps = {
            code: lambda.Code.fromAsset('../infrastructure/test/mock-lambda-func/node-lambda'),
            runtime: COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME,
            handler: 'index.handler'
        };
        const crLambda = new lambda.Function(stack, 'customResourceLambda', mockLambdaFuncProps);

        const chatStorageSetup = new ChatStorageSetup(stack, 'TestSetup', {
            useCaseUUID: '11111111',
            existingModelInfoTableName: '',
            useCaseType: USE_CASE_TYPES.AGENT,
            newModelInfoTableCondition: new cdk.CfnCondition(stack, 'NewModelInfoTableCondition', {
                expression: cdk.Fn.conditionEquals(true, false)
            }),
            customResourceLambda: crLambda,
            customResourceRole: crLambda.role! as iam.Role,
            accessLoggingBucket: new s3.Bucket(stack, 'fakeaccesslog'),
            solutionID: rawCdkJson.context.solution_id,
            solutionVersion: rawCdkJson.context.solution_version,
            solutionName: rawCdkJson.context.solution_name,
            applicationTrademarkName: rawCdkJson.context.application_trademark_name
        });
        template = Template.fromStack(stack);
        nestedStackTemplate = Template.fromStack(chatStorageSetup.chatStorage);
    });

    it('nested stack is created', () => {
        template.resourceCountIs('AWS::CloudFormation::Stack', 1);
    });

    it('nested stack has the conversation table and a conditionally disabled model info table', () => {
        // Both tables are defined in the template, but the model info table has a condition
        nestedStackTemplate.resourceCountIs('AWS::DynamoDB::Table', 2);

        // Verify the conversation table exists
        nestedStackTemplate.hasResourceProperties('AWS::DynamoDB::Table', {
            'KeySchema': [
                {
                    'AttributeName': 'UserId',
                    'KeyType': 'HASH'
                },
                {
                    'AttributeName': 'ConversationId',
                    'KeyType': 'RANGE'
                }
            ]
        });

        // Find the model info table and verify it has a condition on its creation
        const resources = nestedStackTemplate.findResources('AWS::DynamoDB::Table');
        const modelInfoTableKey = Object.keys(resources).find((key) =>
            resources[key].Properties.KeySchema.some(
                (schema: { AttributeName: string; KeyType: string }) =>
                    schema.AttributeName === 'PK' || schema.AttributeName === 'UseCase'
            )
        );

        if (modelInfoTableKey) {
            expect(resources[modelInfoTableKey].Condition).toBeDefined();
        } else {
            fail('Model info table not found in template');
        }
    });

    it('passes the correct parameters to the nested stack', () => {
        template.hasResourceProperties('AWS::CloudFormation::Stack', {
            Parameters: {
                UseCaseType: USE_CASE_TYPES.AGENT
            }
        });
    });
});
