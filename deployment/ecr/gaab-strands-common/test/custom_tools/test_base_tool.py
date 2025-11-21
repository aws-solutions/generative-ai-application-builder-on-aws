# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0
import pytest
from gaab_strands_common.custom_tools.setup.base_tool import BaseCustomTool
from strands import tool


@pytest.fixture
def sample_config():
    """Sample configuration for testing"""
    return {
        "LlmParams": {
            "MultimodalParams": {
                "MultimodalEnabled": True,
            }
        }
    }


def test_init_success_with_tool_method(sample_config):
    """Test successful initialization when subclass has @tool decorated method"""

    class ValidTool(BaseCustomTool):
        """A valid tool with @tool decorated method"""

        @tool
        def my_tool_method(self, **kwargs):
            """A properly decorated tool method"""
            return "tool result"

    valid_tool = ValidTool(sample_config, "us-east-1")

    assert valid_tool.config == sample_config
    assert valid_tool.region == "us-east-1"
    # _requirements and _auto_condition are class attributes set by decorators
    assert not hasattr(ValidTool, "_requirements")
    assert not hasattr(ValidTool, "_auto_condition")


def test_init_success_with_multiple_tool_methods(sample_config):
    """Test successful initialization when subclass has multiple @tool decorated methods"""

    class MultiToolClass(BaseCustomTool):
        """A tool with multiple @tool decorated methods"""

        @tool
        def tool_one(self, **kwargs):
            """First tool method"""
            return "tool one"

        @tool
        def tool_two(self, **kwargs):
            """Second tool method"""
            return "tool two"

    multi_tool = MultiToolClass(sample_config, "us-east-1")

    assert multi_tool.config == sample_config
    assert multi_tool.region == "us-east-1"


def test_get_config_param(sample_config):
    """Test _get_config_param method"""

    class ValidTool(BaseCustomTool):
        @tool
        def my_tool(self, **kwargs):
            return "result"

    valid_tool = ValidTool(sample_config, "us-east-1")

    assert valid_tool._get_config_param("LlmParams.MultimodalParams.MultimodalEnabled") is True

    # Test non-existing parameter with default and without default
    assert valid_tool._get_config_param("Non.Existing.Param", "default") == "default"

    # Test non-existing parameter without default
    assert valid_tool._get_config_param("Non.Existing.Param") is None

    # Test nested parameter access
    assert valid_tool._get_config_param("LlmParams.MultimodalParams") == {"MultimodalEnabled": True}


def test_metadata_class_attribute(sample_config):
    """Test metadata class attribute"""

    class ValidTool(BaseCustomTool):
        @tool
        def my_tool(self, **kwargs):
            return "result"

    valid_tool = ValidTool(sample_config, "us-east-1")

    # BaseCustomTool without decorator should not have metadata class attribute
    assert not hasattr(BaseCustomTool, "metadata")
    # ValidTool also doesn't have metadata unless decorated with @custom_tool
    assert not hasattr(ValidTool, "metadata")


def test_tool_spec_structure(sample_config):
    """Test that @tool decorated methods have proper tool_spec structure"""

    class ValidTool(BaseCustomTool):
        @tool
        def my_custom_tool(self, **kwargs):
            """This is my custom tool description"""
            return "result"

    valid_tool = ValidTool(sample_config, "us-east-1")

    # Get the method from the class
    method = getattr(ValidTool, "my_custom_tool")

    # Verify it has tool_spec attribute
    assert hasattr(method, "tool_spec"), "Method should have tool_spec attribute"

    # Verify tool_spec is a dictionary
    assert isinstance(method.tool_spec, dict), "tool_spec should be a dictionary"

    # Verify tool_spec has expected keys
    assert "name" in method.tool_spec, "tool_spec should have 'name' key"
    assert "description" in method.tool_spec, "tool_spec should have 'description' key"
    assert "inputSchema" in method.tool_spec, "tool_spec should have 'inputSchema' key"

    # Verify the name matches the method name
    assert method.tool_spec["name"] == "my_custom_tool", "tool_spec name should match method name"

    # Verify description is extracted from docstring
    assert "This is my custom tool description" in method.tool_spec["description"]


def test_inheritance_tool_validation(sample_config):
    """Test that tool validation works correctly with inheritance"""

    class ParentTool(BaseCustomTool):
        """Parent tool with a tool method"""

        @tool
        def parent_tool_method(self, **kwargs):
            """Parent tool"""
            return "parent"

    class ChildTool(ParentTool):
        """Child tool that inherits parent's tool method"""

        def regular_method(self):
            """Not a tool method"""
            return "regular"

    # Child should initialize successfully because it inherits parent's tool method
    child = ChildTool(sample_config, "us-east-1")
    assert child is not None

    # Verify the parent's tool method is accessible
    assert hasattr(ChildTool, "parent_tool_method")
    assert hasattr(getattr(ChildTool, "parent_tool_method"), "tool_spec")


def test_inheritance_with_override(sample_config):
    """Test that child can have its own tool methods"""

    class ParentTool(BaseCustomTool):
        """Parent tool"""

        @tool
        def parent_tool(self, **kwargs):
            """Parent tool"""
            return "parent"

    class ChildTool(ParentTool):
        """Child tool with its own tool method"""

        @tool
        def child_tool(self, **kwargs):
            """Child tool"""
            return "child"

    # Child should have both parent and child tool methods
    child = ChildTool(sample_config, "us-east-1")
    assert hasattr(ChildTool, "parent_tool")
    assert hasattr(ChildTool, "child_tool")
