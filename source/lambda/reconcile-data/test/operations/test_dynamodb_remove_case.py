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

import botocore
import pytest
from fixtures.remove_case_event import ttl_remove_event
from helper import get_service_client
from moto import mock_ssm
from operations.dynamodb_remove_case import reconcile


@mock_ssm
def test_reconcile(ttl_remove_event, mock_lambda_context):
    ssm = get_service_client("ssm")

    for index, record in enumerate(ttl_remove_event["Records"]):
        ssm.put_parameter(
            Name=f"/fakekey{index+1}",
            Value=f"fakevalue{index+1}",
            Type="SecureString",
            Tier="Intelligent-Tiering",
        )

    for record in ttl_remove_event["Records"]:
        reconcile(record)


@mock_ssm
def test_reconcile_failure_with_ssm(ttl_remove_event, mock_lambda_context):
    ssm = get_service_client("ssm")

    for index, record in enumerate(ttl_remove_event["Records"]):
        ssm.put_parameter(
            Name=f"/fakekey{index+3}",
            Value=f"fakevalue{index+4}",
            Type="SecureString",
            Tier="Intelligent-Tiering",
        )

    for record in ttl_remove_event["Records"]:
        reconcile(record)


@mock_ssm
def test_reconcile_with_parameter_name_missing_in_record(monkeypatch, ttl_remove_event, mock_lambda_context):
    ssm = get_service_client("ssm")

    for index, record in enumerate(ttl_remove_event["Records"]):
        ssm.put_parameter(
            Name=f"/fakekey{index+1}",
            Value=f"fakevalue{index+1}",
            Type="SecureString",
            Tier="Intelligent-Tiering",
        )

    for record in ttl_remove_event["Records"]:
        monkeypatch.delitem(record["dynamodb"]["OldImage"], "SSMParameterKey")
        reconcile(record)
