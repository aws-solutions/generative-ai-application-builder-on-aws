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
    logger.debug(f"Reading asset zip file {source_prefix} in bucket {source_bucket_name}")
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
        raise error
    return zip_archive
