# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

"""
Tests for tool wrapper and event emission
"""

import time
from unittest.mock import AsyncMock, Mock

import pytest
from gaab_strands_common.tool_wrapper import (
    ToolEventEmitter,
    ToolUsageEvent,
    _extract_tool_name_from_args,
    _filter_tool_args,
    _filter_tool_kwargs,
    _get_mcp_server_name,
    _get_tool_name,
    wrap_tool_with_events,
)


class TestToolUsageEvent:
    """Tests for ToolUsageEvent class"""

    def test_create_event(self):
        """Test creating tool usage event"""
        event = ToolUsageEvent("test_tool", "started", "2024-01-01T00:00:00Z", toolInput={"arg": "value"})

        assert event.tool_name == "test_tool"
        assert event.status == "started"
        assert event.start_time == "2024-01-01T00:00:00Z"
        assert event.data["toolInput"] == {"arg": "value"}

    def test_to_dict(self):
        """Test converting event to dictionary"""
        event = ToolUsageEvent(
            "test_tool",
            "completed",
            "2024-01-01T00:00:00Z",
            endTime="2024-01-01T00:00:01Z",
            toolOutput="result",
        )

        event_dict = event.to_dict()

        assert event_dict["toolName"] == "test_tool"
        assert event_dict["status"] == "completed"
        assert event_dict["startTime"] == "2024-01-01T00:00:00Z"
        assert event_dict["endTime"] == "2024-01-01T00:00:01Z"
        assert event_dict["toolOutput"] == "result"


class TestToolEventEmitter:
    """Tests for ToolEventEmitter singleton"""

    def test_emit_event(self):
        """Test emitting events"""
        ToolEventEmitter.clear()

        event = ToolUsageEvent("tool1", "started", "2024-01-01T00:00:00Z")
        ToolEventEmitter.emit(event)

        events = ToolEventEmitter.get_events()
        assert len(events) == 1
        assert events[0].tool_name == "tool1"

    def test_get_events_clears_queue(self):
        """Test that get_events clears the queue"""
        ToolEventEmitter.clear()

        event1 = ToolUsageEvent("tool1", "started", "2024-01-01T00:00:00Z")
        event2 = ToolUsageEvent("tool2", "started", "2024-01-01T00:00:01Z")
        ToolEventEmitter.emit(event1)
        ToolEventEmitter.emit(event2)

        # First get
        events = ToolEventEmitter.get_events()
        assert len(events) == 2

        # Second get should be empty
        events = ToolEventEmitter.get_events()
        assert len(events) == 0

    def test_clear_events(self):
        """Test clearing events"""
        ToolEventEmitter.clear()

        event = ToolUsageEvent("tool1", "started", "2024-01-01T00:00:00Z")
        ToolEventEmitter.emit(event)

        ToolEventEmitter.clear()
        events = ToolEventEmitter.get_events()
        assert len(events) == 0

    def test_singleton_pattern(self):
        """Test that ToolEventEmitter is a singleton"""
        emitter1 = ToolEventEmitter()
        emitter2 = ToolEventEmitter()
        assert emitter1 is emitter2


class TestGetToolName:
    """Tests for _get_tool_name helper"""

    def test_get_name_from_tool_name_attribute(self):
        """Test getting name from tool_name attribute (DecoratedFunctionTool pattern)"""
        tool = Mock()
        tool.tool_name = "decorated_tool"
        tool.name = "fallback_name"  # Should not be used
        assert _get_tool_name(tool) == "decorated_tool"

    def test_get_name_from_name_attribute(self):
        """Test getting name from name attribute (fallback when tool_name not present)"""
        tool = Mock(spec=["name"])  # Only spec 'name' to avoid auto-creating tool_name
        tool.name = "test_tool"
        assert _get_tool_name(tool) == "test_tool"

    def test_get_name_from_function_name(self):
        """Test getting name from __name__ attribute"""

        def test_function():
            """Empty test function for name extraction"""
            pass

        assert _get_tool_name(test_function) == "test_function"

    def test_get_name_from_class_name(self):
        """Test getting name from class name"""

        class TestTool:
            pass

        tool = TestTool()
        assert _get_tool_name(tool) == "TestTool"


class TestExtractToolNameFromArgs:
    """Tests for _extract_tool_name_from_args helper"""

    def test_extract_from_object_with_name(self):
        """Test extracting name from object with name attribute"""
        arg = Mock()
        arg.name = "extracted_name"
        assert _extract_tool_name_from_args((arg,), "fallback") == "extracted_name"

    def test_extract_from_dict_with_name(self):
        """Test extracting name from dict with name key"""
        arg = {"name": "dict_name"}
        assert _extract_tool_name_from_args((arg,), "fallback") == "dict_name"

    def test_fallback_when_no_name(self):
        """Test fallback when no name found"""
        arg = {"other": "value"}
        assert _extract_tool_name_from_args((arg,), "fallback") == "fallback"

    def test_fallback_when_empty_args(self):
        """Test fallback when args are empty"""
        assert _extract_tool_name_from_args((), "fallback") == "fallback"


