#!/usr/bin/env python
# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

import os
from typing import Dict, Any, Optional
from aws_lambda_powertools import Logger, Tracer
from boto3.dynamodb.types import TypeDeserializer, TypeSerializer
from helper import get_service_client
from utils.constants import MCP_GATEWAY_TARGET_TYPES

logger = Logger()
tracer = Tracer()


class MCPConfigManager:

    def __init__(self, table_name: str = None):
        self.ddb_client = get_service_client("dynamodb")
        self.deserializer = TypeDeserializer()
        self.serializer = TypeSerializer()
        self.table_name = table_name or os.environ.get("USE_CASE_CONFIG_TABLE_NAME")
        if not self.table_name:
            raise ValueError(
                "Table name must be provided or USE_CASE_CONFIG_TABLE_NAME environment variable must be set"
            )

    @tracer.capture_method
    def read_mcp_config(self, config_key: str) -> Dict[str, Any]:
        try:
            logger.info(f"Attempting to read config from table: {self.table_name}, key: {config_key}")
            response = self.ddb_client.get_item(TableName=self.table_name, Key={"key": {"S": config_key}})

            if "Item" not in response:
                logger.warn(f"Configuration not found for key: {config_key} in table: {self.table_name}")
                raise ValueError(f"Configuration not found for key: {config_key}")

            deserialized_response = {
                key: self.deserializer.deserialize(value) for key, value in response.get("Item", {}).items()
            }
            config = deserialized_response.get("config", {})

            logger.info(f"Successfully read configuration for key: {config_key}")
            return config

        except Exception as error:
            logger.error(
                f"Error reading configuration - Table: {self.table_name}, Key: {config_key}, Error: {str(error)}"
            )
            if isinstance(error, ValueError):
                raise
            raise RuntimeError(f"Failed to read configuration: {str(error)}")

    @tracer.capture_method
    def validate_mcp_gateway_config(self, config: Dict[str, Any]) -> Dict[str, Any]:
        use_case_type = config.get("UseCaseType")
        if use_case_type != "MCPServer":
            raise ValueError(f"Invalid UseCaseType: {use_case_type}. Expected 'MCPServer'")

        mcp_params = config.get("MCPParams")
        if not mcp_params:
            raise ValueError("MCPParams not found in configuration")

        # Extract Gateway parameters
        gateway_params = mcp_params.get("GatewayParams")
        if not gateway_params:
            raise ValueError("GatewayParams not found in MCPParams")

        # Extract Target parameters
        target_params = gateway_params.get("TargetParams")
        if not target_params:
            raise ValueError("TargetParams not found in GatewayParams")

        if not isinstance(target_params, list) or len(target_params) == 0:
            raise ValueError("TargetParams must be a non-empty array")

        # Validate each target
        for target_index, target in enumerate(target_params):
            self.validate_target_params(target, target_index)

        return {
            "use_case_name": config.get("UseCaseName"),
            "use_case_description": config.get("UseCaseDescription"),
            "gateway_params": gateway_params,
            "target_params": target_params,
        }

    def validate_target_params(self, target: Dict[str, Any], target_index: int) -> None:
        base_required_fields = ["TargetName", "TargetType"]

        for field in base_required_fields:
            if field not in target:
                raise ValueError(f"Required field '{field}' missing in target {target_index}")

        target_type = target.get("TargetType")

        if target_type not in MCP_GATEWAY_TARGET_TYPES:
            raise ValueError(
                f"Invalid TargetType: {target_type}. Must be one of: {', '.join(MCP_GATEWAY_TARGET_TYPES)}"
            )

        # Validate type-specific required fields
        type_requirements = {
            "lambda": ["LambdaArn", "SchemaUri"],
            "openApiSchema": ["SchemaUri"],
            "smithyModel": ["SchemaUri"],
            "mcpServer": ["McpEndpoint"],
        }

        required_fields = type_requirements.get(target_type, [])
        for field in required_fields:
            if field not in target:
                raise ValueError(f"{field} required for {target_type} target {target_index}")

    @tracer.capture_method
    def get_mcp_gateway_config(self, config_key: str) -> Dict[str, Any]:
        config = self.read_mcp_config(config_key)
        return self.validate_mcp_gateway_config(config)

    def validate_runtime_params(self, runtime_params: Dict[str, Any]) -> None:
        required_fields = ["EcrUri"]

        for field in required_fields:
            if field not in runtime_params:
                raise ValueError(f"Required field '{field}' missing in RuntimeParams")

        ecr_uri = runtime_params.get("EcrUri")
        if not ecr_uri or not isinstance(ecr_uri, str):
            raise ValueError("EcrUri must be a non-empty string")

        environment_variables = runtime_params.get("EnvironmentVariables")
        if environment_variables is not None and not isinstance(environment_variables, dict):
            raise ValueError("EnvironmentVariables must be a dictionary")

        # Validate environment variable names and values
        for env_key, env_value in (environment_variables or {}).items():
            if not isinstance(env_key, str) or not env_key:
                raise ValueError("Environment variable names must be non-empty strings")
            if not isinstance(env_value, str):
                raise ValueError(f"Environment variable '{env_key}' value must be a string")

    @tracer.capture_method
    def validate_mcp_runtime_config(self, config: Dict[str, Any]) -> Dict[str, Any]:
        use_case_type = config.get("UseCaseType")
        if use_case_type != "MCPServer":
            raise ValueError(f"Invalid UseCaseType: {use_case_type}. Expected 'MCPServer'")

        mcp_params = config.get("MCPParams")
        if not mcp_params:
            raise ValueError("MCPParams not found in configuration")

        runtime_params = mcp_params.get("RuntimeParams")
        if not runtime_params:
            raise ValueError("RuntimeParams not found in MCPParams for runtime deployment")

        # Validate runtime parameters
        self.validate_runtime_params(runtime_params)

        return {
            "use_case_name": config.get("UseCaseName"),
            "use_case_description": config.get("UseCaseDescription"),
            "runtime_params": runtime_params,
            "ecr_uri": runtime_params.get("EcrUri"),
            "environment_variables": runtime_params.get("EnvironmentVariables", {}),
        }

    @tracer.capture_method
    def get_mcp_runtime_config(self, config_key: str) -> Dict[str, Any]:
        config = self.read_mcp_config(config_key)
        return self.validate_mcp_runtime_config(config)

    @tracer.capture_method
    def write_config(self, config_key: str, item: Dict[str, Any]) -> Dict[str, Any]:
        try:
            logger.info(f"Writing config to table: {self.table_name}, key: {config_key}")

            # Prepare the item for DynamoDB
            ddb_item = {"key": {"S": config_key}, "config": self.serializer.serialize(item)}

            response = self.ddb_client.put_item(TableName=self.table_name, Item=ddb_item)

            logger.info(f"Successfully wrote configuration for key: {config_key}")
            return {"success": True, "response": response}

        except Exception as error:
            logger.error(
                f"Error writing configuration - Table: {self.table_name}, Key: {config_key}, Error: {str(error)}"
            )
            raise RuntimeError(f"Failed to write configuration: {str(error)}")

    @tracer.capture_method
    def update_gateway_config(self, config_key: str, gateway_result: Dict[str, Any]) -> Dict[str, Any]:
        """
        Update the MCP configuration in DynamoDB with new gateway and target information
        """
        try:
            logger.info(f"Updating MCP config for key: {config_key}")

            # Read the original config from database to get the full structure
            original_config = self.read_mcp_config(config_key)

            # Update the original config's GatewayParams with new information
            gateway_params = original_config["MCPParams"]["GatewayParams"]

            # Add missing gateway-level information
            gateway_params["GatewayId"] = gateway_result.get("GatewayId")
            gateway_params["GatewayArn"] = gateway_result.get("GatewayArn")
            gateway_params["GatewayUrl"] = gateway_result.get("GatewayUrl")
            gateway_params["GatewayName"] = gateway_result.get("GatewayName")

            targets = gateway_result.get("Targets", [])

            # Update TargetParams with TargetId information
            if "TargetParams" in gateway_params and isinstance(gateway_params["TargetParams"], list):
                target_params = gateway_params["TargetParams"]

                # Create a mapping of target names to target IDs from the result
                target_id_map = {}
                for target in targets:
                    target_name = target.get("targetName")
                    target_id = target.get("targetId")
                    if target_name and target_id:
                        target_id_map[target_name] = target_id

                # Update each target with its ID
                for target_param in target_params:
                    target_name = target_param.get("TargetName")
                    if target_name and target_name in target_id_map:
                        target_param["TargetId"] = target_id_map[target_name]
                        logger.info(f"Updated target '{target_name}' with ID: {target_id_map[target_name]}")

            # Write the updated configuration back to the database
            result = self.write_config(config_key, original_config)

            logger.info(f"Successfully updated database record for key: {config_key}")
            return result

        except Exception as error:
            logger.error(f"Error updating MCP configuration: {str(error)}")
            # Don't raise here as the gateway was created successfully
            # Just log the error and continue
            logger.warning("Gateway created successfully but failed to update database record")
            return {"success": False, "error": str(error)}

    @tracer.capture_method
    def update_runtime_config(self, config_key: str, runtime_result: Dict[str, Any]) -> Dict[str, Any]:
        """
        Update the MCP configuration in DynamoDB with runtime information (RuntimeId, RuntimeArn)
        """
        try:
            logger.info(f"Updating MCP runtime config for key: {config_key}")

            # Read the original config from database to get the full structure
            original_config = self.read_mcp_config(config_key)

            # Update the original config's RuntimeParams with new information
            runtime_params = original_config["MCPParams"]["RuntimeParams"]

            # Add runtime-level information (generated by AWS)
            runtime_params["RuntimeId"] = runtime_result.get("MCPRuntimeId")
            runtime_params["RuntimeArn"] = runtime_result.get("MCPRuntimeArn")
            runtime_params["RuntimeName"] = runtime_result.get("MCPAgentCoreName")
            runtime_params["RuntimeUrl"] = runtime_result.get("MCPRuntimeUrl")

            # EcrUri and EnvironmentVariables should already be in the config from the original request
            # but we log them for verification
            logger.info(f"Runtime config - EcrUri: {runtime_params.get('EcrUri')}, "
                       f"EnvVars count: {len(runtime_params.get('EnvironmentVariables', {}))}")

            # Write the updated configuration back to the database
            result = self.write_config(config_key, original_config)

            logger.info(f"Successfully updated runtime database record for key: {config_key}")
            return result

        except Exception as error:
            logger.error(f"Error updating MCP runtime configuration: {str(error)}")
            # Don't raise here as the runtime was created successfully
            # Just log the error and continue
            logger.warning("Runtime created successfully but failed to update database record")
            return {"success": False, "error": str(error)}
