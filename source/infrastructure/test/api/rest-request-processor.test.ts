// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import * as cdk from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';

import { Capture, Match, Template } from 'aws-cdk-lib/assertions';
import * as rawCdkJson from '../../cdk.json';
import { RestRequestProcessor } from '../../lib/api/rest-request-processor';
import {
    CLIENT_ID_ENV_VAR,
    COGNITO_POLICY_TABLE_ENV_VAR,
    COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME,
    USER_POOL_ID_ENV_VAR
} from '../../lib/utils/constants';
import { CognitoSetup, UserPoolClientProps, UserPoolProps } from '../../lib/auth/cognito-setup';

describe('When deploying', () => {
    let template: Template;
    let jsonTemplate: any;

    beforeAll(() => {
        [template, jsonTemplate] = createTemplate({
            defaultUserEmail: 'fake-user@example.com',
            applicationTrademarkName: rawCdkJson.context.application_trademark_name,
            userGroupName: 'admin',
            customResourceLambdaArn: 'arn:aws:lambda:us-east-1:fake-account-id:function/fake-function'
        });
    });

    it('Should have lambdas for custom resource, management APIs, AgentCore auth, and Authorization', () => {
        // Newer deployments include an additional Lambda function in this construct; keep the assertion aligned.
        template.resourceCountIs('AWS::Lambda::Function', 8);

        template.hasResourceProperties('AWS::Lambda::Function', {
            'Role': {
                'Fn::GetAtt': [Match.stringLikeRegexp('WebSocketEndpointRestAuthorizerRole*'), 'Arn']
            },
            'Environment': {
                'Variables': {
                    [USER_POOL_ID_ENV_VAR]: {
                        'Fn::If': [
                            Match.stringLikeRegexp('TestCognitoSetupCreateUserPoolCondition*'),
                            {
                                'Ref': Match.stringLikeRegexp('TestCognitoSetupNewUserPool*')
                            }
                        ]
                    },
                    [CLIENT_ID_ENV_VAR]: {
                        'Fn::If': [
                            Match.stringLikeRegexp('TestCognitoSetupCreateUserPoolClientCondition*'),
                            {
                                'Fn::GetAtt': [Match.stringLikeRegexp('TestCognitoSetupCfnAppClient*'), 'ClientId']
                            }
                        ]
                    },
                    [COGNITO_POLICY_TABLE_ENV_VAR]: {
                        'Fn::If': [
                            Match.stringLikeRegexp('TestCognitoSetupCreateCognitoGroupPolicyTableCondition*'),
                            {
                                'Ref': Match.stringLikeRegexp('TestCognitoSetupCognitoGroupPolicyStore*')
                            }
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

    it('Should have an authorizer', () => {
        template.hasResourceProperties('AWS::ApiGateway::Authorizer', {
            AuthorizerResultTtlInSeconds: 0,
            AuthorizerUri: {
                'Fn::Join': [
                    '',
                    [
                        'arn:',
                        {
                            'Fn::Select': [
                                1,
                                {
                                    'Fn::Split': [
                                        ':',
                                        {
                                            'Fn::GetAtt': [
                                                Match.stringLikeRegexp('WebSocketEndpointDeploymentRestAuthorizer*'),
                                                'Arn'
                                            ]
                                        }
                                    ]
                                }
                            ]
                        },
                        ':apigateway:',
                        {
                            'Fn::Select': [
                                3,
                                {
                                    'Fn::Split': [
                                        ':',
                                        {
                                            'Fn::GetAtt': [
                                                Match.stringLikeRegexp('WebSocketEndpointDeploymentRestAuthorizer*'),
                                                'Arn'
                                            ]
                                        }
                                    ]
                                }
                            ]
                        },
                        ':lambda:path/2015-03-31/functions/',
                        {
                            'Fn::GetAtt': [Match.stringLikeRegexp('WebSocketEndpointDeploymentRestAuthorizer*'), 'Arn']
                        },
                        '/invocations'
                    ]
                ]
            },
            IdentitySource: 'method.request.header.Authorization',
            Name: 'WebSocketEndpointRestCustomRequestAuthorizerF45383BD',
            RestApiId: {
                'Ref': Match.stringLikeRegexp(
                    'WebSocketEndpointDeploymentRestEndpointDeploymentRestEndPointLambdaRestApi*'
                )
            },
            Type: 'REQUEST'
        });
    });

    it('Should have a validator', () => {
        template.hasResourceProperties('AWS::ApiGateway::RequestValidator', {
            Name: {
                'Fn::Join': [
                    '',
                    [
                        {
                            'Ref': 'AWS::StackName'
                        },
                        '-api-request-validator'
                    ]
                ]
            },
            RestApiId: {
                'Ref': Match.stringLikeRegexp(
                    'WebSocketEndpointDeploymentRestEndpointDeploymentRestEndPointLambdaRestApi*'
                )
            },
            ValidateRequestBody: true,
            ValidateRequestParameters: true
        });
    });
});

function createTemplate(props: Partial<UserPoolProps>): [cdk.assertions.Template, any] {
    let stack = new cdk.Stack();
    const mockLambdaFuncProps = {
        code: lambda.Code.fromAsset('../infrastructure/test/mock-lambda-func/node-lambda'),
        runtime: COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME,
        handler: 'index.handler'
    };

    const cloudFrontUrl = new cdk.CfnParameter(stack, 'CloudFrontUrl', {
        type: 'String'
    });
    const deployWebApp = new cdk.CfnParameter(stack, 'DeployWebInterface', {
        type: 'String',
        description:
            'Select "No", if you do not want to deploy the UI web application. Selecting No, will only create the infrastructure to host the APIs, the authentication for the APIs, and backend processing',
        allowedValues: ['Yes', 'No'],
        default: 'Yes'
    });

    const crLambda = new lambda.Function(stack, 'customResourceLambda', mockLambdaFuncProps);

    const cognitoSetup = new CognitoSetup(stack, 'TestCognitoSetup', {
        userPoolProps: {
            ...props,
            cognitoDomainPrefix: new cdk.CfnParameter(stack, 'CognitoDomainPrefix', {
                type: 'String',
                description:
                    'If you would like to provide a domain for the Cognito User Pool Client, please enter a value. If a value is not provided, the deployment will generate one',
                default: '',
                allowedPattern: '^$|^[a-z0-9](?:[a-z0-9\\-]{0,61}[a-z0-9])?$',
                constraintDescription:
                    'The provided domain prefix is not a valid format. The domain prefix should be be of the following format "^[a-z0-9](?:[a-z0-9\\-]{0,61}[a-z0-9])?$"',
                maxLength: 63
            }).valueAsString
        } as UserPoolProps,
        userPoolClientProps: {
            logoutUrl: cloudFrontUrl.valueAsString,
            callbackUrl: cloudFrontUrl.valueAsString
        } as UserPoolClientProps,
        deployWebApp: deployWebApp.valueAsString
    });

    new RestRequestProcessor(stack, 'WebSocketEndpoint', {
        useCaseManagementAPILambda: new lambda.Function(stack, 'chatLambda', mockLambdaFuncProps),
        modelInfoAPILambda: new lambda.Function(stack, 'modelInfoLambda', mockLambdaFuncProps),
        mcpManagementAPILambda: new lambda.Function(stack, 'mcpManagementLambda', mockLambdaFuncProps),
        agentManagementAPILambda: new lambda.Function(stack, 'agentManagementLambda', mockLambdaFuncProps),
        workflowManagementAPILambda: new lambda.Function(stack, 'workflowManagementLambda', mockLambdaFuncProps),
        tenantManagementAPILambda: new lambda.Function(stack, 'tenantManagementLambda', mockLambdaFuncProps),
        applicationTrademarkName: 'fake-name',
        defaultUserEmail: 'testuser@example.com',
        customResourceLambdaArn: crLambda.functionArn,
        customResourceRoleArn: crLambda.role!.roleArn,
        cognitoDomainPrefix: 'fake-prefix',
        cloudFrontUrl: cloudFrontUrl.valueAsString,
        deployWebApp: deployWebApp.valueAsString,
        existingCognitoUserPoolId: new cdk.CfnParameter(stack, 'ExistingCognitoUserPoolId', {
            type: 'String'
        }).valueAsString,
        existingCognitoUserPoolClientId: new cdk.CfnParameter(stack, 'ExistingCognitoUserPoolClientId', {
            type: 'String'
        }).valueAsString,
        cognitoSetup: cognitoSetup
    });
    const template = Template.fromStack(stack);
    return [template, template.toJSON()];
}
