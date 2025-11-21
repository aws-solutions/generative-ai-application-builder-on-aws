# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0
import pytest
from gaab_strands_common.custom_tools.setup.metadata import ToolCategory, ToolMetadata, ToolRequirements


def test_tool_metadata_creation():
    """Test ToolMetadata creation with all parameters"""
    metadata = ToolMetadata(
        tool_id="test-tool", name="Test Tool", description="A test tool", category=ToolCategory.GENERAL, version="1.0.0"
    )

    assert metadata.tool_id == "test-tool"
    assert metadata.name == "Test Tool"
    assert metadata.description == "A test tool"
    assert metadata.category == ToolCategory.GENERAL
    assert metadata.version == "1.0.0"


def test_tool_metadata_default_version():
    """Test ToolMetadata creation with default version"""
    metadata = ToolMetadata(tool_id="test-tool", name="Test Tool", description="A test tool")

    assert metadata.tool_id == "test-tool"
    assert metadata.name == "Test Tool"
    assert metadata.description == "A test tool"
    assert metadata.category == ToolCategory.GENERAL
    assert metadata.version == "1.0.0"


def test_tool_requirements_creation():
    """Test ToolRequirements creation with all parameters"""
    requirements = ToolRequirements(env_vars=["VAR1", "VAR2"], config_params=["Param1", "Param2"])

    assert requirements.env_vars == ["VAR1", "VAR2"]
    assert requirements.config_params == ["Param1", "Param2"]


def test_tool_requirements_default_values():
    """Test ToolRequirements creation with default values"""
    requirements = ToolRequirements()

    assert requirements.env_vars == []
    assert requirements.config_params == []


def test_tool_requirements_separate_instances():
    """Test that each ToolRequirements instance gets its own lists"""
    req1 = ToolRequirements()
    req2 = ToolRequirements()

    # Modify one instance
    req1.env_vars.append("TEST_VAR")

    # Verify the other instance is not affected
    assert req1.env_vars == ["TEST_VAR"]
    assert req2.env_vars == []
    assert req1.env_vars is not req2.env_vars
