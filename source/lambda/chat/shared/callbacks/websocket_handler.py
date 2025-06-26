# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

import json
import os
from typing import Dict, List

from aws_lambda_powertools import Logger
from aws_lambda_powertools.metrics import MetricUnit
from helper import get_service_client
from langchain_core.callbacks import BaseCallbackHandler
from langchain_core.outputs.chat_generation import ChatGeneration
from langchain_core.outputs.llm_result import LLMResult

from utils.constants import (
    CONVERSATION_ID_EVENT_KEY,
    MESSAGE_ID_EVENT_KEY,
    PAYLOAD_DATA_KEY,
    PAYLOAD_SOURCE_DOCUMENT_KEY,
    REPHRASED_QUERY_KEY,
    SOURCE_DOCUMENTS_OUTPUT_KEY,
    TRACE_ID_ENV_VAR,
    WEBSOCKET_CALLBACK_URL_ENV_VAR,
)
from utils.enum_types import CloudWatchMetrics, CloudWatchNamespaces
from utils.helpers import get_metrics_client

logger = Logger(utc=True)
metrics = get_metrics_client(CloudWatchNamespaces.AWS_BEDROCK)


class WebsocketHandler(BaseCallbackHandler):
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

    def __init__(self, connection_id: str, conversation_id: str, message_id: str) -> None:
        self._connection_url = os.environ.get(WEBSOCKET_CALLBACK_URL_ENV_VAR)
        self._connection_id = connection_id
        self._conversation_id = conversation_id
        self._message_id = message_id
        self._client = get_service_client("apigatewaymanagementapi", endpoint_url=self.connection_url)

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
    def message_id(self) -> str:
        return self._message_id

    def send_references(self, source_documents: List[Dict]):
        for document in source_documents:
            self.post_token_to_connection(document, PAYLOAD_SOURCE_DOCUMENT_KEY)

    def post_token_to_connection(self, payload: str, payload_key: str = PAYLOAD_DATA_KEY) -> None:
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

    def on_llm_start(self, serialized, prompts, **kwargs):
        logger.debug(f"Prompt sent to the LLM: {prompts}")

    def on_llm_end(self, response: LLMResult, **kwargs: any) -> None:
        """
        on_llm_end publishes token usage and llm stop reason metrics to cloudwatch
        Args:
            response (LLMResult): The response from the LLM
        """

        for _, prompt_generations in enumerate(response.generations):
            for _, generation in enumerate(prompt_generations):
                self._update_cw_dashboard(generation)

    def _update_cw_dashboard(self, generation: ChatGeneration):
        if hasattr(generation, "message"):
            response_metadata = getattr(generation.message, "response_metadata", {}) or {}
            usage_metadata = getattr(generation.message, "usage_metadata", {}) or {}

            stop_reason = response_metadata.get("stopReason", "")
            input_tokens = usage_metadata.get("input_tokens", 0)
            output_tokens = usage_metadata.get("output_tokens", 0)
            total_tokens = usage_metadata.get("total_tokens", 0)

            token_metrics = {
                CloudWatchMetrics.LLM_INPUT_TOKEN_COUNT.value: input_tokens,
                CloudWatchMetrics.LLM_OUTPUT_TOKEN_COUNT.value: output_tokens,
                CloudWatchMetrics.LLM_TOTAL_TOKEN_COUNT.value: total_tokens,
            }

            for metric_name, token_count in token_metrics.items():
                if token_count:
                    metrics.add_metric(name=metric_name, unit=MetricUnit.Count, value=int(token_count))
            metrics.flush_metrics()

            if stop_reason:
                stop_reason_pascal_format = "".join(word.capitalize() for word in stop_reason.split("_"))
                metrics.add_dimension(name="StopReasonType", value=stop_reason_pascal_format)
                metrics.add_metric(name=CloudWatchMetrics.LLM_STOP_REASON.value, unit=MetricUnit.Count, value=1)
            metrics.flush_metrics()

    def post_response_to_connection(self, payload: dict) -> None:
        """
        Function used to send a payload to the client that is connected to a websocket.

        Args:
            payload (str): Token to send to the client.
        """
        self.post_token_to_connection(payload["answer"])

        if SOURCE_DOCUMENTS_OUTPUT_KEY in payload and payload[SOURCE_DOCUMENTS_OUTPUT_KEY]:
            self.send_references(payload[SOURCE_DOCUMENTS_OUTPUT_KEY])

        if REPHRASED_QUERY_KEY in payload and payload[REPHRASED_QUERY_KEY]:
            self.post_token_to_connection(payload[REPHRASED_QUERY_KEY], REPHRASED_QUERY_KEY)

    def format_response(self, payload: str, payload_key: str = "data") -> str:
        """
        Formats the payload of in a format that the websocket accepts

        Args:
            payload (str): The value of the "data" key in the websocket payload
        """
        return json.dumps(
            {
                payload_key: payload,
                CONVERSATION_ID_EVENT_KEY: self.conversation_id,
                MESSAGE_ID_EVENT_KEY: self.message_id,
            }
        )
