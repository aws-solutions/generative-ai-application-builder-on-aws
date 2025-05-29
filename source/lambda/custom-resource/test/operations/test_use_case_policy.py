#!/usr/bin/env python
# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

from test.fixtures.use_case_policy_events import lambda_event, setup_ddb

import botocore
import mock
import pytest
from lambda_func import handler
from moto import mock_aws
from operations.operation_types import RESOURCE, RESOURCE_PROPERTIES
from operations.use_case_policy import (
    WEBSOCKET_API_ARN,
    FEEDBACK_API_ARN,
    DETAILS_API_ARN,
    FEEDBACK_API_ARN,
    GROUP_NAME,
    POLICY_TABLE_NAME,
    RESOURCE,
    RESOURCE_PROPERTIES,
    create,
    delete,
    execute,
    verify_env_setup,
)


def test_when_operation_type_is_invalid(lambda_event, mock_lambda_context):
    lambda_event[RESOURCE_PROPERTIES][RESOURCE] = "FAKE_RESOURCE"
    with pytest.raises(ValueError):
        verify_env_setup(lambda_event)

    with mock.patch("cfn_response.http") as mocked_PoolManager:
        execute(lambda_event, mock_lambda_context)

        mocked_PoolManager.request.assert_called_once_with(
            method="PUT",
            url="https://fakeurl/doesnotexist",
            headers={"content-type": "", "content-length": "326"},
            body='{"Status": "FAILED", "Reason": "Operation type not available or did not match from the request. Expecting operation type to be USE_CASE_POLICY", "PhysicalResourceId": "fake_physical_resource_id", "StackId": "fakeStackId", "RequestId": "fakeRequestId", "LogicalResourceId": "fakeLogicalResourceId", "NoEcho": false, "Data": {}}',
        )


