#!/usr/bin/env python
# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

import pytest
from unittest.mock import Mock, patch
from utils.gateway_mcp import GatewayMCP


@pytest.fixture
def gateway_mcp_factory():
    """Factory fixture to create GatewayMCP instances."""
    @patch("utils.agentcore_mcp.get_service_client")
    @patch.dict("os.environ", {"AWS_REGION": "us-east-1"})
    def _create_gateway(mock_get_client, gateway_id=None):
        mock_client = Mock()
        mock_get_client.return_value = mock_client

        config = {
            "use_case_description": "Test gateway description",
            "target_params": [
                {
                    "TargetName": "test-lambda",
                    "TargetType": "lambda",
                    "LambdaArn": "arn:aws:lambda:us-east-1:123456789012:function:test",
                    "SchemaUri": "schemas/lambda-schema.json",
                }
            ],
        }

        gateway = GatewayMCP(
            config=config,
            cognito_user_pool_id="us-east-1_ABC123",
            gateway_role_arn="arn:aws:iam::123456789012:role/gateway-role",
            gateway_name="test-gateway",
            schema_bucket_name="test-bucket",
            gateway_id=gateway_id,
        )

        return gateway, mock_client
    
    return _create_gateway


def test_initialization(gateway_mcp_factory):
    """Test GatewayMCP initialization."""
    gateway, _ = gateway_mcp_factory()

    assert gateway.gateway_name == "test-gateway"
    assert gateway.gateway_role_arn == "arn:aws:iam::123456789012:role/gateway-role"
    assert gateway.schema_bucket_name == "test-bucket"
    assert gateway.gateway_id is None
    assert gateway.gateway_arn is None
    assert gateway.gateway_url is None
    assert gateway.targets == []


def test_base_gateway_params(gateway_mcp_factory):
    """Test base_gateway_params property."""
    gateway, _ = gateway_mcp_factory()

    params = gateway.base_gateway_params

    assert params["name"] == "test-gateway"
    assert params["roleArn"] == "arn:aws:iam::123456789012:role/gateway-role"
    assert params["protocolType"] == "MCP"
    assert params["exceptionLevel"] == "DEBUG"
    assert params["description"] == "Test gateway description"
    assert params["authorizerType"] == "CUSTOM_JWT"


def test_create_gateway_params(gateway_mcp_factory):
    """Test create_gateway_params property."""
    gateway, _ = gateway_mcp_factory()

    params = gateway.create_gateway_params

    assert "clientToken" in params
    assert "name" in params
    assert "roleArn" in params


def test_update_gateway_params(gateway_mcp_factory):
    """Test update_gateway_params property."""
    gateway, _ = gateway_mcp_factory(gateway_id="gateway-123")

    params = gateway.update_gateway_params

    assert params["gatewayIdentifier"] == "gateway-123"
    assert "name" in params
    assert "roleArn" in params


def test_gateway_auth_config(gateway_mcp_factory):
    """Test gateway_auth_config property."""
    gateway, _ = gateway_mcp_factory()

    auth_config = gateway.gateway_auth_config

    assert auth_config["authorizerType"] == "CUSTOM_JWT"
    assert "authorizerConfiguration" in auth_config


@patch("utils.gateway_mcp.retry_with_backoff")
@patch("utils.gateway_mcp.MCPGatewayFactory")
def test_create_success(mock_factory, mock_retry, gateway_mcp_factory):
    """Test successful gateway creation."""
    gateway, mock_client = gateway_mcp_factory()

    # Mock gateway creation
    mock_retry.side_effect = [
        {
            "gatewayId": "gateway-abc123",
            "gatewayArn": "arn:aws:bedrock:us-east-1:123456789012:gateway/gateway-abc123",
            "gatewayUrl": "https://gateway-abc123.execute-api.us-east-1.amazonaws.com",
        },
        {"status": "READY"},
        {
            "targetId": "target-123",
            "targetArn": "arn:aws:bedrock:us-east-1:123456789012:target/target-123",
            "status": "ACTIVE",
        },
    ]

    # Mock get_gateway for wait
    mock_client.get_gateway.return_value = {"status": "READY"}

    # Mock target creator
    mock_target_creator = Mock()
    mock_target_creator.create_target_configuration.return_value = {"lambda": {}}
    mock_target_creator.build_credential_provider_configurations.return_value = []
    mock_factory.create_target_creator.return_value = mock_target_creator
    mock_factory.validate_all_targets.return_value = [mock_target_creator]

    # Mock policy manager to avoid IAM calls
    with patch.object(gateway.policy_manager, 'gateway_policy_factory'):
        gateway.create()

    assert gateway.gateway_id == "gateway-abc123"
    assert gateway.gateway_arn == "arn:aws:bedrock:us-east-1:123456789012:gateway/gateway-abc123"
    assert gateway.gateway_url == "https://gateway-abc123.execute-api.us-east-1.amazonaws.com"
    assert len(gateway.targets) == 1


