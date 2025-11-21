#!/usr/bin/env python
# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

import pytest
import os
from unittest.mock import Mock, patch
from boto3.dynamodb.types import TypeDeserializer, TypeSerializer

from utils.mcp_config_manager import MCPConfigManager


# Fixtures
@pytest.fixture
def mock_ddb_client():
    """Mock DynamoDB client fixture."""
    return Mock()


@pytest.fixture
def sample_config():
    """Sample MCP configuration for testing."""
    return {
        "UseCaseType": "MCPServer",
        "UseCaseName": "test-mcp",
        "UseCaseDescription": "Test MCP Gateway",
        "MCPParams": {
            "GatewayParams": {
                "TargetParams": [
                    {
                        "TargetName": "test-lambda",
                        "TargetType": "lambda",
                        "SchemaUri": "mcp/schemas/lambda/test-schema.json",
                        "LambdaArn": "arn:aws:lambda:us-east-1:123456789012:function:test-function",
                        "TargetDescription": "Test Lambda target",
                    },
                    {
                        "TargetName": "test-openapi",
                        "TargetType": "openApiSchema",
                        "SchemaUri": "mcp/schemas/openapi/test-schema.json",
                        "TargetDescription": "Test OpenAPI target",
                    },
                ]
            }
        },
    }


@pytest.fixture
def sample_gateway_result():
    """Sample gateway creation result for testing."""
    return {
        "gateway_id": "test-gateway-123",
        "gateway_arn": "arn:aws:bedrock-agentcore:us-east-1:123456789012:gateway/test-gateway-123",
        "gateway_name": "test-mcp",
        "gateway_url": "https://test-gateway-123.gateway.bedrock-agentcore.us-east-1.amazonaws.com/mcp",
        "targets": [
            {"targetId": "target-456", "targetName": "test-lambda", "targetType": "lambda"},
            {"targetId": "target-789", "targetName": "test-openapi", "targetType": "openApiSchema"},
        ],
    }


@pytest.fixture
def ddb_response_item(sample_config):
    """DynamoDB response item fixture."""
    serializer = TypeSerializer()
    serialized_config = serializer.serialize(sample_config)
    return {"Item": {"key": {"S": "test-key"}, "config": serialized_config}}


@pytest.fixture
def sample_runtime_config():
    """Sample MCP runtime configuration for testing."""
    return {
        "UseCaseType": "MCPServer",
        "UseCaseName": "test-use-case",
        "UseCaseDescription": "Test MCP use case",
        "MCPParams": {
            "RuntimeParams": {
                "EcrUri": "123456789012.dkr.ecr.us-east-1.amazonaws.com/my-mcp-server:latest",
                "EnvironmentVariables": {"ENV_VAR_1": "value1", "ENV_VAR_2": "value2"},
            }
        },
    }


@patch("utils.mcp_config_manager.get_service_client")
def test_init_with_table_name(mock_get_service_client, mock_ddb_client):
    """Test MCPConfigManager initialization with explicit table name."""
    mock_get_service_client.return_value = mock_ddb_client

    manager = MCPConfigManager(table_name="test-table")

    assert manager.table_name == "test-table"
    assert manager.ddb_client == mock_ddb_client
    assert isinstance(manager.deserializer, TypeDeserializer)
    assert isinstance(manager.serializer, TypeSerializer)
    mock_get_service_client.assert_called_once_with("dynamodb")


@patch.dict(os.environ, {"USE_CASE_CONFIG_TABLE_NAME": "env-table"})
@patch("utils.mcp_config_manager.get_service_client")
def test_init_with_env_var(mock_get_service_client, mock_ddb_client):
    """Test MCPConfigManager initialization with environment variable."""
    mock_get_service_client.return_value = mock_ddb_client

    manager = MCPConfigManager()

    assert manager.table_name == "env-table"


@patch("utils.mcp_config_manager.get_service_client")
def test_init_missing_table_name(mock_get_service_client):
    """Test MCPConfigManager initialization fails without table name."""
    mock_get_service_client.return_value = Mock()

    with patch.dict(os.environ, {}, clear=True):
        with pytest.raises(ValueError, match="Table name must be provided"):
            MCPConfigManager()


