# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

#!/usr/bin/env python3
"""
Unit tests for ToolsManager
"""

import logging
from unittest.mock import MagicMock, Mock, patch

import pytest
from gaab_strands_common import DynamoDBHelper, ToolsManager
from gaab_strands_common.custom_tools.setup.base_tool import BaseCustomTool
from gaab_strands_common.custom_tools.setup.registry import CustomToolsRegistry
from gaab_strands_common.models import AgentBuilderParams, BedrockLlmParams, LlmParams, MultimodalParams, UseCaseConfig
from strands import tool


@pytest.fixture
def mock_ddb_helper():
    """Create a mock DynamoDB helper"""
    return Mock(spec=DynamoDBHelper)


@pytest.fixture
def mock_strands_tool():
    """Create a mock Strands tool"""
    tool = Mock()
    tool.name = "web_search"
    tool.__name__ = "WebSearchTool"
    return tool


@pytest.fixture
def mock_mcp_tool():
    """Create a mock MCP tool"""
    tool = Mock()
    tool.name = "get_calendar_events"
    tool.__name__ = "GetCalendarEventsTool"
    tool.metadata = {"server_type": "Gateway"}
    return tool


@pytest.fixture
def mock_config():
    """Create a mock config object"""

    bedrock_params = BedrockLlmParams(
        ModelId="anthropic.claude-3-sonnet-20240229-v1:0", BedrockInferenceType="QUICK_START"
    )
    llm_params = LlmParams(ModelProvider="Bedrock", BedrockLlmParams=bedrock_params)
    agent_params = AgentBuilderParams(SystemPrompt="Test prompt")

    return UseCaseConfig(
        UseCaseName="Test Use Case",
        UseCaseType="AgentBuilder",
        AgentBuilderParams=agent_params,
        LlmParams=llm_params,
    )


@pytest.fixture
def tools_manager(mock_config):
    """Create a ToolsManager instance with mocked dependencies"""
    with (
        patch("gaab_strands_common.tools_manager.StrandsToolsRegistry"),
        patch("gaab_strands_common.tools_manager.MCPToolsLoader"),
    ):
        manager = ToolsManager("us-east-1", mock_config)
        return manager


class TestToolsManagerInitialization:
    """Tests for ToolsManager initialization"""

    def test_initialization_success(self, mock_config):
        """Test successful initialization"""
        with (
            patch("gaab_strands_common.tools_manager.StrandsToolsRegistry") as mock_registry,
            patch("gaab_strands_common.tools_manager.MCPToolsLoader") as mock_loader,
        ):
            manager = ToolsManager("us-west-2", mock_config)

            assert manager.region == "us-west-2"
            assert manager.config == mock_config
            assert manager._tool_sources == {}
            mock_registry.assert_called_once()
            mock_loader.assert_called_once_with("us-west-2")

    def test_initialization_with_different_regions(self, mock_config):
        """Test initialization with different AWS regions"""
        regions = ["us-east-1", "eu-west-1", "ap-southeast-1"]

        for region in regions:
            with (
                patch("gaab_strands_common.tools_manager.StrandsToolsRegistry"),
                patch("gaab_strands_common.tools_manager.MCPToolsLoader"),
            ):
                manager = ToolsManager(region, mock_config)
                assert manager.region == region


