#!/usr/bin/env node
// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import * as cdk from 'aws-cdk-lib';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import { Construct } from 'constructs';
import { NagSuppressions } from 'cdk-nag';

/**
 * Properties for Agent Execution Role
 */
export interface AgentExecutionRoleProps {
    /**
     * Use case configuration table name for scoped DynamoDB permissions
     */
    useCaseConfigTableName: string;

    /**
     * Use cases table name for workflow agent discovery (optional)
     * When provided, enables workflows to query use cases table for agent configurations
     */
    useCasesTableName?: string;

    /**
     * Memory ID for scoped memory permissions (optional)
     * When provided, grants access to specific memory instance instead of wildcard
     */
    memoryId?: string;
}

/**
 * Helper class to create and configure the AgentCore Runtime execution role
 * with all required permissions as specified in the GAAB v4.0.0 design document
 */
export class AgentExecutionRole extends Construct {
    public readonly role: iam.Role;

    constructor(scope: Construct, id: string, props: AgentExecutionRoleProps) {
        super(scope, id);

        this.role = this.createExecutionRole(props);
        this.addSecurityConditions();
        this.addNagSuppressions();
        if (props.memoryId) {
            // This permission is separated out as a separate Policy to ensure that no we don't create a dependency between memory and runtime deployment.
            const memoryPolicy = this.createAgentCoreMemoryPolicy(props.memoryId);
            memoryPolicy.attachToRole(this.role);
        }
    }

    /**
     * Create the AgentCore Runtime execution role with comprehensive permissions
     */
    private createExecutionRole(props: AgentExecutionRoleProps): iam.Role {
        const statements = [
            this.createECRPermissions(),
            this.createCloudWatchLogsPermissions(),
            this.createXRayPermissions(),
            this.createCloudWatchMetricsPermissions(),
            this.createWorkloadIdentityPermissions(), // Includes OAuth2 token permissions
            this.createSecretsManagerPermissions(),
            this.createBedrockPermissions(),
            this.createBedrockGuardrailPermissions(),
            this.createDynamoDBPermissions(props.useCaseConfigTableName, props.useCasesTableName)
        ];

        return new iam.Role(this, 'AgentCoreRuntimeExecutionRole', {
            assumedBy: new iam.ServicePrincipal('bedrock-agentcore.amazonaws.com'),
            description: 'Execution role for AgentCore Runtime',
            inlinePolicies: {
                AgentCoreRuntimePolicy: new iam.PolicyDocument({
                    statements: statements
                })
            }
        });
    }

    /**
     * Create the AgentCore Runtime execution role with memory access permissions
     * @param memoryId The AgentCore memory instance to be access
     * @returns An IAM policy providing the permission.
     */
    private createAgentCoreMemoryPolicy(memoryId: string): iam.Policy {
        return new iam.Policy(this, 'AgentCoreRuntimeMemoryPolicy', {
            statements: [this.createAgentCoreMemoryPermissions(memoryId)]
        });
    }

    /**
     * Create ECR permissions for image access
     */
    private createECRPermissions(): iam.PolicyStatement {
        return new iam.PolicyStatement({
            sid: 'ECRAccess',
            effect: iam.Effect.ALLOW,
            actions: ['ecr:BatchGetImage', 'ecr:GetDownloadUrlForLayer', 'ecr:GetAuthorizationToken'],
            resources: [
                `arn:${cdk.Aws.PARTITION}:ecr:${cdk.Aws.REGION}:${cdk.Aws.ACCOUNT_ID}:repository/gaab-agents-*/*`,
                '*' // GetAuthorizationToken requires wildcard
            ]
        });
    }

