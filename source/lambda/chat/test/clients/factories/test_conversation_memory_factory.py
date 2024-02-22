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
from copy import deepcopy

import pytest
from clients.factories.conversation_memory_factory import ConversationMemoryFactory
from shared.memory.ddb_chat_memory import DynamoDBChatMemory
from utils.constants import CONVERSATION_TABLE_NAME_ENV_VAR

HUGGINGFACE_PROMPT = """\n\n{history}\n\n{input}"""


@pytest.mark.parametrize(
    "prompt, is_streaming, rag_enabled, return_source_docs, model_id",
    [
        (
            HUGGINGFACE_PROMPT,
            False,
            False,
            False,
            "google/flan-t5-xxl",
        )
    ],
)
def test_get_ddb_memory_success(llm_config, model_id, dynamodb_resource):
    os.environ[CONVERSATION_TABLE_NAME_ENV_VAR] = "fake-table"
    config = json.loads(llm_config["Parameter"]["Value"])
    response = ConversationMemoryFactory().get_conversation_memory(config, "fake-user-id", "fake-conversation-id", [])
    assert type(response) == DynamoDBChatMemory
    assert response.chat_memory.user_id == "fake-user-id"
    assert response.chat_memory.conversation_id == "fake-conversation-id"
    assert response.chat_memory.table == dynamodb_resource.Table(os.environ[CONVERSATION_TABLE_NAME_ENV_VAR])


@pytest.mark.parametrize(
    "prompt, is_streaming, rag_enabled, return_source_docs, model_id",
    [
        (
            HUGGINGFACE_PROMPT,
            False,
            False,
            False,
            "google/flan-t5-xxl",
        )
    ],
)
def test_get_ddb_memory_error(llm_config, model_id, setup_environment):
    errors_list = []
    config = deepcopy(json.loads(llm_config["Parameter"]["Value"]))
    config["ConversationMemoryType"] = "RDS"
    response = ConversationMemoryFactory().get_conversation_memory(
        config, "fake-user-id", "fake-conversation-id", errors_list
    )
    assert response is None
    assert errors_list == ["Unsupported Memory base type: RDS. Supported types are: ['DynamoDB']"]


@pytest.mark.parametrize(
    "prompt, is_streaming, rag_enabled, return_source_docs, model_id",
    [
        (
            HUGGINGFACE_PROMPT,
            False,
            False,
            False,
            "google/flan-t5-xxl",
        )
    ],
)
def test_get_ddb_memory_missing_table_name(model_id, llm_config):
    os.environ.pop(CONVERSATION_TABLE_NAME_ENV_VAR)
    errors_list = []
    config = deepcopy(json.loads(llm_config["Parameter"]["Value"]))
    response = ConversationMemoryFactory().get_conversation_memory(
        config, "fake-user-id", "fake-conversation-id", errors_list
    )
    assert response is None
    assert errors_list == [
        f"Missing required environment variable {CONVERSATION_TABLE_NAME_ENV_VAR} which is required for constructing conversation memory for the LLM."
    ]


@pytest.mark.parametrize(
    "prompt, is_streaming, rag_enabled, return_source_docs, model_id",
    [
        (
            HUGGINGFACE_PROMPT,
            False,
            False,
            False,
            "google/flan-t5-xxl",
        )
    ],
)
def test_get_ddb_memory_missing_memory_type(llm_config, model_id):
    errors_list = []
    config = deepcopy(json.loads(llm_config["Parameter"]["Value"]))
    del config["ConversationMemoryType"]
    response = ConversationMemoryFactory().get_conversation_memory(
        config, "fake-user-id", "fake-conversation-id", errors_list
    )
    assert response is None
    assert errors_list == [
        "Missing required field ConversationMemoryType in the config which is required for constructing conversation memory for the LLM."
    ]
