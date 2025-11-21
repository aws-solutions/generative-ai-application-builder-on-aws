# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

"""
Shared test fixtures and configuration
"""

import pytest
import os
from unittest.mock import Mock, patch


@pytest.fixture(autouse=True)
def mock_environment():
    """Mock environment variables for all tests"""
    with patch.dict(
        os.environ,
        {
            "AWS_REGION": "us-east-1",
            "M2M_IDENTITY_NAME": "test-m2m-identity-provider",
            "USE_CASE_TABLE_NAME": "test-table",
            "USE_CASE_CONFIG_KEY": "test-key",
            "AWS_SDK_USER_AGENT": '{"user_agent_extra": "test-agent"}',
        },
        clear=False,
    ):
        yield


@pytest.fixture(autouse=True)
def mock_requires_access_token():
    """Mock the requires_access_token decorator for all tests"""
    # Mock at the source - bedrock_agentcore.identity.auth
    with patch("bedrock_agentcore.identity.auth.requires_access_token", lambda **kwargs: lambda func: func):
        yield


@pytest.fixture(autouse=True)
def clear_tool_events():
    """Clear tool events before each test"""
    from gaab_strands_common.tool_wrapper import ToolEventEmitter

    ToolEventEmitter.clear()
    yield
    ToolEventEmitter.clear()


@pytest.fixture
def mock_bedrock_model():
    """Mock BedrockModel for testing"""
    with patch("gaab_strands_common.base_agent.BedrockModel") as mock:
        yield mock


@pytest.fixture
def sample_agent_config():
    """Sample agent configuration for testing"""
    return {
        "UseCaseName": "TestAgent",
        "UseCaseType": "Agent",
        "AgentBuilderParams": {
            "SystemPrompt": "You are a helpful assistant",
            "Tools": [{"ToolId": "web-search"}],
            "MCPServers": [{"McpId": "mcp-1"}],
            "MemoryConfig": {"LongTermEnabled": False},
        },
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


@pytest.fixture
def sample_workflow_config():
    """Sample workflow configuration for testing"""
    return {
        "WorkflowType": "agents-as-tools",
        "WorkflowParams": {
            "AgentsAsToolsParams": {
                "Agents": [
                    {
                        "AgentParams": {
                            "SystemPrompt": "You are a specialist",
                            "Tools": [],
                            "MCPServers": [{"McpId": "mcp-1"}],
                        }
                    }
                ]
            }
        },
    }


@pytest.fixture
def sample_mcp_config():
    """Sample MCP server configuration for testing"""
    return {
        "UseCaseName": "TestMCP",
        "UseCaseType": "MCPServer",
        "MCPParams": {
            "GatewayParams": {
                "GatewayUrl": "https://api.example.com",
                "GatewayArn": "arn:aws:execute-api:us-east-1:123456789012:abc123",
                "GatewayId": "abc123",
                "GatewayName": "TestGateway",
                "TargetParams": [],
            }
        },
    }


@pytest.fixture
def mock_strands_agent():
    """Mock Strands agent for testing"""
    agent = Mock()
    agent.name = "test_agent"

    async def mock_stream(message):
        yield Mock(data="Hello")
        yield Mock(data="World")

    agent.stream_async = Mock(return_value=mock_stream(None))
    agent.return_value = "Non-streaming response"
    return agent
