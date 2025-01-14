#!/usr/bin/env python
# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

from test.fixtures.get_compatible_azs_events import describe_vpc_endpoint_services_response

import mock
import pytest
from botocore.exceptions import ClientError
from operations.get_compatible_azs import (
    REQUIRED_SERVICE_NAMES,
    execute,
    find_common_azs,
    get_compatible_azs,
    verify_env_setup,
)
from operations.operation_types import RESOURCE, RESOURCE_PROPERTIES
from test.fixtures.get_compatible_azs_events import get_compatible_azs_event, describe_vpc_endpoint_services_response


def test_verify_env_setup_success(get_compatible_azs_event):
    assert None == verify_env_setup(get_compatible_azs_event)


def test_env_setup_fails_no_azs(monkeypatch, get_compatible_azs_event):
    with pytest.raises(ValueError):
        monkeypatch.delitem(get_compatible_azs_event[RESOURCE_PROPERTIES], REQUIRED_SERVICE_NAMES)
        verify_env_setup(get_compatible_azs_event)


def test_env_setup_fails_bad_operation(monkeypatch, get_compatible_azs_event):
    with pytest.raises(ValueError):
        monkeypatch.setitem(get_compatible_azs_event[RESOURCE_PROPERTIES], RESOURCE, "NOT_A_VALID_OPERATION")
        verify_env_setup(get_compatible_azs_event)


@pytest.mark.parametrize("requestType", ["Create", "Update"])
def test_execute_create_and_update(ec2_stubber, get_compatible_azs_event, mock_lambda_context, requestType):
    ec2_stubber.add_response("describe_vpc_endpoint_services", describe_vpc_endpoint_services_response)
    with ec2_stubber:
        get_compatible_azs_event["RequestType"] = requestType
        with mock.patch("cfn_response.http") as mocked_PoolManager:
            mocked_PoolManager.return_value = {"status": 200}
            assert None == execute(get_compatible_azs_event, mock_lambda_context)
            mocked_PoolManager.request.assert_called_once_with(
                method="PUT",
                url="https://fakeurl/doesnotexist",
                headers={"content-type": "", "content-length": "312"},
                body='{"Status": "SUCCESS", "Reason": "See the details in CloudWatch Log Stream: fake_logstream_name", "PhysicalResourceId": "fake_logstream_name", "StackId": "fakeStackId", "RequestId": "fakeRequestId", "LogicalResourceId": "fakeLogicalResourceId", "NoEcho": false, "Data": {"CompatibleAZs": "us-east-1a,us-east-1c"}}',
            )


def test_execute_delete(get_compatible_azs_event, mock_lambda_context):
    get_compatible_azs_event["RequestType"] = "Delete"
    with mock.patch("cfn_response.http") as mocked_PoolManager:
        mocked_PoolManager.return_value = {"status": 200}
        assert None == execute(get_compatible_azs_event, mock_lambda_context)
        mocked_PoolManager.request.assert_called_once_with(
            method="PUT",
            url="https://fakeurl/doesnotexist",
            headers={"content-type": "", "content-length": "272"},
            body='{"Status": "SUCCESS", "Reason": "See the details in CloudWatch Log Stream: fake_logstream_name", "PhysicalResourceId": "fake_logstream_name", "StackId": "fakeStackId", "RequestId": "fakeRequestId", "LogicalResourceId": "fakeLogicalResourceId", "NoEcho": false, "Data": {}}',
        )


