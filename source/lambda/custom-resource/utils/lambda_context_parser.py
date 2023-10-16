#!/usr/bin/env python
# *********************************************************************************************************************
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
# ********************************************************************************************************************#

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
