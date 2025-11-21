#!/usr/bin/env node
// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import * as cdk from 'aws-cdk-lib';
import * as ssm from 'aws-cdk-lib/aws-ssm';

import { Construct } from 'constructs';
import { ApplicationSetup } from './framework/application-setup';
import { BaseStack, BaseStackProps, BaseParameters } from './framework/base-stack';
import { DashboardType } from './metrics/custom-dashboard';
import { CopyUIAssets } from './s3web/copy-ui-assets-nested-stack';
import { UIDistribution } from './s3web/ui-distribution-nested-stack';
import { DeploymentPlatformStorageSetup } from './storage/deployment-platform-storage-setup';
import { UIInfrastructureBuilder } from './ui/ui-infrastructure-builder';
import { UseCaseManagementSetup } from './use-case-management/setup';
import { generateSourceCodeMapping } from './utils/common-utils';
import {
    INTERNAL_EMAIL_DOMAIN,
    OPTIONAL_EMAIL_REGEX_PATTERN,
    REST_API_NAME_ENV_VAR,
    SHARED_ECR_CACHE_PREFIX_ENV_VAR,
    UIAssetFolders,
    USE_CASE_UUID_ENV_VAR,
    WEB_CONFIG_PREFIX
} from './utils/constants';
import { VPCSetup } from './vpc/vpc-setup';
import { ECRPullThroughCache } from './use-case-stacks/agent-core/components/ecr-pull-through-cache';

export class DeploymentPlatformParameters extends BaseParameters {
    constructor(stack: cdk.Stack) {
        super(stack);
    }

    protected setupUseCaseConfigTableParams(stack: cdk.Stack): void {
        //override
    }

    protected setupUUIDParams(stack: cdk.Stack): void {
        // override
    }
}

/**
 * The main stack creating the infrastructure
 */
export class DeploymentPlatformStack extends BaseStack {
    /**
     * Construct creating the cloudfront distribution assets in a nested stack.
     */
    public readonly uiDistribution: UIDistribution;

    /**
     * Construct creating the custom resource to copy assets in a nested stack.
     */
    public readonly copyAssetsStack: CopyUIAssets;

    /**
     * Construct managing the deployment of a nested stack with resources related to use case management.
     * Includes cognito, APIs for deployment/management of use cases, and backing lambdas.
     */
    public readonly useCaseManagementSetup: UseCaseManagementSetup;

    /**
     * Construct managing the deployment of a nested stack with resources for storing use case data.
     */
    public readonly deploymentPlatformStorageSetup: DeploymentPlatformStorageSetup;

    /**
     * Shared ECR Pull-Through Cache for AgentCore images used by dashboard-deployed use cases
     */
    public readonly sharedEcrPullThroughCache: ECRPullThroughCache;

