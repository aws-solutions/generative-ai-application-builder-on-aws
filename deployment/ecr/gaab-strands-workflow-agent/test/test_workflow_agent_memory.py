# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

"""
Tests for WorkflowAgent memory functionality
"""

import os
import sys
from unittest.mock import Mock, patch

# Add src to path for imports
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "src"))

from workflow_agent import WorkflowAgent


class TestWorkflowAgentMemory:
    """Test memory functionality in WorkflowAgent"""

    @patch('workflow_agent.DynamoDBHelper')
    @patch('workflow_agent.AgentsLoader')
    def test_workflow_agent_with_memory_enabled(self, mock_agents_loader, mock_ddb_helper):
        """Test workflow agent initialization with memory enabled"""
        
        # Mock DynamoDB configuration
        mock_config_dict = {
            "UseCaseType": "Workflow",
            "UseCaseName": "Test Workflow",
            "LlmParams": {
                "ModelProvider": "Bedrock",
                "BedrockLlmParams": {
                    "ModelId": "anthropic.claude-3-sonnet-20240229-v1:0"
                },
                "Temperature": 0.7,
                "Streaming": True
            },
            "WorkflowParams": {
                "OrchestrationPattern": "agents-as-tools",
                "SystemPrompt": "You are a helpful assistant",
                "MemoryConfig": {
                    "LongTermEnabled": True
                },
                "AgentsAsToolsParams": {
                    "Agents": [{
                        "AgentId": "test-agent-1",
                        "AgentName": "TestAgent1",
                        "UseCaseId": "test-use-case-1",
                        "UseCaseType": "RAG",
                        "UseCaseName": "Test Agent",
                        "AgentBuilderParams": {
                            "SystemPrompt": "You are a test agent",
                            "Tools": []
                        }
                    }]
                }
            }
        }
        
        mock_ddb_helper_instance = Mock()
        mock_ddb_helper_instance.get_config.return_value = mock_config_dict
        mock_ddb_helper.return_value = mock_ddb_helper_instance
        
        # Mock agents loader
        mock_agents_loader_instance = Mock()
        mock_agents_loader_instance.load_agents.return_value = []
        mock_agents_loader.return_value = mock_agents_loader_instance
        
        # Mock session manager
        mock_session_manager = Mock()
        
        # Create workflow agent with memory
        with patch('workflow_agent.Agent') as mock_agent_class:
            mock_agent_instance = Mock()
            mock_agent_class.return_value = mock_agent_instance
            
            workflow_agent = WorkflowAgent(
                table_name="test-table",
                config_key="test-key", 
                region="us-east-1",
                session_manager=mock_session_manager
            )
            
            # Verify session manager was stored
            assert workflow_agent.session_manager == mock_session_manager
            
            # Verify agent was created with session manager
            mock_agent_class.assert_called_once()
            call_args = mock_agent_class.call_args
            assert "session_manager" in call_args.kwargs
            assert call_args.kwargs["session_manager"] == mock_session_manager

    @patch('workflow_agent.DynamoDBHelper')
    @patch('workflow_agent.AgentsLoader')
    def test_workflow_agent_with_memory_disabled(self, mock_agents_loader, mock_ddb_helper):
        """Test workflow agent initialization with memory disabled"""
        
        # Mock DynamoDB configuration with memory disabled
        mock_config_dict = {
            "UseCaseType": "Workflow",
            "UseCaseName": "Test Workflow",
            "LlmParams": {
                "ModelProvider": "Bedrock",
                "BedrockLlmParams": {
                    "ModelId": "anthropic.claude-3-sonnet-20240229-v1:0"
                },
                "Temperature": 0.7,
                "Streaming": True
            },
            "WorkflowParams": {
                "OrchestrationPattern": "agents-as-tools",
                "SystemPrompt": "You are a helpful assistant",
                "MemoryConfig": {
                    "LongTermEnabled": False
                },
                "AgentsAsToolsParams": {
                    "Agents": [{
                        "AgentId": "test-agent-1",
                        "AgentName": "TestAgent1",
                        "UseCaseId": "test-use-case-1",
                        "UseCaseType": "RAG",
                        "UseCaseName": "Test Agent",
                        "AgentBuilderParams": {
                            "SystemPrompt": "You are a test agent",
                            "Tools": []
                        }
                    }]
                }
            }
        }
        
        mock_ddb_helper_instance = Mock()
        mock_ddb_helper_instance.get_config.return_value = mock_config_dict
        mock_ddb_helper.return_value = mock_ddb_helper_instance
        
        # Mock agents loader
        mock_agents_loader_instance = Mock()
        mock_agents_loader_instance.load_agents.return_value = []
        mock_agents_loader.return_value = mock_agents_loader_instance
        
        # Mock session manager
        mock_session_manager = Mock()
        
        # Create workflow agent with memory disabled
        with patch('workflow_agent.Agent') as mock_agent_class:
            mock_agent_instance = Mock()
            mock_agent_class.return_value = mock_agent_instance
            
            workflow_agent = WorkflowAgent(
                table_name="test-table",
                config_key="test-key", 
                region="us-east-1",
                session_manager=mock_session_manager
            )
            
            # Verify session manager was stored but not used
            assert workflow_agent.session_manager == mock_session_manager
            
            # Verify agent was created without session manager
            mock_agent_class.assert_called_once()
            call_args = mock_agent_class.call_args
            assert "session_manager" not in call_args.kwargs

    @patch('workflow_agent.DynamoDBHelper')
    @patch('workflow_agent.AgentsLoader')
    def test_workflow_agent_without_session_manager(self, mock_agents_loader, mock_ddb_helper):
        """Test workflow agent initialization without session manager"""
        
        # Mock DynamoDB configuration with memory enabled
        mock_config_dict = {
            "UseCaseType": "Workflow",
            "UseCaseName": "Test Workflow",
            "LlmParams": {
                "ModelProvider": "Bedrock",
                "BedrockLlmParams": {
                    "ModelId": "anthropic.claude-3-sonnet-20240229-v1:0"
                },
                "Temperature": 0.7,
                "Streaming": True
            },
            "WorkflowParams": {
                "OrchestrationPattern": "agents-as-tools",
                "SystemPrompt": "You are a helpful assistant",
                "MemoryConfig": {
                    "LongTermEnabled": True
                },
                "AgentsAsToolsParams": {
                    "Agents": [{
                        "AgentId": "test-agent-1",
                        "AgentName": "TestAgent1",
                        "UseCaseId": "test-use-case-1",
                        "UseCaseType": "RAG",
                        "UseCaseName": "Test Agent",
                        "AgentBuilderParams": {
                            "SystemPrompt": "You are a test agent",
                            "Tools": []
                        }
                    }]
                }
            }
        }
        
        mock_ddb_helper_instance = Mock()
        mock_ddb_helper_instance.get_config.return_value = mock_config_dict
        mock_ddb_helper.return_value = mock_ddb_helper_instance
        
        # Mock agents loader
        mock_agents_loader_instance = Mock()
        mock_agents_loader_instance.load_agents.return_value = []
        mock_agents_loader.return_value = mock_agents_loader_instance
        
        # Create workflow agent without session manager
        with patch('workflow_agent.Agent') as mock_agent_class:
            mock_agent_instance = Mock()
            mock_agent_class.return_value = mock_agent_instance
            
            workflow_agent = WorkflowAgent(
                table_name="test-table",
                config_key="test-key", 
                region="us-east-1",
                session_manager=None
            )
            
            # Verify no session manager
            assert workflow_agent.session_manager is None
            
            # Verify agent was created without session manager
            mock_agent_class.assert_called_once()
            call_args = mock_agent_class.call_args
            assert "session_manager" not in call_args.kwargs
