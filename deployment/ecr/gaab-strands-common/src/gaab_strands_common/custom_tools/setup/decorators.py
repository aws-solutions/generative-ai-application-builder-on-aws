# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

"""
Decorators for custom tools
"""

from typing import Any, Callable, Dict, List

from .metadata import ToolCategory, ToolMetadata, ToolRequirements
from .registry import CustomToolsRegistry


def custom_tool(tool_id: str, name: str, description: str, category: ToolCategory = ToolCategory.GENERAL, **kwargs):
    """
    Define tool metadata and register the tool. Sets the _metadata class variable

    Args:
        id: Unique tool identifier
        name: Human-readable tool name
        description: Tool description
        category: Tool category (ToolCategory enum or string, default: ToolCategory.GENERAL)
        **kwargs: Additional metadata fields
    """

    def decorator(cls):
        cls.metadata = ToolMetadata(tool_id=tool_id, name=name, description=description, category=category, **kwargs)
        return CustomToolsRegistry.register(cls)

    return decorator


def requires(env_vars: List[str] = None, config_params: List[str] = None):
    """
    Define tool requirements. Sets the _requirements class variable

    Args:
        env_vars: List of required environment variables (defaults to empty list)
        config_params: List of required config parameters (dot notation) which the tool might use (defaults to empty list)
    """

    def decorator(cls):
        cls._requirements = ToolRequirements(env_vars=env_vars, config_params=config_params)
        return cls

    return decorator


def auto_attach_when(condition: Callable[[Dict[str, Any]], bool]):
    """
    Define auto-attachment condition. Sets the _auto_condition class variable

    Args:
        condition: Function that takes config dict and returns bool.
                   If the condition evaluates to true, then the custom tool is auto-attached at the time of loading tools.
    """

    def decorator(cls):
        cls._auto_condition = condition
        return cls

    return decorator
