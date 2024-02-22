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
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import { Construct, IConstruct } from 'constructs';

import { LambdaToDynamoDB } from '@aws-solutions-constructs/aws-lambda-dynamodb';
import { NagSuppressions } from 'cdk-nag';
import { WebsocketRequestProcessor } from '../api/websocket-request-processor';
import { ApplicationSetup } from '../framework/application-setup';
import { BaseStack, BaseStackProps } from '../framework/base-stack';
import { DashboardType } from '../metrics/custom-dashboard';
import { KnowledgeBaseSetup } from '../search/knowledge-base-setup';
import { ChatStorageSetup } from '../storage/chat-storage-setup';
import { UIInfrastructure } from '../ui/ui-infrastructure';
import { generateSourceCodeMapping } from '../utils/common-utils';
import {
    CHAT_PROVIDERS,
    CLIENT_ID_ENV_VAR,
    CONVERSATION_TABLE_NAME_ENV_VAR,
    DEFAULT_KENDRA_EDITION,
    DEFAULT_KENDRA_QUERY_CAPACITY_UNITS,
    DEFAULT_KENDRA_STORAGE_CAPACITY_UNITS,
    DEFAULT_NEW_KENDRA_INDEX_NAME,
    DEFAULT_RAG_ENABLED_STATUS,
    EMAIL_REGEX_PATTERN,
    INTERNAL_EMAIL_DOMAIN,
    KENDRA_EDITIONS,
    KENDRA_INDEX_ID_ENV_VAR,
    LLM_PARAMETERS_SSM_KEY_ENV_VAR,
    MAX_KENDRA_QUERY_CAPACITY_UNITS,
    MAX_KENDRA_STORAGE_CAPACITY_UNITS,
    MODEL_INFO_TABLE_NAME_ENV_VAR,
    PLACEHOLDER_EMAIL,
    RAG_ENABLED_ENV_VAR,
    USER_POOL_ID_ENV_VAR,
    USE_CASE_UUID_ENV_VAR,
    UseCaseNames,
    WEBSOCKET_API_ID_ENV_VAR,
    WEB_CONFIG_PREFIX
} from '../utils/constants';
import { VPCSetup } from '../vpc/vpc-setup';
import { UIAssets } from './ui-asset';

export class UseCaseChatParameters {
    /**
     * This application sends data to 3rd party LLM parameters. You must explicitly consent to this in order to deploy the stack.
     */
    public readonly consentToDataLeavingAWS: cdk.CfnParameter;

    /**
     * Unique ID for this deployed use case within an application. Provided by the deployment platform if in use.
     */
    public readonly useCaseUUID: cdk.CfnParameter;

    /**
     * Name of secret in Secrets Manager holding the API key used by langchain to call the third party LLM provider
     */
    public readonly providerApiKeySecret: cdk.CfnParameter;

    /**
     * Index ID of an existing Kendra index to be used for the use case. If none is provided, a new index will be created.
     */
    public readonly existingKendraIndexId: cdk.CfnParameter;

    /**
     * Name for the new Kendra index to be created for this use case. Only applies if existingKendraIndexId is not supplied.
     */
    public readonly newKendraIndexName: cdk.CfnParameter;

    /**
     * Additional query capacity units for the new Kendra index to be created for this use case. Only applies if existingKendraIndexId is not supplied.
     */
    public readonly newKendraQueryCapacityUnits: cdk.CfnParameter;

    /**
     * Additional storage capacity units for the new Kendra index to be created for this use case. Only applies if existingKendraIndexId is not supplied.
     */
    public readonly newKendraStorageCapacityUnits: cdk.CfnParameter;

    /**
     * The edition of Kendra to use for the new Kendra index to be created for this use case. Only applies if existingKendraIndexId is not supplied.
     */
    public readonly newKendraIndexEdition: cdk.CfnParameter;

