#!/usr/bin/env python
# *********************************************************************************************************************
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
# ********************************************************************************************************************#

from unittest import mock

import pytest
from anthropic import AuthenticationError
from httpx import Request, Response
from langchain.chains import ConversationalRetrievalChain
from langchain.schema.document import Document
from llms.models.llm import LLM
from llms.rag.anthropic_retrieval import AnthropicRetrievalLLM
from shared.defaults.model_defaults import ModelDefaults
from shared.knowledge.kendra_knowledge_base import KendraKnowledgeBase
from shared.memory.ddb_chat_memory import DynamoDBChatMemory
from shared.memory.ddb_enhanced_message_history import DynamoDBChatMessageHistory
from utils.constants import DEFAULT_RAG_PLACEHOLDERS, RAG_CHAT_IDENTIFIER
from utils.custom_exceptions import LLMInvocationError

ANTHROPIC_RAG_PROMPT = """{context}\n\n{chat_history}\n\n{question}"""
RAG_ENABLED = True

mocked_doc = Document(**{"page_content": "some-page-content-1", "metadata": {"source": "fake-url-1"}})
model_provider = "Anthropic"
model_id = "claude-1"


@pytest.fixture
def llm_params(is_streaming, model_id, setup_environment, return_source_docs):
    yield LLM(
        **{
            "conversation_memory": DynamoDBChatMemory(
                DynamoDBChatMessageHistory(
                    table_name="fake-table", user_id="fake-user-id", conversation_id="fake-conversation-id"
                )
            ),
            "knowledge_base": KendraKnowledgeBase(
                {
                    "NumberOfDocs": 2,
                    "ReturnSourceDocs": return_source_docs,
                    "AttributeFilter": {
                        "AndAllFilters": [
                            {"EqualsTo": {"Key": "user_id", "Value": {"StringValue": "12345"}}},
                        ]
                    },
                    "UserContext": None,
                }
            ),
            "api_token": "fake-token",
            "model": model_id,
            "model_params": {
                "top_p": {"Type": "float", "Value": "0.2"},
                "max_tokens_to_sample": {"Type": "integer", "Value": "200"},
            },
            "prompt_template": ANTHROPIC_RAG_PROMPT,
            "prompt_placeholders": DEFAULT_RAG_PLACEHOLDERS,
            "streaming": is_streaming,
            "verbose": False,
            "temperature": 0.25,
            "callbacks": None,
        }
    )


@pytest.fixture
def anthropic_model(is_streaming, model_id, setup_environment, llm_params, return_source_docs):
    chat = AnthropicRetrievalLLM(
        llm_params=llm_params,
        model_defaults=ModelDefaults(model_provider, model_id, RAG_ENABLED),
        return_source_docs=return_source_docs,
    )
    yield chat


@pytest.mark.parametrize(
    "use_case, model_id, prompt, is_streaming, return_source_docs, chat_fixture",
    [
        (RAG_CHAT_IDENTIFIER, model_id, ANTHROPIC_RAG_PROMPT, False, False, "anthropic_model"),
        (RAG_CHAT_IDENTIFIER, model_id, ANTHROPIC_RAG_PROMPT, True, False, "anthropic_model"),
        (RAG_CHAT_IDENTIFIER, model_id, ANTHROPIC_RAG_PROMPT, False, True, "anthropic_model"),
        (RAG_CHAT_IDENTIFIER, model_id, ANTHROPIC_RAG_PROMPT, True, True, "anthropic_model"),
    ],
)
def test_implement_error_not_raised(
    use_case,
    model_id,
    prompt,
    is_streaming,
    setup_environment,
    chat_fixture,
    request,
    return_source_docs,
    anthropic_dynamodb_defaults_table,
):
    chat_model = request.getfixturevalue(chat_fixture)
    try:
        assert chat_model.model == model_id
        assert chat_model.prompt_template.template == ANTHROPIC_RAG_PROMPT
        assert set(chat_model.prompt_template.input_variables) == set(DEFAULT_RAG_PLACEHOLDERS)
        assert chat_model.model_params == {
            "temperature": 0.25,
            "max_tokens_to_sample": 200,
            "top_p": 0.2,
        }
        assert chat_model.api_token == "fake-token"
        assert chat_model.streaming == is_streaming
        assert chat_model.verbose == False
        assert chat_model.knowledge_base.kendra_index_id == "fake-kendra-index-id"
        assert chat_model.conversation_memory.chat_memory.messages == []
        assert chat_model.return_source_docs == return_source_docs
        assert type(chat_model.conversation_chain) == ConversationalRetrievalChain
        assert type(chat_model.conversation_memory) == DynamoDBChatMemory
    except NotImplementedError as ex:
        raise Exception(ex)


