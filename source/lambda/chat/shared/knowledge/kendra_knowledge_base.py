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
from typing import Any, Dict, List, Optional

from aws_lambda_powertools import Logger
from shared.knowledge.kendra_retriever import CustomKendraRetriever
from shared.knowledge.knowledge_base import KnowledgeBase
from utils.constants import DEFAULT_KENDRA_NUMBER_OF_DOCS, DEFAULT_RETURN_SOURCE_DOCS, KENDRA_INDEX_ID_ENV_VAR
from utils.enum_types import KnowledgeBaseTypes

logger = Logger(utc=True)


class KendraKnowledgeBase(KnowledgeBase):
    """
    KendraKnowledgeBase adds context to the LLM memory using Amazon Kendra.

    Args:
        kendra_index_id (str): An existing Kendra index ID
        number_of_docs (int): Number of documents to query for [Optional]
        return_source_documents (bool): if the source of documents should be returned or not [Optional]
        attribute_filter (dict): Additional filtering of results based on metadata. See: https://docs.aws.amazon.com/kendra/latest/APIReference
        user_context (dict): Provides information about the user context. See: https://docs.aws.amazon.com/kendra/latest/APIReference


    Methods:
        _check_env_variables(): Checks if the Kendra index id exists in the environment variables

    """

    knowledge_base_type: KnowledgeBaseTypes = KnowledgeBaseTypes.Kendra.value

    def __init__(
        self,
        kendra_knowledge_base_params: Optional[Dict[str, Any]] = {},
    ) -> None:
        self._check_env_variables()

        self.kendra_index_id = os.environ[KENDRA_INDEX_ID_ENV_VAR]
        self.number_of_docs = kendra_knowledge_base_params.get(
            "NumberOfDocs",
            DEFAULT_KENDRA_NUMBER_OF_DOCS,
        )
        self.return_source_documents = kendra_knowledge_base_params.get(
            "ReturnSourceDocs",
            DEFAULT_RETURN_SOURCE_DOCS,
        )
        self.attribute_filter = kendra_knowledge_base_params.get("AttributeFilter")
        self.user_context = None

        self.retriever = CustomKendraRetriever(
            index_id=self.kendra_index_id,
            top_k=self.number_of_docs,
            return_source_documents=self.return_source_documents,
            attribute_filter=self.attribute_filter,
            user_context=self.user_context,
        )

    def _check_env_variables(self) -> None:
        """
        Checks if the Kendra index id exists in the environment variables
        """
        if not os.environ.get(KENDRA_INDEX_ID_ENV_VAR):
            raise ValueError("Kendra index id env variable is not set")

    def source_docs_formatter(self, source_documents: List[Any]) -> List[Dict]:
        """
        Formats the source documents in a format to send to the websocket
        Args:
            source_documents (list): list of source documents.
        Returns:
            list: list of formatted source documents.
        """
        return [item.metadata for item in source_documents]
