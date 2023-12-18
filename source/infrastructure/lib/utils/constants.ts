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

import * as lambda from 'aws-cdk-lib/aws-lambda';

export const THIRD_PARTY_LEGAL_DISCLAIMER =
    'Generative AI Application Builder on AWS allows you to build and deploy generative artificial intelligence (GAI) applications on AWS by engaging the GAI model of your choice, including third-party GAI models that you may choose to use that AWS does not own or otherwise have any control over (“Third-Party GAI Models”). Your use of the Third-Party GAI Models is governed by the terms provided to you by the Third-Party GAI Model providers when you acquired your license to use them (for example, their terms of service, license agreement, acceptable use policy, and privacy policy). You are responsible for ensuring that your use of the Third-Party GAI Models comply with the terms governing them, and any laws, rules, regulations, policies, or standards that apply to you. You are also responsible for making your own independent assessment of the Third-Party GAI Models that you use, including their outputs and how Third-Party GAI Model providers use any data that may be transmitted to them based on your deployment configuration. AWS does not make any representations, warranties, or guarantees regarding the Third-Party GAI Models, which are “Third-Party Content” under your agreement with AWS. Generative AI Application Builder on AWS is offered to you as “AWS Content” under your agreement with AWS.';

export const ANONYMOUS_METRICS_SCHEDULE = 'rate(1 hour)'; // runs every 1 hour

export const PLACEHOLDER_EMAIL = 'placeholder@example.com';
export const INTERNAL_EMAIL_DOMAIN = 'amazon';

export const LAMBDA_TIMEOUT_MINS = 15;
export const COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME: lambda.Runtime = lambda.Runtime.NODEJS_18_X;
export const GOV_CLOUD_REGION_LAMBDA_NODE_RUNTIME: lambda.Runtime = lambda.Runtime.NODEJS_18_X;
export const COMMERCIAL_REGION_LAMBDA_PYTHON_RUNTIME: lambda.Runtime = lambda.Runtime.PYTHON_3_11;
export const GOV_CLOUD_REGION_LAMBDA_PYTHON_RUNTIME: lambda.Runtime = lambda.Runtime.PYTHON_3_9;
export const COMMERCIAL_REGION_LAMBDA_JAVA_RUNTIME: lambda.Runtime = lambda.Runtime.JAVA_17;
export const GOV_CLOUD_REGION_LAMBDA_JAVA_RUNTIME: lambda.Runtime = lambda.Runtime.JAVA_11;
export const TYPESCRIPT = 'TypeScript';
export const SERVICE_NAME = 'UseCaseManagement';

export const PYTHON_PIP_BUILD_PLATFORM: string = 'manylinux2014_x86_64';
export const PYTHON_PIP_WHEEL_IMPLEMENTATION: string = 'cp';
export const PYTHON_VERSION: string = COMMERCIAL_REGION_LAMBDA_PYTHON_RUNTIME.name.replace('python', '');

export enum CloudWatchNamespace {
    API_GATEWAY = 'AWS/ApiGateway',
    COGNITO = 'AWS/Cognito',
    AWS_KENDRA = 'AWS/Kendra',
    LANGCHAIN_LLM = 'Langchain/LLM',
    USE_CASE_DEPLOYMENTS = 'Solution/UseCaseDeployments',
    COLD_STARTS = 'Solution/ColdStarts'
}

