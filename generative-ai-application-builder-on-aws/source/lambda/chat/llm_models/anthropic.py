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

from anthropic import AI_PROMPT, HUMAN_PROMPT, AuthenticationError, NotFoundError
from aws_lambda_powertools import Logger, Metrics, Tracer
from aws_lambda_powertools.metrics import MetricUnit
from langchain.callbacks.base import BaseCallbackHandler
from langchain.llms.base import LLM
from langchain.schema import BaseMemory
from llm_models.base_langchain import BaseLangChainModel
from llm_models.custom_chat_anthropic import CustomChatAnthropic
from shared.knowledge.knowledge_base import KnowledgeBase
from utils.constants import (
    DEFAULT_ANTHROPIC_MODEL,
    DEFAULT_ANTHROPIC_PLACEHOLDERS,
    DEFAULT_ANTHROPIC_PROMPT,
    DEFAULT_ANTHROPIC_RAG_PLACEHOLDERS,
    DEFAULT_ANTHROPIC_RAG_PROMPT,
    DEFAULT_ANTHROPIC_STREAMING_MODE,
    DEFAULT_ANTHROPIC_TEMPERATURE,
    DEFAULT_MAX_TOKENS_TO_SAMPLE,
    DEFAULT_VERBOSE_MODE,
    METRICS_SERVICE_NAME,
    TRACE_ID_ENV_VAR,
)
from utils.custom_exceptions import LLMBuildError
from utils.enum_types import CloudWatchMetrics, CloudWatchNamespaces

tracer = Tracer()
logger = Logger(utc=True)
metrics = Metrics(namespace=CloudWatchNamespaces.LANGCHAIN_LLM.value, service=METRICS_SERVICE_NAME)


