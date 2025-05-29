#!/usr/bin/env python
# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0


from unittest import mock

import pytest
import botocore
from operations.update_llm_config import (
    USE_CASE_CONFIG_TABLE_NAME,
    USE_CASE_CONFIG_RECORD_KEY,
    USE_CASE_UUID,
    CONVERSATION_TABLE_NAME,
    execute,
    update_llm_config,
    verify_env_setup,
)
from operations.operation_types import (
    FAILED,
    PHYSICAL_RESOURCE_ID,
    RESOURCE,
    RESOURCE_PROPERTIES,
    SUCCESS,
)
from test.fixtures.update_llm_config import lambda_event


@pytest.fixture
def mock_lambda_context():
    mock_context = mock.Mock()
    mock_context.aws_request_id = "test-request-id"
    return mock_context


def test_verify_env_setup_invalid_operation(lambda_event):
    lambda_event[RESOURCE_PROPERTIES][RESOURCE] = "INVALID_OPERATION"
    with pytest.raises(ValueError):
        verify_env_setup(lambda_event)


def test_verify_env_setup_missing_config_table_name(lambda_event):
    lambda_event[RESOURCE_PROPERTIES][USE_CASE_CONFIG_TABLE_NAME] = None
    with pytest.raises(ValueError):
        verify_env_setup(lambda_event)


def test_verify_env_setup_missing_config_record_key(lambda_event):
    lambda_event[RESOURCE_PROPERTIES][USE_CASE_CONFIG_RECORD_KEY] = None
    with pytest.raises(ValueError):
        verify_env_setup(lambda_event)

def test_verify_env_setup_missing_conversation_table_name(lambda_event):
    lambda_event[RESOURCE_PROPERTIES][USE_CASE_UUID] = None
    with pytest.raises(ValueError):
        verify_env_setup(lambda_event)

def test_verify_env_setup_missing_conversation_table_name(lambda_event):
    lambda_event[RESOURCE_PROPERTIES][CONVERSATION_TABLE_NAME] = None
    with pytest.raises(ValueError):
        verify_env_setup(lambda_event)


@mock.patch("operations.update_llm_config.get_service_client")
def test_update_llm_config_success(mock_get_service_client, lambda_event):
    mock_ddb_client = mock.Mock()
    mock_get_service_client.return_value = mock_ddb_client

    update_llm_config(lambda_event)

    mock_ddb_client.update_item.assert_called_once_with(
        TableName=lambda_event[RESOURCE_PROPERTIES][USE_CASE_CONFIG_TABLE_NAME],
        Key={
            'key': {'S': lambda_event[RESOURCE_PROPERTIES][USE_CASE_CONFIG_RECORD_KEY]},
        },
        UpdateExpression="SET config.ConversationTableName = :conversation_table_name, config.UseCaseUUID = :use_case_uuid",
        ExpressionAttributeValues={
            ':conversation_table_name': {
                'S': lambda_event[RESOURCE_PROPERTIES][CONVERSATION_TABLE_NAME]
                },
            ':use_case_uuid': {
                'S': lambda_event[RESOURCE_PROPERTIES][USE_CASE_UUID]
                }
        }
    )


@mock.patch("operations.update_llm_config.get_service_client")
@mock.patch("operations.update_llm_config.time.sleep")
def test_update_llm_config_retry_success(mock_sleep, mock_get_service_client, lambda_event):
    mock_ddb_client = mock.Mock()
    mock_get_service_client.return_value = mock_ddb_client
    
    # Fail once, then succeed
    mock_ddb_client.update_item.side_effect = [
        botocore.exceptions.ClientError(
            {"Error": {"Code": "ThrottlingException", "Message": "Rate exceeded"}},
            "UpdateItem"
        ),
        None
    ]

    update_llm_config(lambda_event)

    assert mock_ddb_client.update_item.call_count == 2
    mock_sleep.assert_called_once_with(2)


@mock.patch("operations.update_llm_config.get_service_client")
@mock.patch("operations.update_llm_config.time.sleep")
def test_update_llm_config_max_retries(mock_sleep, mock_get_service_client, lambda_event):
    mock_ddb_client = mock.Mock()
    mock_get_service_client.return_value = mock_ddb_client
    
    # Always fail with ClientError
    error = botocore.exceptions.ClientError(
        {"Error": {"Code": "ThrottlingException", "Message": "Rate exceeded"}},
        "UpdateItem"
    )
    mock_ddb_client.update_item.side_effect = error

    with pytest.raises(botocore.exceptions.ClientError):
        update_llm_config(lambda_event)

    assert mock_ddb_client.update_item.call_count == 10  # MAX_RETRIES
    assert mock_sleep.call_count == 9  # MAX_RETRIES - 1


@mock.patch("operations.update_llm_config.update_llm_config")
@mock.patch("operations.update_llm_config.send_response")
def test_execute_create(mock_send_response, mock_update_llm_config, lambda_event, mock_lambda_context):
    lambda_event["RequestType"] = "Create"
    execute(lambda_event, mock_lambda_context)
    mock_update_llm_config.assert_called_once_with(lambda_event)
    mock_send_response.assert_called_once_with(lambda_event, mock_lambda_context, SUCCESS, {}, PHYSICAL_RESOURCE_ID)


@mock.patch("operations.update_llm_config.update_llm_config")
@mock.patch("operations.update_llm_config.send_response")
def test_execute_update(mock_send_response, mock_update_llm_config, lambda_event, mock_lambda_context):
    lambda_event["RequestType"] = "Update"
    execute(lambda_event, mock_lambda_context)
    mock_update_llm_config.assert_called_once_with(lambda_event)
    mock_send_response.assert_called_once_with(lambda_event, mock_lambda_context, SUCCESS, {}, PHYSICAL_RESOURCE_ID)


@mock.patch("operations.update_llm_config.send_response")
def test_execute_delete(mock_send_response, lambda_event, mock_lambda_context):
    lambda_event["RequestType"] = "Delete"
    execute(lambda_event, mock_lambda_context)
    # No update should be called for delete
    mock_send_response.assert_called_once_with(lambda_event, mock_lambda_context, SUCCESS, {}, PHYSICAL_RESOURCE_ID)


@mock.patch("operations.update_llm_config.update_llm_config")
@mock.patch("operations.update_llm_config.send_response")
def test_execute_exception(mock_send_response, mock_update_llm_config, lambda_event, mock_lambda_context):
    lambda_event["RequestType"] = "Create"
    mock_update_llm_config.side_effect = Exception("Test exception")
    execute(lambda_event, mock_lambda_context)
    mock_send_response.assert_called_once_with(lambda_event, mock_lambda_context, FAILED, {}, reason="Test exception")
