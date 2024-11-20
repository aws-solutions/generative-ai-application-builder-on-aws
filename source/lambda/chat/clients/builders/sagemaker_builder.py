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
from llms.models.model_provider_inputs import SageMakerInputs
from llms.rag.sagemaker_retrieval import SageMakerRetrievalLLM
from llms.sagemaker import SageMakerLLM
from utils.constants import DEFAULT_RAG_ENABLED_MODE, DEFAULT_SAGEMAKER_MODEL_ID
from utils.enum_types import CloudWatchMetrics, CloudWatchNamespaces
from utils.helpers import get_metrics_client

logger = Logger(utc=True)
tracer = Tracer()
metrics = get_metrics_client(CloudWatchNamespaces.LANGCHAIN_LLM)


class SageMakerBuilder(LLMBuilder):
    """
    Class that implements the LLMBuilder interface to create objects that have a conversation memory, knowledge base
    and an LLM.
    SageMakerBuilder has access to the following through its interface:

    Attributes:
        - use_case_config (Dict): Specifies the configuration that the admin sets on a use-case, stored in DynamoDB
        - rag_enabled (Optional[bool]): Specifies whether the use-case is enabled for RAG. Defaults to - DEFAULT_RAG_ENABLED_MODE.
        - connection_id (str): The connection ID of the user's connection to the chat application through WebSockets
        - conversation_id (str): The conversation ID which helps store and access user chat history
        - user_context_token (str): Sets the user context token
        - model_inputs (ModelProviderInputs): Stores the model inputs provided by the user
        - model_defaults (ModelDefaults): Stores the model defaults
        - conversation_history_cls (BaseChatMessageHistory): Stores the user conversation history
        - conversation_history_params (Dict): Stores the parameters for the conversation history
        - knowledge_base (KnowledgeBase): Stores the user's knowledge base
        - callbacks (Callbacks): Stores the callbacks that are set on the LLM model
        - llm (BaseLangChainModel): Stores the LLM model that is used to generate content
        - model_params (Dict): Stores the model parameters for the LLM model
        - errors (List[str]): Stores the errors that occur during the use-case execution

    Methods:
        - set_model_defaults(model_provider, model_name): Sets the value for the model defaults object that is used to - store default values for the LLM model
        - validate_event_input_sizes(event_body): Validates the input sizes of prompt and user query using the defaults retrieved from ModelInfoStorage DynamoDB table
        - set_knowledge_base(): Sets the value for the knowledge base object that is used to supplement the LLM context using information from the user's knowledge base
        - set_conversation_memory(user_id, conversation_id): Sets the value for the conversation memory object that is used to store the user chat history
        - set_streaming_callbacks(response_if_no_docs_found, return_source_docs): Sets the value of callbacks for the LLM
        - get_guardrails(model_config): Returns the guardrails configuration object for the model.
        - set_llm(model): Sets the value of the LLM model as a SageMakerLLM or SageMakerRetrievalLLM
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

    def set_llm(self, *args, **kwargs) -> None:
        """
        Sets the value of the LLM in the builder. Each subclass implements its own LLM.
        """
        super().set_llm(DEFAULT_SAGEMAKER_MODEL_ID)
        sagemaker_config = self.use_case_config.get("LlmParams", {}).get("SageMakerLlmParams", {})

        # Cast parent ModelProviderInputs to child SageMakerInputs and add additional SageMaker parameters
        sagemaker_specific_inputs = {
            "sagemaker_endpoint_name": sagemaker_config.get("EndpointName"),
            "input_schema": sagemaker_config.get("ModelInputPayloadSchema"),
            "response_jsonpath": sagemaker_config.get("ModelOutputJSONPath"),
        }
        self.model_inputs = SageMakerInputs(**vars(self.model_inputs), **sagemaker_specific_inputs)

        if self.rag_enabled and not self.knowledge_base:
            metrics.add_metric(name=CloudWatchMetrics.INCORRECT_INPUT_FAILURES.value, unit=MetricUnit.Count, value=1)
            logger.error("KnowledgeBase is required for RAG-enabled SageMaker chat model.")
            raise ValueError("KnowledgeBase is required for RAG-enabled SageMaker chat model.")
        elif self.rag_enabled and self.knowledge_base:
            self.llm = SageMakerRetrievalLLM(model_inputs=self.model_inputs, model_defaults=self.model_defaults)
        else:
            self.llm = SageMakerLLM(model_inputs=self.model_inputs, model_defaults=self.model_defaults)

        metrics.flush_metrics()
