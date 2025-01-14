#!/usr/bin/env python
# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

import io
import zipfile

import botocore
from aws_lambda_powertools import Logger, Tracer

logger = Logger(utc=True)
tracer = Tracer()


@tracer.capture_method
def get_zip_archive(s3_resource, source_bucket_name, source_prefix):
    """This method takes the s3 location information for the zip and creates a buffer stream wrapped within a Zipfile
    object so that clients can read the list of files and de-compress from the buffer rather than having to download
    the full zip archive.

    Args:
        source_prefix (str): The prefix under the source bucket which corresponds to the archive for email templates
        source_bucket_name (str): Bucket name which contains the asset archive with email templates
        s3_resource (boto3.resource): A boto3 resource for the S3 service

    Raises:
        botocore.exceptions.ClientError: Failures related to S3 bucket operations
        zipfile.error: For failures related to reading a zip archive or unzipping files from the archive

    Returns:
        zipfile.ZipFile: A reference to the zip archive from which files can be de-compressed
    """
    logger.info(f"Reading asset zip file {source_prefix} in bucket {source_bucket_name}")
    buffer = None
    try:
        asset_zip_object = s3_resource.Object(bucket_name=source_bucket_name, key=f"{source_prefix}")
        buffer = io.BytesIO(asset_zip_object.get()["Body"].read())
    except botocore.exceptions.ClientError as error:
        logger.error(f"Error occurred when reading object, error is {error}")
        raise error

    zip_archive = None
    try:
        zip_archive = zipfile.ZipFile(buffer)
    except zipfile.error as error:
        logger.error(f"Error occurred when opening zip archive, error is {str(error)}")
        buffer.close()
        raise error

    return zip_archive
