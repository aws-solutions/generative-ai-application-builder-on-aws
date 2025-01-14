#!/usr/bin/env python
# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0


import zipfile

import botocore
import mock
import pytest
from lambda_func import handler
from moto import mock_aws
from operations.copy_model_info_to_ddb import DDB_TABLE_NAME, create, delete_all_entries, execute, verify_env_setup
from operations.operation_types import RESOURCE_PROPERTIES, SOURCE_BUCKET_NAME, SOURCE_PREFIX
from test.fixtures.copy_model_info_events import copy_to_ddb_event, setup_model_info, ddb_table


def test_verify_env_setup_success(setup_model_info):
    lambda_event, s3_resource, ddb_resource = setup_model_info
    verify_env_setup(lambda_event)


def test_verify_when_ddb_table_missing(monkeypatch, setup_model_info):
    lambda_event, s3_resource, ddb_resource = setup_model_info
    with pytest.raises(ValueError):
        monkeypatch.delitem(lambda_event[RESOURCE_PROPERTIES], DDB_TABLE_NAME)
        verify_env_setup(lambda_event)


def test_verify_when_source_bucket_missing(monkeypatch, setup_model_info):
    lambda_event, s3_resource, ddb_resource = setup_model_info
    with pytest.raises(ValueError):
        monkeypatch.delitem(lambda_event[RESOURCE_PROPERTIES], SOURCE_BUCKET_NAME)
        verify_env_setup(lambda_event)


def test_verify_when_source_prefix_missing(monkeypatch, setup_model_info):
    lambda_event, s3_resource, ddb_resource = setup_model_info
    with pytest.raises(ValueError):
        monkeypatch.delitem(lambda_event[RESOURCE_PROPERTIES], SOURCE_PREFIX)
        verify_env_setup(lambda_event)


def test_create_success(setup_model_info):
    lambda_event, s3_resource, ddb_resource = setup_model_info

    source_bucket_name = lambda_event[RESOURCE_PROPERTIES][SOURCE_BUCKET_NAME]
    source_prefix = lambda_event[RESOURCE_PROPERTIES][SOURCE_PREFIX]
    ddb_table_name = lambda_event[RESOURCE_PROPERTIES][DDB_TABLE_NAME]

    create(source_bucket_name, source_prefix, ddb_table_name)


def test_create_with_incorrect_table_name(setup_model_info):
    lambda_event, s3_resource, ddb_resource = setup_model_info

    source_bucket_name = lambda_event[RESOURCE_PROPERTIES][SOURCE_BUCKET_NAME]
    source_prefix = lambda_event[RESOURCE_PROPERTIES][SOURCE_PREFIX]
    ddb_table_name = "table_does_not_exist"

    with pytest.raises(botocore.exceptions.ClientError):
        create(source_bucket_name, source_prefix, ddb_table_name)


def test_create_with_bad_zip_file(tmp_path, setup_model_info):
    lambda_event, s3_resource, ddb_resource = setup_model_info

    source_bucket_name = lambda_event[RESOURCE_PROPERTIES][SOURCE_BUCKET_NAME]
    source_prefix = lambda_event[RESOURCE_PROPERTIES][SOURCE_PREFIX]
    ddb_table_name = lambda_event[RESOURCE_PROPERTIES][DDB_TABLE_NAME]

    tmp_dir = tmp_path / "bad_zip"
    tmp_dir.mkdir()
    bad_zip_file = tmp_dir / "fake_bad_zip.zip"
    bad_zip_file.write_text("This is a fake bad zip file")
    assert len(list(tmp_path.iterdir())) == 1

    s3_resource.meta.client.upload_file(str(bad_zip_file), source_bucket_name, source_prefix)
    assert len(list(s3_resource.Bucket(source_bucket_name).objects.all())) == 1

    with pytest.raises(zipfile.error):
        create(source_bucket_name, source_prefix, ddb_table_name)


