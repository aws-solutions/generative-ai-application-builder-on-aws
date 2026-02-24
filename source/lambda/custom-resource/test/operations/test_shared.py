#!/usr/bin/env python
# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

import time
import zipfile
from test.fixtures.copy_web_ui_events import lambda_event, web_ui_copy_setup
from unittest.mock import Mock, patch

import botocore
import pytest
from botocore.exceptions import ClientError
from operations.operation_types import RESOURCE_PROPERTIES, SOURCE_BUCKET_NAME, SOURCE_PREFIX
from operations.shared import MAX_RETRIES, RETRY_DELAY_BASE, TRANSIENT_ERROR_CODES, IAM_PROPAGATION_ERROR_CODES, get_zip_archive, retry_with_backoff


def test_get_zip_archive(web_ui_copy_setup):
    lambda_event, s3_resource, _ = web_ui_copy_setup

    source_bucket_name = lambda_event[RESOURCE_PROPERTIES][SOURCE_BUCKET_NAME]
    source_prefix = lambda_event[RESOURCE_PROPERTIES][SOURCE_PREFIX]

    archive = get_zip_archive(s3_resource, source_bucket_name, source_prefix)
    assert len(archive.filelist) > 0


def test_get_archive_errors_for_wrong_prefix(web_ui_copy_setup):
    lambda_event, s3_resource, _ = web_ui_copy_setup

    source_bucket_name = lambda_event[RESOURCE_PROPERTIES][SOURCE_BUCKET_NAME]
    source_prefix = "does_not_exist.zip"

    with pytest.raises(botocore.exceptions.ClientError):
        get_zip_archive(s3_resource, source_bucket_name, source_prefix)


def test_with_bad_zip_file(tmp_path, web_ui_copy_setup):
    lambda_event, s3_resource, _ = web_ui_copy_setup

    source_bucket_name = lambda_event[RESOURCE_PROPERTIES][SOURCE_BUCKET_NAME]
    source_prefix = lambda_event[RESOURCE_PROPERTIES][SOURCE_PREFIX]

    tmp_dir = tmp_path / "bad_zip"
    tmp_dir.mkdir()
    bad_zip_file = tmp_dir / "fake_bad_zip.zip"
    bad_zip_file.write_text("This is a fake bad zip file")
    assert len(list(tmp_path.iterdir())) == 1
    s3_resource.meta.client.upload_file(str(bad_zip_file), source_bucket_name, f"{source_prefix}")

    with pytest.raises(zipfile.error):
        get_zip_archive(s3_resource, source_bucket_name, source_prefix)


def test_retry_successful_function_call_on_first_attempt():
    """Test that a successful function call returns immediately without retries."""
    mock_func = Mock(return_value="success")

    result = retry_with_backoff(mock_func, "arg1", kwarg1="value1")

    assert result == "success"
    assert mock_func.call_count == 1
    mock_func.assert_called_with("arg1", kwarg1="value1")


def test_retry_successful_function_call_after_retries():
    """Test that function succeeds after some transient failures."""
    mock_func = Mock()
    # First two calls fail with transient error, third succeeds
    mock_func.side_effect = [
        ClientError({"Error": {"Code": "ThrottlingException", "Message": "Rate exceeded"}}, "TestOperation"),
        ClientError(
            {"Error": {"Code": "ServiceUnavailableException", "Message": "Service unavailable"}}, "TestOperation"
        ),
        "success",
    ]

    with patch("time.sleep") as mock_sleep:
        result = retry_with_backoff(mock_func)

    assert result == "success"
    assert mock_func.call_count == 3
    # Verify sleep was called with exponential backoff delays
    assert mock_sleep.call_count == 2
    mock_sleep.assert_any_call(RETRY_DELAY_BASE**0)  # 3^0 = 1 second (first retry)
    mock_sleep.assert_any_call(RETRY_DELAY_BASE**1)  # 3^1 = 3 seconds (second retry)


def test_retry_non_transient_error_raises_immediately():
    """Test that non-transient errors are raised immediately without retries."""
    mock_func = Mock()
    mock_func.side_effect = ClientError(
        {"Error": {"Code": "ResourceNotFoundException", "Message": "Resource not found"}}, "TestOperation"
    )

    with pytest.raises(ClientError) as exc_info:
        retry_with_backoff(mock_func)

    assert exc_info.value.response["Error"]["Code"] == "ResourceNotFoundException"
    assert mock_func.call_count == 1


def test_retry_max_retries_exceeded_for_transient_errors():
    """Test that transient errors are retried up to MAX_RETRIES times."""
    mock_func = Mock()
    # Always fail with transient error
    mock_func.side_effect = ClientError(
        {"Error": {"Code": "ThrottlingException", "Message": "Rate exceeded"}}, "TestOperation"
    )

    with patch("time.sleep"):
        with pytest.raises(ClientError) as exc_info:
            retry_with_backoff(mock_func)

    assert exc_info.value.response["Error"]["Code"] == "ThrottlingException"
    # Should be called MAX_RETRIES + 1 times (initial attempt + retries)
    assert mock_func.call_count == MAX_RETRIES + 1

def test_retry_all_transient_error_codes_are_retried():
    """Test that all error codes in TRANSIENT_ERROR_CODES are retried."""
    for error_code in TRANSIENT_ERROR_CODES:
        mock_func = Mock()
        mock_func.side_effect = [
            ClientError({"Error": {"Code": error_code, "Message": f"{error_code} occurred"}}, "TestOperation"),
            "success",
        ]

        with patch("time.sleep"):
            result = retry_with_backoff(mock_func)

        assert result == "success"
        assert mock_func.call_count == 2


def test_retry_non_client_error_exceptions_are_not_retried():
    """Test that non-ClientError exceptions are raised immediately."""
    mock_func = Mock()
    mock_func.side_effect = ValueError("Invalid value")

    with pytest.raises(ValueError) as exc_info:
        retry_with_backoff(mock_func)

    assert str(exc_info.value) == "Invalid value"
    assert mock_func.call_count == 1


def test_retry_function_arguments_are_passed_correctly():
    """Test that function arguments and kwargs are passed correctly on retries."""
    mock_func = Mock()
    mock_func.side_effect = [
        ClientError({"Error": {"Code": "ThrottlingException", "Message": "Rate exceeded"}}, "TestOperation"),
        "success",
    ]

    with patch("time.sleep"):
        result = retry_with_backoff(mock_func, "arg1", "arg2", kwarg1="value1", kwarg2="value2")

    assert result == "success"
    assert mock_func.call_count == 2
    # Verify both calls had the same arguments
    for call in mock_func.call_args_list:
        assert call == (("arg1", "arg2"), {"kwarg1": "value1", "kwarg2": "value2"})


def test_retry_iam_propagation_errors_are_retried():
    """Test that IAM propagation errors (AccessDeniedException, ValidationException) are retried with longer delays."""
    for error_code in IAM_PROPAGATION_ERROR_CODES:
        mock_func = Mock()
        mock_func.side_effect = [
            ClientError({"Error": {"Code": error_code, "Message": f"{error_code} occurred"}}, "TestOperation"),
            "success",
        ]

        with patch("time.sleep") as mock_sleep:
            result = retry_with_backoff(mock_func)

        assert result == "success"
        assert mock_func.call_count == 2
        # Verify longer IAM propagation delay (5 * base^0 = 5 seconds)
        mock_sleep.assert_called_once_with(min(30, 5 * (RETRY_DELAY_BASE**0)))
