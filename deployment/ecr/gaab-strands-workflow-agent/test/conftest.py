# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

"""
Shared test fixtures for workflow agent tests
"""

import os
from unittest.mock import Mock, patch

import pytest


@pytest.fixture(autouse=True)
def mock_environment():
    """Mock environment variables for all tests"""
    with patch.dict(
        os.environ,
        {
            "AWS_REGION": "us-east-1",
            "AWS_SDK_USER_AGENT": '{"user_agent_extra": "test-agent"}',
        },
        clear=False,
    ):
        yield


@pytest.fixture
def sample_workflow_config_dict():
    """Sample workflow configuration dictionary"""
    return {
        "UseCaseName": "Test Workflow",
        "UseCaseType": "Workflow",
        "WorkflowParams": {
            "SystemPrompt": "You are a workflow coordinator",
            "OrchestrationPattern": "agents-as-tools",
            "AgentsAsToolsParams": {
                "Agents": [
                    {
                        "UseCaseId": "test-agent-id",
                        "UseCaseType": "AgentBuilder",
                        "UseCaseName": "SpecializedAgent1",
                        "UseCaseDescription": "A specialized agent for testing",
                        "AgentBuilderParams": {
                            "SystemPrompt": "You are a specialized agent",
                            "Tools": [],
                            "MCPServers": [],
                            "CustomTools": [{"ToolId": "web_search"}],
                            "MemoryConfig": {"LongTermEnabled": False},
                        },
                        "LlmParams": {
                            "ModelProvider": "Bedrock",
                            "Temperature": 0.5,
                            "Streaming": True,
                            "Verbose": False,
                            "BedrockLlmParams": {
                                "ModelId": "anthropic.claude-3-5-sonnet-20240620-v1:0",
                                "BedrockInferenceType": "QUICK_START",
                            },
                            "ModelParams": {},
                        },
                    }
                ]
            },
            "CustomTools": [],
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
def sample_agent_full_config_dict():
    """Sample full agent configuration dictionary"""
    return {
        "UseCaseName": "FullAgent",
        "UseCaseId": "test-agent-id",
        "UseCaseType": "AgentBuilder",
        "AgentBuilderParams": {
            "SystemPrompt": "You are a full agent",
            "Tools": [],
            "MCPServers": [{"McpId": "mcp-1"}],
            "MemoryConfig": {"LongTermEnabled": False},
        },
        "LlmParams": {
            "ModelProvider": "Bedrock",
            "Temperature": 0.8,
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
def multimodal_custom_tools_config():
    """Comprehensive workflow configuration with multimodal, custom tools, and multiple agents"""
    return {
        "UseCaseName": "Comprehensive Workflow",
        "UseCaseType": "Workflow",
        "WorkflowParams": {
            "SystemPrompt": "You are a comprehensive workflow coordinator",
            "OrchestrationPattern": "agents-as-tools",
            "AgentsAsToolsParams": {
                "Agents": [
                    {
                        "UseCaseId": "agent-1-id",
                        "UseCaseType": "AgentBuilder",
                        "UseCaseName": "DataAnalysisAgent",
                        "UseCaseDescription": "Specialized in data analysis",
                        "AgentBuilderParams": {
                            "SystemPrompt": "You are a data analysis specialist",
                            "Tools": [{"ToolId": "current_time"}],
                            "MCPServers": [],
                            "CustomTools": [{"ToolId": "data_processor"}],
                            "MemoryConfig": {"LongTermEnabled": False},
                        },
                        "LlmParams": {
                            "ModelProvider": "Bedrock",
                            "Temperature": 0.3,
                            "Streaming": True,
                            "Verbose": False,
                            "BedrockLlmParams": {
                                "ModelId": "anthropic.claude-3-5-sonnet-20240620-v1:0",
                                "BedrockInferenceType": "QUICK_START",
                            },
                            "ModelParams": {},
                            "MultimodalParams": {
                                "MultimodalEnabled": False
                            },  # Agent level disabled
                        },
                    },
                    {
                        "UseCaseId": "agent-2-id",
                        "UseCaseType": "AgentBuilder",
                        "UseCaseName": "ReportGeneratorAgent",
                        "UseCaseDescription": "Specialized in report generation",
                        "AgentBuilderParams": {
                            "SystemPrompt": "You are a report generation specialist",
                            "Tools": [{"ToolId": "environment"}],
                            "MCPServers": [],
                            "CustomTools": [{"ToolId": "report_formatter"}],
                            "MemoryConfig": {"LongTermEnabled": False},
                        },
                        "LlmParams": {
                            "ModelProvider": "Bedrock",
                            "Temperature": 0.7,
                            "Streaming": True,
                            "Verbose": True,
                            "BedrockLlmParams": {
                                "ModelId": "amazon.nova-pro-v1:0",
                                "BedrockInferenceType": "QUICK_START",
                            },
                            "ModelParams": {},
                            "MultimodalParams": {
                                "MultimodalEnabled": False
                            },  # Agent level disabled
                        },
                    },
                ]
            },
            "CustomTools": [{"ToolId": "workflow_orchestrator"}],  # 1 workflow-level custom tool
        },
        "LlmParams": {
            "ModelProvider": "Bedrock",
            "Temperature": 0.5,
            "Streaming": True,
            "Verbose": False,
            "BedrockLlmParams": {
                "ModelId": "amazon.nova-pro-v1:0",
                "BedrockInferenceType": "QUICK_START",
            },
            "ModelParams": {},
            "MultimodalParams": {"MultimodalEnabled": True},  # Workflow level multimodal enabled
        },
    }
