# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

"""
Tests for RuntimeStreaming class
"""

import asyncio
import pytest
from unittest.mock import Mock, AsyncMock, patch
from gaab_strands_common.runtime_streaming import RuntimeStreaming
from gaab_strands_common.tool_wrapper import ToolEventEmitter, ToolUsageEvent


class MockConfig:
    """Mock configuration for testing"""

    def __init__(self):
        self.use_case_name = "TestAgent"
        self.llm_params = Mock()
        self.llm_params.bedrock_llm_params = Mock()
        self.llm_params.bedrock_llm_params.model_id = "test-model-id"


class MockEvent:
    """Mock streaming event"""

    def __init__(self, data):
        self.data = data


class TestExtractEventText:
    """Tests for extract_event_text method"""

    def test_extract_text_from_event_with_data_attribute(self):
        """Test extracting text from event with data attribute"""
        event = MockEvent("Hello world")
        text = RuntimeStreaming.extract_event_text(event)
        assert text == "Hello world"

    def test_extract_text_from_dict_event(self):
        """Test extracting text from dictionary event"""
        event = {"data": "Test message"}
        text = RuntimeStreaming.extract_event_text(event)
        assert text == "Test message"

    def test_extract_text_from_empty_event(self):
        """Test extracting text from empty event"""
        event = MockEvent(None)
        text = RuntimeStreaming.extract_event_text(event)
        assert text == ""

    def test_extract_text_from_event_without_data(self):
        """Test extracting text from event without data"""
        event = {}
        text = RuntimeStreaming.extract_event_text(event)
        assert text == ""

    def test_extract_text_handles_exception(self):
        """Test that exceptions are handled gracefully"""
        event = None
        text = RuntimeStreaming.extract_event_text(event)
        assert text == ""


class TestChunkCreation:
    """Tests for chunk creation methods"""

    def test_create_content_chunk(self):
        """Test creating content chunk"""
        config = MockConfig()
        chunk = RuntimeStreaming._create_content_chunk("Test content", config)

        assert chunk["type"] == "content"
        assert chunk["text"] == "Test content"
        assert chunk["agent_name"] == "TestAgent"
        assert chunk["model_id"] == "test-model-id"

    def test_create_completion_chunk_without_usage(self):
        """Test creating completion chunk without usage metadata"""
        config = MockConfig()
        chunk = RuntimeStreaming._create_completion_chunk(config)

        assert chunk["type"] == "completion"
        assert chunk["agent_name"] == "TestAgent"
        assert chunk["model_id"] == "test-model-id"
        assert "usage" not in chunk

    def test_create_completion_chunk_with_usage(self):
        """Test creating completion chunk with usage metadata"""
        config = MockConfig()
        usage_metadata = {
            "inputTokens": 1453,
            "outputTokens": 271,
            "totalTokens": 1724
        }
        chunk = RuntimeStreaming._create_completion_chunk(config, usage_metadata)

        assert chunk["type"] == "completion"
        assert chunk["agent_name"] == "TestAgent"
        assert chunk["model_id"] == "test-model-id"
        assert chunk["usage"] == usage_metadata
        assert chunk["usage"]["inputTokens"] == 1453
        assert chunk["usage"]["outputTokens"] == 271
        assert chunk["usage"]["totalTokens"] == 1724

    def test_create_error_chunk(self):
        """Test creating error chunk"""
        config = MockConfig()
        error = ValueError("Test error")
        chunk = RuntimeStreaming._create_error_chunk(error, config)

        assert chunk["type"] == "error"
        assert chunk["error"] == "Streaming response failed"
        assert chunk["message"] == "Test error"
        assert chunk["agent_name"] == "TestAgent"
        assert chunk["model_id"] == "test-model-id"


