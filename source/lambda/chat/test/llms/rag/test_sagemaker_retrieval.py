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

import os
from unittest import mock

import pytest
from langchain_core.documents import Document
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.runnables.base import RunnableBinding
from langchain_core.runnables.history import RunnableWithMessageHistory
from llms.models.model_provider_inputs import SageMakerInputs
from llms.rag.sagemaker_retrieval import SageMakerRetrievalLLM
from shared.defaults.model_defaults import ModelDefaults
from shared.knowledge.kendra_knowledge_base import KendraKnowledgeBase
from shared.memory.ddb_enhanced_message_history import DynamoDBChatMessageHistory
from utils.constants import (
    CONTEXT_KEY,
    DEFAULT_MODELS_MAP,
    DEFAULT_PROMPT_RAG_PLACEHOLDERS,
    DEFAULT_REPHRASE_RAG_QUESTION,
    MODEL_INFO_TABLE_NAME_ENV_VAR,
    OUTPUT_KEY,
    RAG_CHAT_IDENTIFIER,
    REPHRASED_QUERY_KEY,
    SOURCE_DOCUMENTS_OUTPUT_KEY,
)
from utils.custom_exceptions import LLMInvocationError
from utils.enum_types import LLMProviderTypes

SAGEMAKER_RAG_PROMPT = """{context}\n\n{history}\n\n{input}"""
RAG_ENABLED = True
MODEL_ID = DEFAULT_MODELS_MAP[LLMProviderTypes.SAGEMAKER.value]  # default
MODEL_PROVIDER = LLMProviderTypes.SAGEMAKER.value
DISAMBIGUATION_PROMPT = """Given the following conversation and a follow up question, rephrase the follow up question to be a standalone question, in its original language.\n\nChat History:\n{history}\nFollow Up Input: {input}\nStandalone question:"""
RESPONSE_IF_NO_DOCS_FOUND = "Sorry, the model cannot respond to your questions due to admin enforced constraints."
MOCKED_SOURCE_DOCS = [
    Document(**{"page_content": "some-content-1", "metadata": {"source": "https://fake-url-1.com"}}),
    Document(**{"page_content": "some-content-2", "metadata": {"source": "https://fake-url-2.com"}}),
]
MOCKED_SOURCE_DOCS_DICT = [
    {
        "excerpt": None,
        "location": "https://fake-url-1.com",
        "score": None,
        "document_title": None,
        "document_id": None,
        "additional_attributes": None,
    },
    {
        "excerpt": None,
        "location": "https://fake-url-2.com",
        "score": None,
        "document_title": None,
        "document_id": None,
        "additional_attributes": None,
    },
]
INPUT_SCHEMA = {
    "inputs": "<<prompt>>",
    "parameters": {
        "param-1": "<<param-1>>",
        "param-2": "<<param-2>>",
        "param-3": "<<param-1>>",
        "param-5": "<<param-5>>",
    },
}


@pytest.fixture
def model_inputs(
    disambiguation_enabled, disambiguation_prompt, return_source_docs, response_if_no_docs_found, is_streaming
):
    yield SageMakerInputs(
        **{
            "conversation_history_cls": DynamoDBChatMessageHistory,
            "conversation_history_params": {
                "table_name": "fake-table",
                "user_id": "fake-user-id",
                "conversation_id": "fake-conversation-id",
            },
            "knowledge_base": KendraKnowledgeBase(
                {
                    "NumberOfDocs": 2,
                    "AttributeFilter": {
                        "AndAllFilters": [
                            {"EqualsTo": {"Key": "user_id", "Value": {"StringValue": "12345"}}},
                        ]
                    },
                    "UserContext": None,
                }
            ),
            "model": MODEL_ID,
            "model_params": {
                "topP": {"Type": "float", "Value": "0.9"},
                "maxTokenCount": {"Type": "integer", "Value": "200"},
            },
            "prompt_template": SAGEMAKER_RAG_PROMPT,
            "prompt_placeholders": DEFAULT_PROMPT_RAG_PLACEHOLDERS,
            "disambiguation_prompt_template": disambiguation_prompt,
            "disambiguation_prompt_enabled": disambiguation_enabled,
            "rephrase_question": DEFAULT_REPHRASE_RAG_QUESTION,
            "response_if_no_docs_found": response_if_no_docs_found,
            "return_source_docs": return_source_docs,
            "streaming": is_streaming,
            "verbose": False,
            "temperature": 0.25,
            "callbacks": None,
            "rag_enabled": RAG_ENABLED,
            "sagemaker_endpoint_name": "fake-endpoint",
            "input_schema": INPUT_SCHEMA,
            "response_jsonpath": "$.generated_text",
        }
    )


