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
import os

from aws_lambda_powertools import Logger, Tracer
from botocore.exceptions import ClientError
from cfn_response import send_response
from helper import get_service_client
from operations import operation_types
from operations.operation_types import FAILED, PHYSICAL_RESOURCE_ID, RESOURCE, RESOURCE_PROPERTIES, SUCCESS

logger = Logger(utc=True)
tracer = Tracer()

# constants defining the minimum required properties for the custom resource
SSM_KEY = "SSMKey"
API_ENDPOINT = "ApiEndpoint"
USER_POOL_ID = "UserPoolId"
USER_POOL_CLIENT_ID = "UserPoolClientId"
SERVICE_TOKEN = "ServiceToken"
IS_INTERNAL_USER = "IsInternalUser"
USE_CASE_CONFIG = "UseCaseConfig"
GAAB_SSM_CONFIG_PREFIX = "/gaab"

# keys in the incoming event object which will not be saved to the web config
CONFIG_EXCLUDE_KEYS = [RESOURCE, SSM_KEY, SERVICE_TOKEN]


@tracer.capture_method
def verify_env_setup(event):
    """This method verifies if all the necessary properties are correctly set in the event object as received by the lambda function's handler

    Args:
        event (LambdaEvent): An event received by the lambda function that is passed by AWS services when invoking the function's handler

    Raises:
        ValueError: If any of the properties in the custom resource properties are not set correctly or are not available
    """
    if event[RESOURCE_PROPERTIES][RESOURCE] != operation_types.WEBCONFIG:
        err_msg = f"Operation type not available or did not match from the request. Expecting operation type to be {operation_types.WEBCONFIG}"
        logger.error(f"{err_msg}. Here are the resource properties received {json.dumps(event[RESOURCE_PROPERTIES])}")
        raise ValueError(err_msg)

    if event[RESOURCE_PROPERTIES].get(SSM_KEY, None) in ["", None] or (
        event["RequestType"] != "Delete"
        and (
            event[RESOURCE_PROPERTIES].get(API_ENDPOINT, None) in ["", None]
            or event[RESOURCE_PROPERTIES].get(USER_POOL_ID, None) in ["", None]
            or event[RESOURCE_PROPERTIES].get(USER_POOL_CLIENT_ID, None) in ["", None]
        )
    ):
        operations = ", ".join(
            [
                SSM_KEY,
                API_ENDPOINT,
                USER_POOL_ID,
                USER_POOL_CLIENT_ID,
            ]
        )
        err_msg = f"Any of {operations} has not been passed. Operation cannot be performed"
        logger.error(f"{err_msg}. Here are the resource properties received {json.dumps(event[RESOURCE_PROPERTIES])}")
        raise ValueError(err_msg)


def retrieve_cognito_hosted_url(event):
    """This method retrieves the Cognito Hosted URL using the AWS SDK based on the provided UserPoolId

    Args:
        event (LambdaEvent): An event object received by the lambda function that is passed by AWS services when invoking the function's handler

    Returns:
        str: Cognito Hosted URL
    """
    cognito = get_service_client("cognito-idp")
    response = cognito.describe_user_pool(UserPoolId=event[RESOURCE_PROPERTIES][USER_POOL_ID])
    if response.get("UserPool", {}).get("Domain", None) is not None:
        return f'{response["UserPool"]["Domain"]}.auth.{os.environ["AWS_REGION"]}.amazoncognito.com'
    return None


