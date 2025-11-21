#!/usr/bin/env python3
# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

import json
from unittest.mock import patch
from uuid import UUID

import pytest
from utils.constants import (
    CONNECTION_ID_KEY,
    CONVERSATION_ID_KEY,
    FILES_KEY,
    INPUT_TEXT_KEY,
    MESSAGE_ID_KEY,
    MESSAGE_KEY,
    REQUEST_CONTEXT_KEY,
    USER_ID_KEY,
)
from utils.event_processor import EventProcessor, EventProcessorError, InvalidEventError, MissingDataError


class TestEventProcessorInitialization:
    """Test EventProcessor initialization and basic functionality."""

    def test_successful_initialization_with_valid_event(self):
        """Test successful initialization with a valid event."""
        event = {
            "body": json.dumps(
                {
                    REQUEST_CONTEXT_KEY: {
                        CONNECTION_ID_KEY: "test-connection-123",
                        "authorizer": {"UserId": "user-456"},
                    },
                    MESSAGE_KEY: {INPUT_TEXT_KEY: "Hello, world!", CONVERSATION_ID_KEY: "conv-789"},
                }
            )
        }

        processor = EventProcessor(event)

        assert processor.event == event
        assert isinstance(processor.event_body, dict)
        assert processor.event_body[REQUEST_CONTEXT_KEY][CONNECTION_ID_KEY] == "test-connection-123"

    def test_initialization_with_empty_body(self):
        """Test initialization with empty body."""
        event = {"body": ""}

        with pytest.raises(InvalidEventError) as exc_info:
            EventProcessor(event)

        assert "Invalid JSON in event body" in str(exc_info.value)

    def test_initialization_with_missing_body(self):
        """Test initialization with missing body key."""
        event = {}

        processor = EventProcessor(event)

        assert processor.event_body == {}

    def test_initialization_with_invalid_json(self):
        """Test initialization with invalid JSON in body."""
        event = {"body": "invalid json {"}

        with pytest.raises(InvalidEventError) as exc_info:
            EventProcessor(event)

        assert "Invalid JSON in event body" in str(exc_info.value)

    def test_initialization_with_non_dict_json(self):
        """Test initialization with valid JSON that's not a dictionary."""
        event = {"body": json.dumps(["not", "a", "dict"])}

        with pytest.raises(InvalidEventError) as exc_info:
            EventProcessor(event)

        assert "Event body must be a JSON object" in str(exc_info.value)

    def test_initialization_with_string_json(self):
        """Test initialization with string JSON."""
        event = {"body": json.dumps("just a string")}

        with pytest.raises(InvalidEventError) as exc_info:
            EventProcessor(event)

        assert "Event body must be a JSON object" in str(exc_info.value)


class TestGetConnectionId:
    """Test the get_connection_id method."""

    def test_get_connection_id_success(self):
        """Test successful retrieval of connection ID."""
        event = {"body": json.dumps({REQUEST_CONTEXT_KEY: {CONNECTION_ID_KEY: "test-connection-123"}})}

        processor = EventProcessor(event)
        connection_id = processor.get_connection_id()

        assert connection_id == "test-connection-123"

    def test_get_connection_id_missing_request_context(self):
        """Test get_connection_id when requestContext is missing."""
        event = {"body": json.dumps({})}

        processor = EventProcessor(event)

        with pytest.raises(InvalidEventError) as exc_info:
            processor.get_connection_id()

        assert "Connection ID not found in event" in str(exc_info.value)

    def test_get_connection_id_missing_connection_id(self):
        """Test get_connection_id when connectionId is missing."""
        event = {"body": json.dumps({REQUEST_CONTEXT_KEY: {}})}

        processor = EventProcessor(event)

        with pytest.raises(InvalidEventError) as exc_info:
            processor.get_connection_id()

        assert "Connection ID not found in event" in str(exc_info.value)

    def test_get_connection_id_with_none_value(self):
        """Test get_connection_id when connectionId is None."""
        event = {"body": json.dumps({REQUEST_CONTEXT_KEY: {CONNECTION_ID_KEY: None}})}

        processor = EventProcessor(event)
        connection_id = processor.get_connection_id()

        assert connection_id is None


