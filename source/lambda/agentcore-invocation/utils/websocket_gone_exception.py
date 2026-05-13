# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

"""
Custom exception for WebSocket GoneException (HTTP 410) short-circuit.

When post_to_connection() raises a ClientError with error code GoneException,
it means the WebSocket connection is permanently closed.

Handlers raise this exception to signal callers to short-circuit processing
and return SUCCESS to SQS so the message is deleted (not retried).
"""

from botocore.exceptions import ClientError


class WebSocketGoneException(Exception):
    """
    Raised when a WebSocket connection is permanently gone (HTTP 410).

    This exception signals that the connection is dead and all further
    processing should halt immediately. The Lambda handler should catch
    this and return SUCCESS to SQS.
    """

    def __init__(self, connection_id: str, original_error: ClientError = None):
        self.connection_id = connection_id
        self.original_error = original_error
        message = f"WebSocket connection {connection_id} is gone (HTTP 410). Short-circuiting processing."
        super().__init__(message)


def is_gone_exception(error: ClientError) -> bool:
    """
    Check if a ClientError is a GoneException (HTTP 410).

    Args:
        error: The ClientError to check

    Returns:
        True if the error is a GoneException, False otherwise
    """
    return error.response.get("Error", {}).get("Code") == "GoneException"
