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

from langchain.prompts import PromptTemplate
from langchain.chains.conversational_retrieval.prompts import CONDENSE_QUESTION_PROMPT
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
TRACE_ID_ENV_VAR = "_X_AMZN_TRACE_ID"
CHAT_REQUIRED_ENV_VARS = [
    LLM_PARAMETERS_SSM_KEY_ENV_VAR,
    CONVERSATION_TABLE_NAME_ENV_VAR,
    WEBSOCKET_CALLBACK_URL_ENV_VAR,
    RAG_ENABLED_ENV_VAR,
    TRACE_ID_ENV_VAR,
]

# Event keys
USER_ID_EVENT_KEY = "UserId"
CONVERSATION_ID_EVENT_KEY = "conversationId"
QUESTION_EVENT_KEY = "question"
PROMPT_EVENT_KEY = "promptTemplate"

# Chat constants across models
END_CONVERSATION_TOKEN = "##END_CONVERSATION##"
USER_QUERY_LENGTH = 2500
PROMPT_LENGTH = 2000
METRICS_SERVICE_NAME = f"GAABUseCase-{os.getenv(USE_CASE_UUID_ENV_VAR)}"
DEFAULT_DDB_MESSAGE_TTL = 60 * 60 * 24  # 24 hours in seconds
DEFAULT_RAG_CHAIN_TYPE = "stuff"
DEFAULT_KENDRA_NUMBER_OF_DOCS = 2
DEFAULT_RETURN_SOURCE_DOCS = False
DEFAULT_MAX_TOKENS_TO_SAMPLE = 256
DEFAULT_VERBOSE_MODE = False

RAG_KEY = "RAG"
HUGGINGFACE_RAG = LLMProviderTypes.HUGGING_FACE.value + RAG_KEY
ANTHROPIC_RAG = LLMProviderTypes.ANTHROPIC.value + RAG_KEY
BEDROCK_RAG = LLMProviderTypes.BEDROCK.value + RAG_KEY

MEMORY_CONFIG = {
    LLMProviderTypes.HUGGING_FACE.value: {
        "history": "history",
        "input": "input",
        "context": None,
        "ai_prefix": "AI",
        "human_prefix": "Human",
        "output": None,
    },
    HUGGINGFACE_RAG: {
        "history": "chat_history",
        "input": "question",
        "context": "context",
        "ai_prefix": "AI",
        "human_prefix": "Human",
        "output": "answer",
    },
    LLMProviderTypes.ANTHROPIC.value: {
        "history": "history",
        "input": "input",
        "context": None,
        "ai_prefix": "A",
        "human_prefix": "H",
        "output": None,
    },
    ANTHROPIC_RAG: {
        "history": "chat_history",
        "input": "question",
        "context": "context",
        "ai_prefix": "A",
        "human_prefix": "H",
        "output": "answer",
    },
    LLMProviderTypes.BEDROCK.value: {
        "history": "history",
        "input": "input",
        "context": None,
        "ai_prefix": {
            BedrockModelProviders.ANTHROPIC.value: "A",
            BedrockModelProviders.AMAZON.value: "Bot",
            BedrockModelProviders.AI21.value: "AI",
            BedrockModelProviders.META.value: "AI",
            BedrockModelProviders.COHERE.value: "AI",
        },
        "human_prefix": {
            BedrockModelProviders.ANTHROPIC.value: "H",
            BedrockModelProviders.AMAZON.value: "User",
            BedrockModelProviders.AI21.value: "Human",
            BedrockModelProviders.META.value: "Human",
            BedrockModelProviders.COHERE.value: "Human",
        },
        "output": None,
    },
    BEDROCK_RAG: {
        "history": "chat_history",
        "input": "question",
        "context": "context",
        "ai_prefix": {
            BedrockModelProviders.ANTHROPIC.value: "A",
            BedrockModelProviders.AMAZON.value: "Bot",
            BedrockModelProviders.AI21.value: "AI",
            BedrockModelProviders.META.value: "AI",
            BedrockModelProviders.COHERE.value: "AI",
        },
        "human_prefix": {
            BedrockModelProviders.ANTHROPIC.value: "H",
            BedrockModelProviders.AMAZON.value: "User",
            BedrockModelProviders.AI21.value: "Human",
            BedrockModelProviders.META.value: "Human",
            BedrockModelProviders.COHERE.value: "Human",
        },
        "output": "answer",
    },
}

DEFAULT_CHAT_PROMPT = """{history}

{input}"""

