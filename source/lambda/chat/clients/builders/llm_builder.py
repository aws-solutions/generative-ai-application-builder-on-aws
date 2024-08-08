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
from abc import ABC
from typing import Any, Dict, Optional

from aws_lambda_powertools import Logger, Tracer
from aws_lambda_powertools.metrics import MetricUnit
from clients.factories.conversation_memory_factory import ConversationMemoryFactory
from clients.factories.knowledge_base_factory import KnowledgeBaseFactory
from llms.models.model_provider_inputs import ModelProviderInputs
from shared.callbacks.websocket_streaming_handler import WebsocketStreamingCallbackHandler
from shared.defaults.model_defaults import ModelDefaults
from utils.constants import (
    AI_PREFIX,
    CONTEXT_KEY,
    DEFAULT_DISAMBIGUATION_ENABLED_MODE,
    DEFAULT_RAG_ENABLED_MODE,
    DEFAULT_REPHRASE_RAG_QUESTION,
    DEFAULT_VERBOSE_MODE,
    HISTORY_KEY,
    HUMAN_PREFIX,
    INPUT_KEY,
    OUTPUT_KEY,
    PROMPT_EVENT_KEY,
    QUESTION_EVENT_KEY,
    TRACE_ID_ENV_VAR,
)
from utils.enum_types import CloudWatchMetrics, CloudWatchNamespaces, LLMProviderTypes
from utils.helpers import get_metrics_client

metrics = get_metrics_client(CloudWatchNamespaces.LANGCHAIN_LLM)
logger = Logger(utc=True)
tracer = Tracer()


