#!/usr/bin/env python
# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

from aws_lambda_powertools import Logger
from cfn_response import send_response
from helper import get_service_client
from operations.operation_types import FAILED, RESOURCE, RESOURCE_PROPERTIES, SUCCESS

def verify_env_setup(event):
    """
    Verifies that all required environment variables and resource properties are set
    """
    if event[RESOURCE_PROPERTIES][RESOURCE] != "LAMBDA_VERSION_GENERATOR":
        raise ValueError("Operation type not supported")
    
    if not event[RESOURCE_PROPERTIES].get("FunctionName"):
        raise ValueError("FunctionName has not been passed")


def execute(event, context):
    try:
        request_type = event["RequestType"]
        properties = event[RESOURCE_PROPERTIES]
        function_name = properties["FunctionName"]

        lambda_client = get_service_client("lambda")

        if request_type in ["Create", "Update"]:
            # Always create a new version - let the caller decide when to invoke this
            response = lambda_client.publish_version(
                FunctionName=function_name,
                Description="Lambda Version"
            )

            response_data = {
                "VersionArn": response["FunctionArn"],
                "VersionNumber": response["Version"]
            }

        elif request_type == "Delete":
            # No action on delete - versions are retained
            response_data = {}

        send_response(event, context, SUCCESS, response_data)

    except Exception as ex:
        send_response(event, context, FAILED, {}, reason=str(ex))
        raise ex
