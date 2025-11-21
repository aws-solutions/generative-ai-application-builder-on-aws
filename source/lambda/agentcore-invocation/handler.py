#!/usr/bin/env python3
# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

import json
import os
import time
from typing import Any, Dict, List

from aws_lambda_powertools import Logger, Tracer
from aws_lambda_powertools.utilities.typing import LambdaContext
from utils import (
    AgentCoreClient,
    AgentCoreClientError,
    AgentCoreConfigurationError,
    AgentCoreInvocationError,
    EventProcessor,
    WebsocketErrorHandler,
    get_keep_alive_manager,
    get_metrics_client,
    get_service_client,
)
from utils.constants import (
    CONNECTION_ID_KEY,
    CONVERSATION_ID_KEY,
    END_CONVERSATION_TOKEN,
    FILES_KEY,
    INPUT_TEXT_KEY,
    LAMBDA_REMAINING_TIME_THRESHOLD_MS,
    MESSAGE_ID_KEY,
    TRACE_ID_ENV_VAR,
    USER_ID_KEY,
    WEBSOCKET_CALLBACK_URL_ENV_VAR,
    CloudWatchNamespaces,
)

logger = Logger(utc=True)
tracer = Tracer()
metrics = get_metrics_client(CloudWatchNamespaces.COLD_STARTS)

WEBSOCKET_CALLBACK_URL = os.environ.get(WEBSOCKET_CALLBACK_URL_ENV_VAR)

# X-Ray trace ID format constants
XRAY_ROOT_PREFIX = "Root="

_agentcore_client = None


def extract_root_trace_id(trace_id: str) -> str:
    """
    Extract the root trace ID from AWS X-Ray trace ID format.

    X-Ray trace IDs come in format: Root=1-xxx-yyy;Parent=zzz;Sampled=0;Lineage=...
    This function extracts just the root portion: 1-xxx-yyy

    Args:
        trace_id: Full X-Ray trace ID string

    Returns:
        Root trace ID (e.g., "1-68f6b98e-7ae43e64d1ed2eb8ad2029c9")
    """
    if not trace_id or trace_id == "unknown":
        return trace_id

    if trace_id.startswith(XRAY_ROOT_PREFIX):
        parts = trace_id.split(";")
        for part in parts:
            if part.startswith(XRAY_ROOT_PREFIX):
                return part.split("=", 1)[1]

    return trace_id


def get_agentcore_client() -> AgentCoreClient:
    """
    Get or create the AgentCore client instance.

    Returns:
        AgentCoreClient: The initialized AgentCore client

    Raises:
        AgentCoreConfigurationError: If client initialization fails
    """
    global _agentcore_client

    if _agentcore_client is None:
        logger.info("Initializing AgentCore client")
        _agentcore_client = AgentCoreClient()
        logger.info("AgentCore client initialized successfully")

    return _agentcore_client


