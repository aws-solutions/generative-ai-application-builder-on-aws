# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0
import os

import pytest
from gaab_strands_common.custom_tools.setup.decorators import auto_attach_when, custom_tool, requires
from gaab_strands_common.custom_tools.setup.metadata import ToolCategory
from gaab_strands_common.custom_tools.setup.registry import CustomToolsRegistry


class MockTool:
    """Mock tool class for testing"""

    def __init__(self, config=None, region=None):
        self.config = config or {}
        self.region = region or "us-east-1"


def test_custom_tool_decorator():
    """Test @custom_tool decorator"""
    # Clear registry before test
    CustomToolsRegistry.clear()

    @custom_tool(
        tool_id="test-tool",
        name="Test Tool",
        description="A test tool",
        category=ToolCategory.GENERAL,
        version="1.0.0",
    )
    class TestTool(MockTool):
        pass

    # Check that tool was registered
    assert "test-tool" in CustomToolsRegistry.list_tool_ids()
    registered_tool = CustomToolsRegistry.get_tool("test-tool")
    assert registered_tool == TestTool

    # Check metadata was set
    assert hasattr(TestTool, "metadata")
    assert TestTool.metadata.tool_id == "test-tool"
    assert TestTool.metadata.name == "Test Tool"
    assert TestTool.metadata.description == "A test tool"
    assert TestTool.metadata.category == ToolCategory.GENERAL
    assert TestTool.metadata.version == "1.0.0"


def test_custom_tool_decorator_without_category():
    """Test @custom_tool decorator without category"""
    # Clear registry before test
    CustomToolsRegistry.clear()

    @custom_tool(tool_id="test-tool-2", name="Test Tool 2", description="Another test tool")
    class TestTool2(MockTool):
        pass

    # Check metadata was set with default category
    assert hasattr(TestTool2, "metadata")
    assert TestTool2.metadata.category == ToolCategory.GENERAL


def test_requires_decorator():
    """Test @requires decorator"""

    @requires(env_vars=["TEST_ENV_VAR"], config_params=["Test.Param"])
    class TestTool(MockTool):
        pass

    # Check requirements were set
    assert hasattr(TestTool, "_requirements")
    assert TestTool._requirements.env_vars == ["TEST_ENV_VAR"]
    assert TestTool._requirements.config_params == ["Test.Param"]


def test_requires_decorator_empty():
    """Test @requires decorator with empty requirements"""

    @requires()
    class TestTool(MockTool):
        pass

    assert hasattr(TestTool, "_requirements")
    assert TestTool._requirements.env_vars == []
    assert TestTool._requirements.config_params == []


def test_auto_attach_when_decorator():
    """Test @auto_attach_when decorator"""

    def test_condition(config):
        return True

    @auto_attach_when(test_condition)
    class TestTool(MockTool):
        pass

    # Check auto condition was set
    assert hasattr(TestTool, "_auto_condition")
    assert TestTool._auto_condition == test_condition