export enum CloudWatchMetrics {
    REST_ENDPOINT_TOTAL_HITS = 'Count',
    REST_ENDPOINT_CACHE_HITS = 'CacheHitCount',
    REST_ENDPOINT_CACHE_MISSES = 'CacheMissCount',
    REST_ENDPOINT_LATENCY = 'Latency',
    REST_ENDPOINT_INTEGRATION_LATENCY = 'IntegrationLatency',
    WEBSOCKET_CONNECTS = 'ConnectCount',
    WEBSOCKET_MESSAGES = 'MessageCount',
    WEBSOCKET_LATENCY = 'IntegrationLatency',
    WEBSOCKET_CLIENT_ERRORS = 'ClientError',
    WEBSOCKET_EXECUTION_ERRORS = 'ExecutionError',
    COGNITO_SIGN_IN_SUCCESSES = 'SignInSuccesses',
    COGNITO_SIGN_UP_SUCCESSES = 'SignUpSuccesses',
    LANGCHAIN_QUERY = 'LangchainQueries',
    LANGCHAIN_FAILURES = 'LangchainFailures',
    LANGCHAIN_QUERY_PROCESSING_TIME = 'LangchainQueryProcessingTime',
    INCORRECT_INPUT_FAILURES = 'IncorrectInputFailures',
    KENDRA_QUERY = 'KendraQueries',
    KENDRA_FETCHED_DOCUMENTS = 'KendraFetchedDocuments',
    KENDRA_QUERY_PROCESSING_TIME = 'KendraProcessingTime',
    KENDRA_FAILURES = 'KendraFailures',
    KENDRA_NO_HITS = 'KendraNoHits',
    UC_INITIATION_SUCCESS = 'UCInitiationSuccess',
    UC_INITIATION_FAILURE = 'UCInitiationFailure',
    UC_UPDATE_SUCCESS = 'UCUpdateSuccess',
    UC_UPDATE_FAILURE = 'UCUpdateFailure',
    UC_DELETION_SUCCESS = 'UCDeletionSuccess',
    UC_DELETION_FAILURE = 'UCDeletionFailure',
    UC_DESCRIBE_SUCCESS = 'UCDescribeSuccess',
    UC_DESCRIBE_FAILURE = 'UCDescribeFailure'
}

export const ADDITIONAL_LLM_LIBRARIES = 'AdditionalLLMLibraries';

/**
 * Layer types for LLM libraries that should be added to the Lambda function definition metadata.
 * This metadata is used to attach specific layer libraries as CDK Aspects.
 */
export enum LLM_LIBRARY_LAYER_TYPES {
    HUGGING_FACE_LIB_LAYER = 'HuggingFaceLibLayer',
    ANTHROPIC_LIB_LAYER = 'AnthropicLibLayer',
    LANGCHAIN_LIB_LAYER = 'LangChainLibLayer',
    BOTO3_LIB_LAYER = 'Boto3Layer'
}

export const EMAIL_REGEX_PATTERN = "^$|[A-Za-z0-9_!#$%&'*+/=?`{|}~^.-]+@[A-Za-z0-9.-]+$";

export enum UseCaseNames {
    CHAT = 'chat'
}

export enum KnowledgeBaseProviders {
    KENDRA = 'kendra'
}

export enum DynamoDBAttributes {
    CONVERSATION_TABLE_PARTITION_KEY = 'UserId',
    CONVERSATION_TABLE_SORT_KEY = 'ConversationId',
    SESSION_TABLE_PARTITION_KEY = 'UserId',
    SESSION_TABLE_SORT_KEY = 'SessionToken',
    USE_CASES_TABLE_PARTITION_KEY = 'UseCaseId',
    USE_CASES_TABLE_SECONDARY_INDEX_KEY = 'Status',
    TIME_TO_LIVE = 'TTL',
    COGNITO_TABLE_PARTITION_KEY = 'group'
}

// LLM related constants
export const enum CHAT_PROVIDERS {
    HUGGING_FACE = 'HuggingFace',
    ANTHROPIC = 'Anthropic',
    BEDROCK = 'Bedrock'
}
export const SUPPORTED_CHAT_PROVIDERS = [CHAT_PROVIDERS.HUGGING_FACE, CHAT_PROVIDERS.ANTHROPIC, CHAT_PROVIDERS.BEDROCK];

export const enum BEDROCK_MODEL_FAMILIES {
    AI21 = 'ai21',
    AMAZON = 'amazon',
    ANTHROPIC = 'anthropic',
    COHERE = 'cohere',
    META = 'meta'
}

export const SUPPORTED_BEDROCK_CHAT_MODELS = [
    `${BEDROCK_MODEL_FAMILIES.AI21}.j2-ultra`,
    `${BEDROCK_MODEL_FAMILIES.AI21}.j2-mid`,
    `${BEDROCK_MODEL_FAMILIES.AMAZON}.titan-text-express-v1`,
    `${BEDROCK_MODEL_FAMILIES.AMAZON}.titan-text-lite-v1`,
    `${BEDROCK_MODEL_FAMILIES.ANTHROPIC}.claude-v1`,
    `${BEDROCK_MODEL_FAMILIES.ANTHROPIC}.claude-v2`,
    `${BEDROCK_MODEL_FAMILIES.ANTHROPIC}.claude-v2:1`,
    `${BEDROCK_MODEL_FAMILIES.ANTHROPIC}.claude-instant-v1`,
    `${BEDROCK_MODEL_FAMILIES.COHERE}.command-text-v14`,
    `${BEDROCK_MODEL_FAMILIES.COHERE}.command-light-text-v14`,
    `${BEDROCK_MODEL_FAMILIES.META}.llama2-13b-chat-v1`,
    `${BEDROCK_MODEL_FAMILIES.META}.llama2-70b-chat-v1`
];

