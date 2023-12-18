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
import time
from typing import Any, Dict, List, Optional

from aws_lambda_powertools import Logger, Metrics, Tracer
from aws_lambda_powertools.metrics import MetricUnit
from langchain.callbacks.base import BaseCallbackHandler
from langchain.chains import ConversationalRetrievalChain
from langchain.chains.conversational_retrieval.prompts import CONDENSE_QUESTION_PROMPT
from langchain.schema import BaseMemory
from llm_models.bedrock import BedrockLLM
from shared.knowledge.knowledge_base import KnowledgeBase
from utils.constants import (
    DEFAULT_BEDROCK_ANTHROPIC_CONDENSING_PROMPT_TEMPLATE,
    DEFAULT_BEDROCK_META_CONDENSING_PROMPT_TEMPLATE,
    DEFAULT_BEDROCK_MODEL_FAMILY,
    DEFAULT_BEDROCK_STREAMING_MODE,
    DEFAULT_BEDROCK_TEMPERATURE_MAP,
    DEFAULT_RAG_CHAIN_TYPE,
    DEFAULT_VERBOSE_MODE,
    METRICS_SERVICE_NAME,
    TRACE_ID_ENV_VAR,
)
from utils.custom_exceptions import LLMBuildError
from utils.enum_types import BedrockModelProviders, CloudWatchMetrics, CloudWatchNamespaces

tracer = Tracer()
logger = Logger(utc=True)
metrics = Metrics(namespace=CloudWatchNamespaces.LANGCHAIN_LLM.value, service=METRICS_SERVICE_NAME)


