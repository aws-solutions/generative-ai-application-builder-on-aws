#!/usr/bin/env python
# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

import pytest
import json
from unittest.mock import Mock, patch, MagicMock
from botocore.exceptions import ClientError
from utils.policy_manager import GatewayPolicyManager


@pytest.fixture
def policy_manager():
    """Fixture to create GatewayPolicyManager instance."""
    with patch("utils.policy_manager.get_service_client") as mock_get_client:
        mock_iam_client = Mock()
        mock_agentcore_client = Mock()
        
        # Create proper exception classes for IAM client
        class NoSuchEntityException(Exception):
            pass
        
        # Attach exceptions to the mock client
        mock_iam_client.exceptions = Mock()
        mock_iam_client.exceptions.NoSuchEntityException = NoSuchEntityException
        
        mock_get_client.return_value = mock_iam_client
        
        with patch.dict("os.environ", {"AWS_REGION": "us-east-1"}):
            manager = GatewayPolicyManager("test-role", mock_agentcore_client)
            manager.iam_client = mock_iam_client
            yield manager, mock_iam_client, mock_agentcore_client


@patch("utils.policy_manager.get_service_client")
@patch.dict("os.environ", {"AWS_REGION": "us-east-1"})
def test_initialization_success(mock_get_client):
    """Test successful initialization."""
    mock_iam_client = Mock()
    mock_agentcore_client = Mock()
    mock_get_client.return_value = mock_iam_client
    
    manager = GatewayPolicyManager("my-role", mock_agentcore_client)
    
    assert manager.role_name == "my-role"
    assert manager.agentcore_client == mock_agentcore_client
    assert manager.iam_client == mock_iam_client
    mock_get_client.assert_called_once_with("iam", region_name="us-east-1")


@patch("utils.policy_manager.get_service_client")
@patch.dict("os.environ", {"AWS_REGION": "us-west-2"})
def test_initialization_with_retry(mock_get_client):
    """Test initialization with client retry on first failure."""
    mock_iam_client = Mock()
    mock_agentcore_client = Mock()
    mock_get_client.side_effect = [Exception("First attempt failed"), mock_iam_client]
    
    manager = GatewayPolicyManager("my-role", mock_agentcore_client)
    
    assert manager.iam_client == mock_iam_client
    assert mock_get_client.call_count == 2


def test_add_lambda_policy_success(policy_manager):
    """Test successfully adding a Lambda policy."""
    manager, mock_client, _ = policy_manager
    mock_client.get_role_policy.side_effect = mock_client.exceptions.NoSuchEntityException(
        "Policy not found"
    )
    
    manager.add_lambda_policy("my-target", "arn:aws:lambda:us-east-1:123456789012:function:my-function")
    
    # Verify put_role_policy was called
    mock_client.put_role_policy.assert_called_once()
    call_args = mock_client.put_role_policy.call_args
    
    assert call_args[1]["RoleName"] == "test-role"
    assert call_args[1]["PolicyName"] == "my-target-lambda-access-policy"
    
    policy_doc = json.loads(call_args[1]["PolicyDocument"])
    assert policy_doc["Version"] == "2012-10-17"
    assert len(policy_doc["Statement"]) == 1
    assert policy_doc["Statement"][0]["Effect"] == "Allow"
    assert policy_doc["Statement"][0]["Action"] == ["lambda:InvokeFunction"]
    assert policy_doc["Statement"][0]["Resource"] == ["arn:aws:lambda:us-east-1:123456789012:function:my-function"]


def test_add_lambda_policy_duplicate_skipped(policy_manager):
    """Test that duplicate policy is skipped."""
    manager, mock_client, _ = policy_manager
    
    existing_policy = {
        "Version": "2012-10-17",
        "Statement": [
            {
                "Effect": "Allow",
                "Action": ["lambda:InvokeFunction"],
                "Resource": ["arn:aws:lambda:us-east-1:123456789012:function:my-function"]
            }
        ]
    }
    
    mock_client.get_role_policy.return_value = {
        "PolicyDocument": existing_policy
    }
    
    manager.add_lambda_policy("my-target", "arn:aws:lambda:us-east-1:123456789012:function:my-function")
    
    # Verify put_role_policy was NOT called
    mock_client.put_role_policy.assert_not_called()


