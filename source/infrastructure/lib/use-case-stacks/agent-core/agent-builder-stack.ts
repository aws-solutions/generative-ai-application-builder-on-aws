#!/usr/bin/env node
// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import * as cdk from 'aws-cdk-lib';

import { Construct } from 'constructs';

import { BaseStack, BaseStackProps } from '../../framework/base-stack';
import { CHAT_PROVIDERS, ECR_URI_PATTERN, USE_CASE_TYPES, GAAB_STRANDS_AGENT_IMAGE_NAME } from '../../utils/constants';
import { AgentCoreBaseStack, AgentCoreBaseParameters } from './agent-core-base-stack';
import { VPCSetup } from '../../vpc/vpc-setup';

/**
 * CloudFormation parameters specific to AgentCore agent deployment
 * Extends the base AgentCoreBaseParameters with agent-specific configuration
 */
export class AgentBuilderParameters extends AgentCoreBaseParameters {
    /**
     * Optional custom ECR image URI for the agent
     */
    public customAgentImageUri: cdk.CfnParameter;

    constructor(stack: BaseStack) {
        super(stack);
    }

    /**
     * Create use case-specific parameters for AgentBuilder
     */
    protected createUseCaseSpecificParameters(stack: BaseStack): void {
        this.createCustomImageParameters(stack);
    }

    /**
     * Get the custom image parameter for AgentBuilder
     */
    public getCustomImageParameter(): cdk.CfnParameter {
        return this.customAgentImageUri;
    }

    /**
     * Create custom image URI parameters
     */
    private createCustomImageParameters(stack: BaseStack): void {
        this.customAgentImageUri = new cdk.CfnParameter(stack, 'CustomAgentImageUri', {
            type: 'String',
            description:
                'Optional custom ECR image URI for the agent. If provided, overrides default image resolution.',
            default: '',
            allowedPattern: ECR_URI_PATTERN + '|^$',
            constraintDescription: this.getCustomImageConstraintDescription(USE_CASE_TYPES.AGENT_BUILDER)
        });
    }

    /**
     * Override base configuration group label for agent-specific naming
     */
    protected getBaseConfigurationGroupLabel(): string {
        return 'Agent Configuration';
    }

    /**
     * Get agent-specific parameter labels for better CloudFormation console UX
     */
    protected getUseCaseSpecificParameterLabels(): Record<string, string> {
        return {
            [this.customAgentImageUri.logicalId]: 'Custom Agent Image URI'
        };
    }
}

/**
 * The main stack creating the Amazon Bedrock AgentCore agent use case infrastructure
 *
 * This stack orchestrates the deployment of Amazon Bedrock AgentCore agents following
 * the GAAB v4.0.0 design patterns with modular helper classes.
 *
 * IMPORTANT: Amazon Bedrock AgentCore (preview service) does not support VPC deployments.
 * All Amazon Bedrock AgentCore components run in non-VPC mode regardless of the
 * deployment platform's VPC configuration. VPC support will be added in future releases.
 */
export class AgentBuilderStack extends AgentCoreBaseStack {
    constructor(scope: Construct, id: string, props: BaseStackProps) {
        super(scope, id, props);
    }

    /**
     * Get the image name for AgentBuilder use case
     */
    public getImageName(): string {
        return GAAB_STRANDS_AGENT_IMAGE_NAME;
    }

    /**
     * Get the use case type for AgentBuilder
     */
    public getUseCaseType(): USE_CASE_TYPES {
        return USE_CASE_TYPES.AGENT_BUILDER;
    }

    /**
     * Get the WebSocket route name for AgentBuilder
     */
    public getWebSocketRouteName(): string {
        return 'invokeAgentCore';
    }

    /**
     * Get the LLM provider name for AgentBuilder
     */
    public getLlmProviderName(): CHAT_PROVIDERS {
        return CHAT_PROVIDERS.AGENT_CORE;
    }

    /**
     * Get the agent runtime name for AgentBuilder
     */
    public getAgentRuntimeName(): string {
        return `gaab_agent_${this.stackParameters.useCaseShortId}`;
    }

    /**
     * AgentBuilder supports inference profiles
     */
    public shouldIncludeInferenceProfileSupport(): boolean {
        return true;
    }

    /**
     * Initialize CloudFormation parameters
     */
    protected initializeCfnParameters(): void {
        this.stackParameters = new AgentBuilderParameters(this);
    }

    /**
     * Set up VPC configuration for AgentBuilder stack
     * Note: Amazon Bedrock AgentCore (preview) does not support VPC deployments.
     * The VPC setup will create minimal infrastructure for future compatibility.
     */
    protected setupVPC(): VPCSetup {
        return new VPCSetup(this, 'VPC', {
            stackType: 'agent-builder',
            deployVpcCondition: this.deployVpcCondition,
            customResourceLambdaArn: this.applicationSetup.customResourceLambda.functionArn,
            customResourceRoleArn: this.applicationSetup.customResourceLambda.role!.roleArn,
            iPamPoolId: this.iPamPoolId.valueAsString,
            accessLogBucket: this.applicationSetup.accessLoggingBucket,
            ...this.baseStackProps
        });
    }
}
