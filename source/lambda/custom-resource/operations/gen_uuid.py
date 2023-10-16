#!/usr/bin/env python
######################################################################################################################
#  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.                                                #
#                                                                                                                    #
#  Licensed under the Apache License, Version 2.0 (the "License"). You may not use this file except in compliance    #
#  with the License. A copy of the License is located at                                                             #
#                                                                                                                    #
#      http://www.apache.org/licenses/LICENSE-2.0                                                                    #
#                                                                                                                    #
#  or in the 'license' file accompanying this file. This file is distributed on an 'AS IS' BASIS, WITHOUT WARRANTIES #
#  OR CONDITIONS OF ANY KIND, express or implied. See the License for the specific language governing permissions    #
#  and limitations under the License.                                                                                #
######################################################################################################################

import json
import uuid

from aws_lambda_powertools import Logger, Tracer
from cfn_response import send_response
from operations import operation_types
from operations.operation_types import FAILED, RESOURCE, RESOURCE_PROPERTIES, SUCCESS

logger = Logger(utc=True)
tracer = Tracer()


@tracer.capture_method
def verify_env_setup(event):
    if event[RESOURCE_PROPERTIES][RESOURCE] != operation_types.GEN_UUID:
        err_msg = f"Operation type not available or did not match from the request. Expecting operation type to be {operation_types.GEN_UUID}"
        logger.error(f"{err_msg}. Here are the resource properties received {json.dumps(event[RESOURCE_PROPERTIES])}")
        raise ValueError(err_msg)


@tracer.capture_method
def execute(event, context):
    """This method is an implementation for the 'GEN_UUID'. The generated UUID can be used to append the string to a
    logical resource there by making it unique for a deployment. This operation will only generate an ID for 'Create'
    event. For 'Update' and 'Delete' events, it will return empty response with 'SUCCESS' as the status.

    Args:
        event (LambdaEvent): An event object received by the lambda function that is passed by AWS services when invoking the function's handler
        context (LambdaContext): A context object received by the lambda function that is passed by AWS services when invoking the function's handler

    Raises:
        Exception: if there are an errors in UUID generation. During the handling of this exception it also sends a 'FAILED' status to
        the  AWS Cloudformation service.
    """
    try:
        verify_env_setup(event)

        if event["RequestType"] == "Create":
            gen_uuid = uuid.uuid4().hex[:8]
            send_response(event, context, SUCCESS, {"UUID": gen_uuid})
        elif event["RequestType"] == "Update" or event["RequestType"] == "Delete":
            send_response(event, context, SUCCESS, {})
    except Exception as ex:
        logger.error(f"Error occurred when generating uuid. Error is {ex}")
        send_response(event, context, FAILED, {}, reason=str(ex))
