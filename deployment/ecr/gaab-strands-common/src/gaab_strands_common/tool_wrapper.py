# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

"""
Tool Wrapper - Wraps tools to emit usage events for UI tracking
"""

import inspect
import logging
import time
from datetime import datetime, timezone
from functools import wraps
from typing import Any, Callable, Dict

logger = logging.getLogger(__name__)

# Maximum length for tool argument/output strings in logs
MAX_TOOL_ARG_LENGTH = 500
MAX_TOOL_OUTPUT_LENGTH = 500


class ToolUsageEvent:
    """Represents a tool usage event for streaming to UI"""

    def __init__(self, tool_name: str, status: str, start_time: str, **kwargs):
        self.tool_name = tool_name
        self.status = status
        self.start_time = start_time
        self.data = kwargs

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for streaming"""
        result = {
            "toolName": self.tool_name,
            "status": self.status,
            "startTime": self.start_time,
        }
        result.update(self.data)
        return result


class ToolEventEmitter:
    """
    Singleton class to collect tool usage events during agent execution.
    Events are collected and can be retrieved by the streaming function.
    """

    _instance = None
    _events = []

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._events = []
        return cls._instance

    @classmethod
    def emit(cls, event: ToolUsageEvent):
        """Emit a tool usage event"""
        cls._events.append(event)
        logger.info(f"[TOOL_EVENT] Emitted: {event.tool_name} - {event.status}")

    @classmethod
    def get_events(cls):
        """Get all events and clear the queue"""
        events = cls._events.copy()
        cls._events.clear()
        return events

    @classmethod
    def clear(cls):
        """Clear all events"""
        cls._events.clear()


def _get_tool_name(tool: Any) -> str:
    """Extract tool name from tool object."""
    # For DecoratedFunctionTool (from @tool decorator)
    if hasattr(tool, "tool_name"):
        return str(tool.tool_name)
    # For regular tools with name attribute
    if hasattr(tool, "name"):
        return str(tool.name)
    # For plain functions
    if hasattr(tool, "__name__"):
        return str(tool.__name__)
    # For wrapped functions
    if hasattr(tool, "func") and hasattr(tool.func, "__name__"):
        return str(tool.func.__name__)
    return tool.__class__.__name__


def _extract_tool_name_from_args(args: tuple, fallback_name: str) -> str:
    """Try to extract tool name from the first argument if it contains a 'name' field."""
    if not args:
        return fallback_name

    first_arg = args[0]
    if hasattr(first_arg, "name"):
        return str(first_arg.name)
    if isinstance(first_arg, dict) and "name" in first_arg:
        return str(first_arg["name"])
    return fallback_name


def _get_mcp_server_name(tool: Any) -> str | None:
    """Extract MCP server name from tool metadata."""
    if not hasattr(tool, "metadata") or not isinstance(tool.metadata, dict):
        return None
    return tool.metadata.get("mcp_server") or tool.metadata.get("server_name")


def _filter_tool_args(args: tuple) -> list:
    """Filter out agent objects from args."""
    filtered_args = []
    for arg in args:
        arg_str = str(arg)
        if "Agent" not in arg_str or len(arg_str) < 100:
            filtered_args.append(arg_str[:MAX_TOOL_ARG_LENGTH])
    return filtered_args


def _filter_tool_kwargs(kwargs: dict) -> dict:
    """Filter out agent and internal parameters from kwargs."""
    return {
        k: str(v)[:MAX_TOOL_ARG_LENGTH]
        for k, v in kwargs.items()
        if k not in ["agent", "_agent", "self"] and "Agent" not in str(v)
    }


def _build_tool_input(args: tuple, kwargs: dict) -> dict:
    """Build tool input data from args and kwargs."""
    tool_input = {}

    if args:
        filtered_args = _filter_tool_args(args)
        if filtered_args:
            tool_input["args"] = filtered_args

    if kwargs:
        filtered_kwargs = _filter_tool_kwargs(kwargs)
        if filtered_kwargs:
            tool_input["kwargs"] = filtered_kwargs

    return tool_input


def _build_start_event_data(start_time_iso: str, args: tuple, kwargs: dict, mcp_server_name: str | None) -> dict:
    """Build start event data."""
    event_data = {"startTime": start_time_iso}

    tool_input = _build_tool_input(args, kwargs)
    if tool_input:
        event_data["toolInput"] = tool_input

    if mcp_server_name:
        event_data["mcpServerName"] = mcp_server_name

    return event_data


def _build_completion_event_data(start_time_iso: str, end_time_iso: str, mcp_server_name: str | None) -> dict:
    """Build completion event data."""
    event_data = {
        "startTime": start_time_iso,
        "endTime": end_time_iso,
    }
    if mcp_server_name:
        event_data["mcpServerName"] = mcp_server_name
    return event_data


def _build_error_event_data(
    start_time_iso: str, end_time_iso: str, error: Exception, mcp_server_name: str | None
) -> dict:
    """Build error event data."""
    event_data = {
        "startTime": start_time_iso,
        "endTime": end_time_iso,
        "error": str(error)[:MAX_TOOL_OUTPUT_LENGTH],
    }
    if mcp_server_name:
        event_data["mcpServerName"] = mcp_server_name
    return event_data


def _wrap_stream_method(tool: Any, tool_name: str, mcp_server_name: str | None):
    """Wrap the stream method of a tool."""
    original_stream = tool.stream

    @wraps(original_stream)
    async def wrapped_stream(*args, **kwargs):
        emitter = ToolEventEmitter()
        start_time_iso = datetime.now(timezone.utc).isoformat()
        start_time_perf = time.perf_counter()

        actual_tool_name = _extract_tool_name_from_args(args, tool_name)
        start_event_data = _build_start_event_data(start_time_iso, args, kwargs, mcp_server_name)

        start_event = ToolUsageEvent(actual_tool_name, "started", start_time_iso, **start_event_data)
        emitter.emit(start_event)

        try:
            result_chunks = []
            async for chunk in original_stream(*args, **kwargs):
                result_chunks.append(chunk)
                yield chunk

            duration = time.perf_counter() - start_time_perf
            end_time_iso = datetime.now(timezone.utc).isoformat()
            completion_event_data = _build_completion_event_data(start_time_iso, end_time_iso, mcp_server_name)

            completion_event = ToolUsageEvent(actual_tool_name, "completed", start_time_iso, **completion_event_data)
            emitter.emit(completion_event)
            logger.info(f"[TOOL_EXECUTION] {actual_tool_name} completed in {duration:.3f}s")

        except Exception as e:
            duration = time.perf_counter() - start_time_perf
            end_time_iso = datetime.now(timezone.utc).isoformat()
            error_event_data = _build_error_event_data(start_time_iso, end_time_iso, e, mcp_server_name)

            error_event = ToolUsageEvent(actual_tool_name, "failed", start_time_iso, **error_event_data)
            emitter.emit(error_event)
            logger.error(f"[TOOL_EXECUTION] {actual_tool_name} failed after {duration:.3f}s: {e}")
            raise

    tool.stream = wrapped_stream
    logger.debug(f"Wrapped 'stream' method for tool: {tool_name}")


def _wrap_call_method(tool: Any, tool_name: str, mcp_server_name: str | None):
    """Wrap the __call__ method of a tool."""
    original_call = tool.__call__

    @wraps(original_call)
    def wrapped_call(*args, **kwargs):
        actual_tool_name = _extract_tool_name_from_args(args, tool_name)
        return _execute_with_events(
            actual_tool_name,
            mcp_server_name,
            lambda: original_call(*args, **kwargs),
            args,
            kwargs,
        )

    tool.__call__ = wrapped_call
    logger.debug(f"Wrapped '__call__' method for tool: {tool_name}")


def _wrap_invoke_method(tool: Any, tool_name: str, mcp_server_name: str | None):
    """Wrap the invoke method of a tool."""
    original_invoke = tool.invoke

    @wraps(original_invoke)
    def wrapped_invoke(*args, **kwargs):
        actual_tool_name = _extract_tool_name_from_args(args, tool_name)
        return _execute_with_events(
            actual_tool_name,
            mcp_server_name,
            lambda: original_invoke(*args, **kwargs),
            args,
            kwargs,
        )

    tool.invoke = wrapped_invoke
    logger.debug(f"Wrapped 'invoke' method for tool: {tool_name}")


def _wrap_tool_spec_module(tool_module: Any, mcp_server_name: str | None) -> Any:
    """Wrap a TOOL_SPEC module by wrapping its function in place."""
    if not hasattr(tool_module, "TOOL_SPEC"):
        return tool_module

    tool_spec = tool_module.TOOL_SPEC
    if not isinstance(tool_spec, dict) or "name" not in tool_spec:
        return tool_module

    tool_name = tool_spec["name"]

    # Find and wrap the function
    if hasattr(tool_module, tool_name):
        original_func = getattr(tool_module, tool_name)
        if callable(original_func):
            wrapped_func = _wrap_plain_function(original_func, tool_name, mcp_server_name)
            setattr(tool_module, tool_name, wrapped_func)

    return tool_module


def _wrap_plain_function(func: Callable, tool_name: str, mcp_server_name: str | None) -> Callable:
    """Wrap a plain function (TOOL_SPEC pattern) to emit events."""

    @wraps(func)
    def wrapped_function(*args, **kwargs):
        return _execute_with_events(
            tool_name,
            mcp_server_name,
            lambda: func(*args, **kwargs),
            args,
            kwargs,
        )

    return wrapped_function


def _log_unwrappable_tool(tool_name: str, tool: Any):
    """Log warning for tools that cannot be wrapped."""
    methods = [m for m in dir(tool) if not m.startswith("_") and callable(getattr(tool, m, None))]
    logger.warning(
        f"Tool {tool_name} has no stream/__call__/invoke method, cannot wrap. "
        f"Available methods: {', '.join(methods[:10])}"
    )


def wrap_tool_with_events(tool: Any) -> Any:
    """
    Wrap a tool to emit usage events when invoked.

    This wraps the tool's __call__ or invoke method to emit events
    before and after execution.

    Args:
        tool: The tool to wrap (Strands or MCP tool)

    Returns:
        The wrapped tool that emits events
    """
    tool_name = _get_tool_name(tool)
    logger.info(f"Wrapping tool: {tool_name} (type: {type(tool).__name__})")

    mcp_server_name = _get_mcp_server_name(tool)

    if hasattr(tool, "stream") and callable(tool.stream):
        _wrap_stream_method(tool, tool_name, mcp_server_name)
    elif hasattr(tool, "__call__") and callable(tool):
        _wrap_call_method(tool, tool_name, mcp_server_name)
    elif hasattr(tool, "invoke") and callable(tool.invoke):
        _wrap_invoke_method(tool, tool_name, mcp_server_name)
    # For modules with TOOL_SPEC, wrap the function in place
    elif inspect.ismodule(tool) and hasattr(tool, "TOOL_SPEC"):
        return _wrap_tool_spec_module(tool, mcp_server_name)
    # For plain functions, create a wrapper function
    elif inspect.isfunction(tool) or inspect.ismethod(tool):
        return _wrap_plain_function(tool, tool_name, mcp_server_name)
    else:
        _log_unwrappable_tool(tool_name, tool)

    return tool


def _add_tool_output_to_event(event_data: dict, result: Any):
    """Add tool output to event data, truncating if necessary."""
    if result is None:
        return

    result_str = str(result)
    if len(result_str) > MAX_TOOL_OUTPUT_LENGTH:
        event_data["toolOutput"] = result_str[:MAX_TOOL_OUTPUT_LENGTH] + "... (truncated)"
    else:
        event_data["toolOutput"] = result_str


def _emit_start_event(
    emitter: ToolEventEmitter,
    tool_name: str,
    start_time_iso: str,
    args: tuple,
    kwargs: dict,
    mcp_server_name: str | None,
):
    """Emit tool start event."""
    start_event_data = _build_start_event_data(start_time_iso, args, kwargs, mcp_server_name)
    start_event = ToolUsageEvent(tool_name, "started", start_time_iso, **start_event_data)
    emitter.emit(start_event)


def _emit_completion_event(
    emitter: ToolEventEmitter,
    tool_name: str,
    start_time_iso: str,
    end_time_iso: str,
    result: Any,
    mcp_server_name: str | None,
):
    """Emit tool completion event."""
    completion_event_data = _build_completion_event_data(start_time_iso, end_time_iso, mcp_server_name)
    _add_tool_output_to_event(completion_event_data, result)

    completion_event = ToolUsageEvent(tool_name, "completed", start_time_iso, **completion_event_data)
    emitter.emit(completion_event)


def _emit_error_event(
    emitter: ToolEventEmitter,
    tool_name: str,
    start_time_iso: str,
    end_time_iso: str,
    error: Exception,
    mcp_server_name: str | None,
):
    """Emit tool error event."""
    error_event_data = _build_error_event_data(start_time_iso, end_time_iso, error, mcp_server_name)
    error_event = ToolUsageEvent(tool_name, "failed", start_time_iso, **error_event_data)
    emitter.emit(error_event)


def _execute_with_events(tool_name: str, mcp_server_name: str | None, func: Callable, args: tuple, kwargs: dict) -> Any:
    """
    Execute a function with tool usage event emission.

    Args:
        tool_name: Name of the tool
        mcp_server_name: MCP server name if applicable
        func: Function to execute
        args: Positional arguments
        kwargs: Keyword arguments

    Returns:
        Result from the function
    """
    emitter = ToolEventEmitter()
    start_time_iso = datetime.now(timezone.utc).isoformat()
    start_time_perf = time.perf_counter()

    _emit_start_event(emitter, tool_name, start_time_iso, args, kwargs, mcp_server_name)

    try:
        result = func()
        duration = time.perf_counter() - start_time_perf
        end_time_iso = datetime.now(timezone.utc).isoformat()

        _emit_completion_event(emitter, tool_name, start_time_iso, end_time_iso, result, mcp_server_name)
        logger.info(f"[TOOL_EXECUTION] {tool_name} completed in {duration:.3f}s")

        return result

    except Exception as e:
        duration = time.perf_counter() - start_time_perf
        end_time_iso = datetime.now(timezone.utc).isoformat()

        _emit_error_event(emitter, tool_name, start_time_iso, end_time_iso, e, mcp_server_name)
        logger.error(f"[TOOL_EXECUTION] {tool_name} failed after {duration:.3f}s: {e}")

        raise
