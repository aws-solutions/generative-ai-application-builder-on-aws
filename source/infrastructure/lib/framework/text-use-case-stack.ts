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
import { BaseStack, BaseStackProps } from '../framework/base-stack';
import { KnowledgeBaseSetup } from '../search/knowledge-base-setup';
import { ChatStorageSetup } from '../storage/chat-storage-setup';
import { generateSourceCodeMapping } from '../utils/common-utils';
import {
    BEDROCK_KNOWLEDGE_BASE_ID_ENV_VAR,
    CLIENT_ID_ENV_VAR,
    CONVERSATION_TABLE_NAME_ENV_VAR,
    DEFAULT_KENDRA_EDITION,
    DEFAULT_KENDRA_QUERY_CAPACITY_UNITS,
    DEFAULT_KENDRA_STORAGE_CAPACITY_UNITS,
    DEFAULT_KNOWLEDGE_BASE_TYPE,
    DEFAULT_NEW_KENDRA_INDEX_NAME,
    DEFAULT_RAG_ENABLED_STATUS,
    KENDRA_EDITIONS,
    KENDRA_INDEX_ID_ENV_VAR,
    KNOWLEDGE_BASE_TYPES,
    MAX_KENDRA_QUERY_CAPACITY_UNITS,
    MAX_KENDRA_STORAGE_CAPACITY_UNITS,
    MODEL_INFO_TABLE_NAME_ENV_VAR,
    SUPPORTED_KNOWLEDGE_BASE_TYPES,
    USER_POOL_ID_ENV_VAR,
    WEBSOCKET_API_ID_ENV_VAR
} from '../utils/constants';
import { UseCaseParameters, UseCaseStack } from './use-case-stack';

export class TextUseCaseParameters extends UseCaseParameters {
    /**
     * If set to 'false', the deployed use case stack will only interact with the LLM provider directly, and will not reference a knowledge base.
     */
    public ragEnabled: cdk.CfnParameter;

    /**
     * RAG knowledge base type. Should only be set if ragEnabled is true;
     */
    public knowledgeBaseType: cdk.CfnParameter;

    /**
     * Index ID of an existing Kendra index to be used for the use case. If none is provided, a new index will be created.
     */
    public existingKendraIndexId: cdk.CfnParameter;

    /**
     * Name for the new Kendra index to be created for this use case. Only applies if existingKendraIndexId is not supplied.
     */
    public newKendraIndexName: cdk.CfnParameter;

    /**
     * Additional query capacity units for the new Kendra index to be created for this use case. Only applies if existingKendraIndexId is not supplied.
     */
    public newKendraQueryCapacityUnits: cdk.CfnParameter;

    /**
     * Additional storage capacity units for the new Kendra index to be created for this use case. Only applies if existingKendraIndexId is not supplied.
     */
    public newKendraStorageCapacityUnits: cdk.CfnParameter;

    /**
     * The edition of Kendra to use for the new Kendra index to be created for this use case. Only applies if existingKendraIndexId is not supplied.
     */
    public newKendraIndexEdition: cdk.CfnParameter;

    /**
     * ID of the bedrock knowledge base to use in a RAG use case. Cannot be provided if existingKendraIndexId or newKendraIndexName are provided.
     */
    public bedrockKnowledgeBaseId: cdk.CfnParameter;

    /**
     * Name of the table which stores info/defaults for models. If not provided (passed an empty string), the table will be created.
     */
    public existingModelInfoTableName: cdk.CfnParameter;

    constructor(stack: BaseStack) {
        super(stack);
        this.withAdditionalCfnParameters(stack);
    }

    protected withAdditionalCfnParameters(stack: BaseStack) {
        super.withAdditionalCfnParameters(stack); // create cfn parameters that the parent stack provides.

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

        this.existingModelInfoTableName = new cdk.CfnParameter(stack, 'ExistingModelInfoTableName', {
            type: 'String',
            maxLength: 255,
            allowedPattern: '^$|^[a-zA-Z0-9_.-]{3,255}$',
            default: '',
            description: 'DynamoDB table name for the table which contains model info and defaults.'
        });
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
            Label: { default: 'Please provide configuration for the Model Info table' },
            Parameters: [this.existingModelInfoTableName.logicalId]
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
    }
}