export const DEFAULT_HUGGINGFACE_TEMPERATURE = 1;
export const MIN_HUGGINGFACE_TEMPERATURE = 0;
export const MAX_HUGGINGFACE_TEMPERATURE = 100;

export const SUPPORTED_HUGGINGFACE_CHAT_MODELS = [
    'google/flan-t5-xxl',
    'google/flan-t5-xl',
    'google/flan-t5-large',
    'google/flan-t5-base',
    'google/flan-t5-small'
];

export const DEFAULT_CHAT_PROMPT = `{history}

{input}`;

export const DEFAULT_HUGGINGFACE_CHAT_PROMPT = DEFAULT_CHAT_PROMPT;
export const DEFAULT_HUGGINGFACE_RAG_PROMPT = `References:
{context}

Carefully read the reference passages above and try to truthfully answer the Human's question. If the answer is not explicitly contained within the references, respond with "Sorry I don't know". It is very important that you respond "Sorry I don't know" if the answer is not found within the references above. Do not make use of any information outside of the references. Try to be brief and write a response in no more than 5 complete sentences.

Current conversation:
{history}

Human: {input}
AI:`;

export const DEFAULT_META_CHAT_PROMPT = `[INST] ${DEFAULT_CHAT_PROMPT} [/INST]`;
export const DEFAULT_META_RAG_PROMPT = `[INST] ${DEFAULT_HUGGINGFACE_RAG_PROMPT} [/INST]`

export const SUPPORTED_ANTHROPIC_CHAT_MODELS = ['claude-instant-1', 'claude-1', 'claude-2'];
export const DEFAULT_ANTHROPIC_TEMPERATURE = 1;
export const MIN_ANTHROPIC_TEMPERATURE = 0;
export const MAX_ANTHROPIC_TEMPERATURE = 1;
// 2 newlines are required for Anthropic prompts before Human/Assistant dialogs. For reference, see: https://docs.anthropic.com/claude/docs/introduction-to-prompt-design
export const DEFAULT_ANTHROPIC_CHAT_PROMPT = `

Human: You are a friendly AI assistant that is helpful, honest, and harmless.

Here is the current conversation:
{history}

{input}

Assistant:`;

export const DEFAULT_ANTHROPIC_RAG_PROMPT = `

Human: You are a friendly AI assistant. You provide answers only based on the provided reference passages.

Here are reference passages in <references></references> tags:
<references>
{context}
</references>

Carefully read the references above and thoughtfully answer the question below. If the answer can not be extracted from the references, then respond with "Sorry I don't know". It is very important that you only use information found within the references to answer. Try to be brief in your response.

Here is the current chat history:
{history}

Question: {input}

Assistant:`;

export const DEFAULT_BEDROCK_AMAZON_PROMPT = DEFAULT_CHAT_PROMPT;
export const DEFAULT_BEDROCK_ANTHROPIC_PROMPT = DEFAULT_ANTHROPIC_CHAT_PROMPT;
export const DEFAULT_BEDROCK_AI21_PROMPT = DEFAULT_CHAT_PROMPT;
export const DEFAULT_BEDROCK_COHERE_PROMPT = DEFAULT_CHAT_PROMPT;
export const DEFAULT_BEDROCK_META_PROMPT = DEFAULT_META_CHAT_PROMPT;

