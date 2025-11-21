#!/usr/bin/env node
// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import * as cdk from 'aws-cdk-lib';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import { Construct } from 'constructs';
import { NagSuppressions } from 'cdk-nag';

/**
 * Properties for AgentCore Runtime deployment
 */
export interface AgentRuntimeDeploymentProps {
    /**
     * Custom resource Lambda function for deployment operations
     */
    customResourceLambda: lambda.Function;

    /**
     * AgentCore execution role
     */
    agentExecutionRole: iam.Role;

    /**
     * Agent runtime name
     */
    agentRuntimeName: string;

    /**
     * Agent image URI
     */
    agentImageUri: string;

    /**
     * Use case UUID
     */
    useCaseUUID: string;

    /**
     * Use case configuration table name
     */
    useCaseConfigTableName: string;

    /**
     * Use case configuration record key
     */
    useCaseConfigRecordKey: string;

    /**
     * Cognito user pool ID for authorizer configuration
     */
    cognitoUserPoolId: string;

    /**
     * Additional properties to pass to the custom resource
     * This allows flexibility for different use cases (Agent, Workflow, etc.)
     */
    additionalProperties?: Record<string, any>;
}

/**
 * Helper class to manage AgentCore Runtime deployment via custom resource
 */
export class AgentRuntimeDeployment extends Construct {
    public customResource: cdk.CustomResource;
    public readonly managementPolicy: iam.Policy;

    constructor(scope: Construct, id: string, props: AgentRuntimeDeploymentProps) {
        super(scope, id);

        this.managementPolicy = this.createManagementPolicy(props.agentExecutionRole, props.useCaseConfigTableName);
        this.attachPolicyToCustomResourceLambda(props.customResourceLambda);
        this.customResource = this.createCustomResource(props);

        // Ensure the custom resource depends on the policy being attached to the Lambda role
        this.customResource.node.addDependency(this.managementPolicy);

        this.addNagSuppressions();
    }

    /**
     * Create IAM policy for AgentCore management operations
     */
    private createManagementPolicy(agentExecutionRole: iam.Role, useCaseConfigTableName: string): iam.Policy {
        return new iam.Policy(this, 'AgentCoreManagementPolicy', {
            statements: [
                // AgentCore Runtime management permissions
                new iam.PolicyStatement({
                    sid: 'AgentCoreRuntimeManagement',
                    effect: iam.Effect.ALLOW,
                    actions: [
                        'bedrock-agentcore:CreateAgentRuntime',
                        'bedrock-agentcore:CreateAgentRuntimeEndpoint',
                        'bedrock-agentcore:CreateWorkloadIdentity',
                        'bedrock-agentcore:UpdateAgentRuntime',
                        'bedrock-agentcore:DeleteAgentRuntime',
                        'bedrock-agentcore:GetAgentRuntime',
                        'bedrock-agentcore:ListAgentRuntimes',
                        'bedrock-agentcore:ListAgentRuntimeEndpoints',
                        'bedrock-agentcore:ListAgentRuntimeVersions'
                    ],
                    resources: [
                        `arn:${cdk.Aws.PARTITION}:bedrock-agentcore:${cdk.Aws.REGION}:${cdk.Aws.ACCOUNT_ID}:runtime/*`,
                        `arn:${cdk.Aws.PARTITION}:bedrock-agentcore:${cdk.Aws.REGION}:${cdk.Aws.ACCOUNT_ID}:workload-identity-directory/*`
                    ]
                }),
                // ECR permissions for pull-through cache triggering
                new iam.PolicyStatement({
                    sid: 'ECRPullThroughCache',
                    effect: iam.Effect.ALLOW,
                    actions: [
                        'ecr:DescribeRepositories',
                        'ecr:BatchGetImage',
                        'ecr:DescribeImages',
                        'ecr:CreateRepository',
                        'ecr:BatchImportUpstreamImage'
                    ],
                    resources: [
                        `arn:${cdk.Aws.PARTITION}:ecr:*:${cdk.Aws.ACCOUNT_ID}:repository/*`
                    ]
                }),
                // DynamoDB permissions to update use case config with memory ID
                new iam.PolicyStatement({
                    sid: 'DynamoDBConfigUpdate',
                    effect: iam.Effect.ALLOW,
                    actions: ['dynamodb:UpdateItem', 'dynamodb:GetItem'],
                    resources: [
                        `arn:${cdk.Aws.PARTITION}:dynamodb:${cdk.Aws.REGION}:${cdk.Aws.ACCOUNT_ID}:table/${useCaseConfigTableName}`
                    ]
                }),
                // Permission to pass the execution role to AgentCore
                new iam.PolicyStatement({
                    sid: 'PassRoleToAgentCore',
                    effect: iam.Effect.ALLOW,
                    actions: ['iam:PassRole'],
                    resources: [agentExecutionRole.roleArn]
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
     * Create the custom resource for AgentCore Runtime deployment
     */
    private createCustomResource(props: AgentRuntimeDeploymentProps): cdk.CustomResource {
        // Build base properties
        const baseProperties = {
            Resource: 'DEPLOY_AGENT_CORE',
            AgentRuntimeName: props.agentRuntimeName,
            AgentImageUri: props.agentImageUri,
            ExecutionRoleArn: props.agentExecutionRole.roleArn,
            UseCaseUUID: props.useCaseUUID,
            UseCaseConfigTableName: props.useCaseConfigTableName,
            UseCaseConfigRecordKey: props.useCaseConfigRecordKey,
            CognitoUserPoolId: props.cognitoUserPoolId,
            // Initialize multimodal properties as empty strings - will be updated later if multimodal setup is available
            MultimodalDataMetadataTable: '',
            MultimodalDataBucket: ''
        };

        // Merge with additional properties if provided
        const allProperties = {
            ...baseProperties,
            ...(props.additionalProperties || {})
        };

        const customResource = new cdk.CustomResource(this, 'AgentCoreRuntimeCustomResource', {
            resourceType: 'Custom::AgentCoreRuntime',
            serviceToken: props.customResourceLambda.functionArn,
            properties: allProperties
        });

        // Ensure the policy is attached before the custom resource is created
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
                reason: 'Custom resource requires permissions to manage AgentCore Runtime resources with wildcard for resource instances',
                appliesTo: [
                    'Resource::arn:<AWS::Partition>:bedrock-agentcore:<AWS::Region>:<AWS::AccountId>:runtime/*',
                    'Resource::arn:<AWS::Partition>:bedrock-agentcore:<AWS::Region>:<AWS::AccountId>:workload-identity-directory/*'
                ]
            },
            {
                id: 'AwsSolutions-IAM5',
                reason: 'Custom resource requires permissions to trigger ECR pull-through cache with wildcard for repository names and regions',
                appliesTo: [
                    'Resource::arn:<AWS::Partition>:ecr:*:<AWS::AccountId>:repository/*'
                ]
            }
        ]);
    }

    /**
     * Get the AgentCore Runtime ARN from the custom resource
     */
    public getAgentRuntimeArn(): string {
        return this.customResource.getAttString('AgentRuntimeArn');
    }

    /**
     * Update multimodal properties after multimodal setup is created
     * This method should be called after the multimodal setup is complete
     */
    public updateMultimodalProperties(multimodalDataMetadataTable: string, multimodalDataBucket: string): void {
        const cfnCustomResource = this.customResource.node.defaultChild as cdk.CfnCustomResource;

        cfnCustomResource.addPropertyOverride('MultimodalDataMetadataTable', multimodalDataMetadataTable);
        cfnCustomResource.addPropertyOverride('MultimodalDataBucket', multimodalDataBucket);
    }
}
