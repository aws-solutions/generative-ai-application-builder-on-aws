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

import json
import os

import pytest
from clients.builders.huggingface_builder import HuggingFaceBuilder
from shared.knowledge.kendra_knowledge_base import KendraKnowledgeBase
from shared.memory.ddb_chat_memory import DynamoDBChatMemory
from utils.constants import (
    CHAT_IDENTIFIER,
    CONVERSATION_ID_EVENT_KEY,
    CONVERSATION_TABLE_NAME_ENV_VAR,
    LLM_PROVIDER_API_KEY_ENV_VAR,
    RAG_CHAT_IDENTIFIER,
    USER_ID_EVENT_KEY,
)
from utils.enum_types import LLMProviderTypes

# Testing LLMBuilder using subclass
HUGGINGFACE_PROMPT = """\n\n{history}\n\n{input}"""
HUGGINGFACE_RAG_PROMPT = """{context}\n\n{chat_history}\n\n{question}"""
MEMORY_CONFIG = {
    CHAT_IDENTIFIER: {
        "history": "history",
        "input": "input",
        "context": None,
        "ai_prefix": "AI",
        "human_prefix": "Human",
        "output": None,
    },
    RAG_CHAT_IDENTIFIER: {
        "history": "chat_history",
        "input": "question",
        "context": "context",
        "ai_prefix": "AI",
        "human_prefix": "Human",
        "output": "answer",
    },
}


@pytest.mark.parametrize(
    "use_case, prompt, is_streaming, rag_enabled, return_source_docs, model_id",
    [
        (
            CHAT_IDENTIFIER,
            HUGGINGFACE_PROMPT,
            False,
            False,
            False,
            "google/flan-t5-xxl",
        ),
        (
            RAG_CHAT_IDENTIFIER,
            HUGGINGFACE_RAG_PROMPT,
            False,
            True,
            False,
            "google/flan-t5-xxl",
        ),
        (
            RAG_CHAT_IDENTIFIER,
            HUGGINGFACE_RAG_PROMPT,
            False,
            True,
            True,
            "google/flan-t5-xxl",
        ),
    ],
)
def test_knowledge_base_builder(
    use_case,
    model_id,
    prompt,
    rag_enabled,
    return_source_docs,
    llm_config,
    chat_event,
    setup_environment,
    huggingface_dynamodb_defaults_table,
):
    config = json.loads(llm_config["Parameter"]["Value"])
    builder = HuggingFaceBuilder(
        llm_config=config,
        rag_enabled=rag_enabled,
        connection_id="fake-connection-id",
        conversation_id="fake-conversation-id",
    )

    config = json.loads(llm_config["Parameter"]["Value"])
    chat_event_body = json.loads(chat_event["body"])

    builder.set_model_defaults(LLMProviderTypes.HUGGINGFACE, "google/flan-t5-xxl")
    builder.validate_event_input_sizes(chat_event_body)
    builder.set_knowledge_base()

    assert builder.llm_config == config

    if rag_enabled:
        assert type(builder.knowledge_base) == KendraKnowledgeBase
        assert builder.knowledge_base.kendra_index_id == "fake-kendra-index-id"
        assert builder.knowledge_base.number_of_docs == 2
        assert builder.knowledge_base.return_source_documents == return_source_docs
    else:
        assert builder.knowledge_base == None


@pytest.mark.parametrize(
    "use_case, prompt, is_streaming, rag_enabled, return_source_docs, model_id",
    [
        (
            CHAT_IDENTIFIER,
            HUGGINGFACE_PROMPT,
            False,
            False,
            False,
            "google/flan-t5-xxl",
        ),
        (
            RAG_CHAT_IDENTIFIER,
            HUGGINGFACE_RAG_PROMPT,
            False,
            True,
            False,
            "google/flan-t5-xxl",
        ),
        (
            RAG_CHAT_IDENTIFIER,
            HUGGINGFACE_RAG_PROMPT,
            False,
            True,
            True,
            "google/flan-t5-xxl",
        ),
    ],
)
def test_conversation_memory_builder(
    use_case,
    model_id,
    prompt,
    chat_event,
    rag_enabled,
    llm_config,
    dynamodb_resource,
    huggingface_dynamodb_defaults_table,
):
    os.environ[CONVERSATION_TABLE_NAME_ENV_VAR] = "fake-table"
    config = json.loads(llm_config["Parameter"]["Value"])
    chat_event_body = json.loads(chat_event["body"])
    builder = HuggingFaceBuilder(
        llm_config=config,
        rag_enabled=rag_enabled,
        connection_id="fake-connection-id",
        conversation_id="fake-conversation-id",
    )
    user_id = chat_event.get("requestContext", {}).get("authorizer", {}).get(USER_ID_EVENT_KEY, {})

    builder.set_model_defaults(LLMProviderTypes.HUGGINGFACE, "google/flan-t5-xxl")
    builder.validate_event_input_sizes(chat_event_body)
    builder.set_conversation_memory(user_id, chat_event_body[CONVERSATION_ID_EVENT_KEY])

    assert builder.llm_config == config
    assert type(builder.conversation_memory) == DynamoDBChatMemory
    assert builder.conversation_memory.chat_memory.user_id == "fake-user-id"
    assert builder.conversation_memory.chat_memory.conversation_id == "fake-conversation-id"
    assert builder.conversation_memory.chat_memory.table == dynamodb_resource.Table(
        os.environ[CONVERSATION_TABLE_NAME_ENV_VAR]
    )


@pytest.mark.parametrize(
    "use_case, prompt, is_streaming, rag_enabled, return_source_docs, model_id",
    [
        (
            CHAT_IDENTIFIER,
            HUGGINGFACE_PROMPT,
            False,
            False,
            False,
            "google/flan-t5-xxl",
        ),
        (
            RAG_CHAT_IDENTIFIER,
            HUGGINGFACE_RAG_PROMPT,
            False,
            True,
            False,
            "google/flan-t5-xxl",
        ),
        (
            RAG_CHAT_IDENTIFIER,
            HUGGINGFACE_RAG_PROMPT,
            False,
            True,
            True,
            "google/flan-t5-xxl",
        ),
    ],
)
def test_api_key_builder(
    use_case, model_id, prompt, rag_enabled, llm_config, chat_event, setup_secret, huggingface_dynamodb_defaults_table
):
    os.environ[LLM_PROVIDER_API_KEY_ENV_VAR] = "fake-secret-name"
    config = json.loads(llm_config["Parameter"]["Value"])
    chat_event_body = json.loads(chat_event["body"])
    builder = HuggingFaceBuilder(
        llm_config=config,
        rag_enabled=rag_enabled,
        connection_id="fake-connection-id",
        conversation_id="fake-conversation-id",
    )
    builder.set_model_defaults(LLMProviderTypes.HUGGINGFACE, "google/flan-t5-xxl")
    builder.validate_event_input_sizes(chat_event_body)
    builder.set_api_key()

    assert builder.llm_config == config
    assert builder.api_key == "fake-secret-value"
