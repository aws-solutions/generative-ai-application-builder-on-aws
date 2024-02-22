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
from botocore.exceptions import ClientError
from clients.factories.conversation_memory_factory import ConversationMemoryFactory
from clients.factories.knowledge_base_factory import KnowledgeBaseFactory
from helper import get_service_client
from llms.models.llm import LLM
from shared.callbacks.websocket_streaming_handler import WebsocketStreamingCallbackHandler
from shared.defaults.model_defaults import ModelDefaults
from utils.constants import (
    DEFAULT_RAG_ENABLED_MODE,
    DEFAULT_VERBOSE_MODE,
    LLM_PROVIDER_API_KEY_ENV_VAR,
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
        llm_config (Dict): Specifies the configuration that the admin sets on a use-case, stored in SSM Parameter store
        rag_enabled (Optional[bool]): Specifies whether the use-case is enabled for RAG. Defaults to DEFAULT_RAG_ENABLED_MODE.
        connection_id (str): The connection ID of the user's connection to the chat application through WebSockets
        conversation_id (str): The conversation ID which helps store and access user chat history
        is_streaming (bool): Specifies whether the use-case is streaming or not.
        conversation_memory (ConversationMemory): Stores the user chat history
        knowledge_base (KnowledgeBase): Stores the user's knowledge base
        callbacks (Callbacks): Stores the callbacks that are set on the LLM model
        llm_model (LLMModel): Stores the LLM model that is used to generate content
        api_key (str): Stores the API key that is used to access the LLM model
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
        set_llm_model(): Sets the value of the lLM model in the builder based on the selected LLM Provider
        set_api_key(): Sets the value of the API key for the LLM model
        set_streaming_callbacks(): Sets the value of callbacks for the LLM model
    """

    def __init__(
        self,
        llm_config: Dict,
        connection_id: str,
        conversation_id: str,
        rag_enabled: Optional[bool] = DEFAULT_RAG_ENABLED_MODE,
    ) -> None:
        self._llm_config = llm_config
        self._rag_enabled = rag_enabled
        self._connection_id = connection_id
        self._conversation_id = conversation_id
        self._model_defaults = None
        self._conversation_memory = None
        self._knowledge_base = None
        self._callbacks = None
        self._llm_model = None
        self._api_key = None
        self._model_params = None
        self._is_streaming = None
        self._errors = []

    @property
    def llm_config(self) -> str:
        return self._llm_config

    @llm_config.setter
    def llm_config(self, llm_config) -> None:
        self._llm_config = llm_config

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
    def api_key(self) -> str:
        return self._api_key

    @api_key.setter
    def api_key(self, api_key) -> None:
        self._api_key = api_key

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
        return self._model_defaults["history"]

    @property
    def input_key(self) -> str:
        return self._model_defaults["input"]

    @property
    def output_key(self) -> str:
        return self._model_defaults["output"]

    @property
    def context_key(self) -> str:
        return self._model_defaults["context"]

    @property
    def human_prefix(self) -> str:
        return self._model_defaults["human_prefix"]

    @property
    def ai_prefix(self) -> str:
        return self._model_defaults["ai_prefix"]

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
            self.knowledge_base = KnowledgeBaseFactory().get_knowledge_base(self.llm_config, self.errors)
        else:
            self.knowledge_base = None
            logger.debug("Proceeding to build the LLM without the Knowledge Base as its not specified.")

    def set_conversation_memory(self, user_id: str, conversation_id: str) -> None:
        """
        Sets the conversation memory object that is used to store the user chat history
        """
        self.conversation_memory = ConversationMemoryFactory().get_conversation_memory(
            llm_config=self.llm_config,
            user_id=user_id,
            conversation_id=conversation_id,
            errors=self.errors,
            memory_key=self.model_defaults.memory_config["history"],
            input_key=self.model_defaults.memory_config["input"],
            output_key=self.model_defaults.memory_config["output"],
            context_key=self.model_defaults.memory_config["context"],
            human_prefix=self.model_defaults.memory_config["human_prefix"],
            ai_prefix=self.model_defaults.memory_config["ai_prefix"],
        )

    @tracer.capture_method
    def set_api_key(self) -> None:
        """
        Sets the API key that is used to call the 3rd party LLM provider
        """
        with tracer.provider.in_subsegment("## llm_api_key") as subsegment:
            subsegment.put_annotation("service", "secretsmanager")
            subsegment.put_annotation("operation", "get_secret_value")
            try:
                api_key_secret_name = os.getenv(LLM_PROVIDER_API_KEY_ENV_VAR)
                secretsmanager = get_service_client("secretsmanager")
                self.api_key = secretsmanager.get_secret_value(SecretId=api_key_secret_name)["SecretString"]
            except ClientError as err:
                self.errors.append(f"Error retrieving API key: {err}")

    def set_streaming_callbacks(self):
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
                )
            ]
        else:
            self.callbacks = None

    def set_llm_model(self) -> None:
        """
        Sets the value of the lLM model in the builder. Each subclass implements its own LLM model.
        """
        llm_params = self.llm_config.get("LlmParams")
        if llm_params:
            self.is_streaming = llm_params.get("Streaming", self.model_defaults.allows_streaming)
            self.set_streaming_callbacks()
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

        prompt_template = llm_params.get("PromptTemplate")
        if prompt_template is None:
            message = f"Prompt template not provided. Falling back to default prompt template"
            logger.info(message, xray_trace_id=os.environ[TRACE_ID_ENV_VAR])
            prompt_template = self.model_defaults.prompt

        prompt_placeholders = [
            self.model_defaults.memory_config["history"],
            self.model_defaults.memory_config["input"],
        ]
        if self.rag_enabled:
            prompt_placeholders.append(self.model_defaults.memory_config["context"])

        self.model_params = LLM(
            **{
                "api_token": self.api_key,
                "conversation_memory": self.conversation_memory,
                "knowledge_base": self.knowledge_base,
                "model": llm_params.get("ModelId"),
                "model_params": llm_params.get("ModelParams"),
                "prompt_template": prompt_template,
                "prompt_placeholders": prompt_placeholders,
                "streaming": self.is_streaming,
                "verbose": llm_params.get("Verbose", DEFAULT_VERBOSE_MODE),
                "temperature": llm_params.get("Temperature"),
                "callbacks": self.callbacks,
            }
        )
