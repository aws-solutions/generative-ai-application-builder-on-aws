# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

"""
Metadata classes for custom tools
"""

from dataclasses import dataclass, field
from enum import Enum
from typing import List


class ToolCategory(Enum):
    """Categories for custom tools based on their interface and functionality"""

    MULTIMODAL = "Multimodal"
    """Content that bridges different media types - Image-to-text, document parsing, media conversion"""

    GENERAL = "General"
    """General purpose tools that don't fit into specific categories"""


@dataclass
class ToolMetadata:
    """Metadata for custom tools"""

    tool_id: str
    name: str
    description: str
    category: ToolCategory = ToolCategory.GENERAL
    version: str = "1.0.0"


@dataclass
class ToolRequirements:
    """Requirements for custom tools"""

    env_vars: List[str] = field(default_factory=list)
    config_params: List[str] = field(default_factory=list)

    def __post_init__(self):
        """Initialize empty lists if None"""
        if self.env_vars is None:
            self.env_vars = []
        if self.config_params is None:
            self.config_params = []
