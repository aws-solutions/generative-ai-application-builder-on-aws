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

from abc import ABC
from dataclasses import dataclass
from typing import List, Optional

from langchain.callbacks.base import BaseCallbackHandler
from langchain.schema import BaseMemory
from shared.knowledge.knowledge_base import KnowledgeBase
from utils.constants import DEFAULT_VERBOSE_MODE


@dataclass
class LLM(ABC):
    """
    Defines model params for all models under llms.
    Values default to None if not provided except for DEFAULT_RETURN_SOURCE_DOCS and
    DEFAULT_VERBOSE_MODE to enable individual model classes deal with model specific defaults.
    """

    conversation_memory: BaseMemory
    knowledge_base: KnowledgeBase
    api_token: Optional[str] = None
    model: Optional[str] = None
    model_params: Optional[dict] = None
    prompt_template: Optional[str] = None
    prompt_placeholders: Optional[List[str]] = None
    streaming: Optional[bool] = None
    verbose: Optional[bool] = DEFAULT_VERBOSE_MODE
    temperature: Optional[float] = None
    callbacks: Optional[List[BaseCallbackHandler]] = None

    def __post_init__(self):
        if self.api_token is not None and not (len(self.api_token)):
            raise ValueError("API token cannot be an empty string")

        if self.conversation_memory is None:
            raise ValueError("Empty conversation memory supplied.")