def test_when_resource_properties_missing(monkeypatch, lambda_event, mock_lambda_context):
    monkeypatch.setitem(lambda_event[RESOURCE_PROPERTIES], GROUP_NAME, None)
    with pytest.raises(ValueError):
        verify_env_setup(lambda_event)

    with mock.patch("cfn_response.http") as mocked_PoolManager:
        execute(lambda_event, mock_lambda_context)

        mocked_PoolManager.request.assert_called_once_with(
            method="PUT",
            url="https://fakeurl/doesnotexist",
            headers={"content-type": "", "content-length": "351"},
            body='{"Status": "FAILED", "Reason": "Either GROUP_NAME or WEBSOCKET_API_ARN or DETAILS_API_ARN or POLICY_TABLE_NAME has not been passed. Hence operation cannot be performed", "PhysicalResourceId": "fake_physical_resource_id", "StackId": "fakeStackId", "RequestId": "fakeRequestId", "LogicalResourceId": "fakeLogicalResourceId", "NoEcho": false, "Data": {}}',
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
                "Sid": "fakegroupname-policy-statement",
                "Effect": "Allow",
                "Action": "execute-api:Invoke",
                "Resource": [
                    "fakewebsocketapi.arn",
                ],
            },
            {
                "Sid": "fakegroupname-details-policy-statement",
                "Effect": "Allow",
                "Action": "execute-api:Invoke",
                "Resource": [
                    "fakedetailsapi.arn",
                ],
            },
            {
                "Sid": "fakegroupname-feedback-policy-statement",
                "Effect": "Allow",
                "Action": "execute-api:Invoke",
                "Resource": [
                    "fakefeedbackapi.arn",
                ],
            },
        ],
    }

    # subsequent appends to the existing group
    lambda_event[RESOURCE_PROPERTIES][GROUP_NAME] = "fakegroupname2"
    lambda_event[RESOURCE_PROPERTIES][WEBSOCKET_API_ARN] = "fake-websocket-api.arn2"
    lambda_event[RESOURCE_PROPERTIES][DETAILS_API_ARN] = "fake-details-api.arn2"
    lambda_event[RESOURCE_PROPERTIES][FEEDBACK_API_ARN] = "fake-feedback-api.arn2"
    create(lambda_event, mock_lambda_context)
    admin_policy = table.get_item(Key={"group": "admin"})["Item"]["policy"]
    assert admin_policy == {
        "Version": "2012-10-17",
        "Statement": [
            {
                "Sid": "fakegroupname-policy-statement",
                "Effect": "Allow",
                "Action": "execute-api:Invoke",
                "Resource": [
                    "fakewebsocketapi.arn",
                ],
            },
            {
                "Sid": "fakegroupname-details-policy-statement",
                "Effect": "Allow",
                "Action": "execute-api:Invoke",
                "Resource": [
                    "fakedetailsapi.arn",
                ],
            },
            {
                "Sid": "fakegroupname-feedback-policy-statement",
                "Effect": "Allow",
                "Action": "execute-api:Invoke",
                "Resource": [
                    "fakefeedbackapi.arn",
                ],
            },
            {
                "Sid": "fakegroupname2-policy-statement",
                "Effect": "Allow",
                "Action": "execute-api:Invoke",
                "Resource": [
                    "fake-websocket-api.arn2",
                ],
            },
            {
                "Sid": "fakegroupname2-details-policy-statement",
                "Action": "execute-api:Invoke",
                "Effect": "Allow",
                "Resource": [
                    "fake-details-api.arn2",
                ],
            },
            {
                "Sid": "fakegroupname2-feedback-policy-statement",
                "Effect": "Allow",
                "Action": "execute-api:Invoke",
                "Resource": [
                    "fake-feedback-api.arn2",
                ],
            },
        ],
    }

    group_policy = table.get_item(Key={"group": "fakegroupname2"})["Item"]["policy"]
    assert group_policy == {
        "Version": "2012-10-17",
        "Statement": [
            {
                "Sid": "fakegroupname2-policy-statement",
                "Effect": "Allow",
                "Action": "execute-api:Invoke",
                "Resource": [
                    "fake-websocket-api.arn2",
                ],
            },
            {
                "Sid": "fakegroupname2-details-policy-statement",
                "Effect": "Allow",
                "Action": "execute-api:Invoke",
                "Resource": [
                    "fake-details-api.arn2",
                ],
            },
            {
                "Sid": "fakegroupname2-feedback-policy-statement",
                "Effect": "Allow",
                "Action": "execute-api:Invoke",
                "Resource": [
                    "fake-feedback-api.arn2",
                ],
            },
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
                "Statement": [],
            },
        }
    )
    create(lambda_event, mock_lambda_context)
    admin_policy = table.get_item(Key={"group": "admin"})["Item"]["policy"]
    assert admin_policy == {
        "Version": "2012-10-17",
        "Statement": [
            {
                "Sid": "fakegroupname-policy-statement",
                "Effect": "Allow",
                "Action": "execute-api:Invoke",
                "Resource": [
                    "fakewebsocketapi.arn",
                ],
            },
            {
                "Sid": "fakegroupname-details-policy-statement",
                "Effect": "Allow",
                "Action": "execute-api:Invoke",
                "Resource": [
                    "fakedetailsapi.arn",
                ],
            },
            {
                "Sid": "fakegroupname-feedback-policy-statement",
                "Effect": "Allow",
                "Action": "execute-api:Invoke",
                "Resource": [
                    "fakefeedbackapi.arn",
                ],
            },
        ],
    }
    group_policy = table.get_item(Key={"group": "fakegroupname"})["Item"]["policy"]
    assert group_policy == {
        "Version": "2012-10-17",
        "Statement": [
            {
                "Sid": "fakegroupname-policy-statement",
                "Effect": "Allow",
                "Action": "execute-api:Invoke",
                "Resource": [
                    "fakewebsocketapi.arn",
                ],
            },
            {
                "Action": "execute-api:Invoke",
                "Effect": "Allow",
                "Resource": [
                    "fakedetailsapi.arn",
                ],
                "Sid": "fakegroupname-details-policy-statement",
            },
            {
                "Action": "execute-api:Invoke",
                "Effect": "Allow",
                "Resource": [
                    "fakefeedbackapi.arn",
                ],
                "Sid": "fakegroupname-feedback-policy-statement",
            },
        ],
    }


