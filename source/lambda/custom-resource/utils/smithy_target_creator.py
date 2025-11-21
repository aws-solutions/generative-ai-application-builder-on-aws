#!/usr/bin/env python
# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

import re
from typing import Dict, Any, List
from aws_lambda_powertools import Logger, Tracer
from utils.mcp_factory import MCPTargetCreator

logger = Logger()
tracer = Tracer()


class SmithyTargetCreator(MCPTargetCreator):

    def __init__(self, target_config: Dict[str, Any], schema_bucket_name: str):
        super().__init__(target_config, schema_bucket_name)

    def validate_configuration(self) -> bool:
        if not self.target_name or not self.schema_uri:
            raise ValueError("TargetName and SchemaUri are required")
        return True

    @tracer.capture_method
    def create_target_configuration(self) -> Dict[str, Any]:
        try:
            self.validate_configuration()

            smithy_config = {"smithyModel": self.s3_block}

            return smithy_config

        except Exception as e:
            error_msg = f"Failed to create Smithy target configuration: {str(e)}"
            logger.error(error_msg)
            raise RuntimeError(error_msg)

    def build_credential_provider_configurations(self) -> List[Dict[str, Any]]:
        return [{"credentialProviderType": "GATEWAY_IAM_ROLE"}]
