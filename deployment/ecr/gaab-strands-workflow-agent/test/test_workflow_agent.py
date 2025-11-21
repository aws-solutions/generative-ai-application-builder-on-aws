# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

"""
Unit tests for WorkflowAgent class.

Tests cover:
- Initialization and configuration loading
- Configuration validation (use case type, workflow type)
- Specialized agent loading
- Client agent creation
- Error handling
"""

import os
import sys
from unittest.mock import Mock, patch

import pytest

# Add src to path for imports
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "src"))

from workflow_agent import WorkflowAgent


class TestWorkflowAgentInitialization:
    """Test WorkflowAgent initialization"""

    @patch("agents_loader.ToolsManager")
    @patch("workflow_agent.Agent")
    @patch("gaab_strands_common.base_agent.BedrockModel")
    @patch("gaab_strands_common.wrap_tool_with_events")
    @patch("workflow_agent.AgentsLoader")
    @patch("workflow_agent.DynamoDBHelper")
    def test_successful_initialization(
        self,
        mock_ddb_helper_class,
        mock_agents_loader_class,
        mock_wrap,
        mock_bedrock_model,
        mock_agent,
        mock_tools_manager,
        sample_workflow_config_dict,
    ):
        """Test successful workflow agent initialization"""
        # Setup mock DynamoDB helper
        mock_ddb_helper = Mock()
        mock_ddb_helper_class.return_value = mock_ddb_helper
        mock_ddb_helper.get_config.return_value = sample_workflow_config_dict

        # Setup mock agents loader
        mock_agents_loader = Mock()
        mock_specialized_agent = Mock()
        mock_specialized_agent.name = "SpecializedAgent"
        mock_agents_loader.load_agents.return_value = [mock_specialized_agent]
        mock_agents_loader_class.return_value = mock_agents_loader

        # Setup mocks - BedrockModel needs model_id attribute
        mock_model = Mock()
        mock_model.model_id = "amazon.nova-pro-v1:0"
        mock_bedrock_model.return_value = mock_model

        mock_client_agent = Mock()
        mock_client_agent.name = "Test Workflow"
        mock_agent.return_value = mock_client_agent

        mock_wrap.return_value = mock_specialized_agent

        # Create workflow agent
        workflow_agent = WorkflowAgent(
            table_name="test-table", config_key="test-key", region="us-east-1"
        )

        # Verify initialization
        assert workflow_agent.config is not None
        assert workflow_agent.workflow_config is not None
        assert workflow_agent.client_agent is not None
        assert len(workflow_agent.specialized_agents) == 1
        assert workflow_agent.config.use_case_name == "Test Workflow"

    @patch("workflow_agent.DynamoDBHelper")
    def test_initialization_with_invalid_use_case_type(self, mock_ddb_helper_class):
        """Test initialization fails with invalid use case type"""
        mock_ddb_helper = Mock()
        mock_ddb_helper_class.return_value = mock_ddb_helper

        mock_config_dict = {
            "UseCaseName": "Test Workflow",
            "UseCaseType": "Chat",
            "LlmParams": {
                "ModelProvider": "Bedrock",
                "Temperature": 0.7,
                "Streaming": True,
                "Verbose": False,
                "BedrockLlmParams": {
                    "ModelId": "amazon.nova-pro-v1:0",
                    "BedrockInferenceType": "QUICK_START",
                },
                "ModelParams": {},
            },
        }
        mock_ddb_helper.get_config.return_value = mock_config_dict

        with pytest.raises(ValueError, match="Expected Workflow, got Chat"):
            WorkflowAgent(table_name="test-table", config_key="test-key", region="us-east-1")

    @patch("workflow_agent.AgentsLoader")
    @patch("workflow_agent.DynamoDBHelper")
    def test_initialization_with_unsupported_workflow_type(
        self, mock_ddb_helper_class, mock_agents_loader_class, sample_workflow_config_dict
    ):
        """Test initialization fails with unsupported workflow type"""
        mock_ddb_helper = Mock()
        mock_ddb_helper_class.return_value = mock_ddb_helper

        config_dict = sample_workflow_config_dict.copy()
        config_dict["WorkflowParams"]["OrchestrationPattern"] = "UnsupportedType"
        mock_ddb_helper.get_config.return_value = config_dict

        with pytest.raises(ValueError, match="Unsupported workflow type"):
            WorkflowAgent(table_name="test-table", config_key="test-key", region="us-east-1")

    @patch("workflow_agent.DynamoDBHelper")
    def test_initialization_missing_workflow_config(self, mock_ddb_helper_class):
        """Test initialization fails when WorkflowParams is missing"""
        mock_ddb_helper = Mock()
        mock_ddb_helper_class.return_value = mock_ddb_helper

        mock_config_dict = {
            "UseCaseName": "Test Workflow",
            "UseCaseType": "Workflow",
            "LlmParams": {
                "ModelProvider": "Bedrock",
                "Temperature": 0.7,
                "Streaming": True,
                "Verbose": False,
                "BedrockLlmParams": {
                    "ModelId": "amazon.nova-pro-v1:0",
                    "BedrockInferenceType": "QUICK_START",
                },
                "ModelParams": {},
            },
        }
        mock_ddb_helper.get_config.return_value = mock_config_dict

        with pytest.raises(ValueError, match="No WorkflowParams found"):
            WorkflowAgent(table_name="test-table", config_key="test-key", region="us-east-1")