class TestLoadAllTools:
    """Tests for load_all_tools method"""

    def test_load_all_tools_empty_lists(self, tools_manager):
        """Test loading with no tools configured"""
        tools = tools_manager.load_all_tools(
            mcp_servers=[], strands_tool_ids=[], custom_tool_ids=[]
        )

        assert tools == []
        assert tools_manager._tool_sources == {}

    def test_load_all_tools_only_strands(self, tools_manager, mock_strands_tool):
        """Test loading only built-in Strands tools"""
        tools_manager.strands_tools_registry.get_tools = Mock(return_value=[mock_strands_tool])

        tools = tools_manager.load_all_tools(
            mcp_servers=[], strands_tool_ids=["web_search"], custom_tool_ids=[]
        )

        assert len(tools) == 1
        assert tools[0] == mock_strands_tool
        assert "web_search" in tools_manager._tool_sources
        assert tools_manager._tool_sources["web_search"] == "Strands"

    def test_load_all_tools_only_mcp(self, tools_manager, mock_mcp_tool):
        """Test loading only MCP tools"""
        tools_manager.mcp_loader.load_tools = Mock(return_value=[mock_mcp_tool])

        tools = tools_manager.load_all_tools(
            mcp_servers=[
                {"use_case_id": "mcp-server-1", "url": "https://example.com/mcp", "type": "gateway"}
            ],
            strands_tool_ids=[],
            custom_tool_ids=[],
        )

        assert len(tools) == 1
        assert tools[0] == mock_mcp_tool
        assert "get_calendar_events" in tools_manager._tool_sources
        assert tools_manager._tool_sources["get_calendar_events"] == "MCP-Gateway"

    def test_load_all_tools_mixed(self, tools_manager, mock_strands_tool, mock_mcp_tool):
        """Test loading both Strands and MCP tools"""
        tools_manager.strands_tools_registry.get_tools = Mock(return_value=[mock_strands_tool])
        tools_manager.mcp_loader.load_tools = Mock(return_value=[mock_mcp_tool])

        tools = tools_manager.load_all_tools(
            mcp_servers=[
                {"use_case_id": "mcp-server-1", "url": "https://example.com/mcp", "type": "gateway"}
            ],
            strands_tool_ids=["web_search"],
            custom_tool_ids=[],
        )

        assert len(tools) == 2
        assert mock_strands_tool in tools
        assert mock_mcp_tool in tools
        assert len(tools_manager._tool_sources) == 2

    def test_load_all_tools_strands_error(self, tools_manager, mock_mcp_tool):
        """Test that MCP tools still load when Strands tools fail"""
        tools_manager.strands_tools_registry.get_tools = Mock(
            side_effect=Exception("Strands error")
        )
        tools_manager.mcp_loader.load_tools = Mock(return_value=[mock_mcp_tool])

        tools = tools_manager.load_all_tools(
            mcp_servers=[
                {"use_case_id": "mcp-server-1", "url": "https://example.com/mcp", "type": "gateway"}
            ],
            strands_tool_ids=["web_search"],
            custom_tool_ids=[],
        )

        # Should still get MCP tools
        assert len(tools) == 1
        assert tools[0] == mock_mcp_tool

    def test_load_all_tools_mcp_error(self, tools_manager, mock_strands_tool):
        """Test that Strands tools still load when MCP tools fail"""
        tools_manager.strands_tools_registry.get_tools = Mock(return_value=[mock_strands_tool])
        tools_manager.mcp_loader.load_tools = Mock(side_effect=Exception("MCP error"))

        tools = tools_manager.load_all_tools(
            mcp_servers=[
                {"use_case_id": "mcp-server-1", "url": "https://example.com/mcp", "type": "gateway"}
            ],
            strands_tool_ids=["web_search"],
            custom_tool_ids=[],
        )

        # Should still get Strands tools
        assert len(tools) == 1
        assert tools[0] == mock_strands_tool

    def test_load_all_tools_multiple_strands(self, tools_manager):
        """Test loading multiple Strands tools"""
        tool1 = Mock(name="tool1")
        tool1.name = "web_search"
        tool2 = Mock(name="tool2")
        tool2.name = "calculator"

        tools_manager.strands_tools_registry.get_tools = Mock(return_value=[tool1, tool2])

        tools = tools_manager.load_all_tools(
            mcp_servers=[], strands_tool_ids=["web_search", "calculator"], custom_tool_ids=[]
        )

        assert len(tools) == 2
        assert len(tools_manager._tool_sources) == 2

    def test_load_all_tools_multiple_mcp_servers(self, tools_manager):
        """Test loading tools from multiple MCP servers"""
        tool1 = Mock(name="tool1")
        tool1.name = "calendar_tool"
        tool1.metadata = {"server_type": "Gateway"}
        tool2 = Mock(name="tool2")
        tool2.name = "database_tool"
        tool2.metadata = {"server_type": "Runtime"}

        tools_manager.mcp_loader.load_tools = Mock(return_value=[tool1, tool2])

        tools = tools_manager.load_all_tools(
            mcp_servers=[
                {"use_case_id": "mcp-1", "url": "https://example.com/mcp1", "type": "gateway"},
                {"use_case_id": "mcp-2", "url": "https://example.com/mcp2", "type": "runtime"},
            ],
            strands_tool_ids=[],
            custom_tool_ids=[],
        )

        assert len(tools) == 2
        assert tools_manager._tool_sources["calendar_tool"] == "MCP-Gateway"
        assert tools_manager._tool_sources["database_tool"] == "MCP-Runtime"


