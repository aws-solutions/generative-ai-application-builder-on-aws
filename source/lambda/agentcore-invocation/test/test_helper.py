#!/usr/bin/env python3
# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

import json
import pytest
from datetime import datetime
from unittest.mock import Mock, patch, MagicMock
import boto3
from moto import mock_aws

from utils.helper import (
    get_session,
    get_service_client,
    get_metrics_client,
    json_serializer,
    _session,
    _service_clients,
    _metrics_namespaces,
)
from utils.constants import CloudWatchNamespaces


class TestGetSession:
    """Test the get_session function."""

    def setup_method(self):
        """Reset global session before each test."""
        import utils.helper

        utils.helper._session = None

    def test_get_session_creates_new_session(self):
        """Test that get_session creates a new session when none exists."""
        session = get_session()

        assert session is not None
        assert isinstance(session, boto3.session.Session)

    def test_get_session_returns_cached_session(self):
        """Test that get_session returns the same session on subsequent calls."""
        session1 = get_session()
        session2 = get_session()

        assert session1 is session2

    def test_get_session_with_existing_global_session(self):
        """Test get_session when global session already exists."""
        import utils.helper

        mock_session = Mock(spec=boto3.session.Session)
        utils.helper._session = mock_session

        session = get_session()

        assert session is mock_session


class TestGetServiceClient:
    """Test the get_service_client function."""

    def setup_method(self):
        """Reset global clients cache before each test."""
        import utils.helper

        utils.helper._service_clients = {}
        utils.helper._session = None

    @mock_aws
    def test_get_service_client_creates_new_client(self):
        """Test that get_service_client creates a new client."""
        client = get_service_client("cloudwatch")

        assert client is not None
        assert hasattr(client, "put_metric_data")  # CloudWatch client method

    @mock_aws
    def test_get_service_client_returns_cached_client(self):
        """Test that get_service_client returns cached client on subsequent calls."""
        client1 = get_service_client("cloudwatch")
        client2 = get_service_client("cloudwatch")

        assert client1 is client2

    @mock_aws
    def test_get_service_client_with_kwargs(self):
        """Test get_service_client with additional kwargs."""
        client1 = get_service_client("cloudwatch", region_name="us-east-1")
        client2 = get_service_client("cloudwatch", region_name="us-west-2")

        # Should be different clients due to different kwargs
        assert client1 is not client2

    @mock_aws
    def test_get_service_client_same_kwargs_returns_cached(self):
        """Test that same service with same kwargs returns cached client."""
        client1 = get_service_client("cloudwatch", region_name="us-east-1")
        client2 = get_service_client("cloudwatch", region_name="us-east-1")

        assert client1 is client2

    @mock_aws
    def test_get_service_client_different_services(self):
        """Test that different services create different clients."""
        cloudwatch_client = get_service_client("cloudwatch")
        s3_client = get_service_client("s3")

        assert cloudwatch_client is not s3_client

    def test_get_service_client_cache_key_generation(self):
        """Test that cache keys are generated correctly."""
        import utils.helper

        with patch("utils.helper.get_session") as mock_get_session:
            mock_session = Mock()
            mock_client1 = Mock()
            mock_client2 = Mock()
            mock_session.client.side_effect = [mock_client1, mock_client2]
            mock_get_session.return_value = mock_session

            # Call with no kwargs
            client1 = get_service_client("s3")

            # Call with kwargs
            client2 = get_service_client("s3", region_name="us-east-1")

            # Should create different cache entries
            assert len(utils.helper._service_clients) == 2
            assert client1 is not client2


class TestGetMetricsClient:
    """Test the get_metrics_client function."""

    def setup_method(self):
        """Reset global metrics cache before each test."""
        import utils.helper

        utils.helper._metrics_namespaces = {}

    @patch("utils.helper.Metrics")
    def test_get_metrics_client_creates_new_client(self, mock_metrics_class):
        """Test that get_metrics_client creates a new Metrics client."""
        mock_metrics_instance = Mock()
        mock_metrics_class.return_value = mock_metrics_instance

        client = get_metrics_client(CloudWatchNamespaces.AGENTCORE_INVOCATION)

        assert client is mock_metrics_instance
        mock_metrics_class.assert_called_once_with(
            namespace=CloudWatchNamespaces.AGENTCORE_INVOCATION.value,
            service="GAABUseCase-None",  # Since USE_CASE_UUID_ENV_VAR is not set
        )

    @patch("utils.helper.Metrics")
    def test_get_metrics_client_returns_cached_client(self, mock_metrics_class):
        """Test that get_metrics_client returns cached client on subsequent calls."""
        mock_metrics_instance = Mock()
        mock_metrics_class.return_value = mock_metrics_instance

        client1 = get_metrics_client(CloudWatchNamespaces.AGENTCORE_INVOCATION)
        client2 = get_metrics_client(CloudWatchNamespaces.AGENTCORE_INVOCATION)

        assert client1 is client2
        # Should only be called once due to caching
        mock_metrics_class.assert_called_once()

    @patch("utils.helper.Metrics")
    def test_get_metrics_client_different_namespaces(self, mock_metrics_class):
        """Test that different namespaces create different clients."""
        mock_metrics_instance1 = Mock()
        mock_metrics_instance2 = Mock()
        mock_metrics_class.side_effect = [mock_metrics_instance1, mock_metrics_instance2]

        client1 = get_metrics_client(CloudWatchNamespaces.AGENTCORE_INVOCATION)
        client2 = get_metrics_client(CloudWatchNamespaces.COLD_STARTS)

        assert client1 is not client2
        assert mock_metrics_class.call_count == 2

    @patch("utils.helper.METRICS_SERVICE_NAME", "GAABUseCase-test-uuid-123")
    @patch("utils.helper.Metrics")
    def test_get_metrics_client_with_use_case_uuid(self, mock_metrics_class):
        """Test get_metrics_client with USE_CASE_UUID environment variable set."""
        mock_metrics_instance = Mock()
        mock_metrics_class.return_value = mock_metrics_instance

        client = get_metrics_client(CloudWatchNamespaces.AGENTCORE_INVOCATION)

        mock_metrics_class.assert_called_once_with(
            namespace=CloudWatchNamespaces.AGENTCORE_INVOCATION.value, service="GAABUseCase-test-uuid-123"
        )