@pytest.fixture
def sagemaker_model(is_streaming, return_source_docs, model_inputs, setup_environment):
    chat = SageMakerRetrievalLLM(
        model_inputs=model_inputs, model_defaults=ModelDefaults(MODEL_PROVIDER, MODEL_ID, RAG_ENABLED)
    )
    yield chat


@pytest.fixture
def temp_sagemaker_dynamodb_defaults_table(dynamodb_resource, prompt, dynamodb_defaults_table, use_case, is_streaming):
    model_provider = LLMProviderTypes.SAGEMAKER.value
    table_name = os.getenv(MODEL_INFO_TABLE_NAME_ENV_VAR)
    output_key = OUTPUT_KEY
    context_key = CONTEXT_KEY
    input_key = "input"
    history_key = "history"

    table = dynamodb_resource.Table(table_name)
    table.put_item(
        Item={
            "UseCase": use_case,
            "SortKey": f"{model_provider}#{MODEL_ID}",
            "AllowsStreaming": is_streaming,
            "DefaultTemperature": "0.5",
            "MaxChatMessageSize": "2500",
            "MaxPromptSize": "2000",
            "MaxTemperature": "1",
            "MemoryConfig": {
                "history": history_key,
                "input": input_key,
                CONTEXT_KEY: context_key,
                "ai_prefix": "Bot",
                "human_prefix": "User",
                "output": output_key,
            },
            "MinTemperature": "0",
            "ModelName": MODEL_ID,
            "ModelProviderName": model_provider,
            "Prompt": prompt,
            "DefaultStopSequences": [],
            "DisambiguationPrompt": DISAMBIGUATION_PROMPT,
        }
    )


