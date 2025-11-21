#!/usr/bin/env node
// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import * as cdk from 'aws-cdk-lib';
import * as api from 'aws-cdk-lib/aws-apigateway';
import * as apigwv2 from 'aws-cdk-lib/aws-apigatewayv2';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as lambda from 'aws-cdk-lib/aws-lambda';

import { SqsToLambda } from '@aws-solutions-constructs/aws-sqs-lambda';
import * as awssolutionsconstructscore from '@aws-solutions-constructs/core';
import { WebSocketApi, WebSocketStage } from 'aws-cdk-lib/aws-apigatewayv2';
import { NagSuppressions } from 'cdk-nag';
import { Construct } from 'constructs';
import { CognitoSetup } from '../auth/cognito-setup';
import { ApplicationAssetBundler } from '../framework/bundler/asset-options-factory';
import * as cfn_guard from '../utils/cfn-guard-suppressions';
import {
    createCustomResourceForLambdaLogRetention,
    createDefaultLambdaRole,
    createVpcConfigForLambda
} from '../utils/common-utils';
import {
    CLIENT_ID_ENV_VAR,
    COGNITO_POLICY_TABLE_ENV_VAR,
    COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME,
    LAMBDA_TIMEOUT_MINS,
    USER_POOL_ID_ENV_VAR
} from '../utils/constants';
import { RequestProcessor, RequestProcessorProps } from './request-processor';
import { requestTemplate, WebSocketEndpoint } from './websocket-endpoint';

export interface WebsocketRequestProcessorProps extends RequestProcessorProps {
    /**
     * The function to back the LangChain chat LLM model
     */
    lambdaRouteMapping: Map<string, lambda.Function | lambda.Alias>;

    /**
     * The underlying lambda function for environment variable configuration
     */
    chatLlmProviderLambda: lambda.Function;

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
     * Condition that determines if VPC configuration should be applied
     * When false, VPC related props (privateSubnetIds, securityGroupIds) are ignored
     */
    deployVPCCondition: cdk.CfnCondition;

    /**
     * VPC configuration parameter private subnet IDs. Required when VPC is deployed
     */
    privateSubnetIds: string;

    /**
     * VPC configuration parameter security group IDs. Required when VPC is deployed
     */
    securityGroupIds: string;
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
        this.cognitoSetup = new CognitoSetup(this, 'UseCaseCognitoSetup', {
            userPoolProps: {
                defaultUserEmail: props.defaultUserEmail,
                applicationTrademarkName: props.applicationTrademarkName,
                userGroupName: `${cdk.Aws.STACK_NAME}-Users`,
                existingCognitoUserPoolId: props.existingCognitoUserPoolId,
                existingCognitoGroupPolicyTableName: props.existingCognitoGroupPolicyTableName,
                usernameSuffix: props.useCaseUUID,
                customResourceLambdaArn: props.customResourceLambda.functionArn,
                cognitoDomainPrefix: props.cognitoDomainPrefix
            },
            userPoolClientProps: {
                logoutUrl: props.cloudFrontUrl,
                callbackUrl: props.cloudFrontUrl,
                existingCognitoUserPoolClientId: props.existingCognitoUserPoolClientId
            },
            deployWebApp: props.deployWebApp
        });
        this.userPool = this.cognitoSetup.getUserPool(this);
        this.userPoolClient = this.cognitoSetup.getUserPoolClient(this);