# HuggingFace non-RAG constants
DEFAULT_HUGGINGFACE_TASK = "text-generation"
DEFAULT_HUGGINGFACE_TEMPERATURE = 0.1
MIN_HUGGINGFACE_TEMPERATURE = 0.0
MAX_HUGGINGFACE_TEMPERATURE = 100.0
DEFAULT_HUGGINGFACE_RAG_ENABLED_MODE = True
DEFAULT_HUGGINGFACE_STREAMING_MODE = False
DEFAULT_HUGGINGFACE_MODEL = "google/flan-t5-xxl"

DEFAULT_HUGGINGFACE_PROMPT = DEFAULT_CHAT_PROMPT
DEFAULT_HUGGINGFACE_PLACEHOLDERS = [
    MEMORY_CONFIG[LLMProviderTypes.HUGGING_FACE.value]["history"],
    MEMORY_CONFIG[LLMProviderTypes.HUGGING_FACE.value]["input"],
]

# HuggingFace RAG constants
DEFAULT_HUGGINGFACE_RAG_PROMPT = """References:
{context}

Carefully read the reference passages above and try to truthfully answer the Human's question. If the answer is not explicitly contained within the references, respond with "Sorry I don't know". It is very important that you respond "Sorry I don't know" if the answer is not found within the references above. Do not make use of any information outside of the references. Try to be brief and write a response in no more than 5 complete sentences.

Current conversation:
{chat_history}

Human: {question}
AI:"""

DEFAULT_HUGGINGFACE_RAG_PLACEHOLDERS = [
    MEMORY_CONFIG[HUGGINGFACE_RAG]["history"],
    MEMORY_CONFIG[HUGGINGFACE_RAG]["input"],
    MEMORY_CONFIG[HUGGINGFACE_RAG]["context"],
]

DEFAULT_META_PROMPT = f"[INST] {DEFAULT_CHAT_PROMPT} [/INST]"
DEFAULT_META_RAG_PROMPT = f"[INST] {DEFAULT_HUGGINGFACE_RAG_PROMPT} [/INST]"

# Anthropic non-RAG constants
DEFAULT_ANTHROPIC_MODEL = "claude-instant-v1"
DEFAULT_ANTHROPIC_TEMPERATURE = 1.0
DEFAULT_ANTHROPIC_RAG_ENABLED_MODE = True
DEFAULT_ANTHROPIC_STREAMING_MODE = True

DEFAULT_ANTHROPIC_PROMPT = """

Human: You are a friendly AI assistant that is helpful, honest, and harmless.

Here is the current conversation:
{history}

{input}

Assistant:"""

DEFAULT_ANTHROPIC_PLACEHOLDERS = [
    MEMORY_CONFIG[LLMProviderTypes.ANTHROPIC.value]["history"],
    MEMORY_CONFIG[LLMProviderTypes.ANTHROPIC.value]["input"],
]

# Anthropic RAG constants
# 2 newlines are required for Anthropic prompts before Human/Assistant dialogs. For reference, see: https://docs.anthropic.com/claude/docs/introduction-to-prompt-design
DEFAULT_ANTHROPIC_RAG_PROMPT = """

Human: You are a friendly AI assistant. You provide answers only based on the provided reference passages.

Here are reference passages in <references></references> tags:
<references>
{context}
</references>

Carefully read the references above and thoughtfully answer the question below. If the answer can not be extracted from the references, then respond with "Sorry I don't know". It is very important that you only use information found within the references to answer. Try to be brief in your response.

Here is the current chat history:
{chat_history}

Question: {question}

Assistant:"""

DEFAULT_ANTHROPIC_RAG_PLACEHOLDERS = [
    MEMORY_CONFIG[ANTHROPIC_RAG]["history"],
    MEMORY_CONFIG[ANTHROPIC_RAG]["input"],
    MEMORY_CONFIG[ANTHROPIC_RAG]["context"],
]

# Bedrock constants
DEFAULT_BEDROCK_MODEL_FAMILY = BedrockModelProviders.AMAZON.value

# Bedrock text generation models
BEDROCK_MODEL_MAP = {
    BedrockModelProviders.AMAZON.value: {
        "TITAN_TEXT_EXPRESS": "amazon.titan-text-express-v1",
        "TITAN_TEXT_LITE": "titan-text-lite-v1",
        "DEFAULT": "amazon.titan-text-express-v1",
    },
    BedrockModelProviders.AI21.value: {
        "AI21_J2_MID": "ai21.j2-mid",
        "AI21_J2_ULTRA": "ai21.j2-ultra",
        "DEFAULT": "ai21.j2-mid",
    },
    BedrockModelProviders.ANTHROPIC.value: {
        "ANTHROPIC_CLAUDE_INSTANT_V1": "anthropic.claude-instant-v1",
        "ANTHROPIC_CLAUDE_V1": "anthropic.claude-v1",
        "ANTHROPIC_CLAUDE_V2": "anthropic.claude-v2",
        "ANTHROPIC_CLAUDE_V2.1": "anthropic.claude-v2:1",
        "DEFAULT": "anthropic.claude-instant-v1",
    },
    BedrockModelProviders.META.value: {
        "LLAMA_2_CHAT_13_B": "meta.llama2-13b-chat-v1",
        "LLAMA_2_CHAT_70_B": "meta.llama2-70b-chat-v1",
        "DEFAULT": "meta.llama2-13b-chat-v1",
    },
    BedrockModelProviders.COHERE.value: {
        "COMMAND": "cohere.command-text-v14",
        "COMMAND_LIGHT": "cohere.command-light-text-v14",
        "DEFAULT": "cohere.command-light-text-v14",
    },
}

