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
import mimetypes
import os
import uuid

import boto3
import botocore
from aws_lambda_powertools import Logger, Tracer
from cfn_response import send_response
from helper import get_service_client, get_service_resource
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
from operations.shared import get_zip_archive
from utils.lambda_context_parser import get_invocation_account_id

DESTINATION_BUCKET_NAME = "DESTINATION_BUCKET_NAME"
WEBSITE_CONFIG_PARAM_KEY = "WEBSITE_CONFIG_PARAM_KEY"
WEBSITE_CONFIG_FILE_NAME = "runtimeConfig.json"

logger = Logger(utc=True)
tracer = Tracer()


@tracer.capture_method
def get_params(ssm_param_key):
    logger.debug("Getting web params from Parameter Store. Parameter key: ")
    ssm = get_service_client("ssm")

    param_str_value = None
    try:
        param_str_value = ssm.get_parameter(Name=ssm_param_key, WithDecryption=True)["Parameter"]["Value"]
    except botocore.exceptions.ClientError as error:
        logger.error(f"Error in retrieving configuration from parameter store. The key provided is {ssm_param_key}")
        raise error
    return param_str_value


@tracer.capture_method
def verify_env_setup(event):
    """This method verifies if all the necessary properties are correctly set in the event object as received by the lambda function's handler

    Args:
        event (LambdaEvent): An event received by the lambda function that is passed by AWS services when invoking the function's handler

    Raises:
        ValueError: If any of the properties in the custom resource properties are not set correctly or are not available
    """
    if event[RESOURCE_PROPERTIES][RESOURCE] != operation_types.COPY_WEB_UI:
        err_msg = f"Operation type not available or did not match from the request. Expecting operation type to be {operation_types.COPY_WEB_UI}"
        logger.error(f"{err_msg}. Here is the resource properties received {json.dumps(event[RESOURCE_PROPERTIES])}")
        raise ValueError(err_msg)

    if (
        event[RESOURCE_PROPERTIES].get(SOURCE_BUCKET_NAME, None) in ["", None]
        or event[RESOURCE_PROPERTIES].get(DESTINATION_BUCKET_NAME, None) in ["", None]
        or event[RESOURCE_PROPERTIES].get(SOURCE_PREFIX, None) in ["", None]
        or event[RESOURCE_PROPERTIES].get(WEBSITE_CONFIG_PARAM_KEY) in ["", None]
    ):
        err_msg = f"Either {SOURCE_BUCKET_NAME}, {SOURCE_PREFIX}, {DESTINATION_BUCKET_NAME}, or {WEBSITE_CONFIG_PARAM_KEY} has not been passed. Hence operation cannot be performed"
        logger.error(f"{err_msg}. Here is the resource properties received {json.dumps(event[RESOURCE_PROPERTIES])}")
        raise ValueError(err_msg)


@tracer.capture_method
def delete(s3_resource, destination_bucket_name):
    """This method implements the operations to be performed when a `delete` event is received by a AWS CloudFormation custom resource. This method
    requires delete permissions on the destination bucket. All objects including any versions of the templates will be deleted from the destination
    bucket.

    Args:
        s3_resource (boto3.s3): A boto3 resource for the S3 service
        destination_bucket_name (str): Bucket name created during deployment where website content was uploaded after unzipping them from the archive

    Raises
        botocore.exceptions.ClientError: Failures related to S3 bucket operations
    """
    logger.warning(f"Deleting all web content from {destination_bucket_name} including any versions of those objects")
    try:
        destination_bucket = s3_resource.Bucket(destination_bucket_name)
        destination_bucket.object_versions.delete()
    except botocore.exceptions.ClientError as error:
        logger.error(f"Error occurred when deleting objects, error is {error}")
        raise error


