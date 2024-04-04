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
LLM_PARAMETERS_SSM_KEY_ENV_VAR = "SSM_LLM_CONFIG_KEY"
LLM_PROVIDER_API_KEY_ENV_VAR = "LLM_API_KEY_NAME"
CONVERSATION_TABLE_NAME_ENV_VAR = "CONVERSATION_TABLE_NAME"
KENDRA_INDEX_ID_ENV_VAR = "KENDRA_INDEX_ID"
WEBSOCKET_CALLBACK_URL_ENV_VAR = "WEBSOCKET_CALLBACK_URL"
RAG_ENABLED_ENV_VAR = "RAG_ENABLED"
DDB_MESSAGE_TTL_ENV_VAR = "DDB_MESSAGE_TTL"
USE_CASE_UUID_ENV_VAR = "USE_CASE_UUID"
TRACE_ID_ENV_VAR = "_X_AMZN_TRACE_ID"
MODEL_INFO_TABLE_NAME_ENV_VAR = "MODEL_INFO_TABLE_NAME"
CHAT_REQUIRED_ENV_VARS = [
    LLM_PARAMETERS_SSM_KEY_ENV_VAR,
    CONVERSATION_TABLE_NAME_ENV_VAR,
    WEBSOCKET_CALLBACK_URL_ENV_VAR,
    RAG_ENABLED_ENV_VAR,
    TRACE_ID_ENV_VAR,
    MODEL_INFO_TABLE_NAME_ENV_VAR,
]
RAG_CHAT_IDENTIFIER = "RAGChat"
CHAT_IDENTIFIER = "Chat"
TEMPERATURE_PLACEHOLDER = "<<temperature>>"
TEMPERATURE_PLACEHOLDER_STR = "temperature"

# Event keys
USER_ID_EVENT_KEY = "UserId"
CONVERSATION_ID_EVENT_KEY = "conversationId"
QUESTION_EVENT_KEY = "question"
PROMPT_EVENT_KEY = "promptTemplate"

# Chat constants across models
END_CONVERSATION_TOKEN = "##END_CONVERSATION##"
METRICS_SERVICE_NAME = f"GAABUseCase-{os.getenv(USE_CASE_UUID_ENV_VAR)}"
DEFAULT_DDB_MESSAGE_TTL = 60 * 60 * 24  # 24 hours in seconds
DEFAULT_RAG_CHAIN_TYPE = "stuff"
DEFAULT_KENDRA_NUMBER_OF_DOCS = 2
DEFAULT_RETURN_SOURCE_DOCS = False
DEFAULT_MAX_TOKENS_TO_SAMPLE = 256
DEFAULT_VERBOSE_MODE = False
DEFAULT_RAG_ENABLED_MODE = False
DEFAULT_STREAMING_MODE = False
DEFAULT_TEMPERATURE = 0.0
DEFAULT_PLACEHOLDERS = ["history", "input"]
DEFAULT_RAG_PLACEHOLDERS = ["chat_history", "context", "question"]
DEFAULT_RETURN_SOURCE_DOCS = False
DEFAULT_HUGGINGFACE_TASK = "text-generation"

# Bedrock text generation models
DEFAULT_BEDROCK_MODELS_MAP = {
    BedrockModelProviders.AMAZON.value: "amazon.titan-text-express-v1",
    BedrockModelProviders.AI21.value: "ai21.j2-mid",
    BedrockModelProviders.ANTHROPIC.value: "anthropic.claude-instant-v1",
}
DEFAULT_BEDROCK_MODEL_FAMILY = BedrockModelProviders.AMAZON.value

DEFAULT_MODELS_MAP = {
    LLMProviderTypes.HUGGINGFACE.value: "google/flan-t5-xxl",
    LLMProviderTypes.HUGGINGFACE_ENDPOINT.value: "google/flan-t5-xxl",
    LLMProviderTypes.ANTHROPIC.value: "claude-instant-v1",
    LLMProviderTypes.BEDROCK.value: DEFAULT_BEDROCK_MODELS_MAP[DEFAULT_BEDROCK_MODEL_FAMILY],
    LLMProviderTypes.SAGEMAKER.value: "default",
}

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
LEGACY_MODELS_ENV_VAR = "LEGACY_MODELS"
