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

from typing import Dict

from aws_lambda_powertools import Logger
from llms.models.bedrock_params.ai21 import BedrockAI21LLMParams
from llms.models.bedrock_params.amazon import BedrockAmazonLLMParams
from llms.models.bedrock_params.anthropic import BedrockAnthropicLLMParams
from llms.models.bedrock_params.cohere import BedrockCohereLLMParams
from llms.models.bedrock_params.llm import BedrockLLMParams
from llms.models.bedrock_params.meta import BedrockMetaLLMParams
from utils.enum_types import BedrockModelProviders

logger = Logger(utc=True)


class BedrockAdapterFactory:
    """
    A factory class for creating BedrockParams objects based on the model family.
    Each sanitize method returns a BedrockParams object for that model family based on the parameters that model family accepts
    """

    def __init__(self):
        self._model_map = {
            BedrockModelProviders.ANTHROPIC.value: BedrockAnthropicLLMParams,
            BedrockModelProviders.AI21.value: BedrockAI21LLMParams,
            BedrockModelProviders.AMAZON.value: BedrockAmazonLLMParams,
            BedrockModelProviders.META.value: BedrockMetaLLMParams,
            BedrockModelProviders.COHERE.value: BedrockCohereLLMParams,
        }

    @property
    def model_map(self) -> Dict[BedrockModelProviders, BedrockLLMParams]:
        return self._model_map

    def get_bedrock_adapter(self, model_family) -> BedrockLLMParams:
        """
        Returns the appropriate Bedrock Family Adapter for the task of cleaning model params, based on model family
        parameter.

        Args: None
        Returns:
            (BedrockTarget): A BedrockTarget type adapter object which can parse the parameters provided to it
                to return sanitized params.

        """
        try:
            return self.model_map[model_family]
        except KeyError as error:
            logger.error(f"BedrockAdapterFactory: Provided model family is not supported. Error: {error}")
            raise ValueError(f"BedrockAdapterFactory: Provided model family is not supported.")