@tracer.capture_method
def create(
    s3_resource,
    source_bucket_name,
    source_prefix,
    destination_bucket_name,
    ssm_param_key,
    invocation_account_id,
):
    """This method implements the operations to be performed when a `create` (or update) event is received by a AWS CloudFormation
    custom resource. As implementation, this method copies the UI artifacts from the source bucket to the website bucket.
    The source bucket contains the assets as a compressed zip. This method decompresses the files and uploads them to the destination
    bucket. This operation requires read permissions to the source S3 bucket and write permissions to the destination bucket.

    Args:
        s3_resource (boto3.resource): A boto3 resource for the S3 service
        source_bucket_name (str): Bucket name which contains the asset archive with email templates
        source_prefix (str): The prefix under the source bucket which corresponds to the archive for email templates
        destination_bucket_name (str): Bucket name created during deployment where email templates will be uploaded after unzipping them from the archive
        ssm_param_key (str): The key in SSM parameter store which contains the JSON string for the web configuration
        invocation_account_id (str): Account Id of parsed from the lambda context, used to set expected bucket owner for all s3 api calls

    Raises:
        botocore.exceptions.ClientError: Failures related to S3 bucket operations
    """
    zip_archive = get_zip_archive(s3_resource, source_bucket_name, source_prefix)

    for filename in zip_archive.namelist():
        logger.info(f"Copying {filename} to {destination_bucket_name}")
        (content_type, _) = mimetypes.guess_type(filename)
        content_type = "binary/octet-stream" if content_type is None else content_type

        try:
            s3_resource.meta.client.put_object(
                Body=zip_archive.open(filename),
                Bucket=destination_bucket_name,
                Key=filename,
                ContentType=content_type,
            )
        except botocore.exceptions.ClientError as error:
            logger.error(f"Error occurred when uploading file object, error is {error}")
            raise error
    try:
        s3_resource.meta.client.put_object(
            Body=get_params(ssm_param_key),
            Bucket=destination_bucket_name,
            Key=WEBSITE_CONFIG_FILE_NAME,
            ContentType="application/json",
            ExpectedBucketOwner=invocation_account_id,
        )
    except botocore.exceptions.ClientError as error:
        logger.error(f"Error occurred when copying web configuration file, error is {error}")
        raise error

    logger.debug(
        "Finished uploading. Bucket %s has %s files"
        % (
            {destination_bucket_name},
            len(list(s3_resource.Bucket(destination_bucket_name).objects.all())),
        )
    )


@tracer.capture_method
def execute(event, context):
    """This method provides implementation to copy web ui to s3 bucket from a zip artifact.

    Args:
        event (LambdaEvent): An event object received by the lambda function that is passed by AWS services when invoking the function's handler
        context (LambdaContext): A context object received by the lambda function that is passed by AWS services when invoking the function's handler

    Raises:
        Exception: Any failures during the execution of this method
    """

    physical_resource_id = None

    try:
        verify_env_setup(event)
        # Since the underlying resource (an s3 bucket) should never be deleted on update, we must maintain the same
        # fixed physical_resource_id we receive in the event when sending the response.
        # See explanation: https://stackoverflow.com/questions/50599602/updating-custom-resources-causes-them-to-be-deleted
        physical_resource_id = event.get(PHYSICAL_RESOURCE_ID, uuid.uuid4().hex[:8])
        source_bucket_name = event[RESOURCE_PROPERTIES][SOURCE_BUCKET_NAME]
        source_prefix = event[RESOURCE_PROPERTIES][SOURCE_PREFIX]
        destination_bucket_name = event[RESOURCE_PROPERTIES][DESTINATION_BUCKET_NAME]
        ssm_param_key = event[RESOURCE_PROPERTIES][WEBSITE_CONFIG_PARAM_KEY]

        s3_resource = get_service_resource("s3")

        if event["RequestType"] == "Create" or event["RequestType"] == "Update":
            create(
                s3_resource,
                source_bucket_name,
                source_prefix,
                destination_bucket_name,
                ssm_param_key,
                get_invocation_account_id(context),
            )
        elif event["RequestType"] == "Delete":
            delete(s3_resource, destination_bucket_name)
        send_response(event, context, SUCCESS, {}, physical_resource_id)
    except Exception as ex:
        logger.error(f"Error occurred when copying UI assets to S3 bucket, Error is {ex}")
        send_response(event, context, FAILED, {}, physical_resource_id=physical_resource_id, reason=str(ex))
