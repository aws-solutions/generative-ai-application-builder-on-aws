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

import json
from test.fixtures.cw_loggroup_policy_events import lambda_event

import botocore
import mock
import pytest
from lambda_func import handler
from moto import mock_logs
from operations.cw_loggroup_policy import (
    CWLOG_ARN,
    CWLOG_NAME,
    SERVICE_PRINCIPAL,
    InvalidPrincipalException,
    create,
    create_loggroup_policy,
    delete,
    execute,
    update,
    verify_env_setup,
)
from operations.operation_types import RESOURCE, RESOURCE_PROPERTIES, PHYSICAL_RESOURCE_ID


def test_when_operation_type_is_invalid(lambda_event, mock_lambda_context):
    lambda_event[RESOURCE_PROPERTIES][RESOURCE] = "FAKE_RESOURCE"
    with pytest.raises(ValueError):
        verify_env_setup(lambda_event)

    with mock.patch("cfn_response.http") as mocked_PoolManager:
        execute(lambda_event, mock_lambda_context)

        mocked_PoolManager.request.assert_called_once_with(
            method="PUT",
            url="https://fakeurl/doesnotexist",
            headers={"content-type": "", "content-length": "324"},
            body='{"Status": "FAILED", "Reason": "Operation type not available or did not match from the request. Expecting operation type to be CW_LOG_POLICY", "PhysicalResourceId": "fake_physical_resource_id", "StackId": "fakeStackId", "RequestId": "fakeRequestId", "LogicalResourceId": "fakeLogicalResourceId", "NoEcho": false, "Data": {}}',
        )


def test_when_resource_properties_missing(monkeypatch, lambda_event, mock_lambda_context):
    monkeypatch.setitem(lambda_event[RESOURCE_PROPERTIES], CWLOG_NAME, None)
    with pytest.raises(ValueError):
        verify_env_setup(lambda_event)

    with mock.patch("cfn_response.http") as mocked_PoolManager:
        execute(lambda_event, mock_lambda_context)

        mocked_PoolManager.request.assert_called_once_with(
            method="PUT",
            url="https://fakeurl/doesnotexist",
            headers={"content-type": "", "content-length": "322"},
            body='{"Status": "FAILED", "Reason": "Either CWLOG_NAME, CWLOG_ARN or SERVICE_PRINCIPAL has not been passed. Hence operation cannot be performed", "PhysicalResourceId": "fake_physical_resource_id", "StackId": "fakeStackId", "RequestId": "fakeRequestId", "LogicalResourceId": "fakeLogicalResourceId", "NoEcho": false, "Data": {}}',
        )


def test_create_log_policy_for_valid_principal(lambda_event):
    policy = create_loggroup_policy(lambda_event)
    assert policy is not None

    policy_definition = json.loads(policy)
    assert policy_definition["Statement"][0]["Effect"] == "Allow"
    assert policy_definition["Statement"][0]["Principal"] == {
        "Service": lambda_event[RESOURCE_PROPERTIES][SERVICE_PRINCIPAL]
    }
    assert policy_definition["Statement"][0]["Action"] == [
        "logs:PutLogEvents",
        " logs:PutLogEventsBatch",
        "logs:CreateLogStream",
    ]
    assert policy_definition["Statement"][0]["Resource"] == lambda_event[RESOURCE_PROPERTIES][CWLOG_ARN]


@mock_logs
def test_create_log_policy_for_invalid_principal(cw_logs, lambda_event, mock_lambda_context):
    lambda_event[RESOURCE_PROPERTIES][SERVICE_PRINCIPAL] = "fake.amazonaws.com"
    with pytest.raises(InvalidPrincipalException) as ex:
        create_loggroup_policy(lambda_event)

    with pytest.raises(InvalidPrincipalException) as ex:
        create(cw_logs, lambda_event, mock_lambda_context)

    with mock.patch("cfn_response.http") as mocked_PoolManager:
        lambda_event["RequestType"] = "Create"
        execute(lambda_event, mock_lambda_context)
        mocked_PoolManager.request.assert_called_once_with(
            method="PUT",
            url="https://fakeurl/doesnotexist",
            headers={"content-type": "", "content-length": "300"},
            body='{"Status": "FAILED", "Reason": "The provided service principal is fake.amazonaws.com, which is not in the allow list", "PhysicalResourceId": "fake_physical_resource_id", "StackId": "fakeStackId", "RequestId": "fakeRequestId", "LogicalResourceId": "fakeLogicalResourceId", "NoEcho": false, "Data": {}}',
        )


def test_update_method(cw_logs, lambda_event, mock_lambda_context):
    with mock.patch("cfn_response.http") as mocked_PoolManager:
        update(cw_logs, lambda_event, mock_lambda_context)


def test_delete_method(cw_logs, lambda_event, mock_lambda_context):
    cw_logs.put_resource_policy(
        policyName=lambda_event[RESOURCE_PROPERTIES][CWLOG_NAME],
        policyDocument=create_loggroup_policy(lambda_event),
    )

    with mock.patch("cfn_response.http") as mocked_PoolManager:
        delete(cw_logs, lambda_event, mock_lambda_context)


