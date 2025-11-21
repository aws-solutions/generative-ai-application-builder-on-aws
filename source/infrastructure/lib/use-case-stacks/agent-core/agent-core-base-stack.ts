#!/usr/bin/env node
// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import * as cdk from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import { Construct } from 'constructs';

import { BaseStack, BaseStackProps } from '../../framework/base-stack';
import { UseCaseParameters, UseCaseStack } from '../../framework/use-case-stack';
import { CHAT_PROVIDERS, StackDeploymentSource, USE_CASE_TYPES } from '../../utils/constants';
import { ComponentCognitoAppClient, ComponentType } from '../../auth/component-cognito-app-client';
import { AgentExecutionRole } from './components/agent-execution-role';
import { AgentRuntimeDeployment } from './components/agent-runtime-deployment';
import { AgentMemoryDeployment } from './components/agent-memory-deployment';
import { AgentInvocationLambda } from './components/agent-invocation-lambda';
import { ECRPullThroughCache } from './components/ecr-pull-through-cache';
import {
    determineDeploymentMode,
    ECRImageError,
    ImageResolutionContext,
    sanitizeVersionTag,
    resolveImageUriWithConditions
} from './utils/image-uri-resolver';
import { NagSuppressions } from 'cdk-nag';
import { LambdaToDynamoDB } from '@aws-solutions-constructs/aws-lambda-dynamodb';

/**
 * Abstract base class for CloudFormation parameters specific to AgentCore deployments
 * Provides common parameters shared across agent and workflow use cases
 */
export abstract class AgentCoreBaseParameters extends UseCaseParameters {
    /**
     * Enable long-term memory for the AgentCore deployment
     */
    public enableLongTermMemory: cdk.CfnParameter;

    /**
     * Shared ECR cache prefix from deployment platform (for dashboard deployments)
     */
    public sharedEcrCachePrefix: cdk.CfnParameter;

    /**
     * Cognito User Pool ID for creating component App Client
     * Passed by the deployment dashboard's management lambda when deploying use cases
     */
    public cognitoUserPoolId: cdk.CfnParameter;

    /**
     * Use inference profile parameter for cross-region model access
     */
    public useInferenceProfile: cdk.CfnParameter;

    constructor(stack: BaseStack) {
        super(stack);
        this.withAdditionalCfnParameters(stack);
    }

    /**
     * Add AgentCore-specific CloudFormation parameters
     */
    protected withAdditionalCfnParameters(stack: BaseStack) {
        super.withAdditionalCfnParameters(stack);

        this.createMemoryParameters(stack);
        this.createSharedCacheParameter(stack);
        this.createAuthParameters(stack);
        this.createInferenceProfileParameter(stack);
        this.createUseCaseSpecificParameters(stack);
        this.validateParameterRelationships();
        this.updateParameterGroups();
    }

    /**
     * Create memory configuration parameters
     */
    private createMemoryParameters(stack: BaseStack): void {
        this.enableLongTermMemory = new cdk.CfnParameter(stack, 'EnableLongTermMemory', {
            type: 'String',
            description: 'Enable long-term memory for the agent',
            allowedValues: ['Yes', 'No'],
            allowedPattern: '^Yes|No$',
            default: 'Yes'
        });
    }

    /**
     * Create shared ECR cache prefix parameter (internal use only for v4.0.0)
     * This parameter is automatically populated by the deployment platform for dashboard deployments
     */
    private createSharedCacheParameter(stack: BaseStack): void {
        this.sharedEcrCachePrefix = new cdk.CfnParameter(stack, 'SharedEcrCachePrefix', {
            type: 'String',
            description: 'Internal parameter - Shared ECR cache prefix automatically provided by deployment platform',
            default: '',
            allowedPattern: '^.*[^/]$|^$',
            constraintDescription:
                'Internal parameter - automatically populated by deployment platform. Must not end with a trailing slash.'
        });
    }

    /**
     * Create authentication-related parameters for component App Client creation
     */
    private createAuthParameters(stack: BaseStack): void {
        this.cognitoUserPoolId = new cdk.CfnParameter(stack, 'ComponentCognitoUserPoolId', {
            type: 'String',
            description:
                'Cognito User Pool ID for creating component App Client - automatically provided by deployment platform',
            default: '',
            constraintDescription: 'Must be a valid Cognito User Pool ID'
        });
    }

    /**
     * Create inference profile parameter for cross-region model access
     */
    private createInferenceProfileParameter(stack: BaseStack): void {
        this.useInferenceProfile = new cdk.CfnParameter(stack, 'UseInferenceProfile', {
            type: 'String',
            allowedValues: ['Yes', 'No'],
            default: 'No',
            description:
                'If the model configured is Bedrock, you can indicate if you are using Bedrock Inference Profile. This will ensure that the required IAM policies will be configured during stack deployment. For more details, refer to https://docs.aws.amazon.com/bedrock/latest/userguide/cross-region-inference.html'
        });
    }

