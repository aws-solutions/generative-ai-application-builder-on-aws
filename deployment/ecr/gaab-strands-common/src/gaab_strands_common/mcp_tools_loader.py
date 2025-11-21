# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

"""
MCPToolsLoader - Orchestrates MCP tool discovery from multiple servers

This module provides the main orchestrator for loading MCP tools from both
Gateway and Runtime MCP servers. It handles configuration fetching, server
categorization, parallel tool discovery, and comprehensive error handling.
"""

import logging
import os
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from typing import Any, Dict, List, Tuple

from bedrock_agentcore.identity.auth import requires_access_token
from gaab_strands_common.ddb_helper import DynamoDBHelper
from gaab_strands_common.models import GatewayMCPParams, MCPServerConfig, RuntimeMCPParams
from mcp.client.streamable_http import streamablehttp_client
from strands.tools.mcp import MCPClient

logger = logging.getLogger(__name__)


class MCPToolsLoader:
    """
    Orchestrates MCP tool discovery and loading from Gateway and Runtime MCP servers.

    This class handles:
    - Categorizing servers by type (Gateway and Runtime)
    - Parallel tool discovery for performance
    - Comprehensive error handling and logging
    """

    def __init__(self, region: str):
        """
        Initialize MCPToolsLoader with AWS region.

        Args:
            region: AWS region for MCP clients
        """
        self.region = region
        self._active_mcp_clients = []  # Keep MCP clients alive for tool execution
        logger.info(f"Initialized MCPToolsLoader for region: {region}")

    def load_tools(self, mcp_servers: List[Dict[str, str]]) -> List[Any]:
        """
        Load tools from all configured MCP servers.

        This is the main entry point for MCP tool loading. It orchestrates:
        1. Categorizing servers by type (Gateway vs Runtime)
        2. Discovering tools from each server in parallel
        3. Converting tools to Strands format
        4. Handling errors gracefully

        Args:
            mcp_servers: List of MCP server dicts with keys:
                - use_case_id: Server identifier
                - url: MCP server endpoint URL
                - type: Either 'gateway' or 'runtime'

        Returns:
            List of Strands-compatible tool objects

        Raises:
            No exceptions are raised - errors are logged and processing continues
        """
        if not mcp_servers:
            logger.info("No MCP servers provided, returning empty tools list")
            return []

        logger.info(f"Starting MCP tool loading for {len(mcp_servers)} server(s)")

        try:
            gateway_servers, runtime_servers = self._categorize_servers(mcp_servers)

            logger.info(f"Categorized servers: {len(gateway_servers)} Gateway, {len(runtime_servers)} Runtime")

            all_tools = self._discover_tools_parallel(gateway_servers, runtime_servers)

            logger.info(f"Successfully loaded {len(all_tools)} total tools from MCP servers")
            return all_tools

        except Exception as e:
            logger.error(f"Unexpected error in load_tools: {e}")
            return []

    def _categorize_servers(
        self, mcp_servers: List[Dict[str, str]]
    ) -> Tuple[List[Dict[str, Any]], List[Dict[str, Any]]]:
        """
        Separate Gateway and Runtime servers based on type field.

        Args:
            mcp_servers: List of MCP server dicts with use_case_id, url, type

        Returns:
            Tuple of (gateway_servers, runtime_servers) where each is a list of dicts
            containing server name and url
        """
        gateway_servers = []
        runtime_servers = []

        for server in mcp_servers:
            try:
                server_type = server.get("type")
                use_case_id = server.get("use_case_id")
                url = server.get("url")

                # Validate required fields
                if not all([server_type, use_case_id, url]):
                    logger.warning(f"MCP server missing required fields: {server}, skipping")
                    continue

                if server_type == "gateway":
                    gateway_servers.append({"name": use_case_id, "url": url})
                    logger.debug(f"Categorized '{use_case_id}' as Gateway server")
                elif server_type == "runtime":
                    runtime_servers.append({"name": use_case_id, "url": url})
                    logger.debug(f"Categorized '{use_case_id}' as Runtime server")
                else:
                    logger.warning(f"Invalid server type '{server_type}' for '{use_case_id}', skipping")

            except Exception as e:
                logger.error(f"Error categorizing server: {e}")
                continue

        return gateway_servers, runtime_servers

    def _discover_tools_parallel(
        self, gateway_servers: List[Dict[str, Any]], runtime_servers: List[Dict[str, Any]]
    ) -> List[Any]:
        """
        Discover tools from all servers in parallel for performance.

        Uses ThreadPoolExecutor to parallelize network calls to multiple MCP servers.
        Each server's tool discovery is independent and failures don't affect others.

        Args:
            gateway_servers: List of Gateway server configurations
            runtime_servers: List of Runtime server configurations

        Returns:
            Combined list of all Strands-compatible tools from all servers
        """
        all_tools = []
        total_servers = len(gateway_servers) + len(runtime_servers)

        if total_servers == 0:
            logger.info("No servers to discover tools from")
            return []

        logger.info(f"Starting parallel tool discovery for {total_servers} server(s)")

        max_workers = min(total_servers, 10)

        with ThreadPoolExecutor(max_workers=max_workers) as executor:
            futures = []

            for server in gateway_servers:
                future = executor.submit(self._discover_gateway_tools, server["name"], server["url"])
                futures.append(("Gateway", server["name"], future))

            for server in runtime_servers:
                future = executor.submit(self._discover_runtime_tools, server["name"], server["url"])
                futures.append(("Runtime", server["name"], future))

            for server_type, server_name, future in futures:
                try:
                    tools = future.result(timeout=60)
                    if tools:
                        all_tools.extend(tools)
                        logger.info(f"Discovered {len(tools)} tool(s) from {server_type} server '{server_name}'")
                    else:
                        logger.info(f"No tools discovered from {server_type} server '{server_name}'")
                except Exception as e:
                    logger.error(f"Error discovering tools from {server_type} server '{server_name}': {e}")
                    continue

        logger.info(f"Parallel tool discovery complete: {len(all_tools)} total tools")
        return all_tools

    def _discover_gateway_tools(self, server_name: str, gateway_url: str) -> List[Any]:
        """
        Discover tools from a Gateway MCP server using provided URL.

        Keeps the MCP client alive by storing it so tools remain functional.

        Args:
            server_name: Name of the MCP server for logging
            gateway_url: Gateway endpoint URL

        Returns:
            List of Strands-compatible tools from this server
        """
        logger.info(f"[MCP SERVER PROCESSING] Server: '{server_name}', Type: Gateway, Status: Starting discovery")

        try:
            logger.debug(f"Gateway URL: {gateway_url}")

            captured_token = None

            @requires_access_token(
                provider_name=os.environ.get("M2M_IDENTITY_NAME", ""),
                scopes=[],
                auth_flow="M2M",
            )
            def get_token(access_token: str = None) -> str:
                nonlocal captured_token
                captured_token = access_token
                return access_token

            get_token()

            if not captured_token:
                logger.error(f"Failed to retrieve access token for '{server_name}'")
                return []

            gateway_client = MCPClient(
                lambda: streamablehttp_client(gateway_url, headers={"Authorization": f"Bearer {captured_token}"})
            )

            max_retries = 3
            retry_delay = 2

            for attempt in range(max_retries):
                try:
                    gateway_client.start()
                    break
                except Exception as e:
                    if "429" in str(e) and attempt < max_retries - 1:
                        logger.warning(f"Rate limited, retrying in {retry_delay}s...")
                        time.sleep(retry_delay)
                        retry_delay *= 2
                    else:
                        raise

            strands_tools = gateway_client.list_tools_sync()

            self._active_mcp_clients.append(gateway_client)
            logger.debug(f"Stored active MCP client for '{server_name}'")

            if not strands_tools:
                logger.info(f"[MCP SERVER PROCESSING] Server: '{server_name}', Type: Gateway, Tool Count: 0")
                return []

            logger.info(
                f"[MCP SERVER PROCESSING] Server: '{server_name}', Type: Gateway, Tool Count: {len(strands_tools)}, Status: Success"
            )
            return strands_tools

        except Exception as e:
            logger.error(f"[MCP SERVER PROCESSING] Server: '{server_name}', Type: Gateway, Status: Failed")
            logger.error(f"[TOOL DISCOVERY FAILURE] Server: '{server_name}', Error: {str(e)}")
            logger.error(f"Error: {e}", exc_info=True)
            return []

    def _discover_runtime_tools(self, server_name: str, runtime_url: str) -> List[Any]:
        """
        Discover tools from a Runtime MCP server using provided URL.

        Connects to AgentCore Runtime endpoint which proxies to ECS container.
        Uses M2M token authentication.

        Args:
            server_name: Name of the MCP server for logging
            runtime_url: Runtime endpoint URL (already constructed)

        Returns:
            List of Strands-compatible tools from this server
        """
        logger.info(f"[MCP SERVER PROCESSING] Server: '{server_name}', Type: Runtime, Status: Starting discovery")

        try:
            logger.debug(f"Runtime URL: {runtime_url}")

            captured_token = None

            @requires_access_token(
                provider_name=os.environ.get("M2M_IDENTITY_NAME", ""),
                scopes=[],
                auth_flow="M2M",
            )
            def get_token(access_token: str = None) -> str:
                nonlocal captured_token
                captured_token = access_token
                return access_token

            get_token()

            if not captured_token:
                logger.error(f"Failed to retrieve access token for Runtime server '{server_name}'")
                return []

            runtime_client = MCPClient(
                lambda: streamablehttp_client(runtime_url, headers={"Authorization": f"Bearer {captured_token}"})
            )

            max_retries = 3
            retry_delay = 2

            for attempt in range(max_retries):
                try:
                    runtime_client.start()
                    break
                except Exception as e:
                    if "429" in str(e) and attempt < max_retries - 1:
                        logger.warning(f"Rate limited on Runtime server '{server_name}', retrying in {retry_delay}s...")
                        time.sleep(retry_delay)
                        retry_delay *= 2
                    else:
                        raise

            strands_tools = runtime_client.list_tools_sync()

            self._active_mcp_clients.append(runtime_client)
            logger.debug(f"Stored active Runtime MCP client for '{server_name}'")

            if not strands_tools:
                logger.info(f"[MCP SERVER PROCESSING] Server: '{server_name}', Type: Runtime, Tool Count: 0")
                return []

            logger.info(
                f"[MCP SERVER PROCESSING] Server: '{server_name}', Type: Runtime, Tool Count: {len(strands_tools)}, Status: Success"
            )
            return strands_tools

        except Exception as e:
            logger.error(f"[MCP SERVER PROCESSING] Server: '{server_name}', Type: Runtime, Status: Failed")
            logger.error(f"[TOOL DISCOVERY FAILURE] Server: '{server_name}', Error: {str(e)}")
            logger.error(f"Error details: {e}", exc_info=True)
            return []
