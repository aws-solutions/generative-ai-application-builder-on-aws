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
from operator import itemgetter
from typing import Any, Dict, List, Optional, Union

from aws_lambda_powertools import Logger, Tracer
from aws_lambda_powertools.metrics import MetricUnit
from langchain.chains.combine_documents.base import (
    DEFAULT_DOCUMENT_PROMPT,
    DEFAULT_DOCUMENT_SEPARATOR,
    DOCUMENTS_KEY,
    _validate_prompt,
)
from langchain.schema.runnable import RunnableConfig
from langchain_core.language_models import LLM, LanguageModelLike
from langchain_core.output_parsers import BaseOutputParser, StrOutputParser
from langchain_core.prompts import BasePromptTemplate, ChatPromptTemplate, format_document
from langchain_core.retrievers import BaseRetriever, RetrieverLike, RetrieverOutput, RetrieverOutputLike
from langchain_core.runnables import ConfigurableFieldSpec, Runnable, RunnableBranch, RunnablePassthrough
from langchain_core.runnables.base import RunnableBinding
from langchain_core.runnables.history import RunnableWithMessageHistory
from llms.base_langchain import BaseLangChainModel
from llms.models.model_provider_inputs import ModelProviderInputs
from shared.defaults.model_defaults import ModelDefaults
from shared.knowledge.knowledge_base import KnowledgeBase
from utils.constants import (
    CONVERSATION_ID_KEY,
    DEFAULT_DISAMBIGUATION_ENABLED_MODE,
    DISAMBIGUATION_PROMPT_PLACEHOLDERS,
    HISTORY_KEY,
    INPUT_KEY,
    LLM_RESPONSE_KEY,
    RAG_CONVERSATION_TRACER_KEY,
    REPHRASED_QUERY_KEY,
    SOURCE_DOCUMENTS_OUTPUT_KEY,
    SOURCE_DOCUMENTS_RECEIVED_KEY,
    TRACE_ID_ENV_VAR,
    USER_ID_KEY,
)
from utils.enum_types import CloudWatchMetrics, CloudWatchNamespaces
from utils.helpers import get_metrics_client, validate_prompt_placeholders

tracer = Tracer()
logger = Logger(utc=True)
metrics = get_metrics_client(CloudWatchNamespaces.LANGCHAIN_LLM)


