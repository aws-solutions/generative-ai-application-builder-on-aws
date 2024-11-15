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
from langchain.chains import ConversationalRetrievalChain
from langchain_core.prompts import PromptTemplate
from llms.models.model_provider_inputs import BedrockInputs
from llms.rag.bedrock_retrieval import BedrockRetrievalLLM
from shared.defaults.model_defaults import ModelDefaults
from shared.knowledge.kendra_knowledge_base import KendraKnowledgeBase
from shared.memory.ddb_chat_memory import DynamoDBChatMemory
from shared.memory.ddb_enhanced_message_history import DynamoDBChatMessageHistory
from utils.constants import (
    DEFAULT_PROMPT_PLACEHOLDERS,
    DEFAULT_PROMPT_RAG_PLACEHOLDERS,
    DEFAULT_REPHRASE_RAG_QUESTION,
    DISAMBIGUATION_PROMPT_PLACEHOLDERS,
    RAG_CHAT_IDENTIFIER,
    SOURCE_DOCUMENTS_KEY,
)
from utils.enum_types import BedrockModelProviders

BEDROCK_PROMPT = """\n\n{history}\n\n{input}"""
BEDROCK_RAG_PROMPT = """{context}\n\n{chat_history}\n\n{question}"""
DISAMBIGUATION_PROMPT = """Given the following conversation and a follow up question, rephrase the follow up question to be a standalone question, in its original language.\n\nChat History:\n{history}\nFollow Up Input: {input}\nStandalone question:"""
TAGS_REPLACED_DISAMBIGUATION_PROMPT = DISAMBIGUATION_PROMPT.replace("{input}", "{question}").replace(
    "{history}", "{chat_history}"
)
RESPONSE_IF_NO_DOCS_FOUND = "Sorry, the model cannot respond to your questions due to admin enforced constraints."

RAG_ENABLED = False
model_id = "amazon.fake-model"
provider_name = "Bedrock"