        const webSocketAuthLambdaRole = createDefaultLambdaRole(
            this,
            'WebSocketAuthorizerRole',
            props.deployVPCCondition
        );

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
                [CLIENT_ID_ENV_VAR]: this.userPoolClient.userPoolClientId,
                [COGNITO_POLICY_TABLE_ENV_VAR]: this.cognitoSetup.getCognitoGroupPolicyTable(this).tableName
            }
        });

        createCustomResourceForLambdaLogRetention(
            this,
            'WebSocketAuthorizerLambdaLogRetention',
            this.authorizerLambda.functionName,
            props.customResourceLambda.functionArn
        );

        createVpcConfigForLambda(
            this.authorizerLambda,
            props.deployVPCCondition,
            props.privateSubnetIds,
            props.securityGroupIds
        );

        const lambdaPolicyTablePolicy = new iam.Policy(this, 'LambdaPolicyTablePolicy', {
            statements: [
                new iam.PolicyStatement({
                    effect: iam.Effect.ALLOW,
                    actions: ['dynamodb:GetItem', 'dynamodb:Query', 'dynamodb:BatchGetItem'],
                    resources: [this.cognitoSetup.getCognitoGroupPolicyTable(this).tableArn]
                })
            ]
        });
        lambdaPolicyTablePolicy.attachToRole(this.authorizerLambda.role!);

        const webSocketEndpoint = new WebSocketEndpoint(this, 'WebSocketEndpoint', {
            authorizerLambda: this.authorizerLambda,
            onConnectLambda: this.onConnectLambda,
            onDisconnectLambda: this.onDisconnectLambda,
            useCaseUUID: props.useCaseUUID,
            lambdaRouteMapping: props.lambdaRouteMapping,
            chatLlmProviderLambda: props.chatLlmProviderLambda
        });

        this.webSocketApi = webSocketEndpoint.webSocketApi;
        this.websocketApiStage = webSocketEndpoint.websocketApiStage;
        this.webSocketApi.node.addDependency(this.cognitoSetup.userPoolGroup);

        const routeKeys = props.lambdaRouteMapping.keys();
        routeKeys.next();
        // the first route is added when creating the construct. the additional routes (if exists) will be added here.
        // note: that this implementation is opinionated such that each route adds it own queue as the integration. there
        // may be alternate AWS services or lambda functions as integration options, but this one assumes it always is a queue.
        addAddtionalRoutes(this, routeKeys, webSocketEndpoint, props);

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

export function addAddtionalRoutes(
    construct: Construct,
    routeKeys: MapIterator<string>,
    webSocketEndpoint: WebSocketEndpoint,
    props: WebsocketRequestProcessorProps
) {
    for (const routeKey of routeKeys) {
        const queue = awssolutionsconstructscore.buildQueue(construct, `${routeKey}Queue`, {}).queue; // each route requires its own queue
        webSocketEndpoint.webSocketApi.addRoute(
            routeKey,
            awssolutionsconstructscore.buildWebSocketQueueRouteOptions(
                webSocketEndpoint.apiGatewayRole,
                queue,
                routeKey,
                { [routeKey]: requestTemplate }
            )
        );

        const lambdaOrAlias = props.lambdaRouteMapping.get(routeKey)!;
        props.chatLlmProviderLambda.addEnvironment(
            'WEBSOCKET_CALLBACK_URL',
            webSocketEndpoint.websocketApiStage.callbackUrl
        );
        webSocketEndpoint.webSocketApi.grantManageConnections(props.chatLlmProviderLambda);

        if (lambdaOrAlias instanceof lambda.Alias) {
            new lambda.EventSourceMapping(construct, `${routeKey}EventSourceMapping`, {
                target: lambdaOrAlias,
                eventSourceArn: queue.queueArn
            });
            queue.grantConsumeMessages(lambdaOrAlias);
        } else {
            new SqsToLambda(construct, `${routeKey}SqsToLambda`, {
                existingQueueObj: queue,
                deployDeadLetterQueue: false,
                existingLambdaObj: lambdaOrAlias
            });
        }
    }

    const routesListForSuppressions = ['$disconnect-Route'];
    for (const customRoute of props.lambdaRouteMapping.keys()) {
        routesListForSuppressions.push(`${customRoute}-Route`);
    }

    for (const route in routesListForSuppressions) {
        NagSuppressions.addResourceSuppressions(
            webSocketEndpoint.webSocketApi.node.tryFindChild(routesListForSuppressions[route])?.node
                .defaultChild as apigwv2.CfnRoute,
            [
                {
                    id: 'AwsSolutions-APIG4',
                    reason: 'Only $connect accepts an authorizer for a websocket api'
                }
            ]
        );
    }
}
