#!/usr/bin/env python
# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

from unittest.mock import Mock, patch
import os


class TestMainMemoryConfiguration:
    """Test cases for memory configuration in main.py."""

    def setup_method(self):
        """Set up test fixtures."""
        # Set up environment variables
        self.env_vars = {
            "USE_CASE_TABLE_NAME": "test-table",
            "USE_CASE_CONFIG_KEY": "test-key",
            "AWS_REGION": "us-east-1",
            "MEMORY_ID": "test-memory-id",
            "MEMORY_STRATEGY_ID": "test-strategy-id"
        }

    @patch.dict(os.environ, {
        "USE_CASE_TABLE_NAME": "test-table",
        "USE_CASE_CONFIG_KEY": "test-key", 
        "AWS_REGION": "us-east-1",
        "MEMORY_ID": "test-memory-id",
        "MEMORY_STRATEGY_ID": "test-strategy-id"
    })
    def test_validate_environment_with_strategy_id(self):
        """Test validate_environment returns strategy_id when provided."""
        from src.main import validate_environment
        
        table_name, config_key, region, memory_id, strategy_id = validate_environment()
        
        assert table_name == "test-table"
        assert config_key == "test-key"
        assert region == "us-east-1"
        assert memory_id == "test-memory-id"
        assert strategy_id == "test-strategy-id"

    @patch.dict(os.environ, {
        "USE_CASE_TABLE_NAME": "test-table",
        "USE_CASE_CONFIG_KEY": "test-key",
        "AWS_REGION": "us-east-1", 
        "MEMORY_ID": "test-memory-id"
    })
    def test_validate_environment_without_strategy_id(self):
        """Test validate_environment with default strategy_id."""
        from src.main import validate_environment
        
        table_name, config_key, region, memory_id, strategy_id = validate_environment()
        
        assert table_name == "test-table"
        assert config_key == "test-key"
        assert region == "us-east-1"
        assert memory_id == "test-memory-id"
        assert strategy_id == ""  # default value

    @patch('src.main.ConfigurableAgent')
    @patch('src.main.AgentCoreMemorySessionManager')
    @patch('src.main.validate_environment')
    def test_get_agent_instance_with_strategy_id(self, mock_validate_env, mock_session_manager_class, mock_configurable_agent_class):
        """Test get_agent_instance creates session manager when strategy_id exists."""
        from src.main import get_agent_instance
        
        # Mock validate_environment return with strategy_id
        mock_validate_env.return_value = ("table", "key", "region", "memory-id", "strategy-id")
        
        # Mock session manager
        mock_session_manager = Mock()
        mock_session_manager_class.return_value = mock_session_manager
        
        # Mock configurable agent
        mock_agent = Mock()
        mock_configurable_agent_class.return_value = mock_agent
        
        with patch('src.main._configurable_agent', None):
            result = get_agent_instance("session-id", "actor-id")
        
        # Verify session manager was created
        mock_session_manager_class.assert_called_once()
        mock_configurable_agent_class.assert_called_once_with(
            table_name="table",
            config_key="key", 
            region="region",
            session_manager=mock_session_manager
        )

    @patch('src.main.ConfigurableAgent')
    @patch('src.main.AgentCoreMemorySessionManager')
    @patch('src.main.validate_environment')
    def test_get_agent_instance_without_strategy_id(self, mock_validate_env, mock_session_manager_class, mock_configurable_agent_class):
        """Test get_agent_instance does not create session manager when strategy_id is empty."""
        from src.main import get_agent_instance
        
        # Mock validate_environment return with empty strategy_id
        mock_validate_env.return_value = ("table", "key", "region", "memory-id", "")
        
        # Mock configurable agent
        mock_agent = Mock()
        mock_configurable_agent_class.return_value = mock_agent
        
        with patch('src.main._configurable_agent', None):
            result = get_agent_instance("session-id", "actor-id")
        
        # Verify session manager was NOT created
        mock_session_manager_class.assert_not_called()
        mock_configurable_agent_class.assert_called_once_with(
            table_name="table",
            config_key="key", 
            region="region",
            session_manager=None
        )

    @patch.dict(os.environ, {
        "USE_CASE_TABLE_NAME": "test-table",
        "USE_CASE_CONFIG_KEY": "test-key",
        "AWS_REGION": "us-east-1",
        "MEMORY_ID": "test-memory-id"
    })
    def test_validate_environment_missing_strategy_id_env_var(self):
        """Test validate_environment when MEMORY_STRATEGY_ID env var is missing."""
        from src.main import validate_environment
        
        # Ensure MEMORY_STRATEGY_ID is not in environment
        if "MEMORY_STRATEGY_ID" in os.environ:
            del os.environ["MEMORY_STRATEGY_ID"]
        
        table_name, config_key, region, memory_id, strategy_id = validate_environment()
        
        assert strategy_id == ""  # default value when env var is missing
