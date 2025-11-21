# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

"""
Runtime Streaming - Handles streaming responses for AgentCore Runtime
"""

import asyncio
import logging
import time
from typing import Any, AsyncGenerator, Dict, Optional

from gaab_strands_common.tool_wrapper import ToolEventEmitter

logger = logging.getLogger(__name__)


class RuntimeStreaming:
    """Handles streaming responses for AgentCore Runtime integration"""

    @staticmethod
    def extract_event_text(event) -> str:
        """
        Extract text content from Strands streaming events.

        Args:
            event: Strands streaming event object

        Returns:
            str: Extracted raw text content, or empty string if no text found
        """
        try:
            text = ""

            if hasattr(event, "data") and event.data:
                text = str(event.data)
            elif isinstance(event, dict) and "data" in event and event["data"]:
                text = str(event["data"])
            else:
                return ""

            return text

        except Exception as e:
            logger.warning(f"Error extracting text from event: {e}")
            return ""

    @staticmethod
    def _create_content_chunk(text: str, config) -> Dict[str, Any]:
        """Create content chunk with agent metadata."""
        return {
            "type": "content",
            "text": text,
            "agent_name": config.use_case_name,
            "model_id": config.llm_params.bedrock_llm_params.model_id,
        }

    @staticmethod
    def _create_completion_chunk(config, usage_metadata: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """Create completion signal chunk."""
        completion_chunk = {
            "type": "completion",
            "agent_name": config.use_case_name,
            "model_id": config.llm_params.bedrock_llm_params.model_id,
        }

        # Add usage metadata if available
        if usage_metadata:
            completion_chunk["usage"] = usage_metadata

        return completion_chunk

    @staticmethod
    def _create_error_chunk(error: Exception, config) -> Dict[str, Any]:
        """Create error chunk."""
        return {
            "type": "error",
            "error": "Streaming response failed",
            "message": str(error),
            "agent_name": config.use_case_name,
            "model_id": config.llm_params.bedrock_llm_params.model_id,
        }

    @staticmethod
    def _yield_tool_events():
        """Get and yield tool events from emitter."""
        tool_events = ToolEventEmitter.get_events()
        for tool_event in tool_events:
            tool_chunk = {"type": "tool_use", "toolUsage": tool_event.to_dict()}
            logger.info(f"Emitting tool usage: {tool_event.tool_name} - {tool_event.status}")
            yield tool_chunk

    @staticmethod
    def _should_skip_event(event_text: str, last_event_text: Optional[str]) -> bool:
        """Check if event should be skipped."""
        return not event_text or event_text == last_event_text

    @staticmethod
    async def _handle_stream_fallback(strands_agent, user_message: str, config) -> AsyncGenerator[Dict[str, Any], None]:
        """Handle fallback when stream_async is not supported."""
        logger.warning("Strands agent doesn't support stream_async, falling back to single response")
        response = strands_agent(user_message)
        yield RuntimeStreaming._create_content_chunk(str(response), config)
        yield RuntimeStreaming._create_completion_chunk(config)

    @staticmethod
    def _extract_usage_metadata(event) -> Optional[Dict[str, Any]]:
        """Extract usage metadata from event if present."""
        try:
            # Handle dictionary events (most common case)
            if isinstance(event, dict):
                # Check nested structure: {'event': {'metadata': {'usage': {...}}}}
                if "event" in event and isinstance(event["event"], dict):
                    metadata = event["event"].get("metadata", {})
                    if "usage" in metadata:
                        return metadata["usage"]
                
                # Check direct structure: {'metadata': {'usage': {...}}}
                if "metadata" in event:
                    metadata = event["metadata"]
                    if "usage" in metadata:
                        return metadata["usage"]
            
            return None
        except Exception as e:
            logger.debug(f"Could not extract usage metadata: {e}")
            return None

    @staticmethod
    async def _process_agent_stream(agent_stream, config):
        """Process the agent stream and yield chunks. Returns usage metadata as last item."""
        last_event_text = None
        usage_metadata = None  # Initialize to preserve across loop iterations

        async for event in agent_stream:
            # Yield tool events
            for tool_chunk in RuntimeStreaming._yield_tool_events():
                yield tool_chunk

            # Extract usage metadata if present and preserve it
            event_usage = RuntimeStreaming._extract_usage_metadata(event)
            if event_usage:
                usage_metadata = event_usage  # Keep the last found usage metadata
                logger.info(f"Captured usage metadata: {usage_metadata}")

            # Process content
            event_text = RuntimeStreaming.extract_event_text(event)
            if RuntimeStreaming._should_skip_event(event_text, last_event_text):
                continue

            last_event_text = event_text
            yield RuntimeStreaming._create_content_chunk(event_text, config)

        # Yield remaining tool events
        for tool_chunk in RuntimeStreaming._yield_tool_events():
            yield tool_chunk

        # Yield a special marker with usage metadata (will be None if never found)
        yield {"_usage_metadata": usage_metadata}

    @staticmethod
    async def stream_response_async(strands_agent, user_message: str, config) -> AsyncGenerator[Dict[str, Any], None]:
        """
        Simplified async generator that streams raw response chunks.
        No thinking tag filtering - frontend handles that.
        Tool events are captured via tool wrappers, not stream events.

        Args:
            strands_agent: The configured Strands agent instance
            user_message: User input message
            config: Agent configuration containing metadata

        Yields:
            Dict: Response chunks in AgentCore Runtime expected format
        """
        start_time = time.time()
        ToolEventEmitter.clear()

        try:
            logger.info(f"[RUNTIME_STREAMING] Starting stream for message: {user_message[:100]}...")

            agent_stream = strands_agent.stream_async(user_message)

            usage_metadata = None
            async for chunk in RuntimeStreaming._process_agent_stream(agent_stream, config):
                # Check if this is the usage metadata marker
                if isinstance(chunk, dict) and "_usage_metadata" in chunk:
                    usage_metadata = chunk["_usage_metadata"]
                else:
                    yield chunk

            # Stream completion
            total_elapsed = time.time() - start_time
            logger.info(f"[RUNTIME_STREAMING] Stream complete in {total_elapsed:.3f}s")
            yield RuntimeStreaming._create_completion_chunk(config, usage_metadata)

        except AttributeError:
            async for chunk in RuntimeStreaming._handle_stream_fallback(strands_agent, user_message, config):
                yield chunk

        except Exception as e:
            logger.error(f"Error during async streaming response: {e}")
            yield RuntimeStreaming._create_error_chunk(e, config)

    @staticmethod
    def stream_response(strands_agent, user_message: str, config):
        """
        Synchronous wrapper that runs the async streaming function.

        Args:
            strands_agent: The configured Strands agent instance
            user_message: User input message
            config: Agent configuration containing metadata

        Yields:
            Dict: Response chunks in AgentCore Runtime expected format
        """

        # Run the async generator in a new event loop
        async def _async_wrapper():
            async for chunk in RuntimeStreaming.stream_response_async(strands_agent, user_message, config):
                yield chunk

        # Create and run the async generator
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)

        try:
            async_gen = _async_wrapper()
            while True:
                try:
                    chunk = loop.run_until_complete(async_gen.__anext__())
                    yield chunk
                except StopAsyncIteration:
                    break
        finally:
            loop.close()