export const DEFAULT_BEDROCK_AMAZON_RAG_PROMPT = `Instructions: You are an AI Assistant created to help answer the User's question. You are only to answer the User's question using the provided references. You are not allowed to make things up or use your own knowledge. Only use what is provided between the <references> XML tags.

Here are the only references you can use:
<references>
{context}
</references>

Given the references provided above, answer the User's question. If the answer is not explicitly in the provided references, respond with "Sorry, I don't know". It is very important that you say "Sorry, I don't know" if the answer isn't in the references. Take your time, think step by step, and do not make anything up.

{history}
User: {input}
Bot:`;
export const DEFAULT_BEDROCK_ANTHROPIC_RAG_PROMPT = DEFAULT_ANTHROPIC_RAG_PROMPT;
export const DEFAULT_BEDROCK_AI21_RAG_PROMPT = DEFAULT_HUGGINGFACE_RAG_PROMPT;
export const DEFAULT_BEDROCK_COHERE_RAG_PROMPT = DEFAULT_HUGGINGFACE_RAG_PROMPT;
export const DEFAULT_BEDROCK_META_RAG_PROMPT = DEFAULT_META_RAG_PROMPT;

export const DEFAULT_BEDROCK_ANTHROPIC_TEMPERATURE = DEFAULT_ANTHROPIC_TEMPERATURE;
export const MIN_BEDROCK_ANTHROPIC_TEMPERATURE = MIN_ANTHROPIC_TEMPERATURE;
export const MAX_BEDROCK_ANTHROPIC_TEMPERATURE = MAX_ANTHROPIC_TEMPERATURE;

export const DEFAULT_BEDROCK_AMAZON_TEMPERATURE = 0.5;
export const MIN_BEDROCK_AMAZON_TEMPERATURE = 0;
export const MAX_BEDROCK_AMAZON_TEMPERATURE = 1;

export const DEFAULT_BEDROCK_AI21_TEMPERATURE = 1;
export const MIN_BEDROCK_AI21_TEMPERATURE = 0;
export const MAX_BEDROCK_AI21_TEMPERATURE = 1;

export const DEFAULT_BEDROCK_COHERE_TEMPERATURE = 0.75;
export const MIN_BEDROCK_COHERE_TEMPERATURE = 0;
export const MAX_BEDROCK_COHERE_TEMPERATURE = 1;

export const DEFAULT_BEDROCK_META_TEMPERATURE = 0.5;
export const MIN_BEDROCK_META_TEMPERATURE = 0;
export const MAX_BEDROCK_META_TEMPERATURE = 1;

export const KENDRA_EDITIONS = ['DEVELOPER_EDITION', 'ENTERPRISE_EDITION'];
export const DEFAULT_KENDRA_EDITION = 'DEVELOPER_EDITION';

// Environment variables used for configuring lambdas
export const LLM_PARAMETERS_SSM_KEY_ENV_VAR = 'SSM_LLM_CONFIG_KEY';
export const LLM_PROVIDER_API_KEY_ENV_VAR = 'LLM_API_KEY_NAME';
export const CONVERSATION_TABLE_NAME_ENV_VAR = 'CONVERSATION_TABLE_NAME';
export const KENDRA_INDEX_ID_ENV_VAR = 'KENDRA_INDEX_ID';
export const COGNITO_POLICY_TABLE_ENV_VAR = 'COGNITO_POLICY_TABLE_NAME';
export const USER_POOL_ID_ENV_VAR = 'USER_POOL_ID';
export const CLIENT_ID_ENV_VAR = 'CLIENT_ID';
export const ARTIFACT_BUCKET_ENV_VAR = 'ARTIFACT_BUCKET_LOCATION';
export const ARTIFACT_KEY_PREFIX_ENV_VAR = 'ARTIFACT_KEY_PREFIX';
export const CFN_DEPLOY_ROLE_ARN_ENV_VAR = 'CFN_DEPLOY_ROLE_ARN';
export const POWERTOOLS_METRICS_NAMESPACE_ENV_VAR = 'POWERTOOLS_METRICS_NAMESPACE';
export const USE_CASE_CONFIG_SSM_PARAMETER_PREFIX_ENV_VAR = 'USE_CASE_CONFIG_SSM_PARAMETER_PREFIX';
export const USE_CASES_TABLE_NAME_ENV_VAR = 'USE_CASES_TABLE_NAME';
export const WEBCONFIG_SSM_KEY_ENV_VAR = 'WEBCONFIG_SSM_KEY';
export const RAG_ENABLED_ENV_VAR = 'RAG_ENABLED';
export const TEMPLATE_FILE_EXTN_ENV_VAR = 'TEMPLATE_FILE_EXTN';
export const USE_CASE_API_KEY_SUFFIX_ENV_VAR = 'API_KEY_SUFFIX';
export const USE_CASE_UUID_ENV_VAR = 'USE_CASE_UUID';
export const WEBSOCKET_API_ID_ENV_VAR = 'WEBSOCKET_API_ID';
export const REST_API_NAME_ENV_VAR = 'REST_API_NAME';
export const IS_INTERNAL_USER_ENV_VAR = 'IS_INTERNAL_USER';

