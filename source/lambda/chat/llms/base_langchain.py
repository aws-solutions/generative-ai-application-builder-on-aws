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
from abc import ABC, abstractmethod
from typing import Any, Dict, List, Optional, Tuple

from aws_lambda_powertools import Logger, Tracer
from aws_lambda_powertools.metrics import MetricUnit
from langchain.chains import ConversationChain
from langchain.prompts import PromptTemplate
from langchain.schema import BaseMemory
from langchain_core.language_models.llms import LLM
from shared.knowledge.knowledge_base import KnowledgeBase
from utils.constants import (
    DEFAULT_PLACEHOLDERS,
    DEFAULT_RAG_ENABLED_MODE,
    DEFAULT_RAG_PLACEHOLDERS,
    DEFAULT_STREAMING_MODE,
    DEFAULT_TEMPERATURE,
    DEFAULT_VERBOSE_MODE,
    TRACE_ID_ENV_VAR,
)
from utils.enum_types import CloudWatchMetrics, CloudWatchNamespaces
from utils.helpers import get_metrics_client, type_cast, validate_prompt_placeholders

tracer = Tracer()
logger = Logger(utc=True)
metrics = get_metrics_client(CloudWatchNamespaces.LANGCHAIN_LLM)


class BaseLangChainModel(ABC):
    """
    Represents the interface that the implementing models should follow for consistent behavior

    Attributes:
        api_token (str): Underlying API token, which can be obtained from the HuggingFace Hub
        streaming (bool): A boolean which represents whether the chat is streaming or not [optional, default value is DEFAULT_STREAMING_MODE]
        verbose (bool): A boolean which represents whether the chat is verbose or not [optional, default value is DEFAULT_VERBOSE_MODE]
        temperature (float): A non-negative float that tunes the degree of randomness in model response generation [optional, defaults to DEFAULT_TEMPERATURE]
        rag_enabled (bool): A boolean which represents whether the RAG is enabled or not [optional, defaults to DEFAULT_RAG_ENABLED_MODE]

    Methods:
        Specific implementation must be provided by the implementing class for the following abstract methods:
        get_conversation_chain(): Creates a `ConversationChain` chain that is connected to a conversation memory and the specified prompt
        get_validated_prompt(prompt_template, prompt_template_placeholders, default_prompt_template, default_prompt_template_placeholders): Generates the PromptTemplate using
            the provided prompt template and placeholders. In case of errors, falls back on default values.
        prompt(): Returns the prompt set on the underlying LLM
        memory_buffer(): Returns the conversation memory buffer for the underlying LLM

    """

    def __init__(
        self,
        api_token: Optional[str] = None,
        rag_enabled: Optional[bool] = DEFAULT_RAG_ENABLED_MODE,
        streaming: Optional[bool] = DEFAULT_STREAMING_MODE,
        verbose: Optional[bool] = DEFAULT_VERBOSE_MODE,
        temperature: Optional[float] = None,
    ) -> None:
        self.api_token = api_token
        self.rag_enabled = rag_enabled
        self.streaming = streaming
        self.verbose = verbose
        self.temperature = float(temperature) if temperature is not None else DEFAULT_TEMPERATURE

    @property
    def api_token(self) -> str:
        return self._api_token

    @api_token.setter
    def api_token(self, api_token) -> None:
        self._api_token = api_token

    @property
    def streaming(self) -> bool:
        return self._streaming

    @streaming.setter
    def streaming(self, streaming) -> None:
        self._streaming = streaming

    @property
    def verbose(self) -> bool:
        return self._verbose

    @verbose.setter
    def verbose(self, verbose) -> None:
        self._verbose = verbose

    @property
    def conversation_chain(self) -> ConversationChain:
        return self._conversation_chain

    @conversation_chain.setter
    def conversation_chain(self, conversation_chain) -> None:
        self._conversation_chain = conversation_chain

    @property
    def prompt(self) -> str:
        return self.conversation_chain.prompt.template

    @property
    def memory_buffer(self) -> str:
        return self.conversation_chain.memory.buffer

    @property
    def conversation_memory(self) -> BaseMemory:
        return self._conversation_memory

    @conversation_memory.setter
    def conversation_memory(self, conversation_memory) -> None:
        self._conversation_memory = conversation_memory

    @property
    def knowledge_base(self) -> KnowledgeBase:
        return self._knowledge_base

    @knowledge_base.setter
    def knowledge_base(self, knowledge_base) -> None:
        self._knowledge_base = knowledge_base

    @property
    def model_params(self) -> Dict:
        return self._model_params

    @model_params.setter
    def model_params(self, model_params) -> None:
        self._model_params = model_params

    @property
    def temperature(self) -> float:
        return self._temperature

    @temperature.setter
    def temperature(self, temperature) -> None:
        self._temperature = temperature

    @property
    def model(self) -> str:
        return self._model

    @model.setter
    def model(self, model) -> None:
        self._model = model

    @property
    def llm(self) -> str:
        return self._llm

    @llm.setter
    def llm(self, llm) -> None:
        self._llm = llm

    @property
    def stop_sequences(self) -> List[str]:
        return self._stop_sequences

    @stop_sequences.setter
    def stop_sequences(self, stop_sequences) -> None:
        self._stop_sequences = stop_sequences

    @property
    def prompt_template(self) -> PromptTemplate:
        return self._prompt_template

    @prompt_template.setter
    def prompt_template(self, prompt_template) -> None:
        default_prompt_placeholders = DEFAULT_RAG_PLACEHOLDERS if self.rag_enabled else DEFAULT_PLACEHOLDERS
        default_prompt_template = self.model_defaults.prompt
        prompt_placeholders = self._prompt_template_placeholders

        if prompt_template is None:
            message = f"Prompt template not provided. Falling back to default prompt template"
            logger.info(message, xray_trace_id=os.environ[TRACE_ID_ENV_VAR])
            prompt_template = self.model_defaults.prompt
            prompt_placeholders = default_prompt_placeholders

        self._prompt_template, self._prompt_template_placeholders = self.get_validated_prompt(
            prompt_template, prompt_placeholders, default_prompt_template, default_prompt_placeholders
        )

    @property
    def prompt_template_placeholders(self) -> List[str]:
        return self._prompt_template_placeholders

    @property
    def callbacks(self) -> List:
        return self._callbacks

    @callbacks.setter
    def callbacks(self, callbacks) -> None:
        self._callbacks = callbacks

    @property
    def rag_enabled(self) -> bool:
        return self._rag_enabled

    @rag_enabled.setter
    def rag_enabled(self, rag_enabled) -> None:
        self._rag_enabled = rag_enabled

    def prompt(self) -> str:
        """
        Fetches the LLM's prompt template for the conversation
        Args: None
        Returns:
            str: the prompt template for the model
        """
        return self.prompt_template.template

    def memory_buffer(self) -> str:
        """
        Fetches the memory buffer of the model containing the conversation, context, etc.
        Args: None
        Returns:
            str: the memory buffer of the model
        """
        return self.conversation_memory.buffer

    def get_conversation_chain(self) -> ConversationChain:
        """
        Creates a `ConversationChain` chain that is connected to a conversation memory and the specified prompt
        Args: None

        Returns:
            ConversationChain: An LLM chain that is chain that is connected to a conversation memory
        """
        return ConversationChain(
            llm=self.llm, verbose=self.verbose, memory=self.conversation_memory, prompt=self.prompt_template
        )

    @tracer.capture_method(capture_response=True)
    def generate(self, question: str) -> Dict[str, Any]:
        """
        Fetches the response from the LLM

        Args:
            question (str): the question that should be sent to the LLM model

        Returns:
            (Dict): The LLM chat response message as a dictionary (with the relevant source documents if the model is RAG)
            Response dict form:
            {
             "answer": str,
             "source_documents": List[Dict] # Optional key applicable for RAG child classes.
            }
        """
        logger.debug(f"Prompt for LLM: {self.prompt_template.template}")
        with tracer.provider.in_subsegment("## llm_chain") as subsegment:
            subsegment.put_annotation("library", "langchain")
            subsegment.put_annotation("operation", "ConversationChain")
            metrics.add_metric(name=CloudWatchMetrics.LANGCHAIN_QUERY.value, unit=MetricUnit.Count, value=1)
            start_time = time.time()
            response = self.conversation_chain.predict(input=question)
            end_time = time.time()

            metrics.add_metric(
                name=CloudWatchMetrics.LANGCHAIN_QUERY_PROCESSING_TIME.value,
                unit=MetricUnit.Seconds,
                value=(end_time - start_time),
            )
            logger.debug(f"LLM response: {response}")
            metrics.flush_metrics()
            return {"answer": response.strip()}

    def get_validated_prompt(
        self,
        prompt_template: str,
        prompt_template_placeholders: List[str],
        default_prompt_template: str,
        default_prompt_template_placeholders: List[str],
    ) -> Tuple[PromptTemplate, List[str]]:
        """
        Generates the PromptTemplate using the provided prompt template and default placeholders.
        If template is not set or if it is invalid, use the default.
        Args:
            prompt_template (str): the prompt template to be used
            prompt_template_placeholders List[str]: the list of prompt template placeholders
            default_prompt_template (str): the default prompt template to be used in case of failures
            default_prompt_template_placeholders (List[str]): the list of default prompt template placeholders to be used in case of failures
        Returns:
            PromptTemplate: the prompt template object with the prompt template and placeholders set
            List[str]: the list of prompt template placeholders
        """
        try:
            if prompt_template and prompt_template_placeholders:
                if self.rag_enabled:
                    # ConversationRetrievalChain expects the placeholders to be "question" and "chat_history" instead of "input" and "history"
                    prompt_template = prompt_template.replace("{input}", "{question}").replace(
                        "{history}", "{chat_history}"
                    )
                else:
                    if "{context}" in prompt_template:
                        error = f"Provided 'context' placeholder in prompt template for non-RAG use case: {prompt_template}."
                        raise ValueError(error)

                validate_prompt_placeholders(prompt_template, prompt_template_placeholders)
                prompt_template_text = prompt_template
                placeholders = prompt_template_placeholders

            else:
                message = f"Prompt template not provided. Falling back to default prompt template"
                logger.info(message, xray_trace_id=os.environ[TRACE_ID_ENV_VAR])
                prompt_template_text = default_prompt_template
                placeholders = default_prompt_template_placeholders

        except ValueError as ex:
            logger.error(
                f"Prompt validation failed: {ex}. Falling back to default prompt template.",
                xray_trace_id=os.environ[TRACE_ID_ENV_VAR],
            )
            prompt_template_text = default_prompt_template
            placeholders = default_prompt_template_placeholders

        finally:
            metrics.flush_metrics()
        return (
            PromptTemplate(template=prompt_template_text, input_variables=placeholders),
            placeholders,
        )

    @tracer.capture_method(capture_response=True)
    def get_clean_model_params(self, model_params) -> Dict:
        """
        Sanitizes the model parameters. Implementation is model specific
        Args: None
        Returns: None
        """
        try:
            if not model_params:
                return {}

            sanitized_model_params = {}

            for param_name, param_value in model_params.items():
                if param_name is not None and param_value is not None:
                    # If type_cast fails, error is logged and CloudWatchMetrics.INCORRECT_INPUT_FAILURES.value is incremented.
                    # Method returns None and the parameter is skipped from being used in the model, instead of causing a failure.
                    sanitized_param_value = type_cast(param_value.get("Value"), param_value.get("Type"))
                    if sanitized_param_value:
                        sanitized_model_params[param_name] = sanitized_param_value
                else:
                    logger.error(
                        f"Malformed model parameters received with parameter name: {param_name} and value: {param_value}",
                        xray_trace_id=os.environ[TRACE_ID_ENV_VAR],
                    )
                    metrics.add_metric(
                        name=CloudWatchMetrics.INCORRECT_INPUT_FAILURES.value, unit=MetricUnit.Count, value=1
                    )
        finally:
            metrics.flush_metrics()

        return sanitized_model_params

    @abstractmethod
    def get_llm(self, condense_prompt_model: bool = False) -> LLM:
        """
        Creates an LangChain LLM based on supplied params. Child classes must provide an implementation of this method.
        Args:
             condense_prompt_model (bool): Flag that indicates whether to create a model for regular chat or
                for condensing the prompt for RAG use-cases.
                callbacks and streaming are disabled when this flag is set to True

        Returns:
            LangChain LLM object that can be invoked in a conversation chain
        """
