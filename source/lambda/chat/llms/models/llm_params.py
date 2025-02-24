#!/usr/bin/env python
# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

from abc import ABC
from dataclasses import asdict, dataclass
from typing import Any, Dict


@dataclass
class LLMParams(ABC):
    """
    LLMParams provides provides a means to define a common interface and functionalities across all LLM parameters.

    Child classes represent a model provider, like Amazon Bedrock, SageMaker, etc. Each model provider may have their
    own child classes if they support variations in model parameters within its provided models.

    Validations and cleansing of the model parameters is provided for each implementation.
    """

    def get_params_as_dict(self, stop_sequence_key: str = None, pop_null: bool = True) -> Dict[str, Any]:
        """
        Takes the model dataclass object and returns a dict of the model parameters.

        Args:
            stop_sequence_key (str): Key to use for the stop sequences. Can vary between models, like "stop_sequences" or "stopSequences"
            pop_null (bool): If true, pops the null/empty values from the dict.

        Returns:
            (Dict): Dict of the model parameters.
        """
        lambda_func = lambda x: {k: v for (k, v) in x if v is not None} if pop_null else {k: v for (k, v) in x}

        response = {k: v for k, v in asdict(self, dict_factory=lambda_func).items()}

        if (
            pop_null
            and stop_sequence_key is not None
            and not response[stop_sequence_key]
            and stop_sequence_key in response
        ):
            del response[stop_sequence_key]

        return response