@pytest.mark.parametrize("requestType", ["Create", "Update"])
def test_execute_create_and_update_failures(
    ec2_stubber, monkeypatch, get_compatible_azs_event, mock_lambda_context, requestType
):
    for _ in range(3):  # default is 3 retries
        ec2_stubber.add_client_error(
            "describe_vpc_endpoint_services",
            service_error_code="InvalidServiceName",
            service_message="The Vpc Endpoint Service 'fake-service' does not exist",
        )

    with ec2_stubber:
        get_compatible_azs_event["RequestType"] = requestType
        monkeypatch.setitem(get_compatible_azs_event[RESOURCE_PROPERTIES], REQUIRED_SERVICE_NAMES, "fake-service")
        with mock.patch("cfn_response.http") as mocked_PoolManager:
            mocked_PoolManager.return_value = {"status": 200}
            assert None == execute(get_compatible_azs_event, mock_lambda_context)
            mocked_PoolManager.request.assert_called_once_with(
                method="PUT",
                url="https://fakeurl/doesnotexist",
                headers={"content-type": "", "content-length": "359"},
                body='{"Status": "FAILED", "Reason": "An error occurred (InvalidServiceName) when calling the DescribeVpcEndpointServices operation: The Vpc Endpoint Service \'fake-service\' does not exist", "PhysicalResourceId": "fake_logstream_name", "StackId": "fakeStackId", "RequestId": "fakeRequestId", "LogicalResourceId": "fakeLogicalResourceId", "NoEcho": false, "Data": {}}',
            )


def test_get_compatible_azs_success(ec2_stubber):
    ec2_stubber.add_response("describe_vpc_endpoint_services", describe_vpc_endpoint_services_response)
    with ec2_stubber:
        required_service_names = [
            "com.amazonaws.us-east-1.bedrock-agent-runtime",
            "com.amazonaws.us-east-1.bedrock-runtime",
        ]
        compatible_azs = get_compatible_azs(required_service_names, 3)

        assert compatible_azs == ["us-east-1a", "us-east-1c", "us-east-1d"]


def test_get_compatible_azs_fails(ec2_stubber):
    for _ in range(2):  # 2 retries
        ec2_stubber.add_client_error(
            "describe_vpc_endpoint_services",
            service_error_code="InvalidServiceName",
            service_message="The Vpc Endpoint Service 'fake-service' does not exist",
        )
    with ec2_stubber:
        required_service_names = [
            "com.amazonaws.us-east-1.s3",
            "com.amazonaws.us-east-1.dynamodb",
            "com.amazonaws.us-east-1.fake-service",
        ]
        with pytest.raises(ClientError):
            get_compatible_azs(required_service_names, 3, 2, 1)


@pytest.mark.parametrize(
    "service_details,expected",
    [
        (
            [
                {
                    "ServiceName": "testService1",
                    "AvailabilityZones": [
                        "us-east-1a",
                        "us-east-1b",
                        "us-east-1c",
                        "us-east-1d",
                        "us-east-1e",
                        "us-east-1f",
                    ],
                },
                {
                    "ServiceName": "testService2",
                    "AvailabilityZones": [
                        "us-east-1a",
                        "us-east-1b",
                        "us-east-1c",
                    ],
                },
            ],
            ["us-east-1a", "us-east-1b", "us-east-1c"],
        ),
        (
            [
                {
                    "ServiceName": "testService1",
                    "AvailabilityZones": [
                        "us-east-1a",
                        "us-east-1b",
                        "us-east-1c",
                        "us-east-1d",
                        "us-east-1e",
                        "us-east-1f",
                    ],
                },
                {
                    "ServiceName": "testService2",
                    "AvailabilityZones": [
                        "us-east-1a",
                        "us-east-1b",
                        "us-east-1c",
                    ],
                },
                {
                    "ServiceName": "testService2",
                    "AvailabilityZones": [
                        "us-east-1b",
                    ],
                },
            ],
            ["us-east-1b"],
        ),
        (
            [
                {
                    "ServiceName": "testService1",
                    "AvailabilityZones": [
                        "us-east-1a",
                    ],
                },
                {
                    "ServiceName": "testService2",
                    "AvailabilityZones": [
                        "us-east-1a",
                        "us-east-1b",
                        "us-east-1c",
                    ],
                },
                {
                    "ServiceName": "testService2",
                    "AvailabilityZones": [
                        "us-east-1b",
                    ],
                },
            ],
            [],
        ),
    ],
)
def test_find_common_azs(service_details, expected):
    assert expected == find_common_azs(service_details)
