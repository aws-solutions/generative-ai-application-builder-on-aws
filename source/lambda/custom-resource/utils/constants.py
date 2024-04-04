#!/usr/bin/env python
######################################################################################################################
#  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.                                                #
#                                                                                                                    #
#  Licensed under the Apache License, Version 2.0 (the "License"). You may not use this file except in compliance    #
#  with the License. A copy of the License is located at                                                             #
#                                                                                                                    #
#      http://www.apache.org/licenses/LICENSE-2.0                                                                    #
#                                                                                                                    #
#  or in the 'license' file accompanying this file. This file is distributed on an 'AS IS' BASIS, WITHOUT WARRANTIES #
#  OR CONDITIONS OF ANY KIND, express or implied. See the License for the specific language governing permissions    #
#  and limitations under the License.                                                                                #
######################################################################################################################
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
PUBLISH_METRICS_TIME_PERIOD = 180
PUBLISH_METRICS_DAYS = 1  # Equivalent (in number of days) to the runtime schedule defined by ANONYMOUS_METRICS_SCHEDULE

SSM_CONFIG_KEY = "SSM_CONFIG_KEY"
LLM_PARAMS = "LlmParams"
PROMPT_TEMPLATE = "PromptTemplate"
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
