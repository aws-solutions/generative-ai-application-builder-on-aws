# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

#!/usr/bin/env python3
"""
Unit tests for configurable_agent.py
"""

import os
import sys
import unittest
from unittest.mock import MagicMock, patch

# Add src directory to path for imports
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "src"))

from configurable_agent import ConfigurableAgent


class TestConfigurableAgent(unittest.TestCase):
    """Test ConfigurableAgent class"""

    def setUp(self):
        """Set up test data"""
        self.test_ddb_config = {
            "UseCaseName": "Test Agent",
            "UseCaseType": "AgentBuilder",
            "AgentBuilderParams": {
                "SystemPrompt": "You are a test assistant.",
                "Tools": [{"ToolId": "HTTP Request"}, {"ToolId": "File Operations"}],
                "MemoryConfig": {"LongTermEnabled": "Yes"},
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

    @patch("configurable_agent.ToolsManager")
    @patch("configurable_agent.DynamoDBHelper")
    @patch("configurable_agent.Agent")
    @patch("configurable_agent.BedrockModel")
    def test_initialization_success(
        self, mock_bedrock_model, mock_agent, mock_ddb_helper, mock_tools_manager
    ):
        """Test successful agent initialization"""
        # Mock DDB helper
        mock_ddb_instance = MagicMock()
        mock_ddb_instance.get_config.return_value = self.test_ddb_config
        mock_ddb_helper.return_value = mock_ddb_instance

        # Mock ToolsManager
        mock_tools_manager_instance = MagicMock()
        mock_tools_manager_instance.load_all_tools.return_value = []
        mock_tools_manager_instance.get_tool_sources.return_value = {}
        mock_tools_manager.return_value = mock_tools_manager_instance

        # Mock BedrockModel
        mock_model_instance = MagicMock()
        mock_bedrock_model.return_value = mock_model_instance

        # Mock Agent
        mock_agent_instance = MagicMock()
        mock_agent.return_value = mock_agent_instance

        agent = ConfigurableAgent("test-table", "test-key", "us-east-1")

        # Verify initialization
        self.assertEqual(agent.table_name, "test-table")
        self.assertEqual(agent.config_key, "test-key")
        self.assertEqual(agent.region, "us-east-1")
        self.assertIsNotNone(agent.config)
        self.assertIsNotNone(agent.agent)
        self.assertIsNotNone(agent.tools_manager)

        # Verify config parsing
        self.assertEqual(agent.config.use_case_name, "Test Agent")
        self.assertEqual(
            agent.config.llm_params.bedrock_llm_params.model_identifier, "amazon.nova-lite-v1:0"
        )

        # Verify ToolsManager was called
        mock_tools_manager_instance.load_all_tools.assert_called_once()

    @patch("configurable_agent.DynamoDBHelper")
    def test_invalid_use_case_type(self, mock_ddb_helper):
        """Test error handling for invalid use case type"""
        # Mock DDB helper with wrong use case type
        invalid_config = self.test_ddb_config.copy()
        invalid_config["UseCaseType"] = "Workflow"

        mock_ddb_instance = MagicMock()
        mock_ddb_instance.get_config.return_value = invalid_config
        mock_ddb_helper.return_value = mock_ddb_instance

        with self.assertRaises(ValueError) as context:
            ConfigurableAgent("test-table", "test-key", "us-east-1")

        self.assertIn("Expected AgentBuilder, got Workflow", str(context.exception))

    @patch("configurable_agent.ToolsManager")
    @patch("configurable_agent.DynamoDBHelper")
    @patch("configurable_agent.Agent")
    @patch("configurable_agent.BedrockModel")
    def test_bedrock_model_creation(
        self, mock_bedrock_model, mock_agent, mock_ddb_helper, mock_tools_manager
    ):
        """Test BedrockModel creation with correct parameters"""
        # Setup mocks
        mock_ddb_instance = MagicMock()
        mock_ddb_instance.get_config.return_value = self.test_ddb_config
        mock_ddb_helper.return_value = mock_ddb_instance

        # Mock ToolsManager
        mock_tools_manager_instance = MagicMock()
        mock_tools_manager_instance.load_all_tools.return_value = []
        mock_tools_manager_instance.get_tool_sources.return_value = {}
        mock_tools_manager.return_value = mock_tools_manager_instance

        mock_model_instance = MagicMock()
        mock_bedrock_model.return_value = mock_model_instance

        mock_agent_instance = MagicMock()
        mock_agent.return_value = mock_agent_instance

        agent = ConfigurableAgent("test-table", "test-key", "us-east-1")

        # Verify BedrockModel was called with correct parameters
        mock_bedrock_model.assert_called_once()
        call_args = mock_bedrock_model.call_args[1]

        self.assertEqual(call_args["model_id"], "amazon.nova-lite-v1:0")
        self.assertEqual(call_args["region_name"], "us-east-1")
        self.assertEqual(call_args["temperature"], 0.7)
        self.assertTrue(call_args["streaming"])

    @patch("configurable_agent.ToolsManager")
    @patch("configurable_agent.DynamoDBHelper")
    @patch("configurable_agent.Agent")
    @patch("configurable_agent.BedrockModel")
    def test_agent_creation(
        self, mock_bedrock_model, mock_agent, mock_ddb_helper, mock_tools_manager
    ):
        """Test Agent creation with correct parameters"""
        # Setup mocks
        mock_ddb_instance = MagicMock()
        mock_ddb_instance.get_config.return_value = self.test_ddb_config
        mock_ddb_helper.return_value = mock_ddb_instance

        # Mock ToolsManager with some tools
        mock_tool1 = MagicMock()
        mock_tool2 = MagicMock()
        mock_tools_manager_instance = MagicMock()
        mock_tools_manager_instance.load_all_tools.return_value = [mock_tool1, mock_tool2]
        mock_tools_manager_instance.get_tool_sources.return_value = {
            "tool1": "Strands",
            "tool2": "Strands",
        }
        mock_tools_manager.return_value = mock_tools_manager_instance

        mock_model_instance = MagicMock()
        mock_bedrock_model.return_value = mock_model_instance

        mock_agent_instance = MagicMock()
        mock_agent.return_value = mock_agent_instance

        agent = ConfigurableAgent("test-table", "test-key", "us-east-1")

        # Verify Agent was called with correct parameters
        mock_agent.assert_called_once()
        call_args = mock_agent.call_args[1]

        self.assertEqual(call_args["name"], "Test Agent")
        self.assertEqual(call_args["system_prompt"], "You are a test assistant.")
        self.assertEqual(call_args["model"], mock_model_instance)
        self.assertEqual(call_args["tools"], [mock_tool1, mock_tool2])  # Now includes loaded tools

    @patch("configurable_agent.ToolsManager")
    @patch("configurable_agent.DynamoDBHelper")
    @patch("configurable_agent.Agent")
    @patch("configurable_agent.BedrockModel")
    def test_get_methods(self, mock_bedrock_model, mock_agent, mock_ddb_helper, mock_tools_manager):
        """Test get_agent and get_config methods"""
        # Setup mocks
        mock_ddb_instance = MagicMock()
        mock_ddb_instance.get_config.return_value = self.test_ddb_config
        mock_ddb_helper.return_value = mock_ddb_instance

        # Mock ToolsManager
        mock_tools_manager_instance = MagicMock()
        mock_tools_manager_instance.load_all_tools.return_value = []
        mock_tools_manager_instance.get_tool_sources.return_value = {}
        mock_tools_manager.return_value = mock_tools_manager_instance

        mock_model_instance = MagicMock()
        mock_bedrock_model.return_value = mock_model_instance

        mock_agent_instance = MagicMock()
        mock_agent.return_value = mock_agent_instance

        agent = ConfigurableAgent("test-table", "test-key", "us-east-1")

        # Test get_agent
        returned_agent = agent.get_agent()
        self.assertEqual(returned_agent, mock_agent_instance)

        # Test get_config
        returned_config = agent.get_config()
        self.assertEqual(returned_config.use_case_name, "Test Agent")

    @patch("configurable_agent.DynamoDBHelper")
    @patch("configurable_agent.Agent")
    @patch("configurable_agent.BedrockModel")
    def test_inference_profile_model_creation(
        self, mock_bedrock_model, mock_agent, mock_ddb_helper
    ):
        """Test BedrockModel creation with inference profile"""
        # Create inference profile config
        inference_profile_config = {
            "UseCaseName": "Inference Profile Agent",
            "UseCaseType": "AgentBuilder",
            "AgentBuilderParams": {
                "SystemPrompt": "You are a helpful AI assistant.",
                "MemoryConfig": {"LongTermEnabled": True},
            },
            "LlmParams": {
                "BedrockLlmParams": {
                    "BedrockInferenceType": "INFERENCE_PROFILE",
                    "InferenceProfileId": "us.anthropic.claude-3-7-sonnet-20250219-v1:0",
                },
                "ModelProvider": "Bedrock",
                "Temperature": 0.5,
                "Streaming": True,
                "Verbose": False,
                "ModelParams": {},
            },
        }

        # Setup mocks
        mock_ddb_instance = MagicMock()
        mock_ddb_instance.get_config.return_value = inference_profile_config
        mock_ddb_helper.return_value = mock_ddb_instance

        mock_model_instance = MagicMock()
        mock_bedrock_model.return_value = mock_model_instance

        mock_agent_instance = MagicMock()
        mock_agent.return_value = mock_agent_instance

        agent = ConfigurableAgent("test-table", "test-key", "us-east-1")

        # Verify BedrockModel was called with inference profile ID
        mock_bedrock_model.assert_called_once()
        call_args = mock_bedrock_model.call_args[1]

        self.assertEqual(call_args["model_id"], "us.anthropic.claude-3-7-sonnet-20250219-v1:0")

        # Verify config parsing
        self.assertEqual(
            agent.config.llm_params.bedrock_llm_params.inference_profile_id,
            "us.anthropic.claude-3-7-sonnet-20250219-v1:0",
        )
        self.assertEqual(
            agent.config.llm_params.bedrock_llm_params.model_identifier,
            "us.anthropic.claude-3-7-sonnet-20250219-v1:0",
        )
        self.assertIsNone(agent.config.llm_params.bedrock_llm_params.model_id)

    @patch("configurable_agent.ToolsManager")
    @patch("configurable_agent.DynamoDBHelper")
    @patch("configurable_agent.Agent")
    @patch("configurable_agent.BedrockModel")
    def test_tool_loading_with_mcp_servers(
        self, mock_bedrock_model, mock_agent, mock_ddb_helper, mock_tools_manager
    ):
        """Test tool loading with both built-in tools and MCP servers"""
        # Add MCP servers to config
        config_with_mcp = self.test_ddb_config.copy()
        config_with_mcp["AgentBuilderParams"]["MCPServers"] = [
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
        ]

        # Setup mocks
        mock_ddb_instance = MagicMock()
        mock_ddb_instance.get_config.return_value = config_with_mcp
        mock_ddb_helper.return_value = mock_ddb_instance

        # Mock ToolsManager with tools
        mock_tool1 = MagicMock()
        mock_tool2 = MagicMock()
        mock_tool3 = MagicMock()
        mock_tools_manager_instance = MagicMock()
        mock_tools_manager_instance.load_all_tools.return_value = [
            mock_tool1,
            mock_tool2,
            mock_tool3,
        ]
        mock_tools_manager_instance.get_tool_sources.return_value = {
            "http_request": "Strands",
            "get_calendar_events": "MCP-Gateway",
            "query_database": "MCP-Runtime",
        }
        mock_tools_manager.return_value = mock_tools_manager_instance

        mock_model_instance = MagicMock()
        mock_bedrock_model.return_value = mock_model_instance

        mock_agent_instance = MagicMock()
        mock_agent.return_value = mock_agent_instance

        agent = ConfigurableAgent("test-table", "test-key", "us-east-1")

        # Verify ToolsManager.load_all_tools was called with correct parameters
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
            ],
            strands_tool_ids=["HTTP Request", "File Operations"],
            custom_tool_ids=[],
        )

        # Verify tools were loaded
        self.assertEqual(len(agent.loaded_tools), 3)
        self.assertEqual(agent.loaded_tools, [mock_tool1, mock_tool2, mock_tool3])

    @patch("configurable_agent.ToolsManager")
    @patch("configurable_agent.DynamoDBHelper")
    @patch("configurable_agent.Agent")
    @patch("configurable_agent.BedrockModel")
    def test_tool_loading_failure_graceful_handling(
        self, mock_bedrock_model, mock_agent, mock_ddb_helper, mock_tools_manager
    ):
        """Test that agent initializes successfully even if tool loading fails"""
        # Setup mocks
        mock_ddb_instance = MagicMock()
        mock_ddb_instance.get_config.return_value = self.test_ddb_config
        mock_ddb_helper.return_value = mock_ddb_instance

        # Mock ToolsManager to raise an exception
        mock_tools_manager_instance = MagicMock()
        mock_tools_manager_instance.load_all_tools.side_effect = Exception("Tool loading failed")
        mock_tools_manager.return_value = mock_tools_manager_instance

        mock_model_instance = MagicMock()
        mock_bedrock_model.return_value = mock_model_instance

        mock_agent_instance = MagicMock()
        mock_agent.return_value = mock_agent_instance

        # Should not raise exception - agent should initialize with empty tools
        agent = ConfigurableAgent("test-table", "test-key", "us-east-1")

        # Verify agent was created successfully
        self.assertIsNotNone(agent.agent)
        self.assertEqual(agent.loaded_tools, [])

        # Verify Agent was called with empty tools list
        mock_agent.assert_called_once()
        call_args = mock_agent.call_args[1]
        self.assertEqual(call_args["tools"], [])

    @patch("configurable_agent.ToolsManager")
    @patch("configurable_agent.DynamoDBHelper")
    @patch("configurable_agent.Agent")
    @patch("configurable_agent.BedrockModel")
    def test_env_vars_extracted_from_model_params(
        self, mock_bedrock_model, mock_agent, mock_ddb_helper, mock_tools_manager
    ):
        """Test that ENV_ prefixed ModelParams are extracted correctly"""
        # Add ModelParams with ENV_ prefix and configure tools
        config_with_env = self.test_ddb_config.copy()
        config_with_env["AgentBuilderParams"]["Tools"] = [
            {"ToolId": "Current Time"},
            {"ToolId": "Weather"},
        ]
        config_with_env["LlmParams"]["ModelParams"] = {
            "ENV_CURRENT_TIME_DEFAULT_TIMEZONE": {"Value": "America/New_York", "Type": "string"},
            "ENV_WEATHER_LOCATION": {"Value": "Seattle", "Type": "string"},
            "REGULAR_PARAM": {"Value": "should-not-be-set", "Type": "string"},
        }

        # Setup mocks
        mock_ddb_instance = MagicMock()
        mock_ddb_instance.get_config.return_value = config_with_env
        mock_ddb_helper.return_value = mock_ddb_instance

        mock_tools_manager_instance = MagicMock()
        mock_tools_manager_instance.load_all_tools.return_value = []
        mock_tools_manager_instance.get_tool_sources.return_value = {}
        mock_tools_manager.return_value = mock_tools_manager_instance

        mock_model_instance = MagicMock()
        mock_bedrock_model.return_value = mock_model_instance

        mock_agent_instance = MagicMock()
        mock_agent.return_value = mock_agent_instance

        # Clear any existing env vars
        if "DEFAULT_TIMEZONE" in os.environ:
            del os.environ["DEFAULT_TIMEZONE"]
        if "LOCATION" in os.environ:
            del os.environ["LOCATION"]

        agent = ConfigurableAgent("test-table", "test-key", "us-east-1")

        # Verify environment variables were set correctly
        # ENV_CURRENT_TIME_DEFAULT_TIMEZONE -> DEFAULT_TIMEZONE (everything after ENV_CURRENT_TIME_)
        self.assertEqual(os.environ.get("DEFAULT_TIMEZONE"), "America/New_York")
        # ENV_WEATHER_LOCATION -> LOCATION (everything after ENV_WEATHER_)
        self.assertEqual(os.environ.get("LOCATION"), "Seattle")

        # Verify non-ENV_ prefixed param was not set
        self.assertIsNone(os.environ.get("REGULAR_PARAM"))

    @patch("configurable_agent.ToolsManager")
    @patch("configurable_agent.DynamoDBHelper")
    @patch("configurable_agent.Agent")
    @patch("configurable_agent.BedrockModel")
    def test_env_vars_value_field_extraction(
        self, mock_bedrock_model, mock_agent, mock_ddb_helper, mock_tools_manager
    ):
        """Test that Value field is extracted from ModelParams objects"""
        # Add ModelParams with Value field and configure tool
        config_with_env = self.test_ddb_config.copy()
        config_with_env["AgentBuilderParams"]["Tools"] = [
            {"ToolId": "Tool"},
        ]
        config_with_env["LlmParams"]["ModelParams"] = {
            "ENV_TOOL_CONFIG_VALUE": {"Value": "extracted-value", "Type": "string"},
        }

        # Setup mocks
        mock_ddb_instance = MagicMock()
        mock_ddb_instance.get_config.return_value = config_with_env
        mock_ddb_helper.return_value = mock_ddb_instance

        mock_tools_manager_instance = MagicMock()
        mock_tools_manager_instance.load_all_tools.return_value = []
        mock_tools_manager_instance.get_tool_sources.return_value = {}
        mock_tools_manager.return_value = mock_tools_manager_instance

        mock_model_instance = MagicMock()
        mock_bedrock_model.return_value = mock_model_instance

        mock_agent_instance = MagicMock()
        mock_agent.return_value = mock_agent_instance

        # Clear any existing env var
        if "CONFIG_VALUE" in os.environ:
            del os.environ["CONFIG_VALUE"]

        agent = ConfigurableAgent("test-table", "test-key", "us-east-1")

        # Verify the Value field was extracted and set
        self.assertEqual(os.environ.get("CONFIG_VALUE"), "extracted-value")

    @patch("configurable_agent.ToolsManager")
    @patch("configurable_agent.DynamoDBHelper")
    @patch("configurable_agent.Agent")
    @patch("configurable_agent.BedrockModel")
    def test_env_vars_set_with_correct_names(
        self, mock_bedrock_model, mock_agent, mock_ddb_helper, mock_tools_manager
    ):
        """Test that environment variables are set with correct names (ENV_<TOOL_NAME>_ prefix removed)"""
        # Add ModelParams with various ENV_ patterns and configure tools
        config_with_env = self.test_ddb_config.copy()
        config_with_env["AgentBuilderParams"]["Tools"] = [
            {"ToolId": "Current Time"},
            {"ToolId": "Database"},
            {"ToolId": "Weather"},
        ]
        config_with_env["LlmParams"]["ModelParams"] = {
            "ENV_CURRENT_TIME_DEFAULT_TIMEZONE": {"Value": "UTC", "Type": "string"},
            "ENV_DATABASE_CONNECTION_STRING": {"Value": "conn-string", "Type": "string"},
            "ENV_WEATHER_LOCATION": {"Value": "Seattle", "Type": "string"},
        }

        # Setup mocks
        mock_ddb_instance = MagicMock()
        mock_ddb_instance.get_config.return_value = config_with_env
        mock_ddb_helper.return_value = mock_ddb_instance

        mock_tools_manager_instance = MagicMock()
        mock_tools_manager_instance.load_all_tools.return_value = []
        mock_tools_manager_instance.get_tool_sources.return_value = {}
        mock_tools_manager.return_value = mock_tools_manager_instance

        mock_model_instance = MagicMock()
        mock_bedrock_model.return_value = mock_model_instance

        mock_agent_instance = MagicMock()
        mock_agent.return_value = mock_agent_instance

        # Clear any existing env vars
        for var in ["DEFAULT_TIMEZONE", "CONNECTION_STRING", "LOCATION"]:
            if var in os.environ:
                del os.environ[var]

        agent = ConfigurableAgent("test-table", "test-key", "us-east-1")

        # Verify environment variables have correct names (prefix removed)
        # ENV_CURRENT_TIME_DEFAULT_TIMEZONE -> DEFAULT_TIMEZONE
        self.assertEqual(os.environ.get("DEFAULT_TIMEZONE"), "UTC")
        # ENV_DATABASE_CONNECTION_STRING -> CONNECTION_STRING
        self.assertEqual(os.environ.get("CONNECTION_STRING"), "conn-string")
        # ENV_WEATHER_LOCATION -> LOCATION
        self.assertEqual(os.environ.get("LOCATION"), "Seattle")

        # Verify the full keys are NOT set as env vars
        self.assertIsNone(os.environ.get("ENV_CURRENT_TIME_DEFAULT_TIMEZONE"))
        self.assertIsNone(os.environ.get("ENV_DATABASE_CONNECTION_STRING"))
        self.assertIsNone(os.environ.get("ENV_WEATHER_LOCATION"))

    @patch("configurable_agent.ToolsManager")
    @patch("configurable_agent.DynamoDBHelper")
    @patch("configurable_agent.Agent")
    @patch("configurable_agent.BedrockModel")
    def test_non_env_prefixed_params_ignored(
        self, mock_bedrock_model, mock_agent, mock_ddb_helper, mock_tools_manager
    ):
        """Test that non-ENV_ prefixed ModelParams are ignored"""
        # Add ModelParams with mixed prefixes and configure tool
        config_with_env = self.test_ddb_config.copy()
        config_with_env["AgentBuilderParams"]["Tools"] = [
            {"ToolId": "Tool"},
        ]
        config_with_env["LlmParams"]["ModelParams"] = {
            "ENV_TOOL_VALID_VAR": {"Value": "should-be-set", "Type": "string"},
            "REGULAR_PARAM": {"Value": "should-not-be-set", "Type": "string"},
            "ANOTHER_PARAM": {"Value": "also-not-set", "Type": "string"},
            "temperature": {"Value": "0.5", "Type": "float"},
        }

        # Setup mocks
        mock_ddb_instance = MagicMock()
        mock_ddb_instance.get_config.return_value = config_with_env
        mock_ddb_helper.return_value = mock_ddb_instance

        mock_tools_manager_instance = MagicMock()
        mock_tools_manager_instance.load_all_tools.return_value = []
        mock_tools_manager_instance.get_tool_sources.return_value = {}
        mock_tools_manager.return_value = mock_tools_manager_instance

        mock_model_instance = MagicMock()
        mock_bedrock_model.return_value = mock_model_instance

        mock_agent_instance = MagicMock()
        mock_agent.return_value = mock_agent_instance

        # Clear any existing env vars
        for var in ["VALID_VAR", "REGULAR_PARAM", "ANOTHER_PARAM", "temperature"]:
            if var in os.environ:
                del os.environ[var]

        agent = ConfigurableAgent("test-table", "test-key", "us-east-1")

        # Verify only ENV_ prefixed param was set
        self.assertEqual(os.environ.get("VALID_VAR"), "should-be-set")

        # Verify non-ENV_ prefixed params were NOT set
        self.assertIsNone(os.environ.get("REGULAR_PARAM"))
        self.assertIsNone(os.environ.get("ANOTHER_PARAM"))
        self.assertIsNone(os.environ.get("temperature"))

    @patch("configurable_agent.ToolsManager")
    @patch("configurable_agent.DynamoDBHelper")
    @patch("configurable_agent.Agent")
    @patch("configurable_agent.BedrockModel")
    @patch("configurable_agent.logger")
    def test_env_vars_logging(
        self, mock_logger, mock_bedrock_model, mock_agent, mock_ddb_helper, mock_tools_manager
    ):
        """Test that setting environment variables is logged correctly"""
        # Add ModelParams with ENV_ prefix and configure tools
        config_with_env = self.test_ddb_config.copy()
        config_with_env["AgentBuilderParams"]["Tools"] = [
            {"ToolId": "Weather"},
            {"ToolId": "Current Time"},
            {"ToolId": "Calculator"},
        ]
        config_with_env["LlmParams"]["ModelParams"] = {
            "ENV_WEATHER_LOCATION": {"Value": "Seattle", "Type": "string"},
            "ENV_CURRENT_TIME_DEFAULT_TIMEZONE": {"Value": "UTC", "Type": "string"},
            "ENV_CALCULATOR_PRECISION": {"Value": "10", "Type": "string"},
        }

        # Setup mocks
        mock_ddb_instance = MagicMock()
        mock_ddb_instance.get_config.return_value = config_with_env
        mock_ddb_helper.return_value = mock_ddb_instance

        mock_tools_manager_instance = MagicMock()
        mock_tools_manager_instance.load_all_tools.return_value = []
        mock_tools_manager_instance.get_tool_sources.return_value = {}
        mock_tools_manager.return_value = mock_tools_manager_instance

        mock_model_instance = MagicMock()
        mock_bedrock_model.return_value = mock_model_instance

        mock_agent_instance = MagicMock()
        mock_agent.return_value = mock_agent_instance

        agent = ConfigurableAgent("test-table", "test-key", "us-east-1")

        # Verify debug logging for each environment variable
        debug_calls = [
            call
            for call in mock_logger.debug.call_args_list
            if "Set environment variable" in str(call)
        ]
        self.assertEqual(len(debug_calls), 3)

        # Verify info logging for summary
        info_calls = [
            call
            for call in mock_logger.info.call_args_list
            if "tool environment variable(s) from ModelParams" in str(call)
        ]
        self.assertEqual(len(info_calls), 1)
        # Check that it logged "Set 3 tool environment variable(s) from ModelParams"
        self.assertIn("Set 3 tool environment variable(s) from ModelParams", str(info_calls[0]))

    @patch("configurable_agent.ToolsManager")
    @patch("configurable_agent.DynamoDBHelper")
    @patch("configurable_agent.Agent")
    @patch("configurable_agent.BedrockModel")
    def test_env_vars_no_model_params(
        self, mock_bedrock_model, mock_agent, mock_ddb_helper, mock_tools_manager
    ):
        """Test that agent initializes correctly when ModelParams is empty or missing"""
        # Test with empty ModelParams
        config_empty_params = self.test_ddb_config.copy()
        config_empty_params["LlmParams"]["ModelParams"] = {}

        # Setup mocks
        mock_ddb_instance = MagicMock()
        mock_ddb_instance.get_config.return_value = config_empty_params
        mock_ddb_helper.return_value = mock_ddb_instance

        mock_tools_manager_instance = MagicMock()
        mock_tools_manager_instance.load_all_tools.return_value = []
        mock_tools_manager_instance.get_tool_sources.return_value = {}
        mock_tools_manager.return_value = mock_tools_manager_instance

        mock_model_instance = MagicMock()
        mock_bedrock_model.return_value = mock_model_instance

        mock_agent_instance = MagicMock()
        mock_agent.return_value = mock_agent_instance

        # Should not raise exception
        agent = ConfigurableAgent("test-table", "test-key", "us-east-1")
        self.assertIsNotNone(agent.agent)

    @patch("configurable_agent.ToolsManager")
    @patch("configurable_agent.DynamoDBHelper")
    @patch("configurable_agent.Agent")
    @patch("configurable_agent.BedrockModel")
    def test_env_vars_legacy_format_support(
        self, mock_bedrock_model, mock_agent, mock_ddb_helper, mock_tools_manager
    ):
        """Test that legacy format (direct value without Value field) is supported"""
        # Add ModelParams with legacy format (direct value) and configure tool
        config_with_env = self.test_ddb_config.copy()
        config_with_env["AgentBuilderParams"]["Tools"] = [
            {"ToolId": "Tool"},
        ]
        config_with_env["LlmParams"]["ModelParams"] = {
            "ENV_TOOL_LEGACY_VAR": "direct-value-no-dict",
        }

        # Setup mocks
        mock_ddb_instance = MagicMock()
        mock_ddb_instance.get_config.return_value = config_with_env
        mock_ddb_helper.return_value = mock_ddb_instance

        mock_tools_manager_instance = MagicMock()
        mock_tools_manager_instance.load_all_tools.return_value = []
        mock_tools_manager_instance.get_tool_sources.return_value = {}
        mock_tools_manager.return_value = mock_tools_manager_instance

        mock_model_instance = MagicMock()
        mock_bedrock_model.return_value = mock_model_instance

        mock_agent_instance = MagicMock()
        mock_agent.return_value = mock_agent_instance

        # Clear any existing env var
        if "LEGACY_VAR" in os.environ:
            del os.environ["LEGACY_VAR"]

        agent = ConfigurableAgent("test-table", "test-key", "us-east-1")

        # Verify environment variable was set from legacy format
        self.assertEqual(os.environ.get("LEGACY_VAR"), "direct-value-no-dict")

    @patch("configurable_agent.ToolsManager")
    @patch("configurable_agent.DynamoDBHelper")
    @patch("configurable_agent.Agent")
    @patch("configurable_agent.BedrockModel")
    @patch("configurable_agent.logger")
    def test_env_vars_missing_value_field_warning(
        self, mock_logger, mock_bedrock_model, mock_agent, mock_ddb_helper, mock_tools_manager
    ):
        """Test that warning is logged when ENV_ key has dict without Value field"""
        # Add ModelParams with ENV_ prefix but missing Value field and configure tool
        config_with_env = self.test_ddb_config.copy()
        config_with_env["AgentBuilderParams"]["Tools"] = [
            {"ToolId": "Tool"},
        ]
        config_with_env["LlmParams"]["ModelParams"] = {
            "ENV_TOOL_INVALID": {"Type": "string"},  # Missing Value field
        }

        # Setup mocks
        mock_ddb_instance = MagicMock()
        mock_ddb_instance.get_config.return_value = config_with_env
        mock_ddb_helper.return_value = mock_ddb_instance

        mock_tools_manager_instance = MagicMock()
        mock_tools_manager_instance.load_all_tools.return_value = []
        mock_tools_manager_instance.get_tool_sources.return_value = {}
        mock_tools_manager.return_value = mock_tools_manager_instance

        mock_model_instance = MagicMock()
        mock_bedrock_model.return_value = mock_model_instance

        mock_agent_instance = MagicMock()
        mock_agent.return_value = mock_agent_instance

        agent = ConfigurableAgent("test-table", "test-key", "us-east-1")

        # Verify warning was logged
        warning_calls = [
            call
            for call in mock_logger.warning.call_args_list
            if "ENV_ prefix but missing 'Value' field" in str(call)
        ]
        self.assertEqual(len(warning_calls), 1)
        self.assertIn("ENV_TOOL_INVALID", str(warning_calls[0]))

    @patch("configurable_agent.ToolsManager")
    @patch("configurable_agent.DynamoDBHelper")
    @patch("configurable_agent.Agent")
    @patch("configurable_agent.BedrockModel")
    def test_memory_enabled_with_session_manager(
        self, mock_bedrock_model, mock_agent, mock_ddb_helper, mock_tools_manager
    ):
        """Test agent creation with memory enabled and session manager available"""
        # Setup mocks
        mock_ddb_instance = MagicMock()
        mock_ddb_instance.get_config.return_value = self.test_ddb_config
        mock_ddb_helper.return_value = mock_ddb_instance

        mock_tools_manager_instance = MagicMock()
        mock_tools_manager_instance.load_all_tools.return_value = []
        mock_tools_manager_instance.get_tool_sources.return_value = {}
        mock_tools_manager.return_value = mock_tools_manager_instance

        mock_model_instance = MagicMock()
        mock_bedrock_model.return_value = mock_model_instance

        mock_agent_instance = MagicMock()
        mock_agent.return_value = mock_agent_instance

        mock_session_manager = MagicMock()


        agent = ConfigurableAgent("test-table", "test-key", "us-east-1", mock_session_manager)

        # Verify Agent was called with session_manager
        mock_agent.assert_called_once()
        call_kwargs = mock_agent.call_args[1]
        self.assertIn("session_manager", call_kwargs)
        self.assertEqual(call_kwargs["session_manager"], mock_session_manager)

    @patch("configurable_agent.ToolsManager")
    @patch("configurable_agent.DynamoDBHelper")
    @patch("configurable_agent.Agent")
    @patch("configurable_agent.BedrockModel")
    def test_memory_disabled_ignores_session_manager(
        self, mock_bedrock_model, mock_agent, mock_ddb_helper, mock_tools_manager
    ):
        """Test agent creation with memory disabled ignores session manager"""
        # Disable memory in config
        config_no_memory = self.test_ddb_config.copy()
        config_no_memory["AgentBuilderParams"]["MemoryConfig"]["LongTermEnabled"] = False

        # Setup mocks
        mock_ddb_instance = MagicMock()
        mock_ddb_instance.get_config.return_value = config_no_memory
        mock_ddb_helper.return_value = mock_ddb_instance

        mock_tools_manager_instance = MagicMock()
        mock_tools_manager_instance.load_all_tools.return_value = []
        mock_tools_manager_instance.get_tool_sources.return_value = {}
        mock_tools_manager.return_value = mock_tools_manager_instance

        mock_model_instance = MagicMock()
        mock_bedrock_model.return_value = mock_model_instance

        mock_agent_instance = MagicMock()
        mock_agent.return_value = mock_agent_instance

        mock_session_manager = MagicMock()

        agent = ConfigurableAgent("test-table", "test-key", "us-east-1", mock_session_manager)

        # Verify Agent was called without session_manager
        mock_agent.assert_called_once()
        call_kwargs = mock_agent.call_args[1]
        self.assertNotIn("session_manager", call_kwargs)

    @patch("configurable_agent.ToolsManager")
    @patch("configurable_agent.DynamoDBHelper")
    @patch("configurable_agent.Agent")
    @patch("configurable_agent.BedrockModel")
    def test_custom_tools_loading(
        self, mock_bedrock_model, mock_agent, mock_ddb_helper, mock_tools_manager
    ):
        """Test loading custom tools along with built-in tools"""
        config_with_custom = self.test_ddb_config.copy()
        config_with_custom["AgentBuilderParams"]["CustomTools"] = [
            {"ToolId": "custom-s3-reader"},
            {"ToolId": "custom-calculator"},
        ]

        mock_ddb_instance = MagicMock()
        mock_ddb_instance.get_config.return_value = config_with_custom
        mock_ddb_helper.return_value = mock_ddb_instance

        # Mock ToolsManager with mixed tools
        mock_builtin_tool = MagicMock()
        mock_custom_tool1 = MagicMock()
        mock_custom_tool2 = MagicMock()
        mock_tools_manager_instance = MagicMock()
        mock_tools_manager_instance.load_all_tools.return_value = [
            mock_builtin_tool,
            mock_custom_tool1,
            mock_custom_tool2,
        ]
        mock_tools_manager_instance.get_tool_sources.return_value = {
            "http_request": "Strands",
            "custom_s3_reader": "Custom",
            "custom_calculator": "Custom",
        }
        mock_tools_manager.return_value = mock_tools_manager_instance

        mock_model_instance = MagicMock()
        mock_bedrock_model.return_value = mock_model_instance

        mock_agent_instance = MagicMock()
        mock_agent.return_value = mock_agent_instance

        agent = ConfigurableAgent("test-table", "test-key", "us-east-1")

        # Verify ToolsManager.load_all_tools was called with custom tools
        mock_tools_manager_instance.load_all_tools.assert_called_once_with(
            mcp_servers=[],
            strands_tool_ids=["HTTP Request", "File Operations"],
            custom_tool_ids=["custom-s3-reader", "custom-calculator"],
        )

        # Verify all tools were loaded
        self.assertEqual(len(agent.loaded_tools), 3)

    @patch("configurable_agent.ToolsManager")
    @patch("configurable_agent.DynamoDBHelper")
    @patch("configurable_agent.Agent")
    @patch("configurable_agent.BedrockModel")
    def test_cross_region_inference_profile_detection(
        self, mock_bedrock_model, mock_agent, mock_ddb_helper, mock_tools_manager
    ):
        """Test detection and logging of cross-region inference profiles"""
        # Create config with cross-region inference profile
        config_cross_region = self.test_ddb_config.copy()
        config_cross_region["LlmParams"]["BedrockLlmParams"][
            "ModelId"
        ] = "us.anthropic.claude-3-5-sonnet-20241022-v2:0"

        # Setup mocks
        mock_ddb_instance = MagicMock()
        mock_ddb_instance.get_config.return_value = config_cross_region
        mock_ddb_helper.return_value = mock_ddb_instance

        mock_tools_manager_instance = MagicMock()
        mock_tools_manager_instance.load_all_tools.return_value = []
        mock_tools_manager_instance.get_tool_sources.return_value = {}
        mock_tools_manager.return_value = mock_tools_manager_instance

        mock_model_instance = MagicMock()
        mock_bedrock_model.return_value = mock_model_instance

        mock_agent_instance = MagicMock()
        mock_agent.return_value = mock_agent_instance

        with patch("configurable_agent.logger") as mock_logger:
            agent = ConfigurableAgent("test-table", "test-key", "us-east-1")

            # Verify cross-region profile was detected and logged
            cross_region_log_calls = [
                call
                for call in mock_logger.info.call_args_list
                if "Detected cross-region inference profile" in str(call)
            ]
            self.assertEqual(len(cross_region_log_calls), 1)
            self.assertIn(
                "us.anthropic.claude-3-5-sonnet-20241022-v2:0", str(cross_region_log_calls[0])
            )

    @patch("configurable_agent.ToolsManager")
    @patch("configurable_agent.DynamoDBHelper")
    @patch("configurable_agent.Agent")
    @patch("configurable_agent.BedrockModel")
    def test_session_manager_parameter(
        self, mock_bedrock_model, mock_agent, mock_ddb_helper, mock_tools_manager
    ):
        """Test that session_id parameter is stored correctly"""
        mock_ddb_instance = MagicMock()
        mock_ddb_instance.get_config.return_value = self.test_ddb_config
        mock_ddb_helper.return_value = mock_ddb_instance

        mock_tools_manager_instance = MagicMock()
        mock_tools_manager_instance.load_all_tools.return_value = []
        mock_tools_manager_instance.get_tool_sources.return_value = {}
        mock_tools_manager.return_value = mock_tools_manager_instance

        mock_model_instance = MagicMock()
        mock_bedrock_model.return_value = mock_model_instance

        mock_agent_instance = MagicMock()
        mock_agent.return_value = mock_agent_instance

        mock_session_manager = MagicMock()

        agent = ConfigurableAgent(
            "test-table",
            "test-key",
            "us-east-1",
            session_manager=mock_session_manager,
        )

        # Verify session_manager is stored
        self.assertEqual(agent.session_manager, mock_session_manager)

    @patch("configurable_agent.DynamoDBHelper")
    def test_ddb_connection_error_handling(self, mock_ddb_helper):
        """Test error handling when DynamoDB connection fails"""
        mock_ddb_instance = MagicMock()
        mock_ddb_instance.get_config.side_effect = Exception("DynamoDB connection failed")
        mock_ddb_helper.return_value = mock_ddb_instance

        with self.assertRaises(Exception) as context:
            ConfigurableAgent("test-table", "test-key", "us-east-1")

        self.assertIn("DynamoDB connection failed", str(context.exception))

    @patch("configurable_agent.ToolsManager")
    @patch("configurable_agent.DynamoDBHelper")
    @patch("configurable_agent.BedrockModel")
    def test_model_creation_error_handling(
        self, mock_bedrock_model, mock_ddb_helper, mock_tools_manager
    ):
        """Test error handling when model creation fails"""
        mock_ddb_instance = MagicMock()
        mock_ddb_instance.get_config.return_value = self.test_ddb_config
        mock_ddb_helper.return_value = mock_ddb_instance

        mock_tools_manager_instance = MagicMock()
        mock_tools_manager_instance.load_all_tools.return_value = []
        mock_tools_manager_instance.get_tool_sources.return_value = {}
        mock_tools_manager.return_value = mock_tools_manager_instance

        mock_bedrock_model.side_effect = Exception("Model creation failed")

        with self.assertRaises(Exception) as context:
            ConfigurableAgent("test-table", "test-key", "us-east-1")

        self.assertIn("Model creation failed", str(context.exception))

    @patch("configurable_agent.ToolsManager")
    @patch("configurable_agent.DynamoDBHelper")
    @patch("configurable_agent.Agent")
    @patch("configurable_agent.BedrockModel")
    def test_get_methods_error_handling(
        self, mock_bedrock_model, mock_agent, mock_ddb_helper, mock_tools_manager
    ):
        """Test error handling in get_agent and get_config methods"""
        # Create agent instance without proper initialization
        agent = ConfigurableAgent.__new__(ConfigurableAgent)
        agent.agent = None
        agent.config = None

        with self.assertRaises(ValueError) as context:
            agent.get_agent()
        self.assertIn("Agent not initialized", str(context.exception))

        with self.assertRaises(ValueError) as context:
            agent.get_config()
        self.assertIn("Configuration not loaded", str(context.exception))

    @patch("configurable_agent.ToolsManager")
    @patch("configurable_agent.DynamoDBHelper")
    @patch("configurable_agent.Agent")
    @patch("configurable_agent.BedrockModel")
    def test_comprehensive_tool_configuration(
        self, mock_bedrock_model, mock_agent, mock_ddb_helper, mock_tools_manager
    ):
        """Test comprehensive tool configuration with all tool types"""
        # Create config with all tool types
        comprehensive_config = self.test_ddb_config.copy()
        comprehensive_config["AgentBuilderParams"]["Tools"] = [
            {"ToolId": "HTTP Request"},
            {"ToolId": "File Operations"},
        ]
        comprehensive_config["AgentBuilderParams"]["CustomTools"] = [
            {"ToolId": "custom-s3-reader"},
            {"ToolId": "custom-database"},
        ]
        comprehensive_config["AgentBuilderParams"]["MCPServers"] = [
            {
                "UseCaseId": "gateway-calendar",
                "Url": "https://gateway.example.com/calendar",
                "Type": "gateway",
            },
            {
                "UseCaseId": "runtime-weather",
                "Url": "https://runtime.example.com/weather",
                "Type": "runtime",
            },
        ]

        mock_ddb_instance = MagicMock()
        mock_ddb_instance.get_config.return_value = comprehensive_config
        mock_ddb_helper.return_value = mock_ddb_instance

        mock_tools = [MagicMock() for _ in range(6)]  # 2 built-in + 2 custom + 2 MCP
        mock_tools_manager_instance = MagicMock()
        mock_tools_manager_instance.load_all_tools.return_value = mock_tools
        mock_tools_manager_instance.get_tool_sources.return_value = {
            "http_request": "Strands",
            "file_operations": "Strands",
            "custom_s3_reader": "Custom",
            "custom_database": "Custom",
            "get_calendar_events": "MCP-Gateway",
            "get_weather": "MCP-Runtime",
        }
        mock_tools_manager.return_value = mock_tools_manager_instance

        mock_model_instance = MagicMock()
        mock_bedrock_model.return_value = mock_model_instance

        mock_agent_instance = MagicMock()
        mock_agent.return_value = mock_agent_instance

        agent = ConfigurableAgent("test-table", "test-key", "us-east-1")

        mock_tools_manager_instance.load_all_tools.assert_called_once_with(
            mcp_servers=[
                {
                    "use_case_id": "gateway-calendar",
                    "url": "https://gateway.example.com/calendar",
                    "type": "gateway",
                },
                {
                    "use_case_id": "runtime-weather",
                    "url": "https://runtime.example.com/weather",
                    "type": "runtime",
                },
            ],
            strands_tool_ids=["HTTP Request", "File Operations"],
            custom_tool_ids=["custom-s3-reader", "custom-database"],
        )

        self.assertEqual(len(agent.loaded_tools), 6)
        self.assertEqual(agent.loaded_tools, mock_tools)


if __name__ == "__main__":
    unittest.main()
