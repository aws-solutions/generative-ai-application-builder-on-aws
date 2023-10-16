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

import json
import re
from copy import copy
from test.fixtures.anonymous_metrics_events import lambda_events

import mock
import operations
import pytest
from freezegun import freeze_time
from helper import get_service_client
from lambda_func import handler
from moto import mock_ssm
from operations.anonymous_metrics import (
    DEPLOY_KENDRA_INDEX,
    SOLUTION_ID,
    VERSION,
    WORKFLOW_CONFIG_NAME,
    execute,
    sanitize_data,
    verify_env_setup,
)
from operations.operation_types import RESOURCE, RESOURCE_PROPERTIES
from utils.constants import LLM_PARAMS, METRICS_ENDPOINT, MODEL_PROVIDER_NAME, PROMPT_TEMPLATE, SSM_CONFIG_KEY

UUID_REGEX = "^[0-9a-f]{8}-[0-9a-f]{4}-[0-5][0-9a-f]{3}-[089ab][0-9a-f]{3}-[0-9a-f]{12}$"
compiled_regex_uuid = re.compile(UUID_REGEX)


@mock_ssm
def setup_ssm():
    ssm = get_service_client("ssm")
    ssm.put_parameter(
        Name="/fakekey/usecase",
        Value='{"LlmParams":{"ModelProvider":"Anthropic","ModelId":"Claude","ModelParams":{},"PromptTemplate":"AI","Streaming":true,"Verbose":false,"Temperature":0.1,"RAGEnabled":false}}',
        Type="SecureString",
        Tier="Intelligent-Tiering",
    )


@mock_ssm
def test_when_operation_type_is_invalid(mock_lambda_context, lambda_events):
    expected_response = {
        "method": "PUT",
        "url": "https://fakeurl/doesnotexist",
        "headers": {"content-type": "", "content-length": "327"},
        "body": '{"Status": "FAILED", "Reason": "Operation type not available or did not match from the request. Expecting operation type to be ANONYMOUS_METRIC", "PhysicalResourceId": "fake_physical_resource_id", "StackId": "fakeStackId", "RequestId": "fakeRequestId", "LogicalResourceId": "fakeLogicalResourceId", "NoEcho": false, "Data": {}}',
    }

    setup_ssm()

    for event in lambda_events:
        event[RESOURCE_PROPERTIES][RESOURCE] = "FAKE_RESOURCE"

        with pytest.raises(ValueError):
            verify_env_setup(event)

        with mock.patch("cfn_response.http") as mocked_PoolManager:
            execute(event, mock_lambda_context)

            mocked_PoolManager.request.assert_called_once_with(**expected_response)


@mock_ssm
@pytest.mark.parametrize("requestType", ["Create", "Update", "Delete"])
def test_sending_metric(lambda_events, mock_lambda_context, requestType):
    setup_ssm()

    kendra_workflow_props = [("Yes", "default"), ("No", "default")]
    for idx, event in enumerate(lambda_events[:-1]):
        event["RequestType"] = requestType
        with mock.patch("cfn_response.http") as cfn_mocked_PoolManager:
            with mock.patch("utils.metrics.http") as metrics_mocked_PoolManager:
                execute(event, mock_lambda_context)

                call_kwargs = metrics_mocked_PoolManager.request.call_args.kwargs
                assert call_kwargs["method"] == "POST"
                assert call_kwargs["url"] == METRICS_ENDPOINT
                body = json.loads(call_kwargs["body"])
                assert body["Solution"] == "SO0999"
                assert body.get("UUID") == "fakeuuid"
                assert body[VERSION] == "v9.9.9"

            cfn_mocked_PoolManager.request.assert_called_once_with(
                method="PUT",
                url="https://fakeurl/doesnotexist",
                headers={"content-type": "", "content-length": "278"},
                body='{"Status": "SUCCESS", "Reason": "See the details in CloudWatch Log Stream: fake_logstream_name", "PhysicalResourceId": "fake_physical_resource_id", "StackId": "fakeStackId", "RequestId": "fakeRequestId", "LogicalResourceId": "fakeLogicalResourceId", "NoEcho": false, "Data": {}}',
            )


@mock_ssm
@freeze_time("2000-01-01T00:00:00")
@pytest.mark.parametrize("requestType", ["Create", "Update", "Delete"])
def test_sending_metric_missing_props(lambda_events, mock_lambda_context, requestType):
    setup_ssm()

    event = lambda_events[-1]
    event["RequestType"] = requestType
    with mock.patch("cfn_response.http") as cfn_mocked_PoolManager:
        with mock.patch("utils.metrics.http") as metrics_mocked_PoolManager:
            execute(event, mock_lambda_context)

            call_kwargs = metrics_mocked_PoolManager.request.call_args

            if event["RequestType"] == "Create" or event["RequestType"] == "Update":
                cfn_mocked_PoolManager.request.call_args.kwargs["body"] == {
                    "Status": "FAILED",
                    "Reason": "'DeployKendraIndex' has not been passed. Hence operation cannot be performed.",
                    "PhysicalResourceId": "fake_physical_resource_id",
                    "StackId": "fakeStackId",
                    "RequestId": "fakeRequestId",
                    "LogicalResourceId": "fakeLogicalResourceId",
                    "NoEcho": False,
                    "Data": {},
                }
            else:
                call_kwargs = metrics_mocked_PoolManager.request.call_args.kwargs
                assert call_kwargs["method"] == "POST"
                assert call_kwargs["url"] == METRICS_ENDPOINT
                body = json.loads(call_kwargs["body"])
                assert body["Solution"] == "SO0999"
                assert body["TimeStamp"] == "2000-01-01T00:00:00"
                assert body.get("UUID") == "fakeuuid"
                assert body[VERSION] == "v9.9.9"
                assert body["Data"] == {}

                cfn_mocked_PoolManager.request.assert_called_once_with(
                    method="PUT",
                    url="https://fakeurl/doesnotexist",
                    headers={"content-type": "", "content-length": "278"},
                    body='{"Status": "SUCCESS", "Reason": "See the details in CloudWatch Log Stream: fake_logstream_name", "PhysicalResourceId": "fake_physical_resource_id", "StackId": "fakeStackId", "RequestId": "fakeRequestId", "LogicalResourceId": "fakeLogicalResourceId", "NoEcho": false, "Data": {}}',
                )


