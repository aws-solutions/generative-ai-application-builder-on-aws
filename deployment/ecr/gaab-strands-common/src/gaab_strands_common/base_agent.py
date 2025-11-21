# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

"""
Base Agent - Common patterns for agent initialization and configuration
"""

import logging
import os
from typing import Optional

from strands.models import BedrockModel

from gaab_strands_common.models import LlmParams, UseCaseConfig
from gaab_strands_common.utils.helpers import build_guardrail_config, create_boto_config

logger = logging.getLogger(__name__)


class BaseAgent:
    """Base class providing common agent initialization patterns"""

    def __init__(self, region: str):
        """
        Initialize base agent

        Args:
            region: AWS region for Bedrock
        """
        self.region = region
        self.config: Optional[UseCaseConfig] = None

    def _create_model(self, llm_params: LlmParams) -> BedrockModel:
        """
        Create Bedrock model from LLM parameters

        Args:
            llm_params: LLM configuration parameters

        Returns:
            BedrockModel: Configured Bedrock model instance
        """
        bedrock_params = llm_params.bedrock_llm_params

        # Log environment and configuration for debugging
        logger.debug(f"Environment AWS_REGION: {os.getenv('AWS_REGION')}")
        logger.debug(f"Configured region: {self.region}")
        logger.info(f"Inference type: {bedrock_params.bedrock_inference_type}")
        logger.info(f"Model identifier: {bedrock_params.model_identifier}")

        # Check if this is a cross-region inference profile
        is_cross_region_profile = bedrock_params.model_identifier.startswith("us.")
        if is_cross_region_profile:
            logger.info(f"Cross-region inference profile detected: {bedrock_params.model_identifier}")

        # Log detailed model configuration
        logger.debug(
            f"🔧 BedrockModel configuration:\n"
            f"  - model_id: {bedrock_params.model_identifier}\n"
            f"  - region_name: {self.region}\n"
            f"  - temperature: {llm_params.temperature}\n"
            f"  - streaming: {llm_params.streaming}"
        )

        # Create Botocore Config with retry settings and user agent
        boto_config = create_boto_config(self.region)

        # Build guardrail configuration if available
        guardrail_config = build_guardrail_config(bedrock_params)

        model_config = {
            "model_id": bedrock_params.model_identifier,
            "region_name": self.region,
            "temperature": llm_params.temperature,
            "streaming": llm_params.streaming,
            "boto_client_config": boto_config,
            **guardrail_config,
        }

        bedrock_model = BedrockModel(**model_config)
        logger.info("BedrockModel instance created successfully")

        return bedrock_model

    def _validate_use_case_type(self, config_dict: dict, expected_type: str):
        """
        Validate use case type from configuration

        Args:
            config_dict: Configuration dictionary
            expected_type: Expected use case type

        Raises:
            ValueError: If use case type doesn't match expected
        """
        use_case_type = config_dict.get("UseCaseType")
        if use_case_type != expected_type:
            raise ValueError(f"Expected {expected_type}, got {use_case_type}")

    def get_config(self) -> UseCaseConfig:
        """
        Get the agent configuration

        Returns:
            UseCaseConfig: Use case configuration

        Raises:
            ValueError: If configuration not loaded
        """
        if not self.config:
            raise ValueError("Configuration not loaded")
        return self.config
