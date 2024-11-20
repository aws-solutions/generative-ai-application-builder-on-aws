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
from typing import Dict, List, Optional, Sequence, Union

from aws_lambda_powertools import Logger, Tracer
from aws_lambda_powertools.metrics import MetricUnit
from botocore.exceptions import ClientError
from cognito_jwt_verifier import CognitoJWTVerifier
from helper import get_service_client
from langchain_aws.retrievers.kendra import AmazonKendraRetriever, ResultItem, clean_excerpt
from langchain_core.documents import Document
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
    top_k: int
    return_source_documents: bool
    attribute_filter: Optional[Dict] = None
    user_context_token_verifier: Optional[CognitoJWTVerifier] = None

    def __init__(
        self,
        index_id: str,
        top_k: Optional[int] = DEFAULT_KENDRA_NUMBER_OF_DOCS,
        return_source_documents: Optional[bool] = False,
        attribute_filter: Optional[Dict] = None,
        user_context_token: Optional[str] = None,
        rag_rbac_enabled: Optional[bool] = False,
        min_score_confidence: Optional[float] = None,
        user_context_token_verifier: Optional[CognitoJWTVerifier] = None,
    ):
        super().__init__(
            index_id=index_id,
            top_k=top_k,
            client=get_service_client("kendra"),
            return_source_documents=return_source_documents,
            attribute_filter=None,
            min_score_confidence=min_score_confidence,
        )
        self.user_context_token_verifier = user_context_token_verifier
        self.attribute_filter = self._add_user_context_to_attribute_filter(
            attribute_filter, user_context_token, rag_rbac_enabled
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
                    f"Kendra query failed, returning empty docs. Query received: '{query}'\nException: {ex}",
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

        if not cleaned_docs:
            logger.info(f"Kendra query returned no docs. Query: {query}")
            metrics.add_metric(name=CloudWatchMetrics.KENDRA_NO_HITS.value, unit=MetricUnit.Count, value=1)
        else:
            logger.debug(f"Kendra query retrieved {len(cleaned_docs)} docs: {cleaned_docs}")

        return cleaned_docs

    def _create_user_context_attribute_filter(
        self, user_context_token: str, rag_rbac_enabled: bool
    ) -> Union[List, None]:
        """
        Decodes the user context jwt token to extract the groups and user id.
        The groups and user id are used to create a user context attribute filter.
        The attribute filter is used to filter results based on the user's groups.

        See: https://docs.aws.amazon.com/kendra/latest/dg/user-context-filter.html#context-filter-attribute

        Args:
            user_context_token (str): JWT token generated by cognito for the user login, as received in the event payload.
            rag_rbac_enabled (bool): A flag indicating whether RAG RBAC is enabled.

        Returns:
            Union[Dict, None]: If both `user_context_token` and `rag_rbac_enabled` are truthy, returns a dictionary with a "OrAllFilters" key containing a list of attribute filters. Otherwise, returns `None`.
        """
        if not rag_rbac_enabled:
            return None

        if not user_context_token:
            raise ValueError("user_context_token is required for RAG with user context filtering")

        if not self.user_context_token_verifier:
            raise ValueError(
                "user_context_token_verifier is required for RAG with user context filtering, and must be an instance of CognitoJWTVerifier"
            )

        self.user_context_token_verifier.verify_jwt_token(user_context_token)
        groups = self.user_context_token_verifier.extract_groups_from_jwt_token()
        user_id = self.user_context_token_verifier.extract_username_from_jwt_token()

        if not groups or not user_id:
            return None

        attribute_filter = [
            {"EqualsTo": {"Key": "_user_id", "Value": {"StringValue": user_id}}},
            {"EqualsTo": {"Key": "_group_ids", "Value": {"StringListValue": groups}}},
        ]

        logger.debug(f"Attribute filter: {attribute_filter}")
        return attribute_filter

    def _add_user_context_to_attribute_filter(
        self, attribute_filter: Dict, user_context_token: str, rag_rbac_enabled: bool
    ) -> Dict:
        """
        Adds the user context attribute filter to the provided attribute filter.

        Args:
            attribute_filter (Dict): The attribute filter to add the user context attribute filter to.
            user_context_token (str): The user context token to be included in the returned dictionary.
            rag_rbac_enabled (bool): A flag indicating whether RAG RBAC is enabled.

        Returns:
            Dict: The updated attribute filter with the user context attribute filter added.
        """
        user_context_attribute_filter = self._create_user_context_attribute_filter(user_context_token, rag_rbac_enabled)
        if not user_context_attribute_filter:
            return attribute_filter

        if not attribute_filter:
            attribute_filter = {}

        if "OrAllFilters" not in attribute_filter:
            attribute_filter["OrAllFilters"] = []

        attribute_filter["OrAllFilters"].extend(user_context_attribute_filter)
        logger.debug(f"Updated attribute filter: {attribute_filter}")
        return attribute_filter

    def _get_clean_docs(self, docs: Sequence[ResultItem]) -> Sequence[ResultItem]:
        """
        Parses the documents returned from Kendra and cleans them.

        Args:
            docs (Sequence[ResultItem]): List of Kendra query response items of type ResultItem

        Returns:
            Sequence[ResultItem]: List of LangChain document objects.
        """

        for doc in docs:
            doc.page_content = clean_excerpt(doc.get_excerpt())
            if self.return_source_documents:
                doc.metadata = {}

        return docs
