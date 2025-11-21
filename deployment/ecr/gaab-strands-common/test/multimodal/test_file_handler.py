# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0
import os
import time
from unittest.mock import patch

import boto3
import pytest
from gaab_strands_common.models import FileReference
from gaab_strands_common.multimodal.file_handler import FileHandler
from gaab_strands_common.utils.constants import (
    MULTIMODAL_FILES_BUCKET_NAME_ENV_VAR,
    MULTIMODAL_FILES_METADATA_TABLE_NAME_ENV_VAR,
    USE_CASE_UUID,
    FileStatus,
)
from moto import mock_aws


@pytest.fixture(autouse=True)
def setup_environment(mock_environment):
    """Setup environment variables for all tests"""
    with patch.dict(
        os.environ,
        {
            MULTIMODAL_FILES_METADATA_TABLE_NAME_ENV_VAR: "test-metadata-table",
            MULTIMODAL_FILES_BUCKET_NAME_ENV_VAR: "test-bucket",
            USE_CASE_UUID: "test-use-case-id",
        },
        clear=False,
    ):
        yield


@pytest.fixture
def file_handler(setup_environment):
    """Create a FileHandler instance for testing"""
    return FileHandler("us-east-1")


def test_init_success():
    """Test successful initialization"""
    with patch.dict(
        os.environ,
        {
            MULTIMODAL_FILES_METADATA_TABLE_NAME_ENV_VAR: "test-table",
            MULTIMODAL_FILES_BUCKET_NAME_ENV_VAR: "test-bucket",
        },
    ):
        handler = FileHandler("us-east-1")

        assert handler.region == "us-east-1"
        assert handler.metadata_table_name == "test-table"
        assert handler.bucket_name == "test-bucket"


@mock_aws
def test_validate_all_files_empty_files(file_handler):
    """Test validate_all_files with empty files list"""
    payload = {"files": [], "requestContext": {"authorizer": {"UserId": "test-user-id"}}}

    result = file_handler.validate_all_files(payload)

    assert result == []


@mock_aws
def test_validate_all_files_no_files_key(file_handler):
    """Test validate_all_files with no files key"""
    payload = {"requestContext": {"authorizer": {"UserId": "test-user-id"}}}

    result = file_handler.validate_all_files(payload)

    assert result == []


@mock_aws
def test_validate_all_files_invalid_file_data(file_handler):
    """Test validate_all_files with invalid file data"""
    payload = {
        "files": [
            {"invalid": "data"},  # Missing required keys
            "not_a_dict",  # Not a dict
        ],
        "requestContext": {"authorizer": {"UserId": "test-user-id"}},
    }

    result = file_handler.validate_all_files(payload)

    assert result == []


@mock_aws
def test_validate_all_files_valid_files():
    """Test validate_all_files with valid files"""
    # Setup DynamoDB mock
    dynamodb = boto3.resource("dynamodb", region_name="us-east-1")
    table = dynamodb.create_table(
        TableName="test-metadata-table",
        KeySchema=[
            {"AttributeName": "fileKey", "KeyType": "HASH"},
            {"AttributeName": "fileName", "KeyType": "RANGE"},
        ],
        AttributeDefinitions=[
            {"AttributeName": "fileKey", "AttributeType": "S"},
            {"AttributeName": "fileName", "AttributeType": "S"},
        ],
        BillingMode="PAY_PER_REQUEST",
    )

    # Create FileHandler after table is created
    file_handler = FileHandler("us-east-1")

    # Add a valid file entry with more than 1 hour remaining
    table.put_item(
        Item={
            "fileKey": "test-use-case-id/test-user-id/test-conversation-id/test-message-id",
            "fileName": "test-file.txt",
            "status": FileStatus.UPLOADED,
            "ttl": int(time.time()) + 7200,  # 2 hours from now
            "uploadTimestamp": int(time.time() * 1000),  # Current time in milliseconds
        }
    )

    payload = {
        "files": [{"fileReference": "test-file-ref", "fileName": "test-file.txt"}],
        "conversationId": "test-conversation-id",
        "messageId": "test-message-id",
        "userId": "test-user-id",
    }

    result = file_handler.validate_all_files(payload)

    assert len(result) == 1
    expected_s3_key = "test-use-case-id/test-user-id/test-conversation-id/test-message-id/test-file-ref"
    assert result[0]["text"] == f"File available for reading: test-file.txt with S3 key '{expected_s3_key}'"


