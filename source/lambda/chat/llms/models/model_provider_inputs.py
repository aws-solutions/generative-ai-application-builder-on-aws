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

import re
from abc import ABC
from dataclasses import dataclass
from typing import List, Optional

from langchain_core.callbacks.base import BaseCallbackHandler
from langchain_core.memory import BaseMemory
from shared.knowledge.knowledge_base import KnowledgeBase
from utils.constants import DEFAULT_VERBOSE_MODE


@dataclass
class ModelProviderInputs(ABC):
    """
    Defines model params for all models under llms.
    Values default to None if not provided except for DEFAULT_RETURN_SOURCE_DOCS and
    DEFAULT_VERBOSE_MODE to enable individual model classes deal with model specific defaults.
    """

    conversation_memory: BaseMemory
    knowledge_base: Optional[KnowledgeBase] = None
    model: Optional[str] = None
    model_params: Optional[dict] = None
    prompt_template: Optional[str] = None
    prompt_placeholders: Optional[List[str]] = None
    disambiguation_prompt_template: Optional[str] = None
    disambiguation_prompt_enabled: Optional[bool] = None
    rephrase_question: Optional[bool] = None
    response_if_no_docs_found: Optional[str] = None
    streaming: Optional[bool] = None
    verbose: Optional[bool] = DEFAULT_VERBOSE_MODE
    temperature: Optional[float] = None
    callbacks: Optional[List[BaseCallbackHandler]] = None

    def __post_init__(self):
        if self.conversation_memory is None:
            raise ValueError("Empty conversation memory supplied.")


@dataclass
class BedrockInputs(ModelProviderInputs):
    """
    Defines model params for Bedrock models specifically.
    """

    model_arn: Optional[str] = None

    def __post_init__(self):
        if self.model_arn is not None:
            regex = r"^(arn:aws(-[^:]+)?:bedrock:[a-z0-9-]{1,20}:(([0-9]{12}:custom-model/[a-z0-9-]{1,63}[.]{1}[a-z0-9-:]{1,63}/[a-z0-9]{12})|(:foundation-model/[a-z0-9-]{1,63}[.]{1}[a-z0-9-]{1,63}([.:]?[a-z0-9-]{1,63})([.:]?[a-z0-9-]{1,63}))|([0-9]{12}:provisioned-model/[a-z0-9]{12})))$"  # NOSONAR - python:S6396, python:S5843, python:S6353 - Regex per AWS documentation

            model_arn_pattern = re.compile(regex)
            is_match = bool(model_arn_pattern.match(self.model_arn))

            if not is_match:
                raise ValueError(
                    "ModelArn must be a valid provisioned/custom model ARN to use from Amazon Bedrock. See: https://docs.aws.amazon.com/bedrock/latest/APIReference/API_runtime_InvokeModel.html#API_runtime_InvokeModel_RequestSyntax"
                )
