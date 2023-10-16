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
import botocore
from aws_lambda_powertools import Logger, Metrics, Tracer
from aws_lambda_powertools.metrics import MetricUnit
from custom_config import custom_usr_agent_config
from helper import get_service_client
from custom_config import DEFAULT_APP_NAME
from operations.constants import DEFAULT_API_KEY_RECOVERY_WINDOW

logger = Logger(utc=True)
tracer = Tracer()
metrics = Metrics(namespace=os.environ.get("STACK_NAME", DEFAULT_APP_NAME))


@tracer.capture_method(capture_response=False)
def delete_ssm_parameter_key(record):
    """Delete record from SSM parameter store

    Args:
        record (dict): individual record to be reconciled with the parameter store

    Raises:
        botocore.exceptions.ClientError: Error performing the SSM delete parameter operation
    """
    with tracer.provider.in_subsegment("## reconcile with SSM") as subsegment:
        subsegment.put_annotation("service", "ssm")
        subsegment.put_annotation("operation", "delete_parameter")

        ssm = get_service_client("ssm")

        parameter_name = None
        try:
            if record["dynamodb"]["OldImage"].get("SSMParameterKey", None):
                parameter_name = record["dynamodb"]["OldImage"]["SSMParameterKey"]["S"]
        except KeyError as error:
            logger.error(str(error))
            raise error

        if parameter_name:
            try:
                ssm.delete_parameter(Name=parameter_name)
                metrics.add_metric(name="ChatConfigSSMParameterName", unit=MetricUnit.Count, value=1)
            except ssm.exceptions.ParameterNotFound as error:
                logger.error(
                    f"Error occurred when deleting parameter from store with key {parameter_name}. Error is {error}"
                )
                metrics.add_metric(name="ChatConfigSSMParameterNameNotFound", unit=MetricUnit.Count, value=1)
            except botocore.exceptions.ClientError as error:
                logger.error(
                    f"Error occurred when deleting parameter from store with key {parameter_name}. Error is {error}"
                )
                metrics.add_metric(name="ChatConfigSSMParameterNameDeletionFailed", unit=MetricUnit.Count, value=1)
                raise error


@tracer.capture_method(capture_response=False)
def reconcile(record):
    """Method to reconcile records in SSM and Secrets Manager

    Args:
        record (dict): individual record to be reconciled with the parameter store

    Raises:
        botocore.exceptions.ClientError: Error performing the SSM delete parameter operation
    """
    delete_ssm_parameter_key(record)
