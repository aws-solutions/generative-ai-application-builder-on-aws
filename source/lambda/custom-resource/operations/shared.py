#!/usr/bin/env python
# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

import io
import time
import zipfile

import botocore
from aws_lambda_powertools import Logger, Tracer
from botocore.exceptions import ClientError

logger = Logger(utc=True)
tracer = Tracer()

MAX_RETRIES = 5
RETRY_DELAY_BASE = 3
TRANSIENT_ERROR_CODES = [
    "ThrottlingException",
    "ServiceUnavailableException",
    "InternalServerException",
    "RequestTimeoutException",
    "TooManyRequestsException",
    "ImageNotFoundException",
    "RepositoryNotFoundException",
]
IAM_PROPAGATION_ERROR_CODES = ("AccessDeniedException", "ValidationException")

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


def _calculate_retry_delay(error_code, attempt, base_delay=None):
    """Calculate delay for retry based on error type and attempt number."""
    retry_delay_base = base_delay if base_delay is not None else RETRY_DELAY_BASE
    if error_code in IAM_PROPAGATION_ERROR_CODES:
        # Use longer delays for IAM propagation (15, 45, 30, 30, 30 seconds capped at 30)
        return min(30, 5 * (retry_delay_base**attempt))
    # Cap delay at 30 seconds to prevent extremely long waits
    return min(30, retry_delay_base**attempt)


def _log_retry_warning(error_code, error_message, attempt, delay, max_retries=None):
    """Log appropriate warning message based on error type."""
    max_retry_count = max_retries if max_retries is not None else MAX_RETRIES
    if error_code in IAM_PROPAGATION_ERROR_CODES:
        logger.warning(
            f"IAM {error_code} on attempt {attempt + 1}/{max_retry_count + 1}: {error_message}. "
            f"This is likely due to IAM policy propagation delay. Retrying in {delay} seconds..."
        )
    else:
        logger.warning(
            f"Transient error {error_code} on attempt {attempt + 1}/{max_retry_count + 1}: {error_message}. "
            f"Retrying in {delay} seconds..."
        )


def _is_retryable_error(error_code, attempt, max_retries=None):
    """Check if error is retryable based on error code and attempt count."""
    max_retry_count = max_retries if max_retries is not None else MAX_RETRIES
    return (error_code in TRANSIENT_ERROR_CODES or error_code in IAM_PROPAGATION_ERROR_CODES) and attempt < max_retry_count


def _handle_client_error(error, attempt, max_retries=None, base_delay=None):
    """Handle ClientError with retry logic."""
    error_code = error.response["Error"]["Code"]
    error_message = error.response["Error"]["Message"]
    max_retry_count = max_retries if max_retries is not None else MAX_RETRIES

    if _is_retryable_error(error_code, attempt, max_retries):
        delay = _calculate_retry_delay(error_code, attempt, base_delay)
        _log_retry_warning(error_code, error_message, attempt, delay, max_retries)
        time.sleep(delay)
        return error  # Return exception to track as last_exception

    if attempt == max_retry_count:
        logger.error(f"Max retries ({max_retry_count}) reached for transient error: {error_code}")
    raise error


@tracer.capture_method
def retry_with_backoff(func, *args, max_attempts=None, base_delay=None, **kwargs):
    """
    Execute a function with exponential backoff retry logic for transient failures.

    Args:
        func: Function to execute
        *args: Positional arguments for the function
        max_attempts: Maximum number of retry attempts (default: MAX_RETRIES)
        base_delay: Base delay in seconds for exponential backoff (default: RETRY_DELAY_BASE)
        **kwargs: Keyword arguments for the function

    Returns:
        Function result on success

    Raises:
        ClientError: If all retries are exhausted or non-transient error occurs
        Exception: For unexpected errors
    """
    max_retries = max_attempts - 1 if max_attempts is not None else MAX_RETRIES
    last_exception = None

    for attempt in range(max_retries + 1):
        try:
            return func(*args, **kwargs)
        except ClientError as e:
            last_exception = _handle_client_error(e, attempt, max_retries, base_delay)
        except Exception as e:
            logger.error(f"Non-retryable error in retry_with_backoff: {str(e)}")
            raise e

    if last_exception:
        raise last_exception