# read_mcp_config Tests
@patch("utils.mcp_config_manager.get_service_client")
def test_read_mcp_config_success(mock_get_service_client, mock_ddb_client, ddb_response_item, sample_config):
    """Test successful config reading from DynamoDB."""
    mock_get_service_client.return_value = mock_ddb_client
    mock_ddb_client.get_item.return_value = ddb_response_item

    manager = MCPConfigManager(table_name="test-table")
    result = manager.read_mcp_config("test-key")

    assert result == sample_config
    mock_ddb_client.get_item.assert_called_once_with(TableName="test-table", Key={"key": {"S": "test-key"}})


@patch("utils.mcp_config_manager.get_service_client")
def test_read_mcp_config_not_found(mock_get_service_client, mock_ddb_client):
    """Test read_mcp_config when item is not found."""
    mock_get_service_client.return_value = mock_ddb_client
    mock_ddb_client.get_item.return_value = {}  # No Item key

    manager = MCPConfigManager(table_name="test-table")

    with pytest.raises(ValueError, match="Configuration not found for key: nonexistent-key"):
        manager.read_mcp_config("nonexistent-key")


@patch("utils.mcp_config_manager.get_service_client")
def test_read_mcp_config_dynamodb_error(mock_get_service_client, mock_ddb_client):
    """Test read_mcp_config when DynamoDB operation fails."""
    mock_get_service_client.return_value = mock_ddb_client
    mock_ddb_client.get_item.side_effect = Exception("DynamoDB error")

    manager = MCPConfigManager(table_name="test-table")

    with pytest.raises(RuntimeError, match="Failed to read configuration"):
        manager.read_mcp_config("test-key")


# write_config Tests
@patch("utils.mcp_config_manager.get_service_client")
def test_write_config_success(mock_get_service_client, mock_ddb_client, sample_config):
    """Test successful config writing to DynamoDB."""
    mock_get_service_client.return_value = mock_ddb_client
    mock_ddb_client.put_item.return_value = {"ResponseMetadata": {"HTTPStatusCode": 200}}

    manager = MCPConfigManager(table_name="test-table")
    result = manager.write_config("test-key", sample_config)

    assert result["success"] is True
    mock_ddb_client.put_item.assert_called_once()

    # Verify the call arguments
    call_args = mock_ddb_client.put_item.call_args[1]
    assert call_args["TableName"] == "test-table"
    assert call_args["Item"]["key"]["S"] == "test-key"
    assert "config" in call_args["Item"]


# validate_mcp_gateway_config Tests
def test_validate_mcp_gateway_config_success(sample_config):
    """Test successful MCP gateway config validation."""
    manager = MCPConfigManager(table_name="test-table")
    result = manager.validate_mcp_gateway_config(sample_config)

    assert result["use_case_name"] == "test-mcp"
    assert result["use_case_description"] == "Test MCP Gateway"
    assert len(result["target_params"]) == 2
    assert result["target_params"][0]["TargetName"] == "test-lambda"
    assert result["target_params"][1]["TargetName"] == "test-openapi"


def test_validate_mcp_gateway_config_invalid_use_case_type():
    """Test validate_mcp_gateway_config with invalid UseCaseType."""
    manager = MCPConfigManager(table_name="test-table")
    config = {"UseCaseType": "InvalidType"}

    with pytest.raises(ValueError, match="Invalid UseCaseType: InvalidType"):
        manager.validate_mcp_gateway_config(config)


def test_validate_mcp_gateway_config_missing_mcp_params():
    """Test validate_mcp_gateway_config with missing MCPParams."""
    manager = MCPConfigManager(table_name="test-table")
    config = {"UseCaseType": "MCPServer"}

    with pytest.raises(ValueError, match="MCPParams not found in configuration"):
        manager.validate_mcp_gateway_config(config)


