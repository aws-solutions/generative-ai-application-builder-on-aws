#!/usr/bin/env node
// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import * as cdk from 'aws-cdk-lib';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as sqs from 'aws-cdk-lib/aws-sqs';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import { ConstructsFactories } from '@aws-solutions-constructs/aws-constructs-factories';
import { NagSuppressions } from 'cdk-nag';
import { Construct, IConstruct } from 'constructs';
import { BaseNestedStack } from '../framework/base-nested-stack';
import { ApplicationAssetBundler } from '../framework/bundler/asset-options-factory';
import * as cfn_nag from '../utils/cfn-guard-suppressions';
import {
    createCustomResourceForLambdaLogRetention,
    createDefaultLambdaRole,
    generateTemplateMapping,
    createVpcConfigForLambda
} from '../utils/common-utils';
import {
    ARTIFACT_BUCKET_ENV_VAR,
    ARTIFACT_KEY_PREFIX_ENV_VAR,
    CFN_DEPLOY_ROLE_ARN_ENV_VAR,
    COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME,
    COMMERCIAL_REGION_LAMBDA_PYTHON_RUNTIME,
    INTERNAL_EMAIL_DOMAIN,
    IS_INTERNAL_USER_ENV_VAR,
    LAMBDA_TIMEOUT_MINS,
    OPTIONAL_EMAIL_REGEX_PATTERN,
    POWERTOOLS_METRICS_NAMESPACE_ENV_VAR,
    TEMPLATE_FILE_EXTN_ENV_VAR,
    USE_CASE_MANAGEMENT_NAMESPACE,
    WEBCONFIG_SSM_KEY_ENV_VAR,
    COGNITO_POLICY_TABLE_ENV_VAR,
    CLIENT_ID_ENV_VAR,
    USER_POOL_ID_ENV_VAR,
    GAAB_DEPLOYMENTS_BUCKET_NAME_ENV_VAR,
    DEPLOYMENT_PLATFORM_STACK_NAME_ENV_VAR,
    MULTIMODAL_FILES_BUCKET_NAME_ENV_VAR,
    MULTIMODAL_FILES_METADATA_TABLE_NAME_ENV_VAR,
    TENANTS_TABLE_NAME_ENV_VAR,
    CUSTOMER_ADMIN_GROUP_NAME,
    CUSTOMER_USER_GROUP_NAME
} from '../utils/constants';
import { ExistingVPCParameters } from '../vpc/exisiting-vpc-params';
import { CognitoSetup } from '../auth/cognito-setup';
import { SearchAndReplaceRefactorAspect } from '../utils/search-and-replace-refactor-aspect';
import { createCfnDeployRole } from './cfn-deploy-role-factory';

export class UseCaseManagementParameters {
    /**
     * Default user email address used to create a cognito user in the user pool.
     */
    defaultUserEmail: string;

    /**
     * The trademark name of the solution
     */
    applicationTrademarkName: string;

    /**
     * The SSM key where template file list is stored as web config
     */
    webConfigSSMKey: string;

    /**
     * ID of an existing VPC to be used for the use case. If none is provided, a new VPC will be created.
     */
    existingVpcId: cdk.CfnParameter;

    /**
     * ID of an existing Private Subnet to be used for the use case.
     */
    existingPrivateSubnetIds: cdk.CfnParameter;

    /**
     * SecurityGroup IDs associated with the subnet
     */
    existingSecurityGroupIds: cdk.CfnParameter;

    /**
     * AZs for the VPC
     */
    vpcAzs: cdk.CfnParameter;

    /**
     * Domain for the Cognito User Pool Client
     */
    cognitoDomainPrefix: cdk.CfnParameter;

    /**
     * The cloudfront url of the UI application
     */
    cloudFrontUrl: cdk.CfnParameter;

    /**
     * Optional additional UI URL for customer portal (used for Cognito Hosted UI callback/logout)
     */
    portalUrl: cdk.CfnParameter;

    /**
     * Whether to deploy the web app or not
     */
    deployWebApp: cdk.CfnParameter;

    /**
     * If provided, will use the provided UserPool instead of creating a new one.
     */
    existingCognitoUserPoolId: cdk.CfnParameter;

    /**
     * If provided, will use the provided UserPoolClient instead of creating a new one.
     */
    existingCognitoUserPoolClientId: cdk.CfnParameter;

    constructor(stack: IConstruct) {
        this.defaultUserEmail = new cdk.CfnParameter(stack, 'DefaultUserEmail', {
            type: 'String',
            description: 'Email required to create the default user for the deployment platform',
            allowedPattern: OPTIONAL_EMAIL_REGEX_PATTERN,
            constraintDescription: 'Please provide a valid email'
        }).valueAsString;

        this.applicationTrademarkName = new cdk.CfnParameter(stack, 'ApplicationTrademarkName', {
            type: 'String',
            description: 'Trademark name for the application',
            allowedPattern: '[a-zA-Z0-9_ ]+',
            maxLength: 63,
            constraintDescription: 'Please provide a valid trademark name'
        }).valueAsString;

        this.webConfigSSMKey = new cdk.CfnParameter(stack, 'WebConfigSSMKey', {
            type: 'String',
            description: 'SSM key where template file list is stored as web config',
            allowedPattern: '^(\\/[^\\/ ]*)+\\/?$',
            maxLength: 128,
            constraintDescription: 'Please provide a valid web config SSM key'
        }).valueAsString;

        this.cognitoDomainPrefix = new cdk.CfnParameter(stack, 'CognitoDomainPrefix', {
            type: 'String',
            description:
                'If you would like to provide a domain for the Cognito User Pool Client, please enter a value. If a value is not provided, the deployment will generate one',
            default: '',
            allowedPattern: '^$|^[a-z0-9](?:[a-z0-9\\-]{0,61}[a-z0-9])?$',
            constraintDescription:
                'The provided domain prefix is not a valid format. The domain prefix should be be of the following format "^[a-z0-9](?:[a-z0-9\\-]{0,61}[a-z0-9])?$"',
            maxLength: 63
        });

        this.cloudFrontUrl = new cdk.CfnParameter(stack, 'CloudFrontUrl', {
            type: 'String',
            description: 'CloudFront URL for the UI application',
            allowedPattern: '^$|^https:\\/\\/[^\\s]+[\\w]*$',
            default: '',
            constraintDescription: 'If providing a CloudFrontUrl, please provide in a valid format'
        });

        this.portalUrl = new cdk.CfnParameter(stack, 'PortalUrl', {
            type: 'String',
            description:
                'Optional additional UI URL for customer portal (used for Cognito Hosted UI callback/logout). Example: https://portal.aiagentsworkforce.com/',
            allowedPattern: '^$|^https:\\/\\/[^\\s]+[\\w\\/]*$',
            default: '',
            constraintDescription: 'If providing a PortalUrl, please provide in a valid https:// URL format'
        });

        this.deployWebApp = new cdk.CfnParameter(stack, 'DeployUI', {
            type: 'String',
            description:
                'Please select the option to deploy the front end UI for this deployment. Selecting No, will only create the infrastructure to host the APIs, the authentication for the APIs, and backend processing',
            allowedValues: ['Yes', 'No'],
            default: 'Yes'
        });

        this.existingCognitoUserPoolId = new cdk.CfnParameter(stack, 'ExistingCognitoUserPoolId', {
            type: 'String',
            allowedPattern: '^$|^[0-9a-zA-Z_-]{9,24}$',
            maxLength: 24,
            description:
                'Optional - UserPoolId of an existing cognito user pool which this use case will be authenticated with. Will be created if not provided',
            default: ''
        });

        this.existingCognitoUserPoolClientId = new cdk.CfnParameter(stack, 'ExistingCognitoUserPoolClientId', {
            type: 'String',
            allowedPattern: '^$|^[a-z0-9]{3,128}$',
            maxLength: 128,
            description:
                'Optional - Provide a User Pool Client (App Client) to use an existing one. If not provided a new User Pool Client will be created. This parameter can only be provided if an existing User Pool Id is provided',
            default: ''
        });

        const captureExistingVPCParameters = new ExistingVPCParameters(stack);
        this.existingVpcId = captureExistingVPCParameters.existingVpcId;
        this.existingPrivateSubnetIds = captureExistingVPCParameters.existingPrivateSubnetIds;
        this.existingSecurityGroupIds = captureExistingVPCParameters.securityGroupIds;
        this.vpcAzs = captureExistingVPCParameters.vpcAzs;
    }
}

