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

import botocore
import urllib3
from aws_lambda_powertools import Logger, Tracer
from cfn_response import send_response
from helper import get_service_client
from operations import operation_types
from operations.operation_types import FAILED, PHYSICAL_RESOURCE_ID, RESOURCE, RESOURCE_PROPERTIES, SUCCESS

CWLOG_NAME = "CWLOG_NAME"
CWLOG_ARN = "CWLOG_ARN"
SERVICE_PRINCIPAL = "SERVICE_PRINCIPAL"

# to avoid role escalation, restricting principals to specific known ones
ALLOWED_SERVICE_PRINCIPALS = ["es.amazonaws.com"]

logger = Logger(utc=True)
tracer = Tracer()

http = urllib3.PoolManager()


class InvalidPrincipalException(Exception):
    pass


@tracer.capture_method
def verify_env_setup(event):
    """This method verifies all the attributes are available in 'ResourceProperties'. The mandatory ones are 'CWLOG_NAME', 'CWLOGS_ARN',
    'SERVICE_PRINCIPAL' (to which the log policy should be applied to), Key for 'Resource' provides the operation to be performed. This
    sub-module only support updating log policies for certain AWS Service Principals.

    Args:
        event (LambdaEvent): An event object received by the lambda function that is passed by AWS services when invoking the function's handler

    Raises:
        ValueError: If any of the keys are not found under event['ResourceProperties], the method throws a ValueError exception
    """
    if event[RESOURCE_PROPERTIES][RESOURCE] != operation_types.CW_LOGGROUP_POLICY:
        err_msg = f"Operation type not available or did not match from the request. Expecting operation type to be {operation_types.CW_LOGGROUP_POLICY}"
        logger.error(f"{err_msg}. Here are the resource properties received {json.dumps(event[RESOURCE_PROPERTIES])}")
        raise ValueError(err_msg)

    if event[RESOURCE_PROPERTIES].get(CWLOG_NAME, None) in ["", None] or (
        event["RequestType"] != "Delete"
        and (
            event[RESOURCE_PROPERTIES].get(CWLOG_ARN, None) in ["", None]
            or event[RESOURCE_PROPERTIES].get(SERVICE_PRINCIPAL, None) in ["", None]
        )
    ):
        err_msg = f"Either {CWLOG_NAME}, {CWLOG_ARN} or {SERVICE_PRINCIPAL} has not been passed. Hence operation cannot be performed"
        logger.error(f"{err_msg}. Here are the resource properties received {json.dumps(event[RESOURCE_PROPERTIES])}")
        raise ValueError(err_msg)


def create_loggroup_policy(event):
    """This method generates the CloudWatch Log policy that should be applied to the provided service principal. Before returning the
    policy definition, it validates if the service principal is from the list of allowed principals.

    Args:
        event (LambdaEvent): An event object received by the lambda function that is passed by AWS services when invoking the function's handler

    Raises:
        InvalidPrincipalException: If the service principal provided under 'ResourceProperties' is not in the allow list, the method raises
        this exception

    Returns:
        (str): IAM policy definition to be applied
    """
    cw_log_group_arn = event[RESOURCE_PROPERTIES][CWLOG_ARN]
    service_principal = event[RESOURCE_PROPERTIES][SERVICE_PRINCIPAL]

    if service_principal not in ALLOWED_SERVICE_PRINCIPALS:
        raise InvalidPrincipalException(
            f"The provided service principal is {service_principal}, which is not in the allow list"
        )

    return json.dumps(
        {
            "Version": "2012-10-17",
            "Statement": [
                {
                    "Sid": "custom_resource_cw_loggroup_policy",
                    "Effect": "Allow",
                    "Principal": {"Service": f"{service_principal}"},
                    "Action": ["logs:PutLogEvents", " logs:PutLogEventsBatch", "logs:CreateLogStream"],
                    "Resource": f"{cw_log_group_arn}",
                }
            ],
        }
    )


