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
from typing import Optional

from aws_lambda_powertools import Logger
from helper import get_service_client
from utils.constants import END_CONVERSATION_TOKEN, TRACE_ID_ENV_VAR, WEBSOCKET_CALLBACK_URL_ENV_VAR

logger = Logger(utc=True)


class WebsocketErrorHandler:
    """
    WebsocketErrorHandler is used to send LLM responses to a websocket client when an error occurs, for a provided connection ID.

    Attributes:
        connection_url (str): The connection URL for the websocket client.
        connection_id (str): The connection ID for the websocket client, retrieved from the event object
        trace_id (Optional[str]): The x-ray trace ID to track the request in x-ray.
        client (botocore.client): client that establishes the connection to the websocket API

    Methods:
        post_token_to_connection(response): Sends a response to the client that is connected to a websocket.
        format_response(response): Formats the response in a format that the websocket accepts
    """

    def __init__(self, connection_id: str, trace_id: Optional[str]) -> None:
        self._connection_url = os.environ.get(WEBSOCKET_CALLBACK_URL_ENV_VAR)
        self._connection_id = connection_id
        self._trace_id = trace_id
        self._client = get_service_client("apigatewaymanagementapi", endpoint_url=self._connection_url)

    @property
    def connection_id(self) -> str:
        return self._connection_id

    @connection_id.setter
    def connection_id(self, connection_id) -> None:
        self._connection_id = connection_id

    @property
    def trace_id(self) -> str:
        return self._trace_id

    @trace_id.setter
    def trace_id(self, trace_id) -> None:
        self._trace_id = trace_id

    @property
    def client(self) -> str:
        return self._client

    @client.setter
    def client(self, client) -> None:
        self._client = client

    def post_token_to_connection(self, response) -> None:
        """
        Sends an error response to the client that is connected to a websocket. Also sends an END_CONVERSATION_TOKEN once the
        message response ends

        Args:
            response (str): Token to send to the client.

        Raises:
            ex: _description_
        """
        try:
            self.client.post_to_connection(
                ConnectionId=self.connection_id,
                Data=self.format_response(errorMessage=response, traceId=self.trace_id),
            )
            self.client.post_to_connection(
                ConnectionId=self.connection_id, Data=self.format_response(data=END_CONVERSATION_TOKEN)
            )
        except Exception as ex:
            logger.error(
                f"Error sending token to connection {self.connection_id}: {ex}",
                xray_trace_id=os.environ[TRACE_ID_ENV_VAR],
            )
            raise ex

    def format_response(self, **kwargs) -> str:
        """
        Formats the response in a format that the websocket accepts

        Args:
            kwargs: The keyword arguments which will be converted to a json string
        """
        return json.dumps(kwargs)