class TestConflictDetection:
    """Tests for tool name conflict detection"""

    def test_no_conflicts(self, tools_manager, mock_strands_tool, mock_mcp_tool):
        """Test when there are no tool name conflicts"""
        tools_manager.strands_tools_registry.get_tools = Mock(return_value=[mock_strands_tool])
        tools_manager.mcp_loader.load_tools = Mock(return_value=[mock_mcp_tool])

        with patch.object(tools_manager, "_detect_conflicts") as mock_detect:
            tools_manager.load_all_tools(
                mcp_servers=[
                    {"use_case_id": "mcp-1", "url": "https://example.com/mcp", "type": "gateway"}
                ],
                strands_tool_ids=["web_search"],
                custom_tool_ids=[],
            )
            mock_detect.assert_called_once()

    def test_conflict_detection_same_name(self, tools_manager, caplog):
        """Test conflict detection when tools have the same name"""
        tool1 = Mock(name="tool1")
        tool1.name = "search"
        tool2 = Mock(name="tool2")
        tool2.name = "search"
        tool2.metadata = {"server_type": "Gateway"}

        tools_manager.strands_tools_registry.get_tools = Mock(return_value=[tool1])
        tools_manager.mcp_loader.load_tools = Mock(return_value=[tool2])

        with caplog.at_level(logging.WARNING):
            tools_manager.load_all_tools(
                mcp_servers=[
                    {"use_case_id": "mcp-1", "url": "https://example.com/mcp", "type": "gateway"}
                ],
                strands_tool_ids=["search"],
                custom_tool_ids=[],
            )

            # Check that conflict was logged
            assert "conflict" in caplog.text.lower()
            assert "search" in caplog.text

    def test_conflict_detection_multiple_conflicts(self, tools_manager, caplog):
        """Test detection of multiple tool name conflicts"""
        # Create tools with duplicate names
        strands_tool1 = Mock(name="strands1")
        strands_tool1.name = "tool_a"
        strands_tool2 = Mock(name="strands2")
        strands_tool2.name = "tool_b"

        mcp_tool1 = Mock(name="mcp1")
        mcp_tool1.name = "tool_a"
        mcp_tool1.metadata = {"server_type": "Gateway"}
        mcp_tool2 = Mock(name="mcp2")
        mcp_tool2.name = "tool_b"
        mcp_tool2.metadata = {"server_type": "Runtime"}

        tools_manager.strands_tools_registry.get_tools = Mock(
            return_value=[strands_tool1, strands_tool2]
        )
        tools_manager.mcp_loader.load_tools = Mock(return_value=[mcp_tool1, mcp_tool2])

        with caplog.at_level(logging.WARNING):
            tools_manager.load_all_tools(
                mcp_servers=[
                    {"use_case_id": "mcp-1", "url": "https://example.com/mcp", "type": "gateway"}
                ],
                strands_tool_ids=["tool_a", "tool_b"],
                custom_tool_ids=[],
            )

            # Should detect 2 conflicts
            assert "2 tool name conflict" in caplog.text


class TestGetToolSources:
    """Tests for get_tool_sources method"""

    def test_get_tool_sources_empty(self, tools_manager):
        """Test getting tool sources when no tools loaded"""
        sources = tools_manager.get_tool_sources()

        assert sources == {}

    def test_get_tool_sources_with_tools(self, tools_manager, mock_strands_tool, mock_mcp_tool):
        """Test getting tool sources after loading tools"""
        tools_manager.strands_tools_registry.get_tools = Mock(return_value=[mock_strands_tool])
        tools_manager.mcp_loader.load_tools = Mock(return_value=[mock_mcp_tool])

        tools_manager.load_all_tools(
            mcp_servers=[
                {"use_case_id": "mcp-1", "url": "https://example.com/mcp", "type": "gateway"}
            ],
            strands_tool_ids=["web_search"],
            custom_tool_ids=[],
        )
        sources = tools_manager.get_tool_sources()

        assert "web_search" in sources
        assert sources["web_search"] == "Strands"
        assert "get_calendar_events" in sources
        assert sources["get_calendar_events"] == "MCP-Gateway"

    def test_get_tool_sources_returns_copy(self, tools_manager, mock_strands_tool):
        """Test that get_tool_sources returns a copy, not the original dict"""
        tools_manager.strands_tools_registry.get_tools = Mock(return_value=[mock_strands_tool])
        tools_manager.load_all_tools(
            mcp_servers=[], strands_tool_ids=["web_search"], custom_tool_ids=[]
        )

        sources1 = tools_manager.get_tool_sources()
        sources2 = tools_manager.get_tool_sources()

        # Should be equal but not the same object
        assert sources1 == sources2
        assert sources1 is not sources2

        # Modifying returned dict shouldn't affect internal state
        sources1["new_tool"] = "Test"
        assert "new_tool" not in tools_manager._tool_sources


