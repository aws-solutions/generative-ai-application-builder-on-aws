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
from llms.factories.bedrock_adapter_factory import BedrockAdapterFactory
from llms.models.bedrock_params.ai21 import BedrockAI21LLMParams
from llms.models.bedrock_params.amazon import BedrockAmazonLLMParams
from llms.models.bedrock_params.anthropic import BedrockAnthropicLLMParams
from llms.models.bedrock_params.cohere import BedrockCohereLLMParams
from llms.models.bedrock_params.meta import BedrockMetaLLMParams
from utils.enum_types import BedrockModelProviders


@pytest.mark.parametrize(
    "model_family, expected_adapter",
    [
        (BedrockModelProviders.ANTHROPIC.value, BedrockAnthropicLLMParams),
        (BedrockModelProviders.AMAZON.value, BedrockAmazonLLMParams),
        (BedrockModelProviders.AI21.value, BedrockAI21LLMParams),
        (BedrockModelProviders.COHERE.value, BedrockCohereLLMParams),
        (BedrockModelProviders.META.value, BedrockMetaLLMParams),
    ],
)
def test_sanitizer_passes(model_family, expected_adapter):
    bedrock_adapter = BedrockAdapterFactory().get_bedrock_adapter(model_family)
    assert bedrock_adapter == expected_adapter


def test_sanitizer_fails():
    with pytest.raises(ValueError) as error:
        BedrockAdapterFactory().get_bedrock_adapter("Ai21")

    assert error.value.args[0] == "BedrockAdapterFactory: Provided model family is not supported."
