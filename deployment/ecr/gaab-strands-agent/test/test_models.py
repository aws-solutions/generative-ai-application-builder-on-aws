# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

#!/usr/bin/env python3
"""
Unit tests for auto-parsing Pydantic models
"""

import copy
import os
import sys
import unittest

from pydantic import ValidationError

# Add src directory to path for imports
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "src"))

from gaab_strands_common.models import (
    AgentBuilderParams,
    BedrockLlmParams,
    GatewayMCPParams,
    LlmParams,
    MCPParams,
    MCPServerConfig,
    MCPServerReference,
    MemoryConfig,
    RuntimeMCPParams,
    StrandsToolReference,
)
from gaab_strands_common.models import (
    UseCaseConfig as AgentConfig,
)  # Alias for backward compatibility in tests


class TestAutoParsing(unittest.TestCase):
    """Test auto-parsing models with real DDB structure"""

    def setUp(self):
        """Set up test data"""
        self.full_config = {
            "UseCaseName": "Test Agent",
            "UseCaseType": "AgentBuilder",
            "AgentBuilderParams": {
                "SystemPrompt": "You are a helpful AI assistant.",
                "Tools": [
                    {"ToolId": "HTTP Request"},
                    {"ToolId": "File Operations"},
                    {"ToolId": "JSON Parser"},
                ],
                "MemoryConfig": {"LongTermEnabled": True},
            },
            "LlmParams": {
                "BedrockLlmParams": {
                    "ModelId": "amazon.nova-lite-v1:0",
                    "BedrockInferenceType": "QUICK_START",
                    "GuardrailIdentifier": "test-guardrail",
                    "GuardrailVersion": "1",
                },
                "ModelProvider": "Bedrock",
                "Temperature": 0.7,
                "Streaming": True,
                "Verbose": False,
                "ModelParams": {"custom_param": "value"},
            },
        }

        self.minimal_config = {
            "UseCaseName": "Minimal Agent",
            "UseCaseType": "AgentBuilder",
            "AgentBuilderParams": {"SystemPrompt": "You are minimal."},
            "LlmParams": {
                "BedrockLlmParams": {"ModelId": "amazon.nova-lite-v1:0"},
                "ModelProvider": "Bedrock",
                "Temperature": 0.5,
            },
        }

        self.real_ddb_config = {
            "AgentBuilderParams": {
                "MemoryConfig": {"LongTermEnabled": True},
                "SystemPrompt": "You are a helpful AI assistant.",
                "Tools": [
                    {"ToolId": "HTTP Request"},
                    {"ToolId": "File Operations"},
                    {"ToolId": "JSON Parser"},
                    {"ToolId": "Text Processing"},
                    {"ToolId": "Date/Time Utils"},
                    {"ToolId": "Math Operations"},
                ],
            },
            "LlmParams": {
                "BedrockLlmParams": {
                    "BedrockInferenceType": "QUICK_START",
                    "ModelId": "amazon.nova-lite-v1:0",
                },
                "ModelParams": {},
                "ModelProvider": "Bedrock",
                "Streaming": True,
                "Temperature": 0.1,
                "Verbose": False,
            },
            "UseCaseName": "ag-test-1",
            "UseCaseType": "AgentBuilder",
        }

        self.inference_profile_config = {
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

        self.provisioned_config = {
            "UseCaseName": "Provisioned Model Agent",
            "UseCaseType": "AgentBuilder",
            "AgentBuilderParams": {"SystemPrompt": "You are a helpful AI assistant."},
            "LlmParams": {
                "BedrockLlmParams": {
                    "BedrockInferenceType": "PROVISIONED",
                    "ModelArn": "arn:aws:bedrock:us-east-1:123456789012:provisioned-model/abcdef123456",
                },
                "ModelProvider": "Bedrock",
                "Temperature": 0.3,
            },
        }

    def test_full_config_parsing(self):
        """Test full config with all fields"""
        config = AgentConfig.from_ddb_config(self.full_config)

        # Test top level
        self.assertEqual(config.use_case_name, "Test Agent")
        self.assertEqual(config.use_case_type, "AgentBuilder")

        # Test agent params
        self.assertEqual(
            config.agent_builder_params.system_prompt, "You are a helpful AI assistant."
        )
        self.assertEqual(len(config.agent_builder_params.tools), 3)
        # Tools are now StrandsToolReference objects
        tool_ids = config.agent_builder_params.get_tool_ids()
        self.assertEqual(tool_ids, ["HTTP Request", "File Operations", "JSON Parser"])
        self.assertTrue(config.agent_builder_params.memory_config.long_term_enabled)

        # Test LLM params
        self.assertEqual(config.llm_params.model_provider, "Bedrock")
        self.assertEqual(config.llm_params.temperature, 0.7)
        self.assertTrue(config.llm_params.streaming)
        self.assertFalse(config.llm_params.verbose)

        # Test Bedrock params
        self.assertEqual(
            config.llm_params.bedrock_llm_params.model_identifier, "amazon.nova-lite-v1:0"
        )
        self.assertEqual(config.llm_params.bedrock_llm_params.bedrock_inference_type, "QUICK_START")
        self.assertEqual(
            config.llm_params.bedrock_llm_params.guardrail_identifier, "test-guardrail"
        )
        self.assertEqual(config.llm_params.bedrock_llm_params.guardrail_version, "1")
        # Test model identifier property

    def test_minimal_config_parsing(self):
        """Test minimal config with defaults"""
        config = AgentConfig.from_ddb_config(self.minimal_config)

        self.assertEqual(config.use_case_name, "Minimal Agent")
        self.assertEqual(config.agent_builder_params.system_prompt, "You are minimal.")
        self.assertEqual(config.agent_builder_params.get_tool_ids(), [])  # Default empty list
        self.assertFalse(
            config.agent_builder_params.memory_config.long_term_enabled
        )  # Default False
        self.assertEqual(config.llm_params.temperature, 0.5)
        self.assertTrue(config.llm_params.streaming)  # Default True
        self.assertFalse(config.llm_params.verbose)  # Default False
        self.assertIsNone(config.llm_params.bedrock_llm_params.guardrail_identifier)  # Default None

    def test_real_ddb_config(self):
        """Test with actual DDB config structure"""
        config = AgentConfig.from_ddb_config(self.real_ddb_config)

        self.assertEqual(config.use_case_name, "ag-test-1")
        self.assertEqual(len(config.agent_builder_params.tools), 6)
        self.assertEqual(config.llm_params.temperature, 0.1)
        self.assertTrue(config.llm_params.streaming)
        self.assertFalse(config.llm_params.verbose)
        self.assertEqual(config.llm_params.bedrock_llm_params.bedrock_inference_type, "QUICK_START")

    def test_tools_parsing(self):
        """Test tools list parsing from DDB format"""
        config = AgentConfig.from_ddb_config(self.full_config)
        expected_tools = ["HTTP Request", "File Operations", "JSON Parser"]
        self.assertEqual(config.agent_builder_params.get_tool_ids(), expected_tools)

    def test_missing_required_fields(self):
        """Test validation errors for missing required fields"""
        # Missing UseCaseName
        with self.assertRaises(ValueError):
            AgentConfig.from_ddb_config({"UseCaseType": "AgentBuilder"})
        # Missing ModelId for QUICK_START inference type
        invalid_config = copy.deepcopy(self.minimal_config)
        invalid_config["LlmParams"]["BedrockLlmParams"]["BedrockInferenceType"] = "QUICK_START"
        del invalid_config["LlmParams"]["BedrockLlmParams"]["ModelId"]
        with self.assertRaises(ValueError):
            AgentConfig.from_ddb_config(invalid_config)

    def test_type_conversion(self):
        """Test automatic type conversion"""
        config_with_string_temp = copy.deepcopy(self.minimal_config)
        config_with_string_temp["LlmParams"]["Temperature"] = "0.8"  # String instead of float

        config = AgentConfig.from_ddb_config(config_with_string_temp)
        self.assertEqual(config.llm_params.temperature, 0.8)
        self.assertIsInstance(config.llm_params.temperature, float)

    def test_nested_defaults(self):
        """Test nested object defaults work correctly"""
        config_without_memory = {
            "UseCaseName": "No Memory Agent",
            "UseCaseType": "AgentBuilder",
            "AgentBuilderParams": {"SystemPrompt": "You are simple."},
            "LlmParams": {
                "BedrockLlmParams": {"ModelId": "test-model"},
                "ModelProvider": "Bedrock",
                "Temperature": 0.5,
            },
        }

        config = AgentConfig.from_ddb_config(config_without_memory)
        self.assertFalse(config.agent_builder_params.memory_config.long_term_enabled)
        self.assertEqual(config.agent_builder_params.get_tool_ids(), [])
        self.assertEqual(config.llm_params.model_params, {})


if __name__ == "__main__":
    unittest.main()


class TestMCPModels(unittest.TestCase):
    """Test MCP-related models"""

    def setUp(self):
        """Set up test data"""
        self.minimal_config = {
            "UseCaseName": "Minimal Agent",
            "UseCaseType": "AgentBuilder",
            "AgentBuilderParams": {"SystemPrompt": "You are minimal."},
            "LlmParams": {
                "BedrockLlmParams": {"ModelId": "amazon.nova-lite-v1:0"},
                "ModelProvider": "Bedrock",
                "Temperature": 0.5,
            },
        }

        self.inference_profile_config = {
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

        self.provisioned_config = {
            "UseCaseName": "Provisioned Model Agent",
            "UseCaseType": "AgentBuilder",
            "AgentBuilderParams": {"SystemPrompt": "You are a helpful AI assistant."},
            "LlmParams": {
                "BedrockLlmParams": {
                    "BedrockInferenceType": "PROVISIONED",
                    "ModelArn": "arn:aws:bedrock:us-east-1:123456789012:provisioned-model/abcdef123456",
                },
                "ModelProvider": "Bedrock",
                "Temperature": 0.3,
            },
        }

    def test_strands_tool_reference(self):
        """Test StrandsToolReference model"""
        tool_ref = StrandsToolReference(ToolId="web_search")
        self.assertEqual(tool_ref.tool_id, "web_search")

    def test_mcp_server_reference(self):
        """Test MCPServerReference model with new structure"""
        server_ref = MCPServerReference(
            UseCaseId="gateway-google-calendar", Url="https://test.gateway.com/mcp", Type="gateway"
        )
        self.assertEqual(server_ref.use_case_id, "gateway-google-calendar")
        self.assertEqual(server_ref.url, "https://test.gateway.com/mcp")
        self.assertEqual(server_ref.type, "gateway")

    def test_mcp_server_reference_runtime(self):
        """Test MCPServerReference model with runtime type"""
        server_ref = MCPServerReference(
            UseCaseId="runtime-database-tools",
            Url="https://bedrock-agentcore.us-east-1.amazonaws.com/runtimes/test/invocations",
            Type="runtime",
        )
        self.assertEqual(server_ref.use_case_id, "runtime-database-tools")
        self.assertEqual(
            server_ref.url,
            "https://bedrock-agentcore.us-east-1.amazonaws.com/runtimes/test/invocations",
        )
        self.assertEqual(server_ref.type, "runtime")

    def test_mcp_server_reference_invalid_type(self):
        """Test MCPServerReference model with invalid type"""
        with self.assertRaises(ValidationError) as context:
            MCPServerReference(UseCaseId="test-server", Url="https://test.com", Type="invalid")
        self.assertIn("Type must be 'gateway' or 'runtime'", str(context.exception))

    def test_gateway_mcp_params(self):
        """Test GatewayMCPParams model"""
        gateway_params = GatewayMCPParams(
            GatewayUrl="https://test.gateway.com/mcp",
            GatewayArn="arn:aws:bedrock-agentcore:us-east-1:123:gateway/test",
            GatewayId="test-gateway",
            GatewayName="Test Gateway",
            TargetParams=[],
        )
        self.assertEqual(gateway_params.gateway_url, "https://test.gateway.com/mcp")
        self.assertEqual(gateway_params.gateway_id, "test-gateway")

    def test_runtime_mcp_params(self):
        """Test RuntimeMCPParams model"""
        runtime_params = RuntimeMCPParams(
            EcrUri="123.dkr.ecr.us-east-1.amazonaws.com/test:latest",
            RuntimeArn="arn:aws:bedrock-agent-runtime:us-east-1:123:agent-runtime/test",
            RuntimeUrl="https://bedrock-agent-runtime.us-east-1.amazonaws.com",
        )
        self.assertEqual(runtime_params.ecr_uri, "123.dkr.ecr.us-east-1.amazonaws.com/test:latest")
        self.assertEqual(
            runtime_params.runtime_arn,
            "arn:aws:bedrock-agent-runtime:us-east-1:123:agent-runtime/test",
        )
        self.assertEqual(
            runtime_params.runtime_url, "https://bedrock-agent-runtime.us-east-1.amazonaws.com"
        )

    def test_mcp_server_config_gateway(self):
        """Test MCPServerConfig with Gateway params"""
        config = MCPServerConfig(
            UseCaseName="TestGateway",
            UseCaseType="MCPServer",
            MCPParams={
                "GatewayParams": {
                    "GatewayUrl": "https://test.gateway.com/mcp",
                    "GatewayArn": "arn:aws:bedrock-agentcore:us-east-1:123:gateway/test",
                    "GatewayId": "test-gateway",
                    "GatewayName": "Test Gateway",
                    "TargetParams": [],
                }
            },
        )
        self.assertEqual(config.use_case_name, "TestGateway")
        self.assertEqual(config.use_case_type, "MCPServer")
        self.assertIsNotNone(config.mcp_params.gateway_params)
        self.assertIsNone(config.mcp_params.runtime_params)

    def test_mcp_server_config_runtime(self):
        """Test MCPServerConfig with Runtime params"""
        config = MCPServerConfig(
            UseCaseName="TestRuntime",
            UseCaseType="MCPServer",
            MCPParams={
                "RuntimeParams": {
                    "EcrUri": "123.dkr.ecr.us-east-1.amazonaws.com/test:latest",
                    "RuntimeArn": "arn:aws:bedrock-agent-runtime:us-east-1:123:agent-runtime/test",
                    "RuntimeUrl": "https://bedrock-agent-runtime.us-east-1.amazonaws.com",
                }
            },
        )
        self.assertEqual(config.use_case_name, "TestRuntime")
        self.assertIsNone(config.mcp_params.gateway_params)
        self.assertIsNotNone(config.mcp_params.runtime_params)
        self.assertEqual(
            config.mcp_params.runtime_params.runtime_arn,
            "arn:aws:bedrock-agent-runtime:us-east-1:123:agent-runtime/test",
        )

    def test_agent_builder_params_with_mcp_servers(self):
        """Test AgentBuilderParams with MCP servers"""
        params = AgentBuilderParams(
            SystemPrompt="Test prompt",
            Tools=[{"ToolId": "web_search"}],
            MCPServers=[
                {
                    "UseCaseId": "gateway-google-calendar",
                    "Url": "https://test.gateway.com/mcp",
                    "Type": "gateway",
                },
                {
                    "UseCaseId": "runtime-database-tools",
                    "Url": "https://bedrock-agentcore.us-east-1.amazonaws.com/runtimes/test/invocations",
                    "Type": "runtime",
                },
            ],
        )
        self.assertEqual(len(params.tools), 1)
        self.assertEqual(len(params.mcp_servers), 2)
        self.assertEqual(params.get_tool_ids(), ["web_search"])

        # Test new get_mcp_servers() method
        mcp_servers = params.get_mcp_servers()
        self.assertEqual(len(mcp_servers), 2)
        self.assertEqual(mcp_servers[0]["use_case_id"], "gateway-google-calendar")
        self.assertEqual(mcp_servers[0]["url"], "https://test.gateway.com/mcp")
        self.assertEqual(mcp_servers[0]["type"], "gateway")
        self.assertEqual(mcp_servers[1]["use_case_id"], "runtime-database-tools")
        self.assertEqual(mcp_servers[1]["type"], "runtime")

        # Test deprecated get_mcp_server_ids() method
        import logging
        from unittest.mock import patch

        with patch("gaab_strands_common.models.logger") as mock_logger:
            server_ids = params.get_mcp_server_ids()
            self.assertEqual(server_ids, ["gateway-google-calendar", "runtime-database-tools"])
            # Verify deprecation warning was logged
            mock_logger.warning.assert_called_once()
            self.assertIn("deprecated", mock_logger.warning.call_args[0][0])

    def test_agent_builder_params_backward_compatibility(self):
        """Test that old string format for tools still works"""
        # Old format with string tools
        old_format_config = {
            "UseCaseName": "Test Agent",
            "UseCaseType": "AgentBuilder",
            "AgentBuilderParams": {
                "SystemPrompt": "You are helpful.",
                "Tools": ["tool1", "tool2"],  # Old string format
            },
            "LlmParams": {
                "BedrockLlmParams": {"ModelId": "test-model"},
                "ModelProvider": "Bedrock",
                "Temperature": 0.5,
            },
        }

        config = AgentConfig.from_ddb_config(old_format_config)
        self.assertEqual(config.agent_builder_params.get_tool_ids(), ["tool1", "tool2"])

    def test_inference_profile_config(self):
        """Test inference profile configuration"""
        config = AgentConfig.from_ddb_config(self.inference_profile_config)

        bedrock_params = config.llm_params.bedrock_llm_params
        self.assertEqual(bedrock_params.bedrock_inference_type, "INFERENCE_PROFILE")
        self.assertEqual(
            bedrock_params.inference_profile_id, "us.anthropic.claude-3-7-sonnet-20250219-v1:0"
        )
        self.assertIsNone(bedrock_params.model_id)
        self.assertIsNone(bedrock_params.model_arn)
        # Test model identifier property returns inference profile ID
        self.assertEqual(
            bedrock_params.model_identifier, "us.anthropic.claude-3-7-sonnet-20250219-v1:0"
        )

    def test_provisioned_model_config(self):
        """Test provisioned model configuration"""
        config = AgentConfig.from_ddb_config(self.provisioned_config)

        bedrock_params = config.llm_params.bedrock_llm_params
        self.assertEqual(bedrock_params.bedrock_inference_type, "PROVISIONED")
        self.assertEqual(
            bedrock_params.model_arn,
            "arn:aws:bedrock:us-east-1:123456789012:provisioned-model/abcdef123456",
        )
        self.assertIsNone(bedrock_params.model_id)
        self.assertIsNone(bedrock_params.inference_profile_id)
        # Test model identifier property returns model ARN
        self.assertEqual(
            bedrock_params.model_identifier,
            "arn:aws:bedrock:us-east-1:123456789012:provisioned-model/abcdef123456",
        )

    def test_inference_type_validation_errors(self):
        """Test validation errors for incorrect inference type configurations"""
        # INFERENCE_PROFILE without InferenceProfileId
        invalid_profile_config = copy.deepcopy(self.inference_profile_config)
        del invalid_profile_config["LlmParams"]["BedrockLlmParams"]["InferenceProfileId"]
        with self.assertRaises(ValueError) as context:
            AgentConfig.from_ddb_config(invalid_profile_config)
        self.assertIn("InferenceProfileId is required", str(context.exception))

        # PROVISIONED without ModelArn
        invalid_provisioned_config = copy.deepcopy(self.provisioned_config)
        del invalid_provisioned_config["LlmParams"]["BedrockLlmParams"]["ModelArn"]
        with self.assertRaises(ValueError) as context:
            AgentConfig.from_ddb_config(invalid_provisioned_config)
        self.assertIn("ModelArn is required", str(context.exception))

        # QUICK_START without ModelId
        invalid_quick_start_config = copy.deepcopy(self.minimal_config)
        invalid_quick_start_config["LlmParams"]["BedrockLlmParams"][
            "BedrockInferenceType"
        ] = "QUICK_START"
        del invalid_quick_start_config["LlmParams"]["BedrockLlmParams"]["ModelId"]
        with self.assertRaises(ValueError) as context:
            AgentConfig.from_ddb_config(invalid_quick_start_config)
        self.assertIn("ModelId is required", str(context.exception))

        # OTHER_FOUNDATION without ModelId
        invalid_other_foundation_config = copy.deepcopy(self.minimal_config)
        invalid_other_foundation_config["LlmParams"]["BedrockLlmParams"][
            "BedrockInferenceType"
        ] = "OTHER_FOUNDATION"
        del invalid_other_foundation_config["LlmParams"]["BedrockLlmParams"]["ModelId"]
        with self.assertRaises(ValueError) as context:
            AgentConfig.from_ddb_config(invalid_other_foundation_config)
        self.assertIn("ModelId is required", str(context.exception))

    def test_tools_parsing_edge_cases(self):
        """Test edge cases for tools parsing"""
        # Test with empty tools list
        config_empty_tools = copy.deepcopy(self.minimal_config)
        config_empty_tools["AgentBuilderParams"]["Tools"] = []
        config = AgentConfig.from_ddb_config(config_empty_tools)
        self.assertEqual(config.agent_builder_params.tools, [])

        # Test with mixed tool formats (dict and string)
        config_mixed_tools = copy.deepcopy(self.minimal_config)
        config_mixed_tools["AgentBuilderParams"]["Tools"] = [
            {"ToolId": "Tool1"},
            "Tool2",
            {"ToolId": "Tool3"},
        ]
        config = AgentConfig.from_ddb_config(config_mixed_tools)
        self.assertEqual(config.agent_builder_params.get_tool_ids(), ["Tool1", "Tool2", "Tool3"])

        # Test with non-list tools (should return empty list)
        config_invalid_tools = copy.deepcopy(self.minimal_config)
        config_invalid_tools["AgentBuilderParams"]["Tools"] = "not a list"
        config = AgentConfig.from_ddb_config(config_invalid_tools)
        self.assertEqual(config.agent_builder_params.get_tool_ids(), [])

    def test_model_identifier_edge_cases(self):
        """Test model_identifier property with various inference types"""
        # Test with no inference type (should return model_id)
        bedrock_params = BedrockLlmParams(ModelId="test-model")
        self.assertEqual(bedrock_params.model_identifier, "test-model")

        # Test with unknown inference type (should return model_id)
        bedrock_params = BedrockLlmParams(ModelId="test-model", BedrockInferenceType="UNKNOWN_TYPE")
        self.assertEqual(bedrock_params.model_identifier, "test-model")

        # Test with None values
        bedrock_params = BedrockLlmParams()
        self.assertIsNone(bedrock_params.model_identifier)

    def test_individual_model_creation(self):
        """Test creating individual models directly"""
        # Test MemoryConfig
        memory_config = MemoryConfig(LongTermEnabled=True)
        self.assertTrue(memory_config.long_term_enabled)

        memory_config_default = MemoryConfig()
        self.assertFalse(memory_config_default.long_term_enabled)

        # Test AgentBuilderParams with string tools (backward compatibility)
        agent_params = AgentBuilderParams(
            SystemPrompt="Test prompt",
            Tools=["tool1", "tool2"],
            MemoryConfig={"LongTermEnabled": True},
        )
        self.assertEqual(agent_params.system_prompt, "Test prompt")
        self.assertEqual(agent_params.get_tool_ids(), ["tool1", "tool2"])
        self.assertTrue(agent_params.memory_config.long_term_enabled)

        # Test BedrockLlmParams with all fields
        bedrock_params = BedrockLlmParams(
            ModelId="test-model",
            ModelArn="test-arn",
            InferenceProfileId="test-profile",
            BedrockInferenceType="QUICK_START",
            GuardrailIdentifier="test-guardrail",
            GuardrailVersion="1",
        )
        self.assertEqual(bedrock_params.model_id, "test-model")
        self.assertEqual(bedrock_params.model_arn, "test-arn")
        self.assertEqual(bedrock_params.inference_profile_id, "test-profile")
        self.assertEqual(bedrock_params.bedrock_inference_type, "QUICK_START")
        self.assertEqual(bedrock_params.guardrail_identifier, "test-guardrail")
        self.assertEqual(bedrock_params.guardrail_version, "1")

        # Test LlmParams
        llm_params = LlmParams(
            ModelProvider="Bedrock",
            Temperature=0.5,
            Streaming=False,
            Verbose=True,
            BedrockLlmParams={"ModelId": "test-model"},
            ModelParams={"param1": "value1"},
        )
        self.assertEqual(llm_params.model_provider, "Bedrock")
        self.assertEqual(llm_params.temperature, 0.5)
        self.assertFalse(llm_params.streaming)
        self.assertTrue(llm_params.verbose)
        self.assertEqual(llm_params.model_params, {"param1": "value1"})

    def test_error_logging_in_from_ddb_config(self):
        """Test error logging in from_ddb_config method"""
        import logging
        from unittest.mock import patch

        # Test with completely invalid config that will cause parsing error
        invalid_config = {"invalid": "config"}

        with patch("gaab_strands_common.models.logger") as mock_logger:
            with self.assertRaises(ValueError) as context:
                AgentConfig.from_ddb_config(invalid_config)

            # Verify that logger.error was called
            mock_logger.error.assert_called_once()
            self.assertIn("Error parsing configuration", str(context.exception))

    def test_model_config_populate_by_name(self):
        """Test that model_config populate_by_name works correctly"""
        # Test that aliases work correctly (this is the main functionality)
        config_with_aliases = {
            "UseCaseName": "Test Agent",
            "UseCaseType": "AgentBuilder",
            "AgentBuilderParams": {"SystemPrompt": "Test prompt"},
            "LlmParams": {
                "ModelProvider": "Bedrock",
                "Temperature": 0.5,
                "BedrockLlmParams": {"ModelId": "test-model"},
            },
        }

        config = AgentConfig(**config_with_aliases)
        self.assertEqual(config.use_case_name, "Test Agent")
        self.assertEqual(config.use_case_type, "AgentBuilder")
        self.assertEqual(config.agent_builder_params.system_prompt, "Test prompt")
        self.assertEqual(config.llm_params.model_provider, "Bedrock")

    def test_bedrock_validation_error_coverage(self):
        """Test specific validation error lines for complete coverage"""

        # Test QUICK_START without ModelId - Line 1
        with self.assertRaises(ValueError) as context:
            BedrockLlmParams(BedrockInferenceType="QUICK_START", ModelId=None)
        self.assertIn("ModelId is required for inference type QUICK_START", str(context.exception))

        # Test OTHER_FOUNDATION without ModelId - Line 1
        with self.assertRaises(ValueError) as context:
            BedrockLlmParams(BedrockInferenceType="OTHER_FOUNDATION", ModelId=None)
        self.assertIn(
            "ModelId is required for inference type OTHER_FOUNDATION", str(context.exception)
        )

        # Test INFERENCE_PROFILE without InferenceProfileId - Line 2
        with self.assertRaises(ValueError) as context:
            BedrockLlmParams(BedrockInferenceType="INFERENCE_PROFILE", InferenceProfileId=None)
        self.assertIn(
            "InferenceProfileId is required for inference type INFERENCE_PROFILE",
            str(context.exception),
        )

        # Test PROVISIONED without ModelArn - Line 3
        with self.assertRaises(ValueError) as context:
            BedrockLlmParams(BedrockInferenceType="PROVISIONED", ModelArn=None)
        self.assertIn("ModelArn is required for inference type PROVISIONED", str(context.exception))

        # Test with empty string values (should also trigger validation)
        with self.assertRaises(ValueError) as context:
            BedrockLlmParams(BedrockInferenceType="QUICK_START", ModelId="")
        self.assertIn("ModelId is required for inference type QUICK_START", str(context.exception))

        with self.assertRaises(ValueError) as context:
            BedrockLlmParams(BedrockInferenceType="INFERENCE_PROFILE", InferenceProfileId="")
        self.assertIn(
            "InferenceProfileId is required for inference type INFERENCE_PROFILE",
            str(context.exception),
        )

        with self.assertRaises(ValueError) as context:
            BedrockLlmParams(BedrockInferenceType="PROVISIONED", ModelArn="")
        self.assertIn("ModelArn is required for inference type PROVISIONED", str(context.exception))

    def test_full_config_with_mcp_servers(self):
        """Test full config with both tools and MCP servers"""
        full_config = {
            "UseCaseName": "Test Agent with MCP",
            "UseCaseType": "AgentBuilder",
            "AgentBuilderParams": {
                "SystemPrompt": "You are a helpful AI assistant.",
                "Tools": [{"ToolId": "web_search"}, {"ToolId": "calculator"}],
                "MCPServers": [
                    {
                        "UseCaseId": "gateway-google-calendar",
                        "Url": "https://test.gateway.com/mcp",
                        "Type": "gateway",
                    },
                    {
                        "UseCaseId": "runtime-database-tools",
                        "Url": "https://bedrock-agentcore.us-east-1.amazonaws.com/runtimes/test/invocations",
                        "Type": "runtime",
                    },
                ],
                "MemoryConfig": {"LongTermEnabled": True},
            },
            "LlmParams": {
                "BedrockLlmParams": {"ModelId": "amazon.nova-lite-v1:0"},
                "ModelProvider": "Bedrock",
                "Temperature": 0.7,
            },
        }

        config = AgentConfig.from_ddb_config(full_config)
        self.assertEqual(config.agent_builder_params.get_tool_ids(), ["web_search", "calculator"])

        # Test new get_mcp_servers() method
        mcp_servers = config.agent_builder_params.get_mcp_servers()
        self.assertEqual(len(mcp_servers), 2)
        self.assertEqual(mcp_servers[0]["use_case_id"], "gateway-google-calendar")
        self.assertEqual(mcp_servers[0]["url"], "https://test.gateway.com/mcp")
        self.assertEqual(mcp_servers[0]["type"], "gateway")
        self.assertEqual(mcp_servers[1]["use_case_id"], "runtime-database-tools")
        self.assertEqual(mcp_servers[1]["type"], "runtime")