def test_add_lambda_policy_failure(policy_manager):
    """Test Lambda policy addition failure."""
    manager, mock_client, _ = policy_manager
    mock_client.get_role_policy.side_effect = mock_client.exceptions.NoSuchEntityException(
        "Policy not found"
    )
    mock_client.put_role_policy.side_effect = ClientError(
        {"Error": {"Code": "AccessDenied", "Message": "Access denied"}},
        "put_role_policy"
    )
    
    with pytest.raises(RuntimeError, match="Failed to add Lambda policy for my-target"):
        manager.add_lambda_policy("my-target", "arn:aws:lambda:us-east-1:123456789012:function:my-function")


def test_add_openapi_policy_success(policy_manager):
    """Test successfully adding an OpenAPI policy."""
    manager, mock_client, _ = policy_manager
    mock_client.get_role_policy.side_effect = mock_client.exceptions.NoSuchEntityException(
        "Policy not found"
    )
    
    provider_arn = "arn:aws:bedrock-agentcore:us-east-1:123456789012:token-vault/default/credential-provider/my-provider"
    secret_arn = "arn:aws:secretsmanager:us-east-1:123456789012:secret:my-secret"
    
    manager.add_openapi_policy(
        "my-target",
        provider_arn,
        "bedrock-agentcore:GetResourceOauth2Token",
        secret_arn
    )
    
    # Verify put_role_policy was called
    mock_client.put_role_policy.assert_called_once()
    call_args = mock_client.put_role_policy.call_args
    
    assert call_args[1]["RoleName"] == "test-role"
    assert call_args[1]["PolicyName"] == "my-target-my-provider-access-policy"
    
    policy_doc = json.loads(call_args[1]["PolicyDocument"])
    assert policy_doc["Version"] == "2012-10-17"
    assert len(policy_doc["Statement"]) == 2
    
    # Check auth statement
    auth_statement = policy_doc["Statement"][0]
    assert auth_statement["Effect"] == "Allow"
    assert auth_statement["Action"] == ["bedrock-agentcore:GetResourceOauth2Token"]
    assert len(auth_statement["Resource"]) == 2
    
    # Check secrets manager statement
    secrets_statement = policy_doc["Statement"][1]
    assert secrets_statement["Effect"] == "Allow"
    assert secrets_statement["Action"] == ["secretsmanager:GetSecretValue"]
    assert secrets_statement["Resource"] == [secret_arn]


def test_add_openapi_policy_duplicate_skipped(policy_manager):
    """Test that duplicate OpenAPI policy is skipped."""
    manager, mock_client, _ = policy_manager
    
    provider_arn = "arn:aws:bedrock-agentcore:us-east-1:123456789012:token-vault/default/credential-provider/my-provider"
    secret_arn = "arn:aws:secretsmanager:us-east-1:123456789012:secret:my-secret"
    
    existing_policy = {
        "Version": "2012-10-17",
        "Statement": [
            {
                "Effect": "Allow",
                "Action": ["bedrock-agentcore:GetResourceOauth2Token"],
                "Resource": [
                    "arn:aws:bedrock-agentcore:us-east-1:123456789012:token-vault/default",
                    provider_arn
                ]
            },
            {
                "Effect": "Allow",
                "Action": ["secretsmanager:GetSecretValue"],
                "Resource": [secret_arn]
            }
        ]
    }
    
    mock_client.get_role_policy.return_value = {
        "PolicyDocument": existing_policy
    }
    
    manager.add_openapi_policy(
        "my-target",
        provider_arn,
        "bedrock-agentcore:GetResourceOauth2Token",
        secret_arn
    )
    
    # Verify put_role_policy was NOT called
    mock_client.put_role_policy.assert_not_called()