@patch("utils.gateway_mcp.retry_with_backoff")
def test_create_failure(mock_retry, gateway_mcp_factory):
    """Test gateway creation failure."""
    gateway, _ = gateway_mcp_factory()

    mock_retry.side_effect = Exception("API Error")

    with pytest.raises(Exception):
        gateway.create()


@patch("utils.gateway_mcp.retry_with_backoff")
@patch("utils.gateway_mcp.MCPGatewayFactory")
def test_create_targets_success(mock_factory, mock_retry, gateway_mcp_factory):
    """Test successful target creation."""
    gateway, _ = gateway_mcp_factory(gateway_id="gateway-123")

    # Mock target creator
    mock_target_creator = Mock()
    mock_target_creator.create_target_configuration.return_value = {"lambda": {}}
    mock_target_creator.build_credential_provider_configurations.return_value = []
    mock_factory.create_target_creator.return_value = mock_target_creator
    mock_factory.validate_all_targets.return_value = [mock_target_creator]

    mock_retry.return_value = {
        "targetId": "target-123",
        "targetArn": "arn:aws:bedrock:us-east-1:123456789012:target/target-123",
        "status": "ACTIVE",
    }

    # Mock policy manager to avoid IAM calls
    with patch.object(gateway.policy_manager, 'gateway_policy_factory'):
        gateway.create_targets()

    assert len(gateway.targets) == 1
    assert gateway.targets[0]["targetId"] == "target-123"
    assert gateway.targets[0]["targetName"] == "test-lambda"


@patch("utils.gateway_mcp.retry_with_backoff")
def test_delete_targets_success(mock_retry, gateway_mcp_factory):
    """Test successful target deletion."""
    gateway, mock_client = gateway_mcp_factory(gateway_id="gateway-123")

    mock_client.list_gateway_targets.side_effect = [
        {"items": [{"targetId": "target-1", "name": "target-1"}]},
        {"items": []},  # After deletion
    ]

    gateway.delete_targets()

    mock_retry.assert_called_once()
    assert mock_client.list_gateway_targets.call_count == 2


@patch("utils.gateway_mcp.retry_with_backoff")
def test_update_success(mock_retry, gateway_mcp_factory):
    """Test successful gateway update."""
    gateway, mock_client = gateway_mcp_factory(gateway_id="gateway-123")

    mock_client.get_gateway.side_effect = [
        {
            "gatewayArn": "arn:aws:bedrock:us-east-1:123456789012:gateway/gateway-123",
            "gatewayUrl": "https://gateway-123.execute-api.us-east-1.amazonaws.com",
            "description": "Old description",
            "status": "READY",
            "authorizerConfiguration": {
                "customJWTAuthorizer": {
                    "allowedClients": ["-"]
                }
            }
        },
        {"status": "READY"},
    ]

    mock_client.list_gateway_targets.return_value = {"items": []}

    mock_retry.return_value = {"status": "READY"}

    # Mock target creation
    with patch.object(gateway, "create_targets"):
        gateway.update()

    assert gateway.gateway_arn == "arn:aws:bedrock:us-east-1:123456789012:gateway/gateway-123"
    assert gateway.gateway_url == "https://gateway-123.execute-api.us-east-1.amazonaws.com"


def test_update_missing_gateway_id(gateway_mcp_factory):
    """Test gateway update without gateway ID."""
    gateway, _ = gateway_mcp_factory()

    with pytest.raises(RuntimeError, match="Failed to update MCP gateway.*Gateway ID is required for update operation"):
        gateway.update()


@patch("utils.gateway_mcp.retry_with_backoff")
def test_update_failure(mock_retry, gateway_mcp_factory):
    """Test gateway update failure."""
    gateway, mock_client = gateway_mcp_factory(gateway_id="gateway-123")

    mock_client.get_gateway.side_effect = Exception("API Error")

    with pytest.raises(RuntimeError, match="Failed to update MCP gateway"):
        gateway.update()