/**
 * This construct creates a nested stack containing resources for ApiGateway, Cognito User Pool,
 * and the lambda function backing the deployment of use cases.
 */
export class UseCaseManagement extends BaseNestedStack {
    /**
     * The lambda backing use case management API calls
     */
    public readonly useCaseManagementApiLambda: lambda.Function;

    /**
     * The lambda backing model info API calls
     */
    public readonly modelInfoApiLambda: lambda.Function;

    /**
     * The lambda backing MCP management API calls
     */
    public readonly mcpManagementApiLambda: lambda.Function;

    /**
     * The lambda backing agent management API calls
     */
    public readonly agentManagementApiLambda: lambda.Function;

    /**
     * The lambda backing workflow management API calls
     */
    public readonly workflowManagementApiLambda: lambda.Function;

    /**
     * The lambda backing platform tenant/user provisioning API calls
     */
    public readonly tenantManagementApiLambda: lambda.Function;

    /**
     * The lambda invoked by Amazon Connect contact flows (voice adapter)
     */
    public readonly connectVoiceAdapterLambda: lambda.Function;

    /**
     * Lex V2 code hook lambda invoked during voice conversations
     */
    public readonly connectVoiceTurnLambda: lambda.Function;

    /**
     * DynamoDB table for platform tenants/customers
     */
    public readonly tenantsTable: dynamodb.Table;

    /**
     * condition to check if vpc configuration should be applied to lambda functions
     */
    public readonly deployVPCCondition: cdk.CfnCondition;

    /**
     * Parameters for nested stack
     */
    public readonly stackParameters: UseCaseManagementParameters;

    /**
     * Dead letter Queue for handling lambda failures
     */
    public readonly dlq: sqs.Queue;

    /**
     * Location of the asset bucket to be used for deploy use case chats
     */
    public readonly assetBucket: string;

    /**
     * A key prefix for where the templates. If templates are in the root of the bucket, this is undefined or empty string
     */
    public readonly objectPrefix: string;

    /**
     * s3 Bucket to deployment dashboard artifacts, such exports artifacts, and user uploaded schema
     */
    public readonly deploymentPlatformBucket: s3.Bucket;

    /**
     * The CognitoSetup construct to use for user pool and client setup
     */
    cognitoSetup: CognitoSetup;

