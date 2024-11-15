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
 *********************************************************************************************************************/

import { ApiGatewayV2WebSocketToSqs } from '@aws-solutions-constructs/aws-apigatewayv2websocket-sqs';
import { SqsToLambda } from '@aws-solutions-constructs/aws-sqs-lambda';
import * as apigwv2 from 'aws-cdk-lib/aws-apigatewayv2';
import { WebSocketApi, WebSocketStage } from 'aws-cdk-lib/aws-apigatewayv2';
import { WebSocketLambdaAuthorizer } from 'aws-cdk-lib/aws-apigatewayv2-authorizers';
import { WebSocketLambdaIntegration } from 'aws-cdk-lib/aws-apigatewayv2-integrations';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import { NagSuppressions } from 'cdk-nag';
import { Construct } from 'constructs';
import { LOG_RETENTION_PERIOD } from '../utils/constants';

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

        // prettier-ignore
        const requestTemplate: string = 'Action=SendMessage'+
            '&MessageGroupId=$context.connectionId'+
            '&MessageDeduplicationId=$context.requestId'+
            '&MessageAttribute.1.Name=connectionId&MessageAttribute.1.Value.StringValue=$context.connectionId&MessageAttribute.1.Value.DataType=String'+
            '&MessageAttribute.2.Name=requestId&MessageAttribute.2.Value.StringValue=$context.requestId&MessageAttribute.2.Value.DataType=String'+
            '&MessageBody={"requestContext": {"authorizer": {"UserId": "$context.authorizer.UserId"}, "connectionId": "$context.connectionId"}, "message": $util.urlEncode($input.json($util.escapeJavaScript("$").replaceAll("\\\\\'","\'")))}'

        // use the ApiGatewayV2WebSocketToSqs construct and generate the properties that needs to be passed in the constructor
        const apiGatewayV2WebSocketToSqs = new ApiGatewayV2WebSocketToSqs(this, 'ApiGatewayV2WebSocketToSqs', {
            webSocketApiProps: {
                apiName: `ChatAPI-${props.useCaseUUID}`,
                description: `Websocket API for chat use case ${props.useCaseUUID}`,
                connectRouteOptions: {
                    authorizer: authorizer,
                    integration: new WebSocketLambdaIntegration('ConnectIntegration', props.onConnectLambda)
                },
                disconnectRouteOptions: {
                    integration: new WebSocketLambdaIntegration('DisconnectIntegration', props.onDisconnectLambda)
                },
                routeSelectionExpression: '$request.body.action'
            },
            deployDeadLetterQueue: true,
            maxReceiveCount: 3,
            logGroupProps: {
                retention: LOG_RETENTION_PERIOD
            },
            createDefaultRoute: false,
            customRouteName: 'sendMessage',
            defaultRouteRequestTemplate: { 'sendMessage': requestTemplate }
        });

        // the socket URL to post responses
        props.onMessageLambda.addEnvironment(
            'WEBSOCKET_CALLBACK_URL',
            apiGatewayV2WebSocketToSqs.webSocketStage.callbackUrl
        );

        apiGatewayV2WebSocketToSqs.webSocketApi.grantManageConnections(props.onMessageLambda);
        this.webSocketApi = apiGatewayV2WebSocketToSqs.webSocketApi;
        this.websocketApiStage = apiGatewayV2WebSocketToSqs.webSocketStage;

        new SqsToLambda(this, 'SqsToLambda', {
            existingQueueObj: apiGatewayV2WebSocketToSqs.sqsQueue,
            deployDeadLetterQueue: false,
            existingLambdaObj: props.onMessageLambda
        });

        // add routes
        const routesList = ['$disconnect-Route', 'sendMessage-Route'];
        for (const route in routesList) {
            NagSuppressions.addResourceSuppressions(
                apiGatewayV2WebSocketToSqs.webSocketApi.node.tryFindChild(routesList[route])?.node
                    .defaultChild as apigwv2.CfnRoute,
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
                        'Resource::arn:<AWS::Partition>:execute-api:<AWS::Region>:<AWS::AccountId>:<WebsocketRequestProcessorWebSocketEndpointApiGatewayV2WebSocketToSqsWebSocketApi7E5024D8>/*/*/@connections/*'
                    ]
                }
            ]
        );

        NagSuppressions.addResourceSuppressions(this.websocketApiStage, [
            {
                id: 'AwsSolutions-APIG1',
                reason: 'Access logging configuration has been provided as per ApiGateway v2 requirements'
            }
        ]);
    }
}
