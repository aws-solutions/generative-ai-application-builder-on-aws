#!/usr/bin/env node
// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import * as cdk from 'aws-cdk-lib';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import { Construct } from 'constructs';
import { NagSuppressions } from 'cdk-nag';

/**
 * Properties for AgentCore Memory deployment
 */
export interface AgentMemoryDeploymentProps {
    /**
     * Custom resource Lambda function for deployment operations
     */
    customResourceLambda: lambda.Function;

    /**
     * Agent runtime name
     */
    agentRuntimeName: string;

    /**
     * Enable long-term memory flag
     */
    enableLongTermMemory: string;
}

/**
 * Helper class to manage AgentCore Memory deployment via custom resource
 */
export class AgentMemoryDeployment extends Construct {
    public readonly customResource: cdk.CustomResource;
    public readonly managementPolicy: iam.Policy;

    constructor(scope: Construct, id: string, props: AgentMemoryDeploymentProps) {
        super(scope, id);

        this.managementPolicy = this.createMemoryManagementPolicy();
        this.attachPolicyToCustomResourceLambda(props.customResourceLambda);
        this.customResource = this.createMemoryCustomResource(props);
        this.addNagSuppressions();
    }

    /**
     * Create IAM policy for AgentCore Memory management operations
     */
    private createMemoryManagementPolicy(): iam.Policy {
        return new iam.Policy(this, 'AgentCoreMemoryManagementPolicy', {
            statements: [
                new iam.PolicyStatement({
                    sid: 'AgentCoreMemoryManagement',
                    effect: iam.Effect.ALLOW,
                    actions: [
                        'bedrock-agentcore:CreateMemory',
                        'bedrock-agentcore:UpdateMemory',
                        'bedrock-agentcore:DeleteMemory',
                        'bedrock-agentcore:GetMemory',
                        'bedrock-agentcore:ListMemories'
                    ],
                    resources: [
                        `arn:${cdk.Aws.PARTITION}:bedrock-agentcore:${cdk.Aws.REGION}:${cdk.Aws.ACCOUNT_ID}:memory/*`
                    ]
                })
            ]
        });
    }

    /**
     * Attach the management policy to the custom resource Lambda
     */
    private attachPolicyToCustomResourceLambda(customResourceLambda: lambda.Function): void {
        this.managementPolicy.attachToRole(customResourceLambda.role!);
    }

    /**
     * Create the custom resource for AgentCore Memory deployment
     */
    private createMemoryCustomResource(props: AgentMemoryDeploymentProps): cdk.CustomResource {
        const customResource = new cdk.CustomResource(this, 'AgentCoreMemory', {
            resourceType: 'Custom::AgentCoreMemory',
            serviceToken: props.customResourceLambda.functionArn,
            properties: {
                Resource: 'DEPLOY_AGENT_CORE_MEMORY',
                AgentRuntimeName: props.agentRuntimeName,
                EnableLongTermMemory: props.enableLongTermMemory
            }
        });

        customResource.node.addDependency(this.managementPolicy);
        return customResource;
    }

    /**
     * Add CDK NAG suppressions
     */
    private addNagSuppressions(): void {
        NagSuppressions.addResourceSuppressions(this.managementPolicy, [
            {
                id: 'AwsSolutions-IAM5',
                reason: 'Custom resource requires permissions to manage AgentCore Memory resources with wildcard for resource instances',
                appliesTo: ['Resource::arn:<AWS::Partition>:bedrock-agentcore:<AWS::Region>:<AWS::AccountId>:memory/*']
            }
        ]);
    }

    /**
     * Get the Memory ID from the custom resource
     */
    public getMemoryId(): string {
        return this.customResource.getAttString('MemoryId');
    }

    public getMemoryStrategyId(): string {
        return this.customResource.getAttString('MemoryStrategyId');
    }
}
