#!/usr/bin/env python
# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

import pytest
from unittest.mock import Mock, patch
from utils.agentcore_mcp import AgentcoreMCP


class ConcreteAgentcoreMCP(AgentcoreMCP):
    """Concrete implementation for testing abstract base class."""

    def create(self):
        return {"status": "created"}

    def update(self):
        return {"status": "updated"}

    def delete(self):
        return {"status": "deleted"}


@patch("utils.agentcore_mcp.get_service_client")
@patch.dict("os.environ", {"AWS_REGION": "us-east-1"})
def test_initialization_success(mock_get_client):
    """Test successful initialization of AgentcoreMCP."""
    mock_client = Mock()
    mock_get_client.return_value = mock_client

    config = {"test": "config"}
    cognito_pool_id = "us-east-1_ABC123"

    instance = ConcreteAgentcoreMCP(config, cognito_pool_id)

    assert instance.config == config
    assert instance.cognito_user_pool_id == cognito_pool_id
    assert instance.agentcore_client == mock_client
    mock_get_client.assert_called_once_with("bedrock-agentcore-control", region_name="us-east-1")


@patch("utils.agentcore_mcp.get_service_client")
@patch.dict("os.environ", {"AWS_REGION": "us-west-2"})
def test_initialization_client_retry(mock_get_client):
    """Test client initialization with retry on first failure."""
    mock_client = Mock()
    mock_get_client.side_effect = [Exception("First attempt failed"), mock_client]

    config = {"test": "config"}
    cognito_pool_id = "us-west-2_XYZ789"

    instance = ConcreteAgentcoreMCP(config, cognito_pool_id)

    assert instance.agentcore_client == mock_client
    assert mock_get_client.call_count == 2


@patch("utils.agentcore_mcp.get_service_client")
@patch.dict("os.environ", {"AWS_REGION": "us-east-1"})
def test_base_auth_config_with_cognito(mock_get_client):
    """Test base_auth_config property with Cognito user pool."""
    mock_get_client.return_value = Mock()

    config = {}
    cognito_pool_id = "us-east-1_TEST123"

    instance = ConcreteAgentcoreMCP(config, cognito_pool_id)
    auth_config = instance.base_auth_config

    expected_discovery_url = (
        f"https://cognito-idp.us-east-1.amazonaws.com/{cognito_pool_id}/.well-known/openid-configuration"
    )

    assert "authorizerConfiguration" in auth_config
    assert "customJWTAuthorizer" in auth_config["authorizerConfiguration"]
    assert auth_config["authorizerConfiguration"]["customJWTAuthorizer"]["discoveryUrl"] == expected_discovery_url
    assert auth_config["authorizerConfiguration"]["customJWTAuthorizer"]["allowedClients"] == ["-"]


@patch("utils.agentcore_mcp.get_service_client")
@patch.dict("os.environ", {"AWS_REGION": "us-east-1"})
def test_base_auth_config_without_cognito(mock_get_client):
    """Test base_auth_config property without Cognito user pool."""
    mock_get_client.return_value = Mock()

    config = {}
    cognito_pool_id = None

    instance = ConcreteAgentcoreMCP(config, cognito_pool_id)
    auth_config = instance.base_auth_config

    # Should return None when no cognito pool
    assert auth_config is None


@patch("utils.agentcore_mcp.get_service_client")
@patch.dict("os.environ", {"AWS_REGION": "us-east-1"})
def test_abstract_methods_implemented(mock_get_client):
    """Test that concrete class implements all abstract methods."""
    mock_get_client.return_value = Mock()

    instance = ConcreteAgentcoreMCP({}, "pool-id")

    assert instance.create() == {"status": "created"}
    assert instance.update() == {"status": "updated"}
    assert instance.delete() == {"status": "deleted"}


def test_cannot_instantiate_abstract_class():
    """Test that AgentcoreMCP cannot be instantiated directly."""
    with pytest.raises(TypeError):
        AgentcoreMCP({}, "pool-id", ["client"])
