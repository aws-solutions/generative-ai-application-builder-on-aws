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

import pytest
from operations import operation_types
from operations.admin_policy import (
    RESOURCE,
    RESOURCE_PROPERTIES,
    PHYSICAL_RESOURCE_ID,
    POLICY_TABLE_NAME,
    API_ARN,
)


@pytest.fixture
def lambda_event(aws_credentials, custom_resource_event):
    custom_resource_event[RESOURCE_PROPERTIES] = {RESOURCE: operation_types.ADMIN_POLICY}
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