class BedrockRetrievalLLM(BedrockLLM):
    """
    BedrockRetrievalLLM is a wrapper around the Bedrock Langchain API which can generate chat responses, provided a conversation memory
    and knowledge base. Specifically, this enables the usage of RAG with Bedrock available models.

    Attributes:
         conversation_memory (BaseMemory): A BaseMemory object which helps store and access user chat history
         knowledge_base (KnowledgeBase): A KnowledgeBase object which retrieves information from the user's knowledge base for LLM context
         model_family (BedrockModelProviders): A string which represents the model family [optional, defaults to DEFAULT_BEDROCK_MODEL_FAMILY]
         model (str): Anthropic model name that represents the underlying LLM model [optional, defaults to DEFAULT_ANTHROPIC_MODEL]
         model_params (dict): A dictionary of model parameters, which can be obtained from the Anthropic [optional]
         prompt_template (str): A string which represents the prompt template [optional, defaults to DEFAULT_ANTHROPIC_RAG_PROMPT]
         streaming (bool): A boolean which represents whether the chat is streaming or not [optional, defaults to False]
         verbose (bool): A boolean which represents whether the chat is verbose or not [optional, defaults to False]
         temperature (float): A non-negative float that tunes the degree of randomness in model response generation [optional, defaults to DEFAULT_ANTHROPIC_TEMPERATURE]
         callbacks (list): A list of BaseCallbackHandler objects which are used for the LLM model callbacks [optional, defaults to None]

    Methods:
        validate_not_null(kwargs): Validates that the supplied values are not null or empty.
        generate(question): Generates a chat response
        get_conversation_chain(): Creates a `ConversationalRetrievalChain` chain that is connected to a conversation memory and the specified prompt
        get_prompt_details(prompt_template, default_prompt_template, default_prompt_template_placeholder): Generates the PromptTemplate using
            the provided prompt template and placeholders
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
        condensing_prompt_template: Optional[str] = None,
        streaming: Optional[bool] = DEFAULT_BEDROCK_STREAMING_MODE,
        verbose: Optional[bool] = DEFAULT_VERBOSE_MODE,
        temperature: Optional[float] = None,
        callbacks: Optional[List[BaseCallbackHandler]] = None,
    ):
        temperature = temperature if temperature is not None else DEFAULT_BEDROCK_TEMPERATURE_MAP[model_family]
        if condensing_prompt_template:
            self.condensing_prompt_template = condensing_prompt_template
        else:
            if model_family == BedrockModelProviders.ANTHROPIC.value:
                self.condensing_prompt_template = DEFAULT_BEDROCK_ANTHROPIC_CONDENSING_PROMPT_TEMPLATE
            elif model_family == BedrockModelProviders.META.value:
                self.condensing_prompt_template = DEFAULT_BEDROCK_META_CONDENSING_PROMPT_TEMPLATE
            else:
                self.condensing_prompt_template = CONDENSE_QUESTION_PROMPT

        super().__init__(
            conversation_memory=conversation_memory,
            knowledge_base=knowledge_base,
            model_family=model_family,
            model=model,
            model_params=model_params,
            prompt_template=prompt_template,
            streaming=streaming,
            verbose=verbose,
            temperature=temperature,
            callbacks=callbacks,
            rag_enabled=True,
        )

    def get_conversation_chain(self) -> ConversationalRetrievalChain:
        """
        Creates a `ConversationalRetrievalChain` chain that uses a `retriever` connected to a knowledge base.
        Args: None

        Returns:
            ConversationalRetrievalChain: An LLM chain uses a `retriever` connected to a knowledge base.
        """
        return ConversationalRetrievalChain.from_llm(
            llm=self.llm,
            retriever=self.knowledge_base.retriever,
            chain_type=DEFAULT_RAG_CHAIN_TYPE,
            verbose=self.verbose,
            memory=self.conversation_memory,
            return_source_documents=True,
            combine_docs_chain_kwargs={"prompt": self.prompt_template},
            get_chat_history=lambda chat_history: chat_history,
            condense_question_llm=self.get_llm(condense_prompt_model=True),
            condense_question_prompt=self.condensing_prompt_template,
        )

    @tracer.capture_method(capture_response=True)
    def generate(self, question: str) -> Dict[str, Any]:
        """@overrides BedrockLLM.generate

        Args:
            question (str): the question that should be sent to the LLM model

        Returns:
            (Dict): The LLM response message as a dictionary with the relevant source documents
            Response dict form:
            {
             "answer": str,
             "source_documents": List[str]
            }
        """
        logger.info(
            f"Prompt for LLM: {self.prompt_template.template.replace('{input}', '{question}').replace('{history}', '{chat_history}')}"
        )
        logger.debug(f"Condensing prompt for LLM: {self.condensing_prompt_template}")

        with tracer.provider.in_subsegment("## llm_chain") as subsegment:
            subsegment.put_annotation("library", "langchain")
            subsegment.put_annotation("operation", "ConversationalRetrievalChain")
            metrics.add_metric(name=CloudWatchMetrics.LANGCHAIN_QUERY.value, unit=MetricUnit.Count, value=1)

            try:
                start_time = time.time()
                llm_result = self.conversation_chain(
                    {"question": question, "chat_history": self.conversation_memory.chat_memory.messages},
                )
                end_time = time.time()
                metrics.add_metric(
                    name=CloudWatchMetrics.LANGCHAIN_QUERY_PROCESSING_TIME.value,
                    unit=MetricUnit.Seconds,
                    value=(end_time - start_time),
                )
                logger.debug(f"LLM response: {llm_result}")

                return {
                    "answer": llm_result["answer"].strip(),
                    "source_documents": llm_result["source_documents"],
                }

            except ValueError as ve:
                error_message = f"Error occurred while building Bedrock {self.model_family} Model. Error: {ve}"
                logger.error(
                    error_message,
                    xray_trace_id=os.environ[TRACE_ID_ENV_VAR],
                )
                metrics.add_metric(name=CloudWatchMetrics.LANGCHAIN_FAILURES.value, unit=MetricUnit.Count, value=1)
                raise LLMBuildError(
                    f"Error occurred while building Bedrock {self.model_family.value} Model. Ensure that the model params and their data-types provided are correct. Error: {ve}"
                )
            except Exception as ex:
                logger.error(
                    ex,
                    xray_trace_id=os.environ[TRACE_ID_ENV_VAR],
                )
                metrics.add_metric(name=CloudWatchMetrics.LANGCHAIN_FAILURES.value, unit=MetricUnit.Count, value=1)
                raise ex
            finally:
                metrics.flush_metrics()