def test_validate_mcp_gateway_config_missing_gateway_params():
    """Test validate_mcp_gateway_config with missing GatewayParams."""
    manager = MCPConfigManager(table_name="test-table")
    config = {"UseCaseType": "MCPServer", "MCPParams": {"GatewayParams": None}}

    with pytest.raises(ValueError, match="GatewayParams not found in MCPParams"):
        manager.validate_mcp_gateway_config(config)


def test_validate_mcp_gateway_config_missing_target_params():
    """Test validate_mcp_gateway_config with missing TargetParams."""
    manager = MCPConfigManager(table_name="test-table")
    config = {"UseCaseType": "MCPServer", "MCPParams": {"GatewayParams": {"TargetParams": None}}}

    with pytest.raises(ValueError, match="TargetParams not found in GatewayParams"):
        manager.validate_mcp_gateway_config(config)


def test_validate_mcp_gateway_config_empty_target_params():
    """Test validate_mcp_gateway_config with empty TargetParams."""
    manager = MCPConfigManager(table_name="test-table")
    config = {"UseCaseType": "MCPServer", "MCPParams": {"GatewayParams": {"TargetParams": []}}}

    # Empty list is falsy, so it triggers "TargetParams not found" first
    with pytest.raises(ValueError, match="TargetParams not found in GatewayParams"):
        manager.validate_mcp_gateway_config(config)


# validate_target_params Tests
def test_validate_target_params_success_lambda():
    """Test successful lambda target validation."""
    manager = MCPConfigManager(table_name="test-table")
    target = {
        "TargetName": "test-lambda",
        "TargetType": "lambda",
        "SchemaUri": "test-schema.json",
        "LambdaArn": "arn:aws:lambda:us-east-1:123456789012:function:test",
    }

    # Should not raise any exception
    manager.validate_target_params(target, 0)


def test_validate_target_params_success_openapi():
    """Test successful OpenAPI target validation."""
    manager = MCPConfigManager(table_name="test-table")
    target = {"TargetName": "test-openapi", "TargetType": "openApiSchema", "SchemaUri": "test-schema.json"}

    # Should not raise any exception
    manager.validate_target_params(target, 0)


def test_validate_target_params_missing_required_field():
    """Test validate_target_params with missing required field."""
    manager = MCPConfigManager(table_name="test-table")
    target = {
        "TargetName": "test-target",
        "TargetType": "lambda",
        # Missing SchemaUri
    }

    with pytest.raises(ValueError, match="Required field 'SchemaUri' missing in target 0"):
        manager.validate_target_params(target, 0)


def test_validate_target_params_invalid_target_type():
    """Test validate_target_params with invalid target type."""
    manager = MCPConfigManager(table_name="test-table")
    target = {"TargetName": "test-target", "TargetType": "invalid", "SchemaUri": "test-schema.json"}

    with pytest.raises(ValueError, match="Invalid TargetType: invalid. Must be one of: lambda, openapi, smithyModel"):
        manager.validate_target_params(target, 0)


def test_validate_target_params_lambda_missing_arn():
    """Test validate_target_params for lambda target missing LambdaArn."""
    manager = MCPConfigManager(table_name="test-table")
    target = {
        "TargetName": "test-lambda",
        "TargetType": "lambda",
        "SchemaUri": "test-schema.json",
        # Missing LambdaArn
    }

    with pytest.raises(ValueError, match="LambdaArn required for lambda target 0"):
        manager.validate_target_params(target, 0)


# get_mcp_gateway_config Tests
@patch("utils.mcp_config_manager.get_service_client")
def test_get_mcp_gateway_config_success(mock_get_service_client, mock_ddb_client, ddb_response_item):
    """Test successful get_mcp_gateway_config flow."""
    mock_get_service_client.return_value = mock_ddb_client
    mock_ddb_client.get_item.return_value = ddb_response_item

    manager = MCPConfigManager(table_name="test-table")
    result = manager.get_mcp_gateway_config("test-key")

    assert result["use_case_name"] == "test-mcp"
    assert len(result["target_params"]) == 2


