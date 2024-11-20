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
 **********************************************************************************************************************/

import * as cdk from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';

import { Match, Template } from 'aws-cdk-lib/assertions';

import { WebsocketRequestProcessor } from '../../lib/api/websocket-request-processor';
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

        const deployWebApp = new cdk.CfnParameter(stack, 'DeployWebInterface', {
            type: 'String',
            description:
                'Select "No", if you do not want to deploy the UI web application. Selecting No, will only create the infrastructure to host the APIs, the authentication for the APIs, and backend processing',
            allowedValues: ['Yes', 'No'],
            default: 'Yes'
        });

        const lambdaRouteMapping: Map<string, lambda.Function> = new Map();
        lambdaRouteMapping.set('Route1', new lambda.Function(stack, 'Route1Lambda', mockLambdaFuncProps));
        lambdaRouteMapping.set('Route2', new lambda.Function(stack, 'Route2Lambda', mockLambdaFuncProps));

        const requestProcessor = new WebsocketRequestProcessor(stack, 'WebSocketEndpoint', {
            applicationTrademarkName: 'fake-name',
            defaultUserEmail: 'testuser@example.com',
            existingCognitoUserPoolId: 'fake-id',
            existingCognitoGroupPolicyTableName: 'fake-table-arn',
            customResourceLambda: new lambda.Function(stack, 'customResourceLambda', mockLambdaFuncProps),
            useCaseUUID: 'fake-uuid',
            cognitoDomainPrefix: 'fake-prefix',
            existingCognitoUserPoolClientId: 'fake123clientid',
            cloudFrontUrl: 'https://fakeurl',
            deployWebApp: deployWebApp.valueAsString,
            lambdaRouteMapping: lambdaRouteMapping
        });

        template = Template.fromStack(stack);
        jsonTemplate = template.toJSON();
    });

    it('Should have lambdas for custom resource, chatProvider, onConnect, onDisconnect, and Authorization', () => {
        template.resourceCountIs('AWS::Lambda::Function', 6);

        template.hasResourceProperties('AWS::Lambda::Function', {
            'Role': {
                'Fn::GetAtt': [Match.stringLikeRegexp('onConnectLambdaRole*'), 'Arn']
            },
            'Handler': 'connect-handler.handler',
            'Runtime': COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME.name,
            'Timeout': 900
        });

        template.hasResourceProperties('AWS::Lambda::Function', {
            'Role': {
                'Fn::GetAtt': [Match.stringLikeRegexp('onDisconnectLambdaRole*'), 'Arn']
            },
            'Handler': 'disconnect-handler.handler',
            'Runtime': COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME.name,
            'Timeout': 900
        });

        template.hasResourceProperties('AWS::Lambda::Function', {
            'Role': {
                'Fn::GetAtt': [Match.stringLikeRegexp('WebSocketAuthorizerRole*'), 'Arn']
            },
            'Environment': {
                'Variables': {
                    [USER_POOL_ID_ENV_VAR]: {
                        'Fn::If': [
                            Match.stringLikeRegexp('WebSocketEndpointUseCaseCognitoSetupCreateUserPoolCondition*'),
                            {
                                'Ref': Match.stringLikeRegexp('WebSocketEndpointUseCaseCognitoSetupNewUserPool*')
                            },
                            'fake-id'
                        ]
                    },
                    [CLIENT_ID_ENV_VAR]: {
                        'Fn::If': [
                            Match.anyValue(),
                            {
                                'Fn::GetAtt': [
                                    Match.stringLikeRegexp('WebSocketEndpointUseCaseCognitoSetupCfnAppClient25158A55'),
                                    'ClientId'
                                ]
                            },
                            'fake123clientid'
                        ]
                    },
                    [COGNITO_POLICY_TABLE_ENV_VAR]: {
                        'Fn::If': [
                            Match.stringLikeRegexp(
                                'WebSocketEndpointUseCaseCognitoSetupCreateCognitoGroupPolicyTableCondition*'
                            ),
                            {
                                'Ref': Match.stringLikeRegexp(
                                    'WebSocketEndpointUseCaseCognitoSetupCognitoGroupPolicyStore*'
                                )
                            },
                            'fake-table-arn'
                        ]
                    }
                }
            },
            'Handler': 'websocket-authorizer.handler',
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

    it('should have the websocket routes', () => {
        template.resourceCountIs('AWS::SQS::Queue', 4);
        template.hasResourceProperties('AWS::ApiGatewayV2::Route', {
            ApiId: { Ref: Match.anyValue() },
            RouteKey: 'Route1',
            AuthorizationType: 'NONE',
            Target: Match.anyValue()
        });

        template.hasResourceProperties('AWS::ApiGatewayV2::Route', {
            ApiId: { Ref: Match.anyValue() },
            RouteKey: 'Route2',
            AuthorizationType: 'NONE',
            Target: Match.anyValue()
        });

        template.hasResourceProperties('AWS::ApiGatewayV2::Integration', {
            ApiId: {
                'Ref': Match.anyValue()
            },
            CredentialsArn: {
                'Fn::GetAtt': [Match.anyValue(), 'Arn']
            },
            IntegrationMethod: 'POST',
            IntegrationType: 'AWS',
            IntegrationUri: {
                'Fn::Join': [
                    '',
                    [
                        'arn:',
                        {
                            Ref: 'AWS::Partition'
                        },
                        ':apigateway:',
                        {
                            Ref: 'AWS::Region'
                        },
                        ':sqs:path/',
                        {
                            Ref: 'AWS::AccountId'
                        },
                        '/',
                        {
                            'Fn::GetAtt': [Match.anyValue(), 'QueueName']
                        }
                    ]
                ]
            },
            PassthroughBehavior: 'NEVER',
            RequestParameters: {
                'integration.request.header.Content-Type': "'application/x-www-form-urlencoded'"
            },
            RequestTemplates: {
                Route1: 'Action=SendMessage&MessageGroupId=$context.connectionId&MessageDeduplicationId=$context.requestId&MessageAttribute.1.Name=connectionId&MessageAttribute.1.Value.StringValue=$context.connectionId&MessageAttribute.1.Value.DataType=String&MessageAttribute.2.Name=requestId&MessageAttribute.2.Value.StringValue=$context.requestId&MessageAttribute.2.Value.DataType=String&MessageBody={"requestContext": {"authorizer": {"UserId": "$context.authorizer.UserId"}, "connectionId": "$context.connectionId"}, "message": $util.urlEncode($input.json($util.escapeJavaScript("$").replaceAll("\\\\\'","\'")))}'
            },
            TemplateSelectionExpression: 'Route1'
        });

        template.hasResourceProperties('AWS::ApiGatewayV2::Integration', {
            ApiId: {
                'Ref': Match.anyValue()
            },
            CredentialsArn: {
                'Fn::GetAtt': [Match.anyValue(), 'Arn']
            },
            IntegrationMethod: 'POST',
            IntegrationType: 'AWS',
            IntegrationUri: {
                'Fn::Join': [
                    '',
                    [
                        'arn:',
                        {
                            Ref: 'AWS::Partition'
                        },
                        ':apigateway:',
                        {
                            Ref: 'AWS::Region'
                        },
                        ':sqs:path/',
                        {
                            Ref: 'AWS::AccountId'
                        },
                        '/',
                        {
                            'Fn::GetAtt': [Match.anyValue(), 'QueueName']
                        }
                    ]
                ]
            },
            PassthroughBehavior: 'NEVER',
            RequestParameters: {
                'integration.request.header.Content-Type': "'application/x-www-form-urlencoded'"
            },
            RequestTemplates: {
                Route2: 'Action=SendMessage&MessageGroupId=$context.connectionId&MessageDeduplicationId=$context.requestId&MessageAttribute.1.Name=connectionId&MessageAttribute.1.Value.StringValue=$context.connectionId&MessageAttribute.1.Value.DataType=String&MessageAttribute.2.Name=requestId&MessageAttribute.2.Value.StringValue=$context.requestId&MessageAttribute.2.Value.DataType=String&MessageBody={"requestContext": {"authorizer": {"UserId": "$context.authorizer.UserId"}, "connectionId": "$context.connectionId"}, "message": $util.urlEncode($input.json($util.escapeJavaScript("$").replaceAll("\\\\\'","\'")))}'
            },
            TemplateSelectionExpression: 'Route2'
        });
    });

    it('Should have cognito resources', () => {
        template.resourceCountIs('AWS::Cognito::UserPool', 1);
        template.resourceCountIs('AWS::Cognito::UserPoolClient', 1);
        template.resourceCountIs('AWS::Cognito::UserPoolUser', 1);
        template.resourceCountIs('AWS::Cognito::UserPoolGroup', 1);
        template.resourceCountIs('AWS::Cognito::UserPoolUserToGroupAttachment', 1);
    });
});
