#!/usr/bin/env python3
# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

import json
import os
from unittest.mock import MagicMock, Mock, patch

import pytest
from botocore.exceptions import ClientError

# Set up environment variables before importing
os.environ["WEBSOCKET_CALLBACK_URL"] = "wss://test.execute-api.us-east-1.amazonaws.com/test"
os.environ["AGENT_RUNTIME_ARN"] = "arn:aws:bedrock-agentcore:us-east-1:123456789012:runtime/test-runtime"
os.environ["_X_AMZN_TRACE_ID"] = "Root=1-12345678-123456789abcdef0;Parent=123456789abcdef0;Sampled=1"

from handler import (
    format_response,
    get_agentcore_client,
    invoke_agent_core,
    lambda_handler,
    send_error_message,
    send_websocket_message,
)
from utils.agentcore_client import AgentCoreClient, AgentCoreConfigurationError, AgentCoreInvocationError


class TestLambdaHandlerIntegration:
    """Test lambda handler integration with AgentCore client."""

    def setup_method(self):
        """Set up test fixtures."""
        self.sample_event = {
            "Records": [
                {
                    "messageId": "test-message-id-1",
                    "body": json.dumps(
                        {
                            "requestContext": {
                                "connectionId": "test-connection-1",
                                "authorizer": {"UserId": "test-user-1"},
                            },
                            "message": {
                                "conversationId": "test-conversation-1",
                                "inputText": "Hello, how are you?",
                                "userId": "test-user-1",
                                "messageId": "test-msg-1",
                            },
                        }
                    ),
                    "messageAttributes": {
                        "connectionId": {"stringValue": "test-connection-1"},
                        "conversationId": {"stringValue": "test-conversation-1"},
                        "userId": {"stringValue": "test-user-1"},
                    },
                }
            ]
        }

        self.mock_context = Mock()
        self.mock_context.get_remaining_time_in_millis.return_value = 30000

    def test_successful_lambda_handler_execution(self):
        """Test successful lambda handler execution with AgentCore integration."""
        with patch("handler.get_agentcore_client") as mock_get_client, patch(
            "handler.send_websocket_message"
        ) as mock_send_ws:

            # Mock successful AgentCore client
            mock_client = Mock()
            mock_client.invoke_agent.return_value = [
                {"text": "Hello! I'm doing well, thank you for asking.", "type": "content"},
                {"type": "completion"},
            ]
            mock_get_client.return_value = mock_client

            # Execute lambda handler
            result = lambda_handler(self.sample_event, self.mock_context)

            # Verify successful execution
            assert "batchItemFailures" in result
            assert len(result["batchItemFailures"]) == 0

            mock_client.invoke_agent.assert_called_once()
            call_args = mock_client.invoke_agent.call_args
            assert call_args[1]["input_text"] == "Hello, how are you?"
            assert call_args[1]["conversation_id"] == "test-conversation-1"
            assert call_args[1]["user_id"] == "test-user-1"
            assert "message_id" in call_args[1]  # Message ID should be present
            assert "files" in call_args[1]  # Files should be present (empty list)

            # Verify WebSocket messages were sent
            assert mock_send_ws.call_count >= 2  # Content + END token

    def test_lambda_handler_with_multiple_records(self):
        """Test lambda handler with multiple SQS records."""
        multi_record_event = {
            "Records": [
                {
                    "messageId": "test-message-id-1",
                    "body": json.dumps(
                        {
                            "requestContext": {
                                "connectionId": "test-connection-1",
                                "authorizer": {"UserId": "test-user-1"},
                            },
                            "message": {
                                "conversationId": "test-conversation-1",
                                "inputText": "First message",
                                "userId": "test-user-1",
                                "messageId": "test-msg-1",
                            },
                        }
                    ),
                    "messageAttributes": {
                        "connectionId": {"stringValue": "test-connection-1"},
                        "conversationId": {"stringValue": "test-conversation-1"},
                        "userId": {"stringValue": "test-user-1"},
                    },
                },
                {
                    "messageId": "test-message-id-2",
                    "body": json.dumps(
                        {
                            "requestContext": {
                                "connectionId": "test-connection-2",
                                "authorizer": {"UserId": "test-user-2"},
                            },
                            "message": {
                                "conversationId": "test-conversation-2",
                                "inputText": "Second message",
                                "userId": "test-user-2",
                                "messageId": "test-msg-2",
                            },
                        }
                    ),
                    "messageAttributes": {
                        "connectionId": {"stringValue": "test-connection-2"},
                        "conversationId": {"stringValue": "test-conversation-2"},
                        "userId": {"stringValue": "test-user-2"},
                    },
                },
            ]
        }

        with patch("handler.get_agentcore_client") as mock_get_client, patch(
            "handler.send_websocket_message"
        ) as mock_send_ws:

            # Mock successful AgentCore client
            mock_client = Mock()
            mock_client.invoke_agent.return_value = [
                {"text": "Response", "type": "content"},
                {"type": "completion"},
            ]
            mock_get_client.return_value = mock_client

            # Execute lambda handler
            result = lambda_handler(multi_record_event, self.mock_context)

            # Verify both records were processed
            assert len(result["batchItemFailures"]) == 0
            assert mock_client.invoke_agent.call_count == 2

    def test_lambda_handler_timeout_handling(self):
        """Test lambda handler timeout handling."""
        # Set remaining time to be below threshold
        self.mock_context.get_remaining_time_in_millis.return_value = 10000

        with patch("handler.get_agentcore_client") as mock_get_client:
            mock_client = Mock()
            mock_get_client.return_value = mock_client

            # Execute lambda handler
            result = lambda_handler(self.sample_event, self.mock_context)

            # Verify record was added to batch failures due to timeout
            assert len(result["batchItemFailures"]) == 1
            assert result["batchItemFailures"][0]["itemIdentifier"] == "test-message-id-1"

            # Verify AgentCore was not called due to timeout
            mock_client.invoke_agent.assert_not_called()

    def test_lambda_handler_error_propagation(self):
        """Test lambda handler error handling and batch failure response."""
        with patch("handler.get_agentcore_client") as mock_get_client, patch(
            "handler.send_error_message"
        ) as mock_send_error:

            # Mock AgentCore client to raise error
            mock_client = Mock()
            mock_client.invoke_agent.side_effect = AgentCoreInvocationError("Runtime error")
            mock_get_client.return_value = mock_client

            # Execute lambda handler
            result = lambda_handler(self.sample_event, self.mock_context)

            # Verify error was handled
            mock_send_error.assert_called_once()

            # Verify batch failure response
            assert len(result["batchItemFailures"]) == 1
            assert result["batchItemFailures"][0]["itemIdentifier"] == "test-message-id-1"

    def test_lambda_handler_connection_specific_failure(self):
        """Test lambda handler handling of connection-specific failures."""
        # Create event with multiple records for same connection
        same_connection_event = {
            "Records": [
                {
                    "messageId": "test-message-id-1",
                    "body": json.dumps(
                        {
                            "requestContext": {
                                "connectionId": "test-connection-1",
                                "authorizer": {"UserId": "test-user-1"},
                            },
                            "message": {
                                "conversationId": "test-conversation-1",
                                "inputText": "First message",
                                "userId": "test-user-1",
                                "messageId": "test-msg-1",
                            },
                        }
                    ),
                    "messageAttributes": {
                        "connectionId": {"stringValue": "test-connection-1"},
                        "conversationId": {"stringValue": "test-conversation-1"},
                        "userId": {"stringValue": "test-user-1"},
                    },
                },
                {
                    "messageId": "test-message-id-2",
                    "body": json.dumps(
                        {
                            "requestContext": {
                                "connectionId": "test-connection-1",
                                "authorizer": {"UserId": "test-user-1"},
                            },
                            "message": {
                                "conversationId": "test-conversation-2",
                                "inputText": "Second message",
                                "userId": "test-user-1",
                                "messageId": "test-msg-2",
                            },
                        }
                    ),
                    "messageAttributes": {
                        "connectionId": {"stringValue": "test-connection-1"},
                        "conversationId": {"stringValue": "test-conversation-2"},
                        "userId": {"stringValue": "test-user-1"},
                    },
                },
            ]
        }

        with patch("handler.get_agentcore_client") as mock_get_client, patch(
            "handler.send_error_message"
        ) as mock_send_error:

            # Mock AgentCore client to raise error on first call
            mock_client = Mock()
            mock_client.invoke_agent.side_effect = AgentCoreInvocationError("Runtime error")
            mock_get_client.return_value = mock_client

            # Execute lambda handler
            result = lambda_handler(same_connection_event, self.mock_context)

            # Verify both records failed due to same connection
            assert len(result["batchItemFailures"]) == 2
            failed_ids = [failure["itemIdentifier"] for failure in result["batchItemFailures"]]
            assert "test-message-id-1" in failed_ids
            assert "test-message-id-2" in failed_ids


