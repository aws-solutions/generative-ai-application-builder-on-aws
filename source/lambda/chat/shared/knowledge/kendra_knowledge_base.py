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
from dataclasses import asdict
from typing import Any, Dict, List, Optional

from aws_lambda_powertools import Logger
from cognito_jwt_verifier import CognitoJWTVerifier
from langchain_core.documents import Document
from shared.knowledge.kendra_retriever import CustomKendraRetriever
from shared.knowledge.knowledge_base import KnowledgeBase, SourceDocument
from utils.constants import (
    CLIENT_ID_ENV_VAR,
    DEFAULT_KENDRA_NUMBER_OF_DOCS,
    DEFAULT_RAG_RBAC_ENABLED_STATUS,
    DEFAULT_RETURN_SOURCE_DOCS_MODE,
    DEFAULT_SCORE_THRESHOLD,
    KENDRA_INDEX_ID_ENV_VAR,
    USER_POOL_ID_ENV_VAR,
)
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
        user_context_token (str): The JWT token to use for user context by Kendra

    Methods:
        _check_env_variables(): Checks if the Kendra index id exists in the environment variables

    """

    knowledge_base_type: KnowledgeBaseTypes = KnowledgeBaseTypes.KENDRA.value

    def __init__(
        self,
        knowledge_base_params: Optional[Dict[str, Any]] = {},
        user_context_token: Optional[str] = None,
    ) -> None:
        self._check_env_variables()

        self.number_of_docs = knowledge_base_params.get(
            "NumberOfDocs",
            DEFAULT_KENDRA_NUMBER_OF_DOCS,
        )
        self.return_source_documents = knowledge_base_params.get(
            "ReturnSourceDocs",
            DEFAULT_RETURN_SOURCE_DOCS_MODE,
        )
        self.min_score_confidence = knowledge_base_params.get(
            "ScoreThreshold",
            DEFAULT_SCORE_THRESHOLD,
        )
        self.attribute_filter = knowledge_base_params.get("KendraKnowledgeBaseParams", {}).get("AttributeFilter")
        self.user_context_token = user_context_token

        self.rag_rbac_enabled = knowledge_base_params.get("KendraKnowledgeBaseParams", {}).get(
            "RoleBasedAccessControlEnabled", DEFAULT_RAG_RBAC_ENABLED_STATUS
        )
        self.user_context_token_verifier = CognitoJWTVerifier(
            user_pool_id=os.environ.get(USER_POOL_ID_ENV_VAR),
            app_client_id=os.environ.get(CLIENT_ID_ENV_VAR),
        )

        self.retriever = CustomKendraRetriever(
            index_id=self.kendra_index_id,
            top_k=self.number_of_docs,
            return_source_documents=self.return_source_documents,
            attribute_filter=self.attribute_filter,
            user_context_token=self.user_context_token,
            rag_rbac_enabled=self.rag_rbac_enabled,
            min_score_confidence=self.min_score_confidence,
            user_context_token_verifier=self.user_context_token_verifier,
        )

    def _check_env_variables(self) -> None:
        """
        Validates the required environment variables for the Kendra knowledge base.

        This method checks if the following environment variables are set:

        - `KENDRA_INDEX_ID_ENV_VAR`: The ID of the Amazon Kendra index to use for the knowledge base.

        If the `KENDRA_INDEX_ID_ENV_VAR` is not set, a `ValueError` is raised.

        Raises:
            ValueError: If the `KENDRA_INDEX_ID_ENV_VAR` environment variable is not set.
        """
        if not os.environ.get(KENDRA_INDEX_ID_ENV_VAR):
            raise ValueError("Kendra index id env variable is not set")

        self.kendra_index_id = os.environ.get(KENDRA_INDEX_ID_ENV_VAR)

    def source_docs_formatter(self, source_documents: List[Document]) -> List[Dict]:
        """
        Formats the source documents in a format to send to the websocket
        Args:
            source_documents (list): list of source documents.
        Returns:
            list: list of formatted source documents.
        """
        formatted_source_docs = []
        for doc in source_documents:
            doc = SourceDocument(
                excerpt=doc.metadata.get("excerpt"),
                location=doc.metadata.get("source"),
                score=doc.metadata.get("score"),
                document_title=doc.metadata.get("title"),
                document_id=doc.metadata.get("document_id"),
                additional_attributes=doc.metadata.get("document_attributes"),
            )
            formatted_source_docs.append(asdict(doc))
        return formatted_source_docs