    /**
     * Abstract method for creating use case-specific parameters
     * Must be implemented by concrete parameter classes
     *
     * @param stack - The CDK stack instance
     */
    protected abstract createUseCaseSpecificParameters(stack: BaseStack): void;

    /**
     * Abstract method to get the custom image parameter for this use case type
     * Used for image URI resolution logic
     *
     * @returns The custom image URI parameter for this use case
     */
    public abstract getCustomImageParameter(): cdk.CfnParameter;

    /**
     * Update CloudFormation parameter groups with consistent structure
     * Provides a standardized parameter organization across all AgentCore stacks
     *
     * Standard parameter group structure:
     * 1. Base Configuration - Core AgentCore settings
     * 2. Authentication Configuration (Internal) - Auth-related parameters
     * 3. Use Case Specific Configuration - Concrete class specific parameters
     * 4. Custom Image Configuration (Advanced) - Image override settings
     * 5. MCP Server Configuration (Advanced) - MCP integration settings
     * 6. Internal Configuration - System-managed parameters
     */
    protected updateParameterGroups(): void {
        this.initializeParameterGroupsMetadata();

        const parameterGroups = this.buildStandardParameterGroups();

        // Update the metadata with the structured parameter groups
        this.cfnStack.templateOptions.metadata!['AWS::CloudFormation::Interface'].ParameterGroups = parameterGroups;

        // Add parameter labels for better UX
        this.addParameterLabels();
    }

    /**
     * Initialize CloudFormation Interface metadata structure
     */
    private initializeParameterGroupsMetadata(): void {
        if (!this.cfnStack.templateOptions.metadata) {
            this.cfnStack.templateOptions.metadata = {};
        }

        if (!this.cfnStack.templateOptions.metadata['AWS::CloudFormation::Interface']) {
            this.cfnStack.templateOptions.metadata['AWS::CloudFormation::Interface'] = {};
        }
    }

    /**
     * Build the standard parameter groups structure
     * Preserves existing parameter groups from parent class and adds AgentCore-specific groups
     */
    private buildStandardParameterGroups(): any[] {
        // Get existing parameter groups from parent class (if any)
        const existingParameterGroups =
            this.cfnStack.templateOptions.metadata!['AWS::CloudFormation::Interface'].ParameterGroups || [];

        // Create new parameter groups array starting with AgentCore groups
        const parameterGroups: any[] = [];

        // 1. Base Configuration (always first)
        parameterGroups.push({
            Label: { default: this.getBaseConfigurationGroupLabel() },
            Parameters: [this.enableLongTermMemory.logicalId]
        });

        // 2. Authentication Configuration (Internal)
        parameterGroups.push({
            Label: { default: 'Authentication Configuration (Internal)' },
            Parameters: [this.cognitoUserPoolId.logicalId]
        });

        // 3. Use Case Specific Configuration (if provided by concrete class)
        const useCaseSpecificGroup = this.getUseCaseSpecificParameterGroup();
        if (useCaseSpecificGroup) {
            parameterGroups.push(useCaseSpecificGroup);
        }

        // 4. Custom Image Configuration (Advanced)
        const customImageParameter = this.getCustomImageParameter();
        if (customImageParameter) {
            parameterGroups.push({
                Label: { default: 'Custom Image Configuration (Advanced)' },
                Parameters: [customImageParameter.logicalId]
            });
        }

        // 6. Internal Configuration (system-managed parameters)
        parameterGroups.push({
            Label: { default: 'Internal Configuration (System Managed)' },
            Parameters: [this.sharedEcrCachePrefix.logicalId]
        });

        // 7. Append any existing parameter groups from parent class (like VPC configuration)
        parameterGroups.push(...existingParameterGroups);

        return parameterGroups;
    }

    /**
     * Get the label for the base configuration group
     * Can be overridden by concrete classes for use case-specific naming
     */
    protected getBaseConfigurationGroupLabel(): string {
        return 'AgentCore Configuration';
    }

    /**
     * Get use case-specific parameter group configuration
     * Should be overridden by concrete classes to provide their specific parameters
     *
     * @returns Parameter group configuration or undefined if no use case-specific parameters
     */
    protected getUseCaseSpecificParameterGroup(): { Label: { default: string }; Parameters: string[] } | undefined {
        return undefined;
    }

    /**
     * Add parameter labels for better CloudFormation console UX
     */
    private addParameterLabels(): void {
        const parameterLabels = {
            [this.enableLongTermMemory.logicalId]: 'Enable Long-Term Memory',
            [this.cognitoUserPoolId.logicalId]: 'Cognito User Pool ID',
            [this.sharedEcrCachePrefix.logicalId]: 'Shared ECR Cache Prefix'
        };

        // Add custom image parameter label if it exists
        const customImageParameter = this.getCustomImageParameter();
        if (customImageParameter) {
            parameterLabels[customImageParameter.logicalId] = 'Custom Image URI';
        }

        // Add use case-specific parameter labels
        const additionalLabels = this.getUseCaseSpecificParameterLabels();
        Object.assign(parameterLabels, additionalLabels);

        this.cfnStack.templateOptions.metadata!['AWS::CloudFormation::Interface'].ParameterLabels = parameterLabels;
    }

