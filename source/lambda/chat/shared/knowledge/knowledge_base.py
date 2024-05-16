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

from abc import ABC, abstractmethod
from typing import Any, Dict, List

from aws_lambda_powertools import Logger
from langchain_core.retrievers import BaseRetriever
from utils.enum_types import KnowledgeBaseTypes

logger = Logger(utc=True)


class KnowledgeBase(ABC):
    """
    KnowledgeBase interface defines the basic methods required for a knowledge base to add context to the LLM conversation memory
    while fetching responses from it.
    Each supported knowledge-base type must implement this interface.
    """

    knowledge_base_type: KnowledgeBaseTypes
    retriever: BaseRetriever

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
    def source_docs_formatter(self, source_documents: List[Any]) -> List[Dict]:
        """
        Formats the source documents in a format to send to the websocket
        Args:
            source_documents (list): list of source documents.
        Returns:
            list: list of formatted source documents.
        """
