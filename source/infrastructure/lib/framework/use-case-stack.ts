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
import { Construct } from 'constructs';

import { LambdaToDynamoDB } from '@aws-solutions-constructs/aws-lambda-dynamodb';
import { NagSuppressions } from 'cdk-nag';
import { WebsocketRequestProcessor } from '../api/websocket-request-processor';
import { UserCaseUserPoolClientProps } from '../auth/use-case-cognito-setup';
import { ApplicationSetup } from '../framework/application-setup';
import { BaseStack, BaseStackProps } from '../framework/base-stack';
import { DashboardType } from '../metrics/custom-dashboard';
import { CopyUIAssets } from '../s3web/copy-ui-assets-nested-stack';
import { UIDistribution } from '../s3web/ui-distribution-nested-stack';
import { KnowledgeBaseSetup } from '../search/knowledge-base-setup';
import { ChatStorageSetup } from '../storage/chat-storage-setup';
import { UIInfrastructureBuilder } from '../ui/ui-infrastructure-builder';
import * as cfn_guard from '../utils/cfn-guard-suppressions';
import { createCustomResourceForLambdaLogRetention, generateSourceCodeMapping } from '../utils/common-utils';
import {
    BEDROCK_KNOWLEDGE_BASE_ID_ENV_VAR,
    CHAT_PROVIDERS,
    CLIENT_ID_ENV_VAR,
    CONVERSATION_TABLE_NAME_ENV_VAR,
    DEFAULT_KENDRA_EDITION,
    DEFAULT_KENDRA_QUERY_CAPACITY_UNITS,
    DEFAULT_KENDRA_STORAGE_CAPACITY_UNITS,
    DEFAULT_KNOWLEDGE_BASE_TYPE,
    DEFAULT_NEW_KENDRA_INDEX_NAME,
    DEFAULT_RAG_ENABLED_STATUS,
    EMAIL_REGEX_PATTERN,
    INTERNAL_EMAIL_DOMAIN,
    KENDRA_EDITIONS,
    KENDRA_INDEX_ID_ENV_VAR,
    KNOWLEDGE_BASE_TYPES,
    MAX_KENDRA_QUERY_CAPACITY_UNITS,
    MAX_KENDRA_STORAGE_CAPACITY_UNITS,
    MODEL_INFO_TABLE_NAME_ENV_VAR,
    PLACEHOLDER_EMAIL,
    SUPPORTED_KNOWLEDGE_BASE_TYPES,
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

export class UseCaseChatParameters {
    /**
     * Unique ID for this deployed use case within an application. Provided by the deployment platform if in use.
     */
    public readonly useCaseUUID: cdk.CfnParameter;

    /**
     * If set to 'false', the deployed use case stack will only interact with the LLM provider directly, and will not reference a knowledge base.
     */
    public readonly ragEnabled: cdk.CfnParameter;

    /**
     * RAG knowledge base type. Should only be set if ragEnabled is true;
     */
    public readonly knowledgeBaseType: cdk.CfnParameter;

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
     * ID of the bedrock knowledge base to use in a RAG use case. Cannot be provided if existingKendraIndexId or newKendraIndexName are provided.
     */
    public readonly bedrockKnowledgeBaseId: cdk.CfnParameter;

    /**
     * Name of the table that stores the configuration for a use case.
     */
    public readonly useCaseConfigTableName: cdk.CfnParameter;

    /**
     * Key corresponding of the record containing configurations required by the chat provider lambda at runtime. The record in the table should have a "key"
     * attribute matching this value, and a "config" attribute containing the desired config. This record will be populated by the deployment platform if in
     * use. For standalone deployments of this use-case, a manually created entry in the table defined in `UseCaseConfigTableName` is required.
     * Consult the implementation guide for more details.
     */
    public readonly useCaseConfigRecordKey: cdk.CfnParameter;

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
     * Cfn parameter for existing user pool client Id (App Client Id)
     */
    public readonly existingUserPoolClientId: cdk.CfnParameter;

    /**
     * Name of the table which stores info/defaults for models. If not provided (passed an empty string), the table will be created.
     */
    public readonly existingModelInfoTableName: cdk.CfnParameter;

    private cfnStack: cdk.Stack;

    constructor(stack: BaseStack) {
        this.cfnStack = cdk.Stack.of(stack);

        this.useCaseUUID = new cdk.CfnParameter(stack, 'UseCaseUUID', {
            type: 'String',
            description:
                'UUID to identify this deployed use case within an application. Please provide an 8 character long UUID. If you are editing the stack, do not modify the value (retain the value used during creating the stack). A different UUID when editing the stack will result in new AWS resource created and deleting the old ones',
            allowedPattern: '^[0-9a-fA-F]{8}$',
            maxLength: 8,
            constraintDescription: 'Please provide an 8 character long UUID'
        });

        this.ragEnabled = new cdk.CfnParameter(stack, 'RAGEnabled', {
            type: 'String',
            allowedValues: ['true', 'false'],
            default: DEFAULT_RAG_ENABLED_STATUS,
            description:
                'If set to "true", the deployed use case stack will use the specified knowledge base to provide RAG functionality. If set to false, the user interacts directly with the LLM.'
        });

        this.knowledgeBaseType = new cdk.CfnParameter(stack, 'KnowledgeBaseType', {
            type: 'String',
            allowedValues: SUPPORTED_KNOWLEDGE_BASE_TYPES,
            default: DEFAULT_KNOWLEDGE_BASE_TYPE,
            description: 'Knowledge base type to be used for RAG. Should only be set if RAGEnabled is true'
        });

        this.existingKendraIndexId = new cdk.CfnParameter(stack, 'ExistingKendraIndexId', {
            type: 'String',
            allowedPattern: '^$|^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$',
            description:
                'Index ID of an existing Kendra index to be used for the use case. If none is provided and KnowledgeBaseType is Kendra, a new index will be created for you.',
            default: ''
        });

        this.newKendraIndexName = new cdk.CfnParameter(stack, 'NewKendraIndexName', {
            type: 'String',
            allowedPattern: '^$|^[0-9a-zA-Z-]{1,64}$',
            maxLength: 64,
            description:
                'Name for the new Kendra index to be created for this use case. Only applies if ExistingKendraIndexId is not supplied.',
            default: DEFAULT_NEW_KENDRA_INDEX_NAME
        });

        this.newKendraQueryCapacityUnits = new cdk.CfnParameter(stack, 'NewKendraQueryCapacityUnits', {
            type: 'Number',
            description:
                'Additional query capacity units for the new Kendra index to be created for this use case. Only applies if ExistingKendraIndexId is not supplied. See: https://docs.aws.amazon.com/kendra/latest/APIReference/API_CapacityUnitsConfiguration.html',
            default: DEFAULT_KENDRA_QUERY_CAPACITY_UNITS,
            maxValue: MAX_KENDRA_QUERY_CAPACITY_UNITS,
            minValue: 0,
            constraintDescription: `Please provide a number between 0 and ${MAX_KENDRA_QUERY_CAPACITY_UNITS}`
        });

        this.newKendraStorageCapacityUnits = new cdk.CfnParameter(stack, 'NewKendraStorageCapacityUnits', {
            type: 'Number',
            description:
                'Additional storage capacity units for the new Kendra index to be created for this use case. Only applies if ExistingKendraIndexId is not supplied. See: https://docs.aws.amazon.com/kendra/latest/APIReference/API_CapacityUnitsConfiguration.html',
            default: DEFAULT_KENDRA_STORAGE_CAPACITY_UNITS,
            maxValue: MAX_KENDRA_STORAGE_CAPACITY_UNITS,
            minValue: 0,
            constraintDescription: `Please provide a number between 0 and ${MAX_KENDRA_STORAGE_CAPACITY_UNITS}`
        });

        this.newKendraIndexEdition = new cdk.CfnParameter(stack, 'NewKendraIndexEdition', {
            type: 'String',
            allowedValues: KENDRA_EDITIONS,
            description:
                'The edition of Kendra to use for the new Kendra index to be created for this use case. Only applies if ExistingKendraIndexId is not supplied. See: https://docs.aws.amazon.com/kendra/latest/dg/kendra-editions.html',
            default: DEFAULT_KENDRA_EDITION
        });

        this.bedrockKnowledgeBaseId = new cdk.CfnParameter(stack, 'BedrockKnowledgeBaseId', {
            type: 'String',
            allowedPattern: '^[0-9a-zA-Z]{0,10}$',
            description:
                'ID of the bedrock knowledge base to use in a RAG use case. Cannot be provided if ExistingKendraIndexId or NewKendraIndexName are provided.',
            default: ''
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

        this.existingUserPoolClientId = new cdk.CfnParameter(stack, 'ExistingCognitoUserPoolClient', {
            type: 'String',
            allowedPattern: '^$|^[a-z0-9]{3,128}$',
            maxLength: 128,
            description:
                'Optional - Provide a User Pool Client (App Client) to use an existing one. If not provided a new User Pool Client will be created. This parameter can only be provided if an existing User Pool Id is provided',
            default: ''
        });

        this.existingModelInfoTableName = new cdk.CfnParameter(stack, 'ExistingModelInfoTableName', {
            type: 'String',
            maxLength: 255,
            allowedPattern: '^$|^[a-zA-Z0-9_.-]{3,255}$',
            default: '',
            description: 'DynamoDB table name for the table which contains model info and defaults.'
        });

        this.createCfnParameterGroups(stack);
        this.setCfnParameterRules(stack);
    }

    private createCfnParameterGroups(stack: BaseStack) {
        const existingParameterGroups =
            this.cfnStack.templateOptions.metadata !== undefined &&
            Object.hasOwn(this.cfnStack.templateOptions.metadata, 'AWS::CloudFormation::Interface') &&
            this.cfnStack.templateOptions.metadata['AWS::CloudFormation::Interface'].ParameterGroups !== undefined
                ? this.cfnStack.templateOptions.metadata['AWS::CloudFormation::Interface'].ParameterGroups
                : [];

        existingParameterGroups.unshift({
            Label: {
                default:
                    'Please provide Bedrock knowledge base configuration if using RAG based architecture with Bedrock selected as your knowledge base type'
            },
            Parameters: [this.bedrockKnowledgeBaseId.logicalId]
        });

        existingParameterGroups.unshift({
            Label: {
                default:
                    'Please provide Kendra configuration if using RAG based architecture with Kendra selected as your knowledge base type'
            },
            Parameters: [
                this.existingKendraIndexId.logicalId,
                this.newKendraIndexName.logicalId,
                this.newKendraQueryCapacityUnits.logicalId,
                this.newKendraStorageCapacityUnits.logicalId,
                this.newKendraIndexEdition.logicalId
            ]
        });

        existingParameterGroups.unshift({
            Label: { default: 'Please provide RAG configuration if using RAG based architecture' },
            Parameters: [this.ragEnabled.logicalId, this.knowledgeBaseType.logicalId]
        });

        existingParameterGroups.unshift({
            Label: { default: 'Please provide identity configuration to setup Amazon Cognito for the use case' },
            Parameters: [
                this.defaultUserEmail.logicalId,
                this.existingCognitoUserPoolId.logicalId,
                stack.cognitoDomainPrefixParam.logicalId,
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
                this.existingModelInfoTableName.logicalId
            ]
        });
    }

    private setCfnParameterRules(stack: BaseStack) {
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

        const kendraKnowledgeBaseSelected = cdk.Fn.conditionAnd(
            cdk.Fn.conditionEquals(this.ragEnabled.valueAsString, 'true'),
            cdk.Fn.conditionEquals(this.knowledgeBaseType.valueAsString, KNOWLEDGE_BASE_TYPES.KENDRA)
        );
        // prettier-ignore
        new cdk.CfnRule(this.cfnStack, 'NoKendraParamsWhenNotSelectedRule', { // NOSONAR - construct instantiation
            ruleCondition: cdk.Fn.conditionNot(kendraKnowledgeBaseSelected),
            assertions: [
                {
                    assert: cdk.Fn.conditionAnd(
                        cdk.Fn.conditionEquals(this.existingKendraIndexId.valueAsString, ''),
                        cdk.Fn.conditionEquals(this.newKendraIndexName.valueAsString, DEFAULT_NEW_KENDRA_INDEX_NAME),
                        cdk.Fn.conditionEquals(this.newKendraQueryCapacityUnits.valueAsString, '0'),
                        cdk.Fn.conditionEquals(this.newKendraStorageCapacityUnits.valueAsString, '0'),
                        cdk.Fn.conditionEquals(this.newKendraIndexEdition.valueAsString, DEFAULT_KENDRA_EDITION)
                    ),
                    assertDescription: 'If RAG is not enabled or we are not using Kendra as a knowledge base, no Kendra resources can not be referenced or created.'
                }
            ]
        });
        const kendraRequiredParamsPresent = cdk.Fn.conditionOr(
            cdk.Fn.conditionNot(cdk.Fn.conditionEquals(this.existingKendraIndexId.valueAsString, '')),
            cdk.Fn.conditionNot(cdk.Fn.conditionEquals(this.newKendraIndexName.valueAsString, ''))
        );

        // prettier-ignore
        new cdk.CfnRule(this.cfnStack, 'KendraParamsPresentWhenSelectedRule', { // NOSONAR - construct instantiation
            ruleCondition: cdk.Fn.conditionAnd(
                cdk.Fn.conditionEquals(this.ragEnabled.valueAsString, 'true'),
                cdk.Fn.conditionEquals(this.knowledgeBaseType.valueAsString, KNOWLEDGE_BASE_TYPES.BEDROCK)
            ),
            assertions: [
                {
                    assert: kendraRequiredParamsPresent,
                    assertDescription:
                        'If using Kendra as a knowledge base, either ExistingKendraIndexId or NewKendraIndexName must be provided'
                }
            ]
        });

        const bedrockKnowledgeBaseSelected = cdk.Fn.conditionAnd(
            cdk.Fn.conditionEquals(this.ragEnabled.valueAsString, 'true'),
            cdk.Fn.conditionEquals(this.knowledgeBaseType.valueAsString, KNOWLEDGE_BASE_TYPES.BEDROCK)
        );
        // prettier-ignore
        new cdk.CfnRule(this.cfnStack, 'NoBedrockKnowledgeBaseParamsWhenNotSelectedRule', { // NOSONAR - construct instantiation
            ruleCondition: cdk.Fn.conditionNot(bedrockKnowledgeBaseSelected),
            assertions: [
                {
                    assert: cdk.Fn.conditionEquals(this.bedrockKnowledgeBaseId.valueAsString, ''),
                    assertDescription: 'If RAG is not enabled or we are not using Bedrock as a knowledge base, no Bedrock knowledge base can be referenced.'
                }
            ]
        });
        const bedrockRequiredParamsPresent = cdk.Fn.conditionNot(
            cdk.Fn.conditionEquals(this.bedrockKnowledgeBaseId.valueAsString, '')
        );
        // prettier-ignore
        new cdk.CfnRule(this.cfnStack, 'BedrockParamsPresentWhenSelectedRule', { // NOSONAR - construct instantiation
            ruleCondition: bedrockKnowledgeBaseSelected,
            assertions: [
                {
                    assert: bedrockRequiredParamsPresent,
                    assertDescription:
                        'If using Bedrock as a knowledge base, BedrockKnowledgeBaseId must be provided'
                }
            ]
        });

        /**
         * The rule is to check if user pool id is not provided and only add a custom prefix. The template does not mutate existing
         * resources and hence will not create a domain if the user pool already exists
         */
        new cdk.CfnRule(stack, 'CheckIfUserPoolIsEmptyForDomainPrefix', {
            ruleCondition: cdk.Fn.conditionNot(
                cdk.Fn.conditionEquals(stack.cognitoDomainPrefixParam.valueAsString, '')
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
     * Construct creating the cloudfront distribution assets in a nested stack.
     */
    public readonly uiDistribution: UIDistribution;

    /**
     * Construct creating the custom resource to copy assets in a nested stack.
     */
    public readonly copyAssetsStack: CopyUIAssets;

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
     * Condition to be used for setting up the model info table.
     */
    protected newModelInfoTableCondition: cdk.CfnCondition;

    /**
     * Stack parameters for use case stacks
     */
    protected declare stackParameters: UseCaseChatParameters;

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

        // connection to the model info table.
        this.newModelInfoTableCondition = new cdk.CfnCondition(this, 'NewModelInfoTableCondition', {
            expression: cdk.Fn.conditionEquals(this.stackParameters.existingModelInfoTableName, '')
        });

        // the nested stack for Kendra will only be deployed if the existing Kendra index ID is blank and we are deploying with RAG
        const deployKendraIndexCondition = new cdk.CfnCondition(this, 'DeployKendraIndexCondition', {
            expression: cdk.Fn.conditionAnd(
                ragEnabledCondition,
                cdk.Fn.conditionEquals(this.stackParameters.existingKendraIndexId.valueAsString, ''),
                cdk.Fn.conditionEquals(
                    this.stackParameters.knowledgeBaseType.valueAsString,
                    KNOWLEDGE_BASE_TYPES.KENDRA
                )
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
            customInfra: this.applicationSetup.customResourceLambda,
            ...this.baseStackProps
        });
        this.chatStorageSetup = new ChatStorageSetup(this, 'ChatStorageSetup', {
            useCaseUUID: this.stackParameters.useCaseUUID.valueAsString,
            existingModelInfoTableName: this.stackParameters.existingModelInfoTableName.valueAsString,
            newModelInfoTableCondition: this.newModelInfoTableCondition,
            customResourceLambda: this.applicationSetup.customResourceLambda,
            customResourceRole: this.applicationSetup.customResourceRole,
            ...this.baseStackProps
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
        this.setLlmProviderPermissions();
        this.setRagPermissions(ragEnabledCondition);

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
            chatProviderLambda: this.chatLlmProviderLambda,
            applicationTrademarkName: props.applicationTrademarkName,
            defaultUserEmail: this.stackParameters.defaultUserEmail.valueAsString,
            existingCognitoUserPoolId: this.stackParameters.existingCognitoUserPoolId.valueAsString,
            existingCognitoGroupPolicyTableName: this.stackParameters.existingCognitoGroupPolicyTableName.valueAsString,
            customResourceLambda: this.applicationSetup.customResourceLambda,
            useCaseUUID: this.stackParameters.useCaseUUID.valueAsString,
            cognitoDomainPrefix: this.cognitoDomainPrefixParam.valueAsString,
            existingCognitoUserPoolClientId: this.stackParameters.existingUserPoolClientId.valueAsString
        });

        this.requestProcessor.createUserPoolClient({
            callbackUrl: uiInfrastructureBuilder.getCloudFrontUrlWithCondition(),
            logoutUrl: uiInfrastructureBuilder.getCloudFrontUrlWithCondition(),
            existingCognitoUserPoolClientId: this.stackParameters.existingUserPoolClientId.valueAsString,
            deployWebAppCondition: uiInfrastructureBuilder.deployWebAppCondition
        } as UserCaseUserPoolClientProps);

        const webConfigSsmKey = `${WEB_CONFIG_PREFIX}/${this.stackParameters.useCaseUUID.valueAsString}`;
        this.applicationSetup.createWebConfigStorage(
            {
                apiEndpoint: this.requestProcessor.webSocketApi.apiEndpoint,
                userPoolId: this.requestProcessor.userPool.userPoolId,
                userPoolClientId: this.requestProcessor.userPoolClient.userPoolClientId,
                cognitoDomainPrefix: this.requestProcessor.getCognitoDomainName(),
                cognitoRedirectUrl: uiInfrastructureBuilder.getCloudFrontUrlWithCondition(),
                isInternalUserCondition: isInternalUserCondition,
                additionalProperties: {
                    SocketURL: `${this.requestProcessor.webSocketApi.apiEndpoint}/${this.requestProcessor.websocketApiStage.stageName}`,
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
                UseCaseConfigTableName: this.stackParameters.useCaseConfigTableName.valueAsString
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
        new cdk.CfnOutput(cdk.Stack.of(this), 'KendraIndexId', { // NOSONAR - construct instantiation
            value: this.knowledgeBaseSetup.kendraIndexId
        });

        // prettier-ignore
        new cdk.CfnOutput(cdk.Stack.of(this), 'CloudwatchDashboardUrl', { // NOSONAR - construct instantiation
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
            generateSourceCodeMapping(this.chatStorageSetup.chatStorage, props.solutionName, props.solutionVersion);
        }

        this.applicationSetup.addAnonymousMetricsCustomLambda(props.solutionID, props.solutionVersion, {
            NEW_KENDRA_INDEX_CREATED: cdk.Fn.conditionIf(deployKendraIndexCondition.logicalId, 'Yes', 'No'),
            ...(this.stackParameters.newKendraIndexEdition.valueAsString && {
                KENDRA_EDITION: this.stackParameters.newKendraIndexEdition.valueAsString
            }),
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
        super.initializeCfnParameters();
        this.stackParameters = new UseCaseChatParameters(this);
    }

    /**
     * Provides the correct environment variables and permissions to the llm provider lambda
     */
    private setLlmProviderPermissions(): void {
        // connection to the conversation memory
        // prettier-ignore
        new LambdaToDynamoDB(this, 'ChatProviderLambdaToConversationTable', { // NOSONAR - construct instantiation
            existingLambdaObj: this.chatLlmProviderLambda,
            existingTableObj: this.chatStorageSetup.chatStorage.conversationTable,
            tablePermissions: 'ReadWrite',
            tableEnvironmentVariableName: CONVERSATION_TABLE_NAME_ENV_VAR
        });

        const modelInfoTableName = cdk.Fn.conditionIf(
            this.newModelInfoTableCondition.logicalId,
            cdk.Fn.getAtt(
                this.chatStorageSetup.chatStorage.nestedStackResource!.logicalId,
                'Outputs.ModelInfoTableName'
            ),
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
                        'Resource::arn:<AWS::Partition>:execute-api:<AWS::Region>:<AWS::AccountId>:<WebsocketRequestProcessorWebSocketEndpointChatAPIBD50D997>/*/*/@connections/*'
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

    /**
     * Optionally provides the correct environment variables and permissions to the llm provider lambda for RAG
     */
    private setRagPermissions(ragEnabledCondition: cdk.CfnCondition): void {
        // connection to the Kendra knowledge base (optional). Must have RAG enabled and either a
        const kendraRagEnabledCondition = new cdk.CfnCondition(this, 'KendraRAGEnabledCondition', {
            expression: cdk.Fn.conditionAnd(
                ragEnabledCondition,
                cdk.Fn.conditionEquals(
                    this.stackParameters.knowledgeBaseType.valueAsString,
                    KNOWLEDGE_BASE_TYPES.KENDRA
                )
            )
        });
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
        (lambdaQueryKendraIndexPolicy.node.defaultChild as cdk.CfnResource).cfnOptions.condition =
            kendraRagEnabledCondition;
        lambdaQueryKendraIndexPolicy.attachToRole(this.chatLlmProviderLambda.role!);

        // connection to the bedrock knowledge base (optional)
        const bedrockRagEnabledCondition = new cdk.CfnCondition(this, 'BedrockRAGEnabledCondition', {
            expression: cdk.Fn.conditionAnd(
                ragEnabledCondition,
                cdk.Fn.conditionEquals(
                    this.stackParameters.knowledgeBaseType.valueAsString,
                    KNOWLEDGE_BASE_TYPES.BEDROCK
                )
            )
        });
        this.chatLlmProviderLambda.addEnvironment(
            BEDROCK_KNOWLEDGE_BASE_ID_ENV_VAR,
            this.stackParameters.bedrockKnowledgeBaseId.valueAsString
        );
        const lambdaQueryBedrockKnowledgeBasePolicy = new iam.Policy(this, 'LambdaQueryBedrockKnowledgeBasePolicy', {
            statements: [
                new iam.PolicyStatement({
                    effect: iam.Effect.ALLOW,
                    actions: ['bedrock:Retrieve'],
                    resources: [
                        `arn:${cdk.Aws.PARTITION}:bedrock:${cdk.Aws.REGION}:${cdk.Aws.ACCOUNT_ID}:knowledge-base/${this.stackParameters.bedrockKnowledgeBaseId.valueAsString}`
                    ]
                })
            ]
        });
        (lambdaQueryBedrockKnowledgeBasePolicy.node.defaultChild as cdk.CfnResource).cfnOptions.condition =
            bedrockRagEnabledCondition;
        lambdaQueryBedrockKnowledgeBasePolicy.attachToRole(this.chatLlmProviderLambda.role!);
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
