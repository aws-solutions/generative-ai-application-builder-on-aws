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
import * as rawCdkJson from '../../cdk.json';

import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import * as lambda from 'aws-cdk-lib/aws-lambda';

import { ApplicationSetup } from '../../lib/framework/application-setup';
import { DashboardType } from '../../lib/metrics/custom-dashboard';
import { COMMERCIAL_REGION_LAMBDA_PYTHON_RUNTIME } from '../../lib/utils/constants';

describe('When AppSetup is created', () => {
    let template: Template;
    beforeAll(() => {
        const app = new cdk.App();
        const stack = new cdk.Stack(app, 'TestStack');
        new ApplicationSetup(stack, 'TestSetup', {
            solutionID: rawCdkJson.context.solution_id,
            solutionVersion: rawCdkJson.context.solution_version
        });
        template = Template.fromStack(stack);
    });

    it('should create an access logging bucket', () => {
        template.resourceCountIs('AWS::S3::Bucket', 1);
        template.hasResourceProperties('AWS::S3::Bucket', {
            BucketEncryption: {
                ServerSideEncryptionConfiguration: [
                    {
                        ServerSideEncryptionByDefault: {
                            SSEAlgorithm: 'AES256'
                        }
                    }
                ]
            },
            PublicAccessBlockConfiguration: {
                BlockPublicAcls: true,
                BlockPublicPolicy: true,
                IgnorePublicAcls: true,
                RestrictPublicBuckets: true
            }
        });
    });

    it('should have a lambda function', () => {
        template.resourceCountIs('AWS::Lambda::Function', 2);
    });
});

describe('When addCustomDashboard is called for use case', () => {
    let template: Template;

    beforeAll(() => {
        const app = new cdk.App();
        const stack = new cdk.Stack(app, 'TestStack');

        const applicationSetup = new ApplicationSetup(stack, 'TestSetup', {
            solutionID: rawCdkJson.context.solution_id,
            solutionVersion: rawCdkJson.context.solution_version
        });

        applicationSetup.addCustomDashboard(
            {
                apiName: new apigateway.LambdaRestApi(stack, 'Api', {
                    handler: new lambda.Function(stack, 'Function', {
                        code: lambda.Code.fromAsset('../infrastructure/test/mock-lambda-func/python-lambda'),
                        handler: 'function.handler',
                        runtime: COMMERCIAL_REGION_LAMBDA_PYTHON_RUNTIME
                    })
                }).restApiName,
                userPoolId: 'fakeUserPoolId',
                userPoolClientId: 'fakeClientId'
            },
            DashboardType.UseCase
        );
        template = Template.fromStack(stack);
    });

    it('should have a condition for custom dashboard deployment', () => {
        template.hasCondition('DeployCustomDashboard', {
            'Fn::Equals': [
                {
                    'Fn::FindInMap': ['FeaturesToDeploy', 'Deploy', 'CustomDashboard']
                },
                'Yes'
            ]
        });
    });

    it('should deploy a custom cloudwatch dashboard', () => {
        template.resourceCountIs('AWS::CloudWatch::Dashboard', 1);
    });
});

describe('When addCustomDashboard is called for use case', () => {
    let template: Template;

    beforeAll(() => {
        const app = new cdk.App();
        const stack = new cdk.Stack(app, 'TestStack');

        const applicationSetup = new ApplicationSetup(stack, 'TestSetup', {
            solutionID: rawCdkJson.context.solution_id,
            solutionVersion: rawCdkJson.context.solution_version
        });

        applicationSetup.addCustomDashboard(
            {
                apiName: new apigateway.LambdaRestApi(stack, 'Api', {
                    handler: new lambda.Function(stack, 'Function', {
                        code: lambda.Code.fromAsset('../infrastructure/test/mock-lambda-func/python-lambda'),
                        handler: 'function.handler',
                        runtime: COMMERCIAL_REGION_LAMBDA_PYTHON_RUNTIME
                    })
                }).restApiName,
                userPoolId: 'fakeUserPoolId',
                userPoolClientId: 'fakeClientId'
            },
            DashboardType.DeploymentPlatform
        );
        template = Template.fromStack(stack);
    });

    it('should have a condition for custom dashboard deployment', () => {
        template.hasCondition('DeployCustomDashboard', {
            'Fn::Equals': [
                {
                    'Fn::FindInMap': ['FeaturesToDeploy', 'Deploy', 'CustomDashboard']
                },
                'Yes'
            ]
        });
    });

    it('should deploy a custom cloudwatch dashboard', () => {
        template.resourceCountIs('AWS::CloudWatch::Dashboard', 1);
    });
});

