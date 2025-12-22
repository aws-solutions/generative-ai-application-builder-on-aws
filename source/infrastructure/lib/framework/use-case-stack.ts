#!/usr/bin/env node
// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.// SPDX-License-Identifier: Apache-2.0

import * as cdk from 'aws-cdk-lib';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as s3 from 'aws-cdk-lib/aws-s3';
import { Construct } from 'constructs';
import { FeedbackSetupStack } from '../feedback/feedback-setup-stack';
import * as api from 'aws-cdk-lib/aws-apigateway';

import { NagSuppressions } from 'cdk-nag';
import { WebsocketRequestProcessor } from '../api/websocket-request-processor';
import { ApplicationSetup } from '../framework/application-setup';
import { BaseParameters, BaseStack, BaseStackProps } from '../framework/base-stack';
import { DashboardType } from '../metrics/custom-dashboard';
import { CopyUIAssets } from '../s3web/copy-ui-assets-nested-stack';
import { UIDistribution } from '../s3web/ui-distribution-nested-stack';
import { UIInfrastructureBuilder } from '../ui/ui-infrastructure-builder';
import * as cfn_guard from '../utils/cfn-guard-suppressions';
import {
    createCustomResourceForLambdaLogRetention,
    generateSourceCodeMapping,
    createVpcConfigForLambda
} from '../utils/common-utils';
import {
    CHAT_PROVIDERS,
    CLIENT_ID_ENV_VAR,
    INTERNAL_EMAIL_DOMAIN,
    OPTIONAL_EMAIL_REGEX_PATTERN,
    PLACEHOLDER_EMAIL,
    UIAssetFolders,
    USER_POOL_ID_ENV_VAR,
    FEEDBACK_ENABLED_ENV_VAR,
    USE_CASE_CONFIG_RECORD_KEY_ENV_VAR,
    USE_CASE_CONFIG_TABLE_NAME_ENV_VAR,
    USE_CASE_UUID_ENV_VAR,
    UseCaseNames,
    WEBSOCKET_API_ID_ENV_VAR,
    WEB_CONFIG_PREFIX,
    StackDeploymentSource
} from '../utils/constants';
import { VPCSetup } from '../vpc/vpc-setup';
import { UseCaseRestEndpointSetup } from '../api/use-case-rest-endpoint-setup';
import { MultimodalSetup } from '../multimodal/multimodal-setup';

export class UseCaseParameters extends BaseParameters {
    /**
     * Email of the default user for this use case. A cognito user for this email will be created to access the use case.
     */
    public defaultUserEmail: cdk.CfnParameter;

    /**
     * ARN of the DynamoDB table containing user group policies, used by the custom authorizer on this use-cases API.
     * Typically will be provided when deploying from the deployment platform, but can be omitted when deploying this use-case stack standalone.
     */
    public existingCognitoGroupPolicyTableName: cdk.CfnParameter;

    /**
     * Cfn parameter for existing websocket endpoint
     */
    public existingRestApiId: cdk.CfnParameter;

    /**
     * Cfn parameter for existing websocket endpoint
     */
    public existingApiRootResourceId: cdk.CfnParameter;

    /**
     * If set to 'false', the deployed use case stack will not have access to the feedback feature
     */
    public feedbackEnabled: cdk.CfnParameter;

    /**
     * Existing multimodal data metadata table name
     * Passed by the deployment dashboard's management lambda when deploying use cases
     */
    public existingMultimodalDataMetadataTable: cdk.CfnParameter;

    /**
     * Existing multimodal data bucket name
     * Passed by the deployment dashboard's management lambda when deploying use cases
     */
    public existingMultimodalDataBucket: cdk.CfnParameter;

    /**
     * Enable multimodal functionality for the AgentCore deployment
     */
    public multimodalEnabled: cdk.CfnParameter;

    /**
     * Number of execution environments to keep warm for provisioned concurrency
     */
    public provisionedConcurrencyValue: cdk.CfnParameter;

    /**
     * The source where this code was called from
     */
    public stackDeploymentSource: StackDeploymentSource;

    constructor(stack: BaseStack) {
        super(stack);
    }

