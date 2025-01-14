#!/usr/bin/env python
# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

import json
import os
from typing import Any, Dict

from aws_lambda_powertools import Logger, Metrics, Tracer
from aws_lambda_powertools.utilities.typing import LambdaContext
from custom_config import DEFAULT_APP_NAME

logger = Logger(utc=True)
tracer = Tracer()
metrics = Metrics(namespace=os.environ.get("STACK_NAME", DEFAULT_APP_NAME))


def read_group_mapping(file_path: str) -> Dict:
    """Read group mapping from JSON file

    Args:
        file_path (str): the location of the group mapping file

    Returns:
        Dict: returns a dictionary of group mapping
    """
    try:
        with open(os.path.join(__path__, file_path), "r") as file:
            group_mapping = json.load(file)
    except (FileNotFoundError, json.JSONDecodeError) as e:
        logger.error(f"Error reading group mapping file: {e}")
        group_mapping = {}
    return group_mapping


@metrics.log_metrics(capture_cold_start_metric=True)  # type: ignore
@tracer.capture_lambda_handler
@logger.inject_lambda_context
# fmt: off
def handler(event: Dict[str, Any], context: LambdaContext) -> Dict: # NOSONAR: python:S1172, context object is used internally by powertools decorators
# fmt: on
    """Lambda handler for replacing groups to user. Refer following documentation on the event structure
    https://docs.aws.amazon.com/cognito/latest/developerguide/user-pool-lambda-pre-token-generation.html

    Args:
        event (Dict[str, Any]): event object
        context (LambdaContext): lambda context

    Returns:
        Dict: returns the updated event object
    """
    logger.debug(f"Received following userAttributes {json.dumps(event['request']['userAttributes'])}")
    idp_groups = event["request"]["userAttributes"].get("idp_groups", "")

    group_mapping = read_group_mapping("config/group_mapping.json")

    new_groups = []
    for group in idp_groups.split(","):
        stripped_group = group.strip()
        if stripped_group:
            mapped_groups = group_mapping.get(stripped_group, [stripped_group])
            new_groups.extend(mapped_groups)

    if new_groups:
        event["response"]["claimsAndScopeOverrideDetails"] = {
            "groupOverrideDetails": {"groupsToOverride": new_groups}
        }

    logger.debug(
        f"Updated userAttributes with following groups {json.dumps(event['response'])}"
    )
    return event