class TestToolEvents:
    """Tests for tool event handling"""

    def test_yield_tool_events(self):
        """Test yielding tool events"""
        ToolEventEmitter.clear()

        # Add test events
        event1 = ToolUsageEvent("tool1", "started", "2024-01-01T00:00:00Z")
        event2 = ToolUsageEvent("tool2", "completed", "2024-01-01T00:00:01Z")
        ToolEventEmitter.emit(event1)
        ToolEventEmitter.emit(event2)

        # Yield events
        chunks = list(RuntimeStreaming._yield_tool_events())

        assert len(chunks) == 2
        assert chunks[0]["type"] == "tool_use"
        assert chunks[0]["toolUsage"]["toolName"] == "tool1"
        assert chunks[1]["toolUsage"]["toolName"] == "tool2"

    def test_yield_tool_events_empty(self):
        """Test yielding when no events exist"""
        ToolEventEmitter.clear()
        chunks = list(RuntimeStreaming._yield_tool_events())
        assert len(chunks) == 0


class TestUsageMetadataExtraction:
    """Tests for usage metadata extraction"""

    def test_extract_usage_from_nested_dict_event(self):
        """Test extracting usage from nested dictionary event"""
        event = {
            "event": {
                "metadata": {
                    "usage": {
                        "inputTokens": 1453,
                        "outputTokens": 271,
                        "totalTokens": 1724
                    }
                }
            }
        }
        usage = RuntimeStreaming._extract_usage_metadata(event)
        assert usage is not None
        assert usage["inputTokens"] == 1453
        assert usage["outputTokens"] == 271
        assert usage["totalTokens"] == 1724

    def test_extract_usage_from_direct_dict_event(self):
        """Test extracting usage from direct dictionary event"""
        event = {
            "metadata": {
                "usage": {
                    "inputTokens": 100,
                    "outputTokens": 50,
                    "totalTokens": 150
                }
            }
        }
        usage = RuntimeStreaming._extract_usage_metadata(event)
        assert usage is not None
        assert usage["inputTokens"] == 100
        assert usage["outputTokens"] == 50
        assert usage["totalTokens"] == 150

    def test_extract_usage_from_event_without_usage(self):
        """Test extracting usage from event without usage metadata"""
        event = {"event": {"metadata": {}}}
        usage = RuntimeStreaming._extract_usage_metadata(event)
        assert usage is None

    def test_extract_usage_from_event_without_metadata(self):
        """Test extracting usage from event without metadata"""
        event = {"event": {}}
        usage = RuntimeStreaming._extract_usage_metadata(event)
        assert usage is None

    def test_extract_usage_from_empty_event(self):
        """Test extracting usage from empty event"""
        event = {}
        usage = RuntimeStreaming._extract_usage_metadata(event)
        assert usage is None

    def test_extract_usage_handles_exception(self):
        """Test that exceptions are handled gracefully"""
        event = None
        usage = RuntimeStreaming._extract_usage_metadata(event)
        assert usage is None

    def test_extract_usage_from_non_dict_event(self):
        """Test extracting usage from non-dictionary event"""
        event = "not a dict"
        usage = RuntimeStreaming._extract_usage_metadata(event)
        assert usage is None


class TestShouldSkipEvent:
    """Tests for event skipping logic"""

    def test_should_skip_empty_event(self):
        """Test skipping empty event"""
        assert RuntimeStreaming._should_skip_event("", "previous") is True

    def test_should_skip_duplicate_event(self):
        """Test skipping duplicate event"""
        assert RuntimeStreaming._should_skip_event("same", "same") is True

    def test_should_not_skip_new_event(self):
        """Test not skipping new event"""
        assert RuntimeStreaming._should_skip_event("new", "old") is False

    def test_should_not_skip_first_event(self):
        """Test not skipping first event"""
        assert RuntimeStreaming._should_skip_event("first", None) is False


