#!/usr/bin/env python
# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

from dataclasses import dataclass
from typing import Optional

from llms.models.llm_params import LLMParams
from shared.defaults.model_defaults import ModelDefaults


@dataclass
class BedrockLLMParams(LLMParams):
    """
    BedrockLLMParams provides provides a means to define a common interface and functionalities across all Bedrock LLMs.
    """

    model_defaults: Optional[ModelDefaults] = None

    def cleanup(self):
        self.__dataclass_fields__.pop("model_defaults", None)
