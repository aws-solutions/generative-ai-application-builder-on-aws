# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0
import os
from unittest.mock import Mock, patch

import boto3
import pytest
from botocore.exceptions import ClientError
from gaab_strands_common.custom_tools.s3_file_reader import S3FileReaderTool
from moto import mock_aws


@pytest.fixture(autouse=True)
def setup_environment(mock_environment):
    """Setup environment variables for all tests"""
    with patch.dict(
        os.environ,
        {
            "MULTIMODAL_DATA_BUCKET": "test-bucket",
            "MULTIMODAL_METADATA_TABLE_NAME": "test-table",
            "USE_CASE_UUID": "test-use-case-uuid",
        },
        clear=False,
    ):
        yield


@pytest.fixture
def sample_config():
    """Sample configuration for testing"""
    return {"LlmParams": {"MultimodalParams": {"MultimodalEnabled": True}}}


@pytest.fixture
def tool(sample_config):
    """Create S3FileReaderTool instance for testing"""
    return S3FileReaderTool(sample_config, "us-east-1")


def test_successful_initialization(tool):
    """Test successful initialization with all required environment variables"""
    assert tool.bucket_name == "test-bucket"
    assert tool.metadata_table_name == "test-table"
    assert tool.use_case_uuid == "test-use-case-uuid"
    assert tool.region == "us-east-1"
    assert tool.s3_client is not None


def test_initialization_missing_env_vars(sample_config):
    """Test initialization fails with missing environment variables"""
    with patch.dict(os.environ, {}, clear=True):
        with pytest.raises(ValueError, match="Missing required environment variables"):
            S3FileReaderTool(sample_config, "us-east-1")


def test_get_file_extension(tool):
    """Test file extension extraction from S3 keys"""
    # Standard cases
    assert tool.get_file_extension("document.pdf") == "pdf"
    assert tool.get_file_extension("data.csv") == "csv"

    # Complex paths
    assert tool.get_file_extension("folder/subfolder/file.txt") == "txt"
    assert tool.get_file_extension("file.with.dots.xlsx") == "xlsx"

    # Edge cases
    assert tool.get_file_extension("no_extension") == "unsupported"
    assert tool.get_file_extension("") == "unsupported"


def test_determine_file_type(tool):
    """Test file type determination based on extension"""
    assert tool.determine_file_type("png") == "image"
    assert tool.determine_file_type("jpg") == "image"
    assert tool.determine_file_type("gif") == "image"
    assert tool.determine_file_type("webp") == "image"

    # Document formats
    assert tool.determine_file_type("pdf") == "document"
    assert tool.determine_file_type("txt") == "document"
    assert tool.determine_file_type("md") == "document"
    assert tool.determine_file_type("csv") == "document"
    assert tool.determine_file_type("docx") == "document"

    # Unsupported format
    with pytest.raises(ValueError, match="Unsupported file type"):
        tool.determine_file_type("exe")


@mock_aws
def test_image_processing_png(tool):
    """Test successful PNG image processing"""
    filename = "11111111-11111111-11111111-11111111-111111111111.png"
    s3 = boto3.client("s3", region_name="us-east-1")
    s3.create_bucket(Bucket="test-bucket")

    test_content = b"fake png image content"
    s3.put_object(Bucket="test-bucket", Key=filename, Body=test_content)

    # Replace tool's S3 client with mocked one
    tool.s3_client = s3

    tool_use = {"toolUseId": "test-png", "input": {"s3_key": filename}}
    result = tool.s3_file_reader(tool_use)

    # Verify ToolResult structure
    assert result["toolUseId"] == "test-png"
    assert result["status"] == "success"
    assert len(result["content"]) == 1

    # Verify image content
    image_content = result["content"][0]["image"]
    assert image_content["format"] == "png"
    assert image_content["source"]["bytes"] == test_content


@mock_aws
def test_image_processing_jpg_normalization(tool):
    """Test JPG image processing with JPEG normalization"""
    filename = "11111111-11111111-11111111-11111111-111111111111.jpg"
    s3 = boto3.client("s3", region_name="us-east-1")
    s3.create_bucket(Bucket="test-bucket")

    test_content = b"fake jpg image content"
    s3.put_object(Bucket="test-bucket", Key=filename, Body=test_content)

    tool.s3_client = s3

    tool_use = {"toolUseId": "test-jpg", "input": {"s3_key": filename}}
    result = tool.s3_file_reader(tool_use)

    # Verify JPG is normalized to JPEG
    assert result["status"] == "success"
    assert result["content"][0]["image"]["format"] == "jpeg"  # Normalized
    assert result["content"][0]["image"]["source"]["bytes"] == test_content


