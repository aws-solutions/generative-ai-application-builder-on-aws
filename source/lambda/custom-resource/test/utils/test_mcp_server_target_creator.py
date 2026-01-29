#!/usr/bin/env python
# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

import pytest
from utils.mcp_server_target_creator import MCPServerTargetCreator


class TestMCPServerTargetCreator:

    def test_create_target_configuration_with_auth(self):
        target_config = {
            "TargetName": "test-mcp-server",
            "TargetType": "mcpServer",
            "McpEndpoint": "https://api.example.com/mcp",
            "OutboundAuthParams": {
                "OutboundAuthProviderType": "OAUTH",
                "OutboundAuthProviderArn": "arn:aws:bedrock-agentcore:us-east-1:123456789012:token-vault/test-vault/oauth2credentialprovider/test-provider",
                "AdditionalConfigParams": {
                    "OAuthAdditionalConfig": {
                        "scopes": ["read", "write"],
                        "customParameters": [
                            {"key": "client_id", "value": "test-client"},
                            {"key": "audience", "value": "test-audience"},
                        ],
                    }
                },
            },
        }

        creator = MCPServerTargetCreator(target_config, "test-bucket")

        config = creator.create_target_configuration()
        expected_config = {"mcpServer": {"endpoint": "https://api.example.com/mcp"}}
        assert config == expected_config

        # Test credential provider configuration
        creds = creator.build_credential_provider_configurations()
        assert len(creds) == 1
        assert creds[0]["credentialProviderType"] == "OAUTH"
        assert "oauthCredentialProvider" in creds[0]["credentialProvider"]

        oauth_config = creds[0]["credentialProvider"]["oauthCredentialProvider"]
        assert (
            oauth_config["providerArn"]
            == "arn:aws:bedrock-agentcore:us-east-1:123456789012:token-vault/test-vault/oauth2credentialprovider/test-provider"
        )
        assert oauth_config["scopes"] == ["read", "write"]
        assert oauth_config["customParameters"] == {"client_id": "test-client", "audience": "test-audience"}

    def test_create_target_configuration_without_auth(self):
        target_config = {
            "TargetName": "test-mcp-server",
            "TargetType": "mcpServer",
            "McpEndpoint": "https://api.example.com/mcp",
        }

        creator = MCPServerTargetCreator(target_config, "test-bucket")

        config = creator.create_target_configuration()
        expected_config = {"mcpServer": {"endpoint": "https://api.example.com/mcp"}}
        assert config == expected_config

        # Test credential provider configuration (should be empty)
        creds = creator.build_credential_provider_configurations()
        assert creds == []

    def test_validation_missing_target_name(self):
        target_config = {"TargetType": "mcpServer", "McpEndpoint": "https://api.example.com/mcp"}

        creator = MCPServerTargetCreator(target_config, "test-bucket")

        with pytest.raises(ValueError, match="TargetName is required"):
            creator.validate_configuration()

    def test_validation_missing_mcp_endpoint(self):
        target_config = {"TargetName": "test-mcp-server", "TargetType": "mcpServer"}

        creator = MCPServerTargetCreator(target_config, "test-bucket")

        with pytest.raises(ValueError, match="McpEndpoint is required for MCP Server targets"):
            creator.validate_configuration()

    def test_validation_invalid_mcp_endpoint(self):
        target_config = {
            "TargetName": "test-mcp-server",
            "TargetType": "mcpServer",
            "McpEndpoint": "http://api.example.com/mcp",  # HTTP instead of HTTPS
        }

        creator = MCPServerTargetCreator(target_config, "test-bucket")

        with pytest.raises(ValueError, match="McpEndpoint must be a valid HTTPS URL"):
            creator.validate_configuration()

    def test_valid_mcp_endpoints(self):
        valid_endpoints = [
            "https://api.example.com/mcp",
            "https://mcp-server.example.com:8443/api/mcp",
            "https://runtime-abc123.bedrock-agentcore.us-east-1.amazonaws.com/mcp/arn%3Aaws%3Abedrock-agentcore%3Aus-east-1%3A123456789012%3Aruntime%2Ftest-runtime-123",
        ]

        for endpoint in valid_endpoints:
            target_config = {"TargetName": "test-mcp-server", "TargetType": "mcpServer", "McpEndpoint": endpoint}

            creator = MCPServerTargetCreator(target_config, "test-bucket")
            assert creator.validate_configuration() == True

    def test_validation_rejects_localhost(self):
        target_config = {
            "TargetName": "test-mcp-server",
            "TargetType": "mcpServer",
            "McpEndpoint": "https://localhost/mcp",
        }

        creator = MCPServerTargetCreator(target_config, "test-bucket")

        with pytest.raises(ValueError, match="McpEndpoint cannot use localhost or loopback addresses"):
            creator.validate_configuration()

    def test_validation_rejects_loopback_ip(self):
        target_config = {
            "TargetName": "test-mcp-server",
            "TargetType": "mcpServer",
            "McpEndpoint": "https://127.0.0.1/mcp",
        }

        creator = MCPServerTargetCreator(target_config, "test-bucket")

        with pytest.raises(ValueError, match="McpEndpoint cannot use localhost or loopback addresses"):
            creator.validate_configuration()

    def test_validation_rejects_private_ip_10(self):
        target_config = {
            "TargetName": "test-mcp-server",
            "TargetType": "mcpServer",
            "McpEndpoint": "https://10.0.0.1/mcp",
        }

        creator = MCPServerTargetCreator(target_config, "test-bucket")

        with pytest.raises(ValueError, match="McpEndpoint cannot use private IP addresses"):
            creator.validate_configuration()

    def test_validation_rejects_private_ip_192(self):
        target_config = {
            "TargetName": "test-mcp-server",
            "TargetType": "mcpServer",
            "McpEndpoint": "https://192.168.1.1/mcp",
        }

        creator = MCPServerTargetCreator(target_config, "test-bucket")

        with pytest.raises(ValueError, match="McpEndpoint cannot use private IP addresses"):
            creator.validate_configuration()

    def test_validation_rejects_metadata_ip(self):
        target_config = {
            "TargetName": "test-mcp-server",
            "TargetType": "mcpServer",
            "McpEndpoint": "https://169.254.169.254/mcp",
        }

        creator = MCPServerTargetCreator(target_config, "test-bucket")

        with pytest.raises(ValueError, match="McpEndpoint cannot use link-local or metadata addresses"):
            creator.validate_configuration()

    def test_validation_rejects_metadata_hostname(self):
        target_config = {
            "TargetName": "test-mcp-server",
            "TargetType": "mcpServer",
            "McpEndpoint": "https://metadata.google.internal/mcp",
        }

        creator = MCPServerTargetCreator(target_config, "test-bucket")

        with pytest.raises(ValueError, match="McpEndpoint cannot use link-local or metadata addresses"):
            creator.validate_configuration()
