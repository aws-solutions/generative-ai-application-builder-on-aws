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

import { Capture, Match, Template } from 'aws-cdk-lib/assertions';

import { WebSocketEndpoint } from '../../lib/api/websocket-endpoint';
import { COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME } from '../../lib/utils/constants';

describe('When creating a WebSocketEndpoint', () => {
    let template: Template;
    let jsonTemplate: any;

    beforeAll(() => {
        const stack = new cdk.Stack();
        const mockLambdaFuncProps = {
            code: lambda.Code.fromAsset('../infrastructure/test/mock-lambda-func/node-lambda'),
            runtime: COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME,
            handler: 'index.handler'
        };

        new WebSocketEndpoint(stack, 'WebSocketEndpoint', {
            authorizerLambda: new lambda.Function(stack, 'AuthorizerLambda', mockLambdaFuncProps),
            onConnectLambda: new lambda.Function(stack, 'OnConnectLambda', mockLambdaFuncProps),
            onDisconnectLambda: new lambda.Function(stack, 'OnDisconnectLambda', mockLambdaFuncProps),
            onMessageLambda: new lambda.Function(stack, 'OnEventLambda', mockLambdaFuncProps),
            useCaseUUID: 'fake-id'
        });

        template = Template.fromStack(stack);
        jsonTemplate = template.toJSON();
    });

    it('should create a WebSocket API that is correctly configured', () => {
        const apiIdCapture = new Capture();

        template.resourceCountIs('AWS::ApiGatewayV2::Api', 1);
        template.hasResourceProperties('AWS::ApiGatewayV2::Api', {
            Name: Match.anyValue(),
            ProtocolType: 'WEBSOCKET',
            RouteSelectionExpression: '$request.body.action'
        });

        template.resourceCountIs('AWS::ApiGatewayV2::Stage', 1);
        template.hasResourceProperties('AWS::ApiGatewayV2::Stage', {
            ApiId: { Ref: apiIdCapture },
            StageName: 'prod',
            AutoDeploy: true
        });

        template.resourceCountIs('AWS::ApiGatewayV2::Route', 4);
        template.hasResourceProperties('AWS::ApiGatewayV2::Route', {
            ApiId: { Ref: apiIdCapture.asString() },
            RouteKey: '$connect',
            AuthorizationType: 'CUSTOM',
            Target: Match.anyValue()
        });

        template.hasResourceProperties('AWS::ApiGatewayV2::Route', {
            ApiId: { Ref: apiIdCapture.asString() },
            RouteKey: '$disconnect',
            AuthorizationType: 'NONE',
            Target: Match.anyValue()
        });

        template.hasResourceProperties('AWS::ApiGatewayV2::Route', {
            ApiId: { Ref: apiIdCapture.asString() },
            RouteKey: '$default',
            AuthorizationType: 'NONE',
            Target: Match.anyValue()
        });

        template.hasResourceProperties('AWS::ApiGatewayV2::Route', {
            ApiId: { Ref: apiIdCapture.asString() },
            RouteKey: 'sendMessage',
            AuthorizationType: 'NONE',
            Target: Match.anyValue()
        });
    });

    it('Should have the correct lambda function integrations', () => {
        const apiIdCapture = new Capture();
        template.resourceCountIs('AWS::ApiGatewayV2::Integration', 4);

        template.hasResourceProperties('AWS::ApiGatewayV2::Stage', {
            ApiId: { Ref: apiIdCapture },
            StageName: 'prod',
            AutoDeploy: true
        });

        template.hasResourceProperties('AWS::Lambda::Function', {
            Handler: 'index.handler',
            Runtime: COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME.name,
            Code: {
                S3Bucket: {
                    'Fn::Sub': Match.anyValue()
                },
                S3Key: Match.anyValue()
            },
            Role: {
                'Fn::GetAtt': [Match.anyValue(), 'Arn']
            },
            Environment: {
                Variables: {
                    WEBSOCKET_CALLBACK_URL: {
                        'Fn::Join': [
                            '',
                            [
                                'https://',
                                {
                                    Ref: apiIdCapture.asString()
                                },
                                '.execute-api.',
                                {
                                    Ref: 'AWS::Region'
                                },
                                '.',
                                {
                                    Ref: 'AWS::URLSuffix'
                                },
                                '/prod'
                            ]
                        ]
                    }
                }
            }
        });
    });
});
