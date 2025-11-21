# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

import logging
import os
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from typing import Any, Dict, List

import boto3
from gaab_strands_common.models import FileReference
from gaab_strands_common.utils.constants import (
    MAX_PARALLEL_FILE_PROCESSING_THREADS,
    MULTIMODAL_FILES_BUCKET_NAME_ENV_VAR,
    MULTIMODAL_FILES_METADATA_TABLE_NAME_ENV_VAR,
    REMAINING_SECONDS_FOR_FILE_ACCESS,
    USE_CASE_UUID,
    FileStatus,
)
from gaab_strands_common.utils.helpers import retry_with_backoff

logger = logging.getLogger(__name__)


class FileHandler:
    """Handles multimodal file validation and processing"""

    def __init__(self, region: str):
        """
        Initialize file handler

        Args:
            region: AWS region
        """
        self.region = region
        # Get environment variables - no validation needed since S3FileReaderTool already validated
        self.metadata_table_name = os.getenv(MULTIMODAL_FILES_METADATA_TABLE_NAME_ENV_VAR)
        self.bucket_name = os.getenv(MULTIMODAL_FILES_BUCKET_NAME_ENV_VAR)

        self.dynamodb = boto3.resource("dynamodb", region_name=region)
        self.metadata_table = self.dynamodb.Table(self.metadata_table_name)

    def _convert_to_file_references(self, files: List[Dict[str, Any]]) -> List[FileReference]:
        """Convert file dictionaries to FileReference objects"""
        file_references = []
        for file_data in files:
            if isinstance(file_data, dict) and "fileReference" in file_data and "fileName" in file_data:
                file_references.append(FileReference(**file_data))
            else:
                logger.warning(f"Skipping invalid file data: {file_data}")
        return file_references

    def _process_validation_result(self, validation_result: Dict[str, Any], file_ref: FileReference) -> Dict[str, str]:
        """Process a single file validation result and return content block"""
        if validation_result["is_valid"]:
            s3_key = validation_result["s3_key"]
            logger.debug(f"Successfully validated file: {file_ref.file_name}")
            return {"text": f"File available for reading: {file_ref.file_name} with S3 key '{s3_key}'"}
        else:
            reason = validation_result.get("reason", "Unknown reason")
            logger.warning(f"File validation failed for: {file_ref.file_name} - {reason}")
            return {
                "text": f"File {file_ref.file_name} is not available. It was either deleted or it has expired."
            }

    def _validate_files_in_parallel(
        self,
        file_references: List[FileReference],
        usecase_id: str,
        user_id: str,
        conversation_id: str,
        message_id: str,
    ) -> List[Dict[str, str]]:
        """Validate multiple files in parallel using ThreadPoolExecutor"""
        file_content_blocks = []
        max_workers = min(len(file_references), MAX_PARALLEL_FILE_PROCESSING_THREADS)

        with ThreadPoolExecutor(max_workers=max_workers) as executor:
            future_to_file = {
                executor.submit(
                    self._validate_single_file, file_ref, usecase_id, user_id, conversation_id, message_id
                ): file_ref
                for file_ref in file_references
            }

            for future in as_completed(future_to_file):
                file_ref = future_to_file[future]
                try:
                    validation_result = future.result()
                    content_block = self._process_validation_result(validation_result, file_ref)
                    file_content_blocks.append(content_block)
                except Exception as e:
                    logger.error(f"Error processing file {file_ref.file_name}: {e}")

        return file_content_blocks

    def validate_all_files(self, payload: Dict[str, Any]) -> List[Dict[str, str]]:
        """
        Validate all files in parallel and create content blocks

        Args:
            payload: Request payload containing files and metadata

        Returns:
            content_blocks
        """
        files = payload.get("files", [])
        if not files:
            return []

        logger.debug(f"Processing {len(files)} files in parallel")

        file_references = self._convert_to_file_references(files)
        if not file_references:
            return []

        usecase_id = os.getenv(USE_CASE_UUID)
        user_id = payload.get("userId")
        conversation_id = payload.get("conversationId")
        message_id = payload.get("messageId")

        file_content_blocks = self._validate_files_in_parallel(
            file_references, usecase_id, user_id, conversation_id, message_id
        )

        logger.info(f"Created {len(file_content_blocks)} file content blocks from {len(files)} files")
        return file_content_blocks

    def _check_ttl_validity(self, file_name: str, ttl: int) -> Dict[str, Any]:
        """Check if file TTL is valid and has sufficient time remaining"""
        current_utc_timestamp = int(time.time())

        if current_utc_timestamp > ttl:
            logger.warning(f"File {file_name} has expired (current UTC: {current_utc_timestamp}, TTL: {ttl})")
            return {"valid": False, "reason": "File has expired"}

        if (current_utc_timestamp + REMAINING_SECONDS_FOR_FILE_ACCESS) > ttl:
            time_remaining = ttl - current_utc_timestamp
            logger.warning(f"File {file_name} rejected - less than 1 hour remaining ({time_remaining} seconds left)")
            return {"valid": False, "reason": f"File expires in {time_remaining} seconds (less than 1 hour)"}

        return {"valid": True}

    def _handle_file_status(self, file_name: str, status: str, ttl: int) -> Dict[str, Any]:
        """Handle different file status types and return appropriate result"""
        current_utc_timestamp = int(time.time())

        if status == FileStatus.UPLOADED:
            if ttl:
                time_remaining = ttl - current_utc_timestamp
                hours_remaining = time_remaining / 3600
                logger.debug(f"File {file_name} is ready for use ({hours_remaining:.1f} hours remaining)")
            else:
                logger.debug(f"File {file_name} is ready for use (no TTL set)")
            return {"status": FileStatus.UPLOADED, "valid": True}

        if status == FileStatus.DELETED:
            logger.error(f"File {file_name} has been deleted")
            return {"status": FileStatus.DELETED, "valid": False, "reason": "File has been deleted."}

        if status == FileStatus.INVALID:
            logger.error(f"File {file_name} is marked as invalid")
            return {
                "status": FileStatus.INVALID,
                "valid": False,
                "reason": "File is not available for use due to constraint violations.",
            }

        if status == FileStatus.PENDING:
            logger.info(f"File {file_name} is still pending")
            return {
                "status": FileStatus.PENDING,
                "valid": False,
                "reason": "File is still being processed or hasn't been uploaded yet.",
            }

        logger.warning(f"File {file_name} has unknown status: {status}")
        return {"status": "unknown", "valid": False, "reason": f"Unknown status: {status}"}

    def _check_file_metadata(self, metadata_key: str, file_name: str) -> Dict[str, Any]:
        """Check file metadata in DynamoDB and validate status"""
        response = self.metadata_table.get_item(Key={"fileKey": metadata_key, "fileName": file_name})

        item = response.get("Item")
        if not item:
            logger.warning(f"No metadata found for file: {file_name}")
            return {"status": FileStatus.NOT_FOUND, "valid": False, "reason": "No metadata found"}

        status = item.get("status", "")
        ttl = item.get("ttl")

        if ttl:
            ttl_result = self._check_ttl_validity(file_name, ttl)
            if not ttl_result["valid"]:
                return {"status": "expired", "valid": False, "reason": ttl_result["reason"]}

        return self._handle_file_status(file_name, status, ttl)

    def _validate_single_file(
        self,
        file_reference: FileReference,
        usecase_id: str,
        user_id: str,
        conversation_id: str,
        message_id: str,
    ) -> Dict[str, Any]:
        """
        Validate a single file with retry logic for pending status and S3 existence verification

        Args:
            file_reference: File reference to validate
            usecase_id: Use case UUID
            user_id: User ID
            conversation_id: Conversation UUID
            message_id: Message UUID

        Returns:
            Dict with validation result:
            {
                "is_valid": bool,
                "s3_key": str (if valid),
                "reason": str (if invalid)
            }
        """
        try:
            metadata_key = self._generate_metadata_key(usecase_id, user_id, conversation_id, message_id)
            logger.debug(f"Validating file: {file_reference.file_name} with key: {metadata_key}")

            metadata_result = retry_with_backoff(
                func=lambda: self._check_file_metadata(metadata_key, file_reference.file_name),
                retry_condition=lambda result: result["status"] == FileStatus.PENDING,
            )

            if not metadata_result["valid"]:
                return {"is_valid": False, "reason": metadata_result["reason"]}

            s3_key = self._generate_s3_key(
                usecase_id, user_id, conversation_id, message_id, file_reference.file_reference
            )
            logger.debug(f"File {file_reference.file_name} fully validated (metadata)")
            return {"is_valid": True, "s3_key": s3_key}

        except Exception as e:
            logger.error(f"Error validating file {file_reference.file_name}: {e}")
            return {"is_valid": False, "reason": f"Validation error: {str(e)}"}

    def _generate_s3_key(
        self,
        usecase_id: str,
        user_id: str,
        conversation_id: str,
        message_id: str,
        file_reference: str,
    ) -> str:
        """
        Generate S3 key for file access

        Format: usecase_id/user_id/conversation_id/message_id/file_reference

        Args:
            usecase_id: Use case UUID
            user_id: User ID
            conversation_id: Conversation UUID
            message_id: Message UUID
            file_reference: File UUID reference

        Returns:
            S3 key string
        """
        return f"{usecase_id}/{user_id}/{conversation_id}/{message_id}/{file_reference}"

    def _generate_metadata_key(self, usecase_id: str, user_id: str, conversation_id: str, message_id: str) -> str:
        """
        Generate metadata key for DynamoDB lookup

        Format: usecase_id/user_id/conversation_id/message_id

        Args:
            usecase_id: Use case UUID
            user_id: User ID extracted from request
            conversation_id: Conversation UUID
            message_id: Message UUID

        Returns:
            Metadata key string
        """
        return f"{usecase_id}/{user_id}/{conversation_id}/{message_id}"
