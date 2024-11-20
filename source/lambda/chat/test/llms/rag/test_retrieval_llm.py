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

import pytest
from langchain_core.documents import Document
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.runnables.base import RunnableBinding
from langchain_core.runnables.history import RunnableWithMessageHistory
from llms.models.model_provider_inputs import BedrockInputs
from llms.rag.bedrock_retrieval import BedrockRetrievalLLM
from shared.defaults.model_defaults import ModelDefaults
from shared.knowledge.kendra_knowledge_base import KendraKnowledgeBase
from shared.memory.ddb_enhanced_message_history import DynamoDBChatMessageHistory
from utils.constants import (
    CONTEXT_KEY,
    DEFAULT_PROMPT_PLACEHOLDERS,
    DEFAULT_PROMPT_RAG_PLACEHOLDERS,
    DEFAULT_REPHRASE_RAG_QUESTION,
    DISAMBIGUATION_PROMPT_PLACEHOLDERS,
    OUTPUT_KEY,
    RAG_CHAT_IDENTIFIER,
    REPHRASED_QUERY_KEY,
    SOURCE_DOCUMENTS_OUTPUT_KEY,
)
from utils.enum_types import BedrockModelProviders, LLMProviderTypes

RAG_ENABLED = True
model_id = "amazon.fake-model"
model_provider = LLMProviderTypes.BEDROCK.value
BEDROCK_RAG_PROMPT = """{context}\n\n{history}\n\n{input}"""
DISAMBIGUATION_PROMPT_TEMPLATE = """Given the following conversation and a follow up question, rephrase the follow up question to be a standalone question, in its original language.\n\nChat History:\n{history}\nFollow Up Input: {input}\nStandalone question:"""
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


@pytest.fixture
def model_inputs(disambiguation_enabled, disambiguation_prompt, return_source_docs, response_if_no_docs_found):
    return BedrockInputs(
        **{
            "conversation_history_cls": DynamoDBChatMessageHistory,
            "conversation_history_params": {
                "table_name": "fake-table",
                "user_id": "fake-user-id",
                "conversation_id": "fake-conversation-id",
            },
            "rag_enabled": RAG_ENABLED,
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
            "model": "amazon.fake-model",
            "model_family": BedrockModelProviders.AMAZON.value,
            "model_params": {
                "topP": {"Type": "float", "Value": "0.9"},
                "maxTokenCount": {"Type": "integer", "Value": "200"},
            },
            "prompt_template": BEDROCK_RAG_PROMPT,
            "prompt_placeholders": DEFAULT_PROMPT_PLACEHOLDERS,
            "disambiguation_prompt_template": disambiguation_prompt,
            "disambiguation_prompt_enabled": disambiguation_enabled,
            "rephrase_question": DEFAULT_REPHRASE_RAG_QUESTION,
            "response_if_no_docs_found": response_if_no_docs_found,
            "return_source_docs": return_source_docs,
            "streaming": False,
            "verbose": False,
            "temperature": 0.25,
            "callbacks": None,
        }
    )


@pytest.fixture
def rag_chat(
    use_case,
    model_id,
    disambiguation_prompt,
    model_inputs,
    prompt,
    is_streaming,
    setup_environment,
    rag_enabled,
    return_source_docs,
    bedrock_dynamodb_defaults_table,
    disambiguation_enabled,
):
    model_inputs.streaming = is_streaming
    chat = BedrockRetrievalLLM(
        model_inputs=model_inputs,
        model_defaults=ModelDefaults(model_provider, model_id, rag_enabled),
    )
    yield chat


