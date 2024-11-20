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
from moto import mock_aws
import pytest
from operations import operation_types
from operations.operation_types import RESOURCE, RESOURCE_PROPERTIES, PHYSICAL_RESOURCE_ID
from operations.get_arns_for_inference_profile import (
    USE_CASE_CONFIG_TABLE_NAME,
    USE_CASE_CONFIG_RECORD_KEY,
    LLM_CONFIG_RECORD_FIELD_NAME,
)


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