class TestInvokeAgentCoreFunction:
    """Test the invoke_agent_core function with various scenarios."""

    def setup_method(self):
        """Set up test fixtures."""
        self.connection_id = "test-connection"
        self.conversation_id = "test-conversation"
        self.input_text = "Test input"
        self.user_id = "test-user"
        self.message_id = "test-message"

    def test_successful_streaming_invocation(self):
        """Test successful streaming invocation flow."""
        with patch("handler.get_agentcore_client") as mock_get_client, patch(
            "handler.send_websocket_message"
        ) as mock_send_ws:

            # Mock successful streaming response
            mock_client = Mock()
            mock_client.invoke_agent.return_value = [
                {"text": "Streaming response chunk 1", "type": "content"},
                {"text": "Streaming response chunk 2", "type": "content"},
                {"type": "completion"},
            ]
            mock_get_client.return_value = mock_client

            # Execute function
            invoke_agent_core(
                connection_id=self.connection_id,
                conversation_id=self.conversation_id,
                input_text=self.input_text,
                user_id=self.user_id,
                message_id=self.message_id,
                files=[],
            )

            mock_client.invoke_agent.assert_called_once()
            call_args = mock_client.invoke_agent.call_args
            assert call_args[1]["input_text"] == self.input_text
            assert call_args[1]["conversation_id"] == self.conversation_id
            assert call_args[1]["user_id"] == self.user_id
            assert "message_id" in call_args[1]  # Message ID should be present
            assert "files" in call_args[1]  # Files should be present

            # Verify WebSocket messages were sent (2 content + 1 END token)
            assert mock_send_ws.call_count == 3

    def test_streaming_invocation_failure(self):
        """Test streaming invocation failure (no fallback since we removed backwards compatibility)."""
        with patch("handler.get_agentcore_client") as mock_get_client:

            # Mock streaming failure
            mock_client = Mock()
            mock_client.invoke_agent.side_effect = AgentCoreInvocationError("Streaming failed")
            mock_get_client.return_value = mock_client

            # Execute function and expect error
            with pytest.raises(AgentCoreInvocationError) as exc_info:
                invoke_agent_core(
                    connection_id=self.connection_id,
                    conversation_id=self.conversation_id,
                    input_text=self.input_text,
                    user_id=self.user_id,
                    message_id=self.message_id,
                    files=[],
                )

            # Verify only one call was made (no fallback)
            assert mock_client.invoke_agent.call_count == 1
            assert "Streaming failed" in str(exc_info.value)

    def test_streaming_invocation_error_propagation(self):
        """Test that streaming invocation errors are properly propagated."""
        with patch("handler.get_agentcore_client") as mock_get_client:

            # Mock streaming failure
            mock_client = Mock()
            mock_client.invoke_agent.side_effect = AgentCoreInvocationError("Streaming failed")
            mock_get_client.return_value = mock_client

            # Execute function and expect error
            with pytest.raises(AgentCoreInvocationError) as exc_info:
                invoke_agent_core(
                    connection_id=self.connection_id,
                    conversation_id=self.conversation_id,
                    input_text=self.input_text,
                    user_id=self.user_id,
                    message_id=self.message_id,
                    files=[],
                )

            # Verify only one call was made (no fallback)
            assert mock_client.invoke_agent.call_count == 1
            assert "Streaming failed" in str(exc_info.value)

    def test_configuration_error_handling(self):
        """Test handling of AgentCore configuration errors."""
        with patch("handler.get_agentcore_client") as mock_get_client:

            # Mock configuration error
            mock_get_client.side_effect = AgentCoreConfigurationError("Missing runtime ARN")

            # Execute function and expect error propagation
            with pytest.raises(AgentCoreConfigurationError):
                invoke_agent_core(
                    connection_id=self.connection_id,
                    conversation_id=self.conversation_id,
                    input_text=self.input_text,
                    user_id=self.user_id,
                    message_id=self.message_id,
                    files=[],
                )

    def test_error_chunk_handling(self):
        """Test that error chunks from AgentCore raise an exception (matches chat lambda pattern)."""
        with patch("handler.get_agentcore_client") as mock_get_client, patch(
            "handler.send_websocket_message"
        ) as mock_send_ws:

            # Mock AgentCore client returning error chunk
            mock_client = Mock()
            mock_client.invoke_agent.return_value = [
                {"type": "content", "text": "Processing your request..."},
                {
                    "type": "error",
                    "error": "ValidationException",
                    "message": "Invocation of model ID amazon.nova-pro-v1:0 with on-demand throughput isn't supported",
                },
            ]
            mock_get_client.return_value = mock_client

            # Execute function - should raise AgentCoreInvocationError
            with pytest.raises(AgentCoreInvocationError) as exc_info:
                invoke_agent_core(
                    connection_id=self.connection_id,
                    conversation_id=self.conversation_id,
                    input_text=self.input_text,
                    user_id=self.user_id,
                    message_id=self.message_id,
                    files=[],
                )

            # Verify the exception contains the error message
            assert "amazon.nova-pro-v1:0" in str(exc_info.value)
            assert "AgentCore streaming error" in str(exc_info.value)

            # Verify content chunk was sent before error
            assert mock_send_ws.call_count == 1

    def test_invocation_with_pdf_file(self):
        """Test successful invocation with PDF file attachment."""
        with patch("handler.get_agentcore_client") as mock_get_client, patch(
            "handler.send_websocket_message"
        ) as mock_send_ws:

            # Mock successful response with file processing
            mock_client = Mock()
            mock_client.invoke_agent.return_value = [
                {"text": "I've analyzed the PDF document you provided.", "type": "content"},
                {"text": "The document contains important information about...", "type": "content"},
                {"type": "completion"},
            ]
            mock_get_client.return_value = mock_client

            # Test files with PDF (uppercase extension)
            test_files = [
                {
                    "fileName": "document.PDF",
                    "fileType": "application/pdf",
                    "fileSize": 1024000,
                    "s3Key": "uploads/user123/document.PDF",
                }
            ]

            invoke_agent_core(
                connection_id=self.connection_id,
                conversation_id=self.conversation_id,
                input_text="Please analyze this document",
                user_id=self.user_id,
                message_id=self.message_id,
                files=test_files,
            )

            mock_client.invoke_agent.assert_called_once()
            call_args = mock_client.invoke_agent.call_args
            assert call_args[1]["files"] == test_files
            assert call_args[1]["input_text"] == "Please analyze this document"

            assert mock_send_ws.call_count == 3  # 2 content + 1 END token

    def test_invocation_with_multiple_files_mixed_case(self):
        """Test successful invocation with multiple files having mixed case extensions."""
        with patch("handler.get_agentcore_client") as mock_get_client, patch(
            "handler.send_websocket_message"
        ) as mock_send_ws:

            mock_client = Mock()
            mock_client.invoke_agent.return_value = [
                {"text": "I've processed all the files you uploaded:", "type": "content"},
                {"text": "- The image shows a chart with quarterly data", "type": "content"},
                {"text": "- The document contains the detailed analysis", "type": "content"},
                {"text": "- The spreadsheet has the raw numbers", "type": "content"},
                {"type": "completion"},
            ]
            mock_get_client.return_value = mock_client

            test_files = [
                {
                    "fileName": "chart.JPEG",
                    "fileType": "image/jpeg",
                    "fileSize": 512000,
                    "s3Key": "uploads/user123/chart.JPEG",
                },
                {
                    "fileName": "report.pdf",
                    "fileType": "application/pdf",
                    "fileSize": 2048000,
                    "s3Key": "uploads/user123/report.pdf",
                },
                {
                    "fileName": "data.XLSX",
                    "fileType": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                    "fileSize": 256000,
                    "s3Key": "uploads/user123/data.XLSX",
                },
            ]

            invoke_agent_core(
                connection_id=self.connection_id,
                conversation_id=self.conversation_id,
                input_text="Compare the data across these files",
                user_id=self.user_id,
                message_id=self.message_id,
                files=test_files,
            )

            # Verify AgentCore was called with all files
            mock_client.invoke_agent.assert_called_once()
            call_args = mock_client.invoke_agent.call_args
            assert call_args[1]["files"] == test_files
            assert len(call_args[1]["files"]) == 3

            # Verify file extensions are preserved as-is
            file_names = [f["fileName"] for f in call_args[1]["files"]]
            assert "chart.JPEG" in file_names
            assert "report.pdf" in file_names
            assert "data.XLSX" in file_names

            # Verify WebSocket messages were sent
            assert mock_send_ws.call_count == 5  # 4 content + 1 END token


