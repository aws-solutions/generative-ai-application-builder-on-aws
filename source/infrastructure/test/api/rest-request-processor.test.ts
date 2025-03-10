// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import * as cdk from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';

import { Capture, Match, Template } from 'aws-cdk-lib/assertions';

import { RestRequestProcessor } from '../../lib/api/rest-request-processor';
import {
    CLIENT_ID_ENV_VAR,
    COGNITO_POLICY_TABLE_ENV_VAR,
    COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME,
    USER_POOL_ID_ENV_VAR
} from '../../lib/utils/constants';

describe('When deploying', () => {
    let template: Template;
    let jsonTemplate: any;

    beforeAll(() => {
        const stack = new cdk.Stack();
        const mockLambdaFuncProps = {
            code: lambda.Code.fromAsset('../infrastructure/test/mock-lambda-func/node-lambda'),
            runtime: COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME,
            handler: 'index.handler'
        };

        const crLambda = new lambda.Function(stack, 'customResourceLambda', mockLambdaFuncProps);

        const deployWebApp = new cdk.CfnParameter(stack, 'DeployWebInterface', {
            type: 'String',
            description:
                'Select "No", if you do not want to deploy the UI web application. Selecting No, will only create the infrastructure to host the APIs, the authentication for the APIs, and backend processing',
            allowedValues: ['Yes', 'No'],
            allowedPattern: '^Yes|No$',
            default: 'Yes'
        });

        new RestRequestProcessor(stack, 'WebSocketEndpoint', {
            useCaseManagementAPILambda: new lambda.Function(stack, 'chatLambda', mockLambdaFuncProps),
            modelInfoAPILambda: new lambda.Function(stack, 'modelInfoLambda', mockLambdaFuncProps),
            applicationTrademarkName: 'fake-name',
            defaultUserEmail: 'testuser@example.com',
            customResourceLambdaArn: crLambda.functionArn,
            customResourceRoleArn: crLambda.role!.roleArn,
            cognitoDomainPrefix: 'fake-prefix',
            cloudFrontUrl: new cdk.CfnParameter(stack, 'CloudFrontUrl', {
                type: 'String'
            }).valueAsString,
            deployWebApp: deployWebApp.valueAsString,
            existingCognitoUserPoolId: new cdk.CfnParameter(stack, 'ExistingCognitoUserPoolId', {
                type: 'String'
            }).valueAsString,
            existingCognitoUserPoolClientId: new cdk.CfnParameter(stack, 'ExistingCognitoUserPoolClientId', {
                type: 'String'
            }).valueAsString
        });

        template = Template.fromStack(stack);
        jsonTemplate = template.toJSON();
    });

    it('Should have lambdas for custom resource, management APIs, and Authorization', () => {
        template.resourceCountIs('AWS::Lambda::Function', 4);

        template.hasResourceProperties('AWS::Lambda::Function', {
            'Role': {
                'Fn::GetAtt': [Match.stringLikeRegexp('WebSocketEndpointRestAuthorizerRole*'), 'Arn']
            },
            'Environment': {
                'Variables': {
                    [USER_POOL_ID_ENV_VAR]: {
                        'Fn::If': [
                            Match.stringLikeRegexp(
                                'WebSocketEndpointDeploymentPlatformCognitoSetupCreateUserPoolCondition'
                            ),
                            {
                                'Ref': Match.anyValue()
                            },
                            {
                                'Ref': 'ExistingCognitoUserPoolId'
                            }
                        ]
                    },
                    [CLIENT_ID_ENV_VAR]: {
                        'Fn::If': [
                            Match.stringLikeRegexp(
                                'WebSocketEndpointDeploymentPlatformCognitoSetupCreateUserPoolClientCondition'
                            ),
                            {
                                'Fn::GetAtt': [
                                    Match.stringLikeRegexp(
                                        'WebSocketEndpointDeploymentPlatformCognitoSetupCfnAppClient'
                                    ),
                                    'ClientId'
                                ]
                            },
                            {
                                'Ref': 'ExistingCognitoUserPoolClientId'
                            }
                        ]
                    },
                    [COGNITO_POLICY_TABLE_ENV_VAR]: {
                        'Fn::If': [
                            Match.stringLikeRegexp(
                                'WebSocketEndpointDeploymentPlatformCognitoSetupCreateCognitoGroupPolicyTableCondition'
                            ),
                            {
                                'Ref': Match.stringLikeRegexp(
                                    'WebSocketEndpointDeploymentPlatformCognitoSetupCognitoGroupPolicyStore'
                                )
                            },
                            ''
                        ]
                    }
                }
            },
            'Handler': 'rest-authorizer.handler',
            'Runtime': COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME.name,
            'Timeout': 900
        });
    });

    it('Should have a policy table', () => {
        template.hasResourceProperties('AWS::DynamoDB::Table', {
            'KeySchema': [
                {
                    'AttributeName': 'group',
                    'KeyType': 'HASH'
                }
            ],
            'AttributeDefinitions': [
                {
                    'AttributeName': 'group',
                    'AttributeType': 'S'
                }
            ],
            'BillingMode': 'PAY_PER_REQUEST',
            'SSESpecification': {
                'SSEEnabled': true
            }
        });
    });

    it('Should have cognito resources', () => {
        let userPoolIdCapture = new Capture();

        template.hasResourceProperties('AWS::Cognito::UserPool', {
            'UserPoolName': {
                'Fn::Join': [
                    '',
                    [
                        {
                            'Ref': 'AWS::StackName'
                        },
                        '-UserPool'
                    ]
                ]
            }
        });
        template.hasResourceProperties('AWS::Cognito::UserPoolClient', {
            'UserPoolId': {
                'Fn::If': [
                    Match.stringLikeRegexp('WebSocketEndpointDeploymentPlatformCognitoSetupCreateUserPoolCondition'),
                    {
                        'Ref': userPoolIdCapture
                    },
                    {
                        'Ref': 'ExistingCognitoUserPoolId'
                    }
                ]
            }
        });
        template.hasResourceProperties('AWS::Cognito::UserPoolUser', {
            'UserPoolId': {
                'Fn::If': [
                    Match.stringLikeRegexp('WebSocketEndpointDeploymentPlatformCognitoSetupCreateUserPoolCondition'),
                    {
                        'Ref': userPoolIdCapture.asString()
                    },
                    {
                        'Ref': 'ExistingCognitoUserPoolId'
                    }
                ]
            },
            'DesiredDeliveryMediums': ['EMAIL'],
            'ForceAliasCreation': false,
            'UserAttributes': [
                {
                    'Name': 'email',
                    'Value': 'testuser@example.com'
                }
            ],
            'Username': 'testuser-admin'
        });
        template.hasResourceProperties('AWS::Cognito::UserPoolGroup', {
            'UserPoolId': {
                'Fn::If': [
                    Match.stringLikeRegexp('WebSocketEndpointDeploymentPlatformCognitoSetupCreateUserPoolCondition'),
                    {
                        'Ref': userPoolIdCapture.asString()
                    },
                    {
                        'Ref': 'ExistingCognitoUserPoolId'
                    }
                ]
            },
            'GroupName': 'admin',
            'Precedence': 1
        });
        template.hasResourceProperties('AWS::Cognito::UserPoolUserToGroupAttachment', {
            'GroupName': 'admin',
            'Username': 'testuser-admin',
            'UserPoolId': {
                'Fn::If': [
                    Match.stringLikeRegexp('WebSocketEndpointDeploymentPlatformCognitoSetupCreateUserPoolCondition'),
                    {
                        'Ref': userPoolIdCapture.asString()
                    },
                    {
                        'Ref': 'ExistingCognitoUserPoolId'
                    }
                ]
            }
        });
    });
});
