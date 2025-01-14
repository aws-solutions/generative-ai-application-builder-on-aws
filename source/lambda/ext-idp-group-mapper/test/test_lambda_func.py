#!/usr/bin/env python
# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

from dataclasses import dataclass
from unittest.mock import MagicMock, patch

import pytest
from lambda_func import handler


@pytest.fixture
def lambda_context():
    """
    Mock AWS LambdaContext
    """

    @dataclass
    class LambdaContext:
        function_name: str = "fake-function"
        memory_limit_in_mb: int = 128
        invoked_function_arn: str = "arn:aws:lambda:us-east-1:fake-account-id:function:fake-function"
        aws_request_id: str = "fake-request-id"
        log_group_name: str = "test-log-group-name"
        log_stream_name: str = "test-log-stream"

        def get_remaining_time_in_millis(self):
            return 5000

    return LambdaContext()


@pytest.fixture
def mock_logger():
    with patch("aws_lambda_powertools.Logger") as mock_logger_cls:
        yield mock_logger_cls.return_value


def test_lambda_handler_with_single_group(lambda_context):
    event = {"request": {"userAttributes": {"idp_groups": "group1"}}, "response": {}}
    expected_response = {"claimsAndScopeOverrideDetails": {"groupOverrideDetails": {"groupsToOverride": ["group1"]}}}

    with patch("lambda_func.read_group_mapping") as mock_read_group_mapping:
        mock_read_group_mapping.return_value = {"group1": ["group1"]}
        response = handler(event, lambda_context)

    assert response["response"] == expected_response


def test_lambda_handler_with_multiple_groups(lambda_context):
    event = {"request": {"userAttributes": {"idp_groups": "group1, group2, group3"}}, "response": {}}
    expected_response = {
        "claimsAndScopeOverrideDetails": {"groupOverrideDetails": {"groupsToOverride": ["group1", "group2", "group3"]}}
    }

    with patch("lambda_func.read_group_mapping") as mock_read_group_mapping:
        mock_read_group_mapping.return_value = {"group1": ["group1"], "group2": ["group2"], "group3": ["group3"]}
        response = handler(event, lambda_context)

    assert response["response"] == expected_response


def test_lambda_handler_with_mapped_groups(lambda_context):
    event = {"request": {"userAttributes": {"idp_groups": "group1, group2"}}, "response": {}}
    expected_response = {
        "claimsAndScopeOverrideDetails": {
            "groupOverrideDetails": {"groupsToOverride": ["mapped_group1", "mapped_group2"]}
        }
    }

    with patch("lambda_func.read_group_mapping") as mock_read_group_mapping:
        mock_read_group_mapping.return_value = {"group1": ["mapped_group1"], "group2": ["mapped_group2"]}
        response = handler(event, lambda_context)

    assert response["response"] == expected_response


def test_lambda_handler_with_empty_groups(lambda_context):
    event = {"request": {"userAttributes": {"idp_groups": ""}}, "response": {}}

    with patch("lambda_func.read_group_mapping") as mock_read_group_mapping:
        mock_read_group_mapping.return_value = {}
        response = handler(event, lambda_context)

    assert response == event


def test_lambda_handler_with_missing_idp_groups(lambda_context):
    event = {"request": {"userAttributes": {}}, "response": {}}

    with patch("lambda_func.read_group_mapping") as mock_read_group_mapping:
        mock_read_group_mapping.return_value = {}
        response = handler(event, lambda_context)

    assert response == event


def test_lambda_handler_with_invalid_group_mapping_file(mock_logger, lambda_context):
    event = {"request": {"userAttributes": {"idp_groups": "group1, group2"}}, "response": {}}

    with patch("lambda_func.read_group_mapping") as mock_read_group_mapping:
        mock_read_group_mapping.return_value = {}
        response = handler(event, lambda_context)

    assert response == event