class TestWebSocketCommunication:
    """Test WebSocket message sending functionality."""

    def test_send_websocket_message_success(self):
        """Test successful WebSocket message sending."""
        with patch("handler.get_service_client") as mock_get_client:
            mock_client = Mock()
            mock_get_client.return_value = mock_client

            send_websocket_message(
                connection_id="test-connection",
                conversation_id="test-conversation",
                message="Test message",
                message_id="test-message",
            )

            # Verify client was called correctly
            mock_client.post_to_connection.assert_called_once()
            call_args = mock_client.post_to_connection.call_args

            assert call_args[1]["ConnectionId"] == "test-connection"

            # Verify message format
            sent_data = json.loads(call_args[1]["Data"])
            assert sent_data["conversationId"] == "test-conversation"
            assert sent_data["messageId"] == "test-message"
            assert sent_data["data"] == "Test message"

    def test_send_websocket_message_error_handling(self):
        """Test WebSocket message sending error handling."""
        with patch("handler.get_service_client") as mock_get_client, patch("handler.logger") as mock_logger:

            mock_client = Mock()
            mock_client.post_to_connection.side_effect = Exception("WebSocket error")
            mock_get_client.return_value = mock_client

            # Should not raise exception
            with pytest.raises(Exception):
                send_websocket_message(
                    connection_id="test-connection",
                    conversation_id="test-conversation",
                    message="Test message",
                    message_id="test-message",
                )

    def test_send_error_message_format(self):
        """Test error message formatting and sending with fixed error message."""
        with patch("handler.WebsocketErrorHandler") as mock_error_handler_class:
            mock_error_handler = Mock()
            mock_error_handler_class.return_value = mock_error_handler

            send_error_message(
                connection_id="test-connection",
                conversation_id="test-conversation",
                message_id="test-message",
            )

            # Verify WebsocketErrorHandler was instantiated correctly
            mock_error_handler_class.assert_called_once()
            call_kwargs = mock_error_handler_class.call_args[1]
            assert call_kwargs["connection_id"] == "test-connection"
            assert call_kwargs["conversation_id"] == "test-conversation"
            assert call_kwargs["message_id"] == "test-message"
            assert "trace_id" in call_kwargs

            # Verify post_token_to_connection was called with the fixed error message
            mock_error_handler.post_token_to_connection.assert_called_once()
            error_message = mock_error_handler.post_token_to_connection.call_args[0][0]
            assert "AgentCore invocation service failed to respond" in error_message
            assert "quote the following trace id:" in error_message

    def test_format_response_function(self):
        """Test response formatting function."""
        # Test basic response
        formatted = format_response("test-conversation", "test-message", data="test-data")
        data = json.loads(formatted)

        assert data["conversationId"] == "test-conversation"
        assert data["messageId"] == "test-message"
        assert data["data"] == "test-data"

        # Test error response
        formatted_error = format_response(
            "test-conversation", "test-message", errorMessage="test-error", traceId="test-trace"
        )
        error_data = json.loads(formatted_error)

        assert error_data["errorMessage"] == "test-error"
        assert error_data["traceId"] == "test-trace"


