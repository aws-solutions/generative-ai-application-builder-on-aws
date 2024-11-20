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
from langchain_core.documents import Document
from shared.knowledge.bedrock_retriever import CustomBedrockRetriever
from shared.knowledge.knowledge_base import KnowledgeBase, SourceDocument
from utils.constants import (
    BEDROCK_KNOWLEDGE_BASE_ID_ENV_VAR,
    DEFAULT_BEDROCK_KNOWLEDGE_BASE_NUMBER_OF_DOCS,
    DEFAULT_RETURN_SOURCE_DOCS_MODE,
    DEFAULT_SCORE_THRESHOLD,
)
from utils.enum_types import KnowledgeBaseTypes

logger = Logger(utc=True)


class BedrockKnowledgeBase(KnowledgeBase):
    """
    BedrockKnowledgeBase adds context to the LLM memory using Amazon Bedrock Knowledge Bases.

    Args:
        knowledge_base_params (Dict):

    Methods:
        _check_env_variables(): Checks if the bedrock knowledge base id exists in the environment variables

    """

    knowledge_base_type: KnowledgeBaseTypes = KnowledgeBaseTypes.BEDROCK.value

    def __init__(
        self,
        knowledge_base_params: Dict[str, Any] = {},
        user_context_token: Optional[str] = None,
    ) -> None:
        self._check_env_variables()

        self.knowledge_base_id = os.environ[BEDROCK_KNOWLEDGE_BASE_ID_ENV_VAR]
        self.number_of_docs = knowledge_base_params.get(
            "NumberOfDocs",
            DEFAULT_BEDROCK_KNOWLEDGE_BASE_NUMBER_OF_DOCS,
        )
        self.return_source_documents = knowledge_base_params.get(
            "ReturnSourceDocs",
            DEFAULT_RETURN_SOURCE_DOCS_MODE,
        )
        self.min_score_confidence = knowledge_base_params.get(
            "ScoreThreshold",
            DEFAULT_SCORE_THRESHOLD,
        )

        self.retrieval_filter = knowledge_base_params.get("BedrockKnowledgeBaseParams", {}).get("RetrievalFilter")
        self.override_search_type = knowledge_base_params.get("BedrockKnowledgeBaseParams", {}).get(
            "OverrideSearchType"
        )

        retrieval_config = {"vectorSearchConfiguration": {"numberOfResults": self.number_of_docs}}
        if self.retrieval_filter is not None:
            retrieval_config["vectorSearchConfiguration"]["filter"] = self.retrieval_filter
        if self.override_search_type is not None:
            retrieval_config["vectorSearchConfiguration"]["overrideSearchType"] = self.override_search_type

        self.retriever = CustomBedrockRetriever(
            knowledge_base_id=self.knowledge_base_id,
            retrieval_config=retrieval_config,
            return_source_documents=self.return_source_documents,
            min_score_confidence=self.min_score_confidence,
        )
        self.user_context_token = user_context_token

    def _check_env_variables(self) -> None:
        """
        Checks if the Bedrock knowledge base id exists in the environment variables
        """
        if not os.environ.get(BEDROCK_KNOWLEDGE_BASE_ID_ENV_VAR):
            raise ValueError("Bedrock knowledge base id env variable is not set")

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
            # location is of type https://docs.aws.amazon.com/bedrock/latest/APIReference/API_agent-runtime_RetrievalResultLocation.html. More types may be added, but for now only those below are supported.
            doc_location = None
            location_type = doc.metadata.get("location", {}).get("type")

            match location_type:
                case "S3":
                    doc_location = doc.metadata.get("location", {}).get("s3Location", {}).get("uri")
                case "WEB":
                    doc_location = doc.metadata.get("location", {}).get("webLocation", {}).get("url")
                case "CONFLUENCE":
                    doc_location = doc.metadata.get("location", {}).get("confluenceLocation", {}).get("url")
                case "SALESFORCE":
                    doc_location = doc.metadata.get("location", {}).get("salesforceLocation", {}).get("url")
                case "SHAREPOINT":
                    doc_location = doc.metadata.get("location", {}).get("sharePointLocation", {}).get("url")
                case _:
                    logger.warning(
                        f"Unsupported Bedrock location type ${location_type} detected. No location will be returned."
                    )

            doc = SourceDocument(
                excerpt=doc.page_content,
                location=doc_location,
                score=doc.metadata.get("score"),
            )
            formatted_source_docs.append(asdict(doc))
        return formatted_source_docs
