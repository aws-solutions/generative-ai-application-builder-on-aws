# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

import json
import os
from typing import Optional

from aws_lambda_powertools import Logger
from helper import get_service_client
from utils.constants import (
    CONVERSATION_ID_EVENT_KEY,
    END_CONVERSATION_TOKEN,
    TRACE_ID_ENV_VAR,
    WEBSOCKET_CALLBACK_URL_ENV_VAR,
)

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
        post_token_to_connection(payload): Sends a payload to the client that is connected to a websocket.
        format_response(payload): Formats the payload in a format that the websocket accepts
    """

    def __init__(self, connection_id: str, conversation_id: str, trace_id: Optional[str]) -> None:
        self._connection_url = os.environ.get(WEBSOCKET_CALLBACK_URL_ENV_VAR)
        self._connection_id = connection_id
        self._trace_id = trace_id
        self._client = get_service_client("apigatewaymanagementapi", endpoint_url=self.connection_url)
        self._conversation_id = conversation_id

    @property
    def connection_url(self) -> str:
        return self._connection_url

    @property
    def trace_id(self) -> str:
        return self._trace_id

    @property
    def client(self) -> str:
        return self._client

    @property
    def connection_id(self) -> str:
        return self._connection_id

    def post_token_to_connection(self, payload) -> None:
        """
        Sends an error payload to the client that is connected to a websocket. Also sends an END_CONVERSATION_TOKEN once the
        message payload ends

        Args:
            payload (str): Token to send to the client.

        Raises:
            Exception: if there is an error posting the payload to the connection
        """
        try:
            self.client.post_to_connection(
                ConnectionId=self.connection_id, Data=self.format_response(errorMessage=payload, traceId=self.trace_id)
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
        Formats the payload in a format that the websocket accepts

        Args:
            kwargs: The keyword arguments which will be converted to a json string
        """
        response_dict = {CONVERSATION_ID_EVENT_KEY: self._conversation_id}
        response_dict.update(kwargs)
        return json.dumps(response_dict)