    /**
     * Get use case-specific parameter labels
     * Should be overridden by concrete classes to provide labels for their parameters
     *
     * @returns Object mapping parameter logical IDs to display labels
     */
    protected getUseCaseSpecificParameterLabels(): Record<string, string> {
        return {};
    }

    /**
     * Validate parameter relationships and constraints
     * Called during parameter creation to ensure consistency
     */
    protected validateParameterRelationships(): void {
        this.validateMemoryConfiguration();
        this.validateAuthConfiguration();
        this.validateImageConfiguration();
        this.validateMcpConfiguration();
    }

    /**
     * Validate memory configuration parameters
     */
    private validateMemoryConfiguration(): void {
        // Memory parameter validation is handled by allowedValues constraint
        // Additional validation can be added here if needed
    }

    /**
     * Validate authentication configuration parameters
     */
    private validateAuthConfiguration(): void {
        // Cognito User Pool ID validation
        // The parameter allows empty string for standalone deployments
        // When provided, it should be a valid Cognito User Pool ID format
        // Validation is enforced through CloudFormation conditions
    }

    /**
     * Validate image configuration parameters
     */
    private validateImageConfiguration(): void {
        // Custom image URI validation is handled by allowedPattern constraint
        // The pattern allows either empty string or valid ECR URI format
        // Additional cross-parameter validation can be added here
    }

    /**
     * Validate MCP server configuration parameters
     */
    private validateMcpConfiguration(): void {
        // MCP Server IDs validation
        // CommaDelimitedList type ensures proper format
        // Empty list is allowed for deployments without MCP integration
    }

    /**
     * Validate naming conventions for new parameters
     * Ensures consistent parameter naming across all AgentCore stacks
     *
     * @param parameterName - The parameter name to validate
     * @param parameterType - The parameter type
     */
    protected validateParameterNaming(parameterName: string, parameterType: string): void {
        // Validate parameter name follows PascalCase convention
        if (!/^[A-Z][a-zA-Z0-9]*$/.test(parameterName)) {
            throw new Error(
                `Parameter name '${parameterName}' does not follow PascalCase naming convention. ` +
                    'Parameter names should start with uppercase letter and use PascalCase.'
            );
        }

        // Validate parameter type is supported
        const supportedTypes = ['String', 'Number', 'CommaDelimitedList', 'List<String>', 'List<Number>'];
        if (!supportedTypes.includes(parameterType)) {
            throw new Error(
                `Parameter type '${parameterType}' is not supported. ` + `Supported types: ${supportedTypes.join(', ')}`
            );
        }
    }

    /**
     * Get enhanced constraint description for custom image parameters
     * Provides detailed validation information for ECR URI parameters
     *
     * @param useCaseType - The use case type for context-specific messaging
     */
    protected getCustomImageConstraintDescription(useCaseType: string): string {
        return (
            `Must be a valid ECR image URI in the format: ` +
            `123456789012.dkr.ecr.region.amazonaws.com/repository:tag ` +
            `or empty to use default ${useCaseType} image resolution. ` +
            `The ECR repository must be accessible from the deployment region.`
        );
    }
}

/**
 * Abstract base stack for AgentCore use cases (agents and workflows)
 *
 * This abstract class provides common functionality for AgentCore deployments including:
 * - AgentCore component setup (execution role, runtime deployment, invocation lambda, ECR cache)
 * - Authentication components (Cognito app client, OAuth setup, auth policies)
 * - Image URI resolution with deployment mode handling
 * - Conditional inference profile support
 * - Common CloudFormation outputs
 *
 * Concrete implementations must provide use case-specific behavior through abstract methods.
 *
 * IMPORTANT: Amazon Bedrock AgentCore (preview service) does not support VPC deployments.
 * All Amazon Bedrock AgentCore components run in non-VPC mode regardless of the
 * deployment platform's VPC configuration. VPC support will be added in future releases.
 */
export abstract class AgentCoreBaseStack extends UseCaseStack {
    /**
     * AgentCore execution role helper
     */
    protected agentExecutionRole: AgentExecutionRole;

    /**
     * AgentCore memory deployment helper
     */
    protected agentMemoryDeployment: AgentMemoryDeployment;

    /**
     * AgentCore runtime deployment helper
     */
    protected agentRuntimeDeployment: AgentRuntimeDeployment;

    /**
     * Agent invocation Lambda helper
     */
    protected agentInvocationLambda: AgentInvocationLambda;

    /**
     * ECR Pull-Through Cache helper
     */
    protected ecrPullThroughCache: ECRPullThroughCache;

