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
from typing import Any, Dict, List, Optional, Union

from aws_lambda_powertools import Logger, Tracer
from aws_lambda_powertools.metrics import MetricUnit
from langchain.chains import ConversationalRetrievalChain, LLMChain
from langchain_core.language_models.llms import LLM as LangChainLLM
from langchain_core.outputs import Generation, LLMResult
from langchain_core.prompts import PromptTemplate
from llms.base_langchain import BaseLangChainModel
from llms.models.model_provider_inputs import ModelProviderInputs
from shared.defaults.model_defaults import ModelDefaults
from utils.constants import (
    DEFAULT_DISAMBIGUATION_ENABLED_MODE,
    DEFAULT_RAG_CHAIN_TYPE,
    DEFAULT_RETURN_GENERATED_RAG_QUESTION,
    DEFAULT_RETURN_SOURCE_DOCS,
    DISAMBIGUATION_PROMPT_PLACEHOLDERS,
    GENERATED_QUESTION_KEY,
    LLM_RESPONSE_KEY,
    SOURCE_DOCUMENTS_KEY,
    TRACE_ID_ENV_VAR,
)
from utils.custom_exceptions import LLMInvocationError
from utils.enum_types import CloudWatchMetrics, CloudWatchNamespaces
from utils.helpers import get_metrics_client, validate_prompt_placeholders

tracer = Tracer()
logger = Logger(utc=True)
metrics = get_metrics_client(CloudWatchNamespaces.LANGCHAIN_LLM)


class DummyLLM(LangChainLLM):
    def _generate(self, prompts: List[str], stop: Optional[List[str]] = None) -> LLMResult:
        generations = [[Generation(text=prompt)] for prompt in prompts]
        return LLMResult(generations=generations)

    @property
    def _llm_type(self) -> str:
        return "dummy LLM"

    def _call(self, prompt: str, stop: Optional[List[str]] = None) -> str:
        return prompt


class NoOperationLLMChain(LLMChain):
    def __init__(self):
        super().__init__(llm=DummyLLM(), prompt=PromptTemplate(template="", input_variables=[]))

    async def arun(self, question: str, *args, **kwargs) -> str:
        return question

    def run(self, question: str, *args, **kwargs) -> str:
        return question


