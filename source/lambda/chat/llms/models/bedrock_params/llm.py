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
from typing import Optional

from llms.models.llm_params import LLMParams
from shared.defaults.model_defaults import ModelDefaults


@dataclass
class BedrockLLMParams(LLMParams):
    """
    BedrockLLMParams provides provides a means to define a common interface and functionalities across all Bedrock LLM models.
    """

    model_defaults: Optional[ModelDefaults] = None

    def cleanup(self):
        self.__dataclass_fields__.pop("model_defaults", None)