class TestGetMessage:
    """Test the get_message method."""

    def test_get_message_success(self):
        """Test successful retrieval of message."""
        message_data = {INPUT_TEXT_KEY: "Hello, world!", CONVERSATION_ID_KEY: "conv-123"}
        event = {"body": json.dumps({MESSAGE_KEY: message_data})}

        processor = EventProcessor(event)
        message = processor.get_message()

        assert message == message_data

    def test_get_message_missing(self):
        """Test get_message when message is missing."""
        event = {"body": json.dumps({})}

        processor = EventProcessor(event)

        with pytest.raises(MissingDataError) as exc_info:
            processor.get_message()

        assert "Message is required but not found in event body" in str(exc_info.value)

    def test_get_message_empty(self):
        """Test get_message when message is empty."""
        event = {"body": json.dumps({MESSAGE_KEY: {}})}

        processor = EventProcessor(event)

        # Empty dict {} is falsy in Python, so this should raise an error
        with pytest.raises(MissingDataError) as exc_info:
            processor.get_message()

        assert "Message is required but not found in event body" in str(exc_info.value)

    def test_get_message_none(self):
        """Test get_message when message is None."""
        event = {"body": json.dumps({MESSAGE_KEY: None})}

        processor = EventProcessor(event)

        with pytest.raises(MissingDataError) as exc_info:
            processor.get_message()

        assert "Message is required but not found in event body" in str(exc_info.value)


class TestGetInputText:
    """Test the get_input_text method."""

    def test_get_input_text_success(self):
        """Test successful retrieval of input text."""
        event = {"body": json.dumps({MESSAGE_KEY: {INPUT_TEXT_KEY: "Hello, how are you?"}})}

        processor = EventProcessor(event)
        input_text = processor.get_input_text()

        assert input_text == "Hello, how are you?"

    def test_get_input_text_missing(self):
        """Test get_input_text when inputText is missing."""
        event = {"body": json.dumps({MESSAGE_KEY: {"someOtherField": "value"}})}

        processor = EventProcessor(event)
        input_text = processor.get_input_text()

        assert input_text == ""

    def test_get_input_text_empty_string(self):
        """Test get_input_text when inputText is empty string."""
        event = {"body": json.dumps({MESSAGE_KEY: {INPUT_TEXT_KEY: ""}})}

        processor = EventProcessor(event)
        input_text = processor.get_input_text()

        assert input_text == ""

    def test_get_input_text_none(self):
        """Test get_input_text when inputText is None."""
        event = {"body": json.dumps({MESSAGE_KEY: {INPUT_TEXT_KEY: None}})}

        processor = EventProcessor(event)
        input_text = processor.get_input_text()

        # The get() method with default "" should return "" when value is None
        assert input_text == ""


class TestGetConversationId:
    """Test the get_conversation_id method."""

    def test_get_conversation_id_success(self):
        """Test successful retrieval of conversation ID."""
        event = {"body": json.dumps({MESSAGE_KEY: {CONVERSATION_ID_KEY: "conv-123-456"}})}

        processor = EventProcessor(event)
        conversation_id = processor.get_conversation_id()

        assert conversation_id == "conv-123-456"

    def test_get_conversation_id_missing(self):
        """Test get_conversation_id when conversationId is missing."""
        event = {"body": json.dumps({MESSAGE_KEY: {"someOtherField": "value"}})}

        processor = EventProcessor(event)
        conversation_id = processor.get_conversation_id()

        # Should generate a new UUID
        assert conversation_id != ""
        assert len(conversation_id) == 36  # UUID4 length
        # Verify it's a valid UUID
        UUID(conversation_id)

    def test_get_conversation_id_empty_string(self):
        """Test get_conversation_id when conversationId is empty string."""
        event = {"body": json.dumps({MESSAGE_KEY: {CONVERSATION_ID_KEY: ""}})}

        processor = EventProcessor(event)
        conversation_id = processor.get_conversation_id()

        # Should generate a new UUID
        assert conversation_id != ""
        assert len(conversation_id) == 36
        UUID(conversation_id)

    def test_get_conversation_id_whitespace_only(self):
        """Test get_conversation_id when conversationId is whitespace only."""
        event = {"body": json.dumps({MESSAGE_KEY: {CONVERSATION_ID_KEY: "   "}})}

        processor = EventProcessor(event)
        conversation_id = processor.get_conversation_id()

        # Should generate a new UUID
        assert conversation_id != "   "
        assert len(conversation_id) == 36
        UUID(conversation_id)

    def test_get_conversation_id_none(self):
        """Test get_conversation_id when conversationId is None."""
        event = {"body": json.dumps({MESSAGE_KEY: {CONVERSATION_ID_KEY: None}})}

        processor = EventProcessor(event)
        conversation_id = processor.get_conversation_id()

        # Should generate a new UUID when None
        assert conversation_id != ""
        assert len(conversation_id) == 36
        UUID(conversation_id)


