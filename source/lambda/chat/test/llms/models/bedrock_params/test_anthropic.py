#!/usr/bin/env python
# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

import pytest
from llms.models.bedrock_params.anthropic import BedrockAnthropicV1LLMParams, BedrockAnthropicV3LLMParams
from shared.defaults.model_defaults import ModelDefaults
from utils.constants import CHAT_IDENTIFIER

BEDROCK_PROMPT = """\n\n{history}\n\n{input}"""
DEFAULT_TEMPERATURE = 0.5  # as set in conftest bedrock_dynamodb_defaults_table fixture for the supplied model id
RAG_ENABLED = False

model_id = "anthropic.model-x"


@pytest.mark.parametrize(
    "use_case, prompt, is_streaming, model_id, params, expected_response, params_class",
    [
        (
            CHAT_IDENTIFIER,  # required for model_defaults fixture bedrock_dynamodb_defaults_table
            BEDROCK_PROMPT,
            False,
            model_id,
            {"max_tokens_to_sample": 512, "top_p": 0.2, "top_k": 0.2, "stop_sequences": "", "temperature": 0.2},
            {
                "max_tokens_to_sample": 512,
                "top_p": 0.2,
                "top_k": 0.2,
                "stop_sequences": [],
                "temperature": 0.2,
            },
            BedrockAnthropicV1LLMParams,
        ),
        (
            CHAT_IDENTIFIER,
            BEDROCK_PROMPT,
            False,
            model_id,
            {
                "max_tokens_to_sample": 512,
                "top_p": 0.2,
                "top_k": 0.2,
                "stop_sequences": ["human:", "ai:"],
                "temperature": 0.2,
            },
            {
                "max_tokens_to_sample": 512,
                "top_p": 0.2,
                "top_k": 0.2,
                "stop_sequences": ["ai:", "human:"],
                "temperature": 0.2,
            },
            BedrockAnthropicV1LLMParams,
        ),
        (
            CHAT_IDENTIFIER,
            BEDROCK_PROMPT,
            False,
            model_id,
            {
                "max_tokens_to_sample": 512,
                "top_p": 0.2,
                "top_k": 0.2,
            },
            {
                "max_tokens_to_sample": 512,
                "top_p": 0.2,
                "top_k": 0.2,
                "stop_sequences": [],
                "temperature": DEFAULT_TEMPERATURE,
            },
            BedrockAnthropicV1LLMParams,
        ),
        (
            CHAT_IDENTIFIER,
            BEDROCK_PROMPT,
            False,
            model_id,
            {},
            {
                "temperature": DEFAULT_TEMPERATURE,
            },
            BedrockAnthropicV1LLMParams,
        ),
    ],
)
def test_anthropic_params_dataclass_success(
    use_case,
    prompt,
    is_streaming,
    setup_environment,
    params,
    expected_response,
    model_id,
    params_class,
    bedrock_dynamodb_defaults_table,
):
    model_defaults = ModelDefaults("Bedrock", model_id, RAG_ENABLED)
    bedrock_params = params_class(**params, model_defaults=model_defaults)
    assert bedrock_params.temperature == expected_response["temperature"]
    assert bedrock_params.max_tokens_to_sample is expected_response.get("max_tokens_to_sample")
    assert bedrock_params.top_p == expected_response.get("top_p")
    assert bedrock_params.top_k == expected_response.get("top_k")
    assert bedrock_params.stop_sequences == expected_response.get("stop_sequences", [])


@pytest.mark.parametrize(
    "use_case, prompt, is_streaming, model_id, params, expected_response, params_class",
    [
        (
            CHAT_IDENTIFIER,  # required for model_defaults fixture bedrock_dynamodb_defaults_table
            BEDROCK_PROMPT,
            False,
            model_id,
            {"max_tokens": 512, "top_p": 0.2, "top_k": 0.2, "stop_sequences": "", "temperature": 0.2},
            {
                "max_tokens": 512,
                "top_p": 0.2,
                "top_k": 0.2,
                "stop_sequences": [],
                "temperature": 0.2,
            },
            BedrockAnthropicV3LLMParams,
        )
    ],
)
def test_anthropic_v3_params_dataclass_success(
    use_case,
    prompt,
    is_streaming,
    setup_environment,
    params,
    expected_response,
    model_id,
    params_class,
    bedrock_dynamodb_defaults_table,
):
    model_defaults = ModelDefaults("Bedrock", model_id, RAG_ENABLED)
    bedrock_params = params_class(**params, model_defaults=model_defaults)
    assert bedrock_params.temperature == expected_response["temperature"]
    assert bedrock_params.max_tokens is expected_response.get("max_tokens")
    assert bedrock_params.top_p == expected_response.get("top_p")
    assert bedrock_params.top_k == expected_response.get("top_k")
    assert bedrock_params.stop_sequences == expected_response.get("stop_sequences", [])


@pytest.mark.parametrize(
    "use_case, prompt, is_streaming, pop_null, model_id, params, expected_response",
    [
        (
            CHAT_IDENTIFIER,  # required for model_defaults fixture bedrock_dynamodb_defaults_table
            BEDROCK_PROMPT,
            False,
            True,
            model_id,
            {"top_p": 0.2},
            {
                "top_p": 0.2,
                "temperature": DEFAULT_TEMPERATURE,
            },
        ),
        (
            CHAT_IDENTIFIER,
            BEDROCK_PROMPT,
            False,
            True,
            model_id,
            {},
            {
                "temperature": DEFAULT_TEMPERATURE,
            },
        ),
        (
            CHAT_IDENTIFIER,
            BEDROCK_PROMPT,
            False,
            False,
            model_id,
            {},
            {
                "max_tokens_to_sample": None,
                "top_p": None,
                "top_k": None,
                "stop_sequences": [],
                "temperature": DEFAULT_TEMPERATURE,
            },
        ),
        (
            CHAT_IDENTIFIER,
            BEDROCK_PROMPT,
            False,
            False,
            model_id,
            {"top_p": 0.2},
            {
                "max_tokens_to_sample": None,
                "top_p": 0.2,
                "top_k": None,
                "stop_sequences": [],
                "temperature": DEFAULT_TEMPERATURE,
            },
        ),
    ],
)
def test_anthropic_get_params_as_dict(
    use_case,
    prompt,
    is_streaming,
    setup_environment,
    pop_null,
    params,
    expected_response,
    bedrock_dynamodb_defaults_table,
):
    model_defaults = ModelDefaults("Bedrock", model_id, RAG_ENABLED)
    bedrock_params = BedrockAnthropicV1LLMParams(**params, model_defaults=model_defaults)
    assert bedrock_params.get_params_as_dict(pop_null=pop_null) == expected_response


def test_anthropic_incorrect_params():
    with pytest.raises(TypeError) as error:
        BedrockAnthropicV1LLMParams(
            **{
                "max_tokens_to_sample": 512,
                "top_p": 0.2,
                "top_k": 0.2,
                "temperature": 0.2,
                "incorrect_param": 0.1,
            }
        )

    assert (
        error.value.args[0]
        == "BedrockAnthropicV1LLMParams.__init__() got an unexpected keyword argument 'incorrect_param'"
    )
