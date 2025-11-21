#!/usr/bin/env python
# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

import json
import re

from aws_lambda_powertools import Logger, Tracer
from cfn_response import send_response
from operations import operation_types
from operations.operation_types import FAILED, RESOURCE, RESOURCE_PROPERTIES, SUCCESS

logger = Logger(utc=True)
tracer = Tracer()


@tracer.capture_method
def verify_env_setup(event):
    if event[RESOURCE_PROPERTIES][RESOURCE] != operation_types.GEN_ECR_REPO_PREFIX:
        err_msg = f"Operation type not available or did not match from the request. Expecting operation type to be {operation_types.GEN_ECR_REPO_PREFIX}"
        logger.error(f"{err_msg}. Here are the resource properties received {json.dumps(event[RESOURCE_PROPERTIES])}")
        raise ValueError(err_msg)

    # Either StackName (for deployment platform) or UseCaseShortId (for standalone) must be provided
    if "StackName" not in event[RESOURCE_PROPERTIES] and "UseCaseShortId" not in event[RESOURCE_PROPERTIES]:
        err_msg = "Missing required property: either StackName or UseCaseShortId must be provided"
        logger.error(f"{err_msg}. Here are the resource properties received {json.dumps(event[RESOURCE_PROPERTIES])}")
        raise ValueError(err_msg)


@tracer.capture_method
def sanitize_and_truncate_prefix(stack_name: str, max_length: int = 30) -> str:
    """
    Sanitize and truncate stack name to create a valid ECR repository prefix.

    ECR repository prefix requirements:
    - Max 30 characters
    - Lowercase alphanumeric characters, hyphens, underscores, and dots only
    - Cannot start or end with special characters

    Args:
        stack_name: The CloudFormation stack name
        max_length: Maximum allowed length (default 30 for ECR)

    Returns:
        Sanitized and truncated repository prefix
    """
    # Convert to lowercase and replace invalid characters with hyphens
    sanitized = re.sub(r"[^a-z0-9._-]", "-", stack_name.lower())

    # Remove leading/trailing special characters
    sanitized = re.sub(r"^[._-]+", "", sanitized)
    sanitized = re.sub(r"[._-]+$", "", sanitized)

    # Ensure it doesn't start with a dot or hyphen (ECR requirement)
    sanitized = re.sub(r"^[.-]", "", sanitized)

    # Truncate to max length
    if len(sanitized) > max_length:
        sanitized = sanitized[:max_length]
        # Ensure it doesn't end with a special character after truncation
        sanitized = re.sub(r"[._-]+$", "", sanitized)

    # If empty after sanitization, use a default
    if not sanitized:
        sanitized = "gaab-default"

    logger.info(f"Sanitized stack name '{stack_name}' to ECR prefix '{sanitized}'")
    return sanitized


@tracer.capture_method
def generate_prefix_from_inputs(event_properties: dict) -> str:
    """
    Generate ECR repository prefix based on provided inputs.

    Args:
        event_properties: Resource properties from CloudFormation event

    Returns:
        Generated ECR repository prefix
    """
    if "UseCaseShortId" in event_properties:
        # For standalone deployments: gaab-agents-{uuid}
        use_case_id = event_properties["UseCaseShortId"]
        prefix = f"gaab-agents-{use_case_id}"
        logger.info(f"Generated UUID-based prefix: {prefix}")
        return sanitize_and_truncate_prefix(prefix)
    elif "StackName" in event_properties:
        # For deployment platform: use stack name directly
        stack_name = event_properties["StackName"]
        logger.info(f"Generated stack name-based prefix from: {stack_name}")
        return sanitize_and_truncate_prefix(stack_name)
    else:
        raise ValueError("Neither StackName nor UseCaseShortId provided")


@tracer.capture_method
def execute(event, context):
    """
    Generate ECR repository prefix from either stack name or use case short ID.

    This operation creates a valid ECR repository prefix that meets AWS ECR naming requirements.
    Supports two modes:
    1. Stack name-based (for deployment platform): Uses CloudFormation stack name
    2. UUID-based (for standalone use cases): Uses gaab-agents-{uuid} format

    For 'Create' events, generates the prefix from the provided inputs.
    For 'Update' and 'Delete' events, returns empty response with 'SUCCESS' status since
    the ECR repository prefix doesn't need to change during stack updates.

    Args:
        event (LambdaEvent): An event object received by the lambda function
        context (LambdaContext): A context object received by the lambda function

    Raises:
        Exception: if there are errors in prefix generation. During the handling of this
        exception it also sends a 'FAILED' status to the AWS CloudFormation service.
    """
    try:
        verify_env_setup(event)

        if event["RequestType"] == "Create":
            ecr_repo_prefix = generate_prefix_from_inputs(event[RESOURCE_PROPERTIES])

            logger.info(f"Generated ECR repository prefix: {ecr_repo_prefix}")
            send_response(event, context, SUCCESS, {"EcrRepoPrefix": ecr_repo_prefix})

        elif event["RequestType"] == "Update" or event["RequestType"] == "Delete":
            logger.info(f"{event['RequestType']} operation is a no-op for ECR repository prefix generation")
            send_response(event, context, SUCCESS, {})

    except Exception as ex:
        logger.error(f"Error occurred when generating ECR repository prefix. Error is {ex}")
        send_response(event, context, FAILED, {}, reason=str(ex))
