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
from test.fixtures.copy_web_ui_events import (
    SAMPLE_JSON_VALUE,
    lambda_event,
    web_ui_copy_setup,
)

import botocore
import mock
import pytest
from lambda_func import handler
from operations.copy_web_ui import (
    DESTINATION_BUCKET_NAME,
    WEBSITE_CONFIG_FILE_NAME,
    WEBSITE_CONFIG_PARAM_KEY,
    create,
    delete,
    execute,
    get_params,
    verify_env_setup,
)
from operations.operation_types import (
    RESOURCE,
    RESOURCE_PROPERTIES,
    SOURCE_BUCKET_NAME,
    SOURCE_PREFIX,
)
from utils.lambda_context_parser import get_invocation_account_id


def test_verify_env_setup_success(lambda_event):
    assert None == verify_env_setup(lambda_event)


def test_evn_setup_with_resource_props_wrong_value(monkeypatch, lambda_event):
    with pytest.raises(ValueError):
        monkeypatch.setitem(lambda_event, RESOURCE_PROPERTIES, value={RESOURCE: "NOT_A_VALID_OPERATION"})
        verify_env_setup(lambda_event)


def test_evn_setup_with_resource_props_empty(monkeypatch, lambda_event):
    with pytest.raises(KeyError):
        monkeypatch.setitem(lambda_event, RESOURCE_PROPERTIES, value={})
        verify_env_setup(lambda_event)


def test_evn_with_missing_source_bucket(monkeypatch, lambda_event):
    with pytest.raises(ValueError):
        monkeypatch.delitem(lambda_event[RESOURCE_PROPERTIES], SOURCE_BUCKET_NAME)
        verify_env_setup(lambda_event)


def test_evn_with_missing_destination_bucket(monkeypatch, lambda_event):
    with pytest.raises(ValueError):
        monkeypatch.delitem(lambda_event[RESOURCE_PROPERTIES], DESTINATION_BUCKET_NAME)
        verify_env_setup(lambda_event)


def test_evn_with_source_bucket_str_empty(monkeypatch, lambda_event):
    with pytest.raises(ValueError):
        monkeypatch.setitem(lambda_event[RESOURCE_PROPERTIES], SOURCE_BUCKET_NAME, "")
        verify_env_setup(lambda_event)


def test_env_with_destination_bucket_str_empty(monkeypatch, lambda_event):
    with pytest.raises(ValueError):
        monkeypatch.setitem(lambda_event[RESOURCE_PROPERTIES], DESTINATION_BUCKET_NAME, "")
        verify_env_setup(lambda_event)


def test_env_with_missing_ssm_param_key(monkeypatch, lambda_event):
    with pytest.raises(ValueError):
        monkeypatch.setitem(lambda_event[RESOURCE_PROPERTIES], WEBSITE_CONFIG_PARAM_KEY, "")
        verify_env_setup(lambda_event)


def test_env_with_non_existing_ssm_param_key(monkeypatch, lambda_event):
    with pytest.raises(ValueError):
        monkeypatch.delitem(lambda_event[RESOURCE_PROPERTIES], WEBSITE_CONFIG_PARAM_KEY)
        verify_env_setup(lambda_event)


def test_get_params_succes(web_ui_copy_setup):
    lambda_event, _, ssm = web_ui_copy_setup
    assert get_params(lambda_event[RESOURCE_PROPERTIES][WEBSITE_CONFIG_PARAM_KEY]) == json.dumps(SAMPLE_JSON_VALUE)


def test_get_params_failure(monkeypatch, web_ui_copy_setup):
    lambda_event, _, ssm = web_ui_copy_setup

    with pytest.raises(botocore.exceptions.ClientError):
        get_params("NON_EXISTING_KEY")


@pytest.mark.parametrize("requestType", ["Create", "Update", "Delete"])
def test_execute_call_success(web_ui_copy_setup, mock_lambda_context, requestType):
    lambda_event, s3_resource, _ = web_ui_copy_setup
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

    destination_bucket = s3_resource.Bucket(lambda_event[RESOURCE_PROPERTIES][DESTINATION_BUCKET_NAME])
    file_list = destination_bucket.objects.all()

    if requestType == "Create" or requestType == "Update":
        assetZipObject = s3_resource.Object(
            bucket_name=lambda_event[RESOURCE_PROPERTIES][SOURCE_BUCKET_NAME],
            key=f"{lambda_event[RESOURCE_PROPERTIES][SOURCE_PREFIX]}",
        )
        buffer = io.BytesIO(assetZipObject.get()["Body"].read())
        zip_archive = zipfile.ZipFile(buffer)
        for filename in zip_archive.namelist():
            assert s3_resource.meta.client.head_object(
                Bucket=lambda_event[RESOURCE_PROPERTIES][DESTINATION_BUCKET_NAME], Key=filename
            )
        assert s3_resource.meta.client.head_object(
            Bucket=lambda_event[RESOURCE_PROPERTIES][DESTINATION_BUCKET_NAME], Key=WEBSITE_CONFIG_FILE_NAME
        )

    if requestType == "Delete":
        assert len(list(file_list)) == 0


