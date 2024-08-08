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
from test.fixtures.gen_domain_prefix_events import lambda_event

import mock
import operations
import pytest
from lambda_func import handler
from operations.gen_domain_prefix import execute, verify_env_setup
from operations.operation_types import RESOURCE, RESOURCE_PROPERTIES


@pytest.mark.parametrize("requestType", ["Create"])
def test_gen_domain_prefix_success(lambda_event, mock_lambda_context, requestType):
    lambda_event["RequestType"] = requestType

    with mock.patch("cfn_response.http") as mocked_PoolManager:
        execute(lambda_event, mock_lambda_context)
        mocked_PoolManager.request.assert_called_once()

        call_kwargs = mocked_PoolManager.request.call_args.kwargs
        assert call_kwargs["method"] == "PUT"
        assert call_kwargs["url"] == "https://fakeurl/doesnotexist"

        body = json.loads(call_kwargs["body"])
        assert body["Status"] == "SUCCESS"
        assert body["Reason"] == "See the details in CloudWatch Log Stream: fake_logstream_name"
        assert body["PhysicalResourceId"] == "fake_logstream_name"
        assert body["StackId"] == "fakeStackId"
        assert body["RequestId"] == "fakeRequestId"
        assert body["LogicalResourceId"] == "fakeLogicalResourceId"
        assert body["NoEcho"] == False
        assert body["Data"] is not None


@pytest.mark.parametrize("requestType", ["Update", "Delete"])
def test_gen_domain_prefix_success(lambda_event, mock_lambda_context, requestType):
    lambda_event["RequestType"] = requestType

    with mock.patch("cfn_response.http") as mocked_PoolManager:
        execute(lambda_event, mock_lambda_context)
        mocked_PoolManager.request.assert_called_once()

        call_kwargs = mocked_PoolManager.request.call_args.kwargs
        assert call_kwargs["method"] == "PUT"
        assert call_kwargs["url"] == "https://fakeurl/doesnotexist"

        body = json.loads(call_kwargs["body"])
        assert body["Status"] == "SUCCESS"
        assert body["Reason"] == "See the details in CloudWatch Log Stream: fake_logstream_name"
        assert body["PhysicalResourceId"] == "fake_logstream_name"
        assert body["StackId"] == "fakeStackId"
        assert body["RequestId"] == "fakeRequestId"
        assert body["LogicalResourceId"] == "fakeLogicalResourceId"
        assert body["NoEcho"] == False
        assert body["Data"] == {}


@pytest.mark.parametrize("requestType", ["Create"])
def test_when_sha256_fails(lambda_event, mock_lambda_context, requestType):
    with mock.patch("operations.gen_domain_prefix.hashlib.sha256") as domain_prefix_mock:
        domain_prefix_mock.side_effect = Exception("Fake error for testing")
        lambda_event["RequestType"] = requestType

        with mock.patch("cfn_response.http") as mocked_PoolManager:
            execute(lambda_event, mock_lambda_context)

            mocked_PoolManager.request.assert_called_once_with(
                method="PUT",
                url="https://fakeurl/doesnotexist",
                headers={"content-type": "", "content-length": "232"},
                body='{"Status": "FAILED", "Reason": "Fake error for testing", "PhysicalResourceId": "fake_logstream_name", "StackId": "fakeStackId", "RequestId": "fakeRequestId", "LogicalResourceId": "fakeLogicalResourceId", "NoEcho": false, "Data": {}}',
            )


@pytest.mark.parametrize("requestType", ["Create", "Update", "Delete"])
def test_when_operation_type_is_invalid(lambda_event, mock_lambda_context, requestType):
    lambda_event[RESOURCE_PROPERTIES][RESOURCE] = "FAKE_RESOURCE"
    lambda_event["RequestType"] = requestType
    with pytest.raises(ValueError):
        verify_env_setup(lambda_event)

    with mock.patch("cfn_response.http") as mocked_PoolManager:
        execute(lambda_event, mock_lambda_context)

        mocked_PoolManager.request.assert_called_once_with(
            method="PUT",
            url="https://fakeurl/doesnotexist",
            headers={"content-type": "", "content-length": "322"},
            body='{"Status": "FAILED", "Reason": "Operation type not available or did not match from the request. Expecting operation type to be GEN_DOMAIN_PREFIX", "PhysicalResourceId": "fake_logstream_name", "StackId": "fakeStackId", "RequestId": "fakeRequestId", "LogicalResourceId": "fakeLogicalResourceId", "NoEcho": false, "Data": {}}',
        )


@pytest.mark.parametrize("requestType", ["Create", "Update", "Delete"])
def test_lambda_handler(lambda_event, mock_lambda_context, requestType):
    lambda_event["RequestType"] = requestType

    with mock.patch("cfn_response.http") as mocked_PoolManager:
        handler(lambda_event, mock_lambda_context)
        mocked_PoolManager.request.assert_called_once()