    /**
     * This method allows adding additional cfn parameters to the stack
     *
     * @param stack
     */
    protected withAdditionalCfnParameters(stack: BaseStack) {
        this.defaultUserEmail = new cdk.CfnParameter(stack, 'DefaultUserEmail', {
            type: 'String',
            description:
                'Optional - Email of the default user for this use case. A cognito user for this email will be created to access the use case.',
            default: PLACEHOLDER_EMAIL,
            allowedPattern: OPTIONAL_EMAIL_REGEX_PATTERN,
            constraintDescription: 'Please provide a valid email'
        });

        this.existingCognitoGroupPolicyTableName = new cdk.CfnParameter(stack, 'ExistingCognitoGroupPolicyTableName', {
            type: 'String',
            allowedPattern: '^$|^[a-zA-Z0-9_.-]{3,255}$',
            maxLength: 255,
            description:
                'Name of the DynamoDB table containing user group policies, used by the custom authorizer for the use-cases APIs. Required when an existing User Pool Id is provided.',
            default: ''
        });

        this.existingRestApiId = new cdk.CfnParameter(stack, 'ExistingRestApiId', {
            type: 'String',
            allowedPattern: '^$|^[a-zA-Z0-9]+$',
            description:
                'Optional - Provide the API Gateway REST API ID to use an existing one. If not provided, a new API Gateway REST API will be created. Note that for standalone use cases, existing APIs should have the pre-configured UseCaseDetails (and Feedback if Feedback is enabled) routes with expected models. Additionally, ExistingApiRootResourceId must also be provided.',
            default: ''
        });

        this.existingApiRootResourceId = new cdk.CfnParameter(stack, 'ExistingApiRootResourceId', {
            type: 'String',
            allowedPattern: '^$|^[a-zA-Z0-9]+$',
            description:
                'Optional - Provide the API Gateway REST API Root Resource ID to use an existing one. REST API Root Resource ID can be obtained from a describe call on your REST API.',
            default: ''
        });

        this.feedbackEnabled = new cdk.CfnParameter(stack, 'FeedbackEnabled', {
            type: 'String',
            description: 'If set to No, the deployed use case stack will not have access to the feedback feature.',
            allowedValues: ['Yes', 'No'],
            allowedPattern: '^Yes|No$',
            default: 'No'
        });

        this.multimodalEnabled = new cdk.CfnParameter(stack, 'MultimodalEnabled', {
            type: 'String',
            description: 'If set to Yes, the deployed use case stack will have access to multimodal functionality. This functionality is only enabled for Agentcore-based AgentBuilder and Workflow usecases.',
            allowedValues: ['Yes', 'No'],
            allowedPattern: '^Yes|No$',
            default: 'No'
        });

        this.existingMultimodalDataMetadataTable = new cdk.CfnParameter(stack, 'ExistingMultimodalDataMetadataTable', {
            type: 'String',
            description: 'Existing multimodal data metadata table name which contains references of the files in S3',
            default: '',
            constraintDescription: 'Must be a valid DynamoDB table name or empty string'
        });

        this.existingMultimodalDataBucket = new cdk.CfnParameter(stack, 'ExistingMultimodalDataBucket', {
            type: 'String',
            description: 'Existing multimodal data bucket name which stores the multimodal data files',
            default: '',
            constraintDescription: 'Must be a valid S3 bucket name or empty string'
        });

        this.stackDeploymentSource = new cdk.CfnParameter(stack, 'StackDeploymentSource', {
            type: 'String',
            description:
                'The source of the creation of this stack - standalone usecase or a deployment using the deployment dashboard.',
            default: 'StandaloneUseCase',
            allowedValues: ['UseCase', 'StandaloneUseCase']
        }).valueAsString as StackDeploymentSource;

        this.provisionedConcurrencyValue = new cdk.CfnParameter(stack, 'ProvisionedConcurrencyValue', {
            type: 'Number',
            description:
                'Provisioned concurrency value for Lambda functions. Set to 0 to disable provisioned concurrency.',
            default: 0,
            minValue: 0,
            maxValue: 5
        });

        const existingParameterGroups =
            this.cfnStack.templateOptions.metadata !== undefined &&
                Object.hasOwn(this.cfnStack.templateOptions.metadata, 'AWS::CloudFormation::Interface') &&
                this.cfnStack.templateOptions.metadata['AWS::CloudFormation::Interface'].ParameterGroups !== undefined
                ? this.cfnStack.templateOptions.metadata['AWS::CloudFormation::Interface'].ParameterGroups
                : [];

        existingParameterGroups.unshift({
            Label: { default: 'Please provide identity configuration to setup Amazon Cognito for the use case' },
            Parameters: [
                this.defaultUserEmail.logicalId,
                this.existingCognitoUserPoolId.logicalId,
                this.cognitoUserPoolClientDomain.logicalId,
                this.existingUserPoolClientId.logicalId,
                this.existingCognitoGroupPolicyTableName.logicalId
            ]
        });

        existingParameterGroups.unshift({
            Label: { default: 'Please provide configuration for the use case' },
            Parameters: [
                this.useCaseUUID.logicalId,
                this.useCaseConfigRecordKey.logicalId,
                this.useCaseConfigTableName.logicalId,
                this.existingRestApiId.logicalId,
                this.feedbackEnabled.logicalId,
                this.multimodalEnabled.logicalId,
                this.existingMultimodalDataMetadataTable.logicalId,
                this.existingMultimodalDataBucket.logicalId,
                this.existingApiRootResourceId.logicalId
            ]
        });

        existingParameterGroups.unshift({
            Label: { default: 'Optional: Performance Optimization Configuration' },
            Parameters: [this.provisionedConcurrencyValue.logicalId]
        });

        // prettier-ignore
        new cdk.CfnRule(this.cfnStack, 'PolicyTableRequiredRule', { // NOSONAR - construct instantiation
            ruleCondition: cdk.Fn.conditionNot(
                cdk.Fn.conditionEquals(this.existingCognitoUserPoolId.valueAsString, '')
            ),
            assertions: [
                {
                    assert: cdk.Fn.conditionNot(
                        cdk.Fn.conditionEquals(this.existingCognitoGroupPolicyTableName.valueAsString, '')
                    ),
                    assertDescription:
                        'When providing an ExistingCognitoUserPoolId ExistingCognitoGroupPolicyTableName must also be provided.'
                }
            ]
        });

        // prettier-ignore
        new cdk.CfnRule(this.cfnStack, 'ExistingUserPoolRequiredRule', { // NOSONAR - construct instantiation
            ruleCondition: cdk.Fn.conditionNot(
                cdk.Fn.conditionEquals(this.existingCognitoGroupPolicyTableName.valueAsString, '')
            ),
            assertions: [
                {
                    assert: cdk.Fn.conditionNot(
                        cdk.Fn.conditionEquals(this.existingCognitoUserPoolId.valueAsString, '')
                    ),
                    assertDescription:
                        'When providing an ExistingCognitoGroupPolicyTableName ExistingCognitoUserPoolId must also be provided.'
                }
            ]
        });

        new cdk.CfnRule(this.cfnStack, 'UserPoolClientProvidedWithEmptyUserPoolId', {
            ruleCondition: cdk.Fn.conditionNot(cdk.Fn.conditionEquals(this.existingUserPoolClientId.valueAsString, '')),
            assertions: [
                {
                    assert: cdk.Fn.conditionNot(
                        cdk.Fn.conditionEquals(this.existingCognitoUserPoolId.valueAsString, '')
                    ),
                    assertDescription:
                        'When providing an ExistingUserPoolClientId ExistingCognitoUserPoolId must also be provided.'
                }
            ]
        });

        /**
         * The rule is to check if user pool id is not provided and only add a custom prefix. The template does not mutate existing
         * resources and hence will not create a domain if the user pool already exists
         */
        new cdk.CfnRule(stack, 'CheckIfUserPoolIsEmptyForDomainPrefix', {
            ruleCondition: cdk.Fn.conditionNot(
                cdk.Fn.conditionEquals(this.cognitoUserPoolClientDomain.valueAsString, '')
            ),
            assertions: [
                {
                    assert: cdk.Fn.conditionNot(
                        cdk.Fn.conditionEquals(this.existingCognitoUserPoolId.valueAsString, '')
                    ),
                    assertDescription:
                        "When providing UserPoolDomainPrefix, user pool id should not be empty. Provide the existing user pool's domain prefix"
                }
            ]
        });

        new cdk.CfnCondition(this.cfnStack, 'MultimodalEnabledCondition', {
            expression: cdk.Fn.conditionEquals(this.multimodalEnabled.valueAsString, 'Yes')
        });

        const multimodalBucketProvided = new cdk.CfnCondition(this.cfnStack, 'MultimodalBucketProvided', {
            expression: cdk.Fn.conditionNot(cdk.Fn.conditionEquals(this.existingMultimodalDataBucket.valueAsString, ''))
        });

        const multimodalTableProvided = new cdk.CfnCondition(this.cfnStack, 'MultimodalTableProvided', {
            expression: cdk.Fn.conditionNot(
                cdk.Fn.conditionEquals(this.existingMultimodalDataMetadataTable.valueAsString, '')
            )
        });

        new cdk.CfnCondition(this.cfnStack, 'MultimodalDataProvidedCondition', {
            expression: cdk.Fn.conditionAnd(multimodalBucketProvided, multimodalTableProvided)
        });

        // If multimodal is enabled, both existing resources must be provided together or both must be empty
        new cdk.CfnRule(this.cfnStack, 'ValidateMultimodalResourcesConfiguration', {
            ruleCondition: cdk.Fn.conditionEquals(this.multimodalEnabled.valueAsString, 'Yes'),
            assertions: [
                {
                    assert: cdk.Fn.conditionOr(
                        // Both are provided
                        cdk.Fn.conditionAnd(
                            cdk.Fn.conditionNot(
                                cdk.Fn.conditionEquals(this.existingMultimodalDataBucket.valueAsString, '')
                            ),
                            cdk.Fn.conditionNot(
                                cdk.Fn.conditionEquals(this.existingMultimodalDataMetadataTable.valueAsString, '')
                            )
                        ),
                        // Both are empty
                        cdk.Fn.conditionAnd(
                            cdk.Fn.conditionEquals(this.existingMultimodalDataBucket.valueAsString, ''),
                            cdk.Fn.conditionEquals(this.existingMultimodalDataMetadataTable.valueAsString, '')
                        )
                    ),
                    assertDescription:
                        'When multimodal functionality is enabled, both multimodal data bucket and metadata table must be provided together, or both must be empty to create new resources'
                }
            ]
        });

        // If existing multimodal resources are provided, multimodal must be enabled
        new cdk.CfnRule(this.cfnStack, 'ValidateMultimodalEnabledWithResources', {
            ruleCondition: cdk.Fn.conditionAnd(
                cdk.Fn.conditionNot(cdk.Fn.conditionEquals(this.existingMultimodalDataBucket.valueAsString, '')),
                cdk.Fn.conditionNot(cdk.Fn.conditionEquals(this.existingMultimodalDataMetadataTable.valueAsString, ''))
            ),
            assertions: [
                {
                    assert: cdk.Fn.conditionEquals(this.multimodalEnabled.valueAsString, 'Yes'),
                    assertDescription:
                        'When existing multimodal data bucket and metadata table are provided, multimodal functionality must be enabled (MultimodalEnabled=Yes)'
                }
            ]
        });
    }
}