def test_add_openapi_policy_failure(policy_manager):
    """Test OpenAPI policy addition failure."""
    manager, mock_client, _ = policy_manager
    mock_client.get_role_policy.side_effect = mock_client.exceptions.NoSuchEntityException(
        "Policy not found"
    )
    mock_client.put_role_policy.side_effect = ClientError(
        {"Error": {"Code": "AccessDenied", "Message": "Access denied"}},
        "put_role_policy"
    )
    
    provider_arn = "arn:aws:bedrock-agentcore:us-east-1:123456789012:token-vault/default/credential-provider/my-provider"
    secret_arn = "arn:aws:secretsmanager:us-east-1:123456789012:secret:my-secret"
    
    with pytest.raises(RuntimeError, match="Failed to add OpenAPI policy for my-target"):
        manager.add_openapi_policy(
            "my-target",
            provider_arn,
            "bedrock-agentcore:GetResourceOauth2Token",
            secret_arn
        )


def test_is_duplicate_policy_identical(policy_manager):
    """Test duplicate detection with identical policy."""
    manager, mock_client, _ = policy_manager
    
    policy_doc = {
        "Version": "2012-10-17",
        "Statement": [{"Effect": "Allow", "Action": ["lambda:InvokeFunction"], "Resource": ["arn:aws:lambda:*"]}]
    }
    
    mock_client.get_role_policy.return_value = {
        "PolicyDocument": policy_doc
    }
    
    result = manager.is_duplicate_policy(policy_doc, "test-policy")
    
    assert result is True


def test_is_duplicate_policy_different(policy_manager):
    """Test duplicate detection with different policy."""
    manager, mock_client, _ = policy_manager
    
    existing_policy = {
        "Version": "2012-10-17",
        "Statement": [{"Effect": "Allow", "Action": ["lambda:InvokeFunction"], "Resource": ["arn:aws:lambda:*"]}]
    }
    
    new_policy = {
        "Version": "2012-10-17",
        "Statement": [{"Effect": "Allow", "Action": ["s3:GetObject"], "Resource": ["arn:aws:s3:::*"]}]
    }
    
    mock_client.get_role_policy.return_value = {
        "PolicyDocument": existing_policy
    }
    
    result = manager.is_duplicate_policy(new_policy, "test-policy")
    
    assert result is False


def test_is_duplicate_policy_not_found(policy_manager):
    """Test duplicate detection when policy doesn't exist."""
    manager, mock_client, _ = policy_manager
    mock_client.get_role_policy.side_effect = mock_client.exceptions.NoSuchEntityException(
        "Policy not found"
    )
    
    policy_doc = {"Version": "2012-10-17", "Statement": []}
    
    result = manager.is_duplicate_policy(policy_doc, "test-policy")
    
    assert result is False


def test_is_duplicate_policy_url_encoded_string(policy_manager):
    """Test duplicate detection with URL-encoded policy document string."""
    manager, mock_client, _ = policy_manager
    
    policy_doc = {
        "Version": "2012-10-17",
        "Statement": [{"Effect": "Allow", "Action": ["lambda:InvokeFunction"], "Resource": ["arn:aws:lambda:*"]}]
    }
    
    # Simulate URL-encoded JSON string (older boto3 versions)
    import urllib.parse
    encoded_policy = urllib.parse.quote(json.dumps(policy_doc))
    
    mock_client.get_role_policy.return_value = {
        "PolicyDocument": encoded_policy
    }
    
    result = manager.is_duplicate_policy(policy_doc, "test-policy")
    
    assert result is True


def test_is_duplicate_policy_error_handling(policy_manager):
    """Test duplicate detection with unexpected error."""
    manager, mock_client, _ = policy_manager
    mock_client.get_role_policy.side_effect = ClientError(
        {"Error": {"Code": "ServiceUnavailable", "Message": "Service unavailable"}},
        "get_role_policy"
    )
    
    policy_doc = {"Version": "2012-10-17", "Statement": []}
    
    result = manager.is_duplicate_policy(policy_doc, "test-policy")
    
    assert result is False


