#!/usr/bin/env python
# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

from aws_lambda_powertools import Logger
from botocore.exceptions import ClientError, EndpointConnectionError, NoCredentialsError
from helper import get_service_client

logger = Logger(utc=True)


def format_error_message(operation: str, error_code: str, error_message: str, context: dict = None) -> str:
    """
    Format a descriptive error message with operation context.

    Args:
        operation: The operation that failed (e.g., "create_agent_runtime")
        error_code: AWS error code
        error_message: AWS error message
        context: Additional context information

    Returns:
        str: Formatted error message with context
    """
    base_message = f"Failed to {operation}: {error_code} - {error_message}"

    if context:
        context_str = ", ".join([f"{k}={v}" for k, v in context.items() if v is not None])
        if context_str:
            base_message += f" (Context: {context_str})"

    return base_message


def handle_client_error(e: ClientError, operation: str, context: dict = None) -> None:
    """
    Handle ClientError with detailed logging and context-aware error messages.

    Args:
        e: ClientError exception
        operation: The operation that failed
        context: Additional context information

    Raises:
        ClientError: Re-raises the original exception with enhanced logging
    """
    error_code = e.response["Error"]["Code"]
    error_message = e.response["Error"]["Message"]
    request_id = e.response.get("ResponseMetadata", {}).get("RequestId", "unknown")

    detailed_message = format_error_message(operation, error_code, error_message, context)

    logger.error(
        f"AWS Service Error in {operation}",
        extra={
            "error_code": error_code,
            "error_message": error_message,
            "request_id": request_id,
            "operation": operation,
            "context": context or {},
            "detailed_message": detailed_message,
        },
    )

    raise e


def validate_event_properties(event):
    """Validate CloudFormation event properties."""
    if "ResourceProperties" not in event:
        raise ValueError("Missing ResourceProperties in CloudFormation event")
    if "RequestType" not in event:
        raise ValueError("Missing RequestType in CloudFormation event")


def initialize_bedrock_client():
    """Initialize bedrock-agentcore client with error handling."""
    try:
        bedrock_agentcore_client = get_service_client("bedrock-agentcore-control")
        logger.info("Initialized bedrock-agentcore-control client")
        return bedrock_agentcore_client
    except NoCredentialsError:
        error_msg = "AWS credentials not found. Ensure Lambda execution role has proper permissions."
        logger.error(error_msg)
        raise ValueError(error_msg)
    except EndpointConnectionError as e:
        error_msg = f"Cannot connect to bedrock-agentcore service: {str(e)}"
        logger.error(error_msg)
        raise ValueError(error_msg)
