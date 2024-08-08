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

import * as apigwv2 from 'aws-cdk-lib/aws-apigatewayv2';
import { Construct } from 'constructs';

export interface BuildWebSocketApiProps {
    /**
     * Existing instance of ApiGateway v2 WebSocket
     */
    readonly existingWebSocketApi?: apigwv2.WebSocketApi;

    /**
     * User provided properties of Apigateway v2 WebSocket
     */
    readonly webSocketApiProps?: apigwv2.WebSocketApiProps;
}

/**
 * build ApiGateway v2 WebSocket L2 construct. If existing WebSocketApi instance is provided, it returns that instance,
 * if not, it creates a new WebSocketApi using the user provided props.
 *
 * @param scope
 * @param props
 * @returns
 */
export function buildApiGatewayV2WebSocket(scope: Construct, props: BuildWebSocketApiProps): apigwv2.WebSocketApi {
    if (props.existingWebSocketApi) {
        return props.existingWebSocketApi;
    } else {
        return new apigwv2.WebSocketApi(scope, 'WebSocketApi', props.webSocketApiProps);
    }
}