    /**
     * Name of the SSM parameter containing configurations required by the chat provider lambda at runtime. Parameter value is expected to be a JSON string.
     * The SSM parameter will be populated by the deployment platform if in use. For standalone deployments of this use-case, manual configuration is required.
     */
    public readonly chatConfigSSMParameterName: cdk.CfnParameter;

    /**
     * Email of the default user for this use case. A cognito user for this email will be created to access the use case.
     */
    public readonly defaultUserEmail: cdk.CfnParameter;

    /**
     * UserPoolId of an existing cognito user pool which this use case will be authenticated with.
     * Typically will be provided when deploying from the deployment platform, but can be omitted when deploying this use-case stack standalone.
     */
    public readonly existingCognitoUserPoolId: cdk.CfnParameter;

    /**
     * ARN of the DynamoDB table containing user group policies, used by the custom authorizer on this use-cases API.
     * Typically will be provided when deploying from the deployment platform, but can be omitted when deploying this use-case stack standalone.
     */
    public readonly existingCognitoGroupPolicyTableName: cdk.CfnParameter;

    /**
     * Name of the table which stores info/defaults for models. If not provided (passed an empty string), the table will be created.
     */
    public readonly existingModelInfoTableName: cdk.CfnParameter;

    /**
     * If set to 'false', the deployed use case stack will only interact with the LLM provider directly, and will not reference a knowledge base.
     */
    public readonly ragEnabled: cdk.CfnParameter;

    /**
     * Deploys UI, if set to 'Yes'
     */
    public readonly deployUI: cdk.CfnParameter;

