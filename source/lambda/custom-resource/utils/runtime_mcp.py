#!/usr/bin/env python
# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

import os
from typing import Dict, Any
from aws_lambda_powertools import Logger, Tracer
from utils.agentcore_mcp import AgentcoreMCP
from operations.shared import retry_with_backoff

logger = Logger()
tracer = Tracer()
AWS_REGION = os.environ.get("AWS_REGION")


class RuntimeMCP(AgentcoreMCP):
    """
    MCP Runtime resource manager.

    Handles the lifecycle of MCP runtimes including creation, updates, and deletion
    of containerized MCP server runtimes.
    """

    def __init__(
        self,
        config: Dict[str, Any],
        cognito_user_pool_id,
        runtime_name,
        execution_role_arn,
        table_name,
        config_key,
        runtime_id=None,
    ):
        """
        Initialize the Runtime MCP manager.

        Args:
            config: Runtime configuration from MCPConfigManager
            cognito_user_pool_id: Cognito user pool ID for authentication
            runtime_name: Name of the runtime
            execution_role_arn: IAM role ARN for runtime execution
            table_name: DynamoDB table name for config storage
            config_key: Config record key in DynamoDB
            allowed_clients: List of allowed client IDs
            runtime_id: Optional runtime identifier for updates/deletes
        """
        super().__init__(config, cognito_user_pool_id)
        self.runtime_name = runtime_name
        self.execution_role_arn = execution_role_arn
        self.table_name = table_name
        self.config_key = config_key
        self.runtime_id = runtime_id
        self.runtime_arn = None

    @property
    def mcp_image_uri(self):
        """Get and validate ECR image URI from config."""
        ecr_uri = self.config.get("ecr_uri")
        if not ecr_uri:
            raise ValueError("EcrUri not found in MCP runtime configuration")

        # Validate ECR URI format - must include a tag
        ecr_uri = ecr_uri.strip()
        if ":" not in ecr_uri.split("/")[-1]:
            raise ValueError(
                f"Invalid ECR URI format: '{ecr_uri}'. ECR URI must include a tag (e.g., :latest, :v1.0.0)"
            )
        return ecr_uri

    @property
    def environment_variables(self):
        """Build runtime environment variables."""
        custom_env_vars = self.config.get("environment_variables", {})

        # Base environment variables
        env_vars = {
            "USE_CASE_CONFIG_TABLE_NAME": self.table_name,
            "USE_CASE_CONFIG_RECORD_KEY": self.config_key,
        }

        # Add custom environment variables
        env_vars.update(custom_env_vars)

        return env_vars

    @property
    def base_runtime_params(self):
        """Build base runtime parameters shared between create and update."""
        return {
            "agentRuntimeArtifact": {"containerConfiguration": {"containerUri": self.mcp_image_uri}},
            "roleArn": self.execution_role_arn,
            "networkConfiguration": {"networkMode": "PUBLIC"},
            "protocolConfiguration": {"serverProtocol": "MCP"},
            "environmentVariables": self.environment_variables,
            **(
                {}
                if not self.config.get("use_case_description")
                else {"description": self.config.get("use_case_description")}
            ),
            **self.base_auth_config,
        }

    @property
    def create_runtime_params(self):
        """Build parameters for runtime creation."""
        params = self.base_runtime_params
        params["agentRuntimeName"] = self.runtime_name
        return params

    @property
    def update_runtime_params(self):
        """Build parameters for runtime update."""
        params = self.base_runtime_params
        params["agentRuntimeId"] = self.runtime_id
        return params

    @property
    def runtime_url(self):
        if self.runtime_arn:
            encoded_arn = self.runtime_arn.replace(":", "%3A").replace("/", "%2F")
            return f"https://bedrock-agentcore.{AWS_REGION}.amazonaws.com/runtimes/{encoded_arn}/invocations?qualifier=DEFAULT"

    @tracer.capture_method
    def create(self):
        """
        Create MCP runtime.

        Raises:
            RuntimeError: If runtime creation fails
        """
        try:
            logger.info(f"Creating MCP runtime: {self.runtime_name}")

            response = retry_with_backoff(self.agentcore_client.create_agent_runtime, **self.create_runtime_params)

            self.runtime_id = response.get("agentRuntimeId")
            self.runtime_arn = response.get("agentRuntimeArn")

            if not self.runtime_id or not self.runtime_arn:
                raise ValueError(
                    "Runtime creation response missing required fields (agentRuntimeId or agentRuntimeArn)"
                )

            logger.info(f"Runtime created successfully - ID: {self.runtime_id}, ARN: {self.runtime_arn}")

        except Exception as e:
            error_msg = f"Failed to create MCP runtime: {str(e)}"
            logger.error(error_msg)
            raise RuntimeError(error_msg)

    @tracer.capture_method
    def update(self):
        """
        Update MCP runtime.

        Raises:
            RuntimeError: If runtime update fails
        """
        try:
            if not self.runtime_id:
                raise ValueError("Runtime ID is required for update operation")
            response = retry_with_backoff(self.agentcore_client.get_agent_runtime, agentRuntimeId=self.runtime_id)
            self.allowed_clients = response["authorizerConfiguration"]["customJWTAuthorizer"]["allowedClients"]
            logger.info(f"Updating MCP runtime: {self.runtime_id}")

            response = retry_with_backoff(self.agentcore_client.update_agent_runtime, **self.update_runtime_params)

            self.runtime_arn = response.get("agentRuntimeArn")

            logger.info(f"Runtime updated successfully - ID: {self.runtime_id}")

        except Exception as e:
            error_msg = f"Failed to update MCP runtime {self.runtime_id}: {str(e)}"
            logger.error(error_msg)
            raise RuntimeError(error_msg)

    @tracer.capture_method
    def delete(self):
        """
        Delete MCP runtime.

        Raises:
            RuntimeError: If runtime deletion fails
        """
        try:
            if self.runtime_id == "unknown":
                logger.error("Runtime ID is required for delete operation")
            else:
                logger.info(f"Deleting MCP runtime: {self.runtime_id}")
                retry_with_backoff(self.agentcore_client.delete_agent_runtime, agentRuntimeId=self.runtime_id)
                logger.info(f"Runtime deleted successfully - ID: {self.runtime_id}")

        except Exception as e:
            error_msg = f"Failed to delete MCP runtime {self.runtime_id}: {str(e)}"
            logger.error(error_msg)
            raise RuntimeError(error_msg)

    def to_dict(self):
        """Convert runtime details to dictionary for CloudFormation response."""
        return {
            "MCPRuntimeId": self.runtime_id,
            "MCPRuntimeArn": self.runtime_arn,
            "MCPAgentCoreName": self.runtime_name,
            "MCPRuntimeUrl": self.runtime_url,
        }
