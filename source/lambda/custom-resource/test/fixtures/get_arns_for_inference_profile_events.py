#!/usr/bin/env python
# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0


import pytest
from moto import mock_aws
from operations import operation_types
from operations.get_arns_for_inference_profile import (
    LLM_CONFIG_RECORD_FIELD_NAME,
    USE_CASE_CONFIG_RECORD_KEY,
    USE_CASE_CONFIG_TABLE_NAME,
)
from operations.operation_types import PHYSICAL_RESOURCE_ID, RESOURCE, RESOURCE_PROPERTIES


@pytest.fixture
def lambda_event(aws_credentials, custom_resource_event):
    custom_resource_event[RESOURCE_PROPERTIES] = {
        RESOURCE: operation_types.GET_MODEL_RESOURCE_ARNS,
        USE_CASE_CONFIG_TABLE_NAME: "fake-ddb",
        USE_CASE_CONFIG_RECORD_KEY: "fake-record",
    }
    custom_resource_event[PHYSICAL_RESOURCE_ID] = "fake_physical_resource_id"

    yield custom_resource_event


@mock_aws
@pytest.fixture
def setup_use_case_config(ddb_client, lambda_event):
    table_name = lambda_event[RESOURCE_PROPERTIES][USE_CASE_CONFIG_TABLE_NAME]
    ddb_client.create_table(
        TableName=table_name,
        KeySchema=[
            {"AttributeName": LLM_CONFIG_RECORD_FIELD_NAME, "KeyType": "HASH"},
        ],
        AttributeDefinitions=[
            {"AttributeName": LLM_CONFIG_RECORD_FIELD_NAME, "AttributeType": "S"},
        ],
        BillingMode="PAY_PER_REQUEST",
        SSESpecification={
            "Enabled": True,
        },
    )

    yield lambda_event, ddb_client
