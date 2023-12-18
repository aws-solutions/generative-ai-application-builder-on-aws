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
from llm_models.models.bedrock_ai21_params import BedrockAI21LLMParams
from utils.constants import DEFAULT_BEDROCK_TEMPERATURE_MAP
from utils.enum_types import BedrockModelProviders


@pytest.mark.parametrize(
    "params, expected_response",
    [
        (
            {
                "maxTokens": 512,
                "temperature": 0.9,
                "presencePenalty": {"scale": 0},
                "countPenalty": {"scale": 0},
                "frequencyPenalty": {"scale": 0},
            },
            {
                "maxTokens": 512,
                "temperature": 0.9,
                "stopSequences": [],
                "presencePenalty": {"scale": 0},
                "countPenalty": {"scale": 0},
                "frequencyPenalty": {"scale": 0},
            },
        ),
        (
            {
                "maxTokens": 512,
                "topP": 0.2,
                "countPenalty": {"scale": 0},
                "presencePenalty": {"scale": 0},
                "frequencyPenalty": {"scale": 0},
                "stopSequences": ["human:", "ai:"],
                "temperature": 0.2,
            },
            {
                "maxTokens": 512,
                "topP": 0.2,
                "countPenalty": {"scale": 0},
                "presencePenalty": {"scale": 0},
                "frequencyPenalty": {"scale": 0},
                "stopSequences": ["ai:", "human:"],
                "temperature": 0.2,
            },
        ),
        (
            {},
            {"temperature": DEFAULT_BEDROCK_TEMPERATURE_MAP[BedrockModelProviders.AI21.value], "stopSequences": []},
        ),
    ],
)
def test_ai21_params_dataclass_success(params, expected_response):
    bedrock_params = BedrockAI21LLMParams(**params)
    assert bedrock_params.temperature == expected_response["temperature"]
    assert bedrock_params.maxTokens == expected_response.get("maxTokens")
    assert sorted(bedrock_params.stopSequences) == expected_response.get("stopSequences")
    assert bedrock_params.presencePenalty == expected_response.get("presencePenalty")
    assert bedrock_params.countPenalty == expected_response.get("countPenalty")
    assert bedrock_params.frequencyPenalty == expected_response.get("frequencyPenalty")


@pytest.mark.parametrize(
    "pop_null, params, expected_response",
    [
        (
            True,
            {"topP": 0.2},
            {
                "topP": 0.2,
                "temperature": DEFAULT_BEDROCK_TEMPERATURE_MAP[BedrockModelProviders.AI21.value],
            },
        ),
        (
            True,
            {},
            {
                "temperature": DEFAULT_BEDROCK_TEMPERATURE_MAP[BedrockModelProviders.AI21.value],
            },
        ),
        (
            False,
            {},
            {
                "maxTokens": None,
                "topP": None,
                "countPenalty": None,
                "presencePenalty": None,
                "frequencyPenalty": None,
                "stopSequences": [],
                "temperature": DEFAULT_BEDROCK_TEMPERATURE_MAP[BedrockModelProviders.AI21.value],
            },
        ),
        (
            False,
            {"topP": 0.2},
            {
                "maxTokens": None,
                "topP": 0.2,
                "countPenalty": None,
                "presencePenalty": None,
                "frequencyPenalty": None,
                "stopSequences": [],
                "temperature": DEFAULT_BEDROCK_TEMPERATURE_MAP[BedrockModelProviders.AI21.value],
            },
        ),
    ],
)
def test_ai21_get_params_as_dict(pop_null, params, expected_response):
    bedrock_params = BedrockAI21LLMParams(**params)
    assert bedrock_params.get_params_as_dict(pop_null=pop_null) == expected_response


def test_ai21_incorrect_params():
    with pytest.raises(TypeError) as error:
        BedrockAI21LLMParams(
            **{
                "maxTokens": 512,
                "temperature": 0.9,
                "presencePenalty": {"scale": 0},
                "countPenalty": {"scale": 0},
                "frequencyPenalty": {"scale": 0},
                "incorrect_param": 0.1,
            }
        )

    assert error.value.args[0] == "BedrockAI21LLMParams.__init__() got an unexpected keyword argument 'incorrect_param'"
