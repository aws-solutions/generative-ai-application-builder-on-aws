#!/usr/bin/env python
# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

import re
from typing import Dict, Any, List
from aws_lambda_powertools import Logger, Tracer
from utils.mcp_factory import MCPTargetCreator
from utils.openapi_target_creator import OpenAPITargetCreator
from utils.constants import MCP_ENDPOINT_PATTERN
from urllib.parse import urlparse

logger = Logger()
tracer = Tracer()


class MCPServerTargetCreator(MCPTargetCreator):

    def __init__(self, target_config: Dict[str, Any], schema_bucket_name: str):
        super().__init__(target_config, schema_bucket_name)
        self.mcp_endpoint = target_config.get("McpEndpoint")
        # Reuse OpenAPI methods for OAuth config
        self._openapi_helper = OpenAPITargetCreator(target_config, schema_bucket_name)

    def validate_configuration(self) -> bool:
        if not self.target_name:
            raise ValueError("TargetName is required")

        if not self.mcp_endpoint:
            raise ValueError("McpEndpoint is required for MCP Server targets")

        if not re.match(MCP_ENDPOINT_PATTERN, self.mcp_endpoint):
            raise ValueError("McpEndpoint must be a valid HTTPS URL")

        # SSRF protection for MCP endpoint
        try:
            parsed_url = urlparse(self.mcp_endpoint)
            hostname = parsed_url.hostname.lower() if parsed_url.hostname else ""

            # Block localhost and loopback addresses
            if (
                hostname == "localhost"
                or hostname == "127.0.0.1"
                or hostname.startswith("127.")
                or hostname == "0.0.0.0"
                or hostname == "::1"
                or hostname == "::"
                or hostname == "[::1]"
                or hostname == "[::]"
            ):
                raise ValueError("McpEndpoint cannot use localhost or loopback addresses")

            # Block private IP ranges (RFC 1918)
            if (
                hostname.startswith("10.")
                or hostname.startswith("192.168.")
                or any(hostname.startswith(f"172.{i}.") for i in range(16, 32))
            ):
                raise ValueError("McpEndpoint cannot use private IP addresses")

            # Block link-local and cloud metadata endpoints
            if hostname.startswith("169.254.") or hostname == "metadata" or "metadata." in hostname:
                raise ValueError("McpEndpoint cannot use link-local or metadata addresses")
        except ValueError:
            # Re-raise our validation errors
            raise
        except Exception as e:
            # URL parsing failed, already caught by pattern check
            logger.exception("Unexpected error during validation for endpoint %s: %s", self.mcp_endpoint, e)

        return True

    @tracer.capture_method
    def create_target_configuration(self) -> Dict[str, Any]:
        try:
            self.validate_configuration()

            mcp_server_config = {"mcpServer": {"endpoint": self.mcp_endpoint}}

            return mcp_server_config

        except Exception as e:
            error_msg = f"Failed to create MCP Server target configuration: {str(e)}"
            logger.error(error_msg)
            raise RuntimeError(error_msg)

    def build_credential_provider_configurations(self) -> List[Dict[str, Any]]:
        outbound_auth_params = self.target_config.get("OutboundAuthParams")

        if not outbound_auth_params:
            return []

        return self.build_mcp_server_credential_config()

    def build_mcp_server_credential_config(self) -> List[Dict[str, Any]]:
        outbound_auth_params = self.target_config.get("OutboundAuthParams", {})
        auth_type = outbound_auth_params.get("OutboundAuthProviderType")
        provider_arn = outbound_auth_params.get("OutboundAuthProviderArn")

        if auth_type == "OAUTH" and provider_arn:
            return self._openapi_helper.build_oauth_config(outbound_auth_params, provider_arn)

        raise ValueError(
            "MCP Server targets with authentication require OutboundAuthParams with OAUTH type and valid OutboundAuthProviderArn"
        )
