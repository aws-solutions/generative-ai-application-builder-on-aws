#!/usr/bin/env python
# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

import os
from typing import Any, Dict, List

from aws_lambda_powertools import Logger, Tracer
from aws_lambda_powertools.metrics import MetricUnit
from helper import get_service_client
from langchain_aws import ChatBedrockConverse
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder

from llms.base_langchain import BaseLangChainModel
from llms.models.model_provider_inputs import BedrockInputs
from shared.defaults.model_defaults import ModelDefaults
from utils.constants import BEDROCK_GUARDRAILS_KEY, TOP_LEVEL_PARAMS_MAPPING, TRACE_ID_ENV_VAR
from utils.custom_exceptions import LLMInvocationError
from utils.enum_types import CloudWatchMetrics, CloudWatchNamespaces, LLMProviderTypes
from utils.helpers import get_metrics_client

tracer = Tracer()
logger = Logger(utc=True)
metrics = get_metrics_client(CloudWatchNamespaces.LANGCHAIN_LLM)


class BedrockLLM(BaseLangChainModel):
    """
    BedrockLLM is a wrapper around the LangChain Bedrock API which can generate chat responses, provided a conversation memory.

    Attributes:
        - model_defaults (ModelDefaults): The default values for the model, as specified on a per-model basis in the source/model-info files
        - model_inputs (BedrockInputs): The model inputs that the user provided. Each model_input object consists of all the required properties to deploy a Bedrock model such as the type of Conversation Memory class (DynamoDB for example), the type of knowledge base (Kendra, Bedrock KB, etc.) and their associated properties.


    Methods:
        - get_runnable(): Creates a 'RunnableWithMessageHistory' (in case of non-streaming) or 'RunnableBinding' (in case of streaming) LangChain runnable that is connected to a conversation memory and the specified prompt. In case of Retrieval Augmented Generated (RAG) use cases, this is also connected to a knowledge base.
        - get_session_history(user_id, conversation_id): Retrieves the conversation history from the conversation memory based on the user_id and conversation_id.
        - generate(question, operation): Invokes the LLM to fetch a response for the given question. Operation is used for metrics.
        - get_validated_prompt(prompt_template, prompt_template_placeholders, llm_provider, rag_enabled): Generates the ChatPromptTemplate using the provided prompt template and
         placeholders. In case of errors, raises ValueError
        placeholders. In case of errors, falls back on default values.
        - get_llm(): Returns the BedrockChat/BedrockLLM object that is used by the runnable.
        - get_clean_model_params(): Returns the cleaned and formatted model parameters that are used by the LLM.

    See boto3 documentation for InvokeEndpointWithResponseStream (https://docs.aws.amazon.com/sagemaker/latest/APIReference/API_runtime_InvokeEndpointWithResponseStream.html) and InvokeEndpoint (https://docs.aws.amazon.com/sagemaker/latest/APIReference/API_runtime_InvokeEndpoint.html) documentation - these are the underlying APIs called for streaming and non-streaming SageMaker model invocations respectively.

    See Bedrock model parameters documentation for supported model arguments: https://docs.aws.amazon.com/bedrock/latest/userguide/model-parameters.html
    """

    def __init__(self, model_defaults: ModelDefaults, model_inputs: BedrockInputs) -> None:
        super().__init__(model_defaults=model_defaults, model_inputs=model_inputs)
        if (
            model_inputs.model is not None
            and model_inputs.model_family is not None
            and len(model_inputs.model)
            and len(model_inputs.model_family)
        ):
            self.model_family = model_inputs.model_family
            self.model = model_inputs.model
        else:
            error_message = f"Model Name and Model Family are required to initialize BedrockLLM. Received model family as '{model_inputs.model_family}' and model name as '{model_inputs.model}'"
            logger.error(error_message, xray_trace_id=os.environ[TRACE_ID_ENV_VAR])
            raise ValueError(error_message)

        self.model_arn = model_inputs.model_arn
        self.guardrails = model_inputs.guardrails
        self.model_params = self.get_clean_model_params(model_inputs.model_params)
        self.llm = self.get_llm()
        self.runnable_with_history = self.get_runnable()

    @property
    def prompt_template(self) -> ChatPromptTemplate:
        return self._prompt_template

    @prompt_template.setter
    def prompt_template(self, prompt_template) -> None:
        prompt_placeholders = self._model_inputs.prompt_placeholders
        self._prompt_template = self.get_validated_prompt(
            prompt_template, prompt_placeholders, LLMProviderTypes.BEDROCK, False
        )

    @property
    def model_family(self) -> str:
        return self._model_family

    @model_family.setter
    def model_family(self, model_family) -> None:
        self._model_family = model_family

    def get_llm(self, *args, **kwargs) -> ChatBedrockConverse:
        """
        Creates a LangChain `LLM` object which is used to generate chat responses.

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

    @tracer.capture_method(capture_response=True)
    def generate(self, question: str) -> Dict[str, Any]:
        """
        Fetches the response from the LLM

        Args:
            question (str): the question that should be sent to the LLM model

        Returns:
            (Dict): The LLM chat response message as a dictionary with the key `answer`
        """
        error_message = (
            f"Error occurred while invoking Bedrock model family '{self.model_family}' model '{self.model}'. "
        )
        try:
            response = super().generate(question)
            logger.debug(f"Model response: {response}")
            return response
        except Exception as ex:
            error_message = error_message + str(ex)
            logger.error(
                error_message,
                xray_trace_id=os.environ[TRACE_ID_ENV_VAR],
            )
            metrics.add_metric(name=CloudWatchMetrics.LANGCHAIN_FAILURES, unit=MetricUnit.Count, value=1)
            raise LLMInvocationError(error_message)
        finally:
            metrics.flush_metrics()

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
