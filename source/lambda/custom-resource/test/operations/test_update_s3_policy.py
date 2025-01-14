#!/usr/bin/env python
# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0


import json
from test.fixtures.update_s3_policy_events import (
    lambda_event,
    s3_stub,
    s3_stub_existing_non_matching_policy,
    s3_stub_existing_policy,
    s3_stub_existing_policy_for_different_prefix,
    s3_stub_success,
)

import mock
import pytest
from operations.operation_types import (
    LOGGING_BUCKET_NAME,
    RESOURCE,
    RESOURCE_PROPERTIES,
    SOURCE_BUCKET_NAME,
    UPDATE_BUCKET_POLICY,
)
from operations.update_s3_policy import POLICY_SID, create, execute, verify_env_setup


@pytest.mark.parametrize("requestType", ["Create", "Update"])
def test_execute_success(s3_stub_success, lambda_event, mock_lambda_context, requestType):
    lambda_event["RequestType"] = requestType
    s3_stub_success.activate()
    with mock.patch("cfn_response.http") as mocked_PoolManager:
        execute(lambda_event, mock_lambda_context)
    s3_stub_success.deactivate()


@pytest.mark.parametrize("requestType", ["Create", "Update"])
def test_execute_with_non_matching_policy(
    s3_stub_existing_non_matching_policy, lambda_event, mock_lambda_context, requestType
):
    lambda_event["RequestType"] = requestType
    s3_stub_existing_non_matching_policy.activate()
    with mock.patch("cfn_response.http") as mocked_PoolManager:
        execute(lambda_event, mock_lambda_context)
    s3_stub_existing_non_matching_policy.deactivate()


@pytest.mark.parametrize("requestType", ["Create", "Update"])
def test_execute_with_matching_policy(s3_stub_existing_policy, lambda_event, mock_lambda_context, requestType):
    lambda_event["RequestType"] = requestType
    s3_stub_existing_policy.activate()
    with mock.patch("cfn_response.http") as mocked_PoolManager:
        execute(lambda_event, mock_lambda_context)
    s3_stub_existing_policy.deactivate()


@pytest.mark.parametrize("requestType", ["Create", "Update"])
def test_execute_with_policy_for_different_prefix(
    s3_stub_existing_policy_for_different_prefix, lambda_event, mock_lambda_context, requestType
):
    lambda_event["RequestType"] = requestType
    s3_stub_existing_policy_for_different_prefix.activate()
    with mock.patch("cfn_response.http") as mocked_PoolManager:
        execute(lambda_event, mock_lambda_context)
    s3_stub_existing_policy_for_different_prefix.deactivate()


@pytest.mark.parametrize("requestType", ["Delete"])
def test_execute_delete(lambda_event, mock_lambda_context, requestType):
    lambda_event["RequestType"] = requestType
    with mock.patch("cfn_response.http") as mocked_PoolManager:
        execute(lambda_event, mock_lambda_context)


def test_verify_env_setup_success(lambda_event):
    verify_env_setup(lambda_event)


def test_verify_env_setup_failure(lambda_event, monkeypatch):
    monkeypatch.delitem(lambda_event[RESOURCE_PROPERTIES], SOURCE_BUCKET_NAME)
    with pytest.raises(ValueError):
        verify_env_setup(lambda_event)

    with mock.patch("cfn_response.http") as mocked_PoolManager:
        with pytest.raises(Exception):
            execute(event, context)

    monkeypatch.undo()
    monkeypatch.delitem(lambda_event[RESOURCE_PROPERTIES], RESOURCE)
    with pytest.raises(KeyError):
        verify_env_setup(lambda_event)

    with mock.patch("cfn_response.http") as mocked_PoolManager:
        with pytest.raises(Exception):
            execute(event, context)

    monkeypatch.undo()
    monkeypatch.setitem(lambda_event[RESOURCE_PROPERTIES], RESOURCE, "fakeoperation")
    with pytest.raises(ValueError):
        verify_env_setup(lambda_event)

    with mock.patch("cfn_response.http") as mocked_PoolManager:
        with pytest.raises(Exception):
            execute(event, context)


def test_create_success(s3_stub_success, lambda_event, mock_lambda_context):
    lambda_event["RequestType"] = "Create"

    s3_stub_success.activate()
    with mock.patch("cfn_response.http") as mocked_PoolManager:
        create(lambda_event, mock_lambda_context)
    s3_stub_success.deactivate()
