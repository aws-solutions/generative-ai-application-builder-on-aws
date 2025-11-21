#!/usr/bin/env python
# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

"""
Factory pattern implementation for MCP Gateway target creators
"""

from abc import ABC, abstractmethod
from typing import Dict, Any, List
from aws_lambda_powertools import Logger

logger = Logger()


class MCPTargetCreator(ABC):

    def __init__(self, target_config: Dict[str, Any], schema_bucket_name: str):
        self.target_config = target_config
        self.target_name = target_config.get("TargetName")
        self.target_type = target_config.get("TargetType")
        self.schema_uri = target_config.get("SchemaUri")

        # Only create s3_block if schema_uri is provided
        if self.schema_uri:
            self.s3_block = {"s3": {"uri": f"s3://{schema_bucket_name}/{self.schema_uri.lstrip('/')}"}}
        else:
            self.s3_block = None

    @abstractmethod
    def validate_configuration(self) -> bool:
        pass

    @abstractmethod
    def create_target_configuration(self) -> Dict[str, Any]:
        pass

    def get_target_info(self) -> Dict[str, Any]:
        target_info = {
            "name": self.target_name,
            "type": self.target_type,
            "schema_uri": self.schema_uri,
        }

        description = self.target_config.get("TargetDescription")
        if description:
            target_info["description"] = description

        return target_info


class MCPGatewayFactory:

    # Registry of target creators by type
    target_creators = {}

    @classmethod
    def register_target_creator(cls, target_type: str, creator_class):
        cls.target_creators[target_type] = creator_class

    @classmethod
    def _ensure_default_creators_registered(cls):
        """Ensure default creators are registered, avoiding circular imports."""
        if not cls.target_creators:
            # Import here to avoid circular imports
            from utils.lambda_target_creator import LambdaTargetCreator
            from utils.openapi_target_creator import OpenAPITargetCreator
            from utils.smithy_target_creator import SmithyTargetCreator

            cls.register_target_creator("lambda", LambdaTargetCreator)
            cls.register_target_creator("openApiSchema", OpenAPITargetCreator)
            cls.register_target_creator("smithyModel", SmithyTargetCreator)

    @classmethod
    def create_target_creator(cls, target_config: Dict[str, Any], schema_bucket_name: str) -> MCPTargetCreator:
        # Ensure default creators are registered
        cls._ensure_default_creators_registered()

        target_type = target_config.get("TargetType")

        if not target_type:
            raise ValueError("Target type is required")

        if target_type not in cls.target_creators:
            available_types = list(cls.target_creators.keys())
            raise ValueError(f"Unsupported target type: {target_type}. Available types: {available_types}")

        creator_class = cls.target_creators[target_type]

        return creator_class(target_config, schema_bucket_name)

    @classmethod
    def get_supported_target_types(cls) -> List[str]:
        # Ensure default creators are registered
        cls._ensure_default_creators_registered()
        return list(cls.target_creators.keys())


def register_default_creators():
    from utils.lambda_target_creator import LambdaTargetCreator
    from utils.openapi_target_creator import OpenAPITargetCreator
    from utils.smithy_target_creator import SmithyTargetCreator

    # Default creators are registered when needed to avoid circular imports
    MCPGatewayFactory.register_target_creator("lambda", LambdaTargetCreator)
    MCPGatewayFactory.register_target_creator("openApiSchema", OpenAPITargetCreator)
    MCPGatewayFactory.register_target_creator("smithyModel", SmithyTargetCreator)
