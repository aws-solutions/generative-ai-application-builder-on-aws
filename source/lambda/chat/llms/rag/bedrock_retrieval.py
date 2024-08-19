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

from typing import Any, Dict

from aws_lambda_powertools import Logger, Tracer
from llms.bedrock import BedrockLLM
from llms.models.model_provider_inputs import ModelProviderInputs
from llms.rag.retrieval_llm import RetrievalLLM
from shared.defaults.model_defaults import ModelDefaults
from utils.constants import DEFAULT_BEDROCK_MODEL_FAMILY, DEFAULT_BEDROCK_MODELS_MAP, DEFAULT_RETURN_SOURCE_DOCS
from utils.enum_types import BedrockModelProviders, CloudWatchNamespaces
from utils.helpers import get_metrics_client

tracer = Tracer()
logger = Logger(utc=True)
metrics = get_metrics_client(CloudWatchNamespaces.LANGCHAIN_LLM)


class BedrockRetrievalLLM(RetrievalLLM, BedrockLLM):
    """
    BedrockRetrievalLLM is a wrapper around the Bedrock LangChain API which can generate chat responses, provided a conversation memory
    and knowledge base. Specifically, this enables the usage of RAG with Bedrock available models.

    Attributes:
        - llm_params: LLM dataclass object which has the following:
            conversation_memory (BaseMemory): A BaseMemory object which helps store and access user chat history
            knowledge_base (KnowledgeBase): A KnowledgeBase object which retrieves information from the user's knowledge base for LLM context
            return_source_docs (bool): A boolean which represents whether the source documents are returned or not [optional, defaults to DEFAULT_RETURN_SOURCE_DOCS]
            model_family (BedrockModelProviders): A string which represents the model family [optional, defaults to DEFAULT_BEDROCK_MODEL_FAMILY]
            model (str): Bedrock model name that represents the underlying LLM model [optional, defaults to DEFAULT_BEDROCK_MODELS_MAP defined default]
            model_params (dict): A dictionary of model parameters, which can be obtained from the Bedrock documentation [optional]
            prompt_template (str): A string which represents the prompt template [optional, defaults to prompt template provided in ModelInfoStorage DynamoDB table]
            streaming (bool): A boolean which represents whether the chat is streaming or not [optional, defaults to value provided in ModelInfoStorage DynamoDB table]
            verbose (bool): A boolean which represents whether the chat is verbose or not [optional, defaults to DEFAULT_VERBOSE_MODE]
            temperature (float): A non-negative float that tunes the degree of randomness in model response generation [optional, defaults to temperature
                provided in ModelInfoStorage DynamoDB table]
            callbacks (list): A list of BaseCallbackHandler objects which are used for the LLM model callbacks [optional, defaults to None]

        - model_defaults (ModelDefaults): A ModelDefaults object which contains default values for the model retrieved from ModelInfoStorage DynamoDB table
        - model_family (BedrockModelProviders): A string which represents the model family [optional, defaults to DEFAULT_BEDROCK_MODEL_FAMILY]. When model_family
            is not provided, whether the model is provided or not, the model will be set to the default model within the DEFAULT_BEDROCK_MODEL_FAMILY
        - return_source_docs (bool): A boolean which represents whether the source documents are returned or not [optional, defaults to DEFAULT_RETURN_SOURCE_DOCS]

    Methods:
        - generate(question): Generates a chat response
        - get_conversation_chain(): Creates a `ConversationalRetrievalChain` chain that is connected to a conversation
        memory and the specified prompt
        - get_validated_prompt(prompt_template, prompt_template_placeholders, default_prompt_template,
        default_prompt_template_placeholders): Generates the PromptTemplate using the provided prompt template and placeholders. In case of errors, falls back on default values.
        - get_validated_disambiguation_prompt(disambiguation_prompt_template, default_disambiguation_prompt_template,
        disambiguation_prompt_template_placeholders): Generates the PromptTemplate using the provided disambiguation prompt template. In case of errors, falls back on default values.

    """

    def __init__(
        self,
        llm_params: ModelProviderInputs,
        model_defaults: ModelDefaults,
        model_family: BedrockModelProviders = None,
        return_source_docs: bool = DEFAULT_RETURN_SOURCE_DOCS,
    ):
        RetrievalLLM.__init__(
            self,
            llm_params=llm_params,
            model_defaults=model_defaults,
            return_source_docs=return_source_docs,
            disambiguation_prompt_template=llm_params.disambiguation_prompt_template,
        )
        if llm_params.model is not None and model_family is not None and len(llm_params.model) and len(model_family):
            self.model = llm_params.model
            self.model_family = model_family
        else:
            self.model = DEFAULT_BEDROCK_MODELS_MAP[DEFAULT_BEDROCK_MODEL_FAMILY]
            self.model_family = DEFAULT_BEDROCK_MODEL_FAMILY

        self.model_arn = llm_params.model_arn
        self.guardrails = llm_params.guardrails
        self.model_params = self.get_clean_model_params(llm_params.model_params)

        self.llm = self.get_llm()
        self.conversation_chain = self.get_conversation_chain()

    @tracer.capture_method(capture_response=True)
    def generate(self, question: str) -> Dict[str, Any]:
        error_message = f"Error occurred while invoking {self.model_family} {self.model} model. "
        return super().generate(question, error_message)