class RetrievalLLM(BaseLangChainModel):
    """
    RetrievalLLM represents the interface that the implementing models should follow for consistent behavior

    Attributes:
        - model_defaults: A ModelDefaults object which contains default values for the model retrieved from ModelInfoStorage DynamoDB table
        - return_source_docs (bool): A boolean which represents whether the source documents are returned or not [optional, defaults to DEFAULT_RETURN_SOURCE_DOCS]
        - disambiguation_prompt_template (str): A string which represents the disambiguation prompt template

    Methods:
        - generate(question): Generates a chat response
        - get_conversation_chain(): Creates a `ConversationalRetrievalChain` chain that is connected to a conversation
        memory and the specified prompt

    """

    def __init__(
        self,
        llm_params: ModelProviderInputs,
        model_defaults: ModelDefaults,
        return_source_docs: bool = DEFAULT_RETURN_SOURCE_DOCS,
        disambiguation_prompt_template: Optional[str] = None,
    ):

        self.model_defaults = model_defaults
        self.return_source_docs = return_source_docs
        self.disambiguation_prompt_enabled = (
            llm_params.disambiguation_prompt_enabled
            if llm_params.disambiguation_prompt_enabled is not None
            else DEFAULT_DISAMBIGUATION_ENABLED_MODE
        )
        self.disambiguation_prompt_template = disambiguation_prompt_template

        BaseLangChainModel.__init__(
            self,
            rag_enabled=True,
            streaming=llm_params.streaming,
            verbose=llm_params.verbose,
            temperature=llm_params.temperature,
        )

        self.temperature = self.model_defaults.default_temperature if self.temperature is None else self.temperature
        self.model = llm_params.model
        self.streaming = self.model_defaults.allows_streaming if self.streaming is None else self.streaming
        self._prompt_template_placeholders = llm_params.prompt_placeholders
        self.prompt_template = llm_params.prompt_template
        self.conversation_memory = llm_params.conversation_memory
        self.knowledge_base = llm_params.knowledge_base
        self.rephrase_question = llm_params.rephrase_question
        self.response_if_no_docs_found = llm_params.response_if_no_docs_found
        self.callbacks = llm_params.callbacks or None
        self.llm = None
        self.conversation_chain = None

    @property
    def disambiguation_prompt_template(self) -> PromptTemplate:
        return self._disambiguation_prompt_template

    @disambiguation_prompt_template.setter
    def disambiguation_prompt_template(self, disambiguation_prompt_template) -> None:
        self._disambiguation_prompt_template = self.get_validated_disambiguation_prompt(
            disambiguation_prompt_template,
            self.model_defaults.disambiguation_prompt,
            DISAMBIGUATION_PROMPT_PLACEHOLDERS,
            self.disambiguation_prompt_enabled,
        )

    @property
    def return_source_docs(self) -> bool:
        return self._return_source_docs

    @return_source_docs.setter
    def return_source_docs(self, return_source_docs) -> None:
        self._return_source_docs = return_source_docs

    def get_conversation_chain(self) -> ConversationalRetrievalChain:
        """
        Creates a `ConversationalRetrievalChain` chain that uses a `retriever` connected to a knowledge base.
        Args: None

        Returns:
            ConversationalRetrievalChain: An LLM chain uses a `retriever` connected to a knowledge base.
        """
        request_options = {
            "llm": self.llm,
            "retriever": self.knowledge_base.retriever,
            "chain_type": DEFAULT_RAG_CHAIN_TYPE,
            "verbose": self.verbose,
            "memory": self.conversation_memory,
            "return_source_documents": self.return_source_docs,
            "combine_docs_chain_kwargs": {"prompt": self.prompt_template},
            "get_chat_history": lambda chat_history: chat_history,
            "return_generated_question": DEFAULT_RETURN_GENERATED_RAG_QUESTION,
            "response_if_no_docs_found": self.response_if_no_docs_found,
            "callbacks": self.callbacks,
        }

        if self.disambiguation_prompt_enabled:
            request_options["condense_question_prompt"] = self.disambiguation_prompt_template
            request_options["condense_question_llm"] = self.get_llm(condense_prompt_model=True)
            request_options["rephrase_question"] = self.rephrase_question
            conversation_chain = ConversationalRetrievalChain.from_llm(**request_options)
        else:
            conversation_chain = ConversationalRetrievalChain.from_llm(**request_options)
            conversation_chain.question_generator = NoOperationLLMChain()

        return conversation_chain

    @tracer.capture_method(capture_response=True)
    def generate(self, question: str, error_message: str) -> Dict[str, Any]:
        """@overrides parent class's generate for a RAG implementation

        Args:
            question (str): the question that should be sent to the LLM model
            error_message (str): the error message that should be logged in case of an error. This can differ for
            different child implementations

        Returns:
            (Dict): The LLM response message as a dictionary with the relevant source documents
            Response dict form:
            {
             "answer": str,
             "source_documents": List[Dict]
            }
        """
        logger.info(
            f"Prompt for LLM: {self.prompt_template.template.replace('{question}', '{input}').replace('{chat_history}', '{history}')}"
        )

        if self.disambiguation_prompt_enabled:
            logger.info(
                f"Disambiguation prompt for LLM: {self.disambiguation_prompt_template.template.replace('{question}', '{input}').replace('{chat_history}', '{history}')}"
            )

        with tracer.provider.in_subsegment("## llm_chain") as subsegment:
            subsegment.put_annotation("library", "langchain")
            subsegment.put_annotation("operation", "ConversationalRetrievalChain")
            metrics.add_metric(name=CloudWatchMetrics.LANGCHAIN_QUERY.value, unit=MetricUnit.Count, value=1)
            metrics.flush_metrics()

            try:
                start_time = time.time()
                chain_result = self.conversation_chain.invoke(
                    {"question": question, "chat_history": self.conversation_memory.chat_memory.messages},
                )
                end_time = time.time()

                metrics.add_metric(
                    name=CloudWatchMetrics.LANGCHAIN_QUERY_PROCESSING_TIME.value,
                    unit=MetricUnit.Seconds,
                    value=(end_time - start_time),
                )
                metrics.flush_metrics()

                logger.debug(f"LLM response: {chain_result[LLM_RESPONSE_KEY]}")

                llm_response = {"answer": chain_result[LLM_RESPONSE_KEY].strip()}
                if SOURCE_DOCUMENTS_KEY in chain_result:
                    llm_response[SOURCE_DOCUMENTS_KEY] = chain_result[SOURCE_DOCUMENTS_KEY]
                if GENERATED_QUESTION_KEY in chain_result:
                    llm_response[GENERATED_QUESTION_KEY] = chain_result[GENERATED_QUESTION_KEY]
                    logger.debug(f"LLM generated_question: {chain_result[GENERATED_QUESTION_KEY]}")

                return llm_response
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

    def get_validated_disambiguation_prompt(
        self,
        disambiguation_prompt_template: Optional[str],
        default_disambiguation_prompt_template: str,
        disambiguation_prompt_template_placeholders: Optional[List[str]] = DISAMBIGUATION_PROMPT_PLACEHOLDERS,
        disambiguation_prompt_enabled: bool = DEFAULT_DISAMBIGUATION_ENABLED_MODE,
    ) -> Union[PromptTemplate, None]:
        """
        Generates the PromptTemplate using the provided prompt template and placeholders.
        If template is not set or if it is invalid, the default is used.
        Args:
            disambiguation_prompt_template (str): the prompt template to be used
            default_disambiguation_prompt_template (str): the default prompt template to be used in case of failures
            disambiguation_prompt_template_placeholders (List[str]): the list of default prompt template placeholders
        Returns:
            PromptTemplate: the disambiguation/condensing prompt template object with the prompt template and placeholders set
        """
        try:
            if not disambiguation_prompt_enabled:
                if disambiguation_prompt_template:
                    logger.error(
                        "DisambiguationEnabled is False and DisambiguationPromptTemplate is set. Proceeding without Disambiguation prompt template",
                        xray_trace_id=os.environ[TRACE_ID_ENV_VAR],
                    )

                return None

            if disambiguation_prompt_template and disambiguation_prompt_template_placeholders:
                disambiguation_prompt_template = disambiguation_prompt_template.replace(
                    "{input}", "{question}"
                ).replace("{history}", "{chat_history}")

                validate_prompt_placeholders(
                    disambiguation_prompt_template, disambiguation_prompt_template_placeholders
                )
                prompt_template_text = disambiguation_prompt_template

            else:
                message = f"Disambiguation prompt template not provided. Falling back to default disambiguation prompt template."
                logger.info(message, xray_trace_id=os.environ[TRACE_ID_ENV_VAR])
                prompt_template_text = default_disambiguation_prompt_template

        except ValueError as ex:
            logger.error(
                f"Prompt validation failed: {ex}. Falling back to default disambiguation prompt template.",
                xray_trace_id=os.environ[TRACE_ID_ENV_VAR],
            )
            metrics.add_metric(name=CloudWatchMetrics.INCORRECT_INPUT_FAILURES.value, unit=MetricUnit.Count, value=1)
            prompt_template_text = default_disambiguation_prompt_template

        finally:
            metrics.flush_metrics()
        return PromptTemplate.from_template(prompt_template_text)
