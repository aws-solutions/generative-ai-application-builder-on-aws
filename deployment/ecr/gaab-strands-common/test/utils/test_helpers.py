# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

"""
Tests for helper functions
"""

import logging
import time
from unittest.mock import Mock, patch

import pytest
from gaab_strands_common.utils.constants import RETRY_CONFIG
from gaab_strands_common.utils.helpers import (
    extract_user_message,
    get_file_category_from_extension,
    is_supported_file_type,
    retry_with_backoff,
)


class TestGetFileCategoryFromExtension:
    """Tests for get_file_category_from_extension function"""

    def test_image_extensions(self):
        """Test that image extensions return 'image' category"""
        image_extensions = ["png", "jpeg", "gif", "webp"]
        for ext in image_extensions:
            assert get_file_category_from_extension(ext) == "image"
            # Test case insensitivity
            assert get_file_category_from_extension(ext.upper()) == "image"

    def test_document_extensions(self):
        """Test that document extensions return 'document' category"""
        document_extensions = ["pdf", "csv", "doc", "docx", "xls", "xlsx", "html", "txt", "md"]
        for ext in document_extensions:
            assert get_file_category_from_extension(ext) == "document"
            # Test case insensitivity
            assert get_file_category_from_extension(ext.upper()) == "document"

    def test_unknown_extension(self):
        """Test that unknown extensions return 'unknown' category"""
        assert get_file_category_from_extension("unknown") == "unknown"
        assert get_file_category_from_extension("exe") == "unknown"
        assert get_file_category_from_extension("") == "unknown"


class TestIsSupportedFileType:
    """Tests for is_supported_file_type function"""

    def test_supported_image_extensions(self):
        """Test that supported image extensions return True"""
        supported_images = ["png", "jpeg", "gif", "webp"]
        for ext in supported_images:
            assert is_supported_file_type(ext) is True
            # Test case insensitivity
            assert is_supported_file_type(ext.upper()) is True

    def test_supported_document_extensions(self):
        """Test that supported document extensions return True"""
        supported_documents = ["pdf", "csv", "doc", "docx", "xls", "xlsx", "html", "txt", "md"]
        for ext in supported_documents:
            assert is_supported_file_type(ext) is True
            # Test case insensitivity
            assert is_supported_file_type(ext.upper()) is True

    def test_unsupported_extensions(self):
        """Test that unsupported extensions return False"""
        unsupported_extensions = ["exe", "dmg", "zip", "rar", "unknown"]
        for ext in unsupported_extensions:
            assert is_supported_file_type(ext) is False
            # Test case insensitivity
            assert is_supported_file_type(ext.upper()) is False

    def test_empty_extension(self):
        """Test that empty extension returns False"""
        assert is_supported_file_type("") is False


class TestExtractUserMessage:
    """Tests for extract_user_message function"""

    def test_valid_message(self):
        """Test extracting valid message from payload"""
        payload = {"input": "Hello, world!"}
        assert extract_user_message(payload) == "Hello, world!"

    def test_valid_message_with_whitespace(self):
        """Test extracting message with leading/trailing whitespace"""
        payload = {"input": "  Hello, world!  "}
        assert extract_user_message(payload) == "Hello, world!"

    def test_numeric_input(self):
        """Test extracting numeric input"""
        payload = {"input": 123}
        assert extract_user_message(payload) == "123"

    def test_invalid_payload_type(self):
        """Test that non-dict payload raises ValueError"""
        with pytest.raises(ValueError, match="Payload must be a dictionary"):
            extract_user_message("invalid-payload")

        with pytest.raises(ValueError, match="Payload must be a dictionary"):
            extract_user_message(None)

        with pytest.raises(ValueError, match="Payload must be a dictionary"):
            extract_user_message([])

    def test_missing_input_field(self):
        """Test that missing input field returns error message"""
        payload = {"other_field": "value"}
        result = extract_user_message(payload)
        assert "Please provide your message in the 'input' field" in result

    def test_none_input(self):
        """Test that None input returns error message"""
        payload = {"input": None}
        result = extract_user_message(payload)
        assert "Please provide your message in the 'input' field" in result

    def test_empty_string_input(self):
        """Test that empty string input returns error message"""
        payload = {"input": ""}
        result = extract_user_message(payload)
        assert "Please provide your message in the 'input' field" in result

    def test_whitespace_only_input(self):
        """Test that whitespace-only input returns error message"""
        payload = {"input": "   "}
        result = extract_user_message(payload)
        assert "Please provide your message in the 'input' field" in result