    /**
     * Create comprehensive CloudWatch Logs permissions
     */
    private createCloudWatchLogsPermissions(): iam.PolicyStatement {
        return new iam.PolicyStatement({
            sid: 'CloudWatchLogs',
            effect: iam.Effect.ALLOW,
            actions: [
                'logs:CreateLogGroup',
                'logs:CreateLogStream',
                'logs:PutLogEvents',
                'logs:DescribeLogStreams',
                'logs:DescribeLogGroups'
            ],
            resources: [
                `arn:${cdk.Aws.PARTITION}:logs:${cdk.Aws.REGION}:${cdk.Aws.ACCOUNT_ID}:log-group:/aws/bedrock-agentcore/runtimes/*`,
                `arn:${cdk.Aws.PARTITION}:logs:${cdk.Aws.REGION}:${cdk.Aws.ACCOUNT_ID}:log-group:/aws/bedrock-agentcore/runtimes/*:log-stream:*`,
                `arn:${cdk.Aws.PARTITION}:logs:${cdk.Aws.REGION}:${cdk.Aws.ACCOUNT_ID}:log-group:*`
            ]
        });
    }

    /**
     * Create X-Ray tracing permissions
     */
    private createXRayPermissions(): iam.PolicyStatement {
        return new iam.PolicyStatement({
            sid: 'XRayTracing',
            effect: iam.Effect.ALLOW,
            actions: [
                'xray:PutTraceSegments',
                'xray:PutTelemetryRecords',
                'xray:GetSamplingRules',
                'xray:GetSamplingTargets'
            ],
            resources: ['*']
        });
    }

    /**
     * Create CloudWatch metrics permissions
     */
    private createCloudWatchMetricsPermissions(): iam.PolicyStatement {
        return new iam.PolicyStatement({
            sid: 'CloudWatchMetrics',
            effect: iam.Effect.ALLOW,
            actions: ['cloudwatch:PutMetricData'],
            resources: ['*'],
            conditions: {
                StringEquals: {
                    'cloudwatch:namespace': 'bedrock-agentcore'
                }
            }
        });
    }

    /**
     * Create AgentCore workload identity and OAuth2 token permissions
     * Includes both workload identity management and OAuth2 token access
     * GetResourceOauth2Token requires access to both workload-identity and token-vault resources
     */
    private createWorkloadIdentityPermissions(): iam.PolicyStatement {
        return new iam.PolicyStatement({
            sid: 'AgentCoreWorkloadIdentity',
            effect: iam.Effect.ALLOW,
            actions: [
                'bedrock-agentcore:CreateWorkloadIdentity',
                'bedrock-agentcore:GetWorkloadAccessToken',
                'bedrock-agentcore:GetWorkloadAccessTokenForJWT',
                'bedrock-agentcore:GetWorkloadAccessTokenForUserId',
                'bedrock-agentcore:GetResourceOauth2Token'
            ],
            resources: [
                `arn:${cdk.Aws.PARTITION}:bedrock-agentcore:${cdk.Aws.REGION}:${cdk.Aws.ACCOUNT_ID}:workload-identity-directory/default`,
                `arn:${cdk.Aws.PARTITION}:bedrock-agentcore:${cdk.Aws.REGION}:${cdk.Aws.ACCOUNT_ID}:workload-identity-directory/default/workload-identity/*`,
                `arn:${cdk.Aws.PARTITION}:bedrock-agentcore:${cdk.Aws.REGION}:${cdk.Aws.ACCOUNT_ID}:token-vault/default`,
                `arn:${cdk.Aws.PARTITION}:bedrock-agentcore:${cdk.Aws.REGION}:${cdk.Aws.ACCOUNT_ID}:token-vault/default/oauth2credentialprovider/*`
            ]
        });
    }

    /**
     * Create Secrets Manager permissions for AgentCore identity secrets
     * Scoped to secrets with the bedrock-agentcore-identity! prefix for OAuth2 credentials
     */
    private createSecretsManagerPermissions(): iam.PolicyStatement {
        return new iam.PolicyStatement({
            sid: 'SecretsManagerAccess',
            effect: iam.Effect.ALLOW,
            actions: ['secretsmanager:GetSecretValue'],
            resources: [
                `arn:${cdk.Aws.PARTITION}:secretsmanager:${cdk.Aws.REGION}:${cdk.Aws.ACCOUNT_ID}:secret:bedrock-agentcore-identity!*`
            ]
        });
    }

