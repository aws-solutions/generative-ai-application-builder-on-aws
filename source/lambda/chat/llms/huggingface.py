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

from aws_lambda_powertools import Logger, Tracer
from aws_lambda_powertools.metrics import MetricUnit
from huggingface_hub.utils import RepositoryNotFoundError
from langchain_community.llms.huggingface_endpoint import HuggingFaceEndpoint
from llms.base_langchain import BaseLangChainModel
from llms.models.llm import LLM
from shared.defaults.model_defaults import ModelDefaults
from utils.constants import DEFAULT_HUGGINGFACE_TASK, DEFAULT_MODELS_MAP, DEFAULT_RAG_ENABLED_MODE, TRACE_ID_ENV_VAR
from utils.custom_exceptions import LLMBuildError, LLMInvocationError
from utils.enum_types import CloudWatchMetrics, CloudWatchNamespaces, LLMProviderTypes
from utils.helpers import enforce_stop_tokens, get_metrics_client

tracer = Tracer()
logger = Logger(utc=True)
metrics = get_metrics_client(CloudWatchNamespaces.LANGCHAIN_LLM)


class HuggingFaceLLM(BaseLangChainModel):
    """
    HuggingFaceLLM is a wrapper around the HuggingFace Hub LangChain API which can generate chat responses, provided a conversation memory.

    Attributes:
        - llm_params: LLM dataclass object which has the following:
            api_token (str): HuggingFace API token, which can be obtained from the HuggingFace Hub
            conversation_memory (BaseMemory): A BaseMemory object which helps store and access user chat history
            knowledge_base (KnowledgeBase): A KnowledgeBase object which retrieves information from the user's knowledge base for LLM context. This
               field is only used when the child class HuggingFaceRetrievalLLM passes this value, else for regular non-RAG chat this is set to None.
            model (str): HuggingFace Hub model, which can be obtained from the HuggingFace Hub. Represents the underlying LLM model
                [optional, defaults to DEFAULT_MODELS_MAP[LLMProviderTypes.HUGGINGFACE.value]]
            model_params (dict): A dictionary of model parameters, which can be obtained from the HuggingFace Hub documentation [optional]
            prompt_template (str): A string which represents the prompt template [optional, defaults to prompt template provided in ModelInfoStorage DynamoDB table]
            streaming (bool): A boolean which represents whether the chat is streaming or not [optional, defaults to streaming value provided in ModelInfoStorage
                DynamoDB table]
            verbose (bool): A boolean which represents whether the chat is verbose or not [optional, defaults to DEFAULT_VERBOSE_MODE]
            temperature (float): A non-negative float that tunes the degree of randomness in model response generation [optional, defaults to temperature provided in
                ModelInfoStorage DynamoDB table]

        - model_defaults (ModelDefaults): A ModelDefaults object which contains default values for the model retrieved from ModelInfoStorage DynamoDB table
        - inference_endpoint (str): A string which represents the HuggingFace inference endpoint. When provided, the model is ignored and the model sends request
            to this endpoint [optional]
        - rag_enabled (bool): A boolean which represents whether the RAG is enabled or not [optional, defaults to DEFAULT_RAG_ENABLED_MODE]

    Methods:
        generate(question): Generates a chat response
        get_conversation_chain(): Creates a `ConversationChain` chain that is connected to a conversation memory and the specified prompt
        get_validated_prompt(prompt_template, prompt_template_placeholders, default_prompt_template, default_prompt_template_placeholders): Generates the PromptTemplate using
            the provided prompt template and placeholders. In case of errors, falls back on default values.
        get_clean_model_params(): Sanitizes the model params for use with the model

    See Hugging Face documentation for supported model arguments. "stop" implements stop sequences which is enforced below using the
    `enforce_stop_tokens` helper method.
    """

    def __init__(
        self,
        llm_params: LLM,
        model_defaults: ModelDefaults,
        inference_endpoint: Optional[str] = None,
        rag_enabled: Optional[bool] = DEFAULT_RAG_ENABLED_MODE,
    ) -> None:
        super().__init__(
            api_token=llm_params.api_token,
            rag_enabled=rag_enabled,
            streaming=llm_params.streaming,
            verbose=llm_params.verbose,
            temperature=llm_params.temperature,
        )
        self.streaming = model_defaults.allows_streaming if self.streaming is None else self.streaming
        self.temperature = model_defaults.default_temperature if self.temperature is None else float(self.temperature)
        self.model_defaults = model_defaults
        self._prompt_template_placeholders = llm_params.prompt_placeholders
        self.prompt_template = llm_params.prompt_template
        self.conversation_memory = llm_params.conversation_memory
        self.knowledge_base = llm_params.knowledge_base
        self.callbacks = llm_params.callbacks or None
        self.inference_endpoint = inference_endpoint

        if inference_endpoint:
            self.model = None
            self.inference_endpoint = inference_endpoint
        else:
            self.model = (
                llm_params.model
                if llm_params.model is not None and len(llm_params.model)
                else DEFAULT_MODELS_MAP[LLMProviderTypes.HUGGINGFACE.value]
            )
            self.inference_endpoint = None

        self.model_params = self.get_clean_model_params(llm_params.model_params)

        try:
            self._llm = self.get_llm()
        except RepositoryNotFoundError as rpe:
            logger.error(
                rpe,
                xray_trace_id=os.environ[TRACE_ID_ENV_VAR],
            )
            raise LLMBuildError(
                f"HuggingFace model construction failed. Ensure {self.model} is correct repo name. {rpe}"
            )
        except ValueError as ve:
            logger.error(
                ve,
                xray_trace_id=os.environ[TRACE_ID_ENV_VAR],
            )
            raise LLMBuildError(
                f"HuggingFace model construction failed due to incorrect model params or endpoint URL (HuggingFaceEndpoint) passed to the model. {ve}"
            )
        except Exception as ex:
            logger.error(
                ex,
                xray_trace_id=os.environ[TRACE_ID_ENV_VAR],
            )
            raise LLMBuildError(f"HuggingFace model construction failed. {ex}")
        finally:
            metrics.flush_metrics()

        self._conversation_chain = self.get_conversation_chain()

    @property
    def inference_endpoint(self) -> bool:
        return self._inference_endpoint

    @inference_endpoint.setter
    def inference_endpoint(self, inference_endpoint) -> None:
        self._inference_endpoint = inference_endpoint

    def get_llm(self) -> HuggingFaceEndpoint:
        """
        Creates a HuggingFace `LLM` based on supplied params
        Creates a HuggingFaceEndpoint LLM based on whether a model-id
        or an HuggingFace inference endpoint is provided
        Args: None

        Returns:
            HuggingFaceEndpoint LangChain LLM object that can be invoked in a conversation chain
        """
        # HuggingFace hub
        if self.inference_endpoint is None:
            return HuggingFaceEndpoint(
                repo_id=self.model,
                temperature=self.temperature,
                top_k=self.top_k,
                top_p=self.top_p,
                model_kwargs=self.model_params,
                huggingfacehub_api_token=self.api_token,
                task=DEFAULT_HUGGINGFACE_TASK,
                verbose=self.verbose,
            )
        # inference endpoint
        else:
            return HuggingFaceEndpoint(
                endpoint_url=self.inference_endpoint,
                temperature=self.temperature,
                top_k=self.top_k,
                top_p=self.top_p,
                model_kwargs=self.model_params,
                huggingfacehub_api_token=self.api_token,
                task=DEFAULT_HUGGINGFACE_TASK,
                verbose=self.verbose,
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
        error_message = f"Error occurred while invoking Hugging Face {self.model} model. "
        try:
            response = super().generate(question)
            response["answer"] = enforce_stop_tokens(response["answer"], stop=self.stop_sequences)
            return response
        except ValueError as ve:
            error_message = f"{error_message}Ensure that the API key supplied is correct. {ve}"
            logger.error(
                error_message,
                xray_trace_id=os.environ[TRACE_ID_ENV_VAR],
            )
            metrics.add_metric(name=CloudWatchMetrics.LANGCHAIN_FAILURES.value, unit=MetricUnit.Count, value=1)
            raise LLMInvocationError(error_message)
        except Exception as ex:
            error_message = f"{error_message}{ex}"
            logger.error(
                error_message,
                xray_trace_id=os.environ[TRACE_ID_ENV_VAR],
            )
            metrics.add_metric(name=CloudWatchMetrics.LANGCHAIN_FAILURES.value, unit=MetricUnit.Count, value=1)
            raise LLMInvocationError(error_message)
        finally:
            metrics.flush_metrics()

    @tracer.capture_method(capture_response=True)
    def get_clean_model_params(self, model_params: Dict[str, Any]) -> Dict[str, Any]:
        """
        Sanitizes and returns the model params for use with HuggingFace models.

        Args:
            model_params (Dict): the model params that must be cleaned, for example: { param_name: param_value }

        Returns:
            (Dict): Sanitized model params
        """
        sanitized_model_params = super().get_clean_model_params(model_params)

        self.top_k = sanitized_model_params.pop("top_k", None)
        self.top_p = sanitized_model_params.pop("top_p", None)

        if self.model_defaults.stop_sequences:
            if "stop" in sanitized_model_params:
                sanitized_model_params["stop"] += self.model_defaults.stop_sequences
                self.stop_sequences = sanitized_model_params["stop"]
            else:
                sanitized_model_params["stop"] = self.model_defaults.stop_sequences
                self.stop_sequences = self.model_defaults.stop_sequences
        else:
            if "stop" in sanitized_model_params:
                self.stop_sequences = sanitized_model_params["stop"]
            else:
                self.stop_sequences = []

        return sanitized_model_params