class TestRetryWithBackoff:
    """Tests for retry_with_backoff function"""

    def test_successful_function_call_no_retries(self):
        """Test that successful function call returns immediately without retries"""
        mock_func = Mock(return_value="success")
        result = retry_with_backoff(mock_func)
        assert result == "success"
        mock_func.assert_called_once()

    @patch("time.sleep")
    def test_retry_on_exception(self, mock_sleep):
        """Test that function retries on exception"""
        mock_func = Mock(side_effect=[Exception("fail"), Exception("fail"), "success"])
        result = retry_with_backoff(mock_func, exception_types=(Exception,))
        assert result == "success"
        assert mock_func.call_count == 3
        assert mock_sleep.call_count == 2  # Two retries means two sleeps

    @patch("time.sleep")
    def test_max_retries_exceeded(self, mock_sleep):
        """Test that function raises exception when max retries exceeded"""
        mock_func = Mock(side_effect=Exception("fail"))
        with pytest.raises(Exception, match="fail"):
            retry_with_backoff(mock_func, max_retries=2, exception_types=(Exception,))
        assert mock_func.call_count == 3  # Initial call + 2 retries
        assert mock_sleep.call_count == 2

    @patch("time.sleep")
    def test_retry_condition_met(self, mock_sleep):
        """Test that function retries when retry condition is met"""
        mock_func = Mock(side_effect=["retry", "retry", "success"])
        retry_condition = lambda result: result == "retry"
        result = retry_with_backoff(mock_func, retry_condition=retry_condition)
        assert result == "success"
        assert mock_func.call_count == 3
        assert mock_sleep.call_count == 2

    @patch("time.sleep")
    def test_retry_condition_not_met(self, mock_sleep):
        """Test that function doesn't retry when retry condition is not met"""
        mock_func = Mock(return_value="success")
        retry_condition = lambda result: result == "retry"
        result = retry_with_backoff(mock_func, retry_condition=retry_condition)
        assert result == "success"
        mock_func.assert_called_once()
        mock_sleep.assert_not_called()

    @patch("time.sleep")
    def test_retry_condition_still_met_after_max_retries(self, mock_sleep):
        """Test that function returns last result when retry condition still met after max retries"""
        mock_func = Mock(return_value="retry")
        retry_condition = lambda result: result == "retry"
        with patch("logging.Logger.warning") as mock_warning:
            result = retry_with_backoff(mock_func, retry_condition=retry_condition, max_retries=2)
            assert result == "retry"
            assert mock_func.call_count == 3  # Initial call + 2 retries
            assert mock_sleep.call_count == 2
            mock_warning.assert_called_once()

    def test_default_parameters_from_config(self):
        """Test that function uses default parameters from RETRY_CONFIG"""
        mock_func = Mock(return_value="success")
        with patch(
            "gaab_strands_common.utils.helpers.RETRY_CONFIG",
            {"max_retries": 1, "initial_delay_ms": 100, "max_delay": 1.0, "back_off_rate": 2},
        ):
            result = retry_with_backoff(mock_func)
            assert result == "success"
            mock_func.assert_called_once()

    @patch("time.sleep")
    def test_custom_parameters(self, mock_sleep):
        """Test that function uses custom parameters"""
        mock_func = Mock(side_effect=[Exception("fail"), "success"])
        result = retry_with_backoff(
            mock_func, max_retries=1, base_delay=0.1, max_delay=1.0, exception_types=(Exception,)
        )
        assert result == "success"
        assert mock_func.call_count == 2
        mock_sleep.assert_called_once_with(0.1)

    @patch("logging.Logger.info")
    @patch("time.sleep")
    def test_logging_on_retry_success(self, mock_sleep, mock_info):
        """Test that function logs success after retries"""
        mock_func = Mock(side_effect=[Exception("fail"), "success"])
        result = retry_with_backoff(mock_func, exception_types=(Exception,))
        assert result == "success"
        assert mock_info.call_count == 1  # One log for success after retry
        mock_sleep.assert_called_once()

    @patch("logging.Logger.error")
    @patch("time.sleep")
    def test_logging_on_max_retries_exceeded(self, mock_sleep, mock_error):
        """Test that function logs error when max retries exceeded"""
        mock_func = Mock(side_effect=Exception("fail"))
        with pytest.raises(Exception, match="fail"):
            retry_with_backoff(mock_func, max_retries=1, exception_types=(Exception,))
        mock_error.assert_called_once()
        assert mock_sleep.call_count == 1