@mock_aws
def test_no_normalization_for_valid_formats(tool):
    """Test document processing with format normalization"""
    s3 = boto3.client("s3", region_name="us-east-1")
    s3.create_bucket(Bucket="test-bucket")

    tool.s3_client = s3
    filename = "11111111-11111111-11111111-11111111-111111111111.csv"
    test_content = b"fake document content"
    s3.put_object(Bucket="test-bucket", Key=filename, Body=test_content)

    tool_use = {"toolUseId": f"test-csv", "input": {"s3_key": filename}}
    result = tool.s3_file_reader(tool_use)

    assert result["status"] == "success"
    assert result["content"][0]["document"]["format"] == "csv"


@mock_aws
def test_document_processing_pdf(tool):
    """Test successful PDF document processing"""
    filename = "11111111-11111111-11111111-11111111-111111111111.pdf"
    s3 = boto3.client("s3", region_name="us-east-1")
    s3.create_bucket(Bucket="test-bucket")

    test_content = b"fake pdf document content"
    s3.put_object(Bucket="test-bucket", Key=filename, Body=test_content)

    tool.s3_client = s3

    tool_use = {"toolUseId": "test-pdf", "input": {"s3_key": filename}}
    result = tool.s3_file_reader(tool_use)

    # Verify ToolResult structure
    assert result["toolUseId"] == "test-pdf"
    assert result["status"] == "success"
    assert len(result["content"]) == 1

    # Verify document content
    document_content = result["content"][0]["document"]
    assert document_content["format"] == "pdf"
    assert document_content["name"] == "11111111-11111111-11111111-11111111-111111111111"  # Filename without extension
    assert document_content["source"]["bytes"] == test_content


def test_missing_s3_key(tool):
    """Test error when s3_key is missing from input"""
    tool_use = {"toolUseId": "test-missing", "input": {}}
    result = tool.s3_file_reader(tool_use)

    assert result["toolUseId"] == "test-missing"
    assert result["status"] == "error"
    assert "S3 key is required" in result["content"][0]["text"]


def test_empty_s3_key(tool):
    """Test error when s3_key is empty"""
    tool_use = {"toolUseId": "test-empty", "input": {"s3_key": ""}}
    result = tool.s3_file_reader(tool_use)

    assert result["status"] == "error"
    assert "S3 key cannot be empty" in result["content"][0]["text"]


def test_s3_uri_rejected(tool):
    """Test that S3 URIs are rejected"""
    tool_use = {"toolUseId": "test-uri", "input": {"s3_key": "s3://bucket/key.txt"}}
    result = tool.s3_file_reader(tool_use)

    assert result["status"] == "error"
    assert "Invalid input" in result["content"][0]["text"]
    assert "Please provide only the S3 key" in result["content"][0]["text"]


@mock_aws
def test_unsupported_file_format(tool):
    """Test error for unsupported file formats"""
    s3 = boto3.client("s3", region_name="us-east-1")
    s3.create_bucket(Bucket="test-bucket")

    test_content = b"fake executable content"
    s3.put_object(Bucket="test-bucket", Key="program.exe", Body=test_content)

    tool.s3_client = s3

    tool_use = {"toolUseId": "test-unsupported", "input": {"s3_key": "program.exe"}}
    result = tool.s3_file_reader(tool_use)

    assert result["status"] == "error"
    assert "Unsupported file type" in result["content"][0]["text"]
    assert "program.exe" in result["content"][0]["text"]


@mock_aws
def test_file_not_found(tool):
    """Test error when file doesn't exist in S3"""
    s3 = boto3.client("s3", region_name="us-east-1")
    s3.create_bucket(Bucket="test-bucket")

    tool.s3_client = s3

    tool_use = {"toolUseId": "test-not-found", "input": {"s3_key": "nonexistent.txt"}}
    result = tool.s3_file_reader(tool_use)

    assert result["status"] == "error"
    assert "not found" in result["content"][0]["text"]
    assert "nonexistent.txt" in result["content"][0]["text"]


