# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

import json
import os
from typing import Any

from aws_lambda_powertools import Logger
from helper import get_service_client
from utils.constants import (
    CONVERSATION_ID_KEY,
    END_CONVERSATION_TOKEN,
    TRACE_ID_ENV_VAR,
    WEBSOCKET_CALLBACK_URL_ENV_VAR,
)

logger = Logger(utc=True)


class WebSocketHandler:
    def __init__(self, connection_id: str, conversation_id: str, client: Any = None):
        """Initialize a WebSocket handler.

        Args:
            connection_id (str): The WebSocket connection ID
            conversation_id (str): The conversation ID for this WebSocket connection
            client (Any, optional): The API Gateway management client. Defaults to None.
        """
        self._connection_id = connection_id
        self._conversation_id = conversation_id
        self._check_env_variables()
        self._client = client or get_service_client("apigatewaymanagementapi", endpoint_url=self.connection_url)
        self._trace_id = os.environ.get(TRACE_ID_ENV_VAR)

    @property
    def connection_id(self) -> str:
        """Get the WebSocket connection ID.

        Returns:
            str: The WebSocket connection ID
        """
        return self._connection_id

    def _check_env_variables(self) -> None:
        """Check if the required environment variables are set.
        
        Raises:
            KeyError: If WEBSOCKET_CALLBACK_URL environment variable is not set
        """
        self.connection_url = os.environ.get(WEBSOCKET_CALLBACK_URL_ENV_VAR)
        if not self.connection_url:
            logger.error(f"Missing required environment variable: {WEBSOCKET_CALLBACK_URL_ENV_VAR}")
            raise KeyError(f"The environment variable {WEBSOCKET_CALLBACK_URL_ENV_VAR} is not set.")

    def send_complete_response(self, response: str, message_id: str = None) -> None:
        """Send the complete response to the client and then send the END_CONVERSATION_TOKEN.

        Args:
            response (str): The response to send to the client
            message_id (str, optional): The message ID to include in the response

        Raises:
            Exception: If there is an error sending the response
        """
        try:
            self._post_to_connection(response, message_id=message_id)
            self._post_to_connection(END_CONVERSATION_TOKEN, message_id=message_id)
        except Exception as ex:
            logger.error(
                f"Error sending complete response to connection {self._connection_id}: {ex}",
                xray_trace_id=self._trace_id,
            )
            raise ex

    def send_streaming_chunk(self, chunk: str, message_id: str = None) -> None:
        """Send a streaming chunk to the client.

        Args:
            chunk (str): The chunk of data to send to the client
            message_id (str, optional): The message ID to include in the response

        Raises:
            Exception: If there is an error sending the chunk
        """
        try:
            self._post_to_connection(chunk, message_id=message_id)
        except Exception as ex:
            logger.error(
                f"Error sending streaming chunk to connection {self._connection_id}: {ex}",
                xray_trace_id=self._trace_id,
            )
            raise ex

    def end_streaming(self, message_id: str = None) -> None:
        """Send the END_CONVERSATION_TOKEN to signal the end of a streaming response.

        Args:
            message_id (str, optional): The message ID to include in the response

        Raises:
            Exception: If there is an error sending the end token
        """
        try:
            self._post_to_connection(END_CONVERSATION_TOKEN, message_id=message_id)
        except Exception as ex:
            logger.error(
                f"Error sending end streaming token to connection {self._connection_id}: {ex}",
                xray_trace_id=self._trace_id,
            )
            raise ex

    def send_error_message(self, error: Exception) -> None:
        """Send a masked error message to the specified WebSocket connection.

        Args:
            error (Exception): The error object to process and mask before sending

        Raises:
            Exception: If there is an error sending the error message
        """
        try:
            # Log the full error
            logger.error(f"Error occurred: {str(error)}", xray_trace_id=self._trace_id)

            # Create a masked error message for the client
            masked_error_message = f"Chat service failed to respond. Please contact your administrator for support and quote the following trace id: {self._trace_id}"

            self._post_to_connection(masked_error_message, is_error=True)
            self._post_to_connection(END_CONVERSATION_TOKEN)
        except Exception as ex:
            logger.error(
                f"Error sending error message to connection {self._connection_id}: {ex}",
                xray_trace_id=self._trace_id,
            )
            raise ex

    def _post_to_connection(self, message: str, is_error: bool = False, message_id: str = None) -> None:
        """Post a message to the specified WebSocket connection.

        Args:
            message (str): The message to post
            is_error (bool, optional): Whether this is an error message. Defaults to False.
            message_id (str, optional): The message ID to include in the response. Defaults to None.

        Raises:
            Exception: If there is an error posting the message
        """
        try:
            if is_error:
                formatted_response = self._format_response(errorMessage=message, traceId=self._trace_id)
            else:
                formatted_response = self._format_response(data=message, messageId=message_id)

            self._client.post_to_connection(ConnectionId=self._connection_id, Data=formatted_response)
        except Exception as ex:
            logger.error(
                f"Error posting message to connection {self._connection_id}: {ex}",
                exc_info=True,
                xray_trace_id=self._trace_id,
            )
            raise ex

    def _format_response(self, **kwargs: Any) -> str:
        """Format the payload in a format that the websocket accepts.

        This method can handle both regular data messages and error messages.
        For regular messages, use the 'data' key.
        For error messages, use 'errorMessage' and 'traceId' keys.

        Args:
            **kwargs: Keyword arguments containing either 'data' for regular messages,
                     or 'errorMessage' and 'traceId' for error messages.

        Returns:
            str: JSON-formatted string containing the formatted response
        """
        response_dict = {CONVERSATION_ID_KEY: self._conversation_id}
        response_dict.update(kwargs)
        return json.dumps(response_dict)
