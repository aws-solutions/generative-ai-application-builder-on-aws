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

from unittest import mock
from unittest.mock import MagicMock

import pytest
from langchain.prompts import PromptTemplate
from llms.huggingface import HuggingFaceLLM
from llms.models.llm import LLM
from llms.rag.huggingface_retrieval import HuggingFaceRetrievalLLM
from shared.defaults.model_defaults import ModelDefaults
from shared.knowledge.kendra_knowledge_base import KendraKnowledgeBase
from shared.memory.ddb_chat_memory import DynamoDBChatMemory
from shared.memory.ddb_enhanced_message_history import DynamoDBChatMessageHistory
from utils.constants import (
    CHAT_IDENTIFIER,
    DEFAULT_HUGGINGFACE_TASK,
    DEFAULT_PLACEHOLDERS,
    DEFAULT_RAG_PLACEHOLDERS,
    RAG_CHAT_IDENTIFIER,
)

HUGGINGFACE_PROMPT = """\n\n{history}\n\n{input}"""
HUGGINGFACE_RAG_PROMPT = """{context}\n\n{chat_history}\n\n{question}"""
CONDENSE_QUESTION_PROMPT = """Given the following conversation and a follow up question, rephrase the follow up question to be a standalone question, in its original language.\n\nChat History:\n{chat_history}\nFollow Up Input: {question}\nStandalone question:"""
RAG_ENABLED = False
model_id = "google/flan-t5-xxl"
provider_name = "HuggingFace"

llm_params = LLM(
    **{
        "conversation_memory": DynamoDBChatMemory(
            DynamoDBChatMessageHistory(
                table_name="fake-table", user_id="fake-user-id", conversation_id="fake-conversation-id"
            )
        ),
        "knowledge_base": None,
        "api_token": "fake-token",
        "model": "google/flan-t5-xxl",
        "model_params": {
            "top_p": {"Type": "float", "Value": "0.2"},
            "max_length": {"Type": "integer", "Value": "100"},
        },
        "prompt_template": HUGGINGFACE_PROMPT,
        "prompt_placeholders": DEFAULT_PLACEHOLDERS,
        "streaming": False,
        "verbose": False,
        "temperature": 0.45,
        "callbacks": None,
    }
)


@pytest.fixture
def chat(use_case, model_id, prompt, is_streaming, setup_environment, rag_enabled, huggingface_dynamodb_defaults_table):
    llm_params.knowledge_base = None
    with mock.patch("huggingface_hub.login", return_value=MagicMock()):
        chat = HuggingFaceLLM(
            llm_params=llm_params,
            model_defaults=ModelDefaults(provider_name, model_id, rag_enabled),
            inference_endpoint=None,
            rag_enabled=rag_enabled,
        )
        yield chat


@pytest.fixture
def rag_chat(
    use_case,
    model_id,
    prompt,
    is_streaming,
    setup_environment,
    rag_enabled,
    return_source_docs,
    huggingface_dynamodb_defaults_table,
):
    with mock.patch(
        "llms.rag.huggingface_retrieval.HuggingFaceRetrievalLLM.get_conversation_chain",
        return_value=MagicMock(),
    ):
        with mock.patch(
            "llms.huggingface.HuggingFaceEndpoint",
            return_value=MagicMock(),
        ):
            with mock.patch("huggingface_hub.login", return_value=MagicMock()):
                llm_params.knowledge_base = KendraKnowledgeBase(
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
                )
                chat = HuggingFaceRetrievalLLM(
                    llm_params=llm_params,
                    model_defaults=ModelDefaults(provider_name, model_id, rag_enabled),
                    inference_endpoint="fake-url",
                    return_source_docs=return_source_docs,
                )
                yield chat


@pytest.mark.parametrize(
    "use_case, model_id, prompt, is_streaming, rag_enabled, return_source_docs, test_prompt, placeholders, expected_response, chat_fixture",
    [
        (
            CHAT_IDENTIFIER,
            model_id,
            HUGGINGFACE_PROMPT,
            False,
            False,
            False,
            "{history} {input}",
            DEFAULT_PLACEHOLDERS,
            "{history} {input}",
            "chat",
        ),
        (
            RAG_CHAT_IDENTIFIER,
            model_id,
            HUGGINGFACE_RAG_PROMPT,
            False,
            True,
            False,
            "{history} {context} {input}",
            DEFAULT_RAG_PLACEHOLDERS,
            "{chat_history} {context} {question}",
            "rag_chat",
        ),
    ],
)
def test_placeholder_replacements(
    use_case,
    model_id,
    prompt,
    is_streaming,
    setup_environment,
    test_prompt,
    placeholders,
    rag_enabled,
    return_source_docs,
    expected_response,
    huggingface_dynamodb_defaults_table,
    request,
    chat_fixture,
):
    #     from unittest import mock
    # from unittest.mock import MagicMock
    with mock.patch("huggingface_hub.inference_api.InferenceApi") as mocked_hf_call:
        mock_obj = MagicMock()
        mock_obj.task = DEFAULT_HUGGINGFACE_TASK
        mocked_hf_call.return_value = mock_obj
        chat = request.getfixturevalue(chat_fixture)
        default_prompt = HUGGINGFACE_RAG_PROMPT if rag_enabled else HUGGINGFACE_PROMPT
        default_placeholders = DEFAULT_RAG_PLACEHOLDERS if rag_enabled else DEFAULT_PLACEHOLDERS

        assert chat.get_validated_prompt(test_prompt, placeholders, default_prompt, default_placeholders) == (
            PromptTemplate(template=expected_response, input_variables=placeholders),
            placeholders,
        )


