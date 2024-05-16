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

from typing import Any
from unittest import mock
from unittest.mock import MagicMock

import pytest
from langchain.chains import ConversationalRetrievalChain
from langchain_core.documents import Document
from llms.models.llm import LLM
from llms.rag.huggingface_retrieval import HuggingFaceRetrievalLLM
from shared.defaults.model_defaults import ModelDefaults
from shared.knowledge.kendra_knowledge_base import KendraKnowledgeBase
from shared.memory.ddb_chat_memory import DynamoDBChatMemory
from shared.memory.ddb_enhanced_message_history import DynamoDBChatMessageHistory
from utils.constants import (
    DEFAULT_HUGGINGFACE_TASK,
    DEFAULT_MODELS_MAP,
    DEFAULT_RAG_PLACEHOLDERS,
    DEFAULT_TEMPERATURE,
    RAG_CHAT_IDENTIFIER,
)
from utils.custom_exceptions import LLMBuildError, LLMInvocationError
from utils.enum_types import LLMProviderTypes

HUGGINGFACE_RAG_PROMPT = """{context}\n\n{chat_history}\n\n{question}"""
RAG_ENABLED = True

model_id = "google/flan-t5-xxl"
provider_name = LLMProviderTypes.HUGGINGFACE.value
model_endpoint_provider = LLMProviderTypes.HUGGINGFACE_ENDPOINT.value
mocked_doc = Document(**{"page_content": "some-page-content-1", "metadata": {"source": "fake-url-1"}})


@pytest.fixture
def knowledge_base(setup_environment):
    yield KendraKnowledgeBase({"NumberOfDocs": 2, "ReturnSourceDocs": True})