class TestAgentCoreClientGlobal:
    """Test global AgentCore client management."""

    def test_get_agentcore_client_singleton(self):
        """Test that get_agentcore_client returns singleton instance."""
        with patch("handler.AgentCoreClient") as mock_client_class:
            mock_instance = Mock()
            mock_client_class.return_value = mock_instance

            # Clear global client
            import handler

            handler._agentcore_client = None

            # First call should create instance
            client1 = get_agentcore_client()
            assert client1 == mock_instance
            mock_client_class.assert_called_once()

            # Second call should return same instance
            client2 = get_agentcore_client()
            assert client2 == mock_instance
            assert client1 is client2
            # Should not create new instance
            mock_client_class.assert_called_once()

    def test_get_agentcore_client_configuration_error(self):
        """Test get_agentcore_client with configuration error."""
        with patch("handler.AgentCoreClient") as mock_client_class:
            mock_client_class.side_effect = AgentCoreConfigurationError("Config error")

            # Clear global client
            import handler

            handler._agentcore_client = None

            # Should propagate configuration error
            with pytest.raises(AgentCoreConfigurationError):
                get_agentcore_client()


class TestToolUsageChunkForwarding:
    """Test tool usage chunk forwarding from agent to WebSocket."""

    def setup_method(self):
        """Set up test fixtures."""
        self.connection_id = "test-connection"
        self.conversation_id = "test-conversation"
        self.input_text = "Test input"
        self.user_id = "test-user"
        self.message_id = "test-message"

    def test_tool_usage_chunk_forwarding_started(self):
        """Test forwarding of tool_use chunk with 'started' status."""
        with patch("handler.get_agentcore_client") as mock_get_client, patch(
            "handler.send_websocket_message"
        ) as mock_send_ws, patch("handler.send_tool_usage") as mock_send_tool:

            # Mock agent response with tool usage chunk
            mock_client = Mock()
            mock_client.invoke_agent.return_value = [
                {
                    "type": "tool_use",
                    "toolUsage": {
                        "toolName": "test_tool",
                        "status": "started",
                        "startTime": "2025-01-08T12:00:00Z",
                        "mcpServerName": "test-mcp-server",
                    },
                },
                {"text": "Tool result", "type": "content"},
                {"type": "completion"},
            ]
            mock_get_client.return_value = mock_client

            # Execute function
            invoke_agent_core(
                connection_id=self.connection_id,
                conversation_id=self.conversation_id,
                input_text=self.input_text,
                user_id=self.user_id,
                message_id=self.message_id,
                files=[],
            )

            # Verify send_tool_usage was called with correct structure
            mock_send_tool.assert_called_once()
            call_args = mock_send_tool.call_args

            assert call_args[0][0] == self.connection_id
            assert call_args[0][1] == self.conversation_id
            assert call_args[0][3] == self.message_id

            tool_usage = call_args[0][2]
            assert tool_usage["toolName"] == "test_tool"
            assert tool_usage["status"] == "started"
            assert tool_usage["startTime"] == "2025-01-08T12:00:00Z"
            assert tool_usage["mcpServerName"] == "test-mcp-server"

    def test_tool_usage_chunk_forwarding_completed(self):
        """Test forwarding of tool_use chunk with 'completed' status."""
        with patch("handler.get_agentcore_client") as mock_get_client, patch(
            "handler.send_websocket_message"
        ) as mock_send_ws, patch("handler.send_tool_usage") as mock_send_tool:

            # Mock agent response with completed tool usage
            mock_client = Mock()
            mock_client.invoke_agent.return_value = [
                {
                    "type": "tool_use",
                    "toolUsage": {
                        "toolName": "test_tool",
                        "status": "completed",
                        "startTime": "2025-01-08T12:00:00Z",
                        "endTime": "2025-01-08T12:00:05Z",
                        "toolInput": {"param": "value"},
                        "toolOutput": "Success",
                    },
                },
                {"type": "completion"},
            ]
            mock_get_client.return_value = mock_client

            # Execute function
            invoke_agent_core(
                connection_id=self.connection_id,
                conversation_id=self.conversation_id,
                input_text=self.input_text,
                user_id=self.user_id,
                message_id=self.message_id,
                files=[],
            )

            # Verify tool usage was sent
            mock_send_tool.assert_called_once()
            tool_usage = mock_send_tool.call_args[0][2]

            assert tool_usage["status"] == "completed"
            assert tool_usage["endTime"] == "2025-01-08T12:00:05Z"
            assert tool_usage["toolInput"] == {"param": "value"}
            assert tool_usage["toolOutput"] == "Success"

    def test_tool_usage_chunk_forwarding_failed(self):
        """Test forwarding of tool_use chunk with 'failed' status."""
        with patch("handler.get_agentcore_client") as mock_get_client, patch(
            "handler.send_websocket_message"
        ) as mock_send_ws, patch("handler.send_tool_usage") as mock_send_tool:

            # Mock agent response with failed tool usage
            mock_client = Mock()
            mock_client.invoke_agent.return_value = [
                {
                    "type": "tool_use",
                    "toolUsage": {
                        "toolName": "test_tool",
                        "status": "failed",
                        "startTime": "2025-01-08T12:00:00Z",
                        "endTime": "2025-01-08T12:00:02Z",
                        "error": "Tool execution failed",
                    },
                },
                {"type": "completion"},
            ]
            mock_get_client.return_value = mock_client

            # Execute function
            invoke_agent_core(
                connection_id=self.connection_id,
                conversation_id=self.conversation_id,
                input_text=self.input_text,
                user_id=self.user_id,
                message_id=self.message_id,
                files=[],
            )

            # Verify tool usage was sent with error
            mock_send_tool.assert_called_once()
            tool_usage = mock_send_tool.call_args[0][2]

            assert tool_usage["status"] == "failed"
            assert tool_usage["error"] == "Tool execution failed"

    def test_multiple_tool_usage_chunks(self):
        """Test forwarding of multiple tool usage chunks in sequence."""
        with patch("handler.get_agentcore_client") as mock_get_client, patch(
            "handler.send_websocket_message"
        ) as mock_send_ws, patch("handler.send_tool_usage") as mock_send_tool:

            # Mock agent response with multiple tool usages
            mock_client = Mock()
            mock_client.invoke_agent.return_value = [
                {
                    "type": "tool_use",
                    "toolUsage": {
                        "toolName": "tool_1",
                        "status": "started",
                        "startTime": "2025-01-08T12:00:00Z",
                    },
                },
                {
                    "type": "tool_use",
                    "toolUsage": {
                        "toolName": "tool_1",
                        "status": "completed",
                        "startTime": "2025-01-08T12:00:00Z",
                        "endTime": "2025-01-08T12:00:02Z",
                    },
                },
                {
                    "type": "tool_use",
                    "toolUsage": {
                        "toolName": "tool_2",
                        "status": "started",
                        "startTime": "2025-01-08T12:00:03Z",
                    },
                },
                {"type": "completion"},
            ]
            mock_get_client.return_value = mock_client

            # Execute function
            invoke_agent_core(
                connection_id=self.connection_id,
                conversation_id=self.conversation_id,
                input_text=self.input_text,
                user_id=self.user_id,
                message_id=self.message_id,
                files=[],
            )

            # Verify all tool usages were sent
            assert mock_send_tool.call_count == 3

            # Verify order and content
            calls = mock_send_tool.call_args_list
            assert calls[0][0][2]["toolName"] == "tool_1"
            assert calls[0][0][2]["status"] == "started"
            assert calls[1][0][2]["toolName"] == "tool_1"
            assert calls[1][0][2]["status"] == "completed"
            assert calls[2][0][2]["toolName"] == "tool_2"
            assert calls[2][0][2]["status"] == "started"

    def test_tool_usage_with_mcp_server(self):
        """Test tool usage chunk includes MCP server name."""
        with patch("handler.get_agentcore_client") as mock_get_client, patch(
            "handler.send_websocket_message"
        ) as mock_send_ws, patch("handler.send_tool_usage") as mock_send_tool:

            # Mock agent response with MCP tool
            mock_client = Mock()
            mock_client.invoke_agent.return_value = [
                {
                    "type": "tool_use",
                    "toolUsage": {
                        "toolName": "mcp_file_read",
                        "status": "completed",
                        "startTime": "2025-01-08T12:00:00Z",
                        "endTime": "2025-01-08T12:00:01Z",
                        "mcpServerName": "filesystem",
                    },
                },
                {"type": "completion"},
            ]
            mock_get_client.return_value = mock_client

            # Execute function
            invoke_agent_core(
                connection_id=self.connection_id,
                conversation_id=self.conversation_id,
                input_text=self.input_text,
                user_id=self.user_id,
                message_id=self.message_id,
                files=[],
            )

            # Verify MCP server name is included
            mock_send_tool.assert_called_once()
            tool_usage = mock_send_tool.call_args[0][2]
            assert tool_usage["mcpServerName"] == "filesystem"

    def test_tool_usage_without_mcp_server(self):
        """Test tool usage chunk for built-in Strands tool (no MCP server)."""
        with patch("handler.get_agentcore_client") as mock_get_client, patch(
            "handler.send_websocket_message"
        ) as mock_send_ws, patch("handler.send_tool_usage") as mock_send_tool:

            # Mock agent response with built-in tool
            mock_client = Mock()
            mock_client.invoke_agent.return_value = [
                {
                    "type": "tool_use",
                    "toolUsage": {
                        "toolName": "strands_builtin_tool",
                        "status": "completed",
                        "startTime": "2025-01-08T12:00:00Z",
                        "endTime": "2025-01-08T12:00:01Z",
                    },
                },
                {"type": "completion"},
            ]
            mock_get_client.return_value = mock_client

            # Execute function
            invoke_agent_core(
                connection_id=self.connection_id,
                conversation_id=self.conversation_id,
                input_text=self.input_text,
                user_id=self.user_id,
                message_id=self.message_id,
                files=[],
            )

            # Verify no MCP server name
            mock_send_tool.assert_called_once()
            tool_usage = mock_send_tool.call_args[0][2]
            assert "mcpServerName" not in tool_usage

    def test_malformed_tool_usage_chunk_handling(self):
        """Test handling of malformed tool usage chunks."""
        with patch("handler.get_agentcore_client") as mock_get_client, patch(
            "handler.send_websocket_message"
        ) as mock_send_ws, patch("handler.send_tool_usage") as mock_send_tool:

            # Mock agent response with malformed tool usage (missing toolUsage field)
            mock_client = Mock()
            mock_client.invoke_agent.return_value = [
                {"type": "tool_use"},  # Missing toolUsage field
                {"text": "Content", "type": "content"},
                {"type": "completion"},
            ]
            mock_get_client.return_value = mock_client

            # Execute function - should not crash
            invoke_agent_core(
                connection_id=self.connection_id,
                conversation_id=self.conversation_id,
                input_text=self.input_text,
                user_id=self.user_id,
                message_id=self.message_id,
                files=[],
            )

            # Verify send_tool_usage was not called for malformed chunk
            mock_send_tool.assert_not_called()

            # Verify content was still sent
            mock_send_ws.assert_called()

    def test_send_tool_usage_websocket_message_format(self):
        """Test that send_tool_usage formats WebSocket message correctly."""
        with patch("handler.get_service_client") as mock_get_client:
            mock_client = Mock()
            mock_get_client.return_value = mock_client

            tool_usage = {
                "toolName": "test_tool",
                "status": "completed",
                "startTime": "2025-01-08T12:00:00Z",
                "endTime": "2025-01-08T12:00:05Z",
            }

            from handler import send_tool_usage

            send_tool_usage(
                connection_id="test-connection",
                conversation_id="test-conversation",
                tool_usage=tool_usage,
                message_id="test-message",
            )

            # Verify WebSocket message format
            mock_client.post_to_connection.assert_called_once()
            call_args = mock_client.post_to_connection.call_args

            assert call_args[1]["ConnectionId"] == "test-connection"

            # Parse and verify message structure
            sent_data = json.loads(call_args[1]["Data"])
            assert sent_data["conversationId"] == "test-conversation"
            assert sent_data["messageId"] == "test-message"
            assert "toolUsage" in sent_data
            assert sent_data["toolUsage"]["toolName"] == "test_tool"
            assert sent_data["toolUsage"]["status"] == "completed"

    def test_send_tool_usage_error_handling(self):
        """Test that send_tool_usage handles errors gracefully."""
        with patch("handler.get_service_client") as mock_get_client, patch("handler.logger") as mock_logger:

            mock_client = Mock()
            mock_client.post_to_connection.side_effect = Exception("WebSocket error")
            mock_get_client.return_value = mock_client

            tool_usage = {
                "toolName": "test_tool",
                "status": "started",
                "startTime": "2025-01-08T12:00:00Z",
            }

            from handler import send_tool_usage

            # Should not raise exception
            send_tool_usage(
                connection_id="test-connection",
                conversation_id="test-conversation",
                tool_usage=tool_usage,
                message_id="test-message",
            )

            # Verify error was logged
            assert any("Error sending tool usage" in str(call) for call in mock_logger.error.call_args_list)

    def test_tool_usage_does_not_interfere_with_keep_alive(self):
        """Test that tool usage messages don't interfere with keep-alive."""
        with patch("handler.get_agentcore_client") as mock_get_client, patch(
            "handler.send_websocket_message"
        ) as mock_send_ws, patch("handler.send_tool_usage") as mock_send_tool, patch(
            "handler.get_keep_alive_manager"
        ) as mock_get_keep_alive:

            # Mock keep-alive manager
            mock_keep_alive = Mock()
            mock_get_keep_alive.return_value = mock_keep_alive

            # Mock agent response with tool usage
            mock_client = Mock()
            mock_client.invoke_agent.return_value = [
                {
                    "type": "tool_use",
                    "toolUsage": {
                        "toolName": "test_tool",
                        "status": "started",
                        "startTime": "2025-01-08T12:00:00Z",
                    },
                },
                {"text": "Content", "type": "content"},
                {"type": "completion"},
            ]
            mock_get_client.return_value = mock_client

            # Execute function
            invoke_agent_core(
                connection_id=self.connection_id,
                conversation_id=self.conversation_id,
                input_text=self.input_text,
                user_id=self.user_id,
                message_id=self.message_id,
                files=[],
            )

            # Verify keep-alive was started and stopped
            mock_keep_alive.start_keep_alive.assert_called_once()
            mock_keep_alive.stop_keep_alive.assert_called_once()

            # Verify activity was updated for each chunk
            assert mock_keep_alive.update_activity.call_count >= 2


