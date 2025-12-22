#!/usr/bin/env python
# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

import json
import uuid

import botocore
from aws_lambda_powertools import Logger, Tracer
from cfn_response import send_response
from helper import get_service_resource
from operations import operation_types
from operations.operation_types import FAILED, PHYSICAL_RESOURCE_ID, RESOURCE, RESOURCE_PROPERTIES, SUCCESS

logger = Logger(utc=True)
tracer = Tracer()

# Required keys in the incoming event object
POLICY_TABLE_NAME = "POLICY_TABLE_NAME"
GROUP_NAMES = "GROUP_NAMES"
ALLOWED_API_ARNS = "ALLOWED_API_ARNS"

CUSTOMER_POLICY_SID = "platform-customer-allowed-api-statement"


@tracer.capture_method
def verify_env_setup(event):
    if event[RESOURCE_PROPERTIES][RESOURCE] != operation_types.CUSTOMER_POLICY:
        err_msg = f"Operation type mismatch. Expecting {operation_types.CUSTOMER_POLICY}"
        logger.error(f"{err_msg}. Received resource properties: {json.dumps(event[RESOURCE_PROPERTIES])}")
        raise ValueError(err_msg)

    if event[RESOURCE_PROPERTIES].get(POLICY_TABLE_NAME, None) in ["", None]:
        raise ValueError(f"{POLICY_TABLE_NAME} is required")

    if event[RESOURCE_PROPERTIES].get(GROUP_NAMES, None) in ["", None]:
        raise ValueError(f"{GROUP_NAMES} is required")

    if event[RESOURCE_PROPERTIES].get(ALLOWED_API_ARNS, None) in ["", None]:
        raise ValueError(f"{ALLOWED_API_ARNS} is required")


@tracer.capture_method
def create_or_update_group_policy(table, group_name: str, allowed_arns: list):
    new_policy_statement = {
        "Sid": CUSTOMER_POLICY_SID,
        "Effect": "Allow",
        "Action": "execute-api:Invoke",
        "Resource": allowed_arns,
    }

    existing_policy = {}
    try:
        existing_policy = table.get_item(Key={"group": group_name})["Item"]["policy"]
        # Replace existing statement if present
        replaced = False
        for idx, statement in enumerate(existing_policy.get("Statement", [])):
            if statement.get("Sid") == CUSTOMER_POLICY_SID:
                existing_policy["Statement"][idx] = new_policy_statement
                replaced = True
                break
        if not replaced:
            existing_policy.setdefault("Statement", []).append(new_policy_statement)
    except KeyError:
        existing_policy = {"Version": "2012-10-17", "Statement": [new_policy_statement]}

    table.put_item(Item={"group": group_name, "policy": existing_policy})


@tracer.capture_method
def create(event, context):
    ddb = get_service_resource("dynamodb")
    table = ddb.Table(event[RESOURCE_PROPERTIES][POLICY_TABLE_NAME])
    group_names = event[RESOURCE_PROPERTIES][GROUP_NAMES]
    allowed_arns = event[RESOURCE_PROPERTIES][ALLOWED_API_ARNS]

    if not isinstance(group_names, list) or not isinstance(allowed_arns, list):
        raise ValueError(f"{GROUP_NAMES} and {ALLOWED_API_ARNS} must both be lists")

    try:
        for group_name in group_names:
            create_or_update_group_policy(table, group_name, allowed_arns)
    except botocore.exceptions.ClientError as error:
        logger.error(f"Error occurred when updating customer policies: {error}")
        raise error


@tracer.capture_method
def execute(event, context):
    physical_resource_id = event.get(PHYSICAL_RESOURCE_ID, uuid.uuid4().hex[:8])
    try:
        verify_env_setup(event)
        if event["RequestType"] == "Create" or event["RequestType"] == "Update":
            create(event, context)
        send_response(event, context, SUCCESS, {}, physical_resource_id)
    except Exception as ex:
        logger.error(f"Error occurred when updating customer group policy. Error is {ex}")
        send_response(event, context, FAILED, {}, physical_resource_id=physical_resource_id, reason=str(ex))