class LLMBuilder(ABC):
    """
    Builder interface/Pythonic abstract class that allows inheriting from it and creating subclass objects
    that have a conversation memory, knowledge base and an LLM model.

    Attributes:
        use_case_config (Dict): Specifies the configuration that the admin sets on a use-case, stored in DynamoDB
        rag_enabled (Optional[bool]): Specifies whether the use-case is enabled for RAG. Defaults to DEFAULT_RAG_ENABLED_MODE.
        connection_id (str): The connection ID of the user's connection to the chat application through WebSockets
        conversation_id (str): The conversation ID which helps store and access user chat history
        is_streaming (bool): Specifies whether the use-case is streaming or not.
        conversation_memory (ConversationMemory): Stores the user chat history
        knowledge_base (KnowledgeBase): Stores the user's knowledge base
        callbacks (Callbacks): Stores the callbacks that are set on the LLM model
        llm_model (LLMModel): Stores the LLM model that is used to generate content
        memory_key (str): Stores the memory key for the conversation memory
        input_key (str): Stores the input key for the conversation memory
        output_key (str): Stores the output key for the conversation memory
        context_key (str): Stores the context key for the conversation memory
        human_prefix (str): Stores the human prefix for the conversation memory
        ai_prefix (str): Stores the ai prefix for the conversation memory
        model_params (Dict): Stores the model parameters for the LLM model
        conversation_id (str): The conversation ID which helps store and access user chat history
        rag_enabled (bool): Specifies if RAG is enabled for the use-case or not
        errors (List[str]): Stores the errors that occur during the use-case execution

    Methods:
        set_knowledge_base(): Sets the value for the knowledge base object that is used to supplement the LLM context using information from
            the user's knowledge base
        set_conversation_memory(): Sets the value for the conversation memory object that is used to store the user chat history
        set_llm_model(model): Sets the value of the lLM model in the builder based on the selected LLM Provider
        set_streaming_callbacks(): Sets the value of callbacks for the LLM model
    """

    def __init__(
        self,
        use_case_config: Dict,
        connection_id: str,
        conversation_id: str,
        rag_enabled: Optional[bool] = DEFAULT_RAG_ENABLED_MODE,
        user_context_token: Optional[str] = None,
    ) -> None:
        self._llm_config = use_case_config
        self._rag_enabled = rag_enabled
        self._connection_id = connection_id
        self._conversation_id = conversation_id
        self._user_context_token = user_context_token
        self._model_defaults = None
        self._conversation_memory = None
        self._knowledge_base = None
        self._callbacks = None
        self._llm_model = None
        self._model_params = None
        self._is_streaming = None
        self._errors = []

    @property
    def use_case_config(self) -> str:
        return self._llm_config

    @use_case_config.setter
    def use_case_config(self, use_case_config) -> None:
        self._llm_config = use_case_config

    @property
    def is_streaming(self) -> str:
        return self._is_streaming

    @is_streaming.setter
    def is_streaming(self, is_streaming) -> None:
        self._is_streaming = is_streaming

    @property
    def conversation_memory(self) -> str:
        return self._conversation_memory

    @conversation_memory.setter
    def conversation_memory(self, conversation_memory) -> None:
        self._conversation_memory = conversation_memory

    @property
    def knowledge_base(self) -> str:
        return self._knowledge_base

    @knowledge_base.setter
    def knowledge_base(self, knowledge_base) -> None:
        self._knowledge_base = knowledge_base

    @property
    def callbacks(self) -> str:
        return self._callbacks

    @callbacks.setter
    def callbacks(self, callbacks) -> None:
        self._callbacks = callbacks

    @property
    def llm_model(self) -> str:
        return self._llm_model

    @llm_model.setter
    def llm_model(self, llm_model) -> None:
        self._llm_model = llm_model

    @property
    def errors(self) -> str:
        return self._errors

    @errors.setter
    def errors(self, errors) -> None:
        self._errors = errors

    @property
    def model_params(self) -> bool:
        return self._model_params

    @model_params.setter
    def model_params(self, model_params) -> None:
        self._model_params = model_params

    @property
    def rag_enabled(self) -> bool:
        return self._rag_enabled

    @rag_enabled.setter
    def rag_enabled(self, rag_enabled) -> None:
        self._rag_enabled = rag_enabled

    @property
    def connection_id(self) -> str:
        return self._connection_id

    @connection_id.setter
    def connection_id(self, connection_id) -> None:
        self._connection_id = connection_id

    @property
    def conversation_id(self) -> str:
        return self._conversation_id

    @conversation_id.setter
    def conversation_id(self, conversation_id) -> None:
        self._conversation_id = conversation_id

    @property
    def model_defaults(self) -> Dict[str, Any]:
        return self._model_defaults

    @property
    def memory_key(self) -> str:
        return self._model_defaults[HISTORY_KEY]

    @property
    def input_key(self) -> str:
        return self._model_defaults[INPUT_KEY]

    @property
    def output_key(self) -> str:
        return self._model_defaults[OUTPUT_KEY]

    @property
    def context_key(self) -> str:
        return self._model_defaults[CONTEXT_KEY]

    @property
    def human_prefix(self) -> str:
        human_prefix = self.use_case_config.get("ConversationMemoryParams", {}).get("HumanPrefix")
        return self._model_defaults[HUMAN_PREFIX] if not human_prefix else human_prefix

    @property
    def ai_prefix(self) -> str:
        ai_prefix = self.use_case_config.get("ConversationMemoryParams", {}).get("AiPrefix")
        return self._model_defaults[AI_PREFIX] if not ai_prefix else ai_prefix

    @property
    def user_context_token(self) -> str:
        return self._user_context_token

    @user_context_token.setter
    def user_context_token(self, user_context_token: str) -> None:
        self._user_context_token = user_context_token

    def set_model_defaults(self, model_provider: LLMProviderTypes, model_name: str) -> None:
        """
        Fetches the default values for the builder
        """
        self._model_defaults = ModelDefaults(model_provider, model_name, self.rag_enabled)

    def validate_event_input_sizes(self, event_body) -> None:
        """
        Validates the input sizes of prompt and user query using the defaults retrieved from ModelInfoStorage DynamoDB table
        """
        prompt = event_body.get(PROMPT_EVENT_KEY)
        user_query = event_body.get(QUESTION_EVENT_KEY)
        max_prompt_size = self.model_defaults.max_prompt_size
        max_chat_message_size = int(self.model_defaults.max_chat_message_size)

        error_list = []

        if prompt and len(prompt) > max_prompt_size:
            error_message = f"Prompt should be less than {max_prompt_size} characters. Provided prompt length has length: {len(prompt)}."
            logger.error(error_message, xray_trace_id=os.environ[TRACE_ID_ENV_VAR])
            error_list.append(error_message)

        if len(user_query) > max_chat_message_size:
            error_message = f"User query should be less than {max_chat_message_size} characters. Provided query has length: {len(user_query)}."
            logger.error(error_message, xray_trace_id=os.environ[TRACE_ID_ENV_VAR])
            error_list.append(error_message)

        if error_list:
            errors = "\n".join(error_list)
            raise ValueError(errors)

    def set_knowledge_base(self) -> None:
        """
        Sets the knowledge base object that is used to supplement the LLM context using information from the user's knowledge base
        """
        if self.rag_enabled:
            self.knowledge_base = KnowledgeBaseFactory().get_knowledge_base(
                self.use_case_config,
                self.errors,
                self.user_context_token,
            )
        else:
            self.knowledge_base = None
            logger.debug("Proceeding to build the LLM without the Knowledge Base as its not specified.")

    def set_conversation_memory(self, user_id: str, conversation_id: str) -> None:
        """
        Sets the conversation memory object that is used to store the user chat history
        """
        self.conversation_memory = ConversationMemoryFactory().get_conversation_memory(
            use_case_config=self.use_case_config,
            default_memory_config=self.model_defaults.memory_config,
            user_id=user_id,
            conversation_id=conversation_id,
            errors=self.errors,
        )

    def set_streaming_callbacks(self, response_if_no_docs_found_enabled):
        """
        Sets the value of callbacks for the LLM model
        """
        if self.is_streaming:
            self.callbacks = [
                WebsocketStreamingCallbackHandler(
                    connection_id=self.connection_id,
                    conversation_id=self.conversation_id,
                    source_docs_formatter=self.knowledge_base.source_docs_formatter if self.knowledge_base else None,
                    is_streaming=self.is_streaming,
                    rag_enabled=self.rag_enabled,
                    response_if_no_docs_found_enabled=response_if_no_docs_found_enabled,
                )
            ]
        else:
            self.callbacks = None

    def set_llm_model(self, model: str) -> None:
        """Sets the value of the LLM model in the builder. Each subclass implements its own LLM model.

        Args:
            model (str): model to pass down to underlying LLM object.

        Raises:
            ValueError: If the configuration parameters have any errors
        """
        llm_params = self.use_case_config.get("LlmParams", {})
        knowledge_base_params = self.use_case_config.get("KnowledgeBaseParams", {})
        response_if_no_docs_found = knowledge_base_params.get("NoDocsFoundResponse", None)
        response_if_no_docs_found_enabled = True if response_if_no_docs_found is not None else False

        if llm_params:
            self.is_streaming = llm_params.get("Streaming", self.model_defaults.allows_streaming)
            self.set_streaming_callbacks(response_if_no_docs_found_enabled)
        else:
            self.errors.append(
                "Missing required field (LlmParams) containing LLM configuration in the config which is required to construct the LLM."
            )

        try:
            if self.errors:
                errors = "\n".join(self.errors)
                error_message = f"There are errors in the following configuration parameters:\n{errors}"
                logger.error(
                    error_message,
                    xray_trace_id=os.environ[TRACE_ID_ENV_VAR],
                )
                metrics.add_metric(
                    name=CloudWatchMetrics.INCORRECT_INPUT_FAILURES.value, unit=MetricUnit.Count, value=1
                )
                raise ValueError(error_message)

            if not self.conversation_memory:
                error_message = "Conversation Memory was set to null."
                logger.error(error_message, xray_trace_id=os.environ[TRACE_ID_ENV_VAR])
                metrics.add_metric(
                    name=CloudWatchMetrics.INCORRECT_INPUT_FAILURES.value, unit=MetricUnit.Count, value=1
                )
                raise ValueError(error_message)
        finally:
            metrics.flush_metrics()

        prompt_placeholders = [
            self.model_defaults.memory_config["history"],
            self.model_defaults.memory_config["input"],
        ]
        if self.rag_enabled:
            prompt_placeholders.append(self.model_defaults.memory_config["context"])

        self.model_params = ModelProviderInputs(
            **{
                "conversation_memory": self.conversation_memory,
                "knowledge_base": self.knowledge_base,
                "model": model,
                "model_params": llm_params.get("ModelParams"),
                "prompt_template": llm_params.get("PromptParams", {}).get("PromptTemplate"),
                "prompt_placeholders": prompt_placeholders,
                "disambiguation_prompt_template": llm_params.get("PromptParams", {}).get(
                    "DisambiguationPromptTemplate"
                ),
                "disambiguation_prompt_enabled": llm_params.get("PromptParams", {}).get(
                    "DisambiguationEnabled", DEFAULT_DISAMBIGUATION_ENABLED_MODE
                ),
                "rephrase_question": llm_params.get("PromptParams", {}).get(
                    "RephraseQuestion", DEFAULT_REPHRASE_RAG_QUESTION
                ),
                "response_if_no_docs_found": response_if_no_docs_found,
                "streaming": self.is_streaming,
                "verbose": llm_params.get("Verbose", DEFAULT_VERBOSE_MODE),
                "temperature": llm_params.get("Temperature"),
                "callbacks": self.callbacks,
            }
        )
