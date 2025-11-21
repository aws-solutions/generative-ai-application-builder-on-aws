#!/usr/bin/env python
# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

import pytest
from unittest.mock import Mock

from utils.mcp_factory import MCPGatewayFactory, MCPTargetCreator


class MockTargetCreator(MCPTargetCreator):
    """Mock target creator for testing."""
    
    def validate_configuration(self) -> bool:
        return True
    
    def create_target_configuration(self) -> dict:
        return {"mock": "config"}


class TestMCPGatewayFactory:

    def setup_method(self):
        # Clear the registry before each test
        MCPGatewayFactory.target_creators = {}

    def test_register_target_creator(self):
        """Test registering a target creator."""
        MCPGatewayFactory.register_target_creator("mock", MockTargetCreator)
        
        assert "mock" in MCPGatewayFactory.target_creators
        assert MCPGatewayFactory.target_creators["mock"] == MockTargetCreator

    def test_create_target_creator_success(self):
        """Test successful target creator creation."""
        MCPGatewayFactory.register_target_creator("mock", MockTargetCreator)
        
        target_config = {
            "TargetName": "test-target",
            "TargetType": "mock",
            "SchemaUri": "test-schema.json"
        }
        
        creator = MCPGatewayFactory.create_target_creator(target_config, "test-bucket")
        
        assert isinstance(creator, MockTargetCreator)
        assert creator.target_name == "test-target"
        assert creator.target_type == "mock"

    def test_create_target_creator_missing_type(self):
        """Test target creator creation with missing target type."""
        target_config = {
            "TargetName": "test-target",
            "SchemaUri": "test-schema.json"
        }
        
        with pytest.raises(ValueError) as exc_info:
            MCPGatewayFactory.create_target_creator(target_config, "test-bucket")
        
        assert "Target type is required" in str(exc_info.value)

    def test_create_target_creator_unsupported_type(self):
        """Test target creator creation with unsupported target type."""
        MCPGatewayFactory.register_target_creator("mock", MockTargetCreator)
        
        target_config = {
            "TargetName": "test-target",
            "TargetType": "unsupported",
            "SchemaUri": "test-schema.json"
        }
        
        with pytest.raises(ValueError) as exc_info:
            MCPGatewayFactory.create_target_creator(target_config, "test-bucket")
        
        assert "Unsupported target type: unsupported" in str(exc_info.value)
        assert "Available types: ['mock']" in str(exc_info.value)

    def test_get_supported_target_types(self):
        """Test getting supported target types."""
        MCPGatewayFactory.register_target_creator("mock1", MockTargetCreator)
        MCPGatewayFactory.register_target_creator("mock2", MockTargetCreator)
        
        supported_types = MCPGatewayFactory.get_supported_target_types()
        
        assert "mock1" in supported_types
        assert "mock2" in supported_types
        assert len(supported_types) == 2


class TestMCPTargetCreator:

    def test_get_target_info_with_description(self):
        """Test getting target info with description."""
        target_config = {
            "TargetName": "test-target",
            "TargetType": "mock",
            "SchemaUri": "test-schema.json",
            "TargetDescription": "Test target description"
        }
        
        creator = MockTargetCreator(target_config, "test-bucket")
        target_info = creator.get_target_info()
        
        assert target_info["name"] == "test-target"
        assert target_info["type"] == "mock"
        assert target_info["schema_uri"] == "test-schema.json"
        assert target_info["description"] == "Test target description"

    def test_get_target_info_without_description(self):
        """Test getting target info without description."""
        target_config = {
            "TargetName": "test-target",
            "TargetType": "mock",
            "SchemaUri": "test-schema.json"
        }
        
        creator = MockTargetCreator(target_config, "test-bucket")
        target_info = creator.get_target_info()
        
        assert target_info["name"] == "test-target"
        assert target_info["type"] == "mock"
        assert target_info["schema_uri"] == "test-schema.json"
        assert "description" not in target_info


def test_register_default_creators():
    """Test that default creators are registered lazily when needed."""
    # Clear registry first
    MCPGatewayFactory.target_creators = {}
    
    # Check that default creators are registered when we ask for supported types
    supported_types = MCPGatewayFactory.get_supported_target_types()
    assert "lambda" in supported_types
    assert "openApiSchema" in supported_types
    assert "smithyModel" in supported_types