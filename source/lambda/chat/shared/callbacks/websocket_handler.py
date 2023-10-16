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

from aws_lambda_powertools import Logger
from helper import get_service_client
from utils.constants import (
    CONVERSATION_ID_EVENT_KEY,
    END_CONVERSATION_TOKEN,
    TRACE_ID_ENV_VAR,
    WEBSOCKET_CALLBACK_URL_ENV_VAR,
)

logger = Logger(utc=True)


class WebsocketHandler:
    """
    WebsocketHandler is used to send LLM responses to a websocket client, for a provided connection ID.

    Attributes:
        connection_url (str): The connection URL for the websocket client.
        connection_id (str): The connection ID for the websocket client, retrieved from the event object
        conversation_id (str): The conversation ID for the websocket client, retrieved from the event object
        client (botocore.client): client that establishes the connection to the websocket API

    Methods:
        post_token_to_connection(response): Sends a response to the client that is connected to a websocket.
        format_response(response): Formats the response in a format that the websocket accepts
    """

    def __init__(self, connection_id: str, conversation_id: str) -> None:
        self._connection_url = os.environ.get(WEBSOCKET_CALLBACK_URL_ENV_VAR)
        self._connection_id = connection_id
        self._conversation_id = conversation_id
        self._client = get_service_client("apigatewaymanagementapi", endpoint_url=self._connection_url)

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

    def post_token_to_connection(self, response) -> None:
        """
        Function used to send a response to the client that is connected to a websocket.

        Args:
            response (str): Token to send to the client.

        Raises:
            ex: _description_
        """
        try:
            self.client.post_to_connection(ConnectionId=self.connection_id, Data=self.format_response(response))
            self.client.post_to_connection(
                ConnectionId=self.connection_id, Data=self.format_response(END_CONVERSATION_TOKEN)
            )
        except Exception as ex:
            logger.error(
                f"Error sending token to connection {self.connection_id}: {ex}",
                xray_trace_id=os.environ[TRACE_ID_ENV_VAR],
            )
            raise ex

    def format_response(self, response: str) -> str:
        """
        Formats the response of in a format that the websocket accepts

        Args:
            response (str): The value of the "data" key in the websocket response
        """
        return json.dumps({"data": response, CONVERSATION_ID_EVENT_KEY: self.conversation_id})
