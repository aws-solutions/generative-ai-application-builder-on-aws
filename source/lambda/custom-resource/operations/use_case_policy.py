#!/usr/bin/env python
# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

import json
import time
import uuid

import botocore
from aws_lambda_powertools import Logger, Tracer
from cfn_response import send_response
from helper import get_service_resource
from operations import operation_types
from operations.operation_types import FAILED, PHYSICAL_RESOURCE_ID, RESOURCE, RESOURCE_PROPERTIES, SUCCESS

logger = Logger(utc=True)
tracer = Tracer()

# Required keys in the incoming event object
GROUP_NAME = "GROUP_NAME"
POLICY_TABLE_NAME = "POLICY_TABLE_NAME"
WEBSOCKET_API_ARN = "WEBSOCKET_API_ARN"
DETAILS_API_ARN = "DETAILS_API_ARN"
FEEDBACK_API_ARN = "FEEDBACK_API_ARN"


class InvalidPrincipalException(Exception):
    pass


@tracer.capture_method
def verify_env_setup(event):
    """This method verifies if all the necessary properties are correctly set in the event object as received by the lambda function's handler

    Args:
        event (LambdaEvent): An event received by the lambda function that is passed by AWS services when invoking the function's handler

    Raises:
        ValueError: If any of the properties in the custom resource properties are not set correctly or are not available
    """
    if event[RESOURCE_PROPERTIES][RESOURCE] != operation_types.USE_CASE_POLICY:
        err_msg = f"Operation type not available or did not match from the request. Expecting operation type to be {operation_types.USE_CASE_POLICY}"
        logger.error(f"{err_msg}. Here are the resource properties received {json.dumps(event[RESOURCE_PROPERTIES])}")
        raise ValueError(err_msg)

    if (
        event[RESOURCE_PROPERTIES].get(GROUP_NAME, None) in ["", None]
        or event[RESOURCE_PROPERTIES].get(WEBSOCKET_API_ARN, None) in ["", None]
        or event[RESOURCE_PROPERTIES].get(POLICY_TABLE_NAME, None) in ["", None]
        or event[RESOURCE_PROPERTIES].get(DETAILS_API_ARN, None) in ["", None]
    ):
        err_msg = f"Either {GROUP_NAME} or {WEBSOCKET_API_ARN} or {DETAILS_API_ARN} or {POLICY_TABLE_NAME} has not been passed. Hence operation cannot be performed"
        logger.error(f"{err_msg}. Here are the resource properties received: {json.dumps(event[RESOURCE_PROPERTIES])}")
        raise ValueError(err_msg)


@tracer.capture_method
def create(event, context, retries=3, retry_interval=5):
    """This method provides implementation for the 'Create' (and update) event for CloudFormation Custom Resource creation.
    This will create a new item in the policy table for the given group, allowing access to invoke the provided API.
    This also adds a statement to the policy of the admin group in the policy table to allow admin users access to the API.

    Args:
        event (LambdaEvent): An event object received by the lambda function that is passed by AWS services when invoking the function's handler
        context (LambdaContext): A context object received by the lambda function that is passed by AWS services when invoking the function's handler
        retries (int): The number of times to retry. May be needed as sometimes IAM policy changes take time to propagate, which can mean we need to retry.
        retry_interval (int): The number of seconds to wait between retries, in seconds.

    Raises:
        botocore.exceptions.ClientError: If the service call to put/create resource policy in DynamoDB fails
    """
    group_name = event[RESOURCE_PROPERTIES][GROUP_NAME]
    websocket_api_arn = event[RESOURCE_PROPERTIES][WEBSOCKET_API_ARN]
    details_api_arn = event[RESOURCE_PROPERTIES][DETAILS_API_ARN]
    feedback_api_arn = event[RESOURCE_PROPERTIES].get(FEEDBACK_API_ARN)

    ddb = get_service_resource("dynamodb")

    while retries > 0:
        try:
            execute_api_action = "execute-api:Invoke"

            # Policy for this group is put in policy table (put overwrites existing, so this applies for updates as well)
            websocket_policy_statement = {
                "Sid": f"{group_name}-policy-statement",
                "Effect": "Allow",
                "Action": execute_api_action,
                "Resource": [
                    f"{websocket_api_arn}",
                ],
            }

            details_policy_statement = {
                "Sid": f"{group_name}-details-policy-statement",
                "Effect": "Allow",
                "Action": execute_api_action,
                "Resource": [
                    f"{details_api_arn}",
                ],
            }

            statement = [websocket_policy_statement, details_policy_statement]

            if feedback_api_arn:
                feedback_policy_statement = {
                    "Sid": f"{group_name}-feedback-policy-statement",
                    "Effect": "Allow",
                    "Action": execute_api_action,
                    "Resource": [
                        f"{feedback_api_arn}",
                    ],
                }
                statement.append(feedback_policy_statement)

            table = ddb.Table(event[RESOURCE_PROPERTIES][POLICY_TABLE_NAME])
            table.put_item(
                Item={
                    "group": group_name,
                    "policy": {
                        "Version": "2012-10-17",
                        "Statement": statement,
                    },
                }
            )

            # Policy for the admin group updated to allow invoking this new API
            admin_policy = _create_updated_admin_policy(statement, table)
            table.put_item(Item={"group": "admin", "policy": admin_policy})
            break

        except botocore.exceptions.ClientError as error:
            logger.error(f"Error occurred when putting item in policy table, error is {error}")
            retries -= 1
            if retries == 0:
                raise error
            else:
                logger.info(f"Retrying in {retry_interval} seconds. Retrying {retries} more times")
                time.sleep(retry_interval)


