#!/usr/bin/env python
# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

import json
import time
from typing import List

import botocore
from aws_lambda_powertools import Logger, Tracer
from cfn_response import send_response
from helper import get_service_client
from operations import operation_types
from operations.operation_types import FAILED, RESOURCE, RESOURCE_PROPERTIES, SUCCESS

logger = Logger(utc=True)
tracer = Tracer()

REQUIRED_SERVICE_NAMES = "REQUIRED_SERVICE_NAMES"
MAX_AZS = "MAX_AZS"
DEFAULT_MAX_AZS = 2


@tracer.capture_method
def verify_env_setup(event):
    if event[RESOURCE_PROPERTIES][RESOURCE] != operation_types.GET_COMPATIBLE_AZS:
        err_msg = f"Operation type not available or did not match from the request. Expecting operation type to be {operation_types.GET_COMPATIBLE_AZS}"
        logger.error(f"{err_msg}. Here are the resource properties received {json.dumps(event[RESOURCE_PROPERTIES])}")
        raise ValueError(err_msg)
    if event[RESOURCE_PROPERTIES].get(REQUIRED_SERVICE_NAMES, None) in ["", None]:
        err_msg = f"{REQUIRED_SERVICE_NAMES} has not been passed. Hence operation cannot be performed"
        logger.error(f"{err_msg}. Here are the resource properties received {json.dumps(event[RESOURCE_PROPERTIES])}")
        raise ValueError(err_msg)


@tracer.capture_method
def get_compatible_azs(
    required_service_names: List[str], max_azs: int = DEFAULT_MAX_AZS, retries: int = 3, retry_interval: int = 5
) -> List[str]:
    """
    This method will get the list of compatible AZs for the given list of services.
    Args:
        required_service_names (List[str]): List of services required by the solution
        max_azs (int): Max number of compatible AZs to return. Will take from the start of the returned list.
        retries (int): Number of retries to get the list of compatible AZs
        retry_interval (int): Interval in seconds between retries

    Returns:
        List[str]: List of compatible AZs
    """
    ec2 = get_service_client("ec2")

    while retries > 0:
        try:
            response = ec2.describe_vpc_endpoint_services(
                ServiceNames=required_service_names,
            )
            # return only the AvailabilityZones common to all returned services
            return find_common_azs(response["ServiceDetails"])[:max_azs]
        except botocore.exceptions.ClientError as error:
            logger.error(f"Error occurred when attempting to get services, error is {error}")
            retries -= 1
            if retries == 0:
                raise error
            else:
                logger.info(
                    f"Failed to get endpoint services for {str(required_service_names)}. Retrying in {retry_interval} seconds. Retrying {retries} more times"
                )
                time.sleep(retry_interval)


def find_common_azs(service_details: List[dict]) -> List[str]:
    """
    This method will find the common availability zones for the given list of services.
    Args:
        service_details (List[dict]): List of services

    Returns:
        List[str]: List of common availability zones
    """
    azs = set(service_details[0]["AvailabilityZones"])
    for service in service_details[1:]:
        azs = azs.intersection(set(service["AvailabilityZones"]))
    return sorted(azs)


@tracer.capture_method
def execute(event, context):
    """This method is an implementation for the 'GET_COMPATIBLE_AZS'. The generated comma separated list of availability zones can be used to determine which AZs support the services required by the solution.
    This operation will only generate the list for 'Create' and 'Update' events.
    for 'Delete' events, it will return empty response with 'SUCCESS' as the status.

    Args:
        event (LambdaEvent): An event object received by the lambda function that is passed by AWS services when invoking the function's handler
        context (LambdaContext): A context object received by the lambda function that is passed by AWS services when invoking the function's handler

    Raises:
        Exception: if there are an errors in the operation. During the handling of this exception it also sends a 'FAILED' status to
        the  AWS Cloudformation service.
    """
    try:
        if event["RequestType"] == "Create" or event["RequestType"] == "Update":
            verify_env_setup(event)
            required_service_names = event[RESOURCE_PROPERTIES][REQUIRED_SERVICE_NAMES].split(",")
            max_azs = int(event[RESOURCE_PROPERTIES].get(MAX_AZS, DEFAULT_MAX_AZS))
            compatible_azs = get_compatible_azs(required_service_names, max_azs)
            send_response(event, context, SUCCESS, {"CompatibleAZs": ",".join(compatible_azs)})
        elif event["RequestType"] == "Delete":
            send_response(event, context, SUCCESS, {})
    except Exception as ex:
        logger.error(f"Error occurred when getting compatible AZs. Error is {ex}")
        send_response(event, context, FAILED, {}, reason=str(ex))
