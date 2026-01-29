#!/usr/bin/env python
# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

import os
from dataclasses import asdict
from typing import Any, Dict, List, Optional
from urllib.parse import urlparse, quote

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

    def _generate_s3_console_url(self, s3_uri: str) -> Optional[str]:
        """
        Generates an S3 console URL for an S3 URI.
        
        Args:
            s3_uri (str): S3 URI in format s3://bucket-name/key/path
            
        Returns:
            Optional[str]: S3 console URL or None if generation fails
        """
        try:
            # Parse S3 URI
            parsed = urlparse(s3_uri)
            if parsed.scheme != 's3':
                logger.warning(f"Invalid S3 URI scheme: {s3_uri}")
                return None
                
            bucket = parsed.netloc
            key = parsed.path.lstrip('/')
            
            if not bucket or not key:
                logger.warning(f"Invalid S3 URI format: {s3_uri}")
                return None
            
            # Get AWS region from environment or use default
            region = os.environ.get('AWS_REGION', 'us-east-1')
            
            # Generate S3 console URL
            # URL encode the key to handle special characters
            from urllib.parse import quote
            encoded_key = quote(key, safe='/')
            
            console_url = f"https://s3.console.aws.amazon.com/s3/object/{bucket}?region={region}&prefix={encoded_key}"
            
            logger.info(
                "Generated S3 console URL",
                extra={
                    "s3_uri": s3_uri,
                    "bucket": bucket,
                    "region": region
                }
            )
            return console_url
            
        except Exception as e:
            logger.error(f"Error generating S3 console URL for {s3_uri}: {str(e)}")
            return None

    def _extract_location_from_metadata(self, location_metadata: Dict) -> Optional[str]:
        """
        Extracts and processes the location from Bedrock metadata.
        
        Args:
            location_metadata (Dict): The location metadata from Bedrock
            
        Returns:
            Optional[str]: Processed location URL or None
        """
        location_type = location_metadata.get("type")
        
        if location_type == "S3":
            return self._process_s3_location(location_metadata.get("s3Location", {}))
        elif location_type == "WEB":
            return location_metadata.get("webLocation", {}).get("url")
        elif location_type == "CONFLUENCE":
            return location_metadata.get("confluenceLocation", {}).get("url")
        elif location_type == "SALESFORCE":
            return location_metadata.get("salesforceLocation", {}).get("url")
        elif location_type == "SHAREPOINT":
            return location_metadata.get("sharePointLocation", {}).get("url")
        elif location_type == "KENDRA":
            return self._process_kendra_location(location_metadata.get("kendraDocumentLocation", {}))
        else:
            if location_type:
                logger.warning(
                    f"Unsupported Bedrock location type '{location_type}' detected. No location will be returned."
                )
            return None

    def _process_s3_location(self, s3_location: Dict) -> Optional[str]:
        """
        Processes S3 location by converting URI to console URL.
        
        Args:
            s3_location (Dict): S3 location metadata
            
        Returns:
            Optional[str]: Console URL or original URI as fallback
        """
        s3_uri = s3_location.get("uri")
        if not s3_uri:
            return None
            
        console_url = self._generate_s3_console_url(s3_uri)
        if console_url:
            return console_url
            
        # Fallback to original S3 URI
        logger.warning(f"Using S3 URI as fallback: {s3_uri}")
        return s3_uri

    def _process_kendra_location(self, kendra_location: Dict) -> Optional[str]:
        """
        Processes Kendra location, converting S3 URIs to console URLs.
        
        Args:
            kendra_location (Dict): Kendra location metadata
            
        Returns:
            Optional[str]: Console URL for S3 URIs, or original URI
        """
        kendra_uri = kendra_location.get("uri")
        if not kendra_uri:
            return None
            
        # Check if Kendra URI is actually an S3 URI
        if kendra_uri.startswith("s3://"):
            console_url = self._generate_s3_console_url(kendra_uri)
            if console_url:
                return console_url
                
            # Fallback to original URI
            logger.warning(f"Using Kendra S3 URI as fallback: {kendra_uri}")
            
        return kendra_uri

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
            location_metadata = doc.metadata.get("location", {})
            doc_location = self._extract_location_from_metadata(location_metadata)

            formatted_doc = SourceDocument(
                excerpt=doc.page_content,
                location=doc_location,
                score=doc.metadata.get("score"),
            )
            formatted_source_docs.append(asdict(formatted_doc))
            
        return formatted_source_docs
