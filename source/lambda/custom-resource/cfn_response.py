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

import urllib3
from aws_lambda_powertools import Logger, Tracer

logger = Logger(utc=True)
tracer = Tracer()

http = urllib3.PoolManager()


@tracer.capture_method
def send_response(
    event, context, response_status, response_data, physical_resource_id=None, no_echo=False, reason=None
):
    """Method to post back response to cloudformation service from the custom resource

    Args:
        event (LambdaEvent): An event object received by the lambda function that is passed by AWS services when invoking the function's handler
        context (LambdaContext): A context object received by the lambda function that is passed by AWS services when invoking the function's handler
        response_status (str): A status code indicating if the response is SUCCESS or FAILED
        response_data ({}): A key-value pair of data that should be sent back to the AWS CloudFormation service as response to the execution of custom resource
        physical_resource_id (str): The value as received in the event object when the custom resource is invoked
        no_echo (bool): If CloudFormation should echo any output. Useful specifically when dealing with credentials, secrets or PII data
        reason (str): required when response_status is FAILED (otherwise optional). Provides more details about the status.

    Raises:
        Exception: In case of failure to send the required request back to the response_url provided by CloudFormation when invoking a custom resource
    """
    response_url = event["ResponseURL"]

    logger.debug(f"ResponseUrl: {response_url}exit")

    response_body = {
        "Status": response_status,
        "Reason": reason or "See the details in CloudWatch Log Stream: {}".format(context.log_stream_name),
        "PhysicalResourceId": physical_resource_id or context.log_stream_name,
        "StackId": event["StackId"],
        "RequestId": event["RequestId"],
        "LogicalResourceId": event["LogicalResourceId"],
        "NoEcho": no_echo,
        "Data": response_data,
    }

    json_response_body = json.dumps(response_body)

    logger.debug(f"Response body: {json_response_body}")
    headers = {"content-type": "", "content-length": str(len(json_response_body))}

    try:
        response = http.request(method="PUT", url=response_url, headers=headers, body=json_response_body)
        logger.debug("Status code: %s" % (response.status))
    except Exception as ex:
        logger.error(f"send(..) failed executing http.request(..): {ex}")
        raise ex
