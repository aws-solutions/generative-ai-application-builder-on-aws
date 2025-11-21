# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

"""
Integration tests for workflow agent with AgentCore Runtime.

These tests verify that the workflow agent properly integrates with the
AgentCore Runtime, including:
- @app.entrypoint decorator usage
- Payload structure compatibility
- Streaming response format
- Environment variable handling
"""

import logging
import os
import sys
from unittest.mock import Mock, patch

import pytest

# Add src to path for imports
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "src"))

import main
from gaab_strands_common.utils.helpers import extract_user_message
from main import get_agent_instance, invoke, validate_environment


class TestTelemetryConfiguration:
    """Test OpenTelemetry configuration and logging setup"""

    def test_opentelemetry_logging_suppression(self):
        """Test that OpenTelemetry context warnings are suppressed"""
        # Get the OpenTelemetry context logger
        otel_logger = logging.getLogger("opentelemetry.context")
        
        # Verify the logger level is set to ERROR (suppressing warnings)
        assert otel_logger.level == logging.ERROR


class TestEnvironmentValidation:
    """Test environment variable validation"""

    def test_validate_environment_success(self):
        """Test successful environment validation"""
        with patch.dict(
            os.environ,
            {
                "USE_CASE_TABLE_NAME": "test-table",
                "USE_CASE_CONFIG_KEY": "test-key",
                "AWS_REGION": "us-east-1",
                "MEMORY_ID": "test-memory-id",
            },
        ):
            table_name, config_key, region, memory_id, strategy_id = validate_environment()

            assert table_name == "test-table"
            assert config_key == "test-key"
            assert region == "us-east-1"

    def test_validate_environment_missing_table_name(self):
        """Test validation fails when USE_CASE_TABLE_NAME is missing"""
        with patch.dict(
            os.environ,
            {"USE_CASE_CONFIG_KEY": "test-key", "AWS_REGION": "us-east-1"},
            clear=True,
        ):
            with pytest.raises(ValueError, match="USE_CASE_TABLE_NAME"):
                validate_environment()

    def test_validate_environment_missing_config_key(self):
        """Test validation fails when USE_CASE_CONFIG_KEY is missing"""
        with patch.dict(
            os.environ,
            {"USE_CASE_TABLE_NAME": "test-table", "AWS_REGION": "us-east-1"},
            clear=True,
        ):
            with pytest.raises(ValueError, match="USE_CASE_CONFIG_KEY"):
                validate_environment()

    def test_validate_environment_missing_region(self):
        """Test validation fails when AWS_REGION is missing"""
        with patch.dict(
            os.environ,
            {"USE_CASE_TABLE_NAME": "test-table", "USE_CASE_CONFIG_KEY": "test-key"},
            clear=True,
        ):
            with pytest.raises(ValueError, match="AWS_REGION"):
                validate_environment()


class TestPayloadExtraction:
    """Test payload structure and message extraction"""

    def test_extract_user_message_success(self):
        """Test successful message extraction from payload"""
        payload = {"input": "Hello, how can you help me?"}

        message = extract_user_message(payload)

        assert message == "Hello, how can you help me?"

    def test_extract_user_message_with_whitespace(self):
        """Test message extraction strips whitespace"""
        payload = {"input": "  Hello, world!  "}

        message = extract_user_message(payload)

        assert message == "Hello, world!"

    def test_extract_user_message_missing_input_field(self):
        """Test extraction when input field is missing"""
        payload = {"other_field": "value"}

        message = extract_user_message(payload)

        assert "Please provide your message" in message

    def test_extract_user_message_empty_input(self):
        """Test extraction when input is empty"""
        payload = {"input": ""}

        message = extract_user_message(payload)

        assert "Please provide your message" in message

    def test_extract_user_message_none_input(self):
        """Test extraction when input is None"""
        payload = {"input": None}

        message = extract_user_message(payload)

        assert "Please provide your message" in message

    def test_extract_user_message_invalid_payload_type(self):
        """Test extraction fails with invalid payload type"""
        payload = "not a dictionary"

        with pytest.raises(ValueError, match="Payload must be a dictionary"):
            extract_user_message(payload)


