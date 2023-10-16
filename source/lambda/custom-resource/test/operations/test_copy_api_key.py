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

import io
import json
import os
import zipfile
from pathlib import Path, PosixPath
from test.fixtures.copy_api_key_events import lambda_event, setup_secretsmanager

import botocore
import mock
import pytest
from helper import get_service_client
from lambda_func import handler
from moto import mock_secretsmanager
from operations.copy_api_key import API_KEY, SECRETS_MANAGER_API_KEY_NAME, create, delete, execute, verify_env_setup
from operations.operation_types import RESOURCE, RESOURCE_PROPERTIES
from utils.lambda_context_parser import get_invocation_account_id


@pytest.mark.parametrize("requestType", ["Create", "Update", "Delete"])
def test_verify_env_setup_success(lambda_event, requestType):
    lambda_event["RequestType"] = requestType
    assert None == verify_env_setup(lambda_event)


@pytest.mark.parametrize("requestType", ["Create", "Update"])
def test_env_setup_with_no_api_key(monkeypatch, lambda_event, requestType):
    lambda_event["RequestType"] = requestType
    with pytest.raises(ValueError):
        monkeypatch.delitem(lambda_event[RESOURCE_PROPERTIES], API_KEY)
        verify_env_setup(lambda_event)


@pytest.mark.parametrize("requestType", ["Create", "Update"])
def test_env_setup_with_no_secret_name(monkeypatch, lambda_event, requestType):
    lambda_event["RequestType"] = requestType
    with pytest.raises(ValueError):
        monkeypatch.delitem(lambda_event[RESOURCE_PROPERTIES], SECRETS_MANAGER_API_KEY_NAME)
        verify_env_setup(lambda_event)


def test_create_failure(lambda_event, mock_lambda_context):
    with pytest.raises(botocore.exceptions.ClientError):
        create(lambda_event, mock_lambda_context)


@mock_secretsmanager
def test_create_success(lambda_event, mock_lambda_context):
    create(lambda_event, mock_lambda_context)
    secretsmanager = get_service_client("secretsmanager")

    api_key_value = secretsmanager.get_secret_value(
        SecretId=lambda_event[RESOURCE_PROPERTIES][SECRETS_MANAGER_API_KEY_NAME]
    )

    assert api_key_value["SecretString"] == "someapikey"


@mock_secretsmanager
def test_create_success_when_existing(lambda_event, mock_lambda_context):
    secretsmanager = get_service_client("secretsmanager")
    secretsmanager.create_secret(
        Name=lambda_event[RESOURCE_PROPERTIES][SECRETS_MANAGER_API_KEY_NAME],
        SecretString="some-initial-value",
    )
    create(lambda_event, mock_lambda_context)

    api_key_value = secretsmanager.get_secret_value(
        SecretId=lambda_event[RESOURCE_PROPERTIES][SECRETS_MANAGER_API_KEY_NAME]
    )

    assert api_key_value["SecretString"] == "someapikey"


@mock_secretsmanager
def test_delete_failure(monkeypatch, lambda_event, mock_lambda_context):
    monkeypatch.setitem(lambda_event[RESOURCE_PROPERTIES], SECRETS_MANAGER_API_KEY_NAME, "/non-existent/key")
    assert None == delete(lambda_event, mock_lambda_context)


@mock_secretsmanager
def test_delete_success(secretsmanager, lambda_event, mock_lambda_context):
    secretsmanager.create_secret(
        Name=lambda_event[RESOURCE_PROPERTIES][SECRETS_MANAGER_API_KEY_NAME],
        SecretString=lambda_event[RESOURCE_PROPERTIES][API_KEY],
    )
    delete(lambda_event, mock_lambda_context)

    with pytest.raises(botocore.exceptions.ClientError):
        secretsmanager.get_secret_value(SecretId=lambda_event[RESOURCE_PROPERTIES][SECRETS_MANAGER_API_KEY_NAME])


@mock_secretsmanager
@pytest.mark.parametrize("requestType", ["Create", "Update"])
def test_execute_create_and_update(lambda_event, mock_lambda_context, requestType):
    lambda_event["RequestType"] = requestType
    with mock.patch("cfn_response.http") as mocked_PoolManager:
        mocked_PoolManager.return_value = {"status": 200}

        if lambda_event["RequestType"] == "Create" or lambda_event["RequestType"] == "Update":
            assert None == execute(lambda_event, mock_lambda_context)
            mocked_PoolManager.request.assert_called_once_with(
                method="PUT",
                url="https://fakeurl/doesnotexist",
                headers={"content-type": "", "content-length": "278"},
                body='{"Status": "SUCCESS", "Reason": "See the details in CloudWatch Log Stream: fake_logstream_name", "PhysicalResourceId": "fake_physical_resource_id", "StackId": "fakeStackId", "RequestId": "fakeRequestId", "LogicalResourceId": "fakeLogicalResourceId", "NoEcho": false, "Data": {}}',
            )


@mock_secretsmanager()
def test_execute_delete(setup_secretsmanager, mock_lambda_context):
    lambda_event, secretsmanager = setup_secretsmanager
    lambda_event["RequestType"] = "Delete"

    with mock.patch("cfn_response.http") as mocked_PoolManager:
        mocked_PoolManager.return_value = {"status": 200}

        assert None == execute(lambda_event, mock_lambda_context)
        mocked_PoolManager.request.assert_called_once_with(
            method="PUT",
            url="https://fakeurl/doesnotexist",
            headers={"content-type": "", "content-length": "278"},
            body='{"Status": "SUCCESS", "Reason": "See the details in CloudWatch Log Stream: fake_logstream_name", "PhysicalResourceId": "fake_physical_resource_id", "StackId": "fakeStackId", "RequestId": "fakeRequestId", "LogicalResourceId": "fakeLogicalResourceId", "NoEcho": false, "Data": {}}',
        )


@pytest.mark.parametrize("requestType", ["Create", "Update", "Delete"])
def test_execute_failure(monkeypatch, lambda_event, mock_lambda_context, requestType):
    lambda_event["RequestType"] = requestType
    monkeypatch.delitem(lambda_event[RESOURCE_PROPERTIES], SECRETS_MANAGER_API_KEY_NAME)

    with mock.patch("cfn_response.http") as mocked_PoolManager:
        mocked_PoolManager.return_value = {"status": 200}
        execute(lambda_event, mock_lambda_context)
        mocked_PoolManager.request.assert_called_once_with(
            method="PUT",
            url="https://fakeurl/doesnotexist",
            headers={"content-type": "", "content-length": "316"},
            body='{"Status": "FAILED", "Reason": "Missing either SECRETS_MANAGER_API_KEY_NAME or API_KEY in the request. Operation cannot be performed", "PhysicalResourceId": "fake_physical_resource_id", "StackId": "fakeStackId", "RequestId": "fakeRequestId", "LogicalResourceId": "fakeLogicalResourceId", "NoEcho": false, "Data": {}}',
        )
