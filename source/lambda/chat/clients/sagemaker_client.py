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
from typing import Dict, Union
from uuid import UUID

from aws_lambda_powertools import Logger, Tracer
from clients.builders.sagemaker_builder import SageMakerBuilder
from clients.llm_chat_client import LLMChatClient
from llms.rag.sagemaker_retrieval import SageMakerRetrievalLLM
from llms.sagemaker import SageMakerLLM
from utils.constants import CONVERSATION_ID_EVENT_KEY, TRACE_ID_ENV_VAR, USER_ID_EVENT_KEY
from utils.enum_types import LLMProviderTypes

logger = Logger(utc=True)
tracer = Tracer()


class SageMakerClient(LLMChatClient):
    """
    Class that allows building a SageMaker LLM client that is used to generate content.

    Attributes:
        llm_model (BaseLangChainModel): The LLM model which is used for generating content. For SageMaker provider, this is SageMakerLLM or
            SageMakerRetrievalLLM
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

    def get_model(self, event_body: Dict, user_id: UUID) -> Union[SageMakerLLM, SageMakerRetrievalLLM]:
        """
        Retrieves the SageMaker client.

        :param event (Dict): The AWS Lambda event
        Returns:
            SageMakerLLM or SageMakerRetrievalLLM: The SageMaker LLM model that is used to generate content.
        """
        super().get_model(event_body)

        self.builder = SageMakerBuilder(
            self.llm_config,
            connection_id=self.connection_id,
            conversation_id=event_body[CONVERSATION_ID_EVENT_KEY],
            rag_enabled=self.rag_enabled,
        )
        self.construct_chat_model(user_id, event_body, LLMProviderTypes.SAGEMAKER.value, "default")
        return self.builder.llm_model

    @tracer.capture_method
    def construct_chat_model(
        self, user_id: str, event_body: Dict, llm_provider: LLMProviderTypes, model_name: str
    ) -> None:
        """Constructs the chat model using the builder object that is passed to it. Acts like a Director for the builder.

        Args:
            user_id (str): cognito id of the user
            conversation_id (str): unique id of the conversation (used to reference the correct conversation memory)
            llm_provider (LLMProviderTypes): name of the LLM provider
            model_name (str): name of the model to use for the LLM. It should be a model name supported by the family of
                models supported by llm_provider
        Raises:
            ValueError: If builder is not set up for the client
            ValueError: If missing required params
        """
        conversation_id = event_body.get(CONVERSATION_ID_EVENT_KEY)
        if user_id and conversation_id:
            if not self.builder:
                logger.error(
                    f"Builder is not set for this LLMChatClient.",
                    xray_trace_id=os.environ[TRACE_ID_ENV_VAR],
                )
                raise ValueError(f"Builder is not set for this LLMChatClient.")

            self.builder.set_model_defaults(llm_provider, model_name)
            self.builder.validate_event_input_sizes(event_body)
            self.builder.set_knowledge_base()
            self.builder.set_conversation_memory(user_id, conversation_id)
            self.builder.set_llm_model()

        else:
            error_message = (
                f"Missing required parameters {USER_ID_EVENT_KEY}, {CONVERSATION_ID_EVENT_KEY} in the event."
            )
            logger.error(error_message, xray_trace_id=os.environ[TRACE_ID_ENV_VAR])
            raise ValueError(error_message)
