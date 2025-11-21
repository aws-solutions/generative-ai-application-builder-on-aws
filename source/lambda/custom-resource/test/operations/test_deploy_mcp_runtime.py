#!/usr/bin/env python
# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

import pytest
from unittest.mock import Mock, patch

from operations.deploy_mcp_runtime import execute, validate_required_props


@pytest.fixture
def test_event():
    """Fixture for test event data."""
    return {
        "RequestType": "Create",
        "ResourceProperties": {
            "USE_CASE_CONFIG_RECORD_KEY": "test-config-key",
            "USE_CASE_CONFIG_TABLE_NAME": "test-table",
            "MCPAgentCoreName": "gaab_mcp_10002017",
            "EXECUTION_ROLE_ARN": "arn:aws:iam::123456789012:role/MCPRuntimeExecutionRole",
            "COGNITO_USER_POOL_ID": "us-east-1_test123"
        },
    }


@pytest.fixture
def mock_context():
    """Fixture for mock Lambda context."""
    context = Mock()
    context.log_stream_name = "test-log-stream"
    return context


@pytest.fixture
def mock_runtime_config():
    """Fixture for mock runtime configuration."""
    return {
        "ecr_uri": "123456789012.dkr.ecr.us-east-1.amazonaws.com/my-mcp-server:latest",
        "environment_variables": {"ENV_VAR_1": "value1", "ENV_VAR_2": "value2"},
    }


# Test validate_required_props
def test_validate_required_props_success(test_event):
    """Test validation passes with all required properties."""
    validate_required_props("Create", test_event["ResourceProperties"])
    # Should not raise any exception


def test_validate_required_props_missing_property(test_event):
    """Test validation fails when required property is missing."""
    incomplete_props = test_event["ResourceProperties"].copy()
    del incomplete_props["EXECUTION_ROLE_ARN"]
    
    with pytest.raises(ValueError, match="EXECUTION_ROLE_ARN is required"):
        validate_required_props("Create", incomplete_props)


# Execute function tests
@patch("operations.deploy_mcp_runtime.send_response")
@patch("operations.deploy_mcp_runtime.RuntimeMCP")
@patch("operations.deploy_mcp_runtime.MCPConfigManager")
def test_execute_create_success(mock_config_manager_class, mock_runtime_class, mock_send_response, test_event, mock_context, mock_runtime_config):
    """Test successful execution of create request."""
    # Mock config manager
    mock_config_manager = Mock()
    mock_config_manager_class.return_value = mock_config_manager
    mock_config_manager.get_mcp_runtime_config.return_value = mock_runtime_config
    
    # Mock RuntimeMCP instance
    mock_runtime = Mock()
    mock_runtime_class.return_value = mock_runtime
    mock_runtime.runtime_id = "test-runtime-123"
    mock_runtime.to_dict.return_value = {
        "MCPRuntimeArn": "arn:aws:bedrock-agentcore:us-east-1:123456789012:runtime/test-runtime-123",
        "MCPRuntimeId": "test-runtime-123",
        "MCPAgentCoreName": "gaab_mcp_10002017",
    }

    execute(test_event, mock_context)

    # Verify RuntimeMCP was instantiated
    mock_runtime_class.assert_called_once()
    
    # Verify create was called
    mock_runtime.create.assert_called_once()
    
    # Verify config was updated
    mock_config_manager.update_runtime_config.assert_called_once()
    
    # Verify response was sent
    mock_send_response.assert_called_once()
    call_args = mock_send_response.call_args[0]
    assert call_args[2] == "SUCCESS"
    assert call_args[4] == "test-runtime-123"  # PhysicalResourceId


@patch("operations.deploy_mcp_runtime.send_response")
@patch("operations.deploy_mcp_runtime.RuntimeMCP")
@patch("operations.deploy_mcp_runtime.MCPConfigManager")
def test_execute_update_success(mock_config_manager_class, mock_runtime_class, mock_send_response, test_event, mock_context, mock_runtime_config):
    """Test successful execution of update request."""
    update_event = {**test_event, "RequestType": "Update", "PhysicalResourceId": "test-runtime-123"}
    
    # Mock config manager
    mock_config_manager = Mock()
    mock_config_manager_class.return_value = mock_config_manager
    mock_config_manager.get_mcp_runtime_config.return_value = mock_runtime_config
    
    # Mock RuntimeMCP instance
    mock_runtime = Mock()
    mock_runtime_class.return_value = mock_runtime
    mock_runtime.runtime_id = "test-runtime-123"
    mock_runtime.to_dict.return_value = {"Message": "Runtime updated successfully"}

    execute(update_event, mock_context)

    # Verify update was called
    mock_runtime.update.assert_called_once()
    mock_send_response.assert_called_once()


@patch("operations.deploy_mcp_runtime.send_response")
@patch("operations.deploy_mcp_runtime.RuntimeMCP")
@patch("operations.deploy_mcp_runtime.MCPConfigManager")
def test_execute_delete_success(mock_config_manager_class, mock_runtime_class, mock_send_response, test_event, mock_context):
    """Test successful execution of delete request."""
    delete_event = {
        "RequestType": "Delete",
        "PhysicalResourceId": "test-runtime-123",
        "ResourceProperties": test_event["ResourceProperties"],
    }
    
    # Mock config manager
    mock_config_manager = Mock()
    mock_config_manager_class.return_value = mock_config_manager
    
    # Mock RuntimeMCP instance
    mock_runtime = Mock()
    mock_runtime_class.return_value = mock_runtime
    mock_runtime.to_dict.return_value = {"Message": "Runtime deleted successfully"}

    execute(delete_event, mock_context)

    # Verify delete was called
    mock_runtime.delete.assert_called_once()
    mock_send_response.assert_called_once()


@patch("operations.deploy_mcp_runtime.send_response")
def test_execute_unsupported_request_type(mock_send_response, test_event, mock_context):
    """Test execution failure for unsupported request type."""
    invalid_event = {
        "RequestType": "InvalidType",
        "ResourceProperties": test_event["ResourceProperties"],
    }

    execute(invalid_event, mock_context)

    mock_send_response.assert_called_once()
    call_args = mock_send_response.call_args[0]
    assert call_args[2] == "FAILED"


@patch("operations.deploy_mcp_runtime.send_response")
@patch("operations.deploy_mcp_runtime.RuntimeMCP")
@patch("operations.deploy_mcp_runtime.MCPConfigManager")
def test_execute_handler_exception(mock_config_manager_class, mock_runtime_class, mock_send_response, test_event, mock_context, mock_runtime_config):
    """Test execution when handler raises an exception."""
    # Mock config manager
    mock_config_manager = Mock()
    mock_config_manager_class.return_value = mock_config_manager
    mock_config_manager.get_mcp_runtime_config.return_value = mock_runtime_config
    
    # Mock RuntimeMCP to raise exception
    mock_runtime = Mock()
    mock_runtime_class.return_value = mock_runtime
    mock_runtime.create.side_effect = Exception("Handler error")

    execute(test_event, mock_context)

    mock_send_response.assert_called_once()
    call_args = mock_send_response.call_args
    assert call_args[0][2] == "FAILED"
    # Error message is in the reason keyword argument
    assert "Handler error" in call_args[1]["reason"]
