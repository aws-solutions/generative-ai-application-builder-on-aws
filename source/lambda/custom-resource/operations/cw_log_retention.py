#!/usr/bin/env python
# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0


import json
import time

import botocore
from aws_lambda_powertools import Logger, Tracer
from cfn_response import send_response
from helper import get_service_client
from operations import operation_types
from operations.operation_types import FAILED, PHYSICAL_RESOURCE_ID, RESOURCE, RESOURCE_PROPERTIES, SUCCESS

FUNCTION_NAME = "FunctionName"
RETENTION_IN_DAYS = 3653
MAX_RETRIES = 10
RETRY_INTERVAL = 2

logger = Logger(utc=True)
tracer = Tracer()


@tracer.capture_method
def verify_env_setup(event):
    """The method verifies if all properties are available in the event object.

    Args:
        event (_type_): Lambda event

    Raises:
        ValueError: Any missing property received through the custom resource event
    """
    if event[RESOURCE_PROPERTIES][RESOURCE] != operation_types.CW_LOG_RETENTION:
        err_msg = f"Operation not available or did not match from the incoming request. Expected operation types to be {operation_types.CW_LOG_RETENTION}"
        logger.error(f"{err_msg}. Hare are resource properties received {json.dumps(event[RESOURCE_PROPERTIES])} ")
        raise ValueError(err_msg)
    if event[RESOURCE_PROPERTIES].get(FUNCTION_NAME, None) in ["", None]:
        err_msg = f"{FUNCTION_NAME} has not been passed. Hence cannot proceed with the operation"
        logger.error(f"{err_msg}. Here are resource properties received {json.dumps(event[RESOURCE_PROPERTIES])}")
        raise ValueError(err_msg)


def create_log_group_if_not_exists(log_group, logs_client):
    """Check if the log group exists, if not create one

    Args:
        log_group (_type_): name of the log group
        logs_client (_type_): boto3 client for logs
    """
    try:
        describe_response = logs_client.describe_log_groups(logGroupNamePrefix=log_group)
        if not describe_response["logGroups"]:
            logger.debug(f"Log group {log_group} does not exist. Hence creating one")
            logs_client.create_log_group(logGroupName=log_group)
    except botocore.exceptions.ClientError as error:
        logger.error(f"Error occurred while describing log group or creating one. Error is {error}")


@tracer.capture_method
def update_retention_policy(function_name: str):
    """This function retries the log group name from the lambda function and updates the retention policy for the log group

    Args:
        function_name (str): The name of the lambda function whose log group retention is to be updated.

    Raises:
        ex (Exception):
    """
    log_group = get_log_group_name(function_name)

    if log_group:
        logs_client = get_service_client("logs")
        create_log_group_if_not_exists(log_group, logs_client)
        retries = MAX_RETRIES

        while retries > 0:
            try:
                logs_client.put_retention_policy(logGroupName=log_group, retentionInDays=3653)
                break
            except botocore.exceptions.ClientError as error:
                logger.error(f"Error occurred while updating retention policy. Exception is {error}")
                retries -= 1
                if retries == 0:
                    raise error
                else:
                    logger.info(f"Retrying in {RETRY_INTERVAL} seconds. Retrying {retries} more times")
                    time.sleep(RETRY_INTERVAL)
        logger.info("Update retention policy complete")


@tracer.capture_method
def get_log_group_name(function_name):
    """Get the log group name for the lambda function provided

    Args:
        function_name (_type_): _description_

    Raises:
        ex: _description_

    Returns:
        str: log group name
    """
    lambda_client = get_service_client("lambda")

    try:
        get_func_response = lambda_client.get_function(FunctionName=function_name)
        log_group = get_func_response["Configuration"]["LoggingConfig"]["LogGroup"]
        logger.debug(f"Log group name is{log_group}")
    except Exception as ex:
        logger.error(f"Error occurred while getting function details. Exception is {ex}")
        raise ex
    return log_group


@tracer.capture_method
def execute(event, context):
    """This method implements the operations to be executed on a 'Create' CloudFormation event. This method
    updates the log group retention policy for the lambda function provided in the event.

    Args:
        event (_type_): Lambda event
        context (_type_): Lambda context
    """
    verify_env_setup(event)
    try:
        if event["RequestType"] == "Create":
            update_retention_policy(function_name=event[RESOURCE_PROPERTIES][FUNCTION_NAME])
            send_response(event, context, SUCCESS, {}, PHYSICAL_RESOURCE_ID)
        elif event["RequestType"] == "Update" or event["RequestType"] == "Delete":
            logger.debug(
                f"Event type received is {event['RequestType']}. Hence no action will be performed for this operation"
            )
            send_response(event, context, SUCCESS, {}, PHYSICAL_RESOURCE_ID)
    except Exception as ex:
        logger.error(f"Exception occurred while executing custom resource operation. Exception is {ex}")
        send_response(event, context, FAILED, {}, reason=str(ex))