@mock_aws
def test_validate_all_files_expired_file(file_handler):
    """Test validate_all_files with expired file"""
    # Setup DynamoDB mock
    dynamodb = boto3.resource("dynamodb", region_name="us-east-1")
    table = dynamodb.create_table(
        TableName="test-metadata-table",
        KeySchema=[
            {"AttributeName": "fileKey", "KeyType": "HASH"},
            {"AttributeName": "fileName", "KeyType": "RANGE"},
        ],
        AttributeDefinitions=[
            {"AttributeName": "fileKey", "AttributeType": "S"},
            {"AttributeName": "fileName", "AttributeType": "S"},
        ],
        BillingMode="PAY_PER_REQUEST",
    )

    # Add an expired file entry
    table.put_item(
        Item={
            "fileKey": "test-use-case-id/test-user-id/test-conversation-id/test-message-id",
            "fileName": "expired-file.txt",
            "status": FileStatus.UPLOADED,
            "ttl": int(time.time()) - 3600,  # 1 hour ago
        }
    )

    payload = {
        "files": [{"fileReference": "expired-file-ref", "fileName": "expired-file.txt"}],
        "conversationId": "test-conversation-id",
        "messageId": "test-message-id",
        "userId": "test-user-id",
    }

    result = file_handler.validate_all_files(payload)

    assert len(result) == 1
    assert result[0]["text"] == "File expired-file.txt is not available. It was either deleted or it has expired."


@mock_aws
def test_validate_all_files_expiring_soon_file():
    """Test validate_all_files with file expiring in less than 1 hour"""
    # Setup DynamoDB mock
    dynamodb = boto3.resource("dynamodb", region_name="us-east-1")
    table = dynamodb.create_table(
        TableName="test-metadata-table",
        KeySchema=[
            {"AttributeName": "fileKey", "KeyType": "HASH"},
            {"AttributeName": "fileName", "KeyType": "RANGE"},
        ],
        AttributeDefinitions=[
            {"AttributeName": "fileKey", "AttributeType": "S"},
            {"AttributeName": "fileName", "AttributeType": "S"},
        ],
        BillingMode="PAY_PER_REQUEST",
    )

    # Create FileHandler after table is created
    file_handler = FileHandler("us-east-1")

    # Add a file expiring in 30 minutes
    table.put_item(
        Item={
            "fileKey": "test-use-case-id/test-user-id/test-conversation-id/test-message-id",
            "fileName": "expiring-file.txt",
            "status": FileStatus.UPLOADED,
            "ttl": int(time.time()) + 1800,  # 30 minutes from now
        }
    )

    payload = {
        "files": [{"fileReference": "expiring-file-ref", "fileName": "expiring-file.txt"}],
        "conversationId": "test-conversation-id",
        "messageId": "test-message-id",
        "userId": "test-user-id",
    }

    result = file_handler.validate_all_files(payload)

    assert len(result) == 1
    assert result[0]["text"] == "File expiring-file.txt is not available. It was either deleted or it has expired."


@mock_aws
def test_validate_single_file_not_found():
    """Test _validate_single_file with file not found in metadata"""
    # Setup DynamoDB mock
    dynamodb = boto3.resource("dynamodb", region_name="us-east-1")
    dynamodb.create_table(
        TableName="test-metadata-table",
        KeySchema=[
            {"AttributeName": "fileKey", "KeyType": "HASH"},
            {"AttributeName": "fileName", "KeyType": "RANGE"},
        ],
        AttributeDefinitions=[
            {"AttributeName": "fileKey", "AttributeType": "S"},
            {"AttributeName": "fileName", "AttributeType": "S"},
        ],
        BillingMode="PAY_PER_REQUEST",
    )

    # Create FileHandler after table is created
    file_handler = FileHandler("us-east-1")

    file_ref = FileReference(fileReference="test-ref", fileName="non-existent-file.txt")

    result = file_handler._validate_single_file(
        file_ref, "test-use-case-id", "test-user-id", "test-conversation-id", "test-message-id"
    )

    assert result["is_valid"] is False
    assert result["reason"] == "No metadata found"