@pytest.fixture
def llm_params(disambiguation_enabled, disambiguation_prompt, response_if_no_docs_found):
    return BedrockInputs(
        **{
            "conversation_memory": DynamoDBChatMemory(
                DynamoDBChatMessageHistory(
                    table_name="fake-table", user_id="fake-user-id", conversation_id="fake-conversation-id"
                )
            ),
            "knowledge_base": None,
            "model": "amazon.fake-model",
            "model_params": {
                "topP": {"Type": "float", "Value": "0.9"},
                "maxTokenCount": {"Type": "integer", "Value": "200"},
            },
            "prompt_template": BEDROCK_PROMPT,
            "prompt_placeholders": DEFAULT_PROMPT_PLACEHOLDERS,
            "rephrase_question": DEFAULT_REPHRASE_RAG_QUESTION,
            "disambiguation_prompt_template": disambiguation_prompt,
            "disambiguation_prompt_enabled": disambiguation_enabled,
            "response_if_no_docs_found": response_if_no_docs_found,
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
    llm_params,
    prompt,
    is_streaming,
    setup_environment,
    rag_enabled,
    return_source_docs,
    bedrock_dynamodb_defaults_table,
    disambiguation_enabled,
):
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
    llm_params.streaming = is_streaming
    chat = BedrockRetrievalLLM(
        llm_params=llm_params,
        model_defaults=ModelDefaults(provider_name, model_id, rag_enabled),
        model_family=BedrockModelProviders.AMAZON,
        return_source_docs=return_source_docs,
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
            TAGS_REPLACED_DISAMBIGUATION_PROMPT,
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
            TAGS_REPLACED_DISAMBIGUATION_PROMPT,
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
            TAGS_REPLACED_DISAMBIGUATION_PROMPT,
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
            TAGS_REPLACED_DISAMBIGUATION_PROMPT,
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
            TAGS_REPLACED_DISAMBIGUATION_PROMPT,
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
    chat_model = request.getfixturevalue(chat_fixture)
    try:
        assert chat_model.model == model_id
        assert chat_model.prompt_template.template == BEDROCK_RAG_PROMPT
        assert set(chat_model.prompt_template.input_variables) == set(DEFAULT_PROMPT_RAG_PLACEHOLDERS)
        assert chat_model.model_params == {"temperature": 0.25, "maxTokenCount": 200, "topP": 0.9}
        assert chat_model.streaming == is_streaming
        assert chat_model.verbose == False
        assert chat_model.knowledge_base.kendra_index_id == "fake-kendra-index-id"
        assert chat_model.conversation_memory.chat_memory.messages == []
        if disambiguation_enabled:
            assert chat_model.disambiguation_prompt_template == PromptTemplate.from_template(disambiguation_prompt)
        else:
            assert chat_model.disambiguation_prompt_template is disambiguation_prompt
        assert chat_model.return_source_docs == return_source_docs

        if response_if_no_docs_found is not None:
            assert chat_model.response_if_no_docs_found == response_if_no_docs_found

        assert type(chat_model.conversation_chain) == ConversationalRetrievalChain
        assert type(chat_model.conversation_memory) == DynamoDBChatMemory
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
                "answer": "some answer based on context",
                "other_fields": {"some_field": "some_value"},
            },
            {
                "answer": "some answer based on context",
            },
            DISAMBIGUATION_PROMPT,
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
            {"answer": "some answer based on context"},
            {"answer": "some answer based on context"},
            DISAMBIGUATION_PROMPT,
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
                "answer": "some answer based on context",
                "source_documents": [{"page_content": "some-content-1"}, {"page_content": "some-content-2"}],
                "other_fields": {"some_field": "some_value"},
            },
            {
                "answer": "some answer based on context",
                "source_documents": [{"page_content": "some-content-1"}, {"page_content": "some-content-2"}],
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
            BEDROCK_RAG_PROMPT,
            model_id,
            "rag_chat",
            {
                "answer": "some answer based on context",
                "source_documents": [{"page_content": "some-content-1"}, {"page_content": "some-content-2"}],
                "other_fields": {"some_field": "some_value"},
            },
            {
                "answer": "some answer based on context",
                "source_documents": [{"page_content": "some-content-1"}, {"page_content": "some-content-2"}],
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
            BEDROCK_RAG_PROMPT,
            model_id,
            "rag_chat",
            {
                "answer": "some answer based on context",
                "other_fields": {"some_field": "some_value"},
            },
            {
                "answer": "some answer based on context",
            },
            DISAMBIGUATION_PROMPT,
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
                "answer": "some answer based on context",
                "other_fields": {"some_field": "some_value"},
            },
            {"answer": "some answer based on context"},
            DISAMBIGUATION_PROMPT,
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
                "answer": "some answer based on context",
                "source_documents": [{"page_content": "some-content-1"}, {"page_content": "some-content-2"}],
                "other_fields": {"some_field": "some_value"},
            },
            {
                "answer": "some answer based on context",
                "source_documents": [{"page_content": "some-content-1"}, {"page_content": "some-content-2"}],
            },
            DISAMBIGUATION_PROMPT,
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
                "answer": "some answer based on context",
                "source_documents": [{"page_content": "some-content-1"}, {"page_content": "some-content-2"}],
                "other_fields": {"some_field": "some_value"},
            },
            {
                "answer": "some answer based on context",
                "source_documents": [{"page_content": "some-content-1"}, {"page_content": "some-content-2"}],
            },
            DISAMBIGUATION_PROMPT,
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
                "answer": RESPONSE_IF_NO_DOCS_FOUND,
                "other_fields": {"some_field": "some_value"},
                "source_documents": [],
            },
            {
                "answer": RESPONSE_IF_NO_DOCS_FOUND,
                "source_documents": [],
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
    with mock.patch("langchain.chains.ConversationalRetrievalChain.invoke", return_value=chain_output):
        response = model.generate("What is lambda?")
        assert response == expected_output

        if return_source_docs:
            assert SOURCE_DOCUMENTS_KEY in response
        else:
            assert SOURCE_DOCUMENTS_KEY not in response

        if response_if_no_docs_found is not None:
            assert response["answer"] == response_if_no_docs_found


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
            DISAMBIGUATION_PROMPT,
            "{chat_history} {question}",
            "{chat_history} {question}",
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
            DISAMBIGUATION_PROMPT,
            "{history} {context} {input}",
            "{chat_history} {context} {question}",
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
            DISAMBIGUATION_PROMPT,
            "{history} {input} {extra_tag}",
            "{chat_history} {question} {extra_tag}",
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
        test_disambiguation_prompt, DISAMBIGUATION_PROMPT, DISAMBIGUATION_PROMPT_PLACEHOLDERS, disambiguation_enabled
    )
    assert response.template == expected_response


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
            "{question} {question} {context} {chat_history}",
            TAGS_REPLACED_DISAMBIGUATION_PROMPT,
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
            "model": "amazon.fake-model",
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
        llm_params=llm_params,
        model_defaults=ModelDefaults(provider_name, model_id, rag_enabled),
        model_family=BedrockModelProviders.AMAZON,
        return_source_docs=return_source_docs,
    )

    assert chat.prompt_template.template == BEDROCK_RAG_PROMPT
    assert chat.disambiguation_prompt_template.template == expected_prompt