    /**
     * Component Cognito App Client for authentication
     */
    protected componentAppClient: ComponentCognitoAppClient;

    /**
     * OAuth client custom resource for AgentCore authentication
     */
    protected oauthClient: cdk.CustomResource;

    constructor(scope: Construct, id: string, props: BaseStackProps) {
        super(scope, id, props);
        this.withAdditionalResourceSetup(props);
        this.withMetrics(props);
    }

    protected withAdditionalResourceSetup(props: BaseStackProps): void {
        // Set up AgentCore components first, before calling super which calls llmProviderSetup()
        this.setupAgentCoreComponents();
        super.withAdditionalResourceSetup(props);

        // Update AgentCore runtime with multimodal properties after multimodal setup is complete
        this.updateAgentRuntimeWithMultimodalProperties();
    }

    /**
     * Update the AgentCore runtime deployment with multimodal properties
     * This method should be called after the multimodal setup is complete
     */
    private updateAgentRuntimeWithMultimodalProperties(): void {
        // Always call this method, but use CloudFormation conditions to determine the values
        if (this.agentRuntimeDeployment) {
            // Use CloudFormation functions to conditionally set multimodal properties
            // When multimodal is disabled, these will resolve to empty strings
            const multimodalDataMetadataTableName = cdk.Fn.conditionIf(
                this.multimodalEnabledCondition.logicalId,
                cdk.Fn.conditionIf(
                    this.createMultimodalResourcesCondition.logicalId,
                    this.multimodalSetup.multimodalDataMetadataTable.tableName,
                    this.stackParameters.existingMultimodalDataMetadataTable.valueAsString
                ),
                ''
            ).toString();

            const multimodalDataBucketName = cdk.Fn.conditionIf(
                this.multimodalEnabledCondition.logicalId,
                cdk.Fn.conditionIf(
                    this.createMultimodalResourcesCondition.logicalId,
                    this.multimodalSetup.multimodalDataBucket.bucketName,
                    this.stackParameters.existingMultimodalDataBucket.valueAsString
                ),
                ''
            ).toString();

            this.agentRuntimeDeployment.updateMultimodalProperties(
                multimodalDataMetadataTableName,
                multimodalDataBucketName
            );

            // Add multimodal permissions to the agent execution role using CloudFormation conditions
            // This creates the permissions conditionally based on the multimodal parameter
            const agentCoreParams = this.stackParameters as AgentCoreBaseParameters;

            // Create multimodal permissions policy conditionally
            this.addConditionalMultimodalPermissions(
                multimodalDataMetadataTableName,
                multimodalDataBucketName,
                agentCoreParams.useCaseUUID.valueAsString
            );
        }
    }

    /**
     * Add multimodal permissions to the agent execution role using CloudFormation conditions
     * This follows the same pattern as other conditional resources in the deployment platform
     */
    private addConditionalMultimodalPermissions(
        multimodalDataMetadataTableName: string,
        multimodalDataBucketName: string,
        useCaseUUID: string
    ): void {
        // Create a conditional multimodal permissions policy
        const multimodalPermissionsPolicy = new iam.Policy(this, 'AgentCoreMultimodalPermissionsPolicy', {
            statements: [
                new iam.PolicyStatement({
                    sid: 'multimodalMetadataAccess',
                    effect: iam.Effect.ALLOW,
                    actions: ['dynamodb:GetItem'],
                    resources: [
                        `arn:${cdk.Aws.PARTITION}:dynamodb:${cdk.Aws.REGION}:${cdk.Aws.ACCOUNT_ID}:table/${multimodalDataMetadataTableName}`
                    ]
                }),
                new iam.PolicyStatement({
                    sid: 'MultimodalDataBucketAccess',
                    effect: iam.Effect.ALLOW,
                    actions: ['s3:GetObject'],
                    resources: [`arn:${cdk.Aws.PARTITION}:s3:::${multimodalDataBucketName}/${useCaseUUID}/*`]
                })
            ]
        });

        // Apply the multimodal enabled condition to the policy
        (multimodalPermissionsPolicy.node.defaultChild as cdk.CfnResource).cfnOptions.condition =
            this.multimodalEnabledCondition;

        // Attach the policy to the agent execution role
        this.agentExecutionRole.role.attachInlinePolicy(multimodalPermissionsPolicy);
        NagSuppressions.addResourceSuppressions(multimodalPermissionsPolicy, [
            {
                id: 'AwsSolutions-IAM5',
                reason: 'Wildcard permission required to modify AgentCore Auth Table with name from SSM parameter',
                appliesTo: [
                    'Resource::arn:<AWS::Partition>:s3:::{"Fn::If":["MultimodalEnabledCondition",{"Fn::If":["CreateMultimodalResourcesCondition",{"Ref":"MultimodalSetupFactoriesMultimodalDataBucketS3Bucket2540B5CC"},{"Ref":"ExistingMultimodalDataBucket"}]},""]}/<UseCaseUUID>/*'
                ]
            }
        ]);
    }