class TestWorkflowAgentConfigurationValidation:
    """Test configuration validation"""

    @patch("agents_loader.ToolsManager")
    @patch("workflow_agent.Agent")
    @patch("gaab_strands_common.base_agent.BedrockModel")
    @patch("gaab_strands_common.wrap_tool_with_events")
    @patch("workflow_agent.AgentsLoader")
    @patch("workflow_agent.DynamoDBHelper")
    def test_validates_agents_as_tools_workflow_type(
        self,
        mock_ddb_helper_class,
        mock_agents_loader_class,
        mock_wrap,
        mock_bedrock_model,
        mock_agent,
        mock_tools_manager,
        sample_workflow_config_dict,
    ):
        """Test that agents-as-tools workflow type is validated"""
        mock_ddb_helper = Mock()
        mock_ddb_helper_class.return_value = mock_ddb_helper
        mock_ddb_helper.get_config.return_value = sample_workflow_config_dict

        mock_agents_loader = Mock()
        mock_agents_loader.load_agents.return_value = [Mock()]
        mock_agents_loader_class.return_value = mock_agents_loader

        mock_wrap.return_value = Mock()

        workflow_agent = WorkflowAgent(
            table_name="test-table", config_key="test-key", region="us-east-1"
        )

        assert workflow_agent.workflow_config.workflow_type == "agents-as-tools"


class TestWorkflowAgentGracefulFailures:
    """Test graceful handling of partial failures"""

    @patch("agents_loader.ToolsManager")
    @patch("workflow_agent.AgentsLoader")
    @patch("workflow_agent.DynamoDBHelper")
    def test_all_agents_fail_to_load(
        self,
        mock_ddb_helper_class,
        mock_agents_loader_class,
        mock_tools_manager,
        sample_workflow_config_dict,
    ):
        """Test that initialization fails when all agents fail to load"""
        mock_ddb_helper = Mock()
        mock_ddb_helper_class.return_value = mock_ddb_helper
        mock_ddb_helper.get_config.return_value = sample_workflow_config_dict

        mock_agents_loader = Mock()
        mock_agents_loader.load_agents.side_effect = RuntimeError(
            "All specialized agents failed to load"
        )
        mock_agents_loader_class.return_value = mock_agents_loader

        with pytest.raises(RuntimeError, match="All specialized agents failed to load"):
            WorkflowAgent(table_name="test-table", config_key="test-key", region="us-east-1")


