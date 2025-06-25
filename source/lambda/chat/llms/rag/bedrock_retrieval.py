#!/usr/bin/env python
# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

import os
from typing import Any, Dict

from aws_lambda_powertools import Logger, Tracer
from aws_lambda_powertools.metrics import MetricUnit
from helper import get_service_client
from langchain_aws import ChatBedrockConverse
from langchain_core.prompts import ChatPromptTemplate

from llms.models.model_provider_inputs import ModelProviderInputs
from llms.rag.retrieval_llm import RetrievalLLM
from shared.defaults.model_defaults import ModelDefaults
from utils.constants import BEDROCK_GUARDRAILS_KEY, TOP_LEVEL_PARAMS_MAPPING, TRACE_ID_ENV_VAR
from utils.custom_exceptions import LLMInvocationError
from utils.enum_types import CloudWatchMetrics, CloudWatchNamespaces, LLMProviderTypes
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
            model_family (BedrockModelProviders): A string which represents the model family
            model (str): Bedrock model name that represents the underlying LLM
            model_params (dict): A dictionary of model parameters, which can be obtained from the Bedrock documentation [optional]
            prompt_template (str): A string which represents the prompt template [optional, defaults to prompt template provided in ModelInfoStorage DynamoDB table]
            streaming (bool): A boolean which represents whether the chat is streaming or not [optional, defaults to value provided in ModelInfoStorage DynamoDB table]
            verbose (bool): A boolean which represents whether the chat is verbose or not [optional, defaults to DEFAULT_VERBOSE_MODE]
            temperature (float): A non-negative float that tunes the degree of randomness in model response generation [optional, defaults to temperature
                provided in ModelInfoStorage DynamoDB table]
            callbacks (list): A list of BaseCallbackHandler objects which are used for the LLM callbacks [optional, defaults to None]

        - model_defaults (ModelDefaults): A ModelDefaults object which contains default values for the model retrieved from ModelInfoStorage DynamoDB table
        - model_family (BedrockModelProviders): A string which represents the model family
        - return_source_docs (bool): A boolean which represents whether the source documents are returned or not [optional, defaults to DEFAULT_RETURN_SOURCE_DOCS]

    Methods:
       - get_runnable(): Creates a 'RunnableWithMessageHistory' (in case of non-streaming) or 'RunnableBinding' (in case of streaming) LangChain runnable that is connected to a conversation memory and the specified prompt. In case of Retrieval Augmented Generated (RAG) use cases, this is also connected to a knowledge base.
        - get_session_history(user_id, conversation_id): Retrieves the conversation history from the conversation memory based on the user_id and conversation_id.
        - generate(question, operation): Invokes the LLM to fetch a response for the given question. Operation is used for metrics.
        - get_validated_prompt(prompt_template, prompt_template_placeholders, llm_provider, rag_enabled): Generates the ChatPromptTemplate using the provided prompt template and
         placeholders. In case of errors, raises ValueError
        - get_llm(): Returns the underlying LLM object that is used by the runnable. Each child class must provide its own implementation.
        - get_clean_model_params(): Returns the cleaned and formatted model parameters that are used by the LLM. Each child class must provide its own implementation based on the model parameters it supports.
        - get_validated_disambiguation_prompt(disambiguation_prompt_template, disambiguation_prompt_placeholders, disambiguation_prompt_enabled): Generates the ChatPromptTemplate used for disambiguating the question using conversation history.
          It uses the provided prompt template and placeholders. In case of errors, it raises ValueError
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
            error_message = f"Model Name and Model Family are required to initialize BedrockRetrievalLLM. Received model family as '{model_inputs.model_family}' and model name as '{model_inputs.model}'"
            logger.error(error_message, xray_trace_id=os.environ[TRACE_ID_ENV_VAR])
            raise ValueError(error_message)

        self.model_arn = model_inputs.model_arn
        self.guardrails = model_inputs.guardrails
        self.model_params = self.get_clean_model_params(model_inputs.model_params)

        self.llm = self.get_llm()
        self.disambiguation_llm = self.get_llm()
        self.chain = self.get_chain()
        self.runnable_with_history = self.get_runnable()

    @property
    def prompt_template(self) -> ChatPromptTemplate:
        return self._prompt_template

    @prompt_template.setter
    def prompt_template(self, prompt_template) -> None:
        prompt_placeholders = self._model_inputs.prompt_placeholders
        self._prompt_template = self.get_validated_prompt(
            prompt_template, prompt_placeholders, LLMProviderTypes.BEDROCK, True
        )

    def get_llm(self, *args, **kwargs) -> ChatBedrockConverse:
        """
        Creates a LangChain `LLM` object which is used to generate chat responses.

        Args:
            condense_prompt_model (bool): Flag that indicates whether to create a model for regular chat or
                for disambiguating/condensing of the prompt for RAG use-cases.
                callbacks and streaming are disabled when this flag is set to True

        Returns:
            (ChatBedrockConverse) The created LangChain LLM object that can be invoked in a conversation chain
        """
        bedrock_client = get_service_client("bedrock-runtime")

        if self.model_arn is not None:
            model = self.model_arn
        else:
            model = self.model

        # Initialize request options with required parameters
        request_options = {
            "client": bedrock_client,
            "model_id": model,
            "provider": self.model_family,
            "verbose": self.verbose,
        }

        # Extract top-level parameters into request_options
        request_options.update(
            {
                TOP_LEVEL_PARAMS_MAPPING[param]: self.model_params[param]
                for param in TOP_LEVEL_PARAMS_MAPPING
                if param in self.model_params
            }
        )

        # Add remaining parameters as additional_model_request_fields
        additional_model_request_fields = {
            key: value for key, value in self.model_params.items() if key not in TOP_LEVEL_PARAMS_MAPPING
        }

        if additional_model_request_fields:
            request_options["additional_model_request_fields"] = additional_model_request_fields

        if self.guardrails is not None:
            request_options[BEDROCK_GUARDRAILS_KEY] = self.guardrails

        logger.debug(f"Request options: {request_options}")

        return ChatBedrockConverse(**request_options)

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
        sanitized_model_params["temperature"] = float(self.temperature)
        return sanitized_model_params

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
            response = super().generate(question)
            logger.debug(f"Model response: {response}")
            return response
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
