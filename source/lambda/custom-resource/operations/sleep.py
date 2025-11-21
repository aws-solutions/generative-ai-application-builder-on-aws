#!/usr/bin/env python
# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

import json
import uuid
import time

from aws_lambda_powertools import Logger, Tracer
from cfn_response import send_response
from operations import operation_types
from operations.operation_types import FAILED, PHYSICAL_RESOURCE_ID, RESOURCE, RESOURCE_PROPERTIES, SUCCESS

logger = Logger(utc=True)
tracer = Tracer()

# Required keys in the incoming event object
DURATION = "DURATION"
RETURN_EARLY = "RETURN_EARLY"

# other constants
OPERATION_TYPE = operation_types.SLEEP


@tracer.capture_method
def verify_env_setup(event):
    """This method verifies if all the necessary properties are correctly set in the event object as received by the lambda function's handler

    Args:
        event (LambdaEvent): An event received by the lambda function that is passed by AWS services when invoking the function's handler

    Raises:
        ValueError: If any of the properties in the custom resource properties are not set correctly or are not available
    """
    if event[RESOURCE_PROPERTIES][RESOURCE] != OPERATION_TYPE:
        err_msg = f"Operation type not available or did not match from the request. Expecting operation type to be {OPERATION_TYPE}"
        logger.error(f"{err_msg}. Here are the resource properties received {json.dumps(event[RESOURCE_PROPERTIES])}")
        raise ValueError(err_msg)


@tracer.capture_method
def execute(event, context):
    physical_resource_id = event.get(PHYSICAL_RESOURCE_ID, uuid.uuid4().hex[:8])

    try:
        verify_env_setup(event)
        duration = int(event[RESOURCE_PROPERTIES].get(DURATION, "30"))
        return_early = event[RESOURCE_PROPERTIES].get(RETURN_EARLY, 'false').lower() == 'true'
        
        logger.info(f"Sleeping for {duration} seconds")
        logger.info(f"Return early is set to {return_early}")
        if(return_early):
            send_response(event, context, SUCCESS, {}, physical_resource_id)
        
        if event["RequestType"] in ["Create", "Delete"]:
            time.sleep(duration)
        else:
            logger.info(
                f"Operation type not set or cannot be handled. This is a no-op operation. Received operation type is {event['RequestType']}"
            )
        if(not return_early):
            send_response(event, context, SUCCESS, {}, physical_resource_id)
    except Exception as ex:
        logger.error(f"Error occurred when attempting to sleep, passing to avoid blocking CloudFormation. Error is {ex}")
        send_response(event, context, FAILED, {}, physical_resource_id=physical_resource_id, reason=str(ex))
