# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

"""
DynamoDB helper for use case management
"""
import logging
import os
from typing import Any, Dict, List, Optional

import boto3
from bedrock_agentcore.identity.auth import requires_access_token

logger = logging.getLogger(__name__)


class DynamoDBHelper:
    """Simple DynamoDB helper"""

    def __init__(self, table_name: str, region: str):
        """Initialize DynamoDB helper"""
        dynamodb = boto3.resource("dynamodb", region_name=region)
        self.table = dynamodb.Table(table_name)

    @requires_access_token(
        provider_name=os.environ.get("M2M_IDENTITY_NAME", ""),
        scopes=[],
        auth_flow="M2M",
    )
    def get_config(self, key: str, access_token: Optional[str] = None) -> Dict[str, Any]:
        """Get config from DDB item by key"""
        try:
            response = self.table.get_item(Key={"key": key})
            item = response.get("Item")

            if not item:
                raise ValueError(f"Configuration not found: {key}")

            config = item.get("config")
            if not config:
                raise ValueError(f"No config field found for key: {key}")

            return config
        except Exception as e:
            logger.error(f"Error fetching config for key {key}: {e}")
            raise

    @requires_access_token(
        provider_name=os.environ.get("M2M_IDENTITY_NAME", ""),
        scopes=[],
        auth_flow="M2M",
    )
    def get_mcp_configs(self, mcp_ids: List[str], access_token: Optional[str] = None) -> List[Dict[str, Any]]:
        """
        Fetch multiple MCP server configurations by McpId list.

        Args:
            mcp_ids: List of MCP server IDs to fetch
            access_token: Access token for authentication (injected by decorator)

        Returns:
            List of MCP server configuration dictionaries

        Raises:
            ValueError: If a configuration has invalid UseCaseType
        """
        if not mcp_ids:
            logger.info("No MCP server IDs provided, returning empty list")
            return []

        configs = []
        errors = []

        for mcp_id in mcp_ids:
            try:
                config = self._fetch_and_validate_mcp_config(mcp_id)
                if config:
                    configs.append(config)
            except ValueError as e:
                logger.error(f"Validation error for MCP server {mcp_id}: {e}")
                errors.append((mcp_id, str(e)))
                raise
            except Exception as e:
                logger.warning(f"Failed to fetch MCP server {mcp_id}: {e}")
                errors.append((mcp_id, str(e)))

        if errors:
            logger.warning(f"Failed to load {len(errors)} MCP server(s) out of {len(mcp_ids)}")

        logger.info(f"Successfully loaded {len(configs)} MCP server configuration(s)")
        return configs

    def _fetch_and_validate_mcp_config(self, mcp_id: str) -> Optional[Dict[str, Any]]:
        """
        Fetch and validate a single MCP server configuration.

        Args:
            mcp_id: MCP server ID to fetch

        Returns:
            MCP server configuration dictionary or None if not found

        Raises:
            ValueError: If UseCaseType is not "MCPServer"
        """
        try:
            response = self.table.get_item(Key={"key": mcp_id})
            item = response.get("Item")

            if not item:
                logger.warning(f"MCP server configuration not found: {mcp_id}")
                return None

            config = item.get("config")
            if not config:
                logger.warning(f"No config field found for MCP server: {mcp_id}")
                return None

            use_case_type = config.get("UseCaseType")
            if use_case_type != "MCPServer":
                raise ValueError(
                    f"Invalid UseCaseType for MCP server {mcp_id}: expected 'MCPServer', got '{use_case_type}'"
                )

            logger.debug(f"Successfully fetched and validated MCP server: {mcp_id}")
            return config

        except ValueError:
            raise
        except Exception as e:
            logger.error(f"Error fetching MCP server {mcp_id}: {e}")
            raise
