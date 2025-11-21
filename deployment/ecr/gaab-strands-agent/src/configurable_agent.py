# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

#!/usr/bin/env python3
"""
Configurable Strands Agent - Main agent orchestration class
"""

import logging
import os
from typing import Any, List, Optional

from gaab_strands_common import DynamoDBHelper, ToolsManager, UseCaseConfig
from gaab_strands_common.utils.helpers import build_guardrail_config, create_boto_config
from strands import Agent
from strands.models import BedrockModel
from strands.session import SessionManager

logger = logging.getLogger(__name__)


class ConfigurableAgent:
    """Configurable Strands Agent that loads configuration from DynamoDB"""

    def __init__(
        self,
        table_name: str,
        config_key: str,
        region: str,
        session_manager: SessionManager = None,
    ):
        """
        Initialize ConfigurableAgent
        """
        self.table_name = table_name
        self.config_key = config_key
        self.region = region
        self.session_manager = session_manager

        self.config: Optional[UseCaseConfig] = None
        self.agent: Optional[Agent] = None
        self.ddb_helper: Optional[DynamoDBHelper] = None
        self.tools_manager: Optional[ToolsManager] = None
        self.loaded_tools: List[Any] = []

        logger.info(f"Initializing agent for table: {self.table_name}, key: {self.config_key}")
        # Load configuration and create agent
        self._initialize()

    def _initialize(self):
        """Initialize the agent with configuration from DynamoDB"""
        # Create DynamoDB helper
        self.ddb_helper = DynamoDBHelper(self.table_name, self.region)

        # Load configuration
        config_dict = self.ddb_helper.get_config(self.config_key)

        # Validate use case type
        use_case_type = config_dict.get("UseCaseType")
        if use_case_type != "AgentBuilder":
            raise ValueError(f"Expected AgentBuilder, got {use_case_type}")

        # Create agent config
        self.config = UseCaseConfig.from_ddb_config(config_dict)
        logger.info(f"Loaded config for agent: {self.config.use_case_name}")

        # Set tool environment variables before loading tools
        self._set_tool_environment_variables()

        self.tools_manager = ToolsManager(self.region, config=self.config)

        strands_tool_ids = self.config.agent_builder_params.get_tool_ids()
        mcp_servers = self.config.agent_builder_params.get_mcp_servers()
        custom_tool_ids = self.config.agent_builder_params.get_custom_tool_ids()

        logger.info(
            "Tool configuration: %d built-in tool(s), %d custom tool(s), %d MCP server(s)",
            len(strands_tool_ids),
            len(custom_tool_ids),
            len(mcp_servers),
        )

        try:
            self.loaded_tools = self.tools_manager.load_all_tools(
                mcp_servers=mcp_servers,
                strands_tool_ids=strands_tool_ids,
                custom_tool_ids=custom_tool_ids,
            )
            logger.info(f"Successfully loaded {len(self.loaded_tools)} tool(s)")
        except Exception as e:
            logger.error(f"Error loading tools: {e}", exc_info=True)
            logger.warning("Agent will initialize without tools")
            self.loaded_tools = []

        # Create agent
        self._create_agent()
        logger.info("Agent initialization completed")

    def _normalize_tool_names(self, tool_ids: List[str]) -> List[str]:
        """Normalize tool IDs by replacing spaces/hyphens with underscores and converting to uppercase"""
        return [tool_id.replace(" ", "_").replace("-", "_").upper() for tool_id in tool_ids]

    def _extract_env_var_name(
        self, key_without_prefix: str, normalized_tool_names: List[str]
    ) -> Optional[str]:
        """Extract environment variable name from key by matching against known tool names"""
        # Try to match against known tool names
        for tool_name in normalized_tool_names:
            if key_without_prefix.startswith(tool_name + "_"):
                return key_without_prefix[len(tool_name) + 1 :]

        # Fallback: simple split for single-word tool names
        parts = key_without_prefix.split("_", 1)
        return parts[1] if len(parts) >= 2 else None

    def _set_env_var_from_param(self, env_var_name: str, param_obj: Any, key: str) -> bool:
        """Set environment variable from parameter object, returns True if successful"""
        if isinstance(param_obj, dict) and "Value" in param_obj:
            os.environ[env_var_name] = str(param_obj["Value"])
            logger.debug(f"Set environment variable {env_var_name} from ModelParams")
            return True

        if not isinstance(param_obj, dict):
            os.environ[env_var_name] = str(param_obj)
            logger.debug(
                f"Set environment variable {env_var_name} from ModelParams (legacy format)"
            )
            return True

        logger.warning(f"ModelParams key {key} has ENV_ prefix but missing 'Value' field")
        return False

    def _set_tool_environment_variables(self):
        """
        Extract and set environment variables from LlmParams.ModelParams for tools.

        ModelParams keys with pattern ENV_<TOOL_NAME>_<ENV_VAR_NAME> are
        extracted and set as environment variables with name <ENV_VAR_NAME>.
        ModelParams values are objects with 'Value' and 'Type' fields.

        Tool names can contain underscores (e.g., CURRENT_TIME), so we need to
        match against known tool IDs to properly extract the environment variable name.
        """
        if not self.config or not self.config.llm_params:
            return

        model_params = self.config.llm_params.model_params or {}
        tool_ids = self.config.agent_builder_params.get_tool_ids()
        normalized_tool_names = self._normalize_tool_names(tool_ids)

        env_vars_set = 0
        for key, param_obj in model_params.items():
            if not key.startswith("ENV_"):
                continue

            key_without_prefix = key[4:]
            env_var_name = self._extract_env_var_name(key_without_prefix, normalized_tool_names)

            if env_var_name and self._set_env_var_from_param(env_var_name, param_obj, key):
                env_vars_set += 1

        if env_vars_set > 0:
            logger.info(f"Set {env_vars_set} tool environment variable(s) from ModelParams")

    def _create_model(self) -> BedrockModel:
        """Create Bedrock model from configuration"""
        if not self.config:
            raise ValueError("No configuration loaded")

        bedrock_params = self.config.llm_params.bedrock_llm_params

        # Log environment and configuration for debugging
        logger.info(f"Environment AWS_REGION: {os.getenv('AWS_REGION')}")
        logger.info(f"Configured region: {self.region}")
        logger.info(f"Inference type: {bedrock_params.bedrock_inference_type}")
        logger.info(f"Model identifier from config: {bedrock_params.model_identifier}")

        # Check if this is a cross-region inference profile
        is_cross_region_profile = bedrock_params.model_identifier.startswith("us.")
        if is_cross_region_profile:
            logger.info(
                f"Detected cross-region inference profile: {bedrock_params.model_identifier}"
            )

        # Create Botocore Config with retry settings and user agent
        boto_config = create_boto_config(self.region)

        # Build guardrail configuration if available
        guardrail_config = build_guardrail_config(bedrock_params)

        model_config = {
            "model_id": bedrock_params.model_identifier,
            "region_name": self.region,
            "temperature": self.config.llm_params.temperature,
            "streaming": self.config.llm_params.streaming,
            "boto_client_config": boto_config,
            **guardrail_config,
        }

        return BedrockModel(**model_config)

    def _create_agent(self):
        """Create Strands agent with loaded configuration"""
        if not self.config:
            raise ValueError("No configuration loaded")

        # Create model
        model = self._create_model()

        if self.loaded_tools:
            logger.info(f"Creating agent with {len(self.loaded_tools)} tool(s)")
            if self.tools_manager:
                tool_sources = self.tools_manager.get_tool_sources()
                logger.debug(f"Tool sources: {tool_sources}")
        else:
            logger.info("Creating agent without tools")

        additional_params = {}
        if (
            self.config.agent_builder_params.memory_config
            and self.config.agent_builder_params.memory_config.long_term_enabled
            and self.session_manager
        ):
            logger.info("Long-term memory enabled - adding session manager to agent")
            additional_params["session_manager"] = self.session_manager
        else:
            logger.info("Long-term memory disabled or session manager not available")
            logger.info(f"Session manager exists: {self.session_manager is not None}")

        # Create agent with configuration and loaded tools
        self.agent = Agent(
            name=self.config.use_case_name,
            system_prompt=self.config.agent_builder_params.system_prompt,
            tools=self.loaded_tools,
            model=model,
            **additional_params,
        )

    def get_agent(self) -> Agent:
        """Get the configured Strands agent"""
        if not self.agent:
            raise ValueError("Agent not initialized")
        return self.agent

    def get_config(self) -> UseCaseConfig:
        """Get the agent configuration"""
        if not self.config:
            raise ValueError("Configuration not loaded")
        return self.config