@mock_aws
def test_validate_single_file_deleted_status():
    """Test _validate_single_file with deleted file status"""
    # Setup DynamoDB mock
    dynamodb = boto3.resource("dynamodb", region_name="us-east-1")
    table = dynamodb.create_table(
        TableName="test-metadata-table",
        KeySchema=[
            {"AttributeName": "fileKey", "KeyType": "HASH"},
            {"AttributeName": "fileName", "KeyType": "RANGE"},
        ],
        AttributeDefinitions=[
            {"AttributeName": "fileKey", "AttributeType": "S"},
            {"AttributeName": "fileName", "AttributeType": "S"},
        ],
        BillingMode="PAY_PER_REQUEST",
    )

    # Create FileHandler after table is created
    file_handler = FileHandler("us-east-1")

    # Add a deleted file entry
    table.put_item(
        Item={
            "fileKey": "test-use-case-id/test-user-id/test-conversation-id/test-message-id",
            "fileName": "deleted-file.txt",
            "status": FileStatus.DELETED,
            "ttl": int(time.time()) + 3600,
        }
    )

    file_ref = FileReference(fileReference="test-ref", fileName="deleted-file.txt")

    result = file_handler._validate_single_file(
        file_ref, "test-use-case-id", "test-user-id", "test-conversation-id", "test-message-id"
    )

    assert result["is_valid"] is False
    assert result["reason"] == "File has been deleted."


@mock_aws
def test_validate_single_file_invalid_status():
    """Test _validate_single_file with invalid file status"""
    # Setup DynamoDB mock
    dynamodb = boto3.resource("dynamodb", region_name="us-east-1")
    table = dynamodb.create_table(
        TableName="test-metadata-table",
        KeySchema=[
            {"AttributeName": "fileKey", "KeyType": "HASH"},
            {"AttributeName": "fileName", "KeyType": "RANGE"},
        ],
        AttributeDefinitions=[
            {"AttributeName": "fileKey", "AttributeType": "S"},
            {"AttributeName": "fileName", "AttributeType": "S"},
        ],
        BillingMode="PAY_PER_REQUEST",
    )

    # Create FileHandler after table is created
    file_handler = FileHandler("us-east-1")

    # Add an invalid file entry
    table.put_item(
        Item={
            "fileKey": "test-use-case-id/test-user-id/test-conversation-id/test-message-id",
            "fileName": "invalid-file.txt",
            "status": FileStatus.INVALID,
            "ttl": int(time.time()) + 7200,
        }
    )

    file_ref = FileReference(fileReference="test-ref", fileName="invalid-file.txt")

    result = file_handler._validate_single_file(
        file_ref, "test-use-case-id", "test-user-id", "test-conversation-id", "test-message-id"
    )

    assert result["is_valid"] is False
    assert result["reason"] == "File is not available for use due to constraint violations."


@mock_aws
def test_validate_single_file_pending_then_uploaded():
    """Test _validate_single_file with file that starts pending then becomes uploaded"""
    # Setup DynamoDB mock
    dynamodb = boto3.resource("dynamodb", region_name="us-east-1")
    table = dynamodb.create_table(
        TableName="test-metadata-table",
        KeySchema=[
            {"AttributeName": "fileKey", "KeyType": "HASH"},
            {"AttributeName": "fileName", "KeyType": "RANGE"},
        ],
        AttributeDefinitions=[
            {"AttributeName": "fileKey", "AttributeType": "S"},
            {"AttributeName": "fileName", "AttributeType": "S"},
        ],
        BillingMode="PAY_PER_REQUEST",
    )

    # Create FileHandler after table is created
    file_handler = FileHandler("us-east-1")

    file_ref = FileReference(fileReference="test-ref", fileName="pending-file.txt")
    file_key = "test-use-case-id/test-user-id/test-conversation-id/test-message-id"

    # Mock the get_item response to simulate pending then uploaded
    call_count = 0

    def mock_get_item(**kwargs):
        nonlocal call_count
        call_count += 1

        if call_count == 1:
            # First call - file is pending
            return {
                "Item": {
                    "fileKey": file_key,
                    "fileName": "pending-file.txt",
                    "status": FileStatus.PENDING,
                    "ttl": int(time.time()) + 3600,
                }
            }
        else:
            # Second call - file is uploaded
            return {
                "Item": {
                    "fileKey": file_key,
                    "fileName": "pending-file.txt",
                    "status": FileStatus.UPLOADED,
                    "ttl": int(time.time()) + 3600,  # More than 1 hour remaining
                }
            }

    with patch.object(file_handler.metadata_table, "get_item", side_effect=mock_get_item):
        result = file_handler._validate_single_file(
            file_ref, "test-use-case-id", "test-user-id", "test-conversation-id", "test-message-id"
        )

    assert result["is_valid"] is True
    assert "s3_key" in result


def test_generate_s3_key(file_handler):
    """Test _generate_s3_key method"""
    result = file_handler._generate_s3_key("usecase-123", "user-456", "conversation-789", "message-012", "file-ref-345")

    expected = "usecase-123/user-456/conversation-789/message-012/file-ref-345"
    assert result == expected


