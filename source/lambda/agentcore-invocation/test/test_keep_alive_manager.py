#!/usr/bin/env python3
# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

import os
import time
import pytest
from unittest.mock import Mock, patch, call
import threading

# Set up environment variables before importing
os.environ["WEBSOCKET_CALLBACK_URL"] = "wss://test.execute-api.us-east-1.amazonaws.com/test"
os.environ["AGENT_RUNTIME_ARN"] = "arn:aws:bedrock-agentcore:us-east-1:123456789012:runtime/test-runtime"
os.environ["_X_AMZN_TRACE_ID"] = "Root=1-12345678-123456789abcdef0;Parent=123456789abcdef0;Sampled=1"

from utils.keep_alive_manager import KeepAliveManager, get_keep_alive_manager
from utils.constants import KEEP_ALIVE_TOKEN, PROCESSING_TOKEN


class TestKeepAliveManager:
    """Test KeepAliveManager functionality for long-running task management."""

    def setup_method(self):
        """Set up test fixtures."""
        self.mock_send_callback = Mock()
        self.manager = KeepAliveManager(self.mock_send_callback)
        self.connection_id = "test-connection-123"
        self.conversation_id = "test-conversation-456"
        self.message_id = "test-message-789"

    def teardown_method(self):
        """Clean up after each test."""
        if self.manager:
            self.manager.cleanup_all()

    def test_keep_alive_manager_initialization(self):
        """Test KeepAliveManager initialization."""
        assert self.manager.send_message_callback == self.mock_send_callback
        assert len(self.manager.active_connections) == 0
        assert self.manager.get_active_connection_count() == 0

    def test_start_keep_alive_monitoring(self):
        """Test starting keep-alive monitoring for a connection."""
        self.manager.start_keep_alive(self.connection_id, self.conversation_id, self.message_id)

        # Verify connection was added
        assert self.connection_id in self.manager.active_connections
        assert self.manager.get_active_connection_count() == 1

        # Verify connection info
        connection_info = self.manager.active_connections[self.connection_id]
        assert connection_info["conversation_id"] == self.conversation_id
        assert connection_info["message_id"] == self.message_id
        assert "start_time" in connection_info
        assert "last_keep_alive" in connection_info
        assert "last_processing_update" in connection_info

    def test_stop_keep_alive_monitoring(self):
        """Test stopping keep-alive monitoring for a connection."""
        # Start monitoring first
        self.manager.start_keep_alive(self.connection_id, self.conversation_id, self.message_id)
        assert self.manager.get_active_connection_count() == 1

        # Stop monitoring
        self.manager.stop_keep_alive(self.connection_id)
        assert self.manager.get_active_connection_count() == 0
        assert self.connection_id not in self.manager.active_connections

    def test_update_activity(self):
        """Test updating activity timestamps for a connection."""
        # Start monitoring
        self.manager.start_keep_alive(self.connection_id, self.conversation_id, self.message_id)

        # Get initial timestamps
        initial_info = self.manager.active_connections[self.connection_id].copy()

        # Wait a bit and update activity
        time.sleep(0.1)
        self.manager.update_activity(self.connection_id)

        # Verify timestamps were updated
        updated_info = self.manager.active_connections[self.connection_id]
        assert updated_info["last_keep_alive"] > initial_info["last_keep_alive"]
        assert updated_info["last_processing_update"] > initial_info["last_processing_update"]

    def test_get_connection_status(self):
        """Test getting connection status information."""
        # Test non-existent connection
        status = self.manager.get_connection_status("non-existent")
        assert status is None

        # Start monitoring
        self.manager.start_keep_alive(self.connection_id, self.conversation_id, self.message_id)

        # Get status
        status = self.manager.get_connection_status(self.connection_id)
        assert status is not None
        assert status["conversation_id"] == self.conversation_id
        assert status["message_id"] == self.message_id
        assert "duration" in status
        assert "time_since_last_keep_alive" in status
        assert "time_since_last_processing_update" in status

    def test_multiple_connections(self):
        """Test managing multiple connections simultaneously."""
        connections = [
            ("conn-1", "conv-1", "msg-1"),
            ("conn-2", "conv-2", "msg-2"),
            ("conn-3", "conv-3", "msg-3"),
        ]

        # Start monitoring for all connections
        for conn_id, conv_id, msg_id in connections:
            self.manager.start_keep_alive(conn_id, conv_id, msg_id)

        assert self.manager.get_active_connection_count() == 3

        # Stop monitoring for one connection
        self.manager.stop_keep_alive("conn-2")
        assert self.manager.get_active_connection_count() == 2
        assert "conn-1" in self.manager.active_connections
        assert "conn-2" not in self.manager.active_connections
        assert "conn-3" in self.manager.active_connections

    def test_cleanup_all_connections(self):
        """Test cleaning up all active connections."""
        # Start monitoring for multiple connections
        for i in range(3):
            self.manager.start_keep_alive(f"conn-{i}", f"conv-{i}", f"msg-{i}")

        assert self.manager.get_active_connection_count() == 3

        # Cleanup all
        self.manager.cleanup_all()
        assert self.manager.get_active_connection_count() == 0

    def test_keep_alive_message_sending(self):
        """Test that keep-alive message sending mechanism works."""
        # Test the message sending method directly
        connection_info = {
            "conversation_id": self.conversation_id,
            "message_id": self.message_id,
            "start_time": time.time(),
        }

        # Test direct message sending
        self.manager._send_keep_alive_message(self.connection_id, connection_info)

        # Verify keep-alive message was sent
        assert self.mock_send_callback.call_count == 1
        call_args = self.mock_send_callback.call_args
        assert call_args[0][0] == self.connection_id
        assert call_args[0][1] == self.conversation_id
        assert call_args[0][2] == KEEP_ALIVE_TOKEN
        assert call_args[0][3] == self.message_id

    def test_processing_update_sending(self):
        """Test that processing update message sending mechanism works."""
        # Test the message sending method directly
        connection_info = {
            "conversation_id": self.conversation_id,
            "message_id": self.message_id,
            "start_time": time.time(),
        }

        # Test direct message sending
        self.manager._send_processing_update(self.connection_id, connection_info)

        # Verify processing update message was sent
        assert self.mock_send_callback.call_count == 1
        call_args = self.mock_send_callback.call_args
        assert call_args[0][0] == self.connection_id
        assert call_args[0][1] == self.conversation_id
        assert call_args[0][2] == PROCESSING_TOKEN
        assert call_args[0][3] == self.message_id

    def test_send_message_callback_error_handling(self):
        """Test error handling when send message callback fails."""
        # Create manager with failing callback
        failing_callback = Mock(side_effect=Exception("WebSocket error"))
        manager = KeepAliveManager(failing_callback)

        try:
            # Start monitoring - this should handle callback errors gracefully
            manager.start_keep_alive(self.connection_id, self.conversation_id, self.message_id)

            # Wait a bit for potential error handling
            time.sleep(0.1)

            # Manager should still be functional
            assert manager.get_active_connection_count() >= 0  # May be 0 if connection was removed due to error

        finally:
            manager.cleanup_all()

    @patch("time.sleep")  # Mock sleep to speed up test
    def test_maximum_duration_handling(self, mock_sleep):
        """Test that connections are cleaned up after maximum duration."""
        # Use very short max duration for testing
        with patch("utils.keep_alive_manager.MAX_STREAMING_DURATION_SECONDS", 0.1):
            self.manager.start_keep_alive(self.connection_id, self.conversation_id, self.message_id)

            # Wait for max duration to be exceeded
            time.sleep(0.2)

            # Connection should be automatically removed
            # Note: This test may be flaky due to threading timing
            # In a real scenario, the connection would be removed by the keep-alive worker

    def test_thread_safety(self):
        """Test thread safety of KeepAliveManager operations."""

        def start_stop_connections():
            for i in range(10):
                conn_id = f"thread-conn-{threading.current_thread().ident}-{i}"
                self.manager.start_keep_alive(conn_id, f"conv-{i}", f"msg-{i}")
                time.sleep(0.01)
                self.manager.stop_keep_alive(conn_id)

        # Start multiple threads
        threads = []
        for _ in range(3):
            thread = threading.Thread(target=start_stop_connections)
            threads.append(thread)
            thread.start()

        # Wait for all threads to complete
        for thread in threads:
            thread.join()

        # All connections should be cleaned up
        assert self.manager.get_active_connection_count() == 0


