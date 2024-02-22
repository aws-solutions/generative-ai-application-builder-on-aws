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
from shared.defaults.model_defaults import ModelDefaults
from utils.constants import CHAT_IDENTIFIER, RAG_CHAT_IDENTIFIER
from utils.enum_types import LLMProviderTypes

ANTHROPIC_PROMPT = """\n\n{history}\n\n{input}"""
ANTHROPIC_RAG_PROMPT = """{context}\n\n{chat_history}\n\n{question}"""
MEMORY_CONFIG = {
    CHAT_IDENTIFIER: {
        "history": "history",
        "input": "input",
        "context": None,
        "ai_prefix": "A",
        "human_prefix": "H",
        "output": None,
    },
    RAG_CHAT_IDENTIFIER: {
        "history": "chat_history",
        "input": "question",
        "context": "context",
        "ai_prefix": "A",
        "human_prefix": "H",
        "output": "answer",
    },
}
DEFAULT_BEDROCK_ANTHROPIC_CONDENSING_PROMPT = """\n\nHuman: Given the following conversation and a follow up question, rephrase the follow up question to be a standalone question.\n\nChat history:\n{chat_history}\n\nFollow up question: {question}\n\nAssistant: Standalone question:"""


@pytest.mark.parametrize(
    "use_case, model_id, model_provider, prompt, disambiguation_prompt, is_streaming, rag_enabled, default_temperature, min_temperature, max_temperature, chat_message_size, max_prompt_size, stop_sequences",
    [
        (
            CHAT_IDENTIFIER,
            "claude-1",
            LLMProviderTypes.ANTHROPIC,
            ANTHROPIC_PROMPT,
            DEFAULT_BEDROCK_ANTHROPIC_CONDENSING_PROMPT,
            False,
            False,
            0.5,
            0,
            1,
            2500,
            2000,
            [],
        ),
        (
            RAG_CHAT_IDENTIFIER,
            "claude-1",
            LLMProviderTypes.ANTHROPIC,
            ANTHROPIC_RAG_PROMPT,
            DEFAULT_BEDROCK_ANTHROPIC_CONDENSING_PROMPT,
            False,
            True,
            0.5,
            0,
            1,
            2500,
            2000,
            [],
        ),
        (
            CHAT_IDENTIFIER,
            "claude-2",
            LLMProviderTypes.ANTHROPIC,
            ANTHROPIC_PROMPT,
            DEFAULT_BEDROCK_ANTHROPIC_CONDENSING_PROMPT,
            True,
            False,
            0.5,
            0,
            1,
            2500,
            2000,
            [],
        ),
        (
            RAG_CHAT_IDENTIFIER,
            "claude-2",
            LLMProviderTypes.ANTHROPIC,
            ANTHROPIC_RAG_PROMPT,
            DEFAULT_BEDROCK_ANTHROPIC_CONDENSING_PROMPT,
            True,
            True,
            0.5,
            0,
            1,
            2500,
            2000,
            [],
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
    setup_environment,
    anthropic_dynamodb_defaults_table,
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


@pytest.mark.parametrize(
    "use_case, model_id, model_provider, prompt,is_streaming, rag_enabled, expected_error_message",
    [
        (
            CHAT_IDENTIFIER,
            "some-new-model",
            "new_provider",
            ANTHROPIC_PROMPT,
            False,
            False,
            f"No records found for UseCase: '{CHAT_IDENTIFIER}' and SortKey: 'new_provider#some-new-model' in the DynamoDB defaults table.",
        ),
        (
            CHAT_IDENTIFIER,
            "",
            "new_provider",
            ANTHROPIC_PROMPT,
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
    anthropic_dynamodb_defaults_table,
):
    with pytest.raises(ValueError) as error:
        ModelDefaults(model_provider, model_id, rag_enabled)

    assert error.value.args[0] == expected_error_message


@pytest.mark.parametrize(
    "use_case, model_provider, model_id, prompt, disambiguation_prompt, is_streaming, rag_enabled, default_temperature, min_temperature, max_temperature, chat_message_size, max_prompt_size, stop_sequences",
    [
        (
            CHAT_IDENTIFIER,
            LLMProviderTypes.ANTHROPIC,
            "claude-1",
            "",
            DEFAULT_BEDROCK_ANTHROPIC_CONDENSING_PROMPT,
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
    anthropic_dynamodb_defaults_table,
):
    with pytest.raises(ValueError) as error:
        ModelDefaults(model_provider, model_id, rag_enabled)

    assert (
        error.value.args[0]
        == f"DynamoDB defaults missing for UseCase: '{CHAT_IDENTIFIER}' and SortKey: 'Anthropic#claude-1'"
    )
