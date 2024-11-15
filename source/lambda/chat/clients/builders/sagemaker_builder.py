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

from typing import Dict, Optional

from aws_lambda_powertools import Logger, Tracer
from aws_lambda_powertools.metrics import MetricUnit
from clients.builders.llm_builder import LLMBuilder
from llms.rag.sagemaker_retrieval import SageMakerRetrievalLLM
from llms.sagemaker import SageMakerLLM
from utils.constants import DEFAULT_MODEL_ID, DEFAULT_RAG_ENABLED_MODE, DEFAULT_RETURN_SOURCE_DOCS
from utils.enum_types import CloudWatchMetrics, CloudWatchNamespaces
from utils.helpers import get_metrics_client

logger = Logger(utc=True)
tracer = Tracer()
metrics = get_metrics_client(CloudWatchNamespaces.LANGCHAIN_LLM)


class SageMakerBuilder(LLMBuilder):
    """
    Class that implements the LLMBuilder interface to create objects that have a conversation memory, knowledge base
    and an LLM model.
    SageMakerBuilder has access to the following through its interface:

    Attributes:
        use_case_config (Dict): Specifies the configuration that the admin sets on a use-case, stored in DynamoDB
        connection_id (str): The connection ID of the user's connection to the chat application through WebSockets
        conversation_id (str): The conversation ID which helps store and access user chat history
        rag_enabled (bool): Specifies if RAG is enabled for the use-case or not
        user_context_token (str): The token that is used to retrieve the context from the knowledge base using role based access control

    Methods:
        set_knowledge_base(): Sets the value for the knowledge base object that is used to supplement the LLM context using information from
            the user's knowledge base
        set_conversation_memory(): Sets the value for the conversation memory object that is used to store the user chat history
        set_llm_model(): Sets the value of the LLM model in the builder as a SageMakerLLM or SageMakerRetrievalLLM object
        set_streaming_callbacks(): Sets the value of callbacks for the LLM model
    """

    def __init__(
        self,
        use_case_config: Dict,
        connection_id: str,
        conversation_id: str,
        rag_enabled: Optional[bool] = None,
        user_context_token: Optional[str] = None,
    ) -> None:
        super().__init__(
            use_case_config=use_case_config,
            connection_id=connection_id,
            conversation_id=conversation_id,
            rag_enabled=rag_enabled if (rag_enabled is not None) else DEFAULT_RAG_ENABLED_MODE,
            user_context_token=user_context_token,
        )

    def set_llm_model(self) -> None:
        """
        Sets the value of the lLM model in the builder. Each subclass implements its own LLM model.
        """
        super().set_llm_model(DEFAULT_MODEL_ID)
        llm_params = self.use_case_config.get("LlmParams")

        try:
            if self.rag_enabled and not self.knowledge_base:
                error_message = "KnowledgeBase is required for RAG-enabled SageMaker chat model."
                metrics.add_metric(
                    name=CloudWatchMetrics.INCORRECT_INPUT_FAILURES.value, unit=MetricUnit.Count, value=1
                )
                logger.error(error_message)
                raise ValueError(error_message)
            elif self.rag_enabled and self.knowledge_base:
                self.llm_model = SageMakerRetrievalLLM(
                    llm_params=self.model_params,
                    model_defaults=self.model_defaults,
                    sagemaker_endpoint_name=llm_params.get("SageMakerLlmParams").get("EndpointName"),
                    input_schema=llm_params.get("SageMakerLlmParams").get("ModelInputPayloadSchema"),
                    response_jsonpath=llm_params.get("SageMakerLlmParams").get("ModelOutputJSONPath"),
                    return_source_docs=self.use_case_config.get("KnowledgeBaseParams", {}).get(
                        "ReturnSourceDocs", DEFAULT_RETURN_SOURCE_DOCS
                    ),
                )
            else:
                self.llm_model = SageMakerLLM(
                    llm_params=self.model_params,
                    model_defaults=self.model_defaults,
                    sagemaker_endpoint_name=llm_params.get("SageMakerLlmParams").get("EndpointName"),
                    input_schema=llm_params.get("SageMakerLlmParams").get("ModelInputPayloadSchema"),
                    response_jsonpath=llm_params.get("SageMakerLlmParams").get("ModelOutputJSONPath"),
                    rag_enabled=False,
                )
        finally:
            metrics.flush_metrics()
