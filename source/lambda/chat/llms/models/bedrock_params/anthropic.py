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

from dataclasses import dataclass
from typing import Any, Dict, List, Optional

from llms.models.bedrock_params.llm import BedrockLLMParams
from shared.defaults.model_defaults import ModelDefaults


@dataclass
class BedrockAnthropicLLMParams(BedrockLLMParams):
    """
    Model parameters for the Anthropic model available in Bedrock.
    The class also provides logic to parse and clean model parameters specifically for the Amazon AI21 Bedrock model.
    """

    max_tokens_to_sample: Optional[int] = None
    top_p: Optional[float] = None
    top_k: Optional[float] = None
    stop_sequences: Optional[List[str]] = None
    temperature: Optional[float] = None
    model_defaults: Optional[ModelDefaults] = None

    def __post_init__(self):
        """
        Parses model_params to produce clean model parameters per the standards of the an underlying Bedrock model family
        For example, for Bedrock's Anthropic provision,
            if provided with:
                {
                    "max_tokens_to_sample": 250,
                    "stop_sequences": '["\nAI:", "\nHuman:"]'
                    "temperature": 0.2,
                    "topP": None
                }
            the response is:
                BedrockAnthropicLLMParams(model_params={'max_tokens_to_sample': 250, 'stop_sequences': ['\nAI:', '\nHuman:'], 'temperature': 0.2})

        Empty keys are dropped from the BedrockAnthropicLLMParams dataclass object. All model parameters are optional.
        Temperature is set to model default value if not provided.
        Stop sequences are also set to a default if a default exists for that model provider.
        model_defaults is a ModelDefaults object that holds the defaults value. It is popped from the object once the initial
            values are set using it.

        """
        user_stop_sequences = self.stop_sequences if self.stop_sequences else []
        self.stop_sequences = list(sorted(set(self.model_defaults.stop_sequences + user_stop_sequences)))

        self.temperature = (
            float(self.temperature) if self.temperature is not None else self.model_defaults.default_temperature
        )

        self.top_p = float(self.top_p) if self.top_p is not None else None
        self.top_k = float(self.top_k) if self.top_k is not None else None
        self.__dataclass_fields__.pop("model_defaults", None)

    def get_params_as_dict(self, stop_sequence_key: str = "stop_sequences", pop_null: bool = True) -> Dict[str, Any]:
        """
        Takes the model dataclass object and returns a dict of the model parameters.

        Args:
            stop_sequence_key (str): Key to use for the stop sequences.
            pop_null (bool): If true, pops the null/empty values from the dict.

        Returns:
            (Dict): Dict of the model parameters.
        """
        return super().get_params_as_dict(stop_sequence_key=stop_sequence_key, pop_null=pop_null)
