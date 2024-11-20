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
import * as logs from 'aws-cdk-lib/aws-logs';

export const ANONYMOUS_METRICS_SCHEDULE = 'rate(1 day)';

export const PLACEHOLDER_EMAIL = 'placeholder@example.com';
export const INTERNAL_EMAIL_DOMAIN = 'amazon';

export const LAMBDA_TIMEOUT_MINS = 15;
export const API_GATEWAY_THROTTLING_RATE_LIMIT = 5;
export const API_GATEWAY_THROTTLING_BURST_LIMIT = 5;
export const COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME: lambda.Runtime = lambda.Runtime.NODEJS_20_X;
export const GOV_CLOUD_REGION_LAMBDA_NODE_RUNTIME: lambda.Runtime = lambda.Runtime.NODEJS_18_X;
export const COMMERCIAL_REGION_LAMBDA_PYTHON_RUNTIME: lambda.Runtime = lambda.Runtime.PYTHON_3_12;
export const COMMERCIAL_REGION_LAMBDA_LAYER_PYTHON_RUNTIME: string = 'python_lambda_layer_3_12';
export const LANGCHAIN_LAMBDA_PYTHON_RUNTIME: lambda.Runtime = lambda.Runtime.PYTHON_3_12;
export const CHAT_LAMBDA_PYTHON_RUNTIME: string = 'python_lambda_3_12_with_args';
export const LANGCHAIN_LAMBDA_LAYER_PYTHON_RUNTIME: string = 'langchain_python_3_12_with_args';
export const COMMERCIAL_REGION_LAMBDA_NODE_TS_LAYER_RUNTIME: string = 'node_ts_lambda_20_x_layer';
export const COMMERCIAL_REGION_LAMBDA_JS_LAYER_RUNTIME: string = 'node_js_lambda_20_x_layer';
export const GOV_CLOUD_REGION_LAMBDA_PYTHON_RUNTIME: lambda.Runtime = lambda.Runtime.PYTHON_3_10;
export const COMMERCIAL_REGION_LAMBDA_JAVA_RUNTIME: lambda.Runtime = lambda.Runtime.JAVA_21;
export const GOV_CLOUD_REGION_LAMBDA_JAVA_RUNTIME: lambda.Runtime = lambda.Runtime.JAVA_17;
export const SERVICE_NAME = 'UseCaseManagement';

export enum CloudWatchNamespace {
    API_GATEWAY = 'AWS/ApiGateway',
    AWS_KENDRA = 'AWS/Kendra',
    AWS_BEDROCK = 'AWS/Bedrock',
    AWS_COGNITO = 'AWS/Cognito',
    AWS_SAGEMAKER = 'AWS/SageMaker',
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
    // eslint-disable-next-line @typescript-eslint/no-duplicate-enum-values
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
    SAGEMAKER_MODEL_INVOCATION_FAILURE = 'SagemakerModelInvocationFailures',
    BEDROCK_KNOWLEDGE_BASE_RETRIEVE = 'BedrockKnowledgeBaseRetrieve',
    BEDROCK_KNOWLEDGE_BASE_RETRIEVE_TIME = 'BedrockKnowledgeBaseRetrieveTime',
    BEDROCK_KNOWLEDGE_BASE_FETCHED_DOCUMENTS = 'BedrockKnowledgeBaseFetchedDocuments',
    BEDROCK_KNOWLEDGE_BASE_FAILURES = 'BedrockKnowledgeBaseFailures',
    BEDROCK_KNOWLEDGE_BASE_NO_HITS = 'BedrockKnowledgeBaseRetrieveNoHits',
    BEDROCK_MODEL_INVOCATION_FAILURE = 'BedrockModelInvocationFailures',
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
    LANGCHAIN_LIB_LAYER = 'LangChainLibLayer',
    BOTO3_LIB_LAYER = 'Boto3Layer'
}

export const OPTIONAL_EMAIL_REGEX_PATTERN = "^$|[A-Za-z0-9_!#$%&'*+/=?`{|}~^.-]+@[A-Za-z0-9.-]+$";
export const MANDATORY_EMAIL_REGEX_PATTERN = "[A-Za-z0-9_!#$%&'*+/=?`{|}~^.-]+@[A-Za-z0-9.-]+$";

export enum UseCaseNames {
    CHAT = 'chat'
}

export enum USE_CASE_TYPES {
    TEXT = 'Text',
    AGENT = 'Agent'
}

export enum CONVERSATION_MEMORY_TYPES {
    DYNAMODB = 'DynamoDB'
}
export const SUPPORTED_CONVERSATION_MEMORY_TYPES = [CONVERSATION_MEMORY_TYPES.DYNAMODB];
export const DEFAULT_CONVERSATION_MEMORY_TYPE = CONVERSATION_MEMORY_TYPES.DYNAMODB;

export enum KNOWLEDGE_BASE_TYPES {
    KENDRA = 'Kendra',
    BEDROCK = 'Bedrock'
}

export const SUPPORTED_KNOWLEDGE_BASE_TYPES = [KNOWLEDGE_BASE_TYPES.KENDRA, KNOWLEDGE_BASE_TYPES.BEDROCK];

export enum AGENT_TYPES {
    BEDROCK = 'Bedrock'
}
export const SUPPORTED_AGENT_TYPES = [AGENT_TYPES.BEDROCK];

