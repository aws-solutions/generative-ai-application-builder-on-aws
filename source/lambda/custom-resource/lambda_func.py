#!/usr/bin/env python
# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

import os

from aws_lambda_powertools import Logger, Metrics, Tracer
from aws_lambda_powertools.metrics import MetricUnit
from cfn_response import send_response
from custom_config import DEFAULT_APP_NAME
from operations import (
    admin_policy,
    customer_policy,
    agentcore_oauth_client,
    agentcore_outbound_permissions,
    send_metrics,
    copy_model_info_to_ddb,
    copy_web_ui,
    cw_log_retention,
    deploy_agent_core,
    deploy_agent_core_memory,
    deploy_mcp_gateway,
    deploy_mcp_runtime,
    gen_domain_prefix,
    gen_ecr_repo_prefix,
    gen_uuid,
    get_arns_for_inference_profile,
    get_compatible_azs,
    lambda_version_generator,
    multimodal_bucket_notifications,
    operation_types,
    redeploy_api,
    update_llm_config,
    update_s3_policy,
    use_case_policy,
    webconfig,
    sleep
)
from operations.operation_types import FAILED, RESOURCE, RESOURCE_PROPERTIES

logger = Logger(utc=True)
tracer = Tracer()
metrics = Metrics(namespace=os.environ.get("STACK_NAME", DEFAULT_APP_NAME))


# A dictionary for all custom resource operations invoked from CloudFormation
operations_dictionary = {
    operation_types.GEN_UUID: gen_uuid.execute,
    operation_types.METRIC: send_metrics.execute,
    operation_types.ANONYMOUS_METRIC: send_metrics.execute, # Support deletion of existing resources with this type.
    operation_types.WEBCONFIG: webconfig.execute,
    operation_types.COPY_WEB_UI: copy_web_ui.execute,
    operation_types.UPDATE_BUCKET_POLICY: update_s3_policy.execute,
    operation_types.USE_CASE_POLICY: use_case_policy.execute,
    operation_types.ADMIN_POLICY: admin_policy.execute,
    operation_types.CUSTOMER_POLICY: customer_policy.execute,
    operation_types.COPY_MODEL_INFO: copy_model_info_to_ddb.execute,
    operation_types.GET_COMPATIBLE_AZS: get_compatible_azs.execute,
    operation_types.GEN_DOMAIN_PREFIX: gen_domain_prefix.execute,
    operation_types.GEN_ECR_REPO_PREFIX: gen_ecr_repo_prefix.execute,
    operation_types.CW_LOG_RETENTION: cw_log_retention.execute,
    operation_types.UPDATE_LLM_CONFIG: update_llm_config.execute,
    operation_types.GET_MODEL_RESOURCE_ARNS: get_arns_for_inference_profile.execute,
    operation_types.REDEPLOY_API: redeploy_api.execute,
    operation_types.DEPLOY_AGENT_CORE: deploy_agent_core.execute,
    operation_types.DEPLOY_AGENT_CORE_MEMORY: deploy_agent_core_memory.execute,
    operation_types.DEPLOY_MCP_GATEWAY: deploy_mcp_gateway.execute,
    operation_types.DEPLOY_MCP_RUNTIME: deploy_mcp_runtime.execute,
    operation_types.LAMBDA_VERSION_GENERATOR: lambda_version_generator.execute,
    operation_types.AGENTCORE_OAUTH_CLIENT: agentcore_oauth_client.execute,
    operation_types.AGENTCORE_OUTBOUND_PERMISSIONS: agentcore_outbound_permissions.execute,
    operation_types.MULTIMODAL_BUCKET_NOTIFICATIONS: multimodal_bucket_notifications.execute,
    operation_types.SLEEP: sleep.execute,
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
@logger.inject_lambda_context
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