/**
 * Abstract class containing the generic chat stack resource creation. Providers will implement their own child of this class, implementing llmProviderSetup
 */
export abstract class UseCaseStack extends BaseStack {
    /**
     * Construct creating the cloudfront distribution assets in a nested stack.
     */
    public uiDistribution: UIDistribution;

    /**
     * Construct creating the custom resource to copy assets in a nested stack.
     */
    public copyAssetsStack: CopyUIAssets;

    /**
     * The name of the chat provider lambda to be deployed
     */
    public chatLlmProviderLambdaName: string;

    /**
     * Responsible for API integration and creation of cognito resources
     */
    public requestProcessor: WebsocketRequestProcessor;

    /**
     * Lambda function backing the websocket API which will interact with the LLM
     */
    public chatLlmProviderLambda: lambda.Function;

    /**
     * Alias for the chat Lambda function (always created for consistent behavior)
     */
    public chatLlmProviderAlias: lambda.Alias;

    /**
     * The Rest Endpoint for the use case
     */
    public useCaseRestEndpointSetup: UseCaseRestEndpointSetup;

    /**
     * Multimodal setup construct for handling multimodal data functionality when standalone mode is enabled
     */
    protected multimodalSetup: MultimodalSetup;

    /**
     * Multimodal data metadata table - available when multimodal is enabled
     */
    protected multimodalDataMetadataTable?: dynamodb.ITable;

    /**
     * Multimodal data bucket - available when multimodal is enabled
     */
    protected multimodalDataBucket?: s3.IBucket;

