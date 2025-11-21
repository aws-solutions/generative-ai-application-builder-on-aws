# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

"""
File utilities for multimodal file processing and WebSocket payload handling
"""
import json
import logging
import os
import time
from typing import Any, Callable, Dict, Optional

from botocore.config import Config

from gaab_strands_common.utils.constants import (
    BOTO_CONFIG,
    RETRY_CONFIG,
    SUPPORTED_DOCUMENT_FORMATS,
    SUPPORTED_IMAGE_FORMATS,
)


def get_file_category_from_extension(extension: str) -> str:
    """
    Get file category from extension (image, document, etc.)

    Args:
        extension: File extension (without dot)

    Returns:
        File category string
    """
    extension = extension.lower()

    # Image types
    if extension in SUPPORTED_IMAGE_FORMATS:
        return "image"

    # Document types
    elif extension in SUPPORTED_DOCUMENT_FORMATS:
        return "document"

    # Default
    return "unknown"


def is_supported_file_type(extension: str) -> bool:
    """
    Check if file extension is supported for multimodal processing

    Args:
        extension: File extension (without dot)

    Returns:
        True if supported, False otherwise
    """
    extension = extension.lower()

    return extension in SUPPORTED_IMAGE_FORMATS or extension in SUPPORTED_DOCUMENT_FORMATS


def extract_user_message(payload: Dict[str, Any]) -> str:
    """
    Extract user message from AgentCore Runtime payload.

    Args:
        payload: Request payload from AgentCore Runtime

    Returns:
        str: User message or error message if invalid

    Raises:
        ValueError: If payload structure is invalid
    """
    if not isinstance(payload, dict):
        raise ValueError(f"Payload must be a dictionary, got {type(payload).__name__}")

    if "input" not in payload:
        return "Please provide your message in the 'input' field of the request payload."

    user_input = payload["input"]

    if user_input is None or (isinstance(user_input, str) and not user_input.strip()):
        return "Please provide your message in the 'input' field of the request payload."

    return str(user_input).strip()


logger = logging.getLogger(__name__)


def create_boto_config(region: str) -> Config:
    """
    Create a Botocore Config object with standard retry settings and user agent.

    This function safely parses the AWS_SDK_USER_AGENT environment variable and
    creates a Config object with retry settings from BOTO_CONFIG constants.

    Args:
        region: AWS region name

    Returns:
        Config: Configured Botocore Config object

    Example:
        >>> config = create_boto_config("us-east-1")
        >>> client = boto3.client('bedrock-runtime', config=config)
    """
    # Parse user agent from environment with safety checks
    user_agent_extra = ""
    try:
        user_agent_json = os.environ.get("AWS_SDK_USER_AGENT", "{}")
        user_agent_config = json.loads(user_agent_json)
        user_agent_extra = user_agent_config.get("user_agent_extra", "")
        if user_agent_extra:
            logger.info(f"Using custom user agent: {user_agent_extra}")
    except json.JSONDecodeError as e:
        logger.warning(f"Invalid AWS_SDK_USER_AGENT format, using default: {e}")
    except Exception as e:
        logger.warning(f"Error parsing AWS_SDK_USER_AGENT, using default: {e}")

    # Create Config object with retry settings from constants
    return Config(
        region_name=region,
        retries={"max_attempts": BOTO_CONFIG["max_attempts"], "mode": BOTO_CONFIG["retry_mode"]},
        user_agent_extra=user_agent_extra,
    )


def build_guardrail_config(bedrock_params) -> Dict[str, str]:
    """
    Build guardrail configuration dictionary from Bedrock parameters.

    Returns guardrail configuration only if both identifier and version are present
    and non-empty. This ensures partial configurations are not passed to BedrockModel.

    Args:
        bedrock_params: BedrockLlmParams object that may contain guardrail fields

    Returns:
        Dictionary with guardrail_id and guardrail_version if both present,
        empty dictionary otherwise

    Example:
        >>> params = BedrockLlmParams(
        ...     ModelId="amazon.nova-pro-v1:0",
        ...     GuardrailIdentifier="abc123",
        ...     GuardrailVersion="1"
        ... )
        >>> config = build_guardrail_config(params)
        >>> print(config)
        {'guardrail_id': 'abc123', 'guardrail_version': '1'}
    """
    if (
        hasattr(bedrock_params, "guardrail_identifier")
        and bedrock_params.guardrail_identifier
        and hasattr(bedrock_params, "guardrail_version")
        and bedrock_params.guardrail_version
    ):
        logger.debug(
            f"Applying guardrail: {bedrock_params.guardrail_identifier} " f"v{bedrock_params.guardrail_version}"
        )
        return {
            "guardrail_id": bedrock_params.guardrail_identifier,
            "guardrail_version": bedrock_params.guardrail_version,
        }
    return {}