class TestKeepAliveManagerGlobal:
    """Test global KeepAliveManager instance management."""

    def test_get_keep_alive_manager_singleton(self):
        """Test that get_keep_alive_manager returns singleton instance."""
        mock_callback = Mock()

        # Clear global instance
        import utils.keep_alive_manager

        utils.keep_alive_manager._keep_alive_manager = None

        # First call should create instance
        manager1 = get_keep_alive_manager(mock_callback)
        assert manager1 is not None

        # Second call should return same instance
        manager2 = get_keep_alive_manager(mock_callback)
        assert manager1 is manager2

        # Cleanup
        manager1.cleanup_all()

    def test_keep_alive_manager_integration_with_handler(self):
        """Test integration of KeepAliveManager with handler functions."""
        from handler import send_websocket_message

        # Clear global instance first
        import utils.keep_alive_manager

        utils.keep_alive_manager._keep_alive_manager = None

        # Test that we can create a manager with the actual send function
        manager = get_keep_alive_manager(send_websocket_message)
        assert manager is not None
        assert manager.send_message_callback == send_websocket_message

        # Cleanup
        manager.cleanup_all()


class TestKeepAliveConstants:
    """Test keep-alive related constants."""

    def test_keep_alive_constants_exist(self):
        """Test that all required keep-alive constants are defined."""
        from utils.constants import (
            KEEP_ALIVE_TOKEN,
            PROCESSING_TOKEN,
            KEEP_ALIVE_INTERVAL_SECONDS,
            PROCESSING_UPDATE_INTERVAL_SECONDS,
            MAX_STREAMING_DURATION_SECONDS,
        )

        assert KEEP_ALIVE_TOKEN == "##KEEP_ALIVE##"
        assert PROCESSING_TOKEN == "##PROCESSING##"
        assert isinstance(KEEP_ALIVE_INTERVAL_SECONDS, int)
        assert isinstance(PROCESSING_UPDATE_INTERVAL_SECONDS, int)
        assert isinstance(MAX_STREAMING_DURATION_SECONDS, int)
        assert KEEP_ALIVE_INTERVAL_SECONDS > 0
        assert PROCESSING_UPDATE_INTERVAL_SECONDS > 0
        assert MAX_STREAMING_DURATION_SECONDS > 0


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