class TestTraceIdHandling:
    """Test trace ID handling in error messages."""

    @patch("handler.WebsocketErrorHandler")
    @patch("handler.os.environ.get")
    def test_send_error_message_extracts_root_trace_id(self, mock_env_get, mock_error_handler):
        """Test that send_error_message extracts just the root trace ID from X-Ray format."""
        from handler import send_error_message

        # Set up mock with full X-Ray trace ID format
        full_trace_id = "Root=1-68f6b98e-7ae43e64d1ed2eb8ad2029c9;Parent=2a9e358718ca94a7;Sampled=0"
        mock_env_get.return_value = full_trace_id
        mock_handler_instance = MagicMock()
        mock_error_handler.return_value = mock_handler_instance

        # Execute
        send_error_message("conn-123", "conv-456", "msg-789")

        # Verify WebsocketErrorHandler was called with extracted root trace ID only
        mock_error_handler.assert_called_once()
        call_kwargs = mock_error_handler.call_args[1]
        assert call_kwargs["trace_id"] == "1-68f6b98e-7ae43e64d1ed2eb8ad2029c9"
        assert "Root=" not in call_kwargs["trace_id"]
        assert "Parent=" not in call_kwargs["trace_id"]

        # Verify error message contains only the root trace ID
        mock_handler_instance.post_token_to_connection.assert_called_once()
        error_message = mock_handler_instance.post_token_to_connection.call_args[0][0]
        assert "1-68f6b98e-7ae43e64d1ed2eb8ad2029c9" in error_message
        assert "Root=" not in error_message
        assert "Parent=" not in error_message
        assert "Please contact your system administrator for support and quote the following trace id:" in error_message


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