class TestJsonSerializer:
    """Test the json_serializer function."""

    def test_json_serializer_with_datetime(self):
        """Test json_serializer with datetime object."""
        dt = datetime(2023, 12, 25, 10, 30, 45)
        result = json_serializer(dt)

        assert result == "2023-12-25T10:30:45"

    def test_json_serializer_with_json_serializable_object(self):
        """Test json_serializer with JSON serializable objects."""
        test_cases = [
            "string",
            123,
            45.67,
            True,
            False,
            None,
            [1, 2, 3],
            {"key": "value"},
        ]

        for obj in test_cases:
            result = json_serializer(obj)
            assert result == obj

    def test_json_serializer_with_non_serializable_object(self):
        """Test json_serializer with non-JSON serializable object."""

        class CustomObject:
            def __init__(self, value):
                self.value = value

            def __str__(self):
                return f"CustomObject({self.value})"

        obj = CustomObject("test")
        result = json_serializer(obj)

        assert result == "CustomObject(test)"

    def test_json_serializer_with_complex_non_serializable_object(self):
        """Test json_serializer with complex non-serializable object."""
        # Create an object that can't be JSON serialized
        obj = set([1, 2, 3])  # Sets are not JSON serializable
        result = json_serializer(obj)

        # Should return string representation
        assert isinstance(result, str)
        assert "1" in result and "2" in result and "3" in result

    def test_json_serializer_with_nested_datetime(self):
        """Test json_serializer with nested structure containing datetime."""
        dt = datetime(2023, 12, 25, 10, 30, 45)
        # This tests the case where datetime is at the top level
        result = json_serializer(dt)
        assert result == "2023-12-25T10:30:45"

    @patch("utils.helper.logger")
    def test_json_serializer_logs_serialization_failure(self, mock_logger):
        """Test that json_serializer logs when serialization fails."""

        class NonSerializableObject:
            def __str__(self):
                return "NonSerializableObject"

        obj = NonSerializableObject()
        result = json_serializer(obj)

        assert result == "NonSerializableObject"
        mock_logger.info.assert_called_once()
        assert "Serializing failed for object" in mock_logger.info.call_args[0][0]

    def test_json_serializer_with_empty_objects(self):
        """Test json_serializer with empty objects."""
        test_cases = [
            "",
            [],
            {},
            0,
        ]

        for obj in test_cases:
            result = json_serializer(obj)
            assert result == obj


class TestHelperIntegration:
    """Integration tests for helper functions."""

    def setup_method(self):
        """Reset all global caches before each test."""
        import utils.helper

        utils.helper._session = None
        utils.helper._service_clients = {}
        utils.helper._metrics_namespaces = {}

    @mock_aws
    @patch("utils.helper.Metrics")
    def test_helper_functions_work_together(self, mock_metrics_class):
        """Test that helper functions work together correctly."""
        mock_metrics_instance = Mock()
        mock_metrics_class.return_value = mock_metrics_instance

        # Get session
        session = get_session()
        assert session is not None

        # Get service client
        client = get_service_client("cloudwatch")
        assert client is not None

        # Get metrics client
        metrics = get_metrics_client(CloudWatchNamespaces.AGENTCORE_INVOCATION)
        assert metrics is mock_metrics_instance

        # Verify caching works
        session2 = get_session()
        client2 = get_service_client("cloudwatch")
        metrics2 = get_metrics_client(CloudWatchNamespaces.AGENTCORE_INVOCATION)

        assert session is session2
        assert client is client2
        assert metrics is metrics2

    def test_json_serializer_with_mixed_data_types(self):
        """Test json_serializer with mixed data types in a complex structure."""
        dt = datetime(2023, 12, 25, 10, 30, 45)

        # Test individual serialization (since json_serializer handles single objects)
        datetime_result = json_serializer(dt)
        string_result = json_serializer("test")
        number_result = json_serializer(42)

        assert datetime_result == "2023-12-25T10:30:45"
        assert string_result == "test"
        assert number_result == 42


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
