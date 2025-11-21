# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

"""
Tests for data models with from_ddb_config deserialization
"""

import pytest
from gaab_strands_common.models import (
    AgentBuilderParams,
    AgentParams,
    AgentReference,
    AgentsAsToolsParams,
    BedrockLlmParams,
    CustomToolReference,
    FileReference,
    GatewayMCPParams,
    LlmParams,
    MCPParams,
    MCPServerConfig,
    MCPServerReference,
    MemoryConfig,
    MultimodalParams,
    RuntimeMCPParams,
    StrandsToolReference,
    UseCaseConfig,
    WorkflowConfig,
    WorkflowParams,
)
from pydantic import ValidationError


class TestBedrockLlmParams:
    """Tests for BedrockLlmParams model"""

    def test_quick_start_inference_type(self):
        """Test QUICK_START inference type requires ModelId"""
        params = BedrockLlmParams(ModelId="amazon.nova-pro-v1:0", BedrockInferenceType="QUICK_START")
        assert params.model_identifier == "amazon.nova-pro-v1:0"

    def test_inference_profile_type(self):
        """Test INFERENCE_PROFILE requires InferenceProfileId"""
        params = BedrockLlmParams(
            InferenceProfileId="us.anthropic.claude-3-5-sonnet-20241022-v2:0",
            BedrockInferenceType="INFERENCE_PROFILE",
        )
        assert params.model_identifier == "us.anthropic.claude-3-5-sonnet-20241022-v2:0"

    def test_provisioned_type(self):
        """Test PROVISIONED requires ModelArn"""
        params = BedrockLlmParams(
            ModelArn="arn:aws:bedrock:us-east-1:123456789012:provisioned-model/abc",
            BedrockInferenceType="PROVISIONED",
        )
        assert params.model_identifier == "arn:aws:bedrock:us-east-1:123456789012:provisioned-model/abc"

    def test_validation_fails_without_required_field(self):
        """Test validation fails when required field is missing"""
        with pytest.raises(ValidationError):
            BedrockLlmParams(BedrockInferenceType="QUICK_START")

    def test_validation_fails_inference_profile_without_id(self):
        """Test validation fails for INFERENCE_PROFILE without InferenceProfileId"""
        with pytest.raises(ValidationError):
            BedrockLlmParams(ModelId="test", BedrockInferenceType="INFERENCE_PROFILE")

    def test_validation_fails_provisioned_without_arn(self):
        """Test validation fails for PROVISIONED without ModelArn"""
        with pytest.raises(ValidationError):
            BedrockLlmParams(ModelId="test", BedrockInferenceType="PROVISIONED")


class TestLlmParams:
    """Tests for LlmParams model"""

    def test_llm_params_without_multimodal(self):
        """Test LlmParams without multimodal configuration"""
        params = LlmParams(
            ModelProvider="Bedrock",
            Temperature=0.7,
            Streaming=True,
            Verbose=False,
            BedrockLlmParams={"ModelId": "amazon.nova-pro-v1:0", "BedrockInferenceType": "QUICK_START"},
            ModelParams={},
        )
        assert params.model_provider == "Bedrock"
        assert params.temperature == 0.7
        assert params.multimodal_params is None

    def test_llm_params_with_multimodal_enabled(self):
        """Test LlmParams with multimodal enabled"""
        params = LlmParams(
            ModelProvider="Bedrock",
            Temperature=0.7,
            Streaming=True,
            Verbose=False,
            BedrockLlmParams={"ModelId": "amazon.nova-pro-v1:0", "BedrockInferenceType": "QUICK_START"},
            ModelParams={},
            MultimodalParams={"MultimodalEnabled": True},
        )
        assert params.multimodal_params is not None
        assert params.multimodal_params.multimodal_enabled is True

    def test_llm_params_with_multimodal_disabled(self):
        """Test LlmParams with multimodal explicitly disabled"""
        params = LlmParams(
            ModelProvider="Bedrock",
            Temperature=0.7,
            Streaming=True,
            Verbose=False,
            BedrockLlmParams={"ModelId": "amazon.nova-pro-v1:0", "BedrockInferenceType": "QUICK_START"},
            ModelParams={},
            MultimodalParams={"MultimodalEnabled": False},
        )
        assert params.multimodal_params is not None
        assert params.multimodal_params.multimodal_enabled is False