class TestGetMcpServerName:
    """Tests for _get_mcp_server_name helper"""

    def test_get_mcp_server_name_from_metadata(self):
        """Test getting MCP server name from metadata"""
        tool = Mock()
        tool.metadata = {"mcp_server": "test-mcp-server"}
        assert _get_mcp_server_name(tool) == "test-mcp-server"

    def test_get_server_name_from_metadata(self):
        """Test getting server name from metadata"""
        tool = Mock()
        tool.metadata = {"server_name": "test-server"}
        assert _get_mcp_server_name(tool) == "test-server"

    def test_no_metadata(self):
        """Test when tool has no metadata"""
        tool = Mock(spec=[])
        assert _get_mcp_server_name(tool) is None

    def test_metadata_not_dict(self):
        """Test when metadata is not a dict"""
        tool = Mock()
        tool.metadata = "not a dict"
        assert _get_mcp_server_name(tool) is None


class TestFilterToolArgs:
    """Tests for _filter_tool_args helper"""

    def test_filter_normal_args(self):
        """Test filtering normal arguments"""
        args = ("arg1", "arg2", 123)
        filtered = _filter_tool_args(args)
        assert len(filtered) == 3
        assert "arg1" in filtered

    def test_filter_agent_objects(self):
        """Test filtering out agent objects"""
        agent_str = "Agent" + "x" * 500  # Long string with Agent
        args = ("normal_arg", agent_str)
        filtered = _filter_tool_args(args)
        # Agent string should be filtered out
        assert len(filtered) == 1
        assert filtered[0] == "normal_arg"

    def test_truncate_long_args(self):
        """Test truncating long arguments"""
        long_arg = "x" * 600
        args = (long_arg,)
        filtered = _filter_tool_args(args)
        assert len(filtered[0]) == 500  # MAX_TOOL_ARG_LENGTH


class TestFilterToolKwargs:
    """Tests for _filter_tool_kwargs helper"""

    def test_filter_normal_kwargs(self):
        """Test filtering normal kwargs"""
        kwargs = {"arg1": "value1", "arg2": "value2"}
        filtered = _filter_tool_kwargs(kwargs)
        assert len(filtered) == 2
        assert filtered["arg1"] == "value1"

    def test_filter_internal_params(self):
        """Test filtering internal parameters"""
        kwargs = {"arg1": "value1", "agent": "agent_obj", "_agent": "internal", "self": "self_obj"}
        filtered = _filter_tool_kwargs(kwargs)
        assert len(filtered) == 1
        assert "arg1" in filtered
        assert "agent" not in filtered

    def test_filter_agent_values(self):
        """Test filtering kwargs with Agent in value"""
        kwargs = {"arg1": "value1", "arg2": "Agent object"}
        filtered = _filter_tool_kwargs(kwargs)
        assert "arg1" in filtered
        assert "arg2" not in filtered

    def test_truncate_long_values(self):
        """Test truncating long values"""
        long_value = "x" * 600
        kwargs = {"arg": long_value}
        filtered = _filter_tool_kwargs(kwargs)
        assert len(filtered["arg"]) == 500