@tracer.capture_lambda_handler
@metrics.log_metrics(capture_cold_start_metric=True)
def lambda_handler(event: Dict[str, Any], context: LambdaContext) -> Dict:
    """
    Lambda handler for AgentCore invocation via SQS.

    Processes SQS messages containing WebSocket requests, invokes the AgentCore Runtime
    using the bedrock-agentcore SDK, and streams responses back to the Chat UI.
    """
    records = event["Records"]
    total_records = len(records)
    logger.debug(f"Total records received in the event: {total_records}")

    processed_records = 0
    batch_item_failures = set()  # Use a set to avoid duplicates
    sqs_batch_response = {}

    index = 0
    while index < len(records):
        record = records[index]

        if context.get_remaining_time_in_millis() < LAMBDA_REMAINING_TIME_THRESHOLD_MS:
            batch_item_failures.update(r["messageId"] for r in records[index:])
            break

        processed_event = EventProcessor(record).process()
        connection_id = processed_event[CONNECTION_ID_KEY]
        conversation_id = processed_event[CONVERSATION_ID_KEY]
        input_text = processed_event[INPUT_TEXT_KEY]
        files = processed_event.get(FILES_KEY, [])
        user_id = processed_event[USER_ID_KEY]
        message_id = processed_event[MESSAGE_ID_KEY]

        try:
            invoke_agent_core(
                connection_id=connection_id,
                conversation_id=conversation_id,
                input_text=input_text,
                user_id=user_id,
                message_id=message_id,
                files=files,
            )

            processed_records += 1
            index += 1  # Move to the next record only if successful
        except Exception as ex:
            tracer_id = os.getenv(TRACE_ID_ENV_VAR)
            logger.error(f"An exception occurred in the processing of AgentCore request: {ex}", xray_trace_id=tracer_id)

            send_error_message(connection_id, conversation_id, message_id)

            while (
                index < len(records)
                and records[index]["messageAttributes"]["connectionId"]["stringValue"] == connection_id
            ):
                batch_item_failures.add(records[index]["messageId"])
                index += 1

    sqs_batch_response["batchItemFailures"] = [{"itemIdentifier": message_id} for message_id in batch_item_failures]
    logger.debug(
        f"Processed {processed_records} out of {total_records} records. SQS Batch Response: {json.dumps(sqs_batch_response)}"
    )
    return sqs_batch_response


def _process_content_chunk(
    chunk: Dict[str, Any],
    connection_id: str,
    conversation_id: str,
    message_id: str,
    chunk_count: int,
    elapsed: float,
) -> None:
    """Process and send content chunk to WebSocket."""
    logger.info(
        f"[HANDLER_STREAMING] Sending content chunk #{chunk_count} to WebSocket at {elapsed:.3f}s: {len(chunk['text'])} chars"
    )
    send_websocket_message(connection_id, conversation_id, chunk["text"], message_id)


def _process_thinking_chunk(
    chunk: Dict[str, Any],
    connection_id: str,
    conversation_id: str,
    message_id: str,
    chunk_count: int,
    elapsed: float,
) -> None:
    """Process and send thinking chunk to WebSocket."""
    thinking_text = chunk["thinking"].get("thinkingMessage", "Processing...")
    tagged_content = f"<thinking>{thinking_text}</thinking>"
    logger.info(f"[HANDLER_STREAMING] Sending thinking chunk #{chunk_count} to WebSocket at {elapsed:.3f}s")
    send_websocket_message(connection_id, conversation_id, tagged_content, message_id)


def _process_tool_use_chunk(
    chunk: Dict[str, Any],
    connection_id: str,
    conversation_id: str,
    message_id: str,
    chunk_count: int,
    elapsed: float,
) -> None:
    """Process and send tool usage chunk to WebSocket."""
    logger.info(f"[HANDLER_TOOL_USE] Received tool_use chunk #{chunk_count} at {elapsed:.3f}s")
    logger.debug(
        f"[HANDLER_TOOL_USE] Tool usage chunk structure: type={chunk.get('type')}, "
        f"toolUsage keys={list(chunk.get('toolUsage', {}).keys())}"
    )
    logger.debug(f"[HANDLER_TOOL_USE] Tool usage data: {json.dumps(chunk.get('toolUsage', {}), default=str)}")

    tool_usage = chunk.get("toolUsage", {})
    if not isinstance(tool_usage, dict):
        logger.error(f"[HANDLER_TOOL_USE] Invalid tool usage structure: expected dict, got {type(tool_usage)}")
        return

    expected_fields = ["toolName", "status", "startTime"]
    missing_fields = [field for field in expected_fields if field not in tool_usage]
    if missing_fields:
        logger.warning(f"[HANDLER_TOOL_USE] Tool usage missing expected fields: {missing_fields}")

    logger.info(
        f"[HANDLER_TOOL_USE] Sending tool usage chunk to WebSocket: "
        f"toolName={tool_usage.get('toolName')}, status={tool_usage.get('status')}"
    )
    send_tool_usage(connection_id, conversation_id, tool_usage, message_id)
    logger.info(f"[HANDLER_TOOL_USE] Successfully sent tool usage chunk #{chunk_count}")


