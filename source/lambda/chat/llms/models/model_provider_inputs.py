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

import re
from abc import ABC
from dataclasses import dataclass
from typing import Any, Dict, List, Optional

from langchain_core.callbacks.base import BaseCallbackHandler
from langchain_core.chat_history import BaseChatMessageHistory
from shared.knowledge.knowledge_base import KnowledgeBase
from utils.constants import (
    DEFAULT_DISAMBIGUATION_ENABLED_MODE,
    DEFAULT_REPHRASE_QUESTION_MODE,
    DEFAULT_RETURN_SOURCE_DOCS_MODE,
    DEFAULT_SAGEMAKER_MODEL_ID,
    DEFAULT_STREAMING_MODE,
    DEFAULT_VERBOSE_MODE,
)


@dataclass(kw_only=True)
class ModelProviderInputs(ABC):
    """
    Defines model params for all supported model providers.
    Some defaults are defined, but individual model classes deal with model specific defaults.

    - conversation_history_cls (BaseChatMessageHistory): A class which represents the conversation history
    - conversation_history_params (dict): A dictionary of parameters for the conversation history class

    - knowledge_base (KnowledgeBase): A KnowledgeBase object [optional, defaults to None]
    -  prompt_template (str): A string which represents the prompt template [optional, defaults to prompt template provided in ModelInfoStorage DynamoDB table]
    - prompt_placeholders (list): A list of strings which represents the prompt placeholders [optional, defaults to prompt placeholders provided in ModelInfoStorage DynamoDB table]
    - disambiguation_prompt_template (str): A string which represents the disambiguation prompt template [optional, defaults to disambiguation prompt template provided in ModelInfoStorage DynamoDB table]
    - disambiguation_prompt_enabled (bool): A boolean which represents whether the disambiguation prompt is enabled or not [optional, defaults to disambiguation prompt enabled provided in ModelInfoStorage DynamoDB table]
    - model (str): Model name/ID that represents the underlying LLM model
    - model_params (dict): A dictionary of model parameters, which can be obtained from the Bedrock documentation [optional]
    - rag_enabled (bool): A boolean which represents whether the RAG is enabled or not [optional, defaults to DEFAULT_RAG_ENABLED_MODE]
    - rephrase_question (bool): A boolean which represents whether the question to LLM should be rephrased or not when disambiguation is enabled [optional, defaults to DEFAULT_REPHRASE_QUESTION_MODE]
    - return_source_docs (bool): A boolean which represents whether the source documents should be returned or not with the model response [optional, defaults to DEFAULT_RETURN_SOURCE_DOCS_MODE]
    - response_if_no_docs_found (str): A string which represents the response to return from the LLM in case of RAG workflow when no documents are found [optional, defaults to None]
    -  streaming (bool): A boolean which represents whether the chat response is streamed or not [optional, defaults to value provided in ModelInfoStorage DynamoDB table]
    - verbose (bool): A boolean which represents whether the chat is verbose or not [optional, defaults to DEFAULT_VERBOSE_MODE]
    - temperature (float): A non-negative float that tunes the degree of randomness in model response generation [optional, defaults to temperature provided in ModelInfoStorage DynamoDB table]
    callbacks (list): A list of BaseCallbackHandler objects which are used for the LLM model callbacks [optional, defaults to None]
    - callbacks (list): A list of BaseCallbackHandler objects which are used for the LLM model callbacks [optional, defaults to None]
    """

    conversation_history_cls: BaseChatMessageHistory
    conversation_history_params: Dict[str, Any]
    knowledge_base: Optional[KnowledgeBase] = None
    prompt_template: Optional[str] = None
    prompt_placeholders: Optional[List[str]] = None
    disambiguation_prompt_template: Optional[str] = None
    disambiguation_prompt_enabled: Optional[bool] = DEFAULT_DISAMBIGUATION_ENABLED_MODE
    model: Optional[str] = None
    model_params: Optional[dict] = None
    rag_enabled: bool
    rephrase_question: Optional[bool] = DEFAULT_REPHRASE_QUESTION_MODE
    return_source_docs: Optional[bool] = DEFAULT_RETURN_SOURCE_DOCS_MODE
    response_if_no_docs_found: Optional[str] = None
    streaming: Optional[bool] = DEFAULT_STREAMING_MODE
    verbose: Optional[bool] = DEFAULT_VERBOSE_MODE
    temperature: Optional[float] = None
    callbacks: Optional[List[BaseCallbackHandler]] = None

    def __post_init__(self):
        if self.conversation_history_cls is None:
            raise ValueError("Missing mandatory field 'conversation_history_cls'")

        if self.conversation_history_params is None or not self.conversation_history_params:
            raise ValueError("Missing mandatory field 'conversation_history_params'")

        if self.rag_enabled is None:
            raise ValueError("Missing mandatory field 'rag_enabled'")

        if self.rag_enabled and not self.knowledge_base:
            raise ValueError(
                "'rag_enabled' field is set to True and no Knowledge Base is supplied. Please supply a Knowledge Base when rag_enabled is set to True."
            )