class TestWrapToolWithEvents:
    """Tests for wrap_tool_with_events function"""

    def test_wrap_tool_with_call_method(self):
        """Test wrapping tool with __call__ method"""
        ToolEventEmitter.clear()

        # Create a real callable class (Mock doesn't work with __call__ wrapping)
        class CallableTool:
            def __init__(self):
                self.name = "test_tool"
                self.call_count = 0

            def __call__(self, *args, **kwargs):
                self.call_count += 1
                return "result"

        tool = CallableTool()

        # Wrap tool
        wrap_tool_with_events(tool)

        # Call the wrapped __call__ method directly (Python doesn't use instance __call__ for tool())
        result = tool.__call__("arg1", kwarg1="value1")

        # Verify result
        assert result == "result"
        assert tool.call_count == 1

        # Verify events were emitted
        events = ToolEventEmitter.get_events()
        assert len(events) == 2  # started and completed
        assert events[0].status == "started"
        assert events[1].status == "completed"

    def test_wrap_tool_with_invoke_method(self):
        """Test wrapping tool with invoke method"""
        ToolEventEmitter.clear()

        # Create a tool with invoke method
        class InvokableTool:
            def __init__(self):
                self.name = "test_tool"
                self.invoke_count = 0

            def invoke(self, *args, **kwargs):
                self.invoke_count += 1
                return "result"

        tool = InvokableTool()

        # Wrap tool
        wrap_tool_with_events(tool)

        # Call wrapped tool
        result = tool.invoke("arg1")

        # Verify result
        assert result == "result"
        assert tool.invoke_count == 1

        # Verify events
        events = ToolEventEmitter.get_events()
        assert len(events) == 2

    @pytest.mark.asyncio
    async def test_wrap_tool_with_stream_method(self):
        """Test wrapping tool with stream method"""
        ToolEventEmitter.clear()

        # Create tool with async stream
        class StreamTool:
            def __init__(self):
                self.name = "test_tool"

            async def stream(self, *args, **kwargs):
                yield "chunk1"
                yield "chunk2"

        tool = StreamTool()

        # Wrap tool
        wrap_tool_with_events(tool)

        # Call wrapped stream
        chunks = []
        async for chunk in tool.stream("arg1"):
            chunks.append(chunk)

        # Verify chunks
        assert chunks == ["chunk1", "chunk2"]

        # Verify events
        events = ToolEventEmitter.get_events()
        assert len(events) == 2
        assert events[0].status == "started"
        assert events[1].status == "completed"

    def test_wrap_tool_handles_error(self):
        """Test wrapping tool handles errors"""
        ToolEventEmitter.clear()

        # Create a real callable class that raises error
        class ErrorTool:
            def __init__(self):
                self.name = "test_tool"

            def __call__(self, *args, **kwargs):
                raise ValueError("Test error")

        tool = ErrorTool()

        # Wrap tool
        wrap_tool_with_events(tool)

        # Call wrapped __call__ method directly and expect error
        with pytest.raises(ValueError, match="Test error"):
            tool.__call__("arg1")

        # Verify error event was emitted
        events = ToolEventEmitter.get_events()
        assert len(events) == 2
        assert events[0].status == "started"
        assert events[1].status == "failed"
        assert "Test error" in events[1].data["error"]

    def test_wrap_tool_with_mcp_metadata(self):
        """Test wrapping tool with MCP server metadata"""
        ToolEventEmitter.clear()

        # Create a real callable class with MCP metadata
        class MCPTool:
            def __init__(self):
                self.name = "test_tool"
                self.metadata = {"mcp_server": "test-mcp-server"}

            def __call__(self, *args, **kwargs):
                return "result"

        tool = MCPTool()

        # Wrap tool
        wrap_tool_with_events(tool)

        # Call wrapped __call__ method directly
        tool.__call__("arg1")

        # Verify MCP server name in events
        events = ToolEventEmitter.get_events()
        assert events[0].data.get("mcpServerName") == "test-mcp-server"
        assert events[1].data.get("mcpServerName") == "test-mcp-server"

    def test_wrap_tool_without_wrappable_methods(self):
        """Test wrapping tool without wrappable methods"""
        # Create mock tool without call/invoke/stream
        tool = Mock(spec=["some_method"])
        tool.name = "test_tool"

        # Wrap tool - should log warning but not fail
        wrapped_tool = wrap_tool_with_events(tool)
        assert wrapped_tool is tool

    def test_wrap_tool_includes_tool_input(self):
        """Test that tool input is included in events"""
        ToolEventEmitter.clear()

        # Create a real callable class
        class InputTool:
            def __init__(self):
                self.name = "test_tool"

            def __call__(self, *args, **kwargs):
                return "result"

        tool = InputTool()

        # Wrap tool
        wrap_tool_with_events(tool)

        # Call wrapped __call__ method directly with args and kwargs
        tool.__call__("arg1", "arg2", kwarg1="value1")

        # Verify tool input in events
        events = ToolEventEmitter.get_events()
        start_event = events[0]
        assert "toolInput" in start_event.data
        assert "args" in start_event.data["toolInput"]
        assert "kwargs" in start_event.data["toolInput"]

    def test_wrap_tool_includes_tool_output(self):
        """Test that tool output is included in completion event"""
        ToolEventEmitter.clear()

        # Create a real callable class
        class OutputTool:
            def __init__(self):
                self.name = "test_tool"

            def __call__(self, *args, **kwargs):
                return "test output"

        tool = OutputTool()

        # Wrap tool
        wrap_tool_with_events(tool)

        # Call wrapped __call__ method directly
        tool.__call__("arg1")

        # Verify tool output in completion event
        events = ToolEventEmitter.get_events()
        completion_event = events[1]
        assert "toolOutput" in completion_event.data
        assert completion_event.data["toolOutput"] == "test output"

    def test_wrap_tool_truncates_long_output(self):
        """Test that long tool output is truncated"""
        ToolEventEmitter.clear()

        # Create a real callable class with long output
        long_output = "x" * 600

        class LongOutputTool:
            def __init__(self):
                self.name = "test_tool"

            def __call__(self, *args, **kwargs):
                return long_output

        tool = LongOutputTool()

        # Wrap tool
        wrap_tool_with_events(tool)

        # Call wrapped __call__ method directly
        tool.__call__("arg1")

        # Verify output is truncated
        events = ToolEventEmitter.get_events()
        completion_event = events[1]
        assert len(completion_event.data["toolOutput"]) <= 520  # 500 + "... (truncated)"
        assert "truncated" in completion_event.data["toolOutput"]
