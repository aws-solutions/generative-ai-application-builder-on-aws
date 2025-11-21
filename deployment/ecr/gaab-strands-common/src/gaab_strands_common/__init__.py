# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

"""
GAAB Strands Common Library
Shared functionality for GAAB Strands agents
"""

# Import submodules to ensure they get registered
import gaab_strands_common.custom_tools
import gaab_strands_common.multimodal
import gaab_strands_common.utils
from gaab_strands_common.base_agent import BaseAgent
from gaab_strands_common.constants import (
    ENV_AWS_REGION,
    ENV_MEMORY_ID,
    ENV_MEMORY_STRATEGY_ID,
    ENV_USE_CASE_CONFIG_KEY,
    ENV_USE_CASE_TABLE_NAME,
)

# Import custom tools setup components
from gaab_strands_common.custom_tools.setup import (
    BaseCustomTool,
    CustomToolsRegistry,
    ToolCategory,
    ToolMetadata,
    ToolRequirements,
    auto_attach_when,
    custom_tool,
    requires,
)
from gaab_strands_common.ddb_helper import DynamoDBHelper
from gaab_strands_common.mcp_tools_loader import MCPToolsLoader
from gaab_strands_common.models import (
    AgentBuilderParams,
    AgentReference,
    AgentsAsToolsParams,
    BedrockLlmParams,
    FileReference,
    LlmParams,
    MCPServerConfig,
    MemoryConfig,
    UseCaseConfig,
    WorkflowConfig,
    WorkflowParams,
)
from gaab_strands_common.multimodal.file_handler import FileHandler
from gaab_strands_common.multimodal.multimodal_processor import MultimodalRequestProcessor
from gaab_strands_common.runtime_streaming import RuntimeStreaming
from gaab_strands_common.strands_tools_registry import StrandsToolsRegistry
from gaab_strands_common.tool_wrapper import ToolEventEmitter, wrap_tool_with_events
from gaab_strands_common.tools_manager import ToolsManager
from gaab_strands_common.utils.constants import (
    MULTIMODAL_FILES_BUCKET_NAME_ENV_VAR,
    MULTIMODAL_FILES_METADATA_TABLE_NAME_ENV_VAR,
    RETRY_CONFIG,
    USE_CASE_CONFIG_RECORD_KEY_ENV_VAR,
    USE_CASE_CONFIG_TABLE_NAME_ENV_VAR,
)
from gaab_strands_common.utils.helpers import retry_with_backoff

__all__ = [
    "RuntimeStreaming",
    "DynamoDBHelper",
    "UseCaseConfig",
    "LlmParams",
    "BedrockLlmParams",
    "AgentBuilderParams",
    "MemoryConfig",
    "MCPServerConfig",
    "WorkflowConfig",
    "WorkflowParams",
    "AgentReference",
    "AgentsAsToolsParams",
    "FileReference",
    "wrap_tool_with_events",
    "ToolEventEmitter",
    "BaseAgent",
    "ENV_USE_CASE_TABLE_NAME",
    "ENV_USE_CASE_CONFIG_KEY",
    "ENV_AWS_REGION",
    "ENV_MEMORY_ID",
    "ENV_MEMORY_STRATEGY_ID",
    "MULTIMODAL_FILES_BUCKET_NAME_ENV_VAR",
    "MULTIMODAL_FILES_METADATA_TABLE_NAME_ENV_VAR",
    "USE_CASE_CONFIG_RECORD_KEY_ENV_VAR",
    "USE_CASE_CONFIG_TABLE_NAME_ENV_VAR",
    "ToolsManager",
    "StrandsToolsRegistry",
    "MCPToolsLoader",
    "retry_with_backoff",
    "RETRY_CONFIG",
    "FileHandler",
    "MultimodalRequestProcessor",
    "BaseCustomTool",
    "ToolCategory",
    "ToolMetadata",
    "CustomToolsRegistry",
    "ToolRequirements",
    "auto_attach_when",
    "custom_tool",
    "requires",
]
