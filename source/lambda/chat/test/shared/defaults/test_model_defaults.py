#!/usr/bin/env python
# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

import pytest
from shared.defaults.model_defaults import ModelDefaults
from utils.constants import CHAT_IDENTIFIER, RAG_CHAT_IDENTIFIER
from utils.enum_types import LLMProviderTypes

PROMPT = """\n\n{history}\n\n{input}"""
RAG_PROMPT = """{context}\n\n{history}\n\n{input}"""
MEMORY_CONFIG = {
    CHAT_IDENTIFIER: {
        "history": "history",
        "input": "input",
        "context": None,
        "ai_prefix": "Bot",
        "human_prefix": "User",
        "output": "answer",
    },
    RAG_CHAT_IDENTIFIER: {
        "history": "history",
        "input": "input",
        "context": "context",
        "ai_prefix": "Bot",
        "human_prefix": "User",
        "output": "answer",
    },
}
DEFAULT_BEDROCK_ANTHROPIC_DISAMBIGUATION_PROMPT = """Given the following conversation and a follow up question, rephrase the follow up question to be a standalone question, in its original language.\n\nChat History:\n{history}\nFollow Up Input: {input}\nStandalone question:"""


@pytest.mark.parametrize(
    "use_case, model_id, model_provider, prompt, disambiguation_prompt, is_streaming, rag_enabled, default_temperature, min_temperature, max_temperature, chat_message_size, max_prompt_size, stop_sequences, display_name, description",
    [
        (
            CHAT_IDENTIFIER,
            "claude-1",
            LLMProviderTypes.BEDROCK,
            PROMPT,
            DEFAULT_BEDROCK_ANTHROPIC_DISAMBIGUATION_PROMPT,
            False,
            False,
            0.5,
            0,
            1,
            2500,
            2000,
            [],
            "Claude 1",
            "Anthropic Claude 1 model",
        ),
        (
            RAG_CHAT_IDENTIFIER,
            "claude-1",
            LLMProviderTypes.BEDROCK,
            RAG_PROMPT,
            DEFAULT_BEDROCK_ANTHROPIC_DISAMBIGUATION_PROMPT,
            False,
            True,
            0.5,
            0,
            1,
            2500,
            2000,
            [],
            "Claude 1",
            "Anthropic Claude 1 model",
        ),
        (
            CHAT_IDENTIFIER,
            "claude-2",
            LLMProviderTypes.BEDROCK,
            PROMPT,
            DEFAULT_BEDROCK_ANTHROPIC_DISAMBIGUATION_PROMPT,
            True,
            False,
            0.5,
            0,
            1,
            2500,
            2000,
            [],
            "Claude 2",
            "Anthropic Claude 2 model",
        ),
        (
            RAG_CHAT_IDENTIFIER,
            "claude-2",
            LLMProviderTypes.BEDROCK,
            RAG_PROMPT,
            DEFAULT_BEDROCK_ANTHROPIC_DISAMBIGUATION_PROMPT,
            True,
            True,
            0.5,
            0,
            1,
            2500,
            2000,
            [],
            "Claude 2",
            "Anthropic Claude 2 model",
        ),
    ],
)
def test_model_defaults_success(
    use_case,
    model_id,
    prompt,
    disambiguation_prompt,
    is_streaming,
    rag_enabled,
    default_temperature,
    model_provider,
    min_temperature,
    max_temperature,
    chat_message_size,
    max_prompt_size,
    stop_sequences,
    display_name,
    description,
    setup_environment,
    bedrock_dynamodb_defaults_table,
):
    model_defaults = ModelDefaults(model_provider, model_id, rag_enabled)
    assert model_defaults.model_provider == model_provider.value
    assert model_defaults.model_name == model_id
    assert model_defaults.use_case == use_case
    assert model_defaults.allows_streaming == is_streaming
    assert model_defaults.default_temperature == default_temperature
    assert model_defaults.min_temperature == min_temperature
    assert model_defaults.max_temperature == max_temperature
    assert model_defaults.memory_config == MEMORY_CONFIG[use_case]
    assert model_defaults.prompt == prompt
    assert model_defaults.max_chat_message_size == chat_message_size
    assert model_defaults.max_prompt_size == max_prompt_size
    assert model_defaults.stop_sequences == stop_sequences
    assert model_defaults.disambiguation_prompt == disambiguation_prompt
    assert model_defaults.display_name == display_name
    assert model_defaults.description == description


@pytest.mark.parametrize(
    "use_case, model_id, model_provider, prompt,is_streaming, rag_enabled, expected_error_message",
    [
        (
            CHAT_IDENTIFIER,
            "some-new-model",
            "new_provider",
            PROMPT,
            False,
            False,
            f"No records found for UseCase: '{CHAT_IDENTIFIER}' and SortKey: 'new_provider#some-new-model' in the DynamoDB defaults table.",
        ),
        (
            CHAT_IDENTIFIER,
            "",
            "new_provider",
            PROMPT,
            False,
            False,
            "model_provider and model_name cannot be null. Provided values for model_provider: 'new_provider' and model_name: ''",
        ),
    ],
)
def test_model_defaults_failure(
    use_case,
    model_id,
    prompt,
    is_streaming,
    rag_enabled,
    model_provider,
    expected_error_message,
    setup_environment,
    bedrock_dynamodb_defaults_table,
):
    with pytest.raises(ValueError) as error:
        ModelDefaults(model_provider, model_id, rag_enabled)

    assert error.value.args[0] == expected_error_message


@pytest.mark.parametrize(
    "use_case, model_provider, model_id, prompt, disambiguation_prompt, is_streaming, rag_enabled, default_temperature, min_temperature, max_temperature, chat_message_size, max_prompt_size, stop_sequences",
    [
        (
            CHAT_IDENTIFIER,
            LLMProviderTypes.BEDROCK,
            "claude-1",
            "",
            DEFAULT_BEDROCK_ANTHROPIC_DISAMBIGUATION_PROMPT,
            False,
            False,
            0.5,
            0,
            1,
            2500,
            2000,
            [],
        )
    ],
)
def test_model_defaults_missing_values(
    use_case,
    model_id,
    prompt,
    disambiguation_prompt,
    is_streaming,
    rag_enabled,
    default_temperature,
    model_provider,
    min_temperature,
    max_temperature,
    chat_message_size,
    max_prompt_size,
    stop_sequences,
    setup_environment,
    bedrock_dynamodb_defaults_table,
):
    with pytest.raises(ValueError) as error:
        ModelDefaults(model_provider, model_id, rag_enabled)

    assert (
        error.value.args[0]
        == f"DynamoDB defaults missing for UseCase: '{CHAT_IDENTIFIER}' and SortKey: 'Bedrock#claude-1'"
    )
