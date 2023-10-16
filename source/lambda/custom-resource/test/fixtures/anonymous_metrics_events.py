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
from utils.constants import MODEL_PROVIDER_NAME, SSM_CONFIG_KEY, LLM_PARAMS, UUID


@pytest.fixture
def lambda_events(aws_credentials, custom_resource_event):
    events_list = []
    payloads = [
        {
            RESOURCE: operation_types.ANONYMOUS_METRIC,
            "SolutionId": "SO0999",
            "Version": "v9.9.9",
            "ServiceToken": "arn:aws:lambda:us-east-1:123456789012:function:fakefunction:1",
            SSM_CONFIG_KEY: "/fakekey/usecase",
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