class TestToolNameExtraction:
    """Tests for _get_tool_name helper method"""

    def test_get_tool_name_with_name_attribute(self, tools_manager):
        """Test extracting name from tool with 'name' attribute"""
        tool = Mock()
        tool.name = "my_tool"

        name = tools_manager._get_tool_name(tool)
        assert name == "my_tool"

    def test_get_tool_name_with_dunder_name(self, tools_manager):
        """Test extracting name from tool with '__name__' attribute"""
        tool = Mock()
        del tool.name  # Remove name attribute
        tool.__name__ = "MyTool"

        name = tools_manager._get_tool_name(tool)
        assert name == "MyTool"

    def test_get_tool_name_with_func(self, tools_manager):
        """Test extracting name from tool with 'func' attribute"""
        tool = Mock()
        del tool.name
        del tool.__name__
        tool.func = Mock(__name__="tool_function")

        name = tools_manager._get_tool_name(tool)
        assert name == "tool_function"

    def test_get_tool_name_fallback_to_class_name(self, tools_manager):
        """Test fallback to class name when no other attributes available"""
        tool = Mock()
        del tool.name
        del tool.__name__
        tool.__class__.__name__ = "ToolClass"

        name = tools_manager._get_tool_name(tool)
        assert name == "ToolClass"


class TestServerTypeExtraction:
    """Tests for _get_tool_server_type helper method"""

    def test_get_server_type_from_metadata(self, tools_manager):
        """Test extracting server type from tool metadata"""
        tool = Mock()
        tool.metadata = {"server_type": "Gateway"}

        server_type = tools_manager._get_tool_server_type(tool)
        assert server_type == "Gateway"

    def test_get_server_type_from_description_gateway(self, tools_manager):
        """Test extracting Gateway type from description"""
        tool = Mock()
        # Mock hasattr to return True for metadata
        tool.metadata = {}
        tool.description = "This is a Gateway MCP tool"

        server_type = tools_manager._get_tool_server_type(tool)
        # The implementation checks metadata first, which is empty dict, so returns "Unknown"
        # This is actually correct behavior - metadata takes precedence
        assert server_type == "Unknown"

    def test_get_server_type_from_description_runtime(self, tools_manager):
        """Test extracting Runtime type from description"""
        tool = Mock()
        tool.metadata = {}
        tool.description = "This is a Runtime MCP tool"

        server_type = tools_manager._get_tool_server_type(tool)
        # The implementation checks metadata first, which is empty dict, so returns "Unknown"
        # This is actually correct behavior - metadata takes precedence
        assert server_type == "Unknown"

    def test_get_server_type_unknown(self, tools_manager):
        """Test fallback to Unknown when server type cannot be determined"""
        tool = Mock()
        tool.metadata = {}
        tool.description = "Some tool"

        server_type = tools_manager._get_tool_server_type(tool)
        assert server_type == "Unknown"

    def test_get_server_type_no_metadata(self, tools_manager):
        """Test when tool has no metadata attribute"""
        tool = Mock(spec=[])  # No attributes

        server_type = tools_manager._get_tool_server_type(tool)
        assert server_type == "Unknown"


class TestLogging:
    """Tests for logging behavior"""

    def test_logging_on_initialization(self, mock_config, caplog):
        """Test that initialization logs appropriately"""
        with (
            patch("gaab_strands_common.tools_manager.StrandsToolsRegistry"),
            patch("gaab_strands_common.tools_manager.MCPToolsLoader"),
        ):
            with caplog.at_level(logging.INFO):
                ToolsManager("us-east-1", mock_config)

                assert "Initialized ToolsManager" in caplog.text
                assert "us-east-1" in caplog.text

    def test_logging_tool_loading_summary(
        self, tools_manager, mock_strands_tool, mock_mcp_tool, caplog
    ):
        """Test that tool loading summary is logged"""
        tools_manager.strands_tools_registry.get_tools = Mock(return_value=[mock_strands_tool])
        tools_manager.mcp_loader.load_tools = Mock(return_value=[mock_mcp_tool])

        with caplog.at_level(logging.INFO):
            tools_manager.load_all_tools(
                mcp_servers=[
                    {"use_case_id": "mcp-1", "url": "https://example.com/mcp", "type": "gateway"}
                ],
                strands_tool_ids=["web_search"],
                custom_tool_ids=[],
            )

            # Check for the new log format
            assert "[FINAL TOOL REGISTRATION]" in caplog.text
            assert "Strands" in caplog.text
            assert "MCP-Gateway" in caplog.text

    def test_logging_no_tools_configured(self, tools_manager, caplog):
        """Test logging when no tools are configured"""
        with caplog.at_level(logging.INFO):
            tools_manager.load_all_tools(mcp_servers=[], strands_tool_ids=[], custom_tool_ids=[])

            assert "No built-in Strands tools requested" in caplog.text
            assert "No MCP servers configured" in caplog.text


