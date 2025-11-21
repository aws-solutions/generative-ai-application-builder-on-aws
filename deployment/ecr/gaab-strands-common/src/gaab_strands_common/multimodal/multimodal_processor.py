# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

"""
Multimodal Request Processor - Handles requests with files and multimodal content
"""

import logging
from typing import Any, Dict, List, Union

from gaab_strands_common.models import UseCaseConfig
from gaab_strands_common.multimodal.file_handler import FileHandler
from gaab_strands_common.utils.helpers import extract_user_message

logger = logging.getLogger(__name__)


class MultimodalRequestProcessor:
    """Processes multimodal requests with file handling"""

    def __init__(self, region):
        """Initialize multimodal request processor"""
        self.region = region

    def process_multimodal_request(self, payload: Dict[str, Any]) -> Union[str, List[Dict[str, str]]]:
        """
        Process multimodal request with files

        Args:
            payload: Request payload containing files

        Returns:
            User message or content blocks for agent processing

        Raises:
            ValueError: When file processing fails (handled by main error handling)
        """
        logger.debug("Processing multimodal request with files")
        query = extract_user_message(payload)
        content_blocks = [{"text": query}]

        try:
            file_handler = FileHandler(region=self.region)

            # Validate all files in parallel and get content blocks
            file_content_blocks = file_handler.validate_all_files(payload)

            if not file_content_blocks:
                logger.warning("No files were processed")
                raise ValueError("No files were provided for processing.")

            # Create enhanced content blocks with query and file references
            content_blocks.extend(file_content_blocks)
            logger.debug("Created multimodal content with %d file content blocks", len(file_content_blocks))
            return content_blocks

        except Exception as e:
            logger.error(f"Error processing multimodal files: {e}")
            # Re-raise to be handled by main error handling (respects streaming/non-streaming)
            raise

    def is_multimodal_enabled(self, config: UseCaseConfig) -> bool:
        """Check if multimodal is enabled in configuration"""
        if config.llm_params.multimodal_params:
            return config.llm_params.multimodal_params.multimodal_enabled
        return False

    def has_files(self, payload: Dict[str, Any]) -> bool:
        """Check if payload contains files"""
        files = payload.get("files", [])
        return isinstance(files, list) and len(files) > 0
