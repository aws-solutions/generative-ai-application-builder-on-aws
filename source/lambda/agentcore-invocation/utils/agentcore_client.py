# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

"""AgentCore client for invoking runtime services."""

import json
import os
import time
from typing import Any, Dict, Iterator, List, Optional

import boto3
from aws_lambda_powertools import Logger, Tracer
from aws_lambda_powertools.metrics import MetricUnit
from botocore.config import Config
from botocore.exceptions import BotoCoreError, ClientError
from utils.constants import AGENT_RUNTIME_ARN_ENV_VAR, FILES_KEY, CloudWatchNamespaces, CloudWatchMetrics
from utils.helper import get_metrics_client

logger = Logger(utc=True)
tracer = Tracer()
metrics = get_metrics_client(CloudWatchNamespaces.AWS_BEDROCK)


class AgentCoreClientError(Exception):
    """Base exception class for AgentCore client errors"""


class AgentCoreInvocationError(AgentCoreClientError):
    """Exception raised when AgentCore invocation fails"""


class AgentCoreConfigurationError(AgentCoreClientError):
    """Exception raised when AgentCore configuration is invalid"""


class AgentCoreClient:
    """
    Client for invoking AgentCore Runtime using boto3.

    This client handles initialization, invocation, and response processing
    for the deployed AgentCore Runtime container.
    """

    def __init__(self):
        """
        Initialize the AgentCore client with runtime ARN from environment variables.

        Raises:
            AgentCoreConfigurationError: If required environment variables are missing
        """
        self.agent_runtime_arn = os.environ.get(AGENT_RUNTIME_ARN_ENV_VAR)

        if not self.agent_runtime_arn:
            error_msg = f"Missing required environment variable: {AGENT_RUNTIME_ARN_ENV_VAR}"
            logger.error(error_msg)
            raise AgentCoreConfigurationError(error_msg)

        try:
            config = Config(
                read_timeout=300,  # 5 minutes for reading response
                connect_timeout=10,  # 10 seconds for initial connection
                retries={"max_attempts": 3, "mode": "standard"},
            )
            self.client = boto3.client("bedrock-agentcore", config=config)
            logger.info(
                f"AgentCore client initialized with runtime ARN: {self.agent_runtime_arn} "
                f"(read_timeout=300s, connect_timeout=10s)"
            )
        except Exception as e:
            error_msg = f"Failed to initialize bedrock-agentcore client: {str(e)}"
            logger.error(error_msg)
            raise AgentCoreConfigurationError(error_msg) from e

    @tracer.capture_method
    def invoke_agent(
        self,
        input_text: str,
        conversation_id: str,
        user_id: str,
        message_id: Optional[str] = None,
        files: Optional[List[Dict[str, Any]]] = None,
    ) -> Iterator[Dict[str, Any]]:
        """
        Invoke the AgentCore Runtime and return streaming response.

        Args:
            input_text: The user input text to send to the agent
            conversation_id: The conversation ID for context
            user_id: The user ID for personalization and access control
            message_id: The message ID for this interaction
            files: List of file references (optional)

        Returns:
            Iterator[Dict[str, Any]]: Streaming chunks from AgentCore

        Raises:
            AgentCoreInvocationError: If the invocation fails
        """
        payload_dict = {
            "conversationId": conversation_id,
            "messageId": message_id or f"msg-{int(time.time() * 1000)}",
            "input": input_text,
            "userId": user_id,
        }

        if files:
            payload_dict[FILES_KEY] = files

        logger.debug(f"Payload extracted from event: {payload_dict}")

        try:
            payload_bytes = json.dumps(payload_dict).encode("utf-8")

            response = self.client.invoke_agent_runtime(
                agentRuntimeArn=self.agent_runtime_arn,
                payload=payload_bytes,
                contentType="application/json",
                accept="application/json",
                runtimeUserId=user_id,
                runtimeSessionId=f"{conversation_id}_{user_id}",
            )

            logger.info(f"AgentCore invocation successful for conversation {conversation_id}")

            return self._process_response(response, conversation_id)

        except (ClientError, BotoCoreError) as e:
            tracer_id = os.getenv("_X_AMZN_TRACE_ID")
            error_msg = f"AgentCore boto3 error during invocation: {str(e)}"
            logger.error(error_msg, xray_trace_id=tracer_id)
            raise AgentCoreInvocationError(error_msg) from e
        except Exception as e:
            tracer_id = os.getenv("_X_AMZN_TRACE_ID")
            error_msg = f"Unexpected error during AgentCore invocation: {str(e)}"
            logger.error(error_msg, xray_trace_id=tracer_id)
            raise AgentCoreInvocationError(error_msg) from e

    def _process_response(self, response: Dict[str, Any], conversation_id: str) -> Iterator[Dict[str, Any]]:
        """
        Process AgentCore Runtime response and yield chunks.

        Supports both streaming (StreamingBody) and complete (dict/string) responses,
        converting them into a uniform chunked iterator interface for consistent handling.

        Args:
            response: Response from AgentCore Runtime (streaming or complete)
            conversation_id: Conversation ID for logging context

        Yields:
            Dict: Response chunks with 'type' and optional 'text' fields
        """
        start_time = time.time()
        logger.info(f"Starting response streaming for conversation {conversation_id}")

        try:
            response_content = response.get("response")

            if not response_content:
                logger.warning(f"No response content to stream for conversation {conversation_id}")
                yield {"type": "completion"}
                return

            if hasattr(response_content, "read"):
                yield from self._process_streaming_response(response_content, conversation_id)
            else:
                yield from self._process_complete_response(response_content, conversation_id)

            yield {"type": "completion"}

            elapsed_time = time.time() - start_time
            logger.info(f"Response streaming completed for conversation {conversation_id} in {elapsed_time:.2f}s")

        except Exception as e:
            logger.error(f"Error during response streaming for conversation {conversation_id}: {str(e)}")
            yield {"type": "error", "error": str(e)}
            yield {"type": "completion"}

    def _process_streaming_response(self, response_content: Any, conversation_id: str) -> Iterator[Dict[str, Any]]:
        """
        Process streaming response from AgentCore Runtime.

        Args:
            response_content: StreamingBody response content
            conversation_id: Conversation ID for logging context

        Yields:
            Dict: Response chunks with 'type' and optional 'text' fields
        """
        logger.info(f"Processing real StreamingBody for conversation {conversation_id}")

        try:
            try:
                yield from self._process_chunked_stream(response_content, conversation_id)
            except TypeError:
                yield from self._process_full_stream(response_content, conversation_id)
        except Exception as e:
            logger.error(f"Error reading StreamingBody for conversation {conversation_id}: {str(e)}")
            yield {"type": "error", "error": str(e)}

    def _process_chunked_stream(self, response_content: Any, conversation_id: str) -> Iterator[Dict[str, Any]]:
        """
        Process streaming response in chunks.

        Args:
            response_content: StreamingBody response content
            conversation_id: Conversation ID for logging context

        Yields:
            Dict: Response chunks with 'type' and optional 'text' fields
        """
        chunk_size = 1024  # Read 1KB at a time
        buffer = ""

        while True:
            chunk_bytes = response_content.read(chunk_size)
            if not chunk_bytes:
                break

            chunk_text = chunk_bytes.decode("utf-8")
            buffer += chunk_text

            lines = buffer.split("\n")
            buffer = lines[-1]

            for line in lines[:-1]:
                yield from self._process_stream_line(line, conversation_id)

        if buffer.strip():
            yield from self._process_stream_line(buffer, conversation_id)

    def _process_stream_line(self, line: str, conversation_id: str) -> Iterator[Dict[str, Any]]:
        """
        Process a single line from the stream.

        Args:
            line: Line content to process
            conversation_id: Conversation ID for logging context

        Yields:
            Dict: Processed chunk if valid JSON
        """
        if not line.strip():
            return

        try:
            line_content = line.strip()
            if line_content.startswith("data: "):
                line_content = line_content[6:]

            chunk_data = json.loads(line_content)
            processed_chunk = self._process_agentcore_chunk(chunk_data, conversation_id)
            if processed_chunk:
                yield processed_chunk
        except json.JSONDecodeError:
            logger.debug(f"Skipping non-JSON line: {line.strip()[:50]}")

    def _process_full_stream(self, response_content: Any, conversation_id: str) -> Iterator[Dict[str, Any]]:
        """
        Process streaming response by reading all at once.

        Args:
            response_content: StreamingBody response content
            conversation_id: Conversation ID for logging context

        Yields:
            Dict: Response chunks with 'type' and optional 'text' fields
        """
        logger.info("StreamingBody doesn't support chunked reading, reading all at once")
        response_text = response_content.read().decode("utf-8")

        try:
            response_data = json.loads(response_text)
            processed_chunk = self._process_agentcore_chunk(response_data, conversation_id)
            if processed_chunk:
                yield processed_chunk
        except json.JSONDecodeError:
            if response_text:
                yield {"text": response_text, "type": "content"}

    def _process_complete_response(self, response_content: Any, conversation_id: str) -> Iterator[Dict[str, Any]]:
        """
        Process complete (non-streaming) response.

        Args:
            response_content: Complete response content
            conversation_id: Conversation ID for logging context

        Yields:
            Dict: Response chunks with 'type' and optional 'text' fields
        """
        logger.info(f"Processing complete response for conversation {conversation_id}")

        if isinstance(response_content, dict):
            yield from self._process_dict_response(response_content, conversation_id)
        elif isinstance(response_content, str):
            yield {"text": response_content, "type": "content"}
        else:
            yield {"text": str(response_content), "type": "content"}

    def _process_dict_response(
        self, response_content: Dict[str, Any], conversation_id: str
    ) -> Iterator[Dict[str, Any]]:
        """
        Process dictionary response content.

        Args:
            response_content: Dictionary response content
            conversation_id: Conversation ID for logging context

        Yields:
            Dict: Response chunks with 'type' and optional 'text' fields
        """
        if response_content.get("type") == "error" or "error" in response_content:
            processed_chunk = self._process_agentcore_chunk(response_content, conversation_id)
            if processed_chunk:
                yield processed_chunk
            yield {"type": "completion"}
            return

        for field in ["result", "text", "content", "message", "output"]:
            if field in response_content and response_content[field]:
                yield {"text": str(response_content[field]), "type": "content"}
                yield {"type": "completion"}
                return

        processed_chunk = self._process_agentcore_chunk(response_content, conversation_id)
        if processed_chunk:
            yield processed_chunk
        yield {"type": "completion"}

    def _process_agentcore_chunk(self, chunk: Dict[str, Any], conversation_id: str) -> Optional[Dict[str, Any]]:
        """
        Process an AgentCore Runtime chunk from the streaming response.

        Args:
            chunk: Raw chunk from the AgentCore Runtime stream
            conversation_id: Conversation ID for logging context

        Returns:
            Processed chunk ready for WebSocket forwarding, or None if chunk should be skipped
        """
        try:
            if isinstance(chunk, dict):
                return self._process_dict_chunk(chunk, conversation_id)
            elif isinstance(chunk, str):
                return {"text": chunk, "type": "content"}
            else:
                logger.debug(f"Unexpected AgentCore chunk type {type(chunk)} for conversation {conversation_id}")
                return None

        except Exception as e:  # pylint: disable=broad-except
            logger.error(
                "Error processing AgentCore chunk for conversation %s: %s",
                conversation_id,
                str(e),
            )
            return None

    def _handle_error_chunk(self, chunk: Dict[str, Any], conversation_id: str) -> Dict[str, Any]:
        """Handle error chunk processing."""
        error_msg = chunk.get("error", chunk.get("message", "Unknown error"))
        logger.error(f"AgentCore error event received for conversation {conversation_id}: {error_msg}")
        return {"type": "error", "error": error_msg, "message": chunk.get("message", error_msg)}

    def _handle_thinking_chunk(self, chunk: Dict[str, Any], conversation_id: str) -> Dict[str, Any]:
        """Handle thinking chunk processing."""
        logger.debug(f"AgentCore thinking event received for conversation {conversation_id}: {chunk['thinking']}")
        return chunk

    def _handle_tool_use_chunk(self, chunk: Dict[str, Any], conversation_id: str) -> Dict[str, Any]:
        """Handle tool usage chunk processing."""
        logger.debug(f"AgentCore tool usage event received for conversation {conversation_id}: {chunk['toolUsage']}")
        return chunk

    def _report_usage_metrics(self, usage_metadata: Dict[str, Any]) -> None:
        """Report token usage metrics to CloudWatch."""
        logger.info(usage_metadata)
        input_tokens = usage_metadata.get("inputTokens", 0)
        output_tokens = usage_metadata.get("outputTokens", 0)
        total_tokens = usage_metadata.get("totalTokens", 0)

        token_metrics = {
            CloudWatchMetrics.LLM_INPUT_TOKEN_COUNT.value: input_tokens,
            CloudWatchMetrics.LLM_OUTPUT_TOKEN_COUNT.value: output_tokens,
            CloudWatchMetrics.LLM_TOTAL_TOKEN_COUNT.value: total_tokens,
        }

        for metric_name, token_count in token_metrics.items():
            if token_count:
                metrics.add_metric(name=metric_name, unit=MetricUnit.Count, value=int(token_count))
        metrics.flush_metrics()

    def _handle_completion_chunk(self, chunk: Dict[str, Any], conversation_id: str) -> Dict[str, Any]:
        """Handle completion chunk processing."""
        logger.debug(f"AgentCore completion event received for conversation {conversation_id}")
        
        if "usage" in chunk:
            self._report_usage_metrics(chunk["usage"])
        else:
            logger.info("Bedrock usage metrics are not provided. Not reporting the metrics")
        
        # Preserve all fields from the completion chunk (including usage metadata)
        completion_chunk = {"type": "completion"}
        for key, value in chunk.items():
            if key != "type" and value is not None:
                completion_chunk[key] = value
        return completion_chunk

    def _process_dict_chunk(self, chunk: Dict[str, Any], conversation_id: str) -> Optional[Dict[str, Any]]:
        """
        Process a dictionary chunk from AgentCore.

        Args:
            chunk: Dictionary chunk from AgentCore
            conversation_id: Conversation ID for logging context

        Returns:
            Processed chunk or None
        """
        # Check for error type FIRST before extracting content
        if chunk.get("type") == "error" or "error" in chunk:
            return self._handle_error_chunk(chunk, conversation_id)

        content_result = self._extract_content_from_chunk(chunk)
        if content_result:
            return content_result

        delta_result = self._extract_delta_from_chunk(chunk)
        if delta_result:
            return delta_result

        if chunk.get("type") == "thinking" and "thinking" in chunk:
            return self._handle_thinking_chunk(chunk, conversation_id)

        if chunk.get("type") == "tool_use" and "toolUsage" in chunk:
            return self._handle_tool_use_chunk(chunk, conversation_id)

        if chunk.get("type") == "completion" or chunk.get("event") == "done":
            return self._handle_completion_chunk(chunk, conversation_id)

        logger.debug(f"Unrecognized AgentCore chunk format for conversation {conversation_id}: {list(chunk.keys())}")
        return None

    def _extract_content_from_chunk(self, chunk: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """
        Extract content from standard chunk fields.

        Args:
            chunk: Dictionary chunk from AgentCore

        Returns:
            Content chunk or None
        """
        for field in ["result", "response", "text", "content", "message"]:
            if field in chunk and chunk[field]:
                return {"text": str(chunk[field]), "type": "content"}
        return None

    def _extract_delta_from_chunk(self, chunk: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """
        Extract delta updates from chunk.

        Args:
            chunk: Dictionary chunk from AgentCore

        Returns:
            Delta content chunk or None
        """
        if "delta" not in chunk:
            return None

        delta = chunk["delta"]
        if isinstance(delta, dict) and "text" in delta:
            return {"text": str(delta["text"]), "type": "content"}
        elif isinstance(delta, str):
            return {"text": delta, "type": "content"}

        return None