class TestAgentCoreIntegration:
    """Test AgentCore Runtime integration"""

    @patch.dict(os.environ, {
        "USE_CASE_TABLE_NAME": "test-table",
        "USE_CASE_CONFIG_KEY": "test-key", 
        "AWS_REGION": "us-east-1",
        "MEMORY_ID": "test-memory-id"
    })
    @patch("main.WorkflowAgent")
    @patch("main.validate_environment")
    def test_invoke_streaming_mode(self, mock_validate_env, mock_workflow_agent_class):
        """Test invoke function in streaming mode"""
        # Setup mocks
        mock_validate_env.return_value = ("test-table", "test-key", "us-east-1", "test-memory-id", "")

        # Mock workflow agent instance
        mock_agent_instance = Mock()
        mock_client_agent = Mock()
        mock_config = Mock()

        # Configure streaming mode
        mock_config.llm_params.streaming = True
        mock_config.use_case_name = "Test Workflow"
        mock_config.llm_params.bedrock_llm_params.model_id = "amazon.nova-pro-v1:0"

        mock_agent_instance.get_agent.return_value = mock_client_agent
        mock_agent_instance.get_config.return_value = mock_config
        mock_workflow_agent_class.return_value = mock_agent_instance

        # Mock RuntimeStreaming
        with patch("main.RuntimeStreaming") as mock_streaming:
            # Create mock generator
            def mock_stream_response(*args, **kwargs):
                yield {"type": "content", "text": "Hello"}
                yield {"type": "content", "text": " world"}
                yield {"type": "completion"}

            mock_streaming.stream_response.return_value = mock_stream_response()

            # Test payload
            payload = {"input": "Test message"}

            # Invoke
            result = invoke(payload)

            # Verify it returns a generator
            assert hasattr(result, "__iter__")

            # Consume generator and verify chunks
            chunks = list(result)
            assert len(chunks) == 3
            assert chunks[0]["type"] == "content"
            assert chunks[0]["text"] == "Hello"
            assert chunks[1]["type"] == "content"
            assert chunks[1]["text"] == " world"
            assert chunks[2]["type"] == "completion"

            # Verify RuntimeStreaming was called correctly
            mock_streaming.stream_response.assert_called_once()
            call_args = mock_streaming.stream_response.call_args
            assert call_args[0][0] == mock_client_agent
            assert call_args[0][1] == "Test message"
            assert call_args[0][2] == mock_config

    @patch.dict(os.environ, {
        "USE_CASE_TABLE_NAME": "test-table",
        "USE_CASE_CONFIG_KEY": "test-key", 
        "AWS_REGION": "us-east-1",
        "MEMORY_ID": "test-memory-id"
    })
    @patch("main.WorkflowAgent")
    @patch("main.validate_environment")
    def test_invoke_non_streaming_mode(self, mock_validate_env, mock_workflow_agent_class):
        """Test invoke function in non-streaming mode"""
        # Reset singleton
        main._workflow_agent = None

        # Setup mocks
        mock_validate_env.return_value = ("test-table", "test-key", "us-east-1", "test-memory-id", "")

        # Mock workflow agent instance
        mock_agent_instance = Mock()
        mock_client_agent = Mock()
        mock_config = Mock()

        # Configure non-streaming mode
        mock_config.llm_params.streaming = False
        mock_config.use_case_name = "Test Workflow"
        mock_config.llm_params.bedrock_llm_params.model_id = "amazon.nova-pro-v1:0"

        # Mock agent response
        mock_client_agent.return_value = "This is the complete response"

        mock_agent_instance.get_agent.return_value = mock_client_agent
        mock_agent_instance.get_config.return_value = mock_config
        mock_workflow_agent_class.return_value = mock_agent_instance

        # Test payload
        payload = {"input": "Test message"}

        # Invoke
        result = invoke(payload)

        # Verify response structure
        assert isinstance(result, dict)
        assert result["result"] == "This is the complete response"
        assert result["agent_name"] == "Test Workflow"
        assert result["model_id"] == "amazon.nova-pro-v1:0"

        # Verify agent was called
        mock_client_agent.assert_called_once_with("Test message")

    @patch.dict(os.environ, {
        "USE_CASE_TABLE_NAME": "test-table",
        "USE_CASE_CONFIG_KEY": "test-key", 
        "AWS_REGION": "us-east-1",
        "MEMORY_ID": "test-memory-id"
    })
    @patch("main.WorkflowAgent")
    @patch("main.validate_environment")
    def test_invoke_error_handling(self, mock_validate_env, mock_workflow_agent_class):
        """Test invoke function error handling"""
        # Reset singleton
        main._workflow_agent = None

        # Setup mocks
        mock_validate_env.return_value = ("test-table", "test-key", "us-east-1", "test-memory-id", "")

        # Mock workflow agent to raise error
        mock_workflow_agent_class.side_effect = RuntimeError("Agent initialization failed")

        # Test payload
        payload = {"input": "Test message"}

        # Invoke
        result = invoke(payload)

        # Verify error response
        assert isinstance(result, dict)
        assert "error" in result
        assert "message" in result
        assert "Agent execution failed" in result["error"]
        assert "Agent initialization failed" in result["message"]

    @patch("main.WorkflowAgent")
    @patch("main.validate_environment")
    def test_invoke_validation_error(self, mock_validate_env, mock_workflow_agent_class):
        """Test invoke function with validation error"""
        # Reset singleton
        main._workflow_agent = None

        # Setup mocks
        mock_validate_env.return_value = ("test-table", "test-key", "us-east-1", "test-memory-id", "")

        # Mock workflow agent to raise ValueError
        mock_workflow_agent_class.side_effect = ValueError("Invalid configuration")

        # Test payload
        payload = {"input": "Test message"}

        # Invoke
        result = invoke(payload)

        # Verify error response
        assert isinstance(result, dict)
        assert "error" in result
        assert "message" in result
        assert "Invalid configuration" in result["error"]


