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

from typing import Any, Dict, Optional

from aws_lambda_powertools import Logger, Tracer
from llms.models.model_provider_inputs import ModelProviderInputs
from llms.rag.retrieval_llm import RetrievalLLM
from llms.sagemaker import SageMakerLLM
from shared.defaults.model_defaults import ModelDefaults
from utils.constants import DEFAULT_RETURN_SOURCE_DOCS
from utils.enum_types import CloudWatchNamespaces
from utils.helpers import get_metrics_client

tracer = Tracer()
logger = Logger(utc=True)
metrics = get_metrics_client(CloudWatchNamespaces.LANGCHAIN_LLM)


class SageMakerRetrievalLLM(RetrievalLLM, SageMakerLLM):
    """
    SageMakerRetrievalLLM is a wrapper around the SageMaker LLM invocation. This class can generate chat responses, provided a conversation memory
    and knowledge base. Specifically, this enables the usage of RAG with SageMaker.

    Attributes:
        - llm_params: LLM dataclass object which has the following:
            conversation_memory (BaseMemory): A BaseMemory object which helps store and access user chat history
            knowledge_base (KnowledgeBase): A KnowledgeBase object which retrieves information from the user's knowledge base for LLM context
            return_source_docs (bool): A boolean which represents whether the source documents are returned or not [optional, defaults to DEFAULT_RETURN_SOURCE_DOCS]
            model (str): SageMaker model name that represents the underlying LLM model [optional]
            model_params (dict): A dictionary of model parameters, which can be obtained from the SageMaker model documentation [optional]
            prompt_template (str): A string which represents the prompt template [optional, defaults to prompt provided in ModelInfoStorage DynamoDB table]
            streaming (bool): A boolean which represents whether the chat is streaming or not [optional, defaults to streaming value in provided in ModelInfoStorage
                DynamoDB table]
            verbose (bool): A boolean which represents whether the chat is verbose or not [optional, defaults to DEFAULT_VERBOSE_MODE]
            temperature (float): A non-negative float that tunes the degree of randomness in model response generation [optional, defaults to temperature
                provided in ModelInfoStorage DynamoDB table]
            callbacks (list): A list of BaseCallbackHandler objects which are used for the LLM model callbacks [optional, defaults to None]

        - model_defaults (ModelDefaults): A ModelDefaults object which contains default values for the model retrieved from ModelInfoStorage DynamoDB table
        - sagemaker_endpoint_name (str): A string which represents the SageMaker endpoint name. The SageMaker endpoint is invoked with the user inputs to get
            chat responses
        - input_schema (dict): A dictionary of input schema for the SageMaker endpoint. This is passed to SageMaker Content Handler.
            The content handler is used to transform the input to the SageMaker endpoint as it expects, and then retrieve the response from the JSON response received.
            The input_schema represents the schema of the input to the SageMaker endpoint. The response_jsonpath below represents the path for the text output from the
            SageMaker endpoint. See SageMakerContentHandler for more information and examples available at llms/models/sagemaker/content_handler.py
        - response_jsonpath (str): A string which represents the jsonpath for the chat text output from the SageMaker endpoint
        - return_source_docs (bool): A boolean which represents whether the source documents are returned or not [optional, defaults to DEFAULT_RETURN_SOURCE_DOCS]

    Methods:
        - generate(question): Generates a chat response
        - get_conversation_chain(): Creates a `ConversationalRetrievalChain` chain that is connected to a conversation
        memory and the specified prompt
        - get_validated_prompt(prompt_template, prompt_template_placeholders, default_prompt_template,
        default_prompt_template_placeholders): Generates the PromptTemplate using the provided prompt template and placeholders. In case of errors, falls back on default values.
        - get_validated_disambiguation_prompt(disambiguation_prompt_template, default_disambiguation_prompt_template,
        disambiguation_prompt_template_placeholders): Generates the PromptTemplate using the provided disambiguation prompt template. In case of errors, falls back on default values.

    """

    def __init__(
        self,
        llm_params: ModelProviderInputs,
        model_defaults: ModelDefaults,
        sagemaker_endpoint_name: Optional[str],
        input_schema=Dict[str, Any],
        response_jsonpath=Dict[str, Any],
        return_source_docs=DEFAULT_RETURN_SOURCE_DOCS,
    ):
        RetrievalLLM.__init__(
            self,
            llm_params=llm_params,
            model_defaults=model_defaults,
            return_source_docs=return_source_docs,
            disambiguation_prompt_template=llm_params.disambiguation_prompt_template,
        )

        if sagemaker_endpoint_name is None or not sagemaker_endpoint_name:
            raise ValueError("SageMaker endpoint name is required.")

        if not input_schema:
            raise ValueError("SageMaker input schema is required.")

        if not response_jsonpath:
            raise ValueError("SageMaker response JSONPath is required.")

        self.sagemaker_endpoint_name = sagemaker_endpoint_name
        self._input_schema = input_schema
        self._response_jsonpath = response_jsonpath
        self.model_params, self._endpoint_params = self.get_clean_params(llm_params.model_params)
        self._llm = self.get_llm()
        self._conversation_chain = self.get_conversation_chain()

    @tracer.capture_method(capture_response=True)
    def generate(self, question: str) -> Dict[str, Any]:
        error_message = f"Error occurred while invoking SageMaker endpoint: '{self.sagemaker_endpoint_name}'. "
        return super().generate(question, error_message)