@mock_logs
def test_delete_method_for_invalid_policy(cw_logs, lambda_event, mock_lambda_context):
    with pytest.raises(botocore.exceptions.ClientError):
        delete(cw_logs, lambda_event, mock_lambda_context)

    with mock.patch("cfn_response.http") as mocked_PoolManager:
        lambda_event["RequestType"] = "Delete"
        execute(lambda_event, mock_lambda_context)
        mocked_PoolManager.request.assert_called_once_with(
            method="PUT",
            url="https://fakeurl/doesnotexist",
            headers={"content-type": "", "content-length": "366"},
            body='{"Status": "FAILED", "Reason": "An error occurred (ResourceNotFoundException) when calling the DeleteResourcePolicy operation: Policy with name [fake-loggroup-ABC1234] does not exist", "PhysicalResourceId": "fake_physical_resource_id", "StackId": "fakeStackId", "RequestId": "fakeRequestId", "LogicalResourceId": "fakeLogicalResourceId", "NoEcho": false, "Data": {}}',
        )


def test_create_method_for_succesful_creation(cw_logs, lambda_event, mock_lambda_context):
    with mock.patch("cfn_response.http") as mocked_PoolManager:
        create(cw_logs, lambda_event, mock_lambda_context)


@mock_logs
@pytest.mark.parametrize("requestType", ["Create", "Update", "Delete"])
def test_execute_method(cw_logs, lambda_event, mock_lambda_context, requestType):
    lambda_event["RequestType"] = requestType

    with mock.patch("cfn_response.http") as mocked_PoolManager:
        if requestType == "Create":
            execute(lambda_event, mock_lambda_context)
            mocked_PoolManager.request.assert_called_once_with(
                method="PUT",
                url="https://fakeurl/doesnotexist",
                headers={"content-type": "", "content-length": "278"},
                body='{"Status": "SUCCESS", "Reason": "See the details in CloudWatch Log Stream: fake_logstream_name", "PhysicalResourceId": "fake_physical_resource_id", "StackId": "fakeStackId", "RequestId": "fakeRequestId", "LogicalResourceId": "fakeLogicalResourceId", "NoEcho": false, "Data": {}}',
            )

        if requestType == "Update":
            execute(lambda_event, mock_lambda_context)
            mocked_PoolManager.request.assert_called_once_with(
                method="PUT",
                url="https://fakeurl/doesnotexist",
                headers={"content-type": "", "content-length": "278"},
                body='{"Status": "SUCCESS", "Reason": "See the details in CloudWatch Log Stream: fake_logstream_name", "PhysicalResourceId": "fake_physical_resource_id", "StackId": "fakeStackId", "RequestId": "fakeRequestId", "LogicalResourceId": "fakeLogicalResourceId", "NoEcho": false, "Data": {}}',
            )

        if requestType == "Delete":
            cw_logs.put_resource_policy(
                policyName=lambda_event[RESOURCE_PROPERTIES][CWLOG_NAME],
                policyDocument=create_loggroup_policy(lambda_event),
            )
            execute(lambda_event, mock_lambda_context)
            mocked_PoolManager.request.assert_called_once_with(
                method="PUT",
                url="https://fakeurl/doesnotexist",
                headers={"content-type": "", "content-length": "278"},
                body='{"Status": "SUCCESS", "Reason": "See the details in CloudWatch Log Stream: fake_logstream_name", "PhysicalResourceId": "fake_physical_resource_id", "StackId": "fakeStackId", "RequestId": "fakeRequestId", "LogicalResourceId": "fakeLogicalResourceId", "NoEcho": false, "Data": {}}',
            )


@mock_logs
@pytest.mark.parametrize("requestType", ["Create", "Update", "Delete"])
def test_lambda_handler(cw_logs, lambda_event, mock_lambda_context, requestType):
    lambda_event["RequestType"] = requestType

    with mock.patch("cfn_response.http") as mocked_PoolManager:
        if requestType == "Create":
            handler(lambda_event, mock_lambda_context)
            mocked_PoolManager.request.assert_called_once_with(
                method="PUT",
                url="https://fakeurl/doesnotexist",
                headers={"content-type": "", "content-length": "278"},
                body='{"Status": "SUCCESS", "Reason": "See the details in CloudWatch Log Stream: fake_logstream_name", "PhysicalResourceId": "fake_physical_resource_id", "StackId": "fakeStackId", "RequestId": "fakeRequestId", "LogicalResourceId": "fakeLogicalResourceId", "NoEcho": false, "Data": {}}',
            )

        if requestType == "Update":
            handler(lambda_event, mock_lambda_context)
            mocked_PoolManager.request.assert_called_once_with(
                method="PUT",
                url="https://fakeurl/doesnotexist",
                headers={"content-type": "", "content-length": "278"},
                body='{"Status": "SUCCESS", "Reason": "See the details in CloudWatch Log Stream: fake_logstream_name", "PhysicalResourceId": "fake_physical_resource_id", "StackId": "fakeStackId", "RequestId": "fakeRequestId", "LogicalResourceId": "fakeLogicalResourceId", "NoEcho": false, "Data": {}}',
            )

        if requestType == "Delete":
            cw_logs.put_resource_policy(
                policyName=lambda_event[RESOURCE_PROPERTIES][CWLOG_NAME],
                policyDocument=create_loggroup_policy(lambda_event),
            )
            handler(lambda_event, mock_lambda_context)
            mocked_PoolManager.request.assert_called_once_with(
                method="PUT",
                url="https://fakeurl/doesnotexist",
                headers={"content-type": "", "content-length": "278"},
                body='{"Status": "SUCCESS", "Reason": "See the details in CloudWatch Log Stream: fake_logstream_name", "PhysicalResourceId": "fake_physical_resource_id", "StackId": "fakeStackId", "RequestId": "fakeRequestId", "LogicalResourceId": "fakeLogicalResourceId", "NoEcho": false, "Data": {}}',
            )