def test_generate_metadata_key(file_handler):
    """Test _generate_metadata_key method"""
    result = file_handler._generate_metadata_key("usecase-123", "user-456", "conversation-789", "message-012")

    expected = "usecase-123/user-456/conversation-789/message-012"
    assert result == expected


@mock_aws
def test_validate_single_file_expiring_soon():
    """Test _validate_single_file with file expiring in less than 1 hour"""
    # Setup DynamoDB mock
    dynamodb = boto3.resource("dynamodb", region_name="us-east-1")
    table = dynamodb.create_table(
        TableName="test-metadata-table",
        KeySchema=[
            {"AttributeName": "fileKey", "KeyType": "HASH"},
            {"AttributeName": "fileName", "KeyType": "RANGE"},
        ],
        AttributeDefinitions=[
            {"AttributeName": "fileKey", "AttributeType": "S"},
            {"AttributeName": "fileName", "AttributeType": "S"},
        ],
        BillingMode="PAY_PER_REQUEST",
    )

    # Create FileHandler after table is created
    file_handler = FileHandler("us-east-1")

    # Add a file that expires in 30 minutes (less than 1 hour)
    table.put_item(
        Item={
            "fileKey": "test-use-case-id/test-user-id/test-conversation-id/test-message-id",
            "fileName": "expiring-soon-file.txt",
            "status": FileStatus.UPLOADED,
            "ttl": int(time.time()) + 1800,  # 30 minutes from now
        }
    )

    file_ref = FileReference(fileReference="test-ref", fileName="expiring-soon-file.txt")

    result = file_handler._validate_single_file(
        file_ref, "test-use-case-id", "test-user-id", "test-conversation-id", "test-message-id"
    )

    assert result["is_valid"] is False
    assert result["reason"].startswith("File expires in")
    assert "seconds (less than 1 hour)" in result["reason"]


@mock_aws
def test_validate_single_file_valid_with_time_remaining():
    """Test _validate_single_file with file that has more than 1 hour remaining"""
    # Setup DynamoDB mock
    dynamodb = boto3.resource("dynamodb", region_name="us-east-1")
    table = dynamodb.create_table(
        TableName="test-metadata-table",
        KeySchema=[
            {"AttributeName": "fileKey", "KeyType": "HASH"},
            {"AttributeName": "fileName", "KeyType": "RANGE"},
        ],
        AttributeDefinitions=[
            {"AttributeName": "fileKey", "AttributeType": "S"},
            {"AttributeName": "fileName", "AttributeType": "S"},
        ],
        BillingMode="PAY_PER_REQUEST",
    )

    # Create FileHandler after table is created
    file_handler = FileHandler("us-east-1")

    # Add a file that expires in 2 hours (more than 1 hour)
    table.put_item(
        Item={
            "fileKey": "test-use-case-id/test-user-id/test-conversation-id/test-message-id",
            "fileName": "valid-file.txt",
            "status": FileStatus.UPLOADED,
            "ttl": int(time.time()) + 7200,  # 2 hours from now
            "uploadTimestamp": int(time.time() * 1000),  # Current time in milliseconds
        }
    )

    file_ref = FileReference(fileReference="test-ref", fileName="valid-file.txt")

    result = file_handler._validate_single_file(
        file_ref, "test-use-case-id", "test-user-id", "test-conversation-id", "test-message-id"
    )

    assert result["is_valid"] is True
    assert "s3_key" in result
    assert "reason" not in result


@mock_aws
def test_validate_all_files_with_deleted_file():
    """Test validate_all_files returns informational message for deleted files (no S3 key)"""
    dynamodb = boto3.resource("dynamodb", region_name="us-east-1")
    table = dynamodb.create_table(
        TableName="test-metadata-table",
        KeySchema=[
            {"AttributeName": "fileKey", "KeyType": "HASH"},
            {"AttributeName": "fileName", "KeyType": "RANGE"},
        ],
        AttributeDefinitions=[
            {"AttributeName": "fileKey", "AttributeType": "S"},
            {"AttributeName": "fileName", "AttributeType": "S"},
        ],
        BillingMode="PAY_PER_REQUEST",
    )

    test_file_handler = FileHandler("us-east-1")

    table.put_item(
        Item={
            "fileKey": "test-use-case-id/test-user-id/test-conversation-id/test-message-id",
            "fileName": "deleted-file.jpg",
            "status": FileStatus.DELETED,
            "ttl": int(time.time()) + 3600,
        }
    )

    payload = {
        "files": [{"fileReference": "deleted-file-ref", "fileName": "deleted-file.jpg"}],
        "conversationId": "test-conversation-id",
        "messageId": "test-message-id",
        "userId": "test-user-id",
    }

    result = test_file_handler.validate_all_files(payload)

    # Should return a content block with informational message
    assert len(result) == 1
    assert result[0]["text"] == "File deleted-file.jpg is not available. It was either deleted or it has expired."


