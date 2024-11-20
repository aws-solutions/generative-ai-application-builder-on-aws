#!/usr/bin/env node
/**********************************************************************************************************************
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.                                                *
 *                                                                                                                    *
 *  Licensed under the Apache License, Version 2.0 (the "License"). You may not use this file except in compliance    *
 *  with the License. A copy of the License is located at                                                             *
 *                                                                                                                    *
 *      http://www.apache.org/licenses/LICENSE-2.0                                                                    *
 *                                                                                                                    *
 *  or in the 'license' file accompanying this file. This file is distributed on an 'AS IS' BASIS, WITHOUT WARRANTIES *
 *  OR CONDITIONS OF ANY KIND, express or implied. See the License for the specific language governing permissions    *
 *  and limitations under the License.                                                                                *
 *********************************************************************************************************************/

import * as cdk from 'aws-cdk-lib';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import { Construct } from 'constructs';

import { NagSuppressions } from 'cdk-nag';
import { WebsocketRequestProcessor } from '../api/websocket-request-processor';
import { ApplicationSetup } from '../framework/application-setup';
import { BaseParameters, BaseStack, BaseStackProps } from '../framework/base-stack';
import { DashboardType } from '../metrics/custom-dashboard';
import { CopyUIAssets } from '../s3web/copy-ui-assets-nested-stack';
import { UIDistribution } from '../s3web/ui-distribution-nested-stack';
import { UIInfrastructureBuilder } from '../ui/ui-infrastructure-builder';
import * as cfn_guard from '../utils/cfn-guard-suppressions';
import { createCustomResourceForLambdaLogRetention, generateSourceCodeMapping } from '../utils/common-utils';
import {
    CHAT_PROVIDERS,
    CLIENT_ID_ENV_VAR,
    INTERNAL_EMAIL_DOMAIN,
    OPTIONAL_EMAIL_REGEX_PATTERN,
    PLACEHOLDER_EMAIL,
    UIAssetFolders,
    USER_POOL_ID_ENV_VAR,
    USE_CASE_CONFIG_RECORD_KEY_ENV_VAR,
    USE_CASE_CONFIG_TABLE_NAME_ENV_VAR,
    USE_CASE_UUID_ENV_VAR,
    UseCaseNames,
    WEBSOCKET_API_ID_ENV_VAR,
    WEB_CONFIG_PREFIX
} from '../utils/constants';
import { VPCSetup } from '../vpc/vpc-setup';

export class UseCaseParameters extends BaseParameters {
    /**
     * Unique ID for this deployed use case within an application. Provided by the deployment platform if in use.
     */
    public useCaseUUID: cdk.CfnParameter;

    /**
     * Name of the table that stores the configuration for a use case.
     */
    public useCaseConfigTableName: cdk.CfnParameter;

    /**
     * Key corresponding of the record containing configurations required by the chat provider lambda at runtime. The record in the table should have a "key"
     * attribute matching this value, and a "config" attribute containing the desired config. This record will be populated by the deployment platform if in
     * use. For standalone deployments of this use-case, a manually created entry in the table defined in `UseCaseConfigTableName` is required.
     * Consult the implementation guide for more details.
     */
    public useCaseConfigRecordKey: cdk.CfnParameter;

    /**
     * Email of the default user for this use case. A cognito user for this email will be created to access the use case.
     */
    public defaultUserEmail: cdk.CfnParameter;

    /**
     * UserPoolId of an existing cognito user pool which this use case will be authenticated with.
     * Typically will be provided when deploying from the deployment platform, but can be omitted when deploying this use-case stack standalone.
     */
    public existingCognitoUserPoolId: cdk.CfnParameter;

    /**
     * ARN of the DynamoDB table containing user group policies, used by the custom authorizer on this use-cases API.
     * Typically will be provided when deploying from the deployment platform, but can be omitted when deploying this use-case stack standalone.
     */
    public existingCognitoGroupPolicyTableName: cdk.CfnParameter;

    /**
     * Cfn parameter for existing user pool client Id (App Client Id)
     */
    public existingUserPoolClientId: cdk.CfnParameter;

    /**
     * Cfn parameter for existing websocket endpoint
     */
    public existingWebSocketEndpoint: cdk.CfnParameter;

    constructor(stack: BaseStack) {
        super(stack);
    }

