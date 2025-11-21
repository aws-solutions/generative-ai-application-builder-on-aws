#!/usr/bin/env python
# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

import re
from typing import Dict, Any, List
from aws_lambda_powertools import Logger, Tracer
from utils.mcp_factory import MCPTargetCreator

logger = Logger()
tracer = Tracer()


class OpenAPITargetCreator(MCPTargetCreator):

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

            openapi_config = {
                "openApiSchema": self.s3_block,
            }

            return openapi_config

        except Exception as e:
            error_msg = f"Failed to create OpenAPI target configuration: {str(e)}"
            logger.error(error_msg)
            raise RuntimeError(error_msg)

    def build_credential_provider_configurations(self) -> List[Dict[str, Any]]:
        return self.build_openapi_credential_config()

    def build_openapi_credential_config(self) -> List[Dict[str, Any]]:
        outbound_auth_params = self.target_config.get("OutboundAuthParams", {})
        auth_type = outbound_auth_params.get("OutboundAuthProviderType")
        provider_arn = outbound_auth_params.get("OutboundAuthProviderArn")

        if auth_type == "OAUTH" and provider_arn:
            return self.build_oauth_config(outbound_auth_params, provider_arn)
        elif auth_type == "API_KEY" and provider_arn:
            return self.build_api_key_config(outbound_auth_params, provider_arn)

        raise ValueError(
            "OpenAPI targets require OutboundAuthParams with valid OutboundAuthProviderType and OutboundAuthProviderArn"
        )

    def build_oauth_config(self, outbound_auth_params: Dict[str, Any], provider_arn: str) -> List[Dict[str, Any]]:
        additional_config = outbound_auth_params.get("AdditionalConfigParams", {})
        oauth_config_params = additional_config.get("OAuthAdditionalConfig", {})

        custom_parameters = self.convert_custom_parameters(oauth_config_params.get("customParameters", []))
        oauth_provider_config = {
            "providerArn": provider_arn,
        }

        scopes = oauth_config_params.get("scopes", [])
        oauth_provider_config["scopes"] = scopes

        # Add custom parameters if not empty
        if custom_parameters:
            oauth_provider_config["customParameters"] = custom_parameters

        return [
            {
                "credentialProviderType": "OAUTH",
                "credentialProvider": {"oauthCredentialProvider": oauth_provider_config},
            }
        ]

    def build_api_key_config(self, outbound_auth_params: Dict[str, Any], provider_arn: str) -> List[Dict[str, Any]]:
        additional_config = outbound_auth_params.get("AdditionalConfigParams", {})
        api_key_config = additional_config.get("ApiKeyAdditionalConfig", {})

        api_key_provider_config = {
            "providerArn": provider_arn,
            **{
                key: value
                for key, value in {
                    "credentialParameterName": api_key_config.get("parameterName"),
                    "credentialPrefix": api_key_config.get("prefix"),
                    "credentialLocation": api_key_config.get("location"),
                }.items()
                if value
            },
        }

        return [
            {
                "credentialProviderType": "API_KEY",
                "credentialProvider": {"apiKeyCredentialProvider": api_key_provider_config},
            }
        ]

    def convert_custom_parameters(self, custom_parameters_array: List[Dict[str, Any]]) -> Dict[str, str]:
        custom_parameters = {}
        if custom_parameters_array:
            for param in custom_parameters_array:
                if isinstance(param, dict) and "key" in param and "value" in param:
                    custom_parameters[param["key"]] = param["value"]
        return custom_parameters
