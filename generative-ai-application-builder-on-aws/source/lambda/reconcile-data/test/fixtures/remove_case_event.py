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
from operations.constants import USER_IDENTITY_TYPE, PRINCIPAL_ID, REMOVE_EVENT_NAME


@pytest.fixture
def ttl_remove_event(custom_resource_event):
    custom_resource_event["Records"] = [
        {
            "messageId": "fakemessageid1",
            "userIdentity": {"type": USER_IDENTITY_TYPE, "principalId": PRINCIPAL_ID},
            "eventID": "fakeevent1",
            "eventName": REMOVE_EVENT_NAME,
            "eventSource": "aws:dynamodb",
            "awsRegion": "us-east-1",
            "dynamodb": {
                "OldImage": {
                    "UseCaseId": {"S": "fakecaseId1"},
                    "SSMParameterKey": {"S": "/fakekey1"},
                }
            },
            "eventSourceArn": "aws:aws:dynamodb:us-east-1:fakeaccountid:table/fake-table-name",
        },
        {
            "messageId": "fakemessageid2",
            "userIdentity": {"type": USER_IDENTITY_TYPE, "principalId": PRINCIPAL_ID},
            "eventID": "fakeevent2",
            "eventName": REMOVE_EVENT_NAME,
            "eventSource": "aws:dynamodb",
            "awsRegion": "us-east-1",
            "dynamodb": {
                "OldImage": {
                    "UseCaseId": {"S": "fakecaseId2"},
                    "SSMParameterKey": {"S": "/fakekey2"},
                }
            },
            "eventSourceArn": "aws:aws:dynamodb:us-east-1:fakeaccountid:table/fake-table-name",
        },
    ]
    yield custom_resource_event
