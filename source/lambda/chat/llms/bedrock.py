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
from typing import Any, Dict, Optional

from aws_lambda_powertools import Logger, Tracer
from aws_lambda_powertools.metrics import MetricUnit
from helper import get_service_client
from langchain.llms.bedrock import Bedrock
from llms.base_langchain import BaseLangChainModel
from llms.factories.bedrock_adapter_factory import BedrockAdapterFactory
from llms.models.llm import LLM
from shared.defaults.model_defaults import ModelDefaults
from utils.constants import (
    DEFAULT_BEDROCK_MODEL_FAMILY,
    DEFAULT_BEDROCK_MODELS_MAP,
    DEFAULT_RAG_ENABLED_MODE,
    TRACE_ID_ENV_VAR,
)
from utils.custom_exceptions import LLMBuildError, LLMInvocationError
from utils.enum_types import BedrockModelProviders, CloudWatchMetrics, CloudWatchNamespaces
from utils.helpers import get_metrics_client

tracer = Tracer()
logger = Logger(utc=True)
metrics = get_metrics_client(CloudWatchNamespaces.LANGCHAIN_LLM)


class BedrockLLM(BaseLangChainModel):
    """
    BedrockLLM is a wrapper around the LangChain Bedrock API which can generate chat responses, provided a conversation memory.

    Attributes:
        - llm_params: LLM dataclass object which has the following:
            api_token (str): Set to None for Bedrock models. Not required for Bedrock as a Bedrock client is used to invoke the Bedrock models.
            conversation_memory (BaseMemory): A BaseMemory object which helps store and access user chat history
            knowledge_base (KnowledgeBase): A KnowledgeBase object which retrieves information from the user's knowledge base for LLM context. This
               field is only used when the child class BedrockRetrievalLLM passes this value, else for regular non-RAG chat this is set to None.
            model (str): Bedrock model name that represents the underlying LLM model [optional, defaults to DEFAULT_BEDROCK_MODELS_MAP defined default]
            model_params (dict): A dictionary of model parameters, which can be obtained from the Bedrock documentation [optional]
            prompt_template (str): A string which represents the prompt template [optional, defaults to prompt template provided in ModelInfoStorage DynamoDB table]
            streaming (bool): A boolean which represents whether the chat is streaming or not [optional, defaults to value provided in ModelInfoStorage DynamoDB table]
            verbose (bool): A boolean which represents whether the chat is verbose or not [optional, defaults to DEFAULT_VERBOSE_MODE]
            temperature (float): A non-negative float that tunes the degree of randomness in model response generation [optional, defaults to temperature
                provided in ModelInfoStorage DynamoDB table]
            callbacks (list): A list of BaseCallbackHandler objects which are used for the LLM model callbacks [optional, defaults to None]

        - model_defaults (ModelDefaults): A ModelDefaults object which contains default values for the model retrieved from ModelInfoStorage DynamoDB table
        - model_family (BedrockModelProviders): A string which represents the model family [optional, defaults to DEFAULT_BEDROCK_MODEL_FAMILY]. When model_family
            is not provided, whether the model is provided or not, the model will be set to the default model within the DEFAULT_BEDROCK_MODEL_FAMILY
        - rag_enabled (bool): A boolean which represents whether the RAG is enabled or not [optional, defaults to DEFAULT_RAG_ENABLED_MODE]

    Methods:
        generate(question): Generates a chat response
        get_conversation_chain(): Creates a `ConversationChain` chain that is connected to a conversation memory and the specified prompt
        get_validated_prompt(prompt_template, prompt_template_placeholders, default_prompt_template, default_prompt_template_placeholders): Generates the PromptTemplate using
            the provided prompt template and placeholders. In case of errors, falls back on default values.
        get_clean_model_params(): Sanitizes the model params for use with the Bedrock model.
        prompt(): Returns the prompt set on the underlying LLM
        memory_buffer(): Returns the conversation memory buffer for the underlying LLM

    See Bedrock model parameters documentation for supported model arguments: https://docs.aws.amazon.com/bedrock/latest/userguide/model-parameters.html
    """

    def __init__(
        self,
        llm_params: LLM,
        model_defaults: ModelDefaults,
        model_family: BedrockModelProviders = None,
        rag_enabled: Optional[bool] = DEFAULT_RAG_ENABLED_MODE,
    ) -> None:
        super().__init__(
            rag_enabled=rag_enabled,
            streaming=llm_params.streaming,
            verbose=llm_params.verbose,
            temperature=llm_params.temperature,
        )
        self.model_defaults = model_defaults
        self.temperature = (
            self.model_defaults.default_temperature if self.temperature is None else float(self.temperature)
        )
        self.streaming = self.model_defaults.allows_streaming if self.streaming is None else self.streaming
        self.model_defaults = model_defaults
        self._prompt_template_placeholders = llm_params.prompt_placeholders
        self.prompt_template = llm_params.prompt_template
        self.conversation_memory = llm_params.conversation_memory
        self.knowledge_base = llm_params.knowledge_base
        self.callbacks = llm_params.callbacks or None

        if llm_params.model is not None and model_family is not None and len(llm_params.model) and len(model_family):
            self.model = llm_params.model
            self.model_family = model_family
        else:
            self.model = DEFAULT_BEDROCK_MODELS_MAP[DEFAULT_BEDROCK_MODEL_FAMILY]
            self.model_family = DEFAULT_BEDROCK_MODEL_FAMILY

        self.model_params = self.get_clean_model_params(llm_params.model_params)
        self.llm = self.get_llm()
        self.conversation_chain = self.get_conversation_chain()

    @property
    def model_family(self) -> str:
        return self._model_family

    @model_family.setter
    def model_family(self, model_family) -> None:
        self._model_family = model_family

    def get_llm(self, condense_prompt_model: bool = False) -> Bedrock:
        """
        Creates a LangChain `LLM` object which is used to generate chat responses.

        Args:
            condense_prompt_model (bool): Flag that indicates whether to create a model for regular chat or
                for condensing the prompt for RAG use-cases.
                callbacks and streaming are disabled when this flag is set to True

        Returns:
            (Bedrock) The created LangChain LLM object that can be invoked in a conversation chain
        """
        bedrock_client = get_service_client("bedrock-runtime")

        # condense_prompt_model refers to the model used for condensing a prompt for RAG use-cases
        # callbacks and streaming is disabled for this model
        streaming = False if condense_prompt_model else self.streaming
        callbacks = None if condense_prompt_model else self.callbacks

        return Bedrock(
            client=bedrock_client,
            model_id=self.model,
            model_kwargs=self.model_params,
            streaming=streaming,
            callbacks=callbacks,
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
        error_message = f"Error occurred while invoking {self.model_family} {self.model} model. "
        try:
            return super().generate(question)
        except Exception as ex:
            error_message = error_message + str(ex)
            logger.error(
                error_message,
                xray_trace_id=os.environ[TRACE_ID_ENV_VAR],
            )
            metrics.add_metric(name=CloudWatchMetrics.LANGCHAIN_FAILURES, unit=MetricUnit.Count, value=1)
            raise LLMInvocationError(error_message)
        finally:
            metrics.flush_metrics()

    def get_clean_model_params(self, model_params) -> Dict[str, Any]:
        """
        Sanitizes and returns the model params for use with Bedrock models.
        Called as a part of the __init__ method.

        Args:
            model_params (Dict): the model params that must be cleaned. For example, for Amazon Titan: {"maxTokenCount": 250}

        Returns:
            (Dict): Sanitized model params
        """
        sanitized_model_params = super().get_clean_model_params(model_params)
        sanitized_model_params["temperature"] = self.temperature
        bedrock_adapter = BedrockAdapterFactory().get_bedrock_adapter(self.model_family)
        sanitized_model_params["temperature"] = float(self.temperature)

        try:
            bedrock_llm_params_dict = bedrock_adapter(
                **sanitized_model_params, model_defaults=self.model_defaults
            ).get_params_as_dict()
        except TypeError as error:
            error_message = (
                f"Error occurred while building Bedrock {self.model_family} {self.model} Model. "
                "Ensure that the model params provided are correct and they match the model specification. "
                f"Received params: {sanitized_model_params}. Error: {error}"
            )
            logger.error(error_message)
            raise LLMBuildError(error_message)

        stop_sequence_keys = ["stop_sequences", "stopSequences"]
        self.stop_sequences = []
        for stop in stop_sequence_keys:
            if stop in bedrock_llm_params_dict:
                self.stop_sequences = bedrock_llm_params_dict[stop]
                break

        return bedrock_llm_params_dict
