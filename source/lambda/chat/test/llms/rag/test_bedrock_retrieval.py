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
from llms.models.model_provider_inputs import BedrockInputs
from llms.rag.bedrock_retrieval import BedrockRetrievalLLM
from shared.defaults.model_defaults import ModelDefaults
from shared.knowledge.kendra_knowledge_base import KendraKnowledgeBase
from shared.memory.ddb_enhanced_message_history import DynamoDBChatMessageHistory
from utils.constants import (
    DEFAULT_PROMPT_PLACEHOLDERS,
    DEFAULT_PROMPT_RAG_PLACEHOLDERS,
    DEFAULT_REPHRASE_RAG_QUESTION,
    MODEL_INFO_TABLE_NAME_ENV_VAR,
    RAG_CHAT_IDENTIFIER,
)
from utils.custom_exceptions import LLMBuildError
from utils.enum_types import BedrockModelProviders, LLMProviderTypes

RAG_ENABLED = True
MODEL_ID = "amazon.fake-model"
MODEL_PROVIDER = LLMProviderTypes.BEDROCK.value
BEDROCK_RAG_PROMPT = """{context}\n\n{history}\n\n{input}"""
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


@pytest.fixture
def model_inputs(
    disambiguation_enabled, disambiguation_prompt, return_source_docs, response_if_no_docs_found, is_streaming
):
    yield BedrockInputs(
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
            "streaming": is_streaming,
            "verbose": False,
            "temperature": 0.25,
            "callbacks": None,
        }
    )


