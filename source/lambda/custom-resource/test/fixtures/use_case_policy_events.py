#!/usr/bin/env python
# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0


import pytest
from operations import operation_types
from operations.use_case_policy import (
    API_ARN,
    GROUP_NAME,
    PHYSICAL_RESOURCE_ID,
    POLICY_TABLE_NAME,
    RESOURCE,
    RESOURCE_PROPERTIES,
)


@pytest.fixture
def lambda_event(aws_credentials, custom_resource_event):
    custom_resource_event[RESOURCE_PROPERTIES] = {RESOURCE: operation_types.USE_CASE_POLICY}
    custom_resource_event[RESOURCE_PROPERTIES][GROUP_NAME] = "fakegroupname"
    custom_resource_event[RESOURCE_PROPERTIES][API_ARN] = "fakeapi.arn"
    custom_resource_event[RESOURCE_PROPERTIES][POLICY_TABLE_NAME] = "policytable"
    custom_resource_event[PHYSICAL_RESOURCE_ID] = "fake_physical_resource_id"

    yield custom_resource_event


@pytest.fixture()
def setup_ddb(ddb, lambda_event):
    ddb.create_table(
        TableName=lambda_event[RESOURCE_PROPERTIES][POLICY_TABLE_NAME],
        KeySchema=[{"AttributeName": "group", "KeyType": "HASH"}],
        AttributeDefinitions=[{"AttributeName": "group", "AttributeType": "S"}],
        BillingMode="PAY_PER_REQUEST",
    )

    yield ddb, lambda_event
