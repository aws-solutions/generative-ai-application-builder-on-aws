#!/usr/bin/env python
# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

import pytest
from unittest.mock import Mock, patch, MagicMock
from operations import deploy_agent_core_memory
from operations.operation_types import RESOURCE_PROPERTIES


@pytest.fixture
def mock_event():
    return {
        RESOURCE_PROPERTIES: {
            "MemoryName": "test-memory",
            "AgentRuntimeName": "test-uuid-123",
            "EnableLongTermMemory": "Yes"
        },
        "RequestType": "Create"
    }


@pytest.fixture
def mock_context():
    return Mock()


@pytest.fixture
def mock_bedrock_client():
    client = Mock()
    client.create_memory.return_value = {
        "memory": {
            "id": "test-memory-id-123", 
            "strategies": 
                [
                    {
                        "strategyId": "test-strategy-id",
                        "type": "SEMANTIC"
                    }
                ]
            },
        }
    client.get_waiter.return_value.wait = Mock()
    client.get_memory.return_value = {
        "memory": {"strategies": []}
    }
    client.update_memory.return_value = {}
    client.delete_memory.return_value = {}
    return client


class TestDeployAgentCoreMemory:
    
    @patch('operations.deploy_agent_core_memory.send_response')
    @patch('operations.deploy_agent_core_memory.get_service_client')
    def test_create_memory_success(self, mock_get_client, mock_send_response, mock_event, mock_context, mock_bedrock_client):
        mock_get_client.return_value = mock_bedrock_client
        
        deploy_agent_core_memory.execute(mock_event, mock_context)
        
        mock_bedrock_client.create_memory.assert_called_once()
        mock_send_response.assert_called_once()
        
        # Verify response data
        call_args = mock_send_response.call_args
        response_data = call_args[0][3]
        physical_resource_id = call_args[0][4]
        
        assert response_data["MemoryId"] == "test-memory-id-123"
        assert physical_resource_id == "test-memory-id-123"

    @patch('operations.deploy_agent_core_memory.send_response')
    @patch('operations.deploy_agent_core_memory.get_service_client')
    def test_update_memory_success(self, mock_get_client, mock_send_response, mock_context, mock_bedrock_client):
        mock_get_client.return_value = mock_bedrock_client
        
        update_event = {
            RESOURCE_PROPERTIES: {
                "MemoryName": "test-memory",
                "AgentRuntimeName": "test-uuid-123",
                "EnableLongTermMemory": "No"
            },
            "RequestType": "Update",
            "PhysicalResourceId": "existing-memory-id"
        }
        
        deploy_agent_core_memory.execute(update_event, mock_context)
        
        mock_bedrock_client.get_memory.assert_called_once_with(memoryId="existing-memory-id")
        mock_send_response.assert_called_once()

    @patch('operations.deploy_agent_core_memory.send_response')
    @patch('operations.deploy_agent_core_memory.get_service_client')
    def test_delete_memory_success(self, mock_get_client, mock_send_response, mock_context, mock_bedrock_client):
        mock_get_client.return_value = mock_bedrock_client
        
        delete_event = {
            RESOURCE_PROPERTIES: {
                "MemoryName": "test-memory",
                "AgentRuntimeName": "test-uuid-123",
                "EnableLongTermMemory": "Yes"
            },
            "RequestType": "Delete",
            "PhysicalResourceId": "existing-memory-id"
        }
        
        deploy_agent_core_memory.execute(delete_event, mock_context)
        
        mock_bedrock_client.delete_memory.assert_called_once_with(memoryId="existing-memory-id")
        mock_send_response.assert_called_once()

    @patch('operations.deploy_agent_core_memory.send_response')
    def test_missing_required_parameter(self, mock_send_response, mock_context):
        invalid_event = {
            RESOURCE_PROPERTIES: {
                "EnableLongTermMemory": "Yes"
                # Missing AgentRuntimeName
            },
            "RequestType": "Create"
        }
        
        deploy_agent_core_memory.execute(invalid_event, mock_context)
        
        mock_send_response.assert_called_once()
        call_args = mock_send_response.call_args
        assert call_args[0][2] == "FAILED"

    def test_create_memory_configuration_with_long_term_memory(self, mock_bedrock_client):
        with patch('operations.deploy_agent_core_memory.get_service_client', return_value=mock_bedrock_client):
            memory_id, strategy_id = deploy_agent_core_memory.create_memory_configuration("Yes", "test-memory")
            
            assert memory_id == "test-memory-id-123"
            assert strategy_id == "test-strategy-id"
            mock_bedrock_client.create_memory.assert_called_once()
            
            call_args = mock_bedrock_client.create_memory.call_args[1]
            assert "memoryStrategies" in call_args
            assert call_args["memoryStrategies"][0]["semanticMemoryStrategy"]["name"] == "test-memory_semantic"

    def test_create_memory_configuration_without_long_term_memory(self, mock_bedrock_client):
        with patch('operations.deploy_agent_core_memory.get_service_client', return_value=mock_bedrock_client):
            memory_id, _strategy_id = deploy_agent_core_memory.create_memory_configuration("No", "test-memory")
            
            assert memory_id == "test-memory-id-123"
            mock_bedrock_client.create_memory.assert_called_once()
            
            call_args = mock_bedrock_client.create_memory.call_args[1]
            assert "memoryStrategies" not in call_args

    def test_update_memory_configuration_add_semantic_strategy(self, mock_bedrock_client):
        mock_bedrock_client.get_memory.return_value = {
            "memory": {"strategies": []}
        }
        
        with patch('operations.deploy_agent_core_memory.get_service_client', return_value=mock_bedrock_client):
            deploy_agent_core_memory.update_memory_configuration("test-memory-id", "Yes")
            
            mock_bedrock_client.update_memory.assert_called_once()
            call_args = mock_bedrock_client.update_memory.call_args[1]
            assert "addMemoryStrategies" in call_args["memoryStrategies"]

    def test_update_memory_configuration_remove_semantic_strategy(self, mock_bedrock_client):
        mock_bedrock_client.get_memory.return_value = {
            "memory": {"strategies": [{"type": "SEMANTIC", "strategyId": "strategy-123"}]}
        }
        
        with patch('operations.deploy_agent_core_memory.get_service_client', return_value=mock_bedrock_client):
            deploy_agent_core_memory.update_memory_configuration("test-memory-id", "No")
            
            mock_bedrock_client.update_memory.assert_called_once()
            call_args = mock_bedrock_client.update_memory.call_args[1]
            assert "deleteMemoryStrategies" in call_args["memoryStrategies"]

    def test_delete_memory_configuration_success(self, mock_bedrock_client):
        with patch('operations.deploy_agent_core_memory.get_service_client', return_value=mock_bedrock_client):
            deploy_agent_core_memory.delete_memory_configuration("test-memory-id")
            
            mock_bedrock_client.delete_memory.assert_called_once_with(memoryId="test-memory-id")

    def test_delete_memory_configuration_not_found(self, mock_bedrock_client):
        from botocore.exceptions import ClientError
        
        mock_bedrock_client.delete_memory.side_effect = ClientError(
            {"Error": {"Code": "ResourceNotFoundException", "Message": "Not found"}},
            "delete_memory"
        )
        
        with patch('operations.deploy_agent_core_memory.get_service_client', return_value=mock_bedrock_client):
            # Should not raise exception
            deploy_agent_core_memory.delete_memory_configuration("test-memory-id")
            
            mock_bedrock_client.delete_memory.assert_called_once_with(memoryId="test-memory-id")
            
    def test_delete_memory_configuration_invalid_id(self, mock_bedrock_client):
        from botocore.exceptions import ClientError
        
        mock_bedrock_client.delete_memory.side_effect = ClientError(
            {"Error": {"Code": "ValidationException", "Message": "Parameter validation failed"}},
            "delete_memory"
        )
        
        with patch('operations.deploy_agent_core_memory.get_service_client', return_value=mock_bedrock_client):
            # Should not raise exception
            deploy_agent_core_memory.delete_memory_configuration("test-memory-id")
            
            mock_bedrock_client.delete_memory.assert_called_once_with(memoryId="test-memory-id")
