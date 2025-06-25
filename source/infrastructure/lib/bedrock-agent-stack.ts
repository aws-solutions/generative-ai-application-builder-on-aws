#!/usr/bin/env node
// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import * as cdk from 'aws-cdk-lib';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import { LambdaToDynamoDB } from '@aws-solutions-constructs/aws-lambda-dynamodb';
import { ChatStorageSetup } from './storage/chat-storage-setup';
import { Construct } from 'constructs';
import { BaseStack, BaseStackProps } from '../lib/framework/base-stack';
import { ApplicationAssetBundler } from '../lib/framework/bundler/asset-options-factory';
import {
    CHAT_LAMBDA_PYTHON_RUNTIME,
    CHAT_PROVIDERS,
    COMMERCIAL_REGION_LAMBDA_PYTHON_RUNTIME,
    CONVERSATION_TABLE_NAME_ENV_VAR,
    LAMBDA_TIMEOUT_MINS,
    USE_CASE_TYPES
} from '../lib/utils/constants';
import { UseCaseParameters, UseCaseStack } from './framework/use-case-stack';
import { createDefaultLambdaRole, generateSourceCodeMapping } from './utils/common-utils';
import { VPCSetup } from './vpc/vpc-setup';

export class BedrockAgentParameters extends UseCaseParameters {
    /**
     * capture the agent id
     */
    public bedrockAgentId: cdk.CfnParameter;

    /**
     * capture the agent alias id
     */
    public bedrockAgentAliasId: cdk.CfnParameter;

    constructor(stack: BaseStack) {
        super(stack);
        this.withAdditionalCfnParameters(stack);
    }

    protected withAdditionalCfnParameters(stack: BaseStack) {
        super.withAdditionalCfnParameters(stack);
        this.bedrockAgentId = new cdk.CfnParameter(stack, 'BedrockAgentId', {
            type: 'String',
            allowedPattern: '^[0-9a-zA-Z]{1,10}$',
            maxLength: 10,
            description: 'Bedrock Agent Id',
            constraintDescription: 'Please provide a valid Bedrock Agent Id'
        });

        this.bedrockAgentAliasId = new cdk.CfnParameter(stack, 'BedrockAgentAliasId', {
            type: 'String',
            allowedPattern: '^[0-9a-zA-Z]{1,10}$',
            maxLength: 10,
            description: 'Bedrock Agent Alias',
            constraintDescription: 'Please provide a valid Bedrock Agent Alias'
        });

        const existingParameterGroups =
            this.cfnStack.templateOptions.metadata !== undefined &&
            Object.hasOwn(this.cfnStack.templateOptions.metadata, 'AWS::CloudFormation::Interface') &&
            this.cfnStack.templateOptions.metadata['AWS::CloudFormation::Interface'].ParameterGroups !== undefined
                ? this.cfnStack.templateOptions.metadata['AWS::CloudFormation::Interface'].ParameterGroups
                : [];

        existingParameterGroups.unshift({
            Label: { default: 'Please provide Bedrock Agent configuration' },
            Parameters: [this.bedrockAgentId.logicalId, this.bedrockAgentAliasId.logicalId]
        });
    }
}

export class BedrockAgent extends UseCaseStack {
    /**
     * Construct managing the chat storage nested stack
     */
    public chatStorageSetup: ChatStorageSetup;

    constructor(stack: Construct, id: string, props: BaseStackProps) {
        super(stack, id, props);
        this.withAdditionalResourceSetup(props);
        this.withAnonymousMetrics(props);
    }

    /**
     * setting websocket route for agent stack
     * @returns
     */
    protected getWebSocketRoutes(): Map<string, lambda.Function> {
        return new Map().set('invokeAgent', this.chatLlmProviderLambda);
    }

    /**
     * method to provision additional resources required for agent stack
     *
     * @param props
     */
    protected withAdditionalResourceSetup(props: BaseStackProps): void {
        super.withAdditionalResourceSetup(props);

        this.chatStorageSetup = new ChatStorageSetup(this, 'ChatStorageSetup', {
            useCaseUUID: this.stackParameters.useCaseShortId,
            useCaseType: USE_CASE_TYPES.AGENT,
            existingModelInfoTableName: '',
            newModelInfoTableCondition: new cdk.CfnCondition(this, 'NewModelInfoTableCondition', {
                expression: cdk.Fn.conditionEquals(true, false)
            }),
            customResourceLambda: this.applicationSetup.customResourceLambda,
            customResourceRole: this.applicationSetup.customResourceRole,
            accessLoggingBucket: this.applicationSetup.accessLoggingBucket,
            ...this.baseStackProps
        });

        if (process.env.DIST_OUTPUT_BUCKET) {
            generateSourceCodeMapping(this.chatStorageSetup.chatStorage, props.solutionName, props.solutionVersion);
        }

        const updateLlmConfigCustomResource = new cdk.CustomResource(this, 'UpdateLlmConfig', {
            resourceType: 'Custom::UpdateLlmConfig',
            serviceToken: this.applicationSetup.customResourceLambda.functionArn,
            properties: {
                Resource: 'UPDATE_LLM_CONFIG',
                USE_CASE_CONFIG_TABLE_NAME: this.stackParameters.useCaseConfigTableName.valueAsString,
                USE_CASE_CONFIG_RECORD_KEY: this.stackParameters.useCaseConfigRecordKey.valueAsString,
                USE_CASE_UUID: this.stackParameters.useCaseUUID,
                CONVERSATION_TABLE_NAME: this.chatStorageSetup.chatStorage.conversationTable.tableName
            }
        });
        const updateLLMConfigTablePolicy = new iam.Policy(this, 'UpdateLLMConfigTablePolicy', {
            statements: [
                new iam.PolicyStatement({
                    effect: iam.Effect.ALLOW,
                    actions: ['dynamodb:UpdateItem'],
                    resources: [
                        `arn:${cdk.Aws.PARTITION}:dynamodb:${cdk.Aws.REGION}:${cdk.Aws.ACCOUNT_ID}:table/${this.stackParameters.useCaseConfigTableName.valueAsString}`
                    ]
                })
            ]
        });
        updateLLMConfigTablePolicy.attachToRole(this.applicationSetup.customResourceRole);

        const feedbackEnabledCondition = new cdk.CfnCondition(this, 'FeedbackEnabledCondition', {
            expression: cdk.Fn.conditionEquals(this.stackParameters.feedbackEnabled, 'Yes')
        });

        (updateLlmConfigCustomResource.node.defaultChild as cdk.CfnResource).cfnOptions.condition =
            feedbackEnabledCondition;

        this.setLlmProviderPermissions();
    }