    constructor(scope: Construct, id: string, props: BaseStackProps) {
        super(scope, id, props);

        new cdk.CfnMapping(this, 'Solution', {
            mapping: {
                Data: {
                    ID: props.solutionID,
                    Version: props.solutionVersion,
                    SolutionName: props.solutionName
                }
            }
        });

        new cdk.CfnMapping(this, 'FeaturesToDeploy', {
            mapping: {
                Deploy: {
                    CustomDashboard: 'Yes'
                }
            }
        });

        const adminUserEmail = new cdk.CfnParameter(this, 'AdminUserEmail', {
            type: 'String',
            description:
                'Optional - Email used to create the default cognito user for the admin platform. If empty, the Cognito User, Group and Attachment will not be created.',
            allowedPattern: OPTIONAL_EMAIL_REGEX_PATTERN,
            constraintDescription: 'Please provide a valid email'
        });

        new cdk.CfnRule(this, 'CognitoUserPoolAndClientRule', {
            ruleCondition: cdk.Fn.conditionNot(
                cdk.Fn.conditionEquals(this.stackParameters.existingCognitoUserPoolId.valueAsString, '')
            ),
            assertions: [
                {
                    assert: cdk.Fn.conditionNot(
                        cdk.Fn.conditionEquals(this.stackParameters.existingUserPoolClientId.valueAsString, '')
                    ),
                    assertDescription:
                        'If an existing User Pool Id is provided, then an existing User Pool Client Id must also be provided.'
                }
            ]
        });

        new cdk.CfnRule(this, 'CognitoDomainNotProvidedIfPoolIsRule', {
            ruleCondition: cdk.Fn.conditionNot(
                cdk.Fn.conditionEquals(this.stackParameters.existingCognitoUserPoolId.valueAsString, '')
            ),
            assertions: [
                {
                    assert: cdk.Fn.conditionEquals(this.stackParameters.cognitoUserPoolClientDomain.valueAsString, ''),
                    assertDescription:
                        'If an existing User Pool Id is provided, then a domain name for the User Pool Client must not be provided.'
                }
            ]
        });

        const stack = cdk.Stack.of(this);
        const existingParameterGroups =
            stack.templateOptions.metadata !== undefined &&
            Object.hasOwn(stack.templateOptions.metadata, 'AWS::CloudFormation::Interface') &&
            stack.templateOptions.metadata['AWS::CloudFormation::Interface'].ParameterGroups !== undefined
                ? stack.templateOptions.metadata['AWS::CloudFormation::Interface'].ParameterGroups
                : [];

        existingParameterGroups.unshift({
            Label: { default: 'Please provide admin user email' },
            Parameters: [adminUserEmail.logicalId]
        });

        /**
         * this CfnParameter is defined in the base stack. The deployment stack only adds it to a parameter group
         */
        existingParameterGroups.push({
            Label: {
                default:
                    'Optional: If you would like to provide a sub domain for the UserPoolClient configuration. If not provided, a hashed value using the AWS Account number, current region, and stack name, will be used as sub-domain name'
            },
            Parameters: [this.stackParameters.cognitoUserPoolClientDomain.logicalId]
        });

        /**
         * parameter group for bringing your own cognito user pool and client
         */
        existingParameterGroups.push({
            Label: {
                default:
                    'Optional: Provide existing Cognito UserPool and UserPoolClient IDs if you want to use your own managed resources. If left empty, the solution will manage these resources for you. Note: To prevent the creation of Cognito resources within the user pool (Users/Groups), simply leave the AdminUserEmail parameter empty.'
            },
            Parameters: [
                this.stackParameters.existingCognitoUserPoolId.logicalId,
                this.stackParameters.existingUserPoolClientId.logicalId
            ]
        });

        // internal users are identified by being of the form "X@amazon.Y"
        const isInternalUserCondition: cdk.CfnCondition = new cdk.CfnCondition(this, 'IsInternalUserCondition', {
            expression: cdk.Fn.conditionEquals(
                cdk.Fn.select(
                    0,
                    cdk.Fn.split(
                        '.',
                        cdk.Fn.select(
                            1,
                            cdk.Fn.split('@', cdk.Fn.join('', [adminUserEmail.valueAsString, '@example.com']))
                        )
                    )
                ),
                INTERNAL_EMAIL_DOMAIN
            )
        });

        const uuid: string = this.applicationSetup.addUUIDGeneratorCustomResource().getAttString('UUID');
        this.applicationSetup.scheduledMetricsLambda.addEnvironment(USE_CASE_UUID_ENV_VAR, uuid);

        const uiInfrastructureBuilder = new UIInfrastructureBuilder({
            uiAssetFolder: UIAssetFolders.DEPLOYMENT_PLATFORM,
            deployWebApp: this.deployWebApp.valueAsString
        });

        this.uiDistribution = uiInfrastructureBuilder.createDistribution(this, 'WebApp', {
            parameters: {
                CustomResourceLambdaArn: this.applicationSetup.customResourceLambda.functionArn,
                CustomResourceRoleArn: this.applicationSetup.customResourceLambda.role!.roleArn,
                AccessLoggingBucketArn: this.applicationSetup.accessLoggingBucket.bucketArn,
                UseCaseUUID: uuid
            },
            description: `Nested stack that deploys UI components that include an S3 bucket for web assets and a CloudFront distribution - Version ${props.solutionVersion}`
        });

        const webConfigSsmKey: string = `${WEB_CONFIG_PREFIX}/${cdk.Aws.STACK_NAME}`;

        this.deploymentPlatformStorageSetup = new DeploymentPlatformStorageSetup(this, 'DeploymentPlatformStorage', {
            customResourceLambda: this.applicationSetup.customResourceLambda,
            customResourceRole: this.applicationSetup.customResourceRole,
            accessLoggingBucket: this.applicationSetup.accessLoggingBucket,
            ...this.baseStackProps
        });

        // Create shared ECR Pull-Through Cache for AgentCore images
        // This cache will be used by all agent builder and workflow use cases deployed through the dashboard
        const solutionVersion = process.env.VERSION ?? this.node.tryGetContext('solution_version');
        this.sharedEcrPullThroughCache = new ECRPullThroughCache(this, 'SharedECRPullThroughCache', {
            gaabVersion: solutionVersion,
            customResourceLambda: this.applicationSetup.customResourceLambda
            // No useCaseShortId provided - will generate from stack name (shared cache)
        });

        this.useCaseManagementSetup = new UseCaseManagementSetup(this, 'UseCaseManagementSetup', {
            defaultUserEmail: adminUserEmail.valueAsString,
            webConfigSSMKey: webConfigSsmKey,
            customInfra: this.applicationSetup.customResourceLambda,
            securityGroupIds: this.transpiredSecurityGroupIds,
            privateSubnetIds: this.transpiredPrivateSubnetIds,
            cognitoDomainPrefix: this.stackParameters.cognitoUserPoolClientDomain.valueAsString,
            cloudFrontUrl: uiInfrastructureBuilder.getCloudFrontUrlWithCondition(),
            deployWebApp: this.deployWebApp.valueAsString,
            deployWebAppCondition: uiInfrastructureBuilder.deployWebAppCondition,
            accessLoggingBucket: this.applicationSetup.accessLoggingBucket,
            existingCognitoUserPoolId: this.stackParameters.existingCognitoUserPoolId.valueAsString,
            existingCognitoUserPoolClientId: this.stackParameters.existingUserPoolClientId.valueAsString,
            llmConfigTable: this.deploymentPlatformStorageSetup.deploymentPlatformStorage.useCaseConfigTable,
            ...this.baseStackProps
        });

        this.deploymentPlatformStorageSetup.configureDeploymentApiLambda(
            this.useCaseManagementSetup.useCaseManagement.useCaseManagementApiLambda
        );
        this.deploymentPlatformStorageSetup.configureModelInfoApiLambda(
            this.useCaseManagementSetup.useCaseManagement.modelInfoApiLambda
        );
        this.deploymentPlatformStorageSetup.configureFeedbackApiLambda(
            this.useCaseManagementSetup.feedbackSetupStack.feedbackAPILambda
        );
        this.deploymentPlatformStorageSetup.configureUseCaseManagementApiLambda(
            this.useCaseManagementSetup.useCaseManagement.mcpManagementApiLambda,
            'MCP'
        );
        this.deploymentPlatformStorageSetup.configureUseCaseManagementApiLambda(
            this.useCaseManagementSetup.useCaseManagement.agentManagementApiLambda,
            'Agent',
            true
        );
        this.deploymentPlatformStorageSetup.configureUseCaseManagementApiLambda(
            this.useCaseManagementSetup.useCaseManagement.workflowManagementApiLambda,
            'Workflow',
            true
        );
        this.deploymentPlatformStorageSetup.configureFilesHandlerLambda(
            this.useCaseManagementSetup.multimodalSetup.filesHandlerLambda
        );

        // Create SSM parameter for Strands tools configuration
        const strandsToolsParameter = new ssm.StringParameter(this, 'StrandsToolsParameter', {
            parameterName: `/gaab/${cdk.Aws.STACK_NAME}/strands-tools`,
            stringValue: JSON.stringify([
                {
                    name: 'Calculator',
                    description: 'Perform mathematical calculations and operations',
                    value: 'calculator',
                    category: 'Math',
                    isDefault: true
                },
                {
                    name: 'Current Time',
                    description: 'Get current date and time information',
                    value: 'current_time',
                    category: 'Utilities',
                    isDefault: true
                },
                {
                    name: 'Environment',
                    description: 'Access environment variables and system information',
                    value: 'environment',
                    category: 'System',
                    isDefault: false
                }
            ]),
            description: 'Available Strands SDK tools for Agent Builder and Workflow use cases',
            simpleName: false
        });

        // Grant MCP Management Lambda permission to read Strands tools parameter and set environment variable
        strandsToolsParameter.grantRead(this.useCaseManagementSetup.useCaseManagement.mcpManagementApiLambda.role!);
        this.useCaseManagementSetup.useCaseManagement.mcpManagementApiLambda.addEnvironment(
            'STRANDS_TOOLS_SSM_PARAM',
            strandsToolsParameter.parameterName
        );

        this.applicationSetup.scheduledMetricsLambda.addEnvironment(
            REST_API_NAME_ENV_VAR,
            `${this.useCaseManagementSetup.useCaseManagement.stackName}-UseCaseManagementAPI`
        );

        // Add shared ECR cache prefix to agent management lambda
        this.useCaseManagementSetup.useCaseManagement.agentManagementApiLambda.addEnvironment(
            SHARED_ECR_CACHE_PREFIX_ENV_VAR,
            this.sharedEcrPullThroughCache.getRepositoryPrefix()
        );

        // Add shared ECR cache prefix to workflow management lambda
        this.useCaseManagementSetup.useCaseManagement.workflowManagementApiLambda.addEnvironment(
            SHARED_ECR_CACHE_PREFIX_ENV_VAR,
            this.sharedEcrPullThroughCache.getRepositoryPrefix()
        );

        const userPoolId = this.useCaseManagementSetup.userPool.userPoolId;
        const userPoolClientId = this.useCaseManagementSetup.userPoolClient.userPoolClientId;

        this.applicationSetup.addCustomDashboard(
            {
                apiName: `${this.useCaseManagementSetup.useCaseManagement.stackName}-UseCaseManagementAPI`,
                userPoolId: userPoolId,
                userPoolClientId: userPoolClientId
            },
            DashboardType.DeploymentPlatform
        );

        this.applicationSetup.createWebConfigStorage(
            {
                restApiEndpoint: this.useCaseManagementSetup.restApi.url,
                userPoolId: userPoolId,
                userPoolClientId: userPoolClientId,
                cognitoRedirectUrl: uiInfrastructureBuilder.getCloudFrontUrlWithCondition(),
                isInternalUserCondition: isInternalUserCondition,
                deployWebAppCondition: uiInfrastructureBuilder.deployWebAppCondition
            },
            webConfigSsmKey
        );
        this.applicationSetup.webConfigCustomResource.node.addDependency(this.useCaseManagementSetup.useCaseManagement);

        this.copyAssetsStack = uiInfrastructureBuilder.createUIAssetsCustomResource(this, 'CopyUICustomResource', {
            parameters: {
                CustomResourceRoleArn: this.applicationSetup.customResourceLambda.role!.roleArn,
                CustomResourceLambdaArn: this.applicationSetup.customResourceLambda.functionArn,
                WebConfigKey: webConfigSsmKey,
                WebS3BucketArn: this.uiDistribution.websiteBucket.bucketArn,
                AccessLoggingBucketArn: this.applicationSetup.accessLoggingBucket.bucketArn
            },
            description: `Custom resource that copies UI assets to S3 bucket - Version ${props.solutionVersion}`
        });

        this.uiDistribution.node.defaultChild?.node.addDependency(
            this.applicationSetup.accessLoggingBucket.node
                .tryFindChild('Policy')
                ?.node.tryFindChild('Resource') as cdk.CfnResource
        );

        this.copyAssetsStack.node.defaultChild?.node.addDependency(this.applicationSetup.webConfigCustomResource);
        this.copyAssetsStack.node.defaultChild?.node.addDependency(
            this.applicationSetup.accessLoggingBucket.node
                .tryFindChild('Policy')
                ?.node.tryFindChild('Resource') as cdk.CfnResource
        );

        if (process.env.DIST_OUTPUT_BUCKET) {
            generateSourceCodeMapping(this, props.solutionName, props.solutionVersion);
            generateSourceCodeMapping(this.uiDistribution, props.solutionName, props.solutionVersion);
            generateSourceCodeMapping(this.copyAssetsStack, props.solutionName, props.solutionVersion);
            generateSourceCodeMapping(
                this.deploymentPlatformStorageSetup.deploymentPlatformStorage,
                props.solutionName,
                props.solutionVersion
            );
        }

        const cloudfrontUrlOutput = new cdk.CfnOutput(cdk.Stack.of(this), 'CloudFrontWebUrl', {
            value: `https://${this.uiDistribution.cloudFrontDistribution.domainName}`
        });
        cloudfrontUrlOutput.condition = uiInfrastructureBuilder.deployWebAppCondition;

        new cdk.CfnOutput(cdk.Stack.of(this), 'SharedECRCachePrefix', {
            value: this.sharedEcrPullThroughCache.getRepositoryPrefix(),
            description: 'Shared ECR Pull-Through Cache repository prefix for AgentCore images'
        });

        new cdk.CfnOutput(cdk.Stack.of(this), 'CognitoClientId', {
            value: userPoolClientId
        });

        new cdk.CfnOutput(cdk.Stack.of(this), 'CognitoUserPoolId', {
            value: userPoolId
        });

        new cdk.CfnOutput(cdk.Stack.of(this), 'RestEndpointUrl', {
            value: this.useCaseManagementSetup.restApi.url
        });

        new cdk.CfnOutput(cdk.Stack.of(this), 'LLMConfigTableName', {
            value: this.deploymentPlatformStorageSetup.deploymentPlatformStorage.useCaseConfigTable.tableName
        });

        new cdk.CfnOutput(cdk.Stack.of(this), 'UseCasesTableName', {
            value: this.deploymentPlatformStorageSetup.deploymentPlatformStorage.useCasesTable.tableName
        });

        new cdk.CfnOutput(cdk.Stack.of(this), 'MultimodalDataBucketName', {
            value: this.useCaseManagementSetup.multimodalSetup.multimodalDataBucket.bucketName,
            description: 'S3 bucket for storing multimodal files'
        });

        new cdk.CfnOutput(cdk.Stack.of(this), 'MultimodalDataMetadataTable', {
            value: this.useCaseManagementSetup.multimodalSetup.multimodalDataMetadataTable.tableName,
            description: 'DynamoDB table for storing multimodal files metadata'
        });

        this.applicationSetup.addMetricsCustomLambda(props.solutionID, props.solutionVersion, {
            UUID: uuid,
            VPC_ENABLED: this.vpcEnabled.valueAsString,
            CREATE_VPC: this.createNewVpc.valueAsString
        });
    }
    protected initializeCfnParameters(): void {
        this.stackParameters = new DeploymentPlatformParameters(this);
    }
    protected setupVPC(): VPCSetup {
        return new VPCSetup(this, 'VPC', {
            stackType: 'deployment-platform',
            deployVpcCondition: this.deployVpcCondition,
            customResourceLambdaArn: this.applicationSetup.customResourceLambda.functionArn,
            customResourceRoleArn: this.applicationSetup.customResourceLambda.role!.roleArn,
            iPamPoolId: this.iPamPoolId.valueAsString,
            accessLogBucket: this.applicationSetup.accessLoggingBucket,
            ...this.baseStackProps
        });
    }

    protected createApplicationSetup(props: BaseStackProps): ApplicationSetup {
        return new ApplicationSetup(this, 'DeploymentPlatformSetup', {
            solutionID: props.solutionID,
            solutionVersion: props.solutionVersion
        });
    }
}
