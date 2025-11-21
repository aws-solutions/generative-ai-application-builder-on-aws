# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

import time
import threading
from typing import Callable, Optional
from aws_lambda_powertools import Logger

from utils.constants import (
    KEEP_ALIVE_INTERVAL_SECONDS,
    PROCESSING_UPDATE_INTERVAL_SECONDS,
    MAX_STREAMING_DURATION_SECONDS,
    KEEP_ALIVE_TOKEN,
    PROCESSING_TOKEN,
)

logger = Logger(utc=True)


class KeepAliveManager:
    """
    Manages keep-alive and processing update messages for long-running AgentCore operations.

    This class handles:
    1. Keep-alive pings to maintain WebSocket connections
    2. Processing updates to inform users that work is ongoing
    3. Connection health monitoring during streaming
    4. Automatic cleanup when operations complete or timeout
    """

    def __init__(self, send_message_callback: Callable[[str, str, str, str], None]):
        """
        Initialize the KeepAliveManager.

        Args:
            send_message_callback: Function to send messages via WebSocket
                                 Signature: (connection_id, conversation_id, message, message_id) -> None
        """
        self.send_message_callback = send_message_callback
        self.active_connections = {}  # connection_id -> connection_info
        self.keep_alive_thread = None
        self.processing_thread = None
        self.shutdown_event = threading.Event()
        self.lock = threading.Lock()

    def start_keep_alive(self, connection_id: str, conversation_id: str, message_id: str) -> None:
        """
        Start keep-alive monitoring for a connection during long-running operations.

        Args:
            connection_id: WebSocket connection ID
            conversation_id: Conversation ID
            message_id: Message ID for response formatting
        """
        with self.lock:
            # Store connection info
            self.active_connections[connection_id] = {
                "conversation_id": conversation_id,
                "message_id": message_id,
                "start_time": time.time(),
                "last_keep_alive": time.time(),
                "last_processing_update": time.time(),
            }

            logger.info(f"Started keep-alive monitoring for connection {connection_id}")

            # Start background threads if not already running
            if self.keep_alive_thread is None or not self.keep_alive_thread.is_alive():
                self.shutdown_event.clear()
                self.keep_alive_thread = threading.Thread(target=self._keep_alive_worker, daemon=True)
                self.keep_alive_thread.start()

            if self.processing_thread is None or not self.processing_thread.is_alive():
                self.processing_thread = threading.Thread(target=self._processing_update_worker, daemon=True)
                self.processing_thread.start()

    def stop_keep_alive(self, connection_id: str) -> None:
        """
        Stop keep-alive monitoring for a specific connection.

        Args:
            connection_id: WebSocket connection ID to stop monitoring
        """
        with self.lock:
            if connection_id in self.active_connections:
                connection_info = self.active_connections.pop(connection_id)
                duration = time.time() - connection_info["start_time"]
                logger.info(f"Stopped keep-alive monitoring for connection {connection_id} after {duration:.2f}s")

            # If no more active connections, signal shutdown
            if not self.active_connections:
                self.shutdown_event.set()

    def update_activity(self, connection_id: str) -> None:
        """
        Update the last activity time for a connection (called when content is sent).

        Args:
            connection_id: WebSocket connection ID
        """
        with self.lock:
            if connection_id in self.active_connections:
                self.active_connections[connection_id]["last_keep_alive"] = time.time()
                self.active_connections[connection_id]["last_processing_update"] = time.time()

    def _keep_alive_worker(self) -> None:
        """Background worker that sends keep-alive messages."""
        logger.info("Keep-alive worker started")

        while not self.shutdown_event.is_set():
            try:
                current_time = time.time()
                connections_to_process = self._get_connections_snapshot()

                for connection_id, connection_info in connections_to_process:
                    self._process_keep_alive_for_connection(connection_id, connection_info, current_time)

                self.shutdown_event.wait(5)  # Check every 5 seconds

            except Exception as e:
                logger.error(f"Error in keep-alive worker: {str(e)}")
                self.shutdown_event.wait(5)

        logger.info("Keep-alive worker stopped")

    def _get_connections_snapshot(self) -> list:
        """
        Get a snapshot of active connections to avoid holding lock too long.

        Returns:
            List of (connection_id, connection_info) tuples
        """
        with self.lock:
            return list(self.active_connections.items())

    def _process_keep_alive_for_connection(
        self, connection_id: str, connection_info: dict, current_time: float
    ) -> None:
        """
        Process keep-alive for a single connection.

        Args:
            connection_id: WebSocket connection ID
            connection_info: Connection information dictionary
            current_time: Current timestamp
        """
        try:
            if self._should_stop_connection(connection_id, connection_info, current_time):
                return

            if self._should_send_keep_alive(connection_info, current_time):
                self._send_keep_alive_message(connection_id, connection_info)
                self._update_keep_alive_time(connection_id, current_time)

        except Exception as e:
            logger.error(f"Error sending keep-alive for connection {connection_id}: {str(e)}")
            self.stop_keep_alive(connection_id)

    def _should_stop_connection(self, connection_id: str, connection_info: dict, current_time: float) -> bool:
        """
        Check if connection should be stopped due to timeout.

        Args:
            connection_id: WebSocket connection ID
            connection_info: Connection information dictionary
            current_time: Current timestamp

        Returns:
            True if connection should be stopped
        """
        if current_time - connection_info["start_time"] > MAX_STREAMING_DURATION_SECONDS:
            logger.warning(f"Connection {connection_id} exceeded maximum streaming duration, stopping keep-alive")
            self.stop_keep_alive(connection_id)
            return True
        return False

    def _should_send_keep_alive(self, connection_info: dict, current_time: float) -> bool:
        """
        Check if keep-alive message should be sent.

        Args:
            connection_info: Connection information dictionary
            current_time: Current timestamp

        Returns:
            True if keep-alive should be sent
        """
        return current_time - connection_info["last_keep_alive"] >= KEEP_ALIVE_INTERVAL_SECONDS

    def _update_keep_alive_time(self, connection_id: str, current_time: float) -> None:
        """
        Update the last keep-alive time for a connection.

        Args:
            connection_id: WebSocket connection ID
            current_time: Current timestamp
        """
        with self.lock:
            if connection_id in self.active_connections:
                self.active_connections[connection_id]["last_keep_alive"] = current_time

    def _processing_update_worker(self) -> None:
        """Background worker that sends processing update messages."""
        logger.info("Processing update worker started")

        while not self.shutdown_event.is_set():
            try:
                current_time = time.time()
                connections_to_process = []

                with self.lock:
                    connections_to_process = list(self.active_connections.items())

                for connection_id, connection_info in connections_to_process:
                    try:
                        if (
                            current_time - connection_info["last_processing_update"]
                            >= PROCESSING_UPDATE_INTERVAL_SECONDS
                        ):
                            self._send_processing_update(connection_id, connection_info)

                            # Update last processing update time
                            with self.lock:
                                if connection_id in self.active_connections:
                                    self.active_connections[connection_id]["last_processing_update"] = current_time

                    except Exception as e:
                        logger.error(f"Error sending processing update for connection {connection_id}: {str(e)}")
                        # Remove problematic connection
                        self.stop_keep_alive(connection_id)

                # Sleep for a short interval before next check
                self.shutdown_event.wait(3)  # Check every 3 seconds

            except Exception as e:
                logger.error(f"Error in processing update worker: {str(e)}")
                self.shutdown_event.wait(3)

        logger.info("Processing update worker stopped")

    def _send_keep_alive_message(self, connection_id: str, connection_info: dict) -> None:
        """
        Send a keep-alive message to maintain WebSocket connection.

        Args:
            connection_id: WebSocket connection ID
            connection_info: Connection information dictionary
        """
        try:
            self.send_message_callback(
                connection_id, connection_info["conversation_id"], KEEP_ALIVE_TOKEN, connection_info["message_id"]
            )
            logger.debug(f"Sent keep-alive message to connection {connection_id}")
        except Exception as e:
            logger.error(f"Failed to send keep-alive message to connection {connection_id}: {str(e)}")
            raise

    def _send_processing_update(self, connection_id: str, connection_info: dict) -> None:
        """
        Send a processing update to inform the user that work is ongoing.

        Args:
            connection_id: WebSocket connection ID
            connection_info: Connection information dictionary
        """
        try:
            duration = time.time() - connection_info["start_time"]
            self.send_message_callback(
                connection_id, connection_info["conversation_id"], PROCESSING_TOKEN, connection_info["message_id"]
            )
            logger.debug(f"Sent processing update to connection {connection_id} (duration: {duration:.1f}s)")
        except Exception as e:
            logger.error(f"Failed to send processing update to connection {connection_id}: {str(e)}")
            raise

    def get_connection_status(self, connection_id: str) -> Optional[dict]:
        """
        Get status information for a connection.

        Args:
            connection_id: WebSocket connection ID

        Returns:
            Dict with connection status or None if not found
        """
        with self.lock:
            if connection_id in self.active_connections:
                connection_info = self.active_connections[connection_id].copy()
                current_time = time.time()
                connection_info["duration"] = current_time - connection_info["start_time"]
                connection_info["time_since_last_keep_alive"] = current_time - connection_info["last_keep_alive"]
                connection_info["time_since_last_processing_update"] = (
                    current_time - connection_info["last_processing_update"]
                )
                return connection_info
            return None

    def cleanup_all(self) -> None:
        """Clean up all active connections and stop background threads."""
        logger.info("Cleaning up all keep-alive connections")

        with self.lock:
            connection_count = len(self.active_connections)
            self.active_connections.clear()

        self.shutdown_event.set()

        # Wait for threads to finish
        if self.keep_alive_thread and self.keep_alive_thread.is_alive():
            self.keep_alive_thread.join(timeout=5)

        if self.processing_thread and self.processing_thread.is_alive():
            self.processing_thread.join(timeout=5)

        logger.info(f"Cleaned up {connection_count} keep-alive connections")

    def get_active_connection_count(self) -> int:
        """Get the number of active connections being monitored."""
        with self.lock:
            return len(self.active_connections)


# Global keep-alive manager instance
_keep_alive_manager = None


def get_keep_alive_manager(send_message_callback: Callable[[str, str, str, str], None]) -> KeepAliveManager:
    """
    Get or create the global KeepAliveManager instance.

    Args:
        send_message_callback: Function to send messages via WebSocket

    Returns:
        KeepAliveManager: The global keep-alive manager instance
    """
    global _keep_alive_manager

    if _keep_alive_manager is None:
        _keep_alive_manager = KeepAliveManager(send_message_callback)
        logger.info("Initialized global KeepAliveManager")

    return _keep_alive_manager
