#!/usr/bin/env python
# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

import os
import time
from abc import ABC, abstractmethod
from typing import Any, Dict, List, Union

from aws_lambda_powertools import Logger, Tracer
from aws_lambda_powertools.metrics import MetricUnit
from langchain.schema.runnable import RunnableConfig
from langchain_core.chat_history import BaseChatMessageHistory
from langchain_core.language_models import BaseChatModel
from langchain_core.language_models.llms import LLM
from langchain_core.output_parsers import StrOutputParser
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain_core.runnables import ConfigurableFieldSpec
from langchain_core.runnables.base import RunnableBinding
from langchain_core.runnables.history import RunnableWithMessageHistory

from llms.models.model_provider_inputs import ModelProviderInputs
from shared.defaults.model_defaults import ModelDefaults
from utils.constants import (
    CONVERSATION_ID_KEY,
    CONVERSATION_TRACER_KEY,
    DEFAULT_RAG_ENABLED_MODE,
    DEFAULT_VERBOSE_MODE,
    HISTORY_KEY,
    INPUT_KEY,
    LLM_RESPONSE_KEY,
    MESSAGE_ID_KEY,
    RAG_CONVERSATION_TRACER_KEY,
    TRACE_ID_ENV_VAR,
    USER_ID_KEY,
)
from utils.enum_types import CloudWatchMetrics, CloudWatchNamespaces, LLMProviderTypes
from utils.helpers import get_metrics_client, type_cast, validate_prompt_placeholders

tracer = Tracer()
logger = Logger(utc=True)
metrics = get_metrics_client(CloudWatchNamespaces.LANGCHAIN_LLM)