DEFAULT_BEDROCK_TEMPERATURE_MAP = {
    BedrockModelProviders.AMAZON.value: 0.0,
    BedrockModelProviders.AI21.value: 0.7,
    BedrockModelProviders.ANTHROPIC.value: 1,
    BedrockModelProviders.META.value: 0.5,
    BedrockModelProviders.COHERE.value: 0.75,
}
BEDROCK_STOP_SEQUENCES = {
    BedrockModelProviders.ANTHROPIC.value: [],
    BedrockModelProviders.AMAZON.value: ["|"],
    BedrockModelProviders.AI21.value: [],
    BedrockModelProviders.META.value: [],
    BedrockModelProviders.COHERE.value: [],
}
DEFAULT_BEDROCK_RAG_ENABLED_MODE = False
DEFAULT_BEDROCK_STREAMING_MODE = False

# Bedrock non-RAG constants
DEFAULT_BEDROCK_PROMPT = {
    BedrockModelProviders.AMAZON.value: DEFAULT_CHAT_PROMPT,
    BedrockModelProviders.AI21.value: DEFAULT_CHAT_PROMPT,
    BedrockModelProviders.ANTHROPIC.value: DEFAULT_ANTHROPIC_PROMPT,
    BedrockModelProviders.META.value: DEFAULT_META_PROMPT,
    BedrockModelProviders.COHERE.value: DEFAULT_CHAT_PROMPT,
}

DEFAULT_BEDROCK_PLACEHOLDERS = [
    MEMORY_CONFIG[LLMProviderTypes.ANTHROPIC.value]["history"],
    MEMORY_CONFIG[LLMProviderTypes.ANTHROPIC.value]["input"],
]

# Bedrock RAG constants
DEFAULT_BEDROCK_RAG_PROMPT = {
    BedrockModelProviders.AMAZON.value: """Instructions: You are an AI Assistant created to help answer the User's question. You are only to answer the User's question using the provided references. You are not allowed to make things up or use your own knowledge. Only use what is provided between the <references> XML tags.

Here are the only references you can use:
<references>
{context}
</references>

Given the references provided above, answer the User's question. If the answer is not explicitly in the provided references, respond with "Sorry, I don't know". It is very important that you say "Sorry, I don't know" if the answer isn't in the references. Take your time, think step by step, and do not make anything up.

{chat_history}
User: {question}
Bot:""",
    BedrockModelProviders.AI21.value: DEFAULT_HUGGINGFACE_RAG_PROMPT,
    BedrockModelProviders.ANTHROPIC.value: DEFAULT_ANTHROPIC_RAG_PROMPT,
    BedrockModelProviders.META.value: DEFAULT_META_RAG_PROMPT,
    BedrockModelProviders.COHERE.value: DEFAULT_HUGGINGFACE_RAG_PROMPT,
}

DEFAULT_BEDROCK_RAG_PLACEHOLDERS = [
    MEMORY_CONFIG[BEDROCK_RAG]["history"],
    MEMORY_CONFIG[BEDROCK_RAG]["input"],
    MEMORY_CONFIG[BEDROCK_RAG]["context"],
]

# 2 newlines are required for Anthropic prompts before Human/Assistant dialogs. For reference, see: https://docs.anthropic.com/claude/docs/introduction-to-prompt-design
DEFAULT_BEDROCK_ANTHROPIC_CONDENSING_PROMPT = """

Human: Given the following conversation and a follow up question, rephrase the follow up question to be a standalone question.

Chat history:
{chat_history}

Follow up question: {question}

Assistant: Standalone question:"""


DEFAULT_BEDROCK_ANTHROPIC_CONDENSING_PROMPT_TEMPLATE = PromptTemplate.from_template(
    DEFAULT_BEDROCK_ANTHROPIC_CONDENSING_PROMPT
)

DEFAULT_BEDROCK_META_CONDENSING_PROMPT_TEMPLATE = PromptTemplate.from_template(
    f"[INST] {CONDENSE_QUESTION_PROMPT.template} [/INST]"
)

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