@mock_aws
def test_validate_all_files_mixed_valid_and_invalid():
    """Test validate_all_files with mix of valid and invalid files"""
    dynamodb = boto3.resource("dynamodb", region_name="us-east-1")
    table = dynamodb.create_table(
        TableName="test-metadata-table",
        KeySchema=[
            {"AttributeName": "fileKey", "KeyType": "HASH"},
            {"AttributeName": "fileName", "KeyType": "RANGE"},
        ],
        AttributeDefinitions=[
            {"AttributeName": "fileKey", "AttributeType": "S"},
            {"AttributeName": "fileName", "AttributeType": "S"},
        ],
        BillingMode="PAY_PER_REQUEST",
    )

    test_file_handler = FileHandler("us-east-1")

    # Add valid file
    table.put_item(
        Item={
            "fileKey": "test-use-case-id/test-user-id/test-conversation-id/test-message-id",
            "fileName": "valid-file.jpg",
            "status": FileStatus.UPLOADED,
            "ttl": int(time.time()) + 7200,
        }
    )

    # Add deleted file
    table.put_item(
        Item={
            "fileKey": "test-use-case-id/test-user-id/test-conversation-id/test-message-id",
            "fileName": "deleted-file.pdf",
            "status": FileStatus.DELETED,
            "ttl": int(time.time()) + 3600,
        }
    )

    # Add invalid file
    table.put_item(
        Item={
            "fileKey": "test-use-case-id/test-user-id/test-conversation-id/test-message-id",
            "fileName": "invalid-file.png",
            "status": FileStatus.INVALID,
            "ttl": int(time.time()) + 3600,
        }
    )

    payload = {
        "files": [
            {"fileReference": "valid-file-ref", "fileName": "valid-file.jpg"},
            {"fileReference": "deleted-file-ref", "fileName": "deleted-file.pdf"},
            {"fileReference": "invalid-file-ref", "fileName": "invalid-file.png"},
        ],
        "conversationId": "test-conversation-id",
        "messageId": "test-message-id",
        "userId": "test-user-id",
    }

    result = test_file_handler.validate_all_files(payload)

    # Should return content blocks for all 3 files
    assert len(result) == 3

    # Extract all text messages
    result_texts = {r["text"] for r in result}
    expected_s3_key = "test-use-case-id/test-user-id/test-conversation-id/test-message-id/valid-file-ref"
    expected_messages = {
        f"File available for reading: valid-file.jpg with S3 key '{expected_s3_key}'",
        "File deleted-file.pdf is not available. It was either deleted or it has expired.",
        "File invalid-file.png is not available. It was either deleted or it has expired.",
    }

    assert result_texts == expected_messages


@mock_aws
def test_validate_all_files_expired_file_message():
    """Test validate_all_files returns informational message for expired files"""
    dynamodb = boto3.resource("dynamodb", region_name="us-east-1")
    table = dynamodb.create_table(
        TableName="test-metadata-table",
        KeySchema=[
            {"AttributeName": "fileKey", "KeyType": "HASH"},
            {"AttributeName": "fileName", "KeyType": "RANGE"},
        ],
        AttributeDefinitions=[
            {"AttributeName": "fileKey", "AttributeType": "S"},
            {"AttributeName": "fileName", "AttributeType": "S"},
        ],
        BillingMode="PAY_PER_REQUEST",
    )

    test_file_handler = FileHandler("us-east-1")

    # Add expired file (TTL in the past)
    table.put_item(
        Item={
            "fileKey": "test-use-case-id/test-user-id/test-conversation-id/test-message-id",
            "fileName": "expired-file.jpg",
            "status": FileStatus.UPLOADED,
            "ttl": int(time.time()) - 3600,  # 1 hour ago
        }
    )

    payload = {
        "files": [{"fileReference": "expired-file-ref", "fileName": "expired-file.jpg"}],
        "conversationId": "test-conversation-id",
        "messageId": "test-message-id",
        "userId": "test-user-id",
    }

    result = test_file_handler.validate_all_files(payload)

    assert len(result) == 1
    assert result[0]["text"] == "File expired-file.jpg is not available. It was either deleted or it has expired."