@pytest.mark.parametrize(
    "use_case, prompt, is_streaming, model_id, return_source_docs, chat_fixture, disambiguation_enabled, disambiguation_prompt, response_if_no_docs_found",
    [
        (
            RAG_CHAT_IDENTIFIER,
            SAGEMAKER_RAG_PROMPT,
            False,
            MODEL_ID,
            False,
            "sagemaker_model",
            True,
            DISAMBIGUATION_PROMPT,
            RESPONSE_IF_NO_DOCS_FOUND,
        ),
        (
            RAG_CHAT_IDENTIFIER,
            SAGEMAKER_RAG_PROMPT,
            True,
            MODEL_ID,
            False,
            "sagemaker_model",
            True,
            DISAMBIGUATION_PROMPT,
            RESPONSE_IF_NO_DOCS_FOUND,
        ),
        (
            RAG_CHAT_IDENTIFIER,
            SAGEMAKER_RAG_PROMPT,
            False,
            MODEL_ID,
            True,
            "sagemaker_model",
            True,
            DISAMBIGUATION_PROMPT,
            RESPONSE_IF_NO_DOCS_FOUND,
        ),
        (
            RAG_CHAT_IDENTIFIER,
            SAGEMAKER_RAG_PROMPT,
            True,
            MODEL_ID,
            True,
            "sagemaker_model",
            True,
            DISAMBIGUATION_PROMPT,
            RESPONSE_IF_NO_DOCS_FOUND,
        ),
    ],
)
def test_implement_error_not_raised(
    use_case,
    prompt,
    is_streaming,
    chat_fixture,
    request,
    model_id,
    return_source_docs,
    setup_environment,
    sagemaker_dynamodb_defaults_table,
    disambiguation_enabled,
    response_if_no_docs_found,
    disambiguation_prompt,
):
    chat = request.getfixturevalue(chat_fixture)
    try:
        assert chat.model == model_id
        assert chat.prompt_template == ChatPromptTemplate.from_template(SAGEMAKER_RAG_PROMPT)
        assert set(chat.prompt_template.input_variables) == set(DEFAULT_PROMPT_RAG_PLACEHOLDERS)
        assert chat.model_params == {
            "temperature": 0.25,
            "maxTokenCount": 200,
            "topP": 0.9,
        }
        assert chat.prompt_template == ChatPromptTemplate.from_template(prompt)

        assert sorted(chat.prompt_template.input_variables) == DEFAULT_PROMPT_RAG_PLACEHOLDERS
        assert chat.sagemaker_endpoint_name == "fake-endpoint"
        assert chat.input_schema == INPUT_SCHEMA
        assert chat.response_jsonpath == "$.generated_text"
        assert chat.model_params == {"temperature": 0.25, "maxTokenCount": 200, "topP": 0.9}
        assert chat.endpoint_params == {}
        assert chat.streaming == is_streaming
        assert chat.verbose == False
        assert chat.knowledge_base.kendra_index_id == "fake-kendra-index-id"
        assert chat.conversation_history_cls == DynamoDBChatMessageHistory
        assert chat.conversation_history_params == {
            "table_name": "fake-table",
            "user_id": "fake-user-id",
            "conversation_id": "fake-conversation-id",
        }
        if disambiguation_enabled:
            assert chat.disambiguation_prompt_template == ChatPromptTemplate.from_template(DISAMBIGUATION_PROMPT)
        else:
            assert chat.disambiguation_prompt_template is disambiguation_prompt
        assert chat.return_source_docs == return_source_docs

        if response_if_no_docs_found is not None:
            assert chat.response_if_no_docs_found == response_if_no_docs_found
        assert chat.rephrase_question == DEFAULT_REPHRASE_RAG_QUESTION
        runnable_type = RunnableBinding if is_streaming else RunnableWithMessageHistory
        assert type(chat.runnable_with_history) == runnable_type
    except NotImplementedError as ex:
        raise Exception(ex)


