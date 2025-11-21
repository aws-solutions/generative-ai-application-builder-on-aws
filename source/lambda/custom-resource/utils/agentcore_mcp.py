#!/usr/bin/env python
# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

from abc import ABC, abstractmethod
from typing import Dict, Any
from aws_lambda_powertools import Logger, Tracer
import os 
from helper import get_service_client

logger = Logger()
tracer = Tracer()

AWS_REGION = os.environ.get("AWS_REGION")


class AgentcoreMCP(ABC):
    """
    Abstract base class for MCP resource management through AWS Bedrock AgentCore.

    This class provides a common interface for managing MCP resources (gateways and runtimes)
    with standardized lifecycle operations and error handling.
    """

    def __init__(self, config: Dict[str, Any], cognito_user_pool_id):
        """
        Initialize the MCP resource manager.

        Args:
            config: Configuration dictionary from MCPConfigManager
            agentcore_client: AWS Bedrock AgentCore client
            resource_id: Optional resource identifier (gateway_id or runtime_id)
        """
        self.config = config
        self.cognito_user_pool_id = cognito_user_pool_id
        self.allowed_clients = ["-"]

        try:
            self.agentcore_client = get_service_client("bedrock-agentcore-control", region_name=AWS_REGION)
        except Exception as error:
            logger.warning(f"Failed to initialize bedrock-agentcore-control client: {error}")
            self.agentcore_client = get_service_client("bedrock-agentcore-control", region_name=AWS_REGION)

    @abstractmethod
    def create(self):
        """
        Create the MCP resource.

        Returns:
            Dict containing creation result with resource details

        Raises:
            RuntimeError: If creation fails
        """
        pass

    @abstractmethod
    def update(self):
        """
        Update the MCP resource.

        Returns:
            Dict containing update result with resource details

        Raises:
            RuntimeError: If update fails
        """
        pass

    @abstractmethod
    def delete(self):
        """
        Delete the MCP resource.

        Returns:
            Dict containing deletion result

        Raises:
            RuntimeError: If deletion fails
        """
        pass

    @property
    def base_auth_config(self):
        if self.cognito_user_pool_id:
            discovery_url = f"https://cognito-idp.{AWS_REGION}.amazonaws.com/{self.cognito_user_pool_id}/.well-known/openid-configuration"
            return {
                "authorizerConfiguration": {
                    "customJWTAuthorizer": {
                        "discoveryUrl": discovery_url,
                        "allowedClients": self.allowed_clients
                    }
                },
            }


    @property
    def iam_client(self):
        try:
            return get_service_client("iam", region_name=AWS_REGION)
        except Exception as error:
            logger.warning(f"Failed to initialize iam client: {error}")
            return get_service_client("iam", region_name=AWS_REGION)