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
from llms.models.bedrock_params.amazon import BedrockAmazonLLMParams
from shared.defaults.model_defaults import ModelDefaults
from utils.constants import CHAT_IDENTIFIER

BEDROCK_PROMPT = """\n\n{history}\n\n{input}"""
DEFAULT_TEMPERATURE = 0.5  # as set in conftest bedrock_dynamodb_defaults_table fixture for the supplied model id
RAG_ENABLED = False

model_id = "amazon.model-x"


@pytest.mark.parametrize(
    "use_case, prompt, is_streaming, model_id, params, expected_response",
    [
        (
            CHAT_IDENTIFIER,  # required for model_defaults fixture bedrock_dynamodb_defaults_table
            BEDROCK_PROMPT,
            False,
            model_id,
            {"maxTokenCount": 512, "topP": 0.2, "stopSequences": "", "temperature": 0.2},
            {"maxTokenCount": 512, "topP": 0.2, "stopSequences": [], "temperature": 0.2},
        ),
        (
            CHAT_IDENTIFIER,
            BEDROCK_PROMPT,
            False,
            model_id,
            {"maxTokenCount": 512, "topP": 0.2, "stopSequences": ["human:", "ai:"], "temperature": 0.2},
            {"maxTokenCount": 512, "topP": 0.2, "stopSequences": ["ai:", "human:"], "temperature": 0.2},
        ),
        (
            CHAT_IDENTIFIER,
            BEDROCK_PROMPT,
            False,
            model_id,
            {"maxTokenCount": 512, "topP": 0.2, "stopSequences": ""},
            {
                "maxTokenCount": 512,
                "topP": 0.2,
                "stopSequences": [],
                "temperature": DEFAULT_TEMPERATURE,
            },
        ),
        (
            CHAT_IDENTIFIER,
            BEDROCK_PROMPT,
            False,
            model_id,
            {},
            {
                "temperature": DEFAULT_TEMPERATURE,
                "stopSequences": [],
            },
        ),
    ],
)
def test_ai21_params_dataclass_success(
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
    bedrock_params = BedrockAmazonLLMParams(**params, model_defaults=model_defaults)
    assert bedrock_params.temperature == expected_response["temperature"]
    assert bedrock_params.maxTokenCount is expected_response.get("maxTokenCount")
    assert bedrock_params.topP == expected_response.get("topP")
    assert sorted(bedrock_params.stopSequences) == expected_response.get("stopSequences", [])


@pytest.mark.parametrize(
    "use_case, prompt, is_streaming, pop_null, model_id, params, expected_response",
    [
        (
            CHAT_IDENTIFIER,  # required for model_defaults fixture bedrock_dynamodb_defaults_table
            BEDROCK_PROMPT,
            False,
            True,
            model_id,
            {"topP": 0.2},
            {"topP": 0.2, "temperature": DEFAULT_TEMPERATURE},
        ),
        (
            CHAT_IDENTIFIER,
            BEDROCK_PROMPT,
            False,
            True,
            model_id,
            {},
            {"temperature": DEFAULT_TEMPERATURE},
        ),
        (
            CHAT_IDENTIFIER,
            BEDROCK_PROMPT,
            False,
            False,
            model_id,
            {},
            {"maxTokenCount": None, "topP": None, "temperature": DEFAULT_TEMPERATURE, "stopSequences": []},
        ),
        (
            CHAT_IDENTIFIER,
            BEDROCK_PROMPT,
            False,
            False,
            model_id,
            {"topP": 0.2},
            {"maxTokenCount": None, "topP": 0.2, "temperature": DEFAULT_TEMPERATURE, "stopSequences": []},
        ),
    ],
)
def test_ai21_get_params_as_dict(
    use_case,
    prompt,
    is_streaming,
    setup_environment,
    pop_null,
    params,
    model_id,
    expected_response,
    bedrock_dynamodb_defaults_table,
):
    model_defaults = ModelDefaults("Bedrock", model_id, RAG_ENABLED)
    bedrock_params = BedrockAmazonLLMParams(**params, model_defaults=model_defaults)
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
