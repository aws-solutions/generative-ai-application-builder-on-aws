#!/usr/bin/env python
# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

import unittest
from unittest.mock import Mock, patch
import botocore
from operations.redeploy_api import execute, update_stage


class TestRedeployApi(unittest.TestCase):
    def setUp(self):
        self.context = Mock()
        self.api_gateway_client = Mock()

        # Setup common test data
        self.rest_api_id = "test-api-id"
        self.physical_resource_id = "test-physical-id"
        self.deployment_id = "test-deployment-id"

    @patch("operations.redeploy_api.get_service_client")
    @patch("operations.redeploy_api.send_response")
    def test_execute_create_success(self, mock_send_response, mock_get_client):
        # Arrange
        mock_get_client.return_value = self.api_gateway_client
        self.api_gateway_client.create_deployment.return_value = {"id": self.deployment_id}

        event = {
            "RequestType": "Create",
            "ResourceProperties": {"REST_API_ID": self.rest_api_id},
            "PhysicalResourceId": self.physical_resource_id,
        }

        # Act
        execute(event, self.context)

        # Assert
        self.api_gateway_client.create_deployment.assert_called_once_with(restApiId=self.rest_api_id)
        mock_send_response.assert_called_once_with(event, self.context, "SUCCESS", {}, self.physical_resource_id)

    @patch("operations.redeploy_api.get_service_client")
    @patch("operations.redeploy_api.send_response")
    def test_execute_update_success(self, mock_send_response, mock_get_client):
        # Arrange
        mock_get_client.return_value = self.api_gateway_client
        self.api_gateway_client.create_deployment.return_value = {"id": self.deployment_id}

        event = {
            "RequestType": "Update",
            "ResourceProperties": {"REST_API_ID": self.rest_api_id},
            "PhysicalResourceId": self.physical_resource_id,
        }

        # Act
        execute(event, self.context)

        # Assert
        self.api_gateway_client.create_deployment.assert_called_once()
        mock_send_response.assert_called_once_with(event, self.context, "SUCCESS", {}, self.physical_resource_id)

    @patch("operations.redeploy_api.get_service_client")
    @patch("operations.redeploy_api.send_response")
    def test_execute_delete_success(self, mock_send_response, mock_get_client):
        # Arrange
        mock_get_client.return_value = self.api_gateway_client

        event = {
            "RequestType": "Delete",
            "ResourceProperties": {"REST_API_ID": self.rest_api_id},
            "PhysicalResourceId": self.physical_resource_id,
        }

        # Act
        execute(event, self.context)

        # Assert
        self.api_gateway_client.create_deployment.assert_not_called()
        mock_send_response.assert_called_once_with(event, self.context, "SUCCESS", {}, self.physical_resource_id)

    @patch("operations.redeploy_api.get_service_client")
    @patch("operations.redeploy_api.send_response")
    def test_execute_client_error(self, mock_send_response, mock_get_client):
        # Arrange
        mock_get_client.return_value = self.api_gateway_client
        error = botocore.exceptions.ClientError(
            error_response={"Error": {"Message": "Test error"}}, operation_name="create_deployment"
        )
        self.api_gateway_client.create_deployment.side_effect = error

        event = {
            "RequestType": "Create",
            "ResourceProperties": {"REST_API_ID": self.rest_api_id},
            "PhysicalResourceId": self.physical_resource_id,
        }

        # Act
        execute(event, self.context)

        # Assert
        mock_send_response.assert_called_once_with(
            event, self.context, "FAILED", {}, physical_resource_id=self.physical_resource_id, reason=str(error)
        )

    @patch("operations.redeploy_api.get_service_client")
    @patch("operations.redeploy_api.send_response")
    def test_execute_missing_rest_api_id(self, mock_send_response, mock_get_client):
        # Arrange
        event = {"RequestType": "Create", "ResourceProperties": {}, "PhysicalResourceId": self.physical_resource_id}

        # Act
        execute(event, self.context)

        # Assert
        mock_send_response.assert_called_once()
        call_args = mock_send_response.call_args[0]
        self.assertEqual(call_args[2], "FAILED")

    def test_update_stage_success(self):
        # Arrange
        self.api_gateway_client.create_deployment.return_value = {"id": self.deployment_id}

        # Act
        update_stage(self.api_gateway_client, self.rest_api_id)

        # Assert
        self.api_gateway_client.create_deployment.assert_called_once_with(restApiId=self.rest_api_id)
        self.api_gateway_client.update_stage.assert_called_once_with(
            restApiId=self.rest_api_id,
            stageName="prod",
            patchOperations=[{"op": "replace", "path": "/deploymentId", "value": self.deployment_id}],
        )

    def test_update_stage_client_error(self):
        # Arrange
        error = botocore.exceptions.ClientError(
            error_response={"Error": {"Message": "Test error", "Code": "SomeOtherError"}}, 
            operation_name="create_deployment"
        )
        self.api_gateway_client.create_deployment.side_effect = error

        # Act & Assert
        with self.assertRaises(botocore.exceptions.ClientError):
            update_stage(self.api_gateway_client, self.rest_api_id)
            
    def test_update_stage_not_found_exception(self):
        # Arrange
        error = botocore.exceptions.ClientError(
            error_response={"Error": {"Message": "Resource not found", "Code": "NotFoundException"}}, 
            operation_name="create_deployment"
        )
        self.api_gateway_client.create_deployment.side_effect = error

        # Act
        # This should not raise an exception since NotFoundException is handled
        update_stage(self.api_gateway_client, self.rest_api_id)

        # Assert
        self.api_gateway_client.create_deployment.assert_called_once_with(restApiId=self.rest_api_id)
        # Verify update_stage was not called since the exception happened in create_deployment
        self.api_gateway_client.update_stage.assert_not_called()


if __name__ == "__main__":
    unittest.main()