class TestGetUserId:
    """Test the get_user_id method."""

    def test_get_user_id_success(self):
        """Test successful retrieval of user ID."""
        event = {"body": json.dumps({REQUEST_CONTEXT_KEY: {"authorizer": {"UserId": "user-123-456"}}})}

        processor = EventProcessor(event)
        user_id = processor.get_user_id()

        assert user_id == "user-123-456"

    def test_get_user_id_missing_request_context(self):
        """Test get_user_id when requestContext is missing."""
        event = {"body": json.dumps({})}

        processor = EventProcessor(event)

        with pytest.raises(InvalidEventError) as exc_info:
            processor.get_user_id()

        assert "User ID not found in event" in str(exc_info.value)

    def test_get_user_id_missing_authorizer(self):
        """Test get_user_id when authorizer is missing."""
        event = {"body": json.dumps({REQUEST_CONTEXT_KEY: {}})}

        processor = EventProcessor(event)

        with pytest.raises(InvalidEventError) as exc_info:
            processor.get_user_id()

        assert "User ID not found in event" in str(exc_info.value)

    def test_get_user_id_missing_user_id(self):
        """Test get_user_id when UserId is missing."""
        event = {"body": json.dumps({REQUEST_CONTEXT_KEY: {"authorizer": {}}})}

        processor = EventProcessor(event)

        with pytest.raises(InvalidEventError) as exc_info:
            processor.get_user_id()

        assert "User ID not found in event" in str(exc_info.value)

    def test_get_user_id_none(self):
        """Test get_user_id when UserId is None."""
        event = {"body": json.dumps({REQUEST_CONTEXT_KEY: {"authorizer": {"UserId": None}}})}

        processor = EventProcessor(event)

        with pytest.raises(InvalidEventError) as exc_info:
            processor.get_user_id()

        assert "User ID not found in event" in str(exc_info.value)


class TestGetMessageId:
    """Test the get_message_id method."""

    def test_get_message_id_success(self):
        """Test successful retrieval of message ID from WebSocket payload."""
        test_message_id = "websocket-msg-12345"
        event = {"body": json.dumps({MESSAGE_KEY: {MESSAGE_ID_KEY: test_message_id}})}

        processor = EventProcessor(event)
        message_id = processor.get_message_id()

        assert message_id == test_message_id

    def test_get_message_id_missing(self):
        """Test get_message_id when messageId is missing from WebSocket payload generates new UUID"""
        event = {"body": json.dumps({MESSAGE_KEY: {INPUT_TEXT_KEY: "Hello"}})}

        processor = EventProcessor(event)
        message_id = processor.get_message_id()

        assert message_id != ""
        assert len(message_id) == 36  # UUID4 length
        # Verify it's a valid UUID
        UUID(message_id)

    def test_get_message_id_empty_string(self):
        """Test get_message_id when messageId is empty string."""
        event = {"body": json.dumps({MESSAGE_KEY: {MESSAGE_ID_KEY: ""}})}

        processor = EventProcessor(event)
        message_id = processor.get_message_id()

        # Should generate a new UUID
        assert message_id != ""
        assert len(message_id) == 36
        UUID(message_id)

    def test_get_message_id_none_value(self):
        """Test get_message_id when messageId is None."""
        event = {"body": json.dumps({MESSAGE_KEY: {MESSAGE_ID_KEY: None}})}

        processor = EventProcessor(event)
        message_id = processor.get_message_id()

        # Should generate a new UUID when None
        assert message_id != ""
        assert len(message_id) == 36
        UUID(message_id)

    def test_get_message_id_generates_unique_ids(self):
        """Test that get_message_id generates unique IDs when called multiple times."""
        event = {"body": json.dumps({MESSAGE_KEY: {INPUT_TEXT_KEY: "Hello"}})}

        processor = EventProcessor(event)
        message_id1 = processor.get_message_id()
        message_id2 = processor.get_message_id()

        assert message_id1 != message_id2
        UUID(message_id1)
        UUID(message_id2)


