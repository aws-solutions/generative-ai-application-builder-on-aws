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

import os
from pathlib import Path
from zipfile import ZIP_DEFLATED, ZipFile

import pytest
from operations import operation_types
from operations.copy_model_info_to_ddb import DDB_TABLE_NAME, create, execute, verify_env_setup
from operations.operation_types import (
    RESOURCE,
    RESOURCE_PROPERTIES,
    SOURCE_BUCKET_NAME,
    SOURCE_PREFIX,
    PHYSICAL_RESOURCE_ID,
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
