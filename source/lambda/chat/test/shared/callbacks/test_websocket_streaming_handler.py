#!/usr/bin/env python
# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

import json
import os
from unittest.mock import Mock, patch, call

import pytest
from aws_lambda_powertools.metrics import MetricUnit
from langchain_core.messages.ai import AIMessageChunk
from shared.callbacks.websocket_streaming_handler import WebsocketStreamingCallbackHandler
from utils.constants import (
    CONTEXT_KEY,
    CONVERSATION_ID_EVENT_KEY,
    MESSAGE_ID_EVENT_KEY,
    OUTPUT_KEY,
    PAYLOAD_DATA_KEY,
    PAYLOAD_SOURCE_DOCUMENT_KEY,
    REPHRASED_QUERY_KEY,
    SOURCE_DOCUMENTS_RECEIVED_KEY,
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

    with patch("shared.callbacks.websocket_streaming_handler.get_service_client") as mock_client:
        handler = WebsocketStreamingCallbackHandler(
            connection_id=MOCK_CONNECTION_ID,
            conversation_id=MOCK_CONVERSATION_ID,
            message_id=MOCK_MESSAGE_ID,
            source_docs_formatter=lambda x: x,
            is_streaming=True,
            rag_enabled=True,
            return_source_docs=True,
        )
        yield handler


def test_handler_initialization(websocket_handler):
    assert websocket_handler.connection_id == MOCK_CONNECTION_ID
    assert websocket_handler.conversation_id == MOCK_CONVERSATION_ID
    assert websocket_handler.message_id == MOCK_MESSAGE_ID
    assert websocket_handler.connection_url == MOCK_WEBSOCKET_URL
    assert websocket_handler.is_streaming == True
    assert websocket_handler.rag_enabled == True
    assert websocket_handler.return_source_docs == True


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


def test_on_llm_new_token(websocket_handler):
    test_token = [{"type": "text", "text": "test message"}]

    websocket_handler.on_llm_new_token(test_token)

    websocket_handler.client.post_to_connection.assert_called_once_with(
        ConnectionId=MOCK_CONNECTION_ID,
        Data=json.dumps({
            PAYLOAD_DATA_KEY: "test message", 
            CONVERSATION_ID_EVENT_KEY: MOCK_CONVERSATION_ID,
            MESSAGE_ID_EVENT_KEY: MOCK_MESSAGE_ID
        }),
    )
    assert websocket_handler.has_streamed == True


def test_on_llm_new_token_non_text(websocket_handler):
    test_token = [{"type": "other", "data": "test"}]

    websocket_handler.on_llm_new_token(test_token)

    websocket_handler.client.post_to_connection.assert_not_called()
    assert websocket_handler.has_streamed == False


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


def test_on_chain_end_with_no_docs(websocket_handler):
    websocket_handler._response_if_no_docs_found = "No docs found"
    outputs = {OUTPUT_KEY: "test response", CONTEXT_KEY: []}

    with patch.object(websocket_handler, "post_token_to_connection") as mocked_post:
        websocket_handler.on_chain_end(outputs, run_id=None)  
        mocked_post.assert_called_once_with("No docs found", PAYLOAD_DATA_KEY)


def test_on_chain_end_with_docs(websocket_handler):
    outputs = {
        OUTPUT_KEY: "test response",
        CONTEXT_KEY: ["doc1"],
        SOURCE_DOCUMENTS_RECEIVED_KEY: [{"content": "doc1"}],
        REPHRASED_QUERY_KEY: "rephrased question",
    }

    websocket_handler.has_streamed = False
    websocket_handler.has_streamed_references = False
    websocket_handler.streamed_rephrase_query = False
    websocket_handler.return_source_docs = True
    websocket_handler._response_if_no_docs_found = "irrelevant"

    with patch.object(websocket_handler, "post_token_to_connection") as mocked_post, patch.object(
        websocket_handler, "send_references"
    ) as mocked_send_refs:
        websocket_handler.on_chain_end(outputs, run_id=None)

        mocked_post.assert_has_calls(
            [
                call("test response", PAYLOAD_DATA_KEY),
                call("rephrased question", REPHRASED_QUERY_KEY),
            ],
            any_order=False,
        )

        mocked_send_refs.assert_called_once_with([{"content": "doc1"}])
        assert websocket_handler.has_streamed_references == True


@pytest.mark.parametrize(
    "stop_reason,input_tokens,output_tokens,total_tokens,expected_stop_reason_type",
    [
        ("max_tokens", 100, 50, 150, "MaxTokens"),
        ("context_limit", 10, 20, 30, "ContextLimit"),
        ("", 300, 400, 700, None),
        (None, 123, 456, 579, None),
    ],
)
def test_update_cw_dashboard(
    websocket_handler,
    stop_reason,
    input_tokens,
    output_tokens,
    total_tokens,
    expected_stop_reason_type,
):
    with patch("shared.callbacks.websocket_streaming_handler.metrics") as mock_metrics:
        message = Mock()
        message.response_metadata = {"stopReason": stop_reason} if stop_reason is not None else {}
        message.usage_metadata = {
            "input_tokens": input_tokens,
            "output_tokens": output_tokens,
            "total_tokens": total_tokens,
        }

        chunk = AIMessageChunk(content="test content")
        chunk.message = message

        websocket_handler._update_cw_dashboard(chunk)

        expected_metric_calls = []
        if input_tokens:
            expected_metric_calls.append(
                call(name=CloudWatchMetrics.LLM_INPUT_TOKEN_COUNT.value, unit=MetricUnit.Count, value=input_tokens)
            )
        if output_tokens:
            expected_metric_calls.append(
                call(name=CloudWatchMetrics.LLM_OUTPUT_TOKEN_COUNT.value, unit=MetricUnit.Count, value=output_tokens)
            )
        if total_tokens:
            expected_metric_calls.append(
                call(name=CloudWatchMetrics.LLM_TOTAL_TOKEN_COUNT.value, unit=MetricUnit.Count, value=total_tokens)
            )

        mock_metrics.add_metric.assert_has_calls(expected_metric_calls, any_order=True)

        if expected_stop_reason_type:
            mock_metrics.add_dimension.assert_called_once_with(name="StopReasonType", value=expected_stop_reason_type)
            mock_metrics.add_metric.assert_any_call(
                name=CloudWatchMetrics.LLM_STOP_REASON.value, unit=MetricUnit.Count, value=1
            )
        else:
            mock_metrics.add_dimension.assert_not_called()
            calls = [
                c
                for c in mock_metrics.add_metric.call_args_list
                if c[1].get("name") == CloudWatchMetrics.LLM_STOP_REASON.value
            ]
            assert not calls  # Ensure stop reason metric was not added

        assert mock_metrics.flush_metrics.call_count == 2


def test_update_cw_dashboard_without_metadata(websocket_handler):
    with patch("shared.callbacks.websocket_streaming_handler.metrics") as mock_metrics:
        message = Mock()
        message.response_metadata = {}
        message.usage_metadata = {}
        chunk = AIMessageChunk(content="test content")
        chunk.message = message

        websocket_handler._update_cw_dashboard(chunk)

        mock_metrics.add_metric.assert_not_called()
        mock_metrics.add_dimension.assert_not_called()
