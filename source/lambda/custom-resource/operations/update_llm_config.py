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
MAX_RETRIES = 10
RETRY_INTERVAL = 2

USE_CASE_CONFIG_TABLE_NAME = "USE_CASE_CONFIG_TABLE_NAME"
USE_CASE_CONFIG_RECORD_KEY = "USE_CASE_CONFIG_RECORD_KEY"
USE_CASE_UUID = "USE_CASE_UUID"
CONVERSATION_TABLE_NAME = "CONVERSATION_TABLE_NAME"

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
    if event[RESOURCE_PROPERTIES][RESOURCE] != operation_types.UPDATE_LLM_CONFIG:
        err_msg = f"Operation not available or did not match from the incoming request. Expected operation types to be {operation_types.UPDATE_LLM_CONFIG}"
        logger.error(f"{err_msg}. Hare are the resource properties received {json.dumps(event[RESOURCE_PROPERTIES])} ")
        raise ValueError(err_msg)
    
    if event[RESOURCE_PROPERTIES].get(USE_CASE_CONFIG_TABLE_NAME, None) in ["", None]:
        err_msg = f"The {USE_CASE_CONFIG_TABLE_NAME} has not been passed. Hence operation cannot be performed"
        logger.error(f"{err_msg}. Here are the resource properties received {json.dumps(event[RESOURCE_PROPERTIES])}")
        raise ValueError(err_msg)

    if event[RESOURCE_PROPERTIES].get(USE_CASE_CONFIG_RECORD_KEY, None) in ["", None]:
        err_msg = f"The {USE_CASE_CONFIG_RECORD_KEY} has not been passed. Hence operation cannot be performed"
        logger.error(f"{err_msg}. Here are the resource properties received {json.dumps(event[RESOURCE_PROPERTIES])}")
        raise ValueError(err_msg)
    
    if event[RESOURCE_PROPERTIES].get(USE_CASE_UUID, None) in ["", None]:
        err_msg = f"The {USE_CASE_UUID} has not been passed. Hence operation cannot be performed"
        logger.error(f"{err_msg}. Here are the resource properties received {json.dumps(event[RESOURCE_PROPERTIES])}")
        raise ValueError(err_msg)
    
    if event[RESOURCE_PROPERTIES].get(CONVERSATION_TABLE_NAME, None) in ["", None]:
        err_msg = f"The {CONVERSATION_TABLE_NAME} has not been passed. Hence operation cannot be performed"
        logger.error(f"{err_msg}. Here are the resource properties received {json.dumps(event[RESOURCE_PROPERTIES])}")
        raise ValueError(err_msg)


@tracer.capture_method
def update_llm_config(event):
    """This function attempt to update the LLM Config with the Conversation Table Name and the Use Case UUID

    Args:
        event (_type_): Lambda event

    Raises:
        ex (Exception):
    """

    ddb_client = get_service_client("dynamodb")
    
    
    retries = MAX_RETRIES

    while retries > 0:
        try:
            ddb_client.update_item(
                TableName=event[RESOURCE_PROPERTIES][USE_CASE_CONFIG_TABLE_NAME],
                Key={
                    'key': {'S': event[RESOURCE_PROPERTIES][USE_CASE_CONFIG_RECORD_KEY]},
                },
                UpdateExpression="SET config.ConversationTableName = :conversation_table_name, config.UseCaseUUID = :use_case_uuid",
                ExpressionAttributeValues={
                    ':conversation_table_name': {
                        'S': event[RESOURCE_PROPERTIES][CONVERSATION_TABLE_NAME]
                        },
                    ':use_case_uuid': {
                        'S': event[RESOURCE_PROPERTIES][USE_CASE_UUID]
                        }
                    }
                )
            break
        except botocore.exceptions.ClientError as error:
            logger.error(f"Error occurred while updating llm config. Exception is {error}")
            retries -= 1
            if retries == 0:
                raise error
            else:
                logger.info(f"Retrying in {RETRY_INTERVAL} seconds. Retrying {retries} more times")
                time.sleep(RETRY_INTERVAL)
    logger.info("Update LLM Config complete")



@tracer.capture_method
def execute(event, context):
    """This method implements the operations to be executed on a 'Create' and 'Update' CloudFormation event. This method
    updates the LLM Config Table item to include a conversation_table_name and use_case_uuid field.

    Args:
        event (_type_): Lambda event
        context (_type_): Lambda context
    """
    verify_env_setup(event)
    try:
        if event["RequestType"] == "Create" or event["RequestType"] == "Update":
            update_llm_config(event)
        send_response(event, context, SUCCESS, {}, PHYSICAL_RESOURCE_ID)
    except Exception as ex:
        logger.error(f"Exception occurred while executing custom resource operation. Exception is {ex}")
        send_response(event, context, FAILED, {}, reason=str(ex))