class TestStreamResponseAsync:
    """Tests for async streaming"""

    @pytest.mark.asyncio
    async def test_stream_response_async_success(self):
        """Test successful async streaming"""
        config = MockConfig()
        ToolEventEmitter.clear()

        # Mock agent with stream_async
        mock_agent = Mock()

        async def mock_stream():
            yield MockEvent("Hello")
            yield MockEvent("World")

        mock_agent.stream_async = Mock(return_value=mock_stream())

        # Collect chunks
        chunks = []
        async for chunk in RuntimeStreaming.stream_response_async(mock_agent, "test", config):
            chunks.append(chunk)

        # Verify chunks
        content_chunks = [c for c in chunks if c["type"] == "content"]
        completion_chunks = [c for c in chunks if c["type"] == "completion"]

        assert len(content_chunks) == 2
        assert content_chunks[0]["text"] == "Hello"
        assert content_chunks[1]["text"] == "World"
        assert len(completion_chunks) == 1

    @pytest.mark.asyncio
    async def test_stream_response_async_with_tool_events(self):
        """Test async streaming with tool events"""
        config = MockConfig()
        ToolEventEmitter.clear()

        # Mock agent that emits tool events during streaming
        mock_agent = Mock()

        async def mock_stream():
            # Emit tool event during streaming (simulating tool wrapper behavior)
            tool_event = ToolUsageEvent("test_tool", "started", "2024-01-01T00:00:00Z")
            ToolEventEmitter.emit(tool_event)
            yield MockEvent("Response")

        mock_agent.stream_async = Mock(return_value=mock_stream())

        # Collect chunks
        chunks = []
        async for chunk in RuntimeStreaming.stream_response_async(mock_agent, "test", config):
            chunks.append(chunk)

        # Verify tool event was included
        tool_chunks = [c for c in chunks if c["type"] == "tool_use"]
        assert len(tool_chunks) >= 1
        assert tool_chunks[0]["toolUsage"]["toolName"] == "test_tool"

    @pytest.mark.asyncio
    async def test_stream_response_async_handles_error(self):
        """Test async streaming handles errors"""
        config = MockConfig()
        ToolEventEmitter.clear()

        # Mock agent that raises error
        mock_agent = Mock()

        async def mock_stream():
            # Raise error immediately in async generator
            if True:  # Always true, but makes yield reachable for syntax
                raise ValueError("Stream error")
            yield  # Make it a generator (unreachable but needed for syntax)

        mock_agent.stream_async = Mock(return_value=mock_stream())

        # Collect chunks
        chunks = []
        async for chunk in RuntimeStreaming.stream_response_async(mock_agent, "test", config):
            chunks.append(chunk)

        # Verify error chunk
        error_chunks = [c for c in chunks if c["type"] == "error"]
        assert len(error_chunks) == 1
        assert "Stream error" in error_chunks[0]["message"]

    @pytest.mark.asyncio
    async def test_stream_response_async_fallback(self):
        """Test fallback when stream_async not available"""
        config = MockConfig()
        ToolEventEmitter.clear()

        # Mock agent without stream_async
        mock_agent = Mock()
        mock_agent.stream_async = Mock(side_effect=AttributeError("No stream_async"))
        mock_agent.return_value = "Fallback response"

        # Collect chunks
        chunks = []
        async for chunk in RuntimeStreaming.stream_response_async(mock_agent, "test", config):
            chunks.append(chunk)

        # Verify fallback response
        content_chunks = [c for c in chunks if c["type"] == "content"]
        assert len(content_chunks) == 1
        assert content_chunks[0]["text"] == "Fallback response"

    @pytest.mark.asyncio
    async def test_stream_response_async_skips_duplicate_events(self):
        """Test that duplicate events are skipped"""
        config = MockConfig()
        ToolEventEmitter.clear()

        # Mock agent with duplicate events
        mock_agent = Mock()

        async def mock_stream():
            yield MockEvent("Same")
            yield MockEvent("Same")
            yield MockEvent("Different")

        mock_agent.stream_async = Mock(return_value=mock_stream())

        # Collect chunks
        chunks = []
        async for chunk in RuntimeStreaming.stream_response_async(mock_agent, "test", config):
            chunks.append(chunk)

        # Verify only unique content
        content_chunks = [c for c in chunks if c["type"] == "content"]
        assert len(content_chunks) == 2
        assert content_chunks[0]["text"] == "Same"
        assert content_chunks[1]["text"] == "Different"

    @pytest.mark.asyncio
    async def test_stream_response_async_with_usage_metadata(self):
        """Test async streaming captures and includes usage metadata"""
        config = MockConfig()
        ToolEventEmitter.clear()

        # Mock agent with usage metadata event
        mock_agent = Mock()

        async def mock_stream():
            yield MockEvent("Response text")
            # Yield event with usage metadata
            yield {
                "event": {
                    "metadata": {
                        "usage": {
                            "inputTokens": 1453,
                            "outputTokens": 271,
                            "totalTokens": 1724
                        }
                    }
                }
            }

        mock_agent.stream_async = Mock(return_value=mock_stream())

        # Collect chunks
        chunks = []
        async for chunk in RuntimeStreaming.stream_response_async(mock_agent, "test", config):
            chunks.append(chunk)

        # Verify completion chunk includes usage metadata
        completion_chunks = [c for c in chunks if c["type"] == "completion"]
        assert len(completion_chunks) == 1
        assert "usage" in completion_chunks[0]
        assert completion_chunks[0]["usage"]["inputTokens"] == 1453
        assert completion_chunks[0]["usage"]["outputTokens"] == 271
        assert completion_chunks[0]["usage"]["totalTokens"] == 1724

    @pytest.mark.asyncio
    async def test_stream_response_async_without_usage_metadata(self):
        """Test async streaming when no usage metadata is present"""
        config = MockConfig()
        ToolEventEmitter.clear()

        # Mock agent without usage metadata
        mock_agent = Mock()

        async def mock_stream():
            yield MockEvent("Response text")

        mock_agent.stream_async = Mock(return_value=mock_stream())

        # Collect chunks
        chunks = []
        async for chunk in RuntimeStreaming.stream_response_async(mock_agent, "test", config):
            chunks.append(chunk)

        # Verify completion chunk does not include usage metadata
        completion_chunks = [c for c in chunks if c["type"] == "completion"]
        assert len(completion_chunks) == 1
        assert "usage" not in completion_chunks[0]