@tracer.capture_method
def create(cw_logs, event, context):
    """This method provides implementation for the 'Create' event for CloudFormation Custom Resource creation. This method will put/ create a cloudwatch
    logs resource policy for the service principal passed in the ResourceProperties of the CloudFormation event.

    This method also calls :meth:`create_loggroup_policy` to get a string definition for the resource policy to use

    Args:
        cw_logs (boto3.client): A boto3 client to make AWS service API calls
        event (LambdaEvent): An event object received by the lambda function that is passed by AWS services when invoking the function's handler
        context (LambdaContext): A context object received by the lambda function that is passed by AWS services when invoking the function's handler

    Raises:
        botocore.exceptions.ClientError: If the service call to put/ create resource policy for CloudWatch logs fails
    """
    logsgroup_policy_name = event[RESOURCE_PROPERTIES][CWLOG_NAME]
    try:
        cw_logs.put_resource_policy(policyName=logsgroup_policy_name, policyDocument=create_loggroup_policy(event))
    except botocore.exceptions.ClientError as error:
        logger.error(f"Error occurred when creating log resource policy, error is {error}")
        raise error


@tracer.capture_method
def update(cw_logs, event, context):
    """This method provides implementation for 'Delete' event for CloudFormation Custom Resource creation. This operation is not supported for resource policy
    and hence this method will send a SUCCESS status to CloudFormation when called

    Args:
        cw_logs (boto3.client): A boto3 client to make AWS service API calls
        event (LambdaEvent): An event object received by the lambda function that is passed by AWS services when invoking the function's handler
        context (LambdaContext): A context object received by the lambda function that is passed by AWS services when invoking the function's handler
    """
    logger.debug(f"Update event is not supported on this resource. Sending {SUCCESS} status")


@tracer.capture_method
def delete(cw_logs, event, context):
    """This method provides implementation for the 'Delete vent for CloudFormation Custom Resource creation. As part of the delete event, the resource
    policy will lbe deleted

    Args:
        cw_logs (boto3.client): A boto3 client to make AWS service API calls
        event (LambdaEvent): An event object received by the lambda function that is passed by AWS services when invoking the function's handler
        context (LambdaContext): A context object received by the lambda function that is passed by AWS services when invoking the function's handler

    Raises:
        botocore.exceptions.ClientError: If the service call to delete resource policy for CloudWatch logs fails
    """
    logsgroup_policy_name = event[RESOURCE_PROPERTIES][CWLOG_NAME]
    try:
        cw_logs.delete_resource_policy(policyName=logsgroup_policy_name)
    except botocore.exceptions.ClientError as error:
        logger.error(f"Error occurred when deleting log resource policy, error is {error}")
        raise error


@tracer.capture_method
def execute(event, context):
    """This sub-module implements creation of resource policies for CloudWatch log events for specific principals when the same cannot be achieved
    through CloudFormation and require AWS API calls.

    Args:
        event (LambdaEvent): An event object received by the lambda function that is passed by AWS services when invoking the function's handler
        context (LambdaContext): A context object received by the lambda function that is passed by AWS services when invoking the function's handler

    Raises:
        Exception: if there are an errors in creating resource policies. During the handling of this exception it also sends a 'FAILED' status to
        the AWS Cloudformation service.
    """
    physical_resource_id = event.get(PHYSICAL_RESOURCE_ID, uuid.uuid4().hex[:8])

    try:
        verify_env_setup(event)

        cw_logs = get_service_client("logs")
        if event["RequestType"] == "Create":
            create(cw_logs, event, context)
        elif event["RequestType"] == "Update":
            update(cw_logs, event, context)
        elif event["RequestType"] == "Delete":
            delete(cw_logs, event, context)

        send_response(event, context, SUCCESS, {}, physical_resource_id)
    except Exception as ex:
        logger.error(f"Error occurred when updating log policy for Open Search. Error is {ex}")
        send_response(event, context, FAILED, {}, physical_resource_id=physical_resource_id, reason=str(ex))
