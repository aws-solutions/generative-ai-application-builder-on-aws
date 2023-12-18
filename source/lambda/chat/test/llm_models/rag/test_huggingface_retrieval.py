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
from langchain.chains import ConversationalRetrievalChain
from langchain.schema.document import Document
from llm_models.rag.huggingface_retrieval import HuggingFaceRetrievalLLM
from shared.knowledge.kendra_knowledge_base import KendraKnowledgeBase
from shared.memory.ddb_chat_memory import DynamoDBChatMemory
from shared.memory.ddb_enhanced_message_history import DynamoDBChatMessageHistory
from utils.constants import (
    DEFAULT_HUGGINGFACE_MODEL,
    DEFAULT_HUGGINGFACE_RAG_PLACEHOLDERS,
    DEFAULT_HUGGINGFACE_RAG_PROMPT,
    DEFAULT_HUGGINGFACE_TEMPERATURE,
)
from utils.custom_exceptions import LLMBuildError

mocked_doc = Document(**{"page_content": "some-page-content-1", "metadata": {"source": "fake-url-1"}})


@pytest.fixture(autouse=True)
def huggingface_model(is_streaming, setup_environment):
    chat = HuggingFaceRetrievalLLM(
        api_token="fake-token",
        conversation_memory=DynamoDBChatMemory(
            DynamoDBChatMessageHistory("fake-table", "fake-conversation-id", "fake-user-id")
        ),
        knowledge_base=KendraKnowledgeBase(),
        model=DEFAULT_HUGGINGFACE_MODEL,
        model_params={
            "max_length": {"Type": "integer", "Value": "100"},
            "top_p": {"Type": "float", "Value": "0.2"},
        },
        prompt_template=DEFAULT_HUGGINGFACE_RAG_PROMPT,
        streaming=is_streaming,
        temperature=0.3,
        verbose=False,
        callbacks=None,
    )
    yield chat


@pytest.mark.parametrize("chat_fixture, is_streaming", [("huggingface_model", False)])
def test_implement_error_not_raised(chat_fixture, is_streaming, request):
    chat_model = request.getfixturevalue(chat_fixture)
    try:
        assert chat_model.model == DEFAULT_HUGGINGFACE_MODEL
        assert chat_model.prompt_template.template == DEFAULT_HUGGINGFACE_RAG_PROMPT
        assert set(chat_model.prompt_template.input_variables) == set(DEFAULT_HUGGINGFACE_RAG_PLACEHOLDERS)
        assert chat_model.model_params == {
            "top_p": 0.2,
            "temperature": 0.3,
            "max_length": 100,
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


@pytest.mark.parametrize("chat_fixture, is_streaming", [("huggingface_model", False)])
def test_generate(chat_fixture, request, setup_environment):
    model = request.getfixturevalue(chat_fixture)
    conversation_chain_output = {
        "answer": "some answer based on context",
        "source_documents": [{"page_content": "some-content-1"}, {"page_content": "some-content-2"}],
    }

    with mock.patch("langchain.chains.ConversationalRetrievalChain.__call__") as mock_docs:
        mock_docs.return_value = conversation_chain_output
        assert model.generate("What is lambda?") == conversation_chain_output


@pytest.mark.parametrize("is_streaming", [False])
def test_exception_for_failed_model_incorrect_api_key(is_streaming):
    with pytest.raises(LLMBuildError) as error:
        with mock.patch("langchain.llms.huggingface_hub.HuggingFaceHub._call") as mocked_hub_call:
            with mock.patch(
                "shared.knowledge.kendra_retriever.CustomKendraRetriever.get_relevant_documents"
            ) as mocked_kendra_docs:
                mocked_kendra_docs.return_value = [mocked_doc]
                mocked_hub_call.side_effect = ValueError(
                    "Error raised by inference API: Authorization header is correct, but the token seems invalid"
                )
                hf = HuggingFaceRetrievalLLM(
                    api_token="fake-token",
                    conversation_memory=DynamoDBChatMemory(
                        DynamoDBChatMessageHistory("fake-table", "fake-conversation-id", "fake-user-id")
                    ),
                    knowledge_base=KendraKnowledgeBase(),
                    model=DEFAULT_HUGGINGFACE_MODEL,
                    model_params={
                        "max_length": {"Type": "integer", "Value": "100"},
                        "top_p": {"Type": "float", "Value": "0.2"},
                    },
                    prompt_template=DEFAULT_HUGGINGFACE_RAG_PROMPT,
                    streaming=is_streaming,
                    verbose=False,
                    callbacks=None,
                )
                hf.generate("What is lambda?")

        assert (
            error.value.args[0]
            == "Error raised by inference API: Authorization header is correct, but the token seems invalid"
        )
