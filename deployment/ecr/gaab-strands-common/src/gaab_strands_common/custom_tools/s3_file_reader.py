# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

"""
S3 File Reader tool for multimodal content processing.

This module provides functionality to read files from S3 buckets and return them
in appropriate formats for use with AI models. It supports both image and document
formats with automatic format detection and proper error handling.
"""

import logging
import os
from typing import Any, Dict, cast

import boto3
from botocore.exceptions import ClientError
from strands import tool
from strands.types.tools import ToolResult, ToolUse

from ..utils.constants import (
    MULTIMODAL_FILES_BUCKET_NAME_ENV_VAR,
    MULTIMODAL_FILES_METADATA_TABLE_NAME_ENV_VAR,
    SUPPORTED_DOCUMENT_FORMATS,
    SUPPORTED_IMAGE_FORMATS,
    USE_CASE_UUID,
)
from .setup import BaseCustomTool, auto_attach_when, custom_tool, requires
from .setup.metadata import ToolCategory

logger = logging.getLogger(__name__)


@custom_tool(
    tool_id="s3_file_reader",
    name="S3 File Reader",
    description="Read files from S3 bucket for multimodal content",
    category=ToolCategory.MULTIMODAL,
)
@requires(
    config_params=["LlmParams.MultimodalParams.MultimodalEnabled"],
    env_vars=[MULTIMODAL_FILES_BUCKET_NAME_ENV_VAR, MULTIMODAL_FILES_METADATA_TABLE_NAME_ENV_VAR, USE_CASE_UUID],
)
@auto_attach_when(
    lambda config: config.get("LlmParams", {}).get("MultimodalParams", {}).get("MultimodalEnabled", False)
)
class S3FileReaderTool(BaseCustomTool):
    """
    S3 File Reader tool that automatically attaches when multimodal is enabled
    """

    def __init__(self, config: Dict[str, Any], region: str):
        super().__init__(config, region)
        self.bucket_name = os.getenv(MULTIMODAL_FILES_BUCKET_NAME_ENV_VAR)
        self.metadata_table_name = os.getenv(MULTIMODAL_FILES_METADATA_TABLE_NAME_ENV_VAR)
        self.use_case_uuid = os.getenv(USE_CASE_UUID)
        self.s3_client = boto3.client("s3", region_name=self.region)

        logger.debug(f"Initialized S3FileReaderTool for bucket: {self.bucket_name}")

    @tool
    def s3_file_reader(self, tool_input: ToolUse) -> ToolResult:
        """
        Read files from S3 and return content in model-readable format.

        Supports images (png, jpg, jpeg, gif, webp) and documents (pdf, csv, doc, docx,
        xls, xlsx, html, txt, md). Provide only the S3 key (e.g., 'folder/file.jpg'),
        not the full S3 URI. Do not include the bucket name or s3:// prefix. The tool
        automatically detects file type and formats content appropriately for processing.

        Args:
            tool_input: ToolUse object containing:
                - s3_key (str, required): S3 object key/path (e.g., 'uploads/document.pdf')


        Returns:
            ToolResult with status "success" or "error":
            - Success: Returns image or document block with format and binary content
            - Error: Returns descriptive error message for invalid input, unsupported format,
            file not found, or S3 access issues
        """
        # Initialize variables with defaults
        tool_use_id = "unknown"
        s3_key = "unknown"

        try:
            tool_use_id = tool_input["toolUseId"]
            tool_use_input = tool_input["input"]

            if "s3_key" not in tool_use_input:
                return self._create_error_result(tool_use_id, "S3 key is required")

            s3_key = tool_use_input["s3_key"]

            # Validate and normalize the S3 key
            validation_result = self._validate_and_normalize_s3_key(s3_key)
            if validation_result.startswith("Error:"):  # Error message
                return self._create_error_result(tool_use_id, validation_result)

            s3_key = validation_result  # Normalized key
            logger.debug(f"Reading S3 file: s3://{self.bucket_name}/{s3_key}")

            response = self.s3_client.get_object(Bucket=self.bucket_name, Key=s3_key)
            content = response["Body"].read()

            file_extension = self.get_file_extension(s3_key)

            if file_extension == "unsupported":
                supported_formats = " | ".join(sorted(SUPPORTED_IMAGE_FORMATS | SUPPORTED_DOCUMENT_FORMATS))
                error_msg = f"Unsupported file type for '{s3_key}'. Supported formats: {supported_formats}"
                return self._create_error_result(tool_use_id, error_msg)

            file_type = self.determine_file_type(file_extension)

            logger.debug(f"Successfully read file: {s3_key} ({len(content)} bytes)")

            if file_type == "image":
                return self._create_image_result(tool_use_id, content, file_extension)

            if file_type == "document":
                return self._create_document_result(tool_use_id, content, file_extension, s3_key)

        except ClientError as e:
            error_code = e.response.get("Error", {}).get("Code", "Unknown")
            error_message = e.response.get("Error", {}).get("Message", str(e))

            if error_code == "NoSuchKey" or error_code == "AccessDenied":
                logger.warning(f"File not found in S3: s3://{self.bucket_name}/{s3_key}")
                error_msg = f"File '{s3_key}' not found. The file may have been deleted or moved."
                return self._create_error_result(tool_use_id, error_msg)

            logger.error(f"S3 ClientError reading file {s3_key}: {error_code} - {error_message}")
            error_msg = f"Error reading file '{s3_key}': {error_code} - {error_message}"
            return self._create_error_result(tool_use_id, error_msg)
        except Exception as e:
            logger.error(f"Unexpected error reading S3 file {s3_key}: {str(e)}")
            error_msg = f"Unexpected error reading file '{s3_key}': {str(e)}"
            return self._create_error_result(tool_use_id, error_msg)

    def get_file_extension(self, s3_key: str) -> str:
        """Extract file extension from S3 key"""
        if "." in s3_key:
            extension = s3_key.split(".")[-1]
            return extension
        return "unsupported"

    def determine_file_type(self, file_extension: str) -> str:
        """Determine if file is document or image based on extension"""
        if file_extension in SUPPORTED_IMAGE_FORMATS:
            return "image"
        if file_extension in SUPPORTED_DOCUMENT_FORMATS:
            return "document"
        raise ValueError(f"Unsupported file type with extension {file_extension}.")

    def _validate_and_normalize_s3_key(self, s3_key: str) -> str:
        """
        Validate S3 key input.

        This method only accepts the key portion (e.g., "folder/file.jpg").
        S3 URIs (s3://bucket/key) are rejected to encourage proper usage.

        Args:
            s3_key: The input S3 key (key portion only)

        Returns:
            Either the normalized key string, or an error message string
        """
        # Validate inputs
        if not s3_key or not s3_key.strip():
            return "Error: S3 key cannot be empty"

        original_s3_key = s3_key
        s3_key = s3_key.strip()

        # Reject S3 URIs - only accept key portion
        if s3_key.startswith("s3://"):
            logger.error(
                f"Received S3 URI instead of key. Please provide only the key portion (without s3://bucket/): {s3_key}"
            )
            return f"Error: Invalid input '{original_s3_key}'. Please provide only the S3 key (e.g., 'folder/file.jpg'), not the full S3 URI"

        return s3_key

    def _create_error_result(self, tool_use_id: str, error_message: str) -> ToolResult:
        """Create a ToolResult for error cases."""
        return {
            "toolUseId": tool_use_id,
            "status": "error",
            "content": [{"text": error_message}],
        }

    def _create_image_result(self, tool_use_id: str, content: bytes, image_extension: str) -> ToolResult:
        """Create a ToolResult for image files."""
        if image_extension not in SUPPORTED_IMAGE_FORMATS:
            raise ValueError(
                f"Unsupported image extension: {image_extension}. Supported extensions: {SUPPORTED_IMAGE_FORMATS}"
            )

        # Normalize for Bedrock Converse API compatibility
        if image_extension == "jpg":
            image_extension = "jpeg"

        return {
            "toolUseId": tool_use_id,
            "status": "success",
            "content": [{"image": {"format": image_extension, "source": {"bytes": content}}}],
        }

    def _create_document_result(
        self, tool_use_id: str, content: bytes, document_extension: str, s3_key: str
    ) -> ToolResult:
        """Create a ToolResult for document files"""
        if document_extension not in SUPPORTED_DOCUMENT_FORMATS:
            raise ValueError(
                f"Unsupported document extension: {document_extension}. Supported extensions: {SUPPORTED_DOCUMENT_FORMATS}"
            )

        document_name = os.path.splitext(os.path.basename(s3_key))[0]  # Use filename without extension

        document_block = {"name": document_name, "format": document_extension, "source": {"bytes": content}}

        return {
            "toolUseId": tool_use_id,
            "status": "success",
            "content": [{"document": cast(Dict[str, Any], document_block)}],
        }
