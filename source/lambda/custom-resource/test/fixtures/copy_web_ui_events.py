#!/usr/bin/env python
# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

import copy
import json
import os
from pathlib import Path
from zipfile import ZIP_DEFLATED, ZipFile

import pytest
from operations import operation_types
from operations.copy_web_ui import (
    DESTINATION_BUCKET_NAME,
    IS_INTERNAL_USER_KEY,
    CLOUDFRONT_DISTRIBUTION_ID,
    SOURCE_BUCKET_NAME,
    SOURCE_PREFIX,
    USE_CASE_CONFIG_RECORD_KEY,
    USE_CASE_CONFIG_RECORD_KEY_ATTRIBUTE_NAME,
    USE_CASE_CONFIG_TABLE_NAME,
    WEBSITE_CONFIG_PARAM_KEY,
)
from operations.operation_types import PHYSICAL_RESOURCE_ID, RESOURCE, RESOURCE_PROPERTIES

SAMPLE_JSON_VALUE = {"Key1": "FakeValue1", "Key2": {"Key3": "FakeValue3"}}

# fmt: off
os.system(f"cd {Path(__file__).absolute().parents[4]}/ui && npm install && npm run build && cd -")  # nosec - fixture to fake node builds
# fmt:on


@pytest.fixture
def lambda_event(aws_credentials, custom_resource_event):
    custom_resource_event[RESOURCE_PROPERTIES] = {RESOURCE: operation_types.COPY_WEB_UI}
    custom_resource_event[RESOURCE_PROPERTIES][SOURCE_BUCKET_NAME] = "fake_source_bucket"
    custom_resource_event[RESOURCE_PROPERTIES][SOURCE_PREFIX] = "web_ui.zip"
    custom_resource_event[RESOURCE_PROPERTIES][DESTINATION_BUCKET_NAME] = "fake_destination_bucket"
    custom_resource_event[RESOURCE_PROPERTIES][WEBSITE_CONFIG_PARAM_KEY] = "fake_config_param_key"
    custom_resource_event[RESOURCE_PROPERTIES][CLOUDFRONT_DISTRIBUTION_ID] = "E123EXAMPLE"
    custom_resource_event[PHYSICAL_RESOURCE_ID] = "fake_physical_resource_id"

    yield custom_resource_event


@pytest.fixture
def web_ui_copy_setup(tmp_path, s3, ssm, ddb, lambda_event):
    local_dir = Path(__file__).absolute().parents[4] / "ui-deployment" / "build"
    destination_bucket_name = lambda_event[RESOURCE_PROPERTIES][DESTINATION_BUCKET_NAME]
    source_bucket_name = lambda_event[RESOURCE_PROPERTIES][SOURCE_BUCKET_NAME]
    source_prefix = lambda_event[RESOURCE_PROPERTIES][SOURCE_PREFIX]

    s3.create_bucket(Bucket=source_bucket_name)

    with ZipFile(str(tmp_path / source_prefix), "w", ZIP_DEFLATED) as assert_archive:
        for folder_name, subfolders, filnames in os.walk(local_dir):
            for filename in filnames:
                file_path = os.path.join(folder_name, filename)
                assert_archive.write(file_path, os.path.relpath(file_path, local_dir))
        assert_archive.close()

    s3.meta.client.upload_file(
        str(tmp_path / source_prefix),
        source_bucket_name,
        f"{source_prefix}",
    )

    s3.create_bucket(Bucket=destination_bucket_name)
    os.remove(str(tmp_path / source_prefix))

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
    local_dir = Path(__file__).absolute().parents[4] / "ui-chat" / "build"
    destination_bucket_name = lambda_event[RESOURCE_PROPERTIES][DESTINATION_BUCKET_NAME]
    source_bucket_name = lambda_event[RESOURCE_PROPERTIES][SOURCE_BUCKET_NAME]
    source_prefix = lambda_event[RESOURCE_PROPERTIES][SOURCE_PREFIX]

    s3.create_bucket(Bucket=source_bucket_name)

    with ZipFile(str(tmp_path / source_prefix), "w", ZIP_DEFLATED) as assert_archive:
        for folder_name, subfolders, filnames in os.walk(local_dir):
            for filename in filnames:
                file_path = os.path.join(folder_name, filename)
                assert_archive.write(file_path, os.path.relpath(file_path, local_dir))
        assert_archive.close()

    s3.meta.client.upload_file(
        str(tmp_path / source_prefix),
        source_bucket_name,
        f"{source_prefix}",
    )

    s3.create_bucket(Bucket=destination_bucket_name)
    os.remove(str(tmp_path / source_prefix))

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
