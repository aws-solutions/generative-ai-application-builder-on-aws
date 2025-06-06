#!/usr/bin/env python
# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0


import botocore
import mock
import pytest
from lambda_func import handler
from moto import mock_aws
from operations.admin_policy import (
    ADMIN_POLICY_SID,
    POLICY_TABLE_NAME,
    RESOURCE,
    RESOURCE_PROPERTIES,
    create,
    execute,
    verify_env_setup,
)
from operations.operation_types import RESOURCE, RESOURCE_PROPERTIES
from test.fixtures.admin_policy_events import lambda_event, setup_ddb


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

@mock_aws
@pytest.mark.parametrize("requestType", ["Create", "Update"])
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


@mock_aws
@pytest.mark.parametrize("requestType", ["Create", "Update"])
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