@patch("utils.mcp_config_manager.get_service_client")
def test_get_mcp_gateway_config_validation_failure(mock_get_service_client, mock_ddb_client):
    """Test get_mcp_gateway_config with validation failure."""
    mock_get_service_client.return_value = mock_ddb_client

    # Invalid config
    serializer = TypeSerializer()
    invalid_config = {"UseCaseType": "InvalidType"}
    mock_ddb_client.get_item.return_value = {
        "Item": {"key": {"S": "test-key"}, "config": serializer.serialize(invalid_config)}
    }

    manager = MCPConfigManager(table_name="test-table")

    with pytest.raises(ValueError, match="Invalid UseCaseType"):
        manager.get_mcp_gateway_config("test-key")


# validate_runtime_params Tests
def test_validate_runtime_params_success():
    """Test successful runtime params validation."""
    manager = MCPConfigManager(table_name="test-table")
    runtime_params = {
        "EcrUri": "123456789012.dkr.ecr.us-east-1.amazonaws.com/my-mcp-server:latest",
        "EnvironmentVariables": {"ENV_VAR_1": "value1", "ENV_VAR_2": "value2"},
    }

    # Should not raise any exception
    manager.validate_runtime_params(runtime_params)


def test_validate_runtime_params_missing_ecr_uri():
    """Test validate_runtime_params with missing EcrUri."""
    manager = MCPConfigManager(table_name="test-table")
    runtime_params = {"EnvironmentVariables": {"ENV_VAR_1": "value1"}}

    with pytest.raises(ValueError, match="Required field 'EcrUri' missing in RuntimeParams"):
        manager.validate_runtime_params(runtime_params)


def test_validate_runtime_params_invalid_ecr_uri():
    """Test validate_runtime_params with invalid EcrUri."""
    manager = MCPConfigManager(table_name="test-table")
    runtime_params = {"EcrUri": ""}  # Empty string

    with pytest.raises(ValueError, match="EcrUri must be a non-empty string"):
        manager.validate_runtime_params(runtime_params)


def test_validate_runtime_params_invalid_env_vars_type():
    """Test validate_runtime_params with invalid EnvironmentVariables type."""
    manager = MCPConfigManager(table_name="test-table")
    runtime_params = {
        "EcrUri": "123456789012.dkr.ecr.us-east-1.amazonaws.com/my-mcp-server:latest",
        "EnvironmentVariables": "not-a-dict",
    }

    with pytest.raises(ValueError, match="EnvironmentVariables must be a dictionary"):
        manager.validate_runtime_params(runtime_params)


def test_validate_runtime_params_invalid_env_var_key():
    """Test validate_runtime_params with invalid environment variable key."""
    manager = MCPConfigManager(table_name="test-table")
    runtime_params = {
        "EcrUri": "123456789012.dkr.ecr.us-east-1.amazonaws.com/my-mcp-server:latest",
        "EnvironmentVariables": {"": "value1"},  # Empty key
    }

    with pytest.raises(ValueError, match="Environment variable names must be non-empty strings"):
        manager.validate_runtime_params(runtime_params)


def test_validate_runtime_params_invalid_env_var_value():
    """Test validate_runtime_params with invalid environment variable value."""
    manager = MCPConfigManager(table_name="test-table")
    runtime_params = {
        "EcrUri": "123456789012.dkr.ecr.us-east-1.amazonaws.com/my-mcp-server:latest",
        "EnvironmentVariables": {"ENV_VAR_1": 123},  # Non-string value
    }

    with pytest.raises(ValueError, match="Environment variable 'ENV_VAR_1' value must be a string"):
        manager.validate_runtime_params(runtime_params)