    constructor(scope: Construct, id: string, props: cdk.NestedStackProps) {
        super(scope, id, props);
        this.stackParameters = new UseCaseManagementParameters(cdk.Stack.of(this));

        const version = process.env.VERSION ?? this.node.tryGetContext('solution_version');
        const solutionName = process.env.SOLUTION_NAME ?? this.node.tryGetContext('solution_name');

        if (process.env.TEMPLATE_OUTPUT_BUCKET) {
            generateTemplateMapping(this, solutionName, version);
        }

        this.assetBucket = process.env.TEMPLATE_OUTPUT_BUCKET
            ? `${cdk.Fn.findInMap('Template', 'General', 'S3Bucket')}`
            : [
                  'cdk-',
                  `${cdk.DefaultStackSynthesizer.DEFAULT_QUALIFIER}`,
                  '-assets-',
                  `${cdk.Aws.ACCOUNT_ID}-${cdk.Aws.REGION}`
              ].join('');

        if (process.env.TEMPLATE_OUTPUT_BUCKET) {
            this.objectPrefix = `${cdk.Fn.findInMap('Template', 'General', 'KeyPrefix')}`;
        }

        this.dlq = new sqs.Queue(this, 'UseCaseManagementDLQ', {
            encryption: sqs.QueueEncryption.KMS_MANAGED,
            enforceSSL: true
        });

        const isInternalUserCondition: cdk.CfnCondition = new cdk.CfnCondition(this, 'IsInternalUserCondition', {
            expression: cdk.Fn.conditionEquals(
                cdk.Fn.select(
                    0,
                    cdk.Fn.split(
                        '.',
                        cdk.Fn.select(
                            1,
                            cdk.Fn.split('@', cdk.Fn.join('', [this.stackParameters.defaultUserEmail, '@example.com']))
                        )
                    )
                ),
                INTERNAL_EMAIL_DOMAIN
            )
        });

        this.deployVPCCondition = new cdk.CfnCondition(this, 'DeployVPCCondition', {
            expression: cdk.Fn.conditionNot(
                cdk.Fn.conditionOr(
                    cdk.Fn.conditionEquals(
                        cdk.Fn.join('', this.stackParameters.existingPrivateSubnetIds.valueAsList),
                        ''
                    ),
                    cdk.Fn.conditionEquals(
                        cdk.Fn.join('', this.stackParameters.existingSecurityGroupIds.valueAsList),
                        ''
                    )
                )
            )
        });

        // create the cognito user pool and group for admin
        this.cognitoSetup = new CognitoSetup(this, 'DeploymentPlatformCognitoSetup', {
            userPoolProps: {
                defaultUserEmail: this.stackParameters.defaultUserEmail,
                applicationTrademarkName: this.stackParameters.applicationTrademarkName,
                userGroupName: 'admin',
                usernameSuffix: 'admin',
                customResourceLambdaArn: this.customResourceLambdaArn,
                cognitoDomainPrefix: this.stackParameters.cognitoDomainPrefix.valueAsString,
                existingCognitoUserPoolId: this.stackParameters.existingCognitoUserPoolId.valueAsString,
                existingCognitoGroupPolicyTableName: ''
            },
            userPoolClientProps: {
                logoutUrl: this.stackParameters.cloudFrontUrl.valueAsString,
                callbackUrl: this.stackParameters.cloudFrontUrl.valueAsString,
                additionalCallbackUrls: [this.stackParameters.portalUrl.valueAsString],
                additionalLogoutUrls: [this.stackParameters.portalUrl.valueAsString],
                existingCognitoUserPoolClientId: this.stackParameters.existingCognitoUserPoolClientId.valueAsString
            },
            deployWebApp: this.stackParameters.deployWebApp.valueAsString
        });
        this.cognitoSetup.createAgentCoreResourceServer();

        // Create customer groups (for the separate customer portal) when we manage the user pool
        // If customers provide their own user pool, they must pre-create these groups.
        const createCustomerGroupsCondition = this.cognitoSetup.createUserPoolCondition;

        const customerAdminGroup = new cognito.CfnUserPoolGroup(this, 'CustomerAdminGroup', {
            userPoolId: this.cognitoSetup.getUserPool(this).userPoolId,
            groupName: CUSTOMER_ADMIN_GROUP_NAME,
            precedence: 10
        });
        customerAdminGroup.cfnOptions.condition = createCustomerGroupsCondition;

        const customerUserGroup = new cognito.CfnUserPoolGroup(this, 'CustomerUserGroup', {
            userPoolId: this.cognitoSetup.getUserPool(this).userPoolId,
            groupName: CUSTOMER_USER_GROUP_NAME,
            precedence: 20
        });
        customerUserGroup.cfnOptions.condition = createCustomerGroupsCondition;

        //this construct has undergone a refactor from its original definition and many
        //of the resources have new logical IDs. To prevent customers that upgrade existing
        //stacks from experience a resource replacement, leveraging this aspect to search and
        //replace the most critical resources. Examples include, userpool, DDB table, etc.
        cdk.Aspects.of(this.cognitoSetup).add(
            new SearchAndReplaceRefactorAspect({
                // prettier-ignore
                logicalIdMappings: {
                    'DeploymentPlatformCognitoSetupNewUserPool250C9C56': 'RequestProcessorDeploymentPlatformCognitoSetupNewUserPoolB1636A90', //Cognito::UserPool
                    'DeploymentPlatformCognitoSetupCognitoGroupPolicyStore2FB7858C': 'RequestProcessorDeploymentPlatformCognitoSetupCognitoGroupPolicyStore172C3A6A',  //DynamoDB::Table
                    'DeploymentPlatformCognitoSetupDomainPrefixResource4453775F': 'RequestProcessorDeploymentPlatformCognitoSetupDomainPrefixResource314428BF',  //Custom::CognitoDomainPrefix
                    'DeploymentPlatformCognitoSetupUserPoolDomain08A6E8A9': 'RequestProcessorDeploymentPlatformCognitoSetupUserPoolDomain9A80A149',  //Cognito::UserPoolDomain
                    'DeploymentPlatformCognitoSetupDefaultUser49511A3D': 'RequestProcessorDeploymentPlatformCognitoSetupDefaultUser66D30662',  //Cognito::UserPoolUser
                    'DeploymentPlatformCognitoSetupUserGroupF4017C2D': 'RequestProcessorDeploymentPlatformCognitoSetupUserGroup051C1C83',  //Cognito::UserPoolGroup
                    'DeploymentPlatformCognitoSetupUseCaseUserToGroupAttachment5A319E5E': 'RequestProcessorDeploymentPlatformCognitoSetupUseCaseUserToGroupAttachmentE9BBA286',  //Cognito::UserPoolUserToGroupAttachment
                    'DeploymentPlatformCognitoSetupCfnAppClient8E7A08D1': 'RequestProcessorDeploymentPlatformCognitoSetupCfnAppClientD53990B2',  //Cognito::UserPoolClient
                }
            })
        );

        const useCaseMgmtRole = createDefaultLambdaRole(this, 'UCMLRole', this.deployVPCCondition);
        const cfnDeployRole = createCfnDeployRole(this, 'CfnDeployRole', useCaseMgmtRole, {
            includeVpcPermissions: true, // Text use cases support VPC
            includeKendraPermissions: true, // Text use cases use Kendra
            includeEcrPermissions: false, // Text use cases don't need ECR
            additionalPassRoleServices: ['kendra.amazonaws.com', 'vpc-flow-logs.amazonaws.com'], // Original services
            roleName: 'CfnDeployRole'
        });

        // Create Agent Builder CFN deploy role for agent management lambda
        const agentManagementAPILambdaRole = createDefaultLambdaRole(
            this,
            'AgentManagementLambdaRole',
            this.deployVPCCondition
        );
        const agentBuilderCfnDeployRole = createCfnDeployRole(
            this,
            'AgentBuilderCfnDeployRole',
            agentManagementAPILambdaRole,
            {
                includeVpcPermissions: false, // Text use cases support VPC
                includeKendraPermissions: false, // Text use cases use Kendra
                includeEcrPermissions: true, // Text use cases don't need ECR
                additionalPassRoleServices: ['bedrock-agentcore.amazonaws.com'], // Original services
                roleName: 'AgentBuilderCfnDeployRole'
            }
        );

        this.useCaseManagementApiLambda = new lambda.Function(this, 'UseCaseMgmt', {
            description: 'Lambda function backing the REST API for use case management',
            code: lambda.Code.fromAsset(
                '../lambda/use-case-management',
                ApplicationAssetBundler.assetBundlerFactory()
                    .assetOptions(COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME)
                    .options(this, '../lambda/use-case-management')
            ),
            role: useCaseMgmtRole,
            runtime: COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME,
            handler: 'use-case-handler.handler',
            timeout: cdk.Duration.minutes(LAMBDA_TIMEOUT_MINS),
            tracing: lambda.Tracing.ACTIVE,
            environment: {
                [ARTIFACT_BUCKET_ENV_VAR]: this.assetBucket,
                ...(this.objectPrefix && {
                    [ARTIFACT_KEY_PREFIX_ENV_VAR]: this.objectPrefix
                }),
                [CFN_DEPLOY_ROLE_ARN_ENV_VAR]: cfnDeployRole.roleArn,
                [POWERTOOLS_METRICS_NAMESPACE_ENV_VAR]: USE_CASE_MANAGEMENT_NAMESPACE,
                [WEBCONFIG_SSM_KEY_ENV_VAR]: this.stackParameters.webConfigSSMKey,
                [TEMPLATE_FILE_EXTN_ENV_VAR]: process.env.TEMPLATE_OUTPUT_BUCKET ? '.template' : '.template.json',
                [IS_INTERNAL_USER_ENV_VAR]: cdk.Fn.conditionIf(
                    isInternalUserCondition.logicalId,
                    'true',
                    'false'
                ).toString()
            },
            deadLetterQueue: this.dlq
        });

        // Env vars which need to be passed to use cases on deployment
        this.addCommonEnvironmentVariables(this.useCaseManagementApiLambda);

        createCustomResourceForLambdaLogRetention(
            this,
            'UCMLLogRetention',
            this.useCaseManagementApiLambda.functionName,
            this.customResourceLambdaArn
        );

        // Since creating a L2 vpc construct from `fromAttributes` is difficult with conditions, resorting
        // to L1 construct and using escape hatches to set vpc configuration. The L1 construct only requires
        // security group ids, subnet ids to create and configure the ENI for the lambda.
        createVpcConfigForLambda(
            this.useCaseManagementApiLambda,
            this.deployVPCCondition,
            cdk.Fn.join(',', this.stackParameters.existingPrivateSubnetIds.valueAsList),
            cdk.Fn.join(',', this.stackParameters.existingSecurityGroupIds.valueAsList)
        );

        // allows writing and updating the config params for deployed use cases
        const lambdaDDBPolicy = new iam.Policy(this, 'UseCaseConfigAccess', {
            statements: [
                new iam.PolicyStatement({
                    actions: [
                        'dynamodb:CreateTable',
                        'dynamodb:DeleteTable',
                        'dynamodb:DescribeTable',
                        'dynamodb:*TimeToLive', // Describe|Update TimeToLive
                        'dynamodb:ListTagsOfResource',
                        'dynamodb:TagResource'
                    ],
                    resources: [`arn:${cdk.Aws.PARTITION}:dynamodb:${cdk.Aws.REGION}:${cdk.Aws.ACCOUNT_ID}:table/*`]
                }),
                new iam.PolicyStatement({
                    effect: iam.Effect.ALLOW,
                    actions: ['ssm:GetParameter'],
                    resources: [
                        `arn:${cdk.Aws.PARTITION}:ssm:${cdk.Aws.REGION}:${cdk.Aws.ACCOUNT_ID}:parameter${this.stackParameters.webConfigSSMKey}`
                    ]
                }),
                new iam.PolicyStatement({
                    effect: iam.Effect.ALLOW,
                    actions: ['apigateway:GET'],
                    resources: [`arn:${cdk.Aws.PARTITION}:apigateway:${cdk.Aws.REGION}::/restapis/*`]
                })
            ]
        });
        lambdaDDBPolicy.attachToRole(this.useCaseManagementApiLambda.role!);

        const modelInfoAPILambdaRole = createDefaultLambdaRole(this, 'ModelInfoLambdaRole', this.deployVPCCondition);
        this.modelInfoApiLambda = new lambda.Function(this, 'ModelInfo', {
            description: 'Lambda function backing the REST API for model info',
            code: lambda.Code.fromAsset(
                '../lambda/model-info',
                ApplicationAssetBundler.assetBundlerFactory()
                    .assetOptions(COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME)
                    .options(this, '../lambda/model-info')
            ),
            role: modelInfoAPILambdaRole,
            runtime: COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME,
            handler: 'index.handler',
            timeout: cdk.Duration.minutes(LAMBDA_TIMEOUT_MINS),
            tracing: lambda.Tracing.ACTIVE,
            deadLetterQueue: this.dlq
        });

        createCustomResourceForLambdaLogRetention(
            this,
            'ModeInfoLambdaLogRetention',
            this.modelInfoApiLambda.functionName,
            this.customResourceLambdaArn
        );

        // Since creating a L2 vpc construct from `fromAttributes` is difficult with conditions, resorting
        // to L1 construct and using escape hatches to set vpc configuration. The L1 construct only requires
        // security group ids, subnet ids to create and configure the ENI for the lambda.
        createVpcConfigForLambda(
            this.modelInfoApiLambda,
            this.deployVPCCondition,
            cdk.Fn.join(',', this.stackParameters.existingPrivateSubnetIds.valueAsList),
            cdk.Fn.join(',', this.stackParameters.existingSecurityGroupIds.valueAsList)
        );

        const accessLoggingS3Bucket = s3.Bucket.fromBucketArn(
            this,
            'DeploymentPlatformLoggingBucket',
            this.accessLoggingBucket
        );

        const factories = new ConstructsFactories(this, 'Factories');

        this.deploymentPlatformBucket = factories.s3BucketFactory('DeploymentPlatformBucket', {
            bucketProps: {
                versioned: false, // bucket versioning is recommended in the IG, but is not enforced
                blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
                removalPolicy: cdk.RemovalPolicy.RETAIN,
                encryption: s3.BucketEncryption.S3_MANAGED,
                enforceSSL: true,
                lifecycleRules: [],
                serverAccessLogsBucket: accessLoggingS3Bucket,
                serverAccessLogsPrefix: 'deployment-platform-bucket-logs/',
                cors: [
                    {
                        allowedMethods: [s3.HttpMethods.POST],
                        allowedOrigins: ['*'],
                        allowedHeaders: ['*'],
                        maxAge: 3600
                    }
                ]
            }
        }).s3Bucket;

        this.deploymentPlatformBucket.policy?.applyRemovalPolicy(cdk.RemovalPolicy.RETAIN);

        // A common warning was logged during synth stage when the referenced bucket is not part of the same stack
        // This annotation is to suppress this warning given that log bucket is added to the feedbackBucket
        cdk.Annotations.of(this.deploymentPlatformBucket).acknowledgeWarning(
            '@aws-cdk/aws-s3:accessLogsPolicyNotAdded'
        );

        const mcpManagementAPILambdaRole = createDefaultLambdaRole(
            this,
            'MCPManagementLambdaRole',
            this.deployVPCCondition
        );

        const mcpCfnDeployRole = createCfnDeployRole(this, 'MCPCfnDeployRole', mcpManagementAPILambdaRole, {
            includeVpcPermissions: false, // AgentCore doesn't support VPC
            includeKendraPermissions: false, // AgentCore doesn't use Kendra
            includeEcrPermissions: false, // Needed for pull-through cache
            additionalPassRoleServices: ['bedrock-agentcore.amazonaws.com'], // Allow passing roles to AgentCore
            roleName: 'MCPCfnDeployRole'
        });

        this.mcpManagementApiLambda = new lambda.Function(this, 'MCPManagementLambda', {
            description: 'Lambda function backing the REST API for MCP server management',
            code: lambda.Code.fromAsset(
                '../lambda/use-case-management',
                ApplicationAssetBundler.assetBundlerFactory()
                    .assetOptions(COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME)
                    .options(this, '../lambda/use-case-management')
            ),
            role: mcpManagementAPILambdaRole,
            runtime: COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME,
            handler: 'mcp-handler.mcpHandler',
            timeout: cdk.Duration.minutes(LAMBDA_TIMEOUT_MINS),
            tracing: lambda.Tracing.ACTIVE,
            deadLetterQueue: this.dlq,
            environment: {
                [ARTIFACT_BUCKET_ENV_VAR]: this.assetBucket,
                ...(this.objectPrefix && {
                    [ARTIFACT_KEY_PREFIX_ENV_VAR]: this.objectPrefix
                }),
                [CFN_DEPLOY_ROLE_ARN_ENV_VAR]: mcpCfnDeployRole.roleArn,
                [POWERTOOLS_METRICS_NAMESPACE_ENV_VAR]: USE_CASE_MANAGEMENT_NAMESPACE,
                [GAAB_DEPLOYMENTS_BUCKET_NAME_ENV_VAR]: this.deploymentPlatformBucket.bucketName,
                [TEMPLATE_FILE_EXTN_ENV_VAR]: process.env.TEMPLATE_OUTPUT_BUCKET ? '.template' : '.template.json',
                [USER_POOL_ID_ENV_VAR]: this.cognitoSetup.getUserPool(this).userPoolId,
                [IS_INTERNAL_USER_ENV_VAR]: cdk.Fn.conditionIf(
                    isInternalUserCondition.logicalId,
                    'true',
                    'false'
                ).toString()
            }
        });

        lambdaDDBPolicy.attachToRole(mcpManagementAPILambdaRole);
        this.addCommonEnvironmentVariables(this.mcpManagementApiLambda);

        createCustomResourceForLambdaLogRetention(
            this,
            'MCPManagementLambdaLogRetention',
            this.mcpManagementApiLambda.functionName,
            this.customResourceLambdaArn
        );

        this.addMCPLambdaPermissions(mcpManagementAPILambdaRole, this.deploymentPlatformBucket);

        // Platform SaaS: tenants table (customers)
        this.tenantsTable = new dynamodb.Table(this, 'TenantsTable', {
            billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
            encryption: dynamodb.TableEncryption.AWS_MANAGED,
            partitionKey: { name: 'tenantId', type: dynamodb.AttributeType.STRING },
            pointInTimeRecovery: true,
            removalPolicy: cdk.RemovalPolicy.RETAIN
        });

        this.agentManagementApiLambda = new lambda.Function(this, 'AgentManagementLambda', {
            description: 'Lambda function backing the REST API for agent management',
            code: lambda.Code.fromAsset(
                '../lambda/use-case-management',
                ApplicationAssetBundler.assetBundlerFactory()
                    .assetOptions(COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME)
                    .options(this, '../lambda/use-case-management')
            ),
            role: agentManagementAPILambdaRole,
            runtime: COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME,
            handler: 'agents-handler.agentsHandler',
            timeout: cdk.Duration.minutes(LAMBDA_TIMEOUT_MINS),
            tracing: lambda.Tracing.ACTIVE,
            deadLetterQueue: this.dlq,
            environment: {
                [ARTIFACT_BUCKET_ENV_VAR]: this.assetBucket,
                ...(this.objectPrefix && {
                    [ARTIFACT_KEY_PREFIX_ENV_VAR]: this.objectPrefix
                }),
                [CFN_DEPLOY_ROLE_ARN_ENV_VAR]: agentBuilderCfnDeployRole.roleArn,
                [POWERTOOLS_METRICS_NAMESPACE_ENV_VAR]: USE_CASE_MANAGEMENT_NAMESPACE,
                [WEBCONFIG_SSM_KEY_ENV_VAR]: this.stackParameters.webConfigSSMKey,
                [TEMPLATE_FILE_EXTN_ENV_VAR]: process.env.TEMPLATE_OUTPUT_BUCKET ? '.template' : '.template.json',
                [IS_INTERNAL_USER_ENV_VAR]: cdk.Fn.conditionIf(
                    isInternalUserCondition.logicalId,
                    'true',
                    'false'
                ).toString(),
                [GAAB_DEPLOYMENTS_BUCKET_NAME_ENV_VAR]: this.deploymentPlatformBucket.bucketName,
                [DEPLOYMENT_PLATFORM_STACK_NAME_ENV_VAR]: cdk.Stack.of(this).stackName
                // Keep failed stacks around (ROLLBACK_COMPLETE) so we can inspect events during development.
                // Switch back to DELETE for production if desired.
                ,CFN_ON_FAILURE: 'ROLLBACK'
            }
        });

        createCustomResourceForLambdaLogRetention(
            this,
            'AgentManagementLambdaLogRetention',
            this.agentManagementApiLambda.functionName,
            this.customResourceLambdaArn
        );

        // Add common environment variables for agent management lambda
        this.addCommonEnvironmentVariables(this.agentManagementApiLambda);

        // Add agent management specific permissions
        this.addAgentManagementLambdaPermissions(agentManagementAPILambdaRole, this.deploymentPlatformBucket);

        const workflowManagementAPILambdaRole = createDefaultLambdaRole(
            this,
            'WorkflowManagementLambdaRole',
            this.deployVPCCondition
        );

        const workflowCfnDeployRole = createCfnDeployRole(
            this,
            'WorkflowCfnDeployRole',
            workflowManagementAPILambdaRole,
            {
                includeVpcPermissions: false,
                includeKendraPermissions: false,
                includeEcrPermissions: true,
                additionalPassRoleServices: ['bedrock-agentcore.amazonaws.com'], // Allow passing roles to AgentCore
                roleName: 'WorkflowCfnDeployRole'
            }
        );

        this.workflowManagementApiLambda = new lambda.Function(this, 'WorkflowManagementLambda', {
            description: 'Lambda function backing the REST API for workflow management',
            code: lambda.Code.fromAsset(
                '../lambda/use-case-management',
                ApplicationAssetBundler.assetBundlerFactory()
                    .assetOptions(COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME)
                    .options(this, '../lambda/use-case-management')
            ),
            role: workflowManagementAPILambdaRole,
            runtime: COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME,
            handler: 'workflows-handler.workflowsHandler',
            timeout: cdk.Duration.minutes(LAMBDA_TIMEOUT_MINS),
            tracing: lambda.Tracing.ACTIVE,
            deadLetterQueue: this.dlq,
            environment: {
                [ARTIFACT_BUCKET_ENV_VAR]: this.assetBucket,
                ...(this.objectPrefix && {
                    [ARTIFACT_KEY_PREFIX_ENV_VAR]: this.objectPrefix
                }),
                [CFN_DEPLOY_ROLE_ARN_ENV_VAR]: workflowCfnDeployRole.roleArn,
                [POWERTOOLS_METRICS_NAMESPACE_ENV_VAR]: USE_CASE_MANAGEMENT_NAMESPACE,
                [WEBCONFIG_SSM_KEY_ENV_VAR]: this.stackParameters.webConfigSSMKey,
                [TEMPLATE_FILE_EXTN_ENV_VAR]: process.env.TEMPLATE_OUTPUT_BUCKET ? '.template' : '.template.json',
                [IS_INTERNAL_USER_ENV_VAR]: cdk.Fn.conditionIf(
                    isInternalUserCondition.logicalId,
                    'true',
                    'false'
                ).toString(),
                [GAAB_DEPLOYMENTS_BUCKET_NAME_ENV_VAR]: this.deploymentPlatformBucket.bucketName,
                [DEPLOYMENT_PLATFORM_STACK_NAME_ENV_VAR]: cdk.Stack.of(this).stackName
            }
        });

        createCustomResourceForLambdaLogRetention(
            this,
            'WorkflowManagementLambdaLogRetention',
            this.workflowManagementApiLambda.functionName,
            this.customResourceLambdaArn
        );

        // Add common environment variables for workflow management lambda
        this.addCommonEnvironmentVariables(this.workflowManagementApiLambda);

        // Add workflow management specific permissions
        this.addWorkflowManagementLambdaPermissions(workflowManagementAPILambdaRole, this.deploymentPlatformBucket);

        // Platform SaaS: tenant & user provisioning API lambda
        const tenantManagementLambdaRole = createDefaultLambdaRole(
            this,
            'TenantManagementLambdaRole',
            this.deployVPCCondition
        );
        this.tenantsTable.grantReadWriteData(tenantManagementLambdaRole);

        tenantManagementLambdaRole.addToPolicy(
            new iam.PolicyStatement({
                effect: iam.Effect.ALLOW,
                actions: [
                    'cognito-idp:AdminCreateUser',
                    'cognito-idp:AdminUpdateUserAttributes',
                    'cognito-idp:AdminAddUserToGroup',
                    'cognito-idp:AdminGetUser'
                ],
                resources: [
                    `arn:${cdk.Aws.PARTITION}:cognito-idp:${cdk.Aws.REGION}:${cdk.Aws.ACCOUNT_ID}:userpool/${this.cognitoSetup.getUserPool(this).userPoolId}`
                ]
            })
        );

        this.tenantManagementApiLambda = new lambda.Function(this, 'TenantManagementLambda', {
            description: 'Lambda function backing the REST API for platform tenants and user provisioning',
            code: lambda.Code.fromAsset(
                '../lambda/use-case-management',
                ApplicationAssetBundler.assetBundlerFactory()
                    .assetOptions(COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME)
                    .options(this, '../lambda/use-case-management')
            ),
            role: tenantManagementLambdaRole,
            runtime: COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME,
            handler: 'tenants-handler.tenantsHandler',
            timeout: cdk.Duration.minutes(LAMBDA_TIMEOUT_MINS),
            tracing: lambda.Tracing.ACTIVE,
            deadLetterQueue: this.dlq,
            environment: {
                [TENANTS_TABLE_NAME_ENV_VAR]: this.tenantsTable.tableName,
                [USER_POOL_ID_ENV_VAR]: this.cognitoSetup.getUserPool(this).userPoolId,
                [CLIENT_ID_ENV_VAR]: this.cognitoSetup.getUserPoolClient(this).userPoolClientId
            }
        });

        createCustomResourceForLambdaLogRetention(
            this,
            'TenantManagementLambdaLogRetention',
            this.tenantManagementApiLambda.functionName,
            this.customResourceLambdaArn
        );

        // Amazon Connect voice adapter lambda (invoked directly by Connect contact flows)
        const connectVoiceAdapterRole = createDefaultLambdaRole(this, 'ConnectVoiceAdapterRole', this.deployVPCCondition);
        this.connectVoiceAdapterLambda = new lambda.Function(this, 'ConnectVoiceAdapterLambda', {
            description: 'Amazon Connect voice adapter lambda (routes calls to the correct tenant/deployment)',
            code: lambda.Code.fromAsset(
                '../lambda/use-case-management',
                ApplicationAssetBundler.assetBundlerFactory()
                    .assetOptions(COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME)
                    .options(this, '../lambda/use-case-management')
            ),
            role: connectVoiceAdapterRole,
            runtime: COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME,
            handler: 'connect-voice-adapter.handler',
            timeout: cdk.Duration.seconds(10),
            tracing: lambda.Tracing.ACTIVE,
            deadLetterQueue: this.dlq,
            environment: {
                [POWERTOOLS_METRICS_NAMESPACE_ENV_VAR]: USE_CASE_MANAGEMENT_NAMESPACE
            }
        });

        createCustomResourceForLambdaLogRetention(
            this,
            'ConnectVoiceAdapterLambdaLogRetention',
            this.connectVoiceAdapterLambda.functionName,
            this.customResourceLambdaArn
        );

        // CDK-NAG suppression for default policy wildcard resources (logs/tracing)
        NagSuppressions.addResourceSuppressions(
            connectVoiceAdapterRole.node.tryFindChild('DefaultPolicy')!.node.tryFindChild('Resource')!,
            [
                {
                    id: 'AwsSolutions-IAM5',
                    reason:
                        'Connect voice adapter lambda uses standard Lambda execution permissions (logs/tracing) generated by shared role helper; table access permissions are added by storage setup.'
                }
            ]
        );

        // Lex V2 voice "turn" lambda (invoked by Lex code hook; forwards utterances to AgentCore)
        const connectVoiceTurnRole = createDefaultLambdaRole(this, 'ConnectVoiceTurnRole', this.deployVPCCondition);
        this.connectVoiceTurnLambda = new lambda.Function(this, 'ConnectVoiceTurnLambda', {
            description: 'Lex V2 code hook for voice conversations (Connect -> Lex -> AgentCore)',
            code: lambda.Code.fromAsset('../lambda/connect-voice-turn'),
            role: connectVoiceTurnRole,
            runtime: COMMERCIAL_REGION_LAMBDA_PYTHON_RUNTIME,
            handler: 'handler.handler',
            timeout: cdk.Duration.seconds(20),
            tracing: lambda.Tracing.ACTIVE,
            deadLetterQueue: this.dlq,
            environment: {
                [POWERTOOLS_METRICS_NAMESPACE_ENV_VAR]: USE_CASE_MANAGEMENT_NAMESPACE
            }
        });

        // Permissions required to resolve runtime + invoke AgentCore:
        // - UseCasesTable access is granted by DeploymentPlatformStorageSetup
        this.connectVoiceTurnLambda.addToRolePolicy(
            new iam.PolicyStatement({
                effect: iam.Effect.ALLOW,
                actions: ['cloudformation:DescribeStacks'],
                resources: ['*']
            })
        );
        this.connectVoiceTurnLambda.addToRolePolicy(
            new iam.PolicyStatement({
                effect: iam.Effect.ALLOW,
                actions: ['bedrock-agentcore:InvokeAgentRuntime', 'bedrock-agentcore:InvokeAgentRuntimeForUser'],
                resources: [`arn:${cdk.Aws.PARTITION}:bedrock-agentcore:${cdk.Aws.REGION}:${cdk.Aws.ACCOUNT_ID}:runtime/*`]
            })
        );

        createCustomResourceForLambdaLogRetention(
            this,
            'ConnectVoiceTurnLambdaLogRetention',
            this.connectVoiceTurnLambda.functionName,
            this.customResourceLambdaArn
        );

        NagSuppressions.addResourceSuppressions(
            connectVoiceTurnRole.node.tryFindChild('DefaultPolicy')!.node.tryFindChild('Resource')!,
            [
                {
                    id: 'AwsSolutions-IAM5',
                    reason:
                        'Connect voice turn lambda uses standard Lambda execution permissions (logs/tracing) generated by shared role helper; DynamoDB access is granted by storage setup; CloudFormation/AgentCore resources are wildcarded by design.'
                }
            ]
        );

        // CDK-NAG: suppress wildcard IAM findings for this role's generated default policy.
        // The default policy comes from shared helper `createDefaultLambdaRole` and includes standard Lambda permissions
        // (e.g., CloudWatch Logs and X-Ray) that may use wildcard resources.
        NagSuppressions.addResourceSuppressions(
            tenantManagementLambdaRole.node.tryFindChild('DefaultPolicy')!.node.tryFindChild('Resource')!,
            [
                {
                    id: 'AwsSolutions-IAM5',
                    reason:
                        'Tenant management lambda uses standard Lambda execution permissions (logs/tracing) generated by shared role helper; business permissions are scoped to the user pool ARN and tenant table.'
                }
            ]
        );

        NagSuppressions.addResourceSuppressions(
            this.useCaseManagementApiLambda.role!.node.tryFindChild('DefaultPolicy')!.node.tryFindChild('Resource')!,
            [
                {
                    id: 'AwsSolutions-IAM5',
                    reason: 'The IAM role allows the Lambda function to perform x-ray tracing'
                }
            ]
        );

        NagSuppressions.addResourceSuppressions(
            this.modelInfoApiLambda.role!.node.tryFindChild('DefaultPolicy')!.node.tryFindChild('Resource')!,
            [
                {
                    id: 'AwsSolutions-IAM5',
                    reason: 'The IAM role allows the Lambda function to perform x-ray tracing'
                }
            ]
        );

        NagSuppressions.addResourceSuppressions(
            this.mcpManagementApiLambda.role!.node.tryFindChild('DefaultPolicy')!.node.tryFindChild('Resource')!,
            [
                {
                    id: 'AwsSolutions-IAM5',
                    reason: 'The IAM role allows the Lambda function to perform x-ray tracing'
                }
            ]
        );

        NagSuppressions.addResourceSuppressions(
            this.agentManagementApiLambda.role!.node.tryFindChild('DefaultPolicy')!.node.tryFindChild('Resource')!,
            [
                {
                    id: 'AwsSolutions-IAM5',
                    reason: 'The IAM role allows the Lambda function to perform x-ray tracing'
                }
            ]
        );

        NagSuppressions.addResourceSuppressions(
            this.workflowManagementApiLambda.role!.node.tryFindChild('DefaultPolicy')!.node.tryFindChild('Resource')!,
            [
                {
                    id: 'AwsSolutions-IAM5',
                    reason: 'The IAM role allows the Lambda function to perform x-ray tracing'
                }
            ]
        );

        NagSuppressions.addResourceSuppressions(lambdaDDBPolicy, [
            {
                id: 'AwsSolutions-IAM5',
                reason: 'The resource arn contains wild card because table name is not known. However the arn uses a pre-defined prefix and is narrowed down to the table names starting with that prefix. Also, the API Gateway GET permission requires access to list resources from all REST APIs.'
            }
        ]);

        NagSuppressions.addResourceSuppressions(this.dlq, [
            {
                id: 'AwsSolutions-SQS3',
                reason: 'This queue is being used as a DLQ on the UseCaseMgmt lambda function.'
            }
        ]);

        cfn_nag.addCfnSuppressRules(useCaseMgmtRole, [
            {
                id: 'F10',
                reason: 'The inline policy avoids a rare race condition between the lambda, Role and the policy resource creation.'
            }
        ]);

        cfn_nag.addCfnSuppressRules(this.dlq, [
            {
                id: 'W48',
                reason: 'The queue is encrypted using AWS Managed encryption key'
            }
        ]);

        cfn_nag.addCfnSuppressRules(this.useCaseManagementApiLambda, [
            {
                id: 'W89',
                reason: 'VPC deployment is not enforced. If the solution is deployed in a VPC, this lambda function will be deployed with VPC enabled configuration'
            },
            {
                id: 'W92',
                reason: 'The solution does not enforce reserved concurrency'
            }
        ]);

        cfn_nag.addCfnSuppressRules(this.modelInfoApiLambda, [
            {
                id: 'W89',
                reason: 'VPC deployment is not enforced. If the solution is deployed in a VPC, this lambda function will be deployed with VPC enabled configuration'
            },
            {
                id: 'W92',
                reason: 'The solution does not enforce reserved concurrency'
            }
        ]);

        cfn_nag.addCfnSuppressRules(modelInfoAPILambdaRole, [
            {
                id: 'F10',
                reason: 'The inline policy avoids a rare race condition between the lambda, Role and the policy resource creation.'
            }
        ]);

        cfn_nag.addCfnSuppressRules(this.mcpManagementApiLambda, [
            {
                id: 'W89',
                reason: 'VPC deployment is not enforced. If the solution is deployed in a VPC, this lambda function will be deployed with VPC enabled configuration'
            },
            {
                id: 'W92',
                reason: 'The solution does not enforce reserved concurrency'
            }
        ]);

        cfn_nag.addCfnSuppressRules(mcpManagementAPILambdaRole, [
            {
                id: 'F10',
                reason: 'The inline policy avoids a rare race condition between the lambda, Role and the policy resource creation.'
            }
        ]);

        cfn_nag.addCfnSuppressRules(this.agentManagementApiLambda, [
            {
                id: 'W89',
                reason: 'VPC deployment is not enforced. If the solution is deployed in a VPC, this lambda function will be deployed with VPC enabled configuration'
            },
            {
                id: 'W92',
                reason: 'The solution does not enforce reserved concurrency'
            }
        ]);

        cfn_nag.addCfnSuppressRules(agentManagementAPILambdaRole, [
            {
                id: 'F10',
                reason: 'The inline policy avoids a rare race condition between the lambda, Role and the policy resource creation.'
            }
        ]);

        cfn_nag.addCfnSuppressRules(this.workflowManagementApiLambda, [
            {
                id: 'W89',
                reason: 'VPC deployment is not enforced. If the solution is deployed in a VPC, this lambda function will be deployed with VPC enabled configuration'
            },
            {
                id: 'W92',
                reason: 'The solution does not enforce reserved concurrency'
            }
        ]);

        cfn_nag.addCfnSuppressRules(workflowManagementAPILambdaRole, [
            {
                id: 'F10',
                reason: 'The inline policy avoids a rare race condition between the lambda, Role and the policy resource creation.'
            }
        ]);
    }