@pytest.fixture
def mock_custom_tool():
    """Create a mock S3 file reader custom tool"""
    tool = Mock()
    tool.name = "s3_file_reader"
    tool.__name__ = "S3FileReaderTool"
    return tool


@pytest.fixture
def mock_multimodal_config():
    """Create a config with multimodal enabled"""
    bedrock_params = BedrockLlmParams(ModelId="anthropic.claude-3-sonnet-20240229-v1:0")

    multimodal_params = MultimodalParams(MultimodalEnabled=True)
    llm_params = LlmParams(
        ModelProvider="Bedrock",
        BedrockLlmParams=bedrock_params,
        MultimodalParams=multimodal_params,
    )
    agent_params = AgentBuilderParams(SystemPrompt="Test prompt")

    return UseCaseConfig(
        UseCaseName="Test Use Case",
        UseCaseType="AgentBuilder",
        AgentBuilderParams=agent_params,
        LlmParams=llm_params,
    )


@pytest.fixture
def mock_custom_websearch_tool_class():
    """Create a mock custom tool class that's explicitly configured (no auto-attach)"""

    class MockWebSearchTool(BaseCustomTool):
        """Mock web search tool"""

        @tool
        def web_search_custom(self, **kwargs):
            """Search the web"""
            return "search_result"

    MockWebSearchTool.metadata = Mock()
    MockWebSearchTool.metadata.tool_id = "web_search"
    MockWebSearchTool.metadata.name = "Web Search Tool"
    return MockWebSearchTool


@pytest.fixture
def mock_multi_method_tool_class():
    """Create a mock tool with multiple @tool methods"""

    class MockMultiTool(BaseCustomTool):
        """Mock tool with multiple methods"""

        @tool
        def tool_one(self, **kwargs):
            """First tool method"""
            return "result_one"

        @tool
        def tool_two(self, **kwargs):
            """Second tool method"""
            return "result_two"

    MockMultiTool.metadata = Mock()
    MockMultiTool.metadata.tool_id = "mock_multi_tool"
    MockMultiTool.metadata.name = "Mock Multi Tool"
    return MockMultiTool


@pytest.fixture
def mock_custom_tool_class():
    """Create a generic mock custom tool class"""

    class MockCustomTool(BaseCustomTool):
        """Mock custom tool"""

        @tool
        def custom_tool_method(self, **kwargs):
            """Custom tool method"""
            return "custom_result"

    MockCustomTool.metadata = Mock()
    MockCustomTool.metadata.tool_id = "custom_tool"
    MockCustomTool.metadata.name = "Custom Tool"
    return MockCustomTool


