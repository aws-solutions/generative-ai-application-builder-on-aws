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

import os

from utils.enum_types import BedrockModelProviders, LLMProviderTypes

# Chat environment variables
USE_CASE_CONFIG_TABLE_NAME_ENV_VAR = "USE_CASE_CONFIG_TABLE_NAME"
USE_CASE_CONFIG_RECORD_KEY_ENV_VAR = "USE_CASE_CONFIG_RECORD_KEY"
CONVERSATION_TABLE_NAME_ENV_VAR = "CONVERSATION_TABLE_NAME"
KENDRA_INDEX_ID_ENV_VAR = "KENDRA_INDEX_ID"
BEDROCK_KNOWLEDGE_BASE_ID_ENV_VAR = "BEDROCK_KNOWLEDGE_BASE_ID"
WEBSOCKET_CALLBACK_URL_ENV_VAR = "WEBSOCKET_CALLBACK_URL"
DDB_MESSAGE_TTL_ENV_VAR = "DDB_MESSAGE_TTL"
USE_CASE_UUID_ENV_VAR = "USE_CASE_UUID"
TRACE_ID_ENV_VAR = "_X_AMZN_TRACE_ID"
MODEL_INFO_TABLE_NAME_ENV_VAR = "MODEL_INFO_TABLE_NAME"
CHAT_REQUIRED_ENV_VARS = [
    USE_CASE_CONFIG_TABLE_NAME_ENV_VAR,
    USE_CASE_CONFIG_RECORD_KEY_ENV_VAR,
    CONVERSATION_TABLE_NAME_ENV_VAR,
    WEBSOCKET_CALLBACK_URL_ENV_VAR,
    TRACE_ID_ENV_VAR,
    MODEL_INFO_TABLE_NAME_ENV_VAR,
]
LLM_CONFIG_RECORD_FIELD_NAME = "key"
RAG_CHAT_IDENTIFIER = "RAGChat"
CHAT_IDENTIFIER = "Chat"
TEMPERATURE_PLACEHOLDER = "<<temperature>>"
TEMPERATURE_PLACEHOLDER_STR = "temperature"
CLIENT_ID_ENV_VAR = "CLIENT_ID"
USER_POOL_ID_ENV_VAR = "USER_POOL_ID"

# Event keys
USER_ID_EVENT_KEY = "UserId"
CONVERSATION_ID_EVENT_KEY = "conversationId"
QUESTION_EVENT_KEY = "question"
PROMPT_EVENT_KEY = "promptTemplate"
AUTH_TOKEN_EVENT_KEY = "authToken"
REQUEST_CONTEXT_KEY = "requestContext"
MESSAGE_KEY = "message"

# Chat constants across models
END_CONVERSATION_TOKEN = "##END_CONVERSATION##"
METRICS_SERVICE_NAME = f"GAABUseCase-{os.getenv(USE_CASE_UUID_ENV_VAR)}"
DEFAULT_DDB_MESSAGE_TTL = 60 * 60 * 24  # 24 hours in seconds
DEFAULT_RAG_CHAIN_TYPE = "stuff"
DEFAULT_KENDRA_NUMBER_OF_DOCS = 2
DEFAULT_BEDROCK_KNOWLEDGE_BASE_NUMBER_OF_DOCS = 2
DEFAULT_RETURN_SOURCE_DOCS_MODE = False
DEFAULT_REPHRASE_QUESTION_MODE = False
DEFAULT_SCORE_THRESHOLD = 0.0
DEFAULT_MAX_TOKENS_TO_SAMPLE = 256
DEFAULT_VERBOSE_MODE = False
DEFAULT_DISAMBIGUATION_ENABLED_MODE = True
DEFAULT_RAG_ENABLED_MODE = False
DEFAULT_DISAMBIGUATION_ENABLED_MODE = True
DEFAULT_STREAMING_MODE = False
DEFAULT_PROMPT_PLACEHOLDERS = ["history", "input"]
DEFAULT_PROMPT_RAG_PLACEHOLDERS = ["context", "history", "input"]
DISAMBIGUATION_PROMPT_PLACEHOLDERS = ["input", "history"]
DEFAULT_RETURN_GENERATED_RAG_QUESTION = True
DEFAULT_REPHRASE_RAG_QUESTION = True
SOURCE_DOCUMENTS_RECEIVED_KEY = "context"
SOURCE_DOCUMENTS_OUTPUT_KEY = "source_documents"
LLM_RESPONSE_KEY = "answer"
DEFAULT_SAGEMAKER_MODEL_ID = "default"
HISTORY_KEY = "history"
INPUT_KEY = "input"
OUTPUT_KEY = "answer"
CONTEXT_KEY = "context"
HUMAN_PREFIX = "human_prefix"
AI_PREFIX = "ai_prefix"
SYSTEM_PREFIX = "system"
USER_ID_KEY = "user_id"
CONVERSATION_ID_KEY = "conversation_id"
RAG_CONVERSATION_TRACER_KEY = "retrievalAugmentedConversationInvocation"
CONVERSATION_TRACER_KEY = "conversationInvocation"
PAYLOAD_DATA_KEY = "data"
PAYLOAD_SOURCE_DOCUMENT_KEY = "sourceDocument"
REPHRASED_QUERY_KEY = "rephrased_query"


# Bedrock text generation models
DEFAULT_BEDROCK_MODELS_MAP = {
    BedrockModelProviders.AMAZON.value: "amazon.titan-text-express-v1",
    BedrockModelProviders.AI21.value: "ai21.j2-mid",
    BedrockModelProviders.ANTHROPIC.value: "anthropic.claude-instant-v1",
}
DEFAULT_BEDROCK_MODEL_FAMILY = BedrockModelProviders.AMAZON.value

DEFAULT_MODELS_MAP = {
    LLMProviderTypes.BEDROCK.value: DEFAULT_BEDROCK_MODELS_MAP[DEFAULT_BEDROCK_MODEL_FAMILY],
    LLMProviderTypes.SAGEMAKER.value: "default",
}
BETA_USE_CONVERSE_API_MODELS = ["cohere.command-r-v1:0", "cohere.command-r-plus-v1:0"]
CHATBEDROCK_MODELS = [
    BedrockModelProviders.ANTHROPIC.value,
    BedrockModelProviders.AMAZON.value,
    BedrockModelProviders.MISTRAL.value,
    BedrockModelProviders.META.value,
]

SAGEMAKER_ENDPOINT_ARGS = [
    "CustomAttributes",
    "TargetModel",
    "TargetVariant",
    "TargetContainerHostname",
    "InferenceId",
    "EnableExplanations",
    "InferenceComponentName",
]

BEDROCK_GUARDRAILS_KEY = "guardrails"
BEDROCK_GUARDRAIL_IDENTIFIER_KEY = "GuardrailIdentifier"
BEDROCK_GUARDRAIL_VERSION_KEY = "GuardrailVersion"
BEDROCK_INFERENCE_PROFILE_MODEL = "inference-profile"

DEFAULT_RAG_RBAC_ENABLED_STATUS = False