class TestGetFiles:
    """Test the get_files method."""

    def test_get_files_success(self):
        """Test successful retrieval of files from message."""
        test_files = [
            {"fileReference": "file-123", "fileName": "document.pdf"},
            {"fileReference": "file-456", "fileName": "image.jpg"},
        ]
        event = {"body": json.dumps({MESSAGE_KEY: {"files": test_files}})}

        processor = EventProcessor(event)
        files = processor.get_files()

        assert files == test_files

    def test_get_files_missing(self):
        """Test get_files when files key is missing."""
        event = {"body": json.dumps({MESSAGE_KEY: {INPUT_TEXT_KEY: "Hello"}})}

        processor = EventProcessor(event)
        files = processor.get_files()

        assert files == []

    def test_get_files_empty_list(self):
        """Test get_files when files is an empty list."""
        event = {"body": json.dumps({MESSAGE_KEY: {"files": []}})}

        processor = EventProcessor(event)
        files = processor.get_files()

        assert files == []

    def test_get_files_none_value(self):
        """Test get_files when files is None."""
        event = {"body": json.dumps({MESSAGE_KEY: {"files": None}})}

        processor = EventProcessor(event)
        files = processor.get_files()

        assert files is None


class TestProcessMethod:
    """Test the process method."""

    def test_process_success_with_complete_event(self):
        """Test successful processing with complete event data."""
        event = {
            "body": json.dumps(
                {
                    REQUEST_CONTEXT_KEY: {CONNECTION_ID_KEY: "conn-123", "authorizer": {"UserId": "user-456"}},
                    MESSAGE_KEY: {INPUT_TEXT_KEY: "Hello, world!", CONVERSATION_ID_KEY: "conv-789"},
                }
            )
        }

        processor = EventProcessor(event)
        result = processor.process()

        assert result[CONNECTION_ID_KEY] == "conn-123"
        assert result[USER_ID_KEY] == "user-456"
        assert result[INPUT_TEXT_KEY] == "Hello, world!"
        assert result[CONVERSATION_ID_KEY] == "conv-789"
        assert MESSAGE_ID_KEY in result
        assert FILES_KEY in result
        assert result[FILES_KEY] == []  # Empty files list when not provided
        UUID(result[MESSAGE_ID_KEY])  # Verify it's a valid UUID

    def test_process_success_with_minimal_event(self):
        """Test successful processing with minimal event data."""
        event = {
            "body": json.dumps(
                {
                    REQUEST_CONTEXT_KEY: {CONNECTION_ID_KEY: "conn-123", "authorizer": {"UserId": "user-456"}},
                    MESSAGE_KEY: {"someField": "value"},  # Non-empty dict so get_message() works
                }
            )
        }

        processor = EventProcessor(event)
        result = processor.process()

        assert result[CONNECTION_ID_KEY] == "conn-123"
        assert result[USER_ID_KEY] == "user-456"
        assert result[INPUT_TEXT_KEY] == ""
        assert len(result[CONVERSATION_ID_KEY]) == 36  # Generated UUID
        assert MESSAGE_ID_KEY in result
        assert FILES_KEY in result
        assert result[FILES_KEY] == []  # Empty files list when not provided
        UUID(result[CONVERSATION_ID_KEY])
        UUID(result[MESSAGE_ID_KEY])

    def test_process_success_with_files(self):
        """Test successful processing with files included."""
        test_files = [
            {"fileReference": "file-123", "fileName": "document.pdf"},
            {"fileReference": "file-456", "fileName": "image.jpg"},
        ]
        test_message_id = "msg-with-files-123"
        event = {
            "body": json.dumps(
                {
                    REQUEST_CONTEXT_KEY: {CONNECTION_ID_KEY: "conn-123", "authorizer": {"UserId": "user-456"}},
                    MESSAGE_KEY: {
                        INPUT_TEXT_KEY: "Analyze these files",
                        CONVERSATION_ID_KEY: "conv-789",
                        MESSAGE_ID_KEY: test_message_id,
                        FILES_KEY: test_files,
                    },
                }
            )
        }

        processor = EventProcessor(event)
        result = processor.process()

        assert result[CONNECTION_ID_KEY] == "conn-123"
        assert result[USER_ID_KEY] == "user-456"
        assert result[INPUT_TEXT_KEY] == "Analyze these files"
        assert result[CONVERSATION_ID_KEY] == "conv-789"
        assert result[MESSAGE_ID_KEY] == test_message_id
        assert result[FILES_KEY] == test_files

    def test_process_missing_connection_id(self):
        """Test process method when connection ID is missing."""
        event = {"body": json.dumps({REQUEST_CONTEXT_KEY: {"authorizer": {"UserId": "user-456"}}, MESSAGE_KEY: {}})}

        processor = EventProcessor(event)

        with pytest.raises(InvalidEventError) as exc_info:
            processor.process()

        assert "Connection ID not found in event" in str(exc_info.value)

    def test_process_missing_user_id(self):
        """Test process method when user ID is missing."""
        event = {
            "body": json.dumps(
                {REQUEST_CONTEXT_KEY: {CONNECTION_ID_KEY: "conn-123"}, MESSAGE_KEY: {"someField": "value"}}
            )
        }

        processor = EventProcessor(event)

        with pytest.raises(InvalidEventError) as exc_info:
            processor.process()

        assert "User ID not found in event" in str(exc_info.value)

    def test_process_missing_message(self):
        """Test process method when message is missing."""
        event = {
            "body": json.dumps(
                {REQUEST_CONTEXT_KEY: {CONNECTION_ID_KEY: "conn-123", "authorizer": {"UserId": "user-456"}}}
            )
        }

        processor = EventProcessor(event)

        with pytest.raises(MissingDataError) as exc_info:
            processor.process()

        assert "Message is required but not found in event body" in str(exc_info.value)

    @patch("utils.event_processor.logger")
    def test_process_logs_errors(self, mock_logger):
        """Test that process method logs errors."""
        event = {"body": json.dumps({})}

        processor = EventProcessor(event)

        with pytest.raises(InvalidEventError):
            processor.process()

        mock_logger.error.assert_called()
        assert "Error processing event" in mock_logger.error.call_args[0][0]


