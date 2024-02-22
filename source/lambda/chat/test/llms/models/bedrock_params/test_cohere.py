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
from llms.models.bedrock_params.cohere import BedrockCohereLLMParams
from shared.defaults.model_defaults import ModelDefaults
from utils.constants import CHAT_IDENTIFIER

BEDROCK_PROMPT = """\n\n{history}\n\n{input}"""
DEFAULT_TEMPERATURE = 0.5  # as set in conftest bedrock_dynamodb_defaults_table fixture for the supplied model id
RAG_ENABLED = False

model_id = "cohere.model-x"


@pytest.mark.parametrize(
    "use_case, prompt, is_streaming, model_id, params, expected_response",
    [
        (
            CHAT_IDENTIFIER,  # required for model_defaults fixture bedrock_dynamodb_defaults_table
            BEDROCK_PROMPT,
            False,
            model_id,
            {
                "num_generations": 10,  # all values provided
                "logit_bias": {"token_id": 0.2},
                "stream": True,
                "return_likelihoods": "ALL",
                "p": 0.2,
                "k": 250,
                "max_tokens": 300,
                "truncate": "END",
                "stop_sequences": ["sequence", "some"],
                "temperature": 0.1,
            },
            {
                "num_generations": 10,
                "logit_bias": {"token_id": 0.2},
                "stream": True,
                "return_likelihoods": "ALL",
                "p": 0.2,
                "k": 250,
                "max_tokens": 300,
                "truncate": "END",
                "stop_sequences": ["sequence", "some"],
                "temperature": 0.1,
            },
        ),
        (
            CHAT_IDENTIFIER,  # required for model_defaults fixture bedrock_dynamodb_defaults_table
            BEDROCK_PROMPT,
            False,
            model_id,
            {
                "num_generations": 10,  # missing temperature
                "logit_bias": {"token_id": 0.2},
                "stream": True,
                "return_likelihoods": "ALL",
                "p": 0.2,
                "k": 250,
                "max_tokens": 300,
                "truncate": "END",
            },
            {
                "num_generations": 10,
                "logit_bias": {"token_id": 0.2},
                "stream": True,
                "return_likelihoods": "ALL",
                "p": 0.2,
                "k": 250,
                "max_tokens": 300,
                "truncate": "END",
                "temperature": DEFAULT_TEMPERATURE,
            },
        ),
        (
            CHAT_IDENTIFIER,  # required for model_defaults fixture bedrock_dynamodb_defaults_table
            BEDROCK_PROMPT,
            False,
            model_id,
            {},  # no params
            {
                "temperature": DEFAULT_TEMPERATURE,
            },
        ),
    ],
)
def test_cohere_params_dataclass_success(
    use_case,
    prompt,
    is_streaming,
    setup_environment,
    model_id,
    params,
    expected_response,
    bedrock_dynamodb_defaults_table,
):
    model_defaults = ModelDefaults("Bedrock", model_id, RAG_ENABLED)
    bedrock_params = BedrockCohereLLMParams(**params, model_defaults=model_defaults)
    assert bedrock_params.num_generations == expected_response.get("num_generations")
    assert bedrock_params.logit_bias == expected_response.get("logit_bias")
    assert bedrock_params.stream == expected_response.get("stream")
    assert bedrock_params.return_likelihoods == expected_response.get("return_likelihoods")
    assert bedrock_params.p == expected_response.get("p")
    assert bedrock_params.k == expected_response.get("k")
    assert bedrock_params.max_tokens == expected_response.get("max_tokens")
    assert bedrock_params.truncate == expected_response.get("truncate")
    assert bedrock_params.temperature == expected_response.get("temperature")
    assert sorted(bedrock_params.stop_sequences) == expected_response.get("stop_sequences", [])


@pytest.mark.parametrize(
    "use_case, prompt, is_streaming, pop_null, model_id, params, expected_response",
    [
        (
            CHAT_IDENTIFIER,  # required for model_defaults fixture bedrock_dynamodb_defaults_table
            BEDROCK_PROMPT,
            False,
            True,
            model_id,
            {"p": 0.2, "k": 250, "max_tokens": 300},
            {
                "p": 0.2,
                "k": 250,
                "max_tokens": 300,
                "temperature": DEFAULT_TEMPERATURE,
            },
        ),
        (
            CHAT_IDENTIFIER,  # required for model_defaults fixture bedrock_dynamodb_defaults_table
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
            CHAT_IDENTIFIER,  # required for model_defaults fixture bedrock_dynamodb_defaults_table
            BEDROCK_PROMPT,
            False,
            False,
            model_id,
            {},
            {
                "k": None,
                "logit_bias": None,
                "max_tokens": None,
                "num_generations": None,
                "p": None,
                "return_likelihoods": None,
                "stop_sequences": [],
                "stream": None,
                "temperature": 0.75,
                "truncate": None,
                "temperature": DEFAULT_TEMPERATURE,
            },
        ),
        (
            CHAT_IDENTIFIER,  # required for model_defaults fixture bedrock_dynamodb_defaults_table
            BEDROCK_PROMPT,
            False,
            False,
            model_id,
            {"p": 0.2, "k": 250, "max_tokens": 300},
            {
                "p": 0.2,
                "k": 250,
                "max_tokens": 300,
                "logit_bias": None,
                "num_generations": None,
                "return_likelihoods": None,
                "stop_sequences": [],
                "stream": None,
                "temperature": 0.75,
                "truncate": None,
                "temperature": DEFAULT_TEMPERATURE,
            },
        ),
    ],
)
def test_cohere_get_params_as_dict(
    use_case,
    prompt,
    is_streaming,
    setup_environment,
    pop_null,
    params,
    expected_response,
    model_id,
    bedrock_dynamodb_defaults_table,
):
    model_defaults = ModelDefaults("Bedrock", model_id, RAG_ENABLED)
    bedrock_params = BedrockCohereLLMParams(**params, model_defaults=model_defaults)
    assert bedrock_params.get_params_as_dict(pop_null=pop_null) == expected_response


def test_cohere_incorrect_params():
    with pytest.raises(TypeError) as error:
        BedrockCohereLLMParams(
            **{
                "num_generations": 10,
                "logit_bias": {"token_id": 0.2},
                "stream": True,
                "return_likelihoods": "ALL",
                "p": 0.2,
                "k": 250,
                "max_tokens": 300,
                "truncate": "END",
                "stop_sequences": ["sequence", "some"],
                "incorrect_param": 0.1,
            }
        )

    assert (
        error.value.args[0] == "BedrockCohereLLMParams.__init__() got an unexpected keyword argument 'incorrect_param'"
    )
