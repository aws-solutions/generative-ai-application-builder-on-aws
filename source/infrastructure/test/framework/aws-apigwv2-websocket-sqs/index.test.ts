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
import * as apigwv2 from 'aws-cdk-lib/aws-apigatewayv2';
import * as lambda from 'aws-cdk-lib/aws-lambda';

import { Capture, Match, Template } from 'aws-cdk-lib/assertions';
import { WebSocketIamAuthorizer } from 'aws-cdk-lib/aws-apigatewayv2-authorizers';
import { WebSocketLambdaIntegration } from 'aws-cdk-lib/aws-apigatewayv2-integrations';
import { ApiGatewayV2WebSocketToSqs } from '../../../lib/framework/aws-apigwv2websocket-sqs';
import { COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME } from '../../../lib/utils/constants';

describe('When instantiating the ApiGatewayV2WebSocketToSqs construct with WebSocketApiProps', () => {
    let template: Template;
    let jsonTemplate;

    beforeAll(() => {
        const app = new cdk.App();
        const stack = new cdk.Stack(app, 'TestStack');
        const mockLambda = new lambda.Function(stack, 'mockFunction', {
            code: lambda.Code.fromAsset('../infrastructure/test/mock-lambda-func/node-lambda'),
            runtime: COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME,
            handler: 'index.handler'
        });

        new ApiGatewayV2WebSocketToSqs(stack, 'ApiGatewayV2WebSocketToSqs', {
            webSocketApiProps: {
                connectRouteOptions: {
                    integration: new WebSocketLambdaIntegration('ConnectIntegration', mockLambda)
                },
                disconnectRouteOptions: {
                    integration: new WebSocketLambdaIntegration('DisconnectIntegration', mockLambda)
                }
            }
        });
        template = Template.fromStack(stack);
        jsonTemplate = Template.fromStack(stack);
    });

    it('should have a FIFO queue and a DLQ', () => {
        template.hasResourceProperties('AWS::SQS::Queue', {
            DeduplicationScope: 'messageGroup',
            FifoQueue: true,
            FifoThroughputLimit: 'perMessageGroupId',
            RedriveAllowPolicy: {
                redrivePermission: 'denyAll'
            }
        });

        template.hasResourceProperties('AWS::SQS::Queue', {
            KmsMasterKeyId: 'alias/aws/sqs',
            FifoQueue: true,
            DeduplicationScope: 'messageGroup',
            FifoThroughputLimit: 'perMessageGroupId'
        });
    });

    it('should create an instance of the WebSocket', () => {
        template.hasResourceProperties('AWS::ApiGatewayV2::Api', {
            Name: 'WebSocketApi',
            ProtocolType: 'WEBSOCKET',
            RouteSelectionExpression: '$request.body.action'
        });
    });

    it('should have a websocket api with different route options', () => {
        template.resourceCountIs('AWS::ApiGatewayV2::Route', 2);

        template.hasResourceProperties('AWS::ApiGatewayV2::Route', {
            RouteKey: '$disconnect',
            AuthorizationType: 'NONE',
            Target: {
                'Fn::Join': ['', ['integrations/', Match.anyValue()]]
            }
        });

        template.hasResourceProperties('AWS::ApiGatewayV2::Route', {
            RouteKey: '$connect',
            AuthorizationType: 'AWS_IAM',
            Target: {
                'Fn::Join': ['', ['integrations/', Match.anyValue()]]
            }
        });
    });

    it('should have role with policy for cloudwatch, sqs, and KMS', () => {
        template.hasResourceProperties('AWS::IAM::Role', {
            AssumeRolePolicyDocument: {
                Statement: [
                    {
                        Action: 'sts:AssumeRole',
                        Effect: 'Allow',
                        Principal: {
                            Service: 'apigateway.amazonaws.com'
                        }
                    }
                ],
                Version: '2012-10-17'
            }
        });

        const apigatewayRoleCapture = new Capture();
        template.hasResourceProperties('AWS::IAM::Policy', {
            PolicyDocument: {
                Statement: [
                    {
                        Action: ['sqs:SendMessage', 'sqs:GetQueueAttributes', 'sqs:GetQueueUrl'],
                        Effect: 'Allow',
                        Resource: {
                            'Fn::GetAtt': [Match.anyValue(), 'Arn']
                        }
                    },
                    {
                        Action: [
                            'logs:CreateLogGroup',
                            'logs:CreateLogStream',
                            'logs:DescribeLogGroups',
                            'logs:DescribeLogStreams',
                            'logs:PutLogEvents',
                            'logs:GetLogEvents',
                            'logs:FilterLogEvents'
                        ],
                        Effect: 'Allow',
                        Resource: {
                            'Fn::GetAtt': [Match.anyValue(), 'Arn']
                        }
                    }
                ],
                Version: '2012-10-17'
            },
            PolicyName: Match.anyValue(),
            Roles: [
                {
                    'Ref': apigatewayRoleCapture
                }
            ]
        });

        const jsonTemplate = template.toJSON();
        expect(
            jsonTemplate['Resources'][apigatewayRoleCapture.asString()]['Properties']['AssumeRolePolicyDocument'][
                'Statement'
            ][0]['Principal']['Service']
        ).toEqual('apigateway.amazonaws.com');
    });

    it('should define following types of integration', () => {
        template.hasResourceProperties('AWS::ApiGatewayV2::Integration', {
            IntegrationType: 'AWS_PROXY',
            IntegrationUri: Match.anyValue()
        });
    });
});

