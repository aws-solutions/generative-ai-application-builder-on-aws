#!/usr/bin/env python
# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

import pytest
from unittest.mock import Mock
from utils.auth_manager import AuthManager
from utils.data import MCPServerData
from utils.constants import EntityType


@pytest.fixture
def mock_bedrock_client():
    return Mock()


@pytest.fixture
def auth_manager(mock_bedrock_client):
    return AuthManager("test-client-id", "test-use-case-id", mock_bedrock_client)


@pytest.fixture
def runtime_mcp_server():
    return MCPServerData(
        EntityType.RUNTIME.value,
        "https://bedrock-agentcore.us-east-1.amazonaws.com/runtimes/arn%3Aaws%3Abedrock-agentcore%3Aus-east-1%3A123456789012%3Aruntime%2Ftest_agentcore_id/invocations?qualifier=DEFAULT"
        "test-use-case",
        "test-name",
        "123456789012"
    )


@pytest.fixture
def gateway_mcp_server():
    return MCPServerData(
        EntityType.GATEWAY.value,
        "https://test-gateway.gateway.bedrock-agentcore.us-east-1.amazonaws.com/mcp",
        "test-use-case",
        "test-name",
        "123456789012"
    )


class TestAuthManager:
    
    def test_extract_values_regex_valid_arn(self):
        arn = "arn:aws:bedrock-agentcore:us-east-1:123456789012:runtime/test-id"
        entity_type, entity_id = AuthManager.extract_values_regex(arn)
        assert entity_type == "runtime"
        assert entity_id == "test-id"

    def test_extract_values_regex_invalid_arn(self):
        with pytest.raises(ValueError, match="Invalid ARN format"):
            AuthManager.extract_values_regex("invalid-arn")

    def test_get_resource_tags(self, auth_manager):
        auth_manager.bedrock.list_tags_for_resource.return_value = {
            'tags': {'client1': 'use-case-1', 'client2': 'use-case-2'}
        }
        
        tags = auth_manager._get_resource_tags("test-arn")
        
        assert tags == {'client1': 'use-case-1', 'client2': 'use-case-2'}
        auth_manager.bedrock.list_tags_for_resource.assert_called_once_with(resourceArn="test-arn")

    def test_update_gateway_permissions_add_client(self, auth_manager):
        auth_manager.bedrock.get_gateway.return_value = {
            'name': 'test-gateway',
            'description': 'test description',
            'roleArn': 'test-role-arn',
            'protocolType': 'HTTP',
            'authorizerType': 'JWT',
            'authorizerConfiguration': {
                'customJWTAuthorizer': {
                    'allowedClients': ['existing-client']
                }
            }
        }
        
        auth_manager._update_gateway_permissions("test-gateway-id", True)
        
        auth_manager.bedrock.update_gateway.assert_called_once()
        call_args = auth_manager.bedrock.update_gateway.call_args[1]
        assert 'test-client-id' in call_args['authorizerConfiguration']['customJWTAuthorizer']['allowedClients']

    def test_update_gateway_permissions_remove_client(self, auth_manager):
        auth_manager.bedrock.get_gateway.return_value = {
            'name': 'test-gateway',
            'description': 'test description',
            'roleArn': 'test-role-arn',
            'protocolType': 'HTTP',
            'authorizerType': 'JWT',
            'authorizerConfiguration': {
                'customJWTAuthorizer': {
                    'allowedClients': ['test-client-id', 'other-client']
                }
            }
        }
        
        auth_manager._update_gateway_permissions("test-gateway-id", False)
        
        auth_manager.bedrock.update_gateway.assert_called_once()
        call_args = auth_manager.bedrock.update_gateway.call_args[1]
        assert 'test-client-id' not in call_args['authorizerConfiguration']['customJWTAuthorizer']['allowedClients']

    def test_update_runtime_permissions_add_client(self, auth_manager):
        auth_manager.bedrock.get_agent_runtime.return_value = {
            'description': 'test runtime',
            'agentRuntimeArtifact': 'test-artifact',
            'roleArn': 'test-role-arn',
            'networkConfiguration': {},
            'authorizerConfiguration': {
                'customJWTAuthorizer': {
                    'allowedClients': ['existing-client']
                }
            }
        }
        
        auth_manager._update_runtime_permissions("test-runtime-id", True)
        
        auth_manager.bedrock.update_agent_runtime.assert_called_once()
        call_args = auth_manager.bedrock.update_agent_runtime.call_args[1]
        assert 'test-client-id' in call_args['authorizerConfiguration']['customJWTAuthorizer']['allowedClients']

    def test_update_runtime_permissions_remove_client(self, auth_manager):
        auth_manager.bedrock.get_agent_runtime.return_value = {
            'description': 'test runtime',
            'agentRuntimeArtifact': 'test-artifact',
            'roleArn': 'test-role-arn',
            'networkConfiguration': {},
            'authorizerConfiguration': {
                'customJWTAuthorizer': {
                    'allowedClients': ['test-client-id', 'other-client']
                }
            }
        }
        
        auth_manager._update_runtime_permissions("test-runtime-id", False)
        
        auth_manager.bedrock.update_agent_runtime.assert_called_once()
        call_args = auth_manager.bedrock.update_agent_runtime.call_args[1]
        assert 'test-client-id' not in call_args['authorizerConfiguration']['customJWTAuthorizer']['allowedClients']

    def test_add_permission_new_client_tag(self, auth_manager, runtime_mcp_server):
        auth_manager._get_resource_tags = Mock(return_value={})
        auth_manager._update_allowed_clients = Mock()
        
        auth_manager.add_permission(runtime_mcp_server)
        
        auth_manager.bedrock.tag_resource.assert_called_once_with(
            resourceArn=runtime_mcp_server.agentcore_arn,
            tags={'test-client-id': 'test-use-case-id'}
        )
        auth_manager._update_allowed_clients.assert_called_once_with(runtime_mcp_server, True)

    def test_add_permission_existing_client_tag(self, auth_manager, runtime_mcp_server):
        auth_manager._get_resource_tags = Mock(return_value={'test-client-id': 'existing-use-case'})
        auth_manager._update_allowed_clients = Mock()
        
        auth_manager.add_permission(runtime_mcp_server)
        
        auth_manager.bedrock.tag_resource.assert_called_once_with(
            resourceArn=runtime_mcp_server.agentcore_arn,
            tags={'test-client-id': 'existing-use-case:test-use-case-id'}
        )
        auth_manager._update_allowed_clients.assert_not_called()

    def test_remove_permission_last_use_case(self, auth_manager, runtime_mcp_server):
        auth_manager._get_resource_tags = Mock(return_value={'test-client-id': 'test-use-case-id'})
        auth_manager._update_allowed_clients = Mock()
        
        auth_manager.remove_permission(runtime_mcp_server)
        
        auth_manager.bedrock.untag_resource.assert_called_once_with(
            resourceArn=runtime_mcp_server.agentcore_arn,
            tagKeys=['test-client-id']
        )
        auth_manager._update_allowed_clients.assert_called_once_with(runtime_mcp_server, False)

    def test_remove_permission_multiple_use_cases(self, auth_manager, runtime_mcp_server):
        auth_manager._get_resource_tags = Mock(return_value={'test-client-id': 'use-case-1:test-use-case-id:use-case-2'})
        auth_manager._update_allowed_clients = Mock()
        
        auth_manager.remove_permission(runtime_mcp_server)
        
        auth_manager.bedrock.tag_resource.assert_called_once_with(
            resourceArn=runtime_mcp_server.agentcore_arn,
            tags={'test-client-id': 'use-case-1:use-case-2'}
        )
        auth_manager._update_allowed_clients.assert_not_called()

    def test_update_allowed_clients_runtime(self, auth_manager, runtime_mcp_server):
        auth_manager._update_runtime_permissions = Mock()
        
        auth_manager._update_allowed_clients(runtime_mcp_server, True)
        
        auth_manager._update_runtime_permissions.assert_called_once_with(runtime_mcp_server.agentcore_id, True)

    def test_update_allowed_clients_gateway(self, auth_manager, gateway_mcp_server):
        auth_manager._update_gateway_permissions = Mock()
        
        auth_manager._update_allowed_clients(gateway_mcp_server, True)
        
        auth_manager._update_gateway_permissions.assert_called_once_with(gateway_mcp_server.agentcore_id, True)

    def test_update_allowed_clients_invalid_type(self, auth_manager):
        invalid_server = Mock()
        invalid_server.type = "invalid"
        
        with pytest.raises(ValueError, match="Invalid ARN. Type must be gateway or runtime."):
            auth_manager._update_allowed_clients(invalid_server, True)
