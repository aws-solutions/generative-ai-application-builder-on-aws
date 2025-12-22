#!/usr/bin/env python
# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0


import json
import mimetypes
import uuid
from typing import Optional

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
from utils.constants import (
    USE_CASE_CONFIG_RECORD_CONFIG_ATTRIBUTE_NAME,
    USE_CASE_CONFIG_RECORD_KEY,
    USE_CASE_CONFIG_RECORD_KEY_ATTRIBUTE_NAME,
    USE_CASE_CONFIG_TABLE_NAME,
)
from utils.data import DecimalEncoder
from utils.lambda_context_parser import get_invocation_account_id

DESTINATION_BUCKET_NAME = "DESTINATION_BUCKET_NAME"
WEBSITE_CONFIG_PARAM_KEY = "WEBSITE_CONFIG_PARAM_KEY"
WEBSITE_CONFIG_FILE_NAME = "runtimeConfig.json"
IS_INTERNAL_USER_KEY = "IsInternalUser"
USE_CASE_CONFIG_KEY = "UseCaseConfig"
CLOUDFRONT_DISTRIBUTION_ID = "CLOUDFRONT_DISTRIBUTION_ID"

HTML_NO_CACHE = "no-cache, no-store, must-revalidate"
ASSET_LONG_CACHE = "public, max-age=31536000, immutable"

logger = Logger(utc=True)
tracer = Tracer()


@tracer.capture_method
def get_params(ssm_param_key):
    ssm = get_service_client("ssm")

    param_str_value = None
    try:
        param_str_value = ssm.get_parameter(Name=ssm_param_key, WithDecryption=True)["Parameter"]["Value"]
    except botocore.exceptions.ClientError as error:
        logger.error(f"Error in retrieving configuration from parameter store. The key provided is {ssm_param_key}")
        raise error
    return param_str_value


@tracer.capture_method
def get_usecase_config(table_name: str, key: str) -> dict:
    ddb_resource = get_service_resource("dynamodb")
    config_table = ddb_resource.Table(table_name)
    usecase_config = (
        config_table.get_item(
            Key={USE_CASE_CONFIG_RECORD_KEY_ATTRIBUTE_NAME: key},
        )
        .get("Item", {})
        .get(USE_CASE_CONFIG_RECORD_CONFIG_ATTRIBUTE_NAME)
    )

    if usecase_config is None:
        raise ValueError(f"No record found in the table {table_name} for the key {key}")

    return usecase_config


def create_config_string(
    ssm_param_key, usecase_table_name: Optional[str] = None, usecase_config_key: Optional[str] = None
):
    ssm_params = json.loads(get_params(ssm_param_key))
    if usecase_table_name and usecase_config_key:
        config = get_usecase_config(usecase_table_name, usecase_config_key)

        # IS_INTERNAL_USER_KEY can be populated inside the usecase config via the deployment platform, or be inside the SSM param as determined by the cloudformation stack creating the use case based on inputted email
        config_sourced_is_internal_user = config.pop(IS_INTERNAL_USER_KEY, None)
        ssm_params[IS_INTERNAL_USER_KEY] = (
            "true"
            if ssm_params.get(IS_INTERNAL_USER_KEY, None) == "true" or config_sourced_is_internal_user == "true"
            else "false"
        )

    return json.dumps(ssm_params, cls=DecimalEncoder)


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
    usecase_table_name,
    usecase_config_key,
    invocation_account_id,
    cloudfront_distribution_id: Optional[str] = None,
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
        usecase_table_name (str): Name of the table where the usecase config is stored. Full LLM config will be copied into the runtimeConfig.json file for the UI
        usecase_config_key (str): Key in the usecase table which contains the JSON string for the web configuration.
        invocation_account_id (str): Account Id of parsed from the lambda context, used to set expected bucket owner for all s3 api calls

    Raises:
        botocore.exceptions.ClientError: Failures related to S3 bucket operations
    """

    zip_archive = get_zip_archive(s3_resource, source_bucket_name, source_prefix)

    for filename in zip_archive.namelist():
        logger.info(f"Copying {filename} to {destination_bucket_name}")
        (content_type, _) = mimetypes.guess_type(filename)
        content_type = "binary/octet-stream" if content_type is None else content_type
        cache_control = HTML_NO_CACHE if filename.endswith(".html") else ASSET_LONG_CACHE

        try:
            with zip_archive.open(filename) as file_object:
                s3_resource.meta.client.put_object(
                    Body=file_object,
                    Bucket=destination_bucket_name,
                    Key=filename,
                    ContentType=content_type,
                    CacheControl=cache_control,
                    ExpectedBucketOwner=invocation_account_id,
                )
        except botocore.exceptions.ClientError as error:
            logger.error(f"Error occurred when uploading file object, error is {error}")
            raise error

    try:
        s3_resource.meta.client.put_object(
            Body=create_config_string(ssm_param_key, usecase_table_name, usecase_config_key),
            Bucket=destination_bucket_name,
            Key=WEBSITE_CONFIG_FILE_NAME,
            ContentType="application/json",
            CacheControl="no-cache, no-store, must-revalidate",
            ExpectedBucketOwner=invocation_account_id,
        )
    except botocore.exceptions.ClientError as error:
        logger.error(f"Error occurred when copying web configuration file, error is {error}")
        raise error

    # CloudFront may cache login.html/index.html and JS bundles; invalidate to ensure updates are visible immediately.
    if cloudfront_distribution_id:
        try:
            cf = get_service_client("cloudfront")
            cf.create_invalidation(
                DistributionId=cloudfront_distribution_id,
                InvalidationBatch={
                    "Paths": {"Quantity": 1, "Items": ["/*"]},
                    "CallerReference": str(uuid.uuid4()),
                },
            )
            logger.info(f"Created CloudFront invalidation for distribution {cloudfront_distribution_id}")
        except botocore.exceptions.ClientError as error:
            logger.error(f"Error occurred when creating CloudFront invalidation, error is {error}")
            raise error

    logger.info(
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
        usecase_table_name = event[RESOURCE_PROPERTIES].get(USE_CASE_CONFIG_TABLE_NAME)
        usecase_config_key = event[RESOURCE_PROPERTIES].get(USE_CASE_CONFIG_RECORD_KEY)
        cloudfront_distribution_id = event[RESOURCE_PROPERTIES].get(CLOUDFRONT_DISTRIBUTION_ID)

        logger.info(f"usecase_table_name: {usecase_table_name}")
        logger.info(f"usecase_config_key: {usecase_config_key}")

        s3_resource = get_service_resource("s3")

        if event["RequestType"] == "Create" or event["RequestType"] == "Update":
            create(
                s3_resource,
                source_bucket_name,
                source_prefix,
                destination_bucket_name,
                ssm_param_key,
                usecase_table_name,
                usecase_config_key,
                get_invocation_account_id(context),
                cloudfront_distribution_id,
            )
        elif event["RequestType"] == "Delete":
            delete(s3_resource, destination_bucket_name)
        send_response(event, context, SUCCESS, {}, physical_resource_id)
    except Exception as ex:
        logger.error(f"Error occurred when copying UI assets to S3 bucket, Error is {ex}")
        send_response(event, context, FAILED, {}, physical_resource_id=physical_resource_id, reason=str(ex))
