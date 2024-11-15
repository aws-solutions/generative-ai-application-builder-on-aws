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
 *********************************************************************************************************************/
import * as cdk from 'aws-cdk-lib';
import { Match, Template } from 'aws-cdk-lib/assertions';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import { DeploymentPlatformModelInfoStorage } from '../../lib/storage/deployment-platform-model-info-storage';
import { COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME, DynamoDBAttributes } from '../../lib/utils/constants';

describe('Creating a conditional model store', () => {
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

        const modelInfoStorage = new DeploymentPlatformModelInfoStorage(stack, 'TestSetup', {
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
                }
            },
            UpdateReplacePolicy: 'Delete',
            DeletionPolicy: 'Delete'
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
            DependsOn: [Match.stringLikeRegexp('TestSetupModelInfoDDBScanDelete*')],
            UpdateReplacePolicy: 'Delete',
            DeletionPolicy: 'Delete'
        });
    });

    it('creates a policy for custom resource to perform ddb operations scan, batchwrite, and delete', () => {
        template.hasResourceProperties('AWS::IAM::Policy', {
            PolicyDocument: {
                Statement: [
                    {
                        Action: ['dynamodb:Scan', 'dynamodb:DeleteItem', 'dynamodb:BatchWriteItem'],
                        Effect: 'Allow',
                        Resource: {
                            'Fn::GetAtt': [Match.stringLikeRegexp('TestSetupModelInfoStore*'), 'Arn']
                        }
                    }
                ]
            }
        });
    });
});
