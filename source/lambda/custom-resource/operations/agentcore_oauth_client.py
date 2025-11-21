#!/usr/bin/env python
# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

import uuid

from aws_lambda_powertools import Logger, Tracer
from helper import get_service_client
from cfn_response import send_response
from operations import operation_types
from operations.operation_types import FAILED, PHYSICAL_RESOURCE_ID, RESOURCE, RESOURCE_PROPERTIES, SUCCESS

logger = Logger(utc=True)
tracer = Tracer()

# Required keys in the incoming event object
CLIENT_ID = "CLIENT_ID"
CLIENT_SECRET = "CLIENT_SECRET"
DISCOVERY_URL = "DISCOVERY_URL"
PROVIDER_NAME = "PROVIDER_NAME"
AWS_REGION = "AWS_REGION"

# other constants
OPERATION_TYPE = operation_types.AGENTCORE_OAUTH_CLIENT


class AgentCoreIdentityError(Exception):
    """Raised when AgentCore Identity API calls fail"""
    pass


@tracer.capture_method
def verify_env_setup(event):
    """This method verifies if all the necessary properties are correctly set in the event object as received by the lambda function's handler

    Args:
        event (LambdaEvent): An event received by the lambda function that is passed by AWS services when invoking the function's handler

    Raises:
        ValueError: If any of the properties in the custom resource properties are not set correctly or are not available
    """
    if event[RESOURCE_PROPERTIES][RESOURCE] != OPERATION_TYPE:
        err_msg = f"Operation type not available or did not match from the request. Expecting operation type to be {OPERATION_TYPE}"
        logger.error(err_msg)
        raise ValueError(err_msg)

    required_fields = [CLIENT_ID, CLIENT_SECRET, DISCOVERY_URL, PROVIDER_NAME]
    for field in required_fields:
        if event[RESOURCE_PROPERTIES].get(field, None) in ["", None]:
            err_msg = f"{field} has not been passed. Hence operation cannot be performed"
            logger.error(err_msg)
            raise ValueError(err_msg)


@tracer.capture_method
def create(event, context):
    """This method creates an OAuth2 credential provider using the AgentCore Identity client.

    Args:
        event (LambdaEvent): An event object received by the lambda function that is passed by AWS services when invoking the function's handler
        context (LambdaContext): A context object received by the lambda function that is passed by AWS services when invoking the function's handler

    Returns:
        dict: Response containing the provider ID

    Raises:
        AgentCoreIdentityError: If the API call to create OAuth client fails
    """
    client_id = event[RESOURCE_PROPERTIES][CLIENT_ID]
    client_secret = event[RESOURCE_PROPERTIES][CLIENT_SECRET]
    discovery_url = event[RESOURCE_PROPERTIES][DISCOVERY_URL]
    provider_name = event[RESOURCE_PROPERTIES][PROVIDER_NAME]

    try:
        bedrock_agentcore_client = get_service_client("bedrock-agentcore-control")
        bedrock_agentcore_client.create_oauth2_credential_provider(
            name=provider_name,
            credentialProviderVendor="CustomOauth2",
            oauth2ProviderConfigInput={
                "customOauth2ProviderConfig": {
                    "oauthDiscovery": {
                        "discoveryUrl": discovery_url
                    },
                    "clientId": client_id,
                    "clientSecret": client_secret,
                }
            }
        )

        logger.info(f"Successfully created OAuth2 provider {provider_name}")

    except Exception as error:
        logger.error(f"Error occurred when creating OAuth2 provider, error is {error}")
        raise AgentCoreIdentityError(f"Failed to create OAuth2 provider: {error}") from error


@tracer.capture_method
def delete(event, context):
    """This method deletes the OAuth2 credential provider using bedrock-agentcore-control client.

    Args:
        event (LambdaEvent): An event object received by the lambda function that is passed by AWS services when invoking the function's handler
        context (LambdaContext): A context object received by the lambda function that is passed by AWS services when invoking the function's handler

    Raises:
        AgentCoreIdentityError: If the API call to delete OAuth client fails
    """
    provider_name = event[RESOURCE_PROPERTIES][PROVIDER_NAME]

    try:
        bedrock_agentcore_client = get_service_client("bedrock-agentcore-control")
        bedrock_agentcore_client.delete_oauth2_credential_provider(name=provider_name)
        logger.info(f"Successfully deleted OAuth2 provider {provider_name}")

    except Exception as error:
        logger.error(f"Error occurred when deleting OAuth2 provider, error is {error}")
        raise AgentCoreIdentityError(f"Failed to delete OAuth2 provider: {error}") from error


@tracer.capture_method
def execute(event, context):
    """This sub-module implements creation and deletion of AgentCore OAuth2 credential providers.

    Args:
        event (LambdaEvent): An event object received by the lambda function that is passed by AWS services when invoking the function's handler
        context (LambdaContext): A context object received by the lambda function that is passed by AWS services when invoking the function's handler

    Raises:
        Exception: if there are any errors in creating or deleting OAuth client. During the handling of this exception it also sends a 'FAILED' status to
        the AWS Cloudformation service.
    """
    physical_resource_id = event.get(PHYSICAL_RESOURCE_ID, uuid.uuid4().hex[:8])

    try:
        verify_env_setup(event)

        if event["RequestType"] == "Create":
            create(event, context)
            send_response(event, context, SUCCESS, {}, physical_resource_id)
        elif event["RequestType"] == "Delete":
            delete(event, context)
            send_response(event, context, SUCCESS, {}, physical_resource_id)
        else:
            logger.info(f"Operation type {event['RequestType']} is a no-op operation.")
            send_response(event, context, SUCCESS, {}, physical_resource_id)

    except Exception as ex:
        logger.error(f"Error occurred when managing OAuth2 provider. Error is {ex}")
        send_response(event, context, FAILED, {}, physical_resource_id=physical_resource_id, reason=str(ex))