class TestWorkflowAgentGetters:
    """Test getter methods"""

    @patch("agents_loader.ToolsManager")
    @patch("workflow_agent.Agent")
    @patch("gaab_strands_common.base_agent.BedrockModel")
    @patch("gaab_strands_common.wrap_tool_with_events")
    @patch("workflow_agent.AgentsLoader")
    @patch("workflow_agent.DynamoDBHelper")
    def test_get_agent(
        self,
        mock_ddb_helper_class,
        mock_agents_loader_class,
        mock_wrap,
        mock_bedrock_model,
        mock_agent,
        mock_tools_manager,
        sample_workflow_config_dict,
    ):
        """Test get_agent returns client agent"""
        mock_ddb_helper = Mock()
        mock_ddb_helper_class.return_value = mock_ddb_helper
        mock_ddb_helper.get_config.return_value = sample_workflow_config_dict

        mock_agents_loader = Mock()
        mock_agents_loader.load_agents.return_value = [Mock()]
        mock_agents_loader_class.return_value = mock_agents_loader

        mock_client_agent = Mock()
        mock_client_agent.name = "Test Workflow"
        mock_agent.return_value = mock_client_agent
        mock_wrap.return_value = Mock()

        # Mock BedrockModel
        mock_model = Mock()
        mock_model.model_id = "amazon.nova-pro-v1:0"
        mock_bedrock_model.return_value = mock_model

        workflow_agent = WorkflowAgent(
            table_name="test-table", config_key="test-key", region="us-east-1"
        )

        agent = workflow_agent.get_agent()
        assert agent == mock_client_agent

    @patch("agents_loader.ToolsManager")
    @patch("workflow_agent.Agent")
    @patch("gaab_strands_common.base_agent.BedrockModel")
    @patch("gaab_strands_common.wrap_tool_with_events")
    @patch("workflow_agent.AgentsLoader")
    @patch("workflow_agent.DynamoDBHelper")
    def test_get_agent_count(
        self,
        mock_ddb_helper_class,
        mock_agents_loader_class,
        mock_wrap,
        mock_bedrock_model,
        mock_agent,
        mock_tools_manager,
        sample_workflow_config_dict,
    ):
        """Test get_agent_count returns correct count"""
        mock_ddb_helper = Mock()
        mock_ddb_helper_class.return_value = mock_ddb_helper

        config_dict = sample_workflow_config_dict.copy()
        config_dict["WorkflowParams"]["AgentsAsToolsParams"] = {
            "Agents": [
                {
                    "UseCaseId": "test-agent-id",
                    "UseCaseType": "AgentBuilder",
                    "UseCaseName": "Agent1",
                    "AgentBuilderParams": {
                        "SystemPrompt": "Agent 1",
                        "Tools": [],
                        "MCPServers": [],
                    },
                },
                {
                    "UseCaseId": "test-agent-id",
                    "UseCaseType": "AgentBuilder",
                    "UseCaseName": "Agent2",
                    "AgentBuilderParams": {
                        "SystemPrompt": "Agent 2",
                        "Tools": [],
                        "MCPServers": [],
                    },
                },
                {
                    "UseCaseId": "test-agent-id",
                    "UseCaseType": "AgentBuilder",
                    "UseCaseName": "Agent3",
                    "AgentBuilderParams": {
                        "SystemPrompt": "Agent 3",
                        "Tools": [],
                        "MCPServers": [],
                    },
                },
            ]
        }
        mock_ddb_helper.get_config.return_value = config_dict

        mock_agents_loader = Mock()
        mock_agents_loader.load_agents.return_value = [Mock(), Mock(), Mock()]
        mock_agents_loader_class.return_value = mock_agents_loader

        mock_wrap.side_effect = lambda x: x

        workflow_agent = WorkflowAgent(
            table_name="test-table", config_key="test-key", region="us-east-1"
        )

        assert workflow_agent.get_agent_count() == 3