def _process_stream_chunks(
    response_stream,
    connection_id: str,
    conversation_id: str,
    message_id: str,
    keep_alive_manager,
    start_time: float,
) -> tuple:
    """
    Process all chunks from the response stream.

    Returns:
        Tuple of (content_count, thinking_count, tool_count, websocket_count)
    """
    content_chunk_count = 0
    thinking_chunk_count = 0
    tool_chunk_count = 0
    websocket_chunk_count = 0

    for chunk in response_stream:
        keep_alive_manager.update_activity(connection_id)
        chunk_elapsed = time.time() - start_time

        chunk_type = chunk.get("type")

        if chunk_type == "content" and chunk.get("text"):
            content_chunk_count += 1
            websocket_chunk_count += 1
            _process_content_chunk(
                chunk, connection_id, conversation_id, message_id, content_chunk_count, chunk_elapsed
            )

        elif chunk_type == "thinking" and "thinking" in chunk:
            thinking_chunk_count += 1
            websocket_chunk_count += 1
            _process_thinking_chunk(
                chunk, connection_id, conversation_id, message_id, thinking_chunk_count, chunk_elapsed
            )

        elif chunk_type == "tool_use" and "toolUsage" in chunk:
            tool_chunk_count += 1
            websocket_chunk_count += 1
            _process_tool_use_chunk(chunk, connection_id, conversation_id, message_id, tool_chunk_count, chunk_elapsed)

        elif chunk_type == "error":
            error_message = chunk.get("message", chunk.get("error", "An error occurred"))
            logger.error(
                f"[HANDLER_STREAMING] Error chunk received for conversation {conversation_id} at {chunk_elapsed:.3f}s: {error_message}"
            )
            # Raise exception to let top-level handler send error message (matches chat lambda pattern)
            raise AgentCoreInvocationError(f"AgentCore streaming error: {error_message}")

        elif chunk_type == "completion":
            logger.info(
                f"[HANDLER_STREAMING] Response completion received for conversation {conversation_id} at {chunk_elapsed:.3f}s"
            )
            break

        else:
            logger.warning(f"[HANDLER_STREAMING] Unexpected chunk type received: {chunk_type}")

    return content_chunk_count, thinking_chunk_count, tool_chunk_count, websocket_chunk_count


