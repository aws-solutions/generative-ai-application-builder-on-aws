#!/usr/bin/env python
# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

import json
import os
from unittest.mock import patch

import pytest

from shared.callbacks.websocket_error_handler import WebsocketErrorHandler
from utils.constants import (
    CONVERSATION_ID_EVENT_KEY,
    END_CONVERSATION_TOKEN,
    MESSAGE_ID_EVENT_KEY,
    TRACE_ID_ENV_VAR,
    WEBSOCKET_CALLBACK_URL_ENV_VAR,
)

MOCK_CONNECTION_ID = "fake-connection-id"
MOCK_CONVERSATION_ID = "fake-conversation-id"
MOCK_WEBSOCKET_URL = "wss://fake-url"
MOCK_TRACE_ID = "fake-trace-id"


@pytest.fixture
def error_handler():
    os.environ[WEBSOCKET_CALLBACK_URL_ENV_VAR] = MOCK_WEBSOCKET_URL
    os.environ[TRACE_ID_ENV_VAR] = MOCK_TRACE_ID

    with patch("shared.callbacks.websocket_error_handler.get_service_client") as mock_client:
        handler = WebsocketErrorHandler(
            connection_id=MOCK_CONNECTION_ID, conversation_id=MOCK_CONVERSATION_ID, trace_id=MOCK_TRACE_ID
        )
        yield handler


def test_error_handler_initialization(error_handler):
    assert error_handler.connection_id == MOCK_CONNECTION_ID
    assert error_handler._conversation_id == MOCK_CONVERSATION_ID
    assert error_handler.connection_url == MOCK_WEBSOCKET_URL
    assert error_handler.trace_id == MOCK_TRACE_ID


def test_post_token_to_connection(error_handler):
    test_error = "Test error message"

    error_handler.post_token_to_connection(test_error)

    # Verify error message sent
    error_handler.client.post_to_connection.assert_any_call(
        ConnectionId=MOCK_CONNECTION_ID,
        Data=json.dumps(
            {
                CONVERSATION_ID_EVENT_KEY: MOCK_CONVERSATION_ID,
                MESSAGE_ID_EVENT_KEY: None,
                "errorMessage": test_error,
                "traceId": MOCK_TRACE_ID,
            }
        ),
    )

    # Verify END_CONVERSATION_TOKEN sent
    error_handler.client.post_to_connection.assert_any_call(
        ConnectionId=MOCK_CONNECTION_ID,
        Data=json.dumps(
            {
                CONVERSATION_ID_EVENT_KEY: MOCK_CONVERSATION_ID,
                MESSAGE_ID_EVENT_KEY: None,
                "data": END_CONVERSATION_TOKEN,
            }
        ),
    )

    assert error_handler.client.post_to_connection.call_count == 2


def test_post_token_to_connection_error(error_handler):
    error_handler.client.post_to_connection.side_effect = Exception("Connection error")

    with pytest.raises(Exception) as exc:
        error_handler.post_token_to_connection("test error")

    assert str(exc.value) == "Connection error"


def test_format_response_with_error(error_handler):
    test_error = "Test error"
    expected = {
        CONVERSATION_ID_EVENT_KEY: MOCK_CONVERSATION_ID,
        MESSAGE_ID_EVENT_KEY: None,
        "errorMessage": test_error,
        "traceId": MOCK_TRACE_ID,
    }

    response = error_handler.format_response(errorMessage=test_error, traceId=MOCK_TRACE_ID)
    assert json.loads(response) == expected


def test_format_response_with_data(error_handler):
    test_data = "Test data"
    expected = {CONVERSATION_ID_EVENT_KEY: MOCK_CONVERSATION_ID, MESSAGE_ID_EVENT_KEY: None, "data": test_data}

    response = error_handler.format_response(data=test_data)
    assert json.loads(response) == expected


def test_format_response_with_message_id():
    os.environ[WEBSOCKET_CALLBACK_URL_ENV_VAR] = MOCK_WEBSOCKET_URL
    os.environ[TRACE_ID_ENV_VAR] = MOCK_TRACE_ID

    with patch("shared.callbacks.websocket_error_handler.get_service_client") as mock_client:
        handler = WebsocketErrorHandler(
            connection_id=MOCK_CONNECTION_ID,
            conversation_id=MOCK_CONVERSATION_ID,
            trace_id=MOCK_TRACE_ID,
        )

        test_data = "Test data"
        expected = {CONVERSATION_ID_EVENT_KEY: MOCK_CONVERSATION_ID, MESSAGE_ID_EVENT_KEY: None, "data": test_data}

        response = handler.format_response(data=test_data)
        assert json.loads(response) == expected
