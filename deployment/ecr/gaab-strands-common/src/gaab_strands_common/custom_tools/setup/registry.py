# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

"""
Tool Registry - Centralized registry for custom tools
"""

import logging
from typing import Any, Dict, List

logger = logging.getLogger(__name__)


class CustomToolsRegistry:
    """
    Centralized registry that automatically collects all custom tools
    when they are decorated with @custom_tool
    """

    def __init__(self):
        """Initialize registry with available custom tools"""
        self._available_tools: Dict[str, "BaseCustomTool"] = {}
        self._tool_names: Dict[str, str] = {}  # Maps tool name to tool_id for deduplication
        self._tool_method_names: Dict[str, List[str]] = {}  # Maps tool_id to list of @tool method names

    @classmethod
    def register(cls, tool_class):
        """
        Register a tool class in the registry with deduplication.

        Also discovers all @tool decorated methods in the class during registration.

        Args:
            tool_class: The tool class to register

        Returns:
            The tool class (for decorator chaining)

        Raises:
            ValueError: If tool ID already exists
        """
        # Get the singleton instance
        instance = cls._get_instance()

        tool_id = tool_class.metadata.tool_id
        logger.info(f"Attempting to register custom tool: {tool_id}")

        if tool_id in instance._available_tools:
            raise ValueError(f"Tool ID '{tool_id}' already registered")

        # Check for tool name conflicts (deduplication)
        tool_name = tool_class.metadata.name
        if tool_name in instance._tool_names:
            existing_tool_id = instance._tool_names[tool_name]
            logger.warning(
                f"Tool name conflict detected: '{tool_name}' is used by both '{existing_tool_id}' and '{tool_id}'. "
                f"Keeping first registration: '{existing_tool_id}'"
            )
            # Don't register the duplicate, but return the class for decorator chaining
            return tool_class

        tool_method_names = cls._discover_tool_methods(tool_class)  # Discover all @tool decorated methods

        instance._available_tools[tool_id] = tool_class
        instance._tool_names[tool_name] = tool_id
        instance._tool_method_names[tool_id] = tool_method_names

        logger.info(
            f"Successfully registered custom tool: {tool_id} with {len(tool_method_names)} method(s): "
            f"{', '.join(tool_method_names)} (total tools: {len(instance._available_tools)})"
        )

        # Log auto-attach condition if present
        if hasattr(tool_class, "_auto_condition"):
            logger.info(f"Tool {tool_id} has auto-attach condition")
        else:
            logger.info(f"Tool {tool_id} has no auto-attach condition")

        return tool_class

    @staticmethod
    def _discover_tool_methods(tool_class) -> List[str]:
        """
        Discover all @tool decorated methods in a tool class using MRO.

        Args:
            tool_class: The tool class to inspect

        Returns:
            List of method names that are decorated with @tool
        """
        tool_method_names = []

        for cls in tool_class.__mro__:
            # Stop at BaseCustomTool
            if cls.__name__ == "BaseCustomTool" or cls is object:
                continue

            for name, attr in cls.__dict__.items():
                # Skip private methods and duplicates
                if name.startswith("_") or name in tool_method_names:
                    continue

                # Check if it has tool_spec (decorated with @tool)
                if callable(attr) and hasattr(attr, "tool_spec"):
                    tool_method_names.append(name)

        return tool_method_names

    @classmethod
    def get_tool(cls, tool_id: str):
        """Get a tool class by ID"""
        instance = cls._get_instance()
        return instance._available_tools.get(tool_id)

    @classmethod
    def get_tool_method_names(cls, tool_id: str) -> List[str]:
        """
        Get the list of @tool decorated method names for a tool.
        Such as "s3_file_reader" can be passed as an ID and it will fetch the names of any
        tools inside this custom tool

        Args:
            tool_id: Tool identifier

        Returns:
            List of method names, or empty list if tool not found
        """
        instance = cls._get_instance()
        return instance._tool_method_names.get(tool_id, [])

    @classmethod
    def get_all_tools(cls) -> Dict[str, "BaseCustomTool"]:
        """Get all registered tools"""
        instance = cls._get_instance()
        return instance._available_tools.copy()

    @classmethod
    def list_tool_ids(cls) -> List[str]:
        """Get list of all registered tool IDs"""
        instance = cls._get_instance()
        return list(instance._available_tools.keys())

    @classmethod
    def has_tool(cls, tool_id: str) -> bool:
        """
        Check if a tool is available in the registry

        Args:
            tool_id: Tool identifier

        Returns:
            True if tool is available, False otherwise
        """
        instance = cls._get_instance()
        return tool_id in instance._available_tools

    @classmethod
    def get_available_tool_ids(cls) -> List[str]:
        """
        Get list of all available tool IDs

        Returns:
            List of tool IDs
        """
        return cls.list_tool_ids()

    @classmethod
    def clear(cls):
        """Clear all registered tools (useful for testing)"""
        instance = cls._get_instance()
        instance._available_tools.clear()
        instance._tool_names.clear()
        instance._tool_method_names.clear()

    # Singleton pattern for class-level access
    _instance = None

    @classmethod
    def _get_instance(cls):
        """Get singleton instance"""
        if cls._instance is None:
            cls._instance = cls()
        return cls._instance
