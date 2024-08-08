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

import pytest
from langchain_core.prompts import PromptTemplate
from llms.bedrock import BedrockLLM
from llms.models.model_provider_inputs import BedrockInputs
from llms.rag.bedrock_retrieval import BedrockRetrievalLLM
from shared.defaults.model_defaults import ModelDefaults
from shared.knowledge.kendra_knowledge_base import KendraKnowledgeBase
from shared.memory.ddb_chat_memory import DynamoDBChatMemory
from shared.memory.ddb_enhanced_message_history import DynamoDBChatMessageHistory
from utils.constants import (
    CHAT_IDENTIFIER,
    DEFAULT_PROMPT_PLACEHOLDERS,
    DEFAULT_PROMPT_RAG_PLACEHOLDERS,
    DEFAULT_REPHRASE_RAG_QUESTION,
    RAG_CHAT_IDENTIFIER,
)
from utils.enum_types import BedrockModelProviders

BEDROCK_PROMPT = """\n\n{history}\n\n{input}"""
BEDROCK_RAG_PROMPT = """{context}\n\n{chat_history}\n\n{question}"""
DISAMBIGUATION_PROMPT = """Given the following conversation and a follow up question, rephrase the follow up question to be a standalone question, in its original language.\n\nChat History:\n{history}\nFollow Up Input: {input}\nStandalone question:"""
TAGS_REPLACED_DISAMBIGUATION_PROMPT = DISAMBIGUATION_PROMPT.replace("{input}", "{question}").replace(
    "{history}", "{chat_history}"
)

RAG_ENABLED = False
model_id = "amazon.fake-model"
provider_name = "Bedrock"

llm_params = BedrockInputs(
    **{
        "conversation_memory": DynamoDBChatMemory(
            DynamoDBChatMessageHistory(
                table_name="fake-table", user_id="fake-user-id", conversation_id="fake-conversation-id"
            )
        ),
        "knowledge_base": None,
        "model": "google/flan-t5-xxl",
        "model_params": {
            "topP": {"Type": "float", "Value": "0.2"},
            "maxTokenCount": {"Type": "integer", "Value": "100"},
        },
        "prompt_template": BEDROCK_PROMPT,
        "prompt_placeholders": DEFAULT_PROMPT_PLACEHOLDERS,
        "rephrase_question": DEFAULT_REPHRASE_RAG_QUESTION,
        "disambiguation_prompt_template": None,
        "disambiguation_prompt_enabled": None,
        "streaming": False,
        "verbose": False,
        "temperature": 0.45,
        "callbacks": None,
    }
)


