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
import time
from typing import Any, Dict, List, Optional

from aws_lambda_powertools import Logger, Metrics, Tracer
from aws_lambda_powertools.metrics import MetricUnit
from helper import get_service_client
from langchain.callbacks.base import BaseCallbackHandler
from langchain.llms import Bedrock
from langchain.llms.base import LLM
from langchain.schema import BaseMemory
from llm_models.base_langchain import BaseLangChainModel
from llm_models.factories.bedrock_adapter_factory import BedrockAdapterFactory
from shared.knowledge.knowledge_base import KnowledgeBase
from utils.constants import (
    BEDROCK_MODEL_MAP,
    DEFAULT_BEDROCK_MODEL_FAMILY,
    DEFAULT_BEDROCK_PLACEHOLDERS,
    DEFAULT_BEDROCK_PROMPT,
    DEFAULT_BEDROCK_RAG_PLACEHOLDERS,
    DEFAULT_BEDROCK_RAG_PROMPT,
    DEFAULT_BEDROCK_STREAMING_MODE,
    DEFAULT_BEDROCK_TEMPERATURE_MAP,
    DEFAULT_VERBOSE_MODE,
    METRICS_SERVICE_NAME,
    TRACE_ID_ENV_VAR,
)
from utils.custom_exceptions import LLMBuildError
from utils.enum_types import BedrockModelProviders, CloudWatchMetrics, CloudWatchNamespaces

tracer = Tracer()
logger = Logger(utc=True)
metrics = Metrics(namespace=CloudWatchNamespaces.LANGCHAIN_LLM, service=METRICS_SERVICE_NAME)