def _get_retry_config(max_retries: Optional[int], base_delay: Optional[float], max_delay: Optional[float]) -> tuple:
    """Get retry configuration with defaults from RETRY_CONFIG."""
    if max_retries is None:
        max_retries = RETRY_CONFIG["max_retries"]
    if base_delay is None:
        base_delay = RETRY_CONFIG["initial_delay_ms"] / 1000.0  # Convert ms to seconds
    if max_delay is None:
        max_delay = RETRY_CONFIG["max_delay"]
    return max_retries, base_delay, max_delay


def _calculate_delays(base_delay: float, max_delay: float, max_retries: int) -> list:
    """Calculate exponential backoff delays."""
    back_off_rate = RETRY_CONFIG["back_off_rate"]
    return [min(base_delay * (back_off_rate**i), max_delay) for i in range(max_retries)]


def _should_retry_on_condition(
    result: Any, retry_condition: Optional[Callable], attempt: int, max_retries: int
) -> bool:
    """Check if retry is needed based on result condition."""
    if not retry_condition or not retry_condition(result):
        return False

    if attempt < max_retries:
        return True

    logger.warning("Retry condition still met after %d attempts", max_retries + 1)
    return False


def _handle_retry_condition(
    result: Any, retry_condition: Optional[Callable], attempt: int, max_retries: int, delays: list
) -> Optional[Any]:
    """Handle retry logic based on condition. Returns result if no retry needed, None if should retry."""
    if not _should_retry_on_condition(result, retry_condition, attempt, max_retries):
        if attempt > 0:
            logger.info("Function succeeded on attempt %d", attempt + 1)
        return result

    delay = delays[attempt]
    logger.info("Retry condition met, retrying in %ds (attempt %d/%d)", delay, attempt + 1, max_retries + 1)
    time.sleep(delay)
    return None


def _handle_exception(exception: Exception, attempt: int, max_retries: int, delays: list) -> None:
    """Handle exception with retry logic."""
    if attempt < max_retries:
        delay = delays[attempt]
        logger.warning(f"Attempt {attempt + 1} failed: {exception}. Retrying in {delay}s")
        time.sleep(delay)
    else:
        logger.error(f"All {max_retries + 1} attempts failed. Last error: {exception}")
        raise exception


def retry_with_backoff(
    func: Callable,
    retry_condition: Optional[Callable[[Any], bool]] = None,
    exception_types: tuple = (Exception,),
    max_retries: int = None,
    base_delay: float = None,
    max_delay: float = None,
) -> Any:
    """
    Retry a function with exponential backoff strategy

    Args:
        func: Function to retry (should be a callable with no arguments)
        max_retries: Maximum number of retry attempts (defaults to RETRY_CONFIG)
        base_delay: Base delay in seconds for exponential backoff (defaults to RETRY_CONFIG)
        max_delay: Maximum delay in seconds (defaults to RETRY_CONFIG)
        retry_condition: Optional function that takes the result and returns True if retry is needed
        exception_types: Tuple of exception types to catch and retry on

    Returns:
        Result of the function call

    Raises:
        The last exception encountered if all retries are exhausted
    """
    max_retries, base_delay, max_delay = _get_retry_config(max_retries, base_delay, max_delay)
    delays = _calculate_delays(base_delay, max_delay, max_retries)

    for attempt in range(max_retries + 1):  # +1 for initial attempt
        try:
            result = func()
            handled_result = _handle_retry_condition(result, retry_condition, attempt, max_retries, delays)
            if handled_result is not None:
                return handled_result
            # If None returned, continue to next iteration (retry)
        except exception_types as e:
            _handle_exception(e, attempt, max_retries, delays)
