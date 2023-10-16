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

import os
from typing import Dict, List

from aws_lambda_powertools import Logger
from shared.knowledge.kendra_knowledge_base import KendraKnowledgeBase
from shared.knowledge.knowledge_base import KnowledgeBase
from utils.constants import TRACE_ID_ENV_VAR
from utils.enum_types import KnowledgeBaseTypes

logger = Logger(utc=True)


class KnowledgeBaseFactory:
    """
    Factory class for creating a knowledge base object based on the KnowledgeBaseType provided, along with its configuration
    in the llm_config.
    """

    def get_knowledge_base(self, llm_config: Dict, errors: List[str]) -> KnowledgeBase:
        """
        Returns a KnowledgeBase object based on the knowledge-base object constructed with the provided configuration.

        Args:
            llm_config(Dict): Model configuration set by admin
            errors(List): List of errors to append to

        Returns:
            KnowledgeBase: the knowledge-base constructed with the provided configuration.
        """
        knowledge_base_type = llm_config.get("KnowledgeBaseType")
        knowledge_base_params = llm_config.get("KnowledgeBaseParams")
        unsupported_kb_error = f"Unsupported KnowledgeBase type: {knowledge_base_type}."

        if not knowledge_base_type:
            errors.append(f"Missing required field (KnowledgeBaseType) in the configuration")
            return

        if not knowledge_base_params:
            errors.append(
                f"Missing required field (KnowledgeBaseParams) in the configuration for the specified Knowledge Base {knowledge_base_type}"
            )
            return

        knowledge_base_str = ""
        try:
            # Incorrect conversation_memory_type throws ValueError due to enum validation
            knowledge_base_str = KnowledgeBaseTypes(knowledge_base_type)
        except ValueError as ve:
            logger.error(
                ve,
                xray_trace_id=os.environ[TRACE_ID_ENV_VAR],
            )
            errors.append(unsupported_kb_error + f" Supported types are: {[kb.value for kb in KnowledgeBaseTypes]}")
            return

        if knowledge_base_str == KnowledgeBaseTypes.Kendra.value:
            if not llm_config.get("KnowledgeBaseParams"):
                raise ValueError("Missing required parameter (KnowledgeBaseParams) for Kendra knowledge base.")

            return KendraKnowledgeBase(kendra_knowledge_base_params=llm_config.get("KnowledgeBaseParams"))

        else:
            errors.append(f"Unsupported KnowledgeBase type: {knowledge_base_type}.")