class TestEventProcessorIntegration:
    """Integration tests for EventProcessor."""

    def test_complete_websocket_event_processing(self):
        """Test processing a complete WebSocket event."""
        # Simulate a real WebSocket event structure
        event = {
            "body": json.dumps(
                {
                    REQUEST_CONTEXT_KEY: {
                        CONNECTION_ID_KEY: "L0SM9cOFvHcCIhw=",
                        "routeKey": "sendMessage",
                        "authorizer": {"UserId": "test-user-12345", "principalId": "test-user-12345"},
                        "requestId": "L0SM9dGrPHcFbGA=",
                        "apiId": "1234567890",
                    },
                    MESSAGE_KEY: {
                        INPUT_TEXT_KEY: "What is the weather like today?",
                        CONVERSATION_ID_KEY: "conv-abcd-1234-efgh-5678",
                        "timestamp": "2023-12-25T10:30:45Z",
                    },
                }
            )
        }

        processor = EventProcessor(event)
        result = processor.process()

        # Verify all expected fields are present and correct
        assert result[CONNECTION_ID_KEY] == "L0SM9cOFvHcCIhw="
        assert result[USER_ID_KEY] == "test-user-12345"
        assert result[INPUT_TEXT_KEY] == "What is the weather like today?"
        assert result[CONVERSATION_ID_KEY] == "conv-abcd-1234-efgh-5678"
        assert MESSAGE_ID_KEY in result
        assert FILES_KEY in result
        assert result[FILES_KEY] == []  # Empty files list when not provided

        # Verify message ID is a valid UUID
        UUID(result[MESSAGE_ID_KEY])

    def test_event_with_special_characters(self):
        """Test processing event with special characters in text."""
        event = {
            "body": json.dumps(
                {
                    REQUEST_CONTEXT_KEY: {CONNECTION_ID_KEY: "conn-123", "authorizer": {"UserId": "user-456"}},
                    MESSAGE_KEY: {
                        INPUT_TEXT_KEY: "Hello! How are you? 😊 I'm testing special chars: @#$%^&*()",
                        CONVERSATION_ID_KEY: "conv-special-chars-123",
                    },
                }
            )
        }

        processor = EventProcessor(event)
        result = processor.process()

        assert result[INPUT_TEXT_KEY] == "Hello! How are you? 😊 I'm testing special chars: @#$%^&*()"
        assert result[CONVERSATION_ID_KEY] == "conv-special-chars-123"

    def test_event_with_unicode_characters(self):
        """Test processing event with Unicode characters."""
        event = {
            "body": json.dumps(
                {
                    REQUEST_CONTEXT_KEY: {CONNECTION_ID_KEY: "conn-unicode", "authorizer": {"UserId": "user-unicode"}},
                    MESSAGE_KEY: {
                        INPUT_TEXT_KEY: "こんにちは世界! Здравствуй мир! مرحبا بالعالم!",
                        CONVERSATION_ID_KEY: "conv-unicode-test",
                    },
                },
                ensure_ascii=False,
            )
        }

        processor = EventProcessor(event)
        result = processor.process()

        assert result[INPUT_TEXT_KEY] == "こんにちは世界! Здравствуй мир! مرحبا بالعالم!"
        assert result[CONVERSATION_ID_KEY] == "conv-unicode-test"


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
