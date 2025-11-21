#!/usr/bin/env python
# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

import os
import re
import json
import boto3
from typing import Dict, Any, List
from aws_lambda_powertools import Logger, Tracer
from utils.mcp_factory import MCPTargetCreator

logger = Logger()
tracer = Tracer()

LAMBDA_ARN_PATTERN = re.compile(r"^arn:aws:lambda:[a-z0-9-]+:\d{12}:function:[a-zA-Z0-9-_]+(?::[a-zA-Z0-9-_]+)?$")

class LambdaTargetCreator(MCPTargetCreator):

    def __init__(self, target_config: Dict[str, Any], schema_bucket_name: str):
        super().__init__(target_config, schema_bucket_name)
        self.lambda_arn = target_config.get("LambdaArn")

    def validate_configuration(self) -> bool:
        if not self.target_name or not self.lambda_arn:
            raise ValueError("TargetName and LambdaArn are required")
        return True

    @tracer.capture_method
    def create_target_configuration(self) -> Dict[str, Any]:
        try:
            self.validate_configuration()

            lambda_config = {"lambda": {"lambdaArn": self.lambda_arn, "toolSchema": self.s3_block}}

            return lambda_config

        except Exception as e:
            error_msg = f"Failed to create Lambda target configuration: {str(e)}"
            logger.error(error_msg)
            raise RuntimeError(error_msg)

    def build_credential_provider_configurations(self) -> List[Dict[str, Any]]:
        return [{"credentialProviderType": "GATEWAY_IAM_ROLE"}]