describe('When the option of creating default route is provided', () => {
    let template: Template;

    beforeAll(() => {
        const app = new cdk.App();
        const stack = new cdk.Stack(app, 'TestStack');
        const mockLambda = new lambda.Function(stack, 'mockFunction', {
            code: lambda.Code.fromAsset('../infrastructure/test/mock-lambda-func/node-lambda'),
            runtime: COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME,
            handler: 'index.handler'
        });

        new ApiGatewayV2WebSocketToSqs(stack, 'ApiGatewayV2WebSocketToSqs', {
            webSocketApiProps: {
                connectRouteOptions: {
                    integration: new WebSocketLambdaIntegration('ConnectIntegration', mockLambda)
                },
                disconnectRouteOptions: {
                    integration: new WebSocketLambdaIntegration('DisconnectIntegration', mockLambda)
                }
            },
            createDefaultRoute: true
        });
        template = Template.fromStack(stack);
    });

    it('should have the $default routing option', () => {
        template.hasResourceProperties('AWS::ApiGatewayV2::Integration', {
            'ApiId': { 'Ref': 'ApiGatewayV2WebSocketToSqsWebSocketApiCEA04590' },
            'CredentialsArn': { 'Fn::GetAtt': [Match.anyValue(), 'Arn'] },
            'IntegrationMethod': 'POST',
            'IntegrationType': 'AWS',
            'IntegrationUri': { 'Fn::Join': Match.anyValue() },
            'PassthroughBehavior': 'NEVER',
            'RequestParameters': { 'integration.request.header.Content-Type': "'application/x-www-form-urlencoded'" }
        });

        template.hasResourceProperties('AWS::ApiGatewayV2::Route', {
            RouteKey: '$default',
            AuthorizationType: 'NONE',
            Target: {
                'Fn::Join': ['', ['integrations/', Match.anyValue()]]
            }
        });
    });
});

describe('When instantiating the construct with existing WebSocketApi', () => {
    let template: Template;

    beforeAll(() => {
        const app = new cdk.App();
        const stack = new cdk.Stack(app, 'TestStack');
        const mockLambda = new lambda.Function(stack, 'mockFunction', {
            code: lambda.Code.fromAsset('../infrastructure/test/mock-lambda-func/node-lambda'),
            runtime: COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME,
            handler: 'index.handler'
        });

        new ApiGatewayV2WebSocketToSqs(stack, 'ApiGatewayV2WebSocketToSqs', {
            existingWebSocketApi: new apigwv2.WebSocketApi(stack, 'TestWebSocket', {
                apiName: 'TestWebSocket',
                description: 'Test WebSocket',
                connectRouteOptions: {
                    integration: new WebSocketLambdaIntegration('ConnectIntegration', mockLambda),
                    authorizer: new WebSocketIamAuthorizer()
                },
                disconnectRouteOptions: {
                    integration: new WebSocketLambdaIntegration('DisconnectIntegration', mockLambda)
                }
            })
        });
        template = Template.fromStack(stack);
    });

    it('should not create a new websocket but use existing one', () => {
        template.resourceCountIs('AWS::ApiGatewayV2::Api', 1);
        template.hasResourceProperties('AWS::ApiGatewayV2::Api', {
            Name: 'TestWebSocket',
            Description: 'Test WebSocket'
        });
    });

    it('should have 2 routes configured', () => {
        template.resourceCountIs('AWS::ApiGatewayV2::Route', 2);

        template.hasResourceProperties('AWS::ApiGatewayV2::Route', {
            RouteKey: '$disconnect',
            AuthorizationType: 'NONE',
            Target: {
                'Fn::Join': ['', ['integrations/', Match.anyValue()]]
            }
        });

        template.hasResourceProperties('AWS::ApiGatewayV2::Route', {
            RouteKey: '$connect',
            AuthorizationType: 'AWS_IAM',
            Target: {
                'Fn::Join': ['', ['integrations/', Match.anyValue()]]
            }
        });
    });
});

describe('When an existing instance of WebSocketApi and WebSocketApiProps both are provided', () => {
    it('should throw an error', () => {
        const app = new cdk.App();
        const stack = new cdk.Stack(app, 'TestStack');
        const mockLambda = new lambda.Function(stack, 'mockFunction', {
            code: lambda.Code.fromAsset('../infrastructure/test/mock-lambda-func/node-lambda'),
            runtime: COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME,
            handler: 'index.handler'
        });

        try {
            new ApiGatewayV2WebSocketToSqs(stack, 'ApiGatewayV2WebSocketToSqs', {
                existingWebSocketApi: new apigwv2.WebSocketApi(stack, 'TestWebSocket', {
                    apiName: 'TestWebSocket',
                    description: 'Test WebSocket',
                    connectRouteOptions: {
                        integration: new WebSocketLambdaIntegration('ConnectIntegration', mockLambda),
                        authorizer: new WebSocketIamAuthorizer()
                    },
                    disconnectRouteOptions: {
                        integration: new WebSocketLambdaIntegration('DisconnectIntegration', mockLambda)
                    }
                }),
                webSocketApiProps: {
                    connectRouteOptions: {
                        integration: new WebSocketLambdaIntegration('ConnectIntegration', mockLambda)
                    },
                    disconnectRouteOptions: {
                        integration: new WebSocketLambdaIntegration('DisconnectIntegration', mockLambda)
                    }
                }
            });
        } catch (error) {
            expect(error).toBeInstanceOf(Error);
            expect((error as Error).message).toEqual(
                'Provide either an existing WebSocketApi instance or WebSocketApiProps, not both'
            );
        }
    });
});