class TestStreamingResponseFormat:
    """Test streaming response format compatibility"""

    @patch.dict(os.environ, {
        "USE_CASE_TABLE_NAME": "test-table",
        "USE_CASE_CONFIG_KEY": "test-key", 
        "AWS_REGION": "us-east-1",
        "MEMORY_ID": "test-memory-id"
    })
    @patch("main.WorkflowAgent")
    @patch("main.validate_environment")
    def test_streaming_content_chunk_format(self, mock_validate_env, mock_workflow_agent_class):
        """Test content chunk format matches AgentCore expectations"""
        # Setup mocks
        mock_validate_env.return_value = ("test-table", "test-key", "us-east-1", "test-memory-id", "")

        mock_agent_instance = Mock()
        mock_client_agent = Mock()
        mock_config = Mock()

        mock_config.llm_params.streaming = True
        mock_config.use_case_name = "Test Workflow"
        mock_config.llm_params.bedrock_llm_params.model_id = "amazon.nova-pro-v1:0"

        mock_agent_instance.get_agent.return_value = mock_client_agent
        mock_agent_instance.get_config.return_value = mock_config
        mock_workflow_agent_class.return_value = mock_agent_instance

        with patch("main.RuntimeStreaming") as mock_streaming:

            def mock_stream_response(*args, **kwargs):
                yield {
                    "type": "content",
                    "text": "Test response",
                    "agent_name": "Test Workflow",
                    "model_id": "amazon.nova-pro-v1:0",
                }

            mock_streaming.stream_response.return_value = mock_stream_response()

            payload = {"input": "Test message"}
            result = invoke(payload)
            chunks = list(result)

            # Verify chunk structure
            assert len(chunks) == 1
            chunk = chunks[0]
            assert chunk["type"] == "content"
            assert chunk["text"] == "Test response"
            assert chunk["agent_name"] == "Test Workflow"
            assert chunk["model_id"] == "amazon.nova-pro-v1:0"

    @patch.dict(os.environ, {
        "USE_CASE_TABLE_NAME": "test-table",
        "USE_CASE_CONFIG_KEY": "test-key", 
        "AWS_REGION": "us-east-1",
        "MEMORY_ID": "test-memory-id"
    })
    @patch("main.WorkflowAgent")
    @patch("main.validate_environment")
    def test_streaming_tool_use_chunk_format(self, mock_validate_env, mock_workflow_agent_class):
        """Test tool usage chunk format matches AgentCore expectations"""
        # Setup mocks
        mock_validate_env.return_value = ("test-table", "test-key", "us-east-1", "test-memory-id", "")

        mock_agent_instance = Mock()
        mock_client_agent = Mock()
        mock_config = Mock()

        mock_config.llm_params.streaming = True
        mock_config.use_case_name = "Test Workflow"
        mock_config.llm_params.bedrock_llm_params.model_id = "amazon.nova-pro-v1:0"

        mock_agent_instance.get_agent.return_value = mock_client_agent
        mock_agent_instance.get_config.return_value = mock_config
        mock_workflow_agent_class.return_value = mock_agent_instance

        with patch("main.RuntimeStreaming") as mock_streaming:

            def mock_stream_response(*args, **kwargs):
                yield {
                    "type": "tool_use",
                    "toolUsage": {
                        "toolName": "SpecializedAgent",
                        "status": "started",
                        "startTime": "2024-01-01T00:00:00Z",
                    },
                }
                yield {
                    "type": "tool_use",
                    "toolUsage": {
                        "toolName": "SpecializedAgent",
                        "status": "completed",
                        "startTime": "2024-01-01T00:00:00Z",
                        "endTime": "2024-01-01T00:00:01Z",
                        "toolOutput": "Result",
                    },
                }

            mock_streaming.stream_response.return_value = mock_stream_response()

            payload = {"input": "Test message"}
            result = invoke(payload)
            chunks = list(result)

            # Verify tool usage chunks
            assert len(chunks) == 2

            # Started chunk
            assert chunks[0]["type"] == "tool_use"
            assert "toolUsage" in chunks[0]
            assert chunks[0]["toolUsage"]["toolName"] == "SpecializedAgent"
            assert chunks[0]["toolUsage"]["status"] == "started"

            # Completed chunk
            assert chunks[1]["type"] == "tool_use"
            assert chunks[1]["toolUsage"]["status"] == "completed"
            assert "toolOutput" in chunks[1]["toolUsage"]

    @patch.dict(os.environ, {
        "USE_CASE_TABLE_NAME": "test-table",
        "USE_CASE_CONFIG_KEY": "test-key", 
        "AWS_REGION": "us-east-1",
        "MEMORY_ID": "test-memory-id"
    })
    @patch("main.WorkflowAgent")
    @patch("main.validate_environment")
    def test_streaming_completion_chunk_format(self, mock_validate_env, mock_workflow_agent_class):
        """Test completion chunk format matches AgentCore expectations"""
        # Setup mocks
        mock_validate_env.return_value = ("test-table", "test-key", "us-east-1", "test-memory-id", "")

        mock_agent_instance = Mock()
        mock_client_agent = Mock()
        mock_config = Mock()

        mock_config.llm_params.streaming = True
        mock_config.use_case_name = "Test Workflow"
        mock_config.llm_params.bedrock_llm_params.model_id = "amazon.nova-pro-v1:0"

        mock_agent_instance.get_agent.return_value = mock_client_agent
        mock_agent_instance.get_config.return_value = mock_config
        mock_workflow_agent_class.return_value = mock_agent_instance

        with patch("main.RuntimeStreaming") as mock_streaming:

            def mock_stream_response(*args, **kwargs):
                yield {
                    "type": "completion",
                    "agent_name": "Test Workflow",
                    "model_id": "amazon.nova-pro-v1:0",
                }

            mock_streaming.stream_response.return_value = mock_stream_response()

            payload = {"input": "Test message"}
            result = invoke(payload)
            chunks = list(result)

            # Verify completion chunk
            assert len(chunks) == 1
            chunk = chunks[0]
            assert chunk["type"] == "completion"
            assert chunk["agent_name"] == "Test Workflow"
            assert chunk["model_id"] == "amazon.nova-pro-v1:0"