export enum DynamoDBAttributes {
    CONVERSATION_TABLE_PARTITION_KEY = 'UserId',
    CONVERSATION_TABLE_SORT_KEY = 'ConversationId',
    // eslint-disable-next-line @typescript-eslint/no-duplicate-enum-values
    SESSION_TABLE_PARTITION_KEY = 'UserId',
    SESSION_TABLE_SORT_KEY = 'SessionToken',
    USE_CASES_TABLE_PARTITION_KEY = 'UseCaseId',
    USE_CASES_TABLE_SECONDARY_INDEX_KEY = 'Status',
    MODEL_INFO_TABLE_PARTITION_KEY = 'UseCase',
    MODEL_INFO_TABLE_SORT_KEY = 'SortKey',
    TIME_TO_LIVE = 'TTL',
    COGNITO_TABLE_PARTITION_KEY = 'group',
    USE_CASE_CONFIG_RECORD_KEY_ATTRIBUTE_NAME = 'key'
}

// LLM related constants
export const enum CHAT_PROVIDERS {
    BEDROCK = 'Bedrock',
    SAGEMAKER = 'SageMaker',
    BEDROCK_AGENT = 'BedrockAgent'
}
export const enum AUTHENTICATION_PROVIDERS {
    COGNITO = 'Cognito'
}
export const SUPPORTED_CHAT_PROVIDERS = [CHAT_PROVIDERS.BEDROCK, CHAT_PROVIDERS.SAGEMAKER];
export const SUPPORTED_AUTHENTICATION_PROVIDERS = [AUTHENTICATION_PROVIDERS.COGNITO];

export const KENDRA_EDITIONS = ['DEVELOPER_EDITION', 'ENTERPRISE_EDITION'];
export const DEFAULT_KENDRA_EDITION = 'DEVELOPER_EDITION';
export const DEFAULT_KNOWLEDGE_BASE_TYPE = KNOWLEDGE_BASE_TYPES.BEDROCK;

// Environment variables used for configuring lambdas
export const USE_CASE_CONFIG_RECORD_KEY_ENV_VAR = 'USE_CASE_CONFIG_RECORD_KEY';
export const USE_CASE_CONFIG_TABLE_NAME_ENV_VAR = 'USE_CASE_CONFIG_TABLE_NAME';
export const CONVERSATION_TABLE_NAME_ENV_VAR = 'CONVERSATION_TABLE_NAME';
export const MODEL_INFO_TABLE_NAME_ENV_VAR = 'MODEL_INFO_TABLE_NAME';
export const KENDRA_INDEX_ID_ENV_VAR = 'KENDRA_INDEX_ID';
export const BEDROCK_KNOWLEDGE_BASE_ID_ENV_VAR = 'BEDROCK_KNOWLEDGE_BASE_ID';
export const COGNITO_POLICY_TABLE_ENV_VAR = 'COGNITO_POLICY_TABLE_NAME';
export const USER_POOL_ID_ENV_VAR = 'USER_POOL_ID';
export const CLIENT_ID_ENV_VAR = 'CLIENT_ID';
export const ARTIFACT_BUCKET_ENV_VAR = 'ARTIFACT_BUCKET_LOCATION';
export const ARTIFACT_KEY_PREFIX_ENV_VAR = 'ARTIFACT_KEY_PREFIX';
export const CFN_DEPLOY_ROLE_ARN_ENV_VAR = 'CFN_DEPLOY_ROLE_ARN';
export const POWERTOOLS_METRICS_NAMESPACE_ENV_VAR = 'POWERTOOLS_METRICS_NAMESPACE';
export const USE_CASES_TABLE_NAME_ENV_VAR = 'USE_CASES_TABLE_NAME';
export const WEBCONFIG_SSM_KEY_ENV_VAR = 'WEBCONFIG_SSM_KEY';
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
export const MAX_KENDRA_QUERY_CAPACITY_UNITS = 100;
export const MAX_KENDRA_STORAGE_CAPACITY_UNITS = 100;
export const DEFAULT_KENDRA_NUMBER_OF_DOCS = 2;
export const MAX_KENDRA_NUMBER_OF_DOCS = 100;
export const MIN_KENDRA_NUMBER_OF_DOCS = 1;
export const DEFAULT_SCORE_THRESHOLD = 0;
export const MIN_SCORE_THRESHOLD = 0;
export const MAX_SCORE_THRESHOLD = 1;
export const DEFAULT_RETURN_SOURCE_DOCS = false;
export const DEFAULT_ENABLE_RBAC = false;
export const MODEL_PARAM_TYPES = ['string', 'integer', 'float', 'boolean', 'list', 'dictionary'];

export const LOG_RETENTION_PERIOD = logs.RetentionDays.TEN_YEARS;

export enum UIAssetFolders {
    CHAT = 'ui-chat',
    DEPLOYMENT_PLATFORM = 'ui-deployment'
}

// Cloudwatch metrics namespace constants
export const USE_CASE_MANAGEMENT_NAMESPACE = 'UseCaseManagement';
export const WEB_CONFIG_PREFIX = '/gaab-webconfig';

// default RAG enabled status
export const DEFAULT_RAG_ENABLED_STATUS = 'false';
export const DEFAULT_RAG_RBAC_ENABLED_STATUS = 'false';

// default VPC enabled status
export const DEFAULT_VPC_ENABLED_STATUS = 'false';

// WAF WebACL configs for blocking headers
export const INVALID_REQUEST_HEADER_RESPONSE_CODE = 403;
// Default AWS managed rules have priority 0-6. Custom rules start from priority 7
export const CUSTOM_RULE_PRIORITY = 7;
export const HEADERS_NOT_ALLOWED_KEY = 'HeadersNotAllowed';
