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
from custom_config import DEFAULT_APP_NAME
from exceptions.operation_not_found import OperationNotFoundException
from operations import dynamodb_remove_case, operation_types
from operations.constants import DDB_EVENT_SOURCE, PRINCIPAL_ID, REMOVE_EVENT_NAME, USER_IDENTITY_TYPE

logger = Logger(utc=True)
tracer = Tracer()
metrics = Metrics(namespace=os.environ.get("STACK_NAME", DEFAULT_APP_NAME))

operations_dictionary = {operation_types.DYNAMODB_TTL_REMOVE: dynamodb_remove_case.reconcile}


@tracer.capture_method(capture_response=True)
def determine_operation(record):
    """Method to determine the reconciliation operation to be performed

    Args:
        record (dict): individual record as received in the event.

    Raises:
        OperationNotFoundException: If the method is unable to determine from any of the known operations
        KeyError: If the keys expected in the input parameter are not found

    Returns:
        __func__: the implementing function
    """
    tracer.put_annotation(key="determine operation", value=record["eventSource"])
    operation = None

    try:
        if (
            record["eventSource"] == DDB_EVENT_SOURCE
            and record["userIdentity"]["type"] == USER_IDENTITY_TYPE
            and record["userIdentity"]["principalId"] == PRINCIPAL_ID
            and record["eventName"] == REMOVE_EVENT_NAME
        ):
            operation = operations_dictionary.get(operation_types.DYNAMODB_TTL_REMOVE, None)
        else:
            metrics.add_metric(name="UnknownOperation", unit=MetricUnit.Count, value=1)
            raise OperationNotFoundException("Could not find an operation for the record")

    except KeyError as error:
        logger.error(f"Key not found in event, error is {error}")
        metrics.add_metric(name="UnknownOperation", unit=MetricUnit.Count, value=1)
        raise error

    tracer.put_annotation(key="operation", value=operation.__str__)
    metrics.add_metric(name="OperationIdentified", unit=MetricUnit.Count, value=1)
    return operation


@tracer.capture_lambda_handler
def handler(event, _):
    """Lambda handler method as the entry point for all records sent for reconciliation

    Args:
        event (LambdaEvent): An event object received by the lambda function that is passed by AWS services when invoking the function's handler
        context (LambdaContext): A context object received by the lambda function that is passed by AWS services when invoking the function's ha
    """
    records = event["Records"]
    operation = None
    batch_item_failures = []
    stream_batch_response = {}

    for record in records:
        try:
            operation = determine_operation(record)
            operation(record)
        except Exception:
            batch_item_failures.append({"itemIdentifier": record["messageId"]})

        tracer.put_annotation(key=operation.__str__, value="executed")

    stream_batch_response["batchItemFailures"] = batch_item_failures
    return stream_batch_response
