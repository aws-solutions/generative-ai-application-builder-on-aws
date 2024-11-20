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
import time
import uuid
from copy import copy

from aws_lambda_powertools import Logger, Tracer
from botocore.exceptions import ClientError
from cfn_response import send_response
from helper import get_service_client, get_service_resource
from operations import operation_types
from operations.operation_types import FAILED, PHYSICAL_RESOURCE_ID, RESOURCE, RESOURCE_PROPERTIES, SUCCESS
from utils.constants import (
    USE_CASE_CONFIG_RECORD_KEY_ATTRIBUTE_NAME,
    DISAMBIGUATION_PROMPT_TEMPLATE,
    KENDRA_EDITION,
    LLM_PARAMS,
    NEW_KENDRA_INDEX_CREATED,
    PROMPT_PARAMS,
    PROMPT_TEMPLATE,
    RAG_ENABLED,
    PROMPT_TEMPLATE,
    USE_CASE_CONFIG_RECORD_KEY,
    USE_CASE_CONFIG_TABLE_NAME,
    UUID,
)
from utils.data import BuilderMetrics
from utils.metrics import push_builder_metrics

SOLUTION_ID = "SolutionId"
VERSION = "Version"
DEPLOY_KENDRA_INDEX = "DeployKendraIndex"
WORKFLOW_CONFIG_NAME = "WorkflowConfigName"

logger = Logger(utc=True)
tracer = Tracer()


@tracer.capture_method
def verify_env_setup(event):
    """This method verifies all the attributes are available in 'ResourceProperties'. The mandatory ones are 'SolutionId', 'Version', and
    'Resource'

    Args:
        event (LambdaEvent): An event object received by the lambda function that is passed by AWS services when invoking the function's handler

    Raises:
        ValueError: If any of the keys are not found under event['ResourceProperties], the method throws a ValueError exception

    """
    if event[RESOURCE_PROPERTIES].get(RESOURCE, None) != operation_types.ANONYMOUS_METRIC:
        err_msg = f"Operation type not available or did not match from the request. Expecting operation type to be {operation_types.ANONYMOUS_METRIC}"
        logger.error(f"{err_msg}. Here are the resource properties received {json.dumps(event[RESOURCE_PROPERTIES])}")
        raise ValueError(err_msg)

    if (
        event[RESOURCE_PROPERTIES].get(SOLUTION_ID, None) is None
        or event[RESOURCE_PROPERTIES].get(VERSION, None) is None
    ):
        err_msg = f"Either 'SolutionId' or 'Version' has not been passed. Hence the operation cannot be performed."
        logger.error(f"{err_msg}. Here are the resource properties received {json.dumps(event[RESOURCE_PROPERTIES])}")
        raise ValueError(err_msg)


@tracer.capture_method
def sanitize_data(data):
    """This method removes keys; ServiceToken, Resource, SolutionId, UUID (if present), Version from under ResourceProperties.
    Some of these values are to be send separately as anonymized values

    Args:
        resource_properties ({}): The JSON body or dict received as part of event[ResourceProperties]

    Returns:
        {}: A sanitized version in JSON format that should can be published to capture metrics
    """
    # Remove ServiceToken (lambda arn) to avoid sending AccountId
    data.pop("ServiceToken", None)
    data.pop(RESOURCE, None)

    # Solution ID and unique ID are sent separately
    data.pop(SOLUTION_ID, None)
    data.pop(UUID, None)
    data.pop(VERSION, None)

    # Removing the prompt templates to not expose proprietary data in the logs
    prompt_params = data.get(LLM_PARAMS, {}).get(PROMPT_PARAMS)
    if prompt_params is not None:
        prompt_params.pop(PROMPT_TEMPLATE, None)
        prompt_params.pop(DISAMBIGUATION_PROMPT_TEMPLATE, None)

    # config key is not needed in metrics
    data.pop(USE_CASE_CONFIG_TABLE_NAME, None)
    data.pop(USE_CASE_CONFIG_RECORD_KEY, None)

    return data


