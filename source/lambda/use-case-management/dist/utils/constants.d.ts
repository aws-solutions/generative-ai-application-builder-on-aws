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
export declare const USE_CASE_CONFIG_SSM_PARAMETER_PREFIX = "/gaab-ai/use-case-config";
export declare const COGNITO_POLICY_TABLE_ENV_VAR = "COGNITO_POLICY_TABLE_NAME";
export declare const USER_POOL_ID_ENV_VAR = "USER_POOL_ID";
export declare const ARTIFACT_BUCKET_ENV_VAR = "ARTIFACT_BUCKET_LOCATION";
export declare const ARTIFACT_KEY_PREFIX_ENV_VAR = "ARTIFACT_KEY_PREFIX";
export declare const CFN_DEPLOY_ROLE_ARN_ENV_VAR = "CFN_DEPLOY_ROLE_ARN";
export declare const POWERTOOLS_METRICS_NAMESPACE_ENV_VAR = "POWERTOOLS_METRICS_NAMESPACE";
export declare const USE_CASE_CONFIG_SSM_PARAMETER_PREFIX_ENV_VAR = "USE_CASE_CONFIG_SSM_PARAMETER_PREFIX";
export declare const WEBCONFIG_SSM_KEY_ENV_VAR = "WEBCONFIG_SSM_KEY";
export declare const USE_CASES_TABLE_NAME_ENV_VAR = "USE_CASES_TABLE_NAME";
export declare const TEMPLATE_FILE_EXTN_ENV_VAR = "TEMPLATE_FILE_EXTN";
export declare const USE_CASE_API_KEY_SUFFIX_ENV_VAR = "API_KEY_SUFFIX";
export declare const IS_INTERNAL_USER_ENV_VAR = "IS_INTERNAL_USER";
export declare const REQUIRED_ENV_VARS: string[];
export declare const DEFAULT_LIST_USE_CASES_PAGE_SIZE = 10;
export declare const CHAT_CONFIG_CFN_PARAMETER_NAME = "ChatConfigSSMParameterName";
export declare const TTL_SECONDS: number;
export declare const DYNAMODB_TTL_ATTRIBUTE_NAME = "TTL";
export declare const DDB_SCAN_RECORDS_LIMIT = 500;
export declare enum CloudWatchNamespace {
    API_GATEWAY = "AWS/ApiGateway",
    COGNITO = "AWS/Cognito",
    AWS_KENDRA = "AWS/Kendra",
    LANGCHAIN_LLM = "Langchain/LLM",
    USE_CASE_DEPLOYMENTS = "Solution/UseCaseDeployments",
    COLD_STARTS = "Solution/ColdStarts"
}
export declare enum CloudWatchMetrics {
    REST_ENDPOINT_TOTAL_HITS = "Count",
    REST_ENDPOINT_CACHE_HITS = "CacheHitCount",
    REST_ENDPOINT_CACHE_MISSES = "CacheMissCount",
    REST_ENDPOINT_LATENCY = "Latency",
    REST_ENDPOINT_INTEGRATION_LATENCY = "IntegrationLatency",
    WEBSOCKET_CONNECTS = "ConnectCount",
    WEBSOCKET_MESSAGES = "MessageCount",
    WEBSOCKET_LATENCY = "IntegrationLatency",
    WEBSOCKET_CLIENT_ERRORS = "ClientError",
    WEBSOCKET_EXECUTION_ERRORS = "ExecutionError",
    COGNITO_SIGN_IN_SUCCESSES = "SignInSuccesses",
    COGNITO_SIGN_UP_SUCCESSES = "SignUpSuccesses",
    LANGCHAIN_QUERY = "LangchainQueries",
    LANGCHAIN_FAILURES = "LangchainFailures",
    LANGCHAIN_QUERY_PROCESSING_TIME = "LangchainQueryProcessingTime",
    INCORRECT_INPUT_FAILURES = "IncorrectInputFailures",
    KENDRA_QUERY = "KendraQueries",
    KENDRA_FETCHED_DOCUMENTS = "KendraFetchedDocuments",
    KENDRA_QUERY_PROCESSING_TIME = "KendraProcessingTime",
    KENDRA_FAILURES = "KendraFailures",
    KENDRA_NO_HITS = "KendraNoHits",
    UC_INITIATION_SUCCESS = "UCInitiationSuccess",
    UC_INITIATION_FAILURE = "UCInitiationFailure",
    UC_UPDATE_SUCCESS = "UCUpdateSuccess",
    UC_UPDATE_FAILURE = "UCUpdateFailure",
    UC_DELETION_SUCCESS = "UCDeletionSuccess",
    UC_DELETION_FAILURE = "UCDeletionFailure",
    UC_DESCRIBE_SUCCESS = "UCDescribeSuccess",
    UC_DESCRIBE_FAILURE = "UCDescribeFailure"
}
export declare const enum CHAT_PROVIDERS {
    HUGGING_FACE = "HuggingFace",
    ANTHROPIC = "Anthropic",
    BEDROCK = "Bedrock"
}
export declare const PROVIDERS_REQUIRING_API_KEY: string[];