def test_aws_access_denied(tool):
    """Test handling of AWS access denied errors"""

    def mock_get_object(**kwargs):
        raise ClientError(
            error_response={"Error": {"Code": "AccessDenied", "Message": "Access Denied"}}, operation_name="GetObject"
        )

    with patch.object(tool.s3_client, "get_object", side_effect=mock_get_object):
        tool_use = {"toolUseId": "test-access", "input": {"s3_key": "restricted.txt"}}
        result = tool.s3_file_reader(tool_use)

    assert result["status"] == "error"
    assert result["content"][0]["text"] == "File 'restricted.txt' not found. The file may have been deleted or moved."


def test_malformed_tool_use_missing_tool_use_id(tool):
    """Test handling of malformed ToolUse objects missing toolUseId"""
    result = tool.s3_file_reader({"input": {"s3_key": "test.txt"}})

    assert result["status"] == "error"
    assert result["toolUseId"] == "unknown"
    assert "Unexpected error" in result["content"][0]["text"]


def test_malformed_tool_use_missing_input(tool):
    """Test handling of malformed ToolUse objects missing input"""
    result = tool.s3_file_reader({"toolUseId": "test-id"})

    assert result["status"] == "error"
    assert result["toolUseId"] == "test-id"
    assert "Unexpected error" in result["content"][0]["text"]


@mock_aws
def test_bedrock_compliance_document_names(tool):
    """Test that document names are Bedrock-compliant (no file extensions)"""
    s3 = boto3.client("s3", region_name="us-east-1")
    s3.create_bucket(Bucket="test-bucket")

    tool.s3_client = s3

    # Test various filenames to ensure Bedrock compliance
    test_files = [
        ("invoice.pdf", "invoice"),
        ("data-2024.csv", "data-2024"),
        ("file_with_underscores.txt", "file_with_underscores"),
    ]

    for filename, expected_name in test_files:
        test_content = b"bedrock compliance test content"
        s3.put_object(Bucket="test-bucket", Key=filename, Body=test_content)

        tool_use = {"toolUseId": f"test-{filename}", "input": {"s3_key": filename}}
        result = tool.s3_file_reader(tool_use)

        assert result["status"] == "success"
        document_name = result["content"][0]["document"]["name"]

        # No file extension, allowed characters only, no periods in the end
        assert document_name == expected_name
        assert not document_name.endswith(f".{filename.split('.')[-1]}")
        assert not document_name.endswith(".")


@mock_aws
def test_full_document_s3_key_structure(tool):
    """Test processing files with complex S3 key structures"""
    s3 = boto3.client("s3", region_name="us-east-1")
    s3.create_bucket(Bucket="test-bucket")

    tool.s3_client = s3

    # Test with current S3 key structure containing UUIDs - for documents
    complex_key = "11111111-11111111-11111111-11111111-111111111111/22222222-22222222-22222222-22222222-222222222222/33333333-33333333-33333333-33333333-333333333333/44444444-44444444-44444444-44444444-444444444444/55555555-55555555-55555555-55555555-555555555555.pdf"
    test_content = b"complex path document content"
    s3.put_object(Bucket="test-bucket", Key=complex_key, Body=test_content)

    tool_use = {"toolUseId": "test-complex", "input": {"s3_key": complex_key}}
    result = tool.s3_file_reader(tool_use)

    assert result["status"] == "success"
    assert result["content"] == [
        {
            "document": {
                "format": "pdf",
                "name": "55555555-55555555-55555555-55555555-555555555555",
                "source": {
                    "bytes": b"complex path document content",
                },
            },
        },
    ]


@mock_aws
def test_full_image_s3_key_structure(tool):
    """Test processing files with complex S3 key structures"""
    s3 = boto3.client("s3", region_name="us-east-1")
    s3.create_bucket(Bucket="test-bucket")

    tool.s3_client = s3

    # Test with current S3 key structure containing UUIDs - for images
    complex_key = "11111111-11111111-11111111-11111111-111111111111/22222222-22222222-22222222-22222222-222222222222/33333333-33333333-33333333-33333333-333333333333/44444444-44444444-44444444-44444444-444444444444/66666666-66666666-66666666-66666666-666666666666.png"
    test_content = b"complex path image content"
    s3.put_object(Bucket="test-bucket", Key=complex_key, Body=test_content)

    tool_use = {"toolUseId": "test-complex", "input": {"s3_key": complex_key}}
    result = tool.s3_file_reader(tool_use)

    assert result["status"] == "success"
    assert result["content"] == [
        {
            "image": {
                "format": "png",
                "source": {
                    "bytes": b"complex path image content",
                },
            },
        },
    ]
