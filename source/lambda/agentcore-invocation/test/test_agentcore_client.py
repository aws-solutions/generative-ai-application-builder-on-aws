#!/usr/bin/env python3
# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

import json
from unittest.mock import Mock, patch
from uuid import UUID

import pytest
from utils.agentcore_client import (
    AgentCoreClient,
    AgentCoreClientError,
    AgentCoreConfigurationError,
    AgentCoreInvocationError,
)


class MockStreamingBody:
    """Mock StreamingBody for testing."""

    def __init__(self, content: str):
        self.content = content.encode("utf-8")
        self.position = 0

    def read(self, size=None):
        if size is None:
            # Read all remaining content
            result = self.content[self.position :]
            self.position = len(self.content)
            return result
        else:
            # Read up to size bytes
            result = self.content[self.position : self.position + size]
            self.position += len(result)
            return result


class TestAgentCoreClient:
    """Test AgentCore client functionality."""

    def setup_method(self):
        """Set up test fixtures."""
        with patch.dict(
            "os.environ", {"AGENT_RUNTIME_ARN": "arn:aws:bedrock-agentcore:us-east-1:123456789012:runtime/test-runtime"}
        ):
            self.client = AgentCoreClient()

        self.test_input = "Hello, how can you help me?"
        self.test_conversation_id = "conv-12345"
        self.test_user_id = "user-67890"

    def test_successful_invocation_with_dict_response(self):
        """Test successful agent invocation with dictionary response."""
        mock_response = {"response": {"result": "I can help you with various tasks. What would you like to know?"}}

        with patch.object(self.client, "client") as mock_boto_client:
            mock_boto_client.invoke_agent_runtime.return_value = mock_response

            chunks = list(
                self.client.invoke_agent(
                    input_text=self.test_input,
                    conversation_id=self.test_conversation_id,
                    user_id=self.test_user_id,
                )
            )

            # Verify invoke_agent_runtime was called with correct parameters including runtimeSessionId
            mock_boto_client.invoke_agent_runtime.assert_called_once()
            call_kwargs = mock_boto_client.invoke_agent_runtime.call_args[1]
            assert call_kwargs["runtimeUserId"] == self.test_user_id
            assert call_kwargs["runtimeSessionId"] == f"{self.test_conversation_id}_{self.test_user_id}"
            assert call_kwargs["contentType"] == "application/json"
            assert call_kwargs["accept"] == "application/json"

            # Should have content chunks and completion
            assert len(chunks) >= 2

            # Find content chunks
            content_chunks = [chunk for chunk in chunks if chunk.get("type") == "content"]
            assert len(content_chunks) > 0

            # Verify content contains expected text
            full_text = "".join(chunk.get("text", "") for chunk in content_chunks)
            assert "I can help you with various tasks" in full_text

    def test_successful_invocation_with_streaming_body_response(self):
        """Test successful agent invocation with StreamingBody response."""
        response_content = '{"result": "This is a streaming response from the agent."}'
        mock_streaming_body = MockStreamingBody(response_content)
        mock_response = {"response": mock_streaming_body}

        with patch.object(self.client, "client") as mock_boto_client:
            mock_boto_client.invoke_agent_runtime.return_value = mock_response

            chunks = list(
                self.client.invoke_agent(
                    input_text=self.test_input,
                    conversation_id=self.test_conversation_id,
                    user_id=self.test_user_id,
                )
            )

            # Verify invoke_agent_runtime was called with correct parameters including runtimeSessionId
            mock_boto_client.invoke_agent_runtime.assert_called_once()
            call_kwargs = mock_boto_client.invoke_agent_runtime.call_args[1]
            assert call_kwargs["runtimeUserId"] == self.test_user_id
            assert call_kwargs["runtimeSessionId"] == f"{self.test_conversation_id}_{self.test_user_id}"

            # Should have content chunks and completion
            assert len(chunks) >= 2

            # Find content chunks
            content_chunks = [chunk for chunk in chunks if chunk.get("type") == "content"]
            assert len(content_chunks) > 0

            # Verify content contains expected text
            full_text = "".join(chunk.get("text", "") for chunk in content_chunks)
            assert "This is a streaming response from the agent" in full_text

    def test_successful_invocation_with_bytes_response(self):
        """Test successful agent invocation with bytes response."""
        response_content = '{"result": "Response from bytes payload."}'
        mock_response = {"response": response_content.encode("utf-8")}

        with patch.object(self.client, "client") as mock_boto_client:
            mock_boto_client.invoke_agent_runtime.return_value = mock_response

            chunks = list(
                self.client.invoke_agent(
                    input_text=self.test_input,
                    conversation_id=self.test_conversation_id,
                    user_id=self.test_user_id,
                )
            )

            # Verify invoke_agent_runtime was called with correct parameters including runtimeSessionId
            mock_boto_client.invoke_agent_runtime.assert_called_once()
            call_kwargs = mock_boto_client.invoke_agent_runtime.call_args[1]
            assert call_kwargs["runtimeUserId"] == self.test_user_id
            assert call_kwargs["runtimeSessionId"] == f"{self.test_conversation_id}_{self.test_user_id}"

            # Should have content chunks and completion
            assert len(chunks) >= 2

            # Find content chunks
            content_chunks = [chunk for chunk in chunks if chunk.get("type") == "content"]
            assert len(content_chunks) > 0

            # Verify content contains expected text
            full_text = "".join(chunk.get("text", "") for chunk in content_chunks)
            assert "Response from bytes payload" in full_text

    def test_successful_invocation_with_string_response(self):
        """Test successful agent invocation with string response."""
        response_content = '{"result": "String response from agent."}'
        mock_response = {"response": response_content}

        with patch.object(self.client, "client") as mock_boto_client:
            mock_boto_client.invoke_agent_runtime.return_value = mock_response

            chunks = list(
                self.client.invoke_agent(
                    input_text=self.test_input,
                    conversation_id=self.test_conversation_id,
                    user_id=self.test_user_id,
                )
            )

            # Verify invoke_agent_runtime was called with correct parameters including runtimeSessionId
            mock_boto_client.invoke_agent_runtime.assert_called_once()
            call_kwargs = mock_boto_client.invoke_agent_runtime.call_args[1]
            assert call_kwargs["runtimeUserId"] == self.test_user_id
            assert call_kwargs["runtimeSessionId"] == f"{self.test_conversation_id}_{self.test_user_id}"

            # Should have content chunks and completion
            assert len(chunks) >= 2

            # Find content chunks
            content_chunks = [chunk for chunk in chunks if chunk.get("type") == "content"]
            assert len(content_chunks) > 0

            # Verify content contains expected text
            full_text = "".join(chunk.get("text", "") for chunk in content_chunks)
            assert "String response from agent" in full_text

    def test_client_error_handling(self):
        """Test handling of client errors."""
        from botocore.exceptions import ClientError

        with patch.object(self.client, "client") as mock_boto_client:
            mock_boto_client.invoke_agent_runtime.side_effect = ClientError(
                {"Error": {"Code": "ValidationException", "Message": "Invalid input"}}, "InvokeAgentRuntime"
            )

            with pytest.raises(AgentCoreInvocationError) as exc_info:
                list(
                    self.client.invoke_agent(
                        input_text=self.test_input,
                        conversation_id=self.test_conversation_id,
                        user_id=self.test_user_id,
                    )
                )

            assert "AgentCore boto3 error during invocation" in str(exc_info.value)

    def test_streaming_body_read_error(self):
        """Test handling of StreamingBody read errors."""
        mock_streaming_body = Mock()
        mock_streaming_body.read.side_effect = Exception("Failed to read stream")
        mock_response = {"response": mock_streaming_body}

        with patch.object(self.client, "client") as mock_boto_client:
            mock_boto_client.invoke_agent_runtime.return_value = mock_response

            # Error should occur when consuming the stream
            chunks = list(
                self.client.invoke_agent(
                    input_text=self.test_input,
                    conversation_id=self.test_conversation_id,
                    user_id=self.test_user_id,
                )
            )

            # Should have error chunk and completion chunk
            assert len(chunks) >= 2
            error_chunk = chunks[0]
            assert error_chunk["type"] == "error"
            assert "Failed to read stream" in error_chunk["error"]

    def test_client_none_error(self):
        """Test error when client is None."""
        self.client.client = None

        with pytest.raises(AgentCoreInvocationError) as exc_info:
            list(
                self.client.invoke_agent(
                    input_text=self.test_input,
                    conversation_id=self.test_conversation_id,
                    user_id=self.test_user_id,
                )
            )

        assert "NoneType" in str(exc_info.value)

    def test_error_chunk_handling(self):
        """Test that error chunks are yielded instead of raising exceptions."""
        error_response = {
            "response": {
                "type": "error",
                "error": "ValidationException",
                "message": "Invocation of model ID amazon.nova-pro-v1:0 with on-demand throughput isn't supported",
            }
        }

        with patch.object(self.client, "client") as mock_boto_client:
            mock_boto_client.invoke_agent_runtime.return_value = error_response

            chunks = list(
                self.client.invoke_agent(
                    input_text=self.test_input,
                    conversation_id=self.test_conversation_id,
                    user_id=self.test_user_id,
                )
            )

            # Debug: print chunks
            print(f"\nReceived {len(chunks)} chunks:")
            for i, chunk in enumerate(chunks):
                print(f"  Chunk {i}: {chunk}")

            # Should have error chunk and completion chunk
            assert len(chunks) >= 2

            # Find error chunk
            error_chunks = [chunk for chunk in chunks if chunk.get("type") == "error"]
            assert len(error_chunks) == 1, f"Expected 1 error chunk, got {len(error_chunks)}. All chunks: {chunks}"

            error_chunk = error_chunks[0]
            assert error_chunk["type"] == "error"
            assert error_chunk["error"] == "ValidationException"
            assert "amazon.nova-pro-v1:0" in error_chunk["message"]

            # Should also have completion chunk(s)
            completion_chunks = [chunk for chunk in chunks if chunk.get("type") == "completion"]
            assert len(completion_chunks) >= 1

    def test_error_chunk_with_streaming_body(self):
        """Test error chunk handling with StreamingBody response."""
        error_content = json.dumps(
            {"type": "error", "error": "Streaming response failed", "message": "Connection timeout"}
        )
        mock_streaming_body = MockStreamingBody(error_content)
        mock_response = {"response": mock_streaming_body}

        with patch.object(self.client, "client") as mock_boto_client:
            mock_boto_client.invoke_agent_runtime.return_value = mock_response

            chunks = list(
                self.client.invoke_agent(
                    input_text=self.test_input,
                    conversation_id=self.test_conversation_id,
                    user_id=self.test_user_id,
                )
            )

            # Should have error chunk and completion chunk
            assert len(chunks) >= 2

            # Find error chunk
            error_chunks = [chunk for chunk in chunks if chunk.get("type") == "error"]
            assert len(error_chunks) == 1

            error_chunk = error_chunks[0]
            assert error_chunk["type"] == "error"
            assert error_chunk["error"] == "Streaming response failed"
            assert error_chunk["message"] == "Connection timeout"

    def test_invoke_agent_with_files_parameter(self):
        """Test agent invocation with files parameter."""
        test_files = [
            {"fileReference": "file-123", "fileName": "document.pdf"},
            {"fileReference": "file-456", "fileName": "image.jpg"},
        ]
        test_message_id = "msg-789"

        mock_response = {"response": {"result": "I can see the files you've uploaded."}}

        with patch.object(self.client, "client") as mock_boto_client:
            mock_boto_client.invoke_agent_runtime.return_value = mock_response

            chunks = list(
                self.client.invoke_agent(
                    input_text=self.test_input,
                    conversation_id=self.test_conversation_id,
                    user_id=self.test_user_id,
                    message_id=test_message_id,
                    files=test_files,
                )
            )

            # Verify invoke_agent_runtime was called with correct parameters
            mock_boto_client.invoke_agent_runtime.assert_called_once()
            call_kwargs = mock_boto_client.invoke_agent_runtime.call_args[1]

            # Verify payload includes files and message_id
            payload_str = call_kwargs["payload"].decode("utf-8")
            payload_dict = json.loads(payload_str)

            assert payload_dict["files"] == test_files
            assert payload_dict["messageId"] == test_message_id
            assert payload_dict["conversationId"] == self.test_conversation_id
            assert payload_dict["input"] == self.test_input
            assert payload_dict["userId"] == self.test_user_id

            # Should have content chunks and completion
            assert len(chunks) >= 2

    def test_invoke_agent_without_files_parameter(self):
        """Test agent invocation without files parameter (backward compatibility)."""
        mock_response = {"response": {"result": "Hello! How can I help you?"}}

        with patch.object(self.client, "client") as mock_boto_client:
            mock_boto_client.invoke_agent_runtime.return_value = mock_response

            chunks = list(
                self.client.invoke_agent(
                    input_text=self.test_input,
                    conversation_id=self.test_conversation_id,
                    user_id=self.test_user_id,
                )
            )

            # Verify invoke_agent_runtime was called with correct parameters
            mock_boto_client.invoke_agent_runtime.assert_called_once()
            call_kwargs = mock_boto_client.invoke_agent_runtime.call_args[1]

            # Verify payload does not include files when not provided
            payload_str = call_kwargs["payload"].decode("utf-8")
            payload_dict = json.loads(payload_str)

            assert "files" not in payload_dict
            assert payload_dict["conversationId"] == self.test_conversation_id
            assert payload_dict["input"] == self.test_input
            assert payload_dict["userId"] == self.test_user_id
            # Should have auto-generated message_id
            assert "messageId" in payload_dict
            assert payload_dict["messageId"].startswith("msg-")

    def test_invoke_agent_with_empty_files_list(self):
        """Test agent invocation with empty files list."""
        test_files = []
        test_message_id = "msg-empty-files"

        mock_response = {"response": {"result": "No files provided."}}

        with patch.object(self.client, "client") as mock_boto_client:
            mock_boto_client.invoke_agent_runtime.return_value = mock_response

            chunks = list(
                self.client.invoke_agent(
                    input_text=self.test_input,
                    conversation_id=self.test_conversation_id,
                    user_id=self.test_user_id,
                    message_id=test_message_id,
                    files=test_files,
                )
            )

            # Verify invoke_agent_runtime was called with correct parameters
            mock_boto_client.invoke_agent_runtime.assert_called_once()
            call_kwargs = mock_boto_client.invoke_agent_runtime.call_args[1]

            # Verify payload includes empty files list
            payload_str = call_kwargs["payload"].decode("utf-8")
            payload_dict = json.loads(payload_str)

            assert "files" not in payload_dict
            assert payload_dict["messageId"] == test_message_id

    @patch("utils.agentcore_client.metrics")
    def test_completion_chunk_with_usage_metadata(self, mock_metrics):
        """Test that completion chunk preserves usage metadata."""
        mock_response = {
            "response": {
                "type": "completion",
                "usage": {
                    "inputTokens": 1453,
                    "outputTokens": 271,
                    "totalTokens": 1724
                }
            }
        }

        with patch.object(self.client, "client") as mock_boto_client:
            mock_boto_client.invoke_agent_runtime.return_value = mock_response

            chunks = list(
                self.client.invoke_agent(
                    input_text=self.test_input,
                    conversation_id=self.test_conversation_id,
                    user_id=self.test_user_id,
                )
            )

            # Find completion chunk
            completion_chunks = [chunk for chunk in chunks if chunk.get("type") == "completion"]
            assert len(completion_chunks) >= 1

            # Verify usage metadata is preserved
            completion_chunk = completion_chunks[0]
            assert "usage" in completion_chunk
            assert completion_chunk["usage"]["inputTokens"] == 1453
            assert completion_chunk["usage"]["outputTokens"] == 271
            assert completion_chunk["usage"]["totalTokens"] == 1724

            # Verify metrics were reported
            assert mock_metrics.add_metric.call_count == 3
            mock_metrics.flush_metrics.assert_called_once()

    @patch("utils.agentcore_client.metrics")
    def test_completion_chunk_without_usage_metadata(self, mock_metrics):
        """Test that completion chunk works without usage metadata."""
        mock_response = {
            "response": {
                "type": "completion"
            }
        }

        with patch.object(self.client, "client") as mock_boto_client:
            mock_boto_client.invoke_agent_runtime.return_value = mock_response

            chunks = list(
                self.client.invoke_agent(
                    input_text=self.test_input,
                    conversation_id=self.test_conversation_id,
                    user_id=self.test_user_id,
                )
            )

            # Find completion chunk
            completion_chunks = [chunk for chunk in chunks if chunk.get("type") == "completion"]
            assert len(completion_chunks) >= 1

            # Verify no usage metadata
            completion_chunk = completion_chunks[0]
            assert "usage" not in completion_chunk

            # Verify metrics were not reported
            mock_metrics.add_metric.assert_not_called()

    @patch("utils.agentcore_client.metrics")
    def test_completion_chunk_reports_metrics_to_cloudwatch(self, mock_metrics):
        """Test that usage metrics are reported to CloudWatch."""
        mock_response = {
            "response": {
                "type": "completion",
                "usage": {
                    "inputTokens": 100,
                    "outputTokens": 50,
                    "totalTokens": 150
                }
            }
        }

        with patch.object(self.client, "client") as mock_boto_client:
            mock_boto_client.invoke_agent_runtime.return_value = mock_response

            list(
                self.client.invoke_agent(
                    input_text=self.test_input,
                    conversation_id=self.test_conversation_id,
                    user_id=self.test_user_id,
                )
            )

            # Verify all three metrics were added
            metric_calls = mock_metrics.add_metric.call_args_list
            assert len(metric_calls) == 3

            # Verify metric values (using enum values, not names)
            metric_values = {call[1]["name"]: call[1]["value"] for call in metric_calls}
            assert metric_values["InputTokenCount"] == 100
            assert metric_values["OutputTokenCount"] == 50
            assert metric_values["TotalTokenCount"] == 150

            # Verify metrics were flushed
            mock_metrics.flush_metrics.assert_called_once()

    def test_thinking_chunk_handling(self):
        """Test that thinking chunks are properly handled."""
        mock_response = {
            "response": {
                "type": "thinking",
                "thinking": {
                    "thinkingMessage": "Let me think about this..."
                }
            }
        }

        with patch.object(self.client, "client") as mock_boto_client:
            mock_boto_client.invoke_agent_runtime.return_value = mock_response

            chunks = list(
                self.client.invoke_agent(
                    input_text=self.test_input,
                    conversation_id=self.test_conversation_id,
                    user_id=self.test_user_id,
                )
            )

            # Find thinking chunk
            thinking_chunks = [chunk for chunk in chunks if chunk.get("type") == "thinking"]
            assert len(thinking_chunks) == 1
            assert "thinking" in thinking_chunks[0]

    def test_tool_use_chunk_handling(self):
        """Test that tool usage chunks are properly handled."""
        mock_response = {
            "response": {
                "type": "tool_use",
                "toolUsage": {
                    "toolName": "test_tool",
                    "status": "completed",
                    "startTime": "2024-01-01T00:00:00Z"
                }
            }
        }

        with patch.object(self.client, "client") as mock_boto_client:
            mock_boto_client.invoke_agent_runtime.return_value = mock_response

            chunks = list(
                self.client.invoke_agent(
                    input_text=self.test_input,
                    conversation_id=self.test_conversation_id,
                    user_id=self.test_user_id,
                )
            )

            # Find tool usage chunk
            tool_chunks = [chunk for chunk in chunks if chunk.get("type") == "tool_use"]
            assert len(tool_chunks) == 1
            assert tool_chunks[0]["toolUsage"]["toolName"] == "test_tool"


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
