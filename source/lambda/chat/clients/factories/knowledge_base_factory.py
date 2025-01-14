#!/usr/bin/env python
# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

import os
from typing import Dict, List, Optional

from aws_lambda_powertools import Logger
from shared.knowledge.bedrock_knowledge_base import BedrockKnowledgeBase
from shared.knowledge.kendra_knowledge_base import KendraKnowledgeBase
from shared.knowledge.knowledge_base import KnowledgeBase
from utils.constants import TRACE_ID_ENV_VAR
from utils.enum_types import KnowledgeBaseTypes

logger = Logger(utc=True)

KNOWLEDGE_BASE_MAP: Dict[str, type[KnowledgeBase]] = {
    KnowledgeBaseTypes.KENDRA.value: KendraKnowledgeBase,
    KnowledgeBaseTypes.BEDROCK.value: BedrockKnowledgeBase,
}


class KnowledgeBaseFactory:
    """
    Factory class for creating a knowledge base object based on the KnowledgeBaseType provided, along with its configuration
    in the use_case_config.
    """

    def get_knowledge_base(
        self, use_case_config: Dict, errors: List[str], user_context_token: str
    ) -> Optional[KnowledgeBase]:
        """
        Returns a KnowledgeBase object based on the knowledge-base object constructed with the provided configuration.

        Args:
            use_case_config(Dict): Model configuration set by admin
            errors(List): List of errors to append to

        Returns:
            KnowledgeBase: the knowledge-base constructed with the provided configuration.
        """
        knowledge_base_params = use_case_config.get("KnowledgeBaseParams")
        if not knowledge_base_params:
            errors.append(
                f"Missing required field (KnowledgeBaseParams) in the configuration for the specified Knowledge Base"
            )
            return

        knowledge_base_type = knowledge_base_params.get("KnowledgeBaseType")
        unsupported_kb_error = f"Unsupported KnowledgeBase type: {knowledge_base_type}."

        if not knowledge_base_type:
            errors.append(f"Missing required field (KnowledgeBaseType) in the configuration")
            return

        knowledge_base_str = ""
        try:
            # Incorrect KnowledgeBaseType throws ValueError due to enum validation
            knowledge_base_str = KnowledgeBaseTypes(knowledge_base_type)
        except ValueError as ve:
            logger.error(
                ve,
                xray_trace_id=os.environ[TRACE_ID_ENV_VAR],
            )
            errors.append(unsupported_kb_error + f" Supported types are: {[kb.value for kb in KnowledgeBaseTypes]}")
            return

        knowledge_base_class = KNOWLEDGE_BASE_MAP.get(knowledge_base_str, None)
        if knowledge_base_class is None:
            errors.append(f"Unsupported KnowledgeBase type: {knowledge_base_type}.")
        else:
            if not use_case_config.get("KnowledgeBaseParams"):
                raise ValueError("Missing required parameter (KnowledgeBaseParams) for knowledge base.")
            return knowledge_base_class(use_case_config.get("KnowledgeBaseParams"), user_context_token)
