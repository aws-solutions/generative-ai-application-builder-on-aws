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

from anthropic import AuthenticationError, NotFoundError
from aws_lambda_powertools import Logger, Tracer
from aws_lambda_powertools.metrics import MetricUnit
from llms.base_langchain import BaseLangChainModel
from llms.models.custom_chat_anthropic import CustomChatAnthropic
from llms.models.llm import LLM
from shared.defaults.model_defaults import ModelDefaults
from utils.constants import (
    DEFAULT_MAX_TOKENS_TO_SAMPLE,
    DEFAULT_MODELS_MAP,
    DEFAULT_RAG_ENABLED_MODE,
    TRACE_ID_ENV_VAR,
)
from utils.custom_exceptions import LLMInvocationError
from utils.enum_types import CloudWatchMetrics, CloudWatchNamespaces, LLMProviderTypes
from utils.helpers import get_metrics_client

tracer = Tracer()
logger = Logger(utc=True)
metrics = get_metrics_client(CloudWatchNamespaces.LANGCHAIN_LLM)


class AnthropicLLM(BaseLangChainModel):
    """
    AnthropicLLM is a wrapper around the Anthropic LangChain API which can generate chat responses, provided a conversation memory.

    Attributes:
        - llm_params: LLM dataclass object which has the following:
            api_token (str): Anthropic API token, which can be obtained from Anthropic
            conversation_memory (BaseMemory): A BaseMemory object which helps store and access user chat history
            knowledge_base (KnowledgeBase): A KnowledgeBase object which retrieves information from the user's knowledge base for LLM context. This
               field is only used when the child class AnthropicRetrievalLLM passes this value, else for regular non-RAG chat this is set to None.
            model (str): Anthropic model name that represents the underlying LLM model [optional, defaults to DEFAULT_MODELS_MAP[LLMProviderTypes.ANTHROPIC.value]]
            model_params (dict): A dictionary of model parameters, which can be obtained from the Anthropic documentation [optional]
            prompt_template (str): A string which represents the prompt template. If not provided, builder sends the default prompt value to this
                class as input instead. See llm_builder.py for more information.
            streaming (bool): A boolean which represents whether the chat is streaming or not [optional, defaults to streaming value provided in
                ModelInfoStorage DynamoDB table]
            verbose (bool): A boolean which represents whether the chat is verbose or not [optional, defaults to DEFAULT_VERBOSE_MODE]
            temperature (float): A non-negative float that tunes the degree of randomness in model response generation [optional, defaults to
                temperature provided in ModelInfoStorage DynamoDB table]
            callbacks (list): A list of BaseCallbackHandler objects which are used for the LLM model callbacks [optional, defaults to None]

        - model_defaults (ModelDefaults): A ModelDefaults object which contains default values for the model retrieved from ModelInfoStorage DynamoDB table
        - rag_enabled (bool): A boolean which represents whether the RAG is enabled or not [optional, defaults to DEFAULT_RAG_ENABLED_MODE]

        Supported model parameters:
            - top_k: Number of most likely tokens to consider at each step.
            - top_p: Total probability mass of tokens to consider at each step.
            - temperature: A non-negative float that tunes the degree of randomness in generation.
            - default_request_timeout: Timeout for requests to Anthropic Completion API. Default is set by the underlying LangChain API
            - max_tokens_to_sample: The number of tokens to predict per generation [optional, defaults to DEFAULT_MAX_TOKENS_TO_SAMPLE]

    Methods:
        generate(question): Generates a chat response
        get_conversation_chain(): Creates a `ConversationChain` chain that is connected to a conversation memory and the specified prompt
        get_validated_prompt(prompt_template, prompt_template_placeholders, default_prompt_template, default_prompt_template_placeholders): Generates the PromptTemplate using
            the provided prompt template and placeholders. In case of errors, falls back on default values.
        get_clean_model_params(): Sanitizes the model params for use with the Anthropic model.
        prompt(): Returns the prompt set on the underlying LLM
        memory_buffer(): Returns the conversation memory buffer for the underlying LLM
    """

    def __init__(
        self, llm_params: LLM, model_defaults: ModelDefaults, rag_enabled: Optional[bool] = DEFAULT_RAG_ENABLED_MODE
    ) -> None:
        super().__init__(
            api_token=llm_params.api_token,
            rag_enabled=rag_enabled,
            streaming=llm_params.streaming,
            verbose=llm_params.verbose,
            temperature=llm_params.temperature,
        )
        self.conversation_memory = llm_params.conversation_memory
        self.knowledge_base = llm_params.knowledge_base
        self.callbacks = llm_params.callbacks or None
        self.model = (
            llm_params.model
            if llm_params.model is not None and len(llm_params.model)
            else DEFAULT_MODELS_MAP[LLMProviderTypes.ANTHROPIC.value]
        )
        self.streaming = model_defaults.allows_streaming if self.streaming is None else self.streaming
        self.temperature = model_defaults.default_temperature if self.temperature is None else float(self.temperature)
        self.model_defaults = model_defaults
        self._prompt_template_placeholders = llm_params.prompt_placeholders
        self.prompt_template = llm_params.prompt_template
        self.model_params = self.get_clean_model_params(llm_params.model_params)
        self.llm = self.get_llm()
        self.conversation_chain = self.get_conversation_chain()

    def get_llm(self, condense_prompt_model: bool = False) -> CustomChatAnthropic:
        """
        Creates a langchain `LLM` object which is used to generate chat responses.

        Args:
            condense_prompt_model (bool): Flag that indicates whether to create a model for regular chat or
                for condensing the prompt for RAG use-cases.
                callbacks and streaming are disabled when this flag is set to True

        Returns:
            (CustomChatAnthropic) The created LangChain LLM object that can be invoked in a conversation chain
        """
        top_k = self.model_params.get("top_k")
        top_p = self.model_params.get("top_p")
        default_request_timeout = self.model_params.get("default_request_timeout")
        max_tokens_to_sample = self.model_params.get("max_tokens_to_sample") or DEFAULT_MAX_TOKENS_TO_SAMPLE
        callbacks = None if condense_prompt_model else self.callbacks
        streaming = False if condense_prompt_model else self.streaming

        return CustomChatAnthropic(
            anthropic_api_key=self.api_token,
            model=self.model,
            temperature=self.temperature,
            top_k=top_k,
            top_p=top_p,
            default_request_timeout=default_request_timeout,
            max_tokens_to_sample=max_tokens_to_sample,
            callbacks=callbacks,
            streaming=streaming,
            verbose=self.verbose,
            stop_sequences=self.stop_sequences,
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
        error_message = f"Error occurred while invoking Anthropic {self.model} model. "
        try:
            return super().generate(question)
        except AuthenticationError as ae:
            error_message = error_message + f"Please check that the API key is correct. {ae}"
            logger.error(error_message, xray_trace_id=os.environ[TRACE_ID_ENV_VAR])
            metrics.add_metric(name=CloudWatchMetrics.LANGCHAIN_FAILURES.value, unit=MetricUnit.Count, value=1)
            raise LLMInvocationError(error_message)
        except NotFoundError as nfe:
            error_message = error_message + str(nfe)
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

    def get_clean_model_params(self, model_params: Dict[str, Any]) -> Dict[str, Any]:
        """
        Sanitizes and returns the model params for use with Anthropic models.
        Called as a part of the __init__ method.

         Args:
             model_params (Dict): the model params that must be cleaned, for example: { param_name: param_value }

         Returns:
             (Dict): Sanitized model params
        """
        sanitized_model_params = super().get_clean_model_params(model_params)
        sanitized_model_params["temperature"] = self.temperature

        if self.model_defaults.stop_sequences:
            if "stop_sequences" in sanitized_model_params:
                sanitized_model_params["stop_sequences"] += self.model_defaults.stop_sequences
                self.stop_sequences = sanitized_model_params["stop_sequences"]
            else:
                sanitized_model_params["stop_sequences"] = self.model_defaults.stop_sequences
                self.stop_sequences = self.model_defaults.stop_sequences
        else:
            if "stop_sequences" in sanitized_model_params:
                self.stop_sequences = sanitized_model_params["stop_sequences"]
            else:
                self.stop_sequences = []

        return sanitized_model_params
