# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

#!/usr/bin/env python3
"""
StrandsToolsRegistry - Registry for built-in Strands tools
"""

import logging
from typing import Dict, List, Type, Any
import importlib
import pkgutil

from strands.tools.decorator import DecoratedFunctionTool

logger = logging.getLogger(__name__)


class StrandsToolsRegistry:
    """Registry for built-in Strands tools from strands-agents-tools package"""

    def __init__(self):
        """Initialize registry with available Strands tools"""
        self._available_tools: Dict[str, Type] = {}
        self._discover_strands_tools()
        logger.info(f"StrandsToolsRegistry initialized with {len(self._available_tools)} available tools")

    def _discover_strands_tools(self) -> None:
        """
        Discover available tools from strands-agents-tools package

        This method imports the strands_tools package and discovers all submodules.
        Each submodule represents a tool (e.g., calculator, http_request, file_read).
        """
        try:
            import strands_tools

            for module_info in pkgutil.iter_modules(strands_tools.__path__):
                tool_module_name = module_info.name

                try:
                    tool_module = importlib.import_module(f"strands_tools.{tool_module_name}")

                    tool_id = tool_module_name

                    # Store the module itself as the tool
                    self._available_tools[tool_id] = tool_module
                    logger.debug(f"Discovered tool: {tool_id} from strands_tools.{tool_module_name}")

                except Exception as e:
                    logger.debug(f"Could not import strands_tools.{tool_module_name}: {e}")
                    continue

            logger.info(f"Discovered {len(self._available_tools)} tools from strands_tools")

        except ImportError as e:
            logger.warning(f"Could not import strands-agents-tools package (strands_tools): {e}")
            logger.warning("No built-in Strands tools will be available")
        except Exception as e:
            logger.error(f"Error discovering Strands tools: {e}")
            logger.warning("No built-in Strands tools will be available")

    def get_tools(self, tool_ids: List[str]) -> List[Any]:
        """
        Get instances of specified Strands tools

        Args:
            tool_ids: List of tool identifiers (e.g., ['web_search', 'calculator'])

        Returns:
            List of instantiated Strands tool objects

        Raises:
            ValueError: If a tool_id is not found in the registry
        """
        logger.info(f"Loading {len(tool_ids)} built-in Strands tool(s): {', '.join(tool_ids)}")

        tools = []
        missing_tools = []

        for tool_id in tool_ids:
            tool_instance = self._load_single_tool(tool_id, missing_tools)
            if tool_instance is not None:
                tools.append(tool_instance)

        self._log_missing_tools(missing_tools)
        logger.info(f"Successfully loaded {len(tools)} built-in Strands tool(s)")
        return tools

    def _load_single_tool(self, tool_id: str, missing_tools: List[str]) -> Any:
        """
        Load a single tool by ID

        Args:
            tool_id: Tool identifier
            missing_tools: List to append to if tool fails to load

        Returns:
            Tool instance or None if loading failed
        """
        if tool_id not in self._available_tools:
            self._log_tool_not_found(tool_id)
            missing_tools.append(tool_id)
            return None

        try:
            tool_ref = self._available_tools[tool_id]
            tool_instance = self._instantiate_tool(tool_ref)
            logger.debug(f"Successfully loaded Strands tool: {tool_id}")
            return tool_instance
        except Exception as e:
            self._log_tool_load_error(tool_id, e)
            missing_tools.append(tool_id)
            return None

    def _instantiate_tool(self, tool_ref: Any) -> Any:
        """
        Instantiate a tool from its reference

        Args:
            tool_ref: Tool reference (module or class)

        Returns:
            Instantiated tool object
        """
        if self._is_module(tool_ref):
            return self._instantiate_from_module(tool_ref)
        return tool_ref()

    def _is_module(self, tool_ref: Any) -> bool:
        """Check if tool reference is a module"""
        return hasattr(tool_ref, "__file__") and hasattr(tool_ref, "__name__")

    def _instantiate_from_module(self, tool_module: Any) -> Any:
        """
        Instantiate a tool from a module by finding the Tool class

        Args:
            tool_module: Module containing the tool

        Returns:
            Tool instance
        """
        tool_instance = self._find_tool_class_in_module(tool_module)
        return tool_instance if tool_instance is not None else tool_module

    def _find_tool_class_in_module(self, tool_module: Any) -> Any:
        """
        Find and instantiate a Tool class in a module

        Args:
            tool_module: Module to search

        Returns:
            Tool instance, function, or None if not found
        """
        # Check for @tool decorator pattern (DecoratedFunctionTool)
        for attr_name in dir(tool_module):
            if attr_name.startswith("_"):
                continue

            attr = getattr(tool_module, attr_name)

            # Check if it's a DecoratedFunctionTool (from @tool decorator)
            if isinstance(attr, DecoratedFunctionTool):
                return attr

        # If nothing found, return None (module will be used for TOOL_SPEC pattern)
        return None

    def _log_tool_not_found(self, tool_id: str) -> None:
        """Log warning when tool is not found in registry"""
        logger.warning(
            f"[TOOL DISCOVERY FAILURE] Tool: '{tool_id}', Source: Strands, Error: Tool not found in registry"
        )
        available_tools_str = ", ".join(sorted(self._available_tools.keys())) if self._available_tools else "None"
        logger.warning(f"Tool '{tool_id}' not found in Strands tools registry. Available tools: {available_tools_str}")

    def _log_tool_load_error(self, tool_id: str, error: Exception) -> None:
        """Log error when tool fails to load"""
        logger.error(f"[TOOL DISCOVERY FAILURE] Tool: '{tool_id}', Source: Strands, Error: {str(error)}")
        logger.error(f"Error loading tool {tool_id}: {error}", exc_info=True)

    def _log_missing_tools(self, missing_tools: List[str]) -> None:
        """Log summary of missing tools"""
        if missing_tools:
            logger.warning(f"Could not load {len(missing_tools)} Strands tool(s): {', '.join(missing_tools)}")

    def list_available_tools(self) -> List[Dict[str, str]]:
        """
        List all available Strands tools with metadata

        Returns:
            List of dictionaries containing tool metadata (id, name, description)
        """
        tools_list = []

        for tool_id, tool_class in self._available_tools.items():
            tool_info = {
                "id": tool_id,
                "name": tool_class.__name__,
                "description": self._get_tool_description(tool_class),
            }
            tools_list.append(tool_info)

        return tools_list

    def _get_tool_description(self, tool_class: Type) -> str:
        """
        Extract description from tool class

        Args:
            tool_class: The tool class

        Returns:
            Tool description string
        """
        if tool_class.__doc__:
            return tool_class.__doc__.strip().split("\n")[0]

        if hasattr(tool_class, "description"):
            return str(tool_class.description)

        return "No description available"

    def has_tool(self, tool_id: str) -> bool:
        """
        Check if a tool is available in the registry

        Args:
            tool_id: Tool identifier

        Returns:
            True if tool is available, False otherwise
        """
        return tool_id in self._available_tools

    def get_available_tool_ids(self) -> List[str]:
        """
        Get list of all available tool IDs

        Returns:
            List of tool IDs
        """
        return list(self._available_tools.keys())