    /**
     * Adds all necessary permissions for MCP Management Lambda including S3 and Bedrock AgentCore permissions
     * @param role The IAM role to attach the permissions to
     * @param deploymentBucket The S3 bucket for deployment platform storage
     */
    private addMCPLambdaPermissions(role: iam.Role, deploymentBucket: s3.Bucket): void {
        const s3Policy = new iam.Policy(this, 'MCPLambdaS3Policy', {
            statements: [
                new iam.PolicyStatement({
                    effect: iam.Effect.ALLOW,
                    actions: ['s3:GetObject', 's3:PutObject', 's3:DeleteObject', 's3:PutObjectTagging'],
                    resources: [
                        deploymentBucket.bucketArn,
                        `${deploymentBucket.bucketArn}/mcp/*`,
                        `arn:${cdk.Aws.PARTITION}:s3:::${this.assetBucket}`,
                        `arn:${cdk.Aws.PARTITION}:s3:::${this.assetBucket}/*`
                    ]
                })
            ]
        });
        s3Policy.attachToRole(role);

        // Add NAG suppressions for S3 policy
        NagSuppressions.addResourceSuppressions(s3Policy, [
            {
                id: 'AwsSolutions-IAM5',
                reason: 'The IAM role allows the MCP Management Lambda to access deployment platform S3 bucket and its objects under the mcp/ prefix, and CDK assets bucket for template access',
                appliesTo: [
                    `Resource::<${cdk.Stack.of(this).getLogicalId(
                        deploymentBucket.node.defaultChild as cdk.CfnResource
                    )}.Arn>/mcp/*`,
                    process.env.TEMPLATE_OUTPUT_BUCKET
                        ? 'Resource::arn:<AWS::Partition>:s3:::{"Fn::FindInMap":["Template","General","S3Bucket"]}/*'
                        : 'Resource::arn:<AWS::Partition>:s3:::cdk-hnb659fds-assets-<AWS::AccountId>-<AWS::Region>/*'
                ]
            }
        ]);
    }