@pytest.mark.parametrize(
    "rag_enabled, is_streaming, return_source_docs, disambiguation_enabled, use_case, prompt, model_id, chat_fixture, chain_output, expected_output, disambiguation_prompt, response_if_no_docs_found",
    [
        (
            True,
            False,
            False,
            True,
            RAG_CHAT_IDENTIFIER,
            SAGEMAKER_RAG_PROMPT,
            MODEL_ID,
            "sagemaker_model",
            {
                OUTPUT_KEY: "some answer based on context",
                REPHRASED_QUERY_KEY: "rephrased query",
                "other_fields": {"some_field": "some_value"},
            },
            {OUTPUT_KEY: "some answer based on context", REPHRASED_QUERY_KEY: "rephrased query"},
            DISAMBIGUATION_PROMPT,
            None,
        ),
        (
            True,
            True,
            False,
            True,
            RAG_CHAT_IDENTIFIER,
            SAGEMAKER_RAG_PROMPT,
            MODEL_ID,
            "sagemaker_model",
            {OUTPUT_KEY: "some answer based on context", REPHRASED_QUERY_KEY: "rephrased query"},
            {OUTPUT_KEY: "some answer based on context", REPHRASED_QUERY_KEY: "rephrased query"},
            DISAMBIGUATION_PROMPT,
            None,
        ),
        (
            True,
            False,
            True,
            True,
            RAG_CHAT_IDENTIFIER,
            SAGEMAKER_RAG_PROMPT,
            MODEL_ID,
            "sagemaker_model",
            {
                OUTPUT_KEY: "some answer based on context",
                CONTEXT_KEY: MOCKED_SOURCE_DOCS,
                REPHRASED_QUERY_KEY: "rephrased query",
                "other_fields": {"some_field": "some_value"},
            },
            {
                OUTPUT_KEY: "some answer based on context",
                SOURCE_DOCUMENTS_OUTPUT_KEY: MOCKED_SOURCE_DOCS_DICT,
                REPHRASED_QUERY_KEY: "rephrased query",
            },
            DISAMBIGUATION_PROMPT,
            None,
        ),
        (
            True,
            True,
            True,
            True,
            RAG_CHAT_IDENTIFIER,
            SAGEMAKER_RAG_PROMPT,
            MODEL_ID,
            "sagemaker_model",
            {
                OUTPUT_KEY: "some answer based on context",
                CONTEXT_KEY: MOCKED_SOURCE_DOCS,
                REPHRASED_QUERY_KEY: "rephrased query",
                "other_fields": {"some_field": "some_value"},
            },
            {
                OUTPUT_KEY: "some answer based on context",
                SOURCE_DOCUMENTS_OUTPUT_KEY: MOCKED_SOURCE_DOCS_DICT,
                REPHRASED_QUERY_KEY: "rephrased query",
            },
            DISAMBIGUATION_PROMPT,
            None,
        ),
        (
            True,
            False,
            False,
            False,
            RAG_CHAT_IDENTIFIER,
            SAGEMAKER_RAG_PROMPT,
            MODEL_ID,
            "sagemaker_model",
            {
                OUTPUT_KEY: "some answer based on context",
                CONTEXT_KEY: MOCKED_SOURCE_DOCS,
                "other_fields": {"some_field": "some_value"},
            },
            {OUTPUT_KEY: "some answer based on context"},
            None,
            None,
        ),
        (
            True,
            True,
            False,
            False,
            RAG_CHAT_IDENTIFIER,
            SAGEMAKER_RAG_PROMPT,
            MODEL_ID,
            "sagemaker_model",
            {
                OUTPUT_KEY: "some answer based on context",
                CONTEXT_KEY: MOCKED_SOURCE_DOCS,
                "other_fields": {"some_field": "some_value"},
            },
            {OUTPUT_KEY: "some answer based on context"},
            None,
            None,
        ),
        (
            True,
            False,
            True,
            False,
            RAG_CHAT_IDENTIFIER,
            SAGEMAKER_RAG_PROMPT,
            MODEL_ID,
            "sagemaker_model",
            {
                OUTPUT_KEY: "some answer based on context",
                CONTEXT_KEY: MOCKED_SOURCE_DOCS,
                "other_fields": {"some_field": "some_value"},
            },
            {
                OUTPUT_KEY: "some answer based on context",
                SOURCE_DOCUMENTS_OUTPUT_KEY: MOCKED_SOURCE_DOCS_DICT,
            },
            None,
            None,
        ),
        (
            True,
            True,
            True,
            False,
            RAG_CHAT_IDENTIFIER,
            SAGEMAKER_RAG_PROMPT,
            MODEL_ID,
            "sagemaker_model",
            {
                OUTPUT_KEY: "some answer based on context",
                CONTEXT_KEY: MOCKED_SOURCE_DOCS,
                "other_fields": {"some_field": "some_value"},
            },
            {
                OUTPUT_KEY: "some answer based on context",
                SOURCE_DOCUMENTS_OUTPUT_KEY: MOCKED_SOURCE_DOCS_DICT,
            },
            None,
            None,
        ),
        (
            True,
            False,
            True,
            True,
            RAG_CHAT_IDENTIFIER,
            SAGEMAKER_RAG_PROMPT,
            MODEL_ID,
            "sagemaker_model",
            {
                OUTPUT_KEY: "some answer based not based on context",
                CONTEXT_KEY: [],
                "other_fields": {"some_field": "some_value"},
                REPHRASED_QUERY_KEY: "rephrased query",
            },
            {
                OUTPUT_KEY: RESPONSE_IF_NO_DOCS_FOUND,
                SOURCE_DOCUMENTS_OUTPUT_KEY: [],
                REPHRASED_QUERY_KEY: "rephrased query",
            },
            DISAMBIGUATION_PROMPT,
            RESPONSE_IF_NO_DOCS_FOUND,
        ),
    ],
)
def test_generate(
    use_case,
    prompt,
    is_streaming,
    chat_fixture,
    request,
    return_source_docs,
    model_id,
    setup_environment,
    sagemaker_dynamodb_defaults_table,
    chain_output,
    expected_output,
    rag_enabled,
    disambiguation_prompt,
    disambiguation_enabled,
    response_if_no_docs_found,
):
    model = request.getfixturevalue(chat_fixture)
    response = None
    with mock.patch("langchain_core.runnables.RunnableWithMessageHistory.invoke", return_value=chain_output):
        response = model.generate("What is lambda?")
        assert response == expected_output

        if return_source_docs:
            assert SOURCE_DOCUMENTS_OUTPUT_KEY in response
        else:
            assert SOURCE_DOCUMENTS_OUTPUT_KEY not in response

        if response_if_no_docs_found is not None:
            assert response[OUTPUT_KEY] == response_if_no_docs_found


