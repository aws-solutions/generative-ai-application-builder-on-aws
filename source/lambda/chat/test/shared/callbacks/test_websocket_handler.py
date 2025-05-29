#!/usr/bin/env python
# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

import json
import os
from unittest.mock import Mock, patch, call

import pytest
from aws_lambda_powertools.metrics import MetricUnit
from langchain_core.messages.ai import AIMessageChunk
from shared.callbacks.websocket_handler import WebsocketHandler
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
from utils.enum_types import CloudWatchMetrics

MOCK_CONNECTION_ID = "fake-connection-id"
MOCK_CONVERSATION_ID = "fake-conversation-id"
MOCK_MESSAGE_ID = "fake-message-id"
MOCK_WEBSOCKET_URL = "wss://fake-url"
MOCK_TRACE_ID = "fake-trace-id"


@pytest.fixture
def websocket_handler():
    os.environ[WEBSOCKET_CALLBACK_URL_ENV_VAR] = MOCK_WEBSOCKET_URL
    os.environ[TRACE_ID_ENV_VAR] = MOCK_TRACE_ID

    with patch("shared.callbacks.websocket_handler.get_service_client"):
        handler = WebsocketHandler(
            connection_id=MOCK_CONNECTION_ID, 
            conversation_id=MOCK_CONVERSATION_ID,
            message_id=MOCK_MESSAGE_ID
        )
        yield handler


def test_handler_initialization(websocket_handler):
    assert websocket_handler.connection_id == MOCK_CONNECTION_ID
    assert websocket_handler.conversation_id == MOCK_CONVERSATION_ID
    assert websocket_handler.message_id == MOCK_MESSAGE_ID
    assert websocket_handler.connection_url == MOCK_WEBSOCKET_URL


def test_post_token_to_connection(websocket_handler):
    test_payload = "test message"
    expected_data = json.dumps({
        PAYLOAD_DATA_KEY: test_payload, 
        CONVERSATION_ID_EVENT_KEY: MOCK_CONVERSATION_ID,
        MESSAGE_ID_EVENT_KEY: MOCK_MESSAGE_ID
    })

    websocket_handler.post_token_to_connection(test_payload)

    websocket_handler.client.post_to_connection.assert_called_once_with(
        ConnectionId=MOCK_CONNECTION_ID, Data=expected_data
    )


def test_post_token_to_connection_error(websocket_handler):
    websocket_handler.client.post_to_connection.side_effect = Exception("Connection error")

    with pytest.raises(Exception) as exc:
        websocket_handler.post_token_to_connection("test")

    assert str(exc.value) == "Connection error"


@pytest.mark.parametrize(
    "doc",
    [
        {"id": 1, "content": "doc1"},
        {"id": 2, "content": "doc2"},
    ],
)
def test_send_references(websocket_handler, doc):
    with patch.object(websocket_handler, "post_token_to_connection") as mocked_post:
        websocket_handler.send_references([doc])
        mocked_post.assert_called_once_with(doc, PAYLOAD_SOURCE_DOCUMENT_KEY)


def test_post_response_to_connection_basic(websocket_handler):
    test_payload = {"answer": "test response"}

    websocket_handler.post_response_to_connection(test_payload)

    websocket_handler.client.post_to_connection.assert_called_once_with(
        ConnectionId=MOCK_CONNECTION_ID,
        Data=json.dumps({
            PAYLOAD_DATA_KEY: "test response", 
            CONVERSATION_ID_EVENT_KEY: MOCK_CONVERSATION_ID,
            MESSAGE_ID_EVENT_KEY: MOCK_MESSAGE_ID
        }),
    )


def test_post_response_to_connection_with_sources(websocket_handler):
    test_payload = {"answer": "test response", SOURCE_DOCUMENTS_OUTPUT_KEY: [{"id": 1, "content": "doc1"}]}

    websocket_handler.post_response_to_connection(test_payload)

    assert websocket_handler.client.post_to_connection.call_count == 2


def test_post_response_to_connection_with_rephrased(websocket_handler):
    test_payload = {"answer": "test response", REPHRASED_QUERY_KEY: "rephrased question"}

    websocket_handler.post_response_to_connection(test_payload)

    # Check that the rephrased query includes the message ID
    websocket_handler.client.post_to_connection.assert_any_call(
        ConnectionId=MOCK_CONNECTION_ID,
        Data=json.dumps({
            REPHRASED_QUERY_KEY: "rephrased question", 
            CONVERSATION_ID_EVENT_KEY: MOCK_CONVERSATION_ID,
            MESSAGE_ID_EVENT_KEY: MOCK_MESSAGE_ID
        }),
    )
    
    assert websocket_handler.client.post_to_connection.call_count == 2


@pytest.mark.parametrize(
    "stop_reason,input_tokens,output_tokens,total_tokens,expected_dimension",
    [
        ("max_tokens", 100, 50, 150, "MaxTokens"),
        ("", 200, 100, 300, None),
        ("length", 0, 0, 0, "Length"),
        ("context_limit", 123, 456, 579, "ContextLimit"),
    ],
)
def test_update_cw_dashboard(
    websocket_handler, stop_reason, input_tokens, output_tokens, total_tokens, expected_dimension
):
    with patch("shared.callbacks.websocket_handler.metrics") as mock_metrics:
        message = Mock()
        message.response_metadata = {"stopReason": stop_reason}
        message.usage_metadata = {
            "input_tokens": input_tokens,
            "output_tokens": output_tokens,
            "total_tokens": total_tokens,
        }

        generation = AIMessageChunk(content="test content")
        generation.message = message

        websocket_handler._update_cw_dashboard(generation)

        expected_calls = []
        if input_tokens:
            expected_calls.append(
                call(name=CloudWatchMetrics.LLM_INPUT_TOKEN_COUNT.value, unit=MetricUnit.Count, value=input_tokens)
            )
        if output_tokens:
            expected_calls.append(
                call(name=CloudWatchMetrics.LLM_OUTPUT_TOKEN_COUNT.value, unit=MetricUnit.Count, value=output_tokens)
            )
        if total_tokens:
            expected_calls.append(
                call(name=CloudWatchMetrics.LLM_TOTAL_TOKEN_COUNT.value, unit=MetricUnit.Count, value=total_tokens)
            )

        mock_metrics.add_metric.assert_has_calls(expected_calls, any_order=True)

        if expected_dimension:
            mock_metrics.add_dimension.assert_called_once_with(name="StopReasonType", value=expected_dimension)
            mock_metrics.add_metric.assert_any_call(
                name=CloudWatchMetrics.LLM_STOP_REASON.value, unit=MetricUnit.Count, value=1
            )
        else:
            mock_metrics.add_dimension.assert_not_called()


def test_update_cw_dashboard_without_metadata(websocket_handler):
    with patch("shared.callbacks.websocket_handler.metrics") as mock_metrics:
        message = Mock()
        message.response_metadata = {}
        message.usage_metadata = {}
        generation = AIMessageChunk(content="test content")
        generation.message = message

        websocket_handler._update_cw_dashboard(generation)

        # Verify no metrics were added
        mock_metrics.add_metric.assert_not_called()
        mock_metrics.add_dimension.assert_not_called()