@pytest.mark.parametrize(
    "use_case, model_id, prompt, is_streaming, chat_fixture, return_source_docs, chain_output, expected_output",
    [
        (
            RAG_CHAT_IDENTIFIER,
            model_id,
            ANTHROPIC_RAG_PROMPT,
            False,
            "anthropic_model",
            False,
            {
                "answer": "some answer based on context",
                "other_fields": {"some_field": "some_value"},
            },
            {
                "answer": "some answer based on context",
            },
        ),
        (
            RAG_CHAT_IDENTIFIER,
            model_id,
            ANTHROPIC_RAG_PROMPT,
            True,
            "anthropic_model",
            False,
            {
                "answer": "some answer based on context",
                "other_fields": {"some_field": "some_value"},
            },
            {
                "answer": "some answer based on context",
            },
        ),
        (
            RAG_CHAT_IDENTIFIER,
            model_id,
            ANTHROPIC_RAG_PROMPT,
            False,
            "anthropic_model",
            True,
            {
                "answer": "some answer based on context",
                "source_documents": [{"page_content": "some-content-1"}, {"page_content": "some-content-2"}],
                "other_fields": {"some_field": "some_value"},
            },
            {
                "answer": "some answer based on context",
                "source_documents": [{"page_content": "some-content-1"}, {"page_content": "some-content-2"}],
            },
        ),
        (
            RAG_CHAT_IDENTIFIER,
            model_id,
            ANTHROPIC_RAG_PROMPT,
            True,
            "anthropic_model",
            True,
            {
                "answer": "some answer based on context",
                "source_documents": [{"page_content": "some-content-1"}, {"page_content": "some-content-2"}],
                "other_fields": {"some_field": "some_value"},
            },
            {
                "answer": "some answer based on context",
                "source_documents": [{"page_content": "some-content-1"}, {"page_content": "some-content-2"}],
            },
        ),
    ],
)
def test_generate(
    use_case,
    model_id,
    prompt,
    is_streaming,
    chat_fixture,
    request,
    expected_output,
    chain_output,
    setup_environment,
    return_source_docs,
    anthropic_dynamodb_defaults_table,
):
    model = request.getfixturevalue(chat_fixture)
    with mock.patch("langchain.chains.ConversationalRetrievalChain.invoke", return_value=chain_output):
        assert model.generate("What is lambda?") == expected_output


@pytest.mark.parametrize(
    "use_case, model_id, prompt, is_streaming, return_source_docs",
    [
        (RAG_CHAT_IDENTIFIER, model_id, ANTHROPIC_RAG_PROMPT, False, False),
        (RAG_CHAT_IDENTIFIER, model_id, ANTHROPIC_RAG_PROMPT, True, False),
    ],
)
def test_exception_for_failed_model_incorrect_key(
    use_case,
    prompt,
    is_streaming,
    request,
    setup_environment,
    return_source_docs,
    llm_params,
    anthropic_dynamodb_defaults_table,
):
    model_provider = "Anthropic"
    model_id = "claude-1"
    llm_params.streaming = is_streaming

    with pytest.raises(LLMInvocationError) as error:
        chat = AnthropicRetrievalLLM(
            llm_params=llm_params,
            model_defaults=ModelDefaults(model_provider, model_id, RAG_ENABLED),
            return_source_docs=return_source_docs,
        )
        with mock.patch("langchain_community.chat_models.ChatAnthropic._generate") as mocked_hub_call:
            mocked_hub_call.side_effect = AuthenticationError(
                message="Error 401: Wrong API key",
                body={},
                response=Response(401, json={"id": "fake-id"}, request=Request(method="some-method", url="fake-url")),
            )
            chat.generate("What is the weather in Seattle?")

    error.value.args[
        0
    ] == "ChatAnthropic model construction failed. API key was incorrect. Error: Error 401: Wrong API key"