def test_destroy_all_custom_policies_success(policy_manager):
    """Test successfully destroying all custom policies."""
    manager, mock_client, _ = policy_manager
    
    mock_client.list_role_policies.return_value = {
        "PolicyNames": ["policy1", "policy2", "policy3"]
    }
    
    manager.destroy_all_custom_policies()
    
    # Verify all policies were deleted
    assert mock_client.delete_role_policy.call_count == 3
    mock_client.delete_role_policy.assert_any_call(RoleName="test-role", PolicyName="policy1")
    mock_client.delete_role_policy.assert_any_call(RoleName="test-role", PolicyName="policy2")
    mock_client.delete_role_policy.assert_any_call(RoleName="test-role", PolicyName="policy3")


def test_destroy_all_custom_policies_empty(policy_manager):
    """Test destroying policies when none exist."""
    manager, mock_client, _ = policy_manager
    
    mock_client.list_role_policies.return_value = {
        "PolicyNames": []
    }
    
    manager.destroy_all_custom_policies()
    
    # Verify no delete calls were made
    mock_client.delete_role_policy.assert_not_called()


def test_destroy_all_custom_policies_partial_failure(policy_manager):
    """Test destroying policies with partial failures."""
    manager, mock_client, _ = policy_manager
    
    mock_client.list_role_policies.return_value = {
        "PolicyNames": ["policy1", "policy2", "policy3"]
    }
    
    # Make policy2 deletion fail
    def delete_side_effect(RoleName, PolicyName):
        if PolicyName == "policy2":
            raise ClientError(
                {"Error": {"Code": "AccessDenied", "Message": "Access denied"}},
                "delete_role_policy"
            )
    
    mock_client.delete_role_policy.side_effect = delete_side_effect
    
    # Should not raise, just log and continue
    manager.destroy_all_custom_policies()
    
    # Verify all policies were attempted
    assert mock_client.delete_role_policy.call_count == 3


def test_destroy_all_custom_policies_already_deleted(policy_manager):
    """Test destroying policies when some are already deleted."""
    manager, mock_client, _ = policy_manager
    
    mock_client.list_role_policies.return_value = {
        "PolicyNames": ["policy1", "policy2"]
    }
    
    # Make policy1 already deleted
    def delete_side_effect(RoleName, PolicyName):
        if PolicyName == "policy1":
            raise mock_client.exceptions.NoSuchEntityException("Policy already deleted")
    
    mock_client.delete_role_policy.side_effect = delete_side_effect
    
    manager.destroy_all_custom_policies()
    
    # Verify both policies were attempted
    assert mock_client.delete_role_policy.call_count == 2


def test_destroy_all_custom_policies_list_failure(policy_manager):
    """Test destroying policies when listing fails."""
    manager, mock_client, _ = policy_manager
    
    mock_client.list_role_policies.side_effect = ClientError(
        {"Error": {"Code": "AccessDenied", "Message": "Access denied"}},
        "list_role_policies"
    )
    
    # Should not raise, just log warning
    manager.destroy_all_custom_policies()
    
    # Verify no delete calls were made
    mock_client.delete_role_policy.assert_not_called()


def test_gateway_policy_factory_lambda(policy_manager):
    """Test gateway_policy_factory with Lambda target."""
    manager, mock_client, _ = policy_manager
    mock_client.get_role_policy.side_effect = mock_client.exceptions.NoSuchEntityException("Policy not found")
    
    target = {
        "TargetName": "my-lambda-target",
        "LambdaArn": "arn:aws:lambda:us-east-1:123456789012:function:my-function"
    }
    
    manager.gateway_policy_factory("lambda", target)
    
    # Verify Lambda policy was created
    mock_client.put_role_policy.assert_called_once()
    call_args = mock_client.put_role_policy.call_args
    assert call_args[1]["PolicyName"] == "my-lambda-target-lambda-access-policy"


