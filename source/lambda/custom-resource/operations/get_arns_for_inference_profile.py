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
from aws_lambda_powertools import Logger, Tracer
from cfn_response import send_response
from helper import get_service_client
from operations import operation_types
from operations.operation_types import (
    FAILED,
    PHYSICAL_RESOURCE_ID,
    RESOURCE,
    RESOURCE_PROPERTIES,
    SUCCESS,
)
from boto3.dynamodb.types import TypeDeserializer

USE_CASE_CONFIG_TABLE_NAME = "USE_CASE_CONFIG_TABLE_NAME"
USE_CASE_CONFIG_RECORD_KEY = "USE_CASE_CONFIG_RECORD_KEY"
LLM_CONFIG_RECORD_FIELD_NAME = "key"

logger = Logger(utc=True)
tracer = Tracer()


@tracer.capture_method
def verify_env_setup(event):
    """This method verifies if all the necessary properties are correctly set in the event object as received by the lambda function's handler"""
    if event[RESOURCE_PROPERTIES][RESOURCE] != operation_types.GET_MODEL_RESOURCE_ARNS:
        err_msg = f"Operation type not available or did not match from the request. Expecting operation type to be {operation_types.GET_MODEL_RESOURCE_ARNS}"
        logger.error(f"{err_msg}. Here is the resource properties received {json.dumps(event[RESOURCE_PROPERTIES])}")
        raise ValueError(err_msg)

    if event[RESOURCE_PROPERTIES].get(USE_CASE_CONFIG_TABLE_NAME, None) in ["", None]:
        err_msg = f"The {USE_CASE_CONFIG_TABLE_NAME} has not been passed. Hence operation cannot be performed"
        logger.error(f"{err_msg}. Here is the resource properties received {json.dumps(event[RESOURCE_PROPERTIES])}")
        raise ValueError(err_msg)

    if event[RESOURCE_PROPERTIES].get(USE_CASE_CONFIG_RECORD_KEY, None) in ["", None]:
        err_msg = f"The {USE_CASE_CONFIG_RECORD_KEY} has not been passed. Hence operation cannot be performed"
        logger.error(f"{err_msg}. Here is the resource properties received {json.dumps(event[RESOURCE_PROPERTIES])}")
        raise ValueError(err_msg)


@tracer.capture_method
def get_model_arns(inference_profile_identifier):
    """This method retrieves the model ARNs from a Bedrock inference profile"""
    bedrock_client = get_service_client("bedrock")

    try:
        response = bedrock_client.get_inference_profile(inferenceProfileIdentifier=inference_profile_identifier)
        arns = [model["modelArn"] for model in response.get("models", [])]
        if "inferenceProfileArn" in response:
            arns.append(response["inferenceProfileArn"])
        return ",".join(arns)
    except Exception as error:
        logger.error(f"Error in retrieving model ARNs from inference profile. The error is {error}")
        raise error


@tracer.capture_method
def get_inference_identifier_from_ddb(table_name, record_key):
    """This method retrieves the inference profile id from dynamodb table"""
    ddb_client = get_service_client("dynamodb")
    try:
        response = ddb_client.get_item(TableName=table_name, Key={LLM_CONFIG_RECORD_FIELD_NAME: {"S": record_key}})
        # deserialize the response
        deserializer = TypeDeserializer()
        deserialized_response = {k: deserializer.deserialize(v) for k, v in response.get("Item", {}).items()}
        if not deserialized_response:
            return None
        return deserialized_response["config"]["LlmParams"]["BedrockLlmParams"]["InferenceProfileId"]
    except Exception as error:
        logger.error(f"Error in retrieving inference profile identifier from DDB. The error is {error}")
        raise error


@tracer.capture_method
def execute(event, context):
    """This method provides implementation to get model ARNs from a Bedrock inference profile.

    Args:
        event (LambdaEvent): An event object received by the lambda function that is passed by AWS services when invoking the function's handler
        context (LambdaContext): A context object received by the lambda function that is passed by AWS services when invoking the function's handler

    Raises:
        Exception: Any failures during the execution of this method
    """

    physical_resource_id = None

    try:
        verify_env_setup(event)
        physical_resource_id = event.get(PHYSICAL_RESOURCE_ID, None)

        if event["RequestType"] == "Create" or event["RequestType"] == "Update":
            inference_profile_identifier = get_inference_identifier_from_ddb(
                event[RESOURCE_PROPERTIES][USE_CASE_CONFIG_TABLE_NAME],
                event[RESOURCE_PROPERTIES][USE_CASE_CONFIG_RECORD_KEY],
            )
            if not inference_profile_identifier:  # ddb does not contain inference profile information
                send_response(
                    event,
                    context,
                    FAILED,
                    {},
                    physical_resource_id=physical_resource_id,
                    reason="Inference Profile ID not found in LLM config",
                )
                return

            arns = get_model_arns(inference_profile_identifier)
            if not arns:  # no arns were returned for the provided inference profile id
                send_response(
                    event,
                    context,
                    FAILED,
                    {},
                    physical_resource_id=physical_resource_id,
                    reason="Empty resource arns found",
                )
                return

            send_response(event, context, SUCCESS, {"Arns": arns}, physical_resource_id)
        elif event["RequestType"] == "Delete":
            # No action needed for delete
            send_response(event, context, SUCCESS, {}, physical_resource_id)
    except Exception as ex:
        logger.error(f"Error occurred when getting model ARNs from Bedrock inference profile, Error is {ex}")
        send_response(event, context, FAILED, {}, physical_resource_id=physical_resource_id, reason=str(ex))
