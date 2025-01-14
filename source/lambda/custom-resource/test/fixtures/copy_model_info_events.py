#!/usr/bin/env python
# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

import os
from pathlib import Path
from zipfile import ZIP_DEFLATED, ZipFile

import pytest
from moto import mock_aws
from operations import operation_types
from operations.copy_model_info_to_ddb import DDB_TABLE_NAME
from operations.operation_types import (
    PHYSICAL_RESOURCE_ID,
    RESOURCE,
    RESOURCE_PROPERTIES,
    SOURCE_BUCKET_NAME,
    SOURCE_PREFIX,
)


@pytest.fixture()
def copy_to_ddb_event(aws_credentials, custom_resource_event):
    custom_resource_event[RESOURCE_PROPERTIES] = {RESOURCE: operation_types.COPY_MODEL_INFO}
    custom_resource_event[RESOURCE_PROPERTIES][SOURCE_BUCKET_NAME] = "fake_source_bucket"
    custom_resource_event[RESOURCE_PROPERTIES][SOURCE_PREFIX] = "model-info.zip"
    custom_resource_event[RESOURCE_PROPERTIES][SOURCE_PREFIX] = "model-info.zip"
    custom_resource_event[RESOURCE_PROPERTIES][DDB_TABLE_NAME] = "faketable"
    custom_resource_event[PHYSICAL_RESOURCE_ID] = "fake_physical_resource_id"

    yield custom_resource_event


@pytest.fixture
def setup_model_info(tmp_path, s3, ddb, copy_to_ddb_event):
    source_bucket_name = copy_to_ddb_event[RESOURCE_PROPERTIES][SOURCE_BUCKET_NAME]
    source_prefix = copy_to_ddb_event[RESOURCE_PROPERTIES][SOURCE_PREFIX]

    s3.create_bucket(Bucket=source_bucket_name)
    local_dir = Path(__file__).absolute().parents[4] / "model-info"
    assert len(os.listdir(local_dir)) > 0

    with ZipFile(str(tmp_path / source_prefix), "w", ZIP_DEFLATED) as assert_archive:
        for folder_name, subfolders, filnames in os.walk(local_dir):
            filnames = filter(lambda file: file.endswith(".json"), filnames)
            for filename in filnames:
                file_path = str(local_dir / filename)
                assert_archive.write(file_path, arcname=os.path.relpath(file_path, local_dir))
    assert_archive.close()

    s3.meta.client.upload_file(
        str(tmp_path / source_prefix),
        source_bucket_name,
        f"{source_prefix}",
    )

    os.remove(str(tmp_path / source_prefix))

    ddb_table_name = copy_to_ddb_event[RESOURCE_PROPERTIES][DDB_TABLE_NAME]
    ddb.create_table(
        TableName=ddb_table_name,
        KeySchema=[{"AttributeName": "UseCase", "KeyType": "HASH"}, {"AttributeName": "SortKey", "KeyType": "RANGE"}],
        AttributeDefinitions=[
            {"AttributeName": "UseCase", "AttributeType": "S"},
            {"AttributeName": "SortKey", "AttributeType": "S"},
        ],
        BillingMode="PAY_PER_REQUEST",
    )

    yield copy_to_ddb_event, s3, ddb


@pytest.fixture
def ddb_table(ddb):
    with mock_aws():
        table_name = "test-table"
        table = ddb.create_table(
            TableName=table_name,
            KeySchema=[
                {"AttributeName": "UseCase", "KeyType": "HASH"},
                {"AttributeName": "SortKey", "KeyType": "RANGE"},
            ],
            AttributeDefinitions=[
                {"AttributeName": "UseCase", "AttributeType": "S"},
                {"AttributeName": "SortKey", "AttributeType": "S"},
            ],
            BillingMode="PAY_PER_REQUEST",
        )

        # Add some test data
        table.put_item(Item={"UseCase": "UseCase1", "SortKey": "item1"})
        table.put_item(Item={"UseCase": "UseCase2", "SortKey": "item2"})
        table.put_item(Item={"UseCase": "UseCase3", "SortKey": "item2"})
        table.put_item(Item={"UseCase": "UseCase4", "SortKey": "item4"})

        yield table
