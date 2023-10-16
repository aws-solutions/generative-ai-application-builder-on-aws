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
from typing import Dict, Optional

from aws_lambda_powertools import Logger
from clients.builders.llm_builder import LLMBuilder
from llm_models.huggingface import HuggingFaceLLM
from llm_models.rag.huggingface_retrieval import HuggingFaceRetrievalLLM
from utils.constants import DEFAULT_HUGGINGFACE_RAG_ENABLED_MODE, TRACE_ID_ENV_VAR

logger = Logger(utc=True)


class HuggingFaceBuilder(LLMBuilder):
    """
    Class that implements the LLMBuilder interface to create objects that have a conversation memory,
    knowledge base and an LLM model.
    HuggingFaceBuilder has access to the following through its interface:

    Attributes:
        llm_config (Dict): Specifies the configuration that the admin sets on a use-case, stored in SSM Parameter store
        connection_id (str): The connection ID of the user's connection to the chat application through WebSockets
        conversation_id (str): The conversation ID which helps store and access user chat history
        rag_enabled (bool): Specifies if RAG is enabled for the use-case or not

    Methods:
        set_knowledge_base(): Sets the value for the knowledge base object that is used to supplement the LLM context using information from
            the user's knowledge base
        set_memory_constants(): Sets the value of keys (memory, history, input) and prefixes (Human, AI) for the conversation memory object
        set_conversation_memory(): Sets the value for the conversation memory object that is used to store the user chat history
        set_streaming_callbacks(): Sets the value of callbacks for the LLM model
        set_api_key(): Sets the value of the API key for the LLM model
        set_llm_model(): Sets the value of the lLM model in the builder. HuggingFaceBuilder sets a HuggingFaceLLM object

    """

    def __init__(
        self,
        llm_config: Dict,
        connection_id: str,
        conversation_id: str,
        rag_enabled: Optional[bool] = DEFAULT_HUGGINGFACE_RAG_ENABLED_MODE,
    ) -> None:
        super().__init__(llm_config, connection_id, conversation_id, rag_enabled)

    def set_llm_model(self) -> None:
        """
        Sets the value of the lLM model in the builder
        """
        llm_params = self.llm_config.get("LlmParams")
        if llm_params:
            self.is_streaming = llm_params.get("Streaming", False)
            self.set_streaming_callbacks()
        else:
            self.errors.append(
                "Missing required field (LlmParams) containing LLM configuration in the config which is required to construct the LLM."
            )

        if self.errors:
            errors = "\n".join(self.errors)
            error_message = f"There are errors in the following configuration parameters:\n{errors}"
            logger.error(
                error_message,
                xray_trace_id=os.environ[TRACE_ID_ENV_VAR],
            )
            raise ValueError(error_message)

        if not self.conversation_memory:
            raise ValueError("Conversation Memory was set to null.")

        self.model_params = {
            "api_token": self.api_key,
            "conversation_memory": self.conversation_memory,
            "knowledge_base": self.knowledge_base,
            "model": llm_params.get("ModelId"),
            "inference_endpoint": llm_params.get("InferenceEndpoint"),
            "model_params": llm_params.get("ModelParams"),
            "prompt_template": llm_params.get("PromptTemplate"),
            "streaming": self.is_streaming,
            "verbose": llm_params.get("Verbose"),
            "temperature": llm_params.get("Temperature"),
            "callbacks": self.callbacks,
        }

        if self.rag_enabled and not self.knowledge_base:
            raise ValueError("KnowledgeBase is required for RAG-enabled HuggingFace chat model.")
        elif self.rag_enabled and self.knowledge_base:
            self.llm_model = HuggingFaceRetrievalLLM(**self.model_params)
        else:
            self.llm_model = HuggingFaceLLM(**self.model_params, rag_enabled=self.rag_enabled)
