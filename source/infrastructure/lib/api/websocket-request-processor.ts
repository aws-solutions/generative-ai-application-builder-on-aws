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

import * as cdk from 'aws-cdk-lib';
import * as api from 'aws-cdk-lib/aws-apigateway';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as lambda from 'aws-cdk-lib/aws-lambda';

import { WebSocketApi, WebSocketStage } from 'aws-cdk-lib/aws-apigatewayv2';
import { Construct } from 'constructs';
import { UseCaseCognitoSetup } from '../auth/use-case-cognito-setup';
import { AppAssetBundler } from '../utils/asset-bundling';
import { createDefaultLambdaRole } from '../utils/common-utils';
import {
    CLIENT_ID_ENV_VAR,
    COGNITO_POLICY_TABLE_ENV_VAR,
    COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME,
    LAMBDA_TIMEOUT_MINS,
    TYPESCRIPT,
    USER_POOL_ID_ENV_VAR
} from '../utils/constants';
import { WebSocketEndpoint } from './websocket-endpoint';

export interface WebsocketRequestProcessorProps {
    /**
     * The function to back the LangChain chat LLM model
     */
    chatProviderLambda: lambda.Function;

    /**
     * The trademark name of the solution
     */
    applicationTrademarkName: string;

    /**
     * Default user email address used to create a cognito user in the created or existing user pool.
     */
    defaultUserEmail: string;

    /**
     * If provided, will use the provided UserPool instead of creating a new one.
     */
    existingCognitoUserPoolId: string;

    /**
     * Name of table which stores policies for cognito user groups. Required if existingCognitoUserPoolId is provided.
     */
    existingCognitoGroupPolicyTableName: string;

    /**
     * The Lambda function to use for custom resource implementation.
     */
    customResourceLambda: lambda.Function;

    /**
     * Used here to append to the username for created user(s)
     */
    useCaseUUID: string;
}

export class WebsocketRequestProcessor extends Construct {
    /**
     * Construct containing an API Gateway websocket API
     */
    public readonly webSocketApi: WebSocketApi;

    /**
     * Websocket stage
     */
    public readonly websocketApiStage: WebSocketStage;

    /**
     * lambda called when a user connects to the websocket
     */
    public readonly onConnectLambda: lambda.Function;

    /**
     * lambda called when a user disconnects from the websocket.
     */
    public readonly onDisconnectLambda: lambda.Function;

    /**
     * Cognito UserPool for users
     */
    public readonly userPool: cognito.IUserPool;

    /**
     * Cognito UserPoolClient for client apps requesting sign-in.
     */
    public readonly userPoolClient: cognito.CfnUserPoolClient;

    /**
     * Cognito authorizer for users
     */
    public readonly userAuthorizer: api.CognitoUserPoolsAuthorizer;