class RetrievalLLM(BaseLangChainModel):
    """
    RetrievalLLM represents the interface that the implementing Retrieval Augmented Generation (RAG) models should follow for consistent behavior. Inherits BaseLangChainModel and provides RAG based specific implementations on top of it.


    Attributes:
        - model_defaults (ModelDefaults): The default values for the model, as specified on a per-model basis in the source/model-info files
        - model_inputs (ModelProviderInputs): The model inputs that the user provided. Each model_input object consists of all the required properties to deploy a Bedrock model such as the type of Conversation Memory class (DynamoDB for example), the type of knowledge base (Kendra, Bedrock KB, etc.) and their associated properties.

    Methods:
        Specific implementation must be provided by the implementing class for the following abstract methods:

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

    def __init__(self, model_inputs: ModelProviderInputs, model_defaults: ModelDefaults):
        BaseLangChainModel.__init__(self, model_defaults=model_defaults, model_inputs=model_inputs)
        self.knowledge_base = model_inputs.knowledge_base
        self.return_source_docs = model_inputs.return_source_docs
        self.rephrase_question = model_inputs.rephrase_question
        self.response_if_no_docs_found = model_inputs.response_if_no_docs_found

        self.disambiguation_prompt_enabled = (
            model_inputs.disambiguation_prompt_enabled
            if model_inputs.disambiguation_prompt_enabled is not None
            else DEFAULT_DISAMBIGUATION_ENABLED_MODE
        )
        self.disambiguation_prompt_template = model_inputs.disambiguation_prompt_template
        # Child classes set these variables
        self.disambiguation_llm = None
        self.runnable_with_history = None

    @property
    def knowledge_base(self) -> KnowledgeBase:
        return self._knowledge_base

    @knowledge_base.setter
    def knowledge_base(self, knowledge_base) -> None:
        self._knowledge_base = knowledge_base

    @property
    def return_source_docs(self) -> bool:
        return self._return_source_docs

    @return_source_docs.setter
    def return_source_docs(self, return_source_docs) -> None:
        self._return_source_docs = return_source_docs

    @property
    def rephrase_question(self) -> bool:
        return self._rephrase_question

    @rephrase_question.setter
    def rephrase_question(self, rephrase_question) -> None:
        self._rephrase_question = rephrase_question

    @property
    def response_if_no_docs_found(self) -> str:
        return self._response_if_no_docs_found

    @response_if_no_docs_found.setter
    def response_if_no_docs_found(self, response_if_no_docs_found) -> None:
        self._response_if_no_docs_found = response_if_no_docs_found

    @property
    def disambiguation_llm(self) -> LLM:
        return self._disambiguation_llm

    @disambiguation_llm.setter
    def disambiguation_llm(self, disambiguation_llm) -> None:
        self._disambiguation_llm = disambiguation_llm

    @property
    def disambiguation_prompt_template(self) -> ChatPromptTemplate:
        return self._disambiguation_prompt_template

    @disambiguation_prompt_template.setter
    def disambiguation_prompt_template(self, disambiguation_prompt_template) -> None:
        self._disambiguation_prompt_template = self.get_validated_disambiguation_prompt(
            disambiguation_prompt_template,
            self.model_defaults.disambiguation_prompt,
            DISAMBIGUATION_PROMPT_PLACEHOLDERS,
            self.disambiguation_prompt_enabled,
        )

    def enhanced_create_history_aware_retriever(
        self,
        llm: LanguageModelLike,
        retriever: RetrieverLike,
        prompt: BasePromptTemplate,
    ) -> RetrieverOutputLike:
        """
        Enhancement of langchain.chains.create_history_aware_retriever that allows passing of the intermediate rephrased question into the output using RunnablePassthrough

        If there is no `history`, then the `input` is just passed directly to the retriever. If there is `chat_history`, then the prompt and LLM will be used to generate a search query. That search query is then passed to the retriever.

        Args:
            llm: Language model to use for generating a search term given chat history
            retriever: RetrieverLike object that takes a string as input and outputs
                a list of Documents.
            prompt: The prompt used to generate the search query for the retriever.

        Returns:
            An LCEL Runnable. The runnable input must take in `input`, and if there
            is chat history should take it in the form of `history`.
            The Runnable output is a list of Documents and the rephrased query
        """
        if INPUT_KEY not in prompt.input_variables:
            raise ValueError(f"Expected `{INPUT_KEY}` to be a prompt variable but got {prompt.input_variables}")

        rephrased_question = RunnableBranch(
            (
                # Both empty string and empty list evaluate to False
                lambda x: not x.get(HISTORY_KEY, False),
                # If no chat history, then we just pass input to retriever
                (lambda x: x[INPUT_KEY]),
            ),
            # If chat history, then we pass inputs to LLM chain, then to retriever
            prompt | llm | StrOutputParser(),
        ).with_config(run_name="chat_retriever_chain")

        retrieve_documents_with_rephrased_question: RetrieverOutputLike = (
            RunnablePassthrough.assign(rephrased_query=rephrased_question)
            .assign(
                retriever=(lambda x: x[REPHRASED_QUERY_KEY]) | retriever,
            )
            .with_config(run_name="chat_retrieve_documents_with_rephrased_question")
        )

        return retrieve_documents_with_rephrased_question

    def enhanced_create_stuff_documents_chain(
        self,
        llm: LanguageModelLike,
        prompt: BasePromptTemplate,
        rephrased_question: Optional[str] = None,
        *,
        output_parser: Optional[BaseOutputParser] = None,
        document_prompt: Optional[BasePromptTemplate] = None,
        document_separator: str = DEFAULT_DOCUMENT_SEPARATOR,
        document_variable_name: str = DOCUMENTS_KEY,
    ) -> Runnable[Dict[str, Any], Any]:
        """
        Enhancement of the langchain.chains.combine_documents.create_stuff_documents_chain that allows rephrased question to be passed as an input to the LLM when a rephrased question is passed to it and stops the chain
        at the retriever stage if no docs are found.

        Args:
            llm (LanguageModelLike): Language model.
            prompt (BasePromptTemplate): Prompt template. Must contain input variable "context" (override by
                setting document_variable), which will be used for passing in the formatted documents.
            rephrased_question (str): If provided, it will be used as input to the LLM instead of the
                original question
            output_parser (BaseOutputParser): Output parser. Defaults to StrOutputParser.
            document_prompt (BasePromptTemplate): Prompt used for formatting each document into a string. Input
                variables can be "page_content" or any metadata keys that are in all
                documents. "page_content" will automatically retrieve the
                `Document.page_content`, and all other inputs variables will be
                automatically retrieved from the `Document.metadata` dictionary. Default to
                a prompt that only contains `Document.page_content`.
            document_separator (str): String separator to use between formatted document strings.
            document_variable_name (str): Variable name to use for the formatted documents in the prompt.
                Defaults to "context".

        Returns:
        An LCEL Runnable. The input is a dictionary that must have a "context" key that
        maps to a List[Document], and any other input variables expected in the prompt.
        The Runnable return type depends on output_parser used.
        """
        _validate_prompt(prompt, document_variable_name)
        _document_prompt = document_prompt or DEFAULT_DOCUMENT_PROMPT
        _output_parser = output_parser or StrOutputParser()

        def format_docs(inputs: dict) -> str:
            return document_separator.join(
                format_document(doc, _document_prompt) for doc in inputs[document_variable_name]
            )

        llm_chain = (
            # Input is passed as rephrased_question if rephrased_question is available
            RunnablePassthrough.assign(
                input=lambda x: rephrased_question if rephrased_question is not None else x[INPUT_KEY]
            ).with_config(run_name="format_inputs")
            | prompt
            | llm
        )

        # In case response_if_no_docs_found is not provided and retrieved docs are empty, let the LLM decide the response
        if self.response_if_no_docs_found is None:
            default_chain = llm_chain
        else:
            default_chain = lambda x: self.response_if_no_docs_found

        # RunnableBranch allows conditional logic: if documents are available then follow the first branch else
        # return default_chain
        retrieval_chain = (
            RunnablePassthrough.assign(document_variable_name=format_docs)
            | RunnableBranch(
                (
                    lambda x: len(x[document_variable_name]),
                    llm_chain,
                ),
                default_chain,
            )
            | _output_parser
        ).with_config(run_name="stuff_documents_chain")

        return retrieval_chain

    def enhanced_create_retrieval_chain(
        self,
        retriever: Union[BaseRetriever, Runnable[dict, RetrieverOutput]],
        combine_docs_chain: Runnable[Dict[str, Any], str],
        rephrased_question: Optional[str] = None,
    ) -> Runnable:
        """
        Enhancement of the langchain.chains.create_retrieval_chain that allows rephrased question to be passed into the final output from the model

        Args:
            retriever: Retriever-like object that returns list of documents. Should
                either be a subclass of BaseRetriever or a Runnable that returns
                a list of documents. If a subclass of BaseRetriever, then it
                is expected that an `input` key be passed in - this is what
                is will be used to pass into the retriever. If this is NOT a
                subclass of BaseRetriever, then all the inputs will be passed
                into this runnable, meaning that runnable should take a dictionary
                as input.
            combine_docs_chain: Runnable that takes inputs and produces a string output.
                The inputs to this will be any original inputs to this chain, a new
                context key with the retrieved documents, and chat_history (if not present
                in the inputs) with a value of `[]` (to easily enable conversational
                retrieval.
            rephrased_question (str): If provided, it will be used as input to the LLM instead of the
                original question

        Returns:
            An LCEL Runnable. The Runnable return is a dictionary containing at the very
            least a `context` and `answer` key.
        """
        if not isinstance(retriever, BaseRetriever):
            retrieval_docs: Runnable[dict, RetrieverOutput] = retriever
        else:
            retrieval_docs = (lambda x: x[INPUT_KEY]) | retriever

        retrieval_chain = RunnablePassthrough.assign(
            context=retrieval_docs.with_config(run_name="retrieve_documents"),
        ).assign(answer=combine_docs_chain)

        if rephrased_question:
            retrieval_chain = retrieval_chain.assign(rephrased_query=rephrased_question)

        return retrieval_chain.with_config(run_name="retrieval_chain")

    def get_runnable(self) -> Union[RunnableWithMessageHistory, RunnableBinding]:
        """
        Creates a `RunnableWithMessageHistory` (for non-streaming) or `RunnableBinding` (for streaming case) runnable that is connected to a conversation memory and the specified prompt
        Args: None

        Returns:
            RunnableWithMessageHistory/RunnableBinding: A runnable that manages chat message history
        """

        if self.disambiguation_prompt_enabled:
            retrieve_documents_with_rephrased_question = self.enhanced_create_history_aware_retriever(
                self.disambiguation_llm, self.knowledge_base.retriever, self.disambiguation_prompt_template
            )

            history_aware_retriever = retrieve_documents_with_rephrased_question | itemgetter("retriever")
            if self.rephrase_question:
                rephrased_question = retrieve_documents_with_rephrased_question | itemgetter(REPHRASED_QUERY_KEY)
            else:
                rephrased_question = None

            retriever = history_aware_retriever
        else:
            # Using enhanced methods for this case also allows usage of response_if_no_docs found case with
            # disambiguation enabled.
            # Note that when disambiguation is disabled, rephrased_question cannot be set.
            retriever = self.knowledge_base.retriever
            rephrased_question = None

        qa_chain = self.enhanced_create_stuff_documents_chain(self.llm, self.prompt_template, rephrased_question)
        conversation_qa_chain = self.enhanced_create_retrieval_chain(retriever, qa_chain, rephrased_question)

        with_message_history = RunnableWithMessageHistory(
            conversation_qa_chain,
            get_session_history=self.get_session_history,
            input_messages_key=INPUT_KEY,
            history_messages_key=HISTORY_KEY,
            output_messages_key="answer",
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
            ],
        )

        if self.streaming:
            with_message_history = with_message_history.with_config(RunnableConfig(callbacks=self.callbacks))

        return with_message_history

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

        Child classes implement error handling (and flushing metrics) based on specific errors
        """
        logger.debug(f"Prompt for LLM: {self.prompt_template}")

        if self.disambiguation_prompt_enabled:
            logger.debug(f"Disambiguation prompt for LLM: {self.disambiguation_prompt_template}")

        invoke_configuration = {
            "configurable": {
                "conversation_id": self.conversation_history_params["conversation_id"],
                "user_id": self.conversation_history_params["user_id"],
            }
        }

        with tracer.provider.in_subsegment("## llm_chain") as subsegment:
            subsegment.put_annotation("library", "langchain")
            subsegment.put_annotation("operation", RAG_CONVERSATION_TRACER_KEY)
            metrics.add_metric(name=CloudWatchMetrics.LANGCHAIN_QUERY.value, unit=MetricUnit.Count, value=1)
            response = {}
            start_time = time.time()
            model_response = self.runnable_with_history.invoke({INPUT_KEY: question}, invoke_configuration)
            end_time = time.time()
            response[LLM_RESPONSE_KEY] = model_response[LLM_RESPONSE_KEY].strip()

            if self.return_source_docs:
                if SOURCE_DOCUMENTS_RECEIVED_KEY in model_response and model_response[SOURCE_DOCUMENTS_RECEIVED_KEY]:
                    response[SOURCE_DOCUMENTS_OUTPUT_KEY] = self.knowledge_base.source_docs_formatter(
                        model_response[SOURCE_DOCUMENTS_RECEIVED_KEY]
                    )
                else:
                    response[SOURCE_DOCUMENTS_OUTPUT_KEY] = []
                    response[LLM_RESPONSE_KEY] = self.response_if_no_docs_found

            if self.disambiguation_prompt_enabled and REPHRASED_QUERY_KEY in model_response:
                response[REPHRASED_QUERY_KEY] = model_response[REPHRASED_QUERY_KEY]
                logger.debug(f"Disambiguated/rephrased question: {response[REPHRASED_QUERY_KEY]}")

            metrics.add_metric(
                name=CloudWatchMetrics.LANGCHAIN_QUERY_PROCESSING_TIME.value,
                unit=MetricUnit.Seconds,
                value=(end_time - start_time),
            )
            logger.debug(f"LLM response: {response[LLM_RESPONSE_KEY]}")
            return response

    def get_validated_disambiguation_prompt(
        self,
        disambiguation_prompt_template: Optional[str],
        default_disambiguation_prompt_template: str,
        disambiguation_prompt_template_placeholders: Optional[List[str]] = DISAMBIGUATION_PROMPT_PLACEHOLDERS,
        disambiguation_prompt_enabled: bool = DEFAULT_DISAMBIGUATION_ENABLED_MODE,
    ) -> Union[ChatPromptTemplate, None]:
        """
        Generates the ChatPromptTemplate using the provided prompt template and placeholders.
        If template is not set or if it is invalid, the default is used.
        Args:
            disambiguation_prompt_template (str): the prompt template to be used
            default_disambiguation_prompt_template (str): the default prompt template to be used in case of failures
            disambiguation_prompt_template_placeholders (List[str]): the list of default prompt template placeholders
            disambiguation_prompt_enabled (bool): whether disambiguation is enabled or not
        Returns:
            ChatPromptTemplate: the disambiguation/condensing prompt template object with the prompt template and placeholders set
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
                validate_prompt_placeholders(
                    disambiguation_prompt_template, disambiguation_prompt_template_placeholders
                )
                prompt_template_text = disambiguation_prompt_template

            else:
                message = f"Disambiguation prompt template not provided. Falling back to default disambiguation prompt template."
                logger.warning(message, xray_trace_id=os.environ[TRACE_ID_ENV_VAR])
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
        return ChatPromptTemplate.from_template(prompt_template_text)