def _create_updated_admin_policy(new_policy_statements, table):
    """creates the policy statements in the admin policy allowing access to the newly created group.
    If any of the given policy statements already exist, we replace them. If the admin policy does not exist, creates one.

    Args:
        new_policy_statements (list): List of policy statements to be added
        table (Table): table to retrieve admin policy from

    Returns:
        dict: The updated admin policy
    """
    admin_policy = {}
    try:
        admin_policy = table.get_item(Key={"group": "admin"})["Item"]["policy"]
        statement_ids_to_replace = {statement["Sid"] for statement in new_policy_statements}

        admin_policy["Statement"] = [
            statement for statement in admin_policy["Statement"] if statement["Sid"] not in statement_ids_to_replace
        ]

        admin_policy["Statement"].extend(new_policy_statements)

    except KeyError:
        logger.info("No policy found for the admin group. Creating one.")
        admin_policy = {"Version": "2012-10-17", "Statement": new_policy_statements}

    return admin_policy


@tracer.capture_method
def delete(event, context):
    """This method provides implementation for the 'Delete' event for CloudFormation Custom Resource creation. As part of the delete event, the resource
    policy will be deleted

    Args:
        event (LambdaEvent): An event object received by the lambda function that is passed by AWS services when invoking the function's handler
        context (LambdaContext): A context object received by the lambda function that is passed by AWS services when invoking the function's handler

    Raises:
        botocore.exceptions.ClientError: If the service call to delete resource policy for CloudWatch logs fails
    """
    group_name = event[RESOURCE_PROPERTIES][GROUP_NAME]

    ddb = get_service_resource("dynamodb")

    try:
        table = ddb.Table(event[RESOURCE_PROPERTIES][POLICY_TABLE_NAME])
        table.delete_item(Key={"group": group_name})

        try:
            admin_policy = table.get_item(Key={"group": "admin"})["Item"]["policy"]

            logger.info(f"Current admin policy statements: {json.dumps(admin_policy['Statement'])}")

            statement_patterns = [
                f"{group_name}-policy-statement",
                f"{group_name}-details-policy-statement",
                f"{group_name}-feedback-policy-statement",
            ]

            original_length = len(admin_policy["Statement"])
            admin_policy["Statement"] = [
                statement
                for statement in admin_policy["Statement"]
                if not any(pattern in statement["Sid"] for pattern in statement_patterns)
            ]

            new_length = len(admin_policy["Statement"])
            logger.info(f"Removed {original_length - new_length} statements")
            logger.info(f"Updated admin policy statements: {json.dumps(admin_policy['Statement'])}")

            table.put_item(Item={"group": "admin", "policy": admin_policy})

        except KeyError:
            logger.info("No policy found for the admin group. Skipping deletion.")
            return

    except ddb.meta.client.exceptions.ResourceNotFoundException as error:
        logger.warning(f"Policy table {event[RESOURCE_PROPERTIES][POLICY_TABLE_NAME]} not found. Skipping deletion.")
        return
    except botocore.exceptions.ClientError as error:
        logger.error(f"Error occurred when deleting item(s) in policy table, error is {error}")
        raise error


@tracer.capture_method
def execute(event, context):
    """This sub-module implements creation of resource policies for API access to deployed use cases. Policies for a given group are maintained in the
    DynamoDB policy table. When this custom resource is invoked for a new deployment, a policy is created for the newly created group which grants
    access to invoking the API. In addition, the admin user group must also be granted access to the newly created API.

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

        if event["RequestType"] == "Create" or event["RequestType"] == "Update":
            create(event, context)
        elif event["RequestType"] == "Delete":
            delete(event, context)

        send_response(event, context, SUCCESS, {}, physical_resource_id)
    except Exception as ex:
        logger.error(f"Error occurred when updating log policy for Open Search. Error is {ex}")
        send_response(event, context, FAILED, {}, physical_resource_id=physical_resource_id, reason=str(ex))
