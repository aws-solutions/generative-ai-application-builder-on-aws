#!/usr/bin/env python
# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

from dataclasses import dataclass
from typing import Any, Dict, List, Optional

from llms.models.bedrock_params.llm import BedrockLLMParams


@dataclass
class BedrockAI21LLMParams(BedrockLLMParams):
    """
    Model parameters for the AI21 model available in Bedrock.
    The class also provides logic to parse and clean model parameters specifically for the Amazon AI21 Bedrock model.
    """

    maxTokens: Optional[int] = None
    topP: Optional[float] = None
    countPenalty: Optional[Dict[str, Any]] = None
    presencePenalty: Optional[Dict[str, Any]] = None
    frequencyPenalty: Optional[Dict[str, Any]] = None
    stopSequences: Optional[List[str]] = None
    temperature: Optional[float] = None

    def __post_init__(self):
        """
        Parses model_params to produce clean model parameters per the standards of the an underlying Bedrock model family
        For example, for Bedrock's AI21 provision,
            if provided with:
                {
                    "maxTokens": 250,
                    "stopSequences": '["\nAI:", "\nHuman:"]'
                    "temperature": 0.2,
                    "topP": None
                }
            the response is:
                BedrockAI21LLMParams(model_params={'maxTokens': 250, 'stopSequences': ['\nAI:', '\nHuman:'], 'temperature': 0.2})

        Empty keys are dropped from the BedrockAI21LLMParams dataclass object. All model parameters are optional.
        Stop sequences are also set to a default if a default exists for that model provider.
        model_defaults is a ModelDefaults object that holds the defaults value. It is popped from the object once the initial
            values are set using it.

        """
        self.stopSequences = list(
            set(self.model_defaults.stop_sequences + self.stopSequences if self.stopSequences else [])
        )
        self.temperature = self.temperature if self.temperature is not None else self.model_defaults.default_temperature
        self.cleanup()

    def get_params_as_dict(self, stop_sequence_key: str = "stopSequences", pop_null: bool = True) -> Dict[str, Any]:
        """
        Takes the model dataclass object and returns a dict of the model parameters.

        Args:
            stop_sequence_key (str): Key to use for the stop sequences.
            pop_null (bool): If true, pops the null/empty values from the dict.

        Returns:
            (Dict): Dict of the model parameters.
        """
        return super().get_params_as_dict(stop_sequence_key=stop_sequence_key, pop_null=pop_null)