@tracer.capture_method
def get_use_case_config(table_name: str, key: str, retries=3, retry_interval=5):
    """This method retrieves the use case configuration from Dyanamo DB

    Args:
        table_name (str): The name of the DynamoDB table to retrieve the use case configuration from
        key (str): The key to retrieve the use case configuration from the table
        retries (int): The number of times to retry. May be needed as sometimes IAM policy changes take time to propagate, which can mean we need to retry.
        retry_interval (int): The number of seconds to wait between retries, in seconds.

    Returns:
        dict: Additional configuration (e.g. the use case config retrieved from DDB). Empty if not retrievable.
    """
    logger.info(f"Retrieving use case config from DynamoDB table {table_name} for the key {key}")
    ddb_resource = get_service_resource("dynamodb")
    config_table = ddb_resource.Table(table_name)

    while retries > 0:
        try:
            usecase_config = (
                config_table.get_item(
                    Key={USE_CASE_CONFIG_RECORD_KEY_ATTRIBUTE_NAME: key},
                )
                .get("Item", {})
                .get("config")
            )

            if usecase_config is None:
                raise ValueError(f"No compatible record found in the table {table_name} for the key {key}")

            return usecase_config
        except ClientError as error:
            logger.error(f"Error occurred when retrieving use case config from DDB, error is {error}")
            logger.info(
                f"Additional config with key {key} failed to be retrieved from table {table_name}. Retrying in {retry_interval} seconds. Retrying {retries} more times"
            )
            retries -= 1
            time.sleep(retry_interval)
        except ValueError as error:
            logger.error(f"Error occurred when attempting to read the use case config, error is {error}")
            break
    return {}


@tracer.capture_method
def execute(event, context):
    """This method implementation is to support sending anonymous metric to aws solution builder endpoint. On 'Create', 'Update', and 'Delete'
    events this implementation will send configuration details about the deployed stack without any customer specific information. The
    'Resource' property for this implementation is 'ANONYMOUS_METRIC'. Additionally, all data to be pushed as operational metrics should be
    set directly under 'Properties' in the Custom Resource creation. 'SolutionId' and 'Version' are mandatory resource attributes

    For 'Create' events, this implementation will add a UUID to the metrics payload using the uuid.uuid4() call to provide a unique identified
    for each new deployment

    Args:
        event (LambdaEvent): An event object received by the lambda function that is passed by AWS services when invoking the function's handler
        context (LambdaContext): A context object received by the lambda function that is passed by AWS services when invoking the function's handler

    Raises:
        Exception: if there are an errors in UUID generation. During the handling of this exception it also sends a 'FAILED' status to
        the AWS Cloudformation service.
    """
    physical_resource_id = event.get(PHYSICAL_RESOURCE_ID, uuid.uuid4().hex[:8])

    try:
        verify_env_setup(event)
        metrics_data = copy(event[RESOURCE_PROPERTIES])

        # WORKFLOW_CONFIG_NAME and DEPLOY_KENDRA_INDEX information is only sent as a part of Create/Update events
        if event["RequestType"] == "Delete":
            metrics_data.pop(NEW_KENDRA_INDEX_CREATED, None)
            metrics_data.pop(KENDRA_EDITION, None)
            metrics_data.pop(RAG_ENABLED, None)

        config_table = event[RESOURCE_PROPERTIES].get(USE_CASE_CONFIG_TABLE_NAME)
        config_key = event[RESOURCE_PROPERTIES].get(USE_CASE_CONFIG_RECORD_KEY)
        if event["RequestType"] != "Delete" and config_table and config_key:
            chat_model_config = get_use_case_config(
                config_table,
                config_key,
            )
            metrics_data[LLM_PARAMS] = chat_model_config.get(LLM_PARAMS, {})

        metrics_data = sanitize_data(metrics_data)

        builder_metrics = BuilderMetrics(
            event[RESOURCE_PROPERTIES][UUID],
            event[RESOURCE_PROPERTIES][SOLUTION_ID],
            event[RESOURCE_PROPERTIES][VERSION],
            metrics_data,
        )
        push_builder_metrics(builder_metrics)
        send_response(event, context, SUCCESS, {}, physical_resource_id)
    except Exception as ex:
        logger.error(f"Error occurred when sending anonymous metric, Error is {ex}")
        send_response(event, context, FAILED, {}, physical_resource_id=physical_resource_id, reason=str(ex))