@pytest.mark.parametrize("requestType", ["Create", "Update", "Delete"])
def test_execute_call_success(setup_model_info, mock_lambda_context, requestType):
    lambda_event, s3_resource, ddb_resource = setup_model_info
    lambda_event["RequestType"] = requestType

    with mock.patch("cfn_response.http") as mocked_PoolManager:
        mocked_PoolManager.return_value = {"status": 200}
        assert None == execute(lambda_event, mock_lambda_context)
        mocked_PoolManager.request.assert_called_once_with(
            method="PUT",
            url="https://fakeurl/doesnotexist",
            headers={"content-type": "", "content-length": "278"},
            body='{"Status": "SUCCESS", "Reason": "See the details in CloudWatch Log Stream: fake_logstream_name", "PhysicalResourceId": "fake_physical_resource_id", "StackId": "fakeStackId", "RequestId": "fakeRequestId", "LogicalResourceId": "fakeLogicalResourceId", "NoEcho": false, "Data": {}}',
        )


@pytest.mark.parametrize("requestType", ["Create", "Update"])
def test_execute_with_missing_resource_properties(monkeypatch, setup_model_info, mock_lambda_context, requestType):
    lambda_event, s3_resource, ddb_resource = setup_model_info
    lambda_event["RequestType"] = requestType
    monkeypatch.delitem(lambda_event[RESOURCE_PROPERTIES], SOURCE_PREFIX)

    with mock.patch("cfn_response.http") as mocked_PoolManager:
        mocked_PoolManager.return_value = {"status": 200}
        assert None == execute(lambda_event, mock_lambda_context)
        mocked_PoolManager.request.assert_called_once_with(
            method="PUT",
            url="https://fakeurl/doesnotexist",
            headers={"content-type": "", "content-length": "336"},
            body='{"Status": "FAILED", "Reason": "Either SOURCE_BUCKET_NAME or SOURCE_PREFIX or DDB_TABLE_NAME or has not been passed. Hence operation cannot be performed", "PhysicalResourceId": "fake_physical_resource_id", "StackId": "fakeStackId", "RequestId": "fakeRequestId", "LogicalResourceId": "fakeLogicalResourceId", "NoEcho": false, "Data": {}}',
        )


@pytest.mark.parametrize("requestType", ["Delete"])
def test_execute_delete_event_succesful_with_missing_properties(
    monkeypatch, setup_model_info, mock_lambda_context, requestType
):
    lambda_event, s3_resource, ddb_resource = setup_model_info
    lambda_event["RequestType"] = requestType
    monkeypatch.delitem(lambda_event[RESOURCE_PROPERTIES], SOURCE_PREFIX)

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
def test_lambda_handler(setup_model_info, mock_lambda_context, requestType):
    lambda_event, s3_resource, ddb_resource = setup_model_info
    lambda_event["RequestType"] = requestType

    with mock.patch("cfn_response.http") as mocked_PoolManager:
        mocked_PoolManager.return_value = {"status": 200}
        assert None == handler(lambda_event, mock_lambda_context)
        mocked_PoolManager.request.assert_called_once_with(
            method="PUT",
            url="https://fakeurl/doesnotexist",
            headers={"content-type": "", "content-length": "278"},
            body='{"Status": "SUCCESS", "Reason": "See the details in CloudWatch Log Stream: fake_logstream_name", "PhysicalResourceId": "fake_physical_resource_id", "StackId": "fakeStackId", "RequestId": "fakeRequestId", "LogicalResourceId": "fakeLogicalResourceId", "NoEcho": false, "Data": {}}',
        )


@mock_aws
def test_delete_all_entries(ddb_table, ddb):
    delete_all_entries(ddb_table.name)

    # Check that the table is empty
    response = ddb_table.scan()
    assert response["Count"] == 0


@mock_aws
def test_delete_all_entries_empty_table(ddb_table, ddb):
    # Delete all items first
    delete_all_entries(ddb_table.name)

    # Call the function again on an empty table
    delete_all_entries(ddb_table.name)

    # Check that the table is still empty
    response = ddb_table.scan()
    assert response["Count"] == 0


@mock_aws
def test_delete_all_entries_non_existent_table(ddb):
    # Call the function with a non-existent table name
    with pytest.raises(botocore.client.ClientError):
        delete_all_entries("non-existent-table")
