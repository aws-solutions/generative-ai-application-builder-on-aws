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
from clients.builders.bedrock_builder import BedrockBuilder
from shared.knowledge.kendra_knowledge_base import KendraKnowledgeBase
from shared.memory.ddb_enhanced_message_history import DynamoDBChatMessageHistory
from utils.constants import (
    BEDROCK_GUARDRAIL_IDENTIFIER_KEY,
    BEDROCK_GUARDRAIL_VERSION_KEY,
    CHAT_IDENTIFIER,
    CONVERSATION_ID_EVENT_KEY,
    CONVERSATION_TABLE_NAME_ENV_VAR,
    MESSAGE_KEY,
    RAG_CHAT_IDENTIFIER,
    USER_ID_EVENT_KEY,
)
from utils.enum_types import KnowledgeBaseTypes, LLMProviderTypes

# Testing LLMBuilder using subclass
BASIC_PROMPT = """\n\n{history}\n\n{input}"""
BASIC_RAG_PROMPT = """{context}\n\n{history}\n\n{input}"""


@pytest.mark.parametrize(
    "use_case, prompt, is_streaming, rag_enabled, knowledge_base_type, return_source_docs, model_id",
    [
        (
            CHAT_IDENTIFIER,
            BASIC_PROMPT,
            False,
            False,
            None,
            False,
            "amazon.titan-text-express-v1",
        ),
        (
            RAG_CHAT_IDENTIFIER,
            BASIC_RAG_PROMPT,
            False,
            True,
            KnowledgeBaseTypes.KENDRA.value,
            False,
            "amazon.titan-text-express-v1",
        ),
        (
            RAG_CHAT_IDENTIFIER,
            BASIC_RAG_PROMPT,
            False,
            True,
            KnowledgeBaseTypes.KENDRA.value,
            True,
            "amazon.titan-text-express-v1",
        ),
    ],
)
def test_knowledge_base_builder(
    use_case,
    model_id,
    prompt,
    rag_enabled,
    return_source_docs,
    bedrock_llm_config,
    chat_event,
    setup_environment,
    bedrock_dynamodb_defaults_table,
):
    config = bedrock_llm_config
    builder = BedrockBuilder(
        use_case_config=config,
        rag_enabled=rag_enabled,
        connection_id="fake-connection-id",
        conversation_id="fake-conversation-id",
    )

    config = bedrock_llm_config
    chat_event_body = json.loads(chat_event["Records"][0]["body"])

    builder.set_model_defaults(LLMProviderTypes.BEDROCK, "amazon.titan-text-express-v1")
    builder.validate_event_input_sizes(chat_event_body[MESSAGE_KEY])
    builder.set_knowledge_base()

    assert builder.use_case_config == config

    if rag_enabled:
        assert type(builder.knowledge_base) == KendraKnowledgeBase
        assert builder.knowledge_base.kendra_index_id == "fake-kendra-index-id"
        assert builder.knowledge_base.number_of_docs == 2
        assert builder.knowledge_base.return_source_documents == return_source_docs
    else:
        assert builder.knowledge_base == None


@pytest.mark.parametrize(
    "use_case, prompt, is_streaming, rag_enabled, knowledge_base_type, return_source_docs, model_id",
    [
        (
            CHAT_IDENTIFIER,
            BASIC_PROMPT,
            False,
            False,
            None,
            False,
            "amazon.titan-text-express-v1",
        ),
        (
            RAG_CHAT_IDENTIFIER,
            BASIC_RAG_PROMPT,
            False,
            True,
            KnowledgeBaseTypes.KENDRA.value,
            False,
            "amazon.titan-text-express-v1",
        ),
        (
            RAG_CHAT_IDENTIFIER,
            BASIC_RAG_PROMPT,
            False,
            True,
            KnowledgeBaseTypes.KENDRA.value,
            True,
            "amazon.titan-text-express-v1",
        ),
    ],
)
def test_conversation_memory_builder(
    use_case,
    model_id,
    prompt,
    chat_event,
    rag_enabled,
    bedrock_llm_config,
    dynamodb_resource,
    bedrock_dynamodb_defaults_table,
):
    os.environ[CONVERSATION_TABLE_NAME_ENV_VAR] = "fake-table"
    config = bedrock_llm_config
    chat_event_body = json.loads(chat_event["Records"][0]["body"])
    builder = BedrockBuilder(
        use_case_config=config,
        rag_enabled=rag_enabled,
        connection_id="fake-connection-id",
        conversation_id="fake-conversation-id",
    )
    user_id = chat_event_body.get("requestContext", {}).get("authorizer", {}).get(USER_ID_EVENT_KEY, {})

    builder.set_model_defaults(LLMProviderTypes.BEDROCK, "amazon.titan-text-express-v1")
    builder.validate_event_input_sizes(chat_event_body[MESSAGE_KEY])
    builder.set_conversation_memory(user_id, chat_event_body[MESSAGE_KEY][CONVERSATION_ID_EVENT_KEY])

    assert builder.use_case_config == config
    assert builder.conversation_history_cls == DynamoDBChatMessageHistory
    assert builder.conversation_history_params == {
        "conversation_id": "fake-conversation-id",
        "max_history_length": 10,
        "table_name": os.environ[CONVERSATION_TABLE_NAME_ENV_VAR],
        "user_id": "fake-user-id",
        "ai_prefix": "Bot",
        "human_prefix": "User",
    }


@pytest.mark.parametrize(
    "model_config, output_response",
    [
        (
            {},
            None,
        ),
        (
            {BEDROCK_GUARDRAIL_IDENTIFIER_KEY: "some-key"},
            None,
        ),
        (
            {BEDROCK_GUARDRAIL_IDENTIFIER_KEY: "fake-key", BEDROCK_GUARDRAIL_VERSION_KEY: "fake-version"},
            {"guardrailIdentifier": "fake-key", "guardrailVersion": "fake-version"},
        ),
        (
            {BEDROCK_GUARDRAIL_IDENTIFIER_KEY: None, BEDROCK_GUARDRAIL_VERSION_KEY: "fake-version"},
            None,
        ),
        (
            {BEDROCK_GUARDRAIL_IDENTIFIER_KEY: "fake-key", BEDROCK_GUARDRAIL_VERSION_KEY: None},
            None,
        ),
        (
            {BEDROCK_GUARDRAIL_VERSION_KEY: "fake-version"},
            None,
        ),
        (
            {BEDROCK_GUARDRAIL_IDENTIFIER_KEY: "fake-key"},
            None,
        ),
    ],
)
def test_get_guardrails(
    model_config,
    output_response,
):
    builder = BedrockBuilder(
        use_case_config={},
        rag_enabled=False,
        connection_id="fake-connection-id",
        conversation_id="fake-conversation-id",
    )
    assert builder.get_guardrails(model_config) == output_response
