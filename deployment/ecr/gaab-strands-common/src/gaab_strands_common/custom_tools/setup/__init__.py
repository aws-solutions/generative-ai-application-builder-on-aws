# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

"""
Custom Tools Setup - Core components for custom tools system
"""

from .base_tool import BaseCustomTool
from .decorators import auto_attach_when, custom_tool, requires
from .metadata import ToolCategory, ToolMetadata, ToolRequirements
from .registry import CustomToolsRegistry

__all__ = [
    "CustomToolsRegistry",
    "BaseCustomTool",
    "custom_tool",
    "requires",
    "auto_attach_when",
    "ToolCategory",
    "ToolMetadata",
    "ToolRequirements",
]