@pytest.mark.parametrize(
    "use_case, prompt, is_streaming, model_id, return_source_docs, chat_fixture, disambiguation_enabled, disambiguation_prompt, response_if_no_docs_found",
    [
        (
            RAG_CHAT_IDENTIFIER,
            SAGEMAKER_RAG_PROMPT,
            False,
            MODEL_ID,
            False,
            "sagemaker_model",
            True,
            DISAMBIGUATION_PROMPT,
            RESPONSE_IF_NO_DOCS_FOUND,
        ),
        (
            RAG_CHAT_IDENTIFIER,
            SAGEMAKER_RAG_PROMPT,
            True,
            MODEL_ID,
            False,
            "sagemaker_model",
            True,
            DISAMBIGUATION_PROMPT,
            RESPONSE_IF_NO_DOCS_FOUND,
        ),
        (
            RAG_CHAT_IDENTIFIER,
            SAGEMAKER_RAG_PROMPT,
            False,
            MODEL_ID,
            True,
            "sagemaker_model",
            True,
            DISAMBIGUATION_PROMPT,
            RESPONSE_IF_NO_DOCS_FOUND,
        ),
        (
            RAG_CHAT_IDENTIFIER,
            SAGEMAKER_RAG_PROMPT,
            True,
            MODEL_ID,
            True,
            "sagemaker_model",
            True,
            DISAMBIGUATION_PROMPT,
            RESPONSE_IF_NO_DOCS_FOUND,
        ),
    ],
)
def test_generate_error(
    use_case,
    prompt,
    is_streaming,
    chat_fixture,
    request,
    model_id,
    return_source_docs,
    setup_environment,
    sagemaker_dynamodb_defaults_table,
    disambiguation_enabled,
    response_if_no_docs_found,
    disambiguation_prompt,
):
    with pytest.raises(LLMInvocationError) as error:
        chat_model = request.getfixturevalue(chat_fixture)
        with mock.patch("langchain_core.runnables.RunnableWithMessageHistory.invoke") as mocked_chain_response:
            mocked_chain_response.side_effect = ValueError("fake-error")
            chat_model.generate("What is lambda?")

    assert error.value.args[0] == "Error occurred while invoking SageMaker endpoint: 'fake-endpoint'. fake-error"