@tracer.capture_method
def create(event, context):
    """This method creates a JSON string from all incoming resource properties and writes to SSM Parameter store.

    Args:
        event (LambdaEvent): An event object received by the lambda function that is passed by AWS services when invoking the function's handler
        context (LambdaContext): A context object received by the lambda function that is passed by AWS services when invoking the function's handler

    Raises:
        botocore.exceptions.ClientError: Failures related to SSM Parameter Store PutParameter operation
    """

    ssm = get_service_client("ssm")
    try:
        ssm_key = event[RESOURCE_PROPERTIES][SSM_KEY]

        # Remove keys from the incoming event object which are not required for the web config
        config_dict = {
            k: event[RESOURCE_PROPERTIES][k]
            for k in set(list(event[RESOURCE_PROPERTIES].keys())) - set(CONFIG_EXCLUDE_KEYS)
        }
        config_dict["AwsRegion"] = os.environ["AWS_REGION"]

        config_dict["CognitoDomain"] = retrieve_cognito_hosted_url(event)

        json_config_string = json.dumps(config_dict)

        ssm.put_parameter(
            Name=ssm_key,
            Value=json_config_string,
            Type="SecureString",
            Description="Configuration for Client App",
            Overwrite=True,
            Tier="Intelligent-Tiering",
        )
        logger.info("Writing to SSM Parameter store complete")
    except ClientError as error:
        logger.error((f"Error occurred when inserting/retrieving parameter in SSM parameter store, error is {error}"))
        raise error
    except ValueError as error:
        logger.error(f"Error occurred when retrieving config item, error is {error}")
        raise error


@tracer.capture_method
def delete(event, context):
    """This method deletes the Key and Value from SSM Parameter Store. The Key is retrieved as the physical resource ID from the event object

    Args:
        event (LambdaEvent): An event object received by the lambda function that is passed by AWS services when invoking the function's handler
        context (LambdaContext): A context object received by the lambda function that is passed by AWS services when invoking the function's handler

    Raises
        botocore.exceptions.ClientError: Failures related to SSM Parameter store delete operation
    """
    if event.get(PHYSICAL_RESOURCE_ID, None) not in ["", None] and event[PHYSICAL_RESOURCE_ID].startswith(
        GAAB_SSM_CONFIG_PREFIX
    ):
        ssm = get_service_client("ssm")
        try:
            ssm.delete_parameter(Name=event[PHYSICAL_RESOURCE_ID])
        except ssm.exceptions.ParameterNotFound as error:
            logger.error(f"Parameter not found, hence no delete operation will be performed. Detailed error: {error}")
        except ClientError as error:
            logger.error((f"Error occurred when deleting parameter in SSM parameter store, error is {error}"))
            raise error
    else:
        logger.error("SSM Key not found in the event object. Hence no delete operation will be performed")


@tracer.capture_method
def execute(event, context):
    """This method retrieves the web configuration required by the front-end client stack and stores it in the SSM parameter
    with the provided key. The parameters are:
        - API Endpoint
        - User Pool ID
        - User Pool Client ID
        - Kendra Stack Deployed status
        - AWS Region

    For delete event, the lambda will delete the configuration from SSM Parameter Store.

    Note: for update events, if the SSM Key has changed, it is not possible to delete the old key since the key name is not known.

    Args:
        event (LambdaEvent): An event object received by the lambda function that is passed by AWS services when invoking the function's handler
        context (LambdaContext): A context object received by the lambda function that is passed by AWS services when invoking the function's handler

    Raises:
        Exception: if the custom resource properties are not passed correctly or an error occurs during s3 copy/ transfer
        operation, this method will throw an error. During the handling of this exception it also sends a 'FAILED' status to the  AWS
        Cloudformation service.
    """
    physical_resource_id = event.get(PHYSICAL_RESOURCE_ID, None)
    try:
        verify_env_setup(event)

        if event["RequestType"] == "Create" or event["RequestType"] == "Update":
            create(event, context)
            # when creating or updating, the physical resource id is the new SSM key. This will allow cloudformation to
            # trigger a delete on the old SSM key.
            physical_resource_id = event[RESOURCE_PROPERTIES][SSM_KEY]

        if event["RequestType"] == "Delete":
            delete(event, context)

        send_response(event, context, SUCCESS, {}, physical_resource_id)
    except Exception as ex:
        logger.error(f"Error occurred when creating web client app configuration. Error is {ex}")
        send_response(event, context, FAILED, {}, physical_resource_id=physical_resource_id, reason=str(ex))
