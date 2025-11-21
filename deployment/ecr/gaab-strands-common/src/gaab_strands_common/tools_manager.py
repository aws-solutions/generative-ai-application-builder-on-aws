# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

#!/usr/bin/env python3
"""
ToolsManager - Coordinates all tool sources (MCP and built-in Strands tools)

This module provides the main orchestrator for loading and managing tools from
multiple sources: built-in Strands tools and MCP servers (Gateway and Runtime).
It handles tool loading, conflict detection, and provides debugging capabilities.
"""

import logging
from typing import Any, Dict, List

from gaab_strands_common import wrap_tool_with_events
from gaab_strands_common.custom_tools.setup.registry import CustomToolsRegistry
from gaab_strands_common.mcp_tools_loader import MCPToolsLoader
from gaab_strands_common.models import UseCaseConfig
from gaab_strands_common.strands_tools_registry import StrandsToolsRegistry

logger = logging.getLogger(__name__)


class ToolsManager:
    """
    Manages both MCP tools and built-in Strands tools.

    This class coordinates tool loading from multiple sources:
    - Built-in Strands tools from strands-agents-tools package
    - MCP tools from Gateway servers (external OAuth services)
    - MCP tools from Runtime servers (containerized MCP servers)

    It provides:
    - Unified tool loading interface
    - Tool name conflict detection and resolution
    - Comprehensive logging for debugging
    - Tool source tracking
    """

    def __init__(self, region: str, config: UseCaseConfig):
        """
        Initialize ToolsManager with AWS region.

        Args:
            region: AWS region for MCP clients
            config: Full use case configuration object
        """
        self.region = region
        self.config = config
        self._config_dict = config.model_dump(by_alias=True)
        self.strands_tools_registry = StrandsToolsRegistry()
        self.custom_tools_registry = CustomToolsRegistry()
        self.mcp_loader = MCPToolsLoader(region)
        self._tool_sources: Dict[str, str] = {}  # Maps tool name to source
        logger.info(f"Initialized ToolsManager for region: {region}")

    def load_all_tools(
        self,
        mcp_servers: List[Dict[str, str]],
        strands_tool_ids: List[str],
        custom_tool_ids: List[str],
    ) -> List[Any]:
        """
        Load all tools from MCP servers, Strands built-in registry, and custom tools.

        This is the main entry point for tool loading. It:
        1. Loads built-in Strands tools first (fast, no network calls)
        2. Loads custom tools (registry-based with auto-discovery)
        3. Loads MCP tools (may involve network calls)
        4. Detects and resolves tool name conflicts
        5. Tracks tool sources for debugging
        6. Returns combined list of all tools

        Args:
            mcp_servers: List of MCP server dicts with keys:
                - use_case_id: Server identifier
                - url: MCP server endpoint URL
                - type: Either 'gateway' or 'runtime'
            strands_tool_ids: List of built-in Strands tool identifiers
            custom_tool_ids: List of custom Strands tool identifiers

        Returns:
            Combined list of all Strands-compatible tool objects

        Note:
            Errors are logged but don't stop processing. The agent will
            continue with whatever tools successfully loaded.
        """
        logger.info("=" * 80)
        logger.info("[TOOL LOADING START]")
        logger.info(f"Configuration: {len(strands_tool_ids)} built-in tool(s), {len(mcp_servers)} MCP server(s)")
        if strands_tool_ids:
            logger.info(f"Built-in tools requested: {', '.join(strands_tool_ids)}")
        if mcp_servers:
            server_names = [server.get("use_case_id", "unknown") for server in mcp_servers]
            logger.info(f"MCP servers requested: {', '.join(server_names)}")
        if custom_tool_ids:
            logger.info(f"Custom tools requested: {', '.join(custom_tool_ids)}")
        logger.info("=" * 80)

        all_tools = []
        self._tool_sources.clear()

        strands_tools = self._load_strands_tools(strands_tool_ids)
        all_tools.extend(strands_tools)

        custom_tools = self._load_custom_tools(custom_tool_ids)
        all_tools.extend(custom_tools)

        mcp_tools = self._load_mcp_tools(mcp_servers)
        all_tools.extend(mcp_tools)

        self._detect_conflicts(all_tools)

        # Wrap all tools with event emission
        logger.info("Wrapping tools with event emission for UI tracking")
        wrapped_tools = []
        for tool in all_tools:
            try:
                wrapped_tool = wrap_tool_with_events(tool)
                wrapped_tools.append(wrapped_tool)
            except Exception as e:
                logger.error(f"Failed to wrap tool {self._get_tool_name(tool)}: {e}")
                # Use unwrapped tool as fallback
                wrapped_tools.append(tool)

        all_tools = wrapped_tools

        self._log_tool_summary(all_tools)

        logger.info("=" * 80)
        logger.info(
            f"[TOOL LOADING COMPLETE] Total: {len(all_tools)} tool(s) available (all wrapped with event emission)"
        )
        logger.info("=" * 80)
        return all_tools

    def _load_strands_tools(self, tool_ids: List[str]) -> List[Any]:
        """
        Load built-in Strands tools from the registry.

        Args:
            tool_ids: List of Strands tool identifiers

        Returns:
            List of instantiated Strands tool objects
        """
        if not tool_ids:
            logger.info("No built-in Strands tools requested")
            return []

        logger.info(f"Loading {len(tool_ids)} built-in Strands tool(s): {', '.join(tool_ids)}")

        try:
            tools = self.strands_tools_registry.get_tools(tool_ids)

            # Track tool sources
            for tool in tools:
                tool_name = self._get_tool_name(tool)
                self._tool_sources[tool_name] = "Strands"
                logger.debug(f"Registered Strands tool: {tool_name}")

            logger.info(f"Successfully loaded {len(tools)} built-in Strands tool(s)")
            return tools

        except Exception as e:
            logger.error(f"Error loading Strands tools: {e}")
            return []

    def _load_mcp_tools(self, mcp_servers: List[Dict[str, str]]) -> List[Any]:
        """
        Load MCP tools from configured servers.

        Args:
            mcp_servers: List of MCP server dicts with keys:
                - use_case_id: Server identifier
                - url: MCP server endpoint URL
                - type: Either 'gateway' or 'runtime'

        Returns:
            List of Strands-compatible MCP tool objects
        """
        if not mcp_servers:
            logger.info("No MCP servers configured")
            return []

        logger.info(f"Loading MCP tools from {len(mcp_servers)} server(s)")

        try:

            tools = self.mcp_loader.load_tools(mcp_servers)

            for tool in tools:
                tool_name = self._get_tool_name(tool)
                # Try to get server type from tool metadata first, then fall back to server type detection
                server_type = self._get_tool_server_type(tool)
                if server_type == "Unknown":
                    # If we can't determine from tool metadata, we'll use "MCP" as generic type
                    server_type = "MCP"
                self._tool_sources[tool_name] = f"MCP-{server_type}"
                logger.debug(f"Registered MCP tool: {tool_name} from {server_type}")

            logger.info(f"Successfully loaded {len(tools)} MCP tool(s)")
            return tools

        except Exception as e:
            logger.error(f"Error loading MCP tools: {e}")
            return []

    def _load_custom_tools(self, custom_tool_ids: List[str]) -> List[Any]:
        """
        Load custom tools using the new registry pattern.

        This method:
        1. Loads explicitly configured custom tools
        2. Loads auto-attach tools based on conditions
        3. Removes duplicates

        Args:
            custom_tool_ids: List of custom Strands tool identifiers

        Returns:
            List of custom tool implementations
        """
        custom_tools = []

        try:
            logger.info(f"Loading custom tools with configured IDs: {custom_tool_ids}")

            # Load explicitly configured tools
            configured_tools = self._load_configured_custom_tools(custom_tool_ids)
            custom_tools.extend(configured_tools)
            logger.info("Loaded %d explicitly configured custom tools", len(configured_tools))

            # Load auto-attach tools
            logger.info("Starting auto-attach tools loading...")
            auto_tools = self._load_auto_attach_tools()
            custom_tools.extend(auto_tools)
            logger.info("Successfully loaded %d auto-attach custom tool(s)", len(auto_tools))

            return custom_tools

        except Exception as e:
            logger.error(f"Error loading custom tools: {e}")
            return []

    def _load_configured_custom_tools(self, custom_tool_ids: List[str]) -> List[Any]:
        """Load explicitly configured custom tools"""
        configured_tools = []

        for tool_id in custom_tool_ids:
            tool_methods = self._load_single_custom_tool(tool_id)
            configured_tools.extend(tool_methods)

        return configured_tools

    def _load_auto_attach_tools(self) -> List[Any]:
        """Load tools that should be auto-attached based on conditions"""
        auto_tools = []

        all_tools = self.custom_tools_registry.get_all_tools()

        for tool_id, tool_class in all_tools.items():
            if hasattr(tool_class, "_auto_condition"):
                try:
                    condition_result = tool_class._auto_condition(self._config_dict)
                    logger.info(f"Auto-attach condition for {tool_id} returned: {condition_result}")

                    if condition_result:
                        tool_methods = self._load_single_custom_tool(tool_id)
                        auto_tools.extend(tool_methods)
                except Exception as e:
                    logger.error(f"Failed to auto-attach tool {tool_id}: {e}")

        return auto_tools

    def _load_single_custom_tool(self, tool_id: str) -> List[str]:
        """
        Load a single custom tool by ID and return all its @tool decorated methods.

        Uses pre-discovered method names from the registry for efficiency.
        Returns empty list if tool not found or has no methods.
        """
        tool_class = self.custom_tools_registry.get_tool(tool_id)
        if not tool_class:
            logger.warning(f"Custom tool {tool_id} not found in registry")
            return []

        # Get pre-discovered method names from registry
        method_names = self.custom_tools_registry.get_tool_method_names(tool_id)
        if not method_names:
            logger.warning(f"Custom tool {tool_id} has no @tool decorated methods")
            return []

        try:
            tool_instance = tool_class(config=self._config_dict, region=self.region)

            # Get the bound methods from the instance
            tool_methods = []
            for method_name in method_names:
                tool_method = getattr(tool_instance, method_name)
                tool_methods.append(tool_method)

                tool_name = self._get_tool_name(tool_method)
                self._tool_sources[tool_name] = "Custom"
                logger.debug(f"Loaded tool method '{tool_name}' from custom tool {tool_id}")

            logger.debug(f"Successfully loaded custom tool {tool_id} with {len(tool_methods)} method(s)")
            return tool_methods

        except Exception as e:
            logger.error(f"Failed to load custom tool {tool_id}: {e}")
            return []

    def _detect_conflicts(self, tools: List[Any]) -> None:
        """
        Detect and log tool name conflicts.

        When tools from different sources have the same name, this method
        logs warnings with details about the conflicting sources.

        Args:
            tools: List of all loaded tools

        Note:
            This method only logs conflicts. The actual conflict resolution
            (which tool takes precedence) is handled by the Strands agent
            based on the order tools are provided.
        """
        tool_names: Dict[str, List[str]] = {}

        for tool in tools:
            tool_name = self._get_tool_name(tool)
            source = self._tool_sources.get(tool_name, "Unknown")

            if tool_name not in tool_names:
                tool_names[tool_name] = []
            tool_names[tool_name].append(source)

        conflicts = {name: sources for name, sources in tool_names.items() if len(sources) > 1}

        if conflicts:
            logger.warning(f"Detected {len(conflicts)} tool name conflict(s):")
            for tool_name, sources in conflicts.items():
                logger.warning(f"  - Tool '{tool_name}' provided by: {', '.join(sources)}")
                logger.warning(f"    Resolution: First occurrence will be used (order: Strands, then MCP servers)")
        else:
            logger.info("No tool name conflicts detected")

    def _log_tool_summary(self, tools: List[Any]) -> None:
        """
        Log summary of loaded tools by source.

        Args:
            tools: List of all loaded tools
        """
        source_counts: Dict[str, int] = {}
        tool_details_by_source: Dict[str, List[str]] = {}

        for tool in tools:
            tool_name = self._get_tool_name(tool)
            source = self._tool_sources.get(tool_name, "Unknown")
            source_counts[source] = source_counts.get(source, 0) + 1

            if source not in tool_details_by_source:
                tool_details_by_source[source] = []
            tool_details_by_source[source].append(tool_name)

        logger.info("-" * 80)
        logger.info("[FINAL TOOL REGISTRATION]")
        logger.info(f"Total tools registered: {len(tools)}")
        logger.info("-" * 80)

        logger.info("Tools by source:")
        for source in sorted(source_counts.keys()):
            count = source_counts[source]
            tool_names = tool_details_by_source[source]
            logger.info(f"  {source}: {count} tool(s)")
            logger.info(f"    Tools: {', '.join(tool_names)}")

        if tools:
            all_tool_names = [self._get_tool_name(tool) for tool in tools]
            logger.debug(f"All available tools: {', '.join(sorted(all_tool_names))}")

        logger.info("-" * 80)

    def get_tool_sources(self) -> Dict[str, str]:
        """
        Return mapping of tool names to their sources.

        This is useful for debugging and understanding where each tool came from.

        Returns:
            Dictionary mapping tool names to source identifiers
            (e.g., "Strands", "MCP-Gateway", "MCP-Runtime")

        Example:
            {
                "web_search": "Strands",
                "get_calendar_events": "MCP-Gateway",
                "query_database": "MCP-Runtime"
            }
        """
        return self._tool_sources.copy()

    def _get_tool_name(self, tool: Any) -> str:
        """
        Extract tool name from a tool object.

        Args:
            tool: Tool object (Strands or MCP)

        Returns:
            Tool name as string
        """
        if hasattr(tool, "name"):
            return str(tool.name)
        elif hasattr(tool, "__name__"):
            return str(tool.__name__)
        elif hasattr(tool, "func") and hasattr(tool.func, "__name__"):
            return str(tool.func.__name__)
        else:
            return tool.__class__.__name__

    def _get_tool_server_type(self, tool: Any) -> str:
        """
        Extract server type from MCP tool metadata.

        Args:
            tool: MCP tool object

        Returns:
            Server type ("Gateway", "Runtime", or "Unknown")
        """
        if hasattr(tool, "metadata") and isinstance(tool.metadata, dict):
            return tool.metadata.get("server_type", "Unknown")

        if hasattr(tool, "description") and isinstance(tool.description, str):
            if "Gateway" in tool.description:
                return "Gateway"
            if "Runtime" in tool.description:
                return "Runtime"

        return "Unknown"
