#!/usr/bin/env python
# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

import pytest
from unittest.mock import Mock, patch
from utils.runtime_mcp import RuntimeMCP


@pytest.fixture
def runtime_mcp_factory():
    """Factory fixture to create RuntimeMCP instances."""

    @patch("utils.agentcore_mcp.get_service_client")
    @patch.dict("os.environ", {"AWS_REGION": "us-east-1"})
    def _create_runtime(mock_get_client, runtime_id=None):
        mock_client = Mock()
        mock_get_client.return_value = mock_client

        config = {
            "ecr_uri": "123456789012.dkr.ecr.us-east-1.amazonaws.com/mcp-server:latest",
            "environment_variables": {"CUSTOM_VAR": "custom_value"},
            "use_case_description": "Test runtime description",
        }

        runtime = RuntimeMCP(
            config=config,
            cognito_user_pool_id="us-east-1_ABC123",
            runtime_name="test-runtime",
            execution_role_arn="arn:aws:iam::123456789012:role/test-role",
            table_name="test-table",
            config_key="test-key",
            runtime_id=runtime_id,
        )

        return runtime, mock_client

    return _create_runtime


def test_initialization(runtime_mcp_factory):
    """Test RuntimeMCP initialization."""
    runtime, _ = runtime_mcp_factory()

    assert runtime.runtime_name == "test-runtime"
    assert runtime.execution_role_arn == "arn:aws:iam::123456789012:role/test-role"
    assert runtime.table_name == "test-table"
    assert runtime.config_key == "test-key"
    assert runtime.runtime_id is None
    assert runtime.runtime_arn is None


def test_mcp_image_uri_valid(runtime_mcp_factory):
    """Test mcp_image_uri property with valid ECR URI."""
    runtime, _ = runtime_mcp_factory()

    assert runtime.mcp_image_uri == "123456789012.dkr.ecr.us-east-1.amazonaws.com/mcp-server:latest"


def test_mcp_image_uri_missing(runtime_mcp_factory):
    """Test mcp_image_uri property when ECR URI is missing."""
    runtime, _ = runtime_mcp_factory()
    runtime.config = {}

    with pytest.raises(ValueError, match="EcrUri not found in MCP runtime configuration"):
        _ = runtime.mcp_image_uri


def test_mcp_image_uri_no_tag(runtime_mcp_factory):
    """Test mcp_image_uri property when ECR URI has no tag."""
    runtime, _ = runtime_mcp_factory()
    runtime.config["ecr_uri"] = "123456789012.dkr.ecr.us-east-1.amazonaws.com/mcp-server"

    with pytest.raises(ValueError, match="Invalid ECR URI format.*must include a tag"):
        _ = runtime.mcp_image_uri


def test_environment_variables(runtime_mcp_factory):
    """Test environment_variables property."""
    runtime, _ = runtime_mcp_factory()

    env_vars = runtime.environment_variables

    assert env_vars["USE_CASE_CONFIG_TABLE_NAME"] == "test-table"
    assert env_vars["USE_CASE_CONFIG_RECORD_KEY"] == "test-key"
    assert env_vars["CUSTOM_VAR"] == "custom_value"


def test_environment_variables_no_custom(runtime_mcp_factory):
    """Test environment_variables property without custom variables."""
    runtime, _ = runtime_mcp_factory()
    runtime.config["environment_variables"] = {}

    env_vars = runtime.environment_variables

    assert env_vars["USE_CASE_CONFIG_TABLE_NAME"] == "test-table"
    assert env_vars["USE_CASE_CONFIG_RECORD_KEY"] == "test-key"
    assert "CUSTOM_VAR" not in env_vars


def test_base_runtime_params(runtime_mcp_factory):
    """Test base_runtime_params property."""
    runtime, _ = runtime_mcp_factory()

    params = runtime.base_runtime_params

    assert params["agentRuntimeArtifact"]["containerConfiguration"]["containerUri"] == runtime.mcp_image_uri
    assert params["roleArn"] == "arn:aws:iam::123456789012:role/test-role"
    assert params["networkConfiguration"]["networkMode"] == "PUBLIC"
    assert params["protocolConfiguration"]["serverProtocol"] == "MCP"
    assert params["description"] == "Test runtime description"
    assert "environmentVariables" in params


def test_create_runtime_params(runtime_mcp_factory):
    """Test create_runtime_params property."""
    runtime, _ = runtime_mcp_factory()

    params = runtime.create_runtime_params

    assert params["agentRuntimeName"] == "test-runtime"
    assert "agentRuntimeArtifact" in params
    assert "roleArn" in params


def test_update_runtime_params(runtime_mcp_factory):
    """Test update_runtime_params property."""
    runtime, _ = runtime_mcp_factory(runtime_id="runtime-123")

    params = runtime.update_runtime_params

    assert params["agentRuntimeId"] == "runtime-123"
    assert "agentRuntimeArtifact" in params
    assert "roleArn" in params


