#!/usr/bin/env python
# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

import os
from copy import deepcopy

import pytest

from clients.factories.conversation_memory_factory import ConversationMemoryFactory
from shared.memory.ddb_enhanced_message_history import DynamoDBChatMessageHistory
from utils.constants import CONVERSATION_TABLE_NAME_ENV_VAR

TEST_PROMPT = """\n\n{history}\n\n{input}"""
MODEL_INFO_CONFIG = {
    "history": "history",
    "input": "input",
    "context": None,
    "ai_prefix": "A",
    "human_prefix": "H",
    "output": None,
}


@pytest.mark.parametrize(
    "prompt, is_streaming, rag_enabled, knowledge_base_type, return_source_docs, model_id, history_length",
    [
        (TEST_PROMPT, False, False, None, False, "google/flan-t5-xxl", 10),
        (TEST_PROMPT, False, False, None, False, "google/flan-t5-xxl", None),
    ],
)
def test_get_ddb_memory_success(bedrock_llm_config, model_id, dynamodb_resource, history_length):
    os.environ[CONVERSATION_TABLE_NAME_ENV_VAR] = "fake-table"
    config = bedrock_llm_config
    if history_length is None:
        del config["ConversationMemoryParams"]["ChatHistoryLength"]
    memory_type, memory_inputs = ConversationMemoryFactory().get_conversation_memory(
        config, MODEL_INFO_CONFIG, "fake-user-id", "fake-conversation-id", "fake-message-id", []
    )
    assert memory_type == DynamoDBChatMessageHistory
    assert memory_inputs == {
        "table_name": os.environ[CONVERSATION_TABLE_NAME_ENV_VAR],
        "user_id": "fake-user-id",
        "conversation_id": "fake-conversation-id",
        "message_id": "fake-message-id",
        "max_history_length": history_length,
        "ai_prefix": "A",
        "human_prefix": "H",
    }


@pytest.mark.parametrize(
    "prompt, is_streaming, rag_enabled, knowledge_base_type,return_source_docs, model_id",
    [
        (
            TEST_PROMPT,
            False,
            False,
            None,
            False,
            "google/flan-t5-xxl",
        )
    ],
)
def test_get_ddb_memory_error(bedrock_llm_config, model_id, setup_environment):
    errors_list = []
    config = deepcopy(bedrock_llm_config)
    config["ConversationMemoryParams"]["ConversationMemoryType"] = "RDS"
    response = ConversationMemoryFactory().get_conversation_memory(
        config, MODEL_INFO_CONFIG, "fake-user-id", "fake-conversation-id", "fake-message-id", errors_list
    )
    assert response is None
    assert errors_list == ["Unsupported Memory base type: RDS. Supported types are: ['DynamoDB']"]


@pytest.mark.parametrize(
    "prompt, is_streaming, rag_enabled, knowledge_base_type,return_source_docs, model_id",
    [
        (
            TEST_PROMPT,
            False,
            False,
            None,
            False,
            "google/flan-t5-xxl",
        )
    ],
)
def test_get_ddb_memory_missing_table_name(model_id, bedrock_llm_config):
    os.environ.pop(CONVERSATION_TABLE_NAME_ENV_VAR)
    errors_list = []
    config = deepcopy(bedrock_llm_config)
    response = ConversationMemoryFactory().get_conversation_memory(
        config, MODEL_INFO_CONFIG, "fake-user-id", "fake-conversation-id", "fake-message-id", errors_list
    )
    assert response is None
    assert errors_list == [
        f"Missing required environment variable {CONVERSATION_TABLE_NAME_ENV_VAR} which is required for constructing conversation memory for the LLM."
    ]


@pytest.mark.parametrize(
    "prompt, is_streaming, rag_enabled, knowledge_base_type, return_source_docs, model_id",
    [
        (
            TEST_PROMPT,
            False,
            False,
            None,
            False,
            "google/flan-t5-xxl",
        )
    ],
)
def test_get_ddb_memory_missing_memory_type(bedrock_llm_config, model_id):
    errors_list = []
    config = deepcopy(bedrock_llm_config)
    del config["ConversationMemoryParams"]["ConversationMemoryType"]
    response = ConversationMemoryFactory().get_conversation_memory(
        config, MODEL_INFO_CONFIG, "fake-user-id", "fake-conversation-id", "fake-message-id", errors_list
    )
    assert response is None
    assert errors_list == [
        "Missing required field ConversationMemoryType in the config which is required for constructing conversation memory for the LLM."
    ]
