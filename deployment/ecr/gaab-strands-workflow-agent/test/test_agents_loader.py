# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

"""
Unit tests for AgentsLoader class.

Tests cover:
- Loading agents with various configurations
- Graceful handling of partial agent loading failures
- Optional field handling in SelectedAgent
- Tool loading from MCP servers
- Model creation with fallbacks
"""

import os
import sys
from unittest.mock import Mock, patch

import pytest

# Add src to path for imports
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "src"))

from agents_loader import AgentsLoader
from gaab_strands_common.models import (
    AgentBuilderParams,
    AgentReference,
    BedrockLlmParams,
    CustomToolReference,
    LlmParams,
    MCPServerReference,
    StrandsToolReference,
    UseCaseConfig,
)


class TestAgentsLoaderInitialization:
    """Test AgentsLoader initialization"""

    def test_initialization(self):
        """Test AgentsLoader initializes correctly"""
        mock_ddb_helper = Mock()

        loader = AgentsLoader(mock_ddb_helper, "us-east-1")

        assert loader.ddb_helper == mock_ddb_helper
        assert loader.region == "us-east-1"


class TestAgentsLoaderLoadAgents:
    """Test load_agents method"""

    @patch("agents_loader.Agent")
    @patch("agents_loader.BedrockModel")
    @patch("agents_loader.ToolsManager")
    def test_load_agents_success(
        self, mock_tools_manager_class, mock_bedrock_model, mock_agent_class
    ):
        """Test successful loading of all agents"""
        mock_ddb_helper = Mock()
        mock_tools_manager = Mock()
        mock_tools_manager_class.return_value = mock_tools_manager
        mock_tools_manager.load_all_tools.return_value = []

        loader = AgentsLoader(mock_ddb_helper, "us-east-1")

        agent_references = [
            AgentReference(
                UseCaseId="test-agent-id",
                UseCaseType="AgentBuilder",
                UseCaseName="Agent1",
                AgentBuilderParams=AgentBuilderParams(
                    SystemPrompt="Agent 1 prompt",
                    Tools=[],
                    MCPServers=[],
                ),
                LlmParams=LlmParams(
                    ModelProvider="Bedrock",
                    Temperature=0.7,
                    Streaming=True,
                    Verbose=False,
                    BedrockLlmParams=BedrockLlmParams(
                        ModelId="amazon.nova-lite-v1:0",
                        BedrockInferenceType="QUICK_START",
                    ),
                    ModelParams={},
                    RAGEnabled=False,
                ),
            ),
            AgentReference(
                UseCaseId="test-agent-id",
                UseCaseType="AgentBuilder",
                UseCaseName="Agent2",
                AgentBuilderParams=AgentBuilderParams(
                    SystemPrompt="Agent 2 prompt",
                    Tools=[],
                    MCPServers=[],
                ),
                LlmParams=LlmParams(
                    ModelProvider="Bedrock",
                    Temperature=0.7,
                    Streaming=True,
                    Verbose=False,
                    BedrockLlmParams=BedrockLlmParams(
                        ModelId="amazon.nova-lite-v1:0",
                        BedrockInferenceType="QUICK_START",
                    ),
                    ModelParams={},
                    RAGEnabled=False,
                ),
            ),
        ]

        mock_agent_1 = Mock()
        mock_agent_1.name = "Agent1"
        mock_agent_2 = Mock()
        mock_agent_2.name = "Agent2"
        mock_agent_class.side_effect = [mock_agent_1, mock_agent_2]

        # Mock BedrockModel for default model creation
        mock_model = Mock()
        mock_bedrock_model.return_value = mock_model

        agents = loader.load_agents(agent_references)

        assert len(agents) == 2
        assert agents[0] == mock_agent_1
        assert agents[1] == mock_agent_2

    @patch("agents_loader.Agent")
    @patch("agents_loader.BedrockModel")
    @patch("agents_loader.ToolsManager")
    def test_load_agents_partial_failure(
        self, mock_tools_manager_class, mock_bedrock_model, mock_agent_class
    ):
        """Test loading continues when some agents fail"""
        mock_ddb_helper = Mock()
        mock_tools_manager = Mock()
        mock_tools_manager_class.return_value = mock_tools_manager
        mock_tools_manager.load_all_tools.return_value = []

        loader = AgentsLoader(mock_ddb_helper, "us-east-1")

        agent_references = [
            AgentReference(
                UseCaseId="test-agent-id",
                UseCaseType="AgentBuilder",
                UseCaseName="Agent1",
                AgentBuilderParams=AgentBuilderParams(
                    SystemPrompt="Agent 1 prompt",
                    Tools=[],
                    MCPServers=[],
                ),
                LlmParams=LlmParams(
                    ModelProvider="Bedrock",
                    Temperature=0.7,
                    Streaming=True,
                    Verbose=False,
                    BedrockLlmParams=BedrockLlmParams(
                        ModelId="amazon.nova-lite-v1:0",
                        BedrockInferenceType="QUICK_START",
                    ),
                    ModelParams={},
                    RAGEnabled=False,
                ),
            ),
            AgentReference(
                UseCaseId="test-agent-id",
                UseCaseType="AgentBuilder",
                UseCaseName="Agent2",
                AgentBuilderParams=AgentBuilderParams(
                    SystemPrompt="Agent 2 prompt",
                    Tools=[],
                    MCPServers=[],
                ),
                LlmParams=LlmParams(
                    ModelProvider="Bedrock",
                    Temperature=0.7,
                    Streaming=True,
                    Verbose=False,
                    BedrockLlmParams=BedrockLlmParams(
                        ModelId="amazon.nova-lite-v1:0",
                        BedrockInferenceType="QUICK_START",
                    ),
                    ModelParams={},
                    RAGEnabled=False,
                ),
            ),
            AgentReference(
                UseCaseId="test-agent-id",
                UseCaseType="AgentBuilder",
                UseCaseName="Agent3",
                AgentBuilderParams=AgentBuilderParams(
                    SystemPrompt="Agent 3 prompt",
                    Tools=[],
                    MCPServers=[],
                ),
                LlmParams=LlmParams(
                    ModelProvider="Bedrock",
                    Temperature=0.7,
                    Streaming=True,
                    Verbose=False,
                    BedrockLlmParams=BedrockLlmParams(
                        ModelId="amazon.nova-lite-v1:0",
                        BedrockInferenceType="QUICK_START",
                    ),
                    ModelParams={},
                    RAGEnabled=False,
                ),
            ),
        ]

        mock_agent_1 = Mock()
        mock_agent_1.name = "Agent1"
        mock_agent_3 = Mock()
        mock_agent_3.name = "Agent3"

        # Agent 2 will fail during Agent construction
        agent_call_count = [0]

        def agent_side_effect(*args, **kwargs):
            agent_call_count[0] += 1
            if agent_call_count[0] == 1:
                return mock_agent_1
            elif agent_call_count[0] == 2:
                # Agent 2 fails during construction
                raise RuntimeError("Failed to create agent 2")
            else:
                return mock_agent_3

        mock_agent_class.side_effect = agent_side_effect

        # Mock BedrockModel for default model creation
        mock_model = Mock()
        mock_bedrock_model.return_value = mock_model

        agents = loader.load_agents(agent_references)

        assert len(agents) == 2
        assert agents[0] == mock_agent_1
        assert agents[1] == mock_agent_3

    @patch("agents_loader.ToolsManager")
    def test_load_agents_all_fail(self, mock_tools_manager_class):
        """Test loading fails when all agents fail"""
        mock_ddb_helper = Mock()
        mock_tools_manager = Mock()
        mock_tools_manager_class.return_value = mock_tools_manager

        loader = AgentsLoader(mock_ddb_helper, "us-east-1")

        agent_references = [
            AgentReference(
                UseCaseId="test-agent-id",
                UseCaseType="AgentBuilder",
                UseCaseName="Agent1",
                AgentBuilderParams=AgentBuilderParams(
                    SystemPrompt="Agent 1 prompt",
                    Tools=[],
                    MCPServers=[],
                ),
            ),
            AgentReference(
                UseCaseId="test-agent-id",
                UseCaseType="AgentBuilder",
                UseCaseName="Agent2",
                AgentBuilderParams=AgentBuilderParams(
                    SystemPrompt="Agent 2 prompt",
                    Tools=[],
                    MCPServers=[],
                ),
            ),
        ]

        with patch("agents_loader.Agent") as mock_agent_class:
            mock_agent_class.side_effect = RuntimeError("Agent loading failed")

            with pytest.raises(RuntimeError, match="All specialized agents failed to load"):
                loader.load_agents(agent_references)

    def test_load_agents_empty_list(self):
        """Test loading with empty agent list"""
        mock_ddb_helper = Mock()

        loader = AgentsLoader(mock_ddb_helper, "us-east-1")

        agents = loader.load_agents([])

        assert len(agents) == 0


