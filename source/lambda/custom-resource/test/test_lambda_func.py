#!/usr/bin/env python
# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0


import os

import mock
import pytest
from lambda_func import UnSupportedOperationTypeException, get_function_for_resource, handler
from operations import operation_types
from operations.operation_types import RESOURCE, RESOURCE_PROPERTIES
from test.fixtures.copy_web_ui_events import web_ui_copy_setup, lambda_event, SAMPLE_JSON_VALUE

@pytest.fixture
def patch_powertools():
    os.environ["UNIT_TEST_ENV"] = "yes"
    os.environ["POWERTOOLS_TRACE_DISABLED"] = "1"
    os.environ["STACK_NAME"] = "fake_stack_name"


@pytest.mark.parametrize("resource", [operation_types.COPY_WEB_UI, operation_types.UPDATE_LLM_CONFIG, "NOT_SUPPORTED_OPERATION"])
def test_get_function_for_operation(resource):
    if resource == "NOT_SUPPORTED_OPERATION":
        with pytest.raises(UnSupportedOperationTypeException):
            get_function_for_resource(resource)
    else:
        assert callable(get_function_for_resource(resource)) is True


@pytest.mark.parametrize("requestType", ["Create", "Update", "Delete"])
@mock.patch("cfn_response.http")
def test_handler_for_success(s3, web_ui_copy_setup, mock_lambda_context, requestType):
    event_obj, s3, _ = web_ui_copy_setup
    event_obj["RequestType"] = requestType
    assert None == handler(event_obj, mock_lambda_context)


@pytest.mark.parametrize("requestType", ["Create", "Update", "Delete"])
@mock.patch.dict(
    os.environ,
    {
        "UNIT_TEST_ENV": "yes",
        "POWERTOOLS_TRACE_DISABLED": "1",
        "STACK_NAME": "fake_stack_name",
    },
)
@mock.patch("cfn_response.http")
def test_handler_for_error(s3, web_ui_copy_setup, mock_lambda_context, patch_powertools, requestType):
    event_obj, s3, _ = web_ui_copy_setup

    from _pytest.monkeypatch import MonkeyPatch

    mpatch = MonkeyPatch()
    mpatch.setitem(event_obj, "RequestType", requestType)
    mpatch.setitem(event_obj[RESOURCE_PROPERTIES], RESOURCE, "NOT_A_VALID_OPERATION")
    with pytest.raises(Exception):
        assert None == handler(event_obj, mock_lambda_context)
