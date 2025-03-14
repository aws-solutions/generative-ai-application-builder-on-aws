#!/usr/bin/env python
# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

from dataclasses import dataclass
from typing import Any, Dict, List, Optional

from llms.models.bedrock_params.llm import BedrockLLMParams


@dataclass
class BedrockAnthropicLLMParams(BedrockLLMParams):
    """
    Model parameters for the Anthropic model available in Bedrock.
    The class also provides logic to parse and clean model parameters specifically for the Amazon AI21 Bedrock model.
    """

    top_p: Optional[float] = None
    top_k: Optional[float] = None
    stop_sequences: Optional[List[str]] = None
    temperature: Optional[float] = None

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
        self.stop_sequences = list(
            sorted(set(self.model_defaults.stop_sequences + self.stop_sequences if self.stop_sequences else []))
        )
        self.temperature = self.temperature if self.temperature is not None else self.model_defaults.default_temperature
        self.cleanup()

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


@dataclass
class BedrockAnthropicV1LLMParams(BedrockAnthropicLLMParams):
    """
    Model parameters for the Anthropic V1 and V2 models
    """

    max_tokens_to_sample: Optional[int] = None

    def __post_init__(self):
        super().__post_init__()


@dataclass
class BedrockAnthropicV3LLMParams(BedrockAnthropicLLMParams):
    """
    Model parameters for the Anthropic V3 models
    """

    max_tokens: Optional[int] = None
    system: Optional[str] = None
    tools: Optional[Dict[str, Any]] = None
    tool_choice: Optional[Dict[str, str]] = None

    def __post_init__(self):
        super().__post_init__()
