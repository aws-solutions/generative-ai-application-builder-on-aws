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
    AWS_BEDROCK = "AWS/Bedrock"
    LANGCHAIN_LLM = "Langchain/LLM"
    USE_CASE_DEPLOYMENTS = "Solution/UseCaseDeployments"
    COLD_STARTS = "Solution/ColdStarts"
    FEEDBACK_MANAGEMENT = "Solution/FeedbackManagement"
    FILE_HANDLING = "Solution/FileHandling"


class CloudWatchMetrics(str, Enum):
    """Supported Cloudwatch Metrics"""

    # API Gateway Metrics
    REST_ENDPOINT_TOTAL_HITS = "Count"
    REST_ENDPOINT_CACHE_HITS = "CacheHitCount"
    REST_ENDPOINT_CACHE_MISSES = "CacheMissCount"
    REST_ENDPOINT_LATENCY = "Latency"
    WEBSOCKET_CONNECTS = "ConnectCount"
    WEBSOCKET_MESSAGES = "MessageCount"
    WEBSOCKET_LATENCY = "IntegrationLatency"
    WEBSOCKET_CLIENT_ERRORS = "ClientError"
    WEBSOCKET_EXECUTION_ERRORS = "ExecutionError"

    # Cognito Metrics
    COGNITO_SIGN_IN_SUCCESSES = "SignInSuccesses"
    COGNITO_SIGN_UP_SUCCESSES = "SignUpSuccesses"

    # LLM Query Processing Metrics
    LANGCHAIN_QUERY = "LangchainQueries"
    LANGCHAIN_FAILURES = "LangchainFailures"
    LANGCHAIN_QUERY_PROCESSING_TIME = "LangchainQueryProcessingTime"
    INCORRECT_INPUT_FAILURES = "IncorrectInputFailures"
    KENDRA_QUERY = "KendraQueries"
    KENDRA_FETCHED_DOCUMENTS = "KendraFetchedDocuments"
    KENDRA_QUERY_PROCESSING_TIME = "KendraProcessingTime"
    KENDRA_FAILURES = "KendraFailures"
    KENDRA_NO_HITS = "KendraNoHits"
    LLM_INPUT_TOKEN_COUNT = "InputTokenCount"
    LLM_OUTPUT_TOKEN_COUNT = "OutputTokenCount"
    SAGEMAKER_MODEL_INVOCATION_FAILURE = "SagemakerModelInvocationFailures"
    BEDROCK_KNOWLEDGE_BASE_RETRIEVE = "BedrockKnowledgeBaseRetrieve"
    BEDROCK_KNOWLEDGE_BASE_RETRIEVE_TIME = "BedrockKnowledgeBaseRetrieveTime"
    BEDROCK_KNOWLEDGE_BASE_FETCHED_DOCUMENTS = "BedrockKnowledgeBaseFetchedDocuments"
    BEDROCK_KNOWLEDGE_BASE_FAILURES = "BedrockKnowledgeBaseFailures"
    BEDROCK_KNOWLEDGE_BASE_NO_HITS = "BedrockKnowledgeBaseRetrieveNoHits"
    BEDROCK_MODEL_INVOCATION_FAILURE = "BedrockModelInvocationFailures"

    # Use Case Deployments
    UC_INITIATION_SUCCESS = "UCInitiationSuccess"
    UC_INITIATION_FAILURE = "UCInitiationFailure"
    UC_UPDATE_SUCCESS = "UCUpdateSuccess"
    UC_UPDATE_FAILURE = "UCUpdateFailure"
    UC_DELETION_SUCCESS = "UCDeletionSuccess"
    UC_DELETION_FAILURE = "UCDeletionFailure"
    UC_DESCRIBE_SUCCESS = "UCDescribeSuccess"
    UC_DESCRIBE_FAILURE = "UCDescribeFailure"

    # Feedback Metrics
    FEEDBACK_ENABLED_COUNT = "FeedbackEnabled"
    FEEDBACK_REJECTION_COUNT = "FeedbackRejectionCount"
    FEEDBACK_SUBMITTED_COUNT = "FeedbackSubmittedCount"
    FEEDBACK_PROCESSING_ERROR_COUNT = "FeedbackProcessingErrorCount"
    FEEDBACK_STORAGE_ERROR_COUNT = "FeedbackStorageErrorCount"
    INACCURATE_FEEDBACK_COUNT = "InaccurateFeedbackCount"
    INCOMPLETE_OR_INSUFFICIENT_FEEDBACK_COUNT = "IncompleteOrInsufficientFeedbackCount"
    HARMFUL_FEEDBACK_COUNT = "HarmfulFeedbackCount"
    OTHER_NEGATIVE_FEEDBACK_COUNT = "OtherNegativeFeedbackCount"

    # File Handling Metrics
    FILES_UPLOADED = "FilesUploaded"
    FILE_DELETE = "FileDelete"
    FILE_DOWNLOAD = "FileDownload"
    FILE_SIZE = "FileSize"
    FILES_UPLOADED_WITH_EXTENSION = "FilesExtUploaded"


class EntityType(Enum):
    RUNTIME = "runtime"
    GATEWAY = "gateway"


METRICS_ENDPOINT = "https://metrics.awssolutionsbuilder.com/generic"
PUBLISH_METRICS_PERIOD_IN_SECONDS = (
    60 * 60 * 3
)  # 3 hours. This is expected to match the runtime schedule defined by METRICS_SCHEDULE

SSM_CONFIG_KEY = "SSM_CONFIG_KEY"
USE_CASE_TYPE = "UseCaseType"
KNOWLEDGE_BASE_TYPE = "KnowledgeBaseType"
LLM_PARAMS = "LlmParams"
AUTH_PARAMS = "AuthenticationParams"
AGENT_PARAMS = "AgentParams"
PROMPT_PARAMS = "PromptParams"
KNOWLEDGE_BASE_PARAMS = "KnowledgeBaseParams"
PROMPT_TEMPLATE = "PromptTemplate"
DISAMBIGUATION_PROMPT_TEMPLATE = "DisambiguationPromptTemplate"
NEW_KENDRA_INDEX_CREATED = "NEW_KENDRA_INDEX_CREATED"
KENDRA_EDITION = "KENDRA_EDITION"
RAG_ENABLED = "RAG_ENABLED"
FEEDBACK_ENABLED = "FEEDBACK_ENABLED"
FEEDBACK_PARAMS = "FeedbackParams"
CLIENT_OWNED_USER_POOL = "ClientOwnedUserPool"
DEPLOY_UI = "DeployUI"
UC_DEPLOYMENT_SOURCE = "UC_DEPLOYMENT_SOURCE"
MODEL_PROVIDER_NAME = "MODEL_PROVIDER_NAME"
MODEL_PROVIDER = "ModelProvider"
UC_DEPLOYMENT_SOURCE = "UC_DEPLOYMENT_SOURCE"
PROVISIONED_MODEL_ENABLED = "ProvisionedModelEnabled"
GUARDRAIL_ENABLED = "GuardrailEnabled"
EXISTING_REST_API_ID = "ExistingRestApiId"
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
DEFAULT_API_GATEWAY_STAGE = "prod"
MULTIMODAL_FILES_BUCKET_NAME_ENV_VAR = "MULTIMODAL_DATA_BUCKET"
MULTIMODAL_FILES_METADATA_TABLE_NAME_ENV_VAR = "MULTIMODAL_METADATA_TABLE_NAME"
AGENTCORE_RUNTIME_IDLE_TIMEOUT_SECONDS = 3600  # 1hr