def test_create_where_group_exists(setup_ddb, mock_lambda_context):
    ddb, lambda_event = setup_ddb
    table = ddb.Table(lambda_event[RESOURCE_PROPERTIES][POLICY_TABLE_NAME])
    table.put_item(
        Item={
            "group": "admin",
            "policy": {
                "Version": "2012-10-17",
                "Statement": [
                    {
                        "Sid": "fakegroupname-policy-statement",
                        "Effect": "Allow",
                        "Action": "execute-api:Invoke",
                        "Resource": [
                            "somebadarn",
                        ],
                    }
                ],
            },
        }
    )
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
                            "somebadarn",
                        ],
                    }
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
                "Sid": "fakegroupname-policy-statement",
                "Effect": "Allow",
                "Action": "execute-api:Invoke",
                "Resource": [
                    "fakewebsocketapi.arn",
                ],
            },
            {
                "Sid": "fakegroupname-details-policy-statement",
                "Effect": "Allow",
                "Action": "execute-api:Invoke",
                "Resource": [
                    "fakedetailsapi.arn",
                ],
            },
            {
                "Sid": "fakegroupname-feedback-policy-statement",
                "Effect": "Allow",
                "Action": "execute-api:Invoke",
                "Resource": [
                    "fakefeedbackapi.arn",
                ],
            },
        ],
    }
    group_policy = table.get_item(Key={"group": "fakegroupname"})["Item"]["policy"]
    assert group_policy == {
        "Version": "2012-10-17",
        "Statement": [
            {
                "Sid": "fakegroupname-policy-statement",
                "Effect": "Allow",
                "Action": "execute-api:Invoke",
                "Resource": [
                    "fakewebsocketapi.arn",
                ],
            },
            {
                "Sid": "fakegroupname-details-policy-statement",
                "Effect": "Allow",
                "Action": "execute-api:Invoke",
                "Resource": [
                    "fakedetailsapi.arn",
                ],
            },
            {
                "Sid": "fakegroupname-feedback-policy-statement",
                "Effect": "Allow",
                "Action": "execute-api:Invoke",
                "Resource": [
                    "fakefeedbackapi.arn",
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
    # setting up the table with 2 groups
    table = ddb.Table(lambda_event[RESOURCE_PROPERTIES][POLICY_TABLE_NAME])
    table.put_item(
        Item={
            "group": "admin",
            "policy": {
                "Version": "2012-10-17",
                "Statement": [
                    {
                        "Sid": "fakegroupname-policy-statement",
                        "Effect": "Allow",
                        "Action": "execute-api:Invoke",
                        "Resource": [
                            "fakeapi.arn",
                        ],
                    },
                    {
                        "Sid": "fakegroupname2-policy-statement",
                        "Effect": "Allow",
                        "Action": "execute-api:Invoke",
                        "Resource": [
                            "fakeapi.arn2",
                        ],
                    },
                ],
            },
        }
    )
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
                            "fakeapi.arn",
                        ],
                    }
                ],
            },
        }
    )
    table.put_item(
        Item={
            "group": "fakegroupname2",
            "policy": {
                "Version": "2012-10-17",
                "Statement": [
                    {
                        "Sid": "fakegroupname2-policy-statement",
                        "Effect": "Allow",
                        "Action": "execute-api:Invoke",
                        "Resource": [
                            "fakeapi.arn2",
                        ],
                    }
                ],
            },
        }
    )

    delete(lambda_event, mock_lambda_context)

    # admin policy updated to remove statement
    admin_policy = table.get_item(Key={"group": "admin"})["Item"]["policy"]
    assert admin_policy == {
        "Version": "2012-10-17",
        "Statement": [
            {
                "Sid": "fakegroupname2-policy-statement",
                "Effect": "Allow",
                "Action": "execute-api:Invoke",
                "Resource": [
                    "fakeapi.arn2",
                ],
            }
        ],
    }
    # item is removed
    group_item = table.get_item(Key={"group": "fakegroupname"})
    with pytest.raises(KeyError):
        group_item["Item"]


def test_delete_with_no_admin_group(setup_ddb, mock_lambda_context):
    ddb, lambda_event = setup_ddb
    # setting up the table with 2 groups
    table = ddb.Table(lambda_event[RESOURCE_PROPERTIES][POLICY_TABLE_NAME])
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
                            "fakeapi.arn",
                        ],
                    }
                ],
            },
        }
    )

    delete(lambda_event, mock_lambda_context)

    # item is removed
    group_item = table.get_item(Key={"group": "fakegroupname"})
    with pytest.raises(KeyError):
        group_item["Item"]


def test_delete_with_no_table_fails_but_continues(ddb, lambda_event, mock_lambda_context):
    # don't create the table, so we get a botocore exception but it does not throw
    delete(lambda_event, mock_lambda_context)


def test_delete_fails(lambda_event, mock_lambda_context):
    # don't mock ddb, so we get a botocore client exception
    with pytest.raises(botocore.exceptions.ClientError):
        delete(lambda_event, mock_lambda_context)


@mock_aws
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
                                    "fakeapi.arn",
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


@mock_aws
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
                                    "fakeapi.arn",
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
