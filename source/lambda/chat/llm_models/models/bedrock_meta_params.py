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

from llm_models.models.bedrock_llm_params import BedrockLLMParams
from utils.constants import DEFAULT_BEDROCK_TEMPERATURE_MAP
from utils.enum_types import BedrockModelProviders


@dataclass
class BedrockMetaLLMParams(BedrockLLMParams):
    """
    Model parameters for the Meta model available in Bedrock.
    The class also provides logic to parse and clean model parameters specifically for the Amazon Meta Bedrock model.
    """

    max_gen_len: Optional[int] = None
    top_p: Optional[float] = None
    temperature: float = DEFAULT_BEDROCK_TEMPERATURE_MAP[BedrockModelProviders.META.value]

    def get_params_as_dict(self, pop_null=True) -> Dict[str, Any]:
        """
        Takes the model dataclass object and returns a dict of the model parameters.

        Args:
            pop_null (bool): If true, pops the null/empty values from the dict.

        Returns:
            (Dict): Dict of the model parameters.
        """
        return super().get_params_as_dict(pop_null=pop_null)
