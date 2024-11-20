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
from typing import Any, Dict, Union

from aws_lambda_powertools import Logger, Tracer
from aws_lambda_powertools.metrics import MetricUnit
from helper import get_service_client
from langchain_aws.chat_models.bedrock import ChatBedrock
from langchain_aws.llms.bedrock import BedrockLLM as Bedrock
from llms.base_langchain import BaseLangChainModel
from llms.factories.bedrock_adapter_factory import BedrockAdapterFactory
from llms.models.model_provider_inputs import BedrockInputs
from shared.defaults.model_defaults import ModelDefaults
from utils.constants import BETA_USE_CONVERSE_API_MODELS, CHATBEDROCK_MODELS, TRACE_ID_ENV_VAR
from utils.custom_exceptions import LLMBuildError, LLMInvocationError
from utils.enum_types import CloudWatchMetrics, CloudWatchNamespaces
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
        - get_validated_prompt(prompt_template, prompt_template_placeholders, default_prompt_template,
        default_prompt_template_placeholders): Generates the ChatPromptTemplate using the provided prompt template and
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
            raise ValueError(
                f"Model Name and Model Family are required to initialize BedrockLLM. Received model family as '{model_inputs.model_family}' and model name as '{model_inputs.model}'"
            )

        self.model_arn = model_inputs.model_arn
        self.guardrails = model_inputs.guardrails
        self.model_params = self.get_clean_model_params(model_inputs.model_params)
        self.llm = self.get_llm()
        self.runnable_with_history = self.get_runnable()

    @property
    def model_family(self) -> str:
        return self._model_family

    @model_family.setter
    def model_family(self, model_family) -> None:
        self._model_family = model_family

    def get_llm(self, *args, **kwargs) -> Union[Bedrock, ChatBedrock]:
        """
        Creates a LangChain `LLM` object which is used to generate chat responses.

        Returns:
            (Bedrock) The created LangChain LLM object that can be invoked in a conversation chain
        """
        bedrock_client = get_service_client("bedrock-runtime")

        if self.model_arn is not None:
            model = self.model_arn
        else:
            model = self.model

        request_options = {
            "client": bedrock_client,
            "model_id": model,
            "provider": self.model_family,
            "model_kwargs": self.model_params,
            "streaming": self.streaming,
        }

        if self.guardrails is not None:
            request_options["guardrails"] = self.guardrails

        if model in BETA_USE_CONVERSE_API_MODELS:
            request_options["beta_use_converse_api"] = True

        if self.model_family in CHATBEDROCK_MODELS or "beta_use_converse_api" in request_options:
            request_options["verbose"] = self.verbose
            return ChatBedrock(**request_options)
        else:
            return Bedrock(**request_options)

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
            return super().generate(question)
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
        bedrock_adapter = BedrockAdapterFactory().get_bedrock_adapter(self.model_family, self.model)

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