@pytest.mark.parametrize(
    "use_case, model_id, test_prompt, placeholders, prompt, expected_response, is_streaming, return_source_docs, rag_enabled, chat_fixture",
    [
        (
            CHAT_IDENTIFIER,
            model_id,
            "{history} {context} {input}",
            DEFAULT_PLACEHOLDERS,
            HUGGINGFACE_PROMPT,
            HUGGINGFACE_PROMPT,
            False,
            False,
            False,
            "chat",
        ),
        (
            CHAT_IDENTIFIER,
            model_id,
            "{history} {question}",
            DEFAULT_PLACEHOLDERS,
            HUGGINGFACE_PROMPT,
            HUGGINGFACE_PROMPT,
            False,
            False,
            False,
            "chat",
        ),
        (
            CHAT_IDENTIFIER,
            model_id,
            "{history} {input} {input}",
            DEFAULT_PLACEHOLDERS,
            HUGGINGFACE_PROMPT,
            HUGGINGFACE_PROMPT,
            False,
            False,
            False,
            "chat",
        ),
        (
            CHAT_IDENTIFIER,
            model_id,
            "{history} {input}",
            DEFAULT_PLACEHOLDERS,
            HUGGINGFACE_PROMPT,
            "{history} {input}",
            False,
            False,
            False,
            "chat",
        ),
        (
            CHAT_IDENTIFIER,
            model_id,
            "{history} {wrong_tag}",
            DEFAULT_PLACEHOLDERS,
            HUGGINGFACE_PROMPT,
            HUGGINGFACE_PROMPT,
            False,
            False,
            False,
            "chat",
        ),
        (
            RAG_CHAT_IDENTIFIER,
            model_id,
            "{chat_history} {context} {question}",
            DEFAULT_RAG_PLACEHOLDERS,
            HUGGINGFACE_RAG_PROMPT,
            "{chat_history} {context} {question}",
            False,
            False,
            True,
            "rag_chat",
        ),
        (
            RAG_CHAT_IDENTIFIER,
            model_id,
            "{history} {input} {wrong_tag}",
            DEFAULT_RAG_PLACEHOLDERS,
            HUGGINGFACE_RAG_PROMPT,
            HUGGINGFACE_RAG_PROMPT,
            False,
            False,
            True,
            "rag_chat",
        ),
        (
            RAG_CHAT_IDENTIFIER,
            model_id,
            HUGGINGFACE_RAG_PROMPT,
            DEFAULT_RAG_PLACEHOLDERS,
            HUGGINGFACE_RAG_PROMPT,
            HUGGINGFACE_RAG_PROMPT,
            False,
            False,
            True,
            "rag_chat",
        ),
    ],
)
def test_get_validated_prompt(
    use_case,
    model_id,
    prompt,
    is_streaming,
    setup_environment,
    test_prompt,
    placeholders,
    return_source_docs,
    rag_enabled,
    expected_response,
    huggingface_dynamodb_defaults_table,
    request,
    chat_fixture,
):
    with mock.patch("huggingface_hub.inference_api.InferenceApi") as mocked_hf_call:
        mock_obj = MagicMock()
        mock_obj.task = DEFAULT_HUGGINGFACE_TASK
        mocked_hf_call.return_value = mock_obj

        chat = request.getfixturevalue(chat_fixture)
        default_prompt = HUGGINGFACE_RAG_PROMPT if rag_enabled else HUGGINGFACE_PROMPT
        default_placeholders = DEFAULT_RAG_PLACEHOLDERS if rag_enabled else DEFAULT_PLACEHOLDERS

        assert chat.get_validated_prompt(test_prompt, placeholders, default_prompt, default_placeholders) == (
            PromptTemplate(template=expected_response, input_variables=placeholders),
            placeholders,
        )


@pytest.mark.parametrize(
    "use_case, model_id, prompt, is_streaming, return_source_docs, rag_enabled, params, expected_response, chat_fixture",
    [
        (
            CHAT_IDENTIFIER,
            model_id,
            HUGGINGFACE_PROMPT,
            False,
            False,
            False,
            None,
            {},
            "chat",
        ),
        (
            RAG_CHAT_IDENTIFIER,
            model_id,
            HUGGINGFACE_RAG_PROMPT,
            False,
            False,
            True,
            {
                "top_p": {"Type": "float", "Value": "0.2"},
                "max_length": {"Type": "integer", "Value": "100"},
            },
            {"max_length": 100},
            "rag_chat",
        ),
    ],
)
def test_get_clean_model_params_success(
    use_case,
    model_id,
    prompt,
    is_streaming,
    setup_environment,
    return_source_docs,
    rag_enabled,
    expected_response,
    huggingface_dynamodb_defaults_table,
    request,
    chat_fixture,
    params,
):
    chat = request.getfixturevalue(chat_fixture)
    assert chat.get_clean_model_params(params) == expected_response
