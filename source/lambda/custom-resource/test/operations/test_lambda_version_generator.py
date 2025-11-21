#!/usr/bin/env python
# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

import pytest
from unittest import mock
from operations.lambda_version_generator import execute, verify_env_setup
from operations.operation_types import FAILED, RESOURCE, RESOURCE_PROPERTIES, SUCCESS
from test.fixtures.lambda_version_generator_events import lambda_event


def test_verify_env_setup_success(lambda_event):
    assert verify_env_setup(lambda_event) is None


def test_verify_env_setup_invalid_operation(lambda_event):
    lambda_event[RESOURCE_PROPERTIES][RESOURCE] = "INVALID_OPERATION"
    with pytest.raises(ValueError, match="Operation type not supported"):
        verify_env_setup(lambda_event)


def test_verify_env_setup_missing_function_name(lambda_event):
    lambda_event[RESOURCE_PROPERTIES]["FunctionName"] = None
    with pytest.raises(ValueError, match="FunctionName has not been passed"):
        verify_env_setup(lambda_event)


@mock.patch("operations.lambda_version_generator.get_service_client")
@mock.patch("operations.lambda_version_generator.send_response")
def test_execute_create_success(mock_send_response, mock_get_service_client, lambda_event, mock_lambda_context):
    lambda_event["RequestType"] = "Create"
    
    mock_lambda_client = mock.Mock()
    mock_get_service_client.return_value = mock_lambda_client
    
    mock_lambda_client.publish_version.return_value = {
        'FunctionArn': 'arn:aws:lambda:us-east-1:123456789012:function:my-function:1',
        'Version': '1'
    }
    
    execute(lambda_event, mock_lambda_context)
    
    mock_lambda_client.publish_version.assert_called_once_with(
        FunctionName='my-function',
        Description='Lambda Version'
    )
    
    mock_send_response.assert_called_once_with(
        lambda_event, 
        mock_lambda_context, 
        SUCCESS, 
        {
            'VersionArn': 'arn:aws:lambda:us-east-1:123456789012:function:my-function:1',
            'VersionNumber': '1'
        }
    )


@mock.patch("operations.lambda_version_generator.get_service_client")
@mock.patch("operations.lambda_version_generator.send_response")
def test_execute_update_success(mock_send_response, mock_get_service_client, lambda_event, mock_lambda_context):
    lambda_event["RequestType"] = "Update"
    
    mock_lambda_client = mock.Mock()
    mock_get_service_client.return_value = mock_lambda_client
    
    mock_lambda_client.publish_version.return_value = {
        'FunctionArn': 'arn:aws:lambda:us-east-1:123456789012:function:my-function:2',
        'Version': '2'
    }
    
    execute(lambda_event, mock_lambda_context)
    
    mock_lambda_client.publish_version.assert_called_once_with(
        FunctionName='my-function',
        Description='Lambda Version'
    )
    
    mock_send_response.assert_called_once_with(
        lambda_event, 
        mock_lambda_context, 
        SUCCESS, 
        {
            'VersionArn': 'arn:aws:lambda:us-east-1:123456789012:function:my-function:2',
            'VersionNumber': '2'
        }
    )


@mock.patch("operations.lambda_version_generator.send_response")
def test_execute_delete_success(mock_send_response, lambda_event, mock_lambda_context):
    lambda_event["RequestType"] = "Delete"
    
    execute(lambda_event, mock_lambda_context)
    
    # For delete, no Lambda client calls should be made
    mock_send_response.assert_called_once_with(
        lambda_event, 
        mock_lambda_context, 
        SUCCESS, 
        {}
    )


@mock.patch("operations.lambda_version_generator.get_service_client")
@mock.patch("operations.lambda_version_generator.send_response")
def test_execute_create_lambda_error(mock_send_response, mock_get_service_client, lambda_event, mock_lambda_context):
    lambda_event["RequestType"] = "Create"
    
    mock_lambda_client = mock.Mock()
    mock_get_service_client.return_value = mock_lambda_client
    
    # Simulate Lambda service error
    mock_lambda_client.publish_version.side_effect = Exception("Lambda service error")
    
    with pytest.raises(Exception, match="Lambda service error"):
        execute(lambda_event, mock_lambda_context)
    
    mock_send_response.assert_called_once_with(
        lambda_event, 
        mock_lambda_context, 
        FAILED, 
        {}, 
        reason="Lambda service error"
    )


@mock.patch("operations.lambda_version_generator.get_service_client")
@mock.patch("operations.lambda_version_generator.send_response")
def test_execute_update_lambda_error(mock_send_response, mock_get_service_client, lambda_event, mock_lambda_context):
    lambda_event["RequestType"] = "Update"
    
    mock_lambda_client = mock.Mock()
    mock_get_service_client.return_value = mock_lambda_client
    
    # Simulate Lambda service error
    mock_lambda_client.publish_version.side_effect = Exception("Function not found")
    
    with pytest.raises(Exception, match="Function not found"):
        execute(lambda_event, mock_lambda_context)
    
    mock_send_response.assert_called_once_with(
        lambda_event, 
        mock_lambda_context, 
        FAILED, 
        {}, 
        reason="Function not found"
    )
