# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0
import pytest
from gaab_strands_common.custom_tools.setup.registry import CustomToolsRegistry


def create_mock_tool_class(tool_id="mock-tool", name=None):
    """Factory function to create mock tool classes"""
    if name is None:
        name = f"Mock Tool {tool_id}"

    metadata_class = type("metadata", (), {"tool_id": tool_id, "name": name})
    MockTool = type("MockTool", (), {"metadata": metadata_class})

    return MockTool


@pytest.fixture(autouse=True)
def clear_registry():
    """Clear registry before each test"""
    CustomToolsRegistry.clear()


def test_register_tool():
    """Test registering a tool"""
    tool_class = create_mock_tool_class()
    registered_tool = CustomToolsRegistry.register(tool_class)

    # Check that the tool was registered and returned
    assert registered_tool == tool_class
    assert CustomToolsRegistry.get_tool("mock-tool") == tool_class
    assert "mock-tool" in CustomToolsRegistry.list_tool_ids()


def test_register_duplicate_tool():
    """Test registering a duplicate tool raises ValueError"""
    tool_class1 = create_mock_tool_class()
    tool_class2 = create_mock_tool_class()  # Same tool_id

    # Register first tool
    CustomToolsRegistry.register(tool_class1)

    # Try to register second tool with same ID
    with pytest.raises(ValueError, match="Tool ID 'mock-tool' already registered"):
        CustomToolsRegistry.register(tool_class2)


def test_get_tool():
    """Test getting a registered tool"""
    tool_class = create_mock_tool_class()
    CustomToolsRegistry.register(tool_class)

    # Get the tool
    retrieved_tool = CustomToolsRegistry.get_tool("mock-tool")
    assert retrieved_tool == tool_class

    # Try to get non-existent tool
    non_existent_tool = CustomToolsRegistry.get_tool("non-existent")
    assert non_existent_tool is None


def test_get_all_tools():
    """Test getting all registered tools"""
    # Register multiple tools
    tool1 = create_mock_tool_class("tool-1")
    tool2 = create_mock_tool_class("tool-2")
    CustomToolsRegistry.register(tool1)
    CustomToolsRegistry.register(tool2)

    all_tools = CustomToolsRegistry.get_all_tools()
    assert len(all_tools) == 2
    assert all_tools["tool-1"] == tool1
    assert all_tools["tool-2"] == tool2


def test_list_tool_ids():
    """Test listing all tool IDs"""
    # Register multiple tools
    tool1 = create_mock_tool_class("tool-1")
    tool2 = create_mock_tool_class("tool-2")
    CustomToolsRegistry.register(tool1)
    CustomToolsRegistry.register(tool2)

    tool_ids = CustomToolsRegistry.list_tool_ids()
    assert len(tool_ids) == 2
    assert "tool-1" in tool_ids
    assert "tool-2" in tool_ids


def test_clear_registry():
    """Test clearing the registry"""
    # Register a tool
    tool_class = create_mock_tool_class()
    CustomToolsRegistry.register(tool_class)

    # Verify tool is registered
    assert len(CustomToolsRegistry.list_tool_ids()) == 1

    # Clear registry
    CustomToolsRegistry.clear()

    # Verify registry is empty
    assert len(CustomToolsRegistry.list_tool_ids()) == 0
    assert CustomToolsRegistry.get_all_tools() == {}


def test_register_duplicate_tool_name():
    """Test registering tools with duplicate names (deduplication)"""
    # Register first tool
    tool_class1 = create_mock_tool_class("tool-1", "Duplicate Name")
    CustomToolsRegistry.register(tool_class1)

    # Register second tool with same name but different ID
    tool_class2 = create_mock_tool_class("tool-2", "Duplicate Name")
    CustomToolsRegistry.register(tool_class2)

    # Verify only the first tool is registered
    assert len(CustomToolsRegistry.list_tool_ids()) == 1
    assert "tool-1" in CustomToolsRegistry.list_tool_ids()
    assert "tool-2" not in CustomToolsRegistry.list_tool_ids()
    assert CustomToolsRegistry.get_tool("tool-1") == tool_class1
    assert CustomToolsRegistry.get_tool("tool-2") is None
