#!/usr/bin/env python
# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

from unittest.mock import Mock, patch

import pytest
from botocore.exceptions import ClientError
from operations.deploy_agent_core import (
    _build_runtime_environment_variables,
    _build_runtime_request,
    _build_update_request,
    _delete_runtime_resource,
    _ensure_ecr_image_exists,
    _extract_resource_properties,
    _find_runtime_for_deletion,
    _find_runtime_id_by_name,
    _get_runtime_description,
    _log_configuration_changes,
    _validate_runtime_response,
    create_agent_runtime,
    delete_agent_runtime,
    execute,
    update_agent_runtime,
)
from utils.agent_core_utils import format_error_message, handle_client_error, validate_event_properties


class TestDeployAgentCore:
    """Test cases for deploy_agent_core operation."""

    def setup_method(self):
        """Set up test fixtures."""
        self.mock_context = Mock()
        self.mock_context.log_stream_name = "test-log-stream"

        self.base_event = {
            "RequestType": "Create",
            "ResourceProperties": {
                "AgentRuntimeName": "test-runtime",
                "AgentImageUri": "123456789012.dkr.ecr.us-east-1.amazonaws.com/test-repo:latest",
                "ExecutionRoleArn": "arn:aws:iam::123456789012:role/test-role",
                "UseCaseConfigRecordKey": "12345678-1234-1234-1234-123456789012",
                "UseCaseUUID": "53e345af-deb5-45a6-8e26-c96854eb4a4d",
                "UseCaseConfigTableName": "test-config-table",
                "MemoryId": "test-memory-id-123",
            },
            "ResponseURL": "https://test-response-url.com",
            "StackId": "test-stack-id",
            "RequestId": "test-request-id",
            "LogicalResourceId": "test-logical-id",
        }

    @patch("operations.deploy_agent_core.get_service_client")
    @patch("operations.deploy_agent_core.send_response")
    def test_execute_create_with_memory_id(self, mock_send_response, mock_get_service_client):
        """Test successful CREATE operation with provided memory ID."""
        mock_client = Mock()
        mock_get_service_client.return_value = mock_client

        # Memory creation should not be called since memory ID is provided
        mock_client.create_agent_runtime.return_value = {
            "agentRuntimeArn": "arn:aws:bedrock-agentcore:us-east-1:123456789012:runtime/test-runtime-id",
            "agentRuntimeId": "test-runtime-id",
        }

        mock_client.create_agent_runtime.return_value = {
            "agentRuntimeArn": "arn:aws:bedrock-agentcore:us-east-1:123456789012:agent-runtime/test-runtime",
            "agentRuntimeId": "runtime-id-123",
        }

        # Set AWS_REGION environment variable for the test
        with patch.dict("os.environ", {"AWS_REGION": "us-east-1"}):
            execute(self.base_event, self.mock_context)

        mock_get_service_client.assert_called_with("bedrock-agentcore-control")
        mock_send_response.assert_called_once()

        call_args = mock_send_response.call_args
        assert call_args[0][2] == "SUCCESS"  # status parameter

        # Verify that create_agent_runtime was called with authorizer configuration
        create_runtime_calls = mock_client.create_agent_runtime.call_args_list
        assert len(create_runtime_calls) == 1

    @patch("operations.deploy_agent_core.get_service_client")
    @patch("operations.deploy_agent_core.send_response")
    def test_execute_create_with_custom_allowed_clients(self, mock_send_response, mock_get_service_client):
        """Test CREATE operation with custom allowed clients."""
        mock_client = Mock()
        mock_get_service_client.return_value = mock_client

        mock_client.create_agent_runtime.return_value = {
            "agentRuntimeArn": "arn:aws:bedrock-agentcore:us-east-1:123456789012:agent-runtime/test-runtime",
            "agentRuntimeId": "runtime-id-123",
        }

        # Add custom allowed clients to the event
        self.base_event["ResourceProperties"]["AllowedClients"] = ["client-1", "client-2"]

        execute(self.base_event, self.mock_context)

        # Verify that create_agent_runtime was called with custom allowed clients
        create_runtime_calls = mock_client.create_agent_runtime.call_args_list
        assert len(create_runtime_calls) == 1

    @patch("operations.deploy_agent_core.get_service_client")
    @patch("operations.deploy_agent_core.send_response")
    def test_execute_update_with_cognito_authorizer(self, mock_send_response, mock_get_service_client):
        """Test successful UPDATE operation with Cognito authorizer configuration."""
        mock_client = Mock()
        mock_get_service_client.return_value = mock_client
        self.base_event["RequestType"] = "Update"

        mock_client.list_agent_runtimes.return_value = {
            "agentRuntimes": [{"agentRuntimeName": "test-runtime", "agentRuntimeId": "runtime-id-123"}]
        }

        mock_client.get_agent_runtime.return_value = {
            "agentRuntimeArtifact": {"containerConfiguration": {"containerUri": "old-image-uri"}},
            "roleArn": "old-role-arn",
            "networkConfiguration": {"networkMode": "PUBLIC"},
            "environmentVariables": {
                "AGENT_CONFIG_TABLE": "test-config-table",
                "AGENT_CONFIG_KEY": "12345678-1234-1234-1234-123456789012",
            },
        }

        mock_client.update_agent_runtime.return_value = {
            "agentRuntimeArn": "arn:aws:bedrock-agentcore:us-east-1:123456789012:agent-runtime/test-runtime",
            "agentRuntimeId": "runtime-id-123",
        }

        # Set AWS_REGION environment variable for the test
        with patch.dict("os.environ", {"AWS_REGION": "us-east-1"}):
            execute(self.base_event, self.mock_context)

        mock_get_service_client.assert_called_with("bedrock-agentcore-control")
        mock_send_response.assert_called_once()

        call_args = mock_send_response.call_args
        assert call_args[0][2] == "SUCCESS"

        # Verify that update_agent_runtime was called with authorizer configuration
        update_runtime_calls = mock_client.update_agent_runtime.call_args_list
        assert len(update_runtime_calls) == 1

    @patch("operations.deploy_agent_core.get_service_client")
    @patch("operations.deploy_agent_core.send_response")
    def test_execute_create_success(self, mock_send_response, mock_get_service_client):
        """Test successful CREATE operation with bedrock-agentcore client initialization."""
        mock_client = Mock()
        mock_get_service_client.return_value = mock_client

        mock_client.create_agent_runtime.return_value = {
            "agentRuntimeArn": "arn:aws:bedrock-agentcore:us-east-1:123456789012:agent-runtime/test-runtime",
            "agentRuntimeId": "runtime-id-123",
        }

        execute(self.base_event, self.mock_context)

        mock_get_service_client.assert_called_with("bedrock-agentcore-control")
        mock_send_response.assert_called_once()

        call_args = mock_send_response.call_args
        assert call_args[0][2] == "SUCCESS"  # status parameter

        response_data = call_args[0][3]
        assert "AgentRuntimeArn" in response_data
        assert "AgentRuntimeName" in response_data
        assert response_data["AgentRuntimeName"] == "test-runtime"
        assert (
            response_data["AgentRuntimeArn"]
            == "arn:aws:bedrock-agentcore:us-east-1:123456789012:agent-runtime/test-runtime"
        )

    @patch("operations.deploy_agent_core.get_service_client")
    @patch("operations.deploy_agent_core.send_response")
    def test_execute_create_with_m2m_identity_name(self, mock_send_response, mock_get_service_client):
        """Test that M2M_IDENTITY_NAME environment variable is correctly set."""
        mock_client = Mock()
        mock_get_service_client.return_value = mock_client

        mock_client.create_agent_runtime.return_value = {
            "agentRuntimeArn": "arn:aws:bedrock-agentcore:us-east-1:123456789012:agent-runtime/test-runtime",
            "agentRuntimeId": "runtime-id-123",
        }

        with patch.dict("os.environ", {"AWS_REGION": "us-east-1"}):
            execute(self.base_event, self.mock_context)

        # Verify create_agent_runtime was called
        create_runtime_calls = mock_client.create_agent_runtime.call_args_list
        assert len(create_runtime_calls) == 1

        runtime_request = create_runtime_calls[0][1]  # Get keyword arguments
        env_vars = runtime_request.get("environmentVariables", {})

        # Verify M2M_IDENTITY_NAME is set correctly
        # UseCaseUUID is "53e345af-deb5-45a6-8e26-c96854eb4a4d"
        # First segment after split by '-' is "53e345af"
        assert "M2M_IDENTITY_NAME" in env_vars
        assert env_vars["M2M_IDENTITY_NAME"] == "gaab-oauth-provider-53e345af"

        call_args = mock_send_response.call_args
        assert call_args[0][2] == "SUCCESS"  # status parameter

    @patch("operations.deploy_agent_core.get_service_client")
    @patch("operations.deploy_agent_core.send_response")
    def test_execute_update_success(self, mock_send_response, mock_get_service_client):
        """Test successful UPDATE operation."""
        mock_client = Mock()
        mock_get_service_client.return_value = mock_client
        self.base_event["RequestType"] = "Update"

        mock_client.list_agent_runtimes.return_value = {
            "agentRuntimes": [{"agentRuntimeName": "test-runtime", "agentRuntimeId": "runtime-id-123"}]
        }

        mock_client.get_agent_runtime.return_value = {
            "agentRuntimeArtifact": {"containerConfiguration": {"containerUri": "old-image-uri"}},
            "roleArn": "old-role-arn",
            "networkConfiguration": {"networkMode": "PUBLIC"},
            "environmentVariables": {
                "AGENT_CONFIG_TABLE": "test-config-table",
                "AGENT_CONFIG_KEY": "12345678-1234-1234-1234-123456789012",
            },
        }

        mock_client.update_agent_runtime.return_value = {
            "agentRuntimeArn": "arn:aws:bedrock-agentcore:us-east-1:123456789012:agent-runtime/test-runtime"
        }

        execute(self.base_event, self.mock_context)

        mock_get_service_client.assert_called_with("bedrock-agentcore-control")
        mock_send_response.assert_called_once()

        call_args = mock_send_response.call_args
        assert call_args[0][2] == "SUCCESS"

    @patch("operations.deploy_agent_core.get_service_client")
    @patch("operations.deploy_agent_core.send_response")
    def test_execute_delete_success(self, mock_send_response, mock_get_service_client):
        """Test successful DELETE operation."""
        mock_client = Mock()
        mock_get_service_client.return_value = mock_client
        self.base_event["RequestType"] = "Delete"

        # Mock the delete operation to return successfully without any runtime found
        mock_client.list_agent_runtimes.return_value = {"agentRuntimes": []}

        execute(self.base_event, self.mock_context)

        mock_get_service_client.assert_called_with("bedrock-agentcore-control")
        mock_send_response.assert_called_once()

        call_args = mock_send_response.call_args
        assert call_args[0][2] == "SUCCESS"

    @patch("operations.deploy_agent_core.get_service_client")
    @patch("operations.deploy_agent_core.send_response")
    def test_execute_with_memory_enabled(self, mock_send_response, mock_get_service_client):
        """Test CREATE operation with long-term memory enabled."""
        mock_client = Mock()
        mock_get_service_client.return_value = mock_client
        self.base_event["ResourceProperties"]["EnableLongTermMemory"] = "Yes"
        self.base_event["ResourceProperties"]["MemoryStrategy"] = "user_preferences"

        mock_client.create_agent_runtime.return_value = {
            "agentRuntimeArn": "arn:aws:bedrock-agentcore:us-east-1:123456789012:agent-runtime/test-runtime",
            "agentRuntimeId": "runtime-id-123",
        }

        execute(self.base_event, self.mock_context)

        mock_get_service_client.assert_called_with("bedrock-agentcore-control")
        mock_send_response.assert_called_once()

        call_args = mock_send_response.call_args
        assert call_args[0][2] == "SUCCESS"

    @patch("operations.deploy_agent_core.get_service_client")
    @patch("operations.deploy_agent_core.send_response")
    def test_execute_client_error_handling(self, mock_send_response, mock_get_service_client):
        """Test handling of AWS ClientError."""
        from botocore.exceptions import ClientError

        error_response = {"Error": {"Code": "ValidationException", "Message": "Invalid parameter value"}}
        mock_get_service_client.side_effect = ClientError(error_response, "CreateAgentRuntime")

        execute(self.base_event, self.mock_context)

        mock_send_response.assert_called_once()

        call_args = mock_send_response.call_args
        assert call_args[0][2] == "FAILED"

        reason = call_args[1]["reason"]
        assert "ValidationException" in reason
        assert "Invalid parameter value" in reason

    @patch("operations.deploy_agent_core.get_service_client")
    @patch("operations.deploy_agent_core.send_response")
    def test_execute_unexpected_error_handling(self, mock_send_response, mock_get_service_client):
        """Test handling of unexpected errors."""
        mock_get_service_client.side_effect = Exception("Unexpected error occurred")

        execute(self.base_event, self.mock_context)

        mock_send_response.assert_called_once()

        call_args = mock_send_response.call_args
        assert call_args[0][2] == "FAILED"

        reason = call_args[1]["reason"]
        assert "Unexpected Error" in reason
        assert "Unexpected error occurred" in reason

    @patch("operations.deploy_agent_core.get_service_client")
    @patch("operations.deploy_agent_core.send_response")
    def test_execute_missing_required_parameter(self, mock_send_response, mock_get_service_client):
        """Test handling when required parameters are missing."""
        mock_client = Mock()
        mock_get_service_client.return_value = mock_client

        del self.base_event["ResourceProperties"]["AgentRuntimeName"]

        execute(self.base_event, self.mock_context)

        mock_send_response.assert_called_once()

        call_args = mock_send_response.call_args
        assert call_args[0][2] == "FAILED"

    @patch("operations.deploy_agent_core.get_service_client")
    @patch("operations.deploy_agent_core.send_response")
    def test_execute_missing_resource_properties(self, mock_send_response, mock_get_service_client):
        """Test execute function when ResourceProperties is missing from event."""
        mock_client = Mock()
        mock_get_service_client.return_value = mock_client

        event_without_props = {
            "RequestType": "Create",
            "ResponseURL": "https://test-response-url.com",
            "StackId": "test-stack-id",
            "RequestId": "test-request-id",
            "LogicalResourceId": "test-logical-id",
        }

        execute(event_without_props, self.mock_context)

        mock_send_response.assert_called_once()
        call_args = mock_send_response.call_args
        assert call_args[0][2] == "FAILED"  # status

        reason = call_args[1]["reason"]
        assert "Missing ResourceProperties in CloudFormation event" in reason

        physical_resource_id = call_args[0][4]
        assert physical_resource_id == "agent-runtime-unknown"

    @patch("operations.deploy_agent_core.get_service_client")
    @patch("operations.deploy_agent_core.send_response")
    def test_execute_missing_request_type(self, mock_send_response, mock_get_service_client):
        """Test execute function when RequestType is missing from event."""
        mock_client = Mock()
        mock_get_service_client.return_value = mock_client

        event_without_type = {
            "ResourceProperties": self.base_event["ResourceProperties"],
            "ResponseURL": "https://test-response-url.com",
            "StackId": "test-stack-id",
            "RequestId": "test-request-id",
            "LogicalResourceId": "test-logical-id",
        }

        execute(event_without_type, self.mock_context)

        mock_send_response.assert_called_once()
        call_args = mock_send_response.call_args
        assert call_args[0][2] == "FAILED"  # status

        reason = call_args[1]["reason"]
        assert "Missing RequestType in CloudFormation event" in reason

    @patch("operations.deploy_agent_core.get_service_client")
    @patch("operations.deploy_agent_core.send_response")
    def test_execute_unknown_request_type(self, mock_send_response, mock_get_service_client):
        """Test execute function with unknown RequestType."""
        mock_client = Mock()
        mock_get_service_client.return_value = mock_client
        self.base_event["RequestType"] = "Unknown"

        execute(self.base_event, self.mock_context)

        mock_send_response.assert_called_once()
        call_args = mock_send_response.call_args
        assert call_args[0][2] == "FAILED"  # status

        reason = call_args[1]["reason"]
        assert "Unknown CloudFormation request type: Unknown" in reason
        assert "Expected Create, Update, or Delete" in reason

    @patch("operations.deploy_agent_core.get_service_client")
    @patch("operations.deploy_agent_core.send_response")
    def test_execute_missing_multiple_required_parameters(self, mock_send_response, mock_get_service_client):
        """Test execute function when multiple required parameters are missing."""
        mock_client = Mock()
        mock_get_service_client.return_value = mock_client

        del self.base_event["ResourceProperties"]["AgentRuntimeName"]
        del self.base_event["ResourceProperties"]["AgentImageUri"]
        del self.base_event["ResourceProperties"]["ExecutionRoleArn"]

        execute(self.base_event, self.mock_context)

        mock_send_response.assert_called_once()
        call_args = mock_send_response.call_args
        assert call_args[0][2] == "FAILED"  # status

        reason = call_args[1]["reason"]
        assert "Missing required parameter" in reason

    @patch("operations.deploy_agent_core.get_service_client")
    @patch("operations.deploy_agent_core.send_response")
    def test_execute_physical_resource_id_generation(self, mock_send_response, mock_get_service_client):
        """Test that physical resource ID is correctly generated and used."""
        mock_client = Mock()
        mock_get_service_client.return_value = mock_client

        mock_client.create_agent_runtime.return_value = {
            "agentRuntimeArn": "arn:aws:bedrock-agentcore:us-east-1:123456789012:agent-runtime/test-runtime",
            "agentRuntimeId": "runtime-id-123",
        }

        execute(self.base_event, self.mock_context)

        mock_send_response.assert_called_once()
        call_args = mock_send_response.call_args

        physical_resource_id = call_args[0][4]
        assert physical_resource_id == "runtime-id-123"

    @patch("operations.deploy_agent_core.get_service_client")
    @patch("operations.deploy_agent_core.send_response")
    def test_execute_response_data_structure(self, mock_send_response, mock_get_service_client):
        """Test that response data structure is correct for successful operations."""
        mock_client = Mock()
        mock_get_service_client.return_value = mock_client

        expected_arn = "arn:aws:bedrock-agentcore:us-east-1:123456789012:agent-runtime/test-runtime"

        mock_client.create_agent_runtime.return_value = {
            "agentRuntimeArn": expected_arn,
            "agentRuntimeId": "runtime-id-123",
        }

        execute(self.base_event, self.mock_context)

        mock_send_response.assert_called_once()
        call_args = mock_send_response.call_args

        assert call_args[0][2] == "SUCCESS"  # status
        response_data = call_args[0][3]

        assert isinstance(response_data, dict)
        assert "AgentRuntimeArn" in response_data
        assert "AgentRuntimeName" in response_data
        assert "AgentRuntimeId" in response_data
        assert "AgentMemoryId" in response_data
        assert response_data["AgentRuntimeArn"] == expected_arn
        assert response_data["AgentRuntimeName"] == "test-runtime"

    @patch("operations.deploy_agent_core.get_service_client")
    @patch("operations.deploy_agent_core.send_response")
    def test_execute_delete_response_data_structure(self, mock_send_response, mock_get_service_client):
        """Test response data structure for DELETE operations."""
        mock_client = Mock()
        mock_get_service_client.return_value = mock_client
        self.base_event["RequestType"] = "Delete"

        # Mock successful delete with no runtime found
        mock_client.list_agent_runtimes.return_value = {"agentRuntimes": []}

        execute(self.base_event, self.mock_context)

        mock_send_response.assert_called_once()
        call_args = mock_send_response.call_args

        assert call_args[0][2] == "SUCCESS"  # status
        response_data = call_args[0][3]

        assert response_data["AgentRuntimeArn"] == ""
        assert response_data["AgentRuntimeName"] == "test-runtime"
        assert "AgentRuntimeId" in response_data
        assert "AgentMemoryId" in response_data

    @patch("utils.agent_core_utils.get_service_client")
    @patch("operations.deploy_agent_core.send_response")
    def test_execute_no_credentials_error(self, mock_send_response, mock_get_service_client):
        """Test execute function when AWS credentials are not available."""
        from botocore.exceptions import NoCredentialsError

        mock_get_service_client.side_effect = NoCredentialsError()

        execute(self.base_event, self.mock_context)

        mock_send_response.assert_called_once()
        call_args = mock_send_response.call_args
        assert call_args[0][2] == "FAILED"  # status

        reason = call_args[1]["reason"]
        assert "AWS credentials not found" in reason
        assert "Lambda execution role has proper permissions" in reason

    @patch("utils.agent_core_utils.get_service_client")
    @patch("operations.deploy_agent_core.send_response")
    def test_execute_endpoint_connection_error(self, mock_send_response, mock_get_service_client):
        """Test execute function when cannot connect to bedrock-agentcore service."""
        from botocore.exceptions import EndpointConnectionError

        mock_get_service_client.side_effect = EndpointConnectionError(
            endpoint_url="https://bedrock-agentcore.us-east-1.amazonaws.com"
        )

        execute(self.base_event, self.mock_context)

        mock_send_response.assert_called_once()
        call_args = mock_send_response.call_args
        assert call_args[0][2] == "FAILED"  # status

        reason = call_args[1]["reason"]
        assert "Cannot connect to bedrock-agentcore service" in reason

    @patch("operations.deploy_agent_core.get_service_client")
    @patch("operations.deploy_agent_core.send_response")
    def test_execute_client_error_with_context(self, mock_send_response, mock_get_service_client):
        """Test execute function ClientError handling includes operation context."""
        mock_client = Mock()
        mock_get_service_client.return_value = mock_client

        error_response = {
            "Error": {"Code": "ValidationException", "Message": "Invalid runtime configuration"},
            "ResponseMetadata": {"RequestId": "test-request-id-123"},
        }
        mock_client.create_agent_runtime.side_effect = ClientError(error_response, "CreateAgentRuntime")

        execute(self.base_event, self.mock_context)

        mock_send_response.assert_called_once()
        call_args = mock_send_response.call_args
        assert call_args[0][2] == "FAILED"  # status

        reason = call_args[1]["reason"]
        assert "ValidationException" in reason
        assert "Invalid runtime configuration" in reason
        assert "deploy AgentCore runtime" in reason

    @patch("operations.deploy_agent_core.get_service_client")
    @patch("operations.deploy_agent_core.send_response")
    def test_execute_error_propagation_from_runtime_update(self, mock_send_response, mock_get_service_client):
        """Test that errors from runtime update are properly propagated."""
        mock_client = Mock()
        mock_get_service_client.return_value = mock_client
        self.base_event["RequestType"] = "Update"

        mock_client.list_agent_runtimes.return_value = {
            "agentRuntimes": [{"agentRuntimeName": "test-runtime", "agentRuntimeId": "runtime-id-123"}]
        }

        mock_client.get_agent_runtime.return_value = {
            "agentRuntimeArtifact": {"containerConfiguration": {"containerUri": "old-image"}},
            "roleArn": "old-role",
            "networkConfiguration": {"networkMode": "PUBLIC"},
            "environmentVariables": {"AGENT_CONFIG_TABLE": "test-table", "AGENT_CONFIG_KEY": "test-uuid"},
        }

        error_response = {"Error": {"Code": "AccessDeniedException", "Message": "Insufficient permissions"}}
        mock_client.update_agent_runtime.side_effect = ClientError(error_response, "UpdateAgentRuntime")

        execute(self.base_event, self.mock_context)

        mock_send_response.assert_called_once()
        call_args = mock_send_response.call_args
        assert call_args[0][2] == "FAILED"  # status

        reason = call_args[1]["reason"]
        assert "AccessDeniedException" in reason
        assert "Insufficient permissions" in reason

    @patch("operations.deploy_agent_core.get_service_client")
    @patch("operations.deploy_agent_core.send_response")
    def test_execute_error_propagation_from_runtime_deletion(self, mock_send_response, mock_get_service_client):
        """Test that errors from runtime deletion are properly propagated."""
        mock_client = Mock()
        mock_get_service_client.return_value = mock_client
        self.base_event["RequestType"] = "Delete"

        mock_client.list_agent_runtimes.return_value = {
            "agentRuntimes": [{"agentRuntimeName": "test-runtime", "agentRuntimeId": "runtime-id-123"}]
        }

        mock_client.get_agent_runtime.return_value = {"environmentVariables": {"AGENT_CONFIG_TABLE": "test-table"}}

        error_response = {"Error": {"Code": "ConflictException", "Message": "Runtime is in use"}}
        mock_client.delete_agent_runtime.side_effect = ClientError(error_response, "DeleteAgentRuntime")

        execute(self.base_event, self.mock_context)

        mock_send_response.assert_called_once()
        call_args = mock_send_response.call_args
        assert call_args[0][2] == "FAILED"  # status

        reason = call_args[1]["reason"]
        assert "ConflictException" in reason
        assert "Runtime is in use" in reason

    @patch("operations.deploy_agent_core.get_service_client")
    @patch("operations.deploy_agent_core.send_response")
    def test_execute_logging_and_error_context(self, mock_send_response, mock_get_service_client):
        """Test that proper logging and error context is maintained throughout execution."""
        mock_client = Mock()
        mock_get_service_client.return_value = mock_client

        error_response = {"Error": {"Code": "ServiceException", "Message": "Internal service error"}}
        mock_client.create_agent_runtime.side_effect = ClientError(error_response, "CreateAgentRuntime")

        with patch("utils.agent_core_utils.logger") as mock_logger:
            execute(self.base_event, self.mock_context)

        mock_send_response.assert_called_once()
        call_args = mock_send_response.call_args
        assert call_args[0][2] == "FAILED"  # status

        mock_logger.info.assert_called()
        mock_logger.error.assert_called()

        reason = call_args[1]["reason"]
        assert "ServiceException" in reason
        assert "Internal service error" in reason

    @patch("operations.deploy_agent_core.get_service_client")
    @patch("operations.deploy_agent_core.send_response")
    def test_execute_parameter_validation_edge_cases(self, mock_send_response, mock_get_service_client):
        """Test parameter validation edge cases in execute function."""
        mock_client = Mock()
        mock_get_service_client.return_value = mock_client

        self.base_event["ResourceProperties"]["AgentRuntimeName"] = ""
        self.base_event["ResourceProperties"]["AgentImageUri"] = ""

        execute(self.base_event, self.mock_context)

        mock_send_response.assert_called_once()
        call_args = mock_send_response.call_args
        assert call_args[0][2] == "FAILED"  # status - should fail due to invalid ECR URI
        
        reason = call_args[1]["reason"]
        assert "Invalid ECR URI format" in reason

    @patch("operations.deploy_agent_core.get_service_client")
    @patch("operations.deploy_agent_core.send_response")
    def test_execute_update_with_memory_strategy_parameter(self, mock_send_response, mock_get_service_client):
        """Test UPDATE operation includes MemoryStrategy parameter handling."""
        mock_client = Mock()
        mock_get_service_client.return_value = mock_client
        self.base_event["RequestType"] = "Update"
        self.base_event["ResourceProperties"]["MemoryStrategy"] = "conversation_summary"

        mock_client.list_agent_runtimes.return_value = {
            "agentRuntimes": [{"agentRuntimeName": "test-runtime", "agentRuntimeId": "runtime-id-123"}]
        }

        mock_client.get_agent_runtime.return_value = {
            "agentRuntimeArtifact": {"containerConfiguration": {"containerUri": "old-image"}},
            "roleArn": "old-role",
            "networkConfiguration": {"networkMode": "PUBLIC"},
            "environmentVariables": {"AGENT_CONFIG_TABLE": "test-table", "AGENT_CONFIG_KEY": "test-uuid"},
        }

        mock_client.update_agent_runtime.return_value = {
            "agentRuntimeArn": "arn:aws:bedrock-agentcore:us-east-1:123456789012:agent-runtime/test-runtime"
        }

        execute(self.base_event, self.mock_context)

        mock_send_response.assert_called_once()
        call_args = mock_send_response.call_args
        assert call_args[0][2] == "SUCCESS"  # status

        mock_client.update_agent_runtime.assert_called_once()

    @patch("operations.deploy_agent_core.get_service_client")
    @patch("operations.deploy_agent_core.send_response")
    def test_execute_validation_exception_error(self, mock_send_response, mock_get_service_client):
        """Test execute function with ValidationException error."""
        mock_client = Mock()
        mock_get_service_client.return_value = mock_client

        error = ClientError(
            {"Error": {"Code": "ValidationException", "Message": "Invalid parameter"}}, "CreateAgentRuntime"
        )
        mock_client.create_agent_runtime.side_effect = error

        execute(self.base_event, self.mock_context)

        mock_send_response.assert_called_once()
        call_args = mock_send_response.call_args
        assert call_args[0][2] == "FAILED"  # status

        reason = call_args[1]["reason"]
        assert "ValidationException" in reason
        assert "Invalid parameter" in reason

    @patch("operations.deploy_agent_core.get_service_client")
    @patch("operations.deploy_agent_core.send_response")
    def test_execute_resource_not_found_exception_error(self, mock_send_response, mock_get_service_client):
        """Test execute function with ResourceNotFoundException error."""
        mock_client = Mock()
        mock_get_service_client.return_value = mock_client

        error = ClientError(
            {"Error": {"Code": "ResourceNotFoundException", "Message": "Resource not found"}}, "CreateAgentRuntime"
        )
        mock_client.create_agent_runtime.side_effect = error

        execute(self.base_event, self.mock_context)

        mock_send_response.assert_called_once()
        call_args = mock_send_response.call_args
        assert call_args[0][2] == "FAILED"  # status

        reason = call_args[1]["reason"]
        assert "ResourceNotFoundException" in reason
        assert "Resource not found" in reason

    @patch("operations.deploy_agent_core.get_service_client")
    @patch("operations.deploy_agent_core.send_response")
    def test_execute_access_denied_exception_error(self, mock_send_response, mock_get_service_client):
        """Test execute function with AccessDeniedException error."""
        mock_client = Mock()
        mock_get_service_client.return_value = mock_client

        error = ClientError(
            {"Error": {"Code": "AccessDeniedException", "Message": "Access denied"}}, "CreateAgentRuntime"
        )
        mock_client.create_agent_runtime.side_effect = error

        execute(self.base_event, self.mock_context)

        mock_send_response.assert_called_once()
        call_args = mock_send_response.call_args
        assert call_args[0][2] == "FAILED"  # status

        reason = call_args[1]["reason"]
        assert "AccessDeniedException" in reason
        assert "Access denied" in reason

    @patch("operations.deploy_agent_core.get_service_client")
    @patch("operations.deploy_agent_core.send_response")
    def test_execute_conflict_exception_error(self, mock_send_response, mock_get_service_client):
        """Test execute function with ConflictException error."""
        mock_client = Mock()
        mock_get_service_client.return_value = mock_client

        error = ClientError(
            {"Error": {"Code": "ConflictException", "Message": "Resource conflict"}}, "CreateAgentRuntime"
        )
        mock_client.create_agent_runtime.side_effect = error

        execute(self.base_event, self.mock_context)

        mock_send_response.assert_called_once()
        call_args = mock_send_response.call_args
        assert call_args[0][2] == "FAILED"  # status

        reason = call_args[1]["reason"]
        assert "ConflictException" in reason
        assert "Resource conflict" in reason