describe('When createWebConfigStorage is called', () => {
    let template: Template;
    let stack: cdk.Stack;

    beforeAll(() => {
        const app = new cdk.App({
            context: rawCdkJson.context
        });
        stack = new cdk.Stack(app, 'TestStack');
        const applicationSetup = new ApplicationSetup(stack, 'TestSetup', {
            solutionID: rawCdkJson.context.solution_id,
            solutionVersion: rawCdkJson.context.solution_version
        });
        const userPool = new cognito.UserPool(stack, 'UserPool', {
            userPoolName: `${cdk.Aws.STACK_NAME}-UserPool`
        });
        const userPoolClient = new cognito.CfnUserPoolClient(stack, 'ClientApp', {
            userPoolId: userPool.userPoolId
        });
        applicationSetup.createWebConfigStorage(
            {
                apiEndpoint: new apigateway.LambdaRestApi(stack, 'Api', {
                    handler: new lambda.Function(stack, 'Function', {
                        code: lambda.Code.fromAsset('../infrastructure/test/mock-lambda-func/python-lambda'),
                        handler: 'function.handler',
                        runtime: COMMERCIAL_REGION_LAMBDA_PYTHON_RUNTIME
                    })
                }).url,
                userPoolId: userPool.userPoolId,
                userPoolClientId: userPoolClient.ref,
                isInternalUserCondition: new cdk.CfnCondition(stack, 'TestCondition', {
                    expression: cdk.Fn.conditionEquals('Yes', 'Yes')
                })
            },
            '/fake/ssm-key'
        );
        template = Template.fromStack(stack);
    });

    const lambdaCustomResourceCapture = new Capture();

    it('should create a custom resource to that provisions infrastructure to store WebConfig', () => {
        const userPoolCapture = new Capture();
        const userPoolClientCapture = new Capture();
        template.hasResourceProperties('Custom::WriteWebConfig', {
            ServiceToken: {
                'Fn::GetAtt': [lambdaCustomResourceCapture, 'Arn']
            },
            Resource: 'WEBCONFIG',
            SSMKey: '/fake/ssm-key',
            ApiEndpoint: {
                'Fn::Join': [
                    '',
                    [
                        'https://',
                        {
                            Ref: Match.anyValue()
                        },
                        '.execute-api.',
                        {
                            Ref: 'AWS::Region'
                        },
                        '.',
                        {
                            Ref: 'AWS::URLSuffix'
                        },
                        '/',
                        {
                            Ref: Match.anyValue()
                        },
                        '/'
                    ]
                ]
            },
            UserPoolId: {
                Ref: userPoolCapture
            },
            UserPoolClientId: {
                Ref: userPoolClientCapture
            }
        });

        const jsonTemplate = template.toJSON();

        expect(jsonTemplate['Resources'][lambdaCustomResourceCapture.asString()]['Type']).toEqual(
            'AWS::Lambda::Function'
        );
        expect(jsonTemplate['Resources'][userPoolCapture.asString()]['Type']).toEqual('AWS::Cognito::UserPool');
        expect(jsonTemplate['Resources'][userPoolClientCapture.asString()]['Type']).toEqual(
            'AWS::Cognito::UserPoolClient'
        );
    });

    it('should have a policy to write to SSM Parameter store', () => {
        template.hasResourceProperties('AWS::IAM::Policy', {
            PolicyDocument: {
                Statement: [
                    {
                        Action: ['ssm:DeleteParameter', 'ssm:GetParameter', 'ssm:PutParameter'],
                        Effect: 'Allow',
                        Resource: {
                            'Fn::Join': [
                                '',
                                [
                                    'arn:',
                                    { 'Ref': 'AWS::Partition' },
                                    ':ssm:',
                                    { 'Ref': 'AWS::Region' },
                                    ':',
                                    { 'Ref': 'AWS::AccountId' },
                                    ':parameter/gaab-webconfig/*'
                                ]
                            ]
                        }
                    }
                ],
                'Version': '2012-10-17'
            },
            PolicyName: Match.anyValue(),
            Roles: [
                {
                    Ref: Match.stringLikeRegexp('TestSetupCustomResourceLambdaRole*')
                }
            ]
        });
    });

    it('should have an exported output value', () => {
        template.hasOutput('WebConfigKey', {
            Value: '/fake/ssm-key'
        });
    });
});

