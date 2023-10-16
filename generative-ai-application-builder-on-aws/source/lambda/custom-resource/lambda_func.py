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

import os

from aws_lambda_powertools import Logger, Metrics, Tracer
from aws_lambda_powertools.metrics import MetricUnit
from cfn_response import send_response
from custom_config import DEFAULT_APP_NAME
from operations import (
    admin_policy,
    anonymous_metrics,
    copy_api_key,
    copy_web_ui,
    cw_loggroup_policy,
    gen_uuid,
    operation_types,
    update_s3_policy,
    use_case_policy,
    webconfig,
)
from operations.operation_types import FAILED, RESOURCE, RESOURCE_PROPERTIES

logger = Logger(utc=True)
tracer = Tracer()
metrics = Metrics(namespace=os.environ.get("STACK_NAME", DEFAULT_APP_NAME))


# A dictionary for all custom resource operations invoked from CloudFormation
operations_dictionary = {
    operation_types.GEN_UUID: gen_uuid.execute,
    operation_types.ANONYMOUS_METRIC: anonymous_metrics.execute,
    operation_types.CW_LOGGROUP_POLICY: cw_loggroup_policy.execute,
    operation_types.WEBCONFIG: webconfig.execute,
    operation_types.COPY_WEB_UI: copy_web_ui.execute,
    operation_types.UPDATE_BUCKET_POLICY: update_s3_policy.execute,
    operation_types.COPY_API_KEY: copy_api_key.execute,
    operation_types.USE_CASE_POLICY: use_case_policy.execute,
    operation_types.ADMIN_POLICY: admin_policy.execute,
}


class UnSupportedOperationTypeException(Exception):
    pass


@tracer.capture_method
def get_function_for_resource(resource: str):
    """A factory function that resolves to the function to be called using the operations_dictionary

    Args:
        resource (str): Name of the operation that the custom resource should perform. This name is used as the key to
        look for the implementation in the operations_dictionary

    Raises:
        UnSupportedOperationTypeException: If operation type passed is not supported by the custom resource lambda function

    Returns:
        callable: returns a method that should be invoked to perform the specific custom resource operation
    """
    try:
        return operations_dictionary[resource]
    except KeyError as key_error:
        logger.error(key_error)
        raise UnSupportedOperationTypeException(f"The operation {resource} is not supported")


@metrics.log_metrics(capture_cold_start_metric=True)  # type: ignore
@tracer.capture_lambda_handler
@logger.inject_lambda_context(log_event=True)
def handler(event, context):
    """The main entry point for the custom resource lambda function. It looks for the implementation for the operation type passed in the
    resource properties and invokes that specific operation

    Args:
        event (LambdaEvent): An event object received by the lambda function that is passed by AWS services when invoking the function's handler
        context (LambdaContext): A context object received by the lambda function that is passed by AWS services when invoking the function's handler

    Raises:
        Exception: Any failure that occurs during the operation that the function is supposed to execute
    """
    try:
        operation = get_function_for_resource(event[RESOURCE_PROPERTIES][RESOURCE])
        if operation:
            operation(event, context)
            metrics.add_metric(name=event[RESOURCE_PROPERTIES][RESOURCE], unit=MetricUnit.Count, value=1)
    except Exception as ex:
        logger.error("Error occurred when processing a custom resource operation")
        send_response(event, context, FAILED, {}, reason=str(ex))
        raise ex
