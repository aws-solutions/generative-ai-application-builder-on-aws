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
from test.fixtures.admin_policy_events import lambda_event, setup_ddb

import botocore
import mock
import pytest
from lambda_func import handler
from moto import mock_dynamodb
from operations.admin_policy import (
    RESOURCE,
    RESOURCE_PROPERTIES,
    POLICY_TABLE_NAME,
    ADMIN_POLICY_SID,
    create,
    delete,
    execute,
    verify_env_setup,
)
from operations.operation_types import RESOURCE, RESOURCE_PROPERTIES


def test_when_operation_type_is_invalid(lambda_event, mock_lambda_context):
    lambda_event[RESOURCE_PROPERTIES][RESOURCE] = "FAKE_RESOURCE"
    with pytest.raises(ValueError):
        verify_env_setup(lambda_event)

    with mock.patch("cfn_response.http") as mocked_PoolManager:
        execute(lambda_event, mock_lambda_context)

        mocked_PoolManager.request.assert_called_once_with(
            method="PUT",
            url="https://fakeurl/doesnotexist",
            headers={"content-type": "", "content-length": "323"},
            body='{"Status": "FAILED", "Reason": "Operation type not available or did not match from the request. Expecting operation type to be ADMIN_POLICY", "PhysicalResourceId": "fake_physical_resource_id", "StackId": "fakeStackId", "RequestId": "fakeRequestId", "LogicalResourceId": "fakeLogicalResourceId", "NoEcho": false, "Data": {}}',
        )


def test_when_resource_properties_missing(monkeypatch, lambda_event, mock_lambda_context):
    monkeypatch.setitem(lambda_event[RESOURCE_PROPERTIES], POLICY_TABLE_NAME, None)
    with pytest.raises(ValueError):
        verify_env_setup(lambda_event)

    with mock.patch("cfn_response.http") as mocked_PoolManager:
        execute(lambda_event, mock_lambda_context)

        mocked_PoolManager.request.assert_called_once_with(
            method="PUT",
            url="https://fakeurl/doesnotexist",
            headers={"content-type": "", "content-length": "308"},
            body='{"Status": "FAILED", "Reason": "Either API_ARN or POLICY_TABLE_NAME has not been passed. Hence operation cannot be performed", "PhysicalResourceId": "fake_physical_resource_id", "StackId": "fakeStackId", "RequestId": "fakeRequestId", "LogicalResourceId": "fakeLogicalResourceId", "NoEcho": false, "Data": {}}',
        )


def test_create_with_no_admin_group(setup_ddb, mock_lambda_context):
    ddb, lambda_event = setup_ddb

    # First create adds the admin group
    create(lambda_event, mock_lambda_context)
    table = ddb.Table(lambda_event[RESOURCE_PROPERTIES][POLICY_TABLE_NAME])
    admin_policy = table.get_item(Key={"group": "admin"})["Item"]["policy"]
    assert admin_policy == {
        "Version": "2012-10-17",
        "Statement": [
            {
                "Sid": ADMIN_POLICY_SID,
                "Effect": "Allow",
                "Action": "execute-api:Invoke",
                "Resource": [
                    "fakeapi.arn",
                ],
            }
        ],
    }


def test_create_with_existing_admin_group(setup_ddb, mock_lambda_context):
    ddb, lambda_event = setup_ddb
    table = ddb.Table(lambda_event[RESOURCE_PROPERTIES][POLICY_TABLE_NAME])
    table.put_item(
        Item={
            "group": "admin",
            "policy": {
                "Version": "2012-10-17",
                "Statement": [
                    {
                        "Sid": ADMIN_POLICY_SID,
                        "Effect": "Allow",
                        "Action": "execute-api:Invoke",
                        "Resource": [
                            "fakeapi2.arn",
                        ],
                    },
                    {
                        "Sid": "some-other-statement",
                        "Effect": "Allow",
                        "Action": "execute-api:Invoke",
                        "Resource": [
                            "fakeapi.arn",
                        ],
                    },
                ],
            },
        }
    )
    create(lambda_event, mock_lambda_context)
    admin_policy = table.get_item(Key={"group": "admin"})["Item"]["policy"]
    assert admin_policy == {
        "Version": "2012-10-17",
        "Statement": [
            {
                "Sid": ADMIN_POLICY_SID,
                "Effect": "Allow",
                "Action": "execute-api:Invoke",
                "Resource": [
                    "fakeapi.arn",
                ],
            },
            {
                "Sid": "some-other-statement",
                "Effect": "Allow",
                "Action": "execute-api:Invoke",
                "Resource": [
                    "fakeapi.arn",
                ],
            },
        ],
    }