class TestStrandsToolReference:
    """Tests for StrandsToolReference model"""

    def test_create_tool_reference(self):
        """Test creating tool reference"""
        tool = StrandsToolReference(ToolId="web-search")
        assert tool.tool_id == "web-search"


class TestMCPServerReference:
    """Tests for MCPServerReference model"""

    def test_create_mcp_reference(self):
        """Test creating MCP server reference"""
        mcp = MCPServerReference(UseCaseId="mcp-server-1", Url="https://example.com/mcp", Type="gateway")
        assert mcp.use_case_id == "mcp-server-1"
        assert mcp.url == "https://example.com/mcp"
        assert mcp.type == "gateway"


class TestAgentBuilderParams:
    """Tests for AgentBuilderParams model"""

    def test_parse_tools_from_dicts(self):
        """Test parsing tools from dict format"""
        params = AgentBuilderParams(
            SystemPrompt="Test prompt",
            Tools=[{"ToolId": "web-search"}, {"ToolId": "calculator"}],
            MCPServers=[],
        )
        assert len(params.tools) == 2
        assert params.tools[0].tool_id == "web-search"

    def test_parse_mcp_servers_from_dicts(self):
        """Test parsing MCP servers from dict format"""
        params = AgentBuilderParams(
            SystemPrompt="Test prompt",
            Tools=[],
            MCPServers=[
                {"UseCaseId": "mcp-1", "Url": "https://example.com/mcp1", "Type": "gateway"},
                {"UseCaseId": "mcp-2", "Url": "https://example.com/mcp2", "Type": "runtime"},
            ],
        )
        assert len(params.mcp_servers) == 2
        assert params.mcp_servers[0].use_case_id == "mcp-1"
        assert params.mcp_servers[0].type == "gateway"

    def test_get_tool_ids(self):
        """Test extracting tool IDs"""
        params = AgentBuilderParams(
            SystemPrompt="Test prompt", Tools=[{"ToolId": "web-search"}, {"ToolId": "calculator"}], MCPServers=[]
        )
        tool_ids = params.get_tool_ids()
        assert tool_ids == ["web-search", "calculator"]

    def test_get_mcp_server_ids(self):
        """Test extracting MCP server IDs (deprecated method)"""
        params = AgentBuilderParams(
            SystemPrompt="Test prompt",
            Tools=[],
            MCPServers=[
                {"UseCaseId": "mcp-1", "Url": "https://example.com/mcp1", "Type": "gateway"},
                {"UseCaseId": "mcp-2", "Url": "https://example.com/mcp2", "Type": "runtime"},
            ],
        )
        mcp_ids = params.get_mcp_server_ids()
        assert mcp_ids == ["mcp-1", "mcp-2"]

    def test_get_mcp_servers(self):
        """Test extracting MCP server details"""
        params = AgentBuilderParams(
            SystemPrompt="Test prompt",
            Tools=[],
            MCPServers=[
                {"UseCaseId": "mcp-1", "Url": "https://example.com/mcp1", "Type": "gateway"},
                {"UseCaseId": "mcp-2", "Url": "https://example.com/mcp2", "Type": "runtime"},
            ],
        )
        mcp_servers = params.get_mcp_servers()
        assert len(mcp_servers) == 2
        assert mcp_servers[0] == {"use_case_id": "mcp-1", "url": "https://example.com/mcp1", "type": "gateway"}
        assert mcp_servers[1] == {"use_case_id": "mcp-2", "url": "https://example.com/mcp2", "type": "runtime"}

    def test_empty_tools_and_mcp_servers(self):
        """Test with empty tools and MCP servers"""
        params = AgentBuilderParams(SystemPrompt="Test prompt", Tools=[], MCPServers=[])
        assert len(params.tools) == 0
        assert len(params.mcp_servers) == 0