class BedrockLLM(BaseLangChainModel):
    """
    BedrockLLM is a wrapper around the Langchain Bedrock API which can generate chat responses, provided a conversation memory
    and knowledge base.

    Attributes:
        conversation_memory (BaseMemory): A BaseMemory object which helps store and access user chat history
        knowledge_base (KnowledgeBase): A KnowledgeBase object which retrieves information from the user's knowledge base for LLM context
        model_family (BedrockModelProviders): A string which represents the model family [optional, defaults to DEFAULT_BEDROCK_MODEL_FAMILY]
        model (str): Bedrock model name that represents the underlying LLM model [optional, defaults to DEFAULT_ANTHROPIC_MODEL]
        model_params (dict): A dictionary of model parameters, which can be obtained from the Bedrock documentation [optional]
        prompt_template (str): A string which represents the prompt template [optional, defaults to DEFAULT_ANTHROPIC_PROMPT or DEFAULT_ANTHROPIC_RAG_PROMPT]
        streaming (bool): A boolean which represents whether the chat is streaming or not [optional, defaults to DEFAULT_ANTHROPIC_STREAMING_MODE]
        verbose (bool): A boolean which represents whether the chat is verbose or not [optional, defaults to DEFAULT_VERBOSE_MODE]
        temperature (float): A non-negative float that tunes the degree of randomness in model response generation [optional, defaults to DEFAULT_ANTHROPIC_TEMPERATURE]
        callbacks (list): A list of BaseCallbackHandler objects which are used for the LLM model callbacks [optional, defaults to None]
        rag_enabled (bool): A boolean which represents whether the RAG is enabled or not [optional, defaults to False]

    Methods:
        validate_not_null(kwargs): Validates that the supplied values are not null or empty.
        generate(question): Generates a chat response
        get_conversation_chain(): Creates a `ConversationChain` chain that is connected to a conversation memory and the specified prompt
        get_prompt_details(prompt_template, default_prompt_template, default_prompt_template_placeholder): Generates the PromptTemplate using
            the provided prompt template and placeholders
        get_clean_model_params(): Sanitizes the model params for use with the Bedrock model.
        prompt(): Returns the prompt set on the underlying LLM
        memory_buffer(): Returns the conversation memory buffer for the underlying LLM
    """

    def __init__(
        self,
        conversation_memory: BaseMemory,
        knowledge_base: KnowledgeBase,
        model_family: BedrockModelProviders = DEFAULT_BEDROCK_MODEL_FAMILY,
        model: Optional[str] = None,
        model_params: Optional[dict] = None,
        prompt_template: Optional[str] = None,
        streaming: Optional[bool] = DEFAULT_BEDROCK_STREAMING_MODE,
        verbose: Optional[bool] = DEFAULT_VERBOSE_MODE,
        temperature: Optional[float] = None,
        callbacks: Optional[List[BaseCallbackHandler]] = None,
        rag_enabled: Optional[bool] = False,
    ) -> None:
        self.temperature = temperature if temperature is not None else DEFAULT_BEDROCK_TEMPERATURE_MAP[model_family]
        super().__init__(rag_enabled=rag_enabled, streaming=streaming, verbose=verbose, temperature=temperature)
        self._conversation_memory = conversation_memory
        self._knowledge_base = knowledge_base
        self._callbacks = callbacks or None
        self._model_family = model_family
        self._model = model if model else BEDROCK_MODEL_MAP[model_family]["DEFAULT"]

        default_prompt = (
            DEFAULT_BEDROCK_RAG_PROMPT[model_family] if rag_enabled else DEFAULT_BEDROCK_PROMPT[model_family]
        )
        default_prompt_template_placeholders = (
            DEFAULT_BEDROCK_RAG_PLACEHOLDERS if rag_enabled else DEFAULT_BEDROCK_PLACEHOLDERS
        )
        self._prompt_template, self._prompt_template_placeholders = self.get_prompt_details(
            prompt_template, default_prompt, default_prompt_template_placeholders
        )
        self._model_params = self.get_clean_model_params(model_params)
        self._llm = self.get_llm()
        self._conversation_chain = self.get_conversation_chain()

    @property
    def model_family(self) -> str:
        return self._model_family

    @model_family.setter
    def model_family(self, model_family) -> None:
        self._model_family = model_family

    def get_llm(self, condense_prompt_model: bool = False) -> LLM:
        """
        Creates a langchain `LLM` object which is used to generate chat responses.

        Args:
            condense_prompt_model (bool): Flag that indicates whether to create a model for regular chat or
                for condensing the prompt for RAG use-cases.
                callbacks and streaming are disabled when this flag is set to True

        Returns:
            (LLM): The LLM object
        """
        bedrock_client = get_service_client("bedrock-runtime")

        # condense_prompt_model refers to the model used for condensing a prompt for RAG use-cases
        # callbacks and streaming is disabled for it
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
        logger.info(f"Prompt for LLM: {self.prompt_template.template}")
        with tracer.provider.in_subsegment("## llm_chain") as subsegment:
            subsegment.put_annotation("library", "langchain")
            subsegment.put_annotation("operation", "ConversationChain")
            metrics.add_metric(name=CloudWatchMetrics.LANGCHAIN_QUERY, unit=MetricUnit.Count, value=1)
            try:
                start_time = time.time()
                response = self.conversation_chain.predict(input=question)
                end_time = time.time()
                metrics.add_metric(
                    name=CloudWatchMetrics.LANGCHAIN_QUERY_PROCESSING_TIME,
                    unit=MetricUnit.Seconds,
                    value=(end_time - start_time),
                )
                return {"answer": response.strip()}
            except ValueError as ve:
                error_message = "Error raised by bedrock service while building " + self.model_family + f" Model. {ve}"
                logger.error(
                    error_message,
                    xray_trace_id=os.environ[TRACE_ID_ENV_VAR],
                )
                metrics.add_metric(name=CloudWatchMetrics.LANGCHAIN_FAILURES, unit=MetricUnit.Count, value=1)
                raise LLMBuildError(error_message)

            except Exception as ex:
                error_message = "Error raised by bedrock service while building " + self.model_family + f" Model. {ex}"
                logger.error(
                    error_message,
                    xray_trace_id=os.environ[TRACE_ID_ENV_VAR],
                )
                metrics.add_metric(name=CloudWatchMetrics.LANGCHAIN_FAILURES, unit=MetricUnit.Count, value=1)
                raise ex
            finally:
                metrics.flush_metrics()

    def get_clean_model_params(self, model_params) -> Dict[str, Any]:
        """
        Sanitizes and returns the model params for use with Bedrock models.

        Args:
            model_params (Dict): the model params that must be cleaned. For example, for Amazon Titan: {"maxTokenCount": 250}

        Returns:
            (Dict): Sanitized model params
        """
        sanitized_model_params = super().get_clean_model_params(model_params)
        bedrock_adapter = BedrockAdapterFactory().get_bedrock_adapter(self.model_family)
        sanitized_model_params["temperature"] = float(self.temperature)

        try:
            bedrock_llm_params_dict = bedrock_adapter(**sanitized_model_params).get_params_as_dict()
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