class TestSingletonPattern:
    """Test singleton pattern for agent instance"""

    @patch.dict(os.environ, {
        "USE_CASE_TABLE_NAME": "test-table",
        "USE_CASE_CONFIG_KEY": "test-key", 
        "AWS_REGION": "us-east-1",
        "MEMORY_ID": "test-memory-id"
    })
    @patch("main.WorkflowAgent")
    @patch("main.validate_environment")
    def test_agent_instance_singleton(self, mock_validate_env, mock_workflow_agent_class):
        """Test that get_agent_instance returns the same instance"""
        # Setup mocks
        mock_validate_env.return_value = ("test-table", "test-key", "us-east-1", "test-memory-id", "")

        # Reset singleton
        main._workflow_agent = None

        # Get instance twice
        instance1 = get_agent_instance()
        instance2 = get_agent_instance()

        # Verify same instance
        assert instance1 is instance2

        # Verify WorkflowAgent was only instantiated once
        assert mock_workflow_agent_class.call_count == 1


class TestMultimodalIntegration:
    """Test multimodal functionality integration with AgentCore Runtime"""

    @patch("main.WorkflowAgent")
    @patch("main.validate_environment")
    @patch("main.MultimodalRequestProcessor")
    def test_invoke_with_multimodal_enabled_and_files(
        self, mock_multimodal_processor_class, mock_validate_env, mock_workflow_agent_class
    ):
        """Test invoke function with multimodal enabled and files present"""
        # Reset singleton
        main._workflow_agent = None

        mock_validate_env.return_value = ("test-table", "test-key", "us-east-1", "test-memory-id", "")

        mock_agent_instance = Mock()
        mock_client_agent = Mock()
        mock_config = Mock()

        mock_config.llm_params.streaming = False
        mock_config.use_case_name = "Test Workflow"
        mock_config.llm_params.bedrock_llm_params.model_id = "amazon.nova-pro-v1:0"

        mock_client_agent.return_value = "Analyzed the image successfully"

        mock_agent_instance.get_agent.return_value = mock_client_agent
        mock_agent_instance.get_config.return_value = mock_config
        mock_workflow_agent_class.return_value = mock_agent_instance

        # Multimodal processor setup - return content blocks instead of string
        mock_processor = Mock()
        mock_processor.has_files.return_value = True
        mock_processor.is_multimodal_enabled.return_value = True
        content_blocks = [
            {"text": "Analyze this image"},
            {
                "text": "File available for reading: test.jpg with S3 key 'usecase/user/conv/msg/file1'"
            },
        ]
        mock_processor.process_multimodal_request.return_value = content_blocks
        mock_multimodal_processor_class.return_value = mock_processor

        payload = {
            "input": "Analyze this image",
            "files": [{"name": "test.jpg", "content": "base64content"}],
        }

        result = invoke(payload)

        mock_processor.has_files.assert_called_once_with(payload)
        mock_processor.is_multimodal_enabled.assert_called_once_with(mock_config)
        mock_processor.process_multimodal_request.assert_called_once_with(payload)

        # Verify agent was called with content blocks, not string
        mock_client_agent.assert_called_once_with(content_blocks)

        assert isinstance(result, dict)
        assert result["result"] == "Analyzed the image successfully"
        assert result["agent_name"] == "Test Workflow"
        assert result["model_id"] == "amazon.nova-pro-v1:0"

    @patch("main.WorkflowAgent")
    @patch("main.validate_environment")
    @patch("main.MultimodalRequestProcessor")
    @patch("main.extract_user_message")
    def test_invoke_with_multimodal_disabled_and_files(
        self,
        mock_extract_user_message,
        mock_multimodal_processor_class,
        mock_validate_env,
        mock_workflow_agent_class,
    ):
        """Test invoke function with multimodal disabled but files present"""
        # Reset singleton
        main._workflow_agent = None

        mock_validate_env.return_value = ("test-table", "test-key", "us-east-1", "test-memory-id", "")

        mock_agent_instance = Mock()
        mock_client_agent = Mock()
        mock_config = Mock()

        mock_config.llm_params.streaming = False
        mock_config.use_case_name = "Test Workflow"
        mock_config.llm_params.bedrock_llm_params.model_id = "amazon.nova-pro-v1:0"

        mock_client_agent.return_value = "Text-only response"

        mock_agent_instance.get_agent.return_value = mock_client_agent
        mock_agent_instance.get_config.return_value = mock_config
        mock_workflow_agent_class.return_value = mock_agent_instance

        mock_processor = Mock()
        mock_processor.has_files.return_value = True
        mock_processor.is_multimodal_enabled.return_value = False
        mock_multimodal_processor_class.return_value = mock_processor

        mock_extract_user_message.return_value = "Analyze this image"

        payload = {
            "input": "Analyze this image",
            "files": [{"name": "test.jpg", "content": "base64content"}],
        }

        result = invoke(payload)

        mock_processor.has_files.assert_called_once_with(payload)
        mock_processor.is_multimodal_enabled.assert_called_once_with(mock_config)
        mock_processor.process_multimodal_request.assert_not_called()

        mock_extract_user_message.assert_called_once_with(payload)
        mock_client_agent.assert_called_once_with("Analyze this image")

        assert isinstance(result, dict)
        assert result["result"] == "Text-only response"

    @patch("main.WorkflowAgent")
    @patch("main.validate_environment")
    @patch("main.MultimodalRequestProcessor")
    @patch("main.extract_user_message")
    def test_invoke_with_multimodal_enabled_no_files(
        self,
        mock_extract_user_message,
        mock_multimodal_processor_class,
        mock_validate_env,
        mock_workflow_agent_class,
    ):
        """Test invoke function with multimodal enabled but no files present"""
        # Reset singleton
        main._workflow_agent = None

        mock_validate_env.return_value = ("test-table", "test-key", "us-east-1", "test-memory-id", "")

        mock_agent_instance = Mock()
        mock_client_agent = Mock()
        mock_config = Mock()

        mock_config.llm_params.streaming = False
        mock_config.use_case_name = "Test Workflow"
        mock_config.llm_params.bedrock_llm_params.model_id = "amazon.nova-pro-v1:0"

        mock_client_agent.return_value = "Text-only response"

        mock_agent_instance.get_agent.return_value = mock_client_agent
        mock_agent_instance.get_config.return_value = mock_config
        mock_workflow_agent_class.return_value = mock_agent_instance

        mock_processor = Mock()
        mock_processor.has_files.return_value = False
        mock_processor.is_multimodal_enabled.return_value = True
        mock_multimodal_processor_class.return_value = mock_processor

        mock_extract_user_message.return_value = "Hello, how can you help?"

        payload = {"input": "Hello, how can you help?"}

        result = invoke(payload)

        # Verify multimodal processing was checked but not used (no files)
        mock_processor.has_files.assert_called_once_with(payload)
        mock_processor.process_multimodal_request.assert_not_called()

        mock_extract_user_message.assert_called_once_with(payload)
        mock_client_agent.assert_called_once_with("Hello, how can you help?")

        assert isinstance(result, dict)
        assert result["result"] == "Text-only response"

    @patch("main.WorkflowAgent")
    @patch("main.validate_environment")
    @patch("main.MultimodalRequestProcessor")
    def test_invoke_multimodal_streaming_mode(
        self, mock_multimodal_processor_class, mock_validate_env, mock_workflow_agent_class
    ):
        """Test invoke function with multimodal in streaming mode"""
        # Reset singleton
        main._workflow_agent = None

        mock_validate_env.return_value = ("test-table", "test-key", "us-east-1", "test-memory-id", "")

        mock_agent_instance = Mock()
        mock_client_agent = Mock()
        mock_config = Mock()

        mock_config.llm_params.streaming = True
        mock_config.use_case_name = "Test Workflow"
        mock_config.llm_params.bedrock_llm_params.model_id = "amazon.nova-pro-v1:0"

        mock_agent_instance.get_agent.return_value = mock_client_agent
        mock_agent_instance.get_config.return_value = mock_config
        mock_workflow_agent_class.return_value = mock_agent_instance

        mock_processor = Mock()
        mock_processor.has_files.return_value = True
        mock_processor.is_multimodal_enabled.return_value = True
        content_blocks = [
            {"text": "Analyze this image"},
            {
                "text": "File available for reading: test.jpg with S3 key 'usecase/user/conv/msg/file1'"
            },
        ]
        mock_processor.process_multimodal_request.return_value = content_blocks
        mock_multimodal_processor_class.return_value = mock_processor

        # Mock RuntimeStreaming
        with patch("main.RuntimeStreaming") as mock_streaming:

            def mock_stream_response(*args, **kwargs):
                yield {"type": "content", "text": "Analyzing image..."}
                yield {"type": "completion"}

            mock_streaming.stream_response.return_value = mock_stream_response()

            payload = {
                "input": "Analyze this image",
                "files": [{"name": "test.jpg", "content": "base64content"}],
            }

            result = invoke(payload)

            mock_processor.has_files.assert_called_once_with(payload)
            mock_processor.is_multimodal_enabled.assert_called_once_with(mock_config)
            mock_processor.process_multimodal_request.assert_called_once_with(payload)

            # Verify RuntimeStreaming was called with content blocks
            mock_streaming.stream_response.assert_called_once()
            call_args = mock_streaming.stream_response.call_args
            assert call_args[0][0] == mock_client_agent
            assert call_args[0][1] == content_blocks
            assert call_args[0][2] == mock_config

            assert hasattr(result, "__iter__")
            chunks = list(result)
            assert len(chunks) == 2
            assert chunks[0]["type"] == "content"
            assert chunks[1]["type"] == "completion"