def test_delete_success(gateway_mcp_factory):
    """Test successful gateway deletion."""
    gateway, mock_client = gateway_mcp_factory(gateway_id="gateway-123")

    mock_client.list_gateway_targets.return_value = {"items": []}

    gateway.delete()

    mock_client.delete_gateway.assert_called_once_with(gatewayIdentifier="gateway-123")


def test_delete_missing_gateway_id(gateway_mcp_factory):
    """Test gateway deletion without gateway ID."""
    gateway, mock_client = gateway_mcp_factory()

    # When gateway_id is None, it will try to delete and fail
    # This should raise a RuntimeError
    with pytest.raises(RuntimeError, match="Failed to delete MCP gateway"):
        gateway.delete()


def test_delete_failure(gateway_mcp_factory):
    """Test gateway deletion failure."""
    gateway, mock_client = gateway_mcp_factory(gateway_id="gateway-123")

    mock_client.list_gateway_targets.side_effect = Exception("API Error")

    with pytest.raises(RuntimeError, match="Failed to delete MCP gateway"):
        gateway.delete()


def test_to_dict(gateway_mcp_factory):
    """Test to_dict method."""
    gateway, _ = gateway_mcp_factory(gateway_id="gateway-123")
    gateway.gateway_arn = "arn:aws:bedrock:us-east-1:123456789012:gateway/gateway-123"
    gateway.gateway_url = "https://gateway-123.execute-api.us-east-1.amazonaws.com"
    gateway.targets = [
        {"targetId": "target-1", "targetName": "test-target", "targetType": "lambda", "status": "ACTIVE"}
    ]

    result = gateway.to_dict()

    assert result["GatewayId"] == "gateway-123"
    assert result["GatewayArn"] == "arn:aws:bedrock:us-east-1:123456789012:gateway/gateway-123"
    assert result["GatewayUrl"] == "https://gateway-123.execute-api.us-east-1.amazonaws.com"
    assert result["GatewayName"] == "test-gateway"
    assert result["TargetCount"] == 1
    assert len(result["Targets"]) == 1


def test_wait_for_gateway_active_success(gateway_mcp_factory):
    """Test _wait_for_gateway_active with successful transition."""
    gateway, mock_client = gateway_mcp_factory(gateway_id="gateway-123")

    mock_client.get_gateway.return_value = {"status": "READY"}

    result = gateway._wait_for_gateway_active(max_wait_time=10, poll_interval=1)

    assert result is True


def test_wait_for_gateway_active_timeout(gateway_mcp_factory):
    """Test _wait_for_gateway_active with timeout."""
    gateway, mock_client = gateway_mcp_factory(gateway_id="gateway-123")

    mock_client.get_gateway.return_value = {"status": "CREATING"}

    with pytest.raises(TimeoutError, match="Gateway did not become READY"):
        gateway._wait_for_gateway_active(max_wait_time=2, poll_interval=1)


def test_wait_for_gateway_active_failed_state(gateway_mcp_factory):
    """Test _wait_for_gateway_active with failed state."""
    gateway, mock_client = gateway_mcp_factory(gateway_id="gateway-123")

    mock_client.get_gateway.return_value = {"status": "FAILED"}

    with pytest.raises(RuntimeError, match="Gateway entered terminal state: FAILED"):
        gateway._wait_for_gateway_active(max_wait_time=10, poll_interval=1)


def test_wait_for_targets_cleared_success(gateway_mcp_factory):
    """Test _wait_for_targets_cleared with successful clearing."""
    gateway, mock_client = gateway_mcp_factory(gateway_id="gateway-123")

    mock_client.list_gateway_targets.return_value = {"items": []}

    result = gateway._wait_for_targets_cleared(max_wait_time=10, poll_interval=1)

    assert result is True


def test_wait_for_targets_cleared_timeout(gateway_mcp_factory):
    """Test _wait_for_targets_cleared with timeout."""
    gateway, mock_client = gateway_mcp_factory(gateway_id="gateway-123")

    mock_client.list_gateway_targets.return_value = {"items": [{"targetId": "target-1"}]}

    with pytest.raises(TimeoutError, match="Targets still present after timeout"):
        gateway._wait_for_targets_cleared(max_wait_time=2, poll_interval=1)
