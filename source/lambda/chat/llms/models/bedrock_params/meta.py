#!/usr/bin/env python
# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

from dataclasses import dataclass
from typing import Any, Dict, Optional

from llms.models.bedrock_params.llm import BedrockLLMParams


@dataclass
class BedrockMetaLLMParams(BedrockLLMParams):
    """
    Model parameters for the Meta model available in Bedrock.
    The class also provides logic to parse and clean model parameters specifically for the Amazon Meta Bedrock model.
    """

    max_gen_len: Optional[int] = None
    top_p: Optional[float] = None
    temperature: Optional[float] = None

    def __post_init__(self):
        """
        Parses model_params to produce clean model parameters per the standards of the an underlying Bedrock model family
        Empty keys are dropped from the BedrockCohereLLMParams dataclass object. All model parameters are optional.
        Stop sequences are extended to include defaults if a default exists for that model provider.
        """
        self.temperature = self.temperature if self.temperature is not None else self.model_defaults.default_temperature
        self.cleanup()

    def get_params_as_dict(self, stop_sequence_key: str = None, pop_null: bool = True) -> Dict[str, Any]:
        """
        Takes the model dataclass object and returns a dict of the model parameters.

        Args:
            pop_null (bool): If true, pops the null/empty values from the dict.

        Returns:
            (Dict): Dict of the model parameters.
        """
        return super().get_params_as_dict(stop_sequence_key=stop_sequence_key, pop_null=pop_null)