class TestMemoryConfiguration:
    """Test cases for memory configuration functionality."""

    def setup_method(self):
        """Set up test fixtures for memory configuration tests."""
        self.runtime_name = "test-runtime"
        self.memory_config_name = f"{self.runtime_name}_memory_config"


class TestMemoryCleanupOnDeletion:
    """Test cases for memory configuration cleanup during runtime deletion."""

    def setup_method(self):
        """Set up test fixtures for memory cleanup tests."""
        self.runtime_name = "test-runtime"
        self.memory_id = "test-memory-id-cleanup"

    @patch("operations.deploy_agent_core.get_service_client")
    def test_delete_agent_runtime(self, mock_get_service_client):
        """Test delete_agent_runtime."""
        mock_client = Mock()
        mock_get_service_client.return_value = mock_client

        mock_client.list_agent_runtimes.return_value = {
            "agentRuntimes": [{"agentRuntimeName": self.runtime_name, "agentRuntimeId": "runtime-id-123"}]
        }

        mock_client.delete_agent_runtime.return_value = {}

        delete_agent_runtime(self.runtime_name)

        mock_client.list_agent_runtimes.assert_called_once()

        mock_client.delete_agent_runtime.assert_called_once_with(agentRuntimeId="runtime-id-123")


class TestHelperFunctions:
    """Test cases for helper functions."""

    def test_format_error_message_basic(self):
        """Test format_error_message with basic parameters."""
        result = format_error_message("create_runtime", "ValidationException", "Invalid parameter")
        expected = "Failed to create_runtime: ValidationException - Invalid parameter"
        assert result == expected

    def test_format_error_message_with_context(self):
        """Test format_error_message with context information."""
        context = {"runtime_name": "test-runtime", "image_uri": "test-image"}
        result = format_error_message("create_runtime", "ValidationException", "Invalid parameter", context)
        expected = "Failed to create_runtime: ValidationException - Invalid parameter (Context: runtime_name=test-runtime, image_uri=test-image)"
        assert result == expected

    def test_format_error_message_with_none_context_values(self):
        """Test format_error_message filters out None context values."""
        context = {"runtime_name": "test-runtime", "image_uri": None, "role_arn": "test-role"}
        result = format_error_message("create_runtime", "ValidationException", "Invalid parameter", context)
        expected = "Failed to create_runtime: ValidationException - Invalid parameter (Context: runtime_name=test-runtime, role_arn=test-role)"
        assert result == expected

    def test_validate_event_properties_success(self):
        """Test validate_event_properties with valid event."""
        event = {"ResourceProperties": {"test": "value"}, "RequestType": "Create"}
        validate_event_properties(event)  # Should not raise

    def test_validate_event_properties_missing_resource_properties(self):
        """Test validate_event_properties with missing ResourceProperties."""
        event = {"RequestType": "Create"}
        with pytest.raises(ValueError, match="Missing ResourceProperties in CloudFormation event"):
            validate_event_properties(event)

    def test_validate_event_properties_missing_request_type(self):
        """Test validate_event_properties with missing RequestType."""
        event = {"ResourceProperties": {"test": "value"}}
        with pytest.raises(ValueError, match="Missing RequestType in CloudFormation event"):
            validate_event_properties(event)

    def test_extract_resource_properties_success(self):
        """Test _extract_resource_properties with all required fields."""
        resource_properties = {
            "AgentRuntimeName": "test-runtime",
            "AgentImageUri": "test-image",
            "ExecutionRoleArn": "test-role",
            "UseCaseConfigRecordKey": "test-key",
            "UseCaseConfigTableName": "test-table",
            "UseCaseUUID": "test-uuid",
            "MemoryId": "memid",
        }

        result = _extract_resource_properties(resource_properties)

        assert result["agent_runtime_name"] == "test-runtime"
        assert result["agent_image_uri"] == "test-image"
        assert result["execution_role_arn"] == "test-role"
        assert result["use_case_config_key"] == "test-key"
        assert result["use_case_config_table_name"] == "test-table"
        assert result["use_case_uuid"] == "test-uuid"
        assert result["memory_id"] == "memid"

    def test_extract_resource_properties_missing_field(self):
        """Test _extract_resource_properties with missing required field."""
        resource_properties = {
            "AgentRuntimeName": "test-runtime",
            # Missing AgentImageUri
            "ExecutionRoleArn": "test-role",
            "UseCaseConfigRecordKey": "test-key",
            "UseCaseConfigTableName": "test-table",
            "UseCaseUUID": "test-uuid",
        }

        with pytest.raises(ValueError, match="Missing required parameter: AgentImageUri"):
            _extract_resource_properties(resource_properties)

    @patch("utils.agent_core_utils.logger")
    def test_handle_client_error_basic(self, mock_logger):
        """Test handle_client_error with basic ClientError."""
        error_response = {
            "Error": {"Code": "ValidationException", "Message": "Invalid parameter"},
            "ResponseMetadata": {"RequestId": "test-request-123"},
        }
        client_error = ClientError(error_response, "CreateAgentRuntime")

        with pytest.raises(ClientError):
            handle_client_error(client_error, "create_runtime")

        mock_logger.error.assert_called_once()

    @patch("utils.agent_core_utils.logger")
    def test_handle_client_error_with_context(self, mock_logger):
        """Test handle_client_error with context information."""
        error_response = {
            "Error": {"Code": "ValidationException", "Message": "Invalid parameter"},
            "ResponseMetadata": {"RequestId": "test-request-123"},
        }
        client_error = ClientError(error_response, "CreateAgentRuntime")
        context = {"runtime_name": "test-runtime"}

        with pytest.raises(ClientError):
            handle_client_error(client_error, "create_runtime", context)

        mock_logger.error.assert_called_once()
        call_args = mock_logger.error.call_args
        assert "context" in call_args[1]["extra"]
        assert call_args[1]["extra"]["context"] == context


