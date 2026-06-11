#!/usr/bin/env python
# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

import copy
import json
import os
from zipfile import ZIP_DEFLATED, ZipFile

import pytest
from operations import operation_types
from operations.copy_web_ui import (
    DESTINATION_BUCKET_NAME,
    IS_INTERNAL_USER_KEY,
    SOURCE_BUCKET_NAME,
    SOURCE_PREFIX,
    USE_CASE_CONFIG_RECORD_KEY,
    USE_CASE_CONFIG_RECORD_KEY_ATTRIBUTE_NAME,
    USE_CASE_CONFIG_TABLE_NAME,
    WEBSITE_CONFIG_PARAM_KEY,
)
from operations.operation_types import PHYSICAL_RESOURCE_ID, RESOURCE, RESOURCE_PROPERTIES

SAMPLE_JSON_VALUE = {"Key1": "FakeValue1", "Key2": {"Key3": "FakeValue3"}}


def _create_dummy_web_ui_zip(tmp_path, zip_name):
    """Create a zip archive with self-contained dummy files for testing.

    These dummy files stand in for real UI build output. The tests verify zip
    download/extraction/S3 copy logic — they don't validate UI content.
    """
    dummy_files = {
        "index.html": "<!DOCTYPE html><html><head><title>Test</title></head><body><div id='root'></div></body></html>",
        "static/js/main.js": "console.log('dummy main.js bundle');",
        "static/css/style.css": "body { margin: 0; font-family: sans-serif; }",
        "asset-manifest.json": '{"files": {"main.js": "/static/js/main.js", "main.css": "/static/css/style.css"}}',
    }

    zip_path = tmp_path / zip_name
    with ZipFile(str(zip_path), "w", ZIP_DEFLATED) as archive:
        for file_path, content in dummy_files.items():
            archive.writestr(file_path, content)

    return zip_path


@pytest.fixture
def lambda_event(aws_credentials, custom_resource_event):
    custom_resource_event[RESOURCE_PROPERTIES] = {RESOURCE: operation_types.COPY_WEB_UI}
    custom_resource_event[RESOURCE_PROPERTIES][SOURCE_BUCKET_NAME] = "fake_source_bucket"
    custom_resource_event[RESOURCE_PROPERTIES][SOURCE_PREFIX] = "web_ui.zip"
    custom_resource_event[RESOURCE_PROPERTIES][DESTINATION_BUCKET_NAME] = "fake_destination_bucket"
    custom_resource_event[RESOURCE_PROPERTIES][WEBSITE_CONFIG_PARAM_KEY] = "fake_config_param_key"
    custom_resource_event[PHYSICAL_RESOURCE_ID] = "fake_physical_resource_id"

    yield custom_resource_event


@pytest.fixture
def web_ui_copy_setup(tmp_path, s3, ssm, ddb, lambda_event):
    destination_bucket_name = lambda_event[RESOURCE_PROPERTIES][DESTINATION_BUCKET_NAME]
    source_bucket_name = lambda_event[RESOURCE_PROPERTIES][SOURCE_BUCKET_NAME]
    source_prefix = lambda_event[RESOURCE_PROPERTIES][SOURCE_PREFIX]

    s3.create_bucket(Bucket=source_bucket_name)

    zip_path = _create_dummy_web_ui_zip(tmp_path, source_prefix)

    s3.meta.client.upload_file(
        str(zip_path),
        source_bucket_name,
        f"{source_prefix}",
    )

    s3.create_bucket(Bucket=destination_bucket_name)
    os.remove(str(zip_path))

    test_json_param = json.dumps(SAMPLE_JSON_VALUE)
    ssm.put_parameter(
        Name="fake_config_param_key",
        Value=test_json_param,
        Type="SecureString",
        Tier="Intelligent-Tiering",
    )

    yield lambda_event, s3, ssm


@pytest.fixture
def web_ui_copy_setup_with_config(
    tmp_path, s3, ssm, ddb, lambda_event, is_internal_user_ssm, is_internal_user_ddb, prompt_editing_enabled
):
    destination_bucket_name = lambda_event[RESOURCE_PROPERTIES][DESTINATION_BUCKET_NAME]
    source_bucket_name = lambda_event[RESOURCE_PROPERTIES][SOURCE_BUCKET_NAME]
    source_prefix = lambda_event[RESOURCE_PROPERTIES][SOURCE_PREFIX]

    s3.create_bucket(Bucket=source_bucket_name)

    zip_path = _create_dummy_web_ui_zip(tmp_path, source_prefix)

    s3.meta.client.upload_file(
        str(zip_path),
        source_bucket_name,
        f"{source_prefix}",
    )

    s3.create_bucket(Bucket=destination_bucket_name)
    os.remove(str(zip_path))

    ssm_value = copy.deepcopy(SAMPLE_JSON_VALUE)
    ssm_value[IS_INTERNAL_USER_KEY] = "true" if is_internal_user_ssm else "false"
    test_json_param = json.dumps(ssm_value)
    ssm.put_parameter(
        Name="fake_config_param_key",
        Value=test_json_param,
        Type="SecureString",
        Tier="Intelligent-Tiering",
    )

    lambda_event[RESOURCE_PROPERTIES][USE_CASE_CONFIG_TABLE_NAME] = "fake_ddb_table"
    lambda_event[RESOURCE_PROPERTIES][USE_CASE_CONFIG_RECORD_KEY] = "fake_ddb_table_hash_key"

    table = ddb.create_table(
        TableName="fake_ddb_table",
        KeySchema=[
            {"AttributeName": USE_CASE_CONFIG_RECORD_KEY_ATTRIBUTE_NAME, "KeyType": "HASH"},
        ],
        AttributeDefinitions=[
            {"AttributeName": USE_CASE_CONFIG_RECORD_KEY_ATTRIBUTE_NAME, "AttributeType": "S"},
        ],
        BillingMode="PAY_PER_REQUEST",
    )
    table.put_item(
        TableName="fake_ddb_table",
        Item={
            USE_CASE_CONFIG_RECORD_KEY_ATTRIBUTE_NAME: "fake_ddb_table_hash_key",
            "config": {
                IS_INTERNAL_USER_KEY: "true" if is_internal_user_ddb else "false",
                "UseCaseName": "test_use_case",
                "LlmParams": {
                    "PromptParams": {
                        "UserPromptEditingEnabled": prompt_editing_enabled,
                        "PromptTemplate": "fake_prompt_template",
                        "MaxPromptTemplateLength": 1000,
                        "MaxInputTextLength": 1000,
                    },
                    "RAGEnabled": True,
                    "some_extra_param": "test",
                },
            },
        },
    )

    yield lambda_event, s3, ssm, ddb
