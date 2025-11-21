// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

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
                userPoolClientId: 'fakeClientId',
                useCaseUUID: 'fakeUUID'
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
        const deployWebApp = new cdk.CfnParameter(stack, 'DeployWebInterface', {
            type: 'String',
            description:
                'Select "No", if you do not want to deploy the UI web application. Selecting No, will only create the infrastructure to host the APIs, the authentication for the APIs, and backend processing',
            allowedValues: ['Yes', 'No'],
            allowedPattern: '^Yes|No$',
            default: 'Yes'
        });
        const deployWebAppCondition = new cdk.CfnCondition(cdk.Stack.of(stack), 'DeployWebApp', {
            expression: cdk.Fn.conditionEquals(deployWebApp.valueAsString, 'Yes')
        });

        applicationSetup.createWebConfigStorage(
            {
                restApiEndpoint: new apigateway.LambdaRestApi(stack, 'Api', {
                    handler: new lambda.Function(stack, 'Function', {
                        code: lambda.Code.fromAsset('../infrastructure/test/mock-lambda-func/python-lambda'),
                        handler: 'function.handler',
                        runtime: COMMERCIAL_REGION_LAMBDA_PYTHON_RUNTIME
                    })
                }).url,
                userPoolId: userPool.userPoolId,
                userPoolClientId: userPoolClient.ref,
                cognitoRedirectUrl: 'https://fake-redirect-url',
                isInternalUserCondition: new cdk.CfnCondition(stack, 'TestCondition', {
                    expression: cdk.Fn.conditionEquals('Yes', 'Yes')
                }),
                deployWebAppCondition: deployWebAppCondition
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
            RestApiEndpoint: {
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
        const deployWebApp = new cdk.CfnParameter(stack, 'DeployWebInterface', {
            type: 'String',
            description:
                'Select "No", if you do not want to deploy the UI web application. Selecting No, will only create the infrastructure to host the APIs, the authentication for the APIs, and backend processing',
            allowedValues: ['Yes', 'No'],
            allowedPattern: '^Yes|No$',
            default: 'Yes'
        });
        const deployWebAppCondition = new cdk.CfnCondition(cdk.Stack.of(stack), 'DeployWebApp', {
            expression: cdk.Fn.conditionEquals(deployWebApp.valueAsString, 'Yes')
        });

        applicationSetup.createWebConfigStorage(
            {
                restApiEndpoint: new apigateway.LambdaRestApi(stack, 'Api', {
                    handler: new lambda.Function(stack, 'Function', {
                        code: lambda.Code.fromAsset('../infrastructure/test/mock-lambda-func/python-lambda'),
                        handler: 'function.handler',
                        runtime: COMMERCIAL_REGION_LAMBDA_PYTHON_RUNTIME
                    })
                }).url,
                userPoolId: userPool.userPoolId,
                userPoolClientId: userPoolClient.ref,
                cognitoRedirectUrl: 'https://fake-redirect-url',
                isInternalUserCondition: new cdk.CfnCondition(stack, 'TestCondition', {
                    expression: cdk.Fn.conditionEquals('Yes', 'Yes')
                }),
                additionalProperties: { AdditionalProperty: 'some value' },
                deployWebAppCondition: deployWebAppCondition
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
            RestApiEndpoint: {
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

describe('Before and after addMetricsCustomLambda is called', () => {
    let template: Template;

    beforeAll(() => {
        const app = new cdk.App();
        const stack = new cdk.Stack(app, 'TestStack');
        template = Template.fromStack(stack);
    });

    it('should have a not Custom Data resource', () => {
        template.resourceCountIs('Custom::Data', 0);
    });

    describe('When addMetricsCustomLambda is called', () => {
        beforeAll(() => {
            const app = new cdk.App();
            const stack = new cdk.Stack(app, 'TestStack');

            const applicationSetup = new ApplicationSetup(stack, 'TestSetup', {
                solutionID: rawCdkJson.context.solution_id,
                solutionVersion: rawCdkJson.context.solution_version
            });

            applicationSetup.addMetricsCustomLambda('SO0999', 'v9.9.9');
            template = Template.fromStack(stack);
        });

        it('should have a Custom Data properties', () => {
            const customResourceLambda = new Capture();
            template.resourceCountIs('Custom::Data', 1);
            template.hasResourceProperties('Custom::Data', {
                ServiceToken: {
                    'Fn::GetAtt': [customResourceLambda, 'Arn']
                },
                Resource: 'METRIC',
                SolutionId: 'SO0999',
                Version: 'v9.9.9'
            });
        });
    });
});

describe('RestApiId and WebsockApiId', () => {
    let app: cdk.App;
    let stack: cdk.Stack;
    let template: Template;

    beforeEach(() => {
        app = new cdk.App();
        stack = new cdk.Stack(app, 'TestStack');
    });

    describe('createWebConfigStorage', () => {
        it('should create custom resource with both websocket and REST API endpoints when websocket is provided', () => {
            const applicationSetup = new ApplicationSetup(stack, 'TestApplicationSetup', {
                solutionID: 'TEST',
                solutionVersion: '1.0.0'
            });

            const isInternalUserCondition = new cdk.CfnCondition(stack, 'IsInternalUser', {
                expression: cdk.Fn.conditionEquals('true', 'true')
            });

            const deployWebAppCondition = new cdk.CfnCondition(stack, 'DeployUI', {
                expression: cdk.Fn.conditionEquals('true', 'true')
            });

            applicationSetup.createWebConfigStorage(
                {
                    userPoolId: 'test-user-pool-id',
                    userPoolClientId: 'test-client-id',
                    cognitoRedirectUrl: 'https://example.com',
                    isInternalUserCondition: isInternalUserCondition,
                    restApiEndpoint: 'https://api.example.com',
                    websockApiEndpoint: 'wss://websocket.example.com',
                    deployWebAppCondition: deployWebAppCondition,
                    useCaseUUID: 'test-uuid'
                },
                '/test/webconfig'
            );

            template = Template.fromStack(stack);

            // Verify the custom resource is created with both endpoints
            template.hasResourceProperties('Custom::WriteWebConfig', {
                ServiceToken: Match.anyValue(),
                Resource: 'WEBCONFIG',
                SSMKey: '/test/webconfig',
                UserPoolId: 'test-user-pool-id',
                UserPoolClientId: 'test-client-id',
                CognitoRedirectUrl: 'https://example.com',
                IsInternalUser: Match.anyValue(),
                RestApiEndpoint: 'https://api.example.com',
                WebsocketApiEndpoint: 'wss://websocket.example.com',
                UseCaseId: 'test-uuid'
            });
        });

        it('should create custom resource with only REST API endpoint when websocket is not provided', () => {
            const applicationSetup = new ApplicationSetup(stack, 'TestApplicationSetup', {
                solutionID: 'TEST',
                solutionVersion: '1.0.0'
            });

            const isInternalUserCondition = new cdk.CfnCondition(stack, 'IsInternalUser', {
                expression: cdk.Fn.conditionEquals('true', 'true')
            });

            const deployWebAppCondition = new cdk.CfnCondition(stack, 'DeployUI', {
                expression: cdk.Fn.conditionEquals('true', 'true')
            });

            applicationSetup.createWebConfigStorage(
                {
                    userPoolId: 'test-user-pool-id',
                    userPoolClientId: 'test-client-id',
                    cognitoRedirectUrl: 'https://example.com',
                    isInternalUserCondition: isInternalUserCondition,
                    restApiEndpoint: 'https://api.example.com',
                    useCaseUUID: 'test-uuid',
                    deployWebAppCondition: deployWebAppCondition
                },
                '/test/webconfig'
            );

            template = Template.fromStack(stack);

            // Verify the custom resource is created without websocket endpoint
            template.hasResourceProperties('Custom::WriteWebConfig', {
                ServiceToken: Match.anyValue(),
                Resource: 'WEBCONFIG',
                SSMKey: '/test/webconfig',
                UserPoolId: 'test-user-pool-id',
                UserPoolClientId: 'test-client-id',
                CognitoRedirectUrl: 'https://example.com',
                IsInternalUser: Match.anyValue(),
                RestApiEndpoint: 'https://api.example.com',
                UseCaseId: 'test-uuid'
            });

            // Verify WebsocketApiEndpoint is not present
            template.hasResource('Custom::WriteWebConfig', {
                Properties: Match.objectLike({
                    WebsocketApiEndpoint: Match.absent()
                })
            });
        });
    });
});