@pytest.mark.parametrize(
    "rag_enabled, is_streaming, return_source_docs, disambiguation_enabled, use_case, prompt, model_id, chat_fixture, disambiguation_prompt, response_if_no_docs_found",
    [
        # Disambiguation enabled
        (
            True,
            False,
            False,
            True,
            RAG_CHAT_IDENTIFIER,
            BEDROCK_RAG_PROMPT,
            model_id,
            "rag_chat",
            DISAMBIGUATION_PROMPT_TEMPLATE,
            None,
        ),
        (
            True,
            True,
            False,
            True,
            RAG_CHAT_IDENTIFIER,
            BEDROCK_RAG_PROMPT,
            model_id,
            "rag_chat",
            DISAMBIGUATION_PROMPT_TEMPLATE,
            None,
        ),
        (
            True,
            False,
            True,
            True,
            RAG_CHAT_IDENTIFIER,
            BEDROCK_RAG_PROMPT,
            model_id,
            "rag_chat",
            DISAMBIGUATION_PROMPT_TEMPLATE,
            None,
        ),
        (
            True,
            True,
            True,
            True,
            RAG_CHAT_IDENTIFIER,
            BEDROCK_RAG_PROMPT,
            model_id,
            "rag_chat",
            DISAMBIGUATION_PROMPT_TEMPLATE,
            None,
        ),
        (
            # response_if_no_docs_found check
            True,
            False,
            False,
            True,
            RAG_CHAT_IDENTIFIER,
            BEDROCK_RAG_PROMPT,
            model_id,
            "rag_chat",
            DISAMBIGUATION_PROMPT_TEMPLATE,
            RESPONSE_IF_NO_DOCS_FOUND,
        ),
        # Disambiguation disabled
        (True, False, False, False, RAG_CHAT_IDENTIFIER, BEDROCK_RAG_PROMPT, model_id, "rag_chat", None, None),
        (True, True, False, False, RAG_CHAT_IDENTIFIER, BEDROCK_RAG_PROMPT, model_id, "rag_chat", None, None),
        (True, False, True, False, RAG_CHAT_IDENTIFIER, BEDROCK_RAG_PROMPT, model_id, "rag_chat", None, None),
        (True, True, True, False, RAG_CHAT_IDENTIFIER, BEDROCK_RAG_PROMPT, model_id, "rag_chat", None, None),
    ],
)
def test_implement_error_not_raised(
    use_case,
    rag_enabled,
    prompt,
    is_streaming,
    chat_fixture,
    request,
    model_id,
    return_source_docs,
    setup_environment,
    disambiguation_prompt,
    bedrock_dynamodb_defaults_table,
    disambiguation_enabled,
    response_if_no_docs_found,
):
    chat = request.getfixturevalue(chat_fixture)
    try:
        assert chat.model == model_id
        assert chat.model_arn is None
        assert chat.conversation_history_cls == DynamoDBChatMessageHistory
        assert chat.conversation_history_params == {
            "table_name": "fake-table",
            "user_id": "fake-user-id",
            "conversation_id": "fake-conversation-id",
        }
        assert chat.prompt_template == ChatPromptTemplate.from_template(BEDROCK_RAG_PROMPT)
        assert set(chat.prompt_template.input_variables) == set(DEFAULT_PROMPT_RAG_PLACEHOLDERS)
        assert chat.model_params == {"temperature": 0.25, "maxTokenCount": 200, "topP": 0.9}
        assert chat.streaming == is_streaming
        assert chat.verbose == False
        assert chat.knowledge_base.kendra_index_id == "fake-kendra-index-id"
        if disambiguation_enabled:
            assert chat.disambiguation_prompt_template == ChatPromptTemplate.from_template(disambiguation_prompt)
        else:
            assert chat.disambiguation_prompt_template is disambiguation_prompt
        assert chat.return_source_docs == return_source_docs

        if response_if_no_docs_found is not None:
            assert chat.response_if_no_docs_found == response_if_no_docs_found

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
            BEDROCK_RAG_PROMPT,
            model_id,
            "rag_chat",
            {
                OUTPUT_KEY: "some answer based on context",
                REPHRASED_QUERY_KEY: "rephrased query",
                "other_fields": {"some_field": "some_value"},
            },
            {OUTPUT_KEY: "some answer based on context", REPHRASED_QUERY_KEY: "rephrased query"},
            DISAMBIGUATION_PROMPT_TEMPLATE,
            None,
        ),
        (
            True,
            True,
            False,
            True,
            RAG_CHAT_IDENTIFIER,
            BEDROCK_RAG_PROMPT,
            model_id,
            "rag_chat",
            {OUTPUT_KEY: "some answer based on context", REPHRASED_QUERY_KEY: "rephrased query"},
            {OUTPUT_KEY: "some answer based on context", REPHRASED_QUERY_KEY: "rephrased query"},
            DISAMBIGUATION_PROMPT_TEMPLATE,
            None,
        ),
        (
            True,
            False,
            True,
            True,
            RAG_CHAT_IDENTIFIER,
            BEDROCK_RAG_PROMPT,
            model_id,
            "rag_chat",
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
            DISAMBIGUATION_PROMPT_TEMPLATE,
            None,
        ),
        (
            True,
            True,
            True,
            True,
            RAG_CHAT_IDENTIFIER,
            BEDROCK_RAG_PROMPT,
            model_id,
            "rag_chat",
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
            DISAMBIGUATION_PROMPT_TEMPLATE,
            None,
        ),
        (
            True,
            False,
            False,
            False,
            RAG_CHAT_IDENTIFIER,
            BEDROCK_RAG_PROMPT,
            model_id,
            "rag_chat",
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
            BEDROCK_RAG_PROMPT,
            model_id,
            "rag_chat",
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
            BEDROCK_RAG_PROMPT,
            model_id,
            "rag_chat",
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
            BEDROCK_RAG_PROMPT,
            model_id,
            "rag_chat",
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
            BEDROCK_RAG_PROMPT,
            model_id,
            "rag_chat",
            {
                OUTPUT_KEY: "some answer based not based on context",
                CONTEXT_KEY: [],
                REPHRASED_QUERY_KEY: "rephrased query",
                "other_fields": {"some_field": "some_value"},
            },
            {
                OUTPUT_KEY: RESPONSE_IF_NO_DOCS_FOUND,
                SOURCE_DOCUMENTS_OUTPUT_KEY: [],
                REPHRASED_QUERY_KEY: "rephrased query",
            },
            DISAMBIGUATION_PROMPT_TEMPLATE,
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
    bedrock_dynamodb_defaults_table,
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
    "rag_enabled, disambiguation_enabled, return_source_docs, is_streaming, use_case, model_id, prompt, chat_fixture, disambiguation_prompt, test_disambiguation_prompt, expected_response, response_if_no_docs_found",
    [
        (
            True,
            True,
            False,
            False,
            RAG_CHAT_IDENTIFIER,
            model_id,
            BEDROCK_RAG_PROMPT,
            "rag_chat",
            DISAMBIGUATION_PROMPT_TEMPLATE,
            "{history} {input}",
            "{history} {input}",
            None,
        ),
        (
            True,
            True,
            False,
            False,
            RAG_CHAT_IDENTIFIER,
            model_id,
            BEDROCK_RAG_PROMPT,
            "rag_chat",
            DISAMBIGUATION_PROMPT_TEMPLATE,
            "{history} {context} {input}",
            "{history} {context} {input}",
            None,
        ),
        (
            # Additional tags are not blocked
            True,
            True,
            False,
            False,
            RAG_CHAT_IDENTIFIER,
            model_id,
            BEDROCK_RAG_PROMPT,
            "rag_chat",
            DISAMBIGUATION_PROMPT_TEMPLATE,
            "{history} {input} {extra_tag}",
            "{history} {input} {extra_tag}",
            None,
        ),
    ],
)
def test_get_validated_disambiguation_prompt(
    use_case,
    model_id,
    prompt,
    is_streaming,
    return_source_docs,
    rag_enabled,
    chat_fixture,
    test_disambiguation_prompt,
    expected_response,
    setup_environment,
    bedrock_dynamodb_defaults_table,
    request,
    disambiguation_prompt,
    disambiguation_enabled,
    response_if_no_docs_found,
):
    chat = request.getfixturevalue(chat_fixture)
    response = chat.get_validated_disambiguation_prompt(
        test_disambiguation_prompt,
        DISAMBIGUATION_PROMPT_TEMPLATE,
        DISAMBIGUATION_PROMPT_PLACEHOLDERS,
        disambiguation_enabled,
    )
    assert response == ChatPromptTemplate.from_template(expected_response)


