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
import time
from copy import copy

from aws_lambda_powertools import Logger, Tracer
from botocore.exceptions import ClientError
from cfn_response import send_response
from helper import get_service_client
from operations import operation_types
from operations.operation_types import FAILED, PHYSICAL_RESOURCE_ID, RESOURCE, RESOURCE_PROPERTIES, SUCCESS
from utils.constants import (
    KENDRA_EDITION,
    LLM_PARAMS,
    MODEL_PROVIDER_NAME,
    NEW_KENDRA_INDEX_CREATED,
    PROMPT_TEMPLATE,
    RAG_ENABLED,
    SSM_CONFIG_KEY,
    PROMPT_TEMPLATE,
    MODEL_PROVIDER,
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

    # Removing the prompt template to not expose proprietary data in the logs
    if data.get(LLM_PARAMS, None) is not None:
        data[LLM_PARAMS].pop(PROMPT_TEMPLATE, None)

    # config key is not needed in metrics
    data.pop(SSM_CONFIG_KEY, None)

    return data


@tracer.capture_method
def get_additional_config_ssm_parameter(ssm_key, retries=3, retry_interval=5):
    """This method retrieves the additional configuration from SSM Parameter Store

    Args:
        ssm_key (str): SSM Parameter Store key
        retries (int): The number of times to retry. May be needed as sometimes IAM policy changes take time to propagate, which can mean we need to retry.
        retry_interval (int): The number of seconds to wait between retries, in seconds.

    Returns:
        dict: Additional configuration (e.g. the use case config retrieved from SSM). Empty if not retrievable.
    """
    logger.debug(f"Retrieving additional config from SSM Parameter Store with key {ssm_key}")
    ssm = get_service_client("ssm")
    while retries > 0:
        try:
            response = ssm.get_parameter(Name=ssm_key, WithDecryption=True)
            return json.loads(response["Parameter"]["Value"])
        except ClientError as error:
            logger.error(f"Error occurred when retrieving additional config SSM param, error is {error}")
            logger.info(
                f"Additional config with key {ssm_key} failed to be retrieved. Retrying in {retry_interval} seconds. Retrying {retries} more times"
            )
            retries -= 1
            time.sleep(retry_interval)
        except ValueError as error:
            logger.error(f"Error occurred when attempting to parse additional config SSM param, error is {error}")
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
            metrics_data.pop(SSM_CONFIG_KEY, None)

        if event["RequestType"] != "Delete" and event[RESOURCE_PROPERTIES].get(SSM_CONFIG_KEY, None):
            chat_model_config = get_additional_config_ssm_parameter(event[RESOURCE_PROPERTIES][SSM_CONFIG_KEY])
            metrics_data[LLM_PARAMS] = chat_model_config.get(LLM_PARAMS, {})
            if metrics_data[LLM_PARAMS].get(PROMPT_TEMPLATE, None):
                metrics_data[LLM_PARAMS].pop(PROMPT_TEMPLATE)

        metrics_data = sanitize_data(metrics_data)

        builder_metrics = BuilderMetrics(
            event[RESOURCE_PROPERTIES][SOLUTION_ID],
            event[RESOURCE_PROPERTIES][VERSION],
            metrics_data,
            event[RESOURCE_PROPERTIES][UUID],
        )
        push_builder_metrics(builder_metrics)
        send_response(event, context, SUCCESS, {}, physical_resource_id)
    except Exception as ex:
        logger.error(f"Error occurred when sending anonymous metric, Error is {ex}")
        send_response(event, context, FAILED, {}, physical_resource_id=physical_resource_id, reason=str(ex))
