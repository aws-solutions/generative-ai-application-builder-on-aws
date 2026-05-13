#!/usr/bin/env python
# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

import json
import os
from unittest.mock import MagicMock, Mock, patch

import pytest
from aws_lambda_powertools.utilities.typing import LambdaContext

from handlers.use_case_handler import UseCaseHandler
from shared.callbacks.websocket_gone_exception import WebSocketGoneException
from utils.constants import (
    MESSAGE_KEY,
    REQUEST_CONTEXT_KEY,
    TRACE_ID_ENV_VAR,
    WEBSOCKET_CALLBACK_URL_ENV_VAR,
)


@pytest.fixture
def lambda_context():
    context = MagicMock(spec=LambdaContext)
    context.get_remaining_time_in_millis.return_value = 30000
    return context


@pytest.fixture
def sqs_event():
    return {
        "Records": [
            {
                "messageId": "msg-1",
                "body": json.dumps(
                    {
                        REQUEST_CONTEXT_KEY: {
                            "connectionId": "conn-123",
                            "authorizer": {"UserId": "test-user"},
                        },
                        MESSAGE_KEY: {
                            "question": "Hello",
                        },
                    }
                ),
                "messageAttributes": {
                    "connectionId": {"stringValue": "conn-123", "dataType": "String"},
                },
            }
        ]
    }


@pytest.fixture
def multi_record_event():
    """Event with multiple records for the same connection, plus one for a different connection."""
    records = [
        {
            "messageId": "msg-1",
            "body": json.dumps(
                {
                    REQUEST_CONTEXT_KEY: {
                        "connectionId": "conn-123",
                        "authorizer": {"UserId": "test-user"},
                    },
                    MESSAGE_KEY: {"question": "Hello"},
                }
            ),
            "messageAttributes": {
                "connectionId": {"stringValue": "conn-123", "dataType": "String"},
            },
        },
        {
            "messageId": "msg-2",
            "body": json.dumps(
                {
                    REQUEST_CONTEXT_KEY: {
                        "connectionId": "conn-123",
                        "authorizer": {"UserId": "test-user"},
                    },
                    MESSAGE_KEY: {"question": "Follow up"},
                }
            ),
            "messageAttributes": {
                "connectionId": {"stringValue": "conn-123", "dataType": "String"},
            },
        },
        {
            "messageId": "msg-3",
            "body": json.dumps(
                {
                    REQUEST_CONTEXT_KEY: {
                        "connectionId": "conn-456",
                        "authorizer": {"UserId": "test-user-2"},
                    },
                    MESSAGE_KEY: {"question": "Different user"},
                }
            ),
            "messageAttributes": {
                "connectionId": {"stringValue": "conn-456", "dataType": "String"},
            },
        },
    ]
    return {"Records": records}


class TestUseCaseHandlerGoneException:

    @patch.dict(os.environ, {TRACE_ID_ENV_VAR: "test-trace-id", WEBSOCKET_CALLBACK_URL_ENV_VAR: "wss://test"})
    def test_gone_exception_returns_success(self, sqs_event, lambda_context):
        mock_llm_client_type = Mock()
        mock_llm_client_instance = mock_llm_client_type.return_value
        mock_llm_client_instance.get_event_conversation_id.return_value = "conv-1"
        mock_llm_client_instance.check_env.return_value = None
        mock_llm_client_instance.check_event.return_value = {MESSAGE_KEY: {"question": "Hello"}}
        mock_llm_client_instance.use_case_config = {"LlmParams": {"RAGEnabled": False}}

        mock_model = Mock()
        mock_model.generate.side_effect = WebSocketGoneException("conn-123")
        mock_llm_client_instance.get_model.return_value = mock_model

        handler = UseCaseHandler(mock_llm_client_type)
        result = handler.handle_event(sqs_event, lambda_context)

        # Should return success - no batch item failures
        assert result == {"batchItemFailures": []}

    @patch.dict(os.environ, {TRACE_ID_ENV_VAR: "test-trace-id", WEBSOCKET_CALLBACK_URL_ENV_VAR: "wss://test"})
    def test_gone_exception_skips_remaining_records_for_same_connection(self, multi_record_event, lambda_context):
        mock_llm_client_type = Mock()
        mock_llm_client_instance = mock_llm_client_type.return_value
        mock_llm_client_instance.get_event_conversation_id.return_value = "conv-1"
        mock_llm_client_instance.check_env.return_value = None
        mock_llm_client_instance.check_event.return_value = {MESSAGE_KEY: {"question": "Hello"}}
        mock_llm_client_instance.use_case_config = {"LlmParams": {"RAGEnabled": False}}
        mock_llm_client_instance.builder = Mock()
        mock_llm_client_instance.builder.is_streaming = False
        mock_llm_client_instance.builder.callbacks = []
        mock_llm_client_instance.builder.message_id = "test-msg-id"

        mock_model = Mock()
        # First call raises GoneException, third call (different connection) succeeds
        mock_model.generate.side_effect = [
            WebSocketGoneException("conn-123"),
            "Success response",
        ]
        mock_llm_client_instance.get_model.return_value = mock_model
        mock_llm_client_instance.rag_enabled = False

        handler = UseCaseHandler(mock_llm_client_type)

        with patch("handlers.use_case_handler.WebsocketHandler"):
            result = handler.handle_event(multi_record_event, lambda_context)

        # Should return success - no batch item failures
        # Records msg-1 and msg-2 (same conn-123) are skipped, msg-3 (conn-456) succeeds
        assert result == {"batchItemFailures": []}
        # generate called twice: once for conn-123 (raises), once for conn-456 (succeeds)
        assert mock_model.generate.call_count == 2