    public llmProviderSetup(): void {
        this.chatLlmProviderLambda = new lambda.Function(this, 'InvokeAgentLambda', {
            code: lambda.Code.fromAsset(
                '../lambda/invoke-agent',
                ApplicationAssetBundler.assetBundlerFactory()
                    .assetOptions(CHAT_LAMBDA_PYTHON_RUNTIME)
                    .options(this, '../lambda/invoke-agent')
            ),
            role: createDefaultLambdaRole(this, 'InvokeAgentLambdaRole', this.deployVpcCondition),
            runtime: COMMERCIAL_REGION_LAMBDA_PYTHON_RUNTIME,
            handler: 'handler.lambda_handler',
            timeout: cdk.Duration.minutes(LAMBDA_TIMEOUT_MINS),
            environment: {
                POWERTOOLS_SERVICE_NAME: 'BEDROCK_AGENT',
                AGENT_ID: this.stackParameters.bedrockAgentId.valueAsString,
                AGENT_ALIAS_ID: this.stackParameters.bedrockAgentAliasId.valueAsString
            },
            description: 'Lambda invoking bedrock agent'
        });

        this.chatLlmProviderLambda.addToRolePolicy(
            new iam.PolicyStatement({
                effect: iam.Effect.ALLOW,
                actions: ['bedrock:GetAgent'],
                resources: [
                    `arn:${cdk.Aws.PARTITION}:bedrock:${cdk.Aws.REGION}:${cdk.Aws.ACCOUNT_ID}:agent/${this.stackParameters.bedrockAgentId.valueAsString}`
                ]
            })
        );

        this.chatLlmProviderLambda.addToRolePolicy(
            new iam.PolicyStatement({
                effect: iam.Effect.ALLOW,
                actions: ['bedrock:InvokeAgent'],
                resources: [
                    `arn:${cdk.Aws.PARTITION}:bedrock:${cdk.Aws.REGION}:${cdk.Aws.ACCOUNT_ID}:agent-alias/${this.stackParameters.bedrockAgentId.valueAsString}/${this.stackParameters.bedrockAgentAliasId.valueAsString}`
                ]
            })
        );
    }

    /**
     * Provides the correct environment variables and permissions to the llm provider lambda
     */
    protected setLlmProviderPermissions(): void {
        super.setLlmProviderPermissions();
        // connection to the conversation memory
        // prettier-ignore
        new LambdaToDynamoDB(this, 'ChatProviderLambdaToConversationTable', { // NOSONAR - construct instantiation
                existingLambdaObj: this.chatLlmProviderLambda,
                existingTableObj: this.chatStorageSetup.chatStorage.conversationTable,
                tablePermissions: 'ReadWrite',
                tableEnvironmentVariableName: CONVERSATION_TABLE_NAME_ENV_VAR
            });
    }

    protected initializeCfnParameters(): void {
        this.stackParameters = new BedrockAgentParameters(this);
    }

    public getLlmProviderName(): CHAT_PROVIDERS {
        return CHAT_PROVIDERS.BEDROCK_AGENT;
    }

    protected setupVPC(): VPCSetup {
        return new VPCSetup(this, 'VPC', {
            stackType: 'bedrock-agents',
            deployVpcCondition: this.deployVpcCondition,
            customResourceLambdaArn: this.applicationSetup.customResourceLambda.functionArn,
            customResourceRoleArn: this.applicationSetup.customResourceLambda.role!.roleArn,
            iPamPoolId: this.iPamPoolId.valueAsString,
            accessLogBucket: this.applicationSetup.accessLoggingBucket,
            bedrockAgentId: this.stackParameters.bedrockAgentId.valueAsString,
            bedrockAgentAliasId: this.stackParameters.bedrockAgentAliasId.valueAsString,
            ...this.baseStackProps
        });
    }
}