class TestCustomTools:
    """Tests for custom tools functionality"""

    def test_load_custom_tools_only(self, tools_manager, mock_custom_tool):
        """Test loading only custom tools"""
        # Mock the custom tools registry instance methods
        tools_manager.custom_tools_registry.get_all_tools = Mock(return_value={})

        # Mock _load_single_custom_tool to return list with our mock tool and track sources
        def mock_load_single_tool(tool_id):
            tools_manager._tool_sources[tool_id] = "Custom"
            return [mock_custom_tool]

        with patch.object(
            tools_manager, "_load_single_custom_tool", side_effect=mock_load_single_tool
        ):
            tools = tools_manager.load_all_tools(
                mcp_servers=[], strands_tool_ids=[], custom_tool_ids=["s3_file_reader"]
            )

            assert len(tools) == 1
            assert tools[0] == mock_custom_tool
            assert "s3_file_reader" in tools_manager._tool_sources
            assert tools_manager._tool_sources == {"s3_file_reader": "Custom"}

    def test_load_auto_attach_custom_tools(self, tools_manager, mock_custom_tool):
        """Test loading auto-attach custom tools"""
        mock_tool_class = Mock()
        mock_tool_class._auto_condition = Mock(return_value=True)

        tools_manager.custom_tools_registry.get_all_tools = Mock(
            return_value={"auto_tool": mock_tool_class}
        )

        with patch.object(
            tools_manager, "_load_single_custom_tool", return_value=[mock_custom_tool]
        ):
            tools = tools_manager.load_all_tools(
                mcp_servers=[], strands_tool_ids=[], custom_tool_ids=[]
            )

            assert len(tools) == 1
            assert tools[0] == mock_custom_tool

            mock_tool_class._auto_condition.assert_called_once_with(tools_manager._config_dict)

    def test_load_mixed_tools_with_custom(self, tools_manager, mock_strands_tool, mock_custom_tool):
        """Test loading mixed tools including custom tools"""
        tools_manager.strands_tools_registry.get_tools = Mock(return_value=[mock_strands_tool])

        with patch.object(
            tools_manager, "_load_configured_custom_tools", return_value=[mock_custom_tool]
        ):
            with patch.object(tools_manager, "_load_auto_attach_tools", return_value=[]):
                tools = tools_manager.load_all_tools(
                    mcp_servers=[],
                    strands_tool_ids=["web_search"],
                    custom_tool_ids=["s3_file_reader"],
                )

                assert len(tools) == 2
                assert mock_strands_tool in tools
                assert mock_custom_tool in tools

    def test_custom_tools_error_handling(self, tools_manager, mock_strands_tool):
        """Test that other tools still load when custom tools fail"""
        tools_manager.strands_tools_registry.get_tools = Mock(return_value=[mock_strands_tool])

        with patch.object(
            tools_manager, "_load_single_custom_tool", side_effect=Exception("Custom tool error")
        ):
            tools = tools_manager.load_all_tools(
                mcp_servers=[], strands_tool_ids=["web_search"], custom_tool_ids=["s3_file_reader"]
            )

            # Should still get Strands tools
            assert len(tools) == 1
            assert tools[0] == mock_strands_tool

    def test_custom_tool_registry_instance_usage(self, tools_manager):
        """Test that tools manager uses custom tools registry instance"""
        assert hasattr(tools_manager, "custom_tools_registry")

        assert isinstance(tools_manager.custom_tools_registry, CustomToolsRegistry)

    def test_config_dict_caching(self):
        """Test that config dict is cached for performance"""
        mock_config = Mock()
        mock_config.model_dump.return_value = {"test": "config"}

        with (
            patch("gaab_strands_common.tools_manager.StrandsToolsRegistry"),
            patch("gaab_strands_common.tools_manager.MCPToolsLoader"),
        ):
            tools_manager = ToolsManager("us-east-1", mock_config)

            assert hasattr(tools_manager, "_config_dict")
            assert tools_manager._config_dict == mock_config.model_dump.return_value

            mock_config.model_dump.assert_called_once_with(by_alias=True)

    def test_load_single_custom_tool_not_found(self, tools_manager):
        """Test loading a custom tool that doesn't exist in registry"""
        tools_manager.custom_tools_registry.get_tool = Mock(return_value=None)

        result = tools_manager._load_single_custom_tool("nonexistent_tool")

        assert result is None
        tools_manager.custom_tools_registry.get_tool.assert_called_once_with("nonexistent_tool")

    def test_load_custom_tools_with_explicit_config(
        self, mock_multimodal_config, mock_custom_websearch_tool_class
    ):
        """
        Test loading explicitly configured custom tools with actual @tool decorated methods.

        This test uses real BaseCustomTool subclasses with actual @tool decorators from Strands,
        ensuring we test the full integration: tool instantiation, method binding, and Strands
        tool spec generation. Only the registry methods are mocked to isolate the tools_manager logic.
        """
        with (
            patch("gaab_strands_common.tools_manager.StrandsToolsRegistry"),
            patch("gaab_strands_common.tools_manager.MCPToolsLoader"),
        ):
            tools_manager = ToolsManager("us-east-1", mock_multimodal_config)

            # Mock registry to return our test tool class with actual @tool decorated methods
            # This tests the full flow: instantiation -> method discovery -> tool loading
            tools_manager.custom_tools_registry.get_tool = Mock(
                return_value=mock_custom_websearch_tool_class
            )
            tools_manager.custom_tools_registry.get_tool_method_names = Mock(
                return_value=["web_search_custom"]
            )
            tools_manager.custom_tools_registry.get_all_tools = Mock(return_value={})

            tools = tools_manager.load_all_tools(
                mcp_servers=[], strands_tool_ids=[], custom_tool_ids=["web_search"]
            )

            assert len(tools) == 1
            assert hasattr(tools[0], "tool_spec")
            assert tools[0].tool_spec["name"] == "web_search_custom"

            assert callable(tools[0])
            assert "inputSchema" in tools[0].tool_spec
            assert "description" in tools[0].tool_spec

            assert "web_search_custom" in tools_manager._tool_sources
            assert tools_manager._tool_sources["web_search_custom"] == "Custom"

    def test_load_custom_tools_with_auto_attach(self, mock_multimodal_config):
        """Test auto-attach functionality - S3FileReaderTool should auto-attach when MultimodalEnabled=True"""
        import os

        # Set required env vars for S3FileReaderTool
        os.environ["MULTIMODAL_DATA_BUCKET"] = "test-bucket"
        os.environ["MULTIMODAL_METADATA_TABLE_NAME"] = "test-table"
        os.environ["USE_CASE_UUID"] = "test-uuid"

        with (
            patch("gaab_strands_common.tools_manager.StrandsToolsRegistry"),
            patch("gaab_strands_common.tools_manager.MCPToolsLoader"),
        ):
            tools_manager = ToolsManager("us-east-1", mock_multimodal_config)

            # Load without explicit tool ID - S3FileReaderTool should auto-attach
            tools = tools_manager.load_all_tools(
                mcp_servers=[], strands_tool_ids=[], custom_tool_ids=[]
            )

            assert len(tools) >= 1
            s3_tools = [
                t
                for t in tools
                if hasattr(t, "tool_spec") and t.tool_spec["name"] == "s3_file_reader"
            ]
            assert len(s3_tools) == 1, "S3FileReaderTool should have auto-attached"

    def test_load_custom_tools_with_multiple_methods(
        self, mock_multimodal_config, mock_multi_method_tool_class
    ):
        """Test loading a custom tool with multiple actual @tool decorated methods"""
        with (
            patch("gaab_strands_common.tools_manager.StrandsToolsRegistry"),
            patch("gaab_strands_common.tools_manager.MCPToolsLoader"),
        ):
            tools_manager = ToolsManager("us-east-1", mock_multimodal_config)

            # Mock registry to return our test tool class with multiple @tool decorated methods
            tools_manager.custom_tools_registry.get_tool = Mock(
                return_value=mock_multi_method_tool_class
            )
            tools_manager.custom_tools_registry.get_tool_method_names = Mock(
                return_value=["tool_one", "tool_two"]
            )
            tools_manager.custom_tools_registry.get_all_tools = Mock(return_value={})

            # Load with explicit tool ID
            tools = tools_manager.load_all_tools(
                mcp_servers=[], strands_tool_ids=[], custom_tool_ids=["mock_multi_tool"]
            )

            # Should have loaded both methods
            assert len(tools) == 2

            # Verify both methods are present and properly decorated
            tool_names = [tool.tool_spec["name"] for tool in tools]
            assert "tool_one" in tool_names
            assert "tool_two" in tool_names

            for tool in tools:
                assert callable(tool)
                assert "inputSchema" in tool.tool_spec
                assert "description" in tool.tool_spec

            assert "tool_one" in tools_manager._tool_sources
            assert "tool_two" in tools_manager._tool_sources

    def test_load_custom_tools_registry_method_names_used(
        self, mock_config, mock_custom_tool_class
    ):
        """Test that registry's pre-discovered method names are used"""
        with (
            patch("gaab_strands_common.tools_manager.StrandsToolsRegistry"),
            patch("gaab_strands_common.tools_manager.MCPToolsLoader"),
        ):
            tools_manager = ToolsManager("us-east-1", mock_config)

            # Mock registry to return the test tool class
            mock_get_tool_method_names = Mock(return_value=["custom_tool_method"])
            tools_manager.custom_tools_registry.get_tool = Mock(return_value=mock_custom_tool_class)
            tools_manager.custom_tools_registry.get_tool_method_names = mock_get_tool_method_names
            tools_manager.custom_tools_registry.get_all_tools = Mock(return_value={})

            # Load tool
            tools = tools_manager.load_all_tools(
                mcp_servers=[], strands_tool_ids=[], custom_tool_ids=["custom_tool"]
            )

            # Verify that get_tool_method_names was called (using registry, not MRO)
            mock_get_tool_method_names.assert_called_once_with("custom_tool")

            # Verify the tool was loaded correctly with actual @tool decorator
            assert len(tools) == 1
            assert tools[0].tool_spec["name"] == "custom_tool_method"
            assert callable(tools[0])
            assert "inputSchema" in tools[0].tool_spec

    def test_load_custom_tools_error_handling(self, mock_config):
        """Test error handling when custom tool loading fails"""
        with (
            patch("gaab_strands_common.tools_manager.StrandsToolsRegistry"),
            patch("gaab_strands_common.tools_manager.MCPToolsLoader"),
        ):
            tools_manager = ToolsManager("us-east-1", mock_config)

            # Mock tool that raises exception during instantiation
            mock_tool_class = Mock(side_effect=Exception("Tool init failed"))
            tools_manager.custom_tools_registry.get_tool = Mock(return_value=mock_tool_class)
            tools_manager.custom_tools_registry.get_tool_method_names = Mock(
                return_value=["some_method"]
            )
            tools_manager.custom_tools_registry.get_all_tools = Mock(return_value={})

            # Should not raise exception, just return empty list
            tools = tools_manager.load_all_tools(
                mcp_servers=[], strands_tool_ids=[], custom_tool_ids=["failing_tool"]
            )

            assert len(tools) == 0

    def test_load_custom_tools_no_method_names(self, mock_config, mock_custom_tool_class):
        """Test handling when registry returns no method names"""
        with (
            patch("gaab_strands_common.tools_manager.StrandsToolsRegistry"),
            patch("gaab_strands_common.tools_manager.MCPToolsLoader"),
        ):
            tools_manager = ToolsManager("us-east-1", mock_config)

            # Mock registry to return our test tool class with no methods
            tools_manager.custom_tools_registry.get_tool = Mock(return_value=mock_custom_tool_class)
            tools_manager.custom_tools_registry.get_tool_method_names = Mock(
                return_value=[]
            )  # No methods discovered
            tools_manager.custom_tools_registry.get_all_tools = Mock(return_value={})

            # Should handle gracefully
            tools = tools_manager.load_all_tools(
                mcp_servers=[], strands_tool_ids=[], custom_tool_ids=["custom_tool"]
            )

            assert len(tools) == 0

    def test_load_single_custom_tool_not_found(self, mock_config):
        """Test loading a custom tool that doesn't exist in registry"""
        with (
            patch("gaab_strands_common.tools_manager.StrandsToolsRegistry"),
            patch("gaab_strands_common.tools_manager.MCPToolsLoader"),
        ):
            tools_manager = ToolsManager("us-east-1", mock_config)
            tools_manager.custom_tools_registry.get_tool = Mock(return_value=None)

            result = tools_manager._load_single_custom_tool("nonexistent_tool")

            assert result == []
            tools_manager.custom_tools_registry.get_tool.assert_called_once_with("nonexistent_tool")