    /**
     * Create Bedrock model invocation permissions
     * Provides baseline permissions for foundation models in the deployment region
     */
    private createBedrockPermissions(): iam.PolicyStatement {
        return new iam.PolicyStatement({
            sid: 'BedrockModelInvocation',
            effect: iam.Effect.ALLOW,
            actions: ['bedrock:InvokeModel', 'bedrock:InvokeModelWithResponseStream'],
            resources: [
                cdk.Fn.join('', ['arn:', cdk.Aws.PARTITION, ':bedrock:', cdk.Aws.REGION, '::foundation-model/*'])
            ]
        });
    }

    /**
     * Create Bedrock Guardrail permissions for content filtering and safety
     */
    private createBedrockGuardrailPermissions(): iam.PolicyStatement {
        return new iam.PolicyStatement({
            sid: 'BedrockGuardrailAccess',
            effect: iam.Effect.ALLOW,
            actions: ['bedrock:ApplyGuardrail'],
            resources: [`arn:${cdk.Aws.PARTITION}:bedrock:${cdk.Aws.REGION}:${cdk.Aws.ACCOUNT_ID}:guardrail/*`]
        });
    }

    /**
     * Create AgentCore Memory permissions for event and semantic memory operations if memoryId exists
     */
    private createAgentCoreMemoryPermissions(memoryId: string): iam.PolicyStatement {
        return new iam.PolicyStatement({
            sid: 'AgentCoreMemoryAccess',
            effect: iam.Effect.ALLOW,
            actions: [
                'bedrock-agentcore:CreateEvent',
                'bedrock-agentcore:ListEvents',
                'bedrock-agentcore:RetrieveMemoryRecords',
                'bedrock-agentcore:GetEvent'
            ],
            resources: [
                `arn:${cdk.Aws.PARTITION}:bedrock-agentcore:${cdk.Aws.REGION}:${cdk.Aws.ACCOUNT_ID}:memory/${memoryId}`
            ]
        });
    }

    /**
     * Create DynamoDB permissions for use case configuration access
     * Scoped to the specific configuration table and optionally use cases table for workflows
     */
    private createDynamoDBPermissions(useCaseConfigTableName: string, useCasesTableName?: string): iam.PolicyStatement {
        const resources = [
            `arn:${cdk.Aws.PARTITION}:dynamodb:${cdk.Aws.REGION}:${cdk.Aws.ACCOUNT_ID}:table/${useCaseConfigTableName}`
        ];

        // Add use cases table access for workflows to discover agent configurations
        if (useCasesTableName) {
            resources.push(
                `arn:${cdk.Aws.PARTITION}:dynamodb:${cdk.Aws.REGION}:${cdk.Aws.ACCOUNT_ID}:table/${useCasesTableName}`
            );
        }

        return new iam.PolicyStatement({
            sid: 'DynamoDBConfigAccess',
            effect: iam.Effect.ALLOW,
            actions: ['dynamodb:GetItem', 'dynamodb:Query'],
            resources: resources
        });
    }

    /**
     * Add enhanced security conditions to the assume role policy
     */
    private addSecurityConditions(): void {
        this.role.assumeRolePolicy?.addStatements(
            new iam.PolicyStatement({
                effect: iam.Effect.ALLOW,
                principals: [new iam.ServicePrincipal('bedrock-agentcore.amazonaws.com')],
                actions: ['sts:AssumeRole'],
                conditions: {
                    StringEquals: {
                        'aws:SourceAccount': cdk.Aws.ACCOUNT_ID
                    },
                    ArnLike: {
                        'aws:SourceArn': `arn:${cdk.Aws.PARTITION}:bedrock-agentcore:*:*:*`
                    }
                }
            })
        );
    }

