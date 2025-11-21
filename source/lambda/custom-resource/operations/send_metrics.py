#!/usr/bin/env python
# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

import json
import time
import uuid
from copy import copy

from aws_lambda_powertools import Logger, Tracer
from botocore.exceptions import ClientError
from helper import get_service_resource

from cfn_response import send_response
from operations import operation_types
from operations.operation_types import FAILED, PHYSICAL_RESOURCE_ID, RESOURCE, RESOURCE_PROPERTIES, SUCCESS
from utils.constants import (
    AGENT_PARAMS,
    AUTH_PARAMS,
    CLIENT_OWNED_USER_POOL,
    DEPLOY_UI,
    FEEDBACK_PARAMS,
    GUARDRAIL_ENABLED,
    KENDRA_EDITION,
    KNOWLEDGE_BASE_PARAMS,
    LLM_PARAMS,
    NEW_KENDRA_INDEX_CREATED,
    PROVISIONED_MODEL_ENABLED,
    RAG_ENABLED,
    UC_DEPLOYMENT_SOURCE,
    USE_CASE_CONFIG_RECORD_KEY,
    USE_CASE_CONFIG_RECORD_KEY_ATTRIBUTE_NAME,
    USE_CASE_CONFIG_TABLE_NAME,
    USE_CASE_TYPE,
    UUID,
)
from utils.data import BuilderMetrics
from utils.metrics_schema import MetricsSchema
from utils.metrics import push_builder_metrics
from utils.lambda_context_parser import get_invocation_account_id

SOLUTION_ID = "SolutionId"
VERSION = "Version"
DEPLOY_KENDRA_INDEX = "DeployKendraIndex"
WORKFLOW_CONFIG_NAME = "WorkflowConfigName"

logger = Logger(utc=True)
tracer = Tracer()


@tracer.capture_method
def verify_env_setup(event):
    """This method verifies all the attributes are available in 'ResourceProperties'. The mandatory ones are 'SolutionId', 'Version', and
    'Resource'

    Args:
        event (LambdaEvent): An event object received by the lambda function that is passed by AWS services when invoking the function's handler

    Raises:
        ValueError: If any of the keys are not found under event['ResourceProperties], the method throws a ValueError exception

    """
    resource_type = event[RESOURCE_PROPERTIES].get(RESOURCE, None)
    if resource_type not in [operation_types.METRIC, operation_types.ANONYMOUS_METRIC]:
        err_msg = f"Operation type not available or did not match from the request. Expecting operation type to be {operation_types.METRIC} or {operation_types.ANONYMOUS_METRIC}"
        logger.error(f"{err_msg}. Here are the resource properties received {json.dumps(event[RESOURCE_PROPERTIES])}")
        raise ValueError(err_msg)

    if (
        event[RESOURCE_PROPERTIES].get(SOLUTION_ID, None) is None
        or event[RESOURCE_PROPERTIES].get(VERSION, None) is None
    ):
        err_msg = f"Either 'SolutionId' or 'Version' has not been passed. Hence the operation cannot be performed."
        logger.error(f"{err_msg}. Here are the resource properties received {json.dumps(event[RESOURCE_PROPERTIES])}")
        raise ValueError(err_msg)


@tracer.capture_method
def get_use_case_config(table_name: str, key: str, retries=3, retry_interval=5):
    """This method retrieves the use case configuration from Dyanamo DB

    Args:
        table_name (str): The name of the DynamoDB table to retrieve the use case configuration from
        key (str): The key to retrieve the use case configuration from the table
        retries (int): The number of times to retry. May be needed as sometimes IAM policy changes take time to propagate, which can mean we need to retry.
        retry_interval (int): The number of seconds to wait between retries, in seconds.

    Returns:
        dict: Additional configuration (e.g. the use case config retrieved from DDB). Empty if not retrievable.
    """
    logger.info(f"Retrieving use case config from DynamoDB table {table_name} for the key {key}")
    ddb_resource = get_service_resource("dynamodb")
    config_table = ddb_resource.Table(table_name)

    while retries > 0:
        try:
            usecase_config = (
                config_table.get_item(
                    Key={USE_CASE_CONFIG_RECORD_KEY_ATTRIBUTE_NAME: key},
                )
                .get("Item", {})
                .get("config")
            )

            if usecase_config is None:
                raise ValueError(f"No compatible record found in the table {table_name} for the key {key}")

            return usecase_config
        except ClientError as error:
            logger.error(f"Error occurred when retrieving use case config from DDB, error is {error}")
            logger.info(
                f"Additional config with key {key} failed to be retrieved from table {table_name}. Retrying in {retry_interval} seconds. Retrying {retries} more times"
            )
            retries -= 1
            time.sleep(retry_interval)
        except ValueError as error:
            logger.error(f"Error occurred when attempting to read the use case config, error is {error}")
            break
    return {}