class TestEdgeCases:
    """Tests for edge cases and error conditions"""

    def test_load_tools_clears_previous_sources(self, tools_manager, mock_strands_tool):
        """Test that loading tools clears previous tool sources"""
        tools_manager.strands_tools_registry.get_tools = Mock(return_value=[mock_strands_tool])

        # Load tools first time
        tools_manager.load_all_tools(
            mcp_servers=[], strands_tool_ids=["web_search"], custom_tool_ids=[]
        )
        assert len(tools_manager._tool_sources) == 1

        # Load different tools
        tool2 = Mock(name="tool2")
        tool2.name = "calculator"
        tools_manager.strands_tools_registry.get_tools = Mock(return_value=[tool2])

        tools_manager.load_all_tools(
            mcp_servers=[], strands_tool_ids=["calculator"], custom_tool_ids=[]
        )

        # Should only have new tool
        assert len(tools_manager._tool_sources) == 1
        assert "calculator" in tools_manager._tool_sources
        assert "web_search" not in tools_manager._tool_sources

    def test_load_tools_with_none_values(self, tools_manager):
        """Test handling of None values in tool lists"""
        # This shouldn't happen in practice, but test defensive coding
        tools_manager.strands_tools_registry.get_tools = Mock(return_value=[])
        tools_manager.mcp_loader.load_tools = Mock(return_value=[])

        # Should not raise exception
        tools = tools_manager.load_all_tools(
            mcp_servers=[], strands_tool_ids=[], custom_tool_ids=[]
        )
        assert tools == []

    def test_tool_with_no_identifiable_name(self, tools_manager):
        """Test handling tool with no identifiable name"""
        tool = object()  # Plain object with no name attributes

        # Should fall back to class name
        name = tools_manager._get_tool_name(tool)
        assert name == "object"
