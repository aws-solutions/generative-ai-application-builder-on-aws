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
from typing import Any, Dict, Union

from aws_lambda_powertools import Logger, Tracer
from aws_lambda_powertools.metrics import MetricUnit
from helper import get_service_client
from langchain_aws.chat_models.bedrock import ChatBedrock
from langchain_aws.llms.bedrock import BedrockLLM as Bedrock
from llms.factories.bedrock_adapter_factory import BedrockAdapterFactory
from llms.models.model_provider_inputs import ModelProviderInputs
from llms.rag.retrieval_llm import RetrievalLLM
from shared.defaults.model_defaults import ModelDefaults
from utils.constants import (
    DEFAULT_BEDROCK_MODEL_FAMILY,
    DEFAULT_BEDROCK_MODELS_MAP,
    TRACE_ID_ENV_VAR,
)
from utils.custom_exceptions import LLMBuildError, LLMInvocationError
from utils.enum_types import BedrockModelProviders, CloudWatchMetrics, CloudWatchNamespaces
from utils.helpers import get_metrics_client

tracer = Tracer()
logger = Logger(utc=True)
metrics = get_metrics_client(CloudWatchNamespaces.LANGCHAIN_LLM)


class BedrockRetrievalLLM(RetrievalLLM):
    """
    BedrockRetrievalLLM is a wrapper around the Bedrock LangChain API which can generate chat responses, provided a conversation memory
    and knowledge base. Specifically, this enables the usage of RAG with Bedrock available models.

    Attributes:
        - model_inputs: LLM dataclass object which has the following:
            conversation_memory (BaseMemory): A BaseMemory object which helps store and access user chat history
            knowledge_base (KnowledgeBase): A KnowledgeBase object which retrieves information from the user's knowledge base for LLM context
            return_source_docs (bool): A boolean which represents whether the source documents are returned or not [optional, defaults to DEFAULT_RETURN_SOURCE_DOCS]
            model_family (BedrockModelProviders): A string which represents the model family [optional, defaults to DEFAULT_BEDROCK_MODEL_FAMILY]
            model (str): Bedrock model name that represents the underlying LLM [optional, defaults to DEFAULT_BEDROCK_MODELS_MAP defined default]
            model_params (dict): A dictionary of model parameters, which can be obtained from the Bedrock documentation [optional]
            prompt_template (str): A string which represents the prompt template [optional, defaults to prompt template provided in ModelInfoStorage DynamoDB table]
            streaming (bool): A boolean which represents whether the chat is streaming or not [optional, defaults to value provided in ModelInfoStorage DynamoDB table]
            verbose (bool): A boolean which represents whether the chat is verbose or not [optional, defaults to DEFAULT_VERBOSE_MODE]
            temperature (float): A non-negative float that tunes the degree of randomness in model response generation [optional, defaults to temperature
                provided in ModelInfoStorage DynamoDB table]
            callbacks (list): A list of BaseCallbackHandler objects which are used for the LLM callbacks [optional, defaults to None]

        - model_defaults (ModelDefaults): A ModelDefaults object which contains default values for the model retrieved from ModelInfoStorage DynamoDB table
        - model_family (BedrockModelProviders): A string which represents the model family [optional, defaults to DEFAULT_BEDROCK_MODEL_FAMILY]. When model_family
            is not provided, whether the model is provided or not, the model will be set to the default model within the DEFAULT_BEDROCK_MODEL_FAMILY
        - return_source_docs (bool): A boolean which represents whether the source documents are returned or not [optional, defaults to DEFAULT_RETURN_SOURCE_DOCS]

    Methods:
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
        RetrievalLLM.__init__(self, model_inputs=model_inputs, model_defaults=model_defaults)
        if (
            model_inputs.model is not None
            and model_inputs.model_family is not None
            and len(model_inputs.model)
            and len(model_inputs.model_family)
        ):
            self.model = model_inputs.model
            self.model_family = model_inputs.model_family
        else:
            self.model = DEFAULT_BEDROCK_MODELS_MAP[DEFAULT_BEDROCK_MODEL_FAMILY]
            self.model_family = DEFAULT_BEDROCK_MODEL_FAMILY

        self.model_arn = model_inputs.model_arn
        self.guardrails = model_inputs.guardrails
        self.model_params = self.get_clean_model_params(model_inputs.model_params)

        self.llm = self.get_llm()
        self.disambiguation_llm = self.get_llm(condense_prompt_model=True)
        self.runnable_with_history = self.get_runnable()

    def get_llm(self, condense_prompt_model: bool = False, *args, **kwargs) -> Union[Bedrock, ChatBedrock]:
        """
        Creates a LangChain `LLM` object which is used to generate chat responses.

        Args:
            condense_prompt_model (bool): Flag that indicates whether to create a model for regular chat or
                for disambiguating/condensing of the prompt for RAG use-cases.
                callbacks and streaming are disabled when this flag is set to True

        Returns:
            (Bedrock) The created LangChain LLM object that can be invoked in a conversation chain
        """
        bedrock_client = get_service_client("bedrock-runtime")

        # condense_prompt_model refers to the model used for condensing a prompt for RAG use-cases
        # callbacks and streaming is disabled for this model
        streaming = False if condense_prompt_model else self.streaming

        if self.model_arn is not None:
            model = self.model_arn
        else:
            model = self.model

        request_options = {
            "client": bedrock_client,
            "model_id": model,
            "provider": self.model_family,
            "model_kwargs": self.model_params,
            "streaming": streaming,
            "verbose": self.verbose,
        }

        if self.guardrails is not None:
            request_options["guardrails"] = self.guardrails

        request_options["verbose"] = self.verbose
        if self.model_family == BedrockModelProviders.ANTHROPIC:
            request_options["verbose"] = self.verbose
            return ChatBedrock(**request_options)
        else:
            return Bedrock(**request_options)

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
        bedrock_adapter = BedrockAdapterFactory().get_bedrock_adapter(self.model_family, self.model)
        sanitized_model_params["temperature"] = float(self.temperature)

        try:
            bedrock_llm_params_dict = bedrock_adapter(
                **sanitized_model_params, model_defaults=self.model_defaults
            ).get_params_as_dict()
        except TypeError as error:
            error_message = (
                f"Error occurred while building Bedrock family '{self.model_family}' model '{self.model}'. "
                "Ensure that the model params provided are correct and they match the model specification. "
                f"Received params: {sanitized_model_params}. Error: {error}"
            )
            logger.error(error_message)
            raise LLMBuildError(error_message)

        return bedrock_llm_params_dict

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
        """
        error_message = (
            f"Error occurred while invoking Bedrock model family '{self.model_family}' model '{self.model}'. "
        )
        try:
            return super().generate(question)
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