class TestWorkflowAgentCustomTools:
    """Test custom tools functionality at workflow level"""

    @patch("agents_loader.ToolsManager")
    @patch("workflow_agent.Agent")
    @patch("gaab_strands_common.base_agent.BedrockModel")
    @patch("gaab_strands_common.wrap_tool_with_events")
    @patch("workflow_agent.AgentsLoader")
    @patch("workflow_agent.DynamoDBHelper")
    @patch("workflow_agent.ToolsManager")
    def test_load_workflow_custom_tools(
        self,
        mock_workflow_tools_manager_class,
        mock_ddb_helper_class,
        mock_agents_loader_class,
        mock_wrap,
        mock_bedrock_model,
        mock_agent,
        mock_agent_tools_manager,
        sample_workflow_config_dict,
    ):
        """Test loading custom tools at workflow level"""
        mock_ddb_helper = Mock()
        mock_ddb_helper_class.return_value = mock_ddb_helper

        config_with_custom_tools = sample_workflow_config_dict.copy()
        config_with_custom_tools["WorkflowParams"]["CustomTools"] = [
            {"ToolId": "workflow_calculator"},
            {"ToolId": "workflow_formatter"},
        ]
        mock_ddb_helper.get_config.return_value = config_with_custom_tools

        mock_agents_loader = Mock()
        mock_specialized_agent = Mock()
        mock_specialized_agent.name = "SpecializedAgent"
        mock_agents_loader.load_agents.return_value = [mock_specialized_agent]
        mock_agents_loader_class.return_value = mock_agents_loader

        mock_model = Mock()
        mock_model.model_id = "amazon.nova-pro-v1:0"
        mock_bedrock_model.return_value = mock_model

        mock_client_agent = Mock()
        mock_client_agent.name = "Test Workflow"
        mock_agent.return_value = mock_client_agent

        mock_wrap.return_value = mock_specialized_agent

        mock_workflow_tools_manager = Mock()
        mock_custom_tool_1 = Mock()
        mock_custom_tool_2 = Mock()
        mock_workflow_tools_manager.load_all_tools.return_value = [
            mock_custom_tool_1,
            mock_custom_tool_2,
        ]
        mock_workflow_tools_manager_class.return_value = mock_workflow_tools_manager

        workflow_agent = WorkflowAgent(
            table_name="test-table", config_key="test-key", region="us-east-1"
        )

        mock_workflow_tools_manager_class.assert_called()
        mock_workflow_tools_manager.load_all_tools.assert_called_with(
            mcp_servers=[],
            strands_tool_ids=[],
            custom_tool_ids=["workflow_calculator", "workflow_formatter"],
        )

        mock_agent.assert_called_once()
        call_args = mock_agent.call_args[1]
        # Should have 1 agent tool + 2 custom tools = 3 total tools
        assert len(call_args["tools"]) == 3

    @patch("agents_loader.ToolsManager")
    @patch("workflow_agent.Agent")
    @patch("gaab_strands_common.base_agent.BedrockModel")
    @patch("gaab_strands_common.wrap_tool_with_events")
    @patch("workflow_agent.AgentsLoader")
    @patch("workflow_agent.DynamoDBHelper")
    @patch("workflow_agent.ToolsManager")
    def test_load_workflow_no_custom_tools(
        self,
        mock_workflow_tools_manager_class,
        mock_ddb_helper_class,
        mock_agents_loader_class,
        mock_wrap,
        mock_bedrock_model,
        mock_agent,
        mock_agent_tools_manager,
        sample_workflow_config_dict,
    ):
        """Test workflow with no custom tools configured - ToolsManager should still be called"""
        # Setup mocks
        mock_ddb_helper = Mock()
        mock_ddb_helper_class.return_value = mock_ddb_helper
        mock_ddb_helper.get_config.return_value = sample_workflow_config_dict

        mock_agents_loader = Mock()
        mock_specialized_agent = Mock()
        mock_specialized_agent.name = "SpecializedAgent"
        mock_agents_loader.load_agents.return_value = [mock_specialized_agent]
        mock_agents_loader_class.return_value = mock_agents_loader

        mock_model = Mock()
        mock_model.model_id = "amazon.nova-pro-v1:0"
        mock_bedrock_model.return_value = mock_model

        mock_client_agent = Mock()
        mock_client_agent.name = "Test Workflow"
        mock_agent.return_value = mock_client_agent

        mock_wrap.return_value = mock_specialized_agent

        # Setup workflow-level tools manager - should return empty list (no custom tools, no auto-attach)
        mock_workflow_tools_manager = Mock()
        mock_workflow_tools_manager.load_all_tools.return_value = []
        mock_workflow_tools_manager_class.return_value = mock_workflow_tools_manager

        workflow_agent = WorkflowAgent(
            table_name="test-table", config_key="test-key", region="us-east-1"
        )

        mock_workflow_tools_manager_class.assert_called_with("us-east-1", workflow_agent.config)
        mock_workflow_tools_manager.load_all_tools.assert_called_with(
            mcp_servers=[],
            strands_tool_ids=[],
            custom_tool_ids=[],  # Empty because no custom tools configured
        )

        mock_agent.assert_called_once()
        call_args = mock_agent.call_args[1]
        # Should have 1 agent tool only (no custom tools were loaded)
        assert len(call_args["tools"]) == 1

    @patch("agents_loader.ToolsManager")
    @patch("workflow_agent.Agent")
    @patch("gaab_strands_common.base_agent.BedrockModel")
    @patch("gaab_strands_common.wrap_tool_with_events")
    @patch("workflow_agent.AgentsLoader")
    @patch("workflow_agent.DynamoDBHelper")
    @patch("workflow_agent.ToolsManager")
    def test_multimodal_auto_attachment(
        self,
        mock_workflow_tools_manager_class,
        mock_ddb_helper_class,
        mock_agents_loader_class,
        mock_wrap,
        mock_bedrock_model,
        mock_agent,
        mock_agent_tools_manager,
        sample_workflow_config_dict,
    ):
        """Test that multimodal tools are auto-attached when multimodal is enabled"""
        mock_ddb_helper = Mock()
        mock_ddb_helper_class.return_value = mock_ddb_helper

        config_with_multimodal = sample_workflow_config_dict.copy()
        config_with_multimodal["LlmParams"]["MultimodalParams"] = {"MultimodalEnabled": True}
        mock_ddb_helper.get_config.return_value = config_with_multimodal

        mock_agents_loader = Mock()
        mock_specialized_agent = Mock()
        mock_specialized_agent.name = "SpecializedAgent"
        mock_agents_loader.load_agents.return_value = [mock_specialized_agent]
        mock_agents_loader_class.return_value = mock_agents_loader

        mock_model = Mock()
        mock_model.model_id = "amazon.nova-pro-v1:0"
        mock_bedrock_model.return_value = mock_model

        mock_client_agent = Mock()
        mock_client_agent.name = "Test Workflow"
        mock_agent.return_value = mock_client_agent

        mock_wrap.return_value = mock_specialized_agent

        mock_workflow_tools_manager = Mock()
        mock_auto_attached_tool = Mock()  # This would be the S3FileReaderTool
        mock_workflow_tools_manager.load_all_tools.return_value = [mock_auto_attached_tool]
        mock_workflow_tools_manager_class.return_value = mock_workflow_tools_manager

        workflow_agent = WorkflowAgent(
            table_name="test-table", config_key="test-key", region="us-east-1"
        )

        assert workflow_agent.config.llm_params.multimodal_params is not None
        assert workflow_agent.config.llm_params.multimodal_params.multimodal_enabled is True

        mock_workflow_tools_manager_class.assert_called_with("us-east-1", workflow_agent.config)
        mock_workflow_tools_manager.load_all_tools.assert_called_with(
            mcp_servers=[],
            strands_tool_ids=[],
            custom_tool_ids=[],  # No explicit custom tools, but auto-attachment should work
        )

        mock_agent.assert_called_once()
        call_args = mock_agent.call_args[1]
        # Should have 1 agent tool + 1 auto-attached tool = 2 total tools
        assert len(call_args["tools"]) == 2

    @patch("agents_loader.ToolsManager")
    @patch("workflow_agent.Agent")
    @patch("gaab_strands_common.base_agent.BedrockModel")
    @patch("gaab_strands_common.wrap_tool_with_events")
    @patch("workflow_agent.AgentsLoader")
    @patch("workflow_agent.DynamoDBHelper")
    @patch("workflow_agent.ToolsManager")
    def test_comprehensive_multimodal_workflow_with_custom_tools_and_multiple_agents(
        self,
        mock_workflow_tools_manager_class,
        mock_ddb_helper_class,
        mock_agents_loader_class,
        mock_wrap,
        mock_bedrock_model,
        mock_agent,
        mock_agent_tools_manager,
        multimodal_custom_tools_config,
    ):
        """Test comprehensive workflow: multimodal enabled, 1 custom tool, 2 agents"""
        mock_ddb_helper = Mock()
        mock_ddb_helper_class.return_value = mock_ddb_helper
        mock_ddb_helper.get_config.return_value = multimodal_custom_tools_config

        # Setup agents loader with 2 agents
        mock_agents_loader = Mock()
        mock_agent_1 = Mock()
        mock_agent_1.name = "DataAnalysisAgent"
        mock_agent_2 = Mock()
        mock_agent_2.name = "ReportGeneratorAgent"
        mock_agents_loader.load_agents.return_value = [mock_agent_1, mock_agent_2]
        mock_agents_loader_class.return_value = mock_agents_loader

        mock_model = Mock()
        mock_model.model_id = "amazon.nova-pro-v1:0"
        mock_bedrock_model.return_value = mock_model

        mock_client_agent = Mock()
        mock_client_agent.name = "Comprehensive Workflow"
        mock_agent.return_value = mock_client_agent

        # Mock wrap_tool_with_events to return the agents as tools
        mock_wrap.side_effect = lambda x: x

        # Setup workflow-level tools manager - should load 1 custom tool + 1 auto-attached multimodal tool
        mock_workflow_tools_manager = Mock()
        mock_custom_tool = Mock()  # workflow_orchestrator
        mock_custom_tool.name = "workflow_orchestrator"
        mock_auto_attached_tool = Mock()  # S3FileReaderTool (auto-attached due to multimodal)
        mock_auto_attached_tool.name = "s3_file_reader"
        mock_workflow_tools_manager.load_all_tools.return_value = [
            mock_custom_tool,
            mock_auto_attached_tool,
        ]
        mock_workflow_tools_manager_class.return_value = mock_workflow_tools_manager

        # Create workflow agent
        workflow_agent = WorkflowAgent(
            table_name="test-table", config_key="test-key", region="us-east-1"
        )

        assert workflow_agent.config.llm_params.multimodal_params is not None
        assert workflow_agent.config.llm_params.multimodal_params.multimodal_enabled is True

        # Verify 2 agents were loaded
        assert workflow_agent.get_agent_count() == 2
        mock_agents_loader.load_agents.assert_called_once()
        loaded_agent_refs = mock_agents_loader.load_agents.call_args[0][0]
        assert len(loaded_agent_refs) == 2
        assert loaded_agent_refs[0].use_case_name == "DataAnalysisAgent"
        assert loaded_agent_refs[1].use_case_name == "ReportGeneratorAgent"

        # Verify workflow-level ToolsManager was called for custom tools + auto-attachment
        mock_workflow_tools_manager_class.assert_called_with("us-east-1", workflow_agent.config)
        mock_workflow_tools_manager.load_all_tools.assert_called_with(
            mcp_servers=[],
            strands_tool_ids=[],
            custom_tool_ids=["workflow_orchestrator"],  # 1 workflow-level custom tool
        )

        # Verify client agent was created with correct number of tools
        mock_agent.assert_called_once()
        call_args = mock_agent.call_args[1]
        # Should have:
        # - 2 agent tools (DataAnalysisAgent + ReportGeneratorAgent)
        # - 2 workflow-level tools (1 custom tool + 1 auto-attached multimodal tool)
        # Total: 4 tools
        tools = call_args["tools"]
        assert len(tools) == 4

        assert call_args["name"] == "Comprehensive Workflow"
        assert call_args["system_prompt"] == "You are a comprehensive workflow coordinator"
        assert call_args["model"] == mock_model

        # Verify that the correct tool IDs were requested from ToolsManager
        # This verifies the workflow-level custom tools were loaded
        tools_manager_call = mock_workflow_tools_manager.load_all_tools.call_args[1]
        assert tools_manager_call["custom_tool_ids"] == ["workflow_orchestrator"]
        assert tools_manager_call["mcp_servers"] == []
        assert tools_manager_call["strands_tool_ids"] == []