class TestAgentsLoaderToolLoading:
    """Test tool loading from MCP servers"""

    @patch("agents_loader.ToolsManager")
    def test_load_agent_tools_with_mcp_servers(self, mock_tools_manager_class):
        """Test loading tools from MCP servers, Strands tools, and agent-level custom tools"""
        mock_ddb_helper = Mock()
        mock_tools_manager = Mock()
        mock_tools_manager_class.return_value = mock_tools_manager

        mock_tool_1 = Mock()
        mock_tool_2 = Mock()
        mock_tool_3 = Mock()
        mock_tools_manager.load_all_tools.return_value = [mock_tool_1, mock_tool_2, mock_tool_3]

        loader = AgentsLoader(mock_ddb_helper, "us-east-1")

        strands_tools = [StrandsToolReference(ToolId="current_time")]
        mcp_servers = [
            MCPServerReference(UseCaseId="mcp-1", Url="https://example.com/mcp1", Type="gateway"),
            MCPServerReference(UseCaseId="mcp-2", Url="https://example.com/mcp2", Type="runtime"),
        ]
        custom_tools = [CustomToolReference(ToolId="agent_custom_tool")]

        mock_agent_config = UseCaseConfig(
            UseCaseName="TestAgent",
            UseCaseType="AgentBuilder",
            LlmParams=LlmParams(
                ModelProvider="Bedrock",
                Temperature=0.7,
                Streaming=True,
                Verbose=False,
                BedrockLlmParams=BedrockLlmParams(
                    ModelId="amazon.nova-lite-v1:0", BedrockInferenceType="QUICK_START"
                ),
                ModelParams={},
                RAGEnabled=False,
            ),
        )

        tools = loader._load_agent_tools(
            strands_tools, mcp_servers, custom_tools, mock_agent_config
        )

        assert len(tools) == 3
        assert tools[0] == mock_tool_1
        assert tools[1] == mock_tool_2
        assert tools[2] == mock_tool_3

        mock_tools_manager_class.assert_called_once_with("us-east-1", mock_agent_config)

        # Verify load_all_tools was called with the new format
        mock_tools_manager.load_all_tools.assert_called_once()
        call_args = mock_tools_manager.load_all_tools.call_args
        assert call_args[1]["strands_tool_ids"] == ["current_time"]
        # Check mcp_servers parameter contains the correct structure
        mcp_servers_arg = call_args[1]["mcp_servers"]
        assert len(mcp_servers_arg) == 2
        assert mcp_servers_arg[0]["use_case_id"] == "mcp-1"
        assert mcp_servers_arg[1]["use_case_id"] == "mcp-2"

    @patch("agents_loader.ToolsManager")
    def test_load_agent_tools_with_custom_tools_only(self, mock_tools_manager_class):
        """Test loading only agent-level custom tools"""
        mock_ddb_helper = Mock()
        mock_tools_manager = Mock()
        mock_tools_manager_class.return_value = mock_tools_manager

        mock_custom_tool = Mock()
        mock_tools_manager.load_all_tools.return_value = [mock_custom_tool]

        loader = AgentsLoader(mock_ddb_helper, "us-east-1")

        strands_tools = []
        mcp_servers = []
        custom_tools = [
            CustomToolReference(ToolId="agent_calculator"),
            CustomToolReference(ToolId="agent_formatter"),
        ]

        mock_agent_config = UseCaseConfig(
            UseCaseName="TestAgent",
            UseCaseType="AgentBuilder",
            LlmParams=LlmParams(
                ModelProvider="Bedrock",
                Temperature=0.7,
                Streaming=True,
                Verbose=False,
                BedrockLlmParams=BedrockLlmParams(
                    ModelId="amazon.nova-lite-v1:0", BedrockInferenceType="QUICK_START"
                ),
                ModelParams={},
                RAGEnabled=False,
            ),
        )

        tools = loader._load_agent_tools(
            strands_tools, mcp_servers, custom_tools, mock_agent_config
        )

        assert len(tools) == 1
        assert tools[0] == mock_custom_tool

        mock_tools_manager_class.assert_called_once_with("us-east-1", mock_agent_config)
        mock_tools_manager.load_all_tools.assert_called_once()
        call_args = mock_tools_manager.load_all_tools.call_args
        assert call_args[1]["strands_tool_ids"] == []
        assert call_args[1]["custom_tool_ids"] == ["agent_calculator", "agent_formatter"]
        assert call_args[1]["mcp_servers"] == []

    @patch("agents_loader.ToolsManager")
    def test_load_agent_tools_empty_list(self, mock_tools_manager_class):
        """Test loading tools with empty lists"""
        mock_ddb_helper = Mock()
        mock_tools_manager = Mock()
        mock_tools_manager_class.return_value = mock_tools_manager

        loader = AgentsLoader(mock_ddb_helper, "us-east-1")

        mock_agent_config = UseCaseConfig(
            UseCaseName="TestAgent",
            UseCaseType="AgentBuilder",
            LlmParams=LlmParams(
                ModelProvider="Bedrock",
                Temperature=0.7,
                Streaming=True,
                Verbose=False,
                BedrockLlmParams=BedrockLlmParams(
                    ModelId="amazon.nova-lite-v1:0", BedrockInferenceType="QUICK_START"
                ),
                ModelParams={},
                RAGEnabled=False,
            ),
        )

        tools = loader._load_agent_tools([], [], [], mock_agent_config)

        assert len(tools) == 0
        mock_tools_manager.load_all_tools.assert_not_called()

    @patch("agents_loader.ToolsManager")
    def test_load_agent_tools_error_handling(self, mock_tools_manager_class):
        """Test graceful error handling when tool loading fails"""
        mock_ddb_helper = Mock()
        mock_tools_manager = Mock()
        mock_tools_manager_class.return_value = mock_tools_manager

        mock_tools_manager.load_all_tools.side_effect = RuntimeError("Tool loading failed")

        loader = AgentsLoader(mock_ddb_helper, "us-east-1")

        mcp_servers = [
            MCPServerReference(UseCaseId="mcp-1", Url="https://example.com/mcp", Type="gateway")
        ]
        strands_tools = [StrandsToolReference(ToolId="current_time")]
        custom_tools = [CustomToolReference(ToolId="agent_custom_tool")]

        # Create a mock agent config for testing
        mock_agent_config = UseCaseConfig(
            UseCaseName="TestAgent",
            UseCaseType="AgentBuilder",
            LlmParams=LlmParams(
                ModelProvider="Bedrock",
                Temperature=0.7,
                Streaming=True,
                Verbose=False,
                BedrockLlmParams=BedrockLlmParams(
                    ModelId="amazon.nova-lite-v1:0", BedrockInferenceType="QUICK_START"
                ),
                ModelParams={},
                RAGEnabled=False,
            ),
        )

        tools = loader._load_agent_tools(
            strands_tools, mcp_servers, custom_tools, mock_agent_config
        )

        assert len(tools) == 0


