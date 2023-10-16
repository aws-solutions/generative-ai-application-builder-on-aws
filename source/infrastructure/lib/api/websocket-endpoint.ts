#!/usr/bin/env node
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

import * as iam from 'aws-cdk-lib/aws-iam';
import * as lambda from 'aws-cdk-lib/aws-lambda';

import { WebSocketApi, WebSocketStage } from '@aws-cdk/aws-apigatewayv2-alpha';
import { WebSocketLambdaAuthorizer } from '@aws-cdk/aws-apigatewayv2-authorizers-alpha';
import { WebSocketLambdaIntegration } from '@aws-cdk/aws-apigatewayv2-integrations-alpha';
import { CfnRoute, CfnStage } from 'aws-cdk-lib/aws-apigatewayv2';
import { NagSuppressions } from 'cdk-nag';
import { Construct } from 'constructs';

export interface WebSocketProps {
    /**
     * Lambda function implementing a cognito custom authorizer.
     */
    authorizerLambda: lambda.Function;

    /**
     * Lambda function called when new connection is established to the websocket.
     */
    onConnectLambda: lambda.Function;

    /**
     * Lambda function called when connection is closed.
     */
    onDisconnectLambda: lambda.Function;

    /**
     * Lambda function called when a message is sent to the websocket by a user.
     */
    onMessageLambda: lambda.Function;

    /**
     * ID of the use case, used to create an easily readable API name.
     */
    useCaseUUID: string;
}

/**
 * This Construct creates the ApiGateway WebSocket API to back the chat for a given LLM provider
 */
export class WebSocketEndpoint extends Construct {
    /**
     * Construct for the WebSocketApi
     */
    public readonly webSocketApi: WebSocketApi;

    /**
     * Websocket stage
     */
    public readonly websocketApiStage: WebSocketStage;

    constructor(scope: Construct, id: string, props: WebSocketProps) {
        super(scope, id);

        const authorizer = new WebSocketLambdaAuthorizer('Authorizer', props.authorizerLambda, {
            identitySource: ['route.request.querystring.Authorization']
        });

        const webSocketApi = new WebSocketApi(this, `ChatAPI`, {
            apiName: `ChatAPI-${props.useCaseUUID}`,
            description: `Websocket API for chat use case ${props.useCaseUUID}`,
            connectRouteOptions: {
                authorizer: authorizer,
                integration: new WebSocketLambdaIntegration('ConnectIntegration', props.onConnectLambda)
            },
            disconnectRouteOptions: {
                integration: new WebSocketLambdaIntegration('DisconnectIntegration', props.onDisconnectLambda)
            },
            defaultRouteOptions: {
                integration: new WebSocketLambdaIntegration('DefaultRouteIntegration', props.onMessageLambda)
            }
        });

        // set up stages
        const stage = new WebSocketStage(this, 'ProdStage', {
            webSocketApi: webSocketApi,
            stageName: 'prod',
            autoDeploy: true
        });

        (stage.node.tryFindChild('Resource') as CfnStage).addPropertyOverride('DefaultRouteSettings', {
            'DataTraceEnabled': false,
            'DetailedMetricsEnabled': true,
            'LoggingLevel': 'ERROR'
        });

        // add routes
        webSocketApi.addRoute('sendMessage', {
            integration: new WebSocketLambdaIntegration('MessageIntegration', props.onMessageLambda)
        });

        // the socket URL to post responses
        props.onMessageLambda.addEnvironment('WEBSOCKET_CALLBACK_URL', stage.callbackUrl);

        webSocketApi.grantManageConnections(props.onMessageLambda);
        this.webSocketApi = webSocketApi;
        this.websocketApiStage = stage;

        NagSuppressions.addResourceSuppressions(stage, [
            {
                id: 'AwsSolutions-APIG1',
                reason: 'Access logging is disabled for websocket endpoints but will be logged with authorizer'
            }
        ]);

        const routesList = ['$default-Route', '$disconnect-Route', 'sendMessage-Route'];
        for (const route in routesList) {
            NagSuppressions.addResourceSuppressions(
                webSocketApi.node.tryFindChild(routesList[route])?.node.defaultChild as CfnRoute,
                [
                    {
                        id: 'AwsSolutions-APIG4',
                        reason: 'Only $connect accepts an authorizer for a websocket api'
                    }
                ]
            );
        }

        NagSuppressions.addResourceSuppressions(
            props.onMessageLambda.role!.node.tryFindChild('DefaultPolicy') as iam.Policy,
            [
                {
                    id: 'AwsSolutions-IAM5',
                    reason: 'This lambda requires permissions to send messages to the client connected to the websocket',
                    appliesTo: [
                        'Resource::arn:<AWS::Partition>:execute-api:<AWS::Region>:<AWS::AccountId>:<WebsocketRequestProcessorWebSocketEndpointChatAPIAEE80909>/*/*/@connections/*'
                    ]
                }
            ]
        );
    }
}
