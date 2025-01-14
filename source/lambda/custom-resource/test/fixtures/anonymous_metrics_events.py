#!/usr/bin/env python
# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

from copy import copy

import pytest
from operations import operation_types
from operations.operation_types import PHYSICAL_RESOURCE_ID, RESOURCE, RESOURCE_PROPERTIES
from utils.constants import (
    USE_CASE_CONFIG_RECORD_KEY,
    USE_CASE_CONFIG_RECORD_KEY_ATTRIBUTE_NAME,
    USE_CASE_CONFIG_TABLE_NAME,
    UUID,
)


@pytest.fixture
def llm_config_value():
    config = {
        "LlmParams": {
            "ModelProvider": "Bedrock",
            "BedrockLlmParams": {"ModelId": "fakemodel"},
            "PromptParams": {
                "PromptTemplate": "template",
                "DisambiguationPromptTemplate": "fake",
                "MaxPromptTemplateLength": 100,
            },
        },
        "ConversationMemoryParams": {"ConversationMemoryType": "DynamoDB", "ChatHistoryLength": 10},
    }
    yield config


@pytest.fixture
def lambda_events(aws_credentials, custom_resource_event):
    events_list = []
    payloads = [
        {
            RESOURCE: operation_types.ANONYMOUS_METRIC,
            "SolutionId": "SO0999",
            "Version": "v9.9.9",
            "ServiceToken": "arn:aws:lambda:us-east-1:123456789012:function:fakefunction:1",
            USE_CASE_CONFIG_TABLE_NAME: "fake_ddb_table",
            USE_CASE_CONFIG_RECORD_KEY: "fake_ddb_table_hash_key",
            UUID: "fakeuuid",
        },
        {
            RESOURCE: operation_types.ANONYMOUS_METRIC,
            "SolutionId": "SO0999",
            "Version": "v9.9.9",
            "ServiceToken": "arn:aws:lambda:us-east-1:123456789012:function:fakefunction:1",
            UUID: "fakeuuid",
        },
        {
            RESOURCE: operation_types.ANONYMOUS_METRIC,
            "SolutionId": "SO0999",
            "Version": "v9.9.9",
            "ServiceToken": "arn:aws:lambda:us-east-1:123456789012:function:fakefunction:1",
            UUID: "fakeuuid",
        },
    ]
    custom_resource_event[PHYSICAL_RESOURCE_ID] = "fake_physical_resource_id"

    for payload_item in payloads:
        custom_resource_event[RESOURCE_PROPERTIES] = payload_item
        events_list.append(copy(custom_resource_event))

    yield events_list


@pytest.fixture(autouse=True)
def setup_config_ddb(ddb, llm_config_value):
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
            "config": llm_config_value,
        },
    )

    yield ddb