// values defining defaults and requirements for parameters
export const DEFAULT_NEW_KENDRA_INDEX_NAME = 'GAABKnowledgeBaseIndex';
export const DEFAULT_KENDRA_QUERY_CAPACITY_UNITS = 0;
export const DEFAULT_KENDRA_STORAGE_CAPACITY_UNITS = 0;
export const MAX_KENDRA_QUERY_CAPACITY_UNITS = 1;
export const MAX_KENDRA_STORAGE_CAPACITY_UNITS = 5;
export const DEFAULT_KENDRA_NUMBER_OF_DOCS = 2;
export const MAX_KENDRA_NUMBER_OF_DOCS = 100;
export const MIN_KENDRA_NUMBER_OF_DOCS = 1;
export const MODEL_PARAM_TYPES = ['string', 'integer', 'float', 'boolean', 'list', 'dictionary'];

export enum UIAssetFolders {
    CHAT = 'ui-chat',
    DEPLOYMENT_PLATFORM = 'ui-deployment'
}

// Cloudwatch metrics namespace constants
export const USE_CASE_MANAGEMENT_NAMESPACE = 'UseCaseManagement';
export const USE_CASE_CONFIG_SSM_PARAMETER_PREFIX = '/gaab-ai/use-case-config';
export const WEB_CONFIG_PREFIX = '/gaab-webconfig';

// default rag enabled status
export const DEFAULT_RAG_ENABLED_STATUS = 'true';