class TestWorkflowAgentFileHandling:
    """Test file/content block handling in workflow agents"""

    @patch("agents_loader.ToolsManager")
    @patch("workflow_agent.Agent")
    @patch("gaab_strands_common.base_agent.BedrockModel")
    @patch("gaab_strands_common.wrap_tool_with_events")
    @patch("workflow_agent.AgentsLoader")
    @patch("workflow_agent.DynamoDBHelper")
    @patch("workflow_agent.ToolsManager")
    def test_workflow_agent_with_multimodal_file_processing(
        self,
        mock_workflow_tools_manager_class,
        mock_ddb_helper_class,
        mock_agents_loader_class,
        mock_wrap,
        mock_bedrock_model,
        mock_agent,
        mock_agent_tools_manager,
        sample_workflow_config_dict,
    ):
        """Test workflow agent handles multimodal requests with files and content blocks"""
        mock_ddb_helper = Mock()
        mock_ddb_helper_class.return_value = mock_ddb_helper

        # Enable multimodal in the workflow config
        config_with_multimodal = sample_workflow_config_dict.copy()
        config_with_multimodal["LlmParams"]["MultimodalParams"] = {"MultimodalEnabled": True}
        mock_ddb_helper.get_config.return_value = config_with_multimodal

        # Setup agents loader
        mock_agents_loader = Mock()
        mock_specialized_agent = Mock()
        mock_specialized_agent.name = "SpecializedAgent1"
        mock_agents_loader.load_agents.return_value = [mock_specialized_agent]
        mock_agents_loader_class.return_value = mock_agents_loader

        mock_model = Mock()
        mock_model.model_id = "amazon.nova-pro-v1:0"
        mock_bedrock_model.return_value = mock_model

        mock_client_agent = Mock()
        mock_client_agent.name = "Test Workflow"
        mock_agent.return_value = mock_client_agent

        mock_wrap.side_effect = lambda x: x

        # Setup workflow-level tools manager for auto-attachment
        mock_workflow_tools_manager = Mock()
        mock_s3_tool = Mock()
        mock_s3_tool.name = "s3_file_reader"
        mock_workflow_tools_manager.load_all_tools.return_value = [mock_s3_tool]
        mock_workflow_tools_manager_class.return_value = mock_workflow_tools_manager

        # Create workflow agent
        workflow_agent = WorkflowAgent(
            table_name="test-table", config_key="test-key", region="us-east-1"
        )

        assert workflow_agent.config.llm_params.multimodal_params is not None
        assert workflow_agent.config.llm_params.multimodal_params.multimodal_enabled is True

        # Verify S3FileReaderTool was auto-attached for file handling
        mock_workflow_tools_manager_class.assert_called_with("us-east-1", workflow_agent.config)
        mock_workflow_tools_manager.load_all_tools.assert_called_with(
            mcp_servers=[],
            strands_tool_ids=[],
            custom_tool_ids=[],  # No explicit custom tools, but auto-attachment should work
        )

        # Verify the workflow agent can handle file-based requests
        # The S3FileReaderTool should be available for processing file content blocks
        mock_agent.assert_called_once()
        call_args = mock_agent.call_args[1]
        tools = call_args["tools"]

        # Should have agent tools + auto-attached S3 tool for file handling
        assert len(tools) >= 2  # At least 1 agent tool + 1 S3 tool
        assert mock_s3_tool in tools  # S3FileReaderTool for file processing


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