    /**
     * Abstract method to get the image name for this use case type
     * Used for ECR image URI resolution
     *
     * @returns The image name (e.g., 'gaab-strands-agent', 'gaab-strands-workflow')
     */
    public abstract getImageName(): string;

    /**
     * Abstract method to get the use case type for this stack
     * Used for component configuration and CloudFormation outputs
     *
     * @returns The use case type enum value
     */
    public abstract getUseCaseType(): USE_CASE_TYPES;

    /**
     * Abstract method to get the WebSocket route name for this use case
     * Used for WebSocket API route configuration
     *
     * @returns The WebSocket route name (e.g., 'invokeAgentCore', 'invokeWorkflow')
     */
    public abstract getWebSocketRouteName(): string;

    /**
     * Abstract method to get the LLM provider name for this use case
     * Used for provider identification and configuration
     *
     * @returns The chat provider enum value
     */
    public abstract getLlmProviderName(): CHAT_PROVIDERS;

    /**
     * Abstract method to get the agent runtime name pattern for this use case
     * Used for AgentCore runtime deployment naming
     *
     * @returns The runtime name pattern (e.g., 'gaab_agent_${useCaseShortId}', 'gaab_workflow_${useCaseShortId}')
     */
    public abstract getAgentRuntimeName(): string;

    /**
     * Abstract method to determine if this use case supports inference profiles
     * Used for conditional inference profile resource creation
     *
     * @returns True if inference profiles should be supported, false otherwise
     */
    public abstract shouldIncludeInferenceProfileSupport(): boolean;

    /**
     * Set up WebSocket routes for use case invocation
     * Uses the abstract getWebSocketRouteName() method for route configuration
     */
    protected getWebSocketRoutes(): Map<string, lambda.Function> {
        return new Map().set(this.getWebSocketRouteName(), this.chatLlmProviderLambda);
    }

    /**
     * Set up all AgentCore components using helper classes
     * This method orchestrates the creation of all common AgentCore infrastructure
     */
    private setupAgentCoreComponents(): void {
        const agentCoreParams = this.stackParameters as AgentCoreBaseParameters;

        // Create memory deployment first to get memory ID
        this.agentMemoryDeployment = new AgentMemoryDeployment(this, 'AgentMemoryDeployment', {
            customResourceLambda: this.applicationSetup.customResourceLambda,
            enableLongTermMemory: agentCoreParams.enableLongTermMemory.valueAsString,
            agentRuntimeName: this.getAgentRuntimeName()
        });

        // Create agent execution role with memory ID
        this.agentExecutionRole = new AgentExecutionRole(this, 'AgentExecutionRole', {
            useCaseConfigTableName: agentCoreParams.useCaseConfigTableName.valueAsString,
            memoryId: this.agentMemoryDeployment.getMemoryId()
        });

        // Set up conditional inference profile support if enabled for this use case type
        if (this.shouldIncludeInferenceProfileSupport()) {
            const inferenceProfileProvidedCondition = new cdk.CfnCondition(this, 'InferenceProfileProvidedCondition', {
                expression: cdk.Fn.conditionEquals(agentCoreParams.useInferenceProfile.valueAsString, 'Yes')
            });

            this.agentExecutionRole.addInferenceProfileSupport(
                this.applicationSetup.customResourceLambda,
                this.applicationSetup.customResourceRole,
                agentCoreParams.useCaseConfigTableName.valueAsString,
                agentCoreParams.useCaseConfigRecordKey.valueAsString,
                inferenceProfileProvidedCondition
            );
        }

        const solutionVersion = process.env.VERSION ?? this.node.tryGetContext('solution_version');

        const isStandaloneDeploymentCondition = new cdk.CfnCondition(this, 'IsStandaloneDeploymentCondition', {
            expression: cdk.Fn.conditionEquals(
                agentCoreParams.stackDeploymentSource,
                StackDeploymentSource.STANDALONE_USE_CASE
            )
        });

        // Set up ECR Pull-Through Cache for standalone deployments
        this.ecrPullThroughCache = new ECRPullThroughCache(this, 'ECRPullThroughCache', {
            gaabVersion: solutionVersion,
            customResourceLambda: this.applicationSetup.customResourceLambda,
            useCaseShortId: agentCoreParams.useCaseShortId
        });

        if (this.ecrPullThroughCache && this.ecrPullThroughCache.pullThroughCacheRule) {
            const ecrCacheRule = this.ecrPullThroughCache.pullThroughCacheRule;
            if (ecrCacheRule.cfnOptions) {
                ecrCacheRule.cfnOptions.condition = isStandaloneDeploymentCondition;
            }
        }

        // Resolve image URI using centralized logic
        const imageUri = this.getImageUri();

        // Set up Component App Client for authentication (if User Pool ID is provided)
        this.setupComponentAppClient(agentCoreParams);

        // Set up AgentCore runtime deployment
        this.agentRuntimeDeployment = new AgentRuntimeDeployment(this, 'AgentRuntimeDeployment', {
            customResourceLambda: this.applicationSetup.customResourceLambda,
            agentExecutionRole: this.agentExecutionRole.role,
            agentRuntimeName: this.getAgentRuntimeName(),
            agentImageUri: imageUri,
            useCaseUUID: agentCoreParams.useCaseUUID.valueAsString,
            useCaseConfigTableName: agentCoreParams.useCaseConfigTableName.valueAsString,
            useCaseConfigRecordKey: agentCoreParams.useCaseConfigRecordKey.valueAsString,
            cognitoUserPoolId: agentCoreParams.cognitoUserPoolId.valueAsString,
            additionalProperties: {
                UseCaseType: this.getUseCaseType(),
                MemoryId: this.agentMemoryDeployment.getMemoryId(),
                MemoryStrategyId: this.agentMemoryDeployment.getMemoryStrategyId()
            }
        });

        // Create AgentCore outbound permissions custom resource for MCP server integration
        new cdk.CustomResource(this, 'AgentCoreOutboundPermissions', {
            resourceType: 'Custom::AgentCoreOutboundPermissions',
            serviceToken: this.applicationSetup.customResourceLambda.functionArn,
            properties: {
                Resource: 'AGENTCORE_OUTBOUND_PERMISSIONS',
                USE_CASE_ID: this.stackParameters.useCaseShortId,
                USE_CASE_CLIENT_ID: this.componentAppClient.getClientId(),
                USE_CASE_CONFIG_TABLE_NAME: agentCoreParams.useCaseConfigTableName.valueAsString,
                USE_CASE_CONFIG_RECORD_KEY: agentCoreParams.useCaseConfigRecordKey.valueAsString
            }
        });

        new LambdaToDynamoDB(this, 'AgentCoreOutboundPermissionsLambdaToDynamoDB', {
            existingLambdaObj: this.applicationSetup.customResourceLambda,
            existingTableObj: dynamodb.Table.fromTableName(
                this,
                'UseCaseConfigTable',
                agentCoreParams.useCaseConfigTableName.valueAsString
            ) as dynamodb.Table,
            tablePermissions: 'Read'
        });

        // Set up authentication policies and OAuth client
        this.createCustomResourceAuthPolicy(agentCoreParams);
        this.setupOAuthClient(agentCoreParams);
    }