def test_gateway_policy_factory_openapi(policy_manager):
    """Test gateway_policy_factory with OpenAPI target."""
    manager, mock_client, mock_agentcore = policy_manager
    mock_client.get_role_policy.side_effect = mock_client.exceptions.NoSuchEntityException("Policy not found")
    
    provider_arn = "arn:aws:bedrock-agentcore:us-east-1:123456789012:token-vault/default/credential-provider/my-provider"
    secret_arn = "arn:aws:secretsmanager:us-east-1:123456789012:secret:my-secret"
    
    mock_agentcore.get_oauth2_credential_provider.return_value = {
        "clientSecretArn": {"secretArn": secret_arn}
    }
    
    target = {
        "TargetName": "my-openapi-target",
        "OutboundAuthParams": {
            "OutboundAuthProviderType": "OAUTH",
            "OutboundAuthProviderArn": provider_arn
        }
    }
    
    manager.gateway_policy_factory("openApiSchema", target)
    
    # Verify OpenAPI policy was created
    mock_client.put_role_policy.assert_called_once()
    mock_agentcore.get_oauth2_credential_provider.assert_called_once_with(name="my-provider")


def test_gateway_policy_factory_missing_target_name(policy_manager):
    """Test gateway_policy_factory with missing TargetName."""
    manager, _, _ = policy_manager
    
    target = {"LambdaArn": "arn:aws:lambda:us-east-1:123456789012:function:my-function"}
    
    with pytest.raises(ValueError, match="TargetName is required"):
        manager.gateway_policy_factory("lambda", target)


def test_add_openapi_policy_for_target_oauth(policy_manager):
    """Test _add_openapi_policy_for_target with OAuth authentication."""
    manager, mock_client, mock_agentcore = policy_manager
    mock_client.get_role_policy.side_effect = mock_client.exceptions.NoSuchEntityException("Policy not found")
    
    provider_arn = "arn:aws:bedrock-agentcore:us-east-1:123456789012:token-vault/default/credential-provider/oauth-provider"
    secret_arn = "arn:aws:secretsmanager:us-east-1:123456789012:secret:oauth-secret"
    
    mock_agentcore.get_oauth2_credential_provider.return_value = {
        "clientSecretArn": {"secretArn": secret_arn}
    }
    
    outbound_auth_params = {
        "OutboundAuthProviderType": "OAUTH",
        "OutboundAuthProviderArn": provider_arn
    }
    
    manager._add_openapi_policy_for_target("test-target", outbound_auth_params)
    
    # Verify correct AgentCore call
    mock_agentcore.get_oauth2_credential_provider.assert_called_once_with(name="oauth-provider")
    
    # Verify IAM policy was created with correct action
    mock_client.put_role_policy.assert_called_once()
    call_args = mock_client.put_role_policy.call_args
    policy_doc = json.loads(call_args[1]["PolicyDocument"])
    assert policy_doc["Statement"][0]["Action"] == ["bedrock-agentcore:GetResourceOauth2Token"]


def test_add_openapi_policy_for_target_api_key(policy_manager):
    """Test _add_openapi_policy_for_target with API Key authentication."""
    manager, mock_client, mock_agentcore = policy_manager
    mock_client.get_role_policy.side_effect = mock_client.exceptions.NoSuchEntityException("Policy not found")
    
    provider_arn = "arn:aws:bedrock-agentcore:us-east-1:123456789012:token-vault/default/credential-provider/apikey-provider"
    secret_arn = "arn:aws:secretsmanager:us-east-1:123456789012:secret:apikey-secret"
    
    mock_agentcore.get_api_key_credential_provider.return_value = {
        "apiKeySecretArn": {"secretArn": secret_arn}
    }
    
    outbound_auth_params = {
        "OutboundAuthProviderType": "API_KEY",
        "OutboundAuthProviderArn": provider_arn
    }
    
    manager._add_openapi_policy_for_target("test-target", outbound_auth_params)
    
    # Verify correct AgentCore call
    mock_agentcore.get_api_key_credential_provider.assert_called_once_with(name="apikey-provider")
    
    # Verify IAM policy was created with correct action
    mock_client.put_role_policy.assert_called_once()
    call_args = mock_client.put_role_policy.call_args
    policy_doc = json.loads(call_args[1]["PolicyDocument"])
    assert policy_doc["Statement"][0]["Action"] == ["bedrock-agentcore:GetResourceApiKey"]


