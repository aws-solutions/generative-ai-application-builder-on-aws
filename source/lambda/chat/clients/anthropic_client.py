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

from typing import Dict, Union
from uuid import UUID

from aws_lambda_powertools import Logger
from clients.builders.anthropic_builder import AnthropicBuilder
from clients.llm_chat_client import LLMChatClient
from llms.anthropic import AnthropicLLM
from llms.rag.anthropic_retrieval import AnthropicRetrievalLLM
from utils.constants import CONVERSATION_ID_EVENT_KEY, LLM_PROVIDER_API_KEY_ENV_VAR
from utils.enum_types import LLMProviderTypes

logger = Logger(utc=True)


class AnthropicClient(LLMChatClient):
    """
    Class that allows building a Anthropic LLM client that is used to generate content.

    Attributes:
        llm_model (BaseLangChainModel): The LLM model which is used for generating content. For Anthropic provider, this is AnthropicLLM or
            AnthropicRetrievalLLM
        llm_config (Dict): Stores the configuration that the admin sets on a use-case, fetched from SSM Parameter store
        rag_enabled (bool): Whether or not RAG is enabled for the use-case
        connection_id (str): The connection ID for the websocket client

    Methods:
        check_env(List[str]): Checks if the environment variable list provided, along with other required environment variables, are set.
        check_event(event: Dict): Checks if the event it receives is empty.
        get_llm_config(): Retrieves the configuration that the admin sets on a use-case from the SSM Parameter store
        construct_chat_model(): Constructs the Chat model based on the event and the LLM configuration as a series of steps on the builder
        get_event_conversation_id(): Returns the conversation_id for the event
        get_model(): Retrieves the LLM model that is used to generate content

    """

    def __init__(self, connection_id: str, rag_enabled: bool) -> None:
        super().__init__(connection_id=connection_id, rag_enabled=rag_enabled)

    @classmethod
    def check_env(cls) -> None:
        """
        Checks if the environment variables it requires are set. Additionally, also checks for the list of additional environment variables.
        Args:
            additional_keys (List[str]): List of additional environment variables to check for.
        Raises:
            ValueError: If the environment variables it requires are not set.
        """
        super().check_env([LLM_PROVIDER_API_KEY_ENV_VAR])

    def get_model(self, event_body: Dict, user_id: UUID) -> Union[AnthropicLLM, AnthropicRetrievalLLM]:
        """
        Retrieves the Anthropic client.

        :param event (Dict): The AWS Lambda event
        Returns:
            AnthropicLLM: The Anthropic LLM model that is used to generate content.
        """
        super().get_model(event_body)

        self.builder = AnthropicBuilder(
            self.llm_config,
            connection_id=self.connection_id,
            conversation_id=event_body[CONVERSATION_ID_EVENT_KEY],
            rag_enabled=self.rag_enabled,
        )
        model_name = self.llm_config.get("LlmParams", {}).get("ModelId", None)
        self.construct_chat_model(user_id, event_body, LLMProviderTypes.ANTHROPIC.value, model_name)
        return self.builder.llm_model