class TestStreamResponse:
    """Tests for synchronous streaming wrapper"""

    def test_stream_response_sync_wrapper(self):
        """Test synchronous wrapper works"""
        config = MockConfig()
        ToolEventEmitter.clear()

        # Mock agent
        mock_agent = Mock()

        async def mock_stream():
            yield MockEvent("Test")

        mock_agent.stream_async = Mock(return_value=mock_stream())

        # Collect chunks
        chunks = list(RuntimeStreaming.stream_response(mock_agent, "test", config))

        # Verify chunks
        content_chunks = [c for c in chunks if c["type"] == "content"]
        assert len(content_chunks) == 1
        assert content_chunks[0]["text"] == "Test"

    def test_stream_response_handles_empty_stream(self):
        """Test handling empty stream"""
        config = MockConfig()
        ToolEventEmitter.clear()

        # Mock agent with empty stream
        mock_agent = Mock()

        async def mock_stream():
            # Empty generator - no yields
            if False:  # Never true, but makes yield reachable for syntax
                yield  # Make it a generator (unreachable but needed for syntax)
            return

        mock_agent.stream_async = Mock(return_value=mock_stream())

        # Collect chunks
        chunks = list(RuntimeStreaming.stream_response(mock_agent, "test", config))

        # Should still have completion chunk
        completion_chunks = [c for c in chunks if c["type"] == "completion"]
        assert len(completion_chunks) == 1
