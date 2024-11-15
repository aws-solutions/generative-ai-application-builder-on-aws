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
import * as iam from 'aws-cdk-lib/aws-iam';
import * as lambda from 'aws-cdk-lib/aws-lambda';

import { WebSocketApi, WebSocketStage } from 'aws-cdk-lib/aws-apigatewayv2';
import { Construct } from 'constructs';
import { UserPoolProps } from '../auth/cognito-setup';
import { UseCaseCognitoSetup } from '../auth/use-case-cognito-setup';
import { ApplicationAssetBundler } from '../framework/bundler/asset-options-factory';
import * as cfn_guard from '../utils/cfn-guard-suppressions';
import { createCustomResourceForLambdaLogRetention, createDefaultLambdaRole } from '../utils/common-utils';
import {
    COGNITO_POLICY_TABLE_ENV_VAR,
    COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME,
    LAMBDA_TIMEOUT_MINS,
    USER_POOL_ID_ENV_VAR
} from '../utils/constants';
import { RequestProcessor } from './request-processor';
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

    /**
     * Domain for the Cognito User Pool Client
     */
    cognitoDomainPrefix: string;

    /**
     * The user pool client id for the user pool. Required if existingCognitoUserPoolId is provided.
     * Must be provided an empty string if we do not want to use it (as condition must be checked from an incoming cfnParameter)
     */
    existingCognitoUserPoolClientId: string;
}

export class WebsocketRequestProcessor extends RequestProcessor {
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
     * Cognito authorizer for users
     */
    public readonly userAuthorizer: api.CognitoUserPoolsAuthorizer;