class TestUseCaseConfig:
    """Tests for UseCaseConfig model and from_ddb_config"""

    def test_from_ddb_config_success(self):
        """Test successful deserialization from DDB config"""
        ddb_config = {
            "UseCaseName": "TestAgent",
            "UseCaseType": "Agent",
            "AgentBuilderParams": {
                "SystemPrompt": "You are a helpful assistant",
                "Tools": [{"ToolId": "web-search"}],
                "MCPServers": [{"UseCaseId": "mcp-1", "Url": "https://example.com/mcp", "Type": "gateway"}],
                "MemoryConfig": {"LongTermEnabled": False},
            },
            "LlmParams": {
                "ModelProvider": "Bedrock",
                "Temperature": 1,
                "Streaming": True,
                "Verbose": False,
                "BedrockLlmParams": {
                    "ModelId": "amazon.nova-pro-v1:0",
                    "BedrockInferenceType": "QUICK_START",
                },
                "ModelParams": {},
            },
        }

        config = UseCaseConfig.from_ddb_config(ddb_config)

        assert config.use_case_name == "TestAgent"
        assert config.use_case_type == "Agent"
        assert config.agent_builder_params.system_prompt == "You are a helpful assistant"
        assert len(config.agent_builder_params.tools) == 1
        assert config.llm_params.temperature == 1

    def test_from_ddb_config_with_inference_profile(self):
        """Test deserialization with inference profile"""
        ddb_config = {
            "UseCaseName": "TestAgent",
            "UseCaseType": "Agent",
            "AgentBuilderParams": {
                "SystemPrompt": "Test",
                "Tools": [],
                "MCPServers": [],
                "MemoryConfig": {"LongTermEnabled": False},
            },
            "LlmParams": {
                "ModelProvider": "Bedrock",
                "Temperature": 0.5,
                "Streaming": True,
                "Verbose": False,
                "BedrockLlmParams": {
                    "InferenceProfileId": "us.anthropic.claude-3-5-sonnet-20241022-v2:0",
                    "BedrockInferenceType": "INFERENCE_PROFILE",
                },
                "ModelParams": {},
            },
        }

        config = UseCaseConfig.from_ddb_config(ddb_config)

        assert config.llm_params.bedrock_llm_params.model_identifier == "us.anthropic.claude-3-5-sonnet-20241022-v2:0"

    def test_from_ddb_config_invalid_data(self):
        """Test error handling for invalid config"""
        invalid_config = {"UseCaseName": "Test"}

        with pytest.raises(ValueError, match="Error parsing configuration"):
            UseCaseConfig.from_ddb_config(invalid_config)


class TestWorkflowModels:
    """Tests for workflow-specific models"""

    def test_agent_params_with_optional_fields(self):
        """Test AgentParams with optional fields"""
        params = AgentParams(
            SystemPrompt="Test prompt",
            Tools=[{"ToolId": "web-search"}],
            MCPServers=[{"UseCaseId": "mcp-1", "Url": "https://example.com/mcp", "Type": "gateway"}],
        )
        assert params.system_prompt == "Test prompt"
        assert len(params.tools) == 1
        assert len(params.mcp_servers) == 1

    def test_agent_params_minimal(self):
        """Test AgentParams with minimal fields"""
        params = AgentParams()
        assert params.system_prompt is None
        assert params.tools is None
        assert params.mcp_servers is None

    def test_agent_reference(self):
        """Test AgentReference model"""
        agent_ref = AgentReference(
            UseCaseId="test-agent-id",
            UseCaseType="AgentBuilder",
            UseCaseName="TestAgent",
            AgentBuilderParams={
                "SystemPrompt": "You are a specialist",
                "Tools": [],
                "MCPServers": [],
            },
        )
        assert agent_ref.agent_builder_params.system_prompt == "You are a specialist"
        assert agent_ref.use_case_id == "test-agent-id"

    def test_agents_as_tools_params(self):
        """Test AgentsAsToolsParams model"""
        params = AgentsAsToolsParams(
            Agents=[
                {
                    "UseCaseId": "agent-1-id",
                    "UseCaseType": "AgentBuilder",
                    "UseCaseName": "Agent1",
                    "AgentBuilderParams": {"SystemPrompt": "Agent 1"},
                },
                {
                    "UseCaseId": "agent-2-id",
                    "UseCaseType": "AgentBuilder",
                    "UseCaseName": "Agent2",
                    "AgentBuilderParams": {"SystemPrompt": "Agent 2"},
                },
            ]
        )
        assert len(params.agents) == 2
        assert params.agents[0].agent_builder_params.system_prompt == "Agent 1"

    def test_workflow_params(self):
        """Test WorkflowParams model"""
        params = WorkflowParams(
            OrchestrationPattern="agents-as-tools",
            SystemPrompt="You are a coordinator",
            AgentsAsToolsParams={
                "Agents": [
                    {
                        "UseCaseId": "agent-1-id",
                        "UseCaseType": "AgentBuilder",
                        "UseCaseName": "Agent1",
                        "AgentBuilderParams": {"SystemPrompt": "Agent 1"},
                    },
                ]
            },
        )
        assert params.orchestration_pattern == "agents-as-tools"
        assert params.system_prompt == "You are a coordinator"
        assert len(params.agents_as_tools_params.agents) == 1
        assert params.agents_as_tools_params.agents[0].agent_builder_params.system_prompt == "Agent 1"


