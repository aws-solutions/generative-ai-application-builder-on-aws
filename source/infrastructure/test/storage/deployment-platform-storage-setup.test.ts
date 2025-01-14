// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import * as cdk from 'aws-cdk-lib';
import { Capture, Match, Template } from 'aws-cdk-lib/assertions';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as s3 from 'aws-cdk-lib/aws-s3';

import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as rawCdkJson from '../../cdk.json';
import { DeploymentPlatformStorageSetup } from '../../lib/storage/deployment-platform-storage-setup';
import {
    COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME,
    MODEL_INFO_TABLE_NAME_ENV_VAR,
    USE_CASE_CONFIG_TABLE_NAME_ENV_VAR,
    USE_CASES_TABLE_NAME_ENV_VAR
} from '../../lib/utils/constants';

describe('When creating the use case storage construct', () => {
    let template: Template;
    beforeAll(() => {
        const app = new cdk.App();
        const stack = new cdk.Stack(app, 'TestStack');

        const mockLambdaFuncProps = {
            code: lambda.Code.fromAsset('../infrastructure/test/mock-lambda-func/node-lambda'),
            runtime: COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME,
            handler: 'index.handler'
        };
        const deploymentLambda = new lambda.Function(stack, 'deploymentLambda', mockLambdaFuncProps);
        const modelInfoLambda = new lambda.Function(stack, 'modelInfoLambda', mockLambdaFuncProps);
        const crLambda = new lambda.Function(stack, 'customResourceLambda', mockLambdaFuncProps);

        new DeploymentPlatformStorageSetup(stack, 'TestSetup', {
            deploymentApiLambda: deploymentLambda,
            modelInfoApiLambda: modelInfoLambda,
            customResourceLambda: crLambda,
            customResourceRole: crLambda.role! as iam.Role,
            solutionID: rawCdkJson.context.solution_id,
            solutionVersion: rawCdkJson.context.solution_version,
            solutionName: rawCdkJson.context.solution_name,
            applicationTrademarkName: rawCdkJson.context.application_trademark_name,
            accessLoggingBucket: new s3.Bucket(stack, 'fakelogggingbucket')
        });
        template = Template.fromStack(stack);
    });

    it('deployment platform api lambda is properly configured to access dynamodb with environment variables', () => {
        let nestedStackCapture = new Capture();
        let useCaseTableCapture = new Capture();
        let modelInfoTableCapture = new Capture();

        // use case mgmt, model info, custom resource
        template.resourceCountIs('AWS::Lambda::Function', 3);

        // model info lambda
        template.hasResourceProperties('AWS::Lambda::Function', {
            Environment: {
                Variables: {
                    [MODEL_INFO_TABLE_NAME_ENV_VAR]: {
                        'Fn::GetAtt': [nestedStackCapture, modelInfoTableCapture]
                    }
                }
            }
        });

        // use case mgmt lambda
        template.hasResourceProperties('AWS::Lambda::Function', {
            Environment: {
                Variables: {
                    [USE_CASES_TABLE_NAME_ENV_VAR]: {
                        'Fn::GetAtt': [nestedStackCapture.asString(), useCaseTableCapture]
                    },
                    [MODEL_INFO_TABLE_NAME_ENV_VAR]: {
                        'Fn::GetAtt': [nestedStackCapture.asString(), modelInfoTableCapture]
                    },
                    [USE_CASE_CONFIG_TABLE_NAME_ENV_VAR]: {
                        'Fn::GetAtt': [nestedStackCapture.asString(), Match.anyValue()]
                    }
                }
            }
        });

        // can read and write use cases table
        template.hasResourceProperties('AWS::IAM::Policy', {
            'PolicyDocument': {
                'Statement': [
                    {
                        'Action': [
                            'dynamodb:BatchGetItem',
                            'dynamodb:GetRecords',
                            'dynamodb:GetShardIterator',
                            'dynamodb:Query',
                            'dynamodb:GetItem',
                            'dynamodb:Scan',
                            'dynamodb:ConditionCheckItem',
                            'dynamodb:DescribeTable'
                        ],
                        'Effect': 'Allow',
                        'Resource': [
                            {
                                'Fn::GetAtt': [nestedStackCapture.asString(), useCaseTableCapture]
                            },
                            {
                                'Ref': 'AWS::NoValue'
                            }
                        ]
                    }
                ],
                'Version': '2012-10-17'
            }
        });

        // expect all captured values in modelInfoTableCapture start with same string
        for (let i = 0; i < modelInfoTableCapture._captured.length; i++) {
            expect(modelInfoTableCapture._captured[i]).toContain(
                'TestStackTestSetupDeploymentPlatformStorageModelInfoStorageModelInfoStore'
            );
        }
    });
});