export const additionalDeploymentPlatformConfigValues = {
    ModelProviders: {
        [CHAT_PROVIDERS.HUGGING_FACE]: {
            SupportedModels: SUPPORTED_HUGGINGFACE_CHAT_MODELS,
            AllowsStreaming: false,
            ModelProviderParams: {
                ChatPromptTemplate: DEFAULT_HUGGINGFACE_CHAT_PROMPT,
                RAGPromptTemplate: DEFAULT_HUGGINGFACE_RAG_PROMPT,
                DefaultTemperature: DEFAULT_HUGGINGFACE_TEMPERATURE,
                MinTemperature: MIN_HUGGINGFACE_TEMPERATURE,
                MaxTemperature: MAX_HUGGINGFACE_TEMPERATURE
            }
        },
        [CHAT_PROVIDERS.ANTHROPIC]: {
            SupportedModels: SUPPORTED_ANTHROPIC_CHAT_MODELS,
            AllowsStreaming: true,
            ModelProviderParams: {
                ChatPromptTemplate: DEFAULT_ANTHROPIC_CHAT_PROMPT,
                RAGPromptTemplate: DEFAULT_ANTHROPIC_RAG_PROMPT,
                DefaultTemperature: DEFAULT_ANTHROPIC_TEMPERATURE,
                MinTemperature: MIN_ANTHROPIC_TEMPERATURE,
                MaxTemperature: MAX_ANTHROPIC_TEMPERATURE
            }
        },
        [CHAT_PROVIDERS.BEDROCK]: {
            SupportedModels: SUPPORTED_BEDROCK_CHAT_MODELS,
            AllowsStreaming: true,
            ModelFamilyParams: {
                [BEDROCK_MODEL_FAMILIES.AI21]: {
                    ChatPromptTemplate: DEFAULT_BEDROCK_AI21_PROMPT,
                    RAGPromptTemplate: DEFAULT_BEDROCK_AI21_RAG_PROMPT,
                    DefaultTemperature: DEFAULT_BEDROCK_AI21_TEMPERATURE,
                    MinTemperature: MIN_BEDROCK_AI21_TEMPERATURE,
                    MaxTemperature: MAX_BEDROCK_AI21_TEMPERATURE
                },
                [BEDROCK_MODEL_FAMILIES.AMAZON]: {
                    ChatPromptTemplate: DEFAULT_BEDROCK_AMAZON_PROMPT,
                    RAGPromptTemplate: DEFAULT_BEDROCK_AMAZON_RAG_PROMPT,
                    DefaultTemperature: DEFAULT_BEDROCK_AMAZON_TEMPERATURE,
                    MinTemperature: MIN_BEDROCK_AMAZON_TEMPERATURE,
                    MaxTemperature: MAX_BEDROCK_AMAZON_TEMPERATURE
                },
                [BEDROCK_MODEL_FAMILIES.ANTHROPIC]: {
                    ChatPromptTemplate: DEFAULT_BEDROCK_ANTHROPIC_PROMPT,
                    RAGPromptTemplate: DEFAULT_BEDROCK_ANTHROPIC_RAG_PROMPT,
                    DefaultTemperature: DEFAULT_BEDROCK_ANTHROPIC_TEMPERATURE,
                    MinTemperature: MIN_BEDROCK_ANTHROPIC_TEMPERATURE,
                    MaxTemperature: MAX_BEDROCK_ANTHROPIC_TEMPERATURE
                },
                [BEDROCK_MODEL_FAMILIES.COHERE]: {
                    ChatPromptTemplate: DEFAULT_BEDROCK_COHERE_PROMPT,
                    RAGPromptTemplate: DEFAULT_BEDROCK_COHERE_RAG_PROMPT,
                    DefaultTemperature: DEFAULT_BEDROCK_COHERE_TEMPERATURE,
                    MinTemperature: MIN_BEDROCK_COHERE_TEMPERATURE,
                    MaxTemperature: MAX_BEDROCK_COHERE_TEMPERATURE
                },
                [BEDROCK_MODEL_FAMILIES.META]: {
                    ChatPromptTemplate: DEFAULT_BEDROCK_META_PROMPT,
                    RAGPromptTemplate: DEFAULT_BEDROCK_META_RAG_PROMPT,
                    DefaultTemperature: DEFAULT_BEDROCK_META_TEMPERATURE,
                    MinTemperature: MIN_BEDROCK_META_TEMPERATURE,
                    MaxTemperature: MAX_BEDROCK_META_TEMPERATURE
                }
            }
        }
    },
    KnowledgeBaseParams: {
        [KnowledgeBaseProviders.KENDRA]: {
            AvailableEditions: KENDRA_EDITIONS,
            DefaultEdition: DEFAULT_KENDRA_EDITION,
            DefaultNewKendraIndexName: DEFAULT_NEW_KENDRA_INDEX_NAME,
            DefaultQueryCapacityUnits: DEFAULT_KENDRA_QUERY_CAPACITY_UNITS,
            DefaultStorageCapacityUnits: DEFAULT_KENDRA_STORAGE_CAPACITY_UNITS,
            MaxQueryCapacityUnits: MAX_KENDRA_QUERY_CAPACITY_UNITS,
            MaxStorageCapacityUnits: MAX_KENDRA_STORAGE_CAPACITY_UNITS,
            DefaultNumberOfDocs: DEFAULT_KENDRA_NUMBER_OF_DOCS,
            MaxNumberOfDocs: MAX_KENDRA_NUMBER_OF_DOCS,
            MinNumberOfDocs: MIN_KENDRA_NUMBER_OF_DOCS
        }
    }
};

export const additionalChatUseCaseConfigValues = {
    [CHAT_PROVIDERS.HUGGING_FACE]: {
        ModelProviderName: CHAT_PROVIDERS.HUGGING_FACE,
        ...additionalDeploymentPlatformConfigValues.ModelProviders[CHAT_PROVIDERS.HUGGING_FACE]
    },
    [CHAT_PROVIDERS.ANTHROPIC]: {
        ModelProviderName: CHAT_PROVIDERS.ANTHROPIC,
        ...additionalDeploymentPlatformConfigValues.ModelProviders[CHAT_PROVIDERS.ANTHROPIC]
    },
    [CHAT_PROVIDERS.BEDROCK]: {
        ModelProviderName: CHAT_PROVIDERS.BEDROCK,
        ...additionalDeploymentPlatformConfigValues.ModelProviders[CHAT_PROVIDERS.BEDROCK]
    }
};