# validate_mcp_runtime_config Tests
def test_validate_mcp_runtime_config_success(sample_runtime_config):
    """Test successful MCP runtime config validation."""
    manager = MCPConfigManager(table_name="test-table")
    result = manager.validate_mcp_runtime_config(sample_runtime_config)

    assert result["use_case_name"] == "test-use-case"
    assert result["use_case_description"] == "Test MCP use case"
    assert result["ecr_uri"] == "123456789012.dkr.ecr.us-east-1.amazonaws.com/my-mcp-server:latest"
    assert result["environment_variables"]["ENV_VAR_1"] == "value1"
    assert result["environment_variables"]["ENV_VAR_2"] == "value2"


def test_validate_mcp_runtime_config_invalid_use_case_type():
    """Test validate_mcp_runtime_config with invalid UseCaseType."""
    manager = MCPConfigManager(table_name="test-table")
    config = {"UseCaseType": "InvalidType"}

    with pytest.raises(ValueError, match="Invalid UseCaseType: InvalidType"):
        manager.validate_mcp_runtime_config(config)


def test_validate_mcp_runtime_config_missing_runtime_params():
    """Test validate_mcp_runtime_config with missing RuntimeParams."""
    manager = MCPConfigManager(table_name="test-table")
    config = {"UseCaseType": "MCPServer", "MCPParams": {"SomeOtherParam": "value"}}  # RuntimeParams is missing

    with pytest.raises(ValueError) as exc_info:
        manager.validate_mcp_runtime_config(config)

    # Check that the error message contains the expected text
    assert "RuntimeParams not found in MCPParams" in str(exc_info.value)


# get_mcp_runtime_config Tests
@patch("utils.mcp_config_manager.get_service_client")
def test_get_mcp_runtime_config_success(mock_get_service_client, mock_ddb_client, sample_runtime_config):
    """Test successful get_mcp_runtime_config flow."""
    mock_get_service_client.return_value = mock_ddb_client

    serializer = TypeSerializer()
    ddb_item = {"Item": {"key": {"S": "test-key"}, "config": serializer.serialize(sample_runtime_config)}}
    mock_ddb_client.get_item.return_value = ddb_item

    manager = MCPConfigManager(table_name="test-table")
    result = manager.get_mcp_runtime_config("test-key")

    assert result["use_case_name"] == "test-use-case"
    assert result["ecr_uri"] == "123456789012.dkr.ecr.us-east-1.amazonaws.com/my-mcp-server:latest"


@patch("utils.mcp_config_manager.get_service_client")
def test_get_mcp_runtime_config_validation_failure(mock_get_service_client, mock_ddb_client):
    """Test get_mcp_runtime_config with validation failure."""
    mock_get_service_client.return_value = mock_ddb_client

    # Invalid config
    serializer = TypeSerializer()
    invalid_config = {"UseCaseType": "InvalidType"}
    mock_ddb_client.get_item.return_value = {
        "Item": {"key": {"S": "test-key"}, "config": serializer.serialize(invalid_config)}
    }

    manager = MCPConfigManager(table_name="test-table")

    with pytest.raises(ValueError, match="Invalid UseCaseType"):
        manager.get_mcp_runtime_config("test-key")


# update_gateway_config Tests
@patch("utils.mcp_config_manager.get_service_client")
def test_update_gateway_config_success(
    mock_get_service_client, mock_ddb_client, ddb_response_item, sample_gateway_result
):
    """Test successful MCP config update with gateway information."""
    mock_get_service_client.return_value = mock_ddb_client
    mock_ddb_client.get_item.return_value = ddb_response_item

    # Mock DynamoDB put_item for write_config method
    mock_ddb_client.put_item.return_value = {"ResponseMetadata": {"HTTPStatusCode": 200}}

    manager = MCPConfigManager(table_name="test-table")
    result = manager.update_gateway_config("test-key", sample_gateway_result)

    # The method should return a dictionary with either success=True or success=False
    assert isinstance(result, dict)
    assert "success" in result


