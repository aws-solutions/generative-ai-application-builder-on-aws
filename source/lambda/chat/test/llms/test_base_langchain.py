#!/usr/bin/env python
# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

import pytest
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder

from llms.bedrock import BedrockLLM
from llms.models.model_provider_inputs import BedrockInputs, SageMakerInputs
from llms.rag.bedrock_retrieval import BedrockRetrievalLLM
from shared.defaults.model_defaults import ModelDefaults
from shared.knowledge.kendra_knowledge_base import KendraKnowledgeBase
from shared.memory.ddb_enhanced_message_history import DynamoDBChatMessageHistory
from utils.constants import CHAT_IDENTIFIER, DEFAULT_REPHRASE_RAG_QUESTION, RAG_CHAT_IDENTIFIER
from utils.enum_types import BedrockModelProviders, LLMProviderTypes

DEFAULT_PROMPT_PLACEHOLDERS = []
DEFAULT_PROMPT_RAG_PLACEHOLDERS = ["context"]
PROMPT = """test prompt"""
RAG_PROMPT = """{context}\n\ntest prompt"""
RESPONSE_IF_NO_DOCS_FOUND = "Sorry, the model cannot respond to your questions due to admin enforced constraints."
DISAMBIGUATION_PROMPT = """Given the following conversation and a follow up question, rephrase the follow up question to be a standalone question, in its original language.\n\nChat History:\n{history}\nFollow Up Input: {input}\nStandalone question:"""

RAG_ENABLED = False
MODEL_ID = "amazon.fake-model"


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
                "message_id": "fake-message-id",
            },
            "rag_enabled": False,
            "knowledge_base": None,
            "model": "amazon.fake-model",
            "model_family": BedrockModelProviders.AMAZON.value,
            "model_params": {
                "topP": {"Type": "float", "Value": "0.9"},
                "maxTokenCount": {"Type": "integer", "Value": "200"},
            },
            "prompt_template": PROMPT,
            "prompt_placeholders": DEFAULT_PROMPT_PLACEHOLDERS,
            "disambiguation_prompt_template": None,
            "disambiguation_prompt_enabled": None,
            "rephrase_question": None,
            "response_if_no_docs_found": None,
            "return_source_docs": None,
            "streaming": is_streaming,
            "verbose": False,
            "temperature": 0.25,
            "callbacks": None,
        }
    )


@pytest.fixture
def chat(
    setup_environment,
    bedrock_dynamodb_defaults_table,
    use_case,
    model_inputs,
    model_id,
    prompt,
    is_streaming,
    rag_enabled,
):
    model_inputs.knowledge_base = None
    model_inputs.disambiguation_prompt_template = None
    model_inputs.disambiguation_prompt_enabled = None
    model_inputs.return_source_docs = None
    model_inputs.rag_enabled = False
    model_inputs.response_if_no_docs_found = None
    model_inputs.prompt_template = prompt
    model_inputs.is_streaming = is_streaming
    model_inputs.model = model_id
    model_inputs.rephrase_question = None
    chat = BedrockLLM(
        model_inputs=model_inputs,
        model_defaults=ModelDefaults(LLMProviderTypes.BEDROCK.value, model_id, rag_enabled),
    )
    yield chat


