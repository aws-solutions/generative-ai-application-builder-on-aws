#!/usr/bin/env node
// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import * as cdk from 'aws-cdk-lib';
import * as acm from 'aws-cdk-lib/aws-certificatemanager';
import * as route53 from 'aws-cdk-lib/aws-route53';
import * as route53Targets from 'aws-cdk-lib/aws-route53-targets';
import * as ssm from 'aws-cdk-lib/aws-ssm';
import * as iam from 'aws-cdk-lib/aws-iam';

import { Construct } from 'constructs';
import { ApplicationSetup } from './framework/application-setup';
import { BaseStack, BaseStackProps, BaseParameters } from './framework/base-stack';
import { DashboardType } from './metrics/custom-dashboard';
import { CopyUIAssets } from './s3web/copy-ui-assets-nested-stack';
import { CopyPortalUIAssets } from './s3web/copy-portal-ui-assets';
import { PortalUIDistribution } from './s3web/portal-ui-distribution-nested-stack';
import { UIDistribution } from './s3web/ui-distribution-nested-stack';
import { DeploymentPlatformStorageSetup } from './storage/deployment-platform-storage-setup';
import { UIInfrastructureBuilder } from './ui/ui-infrastructure-builder';
import { UseCaseManagementSetup } from './use-case-management/setup';
import { generateSourceCodeMapping } from './utils/common-utils';
import { NagSuppressions } from 'cdk-nag';
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
    public readonly portalUiDistribution: PortalUIDistribution;

    /**
     * Construct creating the custom resource to copy assets in a nested stack.
     */
    public readonly copyAssetsStack: CopyUIAssets;
    public readonly portalCopyAssetsStack: CopyUIAssets;

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

        // ============================
        // Customer portal UI (ui-portal)
        // ============================
        const portalDomainName = 'portal.aiagentsworkforce.com';
        const portalUrl = `https://${portalDomainName}/`;

        // Hosted zone for aiagentsworkforce.com (public)
        // NOTE: Using fromHostedZoneAttributes (not fromLookup) so the stack does not require env/account at synth-time.
        const hostedZone = route53.HostedZone.fromHostedZoneAttributes(this, 'AiAgentsWorkforceHostedZone', {
            hostedZoneId: 'Z0780439DVN91CA6KD5T',
            zoneName: 'aiagentsworkforce.com'
        });

        // CloudFront certificates must be in us-east-1. This stack is deployed in us-east-1 for the platform.
        // Use acm.Certificate with DNS validation to avoid a custom-resource lambda and keep cdk-nag happy.
        const portalCertificate = new acm.Certificate(this, 'PortalCertificate', {
            domainName: portalDomainName,
            validation: acm.CertificateValidation.fromDns(hostedZone)
        });

        this.portalUiDistribution = new PortalUIDistribution(this, 'PortalWebApp', {
            parameters: {
                CustomResourceLambdaArn: this.applicationSetup.customResourceLambda.functionArn,
                CustomResourceRoleArn: this.applicationSetup.customResourceLambda.role!.roleArn,
                AccessLoggingBucketArn: this.applicationSetup.accessLoggingBucket.bucketArn,
                UseCaseUUID: uuid
            },
            portalDomainName,
            portalCertificate,
            description: `Nested stack that deploys customer portal UI components (S3 + CloudFront + custom domain) - Version ${props.solutionVersion}`
        });

        // Defensive: explicitly allow the custom resource lambda to write UI assets to both hosting buckets.
        // This avoids nested-stack policy attachment edge-cases during updates.
        const customResourceUiWritePolicy = new iam.Policy(this, 'CustomResourceUIWritePolicy', {
            statements: [
                new iam.PolicyStatement({
                    effect: iam.Effect.ALLOW,
                    actions: [
                        's3:GetObject',
                        's3:PutObject',
                        's3:DeleteObject',
                        's3:AbortMultipartUpload'
                    ],
                    resources: [
                        `${this.uiDistribution.websiteBucket.bucketArn}/*`,
                        `${this.portalUiDistribution.websiteBucket.bucketArn}/*`
                    ]
                }),
                new iam.PolicyStatement({
                    effect: iam.Effect.ALLOW,
                    actions: [
                        's3:ListBucket',
                        's3:GetBucketLocation',
                        's3:ListBucketVersions',
                        's3:ListBucketMultipartUploads'
                    ],
                    resources: [
                        this.uiDistribution.websiteBucket.bucketArn,
                        this.portalUiDistribution.websiteBucket.bucketArn
                    ]
                })
            ]
        });
        customResourceUiWritePolicy.attachToRole(this.applicationSetup.customResourceLambda.role!);
        NagSuppressions.addResourceSuppressions(customResourceUiWritePolicy, [
            {
                id: 'AwsSolutions-IAM5',
                reason:
                    'Custom resource must upload UI assets (including runtimeConfig.json) and manage deletes/versions in the UI hosting buckets.'
            }
        ]);

        // Ensure portal UI stack follows the same DeployUI condition
        (this.portalUiDistribution.node.defaultChild as cdk.CfnResource).cfnOptions.condition =
            uiInfrastructureBuilder.deployWebAppCondition;

        // Route53 records for portal.aiagentsworkforce.com -> CloudFront
        const portalAliasARecord = new route53.ARecord(this, 'PortalAliasARecord', {
            zone: hostedZone,
            recordName: 'portal',
            target: route53.RecordTarget.fromAlias(
                new route53Targets.CloudFrontTarget(this.portalUiDistribution.cloudFrontDistribution)
            )
        });
        (portalAliasARecord.node.defaultChild as cdk.CfnResource).cfnOptions.condition =
            uiInfrastructureBuilder.deployWebAppCondition;

        const portalAliasAAAARecord = new route53.AaaaRecord(this, 'PortalAliasAAAARecord', {
            zone: hostedZone,
            recordName: 'portal',
            target: route53.RecordTarget.fromAlias(
                new route53Targets.CloudFrontTarget(this.portalUiDistribution.cloudFrontDistribution)
            )
        });
        (portalAliasAAAARecord.node.defaultChild as cdk.CfnResource).cfnOptions.condition =
            uiInfrastructureBuilder.deployWebAppCondition;

        const webConfigSsmKey: string = `${WEB_CONFIG_PREFIX}/${cdk.Aws.STACK_NAME}`;
        const portalWebConfigSsmKey: string = `${WEB_CONFIG_PREFIX}/${cdk.Aws.STACK_NAME}-portal`;

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
            portalUrl: portalUrl,
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

        this.deploymentPlatformStorageSetup.configureConnectVoiceAdapterLambda(
            this.useCaseManagementSetup.useCaseManagement.connectVoiceAdapterLambda
        );
        this.deploymentPlatformStorageSetup.configureConnectVoiceTurnLambda(
            this.useCaseManagementSetup.useCaseManagement.connectVoiceTurnLambda
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

        const portalWebConfigCustomResource = this.applicationSetup.createWebConfigStorageWithId(
            'PortalWebConfig',
            {
                restApiEndpoint: this.useCaseManagementSetup.restApi.url,
                userPoolId: userPoolId,
                userPoolClientId: userPoolClientId,
                cognitoRedirectUrl: portalUrl,
                isInternalUserCondition: isInternalUserCondition,
                deployWebAppCondition: uiInfrastructureBuilder.deployWebAppCondition
            },
            portalWebConfigSsmKey
        );
        portalWebConfigCustomResource.node.addDependency(this.useCaseManagementSetup.useCaseManagement);

        this.copyAssetsStack = uiInfrastructureBuilder.createUIAssetsCustomResource(this, 'CopyUICustomResource', {
            parameters: {
                CustomResourceRoleArn: this.applicationSetup.customResourceLambda.role!.roleArn,
                CustomResourceLambdaArn: this.applicationSetup.customResourceLambda.functionArn,
                WebCloudFrontDistributionId: this.uiDistribution.cloudFrontDistribution.distributionId,
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

        // Copy customer portal UI assets and write runtimeConfig.json using portal web config key
        this.portalCopyAssetsStack = new CopyPortalUIAssets(this, 'CopyPortalUICustomResource', {
            parameters: {
                CustomResourceRoleArn: this.applicationSetup.customResourceLambda.role!.roleArn,
                CustomResourceLambdaArn: this.applicationSetup.customResourceLambda.functionArn,
                WebCloudFrontDistributionId: this.portalUiDistribution.cloudFrontDistribution.distributionId,
                WebConfigKey: portalWebConfigSsmKey,
                WebS3BucketArn: this.portalUiDistribution.websiteBucket.bucketArn,
                AccessLoggingBucketArn: this.applicationSetup.accessLoggingBucket.bucketArn
            },
            description: `Custom resource that copies customer portal UI assets to S3 bucket - Version ${props.solutionVersion}`
        });
        (this.portalCopyAssetsStack.node.defaultChild as cdk.CfnResource).cfnOptions.condition =
            uiInfrastructureBuilder.deployWebAppCondition;

        this.portalUiDistribution.node.defaultChild?.node.addDependency(
            this.applicationSetup.accessLoggingBucket.node
                .tryFindChild('Policy')
                ?.node.tryFindChild('Resource') as cdk.CfnResource
        );

        this.portalCopyAssetsStack.node.defaultChild?.node.addDependency(portalWebConfigCustomResource);
        this.portalCopyAssetsStack.node.defaultChild?.node.addDependency(
            this.applicationSetup.accessLoggingBucket.node
                .tryFindChild('Policy')
                ?.node.tryFindChild('Resource') as cdk.CfnResource
        );

        if (process.env.DIST_OUTPUT_BUCKET) {
            generateSourceCodeMapping(this, props.solutionName, props.solutionVersion);
            generateSourceCodeMapping(this.uiDistribution, props.solutionName, props.solutionVersion);
            generateSourceCodeMapping(this.copyAssetsStack, props.solutionName, props.solutionVersion);
            generateSourceCodeMapping(this.portalUiDistribution, props.solutionName, props.solutionVersion);
            generateSourceCodeMapping(this.portalCopyAssetsStack, props.solutionName, props.solutionVersion);
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

        const deploymentUiDistributionIdOutput = new cdk.CfnOutput(
            cdk.Stack.of(this),
            'DeploymentUIDistributionId',
            {
                value: this.uiDistribution.cloudFrontDistribution.distributionId,
                description: 'CloudFront distribution ID for the admin deployment UI'
            }
        );
        deploymentUiDistributionIdOutput.condition = uiInfrastructureBuilder.deployWebAppCondition;

        const deploymentUiBucketNameOutput = new cdk.CfnOutput(cdk.Stack.of(this), 'DeploymentUIBucketName', {
            value: this.uiDistribution.websiteBucket.bucketName,
            description: 'S3 bucket name hosting the admin deployment UI assets'
        });
        deploymentUiBucketNameOutput.condition = uiInfrastructureBuilder.deployWebAppCondition;

        const portalUrlOutput = new cdk.CfnOutput(cdk.Stack.of(this), 'PortalCloudFrontWebUrl', {
            value: portalUrl,
            description: 'Customer portal URL'
        });
        portalUrlOutput.condition = uiInfrastructureBuilder.deployWebAppCondition;

        const portalUiDistributionIdOutput = new cdk.CfnOutput(cdk.Stack.of(this), 'PortalUIDistributionId', {
            value: this.portalUiDistribution.cloudFrontDistribution.distributionId,
            description: 'CloudFront distribution ID for the customer portal UI'
        });
        portalUiDistributionIdOutput.condition = uiInfrastructureBuilder.deployWebAppCondition;

        const portalUiBucketNameOutput = new cdk.CfnOutput(cdk.Stack.of(this), 'PortalUIBucketName', {
            value: this.portalUiDistribution.websiteBucket.bucketName,
            description: 'S3 bucket name hosting the customer portal UI assets'
        });
        portalUiBucketNameOutput.condition = uiInfrastructureBuilder.deployWebAppCondition;

        // ============================
        // GitHub Actions OIDC role (UI deploy)
        // ============================
        // This role is assumed by GitHub Actions via OIDC (no long-lived AWS keys).
        // Restrict to this repo + branch.
        const githubOidcProvider = iam.OpenIdConnectProvider.fromOpenIdConnectProviderArn(
            this,
            'GitHubOidcProvider',
            `arn:${cdk.Aws.PARTITION}:iam::${cdk.Aws.ACCOUNT_ID}:oidc-provider/token.actions.githubusercontent.com`
        );

        const uiDeployRole = new iam.Role(this, 'GitHubActionsUiDeployRole', {
            roleName: 'AiAgentsWorkforce-GHA-UiDeploy',
            assumedBy: new iam.WebIdentityPrincipal(githubOidcProvider.openIdConnectProviderArn, {
                StringEquals: {
                    'token.actions.githubusercontent.com:aud': 'sts.amazonaws.com'
                },
                StringLike: {
                    'token.actions.githubusercontent.com:sub': [
                        'repo:simcoder/generative-ai-application-builder:ref:refs/heads/main',
                        'repo:simcoder/generative-ai-application-builder:ref:refs/heads/master'
                    ]
                }
            }),
            description: 'GitHub Actions role to deploy ui-portal and ui-deployment assets to S3 + invalidate CloudFront.'
        });

        const uiDeployPolicy = new iam.Policy(this, 'GitHubActionsUiDeployPolicy', {
            statements: [
                new iam.PolicyStatement({
                    effect: iam.Effect.ALLOW,
                    actions: ['cloudformation:DescribeStacks'],
                    resources: ['*']
                }),
                new iam.PolicyStatement({
                    effect: iam.Effect.ALLOW,
                    actions: ['ssm:GetParameter'],
                    resources: [
                        `arn:${cdk.Aws.PARTITION}:ssm:${cdk.Aws.REGION}:${cdk.Aws.ACCOUNT_ID}:parameter/gaab-webconfig/*`
                    ]
                }),
                new iam.PolicyStatement({
                    effect: iam.Effect.ALLOW,
                    actions: [
                        's3:ListBucket',
                        's3:GetBucketLocation',
                        's3:PutObject',
                        's3:PutObjectAcl',
                        's3:DeleteObject',
                        's3:GetObject',
                        's3:AbortMultipartUpload',
                        's3:ListBucketMultipartUploads'
                    ],
                    resources: [
                        this.uiDistribution.websiteBucket.bucketArn,
                        `${this.uiDistribution.websiteBucket.bucketArn}/*`,
                        this.portalUiDistribution.websiteBucket.bucketArn,
                        `${this.portalUiDistribution.websiteBucket.bucketArn}/*`
                    ]
                }),
                new iam.PolicyStatement({
                    effect: iam.Effect.ALLOW,
                    actions: ['cloudfront:CreateInvalidation'],
                    resources: [
                        `arn:${cdk.Aws.PARTITION}:cloudfront::${cdk.Aws.ACCOUNT_ID}:distribution/${this.uiDistribution.cloudFrontDistribution.distributionId}`,
                        `arn:${cdk.Aws.PARTITION}:cloudfront::${cdk.Aws.ACCOUNT_ID}:distribution/${this.portalUiDistribution.cloudFrontDistribution.distributionId}`
                    ]
                })
            ]
        });
        uiDeployPolicy.attachToRole(uiDeployRole);

        NagSuppressions.addResourceSuppressions(uiDeployPolicy, [
            {
                id: 'AwsSolutions-IAM5',
                reason:
                    'UI deploy pipeline needs to read webconfig from SSM prefix, read DeploymentPlatformStack outputs, upload site assets to known buckets, and invalidate known CloudFront distributions.'
            }
        ]);

        new cdk.CfnOutput(cdk.Stack.of(this), 'GitHubActionsUiDeployRoleArn', {
            value: uiDeployRole.roleArn,
            description: 'Role ARN to assume from GitHub Actions using OIDC for UI deployments'
        });

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

        new cdk.CfnOutput(cdk.Stack.of(this), 'ConnectVoiceTurnLambdaArn', {
            value: this.useCaseManagementSetup.useCaseManagement.connectVoiceTurnLambda.functionArn,
            description: 'Lex V2 code hook lambda ARN for voice conversations (Connect -> Lex -> AgentCore)'
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
