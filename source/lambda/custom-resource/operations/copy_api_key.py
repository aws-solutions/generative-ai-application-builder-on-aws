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
from botocore.exceptions import ClientError
from cfn_response import send_response
from helper import get_service_client
from operations import operation_types
from operations.operation_types import FAILED, PHYSICAL_RESOURCE_ID, RESOURCE, RESOURCE_PROPERTIES, SUCCESS

SECRETS_MANAGER_API_KEY_NAME = "SECRETS_MANAGER_API_KEY_NAME"
API_KEY = "API_KEY"

logger = Logger(utc=True)
tracer = Tracer()


@tracer.capture_method
def verify_env_setup(event):
    """This method verifies if all the necessary properties are correctly set in the event object as received by the lambda function's handler

    Args:
        event (LambdaEvent): An event received by the lambda function that is passed by AWS services when invoking the function's handler

    Raises:
        ValueError: If any of the properties in the custom resource properties are not set correctly or are not available
    """
    if event[RESOURCE_PROPERTIES][RESOURCE] != operation_types.COPY_API_KEY:
        err_msg = f"Operation type not available or did not match from the request. Expecting operation type to be {operation_types.COPY_API_KEY}"
        logger.error(f"{err_msg}. Here are the resource properties received {json.dumps(event[RESOURCE_PROPERTIES])}")
        raise ValueError(err_msg)

    if event[RESOURCE_PROPERTIES].get(SECRETS_MANAGER_API_KEY_NAME, None) in ["", None] or (
        event["RequestType"] != "Delete" and (event[RESOURCE_PROPERTIES].get(API_KEY, None) in ["", None])
    ):
        err_msg = (
            f"Missing either {SECRETS_MANAGER_API_KEY_NAME} or {API_KEY} in the request. Operation cannot be performed"
        )
        logger.error(f"{err_msg}. Here are the resource properties received {json.dumps(event[RESOURCE_PROPERTIES])}")
        raise ValueError(err_msg)


@tracer.capture_method
def create(event, context):
    """This method creates secret from the incoming resource properties and writes to Secrets Manager.
    If the secret already exists (such as in the case of an update event), we update the value.

    Args:
        event (LambdaEvent): An event object received by the lambda function that is passed by AWS services when invoking the function's handler
        context (LambdaContext): A context object received by the lambda function that is passed by AWS services when invoking the function's handler

    Raises:
        botocore.exceptions.ClientError: Failures related to SSM Parameter Store PutParameter operation
    """

    secretsmanager = get_service_client("secretsmanager")
    try:
        logger.debug(event)
        secret_name = event[RESOURCE_PROPERTIES][SECRETS_MANAGER_API_KEY_NAME]
        secret_value = event[RESOURCE_PROPERTIES][API_KEY]

        try:
            secretsmanager.describe_secret(SecretId=secret_name)
        except secretsmanager.exceptions.ResourceNotFoundException as error:
            logger.debug(f"Secret not found, hence creating a new one.")
            secretsmanager.create_secret(
                Name=secret_name,
                Description="3rd Party LLM API Key for the use case",
                SecretString=secret_value,
            )
        secretsmanager.put_secret_value(SecretId=secret_name, SecretString=secret_value)
        logger.debug("Writing to SSM Parameter store complete")
    except ClientError as error:
        logger.error((f"Error occurred when creating the secret, error is {error}"))
        raise error


@tracer.capture_method
def delete(event, context):
    """This method deletes the secret containing the API key from Secrets Manager. The secret name is retrieved from the event object

    Args:
        event (LambdaEvent): An event object received by the lambda function that is passed by AWS services when invoking the function's handler
        context (LambdaContext): A context object received by the lambda function that is passed by AWS services when invoking the function's handler

    Raises
        botocore.exceptions.ClientError: Failures related to SSM Parameter store delete operation
    """
    if event[RESOURCE_PROPERTIES].get(SECRETS_MANAGER_API_KEY_NAME, None) not in ["", None]:
        secretsmanager = get_service_client("secretsmanager")
        try:
            secretsmanager.delete_secret(
                SecretId=event[RESOURCE_PROPERTIES][SECRETS_MANAGER_API_KEY_NAME],
                ForceDeleteWithoutRecovery=True,
            )
        except secretsmanager.exceptions.ResourceNotFoundException as error:
            logger.error(f"Secret not found, hence no delete operation will be performed. Detailed error, {error}")
        except ClientError as error:
            logger.error((f"Error occurred when deleting secret in Secrets Manager, error is {error}"))
            raise error
    else:
        logger.error("SSM Key not found in the event object. Hence no delete operation will be performed")


@tracer.capture_method
def execute(event, context):
    """This method stores a provided API key as a secret in Secrets Manager. The secret name is retrieved from the event object.

    For delete event, the lambda will delete secret from Secrets Manager.

    Note: for update events, if the secret name has changed, it is not possible to delete the old key since the key name is not known.

    Args:
        event (LambdaEvent): An event object received by the lambda function that is passed by AWS services when invoking the function's handler
        context (LambdaContext): A context object received by the lambda function that is passed by AWS services when invoking the function's handler

    Raises:
        Exception: if the custom resource properties are not passed correctly or an error occurs during s3 copy/ transfer
        operation, this method will throw an error. During the handling of this exception it also sends a 'FAILED' status to the  AWS
        Cloudformation service.
    """
    physical_resource_id = event.get(PHYSICAL_RESOURCE_ID, uuid.uuid4().hex[:8])
    try:
        verify_env_setup(event)

        if event["RequestType"] == "Create" or event["RequestType"] == "Update":
            create(event, context)

        if event["RequestType"] == "Delete":
            delete(event, context)

        send_response(event, context, SUCCESS, {}, physical_resource_id)
    except Exception as ex:
        logger.error(f"Error occurred when creating web client app configuration. Error is {ex}")
        send_response(event, context, FAILED, {}, physical_resource_id=physical_resource_id, reason=str(ex))