@pytest.fixture
def titan_model(
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
    chat = BedrockRetrievalLLM(
        model_inputs=model_inputs,
        model_defaults=ModelDefaults(MODEL_PROVIDER, model_id, rag_enabled),
    )
    yield chat


@pytest.fixture
def temp_bedrock_dynamodb_defaults_table(
    dynamodb_resource, prompt, dynamodb_defaults_table, use_case, is_streaming, model_id, disambiguation_prompt
):
    model_provider = LLMProviderTypes.BEDROCK.value
    table_name = os.getenv(MODEL_INFO_TABLE_NAME_ENV_VAR)
    output_key = "answer"
    context_key = "context"
    input_key = "input"
    history_key = "history"

    table = dynamodb_resource.Table(table_name)
    table.put_item(
        Item={
            "UseCase": use_case,
            "SortKey": f"{model_provider}#{model_id}",
            "AllowsStreaming": is_streaming,
            "DefaultTemperature": "0.5",
            "MaxChatMessageSize": "2500",
            "MaxPromptSize": "2000",
            "MaxTemperature": "1",
            "MemoryConfig": {
                "history": history_key,
                "input": input_key,
                "context": context_key,
                "ai_prefix": "Bot",
                "human_prefix": "User",
                "output": output_key,
            },
            "MinTemperature": "0",
            "ModelName": model_id,
            "ModelProviderName": model_provider,
            "Prompt": prompt,
            "DefaultStopSequences": [],
            "DisambiguationPrompt": disambiguation_prompt,
        }
    )


@pytest.mark.parametrize(
    "rag_enabled, is_streaming, return_source_docs, disambiguation_enabled, use_case, prompt, model_id, chat_fixture, disambiguation_prompt, response_if_no_docs_found",
    [
        # Other test cases are tested in test_retrieval_llm.py
        (
            True,
            False,
            False,
            True,
            RAG_CHAT_IDENTIFIER,
            BEDROCK_RAG_PROMPT,
            MODEL_ID,
            "titan_model",
            DISAMBIGUATION_PROMPT,
            None,
        )
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
    "use_case, prompt, is_streaming, return_source_docs, model_id, disambiguation_enabled, disambiguation_prompt, response_if_no_docs_found",
    [
        (
            RAG_CHAT_IDENTIFIER,
            BEDROCK_RAG_PROMPT,
            False,
            False,
            MODEL_ID,
            True,
            DISAMBIGUATION_PROMPT,
            RESPONSE_IF_NO_DOCS_FOUND,
        ),
        (
            RAG_CHAT_IDENTIFIER,
            BEDROCK_RAG_PROMPT,
            True,
            False,
            MODEL_ID,
            True,
            DISAMBIGUATION_PROMPT,
            RESPONSE_IF_NO_DOCS_FOUND,
        ),
        (
            RAG_CHAT_IDENTIFIER,
            BEDROCK_RAG_PROMPT,
            False,
            True,
            MODEL_ID,
            True,
            DISAMBIGUATION_PROMPT,
            RESPONSE_IF_NO_DOCS_FOUND,
        ),
        (
            RAG_CHAT_IDENTIFIER,
            BEDROCK_RAG_PROMPT,
            True,
            True,
            MODEL_ID,
            True,
            DISAMBIGUATION_PROMPT,
            RESPONSE_IF_NO_DOCS_FOUND,
        ),
    ],
)
def test_exception_for_incorrect_model_params(
    use_case,
    prompt,
    is_streaming,
    model_id,
    setup_environment,
    model_inputs,
    return_source_docs,
    bedrock_dynamodb_defaults_table,
    disambiguation_enabled,
    disambiguation_prompt,
    response_if_no_docs_found,
):
    with pytest.raises(LLMBuildError) as error:
        with mock.patch(
            "shared.knowledge.kendra_retriever.CustomKendraRetriever.get_relevant_documents"
        ) as mocked_kendra_docs:
            mocked_kendra_docs.return_value = [MOCKED_SOURCE_DOCS]
            model_inputs.model_family = BedrockModelProviders.AMAZON.value
            model_inputs.model_params = {"incorrect_param": {"Type": "integer", "Value": "512"}}

            chat = BedrockRetrievalLLM(
                model_inputs=model_inputs,
                model_defaults=ModelDefaults(MODEL_PROVIDER, model_id, RAG_ENABLED),
            )
            chat.generate("What is lambda?")

    assert (
        f"Error occurred while building Bedrock family '{model_inputs.model_family}' model '{MODEL_ID}'. "
        "Ensure that the model params provided are correct and they match the model specification."
        in error.value.args[0]
    )
    assert (
        "Error: BedrockAmazonLLMParams.__init__() got an unexpected keyword argument 'incorrect_param'"
        in error.value.args[0]
    )


@pytest.mark.parametrize(
    "use_case, prompt, is_streaming, return_source_docs, model_id, disambiguation_enabled, disambiguation_prompt, response_if_no_docs_found",
    [
        (
            RAG_CHAT_IDENTIFIER,
            BEDROCK_RAG_PROMPT,
            False,
            False,
            "anthropic.claude-x",
            True,
            DISAMBIGUATION_PROMPT,
            RESPONSE_IF_NO_DOCS_FOUND,
        ),
        (
            RAG_CHAT_IDENTIFIER,
            BEDROCK_RAG_PROMPT,
            True,
            False,
            "anthropic.claude-x",
            True,
            DISAMBIGUATION_PROMPT,
            RESPONSE_IF_NO_DOCS_FOUND,
        ),
        (
            RAG_CHAT_IDENTIFIER,
            BEDROCK_RAG_PROMPT,
            False,
            True,
            "anthropic.claude-x",
            True,
            DISAMBIGUATION_PROMPT,
            RESPONSE_IF_NO_DOCS_FOUND,
        ),
        (
            RAG_CHAT_IDENTIFIER,
            BEDROCK_RAG_PROMPT,
            True,
            True,
            "anthropic.claude-x",
            True,
            DISAMBIGUATION_PROMPT,
            RESPONSE_IF_NO_DOCS_FOUND,
        ),
    ],
)
def test_bedrock_model_variation(
    use_case,
    prompt,
    is_streaming,
    model_id,
    setup_environment,
    model_inputs,
    return_source_docs,
    temp_bedrock_dynamodb_defaults_table,
    disambiguation_enabled,
    response_if_no_docs_found,
    disambiguation_prompt,
):
    # testing another bedrock model
    model_inputs.model_params = {
        "top_p": {"Type": "float", "Value": "0.9"},
        "max_tokens": {"Type": "integer", "Value": "200"},
    }
    model_inputs.model_family = BedrockModelProviders.ANTHROPIC.value
    model_inputs.model = model_id

    chat = BedrockRetrievalLLM(
        model_inputs=model_inputs,
        model_defaults=ModelDefaults(MODEL_PROVIDER, model_id, RAG_ENABLED),
    )

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
    assert chat.model_params == {"temperature": 0.25, "max_tokens": 200, "top_p": 0.9}
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


@pytest.mark.parametrize(
    "use_case, prompt, is_streaming, return_source_docs, model_id, disambiguation_enabled, disambiguation_prompt, response_if_no_docs_found",
    [
        (
            RAG_CHAT_IDENTIFIER,
            BEDROCK_RAG_PROMPT,
            False,
            False,
            "anthropic.claude-x",
            False,
            DISAMBIGUATION_PROMPT,
            RESPONSE_IF_NO_DOCS_FOUND,
        ),
    ],
)
def test_guardrails(
    use_case,
    prompt,
    is_streaming,
    model_id,
    setup_environment,
    model_inputs,
    return_source_docs,
    temp_bedrock_dynamodb_defaults_table,
    disambiguation_enabled,
    disambiguation_prompt,
    response_if_no_docs_found,
):
    model_inputs.model_params = {"top_p": {"Value": "0.9", "Type": "float"}}
    model_inputs.model_family = BedrockModelProviders.ANTHROPIC.value
    model_inputs.model = model_id
    model_inputs.guardrails = {"guardrailIdentifier": "fake-id", "guardrailVersion": "1"}

    chat = BedrockRetrievalLLM(
        model_inputs=model_inputs,
        model_defaults=ModelDefaults(MODEL_PROVIDER, model_id, RAG_ENABLED),
    )

    assert chat.model_params == {"temperature": 0.25, "top_p": 0.9}
    assert chat.guardrails == {"guardrailIdentifier": "fake-id", "guardrailVersion": "1"}


@pytest.mark.parametrize(
    "use_case, prompt, is_streaming, return_source_docs, model_id, disambiguation_enabled, disambiguation_prompt, response_if_no_docs_found",
    [
        (
            RAG_CHAT_IDENTIFIER,
            BEDROCK_RAG_PROMPT,
            False,
            False,
            MODEL_ID,
            False,
            None,
            RESPONSE_IF_NO_DOCS_FOUND,
        ),
    ],
)
def test_provisioned_model(
    use_case,
    prompt,
    is_streaming,
    model_id,
    setup_environment,
    model_inputs,
    return_source_docs,
    test_provisioned_arn,
    bedrock_dynamodb_defaults_table,
):
    model_inputs.model_arn = test_provisioned_arn
    model_provider = LLMProviderTypes.BEDROCK.value
    model_inputs.streaming = is_streaming
    model_inputs.model = model_id
    model_inputs.model_family = BedrockModelProviders.AMAZON.value

    chat = BedrockRetrievalLLM(
        model_inputs=model_inputs,
        model_defaults=ModelDefaults(model_provider, model_id, RAG_ENABLED),
    )
    assert chat.model == MODEL_ID
    assert chat.model_arn == test_provisioned_arn
    assert chat.model_family == BedrockModelProviders.AMAZON.value