def test_add_openapi_policy_for_target_missing_provider_arn(policy_manager):
    """Test _add_openapi_policy_for_target with missing provider ARN."""
    manager, _, _ = policy_manager
    
    outbound_auth_params = {"OutboundAuthProviderType": "OAUTH"}
    
    with pytest.raises(ValueError, match="OutboundAuthProviderArn is required"):
        manager._add_openapi_policy_for_target("test-target", outbound_auth_params)


def test_add_openapi_policy_for_target_agentcore_failure(policy_manager):
    """Test _add_openapi_policy_for_target when AgentCore call fails."""
    manager, _, mock_agentcore = policy_manager
    
    provider_arn = "arn:aws:bedrock-agentcore:us-east-1:123456789012:token-vault/default/credential-provider/oauth-provider"
    
    mock_agentcore.get_oauth2_credential_provider.side_effect = Exception("AgentCore error")
    
    outbound_auth_params = {
        "OutboundAuthProviderType": "OAUTH",
        "OutboundAuthProviderArn": provider_arn
    }
    
    with pytest.raises(Exception, match="AgentCore error"):
        manager._add_openapi_policy_for_target("test-target", outbound_auth_params)


def test_gateway_policy_factory_mcp_server_with_oauth(policy_manager):
    """Test gateway_policy_factory with MCP Server target with OAuth."""
    manager, mock_client, mock_agentcore = policy_manager
    mock_client.get_role_policy.side_effect = mock_client.exceptions.NoSuchEntityException("Policy not found")

    provider_arn = (
        "arn:aws:bedrock-agentcore:us-east-1:123456789012:token-vault/default/credential-provider/mcp-oauth-provider"
    )
    secret_arn = "arn:aws:secretsmanager:us-east-1:123456789012:secret:mcp-oauth-secret"

    mock_agentcore.get_oauth2_credential_provider.return_value = {"clientSecretArn": {"secretArn": secret_arn}}

    target = {
        "TargetName": "my-mcp-target",
        "McpEndpoint": "https://api.example.com/mcp",
        "OutboundAuthParams": {"OutboundAuthProviderType": "OAUTH", "OutboundAuthProviderArn": provider_arn},
    }

    manager.gateway_policy_factory("mcpServer", target)

    # Verify OAuth policy was created (same as OpenAPI)
    mock_client.put_role_policy.assert_called_once()
    mock_agentcore.get_oauth2_credential_provider.assert_called_once_with(name="mcp-oauth-provider")

    # Verify policy content
    call_args = mock_client.put_role_policy.call_args
    policy_doc = json.loads(call_args[1]["PolicyDocument"])
    assert policy_doc["Statement"][0]["Action"] == ["bedrock-agentcore:GetResourceOauth2Token"]
    assert policy_doc["Statement"][1]["Action"] == ["secretsmanager:GetSecretValue"]


def test_gateway_policy_factory_mcp_server_without_oauth(policy_manager):
    """Test gateway_policy_factory with MCP Server target without OAuth (NO_AUTH)."""
    manager, mock_client, _ = policy_manager

    target = {
        "TargetName": "my-mcp-target",
        "McpEndpoint": "https://api.example.com/mcp",
        # No OutboundAuthParams
    }

    manager.gateway_policy_factory("mcpServer", target)

    # Verify no policy was created for NO_AUTH
    mock_client.put_role_policy.assert_not_called()
