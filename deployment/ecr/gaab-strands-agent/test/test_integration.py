# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

#!/usr/bin/env python3
"""
Integration tests for ConfigurableAgent with ToolsManager
Tests end-to-end flow from configuration to tool execution
"""

import os
import sys
import unittest
from unittest.mock import MagicMock, patch

# Add src directory to path for imports
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "src"))

from configurable_agent import ConfigurableAgent


class TestConfigurableAgentIntegration(unittest.TestCase):
    """Integration tests for ConfigurableAgent with all tool sources"""

    def setUp(self):
        """Set up test data for various scenarios"""
        # Base configuration
        self.base_config = {
            "UseCaseName": "Integration Test Agent",
            "UseCaseType": "AgentBuilder",
            "AgentBuilderParams": {
                "SystemPrompt": "You are a helpful assistant.",
                "MemoryConfig": {"LongTermEnabled": True},
            },
            "LlmParams": {
                "BedrockLlmParams": {
                    "ModelId": "amazon.nova-lite-v1:0",
                },
                "ModelProvider": "Bedrock",
                "Temperature": 0.7,
                "Streaming": True,
                "Verbose": False,
                "ModelParams": {},
            },
        }

        # Gateway MCP server configuration
        self.gateway_mcp_config = {
            "UseCaseName": "Gateway Calendar",
            "UseCaseType": "MCPServer",
            "MCPParams": {
                "GatewayParams": {
                    "GatewayUrl": "https://test.gateway.com/mcp",
                    "GatewayArn": "arn:aws:bedrock-agentcore:us-east-1:123:gateway/test",
                    "GatewayId": "test-gateway",
                    "GatewayName": "Test Gateway",
                    "TargetParams": [
                        {
                            "TargetName": "Calendar Service",
                            "TargetType": "openApiSchema",
                            "OutboundAuthParams": {
                                "OutboundAuthProviderArn": "arn:aws:bedrock-agentcore:us-east-1:123:token-vault/test",
                                "OutboundAuthProviderType": "OAUTH",
                            },
                        }
                    ],
                }
            },
        }

        # Runtime MCP server configuration
        self.runtime_mcp_config = {
            "UseCaseName": "Runtime Database",
            "UseCaseType": "MCPServer",
            "MCPParams": {
                "RuntimeParams": {
                    "EcrUri": "123.dkr.ecr.us-east-1.amazonaws.com/test:latest",
                    "AgentARN": "arn:aws:bedrock-agentcore:us-east-1:123:runtime/test",
                }
            },
        }

    @patch("configurable_agent.ToolsManager")
    @patch("configurable_agent.DynamoDBHelper")
    @patch("configurable_agent.Agent")
    @patch("configurable_agent.BedrockModel")
    def test_scenario_no_tools(
        self, mock_bedrock_model, mock_agent, mock_ddb_helper, mock_tools_manager
    ):
        """Test agent initialization with no tools configured"""
        # Configuration with no tools or MCP servers
        config = self.base_config.copy()
        config["AgentBuilderParams"]["Tools"] = []
        config["AgentBuilderParams"]["MCPServers"] = []

        # Setup mocks
        mock_ddb_instance = MagicMock()
        mock_ddb_instance.get_config.return_value = config
        mock_ddb_helper.return_value = mock_ddb_instance

        mock_tools_manager_instance = MagicMock()
        mock_tools_manager_instance.load_all_tools.return_value = []
        mock_tools_manager_instance.get_tool_sources.return_value = {}
        mock_tools_manager.return_value = mock_tools_manager_instance

        mock_model_instance = MagicMock()
        mock_bedrock_model.return_value = mock_model_instance

        mock_agent_instance = MagicMock()
        mock_agent.return_value = mock_agent_instance

        # Should initialize successfully with no tools
        agent = ConfigurableAgent("test-table", "test-key", "us-east-1")

        # Verify
        self.assertIsNotNone(agent.agent)
        self.assertEqual(len(agent.loaded_tools), 0)
        mock_tools_manager_instance.load_all_tools.assert_called_once_with(
            mcp_servers=[], strands_tool_ids=[], custom_tool_ids=[]
        )

        # Verify Agent was created with empty tools list
        mock_agent.assert_called_once()
        call_args = mock_agent.call_args[1]
        self.assertEqual(call_args["tools"], [])

    @patch("configurable_agent.ToolsManager")
    @patch("configurable_agent.DynamoDBHelper")
    @patch("configurable_agent.Agent")
    @patch("configurable_agent.BedrockModel")
    def test_scenario_only_builtin_tools(
        self, mock_bedrock_model, mock_agent, mock_ddb_helper, mock_tools_manager
    ):
        """Test agent initialization with only built-in Strands tools"""
        # Configuration with only built-in tools
        config = self.base_config.copy()
        config["AgentBuilderParams"]["Tools"] = [
            {"ToolId": "HTTP Request"},
            {"ToolId": "File Operations"},
        ]
        config["AgentBuilderParams"]["MCPServers"] = []

        # Setup mocks
        mock_ddb_instance = MagicMock()
        mock_ddb_instance.get_config.return_value = config
        mock_ddb_helper.return_value = mock_ddb_instance

        # Mock tools
        mock_http_tool = MagicMock()
        mock_http_tool.name = "http_request"
        mock_file_tool = MagicMock()
        mock_file_tool.name = "file_operations"

        mock_tools_manager_instance = MagicMock()
        mock_tools_manager_instance.load_all_tools.return_value = [mock_http_tool, mock_file_tool]
        mock_tools_manager_instance.get_tool_sources.return_value = {
            "http_request": "Strands",
            "file_operations": "Strands",
        }
        mock_tools_manager.return_value = mock_tools_manager_instance

        mock_model_instance = MagicMock()
        mock_bedrock_model.return_value = mock_model_instance

        mock_agent_instance = MagicMock()
        mock_agent.return_value = mock_agent_instance

        # Should initialize successfully with built-in tools
        agent = ConfigurableAgent("test-table", "test-key", "us-east-1")

        # Verify
        self.assertIsNotNone(agent.agent)
        self.assertEqual(len(agent.loaded_tools), 2)
        mock_tools_manager_instance.load_all_tools.assert_called_once_with(
            mcp_servers=[],
            strands_tool_ids=["HTTP Request", "File Operations"],
            custom_tool_ids=[],
        )

        # Verify Agent was created with tools
        mock_agent.assert_called_once()
        call_args = mock_agent.call_args[1]
        self.assertEqual(call_args["tools"], [mock_http_tool, mock_file_tool])

    @patch("configurable_agent.ToolsManager")
    @patch("configurable_agent.DynamoDBHelper")
    @patch("configurable_agent.Agent")
    @patch("configurable_agent.BedrockModel")
    def test_scenario_only_mcp_tools(
        self, mock_bedrock_model, mock_agent, mock_ddb_helper, mock_tools_manager
    ):
        """Test agent initialization with only MCP tools"""
        # Configuration with only MCP servers
        config = self.base_config.copy()
        config["AgentBuilderParams"]["Tools"] = []
        config["AgentBuilderParams"]["MCPServers"] = [
            {
                "UseCaseId": "gateway-calendar",
                "Url": "https://gateway.example.com/calendar",
                "Type": "gateway",
            },
            {
                "UseCaseId": "runtime-database",
                "Url": "https://bedrock-agentcore.us-east-1.amazonaws.com/runtimes/test/invocations?qualifier=DEFAULT",
                "Type": "runtime",
            },
        ]

        # Setup mocks
        mock_ddb_instance = MagicMock()
        mock_ddb_instance.get_config.return_value = config
        mock_ddb_helper.return_value = mock_ddb_instance

        # Mock MCP tools
        mock_calendar_tool = MagicMock()
        mock_calendar_tool.name = "get_calendar_events"
        mock_db_tool = MagicMock()
        mock_db_tool.name = "query_database"

        mock_tools_manager_instance = MagicMock()
        mock_tools_manager_instance.load_all_tools.return_value = [mock_calendar_tool, mock_db_tool]
        mock_tools_manager_instance.get_tool_sources.return_value = {
            "get_calendar_events": "MCP-Gateway-gateway-calendar",
            "query_database": "MCP-Runtime-runtime-database",
        }
        mock_tools_manager.return_value = mock_tools_manager_instance

        mock_model_instance = MagicMock()
        mock_bedrock_model.return_value = mock_model_instance

        mock_agent_instance = MagicMock()
        mock_agent.return_value = mock_agent_instance

        # Should initialize successfully with MCP tools
        agent = ConfigurableAgent("test-table", "test-key", "us-east-1")

        # Verify
        self.assertIsNotNone(agent.agent)
        self.assertEqual(len(agent.loaded_tools), 2)
        mock_tools_manager_instance.load_all_tools.assert_called_once_with(
            mcp_servers=[
                {
                    "use_case_id": "gateway-calendar",
                    "url": "https://gateway.example.com/calendar",
                    "type": "gateway",
                },
                {
                    "use_case_id": "runtime-database",
                    "url": "https://bedrock-agentcore.us-east-1.amazonaws.com/runtimes/test/invocations?qualifier=DEFAULT",
                    "type": "runtime",
                },
            ],
            strands_tool_ids=[],
            custom_tool_ids=[],
        )

        # Verify Agent was created with MCP tools
        mock_agent.assert_called_once()
        call_args = mock_agent.call_args[1]
        self.assertEqual(call_args["tools"], [mock_calendar_tool, mock_db_tool])

    @patch("configurable_agent.ToolsManager")
    @patch("configurable_agent.DynamoDBHelper")
    @patch("configurable_agent.Agent")
    @patch("configurable_agent.BedrockModel")
    def test_scenario_mixed_tools(
        self, mock_bedrock_model, mock_agent, mock_ddb_helper, mock_tools_manager
    ):
        """Test agent initialization with both built-in and MCP tools"""
        # Configuration with both built-in tools and MCP servers
        config = self.base_config.copy()
        config["AgentBuilderParams"]["Tools"] = [
            {"ToolId": "HTTP Request"},
            {"ToolId": "File Operations"},
        ]
        config["AgentBuilderParams"]["MCPServers"] = [
            {
                "UseCaseId": "gateway-calendar",
                "Url": "https://gateway.example.com/calendar",
                "Type": "gateway",
            },
            {
                "UseCaseId": "runtime-database",
                "Url": "https://bedrock-agentcore.us-east-1.amazonaws.com/runtimes/test/invocations?qualifier=DEFAULT",
                "Type": "runtime",
            },
        ]

        # Setup mocks
        mock_ddb_instance = MagicMock()
        mock_ddb_instance.get_config.return_value = config
        mock_ddb_helper.return_value = mock_ddb_instance

        # Mock all tools
        mock_http_tool = MagicMock()
        mock_http_tool.name = "http_request"
        mock_file_tool = MagicMock()
        mock_file_tool.name = "file_operations"
        mock_calendar_tool = MagicMock()
        mock_calendar_tool.name = "get_calendar_events"
        mock_db_tool = MagicMock()
        mock_db_tool.name = "query_database"

        mock_tools_manager_instance = MagicMock()
        mock_tools_manager_instance.load_all_tools.return_value = [
            mock_http_tool,
            mock_file_tool,
            mock_calendar_tool,
            mock_db_tool,
        ]
        mock_tools_manager_instance.get_tool_sources.return_value = {
            "http_request": "Strands",
            "file_operations": "Strands",
            "get_calendar_events": "MCP-Gateway-gateway-calendar",
            "query_database": "MCP-Runtime-runtime-database",
        }
        mock_tools_manager.return_value = mock_tools_manager_instance

        mock_model_instance = MagicMock()
        mock_bedrock_model.return_value = mock_model_instance

        mock_agent_instance = MagicMock()
        mock_agent.return_value = mock_agent_instance

        # Should initialize successfully with mixed tools
        agent = ConfigurableAgent("test-table", "test-key", "us-east-1")

        # Verify
        self.assertIsNotNone(agent.agent)
        self.assertEqual(len(agent.loaded_tools), 4)
        mock_tools_manager_instance.load_all_tools.assert_called_once_with(
            mcp_servers=[
                {
                    "use_case_id": "gateway-calendar",
                    "url": "https://gateway.example.com/calendar",
                    "type": "gateway",
                },
                {
                    "use_case_id": "runtime-database",
                    "url": "https://bedrock-agentcore.us-east-1.amazonaws.com/runtimes/test/invocations?qualifier=DEFAULT",
                    "type": "runtime",
                },
            ],
            strands_tool_ids=["HTTP Request", "File Operations"],
            custom_tool_ids=[],
        )

        # Verify Agent was created with all tools
        mock_agent.assert_called_once()
        call_args = mock_agent.call_args[1]
        self.assertEqual(len(call_args["tools"]), 4)

    @patch("configurable_agent.ToolsManager")
    @patch("configurable_agent.DynamoDBHelper")
    @patch("configurable_agent.Agent")
    @patch("configurable_agent.BedrockModel")
    def test_error_propagation_and_logging(
        self, mock_bedrock_model, mock_agent, mock_ddb_helper, mock_tools_manager
    ):
        """Test proper error propagation and logging when tool loading fails"""
        # Configuration with tools
        config = self.base_config.copy()
        config["AgentBuilderParams"]["Tools"] = [{"ToolId": "HTTP Request"}]
        config["AgentBuilderParams"]["MCPServers"] = [
            {
                "UseCaseId": "gateway-calendar",
                "Url": "https://gateway.example.com/calendar",
                "Type": "gateway",
            }
        ]

        # Setup mocks
        mock_ddb_instance = MagicMock()
        mock_ddb_instance.get_config.return_value = config
        mock_ddb_helper.return_value = mock_ddb_instance

        # Mock ToolsManager to raise exception
        mock_tools_manager_instance = MagicMock()
        mock_tools_manager_instance.load_all_tools.side_effect = Exception(
            "Network error loading MCP tools"
        )
        mock_tools_manager.return_value = mock_tools_manager_instance

        mock_model_instance = MagicMock()
        mock_bedrock_model.return_value = mock_model_instance

        mock_agent_instance = MagicMock()
        mock_agent.return_value = mock_agent_instance

        # Should initialize successfully despite tool loading failure
        with self.assertLogs(level="ERROR") as log_context:
            agent = ConfigurableAgent("test-table", "test-key", "us-east-1")

        # Verify agent was created with empty tools
        self.assertIsNotNone(agent.agent)
        self.assertEqual(len(agent.loaded_tools), 0)

        # Verify error was logged
        self.assertTrue(any("Error loading tools" in message for message in log_context.output))

        # Verify Agent was created with empty tools list
        mock_agent.assert_called_once()
        call_args = mock_agent.call_args[1]
        self.assertEqual(call_args["tools"], [])

    @patch("configurable_agent.ToolsManager")
    @patch("configurable_agent.DynamoDBHelper")
    @patch("configurable_agent.Agent")
    @patch("configurable_agent.BedrockModel")
    def test_tool_sources_tracking(
        self, mock_bedrock_model, mock_agent, mock_ddb_helper, mock_tools_manager
    ):
        """Test that tool sources are properly tracked and logged"""
        # Configuration with mixed tools
        config = self.base_config.copy()
        config["AgentBuilderParams"]["Tools"] = [{"ToolId": "HTTP Request"}]
        config["AgentBuilderParams"]["MCPServers"] = [
            {
                "UseCaseId": "gateway-calendar",
                "UseCaseName": "Gateway Calendar",
                "Url": "https://example-gateway.bedrock-agentcore.us-east-1.amazonaws.com/calendar",
                "Type": "gateway",
            }
        ]

        # Setup mocks
        mock_ddb_instance = MagicMock()
        mock_ddb_instance.get_config.return_value = config
        mock_ddb_helper.return_value = mock_ddb_instance

        # Mock tools
        mock_http_tool = MagicMock()
        mock_http_tool.name = "http_request"
        mock_calendar_tool = MagicMock()
        mock_calendar_tool.name = "get_calendar_events"

        mock_tools_manager_instance = MagicMock()
        mock_tools_manager_instance.load_all_tools.return_value = [
            mock_http_tool,
            mock_calendar_tool,
        ]
        mock_tools_manager_instance.get_tool_sources.return_value = {
            "http_request": "Strands",
            "get_calendar_events": "MCP-Gateway-gateway-calendar",
        }
        mock_tools_manager.return_value = mock_tools_manager_instance

        mock_model_instance = MagicMock()
        mock_bedrock_model.return_value = mock_model_instance

        mock_agent_instance = MagicMock()
        mock_agent.return_value = mock_agent_instance

        # Initialize agent
        agent = ConfigurableAgent("test-table", "test-key", "us-east-1")

        # Verify get_tool_sources was called
        mock_tools_manager_instance.get_tool_sources.assert_called_once()

        # Verify tools are tracked
        tool_sources = agent.tools_manager.get_tool_sources()
        self.assertEqual(len(tool_sources), 2)
        self.assertEqual(tool_sources["http_request"], "Strands")
        self.assertEqual(tool_sources["get_calendar_events"], "MCP-Gateway-gateway-calendar")

    @patch("configurable_agent.ToolsManager")
    @patch("configurable_agent.DynamoDBHelper")
    @patch("configurable_agent.Agent")
    @patch("configurable_agent.BedrockModel")
    def test_configuration_extraction(
        self, mock_bedrock_model, mock_agent, mock_ddb_helper, mock_tools_manager
    ):
        """Test that tool IDs and MCP server IDs are correctly extracted from configuration"""
        # Configuration with specific IDs
        config = self.base_config.copy()
        config["AgentBuilderParams"]["Tools"] = [
            {"ToolId": "HTTP Request"},
            {"ToolId": "File Operations"},
            {"ToolId": "Code Interpreter"},
        ]
        config["AgentBuilderParams"]["MCPServers"] = [
            {
                "UseCaseId": "gateway-calendar",
                "UseCaseName": "Gateway Calendar",
                "Url": "https://example-gateway.bedrock-agentcore.us-east-1.amazonaws.com/calendar",
                "Type": "gateway",
            },
            {
                "UseCaseId": "runtime-database",
                "UseCaseName": "Runtime Database",
                "Url": "https://example-bedrock-agentcore.us-east-1.amazonaws.com/runtimes/test-runtime/invocations",
                "Type": "runtime",
            },
            {
                "UseCaseId": "gateway-slack",
                "UseCaseName": "Gateway Slack",
                "Url": "https://example-gateway.bedrock-agentcore.us-east-1.amazonaws.com/slack",
                "Type": "gateway",
            },
        ]

        # Setup mocks
        mock_ddb_instance = MagicMock()
        mock_ddb_instance.get_config.return_value = config
        mock_ddb_helper.return_value = mock_ddb_instance

        mock_tools_manager_instance = MagicMock()
        mock_tools_manager_instance.load_all_tools.return_value = []
        mock_tools_manager_instance.get_tool_sources.return_value = {}
        mock_tools_manager.return_value = mock_tools_manager_instance

        mock_model_instance = MagicMock()
        mock_bedrock_model.return_value = mock_model_instance

        mock_agent_instance = MagicMock()
        mock_agent.return_value = mock_agent_instance

        # Initialize agent
        agent = ConfigurableAgent("test-table", "test-key", "us-east-1")

        # Verify correct IDs were extracted and passed to ToolsManager
        mock_tools_manager_instance.load_all_tools.assert_called_once_with(
            mcp_servers=[
                {
                    "use_case_id": "gateway-calendar",
                    "url": "https://example-gateway.bedrock-agentcore.us-east-1.amazonaws.com/calendar",
                    "type": "gateway",
                },
                {
                    "use_case_id": "runtime-database",
                    "url": "https://example-bedrock-agentcore.us-east-1.amazonaws.com/runtimes/test-runtime/invocations",
                    "type": "runtime",
                },
                {
                    "use_case_id": "gateway-slack",
                    "url": "https://example-gateway.bedrock-agentcore.us-east-1.amazonaws.com/slack",
                    "type": "gateway",
                },
            ],
            strands_tool_ids=["HTTP Request", "File Operations", "Code Interpreter"],
            custom_tool_ids=[],
        )


if __name__ == "__main__":
    unittest.main()
