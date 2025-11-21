# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

"""
AgentsLoader - Loads and instantiates specialized agents for workflow orchestration

This module handles loading specialized agents from configuration, including:
- Fetching agent configurations from DynamoDB
- Loading MCP server tools for each agent
- Creating agent models with appropriate fallbacks
- Graceful error handling for partial agent loading failures
"""

import logging
from typing import Any, Dict, List, Optional

from gaab_strands_common import BaseAgent, DynamoDBHelper, ToolsManager
from gaab_strands_common.models import (
    AgentBuilderParams,
    AgentReference,
    CustomToolReference,
    LlmParams,
    MCPServerReference,
    StrandsToolReference,
    UseCaseConfig,
)
from strands import Agent
from strands.models import BedrockModel

logger = logging.getLogger(__name__)


class AgentsLoader(BaseAgent):
    """
    Loads specialized agents from configuration.

    This class handles the complex process of loading specialized agents for
    workflow orchestration, including:
    - Fetching full agent configurations from DynamoDB when agent IDs are provided
    - Loading MCP server tools for each agent
    - Creating appropriate Bedrock models for each agent
    - Graceful error handling that allows partial agent loading
    """

    def __init__(self, ddb_helper: DynamoDBHelper, region: str):
        """
        Initialize AgentsLoader.

        Args:
            ddb_helper: DynamoDB helper for fetching configurations
            region: AWS region for Bedrock and other services
        """
        super().__init__(region)
        self.ddb_helper = ddb_helper
        logger.info(f"Initialized AgentsLoader for region: {region}")

    def load_agents(self, agent_references: List[AgentReference]) -> List[Agent]:
        """
        Load all specialized agents with graceful error handling.

        This method attempts to load all specified agents but continues even if
        some agents fail to load. It only raises an error if ALL agents fail.

        Args:
            agent_references: List of agent references with embedded AgentParams

        Returns:
            List of successfully loaded Agent instances

        Raises:
            RuntimeError: If all specialized agents failed to load

        Note:
            Partial failures are logged as warnings but don't stop processing.
            The workflow can continue with whatever agents successfully loaded.
        """
        if not agent_references:
            logger.warning("No specialized agents configured")
            return []

        logger.info(
            f"Loading {len(agent_references)} specialized agent(s) from embedded AgentParams "
            "(no DynamoDB lookup required)"
        )

        agents = []
        failed_agents = []

        for idx, agent_ref in enumerate(agent_references):
            try:
                agent = self._load_single_agent(agent_ref, idx)
                if agent:
                    agents.append(agent)
                    logger.info(f"Successfully loaded agent #{idx + 1}")
            except Exception as e:
                logger.error(f"Failed to load agent #{idx + 1}: {e}", exc_info=True)
                failed_agents.append(f"agent-{idx + 1}")

        # Only fail if ALL agents failed to load
        if not agents and failed_agents:
            raise RuntimeError(f"All specialized agents failed to load: {failed_agents}")

        if failed_agents:
            logger.warning(
                f"Loaded {len(agents)} agent(s), {len(failed_agents)} failed: {failed_agents}"
            )
        else:
            logger.info(f"Successfully loaded all {len(agents)} specialized agent(s)")

        return agents

    def _load_single_agent(self, agent_ref: AgentReference, idx: int) -> Agent:
        """
        Load a single specialized agent from AgentReference.

        This method uses the full agent configuration from the workflow,
        including AgentBuilderParams and optional LlmParams.

        Args:
            agent_ref: Agent reference containing full agent configuration
            idx: Agent index for naming purposes

        Returns:
            Instantiated Agent object

        Raises:
            ValueError: If agent configuration is invalid
            Exception: If agent loading fails for any reason
        """
        agent_builder_params = agent_ref.agent_builder_params
        agent_name = agent_ref.use_case_name or f"SpecializedAgent-{idx + 1}"
        agent_description = agent_ref.use_case_description or f"Specialized agent: {agent_name}"

        logger.info(f"Loading agent: {agent_name} (type: {agent_ref.use_case_type})")
        logger.debug(f"System prompt: {agent_builder_params.system_prompt[:50]}...")

        # Load tools from Strands tools, MCP servers, and required custom tools
        strands_tools = agent_builder_params.tools
        mcp_servers = agent_builder_params.mcp_servers
        custom_tools = agent_builder_params.custom_tools

        logger.debug(f"Strands tools for {agent_name}: {[t.tool_id for t in strands_tools]}")
        logger.debug(f"MCP servers for {agent_name}: {[s.use_case_id for s in mcp_servers]}")
        logger.debug(f"Custom tools for {agent_name}: {[t.tool_id for t in custom_tools]}")

        agent_config = self._create_agent_use_case_config(agent_ref)
        tools = self._load_agent_tools(strands_tools, mcp_servers, custom_tools, agent_config)

        # Create model from LlmParams if available, otherwise use default
        if agent_ref.llm_params:
            logger.info(f"🔧 Agent '{agent_name}': Using custom LlmParams from AgentReference")
            llm_params = agent_ref.llm_params
            bedrock_params = llm_params.bedrock_llm_params

            logger.info(
                f"📊 Agent '{agent_name}' Model Configuration:\n"
                f"  - Model Provider: {llm_params.model_provider}\n"
                f"  - Inference Type: {bedrock_params.bedrock_inference_type}\n"
                f"  - Model Identifier: {bedrock_params.model_identifier}\n"
                f"  - Temperature: {llm_params.temperature}\n"
                f"  - Streaming: {llm_params.streaming}\n"
                f"  - Verbose: {llm_params.verbose}"
            )

            model = self._create_model(agent_ref.llm_params)
            logger.info(
                f"✅ Agent '{agent_name}': Model created successfully with {bedrock_params.model_identifier}"
            )
        else:
            logger.info(f"⚠️  Agent '{agent_name}': No LlmParams provided, using default model")
            model = self._create_default_model()
            logger.info(f"✅ Agent '{agent_name}': Default model created")

        logger.info(f"🚀 Creating agent '{agent_name}' with {len(tools)} tool(s)")

        return Agent(
            name=agent_name,
            description=agent_description,
            system_prompt=agent_builder_params.system_prompt,
            tools=tools,
            model=model,
        )

    def _load_agent_tools(
        self,
        strands_tools: List[StrandsToolReference],
        mcp_servers: List[MCPServerReference],
        custom_tools: List[CustomToolReference],
        agent_config: UseCaseConfig,
    ) -> List[Any]:
        """
        Load tools for a specialized agent from Strands tools, MCP servers, and custom tools.

        Args:
            strands_tools: List of Strands tool references (e.g., current_time, calculator)
            mcp_servers: List of MCP server references
            custom_tools: List of custom tool references for this specific agent
            agent_config: UseCaseConfig for this specific agent

        Returns:
            List of tool objects for the agent

        Note:
            Returns empty list if no tools are configured.
            Specialized agents within workflows can use Strands tools, custom tools and MCPs.
        """
        if not strands_tools and not mcp_servers and not custom_tools:
            logger.debug("No tools configured for specialized agent")
            return []

        # Convert MCPServerReference objects to dict format for ToolsManager
        mcp_servers_data = [
            {"use_case_id": server.use_case_id, "url": server.url, "type": server.type}
            for server in mcp_servers
        ]
        logger.debug(
            f"Loading tools from {len(mcp_servers_data)} MCP server(s): "
            f"{[s['use_case_id'] for s in mcp_servers_data]}"
        )
        strands_tool_ids = [tool.tool_id for tool in strands_tools]
        custom_tool_ids = [tool.tool_id for tool in custom_tools]

        logger.debug(f"Loading {len(strands_tool_ids)} Strands tool(s): {strands_tool_ids}")
        logger.debug(f"Loading {len(custom_tool_ids)} custom tool(s): {custom_tool_ids}")

        try:
            tools_manager = ToolsManager(self.region, agent_config)

            tools = tools_manager.load_all_tools(
                mcp_servers=mcp_servers_data,
                strands_tool_ids=strands_tool_ids,
                custom_tool_ids=custom_tool_ids,
            )
            logger.info(f"✅ Successfully loaded {len(tools)} tool(s)")
            return tools
        except Exception as e:
            logger.error(f"❌ Error loading tools: {e}", exc_info=True)
            # Return empty list to allow agent to be created without tools
            # Some agents may not need tools
            return []

    def _create_agent_use_case_config(self, agent_ref: AgentReference) -> UseCaseConfig:
        """
        Create a UseCaseConfig for an individual agent to enable proper auto-attachment.

        This creates a minimal UseCaseConfig that contains the agent's LlmParams
        so that auto-attachment conditions (like multimodal) work correctly.

        Args:
            agent_ref: Agent reference containing the agent's configuration

        Returns:
            UseCaseConfig for the individual agent
        """
        return UseCaseConfig(
            UseCaseName=agent_ref.use_case_name,
            UseCaseType=agent_ref.use_case_type,
            AgentBuilderParams=agent_ref.agent_builder_params,
            LlmParams=agent_ref.llm_params,
        )

    def _create_default_model(self) -> BedrockModel:
        """
        Create default Bedrock model when no configuration is available.

        This fallback ensures agents can be created even without full
        configuration, using sensible defaults.

        Returns:
            BedrockModel with default configuration
        """
        default_model_id = "amazon.nova-lite-v1:0"
        default_temperature = 0.7
        default_streaming = True

        logger.info(
            f"Creating default model: {default_model_id} "
            f"(temperature: {default_temperature}, streaming: {default_streaming})"
        )

        return BedrockModel(
            model_id=default_model_id,
            region_name=self.region,
            temperature=default_temperature,
            streaming=default_streaming,
        )
