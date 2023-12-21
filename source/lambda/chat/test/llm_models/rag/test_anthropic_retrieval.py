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
from llm_models.rag.anthropic_retrieval import AnthropicRetrievalLLM
from shared.knowledge.kendra_knowledge_base import KendraKnowledgeBase
from shared.memory.ddb_chat_memory import DynamoDBChatMemory
from shared.memory.ddb_enhanced_message_history import DynamoDBChatMessageHistory
from utils.constants import (
    DEFAULT_ANTHROPIC_MODEL,
    DEFAULT_ANTHROPIC_RAG_PLACEHOLDERS,
    DEFAULT_ANTHROPIC_RAG_PROMPT,
    DEFAULT_ANTHROPIC_TEMPERATURE,
)
from utils.custom_exceptions import LLMBuildError

mocked_doc = Document(**{"page_content": "some-page-content-1", "metadata": {"source": "fake-url-1"}})


@pytest.fixture(autouse=True)
def anthropic_model(is_streaming, setup_environment):
    chat = AnthropicRetrievalLLM(
        api_token="fake-token",
        conversation_memory=DynamoDBChatMemory(
            DynamoDBChatMessageHistory("fake-table", "fake-conversation-id", "fake-user-id")
        ),
        knowledge_base=KendraKnowledgeBase(),
        model=DEFAULT_ANTHROPIC_MODEL,
        model_params={
            "top_p": {"Type": "float", "Value": "0.2"},
            "max_tokens_to_sample": {"Type": "integer", "Value": "200"},
        },
        prompt_template=DEFAULT_ANTHROPIC_RAG_PROMPT,
        streaming=is_streaming,
        temperature=0.3,
        verbose=False,
        callbacks=None,
    )
    yield chat


@pytest.mark.parametrize("chat_fixture, is_streaming", [("anthropic_model", False), ("anthropic_model", True)])
def test_implement_error_not_raised(chat_fixture, is_streaming, request):
    chat_model = request.getfixturevalue(chat_fixture)
    try:
        assert chat_model.model == DEFAULT_ANTHROPIC_MODEL
        assert chat_model.prompt_template.template == DEFAULT_ANTHROPIC_RAG_PROMPT
        assert set(chat_model.prompt_template.input_variables) == set(DEFAULT_ANTHROPIC_RAG_PLACEHOLDERS)
        assert chat_model.model_params == {
            "temperature": 0.3,
            "max_tokens_to_sample": 200,
            "top_p": 0.2,
        }
        assert chat_model.api_token == "fake-token"
        assert chat_model.streaming == is_streaming
        assert chat_model.verbose == False
        assert chat_model.knowledge_base.kendra_index_id == "fake-kendra-index-id"
        assert chat_model.conversation_memory.chat_memory.messages == []
        assert type(chat_model.conversation_chain) == ConversationalRetrievalChain
        assert type(chat_model.conversation_memory) == DynamoDBChatMemory
    except NotImplementedError as ex:
        raise Exception(ex)


@mock.patch("langchain.chains.ConversationalRetrievalChain.__call__")
@pytest.mark.parametrize("chat_fixture, is_streaming", [("anthropic_model", False), ("anthropic_model", True)])
def test_generate(mock_docs, chat_fixture, request, setup_environment):
    model = request.getfixturevalue(chat_fixture)
    conversation_chain_output = {
        "answer": "some answer based on context",
        "source_documents": [{"page_content": "some-content-1"}, {"page_content": "some-content-2"}],
    }
    mock_docs.return_value = conversation_chain_output
    assert model.generate("What is lambda?") == conversation_chain_output


@pytest.mark.parametrize("is_streaming", [False, True])
def test_exception_for_failed_model_incorrect_key(setup_environment, is_streaming):
    with pytest.raises(LLMBuildError) as error:
        with mock.patch(
            "shared.knowledge.kendra_retriever.CustomKendraRetriever.get_relevant_documents"
        ) as mocked_kendra_docs:
            mocked_kendra_docs.return_value = [mocked_doc]

            chat = AnthropicRetrievalLLM(
                api_token="fake-token",
                conversation_memory=DynamoDBChatMemory(
                    DynamoDBChatMessageHistory("fake-table", "fake-conversation-id", "fake-user-id")
                ),
                knowledge_base=KendraKnowledgeBase(),
                model="fake-model",
                model_params={
                    "top_p": {"Type": "float", "Value": "0.2"},
                    "max_tokens_to_sample": {"Type": "integer", "Value": "200"},
                },
                prompt_template=DEFAULT_ANTHROPIC_RAG_PROMPT,
                streaming=is_streaming,
                verbose=False,
                callbacks=None,
            )
            with mock.patch("langchain.chat_models.ChatAnthropic._generate") as mocked_hub_call:
                mocked_hub_call.side_effect = AuthenticationError(
                    message="Error 401: Wrong API key",
                    body={},
                    response=Response(401, json={"id": "fake-id"}),
                    request=Request(method="some-method", url="fake-url"),
                )
                chat.generate("What is lambda?")

    error.value.args[
        0
    ] == "ChatAnthropic model construction failed. API key was incorrect. Error: Error 401: Wrong API key"
