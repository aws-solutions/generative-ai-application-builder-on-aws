# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

"""
Tests for MultimodalRequestProcessor class
"""

from unittest.mock import Mock, patch

import pytest
from gaab_strands_common.models import UseCaseConfig
from gaab_strands_common.multimodal.multimodal_processor import MultimodalRequestProcessor


@pytest.fixture
def multimodal_processor():
    """Create a MultimodalRequestProcessor instance for testing"""
    return MultimodalRequestProcessor("us-east-1")


def test_init_success():
    """Test successful initialization"""
    processor = MultimodalRequestProcessor("us-west-2")

    assert processor.region == "us-west-2"


def test_process_multimodal_request_with_files(multimodal_processor):
    """Test process_multimodal_request with files"""
    payload = {"input": "Analyze this document", "files": [{"fileReference": "file-ref-1", "fileName": "document.pdf"}]}

    # Mock the FileHandler.validate_all_files method to return content blocks
    mock_content_blocks = [{"text": "File available: document.pdf at s3://test-bucket/test-key"}]

    with patch("gaab_strands_common.multimodal.multimodal_processor.FileHandler") as mock_file_handler_class:
        mock_file_handler_instance = Mock()
        mock_file_handler_instance.validate_all_files.return_value = mock_content_blocks
        mock_file_handler_class.return_value = mock_file_handler_instance

        result = multimodal_processor.process_multimodal_request(payload)

        # Should return content blocks
        assert isinstance(result, list)
        assert len(result) == 2  # User message + file content block

        assert result[0]["text"] == "Analyze this document"  # User query comes first
        assert "File available" in result[1]["text"]  # File content block comes second


def test_process_multimodal_request_no_valid_files(multimodal_processor):
    """Test process_multimodal_request when no valid files are found"""
    payload = {"input": "Analyze this document", "files": [{"fileReference": "file-ref-1", "fileName": "document.pdf"}]}

    # Mock the FileHandler.validate_all_files method to return empty list
    with patch("gaab_strands_common.multimodal.multimodal_processor.FileHandler") as mock_file_handler_class:
        mock_file_handler_instance = Mock()
        mock_file_handler_instance.validate_all_files.return_value = []
        mock_file_handler_class.return_value = mock_file_handler_instance

        # Should raise ValueError
        with pytest.raises(ValueError, match="No files were provided"):
            multimodal_processor.process_multimodal_request(payload)


def test_process_multimodal_request_file_handler_exception(multimodal_processor):
    """Test process_multimodal_request when FileHandler throws an exception"""
    payload = {"input": "Analyze this document", "files": [{"fileReference": "file-ref-1", "fileName": "document.pdf"}]}

    # Mock the FileHandler to throw an exception
    with patch("gaab_strands_common.multimodal.multimodal_processor.FileHandler") as mock_file_handler_class:
        mock_file_handler_class.side_effect = Exception("Test exception")

        # Should re-raise the exception
        with pytest.raises(Exception, match="Test exception"):
            multimodal_processor.process_multimodal_request(payload)


def test_process_multimodal_request_no_files(multimodal_processor):
    """Test process_multimodal_request with no files"""
    payload = {"input": "Hello, how are you?", "files": []}

    # Mock the FileHandler.validate_all_files method
    with patch("gaab_strands_common.multimodal.multimodal_processor.FileHandler") as mock_file_handler_class:
        mock_file_handler_instance = Mock()
        mock_file_handler_instance.validate_all_files.return_value = []
        mock_file_handler_class.return_value = mock_file_handler_instance

        # Should raise ValueError when no valid files
        with pytest.raises(ValueError, match="No files were provided"):
            multimodal_processor.process_multimodal_request(payload)


def test_is_multimodal_enabled_true():
    """Test is_multimodal_enabled when multimodal is enabled"""
    config_dict = {
        "UseCaseName": "TestUseCase",
        "UseCaseType": "Agent",
        "LlmParams": {
            "ModelProvider": "Bedrock",
            "Temperature": 0.7,
            "Streaming": True,
            "Verbose": False,
            "BedrockLlmParams": {
                "ModelId": "amazon.nova-pro-v1:0",
                "BedrockInferenceType": "QUICK_START",
            },
            "ModelParams": {},
            "MultimodalParams": {"MultimodalEnabled": True},
        },
    }

    config = UseCaseConfig(**config_dict)
    processor = MultimodalRequestProcessor("us-east-1")

    result = processor.is_multimodal_enabled(config)

    assert result is True


def test_is_multimodal_enabled_false():
    """Test is_multimodal_enabled when multimodal is disabled"""
    config_dict = {
        "UseCaseName": "TestUseCase",
        "UseCaseType": "Agent",
        "LlmParams": {
            "ModelProvider": "Bedrock",
            "Temperature": 0.7,
            "Streaming": True,
            "Verbose": False,
            "BedrockLlmParams": {
                "ModelId": "amazon.nova-pro-v1:0",
                "BedrockInferenceType": "QUICK_START",
            },
            "ModelParams": {},
            "MultimodalParams": {"MultimodalEnabled": False},
        },
    }

    config = UseCaseConfig(**config_dict)
    processor = MultimodalRequestProcessor("us-east-1")

    result = processor.is_multimodal_enabled(config)

    assert result is False


def test_is_multimodal_enabled_missing_config():
    """Test is_multimodal_enabled when multimodal config is missing"""
    config_dict = {
        "UseCaseName": "TestUseCase",
        "UseCaseType": "Agent",
        "LlmParams": {
            "ModelProvider": "Bedrock",
            "Temperature": 0.7,
            "Streaming": True,
            "Verbose": False,
            "BedrockLlmParams": {
                "ModelId": "amazon.nova-pro-v1:0",
                "BedrockInferenceType": "QUICK_START",
            },
            "ModelParams": {},
            # No MultimodalParams
        },
    }

    config = UseCaseConfig(**config_dict)
    processor = MultimodalRequestProcessor("us-east-1")

    result = processor.is_multimodal_enabled(config)

    assert result is False


def test_has_files_true():
    """Test has_files when files are present"""
    payload = {"files": [{"fileReference": "file-ref-1", "fileName": "document.pdf"}]}

    processor = MultimodalRequestProcessor("us-east-1")
    result = processor.has_files(payload)

    assert result is True


def test_has_files_false():
    """Test has_files when no files are present"""
    payload = {"files": []}

    processor = MultimodalRequestProcessor("us-east-1")
    result = processor.has_files(payload)

    assert result is False


def test_has_files_missing_key():
    """Test has_files when files key is missing"""
    payload = {
        "input": "Hello"
        # No files key
    }

    processor = MultimodalRequestProcessor("us-east-1")
    result = processor.has_files(payload)

    assert result is False


def test_has_files_not_list():
    """Test has_files when files is not a list"""
    payload = {"files": "not-a-list"}

    processor = MultimodalRequestProcessor("us-east-1")
    result = processor.has_files(payload)

    assert result is False