@pytest.mark.parametrize(
    "rag_enabled, disambiguation_enabled, return_source_docs, is_streaming, use_case, model_id, prompt,test_prompt, expected_prompt",
    [
        (
            # incorrect prompt with repeated occurrences leads to default prompt being used
            True,
            True,
            False,
            False,
            RAG_CHAT_IDENTIFIER,
            model_id,
            BEDROCK_RAG_PROMPT,
            "{input} {input} {context} {history}",
            DISAMBIGUATION_PROMPT_TEMPLATE,
        ),
    ],
)
def test_exceptional_disambiguation_prompt_validations(
    use_case,
    model_id,
    prompt,
    is_streaming,
    setup_environment,
    return_source_docs,
    rag_enabled,
    bedrock_dynamodb_defaults_table,
    request,
    test_prompt,
    expected_prompt,
    disambiguation_enabled,
):
    llm_params = BedrockInputs(
        **{
            "conversation_history_cls": DynamoDBChatMessageHistory,
            "conversation_history_params": {
                "table_name": "fake-table",
                "user_id": "fake-user-id",
                "conversation_id": "fake-conversation-id",
            },
            "rag_enabled": True,
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
            "model": "amazon.fake-model",
            "model_family": BedrockModelProviders.AMAZON.value,
            "model_params": {
                "topP": {"Type": "float", "Value": "0.2"},
                "maxTokenCount": {"Type": "integer", "Value": "100"},
            },
            "prompt_template": BEDROCK_RAG_PROMPT,
            "prompt_placeholders": DEFAULT_PROMPT_RAG_PLACEHOLDERS,
            "rephrase_question": DEFAULT_REPHRASE_RAG_QUESTION,
            "disambiguation_prompt_template": test_prompt,
            "disambiguation_prompt_enabled": True,
            "streaming": False,
            "verbose": False,
            "temperature": 0.45,
            "callbacks": None,
        }
    )

    chat = BedrockRetrievalLLM(
        model_inputs=llm_params,
        model_defaults=ModelDefaults(model_provider, model_id, rag_enabled),
    )

    assert chat.prompt_template == ChatPromptTemplate.from_template(BEDROCK_RAG_PROMPT)
    assert chat.disambiguation_prompt_template == ChatPromptTemplate.from_template(expected_prompt)