    /**
     * Adds all necessary permissions for Agent Management Lambda
     * @param role The IAM role to attach the permissions to
     * @param deploymentBucket The S3 bucket for deployment platform storage
     */
    private addAgentManagementLambdaPermissions(role: iam.Role, deploymentBucket: s3.Bucket): void {
        const agentManagementPolicy = new iam.Policy(this, 'AgentManagementLambdaPolicy', {
            statements: [
                // API Gateway permissions for reading REST APIs
                new iam.PolicyStatement({
                    effect: iam.Effect.ALLOW,
                    actions: ['apigateway:GET'],
                    resources: [`arn:${cdk.Aws.PARTITION}:apigateway:${cdk.Aws.REGION}::/restapis/*`]
                }),
                // S3 permissions for agent artifacts
                new iam.PolicyStatement({
                    effect: iam.Effect.ALLOW,
                    actions: ['s3:GetObject', 's3:PutObject'],
                    resources: [cdk.Fn.join('', [deploymentBucket.bucketArn, '/agents/*'])] // restrict scope to /agents prefix
                }),
                // S3 permissions for reading deployment templates from the asset bucket (used by CloudFormation TemplateURL)
                new iam.PolicyStatement({
                    effect: iam.Effect.ALLOW,
                    actions: ['s3:GetObject'],
                    resources: [
                        `arn:${cdk.Aws.PARTITION}:s3:::${this.assetBucket}/*`,
                        `arn:${cdk.Aws.PARTITION}:s3:::${this.assetBucket}`
                    ]
                }),
                // DynamoDB permissions for use case configuration
                new iam.PolicyStatement({
                    actions: [
                        'dynamodb:CreateTable',
                        'dynamodb:DeleteTable',
                        'dynamodb:DescribeTable',
                        'dynamodb:*TimeToLive', // Describe|Update TimeToLive
                        'dynamodb:ListTagsOfResource',
                        'dynamodb:TagResource'
                    ],
                    resources: [`arn:${cdk.Aws.PARTITION}:dynamodb:${cdk.Aws.REGION}:${cdk.Aws.ACCOUNT_ID}:table/*`]
                }),
                // SSM permissions for web config
                new iam.PolicyStatement({
                    effect: iam.Effect.ALLOW,
                    actions: ['ssm:GetParameter'],
                    resources: [
                        `arn:${cdk.Aws.PARTITION}:ssm:${cdk.Aws.REGION}:${cdk.Aws.ACCOUNT_ID}:parameter${this.stackParameters.webConfigSSMKey}`
                    ]
                }),
                // CloudWatch Logs permissions for deployed use cases
                new iam.PolicyStatement({
                    effect: iam.Effect.ALLOW,
                    actions: [
                        'logs:CreateLogGroup',
                        'logs:DescribeLogGroups',
                        'logs:PutRetentionPolicy',
                        'logs:TagResource',
                        'logs:ListTagsForResource'
                    ],
                    resources: [`arn:${cdk.Aws.PARTITION}:logs:${cdk.Aws.REGION}:${cdk.Aws.ACCOUNT_ID}:log-group:*`]
                })
            ]
        });
        agentManagementPolicy.attachToRole(role);

        NagSuppressions.addResourceSuppressions(agentManagementPolicy, [
            {
                id: 'AwsSolutions-IAM5',
                reason: 'The IAM role allows the Agent Management Lambda to access API Gateway REST APIs, DynamoDB tables, CloudWatch Logs, deployment platform S3 bucket objects under the agents/ prefix, and read CloudFormation templates from the CDK assets/template bucket',
                appliesTo: [
                    'Resource::arn:<AWS::Partition>:apigateway:<AWS::Region>::/restapis/*',
                    `Resource::<${cdk.Stack.of(this).getLogicalId(
                        deploymentBucket.node.defaultChild as cdk.CfnResource
                    )}.Arn>/agents/*`,
                    process.env.TEMPLATE_OUTPUT_BUCKET
                        ? 'Resource::arn:<AWS::Partition>:s3:::{"Fn::FindInMap":["Template","General","S3Bucket"]}/*'
                        : 'Resource::arn:<AWS::Partition>:s3:::cdk-hnb659fds-assets-<AWS::AccountId>-<AWS::Region>/*',
                    'Resource::arn:<AWS::Partition>:dynamodb:<AWS::Region>:<AWS::AccountId>:table/*',
                    'Resource::arn:<AWS::Partition>:logs:<AWS::Region>:<AWS::AccountId>:log-group:*',
                    'Action::dynamodb:*TimeToLive'
                ]
            }
        ]);
    }