def test_create_fails(lambda_event, mock_lambda_context):
    # don't mock ddb, so we get a botocore exception
    with pytest.raises(botocore.exceptions.ClientError):
        create(lambda_event, mock_lambda_context)


def test_delete(setup_ddb, mock_lambda_context):
    ddb, lambda_event = setup_ddb
    table = ddb.Table(lambda_event[RESOURCE_PROPERTIES][POLICY_TABLE_NAME])
    table.put_item(
        Item={
            "group": "admin",
            "policy": {
                "Version": "2012-10-17",
                "Statement": [
                    {
                        "Sid": ADMIN_POLICY_SID,
                        "Effect": "Allow",
                        "Action": "execute-api:Invoke",
                        "Resource": [
                            "fakeapi2.arn",
                        ],
                    },
                ],
            },
        }
    )

    delete(lambda_event, mock_lambda_context)

    # item is removed
    group_item = table.get_item(Key={"group": "admin"})
    with pytest.raises(KeyError):
        group_item["Item"]


def test_delete_fails(lambda_event, mock_lambda_context):
    # don't mock ddb, so we get a botocore exception
    with pytest.raises(botocore.exceptions.ClientError):
        delete(lambda_event, mock_lambda_context)


@mock_dynamodb
@pytest.mark.parametrize("requestType", ["Create", "Update", "Delete"])
def test_execute_method(ddb, lambda_event, mock_lambda_context, requestType):
    ddb.create_table(
        TableName=lambda_event[RESOURCE_PROPERTIES][POLICY_TABLE_NAME],
        KeySchema=[{"AttributeName": "group", "KeyType": "HASH"}],
        AttributeDefinitions=[{"AttributeName": "group", "AttributeType": "S"}],
        BillingMode="PAY_PER_REQUEST",
    )
    table = ddb.Table(lambda_event[RESOURCE_PROPERTIES][POLICY_TABLE_NAME])
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
            table.put_item(
                Item={
                    "group": "fakegroupname",
                    "policy": {
                        "Version": "2012-10-17",
                        "Statement": [
                            {
                                "Sid": "fakegroupname-policy-statement",
                                "Effect": "Allow",
                                "Action": "execute-api:Invoke",
                                "Resource": [
                                    "fakeapi.arn/*",
                                ],
                            }
                        ],
                    },
                }
            )
            execute(lambda_event, mock_lambda_context)
            mocked_PoolManager.request.assert_called_once_with(
                method="PUT",
                url="https://fakeurl/doesnotexist",
                headers={"content-type": "", "content-length": "278"},
                body='{"Status": "SUCCESS", "Reason": "See the details in CloudWatch Log Stream: fake_logstream_name", "PhysicalResourceId": "fake_physical_resource_id", "StackId": "fakeStackId", "RequestId": "fakeRequestId", "LogicalResourceId": "fakeLogicalResourceId", "NoEcho": false, "Data": {}}',
            )


@mock_dynamodb
@pytest.mark.parametrize("requestType", ["Create", "Update", "Delete"])
def test_lambda_handler(ddb, lambda_event, mock_lambda_context, requestType):
    ddb.create_table(
        TableName=lambda_event[RESOURCE_PROPERTIES][POLICY_TABLE_NAME],
        KeySchema=[{"AttributeName": "group", "KeyType": "HASH"}],
        AttributeDefinitions=[{"AttributeName": "group", "AttributeType": "S"}],
        BillingMode="PAY_PER_REQUEST",
    )
    table = ddb.Table(lambda_event[RESOURCE_PROPERTIES][POLICY_TABLE_NAME])
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
            table.put_item(
                Item={
                    "group": "fakegroupname",
                    "policy": {
                        "Version": "2012-10-17",
                        "Statement": [
                            {
                                "Sid": "fakegroupname-policy-statement",
                                "Effect": "Allow",
                                "Action": "execute-api:Invoke",
                                "Resource": [
                                    "fakeapi.arn/*",
                                ],
                            }
                        ],
                    },
                }
            )
            handler(lambda_event, mock_lambda_context)
            mocked_PoolManager.request.assert_called_once_with(
                method="PUT",
                url="https://fakeurl/doesnotexist",
                headers={"content-type": "", "content-length": "278"},
                body='{"Status": "SUCCESS", "Reason": "See the details in CloudWatch Log Stream: fake_logstream_name", "PhysicalResourceId": "fake_physical_resource_id", "StackId": "fakeStackId", "RequestId": "fakeRequestId", "LogicalResourceId": "fakeLogicalResourceId", "NoEcho": false, "Data": {}}',
            )