@tracer.capture_method
def invoke_agent_core(
    connection_id: str,
    conversation_id: str,
    input_text: str,
    user_id: str,
    message_id: str,
    files: List[Dict[str, Any]],
) -> None:
    """
    Invoke the AgentCore Runtime with SSE streaming support and stream responses back to the WebSocket connection.

    This function implements the core streaming logic with immediate forwarding of response chunks,
    keep-alive management for long-running tasks, and automatic fallback to non-streaming mode when SSE is unavailable or fails.

    Args:
        connection_id: WebSocket connection ID
        conversation_id: Conversation ID
        input_text: User input text
        user_id: User ID
        message_id: Message ID for response formatting

    Raises:
        AgentCoreClientError: If AgentCore invocation fails
    """
    logger.info(f"Processing AgentCore request for conversation {conversation_id}")

    keep_alive_manager = get_keep_alive_manager(send_websocket_message)
    start_time = time.time()

    try:
        agentcore_client = get_agentcore_client()
        keep_alive_manager.start_keep_alive(connection_id, conversation_id, message_id)

        try:
            response_stream = agentcore_client.invoke_agent(
                input_text=input_text,
                conversation_id=conversation_id,
                user_id=user_id,
                message_id=message_id,
                files=files,
            )

            content_count, thinking_count, tool_count, websocket_count = _process_stream_chunks(
                response_stream, connection_id, conversation_id, message_id, keep_alive_manager, start_time
            )

            websocket_count += 1
            logger.info("[HANDLER_STREAMING] Sending END_CONVERSATION_TOKEN to WebSocket")
            send_websocket_message(connection_id, conversation_id, END_CONVERSATION_TOKEN, message_id)

            total_elapsed = time.time() - start_time
            logger.info(
                f"[HANDLER_STREAMING] Successfully completed AgentCore invocation for conversation {conversation_id}"
            )
            logger.info(
                f"[HANDLER_STREAMING] Total WebSocket chunks sent: {websocket_count} "
                f"(content: {content_count}, thinking: {thinking_count}, tool: {tool_count}) "
                f"in {total_elapsed:.3f}s"
            )

        except AgentCoreInvocationError as invocation_error:
            logger.error(f"AgentCore invocation failed for conversation {conversation_id}: {str(invocation_error)}")
            raise

    except AgentCoreConfigurationError as config_error:
        tracer_id = os.getenv(TRACE_ID_ENV_VAR)
        logger.error(f"AgentCore configuration error: {str(config_error)}", xray_trace_id=tracer_id)
        raise
    except AgentCoreClientError as client_error:
        tracer_id = os.getenv(TRACE_ID_ENV_VAR)
        logger.error(f"AgentCore client error: {str(client_error)}", xray_trace_id=tracer_id)
        raise
    except Exception as e:
        tracer_id = os.getenv(TRACE_ID_ENV_VAR)
        logger.error(f"Unexpected error during AgentCore invocation: {str(e)}", xray_trace_id=tracer_id)
        raise AgentCoreInvocationError(f"Unexpected error during AgentCore invocation: {str(e)}") from e
    finally:
        keep_alive_manager.stop_keep_alive(connection_id)
        logger.info(f"Stopped keep-alive monitoring for connection {connection_id}")


def send_websocket_message(connection_id: str, conversation_id: str, message: str, message_id: str) -> None:
    """
    Send a message to WebSocket connection.

    Args:
        connection_id: WebSocket connection ID
        conversation_id: Conversation ID
        message: Message to send
        message_id: Message ID for response formatting
    """
    try:
        client = get_service_client("apigatewaymanagementapi", endpoint_url=WEBSOCKET_CALLBACK_URL)

        formatted_response = format_response(conversation_id, message_id, data=message)

        client.post_to_connection(ConnectionId=connection_id, Data=formatted_response)

    except Exception as e:
        logger.error(
            f"Error sending WebSocket message to {connection_id}: {str(e)}",
            xray_trace_id=os.environ.get(TRACE_ID_ENV_VAR),
        )
        raise


