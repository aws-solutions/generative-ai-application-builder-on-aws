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
import { Capture, Match, Template } from 'aws-cdk-lib/assertions';

import * as lambda from 'aws-cdk-lib/aws-lambda';
import { DeploymentPlatformStorageSetup } from '../../lib/storage/deployment-platform-storage-setup';
import { COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME, USE_CASES_TABLE_NAME_ENV_VAR } from '../../lib/utils/constants';

describe('When creating the use case storage construct', () => {
    let template: Template;
    beforeAll(() => {
        const app = new cdk.App();
        const stack = new cdk.Stack(app, 'TestStack');

        // dummy for testing
        const lambdaFunction = new lambda.Function(stack, 'MyLambdaFunction', {
            code: lambda.Code.fromInline(`
          exports.handler = (event, context, callback) => {
              callback(null, "Hello World!");
          };
      `),
            runtime: COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME,
            handler: 'index.handler',
            timeout: cdk.Duration.seconds(3)
        });

        new DeploymentPlatformStorageSetup(stack, 'TestSetup', {
            deploymentApiLambda: lambdaFunction
        });
        template = Template.fromStack(stack);
    });

    it('deployment platform api lambda is properly configured to access dynamodb with environment variable', () => {
        let useCaseTableCapture = new Capture();
        template.hasResourceProperties('AWS::Lambda::Function', {
            Environment: {
                Variables: {
                    [USE_CASES_TABLE_NAME_ENV_VAR]: {
                        'Fn::GetAtt': [
                            useCaseTableCapture,
                            Match.stringLikeRegexp('Outputs.TestStackTestSetupDeploymentPlatformStorageUseCasesTable*')
                        ]
                    }
                }
            }
        });

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
                            'dynamodb:BatchWriteItem',
                            'dynamodb:PutItem',
                            'dynamodb:UpdateItem',
                            'dynamodb:DeleteItem',
                            'dynamodb:DescribeTable'
                        ],
                        'Effect': 'Allow',
                        'Resource': [
                            {
                                'Fn::GetAtt': [
                                    Match.stringLikeRegexp(
                                        'TestSetupDeploymentPlatformStorageNestedStackDeploymentPlatformStorageNestedStackResource*'
                                    ),
                                    Match.stringLikeRegexp(
                                        'Outputs.TestStackTestSetupDeploymentPlatformStorageUseCasesTable*'
                                    )
                                ]
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
    });
});
