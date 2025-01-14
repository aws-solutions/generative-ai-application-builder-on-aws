#!/usr/bin/env python
# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Any, Dict, List, Optional

from aws_lambda_powertools import Logger
from langchain_core.documents import Document
from langchain_core.retrievers import BaseRetriever
from utils.enum_types import KnowledgeBaseTypes

logger = Logger(utc=True)


@dataclass
class SourceDocument:
    excerpt: str
    location: str
    score: float | str  # kendra gives string, e.g. HIGH
    document_title: Optional[str] = None
    document_id: Optional[str] = None
    additional_attributes: Optional[List[Any]] = None


class KnowledgeBase(ABC):
    """
    KnowledgeBase interface defines the basic methods required for a knowledge base to add context to the LLM conversation memory
    while fetching responses from it.
    Each supported knowledge-base type must implement this interface.
    """

    knowledge_base_type: KnowledgeBaseTypes
    retriever: BaseRetriever
    rag_rbac_enabled: bool = False

    @property
    def retriever(self) -> BaseRetriever:
        """
        Returns the instance of BaseRetriever, to be consumed by a ConversationalRetrievalChain chain so it can perform retrieval from the configured data index.
        Returns:
            BaseRetriever: retriever instance.
        """
        if not self._retriever:
            raise ValueError("Retriever not initialized")

        return self._retriever

    @retriever.setter
    def retriever(self, retriever: BaseRetriever) -> None:
        """
        Sets the instance of BaseRetriever, to be consumed by a ConversationalRetrievalChain chain so it can perform retrieval from the configured data index.
        Returns: None
        """
        self._retriever = retriever

    @abstractmethod
    def source_docs_formatter(self, source_documents: List[Document]) -> List[Dict]:
        """
        Formats the source documents in a format to send to the websocket
        Args:
            source_documents (list): list of source documents.
        Returns:
            list: list of formatted source documents.
        """