class TestDeployAgentCoreMultimodality:
    """Test cases for multimodality functionality in deploy_agent_core operation."""

    def setup_method(self):
        """Set up test fixtures."""
        self.mock_context = Mock()
        self.mock_context.log_stream_name = "test-log-stream"

    def test_extract_resource_properties_with_multimodal_data(self):
        """Test _extract_resource_properties includes multimodal data parameters when both are provided."""
        resource_properties = {
            "AgentRuntimeName": "test-runtime",
            "AgentImageUri": "123456789012.dkr.ecr.us-east-1.amazonaws.com/test-repo:latest",
            "ExecutionRoleArn": "arn:aws:iam::123456789012:role/test-role",
            "UseCaseConfigRecordKey": "12345678-1234-1234-1234-123456789012",
            "UseCaseConfigTableName": "test-config-table",
            "UseCaseUUID": "53e345af-deb5-45a6-8e26-c96854eb4a4d",
            "MemoryId": "test-memory-id-123",
            "MultimodalDataMetadataTable": "test-multimodal-table",
            "MultimodalDataBucket": "test-multimodal-bucket",
        }

        result = _extract_resource_properties(resource_properties)

        assert result["multimodal_data_metadata_table"] == "test-multimodal-table"
        assert result["multimodal_data_bucket"] == "test-multimodal-bucket"

    def test_extract_resource_properties_default_multimodal_values(self):
        """Test _extract_resource_properties uses default empty values when multimodal parameters are not provided."""
        resource_properties = {
            "AgentRuntimeName": "test-runtime",
            "AgentImageUri": "123456789012.dkr.ecr.us-east-1.amazonaws.com/test-repo:latest",
            "ExecutionRoleArn": "arn:aws:iam::123456789012:role/test-role",
            "UseCaseConfigRecordKey": "12345678-1234-1234-1234-123456789012",
            "UseCaseConfigTableName": "test-config-table",
            "UseCaseUUID": "53e345af-deb5-45a6-8e26-c96854eb4a4d",
        }

        result = _extract_resource_properties(resource_properties)

        assert result["multimodal_data_metadata_table"] == ""
        assert result["multimodal_data_bucket"] == ""

    def test_extract_resource_properties_partial_multimodal_data_table_only(self):
        """Test _extract_resource_properties when only table is provided (should fail validation)."""
        resource_properties = {
            "AgentRuntimeName": "test-runtime",
            "AgentImageUri": "123456789012.dkr.ecr.us-east-1.amazonaws.com/test-repo:latest",
            "ExecutionRoleArn": "arn:aws:iam::123456789012:role/test-role",
            "UseCaseConfigRecordKey": "12345678-1234-1234-1234-123456789012",
            "UseCaseConfigTableName": "test-config-table",
            "UseCaseUUID": "53e345af-deb5-45a6-8e26-c96854eb4a4d",
            "MultimodalDataMetadataTable": "test-multimodal-table",
        }

        with pytest.raises(ValueError) as exc_info:
            _extract_resource_properties(resource_properties)

        assert "Both MultimodalDataBucket and MultimodalDataMetadataTable must be provided together" in str(
            exc_info.value
        )

    def test_extract_resource_properties_partial_multimodal_data_bucket_only(self):
        """Test _extract_resource_properties when only bucket is provided (should fail validation)."""
        resource_properties = {
            "AgentRuntimeName": "test-runtime",
            "AgentImageUri": "123456789012.dkr.ecr.us-east-1.amazonaws.com/test-repo:latest",
            "ExecutionRoleArn": "arn:aws:iam::123456789012:role/test-role",
            "UseCaseConfigRecordKey": "12345678-1234-1234-1234-123456789012",
            "UseCaseConfigTableName": "test-config-table",
            "UseCaseUUID": "53e345af-deb5-45a6-8e26-c96854eb4a4d",
            "MultimodalDataBucket": "test-multimodal-bucket",
        }

        with pytest.raises(ValueError) as exc_info:
            _extract_resource_properties(resource_properties)

        assert "Both MultimodalDataBucket and MultimodalDataMetadataTable must be provided together" in str(
            exc_info.value
        )

    @patch.dict("os.environ", {"AWS_REGION": "us-west-2"})
    def test_build_runtime_environment_variables_with_multimodal_data(self):
        """Test _build_runtime_environment_variables includes multimodal env vars when both table and bucket are provided."""
        env_vars = _build_runtime_environment_variables(
            config_table_name="test-config-table",
            use_case_config_key="12345678-1234-1234-1234-123456789012",
            use_case_uuid="53e345af-deb5-45a6-8e26-c96854eb4a4d",
            memory_id="test-memory-id-123",
            multimodal_data_metadata_table="test-multimodal-table",
            multimodal_data_bucket="test-multimodal-bucket",
        )

        # Verify core environment variables
        assert env_vars["USE_CASE_TABLE_NAME"] == "test-config-table"
        assert env_vars["USE_CASE_CONFIG_KEY"] == "12345678-1234-1234-1234-123456789012"
        assert env_vars["USE_CASE_UUID"] == "53e345af-deb5-45a6-8e26-c96854eb4a4d"
        assert env_vars["AWS_REGION"] == "us-west-2"
        assert env_vars["M2M_IDENTITY_NAME"] == "gaab-oauth-provider-53e345af"
        assert env_vars["MEMORY_ID"] == "test-memory-id-123"

        # Verify multimodal environment variables are included
        assert env_vars["MULTIMODAL_METADATA_TABLE_NAME"] == "test-multimodal-table"
        assert env_vars["MULTIMODAL_DATA_BUCKET"] == "test-multimodal-bucket"

    @patch.dict("os.environ", {"AWS_REGION": "us-east-1"})
    def test_build_runtime_environment_variables_without_multimodal_data(self):
        """Test _build_runtime_environment_variables excludes multimodal env vars when not provided."""
        env_vars = _build_runtime_environment_variables(
            config_table_name="test-config-table",
            use_case_config_key="12345678-1234-1234-1234-123456789012",
            use_case_uuid="53e345af-deb5-45a6-8e26-c96854eb4a4d",
        )

        # Verify core environment variables
        assert env_vars["USE_CASE_TABLE_NAME"] == "test-config-table"
        assert env_vars["USE_CASE_CONFIG_KEY"] == "12345678-1234-1234-1234-123456789012"
        assert env_vars["USE_CASE_UUID"] == "53e345af-deb5-45a6-8e26-c96854eb4a4d"
        assert env_vars["AWS_REGION"] == "us-east-1"
        assert env_vars["M2M_IDENTITY_NAME"] == "gaab-oauth-provider-53e345af"

        # Verify multimodal environment variables are NOT included
        assert "MULTIMODAL_METADATA_TABLE_NAME" not in env_vars
        assert "MULTIMODAL_DATA_BUCKET" not in env_vars
        assert "MEMORY_ID" not in env_vars

    @patch.dict("os.environ", {"AWS_REGION": "us-east-1"})
    def test_build_runtime_environment_variables_empty_multimodal_values(self):
        """Test _build_runtime_environment_variables with empty string multimodal values (should not be included)."""
        env_vars = _build_runtime_environment_variables(
            config_table_name="test-config-table",
            use_case_config_key="12345678-1234-1234-1234-123456789012",
            use_case_uuid="53e345af-deb5-45a6-8e26-c96854eb4a4d",
            multimodal_data_metadata_table="",
            multimodal_data_bucket="",
        )

        # Verify core environment variables are included
        assert env_vars["USE_CASE_UUID"] == "53e345af-deb5-45a6-8e26-c96854eb4a4d"

        # Verify empty multimodal values are not included as environment variables
        assert "MULTIMODAL_METADATA_TABLE_NAME" not in env_vars
        assert "MULTIMODAL_DATA_BUCKET" not in env_vars

    @patch("operations.deploy_agent_core.get_service_client")
    @patch("operations.deploy_agent_core.send_response")
    def test_execute_create_with_multimodal_data(self, mock_send_response, mock_get_service_client):
        """Test CREATE operation with multimodal data parameters."""
        mock_client = Mock()
        mock_get_service_client.return_value = mock_client

        mock_client.create_agent_runtime.return_value = {
            "agentRuntimeArn": "arn:aws:bedrock-agentcore:us-east-1:123456789012:agent-runtime/test-runtime",
            "agentRuntimeId": "runtime-id-123",
        }

        event = {
            "RequestType": "Create",
            "ResourceProperties": {
                "AgentRuntimeName": "test-runtime",
                "AgentImageUri": "123456789012.dkr.ecr.us-east-1.amazonaws.com/test-repo:latest",
                "ExecutionRoleArn": "arn:aws:iam::123456789012:role/test-role",
                "UseCaseConfigRecordKey": "12345678-1234-1234-1234-123456789012",
                "UseCaseUUID": "53e345af-deb5-45a6-8e26-c96854eb4a4d",
                "UseCaseConfigTableName": "test-config-table",
                "MemoryId": "test-memory-id-123",
                "MultimodalDataMetadataTable": "test-multimodal-table",
                "MultimodalDataBucket": "test-multimodal-bucket",
            },
            "ResponseURL": "https://test-response-url.com",
            "StackId": "test-stack-id",
            "RequestId": "test-request-id",
            "LogicalResourceId": "test-logical-id",
        }

        with patch.dict("os.environ", {"AWS_REGION": "us-east-1"}):
            execute(event, self.mock_context)

        mock_send_response.assert_called_once()
        call_args = mock_send_response.call_args
        assert call_args[0][2] == "SUCCESS"

        # Verify response data includes all expected fields
        response_data = call_args[0][3]
        assert "AgentRuntimeArn" in response_data
        assert "AgentRuntimeName" in response_data
        assert "AgentRuntimeId" in response_data
        assert "AgentMemoryId" in response_data

    @patch("operations.deploy_agent_core.get_service_client")
    @patch("operations.deploy_agent_core.send_response")
    def test_execute_update_with_multimodal_data(self, mock_send_response, mock_get_service_client):
        """Test UPDATE operation with multimodal data parameters."""
        mock_client = Mock()
        mock_get_service_client.return_value = mock_client

        mock_client.list_agent_runtimes.return_value = {
            "agentRuntimes": [{"agentRuntimeName": "test-runtime", "agentRuntimeId": "runtime-id-123"}]
        }

        mock_client.get_agent_runtime.return_value = {
            "agentRuntimeArtifact": {"containerConfiguration": {"containerUri": "old-image-uri"}},
            "roleArn": "old-role-arn",
            "networkConfiguration": {"networkMode": "PUBLIC"},
            "environmentVariables": {
                "USE_CASE_TABLE_NAME": "test-config-table",
                "USE_CASE_CONFIG_KEY": "12345678-1234-1234-1234-123456789012",
            },
        }

        mock_client.update_agent_runtime.return_value = {
            "agentRuntimeArn": "arn:aws:bedrock-agentcore:us-east-1:123456789012:agent-runtime/test-runtime"
        }

        event = {
            "RequestType": "Update",
            "ResourceProperties": {
                "AgentRuntimeName": "test-runtime",
                "AgentImageUri": "123456789012.dkr.ecr.us-east-1.amazonaws.com/test-repo:latest",
                "ExecutionRoleArn": "arn:aws:iam::123456789012:role/test-role",
                "UseCaseConfigRecordKey": "12345678-1234-1234-1234-123456789012",
                "UseCaseUUID": "53e345af-deb5-45a6-8e26-c96854eb4a4d",
                "UseCaseConfigTableName": "test-config-table",
                "MemoryId": "test-memory-id-123",
                "MultimodalDataMetadataTable": "updated-multimodal-table",
                "MultimodalDataBucket": "updated-multimodal-bucket",
            },
            "ResponseURL": "https://test-response-url.com",
            "StackId": "test-stack-id",
            "RequestId": "test-request-id",
            "LogicalResourceId": "test-logical-id",
        }

        with patch.dict("os.environ", {"AWS_REGION": "us-east-1"}):
            execute(event, self.mock_context)

        mock_send_response.assert_called_once()
        call_args = mock_send_response.call_args
        assert call_args[0][2] == "SUCCESS"

        # Verify update_agent_runtime was called with multimodal parameters
        update_call_args = mock_client.update_agent_runtime.call_args
        env_vars = update_call_args[1]["environmentVariables"]
        assert env_vars["MULTIMODAL_METADATA_TABLE_NAME"] == "updated-multimodal-table"
        assert env_vars["MULTIMODAL_DATA_BUCKET"] == "updated-multimodal-bucket"


