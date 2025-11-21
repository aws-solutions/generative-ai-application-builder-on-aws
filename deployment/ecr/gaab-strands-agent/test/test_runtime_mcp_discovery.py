# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

"""
Unit tests for Runtime MCP tool discovery in MCPToolsLoader
"""

import os
import sys
from unittest.mock import Mock, patch
from urllib.parse import quote

import pytest

# Add src to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "src"))

from gaab_strands_common import MCPToolsLoader
from gaab_strands_common.models import RuntimeMCPParams


class TestRuntimeMCPToolDiscovery:
    """Comprehensive test suite for Runtime MCP tool discovery"""

    @pytest.fixture
    def mock_ddb_helper(self):
        """Create mock DynamoDB helper"""
        return Mock()

    @pytest.fixture
    def loader(self):
        """Create MCPToolsLoader instance with mocked dependencies"""
        return MCPToolsLoader("us-east-1")

    @pytest.fixture
    def runtime_url(self):
        """Sample Runtime MCP URL"""
        return "https://bedrock-agentcore.us-east-1.amazonaws.com/runtimes/arn%3Aaws%3Abedrock-agent%3Aus-east-1%3A123456789%3Aagent%2Ftest-agent/invocations?qualifier=DEFAULT"

    def test_agent_arn_url_encoding(self):
        """Test AgentARN URL encoding (: to %3A, / to %2F)"""
        agent_arn = "arn:aws:bedrock-agent:us-east-1:123456789:agent/test-agent"
        encoded_arn = quote(agent_arn, safe="")

        # Verify colons are encoded
        assert ":" not in encoded_arn
        assert "%3A" in encoded_arn

        # Verify slashes are encoded
        assert "/" not in encoded_arn
        assert "%2F" in encoded_arn

        # Verify the full encoding
        expected = "arn%3Aaws%3Abedrock-agent%3Aus-east-1%3A123456789%3Aagent%2Ftest-agent"
        assert encoded_arn == expected

    def test_agentcore_runtime_url_construction(self, loader):
        """Test AgentCore Runtime URL construction"""
        agent_arn = "arn:aws:bedrock-agent:us-east-1:123456789:agent/test-agent"
        encoded_arn = quote(agent_arn, safe="")
        runtime_url = f"https://bedrock-agentcore.{loader.region}.amazonaws.com/runtimes/{encoded_arn}/invocations?qualifier=DEFAULT"

        # Verify URL structure
        assert runtime_url.startswith("https://bedrock-agentcore.us-east-1.amazonaws.com/runtimes/")
        assert "/invocations?qualifier=DEFAULT" in runtime_url
        assert encoded_arn in runtime_url

        # Verify full URL
        expected_url = "https://bedrock-agentcore.us-east-1.amazonaws.com/runtimes/arn%3Aaws%3Abedrock-agent%3Aus-east-1%3A123456789%3Aagent%2Ftest-agent/invocations?qualifier=DEFAULT"
        assert runtime_url == expected_url

    def test_m2m_authentication_for_runtime(self, loader, runtime_url):
        """Test M2M authentication for Runtime servers"""
        with (
            patch("strands.tools.mcp.MCPClient") as mock_mcp_client_class,
            patch("mcp.client.streamable_http.streamablehttp_client"),
            patch("bedrock_agentcore.identity.auth.requires_access_token") as mock_decorator,
        ):

            mock_client_instance = Mock()
            mock_client_instance.list_tools_sync.return_value = []
            mock_mcp_client_class.return_value = mock_client_instance

            def decorator_side_effect(*args, **kwargs):
                def wrapper(func):
                    def inner(access_token=None):
                        return func(access_token="test-m2m-token")

                    return inner

                return wrapper

            mock_decorator.side_effect = decorator_side_effect

            loader._discover_runtime_tools("TestRuntime", runtime_url)

            # Verify M2M decorator was called with correct parameters
            mock_decorator.assert_called_once()
            call_kwargs = mock_decorator.call_args[1]
            assert call_kwargs["auth_flow"] == "M2M"
            assert call_kwargs["scopes"] == []

    def test_mcp_client_creation_with_runtime_url(self, loader, runtime_url):
        """Test MCPClient creation with Runtime URL and Authorization header"""
        with (
            patch("strands.tools.mcp.MCPClient") as mock_mcp_client_class,
            patch("mcp.client.streamable_http.streamablehttp_client") as mock_streamablehttp,
            patch("bedrock_agentcore.identity.auth.requires_access_token") as mock_decorator,
        ):

            mock_client_instance = Mock()
            mock_client_instance.list_tools_sync.return_value = []
            mock_mcp_client_class.return_value = mock_client_instance

            def decorator_side_effect(*args, **kwargs):
                def wrapper(func):
                    def inner(access_token=None):
                        return func(access_token="test-token-123")

                    return inner

                return wrapper

            mock_decorator.side_effect = decorator_side_effect

            loader._discover_runtime_tools("TestRuntime", runtime_url)

            # Verify MCPClient was created
            assert mock_mcp_client_class.called

            # Verify the client factory function was passed
            client_factory = mock_mcp_client_class.call_args[0][0]
            assert callable(client_factory)

            # Call the factory to verify it creates streamablehttp_client correctly
            client_factory()

            # Verify streamablehttp_client was called with correct URL and headers
            assert mock_streamablehttp.called
            call_args = mock_streamablehttp.call_args

            # Check URL
            url = call_args[0][0]
            assert "bedrock-agentcore.us-east-1.amazonaws.com" in url
            assert "/runtimes/" in url
            assert "/invocations?qualifier=DEFAULT" in url

            # Check Authorization header
            headers = call_args[1]["headers"]
            assert "Authorization" in headers
            assert headers["Authorization"] == "Bearer test-token-123"

    def test_error_handling_invalid_url(self, loader):
        """Test error handling for invalid URL"""
        invalid_url = ""

        result = loader._discover_runtime_tools("TestRuntime", invalid_url)

        assert result == []

    def test_error_handling_connection_failures(self, loader, runtime_url):
        """Test error handling for connection failures"""
        with (
            patch("strands.tools.mcp.MCPClient") as mock_mcp_client_class,
            patch("mcp.client.streamable_http.streamablehttp_client"),
            patch("bedrock_agentcore.identity.auth.requires_access_token") as mock_decorator,
        ):

            mock_client_instance = Mock()
            mock_client_instance.start.side_effect = ConnectionError("Connection refused")
            mock_mcp_client_class.return_value = mock_client_instance

            def decorator_side_effect(*args, **kwargs):
                def wrapper(func):
                    def inner(access_token=None):
                        return func(access_token="test-token")

                    return inner

                return wrapper

            mock_decorator.side_effect = decorator_side_effect

            result = loader._discover_runtime_tools("TestRuntime", runtime_url)

            assert result == []

    def test_retry_logic_for_rate_limiting(self, loader, runtime_url):
        """Test retry logic for rate limiting (429 errors)"""
        with (
            patch("strands.tools.mcp.MCPClient") as mock_mcp_client_class,
            patch("mcp.client.streamable_http.streamablehttp_client"),
            patch("bedrock_agentcore.identity.auth.requires_access_token") as mock_decorator,
            patch("time.sleep") as mock_sleep,
        ):

            mock_client_instance = Mock()
            mock_client_instance.start.side_effect = [
                Exception("429 Too Many Requests"),
                Exception("429 Too Many Requests"),
                None,
            ]
            mock_client_instance.list_tools_sync.return_value = [Mock(name="test_tool")]
            mock_mcp_client_class.return_value = mock_client_instance

            def decorator_side_effect(*args, **kwargs):
                def wrapper(func):
                    def inner(access_token=None):
                        return func(access_token="test-token")

                    return inner

                return wrapper

            mock_decorator.side_effect = decorator_side_effect

            result = loader._discover_runtime_tools("TestRuntime", runtime_url)

            # Verify retries occurred
            assert mock_client_instance.start.call_count == 3

            # Verify exponential backoff
            assert mock_sleep.call_count == 2
            assert mock_sleep.call_args_list[0][0][0] == 2
            assert mock_sleep.call_args_list[1][0][0] == 4

            # Should succeed after retries
            assert len(result) == 1

    def test_retry_logic_max_retries_exceeded(self, loader, runtime_url):
        """Test retry logic when max retries are exceeded"""
        with (
            patch("strands.tools.mcp.MCPClient") as mock_mcp_client_class,
            patch("mcp.client.streamable_http.streamablehttp_client"),
            patch("bedrock_agentcore.identity.auth.requires_access_token") as mock_decorator,
            patch("time.sleep"),
        ):

            mock_client_instance = Mock()
            mock_client_instance.start.side_effect = Exception("429 Too Many Requests")
            mock_mcp_client_class.return_value = mock_client_instance

            def decorator_side_effect(*args, **kwargs):
                def wrapper(func):
                    def inner(access_token=None):
                        return func(access_token="test-token")

                    return inner

                return wrapper

            mock_decorator.side_effect = decorator_side_effect

            result = loader._discover_runtime_tools("TestRuntime", runtime_url)

            # Verify max retries
            assert mock_client_instance.start.call_count == 3

            # Should return empty list
            assert result == []

    def test_successful_tool_discovery(self, loader, runtime_url):
        """Test successful tool discovery from Runtime MCP server"""
        with (
            patch("strands.tools.mcp.MCPClient") as mock_mcp_client_class,
            patch("mcp.client.streamable_http.streamablehttp_client"),
            patch("bedrock_agentcore.identity.auth.requires_access_token") as mock_decorator,
        ):

            mock_tool1 = Mock()
            mock_tool1.name = "runtime_tool_1"
            mock_tool2 = Mock()
            mock_tool2.name = "runtime_tool_2"

            mock_client_instance = Mock()
            mock_client_instance.list_tools_sync.return_value = [mock_tool1, mock_tool2]
            mock_mcp_client_class.return_value = mock_client_instance

            def decorator_side_effect(*args, **kwargs):
                def wrapper(func):
                    def inner(access_token=None):
                        return func(access_token="test-token")

                    return inner

                return wrapper

            mock_decorator.side_effect = decorator_side_effect

            result = loader._discover_runtime_tools("TestRuntime", runtime_url)

            # Verify tools were returned
            assert len(result) == 2
            assert result[0].name == "runtime_tool_1"
            assert result[1].name == "runtime_tool_2"

            # Verify client was stored
            assert len(loader._active_mcp_clients) == 1
            assert loader._active_mcp_clients[0] == mock_client_instance

    def test_empty_tools_list(self, loader, runtime_url):
        """Test handling of empty tools list from Runtime server"""
        with (
            patch("strands.tools.mcp.MCPClient") as mock_mcp_client_class,
            patch("mcp.client.streamable_http.streamablehttp_client"),
            patch("bedrock_agentcore.identity.auth.requires_access_token") as mock_decorator,
        ):

            mock_client_instance = Mock()
            mock_client_instance.list_tools_sync.return_value = []
            mock_mcp_client_class.return_value = mock_client_instance

            def decorator_side_effect(*args, **kwargs):
                def wrapper(func):
                    def inner(access_token=None):
                        return func(access_token="test-token")

                    return inner

                return wrapper

            mock_decorator.side_effect = decorator_side_effect

            result = loader._discover_runtime_tools("TestRuntime", runtime_url)

            assert result == []

    def test_integration_with_configurable_agent(self, loader):
        """Test integration of Runtime MCP tools with ConfigurableAgent"""
        mcp_server = {
            "use_case_id": "runtime-mcp-1",
            "url": "https://bedrock-agentcore.us-east-1.amazonaws.com/runtimes/test/invocations",
            "type": "runtime",
        }

        mock_tool = Mock()
        mock_tool.name = "integration_test_tool"
        loader._discover_runtime_tools = Mock(return_value=[mock_tool])

        result = loader.load_tools([mcp_server])

        assert len(result) == 1
        assert result[0].name == "integration_test_tool"

        # Verify the runtime discovery method was called
        loader._discover_runtime_tools.assert_called_once()

    def test_runtime_with_special_characters_in_url(self, loader):
        """Test Runtime discovery with special characters in URL"""
        # URL with encoded special characters
        special_url = "https://bedrock-agentcore.us-east-1.amazonaws.com/runtimes/arn%3Aaws%3Abedrock-agent%3Aus-east-1%3A123%3Aagent%2Ftest-agent_v2.0/invocations"

        with (
            patch("strands.tools.mcp.MCPClient") as mock_mcp_client_class,
            patch("mcp.client.streamable_http.streamablehttp_client") as mock_streamablehttp,
            patch("bedrock_agentcore.identity.auth.requires_access_token") as mock_decorator,
        ):

            mock_client_instance = Mock()
            mock_client_instance.list_tools_sync.return_value = []
            mock_mcp_client_class.return_value = mock_client_instance

            def decorator_side_effect(*args, **kwargs):
                def wrapper(func):
                    def inner(access_token=None):
                        return func(access_token="test-token")

                    return inner

                return wrapper

            mock_decorator.side_effect = decorator_side_effect

            loader._discover_runtime_tools("TestRuntime", special_url)

            # Verify URL was used directly
            client_factory = mock_mcp_client_class.call_args[0][0]
            client_factory()

            url = mock_streamablehttp.call_args[0][0]
            # Verify URL matches what was provided
            assert url == special_url

    def test_runtime_different_regions(self):
        """Test Runtime discovery works with different AWS regions"""
        regions = ["us-east-1", "us-west-2", "eu-west-1", "ap-southeast-1"]

        for region in regions:
            loader = MCPToolsLoader(region)

            runtime_url = (
                f"https://bedrock-agentcore.{region}.amazonaws.com/runtimes/test/invocations"
            )

            with (
                patch("strands.tools.mcp.MCPClient") as mock_mcp_client_class,
                patch("mcp.client.streamable_http.streamablehttp_client") as mock_streamablehttp,
                patch("bedrock_agentcore.identity.auth.requires_access_token") as mock_decorator,
            ):

                mock_client_instance = Mock()
                mock_client_instance.list_tools_sync.return_value = []
                mock_mcp_client_class.return_value = mock_client_instance

                def decorator_side_effect(*args, **kwargs):
                    def wrapper(func):
                        def inner(access_token=None):
                            return func(access_token="test-token")

                        return inner

                    return wrapper

                mock_decorator.side_effect = decorator_side_effect

                loader._discover_runtime_tools("TestRuntime", runtime_url)

                # Verify URL contains correct region
                client_factory = mock_mcp_client_class.call_args[0][0]
                client_factory()

                url = mock_streamablehttp.call_args[0][0]
                assert f"bedrock-agentcore.{region}.amazonaws.com" in url


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