    /**
     * Adds all necessary permissions for Workflow Management Lambda
     * @param role The IAM role to attach the permissions to
     * @param deploymentBucket The S3 bucket for deployment platform storage
     */
    private addWorkflowManagementLambdaPermissions(role: iam.Role, deploymentBucket: s3.Bucket): void {
        const workflowManagementPolicy = new iam.Policy(this, 'WorkflowManagementLambdaPolicy', {
            statements: [
                // API Gateway permissions for reading REST APIs
                new iam.PolicyStatement({
                    effect: iam.Effect.ALLOW,
                    actions: ['apigateway:GET'],
                    resources: [`arn:${cdk.Aws.PARTITION}:apigateway:${cdk.Aws.REGION}::/restapis/*`]
                }),
                // S3 permissions for workflow artifacts
                new iam.PolicyStatement({
                    effect: iam.Effect.ALLOW,
                    actions: ['s3:GetObject', 's3:PutObject'],
                    resources: [cdk.Fn.join('', [deploymentBucket.bucketArn, '/workflows/*'])] // restrict scope to /workflows prefix
                }),
                // DynamoDB permissions for use case configuration
                new iam.PolicyStatement({
                    actions: [
                        'dynamodb:CreateTable',
                        'dynamodb:DeleteTable',
                        'dynamodb:DescribeTable',
                        'dynamodb:*TimeToLive', // Describe|Update TimeToLive
                        'dynamodb:ListTagsOfResource',
                        'dynamodb:TagResource'
                    ],
                    resources: [`arn:${cdk.Aws.PARTITION}:dynamodb:${cdk.Aws.REGION}:${cdk.Aws.ACCOUNT_ID}:table/*`]
                }),
                // SSM permissions for web config
                new iam.PolicyStatement({
                    effect: iam.Effect.ALLOW,
                    actions: ['ssm:GetParameter'],
                    resources: [
                        `arn:${cdk.Aws.PARTITION}:ssm:${cdk.Aws.REGION}:${cdk.Aws.ACCOUNT_ID}:parameter${this.stackParameters.webConfigSSMKey}`
                    ]
                }),
                // CloudWatch Logs permissions for deployed use cases
                new iam.PolicyStatement({
                    effect: iam.Effect.ALLOW,
                    actions: [
                        'logs:CreateLogGroup',
                        'logs:DescribeLogGroups',
                        'logs:PutRetentionPolicy',
                        'logs:TagResource',
                        'logs:ListTagsForResource'
                    ],
                    resources: [`arn:${cdk.Aws.PARTITION}:logs:${cdk.Aws.REGION}:${cdk.Aws.ACCOUNT_ID}:log-group:*`]
                })
            ]
        });
        workflowManagementPolicy.attachToRole(role);

        NagSuppressions.addResourceSuppressions(workflowManagementPolicy, [
            {
                id: 'AwsSolutions-IAM5',
                reason: 'The IAM role allows the Workflow Management Lambda to access API Gateway REST APIs, DynamoDB tables, CloudWatch Logs, and deployment platform S3 bucket objects under the workflows/ prefix',
                appliesTo: [
                    'Resource::arn:<AWS::Partition>:apigateway:<AWS::Region>::/restapis/*',
                    `Resource::<${cdk.Stack.of(this).getLogicalId(
                        deploymentBucket.node.defaultChild as cdk.CfnResource
                    )}.Arn>/workflows/*`,
                    'Resource::arn:<AWS::Partition>:dynamodb:<AWS::Region>:<AWS::AccountId>:table/*',
                    'Resource::arn:<AWS::Partition>:logs:<AWS::Region>:<AWS::AccountId>:log-group:*',
                    'Action::dynamodb:*TimeToLive'
                ]
            }
        ]);
    }

