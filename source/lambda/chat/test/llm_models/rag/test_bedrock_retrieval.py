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
from langchain.chains.conversational_retrieval.prompts import CONDENSE_QUESTION_PROMPT
from langchain.schema.document import Document
from llm_models.rag.bedrock_retrieval import BedrockRetrievalLLM
from shared.knowledge.kendra_knowledge_base import KendraKnowledgeBase
from shared.memory.ddb_chat_memory import DynamoDBChatMemory
from shared.memory.ddb_enhanced_message_history import DynamoDBChatMessageHistory
from utils.constants import (
    BEDROCK_MODEL_MAP,
    DEFAULT_BEDROCK_ANTHROPIC_CONDENSING_PROMPT_TEMPLATE,
    DEFAULT_BEDROCK_META_CONDENSING_PROMPT_TEMPLATE,
    DEFAULT_BEDROCK_RAG_PLACEHOLDERS,
    DEFAULT_BEDROCK_RAG_PROMPT,
)
from utils.custom_exceptions import LLMBuildError
from utils.enum_types import BedrockModelProviders

mocked_doc = Document(**{"page_content": "some-page-content-1", "metadata": {"source": "fake-url-1"}})


@pytest.fixture(autouse=True)
def titan_model(is_streaming, setup_environment):
    chat = BedrockRetrievalLLM(
        conversation_memory=DynamoDBChatMemory(
            DynamoDBChatMessageHistory("fake-table", "fake-conversation-id", "fake-user-id")
        ),
        knowledge_base=KendraKnowledgeBase(),
        model=BEDROCK_MODEL_MAP[BedrockModelProviders.AMAZON.value]["DEFAULT"],
        model_params={
            "maxTokenCount": {"Type": "integer", "Value": "512"},
            "topP": {"Type": "float", "Value": "0.9"},
        },
        temperature=0.2,
        prompt_template=DEFAULT_BEDROCK_RAG_PROMPT[BedrockModelProviders.AMAZON.value],
        streaming=is_streaming,
        verbose=False,
        callbacks=None,
    )
    yield chat


@pytest.mark.parametrize("chat_fixture, is_streaming", [("titan_model", False), ("titan_model", True)])
def test_implement_error_not_raised(chat_fixture, is_streaming, request):
    chat_model = request.getfixturevalue(chat_fixture)
    try:
        assert chat_model.model == BEDROCK_MODEL_MAP[BedrockModelProviders.AMAZON.value]["DEFAULT"]
        assert chat_model.prompt_template.template == DEFAULT_BEDROCK_RAG_PROMPT[BedrockModelProviders.AMAZON.value]
        assert set(chat_model.prompt_template.input_variables) == set(DEFAULT_BEDROCK_RAG_PLACEHOLDERS)
        assert chat_model.model_params == {
            "temperature": 0.2,
            "maxTokenCount": 512,
            "topP": 0.9,
            "stopSequences": ["|"],
        }
        assert chat_model.streaming == is_streaming
        assert chat_model.verbose == False
        assert chat_model.knowledge_base.kendra_index_id == "fake-kendra-index-id"
        assert chat_model.conversation_memory.chat_memory.messages == []
        assert chat_model.condensing_prompt_template == CONDENSE_QUESTION_PROMPT

        assert type(chat_model.conversation_chain) == ConversationalRetrievalChain
        assert type(chat_model.conversation_memory) == DynamoDBChatMemory
    except NotImplementedError as ex:
        raise Exception(ex)


@mock.patch("langchain.chains.ConversationalRetrievalChain.__call__")
@pytest.mark.parametrize("chat_fixture, is_streaming", [("titan_model", False), ("titan_model", True)])
def test_generate(mock_docs, chat_fixture, request, setup_environment):
    model = request.getfixturevalue(chat_fixture)
    conversation_chain_output = {
        "answer": "some answer based on context",
        "source_documents": [{"page_content": "some-content-1"}, {"page_content": "some-content-2"}],
    }
    mock_docs.return_value = conversation_chain_output
    assert model.generate("What is lambda?") == conversation_chain_output


