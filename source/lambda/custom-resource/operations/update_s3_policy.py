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
import uuid

import boto3
import botocore
from aws_lambda_powertools import Logger, Tracer
from cfn_response import send_response
from helper import get_service_client
from operations import operation_types
from operations.operation_types import (
    FAILED,
    LOGGING_BUCKET_NAME,
    PHYSICAL_RESOURCE_ID,
    RESOURCE,
    RESOURCE_PROPERTIES,
    SOURCE_BUCKET_NAME,
    SOURCE_PREFIX,
    SUCCESS,
)

POLICY_SID = "AccessLogsPolicy"
STATEMENT = "Statement"

logger = Logger(utc=True)
tracer = Tracer()


def create(event, context):
    """
    This function updates the logging bucket's policy so that the source bucket can write access logs to
    the logging bucket. It first disables `BlockPublicPolicy`, retrieves the existing policy and then
    appends the new statement to the existing policy.

    Post completion of updating the policy, it sets all the `PublicAccessBlockConfiguration` to `True`

    Args:
        event (LambdaEvent): An event received by the lambda function that is passed by AWS services when invoking the function's handler
        context (LambdaContext): A context object received by the lambda function that is passed by AWS services when invoking the function's handler
    """
    account_id = context.invoked_function_arn.split(":")[4]
    aws_partition = context.invoked_function_arn.split(":")[1]
    source_bucket_name = event[RESOURCE_PROPERTIES][SOURCE_BUCKET_NAME]
    logging_bucket_name = event[RESOURCE_PROPERTIES][LOGGING_BUCKET_NAME]
    source_prefix = event[RESOURCE_PROPERTIES][SOURCE_PREFIX]

    s3 = get_service_client("s3")

    s3.put_public_access_block(
        Bucket=logging_bucket_name,
        PublicAccessBlockConfiguration={
            "BlockPublicAcls": True,
            "IgnorePublicAcls": True,
            "BlockPublicPolicy": False,
            "RestrictPublicBuckets": True,
        },
        ExpectedBucketOwner=account_id,
    )

    policy_string = s3.get_bucket_policy(Bucket=logging_bucket_name)["Policy"]
    bucket_policy = json.loads(policy_string)

    update_policy = True

    for statement in bucket_policy[STATEMENT]:
        logger.debug(f"Statement is {json.dumps(statement)}")
        if "Sid" in statement and statement["Sid"] == f"{POLICY_SID}For{source_prefix}":
            if (
                f"arn:{aws_partition}:s3:::{source_bucket_name}"
                not in statement["Condition"]["ArnLike"]["aws:SourceArn"]
            ):
                bucket_policy[STATEMENT].remove(statement)
                logger.info("Bucket policy exists but with a different bucket, hence removing it")
                break
            else:
                logger.info("Bucket policy exists, hence update not required")
                update_policy = False
                break

    if update_policy:
        bucket_policy[STATEMENT].append(
            {
                "Action": "s3:PutObject",
                "Condition": {
                    "ArnLike": {"aws:SourceArn": [f"arn:{aws_partition}:s3:::{source_bucket_name}"]},
                    "StringEquals": {"aws:SourceAccount": account_id},
                },
                "Effect": "Allow",
                "Principal": {"Service": "logging.s3.amazonaws.com"},
                "Resource": f"arn:{aws_partition}:s3:::{logging_bucket_name}/{source_prefix}/*",
                "Sid": f"{POLICY_SID}For{source_prefix}",
            }
        )

        s3.put_bucket_policy(Bucket=logging_bucket_name, Policy=json.dumps(bucket_policy))

    s3.put_public_access_block(
        Bucket=logging_bucket_name,
        PublicAccessBlockConfiguration={
            "BlockPublicAcls": True,
            "IgnorePublicAcls": True,
            "BlockPublicPolicy": True,
            "RestrictPublicBuckets": True,
        },
        ExpectedBucketOwner=account_id,
    )
    logger.info("Policy Updated successfully. Sending success response to CloudFormation")


@tracer.capture_method
def verify_env_setup(event):
    if event[RESOURCE_PROPERTIES][RESOURCE] != operation_types.UPDATE_BUCKET_POLICY:
        err_msg = f"Operation type not available or did not match from the request. Expecting operation type to be {operation_types.COPY_SAMPLE_DOCUMENTS}"
        logger.error(f"{err_msg}. Here are the resource properties received {json.dumps(event[RESOURCE_PROPERTIES])}")
        raise ValueError(err_msg)

    if (
        event[RESOURCE_PROPERTIES].get(LOGGING_BUCKET_NAME) is None
        or event[RESOURCE_PROPERTIES].get(SOURCE_BUCKET_NAME) is None
        or event[RESOURCE_PROPERTIES].get(SOURCE_PREFIX) is None
    ):
        err_msg = f"Missing logging bucket name or source bucket name or source prefix. Here are the resource properties received {json.dumps(event[RESOURCE_PROPERTIES])}"
        logger.error(err_msg)
        raise ValueError(err_msg)


@tracer.capture_method
def execute(event, context):
    """This method provides implementation to update the s3 bucket policy for logging buckets

    Args:
        event (LambdaEvent): An event object received by the lambda function that is passed by AWS services when invoking the function's handler
        context (LambdaContext): A context object received by the lambda function that is passed by AWS services when invoking the function's handler

    Raises:
        Exception: Any failures during the execution of this method
    """
    physical_resource_id = None

    try:
        verify_env_setup(event)
        physical_resource_id = event.get(PHYSICAL_RESOURCE_ID, uuid.uuid4().hex[:8])
        if event["RequestType"] == "Create" or event["RequestType"] == "Update":
            create(event, context)
        send_response(event, context, SUCCESS, {}, physical_resource_id)
    except Exception as ex:
        logger.error(f"Failed to update policy, error is {str(ex)}")
        send_response(event, context, FAILED, {}, physical_resource_id=physical_resource_id, reason=str(ex))
