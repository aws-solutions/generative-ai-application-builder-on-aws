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

import hashlib
import json

from aws_lambda_powertools import Logger, Tracer
from cfn_response import send_response
from operations import operation_types
from operations.operation_types import FAILED, RESOURCE, RESOURCE_PROPERTIES, SUCCESS
import os

logger = Logger(utc=True)
tracer = Tracer()

STACK_NAME = "STACK_NAME"


@tracer.capture_method
def verify_env_setup(event):
    if event[RESOURCE_PROPERTIES][RESOURCE] != operation_types.GEN_DOMAIN_PREFIX:
        err_msg = f"Operation type not available or did not match from the request. Expecting operation type to be {operation_types.GEN_DOMAIN_PREFIX}"
        logger.error(f"{err_msg}. Here are the resource properties received {json.dumps(event[RESOURCE_PROPERTIES])}")
        raise ValueError(err_msg)


@tracer.capture_method
def execute(event, context):
    """This method is an implementation for the 'GEN_DOMAIN_PREFIX'. The generated domain prefix is used for Cognito.

    Args:
        event (LambdaEvent): An event object received by the lambda function that is passed by AWS services when invoking the function's handler
        context (LambdaContext): A context object received by the lambda function that is passed by AWS services when invoking the function's handler

    Raises:
        Exception: if there are an errors in domain prefix generation. During the handling of this exception it also sends a 'FAILED' status to
        the  AWS Cloudformation service.
    """
    try:
        verify_env_setup(event)
        if event["RequestType"] == "Create":
            sha256 = hashlib.sha256()
            region = os.environ["AWS_REGION"]
            account_id = context.invoked_function_arn.split(":")[4]
            stack_name = event[RESOURCE_PROPERTIES][STACK_NAME]
            parameters = [region, account_id, stack_name]
            for param in parameters:
                sha256.update(param.encode())
            final_hash = sha256.hexdigest()[:63]
            send_response(event, context, SUCCESS, {"DomainPrefix": final_hash})
        elif event["RequestType"] == "Update" or event["RequestType"] == "Delete":
            send_response(event, context, SUCCESS, {})
    except Exception as ex:
        logger.error(f"Error occurred when generating domain prefix. Error is {ex}")
        send_response(event, context, FAILED, {}, reason=str(ex))