    constructor(scope: Construct, id: string, props: WebsocketRequestProcessorProps) {
        super(scope, id);

        this.onConnectLambda = new lambda.Function(this, 'OnConnectLambda', {
            code: lambda.Code.fromAsset(
                '../lambda/websocket-connectors',
                AppAssetBundler.assetOptionsFactory
                    .assetOptions(TYPESCRIPT)
                    .options('../lambda/websocket-connectors', undefined)
            ),
            role: createDefaultLambdaRole(this, 'onConnectLambdaRole'),
            runtime: COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME,
            handler: 'connect-handler.handler',
            timeout: cdk.Duration.minutes(LAMBDA_TIMEOUT_MINS)
        });

        this.onDisconnectLambda = new lambda.Function(this, 'OnDisconnectLambda', {
            code: lambda.Code.fromAsset(
                '../lambda/websocket-connectors',
                AppAssetBundler.assetOptionsFactory
                    .assetOptions(TYPESCRIPT)
                    .options('../lambda/websocket-connectors', undefined)
            ),
            role: createDefaultLambdaRole(this, 'onDisconnectLambdaRole'),
            runtime: COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME,
            handler: 'disconnect-handler.handler',
            timeout: cdk.Duration.minutes(LAMBDA_TIMEOUT_MINS)
        });

        // will create a new user pool if deploying standalone, otherwise simply adds a group to the existing user pool
        const cognitoSetup = new UseCaseCognitoSetup(this, 'UseCaseCognitoSetup', {
            defaultUserEmail: props.defaultUserEmail,
            applicationTrademarkName: props.applicationTrademarkName,
            userGroupName: `${cdk.Aws.STACK_NAME}-Users`,
            existingCognitoUserPoolId: props.existingCognitoUserPoolId,
            existingCognitoGroupPolicyTableName: props.existingCognitoGroupPolicyTableName,
            usernameSuffix: props.useCaseUUID
        });
        this.userPool = cognitoSetup.userPool;
        this.userPoolClient = cognitoSetup.userPoolClient;

        const websocketAuthorizerLambda = new lambda.Function(this, 'WebSocketAuthorizer', {
            description: 'Authorizes websocket connections based on Cognito user pool groups',
            code: lambda.Code.fromAsset(
                '../lambda/custom-authorizer',
                AppAssetBundler.assetOptionsFactory
                    .assetOptions(TYPESCRIPT)
                    .options('../lambda/custom-authorizer', undefined)
            ),
            role: createDefaultLambdaRole(this, 'WebSocketAuthorizerRole'),
            runtime: COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME,
            handler: 'websocket-authorizer.handler',
            timeout: cdk.Duration.minutes(LAMBDA_TIMEOUT_MINS),
            environment: {
                [USER_POOL_ID_ENV_VAR]: this.userPool.userPoolId,
                [CLIENT_ID_ENV_VAR]: this.userPoolClient.ref,
                [COGNITO_POLICY_TABLE_ENV_VAR]: cognitoSetup.cognitoGroupPolicyTable.tableName
            }
        });

        const lambdaPolicyTablePolicy = new iam.Policy(this, 'LambdaPolicyTablePolicy', {
            statements: [
                new iam.PolicyStatement({
                    effect: iam.Effect.ALLOW,
                    actions: ['dynamodb:GetItem', 'dynamodb:Query', 'dynamodb:BatchGetItem'],
                    resources: [cognitoSetup.cognitoGroupPolicyTable.tableArn]
                })
            ]
        });
        lambdaPolicyTablePolicy.attachToRole(websocketAuthorizerLambda.role!);

        const webSocketEndpoint = new WebSocketEndpoint(this, 'WebSocketEndpoint', {
            authorizerLambda: websocketAuthorizerLambda,
            onConnectLambda: this.onConnectLambda,
            onDisconnectLambda: this.onDisconnectLambda,
            onMessageLambda: props.chatProviderLambda,
            useCaseUUID: props.useCaseUUID
        });

        this.webSocketApi = webSocketEndpoint.webSocketApi;
        this.websocketApiStage = webSocketEndpoint.websocketApiStage;
        this.webSocketApi.node.addDependency(cognitoSetup.userPoolGroup);

        // custom resource to populate policy table with admin policy
        const cognitoUserGroupPolicyCustomResource = new cdk.CustomResource(this, 'CognitoUseCaseGroupPolicy', {
            resourceType: 'Custom::CognitoUseCaseGroupPolicy',
            serviceToken: props.customResourceLambda.functionArn,
            properties: {
                Resource: 'USE_CASE_POLICY',
                GROUP_NAME: cognitoSetup.userPoolGroup.groupName!,
                API_ARN: `arn:${cdk.Aws.PARTITION}:execute-api:${cdk.Aws.REGION}:${cdk.Aws.ACCOUNT_ID}:${webSocketEndpoint.webSocketApi.apiId}/*/*`,
                POLICY_TABLE_NAME: cognitoSetup.cognitoGroupPolicyTable.tableName
            }
        });
        const grant = cognitoSetup.cognitoGroupPolicyTable.grantReadWriteData(props.customResourceLambda);
        cognitoUserGroupPolicyCustomResource.node.addDependency(cognitoSetup.cognitoGroupPolicyTable);
        cognitoUserGroupPolicyCustomResource.node.addDependency(grant);
    }
}
