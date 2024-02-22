#!/usr/bin/env python
# *********************************************************************************************************************
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
# ********************************************************************************************************************#

import os
import time
from typing import Any, Dict, List, Optional, Sequence

from aws_lambda_powertools import Logger, Tracer
from aws_lambda_powertools.metrics import MetricUnit
from botocore.exceptions import ClientError
from helper import get_service_client
from langchain.retrievers.kendra import AmazonKendraRetriever, ResultItem, clean_excerpt
from langchain.schema import Document
from utils.constants import DEFAULT_KENDRA_NUMBER_OF_DOCS, TRACE_ID_ENV_VAR
from utils.enum_types import CloudWatchMetrics, CloudWatchNamespaces
from utils.helpers import get_metrics_client

logger = Logger(utc=True)
tracer = Tracer()
metrics = get_metrics_client(CloudWatchNamespaces.AWS_KENDRA)


class CustomKendraRetriever(AmazonKendraRetriever):
    """
    Retrieves documents from Amazon Kendra index. It inherits from LangChain AmazonKendraRetriever and overrides certain functionalities
    for a custom implementation.

    Attributes:
        index_id (str): Kendra index ID
        kendra_client (Any): Amazon Kendra client
        top_k (int): Number of documents to return
        return_source_documents (bool): Whether source documents to be returned
        attribute_filter (dict): Additional filtering of results based on metadata. See: https://docs.aws.amazon.com/kendra/latest/APIReference/API_AttributeFilter.html
        user_context (dict): Provides information about the user context. See: https://docs.aws.amazon.com/kendra/latest/APIReference/API_UserContext.html

    Methods:
        get_relevant_documents(query): Run search on Kendra index and get top k documents.
        kendra_query(query, top_k, attribute_filter): Execute a query on the Kendra index and return a list of processed responses.
        get_clean_docs(docs): Parses the documents returned from Kendra and cleans them.

    """

    index_id: str
    kendra_client: Any
    top_k: int
    return_source_documents: bool
    attribute_filter: Optional[Dict] = None
    user_context: Optional[Dict] = None

    def __init__(
        self,
        index_id: str,
        top_k: Optional[int] = DEFAULT_KENDRA_NUMBER_OF_DOCS,
        return_source_documents: Optional[bool] = False,
        attribute_filter: Optional[Dict] = None,
        user_context: Optional[Dict] = None,
    ):
        super().__init__(
            index_id=index_id,
            top_k=top_k,
            client=get_service_client("kendra"),
            return_source_documents=return_source_documents,
            attribute_filter=attribute_filter,
            user_context=user_context,
        )

    @tracer.capture_method(capture_response=True)
    @metrics.log_metrics
    def _get_relevant_documents(self, query: str) -> List[Document]:
        """
        @overrides AmazonKendraRetriever._get_relevant_documents
        Run search on Kendra index and get top k documents.
        This method is overrides the parent method for metrics and tracing purposes, functionality remains the same.

        docs = get_relevant_documents('This is my query')

        Returns:
            List[Document]: List of LangChain document objects.
        """
        with tracer.provider.in_subsegment("## kendra_query") as subsegment:
            subsegment.put_annotation("service", "kendra")
            subsegment.put_annotation("operation", "retrieve/query")
            metrics.add_metric(name=CloudWatchMetrics.KENDRA_QUERY.value, unit=MetricUnit.Count, value=1)

            try:
                start_time = time.time()
                kendra_response = super()._get_relevant_documents(query=query, run_manager=None)
                end_time = time.time()

                metrics.add_metric(
                    name=CloudWatchMetrics.KENDRA_QUERY_PROCESSING_TIME.value,
                    unit=MetricUnit.Seconds,
                    value=(end_time - start_time),
                )
                return kendra_response

            except ClientError as ce:
                logger.error(
                    f"Kendra query failed due to {ce.response['Error']['Code']}, returning empty docs. Query received: {query}\nException: {ce}",
                    xray_trace_id=os.environ[TRACE_ID_ENV_VAR],
                )
            except Exception as ex:
                logger.error(
                    f"Kendra query failed, returning empty docs. Query received: {query}\nException: {ex}",
                    xray_trace_id=os.environ[TRACE_ID_ENV_VAR],
                )
            metrics.add_metric(name=CloudWatchMetrics.KENDRA_NO_HITS.value, unit=MetricUnit.Count, value=1)
            metrics.add_metric(name=CloudWatchMetrics.KENDRA_FAILURES.value, unit=MetricUnit.Count, value=1)
            return []

    @tracer.capture_method(capture_response=True)
    def _kendra_query(self, query: str) -> Sequence[ResultItem]:
        """
        @overrides AmazonKendraRetriever._kendra_query
        Execute a query on the Kendra index and return a list of processed responses.

        Args:
            query (str): Query to search for in the Kendra index

        Returns:
            Sequence[ResultItem]: List of Kendra query response items of type ResultItem
        """
        docs = super()._kendra_query(query=query)
        cleaned_docs = self._get_clean_docs(docs)
        metrics.add_metric(
            name=CloudWatchMetrics.KENDRA_FETCHED_DOCUMENTS.value, unit=MetricUnit.Count, value=len(cleaned_docs)
        )

        if len(cleaned_docs) == 0:
            logger.info(f"Kendra query returned no docs. Query: {query}")
            metrics.add_metric(name=CloudWatchMetrics.KENDRA_NO_HITS.value, unit=MetricUnit.Count, value=1)
        else:
            logger.debug(f"Kendra query processed top docs: {cleaned_docs}")

        return cleaned_docs

    def _get_clean_docs(self, docs: Sequence[ResultItem]) -> Sequence[ResultItem]:
        """
        Parses the documents returned from Kendra and cleans them.

        Args:
            docs (List[Any]): List of Kendra query response items of type ResultItem

        Returns:
            Sequence[ResultItem]: List of LangChain document objects.
        """

        for doc in docs:
            doc.page_content = clean_excerpt(doc.get_excerpt())
            if self.return_source_documents:
                doc.metadata = {}

        return docs
