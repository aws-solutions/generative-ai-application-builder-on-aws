#!/usr/bin/env node
// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import * as cdk from 'aws-cdk-lib';
import * as iam from 'aws-cdk-lib/aws-iam';

import { Construct } from 'constructs';

import { BaseStack, BaseStackProps } from '../../framework/base-stack';
import {
    CHAT_PROVIDERS,
    ECR_URI_PATTERN,
    GAAB_STRANDS_WORKFLOW_IMAGE_NAME,
    USE_CASE_TYPES
} from '../../utils/constants';
import { AgentCoreBaseParameters, AgentCoreBaseStack } from './agent-core-base-stack';
import { VPCSetup } from '../../vpc/vpc-setup';

/**
 * CloudFormation parameters specific to multi-agent workflow deployment
 * Extends the base AgentCoreBaseParameters with workflow-specific configuration
 */
export class WorkflowParameters extends AgentCoreBaseParameters {
    /**
     * Use cases table name for workflow agent discovery (for dashboard deployments)
     */
    public useCasesTableName: cdk.CfnParameter;

    /**
     * Optional custom ECR image URI for workflows
     */
    public customWorkflowImageUri: cdk.CfnParameter;

    constructor(stack: BaseStack) {
        super(stack);
    }

    /**
     * Create workflow-specific CloudFormation parameters
     */
    protected createUseCaseSpecificParameters(stack: BaseStack): void {
        this.createWorkflowSpecificParameters(stack);
        this.createCustomImageParameters(stack);
    }

    /**
     * Create workflow-specific parameters
     */
    private createWorkflowSpecificParameters(stack: BaseStack): void {
        this.useCasesTableName = new cdk.CfnParameter(stack, 'UseCasesTableName', {
            type: 'String',
            description:
                'Internal parameter - Use cases table name for workflow agent discovery, automatically provided by deployment platform',
            default: '',
            constraintDescription:
                'Internal parameter - automatically populated by deployment platform for dashboard deployments'
        });
    }

    /**
     * Create custom image URI parameters
     */
    private createCustomImageParameters(stack: BaseStack): void {
        this.customWorkflowImageUri = new cdk.CfnParameter(stack, 'CustomWorkflowImageUri', {
            type: 'String',
            description:
                'Optional custom ECR image URI for workflows. If provided, overrides default image resolution.',
            default: '',
            allowedPattern: ECR_URI_PATTERN + '|^$',
            constraintDescription: this.getCustomImageConstraintDescription(USE_CASE_TYPES.WORKFLOW)
        });
    }

    /**
     * Get the custom image parameter for this use case type
     */
    public getCustomImageParameter(): cdk.CfnParameter {
        return this.customWorkflowImageUri;
    }

    /**
     * Update CloudFormation parameter groups to include workflow configuration
     */
    protected getBaseConfigurationGroupLabel(): string {
        return 'Workflow Configuration';
    }

    /**
     * Get workflow-specific parameter group configuration
     */
    protected getUseCaseSpecificParameterGroup(): { Label: { default: string }; Parameters: string[] } | undefined {
        return {
            Label: { default: 'Workflow Agent Discovery (Advanced)' },
            Parameters: [this.useCasesTableName.logicalId]
        };
    }

    /**
     * Get workflow-specific parameter labels for better CloudFormation console UX
     */
    protected getUseCaseSpecificParameterLabels(): Record<string, string> {
        return {
            [this.useCasesTableName.logicalId]: 'Use Cases Table Name',
            [this.customWorkflowImageUri.logicalId]: 'Custom Workflow Image URI'
        };
    }
}

/**
 * The main stack creating the multi-agent workflow infrastructure
 *
 * This stack orchestrates the deployment of multi-agent workflows using the "Agents as Tools" pattern,
 * where a supervisor agent coordinates with specialized sub-agents to handle complex workflows.
 * It extends the AgentCoreBaseStack to inherit common AgentCore functionality while providing
 * workflow-specific behavior through abstract method implementations.
 */
export class WorkflowStack extends AgentCoreBaseStack {
    constructor(scope: Construct, id: string, props: BaseStackProps) {
        super(scope, id, props);
    }

    /**
     * Get the image name for workflow deployments
     */
    public getImageName(): string {
        return GAAB_STRANDS_WORKFLOW_IMAGE_NAME;
    }

    /**
     * Get the use case type for workflow deployments
     */
    public getUseCaseType(): USE_CASE_TYPES {
        return USE_CASE_TYPES.WORKFLOW;
    }

    /**
     * Get the WebSocket route name for workflow invocation
     */
    public getWebSocketRouteName(): string {
        return 'invokeWorkflow';
    }

    /**
     * Get the LLM provider name for workflow deployments
     * Appends 'Workflow' to distinguish from single agents
     */
    public getLlmProviderName(): CHAT_PROVIDERS {
        return `${CHAT_PROVIDERS.AGENT_CORE}Workflow` as CHAT_PROVIDERS;
    }

    /**
     * Get the agent runtime name pattern for workflow deployments
     */
    public getAgentRuntimeName(): string {
        return `gaab_workflow_${this.stackParameters.useCaseShortId}`;
    }

    /**
     * Determine if workflow deployments should include inference profile support
     * Initially set to false as workflows may not need inference profiles
     */
    public shouldIncludeInferenceProfileSupport(): boolean {
        return true;
    }

    /**
     * Initialize CloudFormation parameters
     */
    protected initializeCfnParameters(): void {
        this.stackParameters = new WorkflowParameters(this);
    }

    /**
     * Override to provide workflow-specific execution role permissions
     * Workflows need access to the use cases table for agent discovery
     */
    protected getAdditionalAgentExecutionRolePermissions(): iam.PolicyStatement[] | undefined {
        const workflowBuilderParams = this.stackParameters as WorkflowParameters;
        const useCasesTableName = workflowBuilderParams.useCasesTableName.valueAsString;

        // Only add permissions if use cases table name is provided (dashboard deployments)
        if (useCasesTableName && useCasesTableName !== '') {
            return [
                new iam.PolicyStatement({
                    effect: iam.Effect.ALLOW,
                    actions: ['dynamodb:Query', 'dynamodb:GetItem', 'dynamodb:Scan'],
                    resources: [
                        `arn:${cdk.Aws.PARTITION}:dynamodb:${cdk.Aws.REGION}:${cdk.Aws.ACCOUNT_ID}:table/${useCasesTableName}`
                    ]
                })
            ];
        }

        return undefined;
    }

    /**
     * Set up VPC configuration for Workflow stack
     * Note: Amazon Bedrock AgentCore (preview) does not support VPC deployments.
     * The VPC setup will create minimal infrastructure for future compatibility.
     */
    protected setupVPC(): VPCSetup {
        return new VPCSetup(this, 'VPC', {
            stackType: 'workflow',
            deployVpcCondition: this.deployVpcCondition,
            customResourceLambdaArn: this.applicationSetup.customResourceLambda.functionArn,
            customResourceRoleArn: this.applicationSetup.customResourceLambda.role!.roleArn,
            iPamPoolId: this.iPamPoolId.valueAsString,
            accessLogBucket: this.applicationSetup.accessLoggingBucket,
            ...this.baseStackProps
        });
    }
}