    /**
     * This method allows adding additional cfn parameters to the stack
     *
     * @param stack
     */
    protected withAdditionalCfnParameters(stack: BaseStack) {
        this.useCaseUUID = new cdk.CfnParameter(stack, 'UseCaseUUID', {
            type: 'String',
            description:
                'UUID to identify this deployed use case within an application. Please provide an 8 character long UUID. If you are editing the stack, do not modify the value (retain the value used during creating the stack). A different UUID when editing the stack will result in new AWS resource created and deleting the old ones',
            allowedPattern: '^[0-9a-fA-F]{8}$',
            maxLength: 8,
            constraintDescription: 'Please provide an 8 character long UUID'
        });

        this.useCaseConfigTableName = new cdk.CfnParameter(stack, 'UseCaseConfigTableName', {
            type: 'String',
            maxLength: 255,
            allowedPattern: '^[a-zA-Z0-9_.-]{3,255}$',
            description: 'DynamoDB table name for the table which contains the configuration for this use case.',
            constraintDescription:
                'This parameter is required. The stack will read the configuration from this table to configure the resources during deployment'
        });

        this.useCaseConfigRecordKey = new cdk.CfnParameter(stack, 'UseCaseConfigRecordKey', {
            type: 'String',
            maxLength: 2048,
            description:
                'Key corresponding of the record containing configurations required by the chat provider lambda at runtime. The record in the table should have a "key" attribute matching this value, and a "config" attribute containing the desired config. This record will be populated by the deployment platform if in use. For standalone deployments of this use-case, a manually created entry in the table defined in `UseCaseConfigTableName` is required. Consult the implementation guide for more details.'
        });

        this.defaultUserEmail = new cdk.CfnParameter(stack, 'DefaultUserEmail', {
            type: 'String',
            description:
                'Email of the default user for this use case. A cognito user for this email will be created to access the use case.',
            default: PLACEHOLDER_EMAIL,
            allowedPattern: OPTIONAL_EMAIL_REGEX_PATTERN,
            constraintDescription: 'Please provide a valid email'
        });

        this.existingCognitoUserPoolId = new cdk.CfnParameter(stack, 'ExistingCognitoUserPoolId', {
            type: 'String',
            allowedPattern: '^$|^[0-9a-zA-Z_-]{9,24}$',
            maxLength: 24,
            description:
                'Optional - UserPoolId of an existing cognito user pool which this use case will be authenticated with. Typically will be provided when deploying from the deployment platform, but can be omitted when deploying this use-case stack standalone.',
            default: ''
        });

        this.existingCognitoGroupPolicyTableName = new cdk.CfnParameter(stack, 'ExistingCognitoGroupPolicyTableName', {
            type: 'String',
            allowedPattern: '^$|^[a-zA-Z0-9_.-]{3,255}$',
            maxLength: 255,
            description:
                'Name of the DynamoDB table containing user group policies, used by the custom authorizer on this use-cases API. Typically will be provided when deploying from the deployment platform, but can be omitted when deploying this use-case stack standalone.',
            default: ''
        });

        this.existingUserPoolClientId = new cdk.CfnParameter(stack, 'ExistingCognitoUserPoolClient', {
            type: 'String',
            allowedPattern: '^$|^[a-z0-9]{3,128}$',
            maxLength: 128,
            description:
                'Optional - Provide a User Pool Client (App Client) to use an existing one. If not provided a new User Pool Client will be created. This parameter can only be provided if an existing User Pool Id is provided',
            default: ''
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
                this.useCaseConfigTableName.logicalId
            ]
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

    constructor(scope: Construct, id: string, props: BaseStackProps) {
        super(scope, id, props);
    }

    protected getWebSocketRoutes(): Map<string, lambda.Function> {
        throw new Error('Constructs inheriting this stack should be providing their implementation');
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
                    SendAnonymousUsageData: 'Yes',
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
                        cdk.Fn.select(1, cdk.Fn.split('@', this.stackParameters.defaultUserEmail.valueAsString))
                    )
                ),
                INTERNAL_EMAIL_DOMAIN
            )
        });

        this.llmProviderSetup();
        // setup lambda logs retention policy
        createCustomResourceForLambdaLogRetention(
            this,
            'ChatLambdaLogRetention',
            this.chatLlmProviderLambda.functionName,
            this.applicationSetup.customResourceLambda.functionArn
        );
        // With the previous call, the assumption is that `this.chatLlmProviderLambda` has a valid instance object associated with it.
        this.createVpcConfigForLambda(this.chatLlmProviderLambda);

        const uiInfrastructureBuilder = new UIInfrastructureBuilder({
            uiAssetFolder: UIAssetFolders.CHAT,
            deployWebApp: this.deployWebApp.valueAsString
        });

        this.uiDistribution = uiInfrastructureBuilder.createDistribution(this, 'WebApp', {
            parameters: {
                CustomResourceLambdaArn: this.applicationSetup.customResourceLambda.functionArn,
                CustomResourceRoleArn: this.applicationSetup.customResourceLambda.role!.roleArn,
                AccessLoggingBucketArn: this.applicationSetup.accessLoggingBucket.bucketArn,
                UseCaseUUID: this.stackParameters.useCaseUUID.valueAsString
            },
            description: `Nested stack that deploys UI components that include an S3 bucket for web assets and a CloudFront distribution - Version ${props.solutionVersion}`
        });

        this.requestProcessor = new WebsocketRequestProcessor(this, 'WebsocketRequestProcessor', {
            applicationTrademarkName: props.applicationTrademarkName,
            defaultUserEmail: this.stackParameters.defaultUserEmail.valueAsString,
            existingCognitoUserPoolId: this.stackParameters.existingCognitoUserPoolId.valueAsString,
            existingCognitoGroupPolicyTableName: this.stackParameters.existingCognitoGroupPolicyTableName.valueAsString,
            customResourceLambda: this.applicationSetup.customResourceLambda,
            useCaseUUID: this.stackParameters.useCaseUUID.valueAsString,
            cognitoDomainPrefix: this.stackParameters.cognitoUserPoolClientDomain.valueAsString,
            existingCognitoUserPoolClientId: this.stackParameters.existingUserPoolClientId.valueAsString,
            cloudFrontUrl: uiInfrastructureBuilder.getCloudFrontUrlWithCondition(),
            deployWebApp: this.deployWebApp.valueAsString,
            lambdaRouteMapping: this.getWebSocketRoutes()
        });

        const webConfigSsmKey = `${WEB_CONFIG_PREFIX}/${this.stackParameters.useCaseUUID.valueAsString}`;
        this.applicationSetup.createWebConfigStorage(
            {
                apiEndpoint: this.requestProcessor.webSocketApi.apiEndpoint,
                userPoolId: this.requestProcessor.userPool.userPoolId,
                userPoolClientId: this.requestProcessor.userPoolClient.userPoolClientId,
                cognitoRedirectUrl: uiInfrastructureBuilder.getCloudFrontUrlWithCondition(),
                isInternalUserCondition: isInternalUserCondition,
                additionalProperties: {
                    SocketURL: `${this.requestProcessor.webSocketApi.apiEndpoint}/${this.requestProcessor.websocketApiStage.stageName}`,
                    SocketRoutes: Array.from(this.getWebSocketRoutes().keys()),
                    ModelProviderName: this.getLlmProviderName()
                },
                deployWebAppCondition: uiInfrastructureBuilder.deployWebAppCondition
            },
            webConfigSsmKey
        );

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
            this.stackParameters.useCaseUUID.valueAsString
        );

        // Stack Outputs
        // prettier-ignore
        const cloudfrontUrlOutput = new cdk.CfnOutput(cdk.Stack.of(this), 'CloudFrontWebUrl', {
            value: `https://${this.uiDistribution.cloudFrontDistribution.domainName}`
        });
        cloudfrontUrlOutput.condition = uiInfrastructureBuilder.deployWebAppCondition;

        // prettier-ignore
        new cdk.CfnOutput(cdk.Stack.of(this), 'CloudwatchDashboardUrl', {
            value: `https://${cdk.Aws.REGION}.console.aws.amazon.com/cloudwatch/home?region=${cdk.Aws.REGION}#dashboards/dashboard/${cloudwatchDashboard.dashboardName}`
        });

        new cdk.CfnOutput(cdk.Stack.of(this), 'WebsockEndpoint', {
            value: this.requestProcessor.webSocketApi.apiEndpoint,
            description: 'Websocket API endpoint'
        });

        if (process.env.DIST_OUTPUT_BUCKET) {
            generateSourceCodeMapping(this, props.solutionName, props.solutionVersion);
            generateSourceCodeMapping(this.uiDistribution, props.solutionName, props.solutionVersion);
            generateSourceCodeMapping(this.copyAssetsStack, props.solutionName, props.solutionVersion);
        }
    }

    /**
     * Method to add anonymous metrics to the application stack
     *
     * @param props
     */
    protected withAnonymousMetrics(props: BaseStackProps) {
        this.applicationSetup.addAnonymousMetricsCustomLambda(props.solutionID, props.solutionVersion, {
            USE_CASE_CONFIG_RECORD_KEY: this.stackParameters.useCaseConfigRecordKey.valueAsString,
            USE_CASE_CONFIG_TABLE_NAME: this.stackParameters.useCaseConfigTableName.valueAsString,
            UUID: this.stackParameters.useCaseUUID.valueAsString,
            VPC_ENABLED: this.vpcEnabled.valueAsString,
            CREATE_VPC: this.createNewVpc.valueAsString
        });
        (
            this.applicationSetup.solutionHelper.node
                .tryFindChild('AnonymousData')
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
            useCaseUUID: this.stackParameters.useCaseUUID.valueAsString
        });
    }

    /**
     * Method to add vpc configuration to lambda functions
     *
     * @param lambdaFunction
     */
    protected createVpcConfigForLambda(lambdaFunction: lambda.Function): void {
        if (lambdaFunction === undefined) {
            throw new Error('This method should be called after the lambda function is defined');
        }
        const cfnFunction = lambdaFunction.node.defaultChild as lambda.CfnFunction;
        cfnFunction.addPropertyOverride('VpcConfig', {
            'Fn::If': [
                this.vpcEnabledCondition.logicalId,
                {
                    SubnetIds: cdk.Fn.split(',', this.transpiredPrivateSubnetIds),
                    SecurityGroupIds: cdk.Fn.split(',', this.transpiredSecurityGroupIds)
                },
                cdk.Aws.NO_VALUE
            ]
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
        this.chatLlmProviderLambda.addEnvironment(
            USE_CASE_UUID_ENV_VAR,
            this.stackParameters.useCaseUUID.valueAsString
        );

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
