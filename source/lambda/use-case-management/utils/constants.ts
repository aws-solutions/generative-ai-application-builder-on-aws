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

export const COGNITO_POLICY_TABLE_ENV_VAR = 'COGNITO_POLICY_TABLE_NAME';
export const USER_POOL_ID_ENV_VAR = 'USER_POOL_ID';
export const CLIENT_ID_ENV_VAR = 'CLIENT_ID';
export const COGNITO_DOMAIN_PREFIX_VAR = 'COGNITO_DOMAIN_PREFIX';
export const ARTIFACT_BUCKET_ENV_VAR = 'ARTIFACT_BUCKET_LOCATION';
export const ARTIFACT_KEY_PREFIX_ENV_VAR = 'ARTIFACT_KEY_PREFIX';
export const POWERTOOLS_METRICS_NAMESPACE_ENV_VAR = 'POWERTOOLS_METRICS_NAMESPACE';
export const WEBCONFIG_SSM_KEY_ENV_VAR = 'WEBCONFIG_SSM_KEY';
export const USE_CASES_TABLE_NAME_ENV_VAR = 'USE_CASES_TABLE_NAME';
export const MODEL_INFO_TABLE_NAME_ENV_VAR = 'MODEL_INFO_TABLE_NAME';
export const TEMPLATE_FILE_EXTN_ENV_VAR = 'TEMPLATE_FILE_EXTN';
export const IS_INTERNAL_USER_ENV_VAR = 'IS_INTERNAL_USER';
export const USE_CASE_CONFIG_TABLE_NAME_ENV_VAR = 'USE_CASE_CONFIG_TABLE_NAME';
export const CFN_DEPLOY_ROLE_ARN_ENV_VAR = 'CFN_DEPLOY_ROLE_ARN';
export const INFERENCE_PROFILE = 'inference-profile';

export const REQUIRED_ENV_VARS = [
    COGNITO_POLICY_TABLE_ENV_VAR,
    USER_POOL_ID_ENV_VAR,
    ARTIFACT_BUCKET_ENV_VAR,
    POWERTOOLS_METRICS_NAMESPACE_ENV_VAR,
    USE_CASES_TABLE_NAME_ENV_VAR,
    MODEL_INFO_TABLE_NAME_ENV_VAR,
    TEMPLATE_FILE_EXTN_ENV_VAR,
    IS_INTERNAL_USER_ENV_VAR,
    USE_CASE_CONFIG_TABLE_NAME_ENV_VAR
];

export const DEFAULT_LIST_USE_CASES_PAGE_SIZE = 10;

export const TTL_SECONDS = 60 * 60 * 24 * 89; // 89 days, 90 days CFN deleted stack is not available
export const DYNAMODB_TTL_ATTRIBUTE_NAME = 'TTL';
export const DDB_SCAN_RECORDS_LIMIT = 500;

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

export const enum CHAT_PROVIDERS {
    BEDROCK = 'Bedrock',
    SAGEMAKER = 'SageMaker'
}

export const enum ModelInfoTableKeys {
    MODEL_INFO_TABLE_PARTITION_KEY = 'UseCase',
    MODEL_INFO_TABLE_SORT_KEY = 'SortKey',
    MODEL_INFO_TABLE_PROVIDER_NAME_KEY = 'ModelProviderName',
    MODEL_INFO_TABLE_MODEL_NAME_KEY = 'ModelName'
}

export const enum UseCaseTypes {
    CHAT = 'Chat',
    RAGChat = 'RAGChat',
    AGENT = 'Agent'
}

export const enum UseCaseTypeFromApiEvent {
    TEXT = 'Text',
    AGENT = 'Agent'
}

export const enum AgentProviders {
    BEDROCK = 'Bedrock'
}

export const enum KnowledgeBaseTypes {
    KENDRA = 'Kendra',
    BEDROCK = 'Bedrock'
}

export const enum CfnParameterKeys {
    KnowledgeBaseType = 'KnowledgeBaseType',
    BedrockKnowledgeBaseId = 'BedrockKnowledgeBaseId',
    ExistingKendraIndexId = 'ExistingKendraIndexId',
    NewKendraIndexName = 'NewKendraIndexName',
    NewKendraQueryCapacityUnits = 'NewKendraQueryCapacityUnits',
    NewKendraStorageCapacityUnits = 'NewKendraStorageCapacityUnits',
    NewKendraIndexEdition = 'NewKendraIndexEdition',
    DefaultUserEmail = 'DefaultUserEmail',
    VpcEnabled = 'VpcEnabled',
    CreateNewVpc = 'CreateNewVpc',
    ExistingVpcId = 'ExistingVpcId',
    ExistingPrivateSubnetIds = 'ExistingPrivateSubnetIds',
    ExistingSecurityGroupIds = 'ExistingSecurityGroupIds',
    ExistingCognitoUserPoolId = 'ExistingCognitoUserPoolId',
    ExistingCognitoUserPoolClient = 'ExistingCognitoUserPoolClient',
    CognitoDomainPrefix = 'CognitoDomainPrefix',
    ExistingCognitoGroupPolicyTableName = 'ExistingCognitoGroupPolicyTableName',
    ExistingModelInfoTableName = 'ExistingModelInfoTableName',
    UseCaseUUID = 'UseCaseUUID',
    RAGEnabled = 'RAGEnabled',
    DeployUI = 'DeployUI',
    UseCaseConfigTableName = 'UseCaseConfigTableName',
    UseCaseConfigRecordKey = 'UseCaseConfigRecordKey',
    BedrockAgentId = 'BedrockAgentId',
    BedrockAgentAliasId = 'BedrockAgentAliasId',
    UseInferenceProfile = 'UseInferenceProfile'
}

export const enum CfnOutputKeys {
    WebConfigKey = 'WebConfigKey',
    KendraIndexId = 'KendraIndexId',
    CloudFrontWebUrl = 'CloudFrontWebUrl',
    CloudwatchDashboardUrl = 'CloudwatchDashboardUrl',
    VpcId = 'VpcId',
    PrivateSubnetIds = 'PrivateSubnetIds',
    SecurityGroupIds = 'SecurityGroupIds'
}

// On update, these parameters should keep the previous values
export const RetainedCfnParameterKeys = [
    CfnParameterKeys.VpcEnabled,
    CfnParameterKeys.CreateNewVpc,
    CfnParameterKeys.ExistingVpcId,
    CfnParameterKeys.ExistingPrivateSubnetIds,
    CfnParameterKeys.ExistingSecurityGroupIds,
    CfnParameterKeys.ExistingCognitoUserPoolClient,
    CfnParameterKeys.ExistingCognitoUserPoolId
];

export const ChatRequiredPlaceholders = ['{input}', '{history}'];
export const RAGChatRequiredPlaceholders = ['{input}', '{context}', '{history}'];
export const DisambiguationRequiredPlaceholders = ['{input}', '{history}'];

export const RETRY_CONFIG = {
    maxRetries: 5,
    backOffRate: 2,
    initialDelayMs: 1000
};

export const USE_CASE_CONFIG_RECORD_KEY_ATTRIBUTE_NAME = 'key';
export const USE_CASE_CONFIG_RECORD_CONFIG_ATTRIBUTE_NAME = 'config';

export const DEFAULT_USE_CASES_PER_PAGE = 10;

export const enum AUTHENTICATION_PROVIDERS {
    COGNITO = 'Cognito'
}

export const SUPPORTED_AUTHENTICATION_PROVIDERS = [AUTHENTICATION_PROVIDERS.COGNITO];