class TestWorkflowConfig:
    """Tests for WorkflowConfig and from_ddb_config"""

    def test_from_ddb_config_success(self):
        """Test successful workflow config deserialization"""
        ddb_config = {
            "WorkflowType": "agents-as-tools",
            "WorkflowParams": {
                "OrchestrationPattern": "agents-as-tools",
                "SystemPrompt": "You are a workflow coordinator",
                "MemoryConfig": {"MaxTokens": 1000},
                "AgentsAsToolsParams": {
                    "Agents": [
                        {
                            "UseCaseId": "test-agent-id",
                            "UseCaseType": "AgentBuilder",
                            "UseCaseName": "SpecialistAgent",
                            "AgentBuilderParams": {
                                "SystemPrompt": "You are a specialist",
                                "Tools": [],
                                "MCPServers": [],
                            },
                        }
                    ]
                },
            },
        }

        config = WorkflowConfig.from_ddb_config(ddb_config)

        assert config.workflow_type == "agents-as-tools"
        assert len(config.workflow_params.agents_as_tools_params.agents) == 1
        assert (
            config.workflow_params.agents_as_tools_params.agents[0].agent_builder_params.system_prompt
            == "You are a specialist"
        )

    def test_from_ddb_config_invalid_data(self):
        """Test error handling for invalid workflow config"""
        invalid_config = {"WorkflowType": "test"}

        with pytest.raises(ValueError, match="Error parsing workflow configuration"):
            WorkflowConfig.from_ddb_config(invalid_config)


class TestMCPServerConfig:
    """Tests for MCP server configuration models"""

    def test_gateway_mcp_params(self):
        """Test Gateway MCP parameters"""
        params = GatewayMCPParams(
            GatewayUrl="https://api.example.com",
            GatewayArn="arn:aws:execute-api:us-east-1:123456789012:abc123",
            GatewayId="abc123",
            GatewayName="TestGateway",
            TargetParams=[],
        )
        assert params.gateway_url == "https://api.example.com"
        assert params.gateway_name == "TestGateway"

    def test_runtime_mcp_params(self):
        """Test Runtime MCP parameters"""
        params = RuntimeMCPParams(
            EcrUri="123456789012.dkr.ecr.us-east-1.amazonaws.com/mcp-server:latest",
            RuntimeArn="arn:aws:bedrock-agent-runtime:us-east-1:123456789012:agent-runtime/ABC123",
            RuntimeUrl="https://bedrock-agent-runtime.us-east-1.amazonaws.com",
        )
        assert params.ecr_uri == "123456789012.dkr.ecr.us-east-1.amazonaws.com/mcp-server:latest"
        assert params.runtime_arn == "arn:aws:bedrock-agent-runtime:us-east-1:123456789012:agent-runtime/ABC123"
        assert params.runtime_url == "https://bedrock-agent-runtime.us-east-1.amazonaws.com"

    def test_mcp_server_config_with_gateway(self):
        """Test MCP server config with gateway params"""
        config = MCPServerConfig(
            UseCaseName="TestMCP",
            UseCaseType="MCPServer",
            MCPParams={
                "GatewayParams": {
                    "GatewayUrl": "https://api.example.com",
                    "GatewayArn": "arn:aws:execute-api:us-east-1:123456789012:abc123",
                    "GatewayId": "abc123",
                    "GatewayName": "TestGateway",
                    "TargetParams": [],
                }
            },
        )
        assert config.use_case_name == "TestMCP"
        assert config.mcp_params.gateway_params is not None
        assert config.mcp_params.gateway_params.gateway_name == "TestGateway"

    def test_mcp_server_config_with_runtime(self):
        """Test MCP server config with runtime params"""
        config = MCPServerConfig(
            UseCaseName="TestMCP",
            UseCaseType="MCPServer",
            MCPParams={
                "RuntimeParams": {
                    "EcrUri": "123456789012.dkr.ecr.us-east-1.amazonaws.com/mcp-server:latest",
                    "RuntimeArn": "arn:aws:bedrock-agent-runtime:us-east-1:123456789012:agent-runtime/ABC123",
                    "RuntimeUrl": "https://bedrock-agent-runtime.us-east-1.amazonaws.com",
                }
            },
        )
        assert config.mcp_params.runtime_params is not None
        assert "mcp-server" in config.mcp_params.runtime_params.ecr_uri
        assert config.mcp_params.runtime_params.runtime_arn.startswith("arn:aws:bedrock-agent-runtime")