class AnthropicLLM(BaseLangChainModel):
    """
    AnthropicLLM is a wrapper around the Anthropic Langchain API which can generate chat responses, provided a conversation memory
    and knowledge base.

    Attributes:
        api_token (str): Anthropic API token, which can be obtained from Anthropic
        conversation_memory (BaseMemory): A BaseMemory object which helps store and access user chat history
        knowledge_base (KnowledgeBase): A KnowledgeBase object which retrieves information from the user's knowledge base for LLM context
        model (str): Anthropic model name that represents the underlying LLM model [optional, defaults to DEFAULT_ANTHROPIC_MODEL]
        model_params (dict): A dictionary of model parameters, which can be obtained from the Anthropic documentation [optional]
        prompt_template (str): A string which represents the prompt template [optional, defaults to DEFAULT_ANTHROPIC_PROMPT or DEFAULT_ANTHROPIC_RAG_PROMPT]
        streaming (bool): A boolean which represents whether the chat is streaming or not [optional, defaults to DEFAULT_ANTHROPIC_STREAMING_MODE]
        verbose (bool): A boolean which represents whether the chat is verbose or not [optional, defaults to DEFAULT_VERBOSE_MODE]
        temperature (float): A non-negative float that tunes the degree of randomness in model response generation [optional, defaults to DEFAULT_ANTHROPIC_TEMPERATURE]
        callbacks (list): A list of BaseCallbackHandler objects which are used for the LLM model callbacks [optional, defaults to None]
        rag_enabled (bool): A boolean which represents whether the RAG is enabled or not [optional, defaults to False]

        Supported model parameters:
            - top_k: Number of most likely tokens to consider at each step.
            - top_p: Total probability mass of tokens to consider at each step.
            - temperature: A non-negative float that tunes the degree of randomness in generation.
            - default_request_timeout: Timeout for requests to Anthropic Completion API. Default is set by the underlying Langchain API
            - max_tokens_to_sample: The number of tokens to predict per generation [optional, defaults to DEFAULT_MAX_TOKENS_TO_SAMPLE]

    Methods:
        validate_not_null(kwargs): Validates that the supplied values are not null or empty.
        generate(question): Generates a chat response
        get_conversation_chain(): Creates a `ConversationChain` chain that is connected to a conversation memory and the specified prompt
        get_prompt_details(prompt_template, default_prompt_template, default_prompt_template_placeholder): Generates the PromptTemplate using
            the provided prompt template and placeholders
        get_clean_model_params(): Sanitizes the model params for use with the Anthropic model.
        prompt(): Returns the prompt set on the underlying LLM
        memory_buffer(): Returns the conversation memory buffer for the underlying LLM
    """

    def __init__(
        self,
        api_token: str,
        conversation_memory: BaseMemory,
        knowledge_base: KnowledgeBase,
        model: str = DEFAULT_ANTHROPIC_MODEL,
        model_params: Optional[dict] = None,
        prompt_template: Optional[str] = None,
        streaming: Optional[bool] = DEFAULT_ANTHROPIC_STREAMING_MODE,
        verbose: Optional[bool] = DEFAULT_VERBOSE_MODE,
        temperature: Optional[float] = DEFAULT_ANTHROPIC_TEMPERATURE,
        callbacks: Optional[List[BaseCallbackHandler]] = None,
        rag_enabled: Optional[bool] = False,
    ) -> None:
        super().__init__(
            api_token=api_token, rag_enabled=rag_enabled, streaming=streaming, verbose=verbose, temperature=temperature
        )
        self._conversation_memory = conversation_memory
        self._knowledge_base = knowledge_base
        self._callbacks = callbacks or None
        self._model = model if model else DEFAULT_ANTHROPIC_MODEL

        self._model_params = self.get_clean_model_params(model_params)

        default_prompt = DEFAULT_ANTHROPIC_RAG_PROMPT if rag_enabled else DEFAULT_ANTHROPIC_PROMPT
        default_prompt_template_placeholders = (
            DEFAULT_ANTHROPIC_RAG_PLACEHOLDERS if rag_enabled else DEFAULT_ANTHROPIC_PLACEHOLDERS
        )
        self._prompt_template, self._prompt_template_placeholders = self.get_prompt_details(
            prompt_template, default_prompt, default_prompt_template_placeholders
        )
        self._stop_sequences = [
            HUMAN_PROMPT,
            AI_PROMPT,
            "\nHuman:",
            "\nAssistant:",
            r"\\n",
        ]
        self._llm = self.get_llm()
        self._conversation_chain = self.get_conversation_chain()

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
        logger.info(f"Prompt for LLM: {self.prompt_template.template}")
        with tracer.provider.in_subsegment("## llm_chain") as subsegment:
            subsegment.put_annotation("library", "langchain")
            subsegment.put_annotation("operation", "ConversationChain")
            metrics.add_metric(name=CloudWatchMetrics.LANGCHAIN_QUERY.value, unit=MetricUnit.Count, value=1)
            try:
                start_time = time.time()
                response = self.conversation_chain.predict(input=question)
                end_time = time.time()
                metrics.add_metric(
                    name=CloudWatchMetrics.LANGCHAIN_QUERY_PROCESSING_TIME.value,
                    unit=MetricUnit.Seconds,
                    value=(end_time - start_time),
                )
                return {"answer": response.strip()}
            except NotFoundError as nfe:
                error_message = f"Error occurred while building Anthropic Model. Error: {nfe}"
                logger.error(
                    error_message,
                    xray_trace_id=os.environ[TRACE_ID_ENV_VAR],
                )
                metrics.add_metric(name=CloudWatchMetrics.LANGCHAIN_FAILURES.value, unit=MetricUnit.Count, value=1)
                raise LLMBuildError(
                    f"ChatAnthropic model construction failed. Ensure {self.model} is correct model name. Error: {nfe}"
                )
            except AuthenticationError as ae:
                error_message = f"Error occurred while building Anthropic Model. Error: {ae}"
                logger.error(
                    error_message,
                    xray_trace_id=os.environ[TRACE_ID_ENV_VAR],
                )
                metrics.add_metric(name=CloudWatchMetrics.LANGCHAIN_FAILURES.value, unit=MetricUnit.Count, value=1)
                raise LLMBuildError(f"ChatAnthropic model construction failed. API key was incorrect. Error: {ae}")
            except Exception as ex:
                error_message = f"Error occurred while building Anthropic Model. Error: {ex}"
                logger.error(
                    error_message,
                    xray_trace_id=os.environ[TRACE_ID_ENV_VAR],
                )
                metrics.add_metric(name=CloudWatchMetrics.LANGCHAIN_FAILURES.value, unit=MetricUnit.Count, value=1)
                raise ex
            finally:
                metrics.flush_metrics()

    def get_clean_model_params(self, model_params: Dict[str, Any]) -> Dict[str, Any]:
        """
        Sanitizes and returns the model params for use with Anthropic models.

         Args:
             model_params (Dict): the model params that must be cleaned, for example: { param_name: param_value }

         Returns:
             (Dict): Sanitized model params
        """
        sanitized_model_params = super().get_clean_model_params(model_params)
        sanitized_model_params["temperature"] = float(self.temperature)
        return sanitized_model_params