@pytest.mark.parametrize("is_streaming", [False, True])
def test_exception_for_failed_model_incorrect_key(is_streaming, setup_environment):
    with pytest.raises(LLMBuildError) as error:
        with mock.patch(
            "shared.knowledge.kendra_retriever.CustomKendraRetriever.get_relevant_documents"
        ) as mocked_kendra_docs:
            mocked_kendra_docs.return_value = [mocked_doc]
            model = "amazon.titan-text-express-v1"
            model_family = BedrockModelProviders.AMAZON.value

            chat = BedrockRetrievalLLM(
                conversation_memory=DynamoDBChatMemory(
                    DynamoDBChatMessageHistory("fake-table", "fake-conversation-id", "fake-user-id")
                ),
                knowledge_base=KendraKnowledgeBase(),
                model=model,
                model_params={"incorrect_param": {"Type": "integer", "Value": "512"}},
                prompt_template=DEFAULT_BEDROCK_RAG_PROMPT[BedrockModelProviders.AMAZON.value],
                streaming=is_streaming,
                temperature=0.3,
                verbose=False,
                callbacks=None,
            )
            chat.generate("What is lambda?")

    assert error.value.args[0] == (
        f"Error occurred while building Bedrock {model_family} {model} Model. "
        "Ensure that the model params provided are correct and they match the model specification. "
        "Received params: {'incorrect_param': 512, 'temperature': 0.3}. Error: BedrockAmazonLLMParams.__init__() got an unexpected keyword argument 'incorrect_param'"
    )


@pytest.mark.parametrize("is_streaming", [False])
def test_anthropic_condensing_prompt():
    chat_model = BedrockRetrievalLLM(
        conversation_memory=DynamoDBChatMemory(
            DynamoDBChatMessageHistory("fake-table", "fake-conversation-id", "fake-user-id")
        ),
        knowledge_base=KendraKnowledgeBase(),
        model_family=BedrockModelProviders.ANTHROPIC.value,
        model=BEDROCK_MODEL_MAP[BedrockModelProviders.ANTHROPIC.value]["DEFAULT"],
        model_params={
            "top_k": {"Type": "float", "Value": "0.2"},
            "top_p": {"Type": "float", "Value": "0.9"},
        },
        prompt_template=DEFAULT_BEDROCK_RAG_PROMPT[BedrockModelProviders.ANTHROPIC.value],
        streaming=False,
        temperature=0.3,
        verbose=False,
        callbacks=None,
    )

    assert chat_model.model == BEDROCK_MODEL_MAP[BedrockModelProviders.ANTHROPIC.value]["DEFAULT"]
    assert chat_model.prompt_template.template == DEFAULT_BEDROCK_RAG_PROMPT[BedrockModelProviders.ANTHROPIC.value]
    assert set(chat_model.prompt_template.input_variables) == set(DEFAULT_BEDROCK_RAG_PLACEHOLDERS)
    assert chat_model.model_params == {"temperature": 0.3, "top_k": 0.2, "top_p": 0.9}
    assert chat_model.streaming == False
    assert chat_model.verbose == False
    assert chat_model.knowledge_base.kendra_index_id == "fake-kendra-index-id"
    assert chat_model.conversation_memory.chat_memory.messages == []
    assert chat_model.condensing_prompt_template == DEFAULT_BEDROCK_ANTHROPIC_CONDENSING_PROMPT_TEMPLATE

    assert type(chat_model.conversation_chain) == ConversationalRetrievalChain
    assert type(chat_model.conversation_memory) == DynamoDBChatMemory


@pytest.mark.parametrize("is_streaming", [False])
def test_meta_condensing_prompt():
    chat_model = BedrockRetrievalLLM(
        conversation_memory=DynamoDBChatMemory(
            DynamoDBChatMessageHistory("fake-table", "fake-conversation-id", "fake-user-id")
        ),
        knowledge_base=KendraKnowledgeBase(),
        model_family=BedrockModelProviders.META.value,
        model=BEDROCK_MODEL_MAP[BedrockModelProviders.META.value]["DEFAULT"],
        prompt_template=DEFAULT_BEDROCK_RAG_PROMPT[BedrockModelProviders.META.value],
    )

    assert chat_model.condensing_prompt_template == DEFAULT_BEDROCK_META_CONDENSING_PROMPT_TEMPLATE