class TestMemoryConfig:
    """Tests for MemoryConfig model"""

    def test_memory_config_enabled(self):
        """Test memory config with long term enabled"""
        config = MemoryConfig(LongTermEnabled=True)
        assert config.long_term_enabled is True

    def test_memory_config_disabled(self):
        """Test memory config with long term disabled"""
        config = MemoryConfig(LongTermEnabled=False)
        assert config.long_term_enabled is False

    def test_memory_config_default(self):
        """Test memory config default value"""
        config = MemoryConfig()
        assert config.long_term_enabled is False


class TestFileReference:
    """Tests for FileReference model"""

    def test_create_file_reference(self):
        """Test creating file reference with proper field aliases"""
        file_ref = FileReference(fileReference="s3://bucket/key", fileName="document.pdf")
        assert file_ref.file_reference == "s3://bucket/key"
        assert file_ref.file_name == "document.pdf"

    def test_file_reference_field_aliases(self):
        """Test that field aliases work correctly"""
        file_ref = FileReference(**{"fileReference": "s3://bucket/key", "fileName": "document.pdf"})
        assert file_ref.file_reference == "s3://bucket/key"
        assert file_ref.file_name == "document.pdf"


class TestCustomToolReference:
    """Tests for CustomToolReference model"""

    def test_create_custom_tool_reference(self):
        """Test creating custom tool reference"""
        tool = CustomToolReference(ToolId="s3-file-reader")
        assert tool.tool_id == "s3-file-reader"

    def test_custom_tool_reference_field_alias(self):
        """Test that field alias works correctly"""
        tool = CustomToolReference(**{"ToolId": "s3-file-reader"})
        assert tool.tool_id == "s3-file-reader"


class TestAgentBuilderParamsCustomTools:
    """Additional tests for AgentBuilderParams model with custom tools"""

    def test_parse_custom_tools_from_dicts(self):
        """Test parsing custom tools from dict format"""
        params = AgentBuilderParams(
            SystemPrompt="Test prompt",
            Tools=[],
            CustomTools=[{"ToolId": "s3-file-reader"}, {"ToolId": "database-query"}],
            MCPServers=[],
        )
        assert len(params.custom_tools) == 2
        assert params.custom_tools[0].tool_id == "s3-file-reader"
        assert params.custom_tools[1].tool_id == "database-query"

    def test_get_custom_tool_ids(self):
        """Test extracting custom tool IDs"""
        params = AgentBuilderParams(
            SystemPrompt="Test prompt",
            Tools=[],
            CustomTools=[{"ToolId": "s3-file-reader"}, {"ToolId": "database-query"}],
            MCPServers=[],
        )
        custom_tool_ids = params.get_custom_tool_ids()
        assert custom_tool_ids == ["s3-file-reader", "database-query"]

    def test_empty_custom_tools(self):
        """Test with empty custom tools"""
        params = AgentBuilderParams(SystemPrompt="Test prompt", Tools=[], CustomTools=[], MCPServers=[])
        assert len(params.custom_tools) == 0
        assert params.get_custom_tool_ids() == []

    def test_mixed_tools(self):
        """Test with both built-in and custom tools"""
        params = AgentBuilderParams(
            SystemPrompt="Test prompt",
            Tools=[{"ToolId": "web-search"}],
            CustomTools=[{"ToolId": "s3-file-reader"}],
            MCPServers=[],
        )
        assert len(params.tools) == 1
        assert len(params.custom_tools) == 1
        assert params.get_tool_ids() == ["web-search"]
        assert params.get_custom_tool_ids() == ["s3-file-reader"]
