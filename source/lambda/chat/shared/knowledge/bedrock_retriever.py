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
from typing import List, Optional

from aws_lambda_powertools import Logger, Tracer
from aws_lambda_powertools.metrics import MetricUnit
from botocore.exceptions import ClientError
from helper import get_service_client
from langchain_aws.retrievers.bedrock import AmazonKnowledgeBasesRetriever, RetrievalConfig
from langchain_core.documents import Document
from utils.constants import TRACE_ID_ENV_VAR
from utils.enum_types import CloudWatchMetrics, CloudWatchNamespaces
from utils.helpers import get_metrics_client

logger = Logger(utc=True)
tracer = Tracer()
metrics = get_metrics_client(CloudWatchNamespaces.AWS_BEDROCK)


class CustomBedrockRetriever(AmazonKnowledgeBasesRetriever):
    """
    Retrieves documents from a Bedrock knowledge base. It inherits from LangChain AmazonKnowledgeBasesRetriever and overrides certain functionalities
    for a custom implementation.

    Attributes:
        knowledge_base_id (str): Bedrock knowledge base ID
        retrieval_config: Configuration for bedrock knowledge base retrieval
        return_source_documents (bool): Whether source documents to be returned
        min_score_confidence (Optional[float]): Minimum score confidence for retrieved documents

    Methods:
        get_relevant_documents(query): Run search on bedrock knowledge base and get documents as configured

    """

    knowledge_base_id: str
    retrieval_config: RetrievalConfig
    return_source_documents: bool
    min_score_confidence: Optional[float]

    def __init__(
        self,
        knowledge_base_id: str,
        retrieval_config: RetrievalConfig,
        return_source_documents: bool = False,
        min_score_confidence: Optional[float] = None,
    ):
        super().__init__(
            knowledge_base_id=knowledge_base_id,
            client=get_service_client("bedrock-agent-runtime"),
            retrieval_config=retrieval_config,
            return_source_documents=return_source_documents,
            min_score_confidence=min_score_confidence,
        )

    @tracer.capture_method(capture_response=True)
    @metrics.log_metrics
    def _get_relevant_documents(self, query: str) -> List[Document]:
        """
        @overrides AmazonKnowledgeBasesRetriever._get_relevant_documents
        Runs search on bedrock knowledge base to retrieve documents as configured.
        This method is overrides the parent method for metrics and tracing purposes, removing sources if configured.
        Other functionality remains the same.

        docs = get_relevant_documents('This is my query')

        Returns:
            List[Document]: List of LangChain document objects.
        """
        with tracer.provider.in_subsegment("## bedrock_knowledge_base_query") as subsegment:
            subsegment.put_annotation("service", "bedrock-agent-runtime")
            subsegment.put_annotation("operation", "retrieve")
            metrics.add_metric(
                name=CloudWatchMetrics.BEDROCK_KNOWLEDGE_BASE_RETRIEVE.value, unit=MetricUnit.Count, value=1
            )

            try:
                start_time = time.time()
                docs = super()._get_relevant_documents(query=query, run_manager=None)
                end_time = time.time()

                metrics.add_metric(
                    name=CloudWatchMetrics.BEDROCK_KNOWLEDGE_BASE_RETRIEVE_TIME.value,
                    unit=MetricUnit.Seconds,
                    value=(end_time - start_time),
                )

                metrics.add_metric(
                    name=CloudWatchMetrics.BEDROCK_KNOWLEDGE_BASE_FETCHED_DOCUMENTS.value,
                    unit=MetricUnit.Count,
                    value=len(docs),
                )

                if not docs:
                    logger.info(f"Bedrock retrieve returned no docs. Query: {query}")
                    metrics.add_metric(
                        name=CloudWatchMetrics.BEDROCK_KNOWLEDGE_BASE_NO_HITS.value, unit=MetricUnit.Count, value=1
                    )
                else:
                    logger.debug(f"Bedrock knowledge base retrieved {len(docs)} docs: {docs}")

                return docs

            except ClientError as ce:
                logger.error(
                    f"Bedrock retrieve failed due to {ce.response['Error']['Code']}, returning empty docs. Query received: {query}\nException: {ce}",
                    xray_trace_id=os.environ[TRACE_ID_ENV_VAR],
                )
            except Exception as ex:
                logger.error(
                    f"Bedrock retrieve failed, returning empty docs. Query received: {query}\nException: {ex}",
                    xray_trace_id=os.environ[TRACE_ID_ENV_VAR],
                )
            metrics.add_metric(
                name=CloudWatchMetrics.BEDROCK_KNOWLEDGE_BASE_NO_HITS.value, unit=MetricUnit.Count, value=1
            )
            metrics.add_metric(
                name=CloudWatchMetrics.BEDROCK_KNOWLEDGE_BASE_FAILURES.value, unit=MetricUnit.Count, value=1
            )
            return []
