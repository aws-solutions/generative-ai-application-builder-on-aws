# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

"""
Base class for custom tools that are also strands tools
"""

import logging
import os
from typing import Any, Dict

logger = logging.getLogger(__name__)


class BaseCustomTool:
    """
    Base class that all custom tools must inherit from.

    This class provides:
    - Consistent initialization pattern
    - Automatic requirement validation
    - Access to system configuration
    - Standard interface for tool creation

    Ensure that all child classes have a tool with @tool decorator to actually
    allow tool invocation
    """

    def __init__(self, config: Dict[str, Any], region: str):
        """
        Initialize the custom tool

        Args:
            config: Full configuration dictionary from DynamoDB
            region: AWS region
        """
        self.config = config
        self.region = region
        self._validate_requirements()

    def _get_tool_identity(self):
        """Get tool name and ID for error messages."""
        tool_name = "Unknown Tool"
        tool_id = "unknown"
        if hasattr(self.__class__, "metadata") and self.__class__.metadata is not None:
            tool_name = getattr(self.__class__.metadata, "name", self.__class__.metadata.tool_id)
            tool_id = self.__class__.metadata.tool_id
        return tool_name, tool_id

    def _log_validation_error(self, tool_name, tool_id, error_msg, missing_items, item_type):
        """Log detailed validation error with formatting."""
        logger.error("=" * 80)
        logger.error(f"TOOL SETUP ERROR: {tool_name}")
        logger.error(error_msg)
        logger.error(f"Tool '{tool_id}' will NOT be available.")
        logger.error(f"Please configure these {item_type} to enable this tool:")
        for item in missing_items:
            logger.error(f"- {item}")
        logger.error("=" * 80)

    def _validate_env_vars(self, env_vars):
        """Validate required environment variables exist."""
        missing_env_vars = [env_var for env_var in env_vars if not os.getenv(env_var)]

        if missing_env_vars:
            tool_name, tool_id = self._get_tool_identity()
            error_msg = f"Missing required environment variables for {tool_name}: {', '.join(missing_env_vars)}"
            self._log_validation_error(tool_name, tool_id, error_msg, missing_env_vars, "environment variables")
            raise ValueError(error_msg)

    def _validate_config_params(self, config_params):
        """Validate required configuration parameters exist."""
        missing_config_params = [param for param in config_params if self._get_config_param(param) is None]

        if missing_config_params:
            tool_name, tool_id = self._get_tool_identity()
            error_msg = f"Missing required configuration parameters for {tool_name}: {', '.join(missing_config_params)}"
            self._log_validation_error(
                tool_name, tool_id, error_msg, missing_config_params, "parameters in your use case configuration"
            )
            raise ValueError(error_msg)

    def _validate_requirements(self):
        """
        Validate all requirements are met before tool can be used.

        This method checks:
        - Environment variables exist and have values
        - Configuration parameters exist in the config dictionary

        Raises:
            ValueError: If any required dependency is missing
        """
        if not hasattr(self.__class__, "_requirements") or self.__class__._requirements is None:
            return

        req = self.__class__._requirements

        if req.env_vars:
            self._validate_env_vars(req.env_vars)

        if req.config_params:
            self._validate_config_params(req.config_params)

        logger.info(f"Successfully validated {self.__class__.metadata.tool_id} tool to be used.")

    def _get_config_param(self, param_path: str, default=None):
        """
        Get config parameter using dot notation like 'LlmParams.MultimodalParams.MultimodalEnabled'

        Args:
            param_path: Dot-separated path to the parameter
            default: Default value to return if parameter doesn't exist

        Returns:
            Parameter value or default if not found
        """
        keys = param_path.split(".")
        current = self.config

        for key in keys:
            if isinstance(current, dict) and key in current:
                current = current[key]
            else:
                return default

        return current