    /**
     * Add CDK NAG suppressions for wildcard permissions
     */
    private addNagSuppressions(): void {
        // Add comprehensive suppressions for all wildcard permissions used by AgentCore Runtime
        NagSuppressions.addResourceSuppressions(
            this.role,
            [
                {
                    id: 'AwsSolutions-IAM5',
                    reason: 'AgentCore Runtime requires wildcard permissions for ECR GetAuthorizationToken, CloudWatch Logs, X-Ray tracing, and CloudWatch metrics as specified in GAAB v4.0.0 design document.',
                    appliesTo: ['Resource::*']
                },
                {
                    id: 'AwsSolutions-IAM5',
                    reason: 'Bedrock Guardrail access requires wildcard to support all guardrails in the account. Required to enable single runtime workflows to invoke all underlying guardrails of the specialized agents.',
                    appliesTo: ['Resource::arn:<AWS::Partition>:bedrock:<AWS::Region>:<AWS::AccountId>:guardrail/*']
                },
                {
                    id: 'AwsSolutions-IAM5',
                    reason: 'Secrets Manager wildcard is scoped to bedrock-agentcore-identity! prefix for OAuth2 credentials. The full secret ID is not known at stack creation time as it is dynamically created by AgentCore.',
                    appliesTo: [
                        'Resource::arn:<AWS::Partition>:secretsmanager:<AWS::Region>:<AWS::AccountId>:secret:bedrock-agentcore-identity!*'
                    ]
                },
                {
                    id: 'AwsSolutions-IAM5',
                    reason: 'AgentCore Runtime requires broad permissions for CloudWatch Logs, ECR repositories, Bedrock foundation models, Bedrock Guardrails, Bedrock AgentCore workload identity, OAuth2 token vault (including both base and credential provider paths), and AgentCore Memory.',
                    appliesTo: [
                        'Resource::arn:<AWS::Partition>:bedrock:<AWS::Region>::foundation-model/*',
                        'Resource::arn:<AWS::Partition>:bedrock:<AWS::Region>:<AWS::AccountId>:guardrail/*',
                        'Resource::arn:<AWS::Partition>:logs:<AWS::Region>:<AWS::AccountId>:log-group:*',
                        'Resource::arn:<AWS::Partition>:logs:<AWS::Region>:<AWS::AccountId>:log-group:/aws/bedrock-agentcore/runtimes/*',
                        'Resource::arn:<AWS::Partition>:logs:<AWS::Region>:<AWS::AccountId>:log-group:/aws/bedrock-agentcore/runtimes/*:log-stream:*',
                        'Resource::arn:<AWS::Partition>:ecr:<AWS::Region>:<AWS::AccountId>:repository/gaab-agents-*/*',
                        'Resource::arn:<AWS::Partition>:bedrock-agentcore:<AWS::Region>:<AWS::AccountId>:workload-identity-directory/default/workload-identity/*',
                        'Resource::arn:<AWS::Partition>:bedrock-agentcore:<AWS::Region>:<AWS::AccountId>:token-vault/default/oauth2credentialprovider/*',
                        'Resource::arn:<AWS::Partition>:bedrock-agentcore:<AWS::Region>:<AWS::AccountId>:memory/*'
                    ]
                }
            ],
            true // Apply to children
        );
    }

