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

import os
from typing import Any, Dict, Optional, Tuple

from aws_lambda_powertools import Logger, Tracer
from aws_lambda_powertools.metrics import MetricUnit
from helper import get_service_client
from langchain_community.llms.sagemaker_endpoint import SagemakerEndpoint
from llms.base_langchain import BaseLangChainModel
from llms.models.llm import LLM
from llms.models.sagemaker.content_handler import SageMakerContentHandler
from pydantic_core import ValidationError
from shared.defaults.model_defaults import ModelDefaults
from utils.constants import (
    DEFAULT_RAG_ENABLED_MODE,
    SAGEMAKER_ENDPOINT_ARGS,
    TEMPERATURE_PLACEHOLDER_STR,
    TRACE_ID_ENV_VAR,
)
from utils.custom_exceptions import LLMBuildError, LLMInvocationError
from utils.enum_types import CloudWatchMetrics, CloudWatchNamespaces
from utils.helpers import get_metrics_client

tracer = Tracer()
logger = Logger(utc=True)
metrics = get_metrics_client(CloudWatchNamespaces.LANGCHAIN_LLM)


class SageMakerLLM(BaseLangChainModel):
    """
    SageMakerLLM is a wrapper around the the SageMaker LLM invocation and can generate chat responses, provided a conversation memory.

    Attributes:
        - llm_params: LLM dataclass object which has the following:
            api_token (str): Set to None for SageMaker models. Not required for SageMaker as a SageMaker client is used to invoke the SageMaker models.
            conversation_memory (BaseMemory): A BaseMemory object which helps store and access user chat history
            knowledge_base (KnowledgeBase): A KnowledgeBase object which retrieves information from the user's knowledge base for LLM context. This
               field is only used when the child class SageMakerRetrievalLLM passes this value, else for regular non-RAG chat this is set to None.
            model_params (dict): A dictionary of model parameters, which can be obtained from the SageMaker Hub documentation [optional]
            prompt_template (str): A string which represents the prompt template [optional, defaults to prompt template provided in ModelInfoStorage DynamoDB table]
            streaming (bool): A boolean which represents whether the chat is streaming or not [optional, defaults to streaming value provided in ModelInfoStorage
                DynamoDB table]
            verbose (bool): A boolean which represents whether the chat is verbose or not [optional, defaults to DEFAULT_VERBOSE_MODE]
            temperature (float): A non-negative float that tunes the degree of randomness in model response generation [optional, defaults to temperature provided in
                ModelInfoStorage DynamoDB table]

        - model_defaults (ModelDefaults): A ModelDefaults object which contains default values for the model retrieved from ModelInfoStorage DynamoDB table
        - sagemaker_endpoint_name (str): A string which represents the SageMaker endpoint name. The SageMaker endpoint is invoked with the user inputs to get
            chat responses
        - input_schema (dict): A dictionary of input schema for the SageMaker endpoint. This is passed to SageMaker Content Handler.
            The content handler is used to transform the input to the SageMaker endpoint as it expects, and then retrieve the response from the JSON response received.
            The input_schema represents the schema of the input to the SageMaker endpoint. The response_jsonpath below represents the path for the text output from the
            SageMaker endpoint. See SageMakerContentHandler for more information and examples available at llms/models/sagemaker/content_handler.py
        - response_jsonpath (str): A string which represents the jsonpath for the chat text output from the SageMaker endpoint
        - rag_enabled (bool): A boolean which represents whether the RAG is enabled or not [optional, defaults to DEFAULT_RAG_ENABLED_MODE]

    Methods:
        generate(question): Generates a chat response
        get_conversation_chain(): Creates a `ConversationChain` chain that is connected to a conversation memory and the specified prompt
        get_validated_prompt(prompt_template, prompt_template_placeholders, default_prompt_template, default_prompt_template_placeholders): Generates the PromptTemplate using
            the provided prompt template and placeholders. In case of errors, falls back on default values.
        get_clean_params(): Sanitizes the model params for use with the model. SageMakerLLM also allows you to send additional endpoint arguments to the SageMaker Endpoint
            as specified in SAGEMAKER_ENDPOINT_ARGS. These keys are sent to the 'SagemakerEndpoint' class which is used to invoke the SageMaker endpoint.
            See boto3 documentation for InvokeEndpointWithResponseStream (https://docs.aws.amazon.com/sagemaker/latest/APIReference/API_runtime_InvokeEndpointWithResponseStream.html)
            and InvokeEndpoint (https://docs.aws.amazon.com/sagemaker/latest/APIReference/API_runtime_InvokeEndpoint.html) documentation -- these are the underlying APIs called for
            streaming and non-streaming SageMaker model invocations respectively.

    See SageMaker documentation for information on sagemaker endpoints. You can also browse specific model notebooks to infer model input_schema and response_jsonpath
    """

    def __init__(
        self,
        llm_params: LLM,
        model_defaults: ModelDefaults,
        sagemaker_endpoint_name: Optional[str],
        input_schema=Dict[str, Any],
        response_jsonpath=str,
        rag_enabled: Optional[bool] = DEFAULT_RAG_ENABLED_MODE,
    ) -> None:
        super().__init__(
            rag_enabled=rag_enabled,
            streaming=llm_params.streaming,
            verbose=llm_params.verbose,
            temperature=llm_params.temperature,
        )
        self.streaming = model_defaults.allows_streaming if self.streaming is None else self.streaming
        self.model = llm_params.model
        self.model_defaults = model_defaults
        self._prompt_template_placeholders = llm_params.prompt_placeholders
        self.prompt_template = llm_params.prompt_template
        self.conversation_memory = llm_params.conversation_memory
        self.knowledge_base = llm_params.knowledge_base
        self.callbacks = llm_params.callbacks or None

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

        try:
            self._llm = self.get_llm()
        except Exception as ex:
            logger.error(
                ex,
                xray_trace_id=os.environ[TRACE_ID_ENV_VAR],
            )
            raise LLMBuildError(f"SageMaker model construction failed. Error: {ex}")
        finally:
            metrics.flush_metrics()

        self._conversation_chain = self.get_conversation_chain()

    @property
    def sagemaker_endpoint_name(self) -> bool:
        return self._sagemaker_endpoint_name

    @sagemaker_endpoint_name.setter
    def sagemaker_endpoint_name(self, sagemaker_endpoint_name) -> None:
        self._sagemaker_endpoint_name = sagemaker_endpoint_name

    @property
    def input_schema(self) -> Dict[str, Any]:
        return self._input_schema

    @property
    def response_jsonpath(self) -> str:
        return self._response_jsonpath

    @property
    def endpoint_params(self) -> Dict[str, Any]:
        return self._endpoint_params

    def get_llm(self, condense_prompt_model: bool = False) -> SagemakerEndpoint:
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

        callbacks = None if condense_prompt_model else self.callbacks
        streaming = False if condense_prompt_model else self.streaming

        return SagemakerEndpoint(
            endpoint_name=self.sagemaker_endpoint_name,
            client=sagemaker_client,
            model_kwargs=self.model_params,
            content_handler=content_handler,
            streaming=streaming,
            callbacks=callbacks,
            endpoint_kwargs=self.endpoint_params,
        )

    @tracer.capture_method(capture_response=True)
    def generate(self, question: str) -> Dict[str, Any]:
        """
        Fetches the response from the LLM

        Args:
            question (str): the question that should be sent to the LLM model

        Returns:
            (Dict): The LLM chat response message as a dictionary with the key `answer`
        """
        error_message = f"Error occurred while invoking SageMaker endpoint: '{self.sagemaker_endpoint_name}'. "
        try:
            return super().generate(question)
        except ValidationError as ve:
            error_message = (
                error_message
                + f"Ensure that the input schema and output path expressions are correct for your SageMaker model. Error: {ve}"
            )
            logger.error(error_message, xray_trace_id=os.environ[TRACE_ID_ENV_VAR])
            metrics.add_metric(name=CloudWatchMetrics.LANGCHAIN_FAILURES.value, unit=MetricUnit.Count, value=1)
            raise LLMInvocationError(error_message)
        except Exception as ex:
            error_message = error_message + str(ex)
            logger.error(error_message, xray_trace_id=os.environ[TRACE_ID_ENV_VAR])
            metrics.add_metric(name=CloudWatchMetrics.LANGCHAIN_FAILURES.value, unit=MetricUnit.Count, value=1)
            raise LLMInvocationError(error_message)
        finally:
            metrics.flush_metrics()

    @tracer.capture_method(capture_response=True)
    def get_clean_params(self, model_params: Dict[str, Any]) -> Tuple[Dict[str, Any], Dict[str, Any]]:
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
