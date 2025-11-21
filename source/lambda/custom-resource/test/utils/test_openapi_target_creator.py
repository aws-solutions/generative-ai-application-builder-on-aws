#!/usr/bin/env python
# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

import pytest
from utils.openapi_target_creator import OpenAPITargetCreator


class TestOpenAPITargetCreator:

    def test_initialization(self):
        config = {"TargetName": "test-api", "TargetType": "openApiSchema", "SchemaUri": "schemas/openapi-schema.json"}

        creator = OpenAPITargetCreator(config, "test-bucket")
        assert creator.target_name == "test-api"
        assert creator.target_type == "openApiSchema"
        assert creator.schema_uri == "schemas/openapi-schema.json"

    def test_validate_configuration_success(self):
        config = {"TargetName": "test-api", "TargetType": "openApiSchema", "SchemaUri": "schemas/openapi-schema.json"}

        creator = OpenAPITargetCreator(config, "test-bucket")
        assert creator.validate_configuration() is True

    def test_validate_configuration_missing_name(self):
        config = {"TargetType": "openApiSchema", "SchemaUri": "schemas/openapi-schema.json"}

        creator = OpenAPITargetCreator(config, "test-bucket")
        with pytest.raises(ValueError, match="TargetName and SchemaUri are required"):
            creator.validate_configuration()

    def test_validate_configuration_missing_schema_uri(self):
        config = {"TargetName": "test-api", "TargetType": "openApiSchema"}

        creator = OpenAPITargetCreator(config, "test-bucket")
        with pytest.raises(ValueError, match="TargetName and SchemaUri are required"):
            creator.validate_configuration()

    def test_create_target_configuration(self):
        config = {"TargetName": "test-api", "TargetType": "openApiSchema", "SchemaUri": "schemas/openapi-schema.json"}

        creator = OpenAPITargetCreator(config, "test-bucket")
        result = creator.create_target_configuration()

        expected = {"openApiSchema": {"s3": {"uri": "s3://test-bucket/schemas/openapi-schema.json"}}}
        assert result == expected

    def test_build_oauth_credential_config(self):
        config = {
            "TargetName": "test-api",
            "TargetType": "openApiSchema",
            "SchemaUri": "schemas/openapi-schema.json",
            "OutboundAuthParams": {
                "OutboundAuthProviderType": "OAUTH",
                "OutboundAuthProviderArn": "arn:aws:secretsmanager:us-east-1:123456789012:secret:oauth-secret",
                "AdditionalConfigParams": {
                    "OAuthAdditionalConfig": {
                        "scopes": ["read", "write"],
                        "customParameters": [{"key": "audience", "value": "api.example.com"}],
                    }
                },
            },
        }

        creator = OpenAPITargetCreator(config, "test-bucket")
        result = creator.build_credential_provider_configurations()

        expected = [
            {
                "credentialProviderType": "OAUTH",
                "credentialProvider": {
                    "oauthCredentialProvider": {
                        "providerArn": "arn:aws:secretsmanager:us-east-1:123456789012:secret:oauth-secret",
                        "scopes": ["read", "write"],
                        "customParameters": {"audience": "api.example.com"},
                    }
                },
            }
        ]
        assert result == expected

    def test_build_api_key_credential_config(self):
        config = {
            "TargetName": "test-api",
            "TargetType": "openApiSchema",
            "SchemaUri": "schemas/openapi-schema.json",
            "OutboundAuthParams": {
                "OutboundAuthProviderType": "API_KEY",
                "OutboundAuthProviderArn": "arn:aws:secretsmanager:us-east-1:123456789012:secret:api-key-secret",
                "AdditionalConfigParams": {
                    "ApiKeyAdditionalConfig": {
                        "parameterName": "x-api-key",
                        "prefix": "Bearer",
                        "location": "header",
                    }
                },
            },
        }

        creator = OpenAPITargetCreator(config, "test-bucket")
        result = creator.build_credential_provider_configurations()

        expected = [
            {
                "credentialProviderType": "API_KEY",
                "credentialProvider": {
                    "apiKeyCredentialProvider": {
                        "providerArn": "arn:aws:secretsmanager:us-east-1:123456789012:secret:api-key-secret",
                        "credentialParameterName": "x-api-key",
                        "credentialPrefix": "Bearer",
                        "credentialLocation": "header",
                    }
                },
            }
        ]
        assert result == expected

    def test_build_credential_config_missing_auth_params(self):
        config = {
            "TargetName": "test-api",
            "TargetType": "openApiSchema",
            "SchemaUri": "schemas/openapi-schema.json",
        }

        creator = OpenAPITargetCreator(config, "test-bucket")
        with pytest.raises(
            ValueError,
            match="OpenAPI targets require OutboundAuthParams with valid OutboundAuthProviderType and OutboundAuthProviderArn",
        ):
            creator.build_credential_provider_configurations()

    def test_convert_custom_parameters(self):
        config = {"TargetName": "test-api", "TargetType": "openApiSchema", "SchemaUri": "schemas/openapi-schema.json"}

        creator = OpenAPITargetCreator(config, "test-bucket")

        custom_params_array = [{"key": "param1", "value": "value1"}, {"key": "param2", "value": "value2"}]

        result = creator.convert_custom_parameters(custom_params_array)

        expected = {"param1": "value1", "param2": "value2"}
        assert result == expected

    def test_convert_custom_parameters_empty(self):
        config = {"TargetName": "test-api", "TargetType": "openApiSchema", "SchemaUri": "schemas/openapi-schema.json"}

        creator = OpenAPITargetCreator(config, "test-bucket")
        result = creator.convert_custom_parameters([])

        assert result == {}