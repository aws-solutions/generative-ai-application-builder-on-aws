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
API_ARN = "API_ARN"


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
        or event[RESOURCE_PROPERTIES].get(API_ARN, None) in ["", None]
        or event[RESOURCE_PROPERTIES].get(POLICY_TABLE_NAME, None) in ["", None]
    ):
        err_msg = f"Either {GROUP_NAME} or {API_ARN} or {POLICY_TABLE_NAME} has not been passed. Hence operation cannot be performed"
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
    api_arn = event[RESOURCE_PROPERTIES][API_ARN]

    ddb = get_service_resource("dynamodb")

    while retries > 0:
        try:
            # Policy for this group is put in policy table (put overwrites existing, so this applies for updates as well)
            new_policy_statement = {
                "Sid": f"{group_name}-policy-statement",
                "Effect": "Allow",
                "Action": "execute-api:Invoke",
                "Resource": [
                    f"{api_arn}",
                ],
            }
            table = ddb.Table(event[RESOURCE_PROPERTIES][POLICY_TABLE_NAME])
            table.put_item(
                Item={
                    "group": group_name,
                    "policy": {"Version": "2012-10-17", "Statement": [new_policy_statement]},
                }
            )

            # Policy for the admin group updated to allow invoking this new API
            admin_policy = _create_updated_admin_policy(group_name, new_policy_statement, table)
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


def _create_updated_admin_policy(group_name, new_policy_statement, table):
    """creates the policy statement in the admin policy allowing access to the newly created group.
    If the given policy statement already exists, we replace it. If the admin policy does not exist, creates one.

    Args:
        group_name (str): name of the user group the admin will get access to.
        new_policy_statement (Object): Policy statement to be added
        table (Table): table to retrieve admin policy from

    Returns:
        _type_: _description_
    """
    admin_policy = {}
    try:
        admin_policy = table.get_item(Key={"group": "admin"})["Item"]["policy"]
        group_statement_existed = False
        # checking if a policy statement for the given group exists already. If yes, replace it with the new one.
        for idx, statement in enumerate(admin_policy["Statement"]):
            if statement["Sid"] == f"{group_name}-policy-statement":
                logger.info(f"Policy statement for {group_name} already exists on the admin group. Replacing.")
                group_statement_existed = True
                admin_policy["Statement"][idx] = new_policy_statement
                break
        if not group_statement_existed:
            admin_policy["Statement"].append(new_policy_statement)
    except KeyError:
        logger.info("No policy found for the admin group. Creating one.")
        admin_policy = {"Version": "2012-10-17", "Statement": [new_policy_statement]}
    return admin_policy


@tracer.capture_method
def delete(event, context):
    """This method provides implementation for the 'Delete vent for CloudFormation Custom Resource creation. As part of the delete event, the resource
    policy will lbe deleted

    Args:
        event (LambdaEvent): An event object received by the lambda function that is passed by AWS services when invoking the function's handler
        context (LambdaContext): A context object received by the lambda function that is passed by AWS services when invoking the function's handler

    Raises:
        botocore.exceptions.ClientError: If the service call to delete resource policy for CloudWatch logs fails
    """
    group_name = event[RESOURCE_PROPERTIES][GROUP_NAME]

    ddb = get_service_resource("dynamodb")

    try:
        # deleting the group policy
        table = ddb.Table(event[RESOURCE_PROPERTIES][POLICY_TABLE_NAME])
        table.delete_item(Key={"group": group_name})

        # Removing the policy statement from the admin group policy
        try:
            admin_policy = table.get_item(Key={"group": "admin"})["Item"]["policy"]
            admin_policy["Statement"] = [
                statement
                for statement in admin_policy["Statement"]
                if statement["Sid"] != f"{group_name}-policy-statement"
            ]
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
