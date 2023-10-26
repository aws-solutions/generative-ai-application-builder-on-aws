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
from llm_models.factories.bedrock_adapter_factory import BedrockAdapterFactory
from llm_models.models.bedrock_ai21_params import BedrockAI21LLMParams
from llm_models.models.bedrock_anthropic_params import BedrockAnthropicLLMParams
from llm_models.models.bedrock_titan_params import BedrockTitanLLMParams
from utils.enum_types import BedrockModelProviders


@pytest.mark.parametrize(
    "model_family, expected_adapter",
    [
        (BedrockModelProviders.ANTHROPIC.value, BedrockAnthropicLLMParams),
        (BedrockModelProviders.AMAZON.value, BedrockTitanLLMParams),
        (BedrockModelProviders.AI21.value, BedrockAI21LLMParams),
    ],
)
def test_sanitizer_passes(model_family, expected_adapter):
    bedrock_adapter = BedrockAdapterFactory().get_bedrock_adapter(model_family)
    assert bedrock_adapter == expected_adapter


def test_sanitizer_fails():
    with pytest.raises(ValueError) as error:
        BedrockAdapterFactory().get_bedrock_adapter("Ai21")

    assert error.value.args[0] == "BedrockAdapterFactory: Provided model family is not supported."