@dataclass(kw_only=True)
class BedrockInputs(ModelProviderInputs):
    """
    Extra model inputs for Bedrock models.

     - model_family (BedrockModelProviders): A string which represents the model family [optional, defaults to DEFAULT_BEDROCK_MODEL_FAMILY]
     - model_arn (str): A string which represents the model ARN in case of provisioned throughput model invocation [optional, defaults to None]
     - guardrails (dict): A dictionary of Bedrock guardrail details [optional, defaults to None]

    """

    model_family: str
    model_arn: Optional[str] = None
    guardrails: Optional[Dict[str, Any]] = None

    def __post_init__(self):
        if self.model is None and self.model_arn is None:
            raise ValueError("ModelId and/or ModelArn not provided.")

        if self.model_arn is not None and self.model is None:
            raise ValueError(
                "ModelId must be provided when ModelArn is provided to fetch default values for the model."
            )

        if self.model_family is None:
            raise ValueError("Missing mandatory field 'model_family'")

        if self.model_arn is not None:
            regex = r"^(arn:aws(-[^:]+)?:bedrock:[a-z0-9-]{1,20}:(([0-9]{12}:custom-model/[a-z0-9-]{1,63}[.]{1}[a-z0-9-:]{1,63}/[a-z0-9]{12})|(:foundation-model/[a-z0-9-]{1,63}[.]{1}[a-z0-9-]{1,63}([.:]?[a-z0-9-]{1,63})([.:]?[a-z0-9-]{1,63}))|([0-9]{12}:provisioned-model/[a-z0-9]{12})))$"  # NOSONAR - python:S6396, python:S5843, python:S6353 - Regex per AWS documentation

            model_arn_pattern = re.compile(regex)
            is_match = bool(model_arn_pattern.match(self.model_arn))

            if not is_match:
                raise ValueError(
                    "ModelArn must be a valid provisioned/custom model ARN to use from Amazon Bedrock. See: https://docs.aws.amazon.com/bedrock/latest/APIReference/API_runtime_InvokeModel.html#API_runtime_InvokeModel_RequestSyntax"
                )


@dataclass(kw_only=True)
class SageMakerInputs(ModelProviderInputs):
    """
    Extra model inputs for SageMaker models.

    - sagemaker_endpoint_name (str): A string which represents the SageMaker endpoint name. The SageMaker endpoint is invoked with the user inputs to get chat responses
    - input_schema (dict): A dictionary of input schema for the SageMaker endpoint. This is passed to SageMaker Content Handler. The content handler is used to transform the input to the SageMaker endpoint as it expects, and then retrieve the response from the JSON response received. The input_schema represents the schema of the input to the SageMaker endpoint. The response_jsonpath below represents the path for the text output from the SageMaker endpoint. See SageMakerContentHandler for more information and examples available at llms/models/sagemaker/content_handler.py
    - response_jsonpath (str): A string which represents the jsonpath for the chat text output from the SageMaker endpoint

    """

    sagemaker_endpoint_name: Optional[str]
    input_schema: Optional[Dict[str, Any]]
    response_jsonpath: Optional[Dict[str, Any]]

    def __post_init__(self):
        self.model = self.model or DEFAULT_SAGEMAKER_MODEL_ID

        if self.sagemaker_endpoint_name is None:
            raise ValueError("Missing mandatory field 'sagemaker_endpoint_name'")

        if self.input_schema is None:
            raise ValueError("Missing mandatory field 'input_schema'")

        if self.response_jsonpath is None:
            raise ValueError("Missing mandatory field 'response_jsonpath'")

        regex = r"^[a-zA-Z0-9](-*[a-zA-Z0-9]){0,62}$"  # NOSONAR - python:S6396, python:S5843, python:S6353 - Regex per AWS documentation

        endpoint_name_pattern = re.compile(regex)
        is_match = bool(endpoint_name_pattern.match(self.sagemaker_endpoint_name))

        if not is_match:
            raise ValueError(
                "SageMakerEndpoint name must be a valid endpoint name with maximum of 63 alphanumeric characters. Can include hyphens (-), but not spaces. Cannot start with a hyphen (-). See EndpointConfigName requirements: https://docs.aws.amazon.com/sagemaker/latest/APIReference/API_CreateEndpointConfig.html"
            )