@pytest.mark.parametrize("requestType", ["Create", "Update"])
def test_execute_call_with_bad_archive(tmp_path, web_ui_copy_setup, mock_lambda_context, requestType):
    lambda_event, s3_resource, _ = web_ui_copy_setup
    lambda_event["RequestType"] = requestType
    destination_bucket_name = lambda_event[RESOURCE_PROPERTIES][DESTINATION_BUCKET_NAME]
    source_bucket_name = lambda_event[RESOURCE_PROPERTIES][SOURCE_BUCKET_NAME]
    source_prefix = lambda_event[RESOURCE_PROPERTIES][SOURCE_PREFIX]
    ssm_param_key = lambda_event[RESOURCE_PROPERTIES][WEBSITE_CONFIG_PARAM_KEY]
    mock_account_id = get_invocation_account_id(mock_lambda_context)

    tmp_dir = tmp_path / "bad_zip"
    tmp_dir.mkdir()
    bad_zip_file = tmp_dir / "fake_bad_zip.zip"
    bad_zip_file.write_text("This is a fake bad zip file")
    assert len(list(tmp_path.iterdir())) == 1

    s3_resource.meta.client.upload_file(str(bad_zip_file), source_bucket_name, source_prefix)
    assert len(list(s3_resource.Bucket(source_bucket_name).objects.all())) == 1
    with pytest.raises(zipfile.error):
        create(
            s3_resource,
            source_bucket_name,
            source_prefix,
            destination_bucket_name,
            ssm_param_key,
            mock_account_id,
        )


@pytest.mark.parametrize("requestType", ["Create", "Update"])
def test_execute_call_with_wrong_source_bucket(monkeypatch, web_ui_copy_setup, mock_lambda_context, requestType):
    lambda_event, _, _ = web_ui_copy_setup
    lambda_event["RequestType"] = requestType
    monkeypatch.setitem(lambda_event[RESOURCE_PROPERTIES], SOURCE_BUCKET_NAME, "non-existing-bucket")

    with mock.patch("cfn_response.http") as mocked_PoolManager:
        mocked_PoolManager.return_value = {"status": 200}

        execute(lambda_event, mock_lambda_context)

        mocked_PoolManager.request.assert_called_once_with(
            method="PUT",
            url="https://fakeurl/doesnotexist",
            headers={"content-type": "", "content-length": "322"},
            body='{"Status": "FAILED", "Reason": "An error occurred (NoSuchBucket) when calling the GetObject operation: The specified bucket does not exist", "PhysicalResourceId": "fake_physical_resource_id", "StackId": "fakeStackId", "RequestId": "fakeRequestId", "LogicalResourceId": "fakeLogicalResourceId", "NoEcho": false, "Data": {}}',
        )


@pytest.mark.parametrize("requestType", ["Create", "Update", "Delete"])
def test_execute_call_with_wrong_destination_bucket(monkeypatch, web_ui_copy_setup, mock_lambda_context, requestType):
    lambda_event, _, _ = web_ui_copy_setup
    lambda_event["RequestType"] = requestType
    monkeypatch.setitem(lambda_event[RESOURCE_PROPERTIES], DESTINATION_BUCKET_NAME, "non-existing-bucket")

    with mock.patch("cfn_response.http") as mocked_PoolManager:
        mocked_PoolManager.return_value = {"status": 200}
        execute(lambda_event, mock_lambda_context)

        if requestType == "Create" or requestType == "Update":
            mocked_PoolManager.request.assert_called_once_with(
                method="PUT",
                url="https://fakeurl/doesnotexist",
                headers={"content-type": "", "content-length": "322"},
                body='{"Status": "FAILED", "Reason": "An error occurred (NoSuchBucket) when calling the PutObject operation: The specified bucket does not exist", "PhysicalResourceId": "fake_physical_resource_id", "StackId": "fakeStackId", "RequestId": "fakeRequestId", "LogicalResourceId": "fakeLogicalResourceId", "NoEcho": false, "Data": {}}',
            )
        elif requestType == "Delete":
            mocked_PoolManager.request.assert_called_once_with(
                method="PUT",
                url="https://fakeurl/doesnotexist",
                headers={"content-type": "", "content-length": "331"},
                body='{"Status": "FAILED", "Reason": "An error occurred (NoSuchBucket) when calling the ListObjectVersions operation: The specified bucket does not exist", "PhysicalResourceId": "fake_physical_resource_id", "StackId": "fakeStackId", "RequestId": "fakeRequestId", "LogicalResourceId": "fakeLogicalResourceId", "NoEcho": false, "Data": {}}',
            )


@pytest.mark.parametrize("requestType", ["Create", "Update", "Delete"])
def test_lambda_handler(web_ui_copy_setup, mock_lambda_context, requestType):
    lambda_event, s3_resource, _ = web_ui_copy_setup
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
