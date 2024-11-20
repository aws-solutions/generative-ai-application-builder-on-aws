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
from typing import Any, Dict, Tuple

from aws_lambda_powertools import Logger, Tracer
from aws_lambda_powertools.metrics import MetricUnit
from helper import get_service_client
from langchain_aws.llms.sagemaker_endpoint import SagemakerEndpoint
from llms.models.model_provider_inputs import SageMakerInputs
from llms.models.sagemaker.content_handler import SageMakerContentHandler
from llms.rag.retrieval_llm import RetrievalLLM
from shared.defaults.model_defaults import ModelDefaults
from utils.constants import (
    SAGEMAKER_ENDPOINT_ARGS,
    TEMPERATURE_PLACEHOLDER_STR,
    TRACE_ID_ENV_VAR,
)
from utils.custom_exceptions import LLMInvocationError
from utils.enum_types import CloudWatchMetrics, CloudWatchNamespaces
from utils.helpers import get_metrics_client

tracer = Tracer()
logger = Logger(utc=True)
metrics = get_metrics_client(CloudWatchNamespaces.LANGCHAIN_LLM)


class SageMakerRetrievalLLM(RetrievalLLM):
    """
    SageMakerRetrievalLLM is a wrapper around the SageMaker LLM invocation. This class can generate chat responses, provided a conversation memory
    and knowledge base. Specifically, this enables the usage of RAG with SageMaker.

    Attributes:
        - model_inputs: LLM dataclass object which has the following:
            conversation_memory (BaseMemory): A BaseMemory object which helps store and access user chat history
            knowledge_base (KnowledgeBase): A KnowledgeBase object which retrieves information from the user's knowledge base for LLM context
            return_source_docs (bool): A boolean which represents whether the source documents are returned or not [optional, defaults to DEFAULT_RETURN_SOURCE_DOCS]
            model (str): SageMaker model name that represents the underlying LLM [optional]
            model_params (dict): A dictionary of model parameters, which can be obtained from the SageMaker model documentation [optional]
            prompt_template (str): A string which represents the prompt template [optional, defaults to prompt provided in ModelInfoStorage DynamoDB table]
            streaming (bool): A boolean which represents whether the chat is streaming or not [optional, defaults to streaming value in provided in ModelInfoStorage
                DynamoDB table]
            verbose (bool): A boolean which represents whether the chat is verbose or not [optional, defaults to DEFAULT_VERBOSE_MODE]
            temperature (float): A non-negative float that tunes the degree of randomness in model response generation [optional, defaults to temperature
                provided in ModelInfoStorage DynamoDB table]
            callbacks (list): A list of BaseCallbackHandler objects which are used for the LLM callbacks [optional, defaults to None]

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
        - get_runnable(): Creates a 'RunnableWithMessageHistory' (in case of non-streaming) or 'RunnableBinding' (in case of streaming) LangChain runnable that is connected to a conversation memory and the specified prompt. In case of Retrieval Augmented Generated (RAG) use cases, this is also connected to a knowledge base.
        - get_session_history(user_id, conversation_id): Retrieves the conversation history from the conversation memory based on the user_id and conversation_id.
        - generate(question, operation): Invokes the LLM to fetch a response for the given question. Operation is used for metrics.
        - get_validated_prompt(prompt_template, prompt_template_placeholders, default_prompt_template,
        default_prompt_template_placeholders): Generates the ChatPromptTemplate using the provided prompt template and
        placeholders. In case of errors, falls back on default values.
        - get_llm(): Returns the underlying LLM object that is used by the runnable. Each child class must provide its own implementation.
        - get_clean_model_params(): Returns the cleaned and formatted model parameters that are used by the LLM. Each child class must provide its own implementation based on the model parameters it supports.
        - get_validated_disambiguation_prompt(disambiguation_prompt_template, default_disambiguation_prompt_template,
        disambiguation_prompt_template_placeholders, disambiguation_prompt_enabled): Generates the ChatPromptTemplate used for disambiguating the question using conversation history. It uses the provided prompt template and placeholders. In case of errors, falls back on default values.
        - save_to_session_history(human_message, ai_response): Saves the conversation history to the conversation memory.
        - enhanced_create_history_aware_retriever(llm, retriever, prompt): create_history_aware_retriever enhancement that allows passing of the intermediate rephrased question into the output using RunnablePassthrough
        - enhanced_create_stuff_documents_chain(llm, prompt, rephrased_question, output_parser, document_prompt, document_separator, document_variable_name): create_stuff_documents_chain enhancement that allows rephrased question to be passed as an input to the LLM instead.
        - enhanced_create_retrieval_chain(retriever, combine_docs_chain, rephrased_question): create_retrieval_chain enhancement that allows rephrased question to be passed into the final output from the model
    """

    def __init__(self, model_inputs: SageMakerInputs, model_defaults: ModelDefaults):
        RetrievalLLM.__init__(self, model_inputs=model_inputs, model_defaults=model_defaults)

        if model_inputs.sagemaker_endpoint_name is None or not model_inputs.sagemaker_endpoint_name:
            raise ValueError("SageMaker endpoint name is required.")

        if not model_inputs.input_schema:
            raise ValueError("SageMaker input schema is required.")

        if not model_inputs.response_jsonpath:
            raise ValueError("SageMaker response JSONPath is required.")

        self.sagemaker_endpoint_name = model_inputs.sagemaker_endpoint_name
        self.input_schema = model_inputs.input_schema
        self.response_jsonpath = model_inputs.response_jsonpath
        self.model_params, self.endpoint_params = self.get_clean_model_params(model_inputs.model_params)
        self.llm = self.get_llm()
        self.disambiguation_llm = self.get_llm(condense_prompt_model=True)
        self.runnable_with_history = self.get_runnable()

    @property
    def input_schema(self) -> bool:
        return self._input_schema

    @input_schema.setter
    def input_schema(self, input_schema) -> None:
        self._input_schema = input_schema

    @property
    def response_jsonpath(self) -> bool:
        return self._response_jsonpath

    @response_jsonpath.setter
    def response_jsonpath(self, response_jsonpath) -> None:
        self._response_jsonpath = response_jsonpath

    @property
    def endpoint_params(self) -> bool:
        return self._endpoint_params

    @endpoint_params.setter
    def endpoint_params(self, endpoint_params) -> None:
        self._endpoint_params = endpoint_params

    def get_llm(self, condense_prompt_model: bool = False, *args, **kwargs) -> SagemakerEndpoint:
        """
        Creates a SagemakerEndpoint LLM based on supplied params
        Args: None

        Returns:
            (SagemakerEndpoint) The created LangChain LLM object that can be invoked in a conversation chain
        """
        sagemaker_client = get_service_client("sagemaker-runtime")
        content_handler = SageMakerContentHandler(
            input_schema=self.input_schema,
            output_path_expression=self.response_jsonpath,
        )
        streaming = False if condense_prompt_model else self.streaming

        return SagemakerEndpoint(
            endpoint_name=self.sagemaker_endpoint_name,
            client=sagemaker_client,
            model_kwargs=self.model_params,
            content_handler=content_handler,
            streaming=streaming,
            endpoint_kwargs=self.endpoint_params,
        )

    @tracer.capture_method(capture_response=True)
    def get_clean_model_params(self, model_params: Dict[str, Any]) -> Tuple[Dict[str, Any], Dict[str, Any]]:
        """
        Sanitizes and returns the model params and endpoint params for use with SageMaker models.

        Args:
            model_params (Dict): the model params that must be cleaned, for example: { param_name: param_value }

        Returns:
            (Dict): Sanitized model params
        """
        sanitized_model_params = super().get_clean_model_params(model_params)
        # TEMPERATURE_PLACEHOLDER is replaced in the input_schema using a lookup of TEMPERATURE_PLACEHOLDER_STR
        # in model input schema
        sanitized_endpoint_params = {}

        # sanitized_model_params contains model params and endpoint params which are sent separately to SagemakerEndpoint.
        # The endpoint params are removed from sanitized_model_params and added to sanitized_endpoint_params dict
        for arg in SAGEMAKER_ENDPOINT_ARGS:
            if arg in sanitized_model_params:
                sanitized_endpoint_params[arg] = sanitized_model_params[arg]
                del sanitized_model_params[arg]

        if self.temperature:
            sanitized_model_params[TEMPERATURE_PLACEHOLDER_STR] = self.temperature
        return sanitized_model_params, sanitized_endpoint_params

    @tracer.capture_method(capture_response=True)
    def generate(self, question: str) -> Dict[str, Any]:
        """@overrides parent class's generate for a RAG implementation and adds specific error handling

        Args:
            question (str): the question that should be sent to the LLM model

        Returns:
            (Dict): The LLM response message as a dictionary with the relevant source documents
            Response dict form:
            {
             "answer": str,
             "source_documents": List[Dict],
             "rephrased_query": str, (only if disambiguation is enabled)
            }
        """
        error_message = f"Error occurred while invoking SageMaker endpoint: '{self.sagemaker_endpoint_name}'. "

        try:
            return super().generate(question)
        except ValueError as ve:
            error_message = error_message + str(ve)
            logger.error(
                error_message,
                xray_trace_id=os.environ[TRACE_ID_ENV_VAR],
            )
            metrics.add_metric(name=CloudWatchMetrics.LANGCHAIN_FAILURES.value, unit=MetricUnit.Count, value=1)
            raise LLMInvocationError(error_message)
        except Exception as ex:
            error_message = error_message + str(ex)
            logger.error(error_message, xray_trace_id=os.environ[TRACE_ID_ENV_VAR])
            metrics.add_metric(name=CloudWatchMetrics.LANGCHAIN_FAILURES.value, unit=MetricUnit.Count, value=1)
            raise LLMInvocationError(error_message)
        finally:
            metrics.flush_metrics()
