# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

import os
from aws_lambda_powertools import Logger, Tracer
from cfn_response import send_response
from utils.mcp_config_manager import MCPConfigManager

from utils.mcp_factory import MCPGatewayFactory
from utils.lambda_target_creator import LambdaTargetCreator
from utils.smithy_target_creator import SmithyTargetCreator
from utils.openapi_target_creator import OpenAPITargetCreator
from utils.mcp_server_target_creator import MCPServerTargetCreator
from operations.operation_types import SUCCESS, FAILED

MCPGatewayFactory.register_target_creator("lambda", LambdaTargetCreator)
MCPGatewayFactory.register_target_creator("smithyModel", SmithyTargetCreator)
MCPGatewayFactory.register_target_creator("openApiSchema", OpenAPITargetCreator)
MCPGatewayFactory.register_target_creator("mcpServer", MCPServerTargetCreator)

logger = Logger()
tracer = Tracer()

from utils.gateway_mcp import GatewayMCP


def validate_required_props(request_type, properties):
    # Only validate required properties for Create and Update operations
    if request_type in ["Create", "Update"]:
        required_properties = {
            "USE_CASE_CONFIG_RECORD_KEY": properties.get("USE_CASE_CONFIG_RECORD_KEY"),
            "GATEWAY_ROLE_ARN": properties.get("GATEWAY_ROLE_ARN"),
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
        # Setting to unknown:
        # If gatewayId is not created, There is no need to delete gateway and targets, and delete can be skipped
        physical_resource_id = event.get("PhysicalResourceId", 'unknown')

        validate_required_props(request_type, properties)

        config_manager = MCPConfigManager(properties["USE_CASE_CONFIG_TABLE_NAME"])
        validated_config = config_manager.get_mcp_gateway_config(properties["USE_CASE_CONFIG_RECORD_KEY"]) if request_type != "Delete" else {}

        gateway_mcp = GatewayMCP(
            config=validated_config,
            cognito_user_pool_id=properties.get("COGNITO_USER_POOL_ID"),
            gateway_role_arn=properties["GATEWAY_ROLE_ARN"],
            gateway_name=properties["MCPAgentCoreName"],
            schema_bucket_name=properties["S3_BUCKET_NAME"],
            gateway_id=physical_resource_id
        )

        if request_type not in ["Create", "Update", "Delete"]:
            raise ValueError(f"Unsupported request type: {request_type}")

        # calling create, update or delete based on request type
        getattr(gateway_mcp, request_type.lower())()
        
        response_data = gateway_mcp.to_dict()

        if request_type != "Delete":
            config_manager.update_gateway_config(
                properties.get("USE_CASE_CONFIG_RECORD_KEY"),
                response_data,
            )
        response_data["message"] = f"MCP gateway {request_type} completed"

        send_response(event, context, SUCCESS, response_data, gateway_mcp.gateway_id)

    except Exception as e:
        error_msg = f"Error: {str(e)}"
        send_response(event, context, FAILED, {}, physical_resource_id=physical_resource_id, reason=error_msg)
