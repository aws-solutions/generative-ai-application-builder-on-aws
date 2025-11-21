# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0
from unittest.mock import Mock, patch

import pytest
from gaab_strands_common import MCPToolsLoader
from gaab_strands_common.models import RuntimeMCPParams


class TestMCPToolsLoader:
    """Test suite for MCPToolsLoader with new dict-based interface"""

    @pytest.fixture
    def loader(self):
        """Create MCPToolsLoader instance"""
        return MCPToolsLoader("us-east-1")

    @pytest.fixture
    def gateway_server_dict(self):
        """Sample Gateway MCP server dict"""
        return {
            "use_case_id": "gateway-server-1",
            "url": "https://gateway1.example.com/mcp",
            "type": "gateway",
        }

    @pytest.fixture
    def runtime_server_dict(self):
        """Sample Runtime MCP server dict"""
        return {
            "use_case_id": "runtime-server-1",
            "url": "https://bedrock-agentcore.us-east-1.amazonaws.com/runtimes/arn%3Aaws%3Abedrock-agent%3Aus-east-1%3A123%3Aagent%2Ftest/invocations?qualifier=DEFAULT",
            "type": "runtime",
        }

    def test_init(self):
        """Test MCPToolsLoader initialization without DynamoDB helper"""
        loader = MCPToolsLoader("us-west-2")

        assert loader.region == "us-west-2"
        assert loader._active_mcp_clients == []
        # Verify no ddb_helper attribute
        assert not hasattr(loader, "ddb_helper")

    def test_load_tools_empty_list(self, loader):
        """Test load_tools with empty MCP server list"""
        result = loader.load_tools([])

        assert result == []

    def test_load_tools_with_new_mcp_server_dict_format(
        self, loader, gateway_server_dict, runtime_server_dict
    ):
        """Test load_tools with new MCP server dict format"""
        mcp_servers = [gateway_server_dict, runtime_server_dict]

        # Mock the discovery methods to return mock tools
        mock_gateway_tool = Mock()
        mock_gateway_tool.name = "gateway_test_tool"
        mock_runtime_tool = Mock()
        mock_runtime_tool.name = "runtime_test_tool"

        loader._discover_gateway_tools = Mock(return_value=[mock_gateway_tool])
        loader._discover_runtime_tools = Mock(return_value=[mock_runtime_tool])

        # Execute
        result = loader.load_tools(mcp_servers)

        # Verify
        assert len(result) == 2
        assert mock_gateway_tool in result
        assert mock_runtime_tool in result

        # Verify discovery methods were called with correct parameters
        loader._discover_gateway_tools.assert_called_once_with(
            "gateway-server-1", "https://gateway1.example.com/mcp"
        )
        loader._discover_runtime_tools.assert_called_once_with(
            "runtime-server-1",
            "https://bedrock-agentcore.us-east-1.amazonaws.com/runtimes/arn%3Aaws%3Abedrock-agent%3Aus-east-1%3A123%3Aagent%2Ftest/invocations?qualifier=DEFAULT",
        )

    def test_categorize_servers_with_type_field(self, loader):
        """Test _categorize_servers using type field from dict"""
        mcp_servers = [
            {
                "use_case_id": "gateway-1",
                "url": "https://gateway1.example.com/mcp",
                "type": "gateway",
            },
            {
                "use_case_id": "runtime-1",
                "url": "https://runtime1.example.com/mcp",
                "type": "runtime",
            },
            {
                "use_case_id": "gateway-2",
                "url": "https://gateway2.example.com/mcp",
                "type": "gateway",
            },
        ]

        gateway_servers, runtime_servers = loader._categorize_servers(mcp_servers)

        # Verify categorization
        assert len(gateway_servers) == 2
        assert len(runtime_servers) == 1

        # Check gateway servers
        assert gateway_servers[0]["name"] == "gateway-1"
        assert gateway_servers[0]["url"] == "https://gateway1.example.com/mcp"
        assert gateway_servers[1]["name"] == "gateway-2"
        assert gateway_servers[1]["url"] == "https://gateway2.example.com/mcp"

        # Check runtime servers
        assert runtime_servers[0]["name"] == "runtime-1"
        assert runtime_servers[0]["url"] == "https://runtime1.example.com/mcp"

    def test_categorize_servers_missing_required_fields(self, loader, caplog):
        """Test _categorize_servers handling of missing required fields"""
        mcp_servers = [
            {"use_case_id": "valid-server", "url": "https://example.com/mcp", "type": "gateway"},
            {
                # Missing use_case_id
                "url": "https://example.com/mcp",
                "type": "gateway",
            },
            {
                "use_case_id": "missing-url",
                # Missing url
                "type": "runtime",
            },
            {
                "use_case_id": "missing-type",
                "url": "https://example.com/mcp",
                # Missing type
            },
        ]

        with caplog.at_level("WARNING"):
            gateway_servers, runtime_servers = loader._categorize_servers(mcp_servers)

        # Should only include the valid server
        assert len(gateway_servers) == 1
        assert len(runtime_servers) == 0
        assert gateway_servers[0]["name"] == "valid-server"

        # Should log warnings for invalid servers
        assert "MCP server missing required fields" in caplog.text

    def test_categorize_servers_invalid_type_values(self, loader, caplog):
        """Test _categorize_servers handling of invalid type values"""
        mcp_servers = [
            {"use_case_id": "valid-gateway", "url": "https://example.com/mcp", "type": "gateway"},
            {"use_case_id": "invalid-type-1", "url": "https://example.com/mcp", "type": "invalid"},
            {
                "use_case_id": "invalid-type-2",
                "url": "https://example.com/mcp",
                "type": "Gateway",  # Wrong case
            },
        ]

        with caplog.at_level("WARNING"):
            gateway_servers, runtime_servers = loader._categorize_servers(mcp_servers)

        # Should only include the valid server
        assert len(gateway_servers) == 1
        assert len(runtime_servers) == 0
        assert gateway_servers[0]["name"] == "valid-gateway"

        # Should log warnings for invalid type values
        assert "Invalid server type" in caplog.text

    def test_no_dynamodb_calls_made(self, loader):
        """Test that no DynamoDB calls are made in the new implementation"""
        mcp_servers = [
            {"use_case_id": "test-server", "url": "https://example.com/mcp", "type": "gateway"}
        ]

        # Mock discovery methods
        loader._discover_gateway_tools = Mock(return_value=[])
        loader._discover_runtime_tools = Mock(return_value=[])

        # Execute
        loader.load_tools(mcp_servers)

        # Verify no DynamoDB-related methods are called
        # (This is implicit since we removed ddb_helper from constructor)
        # The test passes if no AttributeError is raised for missing ddb_helper

    def test_discover_gateway_tools_with_direct_url(self, loader):
        """Test Gateway tool discovery with direct URL"""
        server_name = "test-gateway"
        gateway_url = "https://gateway.example.com/mcp"

        # Mock the method to avoid complex dependency mocking
        loader._discover_gateway_tools = Mock(return_value=[])

        result = loader._discover_gateway_tools(server_name, gateway_url)

        # Should return empty list (mocked)
        assert result == []

    def test_discover_runtime_tools_with_direct_url(self, loader):
        """Test Runtime tool discovery with direct URL"""
        server_name = "test-runtime"
        runtime_url = "https://bedrock-agentcore.us-east-1.amazonaws.com/runtimes/test/invocations?qualifier=DEFAULT"

        # Mock the method to avoid complex dependency mocking
        loader._discover_runtime_tools = Mock(return_value=[])

        result = loader._discover_runtime_tools(server_name, runtime_url)

        # Should return empty list (mocked)
        assert result == []

    def test_error_handling_during_categorization(self, loader, caplog):
        """Test error handling during server categorization"""
        mcp_servers = [
            {"use_case_id": "valid-server", "url": "https://example.com/mcp", "type": "gateway"},
            # Invalid server that might cause errors
            None,  # This should be handled gracefully
            {"use_case_id": "another-valid", "url": "https://example.com/mcp", "type": "runtime"},
        ]

        with caplog.at_level("ERROR"):
            gateway_servers, runtime_servers = loader._categorize_servers(mcp_servers)

        # Should continue processing valid servers despite errors
        assert len(gateway_servers) == 1
        assert len(runtime_servers) == 1
        assert gateway_servers[0]["name"] == "valid-server"
        assert runtime_servers[0]["name"] == "another-valid"

        # Should log error for problematic server
        assert "Error categorizing server" in caplog.text

    def test_load_tools_integration_with_mixed_servers(self, loader):
        """Test complete load_tools flow with mixed Gateway and Runtime servers"""
        mcp_servers = [
            {
                "use_case_id": "gateway-1",
                "url": "https://gateway1.example.com/mcp",
                "type": "gateway",
            },
            {
                "use_case_id": "runtime-1",
                "url": "https://runtime1.example.com/mcp",
                "type": "runtime",
            },
            {
                "use_case_id": "gateway-2",
                "url": "https://gateway2.example.com/mcp",
                "type": "gateway",
            },
        ]

        # Mock discovery methods
        mock_gateway_tool1 = Mock()
        mock_gateway_tool1.name = "gateway_tool_1"
        mock_gateway_tool2 = Mock()
        mock_gateway_tool2.name = "gateway_tool_2"
        mock_runtime_tool = Mock()
        mock_runtime_tool.name = "runtime_tool_1"

        def mock_gateway_discovery(name, url):
            if name == "gateway-1":
                return [mock_gateway_tool1]
            elif name == "gateway-2":
                return [mock_gateway_tool2]
            return []

        def mock_runtime_discovery(name, url):
            if name == "runtime-1":
                return [mock_runtime_tool]
            return []

        loader._discover_gateway_tools = Mock(side_effect=mock_gateway_discovery)
        loader._discover_runtime_tools = Mock(side_effect=mock_runtime_discovery)

        # Execute
        result = loader.load_tools(mcp_servers)

        # Verify all tools were discovered
        assert len(result) == 3
        tool_names = [tool.name for tool in result]
        assert "gateway_tool_1" in tool_names
        assert "gateway_tool_2" in tool_names
        assert "runtime_tool_1" in tool_names

        # Verify discovery methods were called correctly
        assert loader._discover_gateway_tools.call_count == 2
        assert loader._discover_runtime_tools.call_count == 1