    /**
     * Get image URI using centralized image resolution logic
     * Uses abstract methods to get use case-specific image name and custom image parameter
     */
    private getImageUri(): string {
        const agentCoreParams = this.stackParameters as AgentCoreBaseParameters;

        try {
            const deploymentMode = determineDeploymentMode();
            const solutionVersion = process.env.VERSION ?? this.node.tryGetContext('solution_version');

            if (!solutionVersion) {
                throw new ECRImageError(
                    'GAAB version is required for image URI resolution. Set VERSION environment variable or solution_version context.',
                    'resolution',
                    { deploymentMode }
                );
            }

            // Sanitize version to avoid double 'v' prefix and add local suffix
            const sanitizedVersion = sanitizeVersionTag(solutionVersion, deploymentMode);

            const context: ImageResolutionContext = {
                deploymentMode,
                gaabVersion: sanitizedVersion,
                customImageUri: agentCoreParams.getCustomImageParameter()?.valueAsString,
                sharedEcrCachePrefix: agentCoreParams.sharedEcrCachePrefix?.valueAsString,
                useCaseShortId: agentCoreParams.useCaseShortId
            };

            // Use centralized resolver with CloudFormation conditions
            return resolveImageUriWithConditions(
                this,
                this.getImageName(),
                context,
                agentCoreParams.getCustomImageParameter(),
                agentCoreParams.sharedEcrCachePrefix,
                this.stackParameters.stackDeploymentSource,
                this.ecrPullThroughCache.getCachedImageUri()
            );
        } catch (error) {
            if (error instanceof ECRImageError) {
                throw new Error(
                    `Image URI resolution failed: ${error.message}\nContext: ${JSON.stringify(error.context)}`
                );
            }
            throw new Error(`Failed to resolve image URI: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    /**
     * Set up Component Cognito App Client for authentication
     */
    private setupComponentAppClient(agentCoreParams: AgentCoreBaseParameters): void {
        const createAppClientCondition = new cdk.CfnCondition(this, 'CreateAppClientCondition', {
            expression: cdk.Fn.conditionNot(cdk.Fn.conditionEquals(agentCoreParams.cognitoUserPoolId.valueAsString, ''))
        });

        const userPool = cognito.UserPool.fromUserPoolId(
            this,
            'UserPool',
            agentCoreParams.cognitoUserPoolId.valueAsString
        );

        this.componentAppClient = new ComponentCognitoAppClient(this, 'ComponentAppClient', {
            userPool: userPool,
            useCaseShortId: agentCoreParams.useCaseShortId,
            componentType: ComponentType.AGENT // This could be made abstract if needed
        });

        // Apply the condition to the underlying CfnUserPoolClient resource
        const cfnAppClient = this.componentAppClient.node.findChild('ComponentAppClient') as cognito.CfnUserPoolClient;
        cfnAppClient.cfnOptions.condition = createAppClientCondition;
    }

    /**
     * Create and attach auth lambda permissions policy for custom resource
     */
    private createCustomResourceAuthPolicy(agentCoreParams: AgentCoreBaseParameters): void {
        const customResourceAuthPolicy = new iam.Policy(this, 'CustomResourceAuthPolicy', {
            statements: [
                new iam.PolicyStatement({
                    effect: iam.Effect.ALLOW,
                    actions: [
                        'bedrock-agentcore:CreateOauth2CredentialProvider',
                        'bedrock-agentcore:DeleteOauth2CredentialProvider',
                        'bedrock-agentcore:CreateTokenVault'
                    ],
                    resources: [
                        `arn:${cdk.Aws.PARTITION}:bedrock-agentcore:${cdk.Aws.REGION}:${cdk.Aws.ACCOUNT_ID}:token-vault/default`,
                        `arn:${cdk.Aws.PARTITION}:bedrock-agentcore:${cdk.Aws.REGION}:${cdk.Aws.ACCOUNT_ID}:token-vault/default/*`
                    ]
                }),
                new iam.PolicyStatement({
                    effect: iam.Effect.ALLOW,
                    actions: ['secretsmanager:CreateSecret', 'secretsmanager:DeleteSecret'],
                    resources: [
                        `arn:${cdk.Aws.PARTITION}:secretsmanager:${cdk.Aws.REGION}:${cdk.Aws.ACCOUNT_ID}:secret:bedrock-agentcore*`
                    ]
                }),
                new iam.PolicyStatement({
                    effect: iam.Effect.ALLOW,
                    actions: ['iam:PassRole'],
                    resources: [`arn:${cdk.Aws.PARTITION}:iam::${cdk.Aws.ACCOUNT_ID}:role/*`],
                    conditions: {
                        'ForAllValues:StringEquals': {
                            'aws:TagKeys': ['createdVia', 'userId']
                        },
                        'StringEquals': {
                            'iam:PassedToService': 'bedrock-agentcore.amazonaws.com'
                        }
                    }
                }),
                new iam.PolicyStatement({
                    effect: iam.Effect.ALLOW,
                    actions: [
                        'bedrock-agentcore:UpdateGateway',
                        'bedrock-agentcore:GetGateway',
                        'bedrock-agentcore:UpdateAgentRuntime',
                        'bedrock-agentcore:GetAgentRuntime',
                        'bedrock-agentcore:ListTagsForResource',
                        'bedrock-agentcore:TagResource',
                        'bedrock-agentcore:UntagResource'
                    ],
                    resources: [
                        `arn:${cdk.Aws.PARTITION}:bedrock-agentcore:${cdk.Aws.REGION}:${cdk.Aws.ACCOUNT_ID}:runtime/*`,
                        `arn:${cdk.Aws.PARTITION}:bedrock-agentcore:${cdk.Aws.REGION}:${cdk.Aws.ACCOUNT_ID}:runtime/*/runtime-endpoint/*`,
                        `arn:${cdk.Aws.PARTITION}:bedrock-agentcore:${cdk.Aws.REGION}:${cdk.Aws.ACCOUNT_ID}:gateway/*`
                    ]
                }),
                new iam.PolicyStatement({
                    effect: iam.Effect.ALLOW,
                    actions: ['iam:CreateServiceLinkedRole'],
                    resources: [
                        `arn:${cdk.Aws.PARTITION}:iam::${cdk.Aws.ACCOUNT_ID}:role/aws-service-role/runtime-identity.bedrock-agentcore.amazonaws.com/AWSServiceRoleForBedrockAgentCoreRuntimeIdentity`
                    ],
                    conditions: {
                        StringEquals: { 'iam:AWSServiceName': 'runtime-identity.bedrock-agentcore.amazonaws.com' }
                    }
                })
            ]
        });

        customResourceAuthPolicy.attachToRole(this.applicationSetup.customResourceRole);

        NagSuppressions.addResourceSuppressions(customResourceAuthPolicy, [
            {
                id: 'AwsSolutions-IAM5',
                reason: 'Wildcard permission required to modify AgentCore Auth Table with name from SSM parameter',
                appliesTo: [
                    'Resource::arn:<AWS::Partition>:dynamodb:<AWS::Region>:<AWS::AccountId>:table/*AgentCorePermissionStore*'
                ]
            },
            {
                id: 'AwsSolutions-IAM5',
                reason: 'Wildcard permission required to modify AgentCore Runtimes and Gateways to add permissions',
                appliesTo: [
                    'Resource::arn:<AWS::Partition>:bedrock-agentcore:<AWS::Region>:<AWS::AccountId>:runtime/*',
                    'Resource::arn:<AWS::Partition>:bedrock-agentcore:<AWS::Region>:<AWS::AccountId>:runtime/*/runtime-endpoint/*',
                    'Resource::arn:<AWS::Partition>:bedrock-agentcore:<AWS::Region>:<AWS::AccountId>:gateway/*'
                ]
            },
            {
                id: 'AwsSolutions-IAM5',
                reason: 'Wildcard permission required to pass in role for AgentCore Runtime/Gateway updates through Custom Resource',
                appliesTo: ['Resource::arn:<AWS::Partition>:iam::<AWS::AccountId>:role/*']
            },
            {
                id: 'AwsSolutions-IAM5',
                reason: 'Wildcard permission required for OAuth2 credential provider operations with dynamic provider names',
                appliesTo: [
                    'Resource::arn:<AWS::Partition>:bedrock-agentcore:<AWS::Region>:<AWS::AccountId>:token-vault/default/*',
                    'Resource::arn:<AWS::Partition>:secretsmanager:<AWS::Region>:<AWS::AccountId>:secret:bedrock-agentcore*'
                ]
            }
        ]);

        const createAppClientCondition = this.node.findChild('CreateAppClientCondition') as cdk.CfnCondition;
        (customResourceAuthPolicy.node.defaultChild as cdk.CfnResource).cfnOptions.condition = createAppClientCondition;
    }

    /**
     * Set up OAuth client for AgentCore authentication
     */
    private setupOAuthClient(agentCoreParams: AgentCoreBaseParameters): void {
        this.oauthClient = new cdk.CustomResource(this, 'AgentCoreOAuthClient', {
            serviceToken: this.applicationSetup.customResourceLambda.functionArn,
            properties: {
                Resource: 'AGENTCORE_OAUTH_CLIENT',
                CLIENT_ID: this.componentAppClient.getClientId(),
                CLIENT_SECRET: this.componentAppClient.getClientSecret(),
                DISCOVERY_URL: `https://cognito-idp.${cdk.Aws.REGION}.amazonaws.com/${agentCoreParams.cognitoUserPoolId.valueAsString}/.well-known/openid-configuration`,
                PROVIDER_NAME: `gaab-oauth-provider-${this.stackParameters.useCaseShortId}`
            }
        });

        const createAppClientCondition = this.node.findChild('CreateAppClientCondition') as cdk.CfnCondition;
        (this.oauthClient.node.defaultChild as cdk.CfnResource).cfnOptions.condition = createAppClientCondition;
    }

    /**
     * Set up Lambda for AgentCore invocation using helper class
     * This method is called by the parent UseCaseStack during llmProviderSetup()
     */
    public llmProviderSetup(): void {
        const agentCoreParams = this.stackParameters as AgentCoreBaseParameters;

        this.agentInvocationLambda = new AgentInvocationLambda(this, 'AgentInvocationLambda', {
            agentRuntimeArn: this.agentRuntimeDeployment.getAgentRuntimeArn(),
            useCaseUUID: agentCoreParams.useCaseUUID.valueAsString
        });

        this.chatLlmProviderLambda = this.agentInvocationLambda.function;

        this.addStackOutputs();
    }

    /**
     * Add CloudFormation outputs for the AgentCore deployment
     * Uses abstract methods to provide use case-specific output names
     * Can be overridden by concrete classes for custom output descriptions
     */
    protected addStackOutputs(): void {
        const useCaseType = this.getUseCaseType();
        const outputPrefix = useCaseType === USE_CASE_TYPES.AGENT_BUILDER ? 'Agent' : 'Workflow';

        new cdk.CfnOutput(this, `${outputPrefix}RuntimeArn`, {
            value: this.agentRuntimeDeployment.getAgentRuntimeArn(),
            description: `ARN of the deployed Agentcore Runtime`
        });

        new cdk.CfnOutput(this, `${outputPrefix}ExecutionRoleArn`, {
            value: this.agentExecutionRole.role.roleArn,
            description: `ARN of the Agentcore execution role`
        });

        new cdk.CfnOutput(this, `${outputPrefix}InvocationLambdaArn`, {
            value: this.agentInvocationLambda.function.functionArn,
            description: `ARN of the ${useCaseType} invocation Lambda function`
        });

        new cdk.CfnOutput(this, `${outputPrefix}MemoryId`, {
            value: this.agentMemoryDeployment.getMemoryId(),
            description: `ID of the deployed ${useCaseType} Memory`
        });

        new cdk.CfnOutput(this, `${outputPrefix}ComponentAppClientId`, {
            value: this.componentAppClient.getClientId(),
            description: `Cognito App Client ID for the component authentication`
        });
    }
}
