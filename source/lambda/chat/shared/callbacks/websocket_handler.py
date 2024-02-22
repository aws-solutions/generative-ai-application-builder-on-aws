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
from typing import Callable, Dict, List

from aws_lambda_powertools import Logger
from helper import get_service_client
from utils.constants import (
    CONVERSATION_ID_EVENT_KEY,
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
        source_documents_formatter(Callable): Function that formats the source documents per the specific
            knowledge base on_chain_end

    Methods:
        post_token_to_connection(payload): Sends a payload to the client that is connected to a websocket.
        format_response(payload): Formats the payload in a format that the websocket accepts
    """

    def __init__(self, connection_id: str, source_docs_formatter: Callable, conversation_id: str) -> None:
        self._connection_url = os.environ.get(WEBSOCKET_CALLBACK_URL_ENV_VAR)
        self._connection_id = connection_id
        self._conversation_id = conversation_id
        self._client = get_service_client("apigatewaymanagementapi", endpoint_url=self.connection_url)
        self._source_documents_formatter = source_docs_formatter

    @property
    def connection_id(self) -> str:
        return self._connection_id

    @property
    def conversation_id(self) -> str:
        return self._conversation_id

    @property
    def client(self) -> str:
        return self._client

    @property
    def connection_url(self) -> str:
        return self._connection_url

    @property
    def source_documents_formatter(self) -> str:
        return self._source_documents_formatter

    def send_references(self, source_documents: List[Dict]):
        payload = self.source_documents_formatter(source_documents)

        for document in payload:
            self.post_token_to_connection(document, "sourceDocument")

    def post_token_to_connection(self, payload: str, payload_key: str = "data") -> None:
        """
        Function used to send a payload to the client that is connected to a websocket.

        Args:
            payload (str): Token to send to the client.

        Raises:
            Exception: if there is an error posting the payload to the connection
        """
        try:
            self.client.post_to_connection(
                ConnectionId=self.connection_id, Data=self.format_response(payload, payload_key)
            )
        except Exception as ex:
            logger.error(
                f"Error sending token to connection {self.connection_id}: {ex}",
                xray_trace_id=os.environ[TRACE_ID_ENV_VAR],
            )
            raise ex

    def post_response_to_connection(self, payload: str) -> None:
        """
        Function used to send a payload to the client that is connected to a websocket.

        Args:
            payload (str): Token to send to the client.
        """
        self.post_token_to_connection(payload["answer"])
        if "source_documents" in payload and payload["source_documents"]:
            self.send_references(payload["source_documents"])

    def format_response(self, payload: str, payload_key: str = "data") -> str:
        """
        Formats the payload of in a format that the websocket accepts

        Args:
            payload (str): The value of the "data" key in the websocket payload
        """
        return json.dumps({payload_key: payload, CONVERSATION_ID_EVENT_KEY: self.conversation_id})