    /**
     * Condition that determines if new API resources should be created (for standalone mode)
     */
    protected createApiResourcesCondition: cdk.CfnCondition;

    /**
     * Condition that determines if multimodal functionality is enabled
     */
    protected multimodalEnabledCondition: cdk.CfnCondition;

    /**
     * Condition that determines if new multimodal resources should be created
     */
    protected createMultimodalResourcesCondition: cdk.CfnCondition;

    constructor(scope: Construct, id: string, props: BaseStackProps) {
        super(scope, id, props);
    }

    protected getWebSocketRoutes(): Map<string, lambda.Function | lambda.Alias> {
        throw new Error('Constructs inheriting this stack should be providing their implementation');
    }

    /**
     * Method to create lambda version and alias with optional provisioned concurrency
     */
    protected setupLambdaVersioning(props: BaseStackProps): void {
        const provisionedConcurrencyCondition = new cdk.CfnCondition(this, 'ProvisionedConcurrencyCondition', {
            expression: cdk.Fn.conditionNot(
                cdk.Fn.conditionEquals(this.stackParameters.provisionedConcurrencyValue.valueAsNumber, 0)
            )
        });

        // Custom resource to create Lambda version on every Create/Update
        const versionGenerator = new cdk.CfnResource(this, 'LambdaVersionGenerator', {
            type: 'Custom::LambdaVersion',
            properties: {
                ServiceToken: this.applicationSetup.customResourceLambda.functionArn,
                Resource: 'LAMBDA_VERSION_GENERATOR',
                FunctionName: this.chatLlmProviderLambda.functionName,
                Triggers: {
                    UseCaseConfigTrigger: this.stackParameters.useCaseConfigRecordKey.valueAsString
                }
            }
        });

        // Retain the custom resource on stack deletion to prevent errors during rollback scenarios
        versionGenerator.cfnOptions.deletionPolicy = cdk.CfnDeletionPolicy.RETAIN;

        const version = lambda.Version.fromVersionAttributes(this, 'ChatLambdaVersion', {
            lambda: this.chatLlmProviderLambda,
            version: versionGenerator.getAtt('VersionNumber').toString()
        });

        this.chatLlmProviderAlias = new lambda.Alias(this, 'ChatLambdaAlias', {
            aliasName: 'live',
            version: version,
            description: 'Alias for chat Lambda function'
        });

        // Only add provisioned concurrency when condition is met
        const cfnAlias = this.chatLlmProviderAlias.node.defaultChild as lambda.CfnAlias;
        cfnAlias.provisionedConcurrencyConfig = cdk.Fn.conditionIf(
            provisionedConcurrencyCondition.logicalId,
            {
                ProvisionedConcurrentExecutions: this.stackParameters.provisionedConcurrencyValue.valueAsNumber
            },
            cdk.Aws.NO_VALUE
        );
    }

