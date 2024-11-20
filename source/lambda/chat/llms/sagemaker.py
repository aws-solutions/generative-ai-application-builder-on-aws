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
from typing import Any, Dict, Tuple

from aws_lambda_powertools import Logger, Tracer
from aws_lambda_powertools.metrics import MetricUnit
from botocore.exceptions import ClientError, EndpointConnectionError
from helper import get_service_client
from langchain_aws.llms.sagemaker_endpoint import SagemakerEndpoint
from llms.base_langchain import BaseLangChainModel
from llms.models.model_provider_inputs import SageMakerInputs
from llms.models.sagemaker.content_handler import SageMakerContentHandler
from pydantic_core import ValidationError
from shared.defaults.model_defaults import ModelDefaults
from utils.constants import (
    SAGEMAKER_ENDPOINT_ARGS,
    TEMPERATURE_PLACEHOLDER_STR,
    TRACE_ID_ENV_VAR,
)
from utils.custom_exceptions import LLMInvocationError
from utils.enum_types import CloudWatchMetrics, CloudWatchNamespaces
from utils.helpers import get_metrics_client

tracer = Tracer()
logger = Logger(utc=True)
sagemaker_metrics = get_metrics_client(CloudWatchNamespaces.AWS_SAGEMAKER)
langchain_metrics = get_metrics_client(CloudWatchNamespaces.LANGCHAIN_LLM)


