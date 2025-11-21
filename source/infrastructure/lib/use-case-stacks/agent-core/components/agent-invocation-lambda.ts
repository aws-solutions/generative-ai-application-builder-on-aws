#!/usr/bin/env node
// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import * as cdk from 'aws-cdk-lib';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as lambda from 'aws-cdk-lib/aws-lambda';

import { Construct } from 'constructs';
import { NagSuppressions } from 'cdk-nag';
import { ApplicationAssetBundler } from '../../../framework/bundler/asset-options-factory';
import { createDefaultLambdaRole } from '../../../utils/common-utils';
import {
    CHAT_LAMBDA_PYTHON_RUNTIME,
    LAMBDA_TIMEOUT_MINS,
    LANGCHAIN_LAMBDA_PYTHON_RUNTIME,
    USE_CASE_UUID_ENV_VAR
} from '../../../utils/constants';

/**
 * Properties for Agent Invocation Lambda
 */
export interface AgentInvocationLambdaProps {
    /**
     * AgentCore Runtime ARN
     */
    agentRuntimeArn: string;

    /**
     * Use case UUID for logging and identification
     */
    useCaseUUID: string;
}

/**
 * Helper class to create and configure the Agent Invocation Lambda
 * with streaming support and proper IAM permissions
 *
 * Note: As of dev of GAAB v4.0.0, Amazon Bedrock AgentCore does not support
 * VPC mode. This is a known limitation and will be addressed in future releases.
 */
export class AgentInvocationLambda extends Construct {
    public readonly function: lambda.Function;
    public readonly role: iam.Role;

    constructor(scope: Construct, id: string, props: AgentInvocationLambdaProps) {
        super(scope, id);

        this.role = this.createInvocationRole();
        this.function = this.createLambdaFunction(props);
        this.addAgentCorePermissions();
        this.addNagSuppressions();
    }

    /**
     * Create IAM role for Agent invocation using the common utility function
     * Note: Agent Core v4.0.0 runs in non-VPC mode only
     */
    private createInvocationRole(): iam.Role {
        return createDefaultLambdaRole(this, 'AgentInvocationLambdaRole');
    }

    /**
     * Add AgentCore-specific permissions to the Lambda role
     */
    private addAgentCorePermissions(): void {
        // AgentCore Runtime invocation permissions (both sync and streaming)
        this.role.addToPolicy(
            new iam.PolicyStatement({
                sid: 'AgentCoreRuntimeInvocation',
                effect: iam.Effect.ALLOW,
                actions: ['bedrock-agentcore:InvokeAgentRuntime', 'bedrock-agentcore:InvokeAgentRuntimeForUser'],
                resources: [
                    `arn:${cdk.Aws.PARTITION}:bedrock-agentcore:${cdk.Aws.REGION}:${cdk.Aws.ACCOUNT_ID}:runtime/*`
                ]
            })
        );

        // WebSocket connection management permissions (wildcard since API ID not available at this time)
        this.role.addToPolicy(
            new iam.PolicyStatement({
                sid: 'WebSocketManagement',
                effect: iam.Effect.ALLOW,
                actions: ['execute-api:ManageConnections'],
                resources: [`arn:${cdk.Aws.PARTITION}:execute-api:${cdk.Aws.REGION}:${cdk.Aws.ACCOUNT_ID}:*/*/*`]
            })
        );
    }

    /**
     * Create the Lambda function for agent invocation
     */
    private createLambdaFunction(props: AgentInvocationLambdaProps): lambda.Function {
        return new lambda.Function(this, 'AgentInvocationLambda', {
            code: lambda.Code.fromAsset(
                '../lambda/agentcore-invocation',
                ApplicationAssetBundler.assetBundlerFactory()
                    .assetOptions(CHAT_LAMBDA_PYTHON_RUNTIME)
                    .options(this, '../lambda/agentcore-invocation')
            ),
            role: this.role,
            runtime: LANGCHAIN_LAMBDA_PYTHON_RUNTIME,
            handler: 'handler.lambda_handler',
            timeout: cdk.Duration.minutes(LAMBDA_TIMEOUT_MINS),
            memorySize: 1024,
            environment: {
                POWERTOOLS_SERVICE_NAME: 'AGENT_CORE_INVOCATION',
                AGENT_RUNTIME_ARN: props.agentRuntimeArn,
                [USE_CASE_UUID_ENV_VAR]: props.useCaseUUID
            },
            description: 'Lambda for AgentCore Runtime invocation via WebSocket with streaming support'
        });
    }

    /**
     * Add CDK NAG suppressions for AgentCore-specific permissions
     * Note: Basic Lambda permissions are already suppressed by createDefaultLambdaRole
     */
    private addNagSuppressions(): void {
        NagSuppressions.addResourceSuppressions(this.role.node.tryFindChild('DefaultPolicy') as iam.Policy, [
            {
                id: 'AwsSolutions-IAM5',
                reason: 'Lambda requires permissions to invoke AgentCore Runtime with wildcard for any agent runtime instance',
                appliesTo: ['Resource::arn:<AWS::Partition>:bedrock-agentcore:<AWS::Region>:<AWS::AccountId>:runtime/*']
            },
            {
                id: 'AwsSolutions-IAM5',
                reason: 'Lambda requires permissions to manage WebSocket connections across all API Gateway WebSocket APIs',
                appliesTo: ['Resource::arn:<AWS::Partition>:execute-api:<AWS::Region>:<AWS::AccountId>:*/*/*']
            },
            {
                id: 'AwsSolutions-IAM5',
                reason: 'Lambda requires permissions to manage WebSocket connections for specific API Gateway endpoint',
                appliesTo: [
                    'Resource::arn:<AWS::Partition>:execute-api:<AWS::Region>:<AWS::AccountId>:<WebsocketRequestProcessorWebSocketEndpointApiGatewayV2WebSocketToSqsWebSocketApiApiGatewayV2WebSocketToSqs015CCDDD>/*/*/@connections/*'
                ]
            }
        ]);
    }
}