@patch("utils.mcp_config_manager.get_service_client")
def test_update_gateway_config_partial_targets(mock_get_service_client, mock_ddb_client, ddb_response_item):
    """Test update_gateway_config with partial target matches."""
    mock_get_service_client.return_value = mock_ddb_client
    mock_ddb_client.get_item.return_value = ddb_response_item

    # Gateway result with only one target
    partial_gateway_result = {
        "gateway_id": "test-gateway-123",
        "gateway_arn": "arn:aws:bedrock-agentcore:us-east-1:123456789012:gateway/test-gateway-123",
        "gateway_url": "https://test-gateway-123.gateway.bedrock-agentcore.us-east-1.amazonaws.com/mcp",
        "targets": [
            {"targetId": "target-456", "targetName": "test-lambda", "targetType": "lambda"}
            # Missing test-openapi target
        ],
    }

    mock_ddb_client.put_item.return_value = {"ResponseMetadata": {"HTTPStatusCode": 200}}

    manager = MCPConfigManager(table_name="test-table")
    result = manager.update_gateway_config("test-key", partial_gateway_result)

    # The method should return a result dictionary
    assert isinstance(result, dict)
    assert "success" in result


@patch("utils.mcp_config_manager.get_service_client")
def test_update_gateway_config_read_failure(mock_get_service_client, mock_ddb_client):
    """Test update_gateway_config when reading original config fails."""
    mock_get_service_client.return_value = mock_ddb_client

    mock_ddb_client.get_item.side_effect = Exception("DynamoDB read error")

    manager = MCPConfigManager(table_name="test-table")
    result = manager.update_gateway_config("test-key", {"gateway_id": "test"})

    assert result["success"] is False
    assert "error" in result


@patch("utils.mcp_config_manager.get_service_client")
def test_update_gateway_config_write_failure(
    mock_get_service_client, mock_ddb_client, ddb_response_item, sample_gateway_result
):
    """Test update_gateway_config when writing updated config fails."""
    mock_get_service_client.return_value = mock_ddb_client
    mock_ddb_client.get_item.return_value = ddb_response_item

    mock_ddb_client.get_item.return_value = ddb_response_item
    mock_ddb_client.put_item.side_effect = Exception("DynamoDB write error")

    manager = MCPConfigManager(table_name="test-table")
    result = manager.update_gateway_config("test-key", sample_gateway_result)

    assert result["success"] is False
    assert "error" in result


@patch("utils.mcp_config_manager.get_service_client")
def test_update_gateway_config_missing_gateway_params(mock_get_service_client, mock_ddb_client):
    """Test update_gateway_config with malformed original config."""
    mock_get_service_client.return_value = mock_ddb_client

    # Config without proper structure
    malformed_config = {"UseCaseType": "MCPServer"}

    # Config without proper structure
    serializer = TypeSerializer()
    malformed_config = {"UseCaseType": "MCPServer"}
    mock_ddb_client.get_item.return_value = {
        "Item": {"key": {"S": "test-key"}, "config": serializer.serialize(malformed_config)}
    }

    manager = MCPConfigManager(table_name="test-table")
    result = manager.update_gateway_config("test-key", {"gateway_id": "test"})

    assert result["success"] is False
    assert "error" in result


@patch("utils.mcp_config_manager.get_service_client")
def test_update_gateway_config_empty_targets(mock_get_service_client, mock_ddb_client, ddb_response_item):
    """Test update_gateway_config with empty targets in gateway result."""
    mock_get_service_client.return_value = mock_ddb_client
    mock_ddb_client.get_item.return_value = ddb_response_item

    gateway_result_no_targets = {
        "gateway_id": "test-gateway-123",
        "gateway_arn": "arn:aws:bedrock-agentcore:us-east-1:123456789012:gateway/test-gateway-123",
        "gateway_url": "https://test-gateway-123.gateway.bedrock-agentcore.us-east-1.amazonaws.com/mcp",
        "targets": [],  # Empty targets
    }

    mock_ddb_client.put_item.return_value = {"ResponseMetadata": {"HTTPStatusCode": 200}}

    manager = MCPConfigManager(table_name="test-table")
    result = manager.update_gateway_config("test-key", gateway_result_no_targets)

    # The method should return a result dictionary
    assert isinstance(result, dict)
    assert "success" in result