class SageMakerLLM(BaseLangChainModel):
    """
    SageMakerLLM is a wrapper around the LangChain SageMaker LLM which can generate chat responses, provided a conversation memory.

    Attributes:
        - model_defaults (ModelDefaults): The default values for the model, as specified on a per-model basis in the source/model-info files
        - model_inputs (SageMakerInputs): The model inputs that the user provided. Each model_input object consists of all the required properties to deploy a Bedrock model such as the type of Conversation Memory class (DynamoDB for example), the type of knowledge base (Kendra, Bedrock KB, etc.) and their associated properties.


    Methods:
        - get_runnable(): Creates a 'RunnableWithMessageHistory' (in case of non-streaming) or 'RunnableBinding' (in case of streaming) LangChain runnable that is connected to a conversation memory and the specified prompt. In case of Retrieval Augmented Generated (RAG) use cases, this is also connected to a knowledge base.
        - get_session_history(user_id, conversation_id): Retrieves the conversation history from the conversation memory based on the user_id and conversation_id.
        - generate(question, operation): Invokes the LLM to fetch a response for the given question. Operation is used for metrics.
        - get_validated_prompt(prompt_template, prompt_template_placeholders, default_prompt_template,
        default_prompt_template_placeholders): Generates the ChatPromptTemplate using the provided prompt template and
        placeholders. In case of errors, falls back on default values.
        - get_llm(): Returns the BedrockChat/BedrockLLM object that is used by the runnable.
         get_clean_model_params(): Returns the cleaned and formatted model parameters that are used by the LLM. SageMakerLLM also allows you to send additional endpoint arguments to the SageMaker Endpoint. For more information, refer SageMakerInputs dataclass.

    See boto3 documentation for InvokeEndpoint (https://docs.aws.amazon.com/sagemaker/latest/APIReference/API_runtime_InvokeEndpoint.html) documentation - this is the underlying API called for SageMaker model invocation.

    See SageMaker documentation for information on sagemaker endpoints. You can also browse specific model notebooks to infer model input_schema and response_jsonpath
    """

    def __init__(
        self,
        model_defaults: ModelDefaults,
        model_inputs: SageMakerInputs,
    ) -> None:
        super().__init__(
            model_defaults=model_defaults,
            model_inputs=model_inputs,
        )
        self.model = model_inputs.model

        if model_inputs.sagemaker_endpoint_name is None or not model_inputs.sagemaker_endpoint_name:
            raise ValueError("SageMaker endpoint name is required.")

        if not model_inputs.input_schema:
            raise ValueError("SageMaker input schema is required.")

        if not model_inputs.response_jsonpath:
            raise ValueError("SageMaker response JSONPath is required.")

        self.sagemaker_endpoint_name = model_inputs.sagemaker_endpoint_name
        self._input_schema = model_inputs.input_schema
        self._response_jsonpath = model_inputs.response_jsonpath
        self.model_params, self.endpoint_params = self.get_clean_model_params(model_inputs.model_params)
        self.llm = self.get_llm()
        self.runnable_with_history = self.get_runnable()

    @property
    def sagemaker_endpoint_name(self) -> bool:
        return self._sagemaker_endpoint_name

    @sagemaker_endpoint_name.setter
    def sagemaker_endpoint_name(self, sagemaker_endpoint_name) -> None:
        self._sagemaker_endpoint_name = sagemaker_endpoint_name

    @property
    def input_schema(self) -> Dict[str, Any]:
        return self._input_schema

    @property
    def response_jsonpath(self) -> str:
        return self._response_jsonpath

    @property
    def endpoint_params(self) -> Dict[str, Any]:
        return self._endpoint_params

    @endpoint_params.setter
    def endpoint_params(self, endpoint_params) -> None:
        self._endpoint_params = endpoint_params

    def get_llm(self, *args, **kwargs) -> SagemakerEndpoint:
        """
        Creates a SagemakerEndpoint LLM based on supplied params

        Returns:
            (SagemakerEndpoint) The created LangChain LLM object that can be invoked in a conversation chain
        """
        sagemaker_client = get_service_client("sagemaker-runtime")
        content_handler = SageMakerContentHandler(
            input_schema=self.input_schema,
            output_path_expression=self.response_jsonpath,
        )

        return SagemakerEndpoint(
            endpoint_name=self.sagemaker_endpoint_name,
            client=sagemaker_client,
            model_kwargs=self.model_params,
            content_handler=content_handler,
            streaming=self.streaming,
            endpoint_kwargs=self.endpoint_params,
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
        error_message = f"Error occurred while invoking SageMaker endpoint: '{self.sagemaker_endpoint_name}'. "
        try:
            return super().generate(question)
        except ValidationError as ve:
            error_message = (
                error_message
                + f"Ensure that the input schema and output path expressions are correct for your SageMaker model. Error: {ve}"
            )
            logger.error(error_message, xray_trace_id=os.environ[TRACE_ID_ENV_VAR])
            langchain_metrics.add_metric(
                name=CloudWatchMetrics.LANGCHAIN_FAILURES.value, unit=MetricUnit.Count, value=1
            )
            raise LLMInvocationError(error_message)

        except ClientError as ce:
            if ce.response["Error"]["Code"] == "ValidationException":
                error_message = error_message + "Please ensure that the endpoint you provided exists."

            else:
                error_message = error_message + str(ce)

            logger.error(error_message, xray_trace_id=os.environ[TRACE_ID_ENV_VAR])
            sagemaker_metrics.add_metric(
                name=CloudWatchMetrics.SAGEMAKER_MODEL_INVOCATION_FAILURE.value, unit=MetricUnit.Count, value=1
            )
            raise LLMInvocationError(error_message)

        except EndpointConnectionError as ex:
            error_message = error_message + "Please ensure that the endpoint you provided exists."
            logger.error(error_message, xray_trace_id=os.environ[TRACE_ID_ENV_VAR])
            sagemaker_metrics.add_metric(
                name=CloudWatchMetrics.SAGEMAKER_MODEL_INVOCATION_FAILURE.value, unit=MetricUnit.Count, value=1
            )
            raise LLMInvocationError(error_message)

        except Exception as ex:
            error_message = error_message + str(ex)
            logger.error(error_message, xray_trace_id=os.environ[TRACE_ID_ENV_VAR])
            langchain_metrics.add_metric(
                name=CloudWatchMetrics.LANGCHAIN_FAILURES.value, unit=MetricUnit.Count, value=1
            )
            raise LLMInvocationError(error_message)
        finally:
            sagemaker_metrics.flush_metrics()
            langchain_metrics.flush_metrics()

    @tracer.capture_method(capture_response=True)
    def get_clean_model_params(self, model_params: Dict[str, Any]) -> Tuple[Dict[str, Any], Dict[str, Any]]:
        """
        Sanitizes and returns the model params and endpoint params for use with SageMaker models.

        Args:
            model_params (Dict): the model params that must be cleaned, for example: { param_name: param_value }

        Returns:
            (Dict): Sanitized model params
        """
        sanitized_model_params = super().get_clean_model_params(model_params)
        # TEMPERATURE_PLACEHOLDER is replaced in the input_schema using a lookup of TEMPERATURE_PLACEHOLDER_STR
        # in model input schema
        sanitized_endpoint_params = {}

        # sanitized_model_params contains model params and endpoint params which are sent separately to SagemakerEndpoint.
        # The endpoint params are removed from sanitized_model_params and added to sanitized_endpoint_params dict
        for arg in SAGEMAKER_ENDPOINT_ARGS:
            if arg in sanitized_model_params:
                sanitized_endpoint_params[arg] = sanitized_model_params[arg]
                del sanitized_model_params[arg]

        if self.temperature:
            sanitized_model_params[TEMPERATURE_PLACEHOLDER_STR] = self.temperature
        return sanitized_model_params, sanitized_endpoint_params
