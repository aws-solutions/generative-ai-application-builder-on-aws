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
from typing import Any, Dict, Optional

from llms.models.bedrock_params.llm import BedrockLLMParams
from shared.defaults.model_defaults import ModelDefaults


@dataclass
class BedrockMetaLLMParams(BedrockLLMParams):
    """
    Model parameters for the Meta model available in Bedrock.
    The class also provides logic to parse and clean model parameters specifically for the Amazon Meta Bedrock model.
    """

    max_gen_len: Optional[int] = None
    top_p: Optional[float] = None
    temperature: Optional[float] = None
    model_defaults: Optional[ModelDefaults] = None

    def __post_init__(self):
        """
        Parses model_params to produce clean model parameters per the standards of the an underlying Bedrock model family
        Empty keys are dropped from the BedrockCohereLLMParams dataclass object. All model parameters are optional.
        Stop sequences are extended to include defaults if a default exists for that model provider.
        """
        self.temperature = (
            float(self.temperature) if self.temperature is not None else self.model_defaults.default_temperature
        )
        self.__dataclass_fields__.pop("model_defaults", None)

    def get_params_as_dict(self, stop_sequence_key: str = None, pop_null: bool = True) -> Dict[str, Any]:
        """
        Takes the model dataclass object and returns a dict of the model parameters.

        Args:
            pop_null (bool): If true, pops the null/empty values from the dict.

        Returns:
            (Dict): Dict of the model parameters.
        """
        return super().get_params_as_dict(stop_sequence_key=stop_sequence_key, pop_null=pop_null)
