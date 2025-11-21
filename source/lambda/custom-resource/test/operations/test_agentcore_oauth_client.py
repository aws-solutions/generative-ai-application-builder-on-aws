#!/usr/bin/env python
# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

import pytest
from unittest.mock import Mock, patch
from operations.agentcore_oauth_client import execute, verify_env_setup, create, delete, AgentCoreIdentityError
from operations.operation_types import RESOURCE_PROPERTIES
from test.fixtures.agentcore_oauth_client_events import lambda_event


class TestAgentcoreOauthClient:
    
    def test_verify_env_setup_success(self, lambda_event):
        verify_env_setup(lambda_event)
    
    def test_verify_env_setup_missing_field(self, lambda_event):
        lambda_event[RESOURCE_PROPERTIES]["CLIENT_ID"] = ""
        with pytest.raises(ValueError, match="CLIENT_ID has not been passed"):
            verify_env_setup(lambda_event)
    
    @patch('operations.agentcore_oauth_client.get_service_client')
    def test_create_success(self, mock_get_service_client, lambda_event, mock_lambda_context):
        mock_client = Mock()
        mock_client.create_oauth2_credential_provider.return_value = {}
        mock_get_service_client.return_value = mock_client
        
        result = create(lambda_event, mock_lambda_context)
        
        mock_get_service_client.assert_called_once_with("bedrock-agentcore-control")
        mock_client.create_oauth2_credential_provider.assert_called_once_with(
            name="test-provider",
            credentialProviderVendor="CustomOauth2",
            oauth2ProviderConfigInput={
                "customOauth2ProviderConfig": {
                    "oauthDiscovery": {
                        "discoveryUrl": "https://example.com/.well-known/openid_configuration"
                    },
                    "clientId": "test-client-id",
                    "clientSecret": "test-client-secret",
                }
            }
        )
    
    @patch('operations.agentcore_oauth_client.get_service_client')
    def test_create_failure(self, mock_get_service_client, lambda_event, mock_lambda_context):
        mock_client = Mock()
        mock_client.create_oauth2_credential_provider.side_effect = Exception("API Error")
        mock_get_service_client.return_value = mock_client
        
        with pytest.raises(AgentCoreIdentityError, match="Failed to create OAuth2 provider"):
            create(lambda_event, mock_lambda_context)
    
    @patch('operations.agentcore_oauth_client.get_service_client')
    def test_delete_success(self, mock_get_service_client, lambda_event, mock_lambda_context):
        mock_client = Mock()
        mock_get_service_client.return_value = mock_client
        
        delete(lambda_event, mock_lambda_context)
        
        mock_get_service_client.assert_called_once_with("bedrock-agentcore-control")
        mock_client.delete_oauth2_credential_provider.assert_called_once_with(name="test-provider")
    
    @patch('operations.agentcore_oauth_client.get_service_client')
    def test_delete_failure(self, mock_get_service_client, lambda_event, mock_lambda_context):
        mock_client = Mock()
        mock_client.delete_oauth2_credential_provider.side_effect = Exception("API Error")
        mock_get_service_client.return_value = mock_client
        
        with pytest.raises(AgentCoreIdentityError, match="Failed to delete OAuth2 provider"):
            delete(lambda_event, mock_lambda_context)
    
    @patch('operations.agentcore_oauth_client.send_response')
    @patch('operations.agentcore_oauth_client.create')
    def test_execute_create_success(self, mock_create, mock_send_response, lambda_event, mock_lambda_context):
        lambda_event["RequestType"] = "Create"
        
        execute(lambda_event, mock_lambda_context)
        
        mock_create.assert_called_once()
        mock_send_response.assert_called_once_with(
            lambda_event, mock_lambda_context, "SUCCESS", {}, "fake_physical_resource_id"
        )
    
    @patch('operations.agentcore_oauth_client.send_response')
    @patch('operations.agentcore_oauth_client.delete')
    def test_execute_delete_success(self, mock_delete, mock_send_response, lambda_event, mock_lambda_context):
        lambda_event["RequestType"] = "Delete"
        
        execute(lambda_event, mock_lambda_context)
        
        mock_delete.assert_called_once()
        mock_send_response.assert_called_once_with(
            lambda_event, mock_lambda_context, "SUCCESS", {}, "fake_physical_resource_id"
        )
    
    @patch('operations.agentcore_oauth_client.send_response')
    def test_execute_update_noop(self, mock_send_response, lambda_event, mock_lambda_context):
        lambda_event["RequestType"] = "Update"
        
        execute(lambda_event, mock_lambda_context)
        
        mock_send_response.assert_called_once_with(
            lambda_event, mock_lambda_context, "SUCCESS", {}, "fake_physical_resource_id"
        )
    
    @patch('operations.agentcore_oauth_client.send_response')
    @patch('operations.agentcore_oauth_client.create')
    def test_execute_failure(self, mock_create, mock_send_response, lambda_event, mock_lambda_context):
        lambda_event["RequestType"] = "Create"
        mock_create.side_effect = Exception("Test error")
        
        execute(lambda_event, mock_lambda_context)
        
        mock_send_response.assert_called_once()
        args = mock_send_response.call_args
        assert args[0][2] == "FAILED"
        assert "Test error" in args[1]["reason"]
