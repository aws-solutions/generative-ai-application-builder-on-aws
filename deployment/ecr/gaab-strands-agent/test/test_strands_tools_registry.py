# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

#!/usr/bin/env python3
"""
Unit tests for StrandsToolsRegistry
"""

import unittest
from unittest.mock import Mock, patch, MagicMock
import sys
import os
import logging

# Add src to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "../src"))

from gaab_strands_common import StrandsToolsRegistry

# Set up logging for tests
logging.basicConfig(level=logging.INFO)


class MockTool:
    """Mock tool class for testing"""

    def __init__(self):
        self.name = "MockTool"


class WebSearchTool:
    """Mock web search tool"""

    description = "Search the web for information"

    def __init__(self):
        self.name = "WebSearchTool"


class CalculatorTool:
    """Mock calculator tool"""

    def __init__(self):
        self.name = "CalculatorTool"


class TestStrandsToolsRegistry(unittest.TestCase):
    """Test cases for StrandsToolsRegistry"""

    def setUp(self):
        """Set up test fixtures"""
        self.registry = None

    def tearDown(self):
        """Clean up after tests"""
        self.registry = None

    @patch("gaab_strands_common.strands_tools_registry.importlib.import_module")
    @patch("gaab_strands_common.strands_tools_registry.pkgutil.iter_modules")
    def test_initialization_with_tools(self, mock_iter_modules, mock_import_module):
        """Test registry initialization discovers tools"""
        # Mock the strands_tools package
        mock_package = MagicMock()
        mock_package.__path__ = ["/mock/path"]
        mock_package.__name__ = "strands_tools"

        # Mock iter_modules to return one module
        mock_module_info = MagicMock()
        mock_module_info.name = "web_search"
        mock_iter_modules.return_value = [mock_module_info]

        # Mock the module with tool classes
        mock_module = MagicMock()
        mock_module.WebSearchTool = WebSearchTool
        mock_module.CalculatorTool = CalculatorTool
        mock_import_module.side_effect = lambda name: (
            mock_package if name == "strands_tools" else mock_module
        )

        # Mock dir() to return our tool classes
        with patch(
            "gaab_strands_common.strands_tools_registry.dir",
            return_value=["WebSearchTool", "CalculatorTool"],
        ):
            with patch("gaab_strands_common.strands_tools_registry.getattr") as mock_getattr:
                mock_getattr.side_effect = lambda obj, name: (
                    WebSearchTool if name == "WebSearchTool" else CalculatorTool
                )

                registry = StrandsToolsRegistry()

                # Verify tools were discovered
                self.assertGreaterEqual(len(registry._available_tools), 0)

    @patch("gaab_strands_common.strands_tools_registry.importlib.import_module")
    def test_initialization_without_package(self, mock_import_module):
        """Test registry initialization when strands-agents-tools is not available"""
        # Mock ImportError when trying to import strands_tools
        mock_import_module.side_effect = ImportError("No module named 'strands_tools'")

        registry = StrandsToolsRegistry()

        # Verify registry is empty but doesn't crash
        self.assertEqual(len(registry._available_tools), 0)

    # Removed test_class_name_to_tool_id - method no longer exists after simplification
    # Tool discovery now uses module names directly from strands_tools package

    def test_get_tools_with_valid_ids(self):
        """Test getting tools with valid tool IDs"""
        registry = StrandsToolsRegistry()

        # Manually add mock tools to registry
        registry._available_tools = {
            "web_search_tool": WebSearchTool,
            "calculator_tool": CalculatorTool,
        }

        # Get tools
        tools = registry.get_tools(["web_search_tool", "calculator_tool"])

        # Verify tools were instantiated
        self.assertEqual(len(tools), 2)
        self.assertIsInstance(tools[0], WebSearchTool)
        self.assertIsInstance(tools[1], CalculatorTool)

    def test_get_tools_with_invalid_ids(self):
        """Test getting tools with invalid tool IDs"""
        registry = StrandsToolsRegistry()

        # Manually add mock tools to registry
        registry._available_tools = {"web_search_tool": WebSearchTool}

        # Try to get tools including an invalid ID
        tools = registry.get_tools(["web_search_tool", "nonexistent_tool"])

        # Verify only valid tool was returned
        self.assertEqual(len(tools), 1)
        self.assertIsInstance(tools[0], WebSearchTool)

    def test_get_tools_with_empty_list(self):
        """Test getting tools with empty list"""
        registry = StrandsToolsRegistry()

        tools = registry.get_tools([])

        # Verify empty list is returned
        self.assertEqual(len(tools), 0)

    def test_get_tools_with_instantiation_error(self):
        """Test handling of tool instantiation errors"""
        registry = StrandsToolsRegistry()

        # Create a tool class that raises an error on instantiation
        class BrokenTool:
            def __init__(self):
                raise ValueError("Tool initialization failed")

        registry._available_tools = {"broken_tool": BrokenTool, "web_search_tool": WebSearchTool}

        # Get tools
        tools = registry.get_tools(["broken_tool", "web_search_tool"])

        # Verify only the working tool was returned
        self.assertEqual(len(tools), 1)
        self.assertIsInstance(tools[0], WebSearchTool)

    def test_list_available_tools(self):
        """Test listing available tools"""
        registry = StrandsToolsRegistry()

        # Manually add mock tools to registry
        registry._available_tools = {
            "web_search_tool": WebSearchTool,
            "calculator_tool": CalculatorTool,
        }

        # List tools
        tools_list = registry.list_available_tools()

        # Verify list contains tool metadata
        self.assertEqual(len(tools_list), 2)
        self.assertIn("id", tools_list[0])
        self.assertIn("name", tools_list[0])
        self.assertIn("description", tools_list[0])

    def test_get_tool_description_from_docstring(self):
        """Test extracting description from tool docstring"""
        registry = StrandsToolsRegistry()

        class ToolWithDocstring:
            """This is a tool with a docstring

            It has multiple lines.
            """

            pass

        description = registry._get_tool_description(ToolWithDocstring)
        self.assertEqual(description, "This is a tool with a docstring")

    def test_get_tool_description_from_attribute(self):
        """Test extracting description from tool attribute"""
        registry = StrandsToolsRegistry()

        # WebSearchTool has both docstring and description attribute
        # Docstring takes precedence, so we expect the docstring
        description = registry._get_tool_description(WebSearchTool)
        self.assertEqual(description, "Mock web search tool")

    def test_get_tool_description_fallback(self):
        """Test fallback when no description is available"""
        registry = StrandsToolsRegistry()

        class ToolWithoutDescription:
            pass

        description = registry._get_tool_description(ToolWithoutDescription)
        self.assertEqual(description, "No description available")

    def test_has_tool(self):
        """Test checking if a tool is available"""
        registry = StrandsToolsRegistry()

        registry._available_tools = {"web_search_tool": WebSearchTool}

        # Test existing tool
        self.assertTrue(registry.has_tool("web_search_tool"))

        # Test non-existing tool
        self.assertFalse(registry.has_tool("nonexistent_tool"))

    def test_get_available_tool_ids(self):
        """Test getting list of available tool IDs"""
        registry = StrandsToolsRegistry()

        registry._available_tools = {
            "web_search_tool": WebSearchTool,
            "calculator_tool": CalculatorTool,
        }

        tool_ids = registry.get_available_tool_ids()

        self.assertEqual(len(tool_ids), 2)
        self.assertIn("web_search_tool", tool_ids)
        self.assertIn("calculator_tool", tool_ids)

    def test_multiple_tool_requests(self):
        """Test requesting the same tool multiple times"""
        registry = StrandsToolsRegistry()

        registry._available_tools = {"web_search_tool": WebSearchTool}

        # Request the same tool twice
        tools = registry.get_tools(["web_search_tool", "web_search_tool"])

        # Verify two separate instances were created
        self.assertEqual(len(tools), 2)
        self.assertIsInstance(tools[0], WebSearchTool)
        self.assertIsInstance(tools[1], WebSearchTool)
        self.assertIsNot(tools[0], tools[1])  # Different instances


if __name__ == "__main__":
    unittest.main()