class TestEnsureEcrImageExists:
    """Test cases for _ensure_ecr_image_exists function."""

    def setup_method(self):
        """Set up test fixtures."""
        self.mock_context = Mock()
        self.mock_context.log_stream_name = "test-log-stream"
        self.mock_ecr_client = Mock()

    def test_invalid_image_uri_format(self):
        """Test that invalid ECR URI format raises ValueError."""
        invalid_uri = "invalid-uri-format"
        
        with pytest.raises(ValueError, match="Invalid ECR URI format"):
            _ensure_ecr_image_exists(invalid_uri)

    @patch('operations.deploy_agent_core.get_service_client')
    def test_image_already_exists(self, mock_get_client):
        """Test when ECR image already exists."""
        mock_get_client.return_value = self.mock_ecr_client
        self.mock_ecr_client.describe_images.return_value = {"imageDetails": []}
        
        image_uri = "276036092881.dkr.ecr.us-west-2.amazonaws.com/test-repo:latest"
        
        _ensure_ecr_image_exists(image_uri)
        
        self.mock_ecr_client.describe_images.assert_called_once_with(
            registryId="276036092881",
            repositoryName="test-repo",
            imageIds=[{'imageTag': 'latest'}]
        )
        self.mock_ecr_client.batch_get_image.assert_not_called()

    @patch('operations.deploy_agent_core.retry_with_backoff')
    @patch('operations.deploy_agent_core.get_service_client')
    def test_image_not_exists_triggers_pull_through_cache(self, mock_get_client, mock_retry):
        """Test when ECR image doesn't exist and pull-through cache is triggered."""
        mock_get_client.return_value = self.mock_ecr_client
        
        # First describe_images call fails (image doesn't exist)
        self.mock_ecr_client.describe_images.side_effect = ClientError(
            error_response={'Error': {'Code': 'ImageNotFoundException', 'Message': 'Image not found'}},
            operation_name='DescribeImages'
        )
        
        image_uri = "276036092881.dkr.ecr.us-west-2.amazonaws.com/test-repo:v1.0.0"
        
        _ensure_ecr_image_exists(image_uri)
        
        expected_params = {
            "registryId": "276036092881",
            "repositoryName": "test-repo",
            "imageIds": [{'imageTag': 'v1.0.0'}]
        }
        
        # Verify describe_images was called first
        self.mock_ecr_client.describe_images.assert_called_with(**expected_params)
        
        # Verify batch_get_image was called to trigger pull-through cache
        self.mock_ecr_client.batch_get_image.assert_called_once_with(**expected_params)
        
        # Verify retry_with_backoff was called to wait for image
        mock_retry.assert_called_once_with(self.mock_ecr_client.describe_images, max_attempts=10, base_delay=2, **expected_params)

    @patch('operations.deploy_agent_core.retry_with_backoff')
    @patch('operations.deploy_agent_core.get_service_client')
    def test_repository_not_exists_triggers_pull_through_cache(self, mock_get_client, mock_retry):
        """Test when ECR repository doesn't exist and pull-through cache is triggered."""
        mock_get_client.return_value = self.mock_ecr_client
        
        # First describe_images call fails (repository doesn't exist)
        self.mock_ecr_client.describe_images.side_effect = ClientError(
            error_response={'Error': {'Code': 'RepositoryNotFoundException', 'Message': 'Repository not found'}},
            operation_name='DescribeImages'
        )
        
        image_uri = "276036092881.dkr.ecr.us-west-2.amazonaws.com/new-repo:latest"
        
        _ensure_ecr_image_exists(image_uri)
        
        expected_params = {
            "registryId": "276036092881",
            "repositoryName": "new-repo",
            "imageIds": [{'imageTag': 'latest'}]
        }
        
        self.mock_ecr_client.batch_get_image.assert_called_once_with(**expected_params)
        mock_retry.assert_called_once_with(self.mock_ecr_client.describe_images, max_attempts=10, base_delay=2, **expected_params)

    @patch('operations.deploy_agent_core.handle_client_error')
    @patch('operations.deploy_agent_core.get_service_client')
    def test_unexpected_client_error_raises_exception(self, mock_get_client, mock_handle_error):
        """Test that unexpected ClientError is handled and re-raised."""
        mock_get_client.return_value = self.mock_ecr_client
        
        # Unexpected error
        unexpected_error = ClientError(
            error_response={'Error': {'Code': 'AccessDeniedException', 'Message': 'Access denied'}},
            operation_name='DescribeImages'
        )
        self.mock_ecr_client.describe_images.side_effect = unexpected_error
        
        image_uri = "276036092881.dkr.ecr.us-west-2.amazonaws.com/test-repo:latest"
        
        with pytest.raises(ClientError):
            _ensure_ecr_image_exists(image_uri)
        
        mock_handle_error.assert_called_once()

    def test_image_uri_without_tag_defaults_to_latest(self):
        """Test that image URI without tag defaults to 'latest'."""
        
        with patch('operations.deploy_agent_core.get_service_client') as mock_get_client:
            mock_get_client.return_value = self.mock_ecr_client
            self.mock_ecr_client.describe_images.return_value = {"imageDetails": []}
            
            image_uri = "276036092881.dkr.ecr.us-west-2.amazonaws.com/test-repo"
            
            _ensure_ecr_image_exists(image_uri)
            
            self.mock_ecr_client.describe_images.assert_called_once_with(
                registryId="276036092881",
                repositoryName="test-repo",
                imageIds=[{'imageTag': 'latest'}]
            )

    def test_pull_through_cache_repository_path(self):
        """Test that pull-through cache repository paths are handled correctly."""
        
        with patch('operations.deploy_agent_core.get_service_client') as mock_get_client:
            mock_get_client.return_value = self.mock_ecr_client
            self.mock_ecr_client.describe_images.return_value = {"imageDetails": []}
            
            # Pull-through cache URI with namespace
            image_uri = "276036092881.dkr.ecr.us-west-2.amazonaws.com/ecr-public/bedrock/agent-runtime:v1.0.0"
            
            _ensure_ecr_image_exists(image_uri)
            
            self.mock_ecr_client.describe_images.assert_called_once_with(
                registryId="276036092881",
                repositoryName="ecr-public/bedrock/agent-runtime",
                imageIds=[{'imageTag': 'v1.0.0'}]
            )