@patch("utils.mcp_config_manager.get_service_client")
def test_gateway_workflow_integration(mock_get_service_client, mock_ddb_client, sample_config, sample_gateway_result):
    """Test gateway workflow: read config -> validate -> update."""
    mock_get_service_client.return_value = mock_ddb_client

    # Setup responses
    serializer = TypeSerializer()
    ddb_item = {"Item": {"key": {"S": "test-key"}, "config": serializer.serialize(sample_config)}}
    mock_ddb_client.get_item.return_value = ddb_item

    manager = MCPConfigManager(table_name="test-table")

    validated_config = manager.get_mcp_gateway_config("test-key")
    assert validated_config["use_case_name"] == "test-mcp"

    # Mock put_item for write_config method
    mock_ddb_client.put_item.return_value = {"ResponseMetadata": {"HTTPStatusCode": 200}}
    update_result = manager.update_gateway_config("test-key", sample_gateway_result)

    # The method should return a result dictionary
    assert isinstance(update_result, dict)
    assert "success" in update_result

    assert mock_ddb_client.get_item.call_count == 2  # get_mcp_gateway_config + update_gateway_config


@patch("utils.mcp_config_manager.get_service_client")
def test_runtime_workflow_integration(mock_get_service_client, mock_ddb_client, sample_runtime_config):
    """Test runtime workflow: read config -> validate runtime config."""
    mock_get_service_client.return_value = mock_ddb_client

    serializer = TypeSerializer()
    ddb_item = {"Item": {"key": {"S": "test-key"}, "config": serializer.serialize(sample_runtime_config)}}
    mock_ddb_client.get_item.return_value = ddb_item

    manager = MCPConfigManager(table_name="test-table")

    # Read and validate runtime config
    validated_config = manager.get_mcp_runtime_config("test-key")
    assert validated_config["use_case_name"] == "test-use-case"
    assert validated_config["ecr_uri"] == "123456789012.dkr.ecr.us-east-1.amazonaws.com/my-mcp-server:latest"
    assert validated_config["environment_variables"]["ENV_VAR_1"] == "value1"

    mock_ddb_client.get_item.assert_called_once()


@patch("utils.mcp_config_manager.get_service_client")
def test_update_runtime_config_success(mock_get_service_client, mock_ddb_client, sample_runtime_config):
    """Test successful update_runtime_config operation."""
    mock_get_service_client.return_value = mock_ddb_client

    # Setup DynamoDB response with existing config
    serializer = TypeSerializer()
    ddb_item = {"Item": {"key": {"S": "test-key"}, "config": serializer.serialize(sample_runtime_config)}}
    mock_ddb_client.get_item.return_value = ddb_item
    mock_ddb_client.put_item.return_value = {"ResponseMetadata": {"HTTPStatusCode": 200}}

    # Runtime result from create/update operation
    runtime_result = {
        "MCPRuntimeId": "runtime-abc123",
        "MCPRuntimeArn": "arn:aws:bedrock-agentcore:us-east-1:123456789012:runtime/runtime-abc123",
        "MCPAgentCoreName": "gaab_mcp_test"
    }

    manager = MCPConfigManager(table_name="test-table")
    result = manager.update_runtime_config("test-key", runtime_result)

    # Verify success
    assert result["success"] is True
    
    # Verify put_item was called
    mock_ddb_client.put_item.assert_called_once()
    
    # Verify the updated config includes runtime info
    call_args = mock_ddb_client.put_item.call_args[1]
    assert call_args["TableName"] == "test-table"


@patch("utils.mcp_config_manager.get_service_client")
def test_update_runtime_config_read_failure(mock_get_service_client, mock_ddb_client):
    """Test update_runtime_config when reading config fails."""
    mock_get_service_client.return_value = mock_ddb_client
    mock_ddb_client.get_item.side_effect = Exception("DynamoDB read error")

    runtime_result = {
        "MCPRuntimeId": "runtime-abc123",
        "MCPRuntimeArn": "arn:aws:bedrock-agentcore:us-east-1:123456789012:runtime/runtime-abc123",
        "MCPAgentCoreName": "gaab_mcp_test"
    }

    manager = MCPConfigManager(table_name="test-table")
    result = manager.update_runtime_config("test-key", runtime_result)

    assert result["success"] is False
    assert "error" in result