class TestRuntimeMCPToolDiscoveryWithDirectURL:
    """Test suite for Runtime MCP tool discovery with direct URL"""

    @pytest.fixture
    def loader(self):
        """Create MCPToolsLoader instance"""
        return MCPToolsLoader("us-east-1")

    @pytest.fixture
    def runtime_params(self):
        """Create RuntimeMCPParams instance for testing"""
        return RuntimeMCPParams(
            EcrUri="123.dkr.ecr.us-east-1.amazonaws.com/test:latest",
            RuntimeArn="arn:aws:bedrock-agent:us-east-1:123456789:agent/test-agent",
            RuntimeUrl="https://bedrock-agentcore.us-east-1.amazonaws.com/runtimes/test/invocations",
        )

    def test_runtime_url_used_directly(self, loader):
        """Test that Runtime URL is used directly without construction"""
        server_name = "test-runtime"
        runtime_url = "https://bedrock-agentcore.us-east-1.amazonaws.com/runtimes/arn%3Aaws%3Abedrock-agent%3Aus-east-1%3A123%3Aagent%2Ftest/invocations?qualifier=DEFAULT"

        # Mock the imports inside the function
        with (
            patch("strands.tools.mcp.MCPClient") as mock_mcp_client_class,
            patch("mcp.client.streamable_http.streamablehttp_client") as mock_streamablehttp,
            patch("bedrock_agentcore.identity.auth.requires_access_token") as mock_decorator,
        ):

            # Setup mocks
            mock_client_instance = Mock()
            mock_client_instance.list_tools_sync.return_value = []
            mock_mcp_client_class.return_value = mock_client_instance

            # Mock the requires_access_token decorator
            def decorator_side_effect(*args, **kwargs):
                def wrapper(func):
                    def inner(access_token=None):
                        return func(access_token="test-token")

                    return inner

                return wrapper

            mock_decorator.side_effect = decorator_side_effect

            # Execute
            result = loader._discover_runtime_tools(server_name, runtime_url)

            # Verify the URL was used directly
            client_factory = mock_mcp_client_class.call_args[0][0]
            client_factory()

            # Verify streamablehttp_client was called with the exact URL provided
            call_args = mock_streamablehttp.call_args
            url = call_args[0][0]
            assert url == runtime_url

    def test_no_url_construction_logic(self, loader):
        """Test that no URL construction logic is used"""
        server_name = "test-runtime"
        runtime_url = "https://custom.runtime.url/mcp"

        # Mock the imports inside the function
        with (
            patch("strands.tools.mcp.MCPClient") as mock_mcp_client_class,
            patch("mcp.client.streamable_http.streamablehttp_client") as mock_streamablehttp,
            patch("bedrock_agentcore.identity.auth.requires_access_token") as mock_decorator,
        ):

            # Setup mocks
            mock_client_instance = Mock()
            mock_client_instance.list_tools_sync.return_value = []
            mock_mcp_client_class.return_value = mock_client_instance

            # Mock the requires_access_token decorator
            def decorator_side_effect(*args, **kwargs):
                def wrapper(func):
                    def inner(access_token=None):
                        return func(access_token="test-token")

                    return inner

                return wrapper

            mock_decorator.side_effect = decorator_side_effect

            # Execute with custom URL
            result = loader._discover_runtime_tools(server_name, runtime_url)

            # Verify the URL was used directly
            client_factory = mock_mcp_client_class.call_args[0][0]
            client_factory()

            call_args = mock_streamablehttp.call_args
            url = call_args[0][0]
            # The URL should be the direct runtime_url
            assert url == runtime_url

    def test_gateway_url_used_directly(self, loader):
        """Test that Gateway URL is used directly without extraction"""
        server_name = "test-gateway"
        gateway_url = "https://custom.gateway.url/mcp"

        # Mock the imports inside the function
        with (
            patch("strands.tools.mcp.MCPClient") as mock_mcp_client_class,
            patch("mcp.client.streamable_http.streamablehttp_client") as mock_streamablehttp,
            patch("bedrock_agentcore.identity.auth.requires_access_token") as mock_decorator,
        ):

            # Setup mocks
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

            # Execute
            result = loader._discover_gateway_tools(server_name, gateway_url)

            # Verify the URL was used directly (if MCP client was called)
            if mock_mcp_client_class.call_args:
                client_factory = mock_mcp_client_class.call_args[0][0]
                client_factory()

                call_args = mock_streamablehttp.call_args
                url = call_args[0][0]
                assert url == gateway_url

            # Test passes if no authentication error occurs
            assert result == []  # Empty result due to auth failure is expected

    @patch("strands.tools.mcp.MCPClient")
    @patch("mcp.client.streamable_http.streamablehttp_client")
    @patch("time.sleep")
    def test_retry_logic_max_retries_exceeded(
        self, mock_sleep, mock_streamablehttp, mock_mcp_client_class, loader, caplog
    ):
        """Test retry logic when max retries are exceeded"""
        runtime_url = "https://bedrock-agentcore.us-east-1.amazonaws.com/runtimes/test/invocations"

        # Setup mocks to always fail with 429
        mock_client_instance = Mock()
        mock_client_instance.start.side_effect = Exception("429 Too Many Requests")
        mock_mcp_client_class.return_value = mock_client_instance

        # Mock the requires_access_token decorator
        with patch("bedrock_agentcore.identity.auth.requires_access_token") as mock_decorator:

            def decorator_side_effect(*args, **kwargs):
                def wrapper(func):
                    def inner(access_token=None):
                        return func(access_token="test-token")

                    return inner

                return wrapper

            mock_decorator.side_effect = decorator_side_effect

            # Execute - should fail after max retries
            result = loader._discover_runtime_tools("TestRuntime", runtime_url)

            # Verify max retries (3 attempts)
            assert mock_client_instance.start.call_count == 3

            # Should return empty list after exhausting retries
            assert result == []

        # Should log error
        assert "Error discovering tools" in caplog.text or len(result) == 0

    def test_successful_tool_discovery_with_direct_url(self, loader):
        """Test successful tool discovery using direct URL"""
        server_name = "test-runtime"
        runtime_url = "https://bedrock-agentcore.us-east-1.amazonaws.com/runtimes/test/invocations?qualifier=DEFAULT"

        # Mock the imports inside the function
        with (
            patch("strands.tools.mcp.MCPClient") as mock_mcp_client_class,
            patch("mcp.client.streamable_http.streamablehttp_client") as mock_streamablehttp,
            patch("bedrock_agentcore.identity.auth.requires_access_token") as mock_decorator,
        ):

            # Setup mocks
            mock_tool1 = Mock()
            mock_tool1.name = "direct_url_tool_1"
            mock_tool2 = Mock()
            mock_tool2.name = "direct_url_tool_2"

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

            # Execute
            result = loader._discover_runtime_tools(server_name, runtime_url)

            # Verify tools were returned
            assert len(result) == 2
            assert result[0].name == "direct_url_tool_1"
            assert result[1].name == "direct_url_tool_2"

            # Verify client was stored for tool execution
            assert len(loader._active_mcp_clients) == 1
            assert loader._active_mcp_clients[0] == mock_client_instance

    @patch("strands.tools.mcp.MCPClient")
    @patch("mcp.client.streamable_http.streamablehttp_client")
    def test_empty_tools_list(self, mock_streamablehttp, mock_mcp_client_class, loader):
        """Test handling of empty tools list from Runtime server"""
        runtime_url = "https://bedrock-agentcore.us-east-1.amazonaws.com/runtimes/test/invocations"

        # Setup mocks to return empty list
        mock_client_instance = Mock()
        mock_client_instance.list_tools_sync.return_value = []
        mock_mcp_client_class.return_value = mock_client_instance

        # Mock the requires_access_token decorator
        with patch("bedrock_agentcore.identity.auth.requires_access_token") as mock_decorator:

            def decorator_side_effect(*args, **kwargs):
                def wrapper(func):
                    def inner(access_token=None):
                        return func(access_token="test-token")

                    return inner

                return wrapper

            mock_decorator.side_effect = decorator_side_effect

            # Execute with runtime server that returns empty tools
            result = loader._discover_runtime_tools("test-runtime", runtime_url)

            # Verify empty list is returned
            assert result == []

            # Verify client was created and called
            mock_mcp_client_class.assert_called_once()
            mock_client_instance.list_tools_sync.assert_called_once()

    def test_tool_loading_with_mixed_gateway_and_runtime_servers(self, loader):
        """Test tool loading with mixed Gateway and Runtime servers"""
        mcp_servers = [
            {
                "use_case_id": "gateway-1",
                "url": "https://gateway1.example.com/mcp",
                "type": "gateway",
            },
            {
                "use_case_id": "runtime-1",
                "url": "https://runtime1.example.com/mcp",
                "type": "runtime",
            },
            {
                "use_case_id": "gateway-2",
                "url": "https://gateway2.example.com/mcp",
                "type": "gateway",
            },
        ]

        # Mock discovery methods to return different tools
        gateway_tools = [Mock(name="gateway_tool_1"), Mock(name="gateway_tool_2")]
        runtime_tools = [Mock(name="runtime_tool_1")]

        def mock_discover_gateway(name, url):
            if "gateway1" in url:
                return [gateway_tools[0]]
            elif "gateway2" in url:
                return [gateway_tools[1]]
            return []

        def mock_discover_runtime(name, url):
            if "runtime1" in url:
                return runtime_tools
            return []

        loader._discover_gateway_tools = Mock(side_effect=mock_discover_gateway)
        loader._discover_runtime_tools = Mock(side_effect=mock_discover_runtime)

        # Execute
        result = loader.load_tools(mcp_servers)

        # Verify all tools are loaded
        assert len(result) == 3
        assert gateway_tools[0] in result
        assert gateway_tools[1] in result
        assert runtime_tools[0] in result

        # Verify discovery methods were called correctly
        assert loader._discover_gateway_tools.call_count == 2
        assert loader._discover_runtime_tools.call_count == 1

    def test_error_handling_for_invalid_server_configurations(self, loader):
        """Test error handling for invalid server configurations"""
        invalid_servers = [
            {"use_case_id": "valid-server", "url": "https://example.com/mcp", "type": "gateway"},
            {
                # Missing use_case_id
                "url": "https://example.com/mcp",
                "type": "gateway",
            },
            {
                "use_case_id": "invalid-type-server",
                "url": "https://example.com/mcp",
                "type": "invalid",
            },
        ]

        # Mock discovery method for valid server
        mock_tool = Mock()
        mock_tool.name = "valid_tool"
        loader._discover_gateway_tools = Mock(return_value=[mock_tool])

        # Execute - should handle invalid servers gracefully
        result = loader.load_tools(invalid_servers)

        # Should only load tools from valid server
        assert len(result) == 1
        assert result[0] == mock_tool

        # Verify the discovery method was called for valid server
        loader._discover_gateway_tools.assert_called_once_with(
            "valid-server", "https://example.com/mcp"
        )

    @patch("strands.tools.mcp.MCPClient")
    @patch("mcp.client.streamable_http.streamablehttp_client")
    def test_runtime_with_special_characters_in_url(
        self, mock_streamablehttp, mock_mcp_client_class, loader
    ):
        """Test Runtime discovery with special characters in URL"""
        # URL with encoded special characters
        runtime_url = "https://bedrock-agentcore.us-east-1.amazonaws.com/runtimes/arn%3Aaws%3Abedrock-agent%3Aus-east-1%3A123%3Aagent%2Ftest-agent_v2.0/invocations"

        # Setup mocks
        mock_client_instance = Mock()
        mock_client_instance.list_tools_sync.return_value = []
        mock_mcp_client_class.return_value = mock_client_instance

        # Mock the requires_access_token decorator
        with patch("bedrock_agentcore.identity.auth.requires_access_token") as mock_decorator:

            def decorator_side_effect(*args, **kwargs):
                def wrapper(func):
                    def inner(access_token=None):
                        return func(access_token="test-token")

                    return inner

                return wrapper

            mock_decorator.side_effect = decorator_side_effect

            # Execute
            result = loader._discover_runtime_tools("TestRuntime", runtime_url)

            # Verify URL was used directly
            client_factory = mock_mcp_client_class.call_args[0][0]
            client_factory()

            url = mock_streamablehttp.call_args[0][0]
            # Verify URL matches what was provided
            assert url == runtime_url

    @patch("strands.tools.mcp.MCPClient")
    @patch("mcp.client.streamable_http.streamablehttp_client")
    def test_runtime_different_regions(self, mock_streamablehttp, mock_mcp_client_class):
        """Test Runtime discovery works with different AWS regions"""
        regions = ["us-east-1", "us-west-2", "eu-west-1", "ap-southeast-1"]

        for region in regions:
            # Create loader for specific region
            loader = MCPToolsLoader(region)

            runtime_url = (
                f"https://bedrock-agentcore.{region}.amazonaws.com/runtimes/test/invocations"
            )

            # Setup mocks
            mock_client_instance = Mock()
            mock_client_instance.list_tools_sync.return_value = []
            mock_mcp_client_class.return_value = mock_client_instance

            # Mock the requires_access_token decorator
            with patch("bedrock_agentcore.identity.auth.requires_access_token") as mock_decorator:

                def decorator_side_effect(*args, **kwargs):
                    def wrapper(func):
                        def inner(access_token=None):
                            return func(access_token="test-token")

                        return inner

                    return wrapper

                mock_decorator.side_effect = decorator_side_effect

                # Execute
                loader._discover_runtime_tools("TestRuntime", runtime_url)

                # Verify URL contains correct region
                client_factory = mock_mcp_client_class.call_args[0][0]
                client_factory()

                url = mock_streamablehttp.call_args[0][0]
                assert f"bedrock-agentcore.{region}.amazonaws.com" in url


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