def send_tool_usage(connection_id: str, conversation_id: str, tool_usage: Dict[str, Any], message_id: str) -> None:
    """
    Send tool usage information to WebSocket connection.

    Expected tool usage structure:
    {
        "toolName": str,           # Required: Name of the tool being used
        "status": str,             # Required: "started", "in_progress", "completed", or "failed"
        "startTime": str,          # Required: ISO timestamp when tool started
        "endTime": str,            # Optional: ISO timestamp when tool completed/failed
        "toolInput": dict,         # Optional: Tool input parameters
        "toolOutput": str,         # Optional: Tool output/result
        "mcpServerName": str,      # Optional: MCP server name if tool is from MCP
        "error": str               # Optional: Error message if status is "failed"
    }

    WebSocket message format:
    {
        "conversationId": str,
        "messageId": str,
        "toolUsage": {
            ... (tool usage object as above)
        }
    }

    Args:
        connection_id: WebSocket connection ID
        conversation_id: Conversation ID
        tool_usage: Tool usage information object
        message_id: Message ID for response formatting
    """
    try:
        # DEBUG: Log before formatting
        logger.debug(f"[SEND_TOOL_USAGE] Preparing to send tool usage for connection {connection_id}")
        logger.debug(f"[SEND_TOOL_USAGE] Tool usage data: {json.dumps(tool_usage, default=str)}")

        # Validate tool usage structure
        if not isinstance(tool_usage, dict):
            logger.error(f"[SEND_TOOL_USAGE] Invalid tool usage type: expected dict, got {type(tool_usage)}")
            return

        # Check for required fields
        required_fields = ["toolName", "status", "startTime"]
        missing_fields = [field for field in required_fields if field not in tool_usage]
        if missing_fields:
            logger.error(
                f"[SEND_TOOL_USAGE] Tool usage missing required fields: {missing_fields}. "
                f"Available fields: {list(tool_usage.keys())}"
            )
            # Continue anyway - frontend should handle gracefully

        client = get_service_client("apigatewaymanagementapi", endpoint_url=WEBSOCKET_CALLBACK_URL)

        formatted_response = format_response(conversation_id, message_id, toolUsage=tool_usage)

        # DEBUG: Log formatted response structure
        logger.debug(f"[SEND_TOOL_USAGE] Formatted WebSocket message: {formatted_response[:500]}")

        # Verify formatted response structure
        try:
            response_dict = json.loads(formatted_response)
            logger.debug(
                f"[SEND_TOOL_USAGE] WebSocket message structure verified: "
                f"conversationId={response_dict.get('conversationId')}, "
                f"messageId={response_dict.get('messageId')}, "
                f"has_toolUsage={'toolUsage' in response_dict}"
            )
        except json.JSONDecodeError as json_err:
            logger.error(f"[SEND_TOOL_USAGE] Failed to parse formatted response as JSON: {json_err}")
            return

        client.post_to_connection(ConnectionId=connection_id, Data=formatted_response)

        logger.info(
            f"[SEND_TOOL_USAGE] Successfully sent tool usage to connection {connection_id}: "
            f"toolName={tool_usage.get('toolName')}, status={tool_usage.get('status')}"
        )

    except Exception as e:
        logger.error(
            f"[SEND_TOOL_USAGE] Error sending tool usage to {connection_id}: {str(e)}",
            xray_trace_id=os.environ.get(TRACE_ID_ENV_VAR),
        )
        logger.error(f"[SEND_TOOL_USAGE] Tool usage data that failed: {json.dumps(tool_usage, default=str)}")
        # Don't raise - tool usage errors shouldn't break the conversation flow
        logger.warning("[SEND_TOOL_USAGE] Continuing conversation despite tool usage send error")


def send_error_message(connection_id: str, conversation_id: str, message_id: str) -> None:
    """
    Send an error message to WebSocket connection using WebsocketErrorHandler.

    Args:
        connection_id: WebSocket connection ID
        conversation_id: Conversation ID
        message_id: Message ID for response formatting
    """
    trace_id = os.environ.get(TRACE_ID_ENV_VAR, "unknown")

    root_trace_id = trace_id
    if trace_id and trace_id.startswith(XRAY_ROOT_PREFIX):
        parts = trace_id.split(";")
        for part in parts:
            if part.startswith(XRAY_ROOT_PREFIX):
                root_trace_id = part.split("=", 1)[1]
                break

    formatted_error_message = f"AgentCore invocation service failed to respond. Please contact your system administrator for support and quote the following trace id: {root_trace_id}"

    error_handler = WebsocketErrorHandler(
        connection_id=connection_id, trace_id=root_trace_id, conversation_id=conversation_id, message_id=message_id
    )
    error_handler.post_token_to_connection(formatted_error_message)


def format_response(conversation_id: str, message_id: str = None, **kwargs: Any) -> str:
    """
    Format the payload following the existing GAAB response formatting patterns.

    Args:
        conversation_id: Conversation ID
        message_id: Message ID (optional, can be None for error responses)
        **kwargs: Additional fields (data, errorMessage, traceId, etc.)

    Returns:
        JSON-formatted string containing the formatted response
    """
    response_dict = {CONVERSATION_ID_KEY: conversation_id, MESSAGE_ID_KEY: message_id}
    response_dict.update(kwargs)
    return json.dumps(response_dict)
