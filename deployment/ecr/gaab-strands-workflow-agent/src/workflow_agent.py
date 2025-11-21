# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

"""
WorkflowAgent - Orchestrates specialized agents using agents-as-tools pattern

This module implements the workflow agent that coordinates multiple specialized
agents by treating them as tools for a client agent. This enables complex
multi-step workflows where the client agent can delegate tasks to specialized
agents based on the user's request.
"""

import logging
from typing import List, Optional

from agents_loader import AgentsLoader
from gaab_strands_common import BaseAgent, DynamoDBHelper, ToolsManager, wrap_tool_with_events
from gaab_strands_common.models import UseCaseConfig, WorkflowConfig
from strands import Agent
from strands.tools import tool
from strands.session import SessionManager

logger = logging.getLogger(__name__)


class WorkflowAgent(BaseAgent):
    """
    Workflow agent that orchestrates specialized agents.

    This class implements the agents-as-tools orchestration pattern where:
    1. Multiple specialized agents are loaded from configuration
    2. Each specialized agent is wrapped as a tool
    3. A client agent is created with these specialized agents as its tools
    4. The client agent coordinates workflow execution by delegating to specialists

    The workflow agent maintains compatibility with the existing message format
    and streaming behavior expected by the AgentCore Runtime and frontend UI.
    """

    def __init__(self, table_name: str, config_key: str, region: str, session_manager: SessionManager = None):
        """
        Initialize workflow agent.

        This constructor:
        1. Sets up DynamoDB helper for configuration loading
        2. Initializes base agent with region
        3. Loads workflow configuration from DynamoDB
        4. Validates configuration (use case type, orchestration pattern)
        5. Loads specialized agents
        6. Creates client agent with specialized agents as tools

        Args:
            table_name: DynamoDB table name for configurations
            config_key: Configuration key to load from DynamoDB
            region: AWS region for Bedrock and DynamoDB
            session_manager: Session manager for memory support

        Raises:
            ValueError: If configuration is invalid or missing required fields
            RuntimeError: If all specialized agents fail to load
        """
        super().__init__(region)

        self.table_name = table_name
        self.config_key = config_key
        self.ddb_helper = DynamoDBHelper(table_name, region)
        self.session_manager = session_manager

        # Workflow-specific attributes
        self.workflow_config: Optional[WorkflowConfig] = None
        self.client_agent: Optional[Agent] = None
        self.specialized_agents: List[Agent] = []

        logger.info(f"Initializing workflow agent: {config_key}")
        self._initialize()

    def _initialize(self):
        """
        Initialize workflow agent by loading configuration and creating agents.

        This method orchestrates the complete initialization process:
        1. Load workflow configuration from DynamoDB
        2. Validate use case type is "AgentBuilder"
        3. Validate workflow type is "AgentsAsTools"
        4. Load specialized agents from configuration
        5. Create client agent with specialized agents as tools

        Raises:
            ValueError: If configuration validation fails
            RuntimeError: If all specialized agents fail to load
        """
        logger.info("Starting workflow agent initialization")

        # Get UseCaseConfig (LlmParams, WorkflowParams, etc.) and WorkflowConfig (WorkflowType and WorkflowParams )
        self.config, self.workflow_config = self._load_workflow_config()

        # Validate orchestration pattern
        workflow_type = self.workflow_config.workflow_type
        if workflow_type != "agents-as-tools":
            raise ValueError(
                f"Unsupported workflow type: {workflow_type}. "
                f"Only 'agents-as-tools' is currently supported."
            )

        logger.info(f"Workflow type validated: {workflow_type}")

        # Load specialized agents
        self.specialized_agents = self._load_specialized_agents()

        # Create client agent
        self.client_agent = self._create_client_agent()

        logger.info(
            f"Workflow agent initialized successfully: {self.config.use_case_name} "
            f"with {len(self.specialized_agents)} specialized agent(s)"
        )

    def _load_workflow_config(self) -> tuple[UseCaseConfig, WorkflowConfig]:
        """
        Load workflow configuration from DynamoDB with validation.

        This method:
        1. Fetches configuration from DynamoDB using the config key
        2. Validates that UseCaseType is "WorkflowBuilder"
        3. Parses the configuration into UseCaseConfig and WorkflowConfig models
        4. Validates that workflow parameters are present

        Returns:
            Tuple of (UseCaseConfig, WorkflowConfig)

        Raises:
            ValueError: If configuration is invalid or missing required fields
        """
        logger.info(f"Loading workflow configuration for key: {self.config_key}")

        try:
            # Fetch configuration from DynamoDB
            config_dict = self.ddb_helper.get_config(self.config_key)

            # Validate use case type - Workflow is the expected type
            self._validate_use_case_type(config_dict, "Workflow")

            # Parse use case configuration
            use_case_config = UseCaseConfig.from_ddb_config(config_dict)

            # Extract and validate workflow parameters
            if not use_case_config.workflow_params:
                raise ValueError(
                    f"No WorkflowParams found in configuration for key: {self.config_key}"
                )

            if not use_case_config.workflow_params.orchestration_pattern:
                raise ValueError(
                    f"No OrchestrationPattern found in WorkflowParams for key: {self.config_key}"
                )

            # Create WorkflowConfig from the structure
            workflow_config = WorkflowConfig(
                WorkflowType=use_case_config.workflow_params.orchestration_pattern,
                WorkflowParams=use_case_config.workflow_params,
            )

            logger.info(
                f"Successfully loaded workflow configuration: {use_case_config.use_case_name}"
            )
            logger.debug(f"Workflow type: {workflow_config.workflow_type}")

            return use_case_config, workflow_config

        except ValueError:
            # Re-raise validation errors
            raise
        except Exception as e:
            logger.error(f"Error loading workflow configuration: {e}", exc_info=True)
            raise ValueError(f"Failed to load workflow configuration: {e}")

    def _load_specialized_agents(self) -> List[Agent]:
        """
        Load and instantiate specialized agents using AgentsLoader.

        This method:
        1. Extracts selected agents from workflow configuration
        2. Uses AgentsLoader to load each agent with its tools
        3. Handles partial failures gracefully (continues if some agents load)
        4. Logs detailed information about loaded agents

        Returns:
            List of successfully loaded Agent instances

        Raises:
            RuntimeError: If all specialized agents fail to load
            ValueError: If no agents are configured
        """
        logger.info("=" * 80)
        logger.info("Loading specialized agents for workflow")
        logger.info("=" * 80)

        # Extract agent references from workflow configuration
        agents_as_tools_params = self.workflow_config.workflow_params.agents_as_tools_params

        if not agents_as_tools_params or not agents_as_tools_params.agents:
            raise ValueError("No agents configured in AgentsAsToolsParams")

        agent_references = agents_as_tools_params.agents
        logger.info(f"Found {len(agent_references)} agent(s) in workflow configuration")

        # Log summary of each agent
        for idx, agent_ref in enumerate(agent_references, 1):
            has_llm_params = agent_ref.llm_params is not None
            llm_info = ""
            if has_llm_params:
                llm_info = (
                    f" with custom LLM ({agent_ref.llm_params.bedrock_llm_params.model_identifier})"
                )
            logger.info(f"  {idx}. {agent_ref.use_case_name}{llm_info}")

        # Use AgentsLoader to load all agents
        agents_loader = AgentsLoader(self.ddb_helper, self.region)

        try:
            agents = agents_loader.load_agents(agent_references)

            logger.info("=" * 80)
            logger.info(f"Successfully loaded {len(agents)} specialized agent(s)")
            for idx, agent in enumerate(agents, 1):
                logger.info(f"  {idx}. {agent.name}")
            logger.info("=" * 80)

            return agents

        except RuntimeError as e:
            # All agents failed to load
            logger.error(f"Failed to load specialized agents: {e}")
            raise

    def _create_agent_tool(self, agent: Agent):
        """
        Convert a specialized agent into a tool function.

        This creates a @tool decorated function that wraps the agent,
        making it callable as a tool by the client agent.

        Args:
            agent: The specialized Agent to convert to a tool

        Returns:
            A tool function that invokes the agent
        """
        agent_name = agent.name
        agent_description = agent.description
        # Create a valid tool name by replacing spaces and hyphens with underscores
        tool_name = "specialized_agent__" + agent_name.replace(" ", "_").replace("-", "_")

        @tool(name=tool_name, description=agent_description)
        def agent_tool_func(query: str) -> str:
            """
            Delegate a query to this specialized agent.

            Args:
                query: The query or task to delegate to this specialized agent

            Returns:
                The agent's response
            """
            try:
                logger.info(f"Invoking specialized agent: {agent_name}")
                response = agent(query)
                response_str = str(response)
                logger.info(f"Agent {agent_name} returned response ({len(response_str)} chars)")
                return response_str
            except Exception as e:
                logger.error(f"Error in specialized agent {agent_name}: {e}", exc_info=True)
                error_msg = f"Error in {agent_name}: {str(e)}"
                return error_msg

        return agent_tool_func

    def _create_client_agent(self) -> Agent:
        """
        Create client agent with specialized agents as tools.

        This method:
        1. Creates Bedrock model from LLM parameters
        2. Wraps specialized agents with event emission for UI tracking
        3. Creates client agent with:
           - System prompt from agent configuration
           - Specialized agents as tools
           - Configured LLM model
        4. Logs client agent configuration

        Returns:
            Configured Agent instance that orchestrates specialized agents

        Raises:
            ValueError: If client agent creation fails
        """
        logger.info("Creating client agent with specialized agents as tools")

        try:
            # Create model from LLM parameters
            model = self._create_model(self.config.llm_params)

            logger.info(
                f"Client agent model: {self.config.llm_params.bedrock_llm_params.model_identifier}, "
                f"temperature: {self.config.llm_params.temperature}, "
                f"streaming: {self.config.llm_params.streaming}"
            )

            # Convert specialized agents to tool functions
            logger.info("Converting specialized agents to tool functions")
            agent_tools = []
            for agent in self.specialized_agents:
                try:
                    # Create a tool function for this agent
                    agent_tool = self._create_agent_tool(agent)
                    # Wrap with event emission for UI tracking
                    wrapped_agent_tool = wrap_tool_with_events(agent_tool)
                    agent_tools.append(wrapped_agent_tool)
                    logger.debug(f"Created and wrapped tool function for agent: {agent.name}")
                except Exception as e:
                    logger.error(f"Failed to create tool for agent {agent.name}: {e}")
                    # Skip this agent if tool creation fails
                    continue

            # Load custom tools for the workflow
            custom_tools = self._load_workflow_custom_tools()
            all_tools = agent_tools + custom_tools

            # Get system prompt from workflow configuration
            system_prompt = self.config.workflow_params.system_prompt

            logger.info(
                f"Creating client agent '{self.config.use_case_name}' with "
                f"{len(agent_tools)} specialized agent(s) as tools and {len(custom_tools)} custom tool(s)"
            )
            logger.debug(f"System prompt length: {len(system_prompt)} characters")

            # Check if memory is enabled
            additional_params = {}
            if (
                self.config.workflow_params.memory_config
                and self.config.workflow_params.memory_config.long_term_enabled
                and self.session_manager
            ):
                logger.info("Long-term memory enabled - adding session manager to agent")
                additional_params["session_manager"] = self.session_manager
            else:
                logger.info("Long-term memory disabled or session manager not available")
                logger.info(f"Session manager exists: {self.session_manager is not None}")

            # Create client agent
            client_agent = Agent(
                name=self.config.use_case_name,
                system_prompt=system_prompt,
                tools=all_tools,
                model=model,
                **additional_params
            )

            logger.info(f"Client agent created successfully: {client_agent.name}")

            return client_agent

        except Exception as e:
            logger.error(f"Error creating client agent: {e}", exc_info=True)
            raise ValueError(f"Failed to create client agent: {e}")

    def _load_workflow_custom_tools(self) -> List:
        """
        Load custom tools for the workflow

        Custom tools at the workflow level are available to the workflow agents that orchestrate
        the specialized agents. These are different from agent-level custom tools.

        This method follows the same pattern as configurable_agent - it always creates a
        ToolsManager and calls load_all_tools, which handles auto-attachment internally.

        Returns:
            List of custom tool objects for the workflow agent
        """
        # Extract workflow-level custom tools (if any)
        custom_tools = []
        if (
            hasattr(self.config, "workflow_params")
            and self.config.workflow_params
            and self.config.workflow_params.custom_tools
        ):
            custom_tools = self.config.workflow_params.custom_tools

        custom_tool_ids = [tool.tool_id for tool in custom_tools]

        logger.info(
            f"Loading workflow-level tools: {len(custom_tool_ids)} custom tool(s) configured"
        )

        try:
            # Create a ToolsManager instance - this handles auto-attachment internally
            tools_manager = ToolsManager(self.region, self.config)

            # Always call load_all_tools - ToolsManager handles auto-attachment based on config
            tools = tools_manager.load_all_tools(
                mcp_servers=[],
                strands_tool_ids=[],
                custom_tool_ids=custom_tool_ids,
            )
            logger.info(f"Successfully loaded {len(tools)} workflow-level tool(s)")
            return tools
        except Exception as e:
            logger.error(f"Error loading workflow-level tools: {e}", exc_info=True)
            logger.warning("Workflow will continue without custom tools")
            return []

    def get_agent(self) -> Agent:
        """
        Get the client agent for workflow execution.

        Returns:
            The client agent that orchestrates specialized agents

        Raises:
            ValueError: If client agent not initialized
        """
        if not self.client_agent:
            raise ValueError("Client agent not initialized")
        return self.client_agent

    def get_workflow_config(self) -> WorkflowConfig:
        """
        Get the workflow configuration.

        Returns:
            WorkflowConfig instance

        Raises:
            ValueError: If workflow configuration not loaded
        """
        if not self.workflow_config:
            raise ValueError("Workflow configuration not loaded")
        return self.workflow_config

    def get_specialized_agents(self) -> List[Agent]:
        """
        Get the list of specialized agents.

        This is useful for debugging and monitoring.

        Returns:
            List of specialized Agent instances
        """
        return self.specialized_agents.copy()

    def get_agent_count(self) -> int:
        """
        Get the number of specialized agents loaded.

        Returns:
            Count of specialized agents
        """
        return len(self.specialized_agents)
