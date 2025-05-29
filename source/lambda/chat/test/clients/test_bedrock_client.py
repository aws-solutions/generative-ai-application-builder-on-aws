# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

import json
from copy import deepcopy
from decimal import Decimal
from unittest.mock import patch

import pytest
from clients.bedrock_client import BedrockClient
from langchain_core.callbacks import BaseCallbackHandler

from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from llms.bedrock import BedrockLLM
from llms.rag.bedrock_retrieval import BedrockRetrievalLLM
from utils.constants import (
    CHAT_IDENTIFIER,
    MESSAGE_KEY,
    PROMPT_EVENT_KEY,
    RAG_CHAT_IDENTIFIER,
)
from utils.enum_types import KnowledgeBaseTypes

BEDROCK_PROMPT = """{input}"""
BEDROCK_RAG_PROMPT = """{context}\n\n{input}"""
DEFAULT_PROMPT_PLACEHOLDERS = ["input"]
DEFAULT_PROMPT_RAG_PLACEHOLDERS = ["context", "input"]
model_id = "amazon.fake-model"
table_name = "fake-table"


@pytest.fixture
def setup_test_table(dynamodb_resource):
    """Create the mock DynamoDB table."""
    dynamodb_resource.create_table(
        TableName=table_name,
        KeySchema=[{"AttributeName": "key", "KeyType": "HASH"}],
        AttributeDefinitions=[{"AttributeName": "key", "AttributeType": "S"}],
        BillingMode="PAY_PER_REQUEST",
    )
    yield dynamodb_resource


@pytest.fixture
def parsed_bedrock_config(dynamodb_resource, bedrock_llm_config):
    """Add a row of to the setup table and return the config added as row"""
    parsed_config = deepcopy(bedrock_llm_config)
    parsed_config["LlmParams"]["BedrockLlmParams"]["ModelId"] = model_id
    parsed_config["LlmParams"]["ModelParams"] = {
        "maxTokenCount": {"Type": "integer", "Value": "100"},
        "topP": {"Type": "float", "Value": "0.3"},
    }

    mock_table = dynamodb_resource.Table(table_name)
    mock_table.put_item(
        Item={
            "key": "fake-key",
            "config": json.loads(json.dumps(parsed_config), parse_float=Decimal),
        }
    )
    yield parsed_config


@pytest.mark.parametrize(
    "prompt, is_streaming, rag_enabled, knowledge_base_type, return_source_docs, model_id",
    [(BEDROCK_PROMPT, False, False, None, False, model_id)],
)
def test_get_model(bedrock_llm_config, model_id, chat_event, return_source_docs):
    with patch("clients.bedrock_client.BedrockClient.construct_chat_model") as mocked_chat_model_construction:
        with patch("clients.bedrock_client.BedrockClient.retrieve_use_case_config") as mocked_retrieve_llm_config:
            mocked_chat_model_construction.return_value = None
            mocked_retrieve_llm_config.return_value = bedrock_llm_config
            client = BedrockClient(connection_id="fake-connection-id", rag_enabled=False)

            try:
                event_body = json.loads(chat_event["Records"][0]["body"])
                assert client.get_model(event_body[MESSAGE_KEY], "fake-user-uuid") is None
                assert client.builder.conversation_id == "fake-conversation-id"
            except Exception as exc:
                assert False, f"'client.get_model' raised an exception {exc}"


@pytest.mark.parametrize(
    "use_case, is_streaming, rag_enabled, knowledge_base_type, return_source_docs, llm_type, prompt, placeholders, model_id",
    [
        (
            CHAT_IDENTIFIER,
            False,
            False,
            None,
            False,
            BedrockLLM,
            BEDROCK_PROMPT,
            DEFAULT_PROMPT_PLACEHOLDERS,
            model_id,
        ),
        (
            RAG_CHAT_IDENTIFIER,
            False,
            True,
            KnowledgeBaseTypes.KENDRA.value,
            False,
            BedrockRetrievalLLM,
            BEDROCK_RAG_PROMPT,
            DEFAULT_PROMPT_RAG_PLACEHOLDERS,
            model_id,
        ),
        (
            RAG_CHAT_IDENTIFIER,
            False,
            True,
            KnowledgeBaseTypes.KENDRA.value,
            True,
            BedrockRetrievalLLM,
            BEDROCK_RAG_PROMPT,
            DEFAULT_PROMPT_RAG_PLACEHOLDERS,
            model_id,
        ),
        (
            RAG_CHAT_IDENTIFIER,
            False,
            True,
            KnowledgeBaseTypes.KENDRA.value,
            True,
            BedrockRetrievalLLM,
            BEDROCK_RAG_PROMPT,
            DEFAULT_PROMPT_RAG_PLACEHOLDERS,
            model_id,
        ),
    ],
)
def test_construct_chat_model(
    use_case,
    model_id,
    is_streaming,
    rag_enabled,
    return_source_docs,
    llm_type,
    prompt,
    placeholders,
    chat_event,
    setup_environment,
    dynamodb_resource,
    setup_test_table,
    parsed_bedrock_config,
    bedrock_dynamodb_defaults_table,
):
    chat_event_body = json.loads(chat_event["Records"][0]["body"])
    chat_event_body[MESSAGE_KEY][PROMPT_EVENT_KEY] = prompt
    with patch(
        "clients.builders.llm_builder.WebsocketHandler",
        return_value=BaseCallbackHandler(),
    ):
        llm_client = BedrockClient(rag_enabled=rag_enabled, connection_id="fake-connection_id")
        llm_client.get_model(chat_event_body[MESSAGE_KEY], "fake-user-id")

    assert type(llm_client.builder.llm) == llm_type
    assert llm_client.builder.llm.model == parsed_bedrock_config["LlmParams"]["BedrockLlmParams"]["ModelId"]
    assert llm_client.builder.llm.model_params == {"maxTokenCount": 100, "topP": 0.3, "temperature": 0.2}

    assert llm_client.builder.llm.prompt_template == ChatPromptTemplate.from_messages(
        [
            ("system", parsed_bedrock_config["LlmParams"]["PromptParams"]["PromptTemplate"]),
            MessagesPlaceholder("history", optional=True),
            ("human", "{input}"),
        ]
    )
    assert set(llm_client.builder.llm.prompt_template.input_variables) == set(placeholders)
    assert llm_client.builder.llm.streaming == parsed_bedrock_config["LlmParams"]["Streaming"]
    assert llm_client.builder.llm.verbose == parsed_bedrock_config["LlmParams"]["Verbose"]
