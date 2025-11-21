#!/usr/bin/env python
# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

import json

import boto3
from aws_lambda_powertools import Logger
from cfn_response import send_response
from helper import get_service_client
from operations.operation_types import FAILED, RESOURCE_PROPERTIES, SUCCESS
from utils.constants import MULTIMODAL_FILES_BUCKET_NAME_ENV_VAR

logger = Logger(utc=True)


def execute(event, context):
    """
    Custom resource operation to enables EventBridge notifications on the S3 bucket by
    calling s3:PutBucketNotification. Without this configuration, the S3 bucket will not be able
    to send any events to EventBridge which is required to trigger Update Metadata Lambda.

    Args:
        event: CloudFormation custom resource event
        context: Lambda context object
    """
    try:
        request_type = event.get("RequestType")
        resource_properties = event.get(RESOURCE_PROPERTIES, {})

        bucket_name = resource_properties.get(MULTIMODAL_FILES_BUCKET_NAME_ENV_VAR)

        if not bucket_name:
            raise ValueError(f"{MULTIMODAL_FILES_BUCKET_NAME_ENV_VAR} is required in ResourceProperties")

        logger.info(f"Processing {request_type} for bucket: {bucket_name}")

        s3_client = get_service_client("s3")

        if request_type in ["Create", "Update"]:
            logger.info(f"Enabling EventBridge notifications for bucket: {bucket_name}")
            s3_client.put_bucket_notification_configuration(
                Bucket=bucket_name, NotificationConfiguration={"EventBridgeConfiguration": {}}
            )

        elif request_type == "Delete":
            logger.info(f"Disabling EventBridge notifications for bucket: {bucket_name}")
            try:
                s3_client.put_bucket_notification_configuration(Bucket=bucket_name, NotificationConfiguration={})
            except Exception as e:
                # Don't fail deletion if bucket doesn't exist or is already cleaned up
                logger.warning(f"Failed to clean up bucket notifications: {str(e)}")

        response_data = {"BucketName": bucket_name, "EventBridgeEnabled": True}

        send_response(event, context, SUCCESS, response_data)
        logger.info(f"Successfully processed {request_type} for bucket notifications")

    except Exception as e:
        logger.error(f"Error configuring bucket notifications: {str(e)}")
        send_response(event, context, FAILED, {}, reason=str(e))
        raise e
