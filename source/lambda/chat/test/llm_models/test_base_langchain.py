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
from llm_models.huggingface import HuggingFaceLLM
from shared.knowledge.kendra_knowledge_base import KendraKnowledgeBase
from shared.memory.ddb_chat_memory import DynamoDBChatMemory
from shared.memory.ddb_enhanced_message_history import DynamoDBChatMessageHistory
from utils.constants import (
    DEFAULT_HUGGINGFACE_MODEL,
    DEFAULT_HUGGINGFACE_PLACEHOLDERS,
    DEFAULT_HUGGINGFACE_PROMPT,
    DEFAULT_HUGGINGFACE_RAG_PLACEHOLDERS,
    DEFAULT_HUGGINGFACE_RAG_PROMPT,
    DEFAULT_HUGGINGFACE_TEMPERATURE,
)


@pytest.fixture(autouse=True)
def chat(setup_environment):
    chat = HuggingFaceLLM(
        api_token="fake-token",
        conversation_memory=DynamoDBChatMemory(
            DynamoDBChatMessageHistory("fake-table", "fake-conversation-id", "fake-user-id")
        ),
        knowledge_base=KendraKnowledgeBase(),
        model=DEFAULT_HUGGINGFACE_MODEL,
        inference_endpoint=None,
        model_params={"max_length": {"Type": "integer", "Value": "100"}},
        prompt_template=DEFAULT_HUGGINGFACE_PROMPT,
        streaming=False,
        verbose=False,
        temperature=DEFAULT_HUGGINGFACE_TEMPERATURE,
        rag_enabled=False,
    )
    yield chat


def test_validate_not_null(chat):
    chat.validate_not_null(model=DEFAULT_HUGGINGFACE_MODEL)
    try:
        chat.validate_not_null(model=None)
    except ValueError as ve:
        assert (
            str(ve)
            == "There are errors in the parameters provided: required HuggingFace LLM parameter model cannot be null or empty."
        )


@pytest.mark.parametrize(
    "rag_enabled, test_prompt, default_prompt, default_placeholders",
    [
        (False, "", DEFAULT_HUGGINGFACE_PROMPT, DEFAULT_HUGGINGFACE_PLACEHOLDERS),
        (True, "", DEFAULT_HUGGINGFACE_PROMPT, DEFAULT_HUGGINGFACE_PLACEHOLDERS),
    ],
)
def test_empty_prompts(chat, test_prompt, default_prompt, default_placeholders, rag_enabled):
    # Empty prompt gets assigned default prompt
    chat.rag_enabled = rag_enabled
    chat.get_prompt_details(test_prompt, default_prompt, default_placeholders) == default_prompt


@pytest.mark.parametrize(
    "rag_enabled, test_prompt, default_prompt, default_placeholders, expected_response",
    [
        (
            False,
            "{history} {input}",
            DEFAULT_HUGGINGFACE_PROMPT,
            DEFAULT_HUGGINGFACE_PLACEHOLDERS,
            "{history} {input}",
        ),
        (
            True,
            "{history} {context} {input}",
            DEFAULT_HUGGINGFACE_RAG_PROMPT,
            DEFAULT_HUGGINGFACE_RAG_PLACEHOLDERS,
            "{chat_history} {context} {question}",
        ),
    ],
)
def test_placeholder_replacements(
    chat, test_prompt, default_prompt, default_placeholders, rag_enabled, expected_response
):
    chat.rag_enabled = rag_enabled
    chat.get_prompt_details(test_prompt, default_prompt, default_placeholders) == expected_response


def test_incorrect_placeholder_non_rag(chat):
    chat.rag_enabled = False
    chat.get_prompt_details(
        "{history} {context} {input}", DEFAULT_HUGGINGFACE_PROMPT, DEFAULT_HUGGINGFACE_PLACEHOLDERS
    ) == DEFAULT_HUGGINGFACE_PROMPT


@pytest.mark.parametrize(
    "rag_enabled, test_prompt, default_prompt, default_placeholders, expected_response",
    [
        (
            False,
            "{history} {input} {input}",
            DEFAULT_HUGGINGFACE_PROMPT,
            DEFAULT_HUGGINGFACE_PLACEHOLDERS,
            DEFAULT_HUGGINGFACE_PROMPT,
        ),
        (
            True,
            "{history} {context} {input} {context}",
            DEFAULT_HUGGINGFACE_RAG_PROMPT,
            DEFAULT_HUGGINGFACE_RAG_PLACEHOLDERS,
            DEFAULT_HUGGINGFACE_RAG_PROMPT,
        ),
    ],
)
def test_prompt_validation_fails(
    chat, test_prompt, default_prompt, default_placeholders, rag_enabled, expected_response
):
    chat.rag_enabled = rag_enabled
    chat.get_prompt_details(test_prompt, default_prompt, default_placeholders) == expected_response