@patch("utils.mcp_config_manager.get_service_client")
def test_update_runtime_config_write_failure(mock_get_service_client, mock_ddb_client, sample_runtime_config):
    """Test update_runtime_config when writing config fails."""
    mock_get_service_client.return_value = mock_ddb_client

    serializer = TypeSerializer()
    ddb_item = {"Item": {"key": {"S": "test-key"}, "config": serializer.serialize(sample_runtime_config)}}
    mock_ddb_client.get_item.return_value = ddb_item
    mock_ddb_client.put_item.side_effect = Exception("DynamoDB write error")

    runtime_result = {
        "MCPRuntimeId": "runtime-abc123",
        "MCPRuntimeArn": "arn:aws:bedrock-agentcore:us-east-1:123456789012:runtime/runtime-abc123",
        "MCPAgentCoreName": "gaab_mcp_test"
    }

    manager = MCPConfigManager(table_name="test-table")
    result = manager.update_runtime_config("test-key", runtime_result)

    assert result["success"] is False
    assert "error" in result


@patch("utils.mcp_config_manager.get_service_client")
def test_update_runtime_config_missing_runtime_params(mock_get_service_client, mock_ddb_client):
    """Test update_runtime_config with malformed original config."""
    mock_get_service_client.return_value = mock_ddb_client

    # Config without proper structure
    serializer = TypeSerializer()
    malformed_config = {"UseCaseType": "MCPServer"}
    mock_ddb_client.get_item.return_value = {
        "Item": {"key": {"S": "test-key"}, "config": serializer.serialize(malformed_config)}
    }

    runtime_result = {
        "MCPRuntimeId": "runtime-abc123",
        "MCPRuntimeArn": "arn:aws:bedrock-agentcore:us-east-1:123456789012:runtime/runtime-abc123",
        "MCPAgentCoreName": "gaab_mcp_test"
    }

    manager = MCPConfigManager(table_name="test-table")
    result = manager.update_runtime_config("test-key", runtime_result)

    assert result["success"] is False
    assert "error" in result


@patch("utils.mcp_config_manager.get_service_client")
def test_runtime_update_workflow_integration(mock_get_service_client, mock_ddb_client, sample_runtime_config):
    """Test runtime update workflow: read config -> validate -> update with runtime info."""
    mock_get_service_client.return_value = mock_ddb_client

    serializer = TypeSerializer()
    ddb_item = {"Item": {"key": {"S": "test-key"}, "config": serializer.serialize(sample_runtime_config)}}
    mock_ddb_client.get_item.return_value = ddb_item
    mock_ddb_client.put_item.return_value = {"ResponseMetadata": {"HTTPStatusCode": 200}}

    manager = MCPConfigManager(table_name="test-table")

    # Read and validate runtime config
    validated_config = manager.get_mcp_runtime_config("test-key")
    assert validated_config["use_case_name"] == "test-use-case"
    assert validated_config["ecr_uri"] == "123456789012.dkr.ecr.us-east-1.amazonaws.com/my-mcp-server:latest"

    # Update with runtime info
    runtime_result = {
        "MCPRuntimeId": "runtime-abc123",
        "MCPRuntimeArn": "arn:aws:bedrock-agentcore:us-east-1:123456789012:runtime/runtime-abc123",
        "MCPAgentCoreName": "gaab_mcp_test"
    }
    
    update_result = manager.update_runtime_config("test-key", runtime_result)

    # Verify success
    assert isinstance(update_result, dict)
    assert "success" in update_result
    assert update_result["success"] is True

    # Verify both get and put were called
    assert mock_ddb_client.get_item.call_count == 2  # get_mcp_runtime_config + update_runtime_config
    mock_ddb_client.put_item.assert_called_once()
