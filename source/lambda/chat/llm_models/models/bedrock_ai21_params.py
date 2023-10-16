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

from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional

from llm_models.models.bedrock_llm_params import BedrockLLMParams
from utils.constants import BEDROCK_STOP_SEQUENCES, DEFAULT_BEDROCK_TEMPERATURE_MAP
from utils.enum_types import BedrockModelProviders


@dataclass
class BedrockAI21LLMParams(BedrockLLMParams):
    """
    Model parameters for the AI21 model available in Bedrock.
    The class also provides logic to parse and clean model parameters specifically for the Amazon AI21 Bedrock model.
    """

    maxTokens: Optional[int] = None
    topP: Optional[float] = None
    countPenalty: Optional[Dict[str, Any]] = field(default_factory=dict)
    presencePenalty: Optional[Dict[str, Any]] = field(default_factory=dict)
    frequencyPenalty: Optional[Dict[str, Any]] = field(default_factory=dict)
    stopSequences: Optional[List[str]] = field(default_factory=list)
    temperature: Optional[float] = DEFAULT_BEDROCK_TEMPERATURE_MAP[BedrockModelProviders.AI21.value]

    def __post_init__(self):
        """
        Parses model_params to produce clean model parameters per the standards of the an underlying Bedrock model family
        For example, for Bedrock's AI21 provision,
            if provided with:
                {
                    "maxTokens": 250,
                    "stopSequences": '\nAI:, \nHuman:'
                    "temperature": 0.2,
                    "topP": None
                }
            the response is:
                BedrockAI21LLMParams(model_params={'maxTokens': 250, 'stopSequences': ['\nAI:', '\nHuman:'], 'temperature': 0.2})

        Empty keys are dropped from the BedrockAI21LLMParams dataclass object. All model parameters are optional.
        Temperature is set to model default value if not provided.
        Stop sequences are also set to a default if a default exists for that model provider.

        """
        user_stop_sequences = self.stopSequences if self.stopSequences else []
        self.stopSequences = list(set(BEDROCK_STOP_SEQUENCES[BedrockModelProviders.AI21.value] + user_stop_sequences))
        self.temperature = (
            float(self.temperature)
            if self.temperature is not None
            else DEFAULT_BEDROCK_TEMPERATURE_MAP[BedrockModelProviders.AI21.value]
        )
        self.topP = float(self.topP) if self.topP is not None else None

    def get_params_as_dict(self, pop_null=True) -> Dict[str, Any]:
        """
        Takes the model dataclass object and returns a dict of the model parameters.

        Args:
            pop_null (bool): If true, pops the null/empty values from the dict.

        Returns:
            (Dict): Dict of the model parameters.
        """
        return super().get_params_as_dict(stop_sequence_key="stopSequences", pop_null=pop_null)