    constructor(stack: IConstruct) {
        this.useCaseUUID = new cdk.CfnParameter(stack, 'UseCaseUUID', {
            type: 'String',
            description:
                'UUID to identify this deployed use case within an application. Please provide an 8 character long UUID. If you are editing the stack, do not modify the value (retain the value used during creating the stack). A different UUID when editing the stack will result in new AWS resource created and deleting the old ones',
            allowedPattern: '^[0-9a-fA-F]{8}$',
            maxLength: 8,
            constraintDescription: 'Please provide an 8 character long UUID'
        });

        this.existingKendraIndexId = new cdk.CfnParameter(stack, 'ExistingKendraIndexId', {
            type: 'String',
            allowedPattern: '^$|^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$',
            description:
                'Index ID of an existing Kendra index to be used for the use case. If none is provided, a new index will be created for you.',
            default: ''
        });

        this.newKendraIndexName = new cdk.CfnParameter(stack, 'NewKendraIndexName', {
            type: 'String',
            allowedPattern: '^$|^[0-9a-zA-Z-]{1,64}$',
            maxLength: 64,
            description:
                'Name for the new Kendra index to be created for this use case. Only applies if existingKendraIndexId is not supplied.',
            default: DEFAULT_NEW_KENDRA_INDEX_NAME
        });

        this.newKendraQueryCapacityUnits = new cdk.CfnParameter(stack, 'NewKendraQueryCapacityUnits', {
            type: 'Number',
            description:
                'Additional query capacity units for the new Kendra index to be created for this use case. Only applies if existingKendraIndexId is not supplied. See: https://docs.aws.amazon.com/kendra/latest/APIReference/API_CapacityUnitsConfiguration.html',
            default: DEFAULT_KENDRA_QUERY_CAPACITY_UNITS,
            maxValue: MAX_KENDRA_QUERY_CAPACITY_UNITS,
            minValue: 0,
            constraintDescription: `Please provide a number between 0 and ${MAX_KENDRA_QUERY_CAPACITY_UNITS}`
        });

        this.newKendraStorageCapacityUnits = new cdk.CfnParameter(stack, 'NewKendraStorageCapacityUnits', {
            type: 'Number',
            description:
                'Additional storage capacity units for the new Kendra index to be created for this use case. Only applies if existingKendraIndexId is not supplied. See: https://docs.aws.amazon.com/kendra/latest/APIReference/API_CapacityUnitsConfiguration.html',
            default: DEFAULT_KENDRA_STORAGE_CAPACITY_UNITS,
            maxValue: MAX_KENDRA_STORAGE_CAPACITY_UNITS,
            minValue: 0,
            constraintDescription: `Please provide a number between 0 and ${MAX_KENDRA_STORAGE_CAPACITY_UNITS}`
        });

        this.newKendraIndexEdition = new cdk.CfnParameter(stack, 'NewKendraIndexEdition', {
            type: 'String',
            allowedValues: KENDRA_EDITIONS,
            description:
                'The edition of Kendra to use for the new Kendra index to be created for this use case. Only applies if existingKendraIndexId is not supplied. See: https://docs.aws.amazon.com/kendra/latest/dg/kendra-editions.html',
            default: DEFAULT_KENDRA_EDITION
        });

        this.chatConfigSSMParameterName = new cdk.CfnParameter(stack, 'ChatConfigSSMParameterName', {
            type: 'String',
            allowedPattern: '^(\\/[^\\/ ]*)+\\/?$',
            maxLength: 63,
            description:
                'Name of the SSM parameter containing configurations required by the chat provider lambda at runtime. Parameter value is expected to be a JSON string. The SSM parameter will be populated by the deployment platform if in use. For standalone deployments of this use-case, manual configuration is required.'
        });

        this.defaultUserEmail = new cdk.CfnParameter(stack, 'DefaultUserEmail', {
            type: 'String',
            description:
                'Email of the default user for this use case. A cognito user for this email will be created to access the use case.',
            default: PLACEHOLDER_EMAIL,
            allowedPattern: EMAIL_REGEX_PATTERN,
            constraintDescription: 'Please provide a valid email'
        });

        this.existingCognitoUserPoolId = new cdk.CfnParameter(stack, 'ExistingCognitoUserPoolId', {
            type: 'String',
            allowedPattern: '^$|^[0-9a-zA-Z_-]{9,24}$',
            maxLength: 24,
            description:
                'UserPoolId of an existing cognito user pool which this use case will be authenticated with. Typically will be provided when deploying from the deployment platform, but can be omitted when deploying this use-case stack standalone.',
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

        this.existingModelInfoTableName = new cdk.CfnParameter(stack, 'ExistingModelInfoTableName', {
            type: 'String',
            maxLength: 255,
            allowedPattern: '^$|^[a-zA-Z0-9_.-]{3,255}$',
            default: '',
            description: 'DynamoDB table name for the table which contains model info and defaults.'
        });

        this.ragEnabled = new cdk.CfnParameter(stack, 'RAGEnabled', {
            type: 'String',
            allowedValues: ['true', 'false'],
            default: DEFAULT_RAG_ENABLED_STATUS,
            description:
                'If set to "true", the deployed use case stack will use the provided/created Kendra index to provide RAG functionality. If set to false, the user interacts directly with the LLM.'
        });

        this.deployUI = new cdk.CfnParameter(stack, 'DeployUI', {
            type: 'String',
            allowedValues: ['Yes', 'No'],
            default: 'Yes',
            description: 'Please select the option to deploy the front end UI for this deployment'
        });

        const cfnStack = cdk.Stack.of(stack);
        let existingParameterGroups =
            cfnStack.templateOptions.metadata !== undefined &&
            cfnStack.templateOptions.metadata.hasOwnProperty('AWS::CloudFormation::Interface') &&
            cfnStack.templateOptions.metadata['AWS::CloudFormation::Interface'].ParameterGroups !== undefined
                ? cfnStack.templateOptions.metadata['AWS::CloudFormation::Interface'].ParameterGroups
                : [];

        existingParameterGroups.unshift({
            Label: { default: 'Please provide Kendra configuration if using RAG based architecture' },
            Parameters: [
                this.ragEnabled.logicalId,
                this.existingKendraIndexId.logicalId,
                this.newKendraIndexName.logicalId,
                this.newKendraQueryCapacityUnits.logicalId,
                this.newKendraStorageCapacityUnits.logicalId,
                this.newKendraIndexEdition.logicalId
            ]
        });

        existingParameterGroups.unshift({
            Label: { default: 'Please provide configuration for the use case' },
            Parameters: [
                this.deployUI.logicalId,
                this.useCaseUUID.logicalId,
                this.chatConfigSSMParameterName.logicalId,
                this.existingModelInfoTableName.logicalId,
                this.defaultUserEmail.logicalId,
                this.existingCognitoUserPoolId.logicalId,
                this.existingCognitoGroupPolicyTableName.logicalId
            ]
        });

        // prettier-ignore
        new cdk.CfnRule(stack, 'PolicyTableRequiredRule', { // NOSONAR - construct instantiation
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
        new cdk.CfnRule(stack, 'ExistingUserPoolRequiredRule', { // NOSONAR - construct instantiation
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

        // prettier-ignore
        new cdk.CfnRule(stack, 'NoKendraWithoutRagRule', { // NOSONAR - construct instantiation
            ruleCondition: cdk.Fn.conditionEquals(this.ragEnabled.valueAsString, 'false'),
            assertions: [
                {
                    assert: cdk.Fn.conditionAnd(
                        cdk.Fn.conditionEquals(this.existingKendraIndexId.valueAsString, ''),
                        cdk.Fn.conditionEquals(this.newKendraIndexName.valueAsString, DEFAULT_NEW_KENDRA_INDEX_NAME),
                        cdk.Fn.conditionEquals(this.newKendraQueryCapacityUnits.valueAsString, '0'),
                        cdk.Fn.conditionEquals(this.newKendraStorageCapacityUnits.valueAsString, '0'),
                        cdk.Fn.conditionEquals(this.newKendraIndexEdition.valueAsString, DEFAULT_KENDRA_EDITION)
                    ),
                    assertDescription: 'If RAG is not enabled, no Kendra resources can be referenced or created.'
                }
            ]
        });
    }
}

/**
 * Abstract class containing the generic chat stack resource creation. Providers will implement their own child of this class, implementing llmProviderSetup
 */
export abstract class UseCaseChat extends BaseStack {
    /**
     * Construct managing the chat storage nested stack
     */
    public readonly chatStorageSetup: ChatStorageSetup;

    /**
     * Construct managing the knowledge base to be used by this chat use case.
     * Will conditionally either create a Kendra index or use an existing one.
     */
    public readonly knowledgeBaseSetup: KnowledgeBaseSetup;

    /**
     * Construct managing the optional deployment of the UI in a nested stack.
     */
    public readonly uiInfrastructure: UIInfrastructure;

    /**
     * The name of the chat provider lambda to be deployed
     */
    public readonly chatLlmProviderLambdaName: string;

    /**
     * Responsible for API integration and creation of cognito resources
     */
    public readonly requestProcessor: WebsocketRequestProcessor;

    /**
     * Lambda function backing the websocket API which will interact with the LLM
     */
    public chatLlmProviderLambda: lambda.Function;

    /**
     * Stack parameters for use case stacks
     */
    protected stackParameters: UseCaseChatParameters;

    constructor(scope: Construct, id: string, props: BaseStackProps) {
        super(scope, id, props);

        // unused as of now, should be for metrics
        // prettier-ignore
        new cdk.CfnMapping(this, 'Solution', { // NOSONAR - construct instantiation
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
        new cdk.CfnMapping(this, 'FeaturesToDeploy', { // NOSONAR - construct instantiation
            mapping: {
                Deploy: {
                    CustomDashboard: 'Yes'
                }
            }
        });

        // enabling or disabling RAG
        const ragEnabledCondition = new cdk.CfnCondition(this, 'RAGEnabledCondition', {
            expression: cdk.Fn.conditionEquals(this.stackParameters.ragEnabled, 'true')
        });

        // the nested stack for Kendra will only be deployed if the existing Kendra index ID is blank and we are deploying with RAG
        const deployKendraIndexCondition = new cdk.CfnCondition(this, 'DeployKendraIndexCondition', {
            expression: cdk.Fn.conditionAnd(
                cdk.Fn.conditionEquals(this.stackParameters.existingKendraIndexId.valueAsString, ''),
                ragEnabledCondition
            )
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

        this.knowledgeBaseSetup = new KnowledgeBaseSetup(this, 'KnowledgeBaseSetup', {
            useCaseUUID: this.stackParameters.useCaseUUID.valueAsString,
            existingKendraIndexId: this.stackParameters.existingKendraIndexId.valueAsString,
            newKendraIndexName: this.stackParameters.newKendraIndexName.valueAsString,
            newKendraQueryCapacityUnits: this.stackParameters.newKendraQueryCapacityUnits.valueAsNumber,
            newKendraStorageCapacityUnits: this.stackParameters.newKendraStorageCapacityUnits.valueAsNumber,
            newKendraIndexEdition: this.stackParameters.newKendraIndexEdition.valueAsString,
            deployKendraIndexCondition: deployKendraIndexCondition,
            customInfra: this.applicationSetup.customResourceLambda
        });

        this.chatStorageSetup = new ChatStorageSetup(this, 'ChatStorageSetup', {
            useCaseUUID: this.stackParameters.useCaseUUID.valueAsString,
            existingModelInfoTableName: this.stackParameters.existingModelInfoTableName.valueAsString,
            customResourceLambda: this.applicationSetup.customResourceLambda,
            customResourceRole: this.applicationSetup.customResourceRole
        });

        this.llmProviderSetup();
        this.createVpcConfigForLambda(this.chatLlmProviderLambda);
        this.setLlmProviderPermissions(ragEnabledCondition);

        this.requestProcessor = new WebsocketRequestProcessor(this, 'WebsocketRequestProcessor', {
            chatProviderLambda: this.chatLlmProviderLambda,
            applicationTrademarkName: props.applicationTrademarkName,
            defaultUserEmail: this.stackParameters.defaultUserEmail.valueAsString,
            existingCognitoUserPoolId: this.stackParameters.existingCognitoUserPoolId.valueAsString,
            existingCognitoGroupPolicyTableName: this.stackParameters.existingCognitoGroupPolicyTableName.valueAsString,
            customResourceLambda: this.applicationSetup.customResourceLambda,
            useCaseUUID: this.stackParameters.useCaseUUID.valueAsString
        });

        // Note: chatConfigSSMParameterName has a leading / included
        const webConfigSsmKey = `${WEB_CONFIG_PREFIX}${this.stackParameters.chatConfigSSMParameterName.valueAsString}`;
        this.applicationSetup.createWebConfigStorage(
            {
                apiEndpoint: this.requestProcessor.webSocketApi.apiEndpoint,
                userPoolId: this.requestProcessor.userPool.userPoolId,
                userPoolClientId: this.requestProcessor.userPoolClient.ref,
                additionalConfigurationSSMParameterName: this.stackParameters.chatConfigSSMParameterName.valueAsString,
                isInternalUserCondition: isInternalUserCondition,
                additionalProperties: {
                    SocketURL: `${this.requestProcessor.webSocketApi.apiEndpoint}/${this.requestProcessor.websocketApiStage.stageName}`,
                    ModelProviderName: this.getLlmProviderName()
                }
            },
            webConfigSsmKey
        );

        const cloudwatchDashboard = this.applicationSetup.addCustomDashboard(
            {
                apiName: this.requestProcessor.webSocketApi.apiId,
                userPoolId: this.requestProcessor.userPool.userPoolId,
                userPoolClientId: this.requestProcessor.userPoolClient.ref,
                useCaseUUID: this.stackParameters.useCaseUUID.valueAsString
            },
            DashboardType.UseCase
        );

        this.uiInfrastructure = new UIInfrastructure(this, 'WebApp', {
            webRuntimeConfigKey: webConfigSsmKey,
            customInfra: this.applicationSetup.customResourceLambda,
            accessLoggingBucket: this.applicationSetup.accessLoggingBucket,
            uiAssetFolder: 'ui-chat',
            useCaseUUID: this.stackParameters.useCaseUUID.valueAsString,
            deployWebApp: this.stackParameters.deployUI.valueAsString
        });
        this.uiInfrastructure.nestedUIStack.node.defaultChild?.node.addDependency(
            this.applicationSetup.webConfigCustomResource
        );
        this.uiInfrastructure.nestedUIStack.node.defaultChild?.node.addDependency(
            this.applicationSetup.accessLoggingBucket.node
                .tryFindChild('Policy')
                ?.node.tryFindChild('Resource') as cdk.CfnResource
        );

        this.applicationSetup.scheduledMetricsLambda.addEnvironment(
            KENDRA_INDEX_ID_ENV_VAR,
            this.knowledgeBaseSetup.kendraIndexId
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
            this.requestProcessor.userPoolClient.ref
        );
        this.applicationSetup.scheduledMetricsLambda.addEnvironment(
            USE_CASE_UUID_ENV_VAR,
            this.stackParameters.useCaseUUID.valueAsString
        );

        // Stack Outputs

        // prettier-ignore
        const cloudfrontUrlOutput = new cdk.CfnOutput(cdk.Stack.of(this), 'CloudFrontWebUrl', {
            value: `https://${(this.uiInfrastructure.nestedUIStack as UIAssets).cloudFrontDistribution.domainName}`
        });
        cloudfrontUrlOutput.condition = this.uiInfrastructure.deployWebApp;

        // prettier-ignore
        new cdk.CfnOutput(cdk.Stack.of(this), 'KendraIndexId', { // NOSONAR - construct instantiation
            value: this.knowledgeBaseSetup.kendraIndexId
        });

        // prettier-ignore
        new cdk.CfnOutput(cdk.Stack.of(this), 'CloudwatchDashboardUrl', { // NOSONAR - construct instantiation
            value: `https://${cdk.Aws.REGION}.console.aws.amazon.com/cloudwatch/home?region=${cdk.Aws.REGION}#dashboards/dashboard/${cloudwatchDashboard.dashboardName}`
        });

        if (process.env.DIST_OUTPUT_BUCKET) {
            generateSourceCodeMapping(this, props.solutionName, props.solutionVersion);
            generateSourceCodeMapping(this.uiInfrastructure.nestedUIStack, props.solutionName, props.solutionVersion);
            generateSourceCodeMapping(this.chatStorageSetup.chatStorage, props.solutionName, props.solutionVersion);
        }

        this.applicationSetup.addAnonymousMetricsCustomLambda(props.solutionID, props.solutionVersion, {
            NEW_KENDRA_INDEX_CREATED: cdk.Fn.conditionIf(deployKendraIndexCondition.logicalId, 'Yes', 'No'),
            ...(this.stackParameters.newKendraIndexEdition.valueAsString && {
                KENDRA_EDITION: this.stackParameters.newKendraIndexEdition.valueAsString
            }),
            SSM_CONFIG_KEY: this.stackParameters.chatConfigSSMParameterName.valueAsString,
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
        this.stackParameters = new UseCaseChatParameters(cdk.Stack.of(this));
    }

    /**
     * Provides the correct environment variables and permissions to the llm provider lambda
     */
    private setLlmProviderPermissions(ragEnabledCondition: cdk.CfnCondition): void {
        this.chatLlmProviderLambda.addEnvironment(RAG_ENABLED_ENV_VAR, this.stackParameters.ragEnabled.valueAsString);

        // connection to the conversation memory
        // prettier-ignore
        new LambdaToDynamoDB(this, 'ChatProviderLambdaToConversationTable', { // NOSONAR - construct instantiation
            existingLambdaObj: this.chatLlmProviderLambda,
            existingTableObj: this.chatStorageSetup.chatStorage.conversationTable,
            tablePermissions: 'ReadWrite',
            tableEnvironmentVariableName: CONVERSATION_TABLE_NAME_ENV_VAR
        });

        // connection to the model info table.
        const newModelInfoTableCondition = new cdk.CfnCondition(this, 'NewModelInfoTableCondition', {
            expression: cdk.Fn.conditionEquals(this.stackParameters.existingModelInfoTableName, '')
        });
        const modelInfoTableName = cdk.Fn.conditionIf(
            newModelInfoTableCondition.logicalId,
            this.chatStorageSetup.chatStorage.modelInfoStorage.newModelInfoTableName,
            this.stackParameters.existingModelInfoTableName
        ).toString();
        const modelInfoTable = dynamodb.Table.fromTableName(this, 'ModelInfoTable', modelInfoTableName);
        // prettier-ignore
        new LambdaToDynamoDB(this, 'ChatProviderLambdaToModelInfoTable', { // NOSONAR - construct instantiation)
            existingLambdaObj: this.chatLlmProviderLambda,
            existingTableObj: modelInfoTable as dynamodb.Table,
            tablePermissions: 'Read',
            tableEnvironmentVariableName: MODEL_INFO_TABLE_NAME_ENV_VAR
        });

        // connection to the Kendra knowledge base (optional)
        this.chatLlmProviderLambda.addEnvironment(KENDRA_INDEX_ID_ENV_VAR, this.knowledgeBaseSetup.kendraIndexId);
        const lambdaQueryKendraIndexPolicy = new iam.Policy(this, 'LambdaQueryKendraIndexPolicy', {
            statements: [
                new iam.PolicyStatement({
                    effect: iam.Effect.ALLOW,
                    actions: ['kendra:Query', 'kendra:SubmitFeedback', 'kendra:Retrieve'],
                    resources: [
                        `arn:${cdk.Aws.PARTITION}:kendra:${cdk.Aws.REGION}:${cdk.Aws.ACCOUNT_ID}:index/${this.knowledgeBaseSetup.kendraIndexId}`
                    ]
                })
            ]
        });
        (lambdaQueryKendraIndexPolicy.node.defaultChild as cdk.CfnResource).cfnOptions.condition = ragEnabledCondition;
        lambdaQueryKendraIndexPolicy.attachToRole(this.chatLlmProviderLambda.role!);

        // connection to the chat config SSM parameter
        this.chatLlmProviderLambda.addEnvironment(
            LLM_PARAMETERS_SSM_KEY_ENV_VAR,
            this.stackParameters.chatConfigSSMParameterName.valueAsString
        );
        this.chatLlmProviderLambda.addToRolePolicy(
            new cdk.aws_iam.PolicyStatement({
                actions: ['ssm:DescribeParameters', 'ssm:GetParameter', 'ssm:GetParameterHistory', 'ssm:GetParameters'],
                resources: [
                    `arn:${cdk.Aws.PARTITION}:ssm:${cdk.Aws.REGION}:${cdk.Aws.ACCOUNT_ID}:parameter${this.stackParameters.chatConfigSSMParameterName.valueAsString}`
                ]
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
                        'Resource::arn:<AWS::Partition>:execute-api:<AWS::Region>:<AWS::AccountId>:<WebsocketRequestProcessorWebSocketEndpointChatAPIBD50D997>/*/*/@connections/*'
                    ]
                }
            ]
        );

        NagSuppressions.addResourceSuppressions(this.chatLlmProviderLambda, [
            {
                id: 'AwsSolutions-L1',
                reason: 'The lambda uses python 3.10'
            }
        ]);
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
}
