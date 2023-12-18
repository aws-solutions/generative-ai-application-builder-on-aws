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
from llm_models.models.bedrock_amazon_params import BedrockAmazonLLMParams
from utils.constants import DEFAULT_BEDROCK_TEMPERATURE_MAP
from utils.enum_types import BedrockModelProviders


@pytest.mark.parametrize(
    "params, expected_response",
    [
        (
            {"maxTokenCount": 512, "topP": 0.2, "temperature": 0.2},
            {"maxTokenCount": 512, "topP": 0.2, "stopSequences": ["|"], "temperature": 0.2},
        ),
        (
            {"maxTokenCount": 512, "topP": 0.2, "stopSequences": ["human:", "ai:"], "temperature": 0.2},
            {"maxTokenCount": 512, "topP": 0.2, "stopSequences": ["ai:", "human:", "|"], "temperature": 0.2},
        ),
        (
            {"maxTokenCount": 512, "topP": 0.2},
            {
                "maxTokenCount": 512,
                "topP": 0.2,
                "stopSequences": ["|"],
                "temperature": DEFAULT_BEDROCK_TEMPERATURE_MAP[BedrockModelProviders.AMAZON.value],
            },
        ),
        (
            {},
            {
                "temperature": DEFAULT_BEDROCK_TEMPERATURE_MAP[BedrockModelProviders.AMAZON.value],
                "stopSequences": ["|"],
            },
        ),
    ],
)
def test_amazon_params_dataclass_success(params, expected_response):
    bedrock_params = BedrockAmazonLLMParams(**params)
    assert bedrock_params.temperature == expected_response["temperature"]
    assert bedrock_params.maxTokenCount is expected_response.get("maxTokenCount")
    assert bedrock_params.topP == expected_response.get("topP")
    assert sorted(bedrock_params.stopSequences) == expected_response.get("stopSequences", [])


@pytest.mark.parametrize(
    "pop_null, params, expected_response",
    [
        (
            True,
            {"topP": 0.2},
            {
                "topP": 0.2,
                "temperature": DEFAULT_BEDROCK_TEMPERATURE_MAP[BedrockModelProviders.AMAZON.value],
                "stopSequences": ["|"],
            },
        ),
        (
            True,
            {},
            {
                "temperature": DEFAULT_BEDROCK_TEMPERATURE_MAP[BedrockModelProviders.AMAZON.value],
                "stopSequences": ["|"],
            },
        ),
        (
            False,
            {},
            {
                "maxTokenCount": None,
                "topP": None,
                "stopSequences": ["|"],
                "temperature": DEFAULT_BEDROCK_TEMPERATURE_MAP[BedrockModelProviders.AMAZON.value],
            },
        ),
        (
            False,
            {"topP": 0.2},
            {
                "maxTokenCount": None,
                "topP": 0.2,
                "stopSequences": ["|"],
                "temperature": DEFAULT_BEDROCK_TEMPERATURE_MAP[BedrockModelProviders.AMAZON.value],
            },
        ),
    ],
)
def test_amazon_get_params_as_dict(pop_null, params, expected_response):
    bedrock_params = BedrockAmazonLLMParams(**params)
    assert bedrock_params.get_params_as_dict(pop_null=pop_null) == expected_response


def test_amazon_incorrect_params():
    with pytest.raises(TypeError) as error:
        BedrockAmazonLLMParams(
            **{
                "maxTokenCount": 512,
                "topP": 0.2,
                "temperature": 0.2,
                "incorrect_param": 0.1,
            }
        )

    assert (
        error.value.args[0] == "BedrockAmazonLLMParams.__init__() got an unexpected keyword argument 'incorrect_param'"
    )
