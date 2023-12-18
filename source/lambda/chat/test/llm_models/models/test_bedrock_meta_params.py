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
from llm_models.models.bedrock_meta_params import BedrockMetaLLMParams
from utils.constants import DEFAULT_BEDROCK_TEMPERATURE_MAP
from utils.enum_types import BedrockModelProviders


@pytest.mark.parametrize(
    "params, expected_response",
    [
        (
            {"max_gen_len": 512, "top_p": 0.2, "temperature": 0.2},
            {
                "max_gen_len": 512,
                "top_p": 0.2,
                "temperature": 0.2,
            },
        ),
        (
            {"max_gen_len": 512, "top_p": 0.2},
            {
                "max_gen_len": 512,
                "top_p": 0.2,
                "temperature": DEFAULT_BEDROCK_TEMPERATURE_MAP[BedrockModelProviders.META.value],
            },
        ),
        (
            {},
            {
                "temperature": DEFAULT_BEDROCK_TEMPERATURE_MAP[BedrockModelProviders.META.value],
            },
        ),
    ],
)
def test_meta_params_dataclass_success(params, expected_response):
    bedrock_params = BedrockMetaLLMParams(**params)
    assert bedrock_params.temperature == expected_response["temperature"]
    assert bedrock_params.max_gen_len == expected_response.get("max_gen_len")
    assert bedrock_params.top_p == expected_response.get("top_p")


@pytest.mark.parametrize(
    "pop_null, params, expected_response",
    [
        (
            True,
            {"top_p": 0.2},
            {
                "top_p": 0.2,
                "temperature": DEFAULT_BEDROCK_TEMPERATURE_MAP[BedrockModelProviders.META.value],
            },
        ),
        (
            True,
            {},
            {
                "temperature": DEFAULT_BEDROCK_TEMPERATURE_MAP[BedrockModelProviders.META.value],
            },
        ),
        (
            False,
            {},
            {
                "max_gen_len": None,
                "top_p": None,
                "temperature": DEFAULT_BEDROCK_TEMPERATURE_MAP[BedrockModelProviders.META.value],
            },
        ),
        (
            False,
            {"top_p": 0.2},
            {
                "max_gen_len": None,
                "top_p": 0.2,
                "temperature": DEFAULT_BEDROCK_TEMPERATURE_MAP[BedrockModelProviders.META.value],
            },
        ),
    ],
)
def test_meta_get_params_as_dict(pop_null, params, expected_response):
    bedrock_params = BedrockMetaLLMParams(**params)
    assert bedrock_params.get_params_as_dict(pop_null=pop_null) == expected_response


def test_meta_incorrect_params():
    with pytest.raises(TypeError) as error:
        BedrockMetaLLMParams(
            **{
                "max_gen_len": 512,
                "top_p": 0.2,
                "temperature": 0.2,
                "incorrect_param": 0.1,
            }
        )

    assert error.value.args[0] == "BedrockMetaLLMParams.__init__() got an unexpected keyword argument 'incorrect_param'"