class TestAgentsLoaderModelCreation:
    """Test model creation with fallbacks"""

    @patch("agents_loader.BedrockModel")
    def test_create_default_model(self, mock_bedrock_model):
        """Test creating default model when no config available"""
        mock_ddb_helper = Mock()

        loader = AgentsLoader(mock_ddb_helper, "us-east-1")

        mock_model = Mock()
        mock_bedrock_model.return_value = mock_model

        model = loader._create_default_model()

        assert model == mock_model
        mock_bedrock_model.assert_called_once_with(
            model_id="amazon.nova-lite-v1:0",
            region_name="us-east-1",
            temperature=0.7,
            streaming=True,
        )


class TestAgentsLoaderConfigCreation:
    """Test agent config creation"""

    def test_create_agent_use_case_config(self):
        """Test creating UseCaseConfig from AgentReference"""
        mock_ddb_helper = Mock()
        loader = AgentsLoader(mock_ddb_helper, "us-east-1")

        mock_llm_params = LlmParams(
            ModelProvider="Bedrock",
            Temperature=0.8,
            Streaming=False,
            Verbose=True,
            BedrockLlmParams=BedrockLlmParams(
                ModelId="anthropic.claude-3-5-sonnet-20240620-v1:0",
                BedrockInferenceType="QUICK_START",
            ),
            ModelParams={},
            RAGEnabled=False,
        )

        mock_agent_builder_params = AgentBuilderParams(
            SystemPrompt="Test agent prompt",
            Tools=[],
            MCPServers=[],
        )

        agent_ref = AgentReference(
            UseCaseId="test-agent-id",
            UseCaseType="AgentBuilder",
            UseCaseName="TestAgent",
            AgentBuilderParams=mock_agent_builder_params,
            LlmParams=mock_llm_params,
        )

        result_config = loader._create_agent_use_case_config(agent_ref)

        assert isinstance(result_config, UseCaseConfig)
        assert result_config.use_case_name == "TestAgent"
        assert result_config.use_case_type == "AgentBuilder"
        assert result_config.agent_builder_params == mock_agent_builder_params
        assert result_config.llm_params == mock_llm_params


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