    /**
     * Method to create additional resources as required by the stack
     *
     * @param props
     */
    protected withAdditionalResourceSetup(props: BaseStackProps) {
        super.withAdditionalResourceSetup(props);
        new cdk.CfnMapping(this, 'Solution', {
            mapping: {
                Data: {
                    ID: props.solutionID,
                    Version: props.solutionVersion,
                    SolutionName: props.solutionName,
                    UseCaseName: UseCaseNames.CHAT
                }
            }
        });

        // prettier-ignore
        new cdk.CfnMapping(this, 'FeaturesToDeploy', {
            mapping: {
                Deploy: {
                    CustomDashboard: 'Yes'
                }
            }
        });

        // internal users will have the internal GenAI usage policy displayed in the UI, where internal users are identified by being of the form "X@amazon.Y"
        // Note that if this stack is deployed by the deployment management dashboard, the config will also contain
        // a value for IsInternalUser, and if either that value or this is true, the use case will be flagged.
        const isInternalUserCondition: cdk.CfnCondition = new cdk.CfnCondition(this, 'IsInternalUserCondition', {
            expression: cdk.Fn.conditionEquals(
                cdk.Fn.select(
                    0,
                    cdk.Fn.split(
                        '.',
                        cdk.Fn.select(
                            1,
                            cdk.Fn.split(
                                '@',
                                cdk.Fn.join('', [this.stackParameters.defaultUserEmail.valueAsString, '@example.com'])
                            )
                        )
                    )
                ),
                INTERNAL_EMAIL_DOMAIN
            )
        });

        this.llmProviderSetup();

        // Lambda version policy for publishing Lambda versions
        const lambdaVersionPolicy = new iam.Policy(this, 'LambdaVersionPolicy', {
            statements: [
                new iam.PolicyStatement({
                    effect: iam.Effect.ALLOW,
                    actions: ['lambda:PublishVersion'],
                    resources: [`arn:${cdk.Aws.PARTITION}:lambda:${cdk.Aws.REGION}:${cdk.Aws.ACCOUNT_ID}:function:*`]
                })
            ]
        });
        lambdaVersionPolicy.attachToRole(this.applicationSetup.customResourceRole);

        // CFN Nag suppression: Wildcard resource required to avoid timing issues, attempting to scope to specific function ARNs results in access denied errors during deployment
        NagSuppressions.addResourceSuppressions(lambdaVersionPolicy, [
            {
                id: 'AwsSolutions-IAM5',
                reason: 'Lambda version policy requires wildcard permissions to publish versions for use case Lambda functions',
                appliesTo: [
                    'Resource::arn:<AWS::Partition>:lambda:<AWS::Region>:<AWS::AccountId>:function:*'
                ]
            }
        ]);

        this.setupLambdaVersioning(props);

        // setup lambda logs retention policy
        createCustomResourceForLambdaLogRetention(
            this,
            'ChatLambdaLogRetention',
            this.chatLlmProviderLambda.functionName,
            this.applicationSetup.customResourceLambda.functionArn
        );
        // With the previous call, the assumption is that `this.chatLlmProviderLambda` has a valid instance object associated with it.
        createVpcConfigForLambda(
            this.chatLlmProviderLambda,
            this.vpcEnabledCondition,
            this.transpiredPrivateSubnetIds,
            this.transpiredSecurityGroupIds
        );

        const uiInfrastructureBuilder = new UIInfrastructureBuilder({
            uiAssetFolder: UIAssetFolders.CHAT,
            deployWebApp: this.deployWebApp.valueAsString
        });

        this.uiDistribution = uiInfrastructureBuilder.createDistribution(this, 'WebApp', {
            parameters: {
                CustomResourceLambdaArn: this.applicationSetup.customResourceLambda.functionArn,
                CustomResourceRoleArn: this.applicationSetup.customResourceLambda.role!.roleArn,
                AccessLoggingBucketArn: this.applicationSetup.accessLoggingBucket.bucketArn,
                UseCaseUUID: this.stackParameters.useCaseShortId
            },
            description: `Nested stack that deploys UI components that include an S3 bucket for web assets and a CloudFront distribution - Version ${props.solutionVersion}`
        });

        this.requestProcessor = new WebsocketRequestProcessor(this, 'WebsocketRequestProcessor', {
            applicationTrademarkName: props.applicationTrademarkName,
            defaultUserEmail: this.stackParameters.defaultUserEmail.valueAsString,
            existingCognitoUserPoolId: this.stackParameters.existingCognitoUserPoolId.valueAsString,
            existingCognitoGroupPolicyTableName: this.stackParameters.existingCognitoGroupPolicyTableName.valueAsString,
            customResourceLambda: this.applicationSetup.customResourceLambda,
            useCaseUUID: this.stackParameters.useCaseShortId,
            cognitoDomainPrefix: this.stackParameters.cognitoUserPoolClientDomain.valueAsString,
            existingCognitoUserPoolClientId: this.stackParameters.existingUserPoolClientId.valueAsString,
            cloudFrontUrl: uiInfrastructureBuilder.getCloudFrontUrlWithCondition(),
            deployWebApp: this.deployWebApp.valueAsString,
            lambdaRouteMapping: this.getWebSocketRoutes(),
            chatLlmProviderLambda: this.chatLlmProviderLambda,
            deployVPCCondition: this.vpcEnabledCondition,
            privateSubnetIds: this.transpiredPrivateSubnetIds,
            securityGroupIds: this.transpiredSecurityGroupIds
        });

        // Existing API was not provided and so a new API will be created.
        this.createApiResourcesCondition = new cdk.CfnCondition(this, 'CreateApiResourcesCondition', {
            expression: cdk.Fn.conditionOr(
                cdk.Fn.conditionEquals(this.stackParameters.existingRestApiId, ''),
                cdk.Fn.conditionEquals(this.stackParameters.existingApiRootResourceId, '')
            )
        });

        this.useCaseRestEndpointSetup = new UseCaseRestEndpointSetup(this, 'UseCaseEndpointSetup', {
            stackDeploymentSource: this.stackParameters.stackDeploymentSource,
            // Existing API resources
            existingApiId: this.stackParameters.existingRestApiId,
            existingApiRootResourceId: this.stackParameters.existingApiRootResourceId,
            // Resources to create a new authorizer if new APIGw has to be created
            userPoolId: this.requestProcessor.userPool.userPoolId,
            userPoolClientId: this.requestProcessor.userPoolClient.userPoolClientId,
            cognitoGroupPolicyTable: this.requestProcessor.cognitoSetup.getCognitoGroupPolicyTable(this),
            userPoolGroupName: this.requestProcessor.cognitoSetup.userPoolGroup.groupName,
            // additional inputs for creating resources
            llmConfigTable: this.stackParameters.useCaseConfigTableName.valueAsString,
            createApiResourcesCondition: this.createApiResourcesCondition,
            customResourceLambda: this.applicationSetup.customResourceLambda,
            deployVPCCondition: this.vpcEnabledCondition,
            privateSubnetIds: this.transpiredPrivateSubnetIds,
            securityGroupIds: this.transpiredSecurityGroupIds
        });

        const feedbackEnabledCondition = new cdk.CfnCondition(this, 'CreateFeedbackResources', {
            expression: cdk.Fn.conditionAnd(
                // FeedbackEnabled was provided as 'Yes' and a new API was created for this use case type
                cdk.Fn.conditionEquals(this.stackParameters.feedbackEnabled, 'Yes'),
                this.createApiResourcesCondition
            )
        });

        // Add feedback based API routes backed by the Feedback Lambda
        const feedbackSetupStack = new FeedbackSetupStack(this, 'FeedbackSetupStack', {
            parameters: {
                ExistingPrivateSubnetIds: this.transpiredPrivateSubnetIds,
                ExistingSecurityGroupIds: this.transpiredSecurityGroupIds,
                CustomResourceLambdaArn: this.applicationSetup.customResourceLambda.functionArn,
                CustomResourceRoleArn: this.applicationSetup.customResourceRole.roleArn,
                AccessLoggingBucketArn: this.applicationSetup.accessLoggingBucket.bucketArn,
                FeedbackEnabled: this.stackParameters.feedbackEnabled.valueAsString,
                ExistingRestApiId: this.stackParameters.existingRestApiId,
                ExistingApiRootResourceId: this.stackParameters.existingApiRootResourceId,
                StackDeploymentSource: this.stackParameters.stackDeploymentSource
            },
            restApi: this.useCaseRestEndpointSetup.restApi as api.RestApi,
            methodOptions: this.useCaseRestEndpointSetup.methodOptions,
            dlq: this.useCaseRestEndpointSetup.dlq,
            description: `Nested Stack that creates the Feedback Resources - Version ${props.solutionVersion}`
        });

        (feedbackSetupStack.node.defaultChild as cdk.CfnResource).cfnOptions.condition = feedbackEnabledCondition;
        feedbackSetupStack.feedbackAPILambda.addEnvironment(
            USE_CASE_CONFIG_TABLE_NAME_ENV_VAR,
            this.stackParameters.useCaseConfigTableName.valueAsString
        );
        feedbackSetupStack.feedbackAPILambda.addToRolePolicy(
            new iam.PolicyStatement({
                effect: iam.Effect.ALLOW,
                actions: ['dynamodb:GetItem', 'dynamodb:Query'],
                resources: [
                    dynamodb.Table.fromTableName(
                        this,
                        'LLMConfigTable',
                        this.stackParameters.useCaseConfigTableName.valueAsString
                    ).tableArn
                ]
            })
        );

        const multimodalDataProvidedCondition = this.node.findChild(
            'MultimodalDataProvidedCondition'
        ) as cdk.CfnCondition;

        this.multimodalEnabledCondition = this.node.findChild('MultimodalEnabledCondition') as cdk.CfnCondition;

        this.createMultimodalResourcesCondition = new cdk.CfnCondition(this, 'CreateMultimodalResourcesCondition', {
            expression: cdk.Fn.conditionAnd(
                this.multimodalEnabledCondition,
                cdk.Fn.conditionNot(multimodalDataProvidedCondition),
                this.createApiResourcesCondition
            )
        });

        this.multimodalSetup = new MultimodalSetup(this, 'MultimodalSetup', {
            restApi: this.useCaseRestEndpointSetup.restApi as api.RestApi,
            deploymentPlatformAuthorizer: this.useCaseRestEndpointSetup.authorizer as api.RequestAuthorizer,
            requestValidator: this.useCaseRestEndpointSetup.requestValidator as api.RequestValidator,
            dlq: this.useCaseRestEndpointSetup.dlq,
            deployVPCCondition: this.vpcEnabledCondition,
            privateSubnetIds: this.transpiredPrivateSubnetIds,
            securityGroupIds: this.transpiredSecurityGroupIds,
            customResourceLambdaArn: this.applicationSetup.customResourceLambda.functionArn,
            customResourceLambdaRoleArn: this.applicationSetup.customResourceRole.roleArn,
            accessLoggingS3Bucket: this.applicationSetup.accessLoggingBucket,
            stackSource: this.stackParameters.stackDeploymentSource
        });
        this.multimodalSetup.applyConditionToAllResources(this.createMultimodalResourcesCondition);

        // Set multimodal resource properties based on whether we're using existing resources or creating new ones
        // When CreateMultimodalResourcesCondition is true, use the newly created resources else  reference the existing resources
        this.multimodalDataMetadataTable = dynamodb.Table.fromTableName(
            this,
            'MultimodalDataMetadataTableRef',
            cdk.Fn.conditionIf(
                this.createMultimodalResourcesCondition.logicalId,
                this.multimodalSetup.multimodalDataMetadataTable.tableName,
                this.stackParameters.existingMultimodalDataMetadataTable.valueAsString
            ).toString()
        );

        this.multimodalDataBucket = s3.Bucket.fromBucketName(
            this,
            'MultimodalDataBucketRef',
            cdk.Fn.conditionIf(
                this.createMultimodalResourcesCondition.logicalId,
                this.multimodalSetup.multimodalDataBucket.bucketName,
                this.stackParameters.existingMultimodalDataBucket.valueAsString
            ).toString()
        );

        const webConfigSsmKey = `${WEB_CONFIG_PREFIX}/${this.stackParameters.useCaseShortId}`;
        this.applicationSetup.createWebConfigStorage(
            {
                websockApiEndpoint: this.requestProcessor.webSocketApi.apiEndpoint,
                userPoolId: this.requestProcessor.userPool.userPoolId,
                userPoolClientId: this.requestProcessor.userPoolClient.userPoolClientId,
                cognitoRedirectUrl: uiInfrastructureBuilder.getCloudFrontUrlWithCondition(),
                isInternalUserCondition: isInternalUserCondition,
                restApiEndpoint: `https://${this.useCaseRestEndpointSetup.restApi.restApiId}.execute-api.${cdk.Aws.REGION}.amazonaws.com/prod`,
                useCaseUUID: this.stackParameters.useCaseUUID.valueAsString,
                additionalProperties: {
                    SocketURL: `${this.requestProcessor.webSocketApi.apiEndpoint}/${this.requestProcessor.websocketApiStage.stageName}`,
                    SocketRoutes: Array.from(this.getWebSocketRoutes().keys()),
                    ModelProviderName: this.getLlmProviderName()
                },
                deployWebAppCondition: uiInfrastructureBuilder.deployWebAppCondition,
                useCaseConfigKey: this.stackParameters.useCaseConfigRecordKey.valueAsString
            },
            webConfigSsmKey
        );

        const useCasePolicyCustomResource = this.applicationSetup.createCognitoUserGroupPolicy(
            this.requestProcessor.cognitoSetup,
            this.applicationSetup.customResourceLambda,
            this.requestProcessor.webSocketApi,
            this.stackParameters.useCaseConfigRecordKey.valueAsString,
            this.useCaseRestEndpointSetup.restApi.restApiId,
            this.stackParameters.feedbackEnabled.valueAsString,
            this.stackParameters.useCaseUUID.valueAsString
        );

        // Prevents deletion of UseCase policies during updates due to Logical ID changes and old custom resource deletion occurring after new custom resource creation
        (useCasePolicyCustomResource.node.defaultChild as cdk.CfnResource).overrideLogicalId(
            'WebsocketRequestProcessorCognitoUseCaseGroupPolicyCBC41F18'
        );

        const redeployRestApiCustomResource = this.useCaseRestEndpointSetup.redeployRestApi(
            this.applicationSetup.customResourceLambda,
            this.useCaseRestEndpointSetup.restApi.restApiId,
            'Details',
            this.useCaseRestEndpointSetup.detailsGETMethod
        );

        (redeployRestApiCustomResource.node.defaultChild as cdk.CfnResource).cfnOptions.condition =
            this.createApiResourcesCondition;

        const redeployRestApiCustomResourceFeedback = this.useCaseRestEndpointSetup.redeployRestApi(
            this.applicationSetup.customResourceLambda,
            this.useCaseRestEndpointSetup.restApi.restApiId,
            'Feedback',
            feedbackSetupStack.feedbackPOSTMethod
        );

        (redeployRestApiCustomResourceFeedback.node.defaultChild as cdk.CfnResource).cfnOptions.condition =
            feedbackEnabledCondition;

        redeployRestApiCustomResourceFeedback.node.addDependency(feedbackSetupStack);

        const cloudwatchDashboard = this.applicationSetup.addCustomDashboard(
            {
                apiName: this.requestProcessor.webSocketApi.apiId,
                userPoolId: this.requestProcessor.userPool.userPoolId,
                userPoolClientId: this.requestProcessor.userPoolClient.userPoolClientId,
                useCaseUUID: this.stackParameters.useCaseUUID.valueAsString
            },
            DashboardType.UseCase
        );

        this.copyAssetsStack = uiInfrastructureBuilder.createUIAssetsCustomResource(this, 'CopyUICustomResource', {
            parameters: {
                CustomResourceRoleArn: this.applicationSetup.customResourceLambda.role!.roleArn,
                CustomResourceLambdaArn: this.applicationSetup.customResourceLambda.functionArn,
                WebCloudFrontDistributionId: this.uiDistribution.cloudFrontDistribution.distributionId,
                WebConfigKey: webConfigSsmKey,
                WebS3BucketArn: this.uiDistribution.websiteBucket.bucketArn,
                UseCaseConfigRecordKey: this.stackParameters.useCaseConfigRecordKey.valueAsString,
                UseCaseConfigTableName: this.stackParameters.useCaseConfigTableName.valueAsString,
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

        this.chatLlmProviderLambda.addEnvironment(USER_POOL_ID_ENV_VAR, this.requestProcessor.userPool.userPoolId);
        this.chatLlmProviderLambda.addEnvironment(
            CLIENT_ID_ENV_VAR,
            this.requestProcessor.userPoolClient.userPoolClientId
        );

        this.applicationSetup.scheduledMetricsLambda.addEnvironment(
            WEBSOCKET_API_ID_ENV_VAR,
            this.requestProcessor.webSocketApi.apiId
        );
        this.applicationSetup.scheduledMetricsLambda.addEnvironment(
            USER_POOL_ID_ENV_VAR,
            this.requestProcessor.userPool.userPoolId
        );
        this.applicationSetup.scheduledMetricsLambda.addEnvironment(
            CLIENT_ID_ENV_VAR,
            this.requestProcessor.userPoolClient.userPoolClientId
        );
        this.applicationSetup.scheduledMetricsLambda.addEnvironment(
            USE_CASE_UUID_ENV_VAR,
            this.stackParameters.useCaseUUID
        );
        this.applicationSetup.scheduledMetricsLambda.addEnvironment(
            FEEDBACK_ENABLED_ENV_VAR,
            this.stackParameters.feedbackEnabled
        );

        // Stack Outputs
        // prettier-ignore
        const cloudfrontUrlOutput = new cdk.CfnOutput(cdk.Stack.of(this), 'CloudFrontWebUrl', {
            value: `https://${this.uiDistribution.cloudFrontDistribution.domainName}`
        });
        cloudfrontUrlOutput.condition = uiInfrastructureBuilder.deployWebAppCondition;

        // prettier-ignore
        new cdk.CfnOutput(cdk.Stack.of(this), 'CognitoUserPoolId', {
            value: this.requestProcessor.userPool.userPoolId,
        });

        // prettier-ignore
        new cdk.CfnOutput(cdk.Stack.of(this), 'CognitoClientId', {
            value: this.requestProcessor.userPoolClient.userPoolClientId,
        });

        // prettier-ignore
        new cdk.CfnOutput(cdk.Stack.of(this), 'RestApiEndpoint', {
            description: 'The endpoint URL for the Rest API',
            value: `https://${this.useCaseRestEndpointSetup.restApi.restApiId}.execute-api.${cdk.Aws.REGION}.amazonaws.com/prod`
        });

        new cdk.CfnOutput(cdk.Stack.of(this), 'CloudwatchDashboardUrl', {
            value: `https://${cdk.Aws.REGION}.console.aws.amazon.com/cloudwatch/home?region=${cdk.Aws.REGION}#dashboards/dashboard/${cloudwatchDashboard.dashboardName}`
        });

        new cdk.CfnOutput(cdk.Stack.of(this), 'WebsocketEndpoint', {
            value: `${this.requestProcessor.webSocketApi.apiEndpoint}/${this.requestProcessor.websocketApiStage.stageName}`,
            description: 'Websocket API endpoint'
        });

        // Conditionally create multimodal outputs
        const multimodalBucketOutput = new cdk.CfnOutput(this, 'MultimodalDataBucketName', {
            value: cdk.Fn.conditionIf(
                this.createMultimodalResourcesCondition.logicalId,
                this.multimodalSetup.multimodalDataBucket.bucketName,
                this.stackParameters.existingMultimodalDataBucket.valueAsString
            ).toString(),
            description: 'S3 bucket for storing multimodal files'
        });
        multimodalBucketOutput.condition = this.multimodalEnabledCondition;

        const multimodalTableOutput = new cdk.CfnOutput(this, 'MultimodalDataMetadataTableName', {
            value: cdk.Fn.conditionIf(
                this.createMultimodalResourcesCondition.logicalId,
                this.multimodalSetup.multimodalDataMetadataTable.tableName,
                this.stackParameters.existingMultimodalDataMetadataTable.valueAsString
            ).toString(),
            description: 'DynamoDB table for storing multimodal files metadata'
        });
        multimodalTableOutput.condition = this.multimodalEnabledCondition;

        if (process.env.DIST_OUTPUT_BUCKET) {
            generateSourceCodeMapping(this, props.solutionName, props.solutionVersion);
            generateSourceCodeMapping(this.uiDistribution, props.solutionName, props.solutionVersion);
            generateSourceCodeMapping(this.copyAssetsStack, props.solutionName, props.solutionVersion);
        }
    }

    /**
     * Method to add metrics to the application stack
     *
     * @param props
     */
    protected withMetrics(props: BaseStackProps) {
        this.applicationSetup.addMetricsCustomLambda(props.solutionID, props.solutionVersion, {
            USE_CASE_CONFIG_RECORD_KEY: this.stackParameters.useCaseConfigRecordKey.valueAsString,
            USE_CASE_CONFIG_TABLE_NAME: this.stackParameters.useCaseConfigTableName.valueAsString,
            UUID: this.stackParameters.useCaseUUID,
            VPC_ENABLED: this.vpcEnabled.valueAsString,
            CREATE_VPC: this.createNewVpc.valueAsString
        });
        (
            this.applicationSetup.solutionHelper.node
                .tryFindChild('Data')
                ?.node.tryFindChild('Default') as cdk.CfnResource
        ).addDependency(
            this.applicationSetup.webConfigCustomResource.node.tryFindChild('Default') as cdk.CfnCustomResource
        );
    }

    /**
     * Abstract method to be implemented by the child class for each provider
     * Provisions the llm provider lambda, and sets it to member variable chatLlmProviderLambda
     */
    public abstract llmProviderSetup(): void;

    /**
     * Returns the name of the provider
     */
    public abstract getLlmProviderName(): CHAT_PROVIDERS;

    protected abstract setupVPC(): VPCSetup;

    protected initializeCfnParameters(): void {
        this.stackParameters = new UseCaseParameters(this);
    }

    /**
     * Define core setup of infrastructure resources like s3 logging bucket, custom resorce defintions
     * which are used by root and nested stacks. The root stack should invoke this method and then pass
     * the resources/ resource arns to the nested stack
     *
     * @param props
     * @returns
     */
    protected createApplicationSetup(props: BaseStackProps): ApplicationSetup {
        return new ApplicationSetup(this, 'UseCaseSetup', {
            solutionID: props.solutionID,
            solutionVersion: props.solutionVersion,
            useCaseUUID: this.stackParameters.useCaseShortId
        });
    }

    /**
     * Provides the correct environment variables and permissions to the llm provider lambda
     */
    protected setLlmProviderPermissions(): void {
        this.chatLlmProviderLambda.addEnvironment(
            USE_CASE_CONFIG_RECORD_KEY_ENV_VAR,
            this.stackParameters.useCaseConfigRecordKey.valueAsString
        );
        this.chatLlmProviderLambda.addEnvironment(
            USE_CASE_CONFIG_TABLE_NAME_ENV_VAR,
            this.stackParameters.useCaseConfigTableName.valueAsString
        );
        this.chatLlmProviderLambda.addToRolePolicy(
            new cdk.aws_iam.PolicyStatement({
                actions: ['dynamodb:GetItem', 'dynamodb:BatchGetItem', 'dynamodb:Query'],
                resources: [
                    `arn:${cdk.Aws.PARTITION}:dynamodb:${cdk.Aws.REGION}:${cdk.Aws.ACCOUNT_ID}:table/${this.stackParameters.useCaseConfigTableName.valueAsString}`
                ],
                conditions: {
                    'ForAllValues:StringEquals': {
                        'dynamodb:LeadingKeys': [this.stackParameters.useCaseConfigRecordKey.valueAsString]
                    }
                }
            })
        );

        // passing the UUID to be used in writing custom metrics
        this.chatLlmProviderLambda.addEnvironment(USE_CASE_UUID_ENV_VAR, this.stackParameters.useCaseShortId);

        NagSuppressions.addResourceSuppressions(
            this.chatLlmProviderLambda.role!.node.tryFindChild('DefaultPolicy') as iam.Policy,
            [
                {
                    id: 'AwsSolutions-IAM5',
                    reason: 'Needed by websocket endpoints',
                    appliesTo: [
                        'Resource::arn:<AWS::Partition>:execute-api:<AWS::Region>:<AWS::AccountId>:<WebsocketRequestProcessorWebSocketEndpointApiGatewayV2WebSocketToSqsWebSocketApiApiGatewayV2WebSocketToSqs015CCDDD>/*/*/@connections/*'
                    ]
                }
            ]
        );

        cfn_guard.addCfnSuppressRules(this.chatLlmProviderLambda, [
            {
                id: 'W89',
                reason: 'Use of VPC is not enforced. If VPC option is selected, this lambda will deploy in a VPC, hence VPC configuration is implemented using Conditions'
            },
            {
                id: 'W92',
                reason: 'The solution does not enforce reserved concurrency'
            }
        ]);

        cfn_guard.addCfnSuppressRules(this.chatLlmProviderLambda.role?.node.tryFindChild('Resource') as iam.CfnRole, [
            {
                id: 'F10',
                reason: 'The inline policy avoids a rare race condition between the lambda, Role and the policy resource creation.'
            }
        ]);
    }
}
