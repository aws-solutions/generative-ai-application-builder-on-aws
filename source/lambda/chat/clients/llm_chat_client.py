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

import json
import os
from abc import ABC
from typing import Any, Dict, List, Optional, Union
from uuid import uuid4

from aws_lambda_powertools import Logger, Tracer
from botocore.exceptions import ClientError
from clients.builders.llm_builder import LLMBuilder
from helper import get_service_client
from llms.base_langchain import BaseLangChainModel
from utils.constants import (
    CHAT_REQUIRED_ENV_VARS,
    CONVERSATION_ID_EVENT_KEY,
    LLM_PARAMETERS_SSM_KEY_ENV_VAR,
    PROMPT_EVENT_KEY,
    QUESTION_EVENT_KEY,
    TRACE_ID_ENV_VAR,
    USER_ID_EVENT_KEY,
)
from utils.enum_types import LLMProviderTypes

logger = Logger(utc=True)
tracer = Tracer()


class LLMChatClient(ABC):
    """
    LLMChatClient is a class that allows building a LangChain LLM client that is used to interface with different LLM provider APIs.
    Based on the llm_config that is fetched from the SSM Parameter store, a BaseLangChainModel model is built by calling the get_model
    method an the LLMChatClient.
    LLMChatClient also allows methods for validating the event and the environment.

    Attributes:
        builder (LLMBuilder): Builder object that helps create the LLM object
        llm_config (Dict): Stores the configuration that the admin sets on a use-case, fetched from SSM Parameter store
        rag_enabled (bool): Stores the value of the RAG feature flag that is set on the use-case
        connection_id (str): The connection ID for the websocket client

    Methods:
        check_env(List[str]): Checks if the environment variable list provided, along with other required environment variables, are set.
        check_event(event: Dict): Checks if the event it receives is empty.
        get_llm_config(): Retrieves the configuration that the admin sets on a use-case from the SSM Parameter store
        construct_chat_model(): Constructs the Chat model based on the event and the LLM configuration as a series of steps on the builder
        get_event_conversation_id(): Sets the conversation_id for the event
        get_model(): Retrieves the LLM model that is used to generate content

    """

    def __init__(
        self,
        builder: Optional[LLMBuilder] = None,
        llm_config: Optional[Dict] = None,
        rag_enabled: Optional[Union[str, bool]] = None,
        connection_id: Optional[str] = None,
    ) -> None:
        self._builder = builder
        self._llm_config = llm_config
        # convert string env to bool
        self._rag_enabled = rag_enabled if type(rag_enabled) == bool else rag_enabled.lower() == "true"
        self._connection_id = connection_id

    @property
    def builder(self) -> Optional[LLMBuilder]:
        return self._builder

    @builder.setter
    def builder(self, builder) -> None:
        self._builder = builder

    @property
    def llm_config(self) -> Optional[Dict]:
        return self._llm_config

    @llm_config.setter
    def llm_config(self, llm_config) -> None:
        self._llm_config = llm_config

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

    @classmethod
    def check_env(cls, additional_keys: Optional[List[str]] = []) -> None:
        """
        Checks if the environment variables it requires are set. Additionally, also checks for the list of additional environment variables.
        Args:
            additional_keys (List[str]): List of additional environment variables to check for.
        Raises:
            ValueError: If the environment variables it requires are not set.
        """
        errors = []
        env_var_keys = CHAT_REQUIRED_ENV_VARS + additional_keys
        for env in env_var_keys:
            if not os.getenv(env):
                errors.append(f"Missing required environment variable {env}.")

        if errors:
            error_message = "\n".join(errors)
            logger.error(
                error_message,
                xray_trace_id=os.getenv(TRACE_ID_ENV_VAR),
            )
            raise ValueError(error_message)

    def __validate_user_id(self, event) -> str:
        """
        Validates the user id.
        Args:
            event (str): the lambda event
        Raises:
            ValueError: If the user id is not provided.
        """
        user_id = event.get("requestContext", {}).get("authorizer", {}).get(USER_ID_EVENT_KEY, {})
        if not user_id:
            error_message = f"{USER_ID_EVENT_KEY} is missing from the requestContext"
            logger.error(error_message, xray_trace_id=os.environ[TRACE_ID_ENV_VAR])
            raise ValueError(error_message)

        return user_id

    def __validate_event_body(self, event: Dict[str, Any]) -> Dict[str, Any]:
        """
        Validates the event body.
        Args:
            event (str): the lambda event
        Returns:
            (Dict) parsed event body
        Raises:
            ValueError: If the event body is empty or not provided.
        """
        event_body = event.get("body")
        if not event_body:
            error_message = "Event body is empty"
            logger.error(
                error_message,
                xray_trace_id=os.environ[TRACE_ID_ENV_VAR],
            )
            raise ValueError(error_message)

        parsed_event_body = json.loads(event_body)
        return parsed_event_body

    def __validate_user_query(self, event_body: Dict[str, Any]) -> List[str]:
        """
        Validates the user query.
        Args:
            event (str): the event body
        Returns:
            List of error messages if the user query is empty or not provided
        """
        user_query = event_body.get(QUESTION_EVENT_KEY)

        if user_query is None:
            error_message = f"{QUESTION_EVENT_KEY} is missing from the chat event"
            logger.error(
                error_message,
                xray_trace_id=os.environ[TRACE_ID_ENV_VAR],
            )
            return [error_message]

        if not len(user_query):
            error_message = f"User query in event shouldn't be empty."
            logger.error(error_message, xray_trace_id=os.environ[TRACE_ID_ENV_VAR])
            return [error_message]

        return []

    def __validate_event_prompt(self, event_body: Dict[str, Any]) -> List[str]:
        """
         Validates the event prompt.
         Args:
             event (str): the event body
        Returns:
             List of error messages if prompt is provided but empty.
        """
        prompt = event_body.get(PROMPT_EVENT_KEY)

        if prompt is not None and not len(prompt):
            error_message = f"Prompt in event shouldn't be empty."
            logger.error(error_message, xray_trace_id=os.environ[TRACE_ID_ENV_VAR])
            return [error_message]

        return []

    def check_event(self, event: Dict[str, Any]) -> Dict:
        """
        Checks if the event it receives is as expected (checking for required fields),
        and adds the user id into the event body (comes from requestContext from custom authorizer).
        If the event body does not contain the conversation_id, it also generates and adds it in.

        Args:
            event (Dict): the lambda event
        Returns:
            (Dict): Parsed event body that contains generated conversation_id if not present
        Raises:
            ValueError: If the event it requires is not set.
        """
        errors_list = []
        parsed_event_body = self.__validate_event_body(event)
        user_id = self.__validate_user_id(event)
        errors_list.extend(self.__validate_user_query(parsed_event_body))
        errors_list.extend(self.__validate_event_prompt(parsed_event_body))

        if errors_list:
            errors = "\n".join(errors_list)
            raise ValueError(errors)

        parsed_event_body[CONVERSATION_ID_EVENT_KEY] = self.get_event_conversation_id(parsed_event_body)
        parsed_event_body[USER_ID_EVENT_KEY] = user_id
        return parsed_event_body

    @tracer.capture_method(capture_response=True)
    def get_llm_config(self) -> Dict:
        """
        Retrieves the configuration that the admin sets on a use-case from the SSM Parameter store
        Returns:
            Dict: Stores the configuration that the admin sets on a use-case, fetched from SSM Parameter store
        Raises:
            ValueError: If the environment variables it requires are not set.
        """
        with tracer.provider.in_subsegment("## llm_config") as subsegment:
            subsegment.put_annotation("service", "ssm")
            subsegment.put_annotation("operation", "get_parameter")
            ssm_param_key = os.getenv(LLM_PARAMETERS_SSM_KEY_ENV_VAR)
            try:
                if ssm_param_key:
                    ssm_client = get_service_client(service_name="ssm")
                    llm_config = ssm_client.get_parameter(Name=ssm_param_key, WithDecryption=True)
                    self.llm_config = json.loads(llm_config["Parameter"]["Value"])
                    return self.llm_config
                else:
                    error_message = f"Missing required environment variable {LLM_PARAMETERS_SSM_KEY_ENV_VAR}."
                    logger.error(error_message, xray_trace_id=os.environ[TRACE_ID_ENV_VAR])
                    raise ValueError(error_message)

            except ClientError as ce:
                if ce.response["Error"]["Code"] == "ParameterNotFound":
                    error_message = f"SSM Parameter {ssm_param_key} not found."
                    logger.error(error_message, xray_trace_id=os.environ[TRACE_ID_ENV_VAR])
                    raise ValueError(error_message)
                else:
                    logger.error(
                        ce,
                        xray_trace_id=os.environ[TRACE_ID_ENV_VAR],
                    )
                    raise ce
            except json.JSONDecodeError as jde:
                logger.error(
                    f"Error decoding the SSM Parameter {ssm_param_key}. Error: {jde}",
                    xray_trace_id=os.environ[TRACE_ID_ENV_VAR],
                )
                raise jde

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
            ValueError: If builder is not set up for the client or if missing required params
        """
        conversation_id = event_body.get(CONVERSATION_ID_EVENT_KEY, None)
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
            self.builder.set_api_key()
            self.builder.set_llm_model()

        else:
            error_message = (
                f"Missing required parameters {USER_ID_EVENT_KEY}, {CONVERSATION_ID_EVENT_KEY} in the event."
            )
            logger.error(error_message, xray_trace_id=os.environ[TRACE_ID_ENV_VAR])
            raise ValueError(error_message)

    def get_event_conversation_id(self, event_body: Dict) -> str:
        """
        Generates and returns a new conversation ID for the apigateway connection, if event_body doesn't already have it.

        Args:
            event_body (Dict): apigateway event body

        Returns: None
        """
        conversation_id = event_body.get(CONVERSATION_ID_EVENT_KEY)
        if conversation_id is None or not conversation_id:
            return str(uuid4())
        return conversation_id

    # fmt: off
    def get_model(self, event_body: Dict, *args, **kwargs) -> BaseLangChainModel: # NOSONAR python:S1172 - adding args, kwargs aligns signature across subclass and parent
    # fmt: on    
        """
        :param: event (Dict): AWS Lambda Event
        Returns:
            BaseLangChainModel: The LLM model that is used to generate content.
        """
        self.llm_config = self.get_llm_config()
        llm_params = self.llm_config.get("LlmParams")
        if not llm_params:
            self.llm_config["LlmParams"] = {}

        # If event provides a prompt, llm_config uses that instead.
        event_prompt = event_body.get("promptTemplate")
        self.llm_config["LlmParams"]["PromptTemplate"] = event_prompt if event_prompt else self.llm_config["LlmParams"].get("PromptTemplate")