    constructor(scope: Construct, id: string, props: WebsocketRequestProcessorProps) {
        super(scope, id);

        const onConnectLambdaRole = createDefaultLambdaRole(this, 'onConnectLambdaRole');
        this.onConnectLambda = new lambda.Function(this, 'OnConnectLambda', {
            code: lambda.Code.fromAsset(
                '../lambda/websocket-connectors',
                ApplicationAssetBundler.assetBundlerFactory()
                    .assetOptions(COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME)
                    .options(this, '../lambda/websocket-connectors')
            ),
            role: onConnectLambdaRole,
            runtime: COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME,
            handler: 'connect-handler.handler',
            timeout: cdk.Duration.minutes(LAMBDA_TIMEOUT_MINS)
        });

        createCustomResourceForLambdaLogRetention(
            this,
            'OnConnectLambdaLogRetention',
            this.onConnectLambda.functionName,
            props.customResourceLambda.functionArn
        );

        const onDisconnectLambdaRole = createDefaultLambdaRole(this, 'onDisconnectLambdaRole');
        this.onDisconnectLambda = new lambda.Function(this, 'OnDisconnectLambda', {
            code: lambda.Code.fromAsset(
                '../lambda/websocket-connectors',
                ApplicationAssetBundler.assetBundlerFactory()
                    .assetOptions(COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME)
                    .options(this, '../lambda/websocket-connectors')
            ),
            role: onDisconnectLambdaRole,
            runtime: COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME,
            handler: 'disconnect-handler.handler',
            timeout: cdk.Duration.minutes(LAMBDA_TIMEOUT_MINS)
        });

        createCustomResourceForLambdaLogRetention(
            this,
            'OnDisconnectLambdaLogRetention',
            this.onDisconnectLambda.functionName,
            props.customResourceLambda.functionArn
        );

        // will create a new user pool if deploying standalone, otherwise simply adds a group to the existing user pool
        this.cognitoSetup = new UseCaseCognitoSetup(this, 'UseCaseCognitoSetup', {
            userPoolProps: {
                defaultUserEmail: props.defaultUserEmail,
                applicationTrademarkName: props.applicationTrademarkName,
                userGroupName: `${cdk.Aws.STACK_NAME}-Users`,
                existingCognitoUserPoolId: props.existingCognitoUserPoolId,
                existingCognitoGroupPolicyTableName: props.existingCognitoGroupPolicyTableName,
                usernameSuffix: props.useCaseUUID,
                customResourceLambdaArn: props.customResourceLambda.functionArn,
                cognitoDomainPrefix: props.cognitoDomainPrefix,
                existingCognitoUserPoolClientId: props.existingCognitoUserPoolClientId
            } as UserPoolProps
        });
        this.userPool = this.cognitoSetup.userPool;

        const webSocketAuthLambdaRole = createDefaultLambdaRole(this, 'WebSocketAuthorizerRole');
        this.authorizerLambda = new lambda.Function(this, 'WebSocketAuthorizer', {
            description: 'Authorizes websocket connections based on Cognito user pool groups',
            code: lambda.Code.fromAsset(
                '../lambda/custom-authorizer',
                ApplicationAssetBundler.assetBundlerFactory()
                    .assetOptions(COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME)
                    .options(this, '../lambda/custom-authorizer')
            ),
            role: webSocketAuthLambdaRole,
            runtime: COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME,
            handler: 'websocket-authorizer.handler',
            timeout: cdk.Duration.minutes(LAMBDA_TIMEOUT_MINS),
            environment: {
                [USER_POOL_ID_ENV_VAR]: this.userPool.userPoolId,
                [COGNITO_POLICY_TABLE_ENV_VAR]: this.cognitoSetup.cognitoGroupPolicyTable.tableName
            }
        });

        createCustomResourceForLambdaLogRetention(
            this,
            'WebSocketAuthorizerLambdaLogRetention',
            this.authorizerLambda.functionName,
            props.customResourceLambda.functionArn
        );

        const lambdaPolicyTablePolicy = new iam.Policy(this, 'LambdaPolicyTablePolicy', {
            statements: [
                new iam.PolicyStatement({
                    effect: iam.Effect.ALLOW,
                    actions: ['dynamodb:GetItem', 'dynamodb:Query', 'dynamodb:BatchGetItem'],
                    resources: [this.cognitoSetup.cognitoGroupPolicyTable.tableArn]
                })
            ]
        });
        lambdaPolicyTablePolicy.attachToRole(this.authorizerLambda.role!);

        const webSocketEndpoint = new WebSocketEndpoint(this, 'WebSocketEndpoint', {
            authorizerLambda: this.authorizerLambda,
            onConnectLambda: this.onConnectLambda,
            onDisconnectLambda: this.onDisconnectLambda,
            onMessageLambda: props.chatProviderLambda,
            useCaseUUID: props.useCaseUUID
        });

        this.webSocketApi = webSocketEndpoint.webSocketApi;
        this.websocketApiStage = webSocketEndpoint.websocketApiStage;
        this.webSocketApi.node.addDependency(this.cognitoSetup.userPoolGroup);

        // custom resource to populate policy table with admin policy
        const cognitoUserGroupPolicyCustomResource = new cdk.CustomResource(this, 'CognitoUseCaseGroupPolicy', {
            resourceType: 'Custom::CognitoUseCaseGroupPolicy',
            serviceToken: props.customResourceLambda.functionArn,
            properties: {
                Resource: 'USE_CASE_POLICY',
                GROUP_NAME: this.cognitoSetup.userPoolGroup.groupName!,
                API_ARN: `arn:${cdk.Aws.PARTITION}:execute-api:${cdk.Aws.REGION}:${cdk.Aws.ACCOUNT_ID}:${webSocketEndpoint.webSocketApi.apiId}/*/*`,
                POLICY_TABLE_NAME: this.cognitoSetup.cognitoGroupPolicyTable.tableName
            }
        });
        const grant = this.cognitoSetup.cognitoGroupPolicyTable.grantReadWriteData(props.customResourceLambda);
        cognitoUserGroupPolicyCustomResource.node.addDependency(this.cognitoSetup.cognitoGroupPolicyTable);
        cognitoUserGroupPolicyCustomResource.node.addDependency(grant);

        cfn_guard.addCfnSuppressRules(onConnectLambdaRole, [
            {
                id: 'F10',
                reason: 'The inline policy avoids a rare race condition between the lambda, Role and the policy resource creation.'
            }
        ]);

        cfn_guard.addCfnSuppressRules(onDisconnectLambdaRole, [
            {
                id: 'F10',
                reason: 'The inline policy avoids a rare race condition between the lambda, Role and the policy resource creation.'
            }
        ]);

        cfn_guard.addCfnSuppressRules(webSocketAuthLambdaRole, [
            {
                id: 'F10',
                reason: 'The inline policy avoids a rare race condition between the lambda, Role and the policy resource creation.'
            }
        ]);

        cfn_guard.addCfnSuppressRules(this.authorizerLambda, [
            {
                id: 'W89',
                reason: 'This lambda function is an authorizer for apigateway and hence VPC configuration is not enforced.'
            },
            {
                id: 'W92',
                reason: 'The solution does not enforce reserved concurrency'
            }
        ]);

        cfn_guard.addCfnSuppressRules(this.onConnectLambda, [
            {
                id: 'W89',
                reason: 'This lambda function is an authorizer for apigateway and hence VPC configuration is not enforced.'
            },
            {
                id: 'W92',
                reason: 'The solution does not enforce reserved concurrency'
            }
        ]);

        cfn_guard.addCfnSuppressRules(this.onDisconnectLambda, [
            {
                id: 'W89',
                reason: 'This lambda function is an authorizer for apigateway and hence VPC configuration is not enforced.'
            },
            {
                id: 'W92',
                reason: 'The solution does not enforce reserved concurrency'
            }
        ]);
    }
}