@mock_ssm
@pytest.mark.parametrize("requestType", ["Create", "Update", "Delete"])
def test_sanitize_method(lambda_events, requestType):
    setup_ssm()
    ssm = get_service_client("ssm")

    for event in lambda_events:
        event["RequestType"] = requestType
        resource_properties = event[RESOURCE_PROPERTIES]
        metrics_data = copy(resource_properties)
        ssm_key = metrics_data.get(SSM_CONFIG_KEY, None)
        if ssm_key is not None:
            metrics_data[LLM_PARAMS] = ssm.get_parameter(Name=ssm_key, WithDecryption=True)

        metrics_data = sanitize_data(metrics_data)

        assert resource_properties[RESOURCE] == operations.operation_types.ANONYMOUS_METRIC
        assert RESOURCE not in metrics_data

        assert resource_properties["ServiceToken"] is not None
        assert metrics_data.get("ServiceToken", None) is None

        assert resource_properties[SOLUTION_ID] == "SO0999"
        assert metrics_data.get(SOLUTION_ID, None) is None

        assert resource_properties[VERSION] == "v9.9.9"
        assert metrics_data.get(VERSION, None) is None

        assert metrics_data.get(SSM_CONFIG_KEY, None) is None

        if metrics_data.get(LLM_PARAMS) is not None:
            assert metrics_data[LLM_PARAMS].get(PROMPT_TEMPLATE, None) is None


@mock_ssm
@freeze_time("2000-01-01T00:00:00")
@pytest.mark.parametrize("requestType", ["Create", "Update"])
def test_lambda_handler(lambda_events, mock_lambda_context, requestType):
    expected_body = [("Yes", "default"), ("No", "default")]

    for idx, event in enumerate(lambda_events[:-1]):
        event["RequestType"] = requestType
        with mock.patch("cfn_response.http") as cfn_mocked_PoolManager:
            with mock.patch("utils.metrics.http") as metrics_mocked_PoolManager:
                setup_ssm()
                handler(event, mock_lambda_context)
                call_kwargs = metrics_mocked_PoolManager.request.call_args.kwargs

                assert call_kwargs["method"] == "POST"
                assert call_kwargs["url"] == METRICS_ENDPOINT
                body = json.loads(call_kwargs["body"])
                assert body["Solution"] == "SO0999"
                assert body["TimeStamp"] == "2000-01-01T00:00:00"
                assert body.get("UUID") == "fakeuuid"
                assert body[VERSION] == "v9.9.9"


@mock_ssm
@freeze_time("2000-01-01T00:00:00")
@pytest.mark.parametrize("requestType", ["Create", "Update", "Delete"])
def test_lambda_handler_for_missing_props(lambda_events, mock_lambda_context, requestType):
    event = lambda_events[-1]
    event["RequestType"] = requestType
    setup_ssm()

    with mock.patch("cfn_response.http") as cfn_mocked_PoolManager:
        with mock.patch("utils.metrics.http") as metrics_mocked_PoolManager:
            handler(event, mock_lambda_context)
            call_kwargs = metrics_mocked_PoolManager.request.call_args
            if event["RequestType"] == "Create" or event["RequestType"] == "Update":
                cfn_mocked_PoolManager.request.call_args.kwargs["body"] == {
                    "Status": "FAILED",
                    "Reason": "'DeployKendraIndex' has not been passed. Hence operation cannot be performed.",
                    "PhysicalResourceId": "fake_physical_resource_id",
                    "StackId": "fakeStackId",
                    "RequestId": "fakeRequestId",
                    "LogicalResourceId": "fakeLogicalResourceId",
                    "NoEcho": False,
                    "Data": {},
                }
            else:
                call_kwargs = metrics_mocked_PoolManager.request.call_args.kwargs
                assert call_kwargs["method"] == "POST"
                assert call_kwargs["url"] == METRICS_ENDPOINT
                body = json.loads(call_kwargs["body"])
                assert body["Solution"] == "SO0999"
                assert body["TimeStamp"] == "2000-01-01T00:00:00"
                assert body.get("UUID") == "fakeuuid"
                assert body[VERSION] == "v9.9.9"
                assert body["Data"] == {}

                cfn_mocked_PoolManager.request.assert_called_once_with(
                    method="PUT",
                    url="https://fakeurl/doesnotexist",
                    headers={"content-type": "", "content-length": "278"},
                    body='{"Status": "SUCCESS", "Reason": "See the details in CloudWatch Log Stream: fake_logstream_name", "PhysicalResourceId": "fake_physical_resource_id", "StackId": "fakeStackId", "RequestId": "fakeRequestId", "LogicalResourceId": "fakeLogicalResourceId", "NoEcho": false, "Data": {}}',
                )
