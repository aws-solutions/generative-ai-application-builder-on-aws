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

import * as cdk from 'aws-cdk-lib';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import { Construct } from 'constructs';
import { BaseStack, BaseStackProps } from '../lib/framework/base-stack';
import { ApplicationAssetBundler } from '../lib/framework/bundler/asset-options-factory';
import {
    CHAT_LAMBDA_PYTHON_RUNTIME,
    CHAT_PROVIDERS,
    COMMERCIAL_REGION_LAMBDA_PYTHON_RUNTIME,
    LAMBDA_TIMEOUT_MINS
} from '../lib/utils/constants';
import { UseCaseParameters, UseCaseStack } from './framework/use-case-stack';
import { createDefaultLambdaRole } from './utils/common-utils';
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