@pytest.fixture
def llm_params(is_streaming, model_id, setup_environment, return_source_docs):
    yield LLM(
        **{
            "conversation_memory": DynamoDBChatMemory(
                DynamoDBChatMessageHistory(
                    table_name="fake-table",
                    user_id="fake-user-id",
                    conversation_id="fake-conversation-id",
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
            "model": DEFAULT_MODELS_MAP[LLMProviderTypes.HUGGINGFACE.value],
            "model_params": {
                "top_p": {"Type": "float", "Value": "0.2"},
                "max_length": {"Type": "integer", "Value": "100"},
            },
            "prompt_template": HUGGINGFACE_RAG_PROMPT,
            "prompt_placeholders": DEFAULT_RAG_PLACEHOLDERS,
            "streaming": is_streaming,
            "verbose": False,
            "temperature": DEFAULT_TEMPERATURE,
            "callbacks": None,
        }
    )


@pytest.fixture
def streamless_huggingface_model(llm_params, model_id, is_streaming, return_source_docs, setup_environment):
    llm_params.model = DEFAULT_MODELS_MAP[LLMProviderTypes.HUGGINGFACE.value]
    inference_endpoint = None
    chat = HuggingFaceRetrievalLLM(
        llm_params=llm_params,
        model_defaults=ModelDefaults(provider_name, model_id, RAG_ENABLED),
        inference_endpoint=inference_endpoint,
        return_source_docs=return_source_docs,
    )
    yield chat


@pytest.fixture
def streamless_huggingface_endpoint(setup_environment, model_id, knowledge_base, return_source_docs, llm_params):
    llm_params.model = None
    inference_endpoint = "fake-endpoint-url"
    with mock.patch(
        "llms.huggingface.HuggingFaceEndpoint",
        return_value=MagicMock(),
    ):
        with mock.patch(
            "llms.huggingface.HuggingFaceLLM.get_conversation_chain",
            return_value=MagicMock(),
        ):
            with mock.patch("huggingface_hub.login", return_value=MagicMock()):
                inference_chat = HuggingFaceRetrievalLLM(
                    llm_params=llm_params,
                    model_defaults=ModelDefaults(model_endpoint_provider, model_id, RAG_ENABLED),
                    inference_endpoint=inference_endpoint,
                    return_source_docs=return_source_docs,
                )
                yield inference_chat


@pytest.mark.parametrize(
    "use_case, model_id, prompt, is_streaming, return_source_docs, chat_fixture, endpoint_url",
    [
        (
            RAG_CHAT_IDENTIFIER,
            DEFAULT_MODELS_MAP[LLMProviderTypes.HUGGINGFACE.value],
            HUGGINGFACE_RAG_PROMPT,
            False,
            False,
            "streamless_huggingface_model",
            None,
        ),
        (
            RAG_CHAT_IDENTIFIER,
            DEFAULT_MODELS_MAP[LLMProviderTypes.HUGGINGFACE.value],
            HUGGINGFACE_RAG_PROMPT,
            False,
            True,
            "streamless_huggingface_model",
            None,
        ),
    ],
)
def test_implement_error_not_raised(
    use_case,
    model_id,
    prompt,
    is_streaming,
    chat_fixture,
    request,
    return_source_docs,
    endpoint_url,
    setup_environment,
    huggingface_dynamodb_defaults_table,
    huggingface_endpoint_dynamodb_defaults_table,
):
    chat_model = request.getfixturevalue(chat_fixture)
    try:
        assert chat_model.model == model_id
        assert chat_model.inference_endpoint is None
        assert chat_model.prompt_template.template == HUGGINGFACE_RAG_PROMPT
        assert set(chat_model.prompt_template.input_variables) == set(DEFAULT_RAG_PLACEHOLDERS)
        assert chat_model.model_params == {
            "max_length": 100,
        }
        assert chat_model.temperature == 0.3
        assert chat_model.top_p == 0.2
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
    "use_case, model_id, prompt, is_streaming, return_source_docs, chat_fixture, model, endpoint_url",
    [
        (
            RAG_CHAT_IDENTIFIER,
            model_id,
            HUGGINGFACE_RAG_PROMPT,
            False,
            False,
            "streamless_huggingface_endpoint",
            None,
            "fake-endpoint-url",
        ),
        (
            RAG_CHAT_IDENTIFIER,
            model_id,
            HUGGINGFACE_RAG_PROMPT,
            False,
            True,
            "streamless_huggingface_endpoint",
            None,
            "fake-endpoint-url",
        ),
    ],
)
def test_implement_error_not_raised(
    use_case,
    model_id,
    prompt,
    is_streaming,
    chat_fixture,
    request,
    return_source_docs,
    model,
    endpoint_url,
    knowledge_base,
    setup_environment,
    huggingface_endpoint_dynamodb_defaults_table,
):
    with mock.patch("langchain.chains.ConversationalRetrievalChain.from_llm") as mocked_chain:
        mock_chain = MagicMock()
        mocked_chain.return_value = mock_chain
        chat_model = request.getfixturevalue(chat_fixture)
        try:
            assert chat_model.model is None
            assert chat_model.inference_endpoint == endpoint_url
            assert chat_model.prompt_template.template == HUGGINGFACE_RAG_PROMPT
            assert set(chat_model.prompt_template.input_variables) == set(DEFAULT_RAG_PLACEHOLDERS)
            assert chat_model.model_params == {
                "max_length": 100,
            }
            assert chat_model.top_p == 0.2
            assert chat_model.temperature == DEFAULT_TEMPERATURE
            assert chat_model.api_token == "fake-token"
            assert chat_model.streaming == is_streaming
            assert chat_model.verbose == False
            assert chat_model.knowledge_base.kendra_index_id == "fake-kendra-index-id"
            assert chat_model.conversation_memory.chat_memory.messages == []
            assert chat_model.return_source_docs == return_source_docs
            assert chat_model.conversation_chain == mock_chain
            assert type(chat_model.conversation_memory) == DynamoDBChatMemory
        except NotImplementedError as ex:
            raise Exception(ex)


@pytest.mark.parametrize(
    "use_case, model_id, prompt, is_streaming, return_source_docs, chat_fixture, model, endpoint_url, chain_output, expected_output",
    [
        (
            RAG_CHAT_IDENTIFIER,
            model_id,
            HUGGINGFACE_RAG_PROMPT,
            False,
            False,
            "streamless_huggingface_model",
            DEFAULT_MODELS_MAP[LLMProviderTypes.HUGGINGFACE.value],
            None,
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
            HUGGINGFACE_RAG_PROMPT,
            False,
            False,
            "streamless_huggingface_endpoint",
            None,
            "fake-endpoint-url",
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
            HUGGINGFACE_RAG_PROMPT,
            False,
            True,
            "streamless_huggingface_model",
            DEFAULT_MODELS_MAP[LLMProviderTypes.HUGGINGFACE.value],
            None,
            {
                "answer": "some answer based on context",
                "source_documents": [
                    {"page_content": "some-content-1"},
                    {"page_content": "some-content-2"},
                ],
                "other_fields": {"some_field": "some_value"},
            },
            {
                "answer": "some answer based on context",
                "source_documents": [
                    {"page_content": "some-content-1"},
                    {"page_content": "some-content-2"},
                ],
            },
        ),
        (
            RAG_CHAT_IDENTIFIER,
            model_id,
            HUGGINGFACE_RAG_PROMPT,
            False,
            True,
            "streamless_huggingface_endpoint",
            None,
            "fake-endpoint-url",
            {
                "answer": "some answer based on context",
                "source_documents": [
                    {"page_content": "some-content-1"},
                    {"page_content": "some-content-2"},
                ],
                "other_fields": {"some_field": "some_value"},
            },
            {
                "answer": "some answer based on context",
                "source_documents": [
                    {"page_content": "some-content-1"},
                    {"page_content": "some-content-2"},
                ],
            },
        ),
    ],
)
def test_generate(
    use_case,
    model_id,
    prompt,
    is_streaming,
    return_source_docs,
    chat_fixture,
    request,
    model,
    endpoint_url,
    setup_environment,
    huggingface_dynamodb_defaults_table,
    huggingface_endpoint_dynamodb_defaults_table,
    chain_output,
    expected_output,
):
    class MockConversationChainClass:
        def invoke(self, *args: Any, **kwargs: Any) -> Any:
            return chain_output

    with mock.patch("langchain.chains.ConversationalRetrievalChain.from_llm") as MockedConversationChain:
        with mock.patch("huggingface_hub.InferenceClient") as mocked_hf_call:
            with mock.patch("huggingface_hub.login", return_value=MagicMock()):
                mock_obj = MagicMock()
                mock_obj.task = DEFAULT_HUGGINGFACE_TASK
                mocked_hf_call.return_value = mock_obj
                MockedConversationChain.return_value = MockConversationChainClass()

                chat_model = request.getfixturevalue(chat_fixture)
                assert chat_model.generate("What is lambda?") == expected_output


@pytest.mark.parametrize(
    "use_case, model_id, prompt, is_streaming, return_source_docs",
    [
        (RAG_CHAT_IDENTIFIER, model_id, HUGGINGFACE_RAG_PROMPT, False, False),
        (RAG_CHAT_IDENTIFIER, model_id, HUGGINGFACE_RAG_PROMPT, False, True),
    ],
)
def test_exception_for_failed_model_incorrect_api_key(
    use_case,
    model_id,
    prompt,
    is_streaming,
    llm_params,
    return_source_docs,
    setup_environment,
    huggingface_dynamodb_defaults_table,
):
    with mock.patch("huggingface_hub.InferenceClient") as mocked_hf_call:
        mocked_hf_call.side_effect = ValueError("some error")
        with pytest.raises(LLMBuildError) as error:
            llm_params.model = DEFAULT_MODELS_MAP[LLMProviderTypes.HUGGINGFACE.value]
            HuggingFaceRetrievalLLM(
                llm_params=llm_params,
                model_defaults=ModelDefaults(provider_name, model_id, RAG_ENABLED),
                inference_endpoint=None,
                return_source_docs=return_source_docs,
            )
        assert (
            error.value.args[0]
            == "HuggingFace model construction failed due to incorrect model params or endpoint URL (HuggingFaceEndpoint) passed to the model. 1 validation error for HuggingFaceEndpoint\n__root__\n  some error (type=value_error)"
        )


@pytest.mark.parametrize(
    "use_case, model_id, prompt, is_streaming, return_source_docs",
    [
        (RAG_CHAT_IDENTIFIER, model_id, HUGGINGFACE_RAG_PROMPT, False, False),
        (RAG_CHAT_IDENTIFIER, model_id, HUGGINGFACE_RAG_PROMPT, False, True),
    ],
)
def test_exception_for_failed_endpoint_incorrect_api_key(
    use_case,
    model_id,
    prompt,
    is_streaming,
    llm_params,
    return_source_docs,
    setup_environment,
    huggingface_dynamodb_defaults_table,
):
    with pytest.raises(LLMInvocationError) as error:
        with mock.patch("langchain.llms.huggingface_endpoint.HuggingFaceEndpoint._call") as mocked_hub_call:
            with mock.patch(
                "shared.knowledge.kendra_retriever.CustomKendraRetriever.get_relevant_documents"
            ) as mocked_kendra_docs:
                mocked_kendra_docs.return_value = [mocked_doc]
                mocked_hub_call.side_effect = ValueError(
                    "Error raised by inference API: Authorization header is correct, but the token seems invalid"
                )
                llm_params.model = None
                hf = HuggingFaceRetrievalLLM(
                    llm_params=llm_params,
                    model_defaults=ModelDefaults(provider_name, model_id, RAG_ENABLED),
                    inference_endpoint="fake-endpoint-url",
                    return_source_docs=return_source_docs,
                )
                hf.generate("What is lambda?")

        assert (
            error.value.args[0]
            == "Error raised by inference API: Authorization header is correct, but the token seems invalid"
        )