    /**
     * Adds common environment variables needed by management lambdas
     * @param lambdaFunction The lambda function to add environment variables to
     */
    private addCommonEnvironmentVariables(lambdaFunction: lambda.Function): void {
        lambdaFunction.addEnvironment(
            COGNITO_POLICY_TABLE_ENV_VAR,
            this.cognitoSetup.getCognitoGroupPolicyTable(this).tableName
        );
        lambdaFunction.addEnvironment(USER_POOL_ID_ENV_VAR, this.cognitoSetup.getUserPool(this).userPoolId);
        lambdaFunction.addEnvironment(CLIENT_ID_ENV_VAR, this.cognitoSetup.getUserPoolClient(this).userPoolClientId);
    }

    /**
     * Sets multimodal environment variables for the agent and workflows management lambda
     * This method should be called after the multimodal setup is created
     * @param multimodalDataBucketName The name of the multimodal data bucket
     * @param multimodalDataMetadataTableName The name of the multimodal data metadata table
     */
    public setMultimodalEnvironmentVariables(
        multimodalDataBucketName: string,
        multimodalDataMetadataTableName: string
    ): void {
        this.agentManagementApiLambda.addEnvironment(MULTIMODAL_FILES_BUCKET_NAME_ENV_VAR, multimodalDataBucketName);
        this.agentManagementApiLambda.addEnvironment(
            MULTIMODAL_FILES_METADATA_TABLE_NAME_ENV_VAR,
            multimodalDataMetadataTableName
        );

        this.workflowManagementApiLambda.addEnvironment(MULTIMODAL_FILES_BUCKET_NAME_ENV_VAR, multimodalDataBucketName);
        this.workflowManagementApiLambda.addEnvironment(
            MULTIMODAL_FILES_METADATA_TABLE_NAME_ENV_VAR,
            multimodalDataMetadataTableName
        );
    }
}
