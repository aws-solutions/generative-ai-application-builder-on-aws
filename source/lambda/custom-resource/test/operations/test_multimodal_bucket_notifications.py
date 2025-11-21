#!/usr/bin/env python
# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

import json
from unittest.mock import MagicMock, patch

import pytest
from operations import multimodal_bucket_notifications
from operations.operation_types import FAILED, SUCCESS
from utils.constants import MULTIMODAL_FILES_BUCKET_NAME_ENV_VAR


def test_multimodal_bucket_notifications_create_success():
    """Test successful creation of bucket notifications"""
    event = {
        "RequestType": "Create",
        "ResourceProperties": {MULTIMODAL_FILES_BUCKET_NAME_ENV_VAR: "test-bucket", "EnableEventBridge": True},
    }

    context = MagicMock()

    with patch("operations.multimodal_bucket_notifications.get_service_client") as mock_get_service_client:
        mock_s3_client = MagicMock()
        mock_get_service_client.return_value = mock_s3_client

        with patch("operations.multimodal_bucket_notifications.send_response") as mock_send_response:
            multimodal_bucket_notifications.execute(event, context)

            mock_get_service_client.assert_called_once_with("s3")
            mock_s3_client.put_bucket_notification_configuration.assert_called_once_with(
                Bucket="test-bucket", NotificationConfiguration={"EventBridgeConfiguration": {}}
            )

            mock_send_response.assert_called_once_with(
                event, context, SUCCESS, {"BucketName": "test-bucket", "EventBridgeEnabled": True}
            )


def test_multimodal_bucket_notifications_delete_success():
    """Test successful deletion of bucket notifications"""
    event = {
        "RequestType": "Delete",
        "ResourceProperties": {MULTIMODAL_FILES_BUCKET_NAME_ENV_VAR: "test-bucket", "EnableEventBridge": True},
    }

    context = MagicMock()

    with patch("operations.multimodal_bucket_notifications.get_service_client") as mock_get_service_client:
        mock_s3_client = MagicMock()
        mock_get_service_client.return_value = mock_s3_client

        with patch("operations.multimodal_bucket_notifications.send_response") as mock_send_response:
            multimodal_bucket_notifications.execute(event, context)

            mock_get_service_client.assert_called_once_with("s3")
            mock_s3_client.put_bucket_notification_configuration.assert_called_once_with(
                Bucket="test-bucket", NotificationConfiguration={}
            )

            mock_send_response.assert_called_once_with(
                event, context, SUCCESS, {"BucketName": "test-bucket", "EventBridgeEnabled": True}
            )


def test_multimodal_bucket_notifications_missing_bucket_name():
    """Test error handling when bucket name is missing"""
    event = {"RequestType": "Create", "ResourceProperties": {"EnableEventBridge": True}}

    context = MagicMock()

    with patch("operations.multimodal_bucket_notifications.send_response") as mock_send_response:
        with pytest.raises(ValueError):
            multimodal_bucket_notifications.execute(event, context)

        mock_send_response.assert_called_once_with(
            event,
            context,
            FAILED,
            {},
            reason=f"{MULTIMODAL_FILES_BUCKET_NAME_ENV_VAR} is required in ResourceProperties",
        )


def test_multimodal_bucket_notifications_s3_error():
    """Test error handling when S3 operation fails"""
    event = {
        "RequestType": "Create",
        "ResourceProperties": {MULTIMODAL_FILES_BUCKET_NAME_ENV_VAR: "test-bucket", "EnableEventBridge": True},
    }

    context = MagicMock()

    with patch("operations.multimodal_bucket_notifications.get_service_client") as mock_get_service_client:
        mock_s3_client = MagicMock()
        mock_s3_client.put_bucket_notification_configuration.side_effect = Exception("S3 Error")
        mock_get_service_client.return_value = mock_s3_client

        with patch("operations.multimodal_bucket_notifications.send_response") as mock_send_response:
            with pytest.raises(Exception):
                multimodal_bucket_notifications.execute(event, context)

            mock_get_service_client.assert_called_once_with("s3")
            mock_send_response.assert_called_once_with(event, context, FAILED, {}, reason="S3 Error")


def test_multimodal_bucket_notifications_delete_with_error():
    """Test that delete operation doesn't fail when S3 operation fails"""
    event = {
        "RequestType": "Delete",
        "ResourceProperties": {MULTIMODAL_FILES_BUCKET_NAME_ENV_VAR: "test-bucket", "EnableEventBridge": True},
    }

    context = MagicMock()

    with patch("operations.multimodal_bucket_notifications.get_service_client") as mock_get_service_client:
        mock_s3_client = MagicMock()
        mock_s3_client.put_bucket_notification_configuration.side_effect = Exception("Bucket not found")
        mock_get_service_client.return_value = mock_s3_client

        with patch("operations.multimodal_bucket_notifications.send_response") as mock_send_response:
            multimodal_bucket_notifications.execute(event, context)

            mock_get_service_client.assert_called_once_with("s3")
            mock_send_response.assert_called_once_with(
                event, context, SUCCESS, {"BucketName": "test-bucket", "EventBridgeEnabled": True}
            )
