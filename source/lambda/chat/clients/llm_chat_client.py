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
from helper import get_service_resource
from llms.base_langchain import BaseLangChainModel
from utils.constants import (
    AUTH_TOKEN_EVENT_KEY,
    CHAT_REQUIRED_ENV_VARS,
    CONVERSATION_ID_EVENT_KEY,
    DEFAULT_RAG_ENABLED_MODE,
    LLM_CONFIG_RECORD_FIELD_NAME,
    MESSAGE_KEY,
    PROMPT_EVENT_KEY,
    QUESTION_EVENT_KEY,
    REQUEST_CONTEXT_KEY,
    TRACE_ID_ENV_VAR,
    USE_CASE_CONFIG_RECORD_KEY_ENV_VAR,
    USE_CASE_CONFIG_TABLE_NAME_ENV_VAR,
    USER_ID_EVENT_KEY,
)
from utils.enum_types import LLMProviderTypes

logger = Logger(utc=True)
tracer = Tracer()


class LLMChatClient(ABC):
    """
    LLMChatClient is a class that allows building a LangChain LLM client that is used to interface with different LLM provider APIs.
    Based on the use_case_config that is fetched from DynamoDB, a BaseLangChainModel model is built by calling the get_model
    method an the LLMChatClient.
    LLMChatClient also allows methods for validating the event and the environment.

    Attributes:
        - builder (LLMBuilder): Builder object that helps create the LLM object
        - use_case_config (Dict): Stores the configuration that the admin sets on a use-case, fetched from DynamoDB
        - rag_enabled (bool): Stores the value of the RAG feature flag that is set on the use-case
        - connection_id (str): The connection ID for the websocket client

    Methods:
        check_env(List[str]): Checks if the environment variable list provided, along with other required environment variables, are set.
        check_event(event: Dict): Checks if the event it receives is empty.
        retrieve_use_case_config(): Retrieves the configuration that the admin sets on a use-case fetched from DynamoDB
        construct_chat_model(): Constructs the Chat model based on the event and the LLM configuration as a series of steps on the builder
        get_event_conversation_id(): Sets the conversation_id for the event
        get_model(): Retrieves the LLM that is used to generate content

    """

    def __init__(
        self,
        connection_id: str,
        builder: Optional[LLMBuilder] = None,
        use_case_config: Optional[Dict] = None,
        rag_enabled: Optional[bool] = None,
    ) -> None:
        self._connection_id = connection_id
        self.builder = builder
        self._use_case_config = use_case_config
        self.rag_enabled = rag_enabled if (rag_enabled is not None) else DEFAULT_RAG_ENABLED_MODE

    @property
    def builder(self) -> Optional[LLMBuilder]:
        return self._builder

    @builder.setter
    def builder(self, builder) -> None:
        self._builder = builder

    @property
    def use_case_config(self) -> Optional[Dict[str, Any]]:
        if self._use_case_config is None:
            self._use_case_config = self.retrieve_use_case_config()
        return self._use_case_config

    @property
    def rag_enabled(self) -> bool:
        return self._rag_enabled

    @rag_enabled.setter
    def rag_enabled(self, rag_enabled) -> None:
        self._rag_enabled = rag_enabled

    @property
    def connection_id(self) -> str:
        return self._connection_id

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

    def _validate_user_id(self, event) -> str:
        """
        Validates the user id.
        Args:
            event (str): the lambda event
        Raises:
            ValueError: If the user id is not provided.
        """
        user_id = event.get(REQUEST_CONTEXT_KEY, {}).get("authorizer", {}).get(USER_ID_EVENT_KEY, {})
        if not user_id:
            error_message = f"{USER_ID_EVENT_KEY} is missing from the requestContext"
            logger.error(error_message, xray_trace_id=os.environ[TRACE_ID_ENV_VAR])
            raise ValueError(error_message)

        return user_id

    def _validate_event_body(self, event: Dict[str, Any]) -> Dict[str, Any]:
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

    def _validate_user_query(self, event_body: Dict[str, Any]) -> List[str]:
        """
        Validates the user query.
        Args:
            event (str): the event body
        Returns:
            List of error messages if the user query is empty, not provided, or too long
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
            error_message = "User query provided in the event shouldn't be empty."
            logger.error(error_message, xray_trace_id=os.environ[TRACE_ID_ENV_VAR])
            return [error_message]

        max_input_length = self.use_case_config.get("LlmParams", {}).get("PromptParams", {}).get("MaxInputTextLength")
        if max_input_length is not None and len(user_query) > max_input_length:
            error_message = (
                f"User query provided in the event shouldn't be greater than {max_input_length} characters long."
            )
            logger.error(error_message, xray_trace_id=os.environ[TRACE_ID_ENV_VAR])
            return [error_message]

        return []

    def _validate_event_prompt(self, event_body: Dict[str, Any]) -> List[str]:
        """
         Validates the event prompt.
         Args:
             event (str): the event body
        Returns:
             List of error messages if prompt is provided but empty, too long, or provided when not allowed.
        """
        prompt = event_body.get(PROMPT_EVENT_KEY)

        is_user_prompt_allowed = (
            self.use_case_config.get("LlmParams", {}).get("PromptParams", {}).get("UserPromptEditingEnabled", True)
        )
        if not is_user_prompt_allowed and prompt is not None:
            error_message = "Prompt provided in the event when this use case has been configured to forbid this."
            logger.error(
                error_message,
                xray_trace_id=os.environ[TRACE_ID_ENV_VAR],
            )
            return [error_message]

        if prompt is not None and not len(prompt):
            error_message = f"Prompt provided in the event shouldn't be empty."
            logger.error(error_message, xray_trace_id=os.environ[TRACE_ID_ENV_VAR])
            return [error_message]

        max_prompt_length = (
            self.use_case_config.get("LlmParams", {}).get("PromptParams", {}).get("MaxPromptTemplateLength")
        )
        if prompt is not None and max_prompt_length is not None and len(prompt) > max_prompt_length:
            error_message = (
                f"Prompt provided in the event shouldn't be greater than {max_prompt_length} characters long."
            )
            logger.error(error_message, xray_trace_id=os.environ[TRACE_ID_ENV_VAR])
            return [error_message]

        return []

    def _validate_auth_token(self, event: Dict[str, Any]) -> Union[str, None]:
        """
        Validates the auth token.
        Args:
            event (str): the lambda event
        Returns:
            (Dict) parsed event body
        Raises:
            ValueError: If the auth token is empty or not provided.
        """
        auth_token = event.get("message", {}).get(AUTH_TOKEN_EVENT_KEY, None)
        if not auth_token:
            error_message = f"{AUTH_TOKEN_EVENT_KEY} is missing from the event."
            logger.warning(
                error_message,
                xray_trace_id=os.environ[TRACE_ID_ENV_VAR],
            )

        return auth_token

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
        parsed_event_body = self._validate_event_body(event)
        user_id = self._validate_user_id(parsed_event_body)
        auth_token = self._validate_auth_token(parsed_event_body)
        errors_list.extend(self._validate_user_query(parsed_event_body[MESSAGE_KEY]))
        errors_list.extend(self._validate_event_prompt(parsed_event_body[MESSAGE_KEY]))

        if errors_list:
            errors = "\n".join(errors_list)
            raise ValueError(errors)

        parsed_event_body[MESSAGE_KEY][CONVERSATION_ID_EVENT_KEY] = self.get_event_conversation_id(
            parsed_event_body[MESSAGE_KEY]
        )
        parsed_event_body[MESSAGE_KEY][USER_ID_EVENT_KEY] = user_id
        parsed_event_body[AUTH_TOKEN_EVENT_KEY] = auth_token
        return parsed_event_body

    @tracer.capture_method(capture_response=True)
    def retrieve_use_case_config(self) -> Dict:
        """
        Retrieves the configuration that the admin sets on a use-case fetched from DynamoDB
        Returns:
            Dict: Stores the configuration that the admin sets on a use-case fetched from DynamoDB
        Raises:
            ValueError: If the environment variables it requires are not set.
        """

        with tracer.provider.in_subsegment("## use_case_config") as subsegment:
            subsegment.put_annotation("service", "dynamodb")
            subsegment.put_annotation("operation", "get_item")

            # The LLM config table from which the config must be fetched
            use_case_config_table = os.getenv(USE_CASE_CONFIG_TABLE_NAME_ENV_VAR)

            # USE_CASE_CONFIG_RECORD_KEY_ENV_VAR is the key of the row in the DynamoDB table where the config is
            # LLM_CONFIG_RECORD_FIELD_NAME is the name of DynamoDB field
            record_key = os.getenv(USE_CASE_CONFIG_RECORD_KEY_ENV_VAR)

            if not use_case_config_table or not record_key:
                error_message = f"Missing required environment variable {USE_CASE_CONFIG_TABLE_NAME_ENV_VAR} or {USE_CASE_CONFIG_RECORD_KEY_ENV_VAR}."
                logger.error(error_message, xray_trace_id=os.environ[TRACE_ID_ENV_VAR])
                raise ValueError(error_message)

            try:
                ddb_resource = get_service_resource("dynamodb")
                use_case_config_table = ddb_resource.Table(use_case_config_table)
                response = use_case_config_table.get_item(
                    Key={LLM_CONFIG_RECORD_FIELD_NAME: record_key},
                    ProjectionExpression="config",
                    ConsistentRead=True,
                )
            except ClientError as ce:
                error_message = f"Error retrieving usecase config with key {record_key}."
                if ce.response["Error"]["Code"] == "ResourceNotFoundException":
                    logger.error(error_message, xray_trace_id=os.environ[TRACE_ID_ENV_VAR])
                    raise ValueError(error_message)
                else:
                    logger.error(ce, xray_trace_id=os.environ[TRACE_ID_ENV_VAR])
                    raise ce

            config = response.get("Item", {}).get("config", {})
            if config:
                return config
            else:
                error_message = f"No usecase config found with key {record_key}."
                logger.error(error_message, xray_trace_id=os.environ[TRACE_ID_ENV_VAR])
                raise ValueError(error_message)

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
            self.builder.set_llm()

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
            BaseLangChainModel: The LLM that is used to generate content.
        """
        # If event provides a prompt, use_case_config uses that instead.
        event_prompt = event_body.get("promptTemplate")
        usecase_llm_params = self.use_case_config.get("LlmParams", {})
        usecase_prompt_params = usecase_llm_params.get("PromptParams", {})

        usecase_prompt_params["PromptTemplate"] = event_prompt if event_prompt else usecase_prompt_params.get("PromptTemplate")

        if usecase_llm_params.get("Verbose") is not None and usecase_llm_params["Verbose"] == True:
            os.environ["LOG_LEVEL"] = "DEBUG"
        
        # Child class adds its own implementation following this to get the appropriate model.
