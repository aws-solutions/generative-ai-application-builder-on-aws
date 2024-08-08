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
from copy import copy

import pytest
from operations import operation_types
from operations.operation_types import RESOURCE, RESOURCE_PROPERTIES, PHYSICAL_RESOURCE_ID
from utils.constants import (
    USE_CASE_CONFIG_RECORD_KEY_ATTRIBUTE_NAME,
    USE_CASE_CONFIG_RECORD_KEY,
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
