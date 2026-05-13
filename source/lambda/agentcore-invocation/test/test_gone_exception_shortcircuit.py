#!/usr/bin/env python3
# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

import json
import os
from unittest.mock import Mock, patch

import pytest

os.environ["WEBSOCKET_CALLBACK_URL"] = "wss://test.execute-api.us-east-1.amazonaws.com/test"
os.environ["AGENT_RUNTIME_ARN"] = "arn:aws:bedrock-agentcore:us-east-1:123456789012:runtime/test-runtime"
os.environ["_X_AMZN_TRACE_ID"] = "Root=1-12345678-123456789abcdef0;Parent=123456789abcdef0;Sampled=1"
os.environ["USE_CASE_UUID"] = "test-1234-5678"

from handler import skip_records_for_connection, lambda_handler
from utils import WebSocketGoneException


def make_record(message_id, connection_id, input_text="Hello"):
    """Helper to create an SQS record for testing."""
    return {
        "messageId": message_id,
        "body": json.dumps(
            {
                "requestContext": {
                    "connectionId": connection_id,
                    "authorizer": {"UserId": "test-user"},
                },
                "message": {
                    "conversationId": "test-conversation",
                    "inputText": input_text,
                    "userId": "test-user",
                    "messageId": "test-msg-id",
                },
            }
        ),
        "messageAttributes": {
            "connectionId": {"stringValue": connection_id},
            "conversationId": {"stringValue": "test-conversation"},
            "userId": {"stringValue": "test-user"},
        },
    }


@pytest.fixture
def mock_context():
    context = Mock()
    context.get_remaining_time_in_millis.return_value = 30000
    return context


class TestGoneExceptionShortCircuit:

    def test_gone_exception_returns_success(self, mock_context):
        event = {"Records": [make_record("msg-1", "conn-123")]}

        with patch("handler.invoke_agent_core") as mock_invoke:
            mock_invoke.side_effect = WebSocketGoneException("conn-123")

            result = lambda_handler(event, mock_context)

        assert result["batchItemFailures"] == []

    def test_gone_exception_skips_remaining_records_for_same_connection(self, mock_context):
        event = {
            "Records": [
                make_record("msg-1", "conn-123"),
                make_record("msg-2", "conn-123"),
                make_record("msg-3", "conn-456"),
            ]
        }

        with patch("handler.invoke_agent_core") as mock_invoke:
            # First call raises GoneException, third call (different connection) succeeds
            mock_invoke.side_effect = [
                WebSocketGoneException("conn-123"),
                None,  # conn-456 succeeds
            ]

            result = lambda_handler(event, mock_context)

        # No failures - gone records are skipped (success), third record succeeds
        assert result["batchItemFailures"] == []
        # invoke_agent_core called twice: once for conn-123 (raises), once for conn-456 (succeeds)
        assert mock_invoke.call_count == 2

    def test_gone_exception_does_not_send_error_message(self, mock_context):
        event = {"Records": [make_record("msg-1", "conn-123")]}

        with patch("handler.invoke_agent_core") as mock_invoke, patch(
            "handler.send_error_message"
        ) as mock_send_error:
            mock_invoke.side_effect = WebSocketGoneException("conn-123")

            lambda_handler(event, mock_context)

        mock_send_error.assert_not_called()


class TestSkipRecordsForConnection:

    def test_skips_matching_records_and_stops_at_different_connection(self):
        records = [
            {"messageAttributes": {"connectionId": {"stringValue": "conn-1"}}},
            {"messageAttributes": {"connectionId": {"stringValue": "conn-1"}}},
            {"messageAttributes": {"connectionId": {"stringValue": "conn-2"}}},
        ]
        assert skip_records_for_connection(records, 0, "conn-1") == 2

    def test_no_skip_when_connection_does_not_match(self):
        records = [
            {"messageAttributes": {"connectionId": {"stringValue": "conn-2"}}},
        ]
        assert skip_records_for_connection(records, 0, "conn-1") == 0