class BaseLangChainModel(ABC):
    """
    Represents the interface that the implementing models should follow for consistent behavior

    Attributes:
        - model_defaults (ModelDefaults): The default values for the model, as specified on a per-model basis in the source/model-info files
        - model_inputs (ModelProviderInputs): The model inputs that the user provided. Each model_input object consists of all the required properties to deploy a Bedrock model such as the type of Conversation Memory class (DynamoDB for example), the type of knowledge base (Kendra, Bedrock KB, etc.) and their associated properties.

    Methods:
        Specific implementation must be provided by the implementing class for the following abstract methods:

        - get_runnable(): Creates a 'RunnableWithMessageHistory' (in case of non-streaming) or 'RunnableBinding' (in case of streaming) LangChain runnable that is connected to a conversation memory and the specified prompt. In case of Retrieval Augmented Generated (RAG) use cases, this is also connected to a knowledge base.
        - get_session_history(user_id, conversation_id): Retrieves the conversation history from the conversation memory based on the user_id and conversation_id.
        - generate(question, operation): Invokes the LLM to fetch a response for the given question. Operation is used for metrics.
        - get_validated_prompt(prompt_template, prompt_template_placeholders, llm_provider, rag_enabled): Generates the ChatPromptTemplate using the provided prompt template and
          placeholders. In case of errors, raises ValueError
        - get_llm(): Returns the underlying LLM object that is used by the runnable. Each child class must provide its own implementation.
        - get_clean_model_params(): Returns the cleaned and formatted model parameters that are used by the LLM. Each child class must provide its own implementation based on the model parameters it supports.
    """

    def __init__(self, model_defaults: ModelDefaults, model_inputs: ModelProviderInputs) -> None:
        self.model_defaults = model_defaults
        self._model_inputs = model_inputs
        self.rag_enabled = DEFAULT_RAG_ENABLED_MODE if model_inputs.rag_enabled is None else model_inputs.rag_enabled
        self.streaming = (
            self.model_defaults.allows_streaming if model_inputs.streaming is None else model_inputs.streaming
        )
        self.verbose = DEFAULT_VERBOSE_MODE if model_inputs.verbose is None else model_inputs.verbose
        self.temperature = (
            self.model_defaults.default_temperature
            if model_inputs.temperature is None
            else float(model_inputs.temperature)
        )
        self.prompt_template = model_inputs.prompt_template
        self._prompt_placeholders = model_inputs.prompt_placeholders
        self.conversation_history_cls = model_inputs.conversation_history_cls
        self.conversation_history_params = model_inputs.conversation_history_params
        self.callbacks = model_inputs.callbacks or None
        self.model_params = model_inputs.model_params
        self.model = model_inputs.model
        self.llm = None
        self.runnable_with_history = None

    @property
    def prompt_placeholders(self) -> List[str]:
        return self._prompt_placeholders

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
    def runnable_with_history(self) -> Union[RunnableWithMessageHistory, RunnableBinding]:
        return self._runnable_with_history

    @runnable_with_history.setter
    def runnable_with_history(self, runnable_with_history) -> None:
        self._runnable_with_history = runnable_with_history

    @property
    def prompt_template_text(self) -> str:
        if self._prompt_template is not None and self._prompt_template:
            return self._prompt_template.pretty_repr()
        else:
            raise ValueError("Prompt template is empty")

    @property
    def model_defaults(self) -> Dict:
        return self._model_defaults

    @model_defaults.setter
    def model_defaults(self, model_defaults) -> None:
        self._model_defaults = model_defaults

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

    def get_session_history(self, user_id: str, conversation_id: str, message_id: str) -> BaseChatMessageHistory:
        """
        Retrieves the conversation history from the conversation memory based on the user_id and conversation_id.

        Args:
            user_id (str): The unique identifier for the user.
            conversation_id (str): The unique identifier for the conversation.

        Returns:
            BaseChatMessageHistory: The conversation history object.
        """
        self.conversation_history_params[USER_ID_KEY] = user_id
        self.conversation_history_params[CONVERSATION_ID_KEY] = conversation_id
        self.conversation_history_params[MESSAGE_ID_KEY] = message_id
        return self.conversation_history_cls(**self.conversation_history_params)

    def get_runnable(self) -> RunnableBinding:
        """
        Creates a `RunnableBinding` runnable that is connected to a conversation memory and the specified prompt
        Args: None

        Returns:
            RunnableBinding: A runnable that manages chat message history
        """

        chain = self.prompt_template | self.llm | StrOutputParser()

        with_message_history = RunnableWithMessageHistory(
            chain,
            get_session_history=self.get_session_history,
            input_messages_key=INPUT_KEY,
            history_messages_key=HISTORY_KEY,
            history_factory_config=[
                ConfigurableFieldSpec(
                    id=USER_ID_KEY,
                    annotation=str,
                    name="User ID",
                    description="Unique identifier for the user.",
                    default="",
                    is_shared=True,
                ),
                ConfigurableFieldSpec(
                    id=CONVERSATION_ID_KEY,
                    annotation=str,
                    name="Conversation ID",
                    description="Unique identifier for the conversation.",
                    default="",
                    is_shared=True,
                ),
                ConfigurableFieldSpec(
                    id=MESSAGE_ID_KEY,
                    annotation=str,
                    name="Message ID",
                    description="Unique identifier for the message.",
                    default="",
                    is_shared=True,
                ),
            ],
        )

        with_message_history = with_message_history.with_config(RunnableConfig(callbacks=self.callbacks))

        return with_message_history

    @tracer.capture_method(capture_response=True)
    def generate(self, question: str) -> Dict[str, Any]:
        """
        Invokes the LLM to fetch a response for the given question.

        Args:
            question (str): the question that should be sent to the LLM model

        Returns:
            (Dict): The LLM chat response message as a dictionary (with the relevant source documents if the model is RAG)
            Response dict form:
            {
             "answer": str,
             "context": List[Dict] # Optional key applicable for RAG child classes.
            }

        Note: Add error handling based on your model implementation
        """
        invoke_configuration = {
            "configurable": {
                CONVERSATION_ID_KEY: self.conversation_history_params[CONVERSATION_ID_KEY],
                USER_ID_KEY: self.conversation_history_params[USER_ID_KEY],
                MESSAGE_ID_KEY: self.conversation_history_params[MESSAGE_ID_KEY],
            }
        }
        operation = RAG_CONVERSATION_TRACER_KEY if self.rag_enabled else CONVERSATION_TRACER_KEY

        with tracer.provider.in_subsegment("## llm_chain") as subsegment:
            subsegment.put_annotation("library", "langchain")
            subsegment.put_annotation("operation", operation)
            metrics.add_metric(name=CloudWatchMetrics.LANGCHAIN_QUERY.value, unit=MetricUnit.Count, value=1)
            metrics.flush_metrics()

            response = {}
            start_time = time.time()

            if self.streaming:
                # The stream() method returns a generator that lazily produces response chunks.
                # We join these chunks into a single string because:
                # 1. Generators use lazy evaluation - they only produce values when requested
                # 2. Without joining, the generator would remain unconsumed and the full response wouldn't materialize
                model_response_generator = self.runnable_with_history.stream({"input": question}, invoke_configuration)
                model_response = "".join(model_response_generator)
            else:
                model_response = self.runnable_with_history.invoke({"input": question}, invoke_configuration)

            end_time = time.time()
            response[LLM_RESPONSE_KEY] = model_response.strip()

            metrics.add_metric(
                name=CloudWatchMetrics.LANGCHAIN_QUERY_PROCESSING_TIME.value,
                unit=MetricUnit.Seconds,
                value=(end_time - start_time),
            )
            logger.debug(f"Model response received: {model_response}")
            metrics.flush_metrics()
            return response

    def get_validated_prompt(
        self,
        prompt_template: str,
        prompt_template_placeholders: List[str],
        llm_provider: LLMProviderTypes,
        rag_enabled: bool = False,
    ) -> ChatPromptTemplate:
        """
        Generates the PromptTemplate using the provided prompt template and default placeholders.
        If template is not set or if it is invalid, use the default.
        Args:
            prompt_template (str): the prompt template to be used
            prompt_template_placeholders List[str]: the list of prompt template placeholders
            llm_provider (LLMProviderTypes): the LLM provider
            rag_enabled (bool): whether RAG is enabled or not

        Returns:
            ChatPromptTemplate: the prompt template object with the prompt template and placeholders set

        Raises:
            ValueError: In case of errors such as if the prompt template is invalid or if the placeholders are not provided
        """
        metrics = get_metrics_client(CloudWatchNamespaces.LANGCHAIN_LLM)
        try:
            if prompt_template:
                if not rag_enabled and "{context}" in prompt_template:
                    error = f"Provided 'context' placeholder in prompt template for non-RAG use case. Prompt:\n{prompt_template}"
                    raise ValueError(error)
                elif rag_enabled and "{context}" not in prompt_template:
                    error = f"The prompt template does not contain the required placeholder 'context' for RAG use case. Prompt:\n{prompt_template}"
                    raise ValueError(error)

                validate_prompt_placeholders(prompt_template, prompt_template_placeholders)

                if llm_provider == LLMProviderTypes.BEDROCK:
                    return ChatPromptTemplate.from_messages(
                        [
                            ("system", prompt_template),
                            MessagesPlaceholder("history", optional=True),
                            ("human", "{input}"),
                        ]
                    )
                elif llm_provider == LLMProviderTypes.SAGEMAKER:
                    if not prompt_template_placeholders:
                        raise ValueError(
                            f"Prompt template placeholders not provided for {llm_provider.value} model provider."
                        )
                    return ChatPromptTemplate.from_template(prompt_template)
                else:
                    message = f"Invalid LLM Provider type: {llm_provider}"
                    logger.error(message, xray_trace_id=os.environ[TRACE_ID_ENV_VAR])
                    metrics.add_metric(
                        name=CloudWatchMetrics.INCORRECT_INPUT_FAILURES.value, unit=MetricUnit.Count, value=1
                    )
                    raise ValueError(message)

            else:
                message = "Prompt is empty."
                logger.error(message, xray_trace_id=os.environ[TRACE_ID_ENV_VAR])
                metrics.add_metric(
                    name=CloudWatchMetrics.INCORRECT_INPUT_FAILURES.value, unit=MetricUnit.Count, value=1
                )
                raise ValueError(message)

        finally:
            metrics.flush_metrics()

    @abstractmethod
    def get_llm(self, *args, **kwargs) -> Union[LLM, BaseChatModel]:
        """
        Creates an LangChain LLM based on supplied params. Child classes must provide an implementation of this method.

        Returns:
            LangChain LLM/Chat Model object that can be invoked in a conversation chain/runnable.
        """

    @tracer.capture_method(capture_response=True)
    def get_clean_model_params(self, model_params) -> Dict:
        """
        Sanitizes the model parameters. Implementation is model specific. This base class implementation formats the model arguments into a dictionary with values of the correct data type.
        Args:
            - model_params: Dictionary of model parameters to be sanitized.

        Returns:
            - Dictionary of sanitized model parameters.
        """
        sanitized_model_params = {}
        try:
            if not model_params:
                return {}

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
