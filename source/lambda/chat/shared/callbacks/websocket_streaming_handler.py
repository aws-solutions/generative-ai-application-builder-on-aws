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

import json
import os
from typing import Any, Dict, List, Optional

import botocore
from aws_lambda_powertools import Logger
from helper import get_service_client
from langchain.callbacks.streaming_aiter import AsyncIteratorCallbackHandler
from langchain.schema.messages import BaseMessage
from utils.constants import (
    CONVERSATION_ID_EVENT_KEY,
    END_CONVERSATION_TOKEN,
    TRACE_ID_ENV_VAR,
    WEBSOCKET_CALLBACK_URL_ENV_VAR,
)

logger = Logger(utc=True)


class WebsocketStreamingCallbackHandler(AsyncIteratorCallbackHandler):
    """
    This async websocket handler is used to send streaming LLM responses to a websocket client, for a provided connection ID.
    Inherits AsyncIteratorCallbackHandler Langchain callback handler class and overrides its abstract methods

    Attributes:
        connection_url (str): The connection URL for the websocket client.
        connection_id (str): The connection ID for the websocket client, retrieved from the event object
        conversation_id (str): The conversation ID for the websocket client, retrieved from the event object
        is_streaming (bool): Flag to indicate if streaming is enabled.
        client (botocore.client): client that establishes the connection to the websocket API

    Methods:
        post_token_to_connection(response): Sends a response to the client that is connected to a websocket.
        on_llm_new_token(token, **kwargs): Executed when the llm creates a new token
        on_llm_end(self, response: any, **kwargs: any): Executes once the LLM completes generating a response
        on_llm_error(self, error: Exception, **kwargs: any): Executes when the underlying llm errors out.
        format_response(response): Formats the response in a format that the websocket accepts

    """

    _connection_url: Optional[str] = None
    _connection_id: Optional[str] = None
    _conversation_id: Optional[str] = None
    _is_streaming: bool = False
    _client: botocore.client = None

    def __init__(self, connection_id: str, conversation_id: str, is_streaming: bool = False) -> None:
        self._connection_url = os.environ.get(WEBSOCKET_CALLBACK_URL_ENV_VAR)
        self._connection_id = connection_id
        self._conversation_id = conversation_id
        self._is_streaming = is_streaming
        self._client = get_service_client("apigatewaymanagementapi", endpoint_url=self._connection_url)
        super().__init__()

    @property
    def is_streaming(self) -> str:
        return self._is_streaming

    @is_streaming.setter
    def is_streaming(self, is_streaming) -> None:
        self._is_streaming = is_streaming

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
    def client(self) -> str:
        return self._client

    @client.setter
    def client(self, client) -> None:
        self._client = client

    def on_chat_model_start(
        self,
        serialized: Dict[str, Any],
        messages: List[List[BaseMessage]],
        **kwargs: Any,
    ) -> None:
        """Run when LLM starts running."""
        logger.info("Chat model started")

    def post_token_to_connection(self, response: str) -> None:
        """
        Sends a response to the client that is connected to a websocket.

        Args:
            response (str): Response to send to the client.

        Raises:
            ex: _description_
        """
        try:
            self.client.post_to_connection(ConnectionId=self.connection_id, Data=self.format_response(response))
        except Exception as ex:
            logger.error(
                f"Error sending token to connection {self.connection_id}: {ex}",
                xray_trace_id=os.environ[TRACE_ID_ENV_VAR],
            )
            raise ex

    def on_llm_new_token(self, token: str, **kwargs: any) -> None:
        """
        Executes when the llm creates a new token. It is used to send tokens to the client connected, as a post request,
        to the websocket using the aws-sdk.

        Args:
            token (str): Token to send to the client.
        """
        if self.is_streaming:
            self.post_token_to_connection(token)

    def on_llm_end(self, response: any, **kwargs: any) -> any:
        """
        Executes once the LLM completes generating a response. If streaming was disabled then the entire response text is dispatched
        upon completion. Finally a completion message is also dispatched.

        Args:
            response (any): Response object from the LLM

        Returns:
            any: return
        """
        if not self.is_streaming:
            self.post_token_to_connection(response.generations[0][0].text)

        self.post_token_to_connection(END_CONVERSATION_TOKEN)
        logger.info(f"The LLM has finished sending tokens to the connection: {self.connection_id}")

    def on_llm_error(self, error: Exception, **kwargs: any) -> None:
        """
        Executes when the underlying llm errors out. As of now it sends the error as a post response to the connected client.

        Args:
            error (Exception): error to send
        """
        tracer_id = os.environ[TRACE_ID_ENV_VAR]
        logger.error(f"LLM Error: {error}", xray_trace_id=tracer_id)

    def format_response(self, response: str) -> str:
        """
        Formats the response of in a format that the websocket accepts

        Args:
            response (str): The value of the "data" key in the websocket response
        """
        return json.dumps(
            {
                "data": response,
                CONVERSATION_ID_EVENT_KEY: self.conversation_id,
            }
        )