def update_metrics_data(metrics_data, config: dict):
    """This method updates the metrics data with the use case configuration

    Args:
        metrics_data (dict): The metrics data to be updated
        config (dict): The use case configuration to be used to update the metrics data
    """

    metrics_data[AUTH_PARAMS] = config.get(AUTH_PARAMS, {})
    metrics_data[AGENT_PARAMS] = config.get(AGENT_PARAMS, {})
    metrics_data[FEEDBACK_PARAMS] = config.get(FEEDBACK_PARAMS, {})
    metrics_data[KNOWLEDGE_BASE_PARAMS] = config.get(KNOWLEDGE_BASE_PARAMS, {})
    metrics_data[LLM_PARAMS] = config.get(LLM_PARAMS, {})
    metrics_data[DEPLOY_UI] = config.get(DEPLOY_UI, None)
    metrics_data[USE_CASE_TYPE] = config[USE_CASE_TYPE]

    # Collecting Provisioned Concurrency value
    provisioned_concurrency_value = config.get("ProvisionedConcurrencyValue")
    if provisioned_concurrency_value is not None and provisioned_concurrency_value > 0:
        metrics_data["ProvisionedConcurrencyValue"] = provisioned_concurrency_value

    bedrock_llm_params = metrics_data[LLM_PARAMS].get("BedrockLlmParams", {})
    bedrock_llm_params[GUARDRAIL_ENABLED] = bool(
        bedrock_llm_params
        and bedrock_llm_params.get("GuardrailIdentifier")
        and bedrock_llm_params.get("GuardrailVersion")
    )

    # Collecting whether Provisioned Model is provided
    bedrock_llm_params[PROVISIONED_MODEL_ENABLED] = bool(bedrock_llm_params and bedrock_llm_params.get("ModelArn"))

    # Collecting whether Multimodal is enabled
    multimodal_params = metrics_data[LLM_PARAMS].get("MultimodalParams", {})
    metrics_data[LLM_PARAMS]["MultimodalEnabled"] = bool(
        multimodal_params and multimodal_params.get("MultimodalEnabled")
    )

    cognito_params = metrics_data[AUTH_PARAMS].get("CognitoParams", {})

    # Updating Auth Params, to make sure we know if user is providing their own user pool or not
    metrics_data[AUTH_PARAMS][CLIENT_OWNED_USER_POOL] = bool(
        cognito_params and cognito_params.get("ExistingUserPoolId")
    )

    mcp_params = config.get("MCPParams", {})
    if mcp_params.get("GatewayParams"):
        target_params = mcp_params["GatewayParams"].get("TargetParams", [])
        filtered_targets = [
            {
                "TargetType": target.get("TargetType"),
                **({
                    "OutboundAuthProviderType": target["OutboundAuthParams"]["OutboundAuthProviderType"]
                } if target.get("OutboundAuthParams", {}).get("OutboundAuthProviderType") else {})
            }
            for target in target_params
        ]

        metrics_data["MCPParams"] = {
            "MCPType": "Gateway",
            "GatewayParams": {
                "TargetCount": len(filtered_targets),
                "TargetParams": filtered_targets,
            },
        }
    elif mcp_params.get("RuntimeParams"):
        metrics_data["MCPParams"] = {"MCPType": "Runtime", "RuntimeParams": {}}

    agent_builder_params = config.get("AgentBuilderParams", {})
    if agent_builder_params:
        memory_config = agent_builder_params.get("MemoryConfig", {})
        tools = agent_builder_params.get("Tools", [])
        mcp_servers = agent_builder_params.get("MCPServers", [])
        
        tool_ids = [tool["ToolId"] for tool in tools if tool.get("ToolId")]
        mcp_server_info = [{"Type": server["Type"]} for server in mcp_servers if server.get("Type")]

        metrics_data["AgentBuilderParams"] = {
            "MemoryConfig": {"LongTermEnabled": memory_config.get("LongTermEnabled")},
            "BuiltInToolsCount": len(tool_ids),
            "BuiltInTools": tool_ids,
            "MCPServersCount": len(mcp_server_info),
            "MCPServers": mcp_server_info,
        }

    workflow_params = config.get("WorkflowParams", {})
    if workflow_params:
        memory_config = workflow_params.get("MemoryConfig", {})
        orchestration_pattern = workflow_params.get("OrchestrationPattern")
        
        filtered_agents = []
        if orchestration_pattern == "agents-as-tools":
            agents = workflow_params.get("AgentsAsToolsParams", {}).get("Agents", [])
            filtered_agents = [{"Type": agent["UseCaseType"]} for agent in agents if agent.get("UseCaseType")]

        metrics_data["WorkflowParams"] = {
            "OrchestrationPattern": orchestration_pattern,
            "MemoryConfig": {"LongTermEnabled": memory_config.get("LongTermEnabled")},
            "AgentsCount": len(filtered_agents),
            "Agents": filtered_agents,
        }

    return metrics_data


