#!/usr/bin/env python
# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

from aws_lambda_powertools import Logger, Tracer

logger = Logger(utc=True)
tracer = Tracer()

ARN_ACCOUNT_ID_INDEX = 4


@tracer.capture_method
def get_invocation_account_id(lambda_context):
    """Parses the account id from the lambda context.

    Returns:
        str: the account id
    """
    return lambda_context.invoked_function_arn.split(":")[ARN_ACCOUNT_ID_INDEX]