    /**
     * Add inference profile support for cross-region model access
     *
     * This method creates a custom resource that resolves specific model ARNs from the
     * inference profile configuration stored in DynamoDB. If an inference profile is configured,
     * it adds additional permissions for the specific models (which may be in different regions).
     *
     * The custom resource and policy are conditionally created based on the provided condition.
     *
     * @param customResourceLambda - Lambda function for custom resource operations
     * @param customResourceRole - IAM role for the custom resource lambda
     * @param useCaseConfigTableName - DynamoDB table containing use case configuration
     * @param useCaseConfigRecordKey - Key for the specific use case configuration record
     * @param condition - CloudFormation condition to control whether resources are created
     * @returns Custom resource that resolves inference profile model ARNs
     */
    public addInferenceProfileSupport(
        customResourceLambda: lambda.IFunction,
        customResourceRole: iam.IRole,
        useCaseConfigTableName: string,
        useCaseConfigRecordKey: string,
        condition: cdk.CfnCondition
    ): cdk.CustomResource {
        // Grant custom resource permissions to get inference profile information
        const getInferenceProfilePolicy = new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            actions: ['bedrock:GetInferenceProfile'],
            resources: [`arn:${cdk.Aws.PARTITION}:bedrock:${cdk.Aws.REGION}:${cdk.Aws.ACCOUNT_ID}:inference-profile/*`]
        });

        // Grant custom resource permissions to read use case configuration from DynamoDB
        const customResourceUseCaseTablePolicy = new iam.PolicyStatement({
            actions: ['dynamodb:GetItem'],
            resources: [
                `arn:${cdk.Aws.PARTITION}:dynamodb:${cdk.Aws.REGION}:${cdk.Aws.ACCOUNT_ID}:table/${useCaseConfigTableName}`
            ],
            conditions: {
                'ForAllValues:StringEquals': {
                    'dynamodb:LeadingKeys': [useCaseConfigRecordKey]
                }
            },
            effect: iam.Effect.ALLOW
        });

        // Attach policies to custom resource role
        // Cast to Role to access addToPolicy method
        const role = customResourceRole as iam.Role;
        role.addToPolicy(getInferenceProfilePolicy);
        role.addToPolicy(customResourceUseCaseTablePolicy);

        // Add CDK Nag suppression for the custom resource role's inference profile permissions
        NagSuppressions.addResourceSuppressions(
            role,
            [
                {
                    id: 'AwsSolutions-IAM5',
                    reason: 'Custom resource requires GetInferenceProfile permission with wildcard to resolve inference profile model ARNs. The specific inference profile IDs are not known at deployment time and are configured by users.',
                    appliesTo: [
                        'Resource::arn:<AWS::Partition>:bedrock:<AWS::Region>:<AWS::AccountId>:inference-profile/*'
                    ]
                }
            ],
            true // Apply to children (including the DefaultPolicy)
        );

        // Create custom resource to resolve model ARNs from inference profile
        const inferenceProfileArnsForPolicy = new cdk.CustomResource(this, 'GetModelResourceArns', {
            resourceType: 'Custom::GetModelResourceArns',
            serviceToken: customResourceLambda.functionArn,
            properties: {
                Resource: 'GET_MODEL_RESOURCE_ARNS',
                USE_CASE_CONFIG_TABLE_NAME: useCaseConfigTableName,
                USE_CASE_CONFIG_RECORD_KEY: useCaseConfigRecordKey
            }
        });

        // Create policy with resolved model ARNs from inference profile
        // This allows cross-region model access when using inference profiles
        const inferenceProfileModelPolicy = new iam.Policy(this, 'InferenceProfileModelPolicy', {
            statements: [
                new iam.PolicyStatement({
                    effect: iam.Effect.ALLOW,
                    actions: ['bedrock:InvokeModelWithResponseStream', 'bedrock:InvokeModel'],
                    resources: cdk.Fn.split(',', inferenceProfileArnsForPolicy.getAttString('Arns'))
                })
            ]
        });

        // Apply the condition to both the custom resource and the policy
        // They are only created when UseInferenceProfile parameter is set to 'Yes'
        (inferenceProfileModelPolicy.node.defaultChild as cdk.CfnResource).cfnOptions.condition = condition;
        (inferenceProfileArnsForPolicy.node.defaultChild as cdk.CfnResource).cfnOptions.condition = condition;

        this.role.attachInlinePolicy(inferenceProfileModelPolicy);
        inferenceProfileArnsForPolicy.node.addDependency(this.role);

        // Add NAG suppressions for the inference profile policy
        NagSuppressions.addResourceSuppressions(inferenceProfileModelPolicy, [
            {
                id: 'AwsSolutions-IAM5',
                reason: 'Inference profile model ARNs are dynamically resolved from the configured inference profile and may include cross-region foundation models.',
                appliesTo: ['Resource::*']
            }
        ]);

        return inferenceProfileArnsForPolicy;
    }
}
