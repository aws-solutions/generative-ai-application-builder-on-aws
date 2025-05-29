#!/usr/bin/env python
# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

from enum import Enum


class KnowledgeBaseTypes(str, Enum):
    """Supported Knowledge Bases"""

    KENDRA = "Kendra"
    BEDROCK = "Bedrock"


class ConversationMemoryTypes(str, Enum):
    """Supported Memory Types"""

    DynamoDB = "DynamoDB"


class LLMProviderTypes(str, Enum):
    """Supported provider types that can be used to create an LLM"""

    BEDROCK = "Bedrock"
    SAGEMAKER = "SageMaker"


class BedrockModelProviders(str, Enum):
    """Supported model families for Bedrock that can be used to create an LLM"""

    AI21 = "ai21"
    ANTHROPIC = "anthropic"
    AMAZON = "amazon"
    DEEPSEEK = "deepseek"
    META = "meta"
    COHERE = "cohere"
    MISTRAL = "mistral"


class CloudWatchNamespaces(str, Enum):
    """Supported Cloudwatch Namespaces"""

    API_GATEWAY = "AWS/ApiGateway"
    AWS_COGNITO = "AWS/Cognito"
    AWS_KENDRA = "AWS/Kendra"
    AWS_BEDROCK = "AWS/Bedrock"
    LANGCHAIN_LLM = "Langchain/LLM"
    AWS_SAGEMAKER = "AWS/SageMaker"
    USE_CASE_DEPLOYMENTS = "Solution/UseCaseDeployments"
    COLD_STARTS = "Solution/ColdStarts"


class CloudWatchMetrics(str, Enum):
    """Supported Cloudwatch Metrics"""

    REST_ENDPOINT_TOTAL_HITS = "Count"
    REST_ENDPOINT_CACHE_HITS = "CacheHitCount"
    REST_ENDPOINT_CACHE_MISSES = "CacheMissCount"
    REST_ENDPOINT_LATENCY = "Latency"
    REST_ENDPOINT_INTEGRATION_LATENCY = "IntegrationLatency"
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
    BEDROCK_KNOWLEDGE_BASE_RETRIEVE = "BedrockKnowledgeBaseRetrieve"
    BEDROCK_KNOWLEDGE_BASE_RETRIEVE_TIME = "BedrockKnowledgeBaseRetrieveTime"
    BEDROCK_KNOWLEDGE_BASE_FETCHED_DOCUMENTS = "BedrockKnowledgeBaseFetchedDocuments"
    BEDROCK_KNOWLEDGE_BASE_FAILURES = "BedrockKnowledgeBaseFailures"
    BEDROCK_KNOWLEDGE_BASE_NO_HITS = "BedrockKnowledgeBaseRetrieveNoHits"
    BEDROCK_MODEL_INVOCATION_FAILURE = "BedrockModelInvocationFailures"
    LLM_INPUT_TOKEN_COUNT = "InputTokenCount"
    LLM_OUTPUT_TOKEN_COUNT = "OutputTokenCount"
    LLM_TOTAL_TOKEN_COUNT = "TotalTokenCount"
    LLM_STOP_REASON = "StopReason"
    SAGEMAKER_MODEL_INVOCATION_FAILURE = "SagemakerModelInvocationFailures"
    UC_INITIATION_SUCCESS = "UCInitiationSuccess"
    UC_INITIATION_FAILURE = "UCInitiationFailure"
    UC_UPDATE_SUCCESS = "UCUpdateSuccess"
    UC_UPDATE_FAILURE = "UCUpdateFailure"
    UC_DELETION_SUCCESS = "UCDeletionSuccess"
    UC_DELETION_FAILURE = "UCDeletionFailure"
    UC_DESCRIBE_SUCCESS = "UCDescribeSuccess"
    UC_DESCRIBE_FAILURE = "UCDescribeFailure"
