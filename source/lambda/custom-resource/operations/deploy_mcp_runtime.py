#!/usr/bin/env python
# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

from aws_lambda_powertools import Logger, Tracer
from cfn_response import send_response
from utils.mcp_config_manager import MCPConfigManager
from operations.operation_types import SUCCESS, FAILED
from utils.runtime_mcp import RuntimeMCP

logger = Logger()
tracer = Tracer()


def validate_required_props(request_type, properties):
    """Validate required properties for Create and Update operations."""
    if request_type in ["Create", "Update"]:
        required_properties = {
            "USE_CASE_CONFIG_RECORD_KEY": properties.get("USE_CASE_CONFIG_RECORD_KEY"),
            "EXECUTION_ROLE_ARN": properties.get("EXECUTION_ROLE_ARN"),
            "USE_CASE_CONFIG_TABLE_NAME": properties.get("USE_CASE_CONFIG_TABLE_NAME"),
            "MCPAgentCoreName": properties.get("MCPAgentCoreName"),
        }
        for prop_name, prop_value in required_properties.items():
            if not prop_value:
                raise ValueError(f"{prop_name} is required in ResourceProperties")


@tracer.capture_method
def execute(event, context):
    try:
        properties = event.get("ResourceProperties", {})
        request_type = event.get("RequestType")
        physical_resource_id = event.get("PhysicalResourceId", "unknown")
        validate_required_props(request_type, properties)

        config_manager = MCPConfigManager(properties["USE_CASE_CONFIG_TABLE_NAME"])
        validated_config = (
            config_manager.get_mcp_runtime_config(properties["USE_CASE_CONFIG_RECORD_KEY"])
            if request_type != "Delete"
            else {}
        )

        runtime_mcp = RuntimeMCP(
            config=validated_config,
            cognito_user_pool_id=properties.get("COGNITO_USER_POOL_ID"),
            runtime_name=properties["MCPAgentCoreName"],
            execution_role_arn=properties["EXECUTION_ROLE_ARN"],
            table_name=properties["USE_CASE_CONFIG_TABLE_NAME"],
            config_key=properties["USE_CASE_CONFIG_RECORD_KEY"],
            runtime_id=physical_resource_id,
        )

        if request_type not in ["Create", "Update", "Delete"]:
            raise ValueError(f"Unsupported request type: {request_type}")

        # Call create, update or delete based on request type
        getattr(runtime_mcp, request_type.lower())()

        response_data = runtime_mcp.to_dict()

        if request_type != "Delete":
            config_manager.update_runtime_config(
                properties.get("USE_CASE_CONFIG_RECORD_KEY"),
                response_data,
            )
        response_data["message"] = f"MCP runtime {request_type} completed"

        send_response(event, context, SUCCESS, response_data, runtime_mcp.runtime_id)

    except Exception as e:
        error_msg = f"Error: {str(e)}"
        send_response(event, context, FAILED, {}, physical_resource_id=physical_resource_id, reason=error_msg)