/**
 * Abstract class containing the generic chat stack resource creation. Providers will implement their own child of this class, implementing llmProviderSetup
 */
export abstract class TextUseCase extends UseCaseStack {
    /**
     * Construct managing the chat storage nested stack
     */
    public chatStorageSetup: ChatStorageSetup;

    /**
     * Construct managing the knowledge base to be used by this chat use case.
     * Will conditionally either create a Kendra index or use an existing one.
     */
    public knowledgeBaseSetup: KnowledgeBaseSetup;

    /**
     * Condition to be used for setting up the model info table.
     */
    protected newModelInfoTableCondition: cdk.CfnCondition;

    protected kendraIndexCreatedCondition: cdk.ICfnRuleConditionExpression;

    constructor(scope: Construct, id: string, props: BaseStackProps) {
        super(scope, id, props);
    }

    /**
     * setting message route name for text use stacks. Any inheriting stacks can still
     * provide override implementation for it.
     *
     * @returns
     */
    protected getWebSocketRoutes(): Map<string, lambda.Function> {
        return new Map().set('sendMessage', this.chatLlmProviderLambda);
    }

    /**
     * Provision resources common for text use cases.
     *
     * @param props
     */
    protected withAdditionalResourceSetup(props: BaseStackProps) {
        // enabling or disabling RAG
        super.withAdditionalResourceSetup(props);
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

        this.knowledgeBaseSetup = new KnowledgeBaseSetup(this, 'KnowledgeBaseSetup', {
            useCaseUUID: this.stackParameters.useCaseUUID.valueAsString,
            existingKendraIndexId: this.stackParameters.existingKendraIndexId.valueAsString,
            newKendraIndexName: this.stackParameters.newKendraIndexName.valueAsString,
            newKendraQueryCapacityUnits: this.stackParameters.newKendraQueryCapacityUnits.valueAsNumber,
            newKendraStorageCapacityUnits: this.stackParameters.newKendraStorageCapacityUnits.valueAsNumber,
            newKendraIndexEdition: this.stackParameters.newKendraIndexEdition.valueAsString,
            deployKendraIndexCondition: deployKendraIndexCondition,
            customInfra: this.applicationSetup.customResourceLambda,
            accessLoggingBucket: this.applicationSetup.accessLoggingBucket,
            ...this.baseStackProps
        });

        this.chatStorageSetup = new ChatStorageSetup(this, 'ChatStorageSetup', {
            useCaseUUID: this.stackParameters.useCaseUUID.valueAsString,
            existingModelInfoTableName: this.stackParameters.existingModelInfoTableName.valueAsString,
            newModelInfoTableCondition: this.newModelInfoTableCondition,
            customResourceLambda: this.applicationSetup.customResourceLambda,
            customResourceRole: this.applicationSetup.customResourceRole,
            accessLoggingBucket: this.applicationSetup.accessLoggingBucket,
            ...this.baseStackProps
        });

        this.setRagPermissions(ragEnabledCondition);

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

        // Stack Outputs
        // prettier-ignore
        new cdk.CfnOutput(cdk.Stack.of(this), 'KendraIndexId', {
            value: this.knowledgeBaseSetup.kendraIndexId
        });

        if (process.env.DIST_OUTPUT_BUCKET) {
            generateSourceCodeMapping(this.chatStorageSetup.chatStorage, props.solutionName, props.solutionVersion);
        }

        this.kendraIndexCreatedCondition = cdk.Fn.conditionIf(deployKendraIndexCondition.logicalId, 'Yes', 'No');
    }

    protected withAnonymousMetrics(props: BaseStackProps) {
        this.applicationSetup.addAnonymousMetricsCustomLambda(props.solutionID, props.solutionVersion, {
            NEW_KENDRA_INDEX_CREATED: this.kendraIndexCreatedCondition,
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

    protected initializeCfnParameters(): void {
        this.stackParameters = new TextUseCaseParameters(this);
    }

    /**
     * Provides the correct environment variables and permissions to the llm provider lambda
     */
    protected setLlmProviderPermissions(): void {
        super.setLlmProviderPermissions();
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
}