describe('When passing additional properties to createWebConfigStorage', () => {
    let template: Template;
    let stack: cdk.Stack;

    beforeAll(() => {
        const app = new cdk.App({
            context: rawCdkJson.context
        });
        stack = new cdk.Stack(app, 'TestStack');
        const applicationSetup = new ApplicationSetup(stack, 'TestSetup', {
            solutionID: rawCdkJson.context.solution_id,
            solutionVersion: rawCdkJson.context.solution_version
        });
        const userPool = new cognito.UserPool(stack, 'UserPool', {
            userPoolName: `${cdk.Aws.STACK_NAME}-UserPool`
        });
        const userPoolClient = new cognito.CfnUserPoolClient(stack, 'ClientApp', {
            userPoolId: userPool.userPoolId
        });
        applicationSetup.createWebConfigStorage(
            {
                apiEndpoint: new apigateway.LambdaRestApi(stack, 'Api', {
                    handler: new lambda.Function(stack, 'Function', {
                        code: lambda.Code.fromAsset('../infrastructure/test/mock-lambda-func/python-lambda'),
                        handler: 'function.handler',
                        runtime: COMMERCIAL_REGION_LAMBDA_PYTHON_RUNTIME
                    })
                }).url,
                userPoolId: userPool.userPoolId,
                userPoolClientId: userPoolClient.ref,
                isInternalUserCondition: new cdk.CfnCondition(stack, 'TestCondition', {
                    expression: cdk.Fn.conditionEquals('Yes', 'Yes')
                }),
                additionalProperties: { AdditionalProperty: 'some value' }
            },
            '/fake/ssm-key'
        );
        template = Template.fromStack(stack);
    });

    const lambdaCustomResourceCapture = new Capture();

    it('should create a custom resource to that provisions infrastructure to store WebConfig', () => {
        const userPoolCapture = new Capture();
        const userPoolClientCapture = new Capture();
        template.hasResourceProperties('Custom::WriteWebConfig', {
            ServiceToken: {
                'Fn::GetAtt': [lambdaCustomResourceCapture, 'Arn']
            },
            Resource: 'WEBCONFIG',
            SSMKey: '/fake/ssm-key',
            ApiEndpoint: {
                'Fn::Join': [
                    '',
                    [
                        'https://',
                        {
                            Ref: Match.anyValue()
                        },
                        '.execute-api.',
                        {
                            Ref: 'AWS::Region'
                        },
                        '.',
                        {
                            Ref: 'AWS::URLSuffix'
                        },
                        '/',
                        {
                            Ref: Match.anyValue()
                        },
                        '/'
                    ]
                ]
            },
            UserPoolId: {
                Ref: userPoolCapture
            },
            UserPoolClientId: {
                Ref: userPoolClientCapture
            },
            AdditionalProperty: 'some value'
        });

        const jsonTemplate = template.toJSON();

        expect(jsonTemplate['Resources'][lambdaCustomResourceCapture.asString()]['Type']).toEqual(
            'AWS::Lambda::Function'
        );
        expect(jsonTemplate['Resources'][userPoolCapture.asString()]['Type']).toEqual('AWS::Cognito::UserPool');
        expect(jsonTemplate['Resources'][userPoolClientCapture.asString()]['Type']).toEqual(
            'AWS::Cognito::UserPoolClient'
        );
    });
});

describe('Before and after addAnonymousMetricsCustomLambda is called', () => {
    let template: Template;

    beforeAll(() => {
        const app = new cdk.App();
        const stack = new cdk.Stack(app, 'TestStack');
        template = Template.fromStack(stack);
    });

    it('should have a not Custom Anonymous Data resource', () => {
        template.resourceCountIs('Custom::AnonymousData', 0);
    });

    describe('When addAnonymousMetricsCustomLambda is called', () => {
        beforeAll(() => {
            const app = new cdk.App();
            const stack = new cdk.Stack(app, 'TestStack');

            const applicationSetup = new ApplicationSetup(stack, 'TestSetup', {
                solutionID: rawCdkJson.context.solution_id,
                solutionVersion: rawCdkJson.context.solution_version
            });

            applicationSetup.addAnonymousMetricsCustomLambda('SO0999', 'v9.9.9');
            template = Template.fromStack(stack);
        });

        it('should have a Custom Anonymous Data properties', () => {
            const customResourceLambda = new Capture();
            template.resourceCountIs('Custom::AnonymousData', 1);
            template.hasResourceProperties('Custom::AnonymousData', {
                ServiceToken: {
                    'Fn::GetAtt': [customResourceLambda, 'Arn']
                },
                Resource: 'ANONYMOUS_METRIC',
                SolutionId: 'SO0999',
                Version: 'v9.9.9'
            });
        });

        it('should have a custom resource block with a condition', () => {
            const conditionLogicalId = new Capture();
            template.hasResource('Custom::AnonymousData', {
                Type: 'Custom::AnonymousData',
                Properties: Match.anyValue(),
                UpdateReplacePolicy: 'Delete',
                DeletionPolicy: 'Delete',
                Condition: conditionLogicalId
            });
        });
    });
});
