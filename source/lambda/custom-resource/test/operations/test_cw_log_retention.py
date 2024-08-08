#!/usr/bin/env python
######################################################################################################################
#  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.                                                #
#                                                                                                                    #
#  Licensed under the Apache License, Version 2.0 (the "License"). You may not use this file except in compliance    #
#  with the License. A copy of the License is located at                                                             #
#                                                                                                                    #
#      http://www.apache.org/licenses/LICENSE-2.0                                                                    #
#                                                                                                                    #
#  or in the 'license' file accompanying this file. This file is distributed on an 'AS IS' BASIS, WITHOUT WARRANTIES #
#  OR CONDITIONS OF ANY KIND, express or implied. See the License for the specific language governing permissions    #
#  and limitations under the License.                                                                                #
######################################################################################################################


import pytest
from unittest import mock
from operations.cw_log_retention import (
    FUNCTION_NAME,
    verify_env_setup,
    update_retention_policy,
    execute,
    create_log_group_if_not_exists,
    get_log_group_name,
)
from operations.operation_types import (
    FAILED,
    PHYSICAL_RESOURCE_ID,
    RESOURCE,
    RESOURCE_PROPERTIES,
    SUCCESS,
    CW_LOG_RETENTION,
)
from test.fixtures.cw_log_retention import (
    lambda_event,
)


@pytest.fixture
def mock_lambda_context():
    mock_context = mock.Mock()
    mock_context.aws_request_id = "test-request-id"
    return mock_context


def test_verify_env_setup_invalid_operation(lambda_event):
    lambda_event[RESOURCE_PROPERTIES][RESOURCE] = "INVALID_OPERATION"
    with pytest.raises(ValueError):
        verify_env_setup(lambda_event)


def test_verify_env_setup_missing_function_name(lambda_event):
    lambda_event[RESOURCE_PROPERTIES][FUNCTION_NAME] = None
    with pytest.raises(ValueError):
        verify_env_setup(lambda_event)


@mock.patch("operations.cw_log_retention.get_service_client")
@mock.patch("operations.cw_log_retention.create_log_group_if_not_exists")
def test_update_retention_policy(create_log_group_if_not_exists, mock_get_service_client, lambda_event):
    mock_lambda_client = mock.Mock()
    mock_logs_client = mock.Mock()
    mock_get_service_client.side_effect = [mock_lambda_client, mock_logs_client]

    mock_lambda_client.get_function.return_value = {"Configuration": {"LoggingConfig": {"LogGroup": "test-log-group"}}}

    update_retention_policy(lambda_event[RESOURCE_PROPERTIES][FUNCTION_NAME])

    mock_lambda_client.get_function.assert_called_once_with(
        FunctionName=lambda_event[RESOURCE_PROPERTIES][FUNCTION_NAME]
    )
    mock_logs_client.put_retention_policy.assert_called_once_with(logGroupName="test-log-group", retentionInDays=3653)


@mock.patch("operations.cw_log_retention.update_retention_policy")
@mock.patch("operations.cw_log_retention.send_response")
def test_execute_create(mock_send_response, mock_update_retention_policy, lambda_event, mock_lambda_context):
    lambda_event["RequestType"] = "Create"
    execute(lambda_event, mock_lambda_context)
    mock_update_retention_policy.assert_called_once_with(function_name=lambda_event[RESOURCE_PROPERTIES][FUNCTION_NAME])
    mock_send_response.assert_called_once_with(lambda_event, mock_lambda_context, SUCCESS, {}, PHYSICAL_RESOURCE_ID)


@mock.patch("operations.cw_log_retention.send_response")
def test_execute_update(mock_send_response, lambda_event, mock_lambda_context):
    lambda_event["RequestType"] = "Update"
    execute(lambda_event, mock_lambda_context)
    mock_send_response.assert_called_once_with(lambda_event, mock_lambda_context, SUCCESS, {}, PHYSICAL_RESOURCE_ID)


@mock.patch("operations.cw_log_retention.send_response")
def test_execute_delete(mock_send_response, lambda_event, mock_lambda_context):
    lambda_event["RequestType"] = "Delete"
    execute(lambda_event, mock_lambda_context)
    mock_send_response.assert_called_once_with(lambda_event, mock_lambda_context, SUCCESS, {}, PHYSICAL_RESOURCE_ID)


@mock.patch("operations.cw_log_retention.update_retention_policy")
@mock.patch("operations.cw_log_retention.send_response")
def test_execute_exception(mock_send_response, mock_update_retention_policy, lambda_event, mock_lambda_context):
    lambda_event["RequestType"] = "Create"
    mock_update_retention_policy.side_effect = Exception("Test exception")
    execute(lambda_event, mock_lambda_context)
    mock_send_response.assert_called_once_with(lambda_event, mock_lambda_context, FAILED, {}, reason="Test exception")


@mock.patch("operations.cw_log_retention.get_service_client")
def test_create_log_group_if_not_exists(mock_get_service_client):
    mock_logs_client = mock.Mock()
    mock_get_service_client.return_value = mock_logs_client
    mock_logs_client.describe_log_groups.return_value = {"logGroups": []}
    create_log_group_if_not_exists("test-log-group", mock_logs_client)
    mock_logs_client.create_log_group.assert_called_once_with(logGroupName="test-log-group")


@mock.patch("operations.cw_log_retention.get_service_client")
def test_get_log_group_name(mock_get_service_client):
    mock_lambda_client = mock.Mock()
    mock_get_service_client.return_value = mock_lambda_client
    mock_lambda_client.get_function.return_value = {"Configuration": {"LoggingConfig": {"LogGroup": "test-log-group"}}}
    log_group = get_log_group_name("test-function")
    assert log_group == "test-log-group"