@pytest.fixture
def rag_chat(
    setup_environment,
    bedrock_dynamodb_defaults_table,
    use_case,
    model_id,
    prompt,
    is_streaming,
    rag_enabled,
    return_source_docs,
    disambiguation_prompt,
    model_inputs,
):
    model_inputs.rag_enabled = rag_enabled
    model_inputs.is_streaming = is_streaming
    model_inputs.return_source_docs = return_source_docs
    model_inputs.disambiguation_prompt_template = disambiguation_prompt
    model_inputs.disambiguation_prompt_enabled = True
    model_inputs.response_if_no_docs_found = RESPONSE_IF_NO_DOCS_FOUND
    model_inputs.prompt_template = prompt
    model_inputs.model = model_id
    model_inputs.rephrase_question = DEFAULT_REPHRASE_RAG_QUESTION
    model_inputs.knowledge_base = KendraKnowledgeBase(
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
    chat = BedrockRetrievalLLM(
        model_inputs=model_inputs,
        model_defaults=ModelDefaults(LLMProviderTypes.BEDROCK.value, model_id, rag_enabled),
    )
    yield chat


@pytest.mark.parametrize(
    "use_case, model_id, is_streaming, rag_enabled, return_source_docs, prompt, placeholders, expected_response, chat_fixture, disambiguation_enabled, disambiguation_prompt, default_prompt, default_prompt_placeholders, response_if_no_docs_found",
    [
        (
            CHAT_IDENTIFIER,
            MODEL_ID,
            False,
            False,
            False,
            "{history} {input}",
            DEFAULT_PROMPT_PLACEHOLDERS,
            "{history} {input}",
            "chat",
            None,
            None,
            PROMPT,
            DEFAULT_PROMPT_PLACEHOLDERS,
            None,
        ),
        (
            RAG_CHAT_IDENTIFIER,
            MODEL_ID,
            False,
            True,
            False,
            "{history} {context} {input}",
            DEFAULT_PROMPT_RAG_PLACEHOLDERS,
            "{history} {context} {input}",
            "rag_chat",
            True,
            DISAMBIGUATION_PROMPT,
            RAG_PROMPT,
            DEFAULT_PROMPT_RAG_PLACEHOLDERS,
            RESPONSE_IF_NO_DOCS_FOUND,
        ),
    ],
)
def test_placeholder_replacements(
    use_case,
    model_id,
    model_inputs,
    prompt,
    is_streaming,
    setup_environment,
    placeholders,
    rag_enabled,
    return_source_docs,
    expected_response,
    bedrock_dynamodb_defaults_table,
    request,
    chat_fixture,
    disambiguation_prompt,
    default_prompt,
    default_prompt_placeholders,
    disambiguation_enabled,
    response_if_no_docs_found,
):
    chat = request.getfixturevalue(chat_fixture)
    assert chat.get_validated_prompt(
        prompt, placeholders, LLMProviderTypes.BEDROCK, rag_enabled
    ) == ChatPromptTemplate.from_messages(
        [
            ("system", prompt),
            MessagesPlaceholder("history", optional=True),
            ("human", "{input}"),
        ]
    )


@pytest.mark.parametrize(
    "use_case, model_id, test_prompt, prompt, placeholders, is_streaming, return_source_docs, rag_enabled, chat_fixture, disambiguation_prompt, disambiguation_enabled, response_if_no_docs_found, should_pass, error_message",
    [
        (
            # Valid non-RAG prompt
            CHAT_IDENTIFIER,
            MODEL_ID,
            "{history} {input}",
            PROMPT,
            DEFAULT_PROMPT_PLACEHOLDERS,
            False,
            False,
            False,
            "chat",
            None,
            None,
            None,
            True,
            None,
        ),
        (
            # Provided 'context' placeholder in prompt template for non-RAG use case
            CHAT_IDENTIFIER,
            MODEL_ID,
            "{history} {context} {input}",
            PROMPT,
            DEFAULT_PROMPT_PLACEHOLDERS,
            False,
            False,
            False,
            "chat",
            None,
            None,
            None,
            False,
            "Provided 'context' placeholder in prompt template for non-RAG use case. Prompt:\n{history} {context} {input}",
        ),
        (
            # Empty prompt
            CHAT_IDENTIFIER,
            MODEL_ID,
            "",
            PROMPT,
            [],
            False,
            False,
            False,
            "chat",
            None,
            None,
            None,
            False,
            "Prompt is empty.",
        ),
        (
            # correct rag prompt
            RAG_CHAT_IDENTIFIER,
            MODEL_ID,
            "{history} {context} {input}",
            RAG_PROMPT,
            DEFAULT_PROMPT_RAG_PLACEHOLDERS,
            False,
            False,
            True,
            "rag_chat",
            DISAMBIGUATION_PROMPT,
            True,
            RESPONSE_IF_NO_DOCS_FOUND,
            True,
            None,
        ),
        (
            # correct rag prompt
            RAG_CHAT_IDENTIFIER,
            MODEL_ID,
            "{history} {context} {input}",
            RAG_PROMPT,
            DEFAULT_PROMPT_RAG_PLACEHOLDERS,
            False,
            False,
            True,
            "rag_chat",
            DISAMBIGUATION_PROMPT,
            True,
            RESPONSE_IF_NO_DOCS_FOUND,
            True,
            None,
        ),
        (
            # Additional tags are not blocked
            RAG_CHAT_IDENTIFIER,
            MODEL_ID,
            "{context} {history} {input} {additionaltag}",
            RAG_PROMPT,
            DEFAULT_PROMPT_RAG_PLACEHOLDERS,
            False,
            False,
            True,
            "rag_chat",
            DISAMBIGUATION_PROMPT,
            True,
            RESPONSE_IF_NO_DOCS_FOUND,
            True,
            None,
        ),
        (
            # Missing context for rag chat
            RAG_CHAT_IDENTIFIER,
            MODEL_ID,
            "{history} {input}",
            RAG_PROMPT,
            DEFAULT_PROMPT_RAG_PLACEHOLDERS,
            False,
            False,
            True,
            "rag_chat",
            DISAMBIGUATION_PROMPT,
            True,
            RESPONSE_IF_NO_DOCS_FOUND,
            False,
            "The prompt template does not contain the required placeholder 'context' for RAG use case. Prompt:\n{history} {input}",
        ),
    ],
)
def test_bedrock_get_validated_prompt(
    use_case,
    model_id,
    test_prompt,
    prompt,
    is_streaming,
    setup_environment,
    placeholders,
    return_source_docs,
    rag_enabled,
    bedrock_dynamodb_defaults_table,
    request,
    chat_fixture,
    disambiguation_prompt,
    disambiguation_enabled,
    response_if_no_docs_found,
    should_pass,
    error_message,
):
    # test_prompt and prompt is differentiated because prompt goes into defaults and is used in case of failures
    # test_prompt is passed into model_inputs
    chat = request.getfixturevalue(chat_fixture)  # has prompt as prompt_template
    chat._prompt_placeholders = placeholders
    chat.rag_enabled = rag_enabled

    if should_pass:
        chat.prompt_template = test_prompt
        assert chat.get_validated_prompt(
            prompt, placeholders, LLMProviderTypes.BEDROCK, rag_enabled
        ) == ChatPromptTemplate.from_messages(
            [
                ("system", prompt),
                MessagesPlaceholder("history", optional=True),
                ("human", "{input}"),
            ]
        )
    else:
        with pytest.raises(ValueError) as error:
            chat.prompt_template = test_prompt
        assert error.value.args[0] == error_message


@pytest.mark.parametrize(
    "use_case, model_id, test_prompt, expected_response, prompt, placeholders, is_streaming, return_source_docs, rag_enabled, chat_fixture, disambiguation_prompt, disambiguation_enabled, response_if_no_docs_found",
    [
        (
            CHAT_IDENTIFIER,
            MODEL_ID,
            "{history} {input}",
            "{history} {input}",
            PROMPT,
            DEFAULT_PROMPT_PLACEHOLDERS,
            False,
            False,
            False,
            "chat",
            None,
            None,
            None,
        )
    ],
)
def test_invalid_provider_type(
    use_case,
    model_id,
    test_prompt,
    prompt,
    is_streaming,
    setup_environment,
    placeholders,
    return_source_docs,
    rag_enabled,
    expected_response,
    bedrock_dynamodb_defaults_table,
    request,
    chat_fixture,
    disambiguation_prompt,
    disambiguation_enabled,
    response_if_no_docs_found,
):
    chat = request.getfixturevalue(chat_fixture)
    with pytest.raises(ValueError) as error:
        chat.get_validated_prompt(prompt, placeholders, "invalid value", rag_enabled)
    assert error.value.args[0] == "Invalid LLM Provider type: invalid value"


@pytest.mark.parametrize(
    "use_case, model_id, prompt, is_streaming, return_source_docs, rag_enabled, params, expected_response, chat_fixture, disambiguation_prompt, disambiguation_enabled, response_if_no_docs_found",
    [
        (
            CHAT_IDENTIFIER,
            MODEL_ID,
            PROMPT,
            False,
            False,
            False,
            None,
            {"temperature": 0.25},
            "chat",
            None,
            None,
            None,
        ),
        (
            RAG_CHAT_IDENTIFIER,
            MODEL_ID,
            RAG_PROMPT,
            False,
            False,
            True,
            {
                "topP": {"Type": "float", "Value": "0.2"},
                "maxTokenCount": {"Type": "integer", "Value": "100"},
            },
            {"maxTokenCount": 100, "topP": 0.2, "temperature": 0.25},
            "rag_chat",
            DISAMBIGUATION_PROMPT,
            True,
            RESPONSE_IF_NO_DOCS_FOUND,
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
    bedrock_dynamodb_defaults_table,
    request,
    chat_fixture,
    params,
    disambiguation_prompt,
    disambiguation_enabled,
    response_if_no_docs_found,
):
    chat = request.getfixturevalue(chat_fixture)
    assert chat.get_clean_model_params(params) == expected_response
