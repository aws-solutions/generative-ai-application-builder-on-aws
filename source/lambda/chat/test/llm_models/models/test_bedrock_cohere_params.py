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
from llm_models.models.bedrock_cohere_params import BedrockCohereLLMParams
from utils.constants import DEFAULT_BEDROCK_TEMPERATURE_MAP
from utils.enum_types import BedrockModelProviders


@pytest.mark.parametrize(
    "params, expected_response",
    [
        (
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
                "temperature": DEFAULT_BEDROCK_TEMPERATURE_MAP[BedrockModelProviders.COHERE.value],
            },
        ),
        (
            {},  # no params
            {
                "temperature": DEFAULT_BEDROCK_TEMPERATURE_MAP[BedrockModelProviders.COHERE.value],
            },
        ),
    ],
)
def test_cohere_params_dataclass_success(params, expected_response):
    bedrock_params = BedrockCohereLLMParams(**params)
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
    "pop_null, params, expected_response",
    [
        (
            True,
            {"p": 0.2, "k": 250, "max_tokens": 300},
            {
                "p": 0.2,
                "k": 250,
                "max_tokens": 300,
                "temperature": DEFAULT_BEDROCK_TEMPERATURE_MAP[BedrockModelProviders.COHERE.value],
            },
        ),
        (
            True,
            {},
            {
                "temperature": DEFAULT_BEDROCK_TEMPERATURE_MAP[BedrockModelProviders.COHERE.value],
            },
        ),
        (
            False,
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
                "temperature": DEFAULT_BEDROCK_TEMPERATURE_MAP[BedrockModelProviders.COHERE.value],
            },
        ),
        (
            False,
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
                "temperature": DEFAULT_BEDROCK_TEMPERATURE_MAP[BedrockModelProviders.COHERE.value],
            },
        ),
    ],
)
def test_cohere_get_params_as_dict(pop_null, params, expected_response):
    bedrock_params = BedrockCohereLLMParams(**params)
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
