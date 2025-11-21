# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

#!/usr/bin/env python3
"""
Unit tests for ddb_helper.py
"""

import os
import sys
import unittest
from unittest.mock import Mock, patch, MagicMock

# Add src directory to path for imports
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "src"))

from gaab_strands_common import DynamoDBHelper

_original_get_config = DynamoDBHelper.get_config
_original_get_mcp_configs = DynamoDBHelper.get_mcp_configs


# Create wrapper functions that strip the access_token parameter
def patched_get_config(self, key: str, access_token=None):
    """Patched version that ignores access_token"""
    return _original_get_config.__wrapped__(self, key)


def patched_get_mcp_configs(self, mcp_ids, access_token=None):
    """Patched version that ignores access_token"""
    return _original_get_mcp_configs.__wrapped__(self, mcp_ids)


DynamoDBHelper.get_config = patched_get_config
DynamoDBHelper.get_mcp_configs = patched_get_mcp_configs


class TestDynamoDBHelper(unittest.TestCase):
    """Test DynamoDBHelper class"""

    def setUp(self):
        """Set up test environment"""
        # Set test environment variables
        os.environ["USE_CASE_TABLE_NAME"] = "test-table"
        os.environ["AWS_REGION"] = "us-east-1"
        os.environ["M2M_IDENTITY_NAME"] = "test-identity-provider"

    def tearDown(self):
        """Clean up test environment"""
        # Clean up environment variables
        if "USE_CASE_TABLE_NAME" in os.environ:
            del os.environ["USE_CASE_TABLE_NAME"]
        if "AWS_REGION" in os.environ:
            del os.environ["AWS_REGION"]
        if "M2M_IDENTITY_NAME" in os.environ:
            del os.environ["M2M_IDENTITY_NAME"]

    @patch("gaab_strands_common.ddb_helper.boto3.resource")
    def test_initialization_with_params(self, mock_boto3_resource):
        """Test DynamoDBHelper initialization with explicit parameters"""
        mock_dynamodb = MagicMock()
        mock_table = MagicMock()
        mock_dynamodb.Table.return_value = mock_table
        mock_boto3_resource.return_value = mock_dynamodb

        helper = DynamoDBHelper(table_name="test-table", region="us-east-1")

        mock_boto3_resource.assert_called_once_with("dynamodb", region_name="us-east-1")
        mock_dynamodb.Table.assert_called_once_with("test-table")

    @patch("gaab_strands_common.ddb_helper.boto3.resource")
    def test_initialization_with_different_params(self, mock_boto3_resource):
        """Test DynamoDBHelper initialization with different parameters"""
        mock_dynamodb = MagicMock()
        mock_table = MagicMock()
        mock_dynamodb.Table.return_value = mock_table
        mock_boto3_resource.return_value = mock_dynamodb

        helper = DynamoDBHelper(table_name="custom-table", region="us-west-2")

        mock_boto3_resource.assert_called_once_with("dynamodb", region_name="us-west-2")
        mock_dynamodb.Table.assert_called_once_with("custom-table")

    def test_initialization_without_table_name(self):
        """Test DynamoDBHelper initialization fails without table name"""
        with self.assertRaises(TypeError) as context:
            DynamoDBHelper()

        self.assertIn("missing 2 required positional arguments", str(context.exception))

    @patch("gaab_strands_common.ddb_helper.boto3.resource")
    def test_get_use_case_item_success(self, mock_boto3_resource):
        """Test successful retrieval of use case item"""
        # Mock DynamoDB response
        mock_item = {
            "key": "test-key",
            "config": {"UseCaseName": "Test Agent", "UseCaseType": "AgentBuilder"},
        }

        mock_dynamodb = MagicMock()
        mock_table = MagicMock()
        mock_table.get_item.return_value = {"Item": mock_item}
        mock_dynamodb.Table.return_value = mock_table
        mock_boto3_resource.return_value = mock_dynamodb

        helper = DynamoDBHelper(table_name="test-table", region="us-east-1")
        result = helper.get_config("test-key")

        self.assertEqual(result, mock_item["config"])
        mock_table.get_item.assert_called_once_with(Key={"key": "test-key"})

    @patch("gaab_strands_common.ddb_helper.boto3.resource")
    def test_get_use_case_item_not_found(self, mock_boto3_resource):
        """Test retrieval when item not found"""
        mock_dynamodb = MagicMock()
        mock_table = MagicMock()
        mock_table.get_item.return_value = {}  # No 'Item' key
        mock_dynamodb.Table.return_value = mock_table
        mock_boto3_resource.return_value = mock_dynamodb

        helper = DynamoDBHelper(table_name="test-table", region="us-east-1")

        with self.assertRaises(ValueError) as context:
            helper.get_config("nonexistent-key")

        self.assertIn("Configuration not found", str(context.exception))
        mock_table.get_item.assert_called_once_with(Key={"key": "nonexistent-key"})

    @patch("gaab_strands_common.ddb_helper.boto3.resource")
    def test_get_use_case_item_exception(self, mock_boto3_resource):
        """Test retrieval when DynamoDB raises exception"""
        mock_dynamodb = MagicMock()
        mock_table = MagicMock()
        mock_table.get_item.side_effect = Exception("DynamoDB error")
        mock_dynamodb.Table.return_value = mock_table
        mock_boto3_resource.return_value = mock_dynamodb

        helper = DynamoDBHelper(table_name="test-table", region="us-east-1")

        with self.assertRaises(Exception) as context:
            helper.get_config("test-key")

        self.assertIn("DynamoDB error", str(context.exception))
        mock_table.get_item.assert_called_once_with(Key={"key": "test-key"})

        # Create a second helper with different parameters
        helper2 = DynamoDBHelper(table_name="custom-table", region="us-west-2")

        self.assertIsNotNone(helper2.table)
        # boto3.resource is called twice now (once for each helper)
        self.assertEqual(mock_boto3_resource.call_count, 2)
        # Check the second call was with the right parameters
        mock_boto3_resource.assert_any_call("dynamodb", region_name="us-west-2")

    @patch("gaab_strands_common.ddb_helper.boto3.resource")
    def test_get_config_success(self, mock_boto3_resource):
        """Test successful get_config"""
        mock_config = {"UseCaseName": "Test Config", "UseCaseType": "AgentBuilder"}
        mock_item = {"key": "test-key", "config": mock_config}

        mock_dynamodb = MagicMock()
        mock_table = MagicMock()
        mock_table.get_item.return_value = {"Item": mock_item}
        mock_dynamodb.Table.return_value = mock_table
        mock_boto3_resource.return_value = mock_dynamodb

        helper = DynamoDBHelper(table_name="test-table", region="us-east-1")
        result = helper.get_config("test-key")

        self.assertEqual(result, mock_config)
        mock_table.get_item.assert_called_once_with(Key={"key": "test-key"})

    @patch("gaab_strands_common.ddb_helper.boto3.resource")
    def test_get_config_not_found(self, mock_boto3_resource):
        """Test get_config when item not found"""
        mock_dynamodb = MagicMock()
        mock_table = MagicMock()
        mock_table.get_item.return_value = {}
        mock_dynamodb.Table.return_value = mock_table
        mock_boto3_resource.return_value = mock_dynamodb

        helper = DynamoDBHelper(table_name="test-table", region="us-east-1")

        with self.assertRaises(ValueError) as context:
            helper.get_config("nonexistent-key")

        self.assertIn("Configuration not found", str(context.exception))

    @patch("gaab_strands_common.ddb_helper.boto3.resource")
    def test_get_mcp_configs_empty_list(self, mock_boto3_resource):
        """Test get_mcp_configs with empty list"""
        mock_dynamodb = MagicMock()
        mock_table = MagicMock()
        mock_dynamodb.Table.return_value = mock_table
        mock_boto3_resource.return_value = mock_dynamodb

        helper = DynamoDBHelper(table_name="test-table", region="us-east-1")
        result = helper.get_mcp_configs([])

        self.assertEqual(result, [])
        mock_table.get_item.assert_not_called()

    @patch("gaab_strands_common.ddb_helper.boto3.resource")
    def test_get_mcp_configs_success(self, mock_boto3_resource):
        """Test successful batch fetching of MCP configs"""
        mock_config1 = {
            "UseCaseName": "Gateway MCP",
            "UseCaseType": "MCPServer",
            "MCPParams": {
                "GatewayParams": {
                    "GatewayUrl": "https://test.com",
                    "GatewayArn": "arn:aws:test",
                    "GatewayId": "gw-1",
                    "GatewayName": "Test Gateway",
                }
            },
        }
        mock_config2 = {
            "UseCaseName": "Runtime MCP",
            "UseCaseType": "MCPServer",
            "MCPParams": {
                "RuntimeParams": {
                    "EcrUri": "123.dkr.ecr.us-east-1.amazonaws.com/test:latest",
                    "AgentARN": "arn:aws:bedrock:test",
                }
            },
        }

        mock_dynamodb = MagicMock()
        mock_table = MagicMock()
        mock_table.get_item.side_effect = [
            {"Item": {"key": "mcp-1", "config": mock_config1}},
            {"Item": {"key": "mcp-2", "config": mock_config2}},
        ]
        mock_dynamodb.Table.return_value = mock_table
        mock_boto3_resource.return_value = mock_dynamodb

        helper = DynamoDBHelper(table_name="test-table", region="us-east-1")
        result = helper.get_mcp_configs(["mcp-1", "mcp-2"])

        self.assertEqual(len(result), 2)
        self.assertEqual(result[0], mock_config1)
        self.assertEqual(result[1], mock_config2)
        self.assertEqual(mock_table.get_item.call_count, 2)

    @patch("gaab_strands_common.ddb_helper.boto3.resource")
    def test_get_mcp_configs_invalid_use_case_type(self, mock_boto3_resource):
        """Test get_mcp_configs with invalid UseCaseType"""
        mock_config = {"UseCaseName": "Not MCP", "UseCaseType": "AgentBuilder"}  # Wrong type

        mock_dynamodb = MagicMock()
        mock_table = MagicMock()
        mock_table.get_item.return_value = {"Item": {"key": "mcp-1", "config": mock_config}}
        mock_dynamodb.Table.return_value = mock_table
        mock_boto3_resource.return_value = mock_dynamodb

        helper = DynamoDBHelper(table_name="test-table", region="us-east-1")

        with self.assertRaises(ValueError) as context:
            helper.get_mcp_configs(["mcp-1"])

        self.assertIn("Invalid UseCaseType", str(context.exception))
        self.assertIn("expected 'MCPServer'", str(context.exception))

    @patch("gaab_strands_common.ddb_helper.boto3.resource")
    def test_get_mcp_configs_missing_config(self, mock_boto3_resource):
        """Test get_mcp_configs when one config is missing"""
        mock_config = {
            "UseCaseName": "Gateway MCP",
            "UseCaseType": "MCPServer",
            "MCPParams": {"GatewayParams": {}},
        }

        mock_dynamodb = MagicMock()
        mock_table = MagicMock()
        mock_table.get_item.side_effect = [
            {"Item": {"key": "mcp-1", "config": mock_config}},
            {},
        ]  # Missing item
        mock_dynamodb.Table.return_value = mock_table
        mock_boto3_resource.return_value = mock_dynamodb

        helper = DynamoDBHelper(table_name="test-table", region="us-east-1")
        result = helper.get_mcp_configs(["mcp-1", "mcp-missing"])

        # Should return only the successful config
        self.assertEqual(len(result), 1)
        self.assertEqual(result[0], mock_config)

    @patch("gaab_strands_common.ddb_helper.boto3.resource")
    def test_get_mcp_configs_partial_failure(self, mock_boto3_resource):
        """Test get_mcp_configs with partial failures"""
        mock_config = {
            "UseCaseName": "Gateway MCP",
            "UseCaseType": "MCPServer",
            "MCPParams": {"GatewayParams": {}},
        }

        mock_dynamodb = MagicMock()
        mock_table = MagicMock()
        mock_table.get_item.side_effect = [
            {"Item": {"key": "mcp-1", "config": mock_config}},
            Exception("DynamoDB error"),
            {},  # Missing item
        ]
        mock_dynamodb.Table.return_value = mock_table
        mock_boto3_resource.return_value = mock_dynamodb

        helper = DynamoDBHelper(table_name="test-table", region="us-east-1")
        result = helper.get_mcp_configs(["mcp-1", "mcp-error", "mcp-missing"])

        # Should return only the successful config
        self.assertEqual(len(result), 1)
        self.assertEqual(result[0], mock_config)

    @patch("gaab_strands_common.ddb_helper.boto3.resource")
    def test_fetch_and_validate_mcp_config_success(self, mock_boto3_resource):
        """Test _fetch_and_validate_mcp_config with valid config"""
        mock_config = {"UseCaseName": "Test MCP", "UseCaseType": "MCPServer", "MCPParams": {}}

        mock_dynamodb = MagicMock()
        mock_table = MagicMock()
        mock_table.get_item.return_value = {"Item": {"key": "mcp-1", "config": mock_config}}
        mock_dynamodb.Table.return_value = mock_table
        mock_boto3_resource.return_value = mock_dynamodb

        helper = DynamoDBHelper(table_name="test-table", region="us-east-1")
        result = helper._fetch_and_validate_mcp_config("mcp-1")

        self.assertEqual(result, mock_config)

    @patch("gaab_strands_common.ddb_helper.boto3.resource")
    def test_fetch_and_validate_mcp_config_not_found(self, mock_boto3_resource):
        """Test _fetch_and_validate_mcp_config when config not found"""
        mock_dynamodb = MagicMock()
        mock_table = MagicMock()
        mock_table.get_item.return_value = {}
        mock_dynamodb.Table.return_value = mock_table
        mock_boto3_resource.return_value = mock_dynamodb

        helper = DynamoDBHelper(table_name="test-table", region="us-east-1")
        result = helper._fetch_and_validate_mcp_config("mcp-missing")

        self.assertIsNone(result)

    @patch("gaab_strands_common.ddb_helper.boto3.resource")
    def test_fetch_and_validate_mcp_config_no_config_field(self, mock_boto3_resource):
        """Test _fetch_and_validate_mcp_config when config field is missing"""
        mock_dynamodb = MagicMock()
        mock_table = MagicMock()
        mock_table.get_item.return_value = {"Item": {"key": "mcp-1"}}  # No config field
        mock_dynamodb.Table.return_value = mock_table
        mock_boto3_resource.return_value = mock_dynamodb

        helper = DynamoDBHelper(table_name="test-table", region="us-east-1")
        result = helper._fetch_and_validate_mcp_config("mcp-1")

        self.assertIsNone(result)


if __name__ == "__main__":
    unittest.main()
