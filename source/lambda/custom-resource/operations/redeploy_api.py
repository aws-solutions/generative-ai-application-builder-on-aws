#!/usr/bin/env python
# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

import botocore
import uuid
from aws_lambda_powertools import Logger, Tracer
from cfn_response import send_response
from helper import get_service_client
from operations import operation_types
from operations.operation_types import (
    FAILED,
    PHYSICAL_RESOURCE_ID,
    RESOURCE,
    RESOURCE_PROPERTIES,
    SOURCE_BUCKET_NAME,
    SOURCE_PREFIX,
    SUCCESS,
)
from utils.constants import DEFAULT_API_GATEWAY_STAGE

logger = Logger(utc=True)
tracer = Tracer()


@tracer.capture_method
def update_stage(api_gateway_client, rest_api_id):
    """This method implements the operations to be performed when a `create` (or update) event is received by a AWS CloudFormation
    custom resource. As implementation, this method redeploys the rest api provided in rest_api_id.

    Args:
        api_gateway_client (boto3.client): A boto3 client for the API Gateway service
        rest_api_id (str): Bucket name which contains the asset archive with email templates

    Raises:
        botocore.exceptions.ClientError: Failures related to S3 bucket operations
    """
    try:
        deployment = api_gateway_client.create_deployment(restApiId=rest_api_id)

        api_gateway_client.update_stage(
            restApiId=rest_api_id,
            stageName=DEFAULT_API_GATEWAY_STAGE,
            patchOperations=[{"op": "replace", "path": "/deploymentId", "value": deployment["id"]}],
        )

    except botocore.exceptions.ClientError as error:
        # If prod stage does not exist, this rest API does not need a redeployment.
        error_code = error.response.get("Error", {}).get("Code", "")
        if error_code == "NotFoundException":
            logger.warning(f"Prod stage not found when redeploying Rest API {rest_api_id}: {error}")
        else:
            logger.error(f"Error occurred when redeploying your Rest API {rest_api_id}, error is {error}")
            raise error


@tracer.capture_method
def execute(event, context):
    """This method provides implementation to redeploy a rest api after all endpoints have created.

    Args:
        event (LambdaEvent): An event object received by the lambda function that is passed by AWS services when invoking the function's handler
        context (LambdaContext): A context object received by the lambda function that is passed by AWS services when invoking the function's handler

    Raises:
        Exception: Any failures during the execution of this method
    """
    physical_resource_id = None
    rest_api_id = None

    try:
        physical_resource_id = event.get(PHYSICAL_RESOURCE_ID, uuid.uuid4().hex[:8])
        rest_api_id = event["ResourceProperties"]["REST_API_ID"]
        api_gateway_client = get_service_client("apigateway")

        if event["RequestType"] == "Create" or event["RequestType"] == "Update":
            update_stage(api_gateway_client, rest_api_id)

        send_response(event, context, SUCCESS, {}, physical_resource_id)
    except Exception as ex:
        logger.error(f"Error occurred when redeploying your REST API, Error is {ex}")
        send_response(event, context, FAILED, {}, physical_resource_id=physical_resource_id, reason=str(ex))