@patch("utils.runtime_mcp.retry_with_backoff")
def test_create_success(mock_retry, runtime_mcp_factory):
    """Test successful runtime creation."""
    runtime, _ = runtime_mcp_factory()

    mock_retry.return_value = {
        "agentRuntimeId": "runtime-abc123",
        "agentRuntimeArn": "arn:aws:bedrock:us-east-1:123456789012:agent-runtime/runtime-abc123",
    }

    runtime.create()

    assert runtime.runtime_id == "runtime-abc123"
    assert runtime.runtime_arn == "arn:aws:bedrock:us-east-1:123456789012:agent-runtime/runtime-abc123"
    mock_retry.assert_called_once()


@patch("utils.runtime_mcp.retry_with_backoff")
def test_create_missing_response_fields(mock_retry, runtime_mcp_factory):
    """Test runtime creation with missing response fields."""
    runtime, _ = runtime_mcp_factory()

    mock_retry.return_value = {}

    with pytest.raises(
        RuntimeError, match="Failed to create MCP runtime.*Runtime creation response missing required fields"
    ):
        runtime.create()


@patch("utils.runtime_mcp.retry_with_backoff")
def test_create_failure(mock_retry, runtime_mcp_factory):
    """Test runtime creation failure."""
    runtime, _ = runtime_mcp_factory()

    mock_retry.side_effect = Exception("API Error")

    with pytest.raises(RuntimeError, match="Failed to create MCP runtime"):
        runtime.create()


@patch("utils.runtime_mcp.retry_with_backoff")
def test_update_success(mock_retry, runtime_mcp_factory):
    """Test successful runtime update."""
    runtime, _ = runtime_mcp_factory(runtime_id="runtime-123")

    mock_retry.return_value = {
        "agentRuntimeArn": "arn:aws:bedrock:us-east-1:123456789012:agent-runtime/runtime-123",
        "authorizerConfiguration": {"customJWTAuthorizer": {"allowedClients": ["-"]}},
    }

    runtime.update()

    assert runtime.runtime_arn == "arn:aws:bedrock:us-east-1:123456789012:agent-runtime/runtime-123"
    mock_retry.assert_called()


@patch("utils.runtime_mcp.retry_with_backoff")
def test_update_missing_runtime_id(mock_retry, runtime_mcp_factory):
    """Test runtime update without runtime ID."""
    runtime, _ = runtime_mcp_factory()

    with pytest.raises(RuntimeError, match="Failed to update MCP runtime.*Runtime ID is required for update operation"):
        runtime.update()


@patch("utils.runtime_mcp.retry_with_backoff")
def test_update_failure(mock_retry, runtime_mcp_factory):
    """Test runtime update failure."""
    runtime, _ = runtime_mcp_factory(runtime_id="runtime-123")

    mock_retry.side_effect = Exception("Update failed")

    with pytest.raises(RuntimeError, match="Failed to update MCP runtime"):
        runtime.update()


@patch("utils.runtime_mcp.retry_with_backoff")
def test_delete_success(mock_retry, runtime_mcp_factory):
    """Test successful runtime deletion."""
    runtime, _ = runtime_mcp_factory(runtime_id="runtime-123")

    runtime.delete()

    mock_retry.assert_called_once_with(runtime.agentcore_client.delete_agent_runtime, agentRuntimeId="runtime-123")


@patch("utils.runtime_mcp.retry_with_backoff")
def test_delete_missing_runtime_id(mock_retry, runtime_mcp_factory):
    """Test runtime deletion with unknown runtime ID."""
    runtime, _ = runtime_mcp_factory(runtime_id="unknown")

    # Should not raise an exception, just log an error
    runtime.delete()

    # Verify that retry_with_backoff was not called
    mock_retry.assert_not_called()


@patch("utils.runtime_mcp.retry_with_backoff")
def test_delete_failure(mock_retry, runtime_mcp_factory):
    """Test runtime deletion failure."""
    runtime, _ = runtime_mcp_factory(runtime_id="runtime-123")

    mock_retry.side_effect = Exception("Delete failed")

    with pytest.raises(RuntimeError, match="Failed to delete MCP runtime"):
        runtime.delete()


def test_to_dict(runtime_mcp_factory):
    """Test to_dict method."""
    runtime, _ = runtime_mcp_factory(runtime_id="runtime-123")
    runtime.runtime_arn = "arn:aws:bedrock:us-east-1:123456789012:agent-runtime/runtime-123"

    result = runtime.to_dict()

    assert result["MCPRuntimeId"] == "runtime-123"
    assert result["MCPRuntimeArn"] == "arn:aws:bedrock:us-east-1:123456789012:agent-runtime/runtime-123"
    assert result["MCPAgentCoreName"] == "test-runtime"
