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

from fixtures.remove_case_event import ttl_remove_event
from helper import get_service_client
from lambda_func import handler
from moto import mock_secretsmanager, mock_ssm


@mock_ssm
def init_ssm(records):
    ssm = get_service_client("ssm")
    secretsmanager = get_service_client("secretsmanager")

    for index, record in enumerate(records):
        ssm.put_parameter(
            Name=f"/fakekey{index+1}",
            Value=f"fakevalue{index+1}",
            Type="SecureString",
            Tier="Intelligent-Tiering",
        )
        secretsmanager.create_secret(Name=f"fakekey{index+1}", SecretString=f"fakesecretvalue{index+1}")


@mock_ssm
@mock_secretsmanager
def test_handler(ttl_remove_event, mock_lambda_context):
    init_ssm(ttl_remove_event["Records"])
    handler(ttl_remove_event, mock_lambda_context)


def test_handler_with_diff_user_identity(monkeypatch, ttl_remove_event, mock_lambda_context):
    for record in ttl_remove_event["Records"]:
        monkeypatch.delitem(record, "userIdentity")
        response = handler(ttl_remove_event, mock_lambda_context)
        assert response["batchItemFailures"] is not None and len(response["batchItemFailures"]) > 0


def test_when_operation_not_found(monkeypatch, ttl_remove_event, mock_lambda_context):
    for record in ttl_remove_event["Records"]:
        monkeypatch.setitem(record, "eventSource", "fakesource")
        response = handler(ttl_remove_event, mock_lambda_context)
        assert response["batchItemFailures"] is not None and len(response["batchItemFailures"]) > 0
