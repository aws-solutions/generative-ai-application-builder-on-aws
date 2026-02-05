# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

# Supported file formats
SUPPORTED_IMAGE_FORMATS = {"png", "jpeg", "jpg", "gif", "webp"}
SUPPORTED_DOCUMENT_FORMATS = {"pdf", "csv", "doc", "docx", "xls", "xlsx", "html", "txt", "md"}

MULTIMODAL_FILES_METADATA_TABLE_NAME_ENV_VAR = "MULTIMODAL_METADATA_TABLE_NAME"
MULTIMODAL_FILES_BUCKET_NAME_ENV_VAR = "MULTIMODAL_DATA_BUCKET"
USE_CASE_CONFIG_TABLE_NAME_ENV_VAR = "USE_CASE_TABLE_NAME"
USE_CASE_CONFIG_RECORD_KEY_ENV_VAR = "USE_CASE_CONFIG_KEY"
USE_CASE_UUID = "USE_CASE_UUID"
MAX_PARALLEL_FILE_PROCESSING_THREADS = 5
REMAINING_SECONDS_FOR_FILE_ACCESS = 3600


# File status constants
class FileStatus:
    PENDING = "pending"
    UPLOADED = "uploaded"
    DELETED = "deleted"
    INVALID = "invalid"
    NOT_FOUND = "not_found"
    EXPIRING_SOON = "expiring_soon"


# Retry configuration constants
RETRY_CONFIG = {
    "max_retries": 3,
    "back_off_rate": 2,
    "initial_delay_ms": 1000,
    "max_delay": 60.0,
}

# Boto3 client configuration constants
BOTO_CONFIG = {
    "max_attempts": 5,
    "retry_mode": "standard",
}
