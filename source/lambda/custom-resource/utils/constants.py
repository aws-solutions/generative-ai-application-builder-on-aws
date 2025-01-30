#!/usr/bin/env python
# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

from enum import Enum


class CloudWatchNamespaces(str, Enum):
    """Supported Cloudwatch Namespaces"""

    API_GATEWAY = "AWS/ApiGateway"
    API_GATEWAY_WEBSOCKETS = "AWS/ApiGatewayWebSockets"
    COGNITO = "AWS/Cognito"
    AWS_KENDRA = "AWS/Kendra"
    LANGCHAIN_LLM = "Langchain/LLM"
    USE_CASE_DEPLOYMENTS = "Solution/UseCaseDeployments"
    COLD_STARTS = "Solution/ColdStarts"


class CloudWatchMetrics(str, Enum):
    """Supported Cloudwatch Metrics"""

    REST_ENDPOINT_TOTAL_HITS = "Count"
    REST_ENDPOINT_CACHE_HITS = "CacheHitCount"
    REST_ENDPOINT_CACHE_MISSES = "CacheMissCount"
    REST_ENDPOINT_LATENCY = "Latency"
    WEBSOCKET_CONNECTS = "ConnectCount"
    WEBSOCKET_MESSAGES = "MessageCount"
    WEBSOCKET_LATENCY = "IntegrationLatency"
    WEBSOCKET_CLIENT_ERRORS = "ClientError"
    WEBSOCKET_EXECUTION_ERRORS = "ExecutionError"
    COGNITO_SIGN_IN_SUCCESSES = "SignInSuccesses"
    COGNITO_SIGN_UP_SUCCESSES = "SignUpSuccesses"
    LANGCHAIN_QUERY = "LangchainQueries"
    LANGCHAIN_FAILURES = "LangchainFailures"
    LANGCHAIN_QUERY_PROCESSING_TIME = "LangchainQueryProcessingTime"
    INCORRECT_INPUT_FAILURES = "IncorrectInputFailures"
    KENDRA_QUERY = "KendraQueries"
    KENDRA_FETCHED_DOCUMENTS = "KendraFetchedDocuments"
    KENDRA_QUERY_PROCESSING_TIME = "KendraProcessingTime"
    KENDRA_FAILURES = "KendraFailures"
    KENDRA_NO_HITS = "KendraNoHits"
    UC_INITIATION_SUCCESS = "UCInitiationSuccess"
    UC_INITIATION_FAILURE = "UCInitiationFailure"
    UC_UPDATE_SUCCESS = "UCUpdateSuccess"
    UC_UPDATE_FAILURE = "UCUpdateFailure"
    UC_DELETION_SUCCESS = "UCDeletionSuccess"
    UC_DELETION_FAILURE = "UCDeletionFailure"
    UC_DESCRIBE_SUCCESS = "UCDescribeSuccess"
    UC_DESCRIBE_FAILURE = "UCDescribeFailure"


METRICS_ENDPOINT = "https://metrics.awssolutionsbuilder.com/generic"
PUBLISH_METRICS_PERIOD_IN_SECONDS = (
    60 * 60 * 3
)  # 3 hours. This is expected to match the runtime schedule defined by ANONYMOUS_METRICS_SCHEDULE

SSM_CONFIG_KEY = "SSM_CONFIG_KEY"
LLM_PARAMS = "LlmParams"
PROMPT_PARAMS = "PromptParams"
PROMPT_TEMPLATE = "PromptTemplate"
DISAMBIGUATION_PROMPT_TEMPLATE = "DisambiguationPromptTemplate"
NEW_KENDRA_INDEX_CREATED = "NEW_KENDRA_INDEX_CREATED"
KENDRA_EDITION = "KENDRA_EDITION"
RAG_ENABLED = "RAG_ENABLED"
MODEL_PROVIDER_NAME = "MODEL_PROVIDER_NAME"
MODEL_PROVIDER = "ModelProvider"
PROMPT_TEMPLATE = "PromptTemplate"
USE_CASE_UUID_ENV_VAR = "USE_CASE_UUID"
KENDRA_INDEX_ID_ENV_VAR = "KENDRA_INDEX_ID"
WEBSOCKET_API_ID_ENV_VAR = "WEBSOCKET_API_ID"
REST_API_NAME_ENV_VAR = "REST_API_NAME"
USER_POOL_ID_ENV_VAR = "USER_POOL_ID"
CLIENT_ID_ENV_VAR = "CLIENT_ID"
UUID = "UUID"
USE_CASE_CONFIG_TABLE_NAME = "USE_CASE_CONFIG_TABLE_NAME"
USE_CASE_CONFIG_RECORD_KEY = "USE_CASE_CONFIG_RECORD_KEY"
USE_CASE_CONFIG_RECORD_KEY_ATTRIBUTE_NAME = "key"
USE_CASE_CONFIG_RECORD_CONFIG_ATTRIBUTE_NAME = "config"
METRICS_TIMESTAMP_FORMAT = (
    "%Y-%m-%d %H:%M:%S.%f"  # This is the required format for the metrics API. Any changes should be taken with care
)
