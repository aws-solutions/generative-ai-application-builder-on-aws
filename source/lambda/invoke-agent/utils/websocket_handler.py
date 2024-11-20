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
        """

        Args:
            connection_id (str): _description_
        """
        self._connection_id = connection_id
        self._conversation_id = conversation_id
        self._check_env_variables()
        self._client = client or get_service_client("apigatewaymanagementapi", endpoint_url=self.connection_url)
        self._trace_id = os.environ.get(TRACE_ID_ENV_VAR)

    @property
    def connection_id(self) -> str:
        return self._connection_id

    def _check_env_variables(self) -> None:
        """
        Check if the required environment variables are set.
        Raises an KeyError if WEBSOCKET_CALLBACK_URL is not set.
        """
        self.connection_url = os.environ.get(WEBSOCKET_CALLBACK_URL_ENV_VAR)
        if not self.connection_url:
            logger.error(f"Missing required environment variable: {WEBSOCKET_CALLBACK_URL_ENV_VAR}")
            raise KeyError(f"The environment variable {WEBSOCKET_CALLBACK_URL_ENV_VAR} is not set.")

    def send_message(self, response: str) -> None:
        """
        Sends the message response to the client and then sends the END_CONVERSATION_TOKEN.

        Args:
            response (str): The response to send to the client.
        """
        try:
            self._post_to_connection(response)
            self._post_to_connection(END_CONVERSATION_TOKEN)
        except Exception as ex:
            logger.error(
                f"Error sending message to connection {self._connection_id}: {ex}",
                xray_trace_id=self._trace_id,
            )
            raise ex

    def send_error_message(self, error: Exception) -> None:
        """
        Send a masked error message to the specified WebSocket connection.

        Args:
            error (Exception): The error object to process.
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

    def _post_to_connection(self, message: str, is_error: bool = False) -> None:
        """
        Posts a message to the specified WebSocket connection.

        Args:
            message (str): The message to post.
            is_error (bool, optional): Whether this is an error message. Defaults to False.
        """
        try:
            if is_error:
                formatted_response = self._format_response(errorMessage=message, traceId=self._trace_id)
            else:
                formatted_response = self._format_response(data=message)

            self._client.post_to_connection(ConnectionId=self._connection_id, Data=formatted_response)
        except Exception as ex:
            logger.error(
                f"Error posting message to connection {self._connection_id}: {ex}",
                exc_info=True,
                xray_trace_id=self._trace_id,
            )
            raise ex

    def _format_response(self, **kwargs: Any) -> str:
        """
        Formats the payload in a format that the websocket accepts.

        This method can handle both regular data messages and error messages.
        For regular messages, use the 'data' key.
        For error messages, use 'errorMessage' and 'traceId' keys.

        Args:
            **kwargs: Keyword arguments containing either 'data' for regular messages,
                      or 'errorMessage' and 'traceId' for error messages.

        Returns:
            str: JSON-formatted string containing the formatted response.
        """
        response_dict = {CONVERSATION_ID_KEY: self._conversation_id}
        response_dict.update(kwargs)
        return json.dumps(response_dict)