@tracer.capture_method
def execute(event, context):
    """This method implementation is to support sending metric to aws solution builder endpoint. On 'Create', 'Update', and 'Delete'
    events this implementation will send configuration details about the deployed stack without any customer specific information. The
    'Resource' property for this implementation is 'METRIC'. Additionally, all data to be pushed as operational metrics should be
    set directly under 'Properties' in the Custom Resource creation. 'SolutionId' and 'Version' are mandatory resource attributes

    For 'Create' events, this implementation will add a UUID to the metrics payload using the uuid.uuid4() call to provide a unique identified
    for each new deployment

    Args:
        event (LambdaEvent): An event object received by the lambda function that is passed by AWS services when invoking the function's handler
        context (LambdaContext): A context object received by the lambda function that is passed by AWS services when invoking the function's handler

    Raises:
        Exception: if there are an errors in UUID generation. During the handling of this exception it also sends a 'FAILED' status to
        the AWS Cloudformation service.
    """
    physical_resource_id = event.get(PHYSICAL_RESOURCE_ID, uuid.uuid4().hex[:8])

    try:
        verify_env_setup(event)
        metrics_data = copy(event[RESOURCE_PROPERTIES])

        # WORKFLOW_CONFIG_NAME and DEPLOY_KENDRA_INDEX information is only sent as a part of Create/Update events
        if event["RequestType"] == "Delete":
            for metric in [
                NEW_KENDRA_INDEX_CREATED,
                KENDRA_EDITION,
                RAG_ENABLED,
                UC_DEPLOYMENT_SOURCE,
            ]:
                metrics_data.pop(metric, None)

        config_table = metrics_data.pop(USE_CASE_CONFIG_TABLE_NAME, None)
        config_key = metrics_data.pop(USE_CASE_CONFIG_RECORD_KEY, None)

        if event["RequestType"] != "Delete" and config_table and config_key:
            chat_model_config = get_use_case_config(
                config_table,
                config_key,
            )
            # Updating the metrics data with data from use case config table
            metrics_data = update_metrics_data(metrics_data, chat_model_config)

        # Using a custom schema validator to confirm the schema of builder_metrics,
        # if a value in our metrics_data is not in our allow list schema
        # it would be excluded from our metrics_payload data
        metrics_data = MetricsSchema(metrics_data).model_dump(remove_empty=True)

        account_id = get_invocation_account_id(context)
        builder_metrics = BuilderMetrics(
            event[RESOURCE_PROPERTIES][UUID],
            event[RESOURCE_PROPERTIES][SOLUTION_ID],
            event[RESOURCE_PROPERTIES][VERSION],
            metrics_data,
            account_id,
        )
        push_builder_metrics(builder_metrics)
        send_response(event, context, SUCCESS, {}, physical_resource_id)
    except Exception as ex:
        logger.error(f"Error occurred when sending metric, Error is {ex}")
        send_response(event, context, FAILED, {}, physical_resource_id=physical_resource_id, reason=str(ex))