@pytest.fixture
def chat(use_case, model_id, prompt, is_streaming, setup_environment, rag_enabled, bedrock_dynamodb_defaults_table):
    llm_params.knowledge_base = None
    llm_params.disambiguation_prompt_template = None
    llm_params.disambiguation_prompt_enabled = None
    chat = BedrockLLM(
        llm_params=llm_params,
        model_defaults=ModelDefaults(provider_name, model_id, rag_enabled),
        model_family=BedrockModelProviders.AMAZON.value,
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
    bedrock_dynamodb_defaults_table,
    disambiguation_prompt,
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
    llm_params.disambiguation_prompt_template = disambiguation_prompt
    llm_params.disambiguation_prompt_enabled = True
    chat = BedrockRetrievalLLM(
        llm_params=llm_params,
        model_defaults=ModelDefaults(provider_name, model_id, rag_enabled),
        model_family=BedrockModelProviders.AMAZON,
        return_source_docs=return_source_docs,
    )
    yield chat


@pytest.mark.parametrize(
    "use_case, model_id, prompt, is_streaming, rag_enabled, return_source_docs, test_prompt, placeholders, expected_response, chat_fixture, disambiguation_prompt",
    [
        (
            CHAT_IDENTIFIER,
            model_id,
            BEDROCK_PROMPT,
            False,
            False,
            False,
            "{history} {input}",
            DEFAULT_PROMPT_PLACEHOLDERS,
            "{history} {input}",
            "chat",
            None,
        ),
        (
            RAG_CHAT_IDENTIFIER,
            model_id,
            BEDROCK_RAG_PROMPT,
            False,
            True,
            False,
            "{history} {context} {input}",
            DEFAULT_PROMPT_RAG_PLACEHOLDERS,
            "{chat_history} {context} {question}",
            "rag_chat",
            DISAMBIGUATION_PROMPT,
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
    bedrock_dynamodb_defaults_table,
    request,
    chat_fixture,
    disambiguation_prompt,
):
    chat = request.getfixturevalue(chat_fixture)
    default_prompt = BEDROCK_RAG_PROMPT if rag_enabled else BEDROCK_PROMPT
    default_placeholders = DEFAULT_PROMPT_RAG_PLACEHOLDERS if rag_enabled else DEFAULT_PROMPT_PLACEHOLDERS

    assert chat.get_validated_prompt(test_prompt, placeholders, default_prompt, default_placeholders) == (
        PromptTemplate(template=expected_response, input_variables=placeholders),
        placeholders,
    )


@pytest.mark.parametrize(
    "use_case, model_id, test_prompt, expected_response, placeholders, prompt, is_streaming, return_source_docs, rag_enabled, chat_fixture, disambiguation_prompt",
    [
        (
            # correct prompt
            CHAT_IDENTIFIER,
            model_id,
            "{history} {input}",
            "{history} {input}",
            DEFAULT_PROMPT_PLACEHOLDERS,
            BEDROCK_PROMPT,
            False,
            False,
            False,
            "chat",
            None,
        ),
        (
            # rag_enabled false, but passed {context} raises ValueError, defaulting to base prompt
            CHAT_IDENTIFIER,
            model_id,
            "{history} {context} {input}",
            BEDROCK_PROMPT,
            DEFAULT_PROMPT_PLACEHOLDERS,
            BEDROCK_PROMPT,
            False,
            False,
            False,
            "chat",
            None,
        ),
        (
            # Passed incorrect tag `question`, defaulting to base prompt
            CHAT_IDENTIFIER,
            model_id,
            "{history} {question}",
            BEDROCK_PROMPT,
            DEFAULT_PROMPT_PLACEHOLDERS,
            BEDROCK_PROMPT,
            False,
            False,
            False,
            "chat",
            None,
        ),
        (
            # Passed repeated tags `input`, raises ValueError, defaulting to base prompt
            CHAT_IDENTIFIER,
            model_id,
            "{history} {input} {input}",
            BEDROCK_PROMPT,
            DEFAULT_PROMPT_PLACEHOLDERS,
            BEDROCK_PROMPT,
            False,
            False,
            False,
            "chat",
            None,
        ),
        (
            # invalid tag
            CHAT_IDENTIFIER,
            model_id,
            "{history} {wrong_tag}",
            BEDROCK_PROMPT,
            DEFAULT_PROMPT_PLACEHOLDERS,
            BEDROCK_PROMPT,
            False,
            False,
            False,
            "chat",
            None,
        ),
        (
            # correct rag prompt
            RAG_CHAT_IDENTIFIER,
            model_id,
            "{chat_history} {context} {question}",
            "{chat_history} {context} {question}",
            DEFAULT_PROMPT_RAG_PLACEHOLDERS,
            BEDROCK_RAG_PROMPT,
            False,
            False,
            True,
            "rag_chat",
            DISAMBIGUATION_PROMPT,
        ),
        (
            # correct rag prompt
            RAG_CHAT_IDENTIFIER,
            model_id,
            "{history} {context} {input}",
            "{chat_history} {context} {question}",
            DEFAULT_PROMPT_RAG_PLACEHOLDERS,
            BEDROCK_RAG_PROMPT,
            False,
            False,
            True,
            "rag_chat",
            DISAMBIGUATION_PROMPT,
        ),
        (
            # Additional tags are not blocked
            RAG_CHAT_IDENTIFIER,
            model_id,
            "{context} {history} {input} {additionaltag}",
            "{context} {chat_history} {question} {additionaltag}",
            DEFAULT_PROMPT_RAG_PLACEHOLDERS,
            BEDROCK_RAG_PROMPT,
            False,
            False,
            True,
            "rag_chat",
            DISAMBIGUATION_PROMPT,
        ),
        (
            # Missing context for rag chat
            RAG_CHAT_IDENTIFIER,
            model_id,
            "{history} {input}",
            BEDROCK_RAG_PROMPT,
            DEFAULT_PROMPT_RAG_PLACEHOLDERS,
            BEDROCK_RAG_PROMPT,
            False,
            False,
            True,
            "rag_chat",
            DISAMBIGUATION_PROMPT,
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
    bedrock_dynamodb_defaults_table,
    request,
    chat_fixture,
    disambiguation_prompt,
):
    chat = request.getfixturevalue(chat_fixture)
    default_prompt = BEDROCK_RAG_PROMPT if rag_enabled else BEDROCK_PROMPT
    default_placeholders = DEFAULT_PROMPT_RAG_PLACEHOLDERS if rag_enabled else DEFAULT_PROMPT_PLACEHOLDERS

    assert chat.get_validated_prompt(test_prompt, placeholders, default_prompt, default_placeholders) == (
        PromptTemplate(template=expected_response, input_variables=placeholders),
        placeholders,
    )


@pytest.mark.parametrize(
    "use_case, model_id, prompt, is_streaming, return_source_docs, rag_enabled, params, expected_response, chat_fixture, disambiguation_prompt",
    [
        (CHAT_IDENTIFIER, model_id, BEDROCK_PROMPT, False, False, False, None, {"temperature": 0.45}, "chat", None),
        (
            RAG_CHAT_IDENTIFIER,
            model_id,
            BEDROCK_RAG_PROMPT,
            False,
            False,
            True,
            {
                "topP": {"Type": "float", "Value": "0.2"},
                "maxTokenCount": {"Type": "integer", "Value": "100"},
            },
            {"maxTokenCount": 100, "topP": 0.2, "temperature": 0.45},
            "rag_chat",
            DISAMBIGUATION_PROMPT,
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
):
    chat = request.getfixturevalue(chat_fixture)
    assert chat.get_clean_model_params(params) == expected_response


@pytest.mark.parametrize(
    "use_case, model_id, prompt, is_streaming, return_source_docs, rag_enabled, test_prompt_placeholders, test_prompt, expected_prompt",
    [
        (
            # incorrect prompt with repeated occurrences leads to default prompt being used
            CHAT_IDENTIFIER,
            model_id,
            BEDROCK_PROMPT,
            False,
            False,
            False,
            DEFAULT_PROMPT_PLACEHOLDERS,
            "{input} {input} {history}",
            BEDROCK_PROMPT,
        ),
        (
            # incorrect prompt with repeated occurrences leads to default prompt being used
            RAG_CHAT_IDENTIFIER,
            model_id,
            BEDROCK_RAG_PROMPT,
            False,
            False,
            True,
            DEFAULT_PROMPT_RAG_PLACEHOLDERS,
            "{question} {question} {context} {chat_history}",
            BEDROCK_RAG_PROMPT,
        ),
    ],
)
def test_exceptional_prompt_validations(
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
    test_prompt_placeholders,
):
    llm_params = BedrockInputs(
        **{
            "conversation_memory": DynamoDBChatMemory(
                DynamoDBChatMessageHistory(
                    table_name="fake-table", user_id="fake-user-id", conversation_id="fake-conversation-id"
                )
            ),
            "knowledge_base": None,
            "model": "amazon.fake-model",
            "model_params": {
                "topP": {"Type": "float", "Value": "0.2"},
                "maxTokenCount": {"Type": "integer", "Value": "100"},
            },
            "prompt_template": test_prompt,
            "prompt_placeholders": test_prompt_placeholders,
            "rephrase_question": DEFAULT_REPHRASE_RAG_QUESTION,
            "disambiguation_prompt_template": None,
            "disambiguation_prompt_enabled": None,
            "streaming": False,
            "verbose": False,
            "temperature": 0.45,
            "callbacks": None,
        }
    )

    if rag_enabled:
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
        llm_params.disambiguation_prompt_template = DISAMBIGUATION_PROMPT
        chat = BedrockRetrievalLLM(
            llm_params=llm_params,
            model_defaults=ModelDefaults(provider_name, model_id, rag_enabled),
            model_family=BedrockModelProviders.AMAZON,
            return_source_docs=return_source_docs,
        )
        assert chat.disambiguation_prompt_template.template == TAGS_REPLACED_DISAMBIGUATION_PROMPT

    else:
        llm_params.knowledge_base = None
        llm_params.disambiguation_prompt_template = None
        chat = BedrockLLM(
            llm_params=llm_params,
            model_defaults=ModelDefaults(provider_name, model_id, rag_enabled),
            model_family=BedrockModelProviders.AMAZON.value,
            rag_enabled=rag_enabled,
        )

    assert chat.prompt_template.template == expected_prompt