class TestFileContentBlockHandling:
    """Test file and content block handling in AgentCore integration"""

    @patch("main.WorkflowAgent")
    @patch("main.validate_environment")
    @patch("main.MultimodalRequestProcessor")
    def test_invoke_with_file_content_blocks(
        self, mock_multimodal_processor_class, mock_validate_env, mock_workflow_agent_class
    ):
        """Test invoke function processes file content blocks correctly"""
        # Reset singleton
        main._workflow_agent = None

        mock_validate_env.return_value = ("test-table", "test-key", "us-east-1", "test-memory-id", "")
        mock_agent_instance = Mock()
        mock_client_agent = Mock()
        mock_config = Mock()

        # Configure non-streaming mode with multimodal enabled
        mock_config.llm_params.streaming = False
        mock_config.use_case_name = "Test Workflow"
        mock_config.llm_params.bedrock_llm_params.model_id = "amazon.nova-pro-v1:0"

        mock_client_agent.return_value = "Successfully processed files and generated response"

        mock_agent_instance.get_agent.return_value = mock_client_agent
        mock_agent_instance.get_config.return_value = mock_config
        mock_workflow_agent_class.return_value = mock_agent_instance

        mock_processor = Mock()
        mock_processor.has_files.return_value = True
        mock_processor.is_multimodal_enabled.return_value = True

        content_blocks = [
            {"text": "Analyze these files"},
            {
                "text": "File available for reading: document.pdf with S3 key 'usecase/user/conv/msg/file1'"
            },
            {
                "text": "File available for reading: data.csv with S3 key 'usecase/user/conv/msg/file2'"
            },
        ]
        mock_processor.process_multimodal_request.return_value = content_blocks
        mock_multimodal_processor_class.return_value = mock_processor

        payload = {
            "input": "Analyze these files",
            "files": [
                {"fileReference": "file-ref-1", "fileName": "document.pdf"},
                {"fileReference": "file-ref-2", "fileName": "data.csv"},
            ],
            "conversationId": "conv-123",
            "messageId": "msg-456",
            "userId": "user-789",
        }

        result = invoke(payload)

        mock_processor.has_files.assert_called_once_with(payload)
        mock_processor.is_multimodal_enabled.assert_called_once_with(mock_config)
        mock_processor.process_multimodal_request.assert_called_once_with(payload)

        mock_client_agent.assert_called_once_with(content_blocks)

        call_args = mock_client_agent.call_args[0][0]  # First positional argument
        assert call_args == [
            {"text": "Analyze these files"},  # User query
            {
                "text": "File available for reading: document.pdf with S3 key 'usecase/user/conv/msg/file1'"
            },
            {
                "text": "File available for reading: data.csv with S3 key 'usecase/user/conv/msg/file2'"
            },
        ]

        assert result == {
            "agent_name": "Test Workflow",
            "model_id": "amazon.nova-pro-v1:0",
            "result": "Successfully processed files and generated response",
        }
