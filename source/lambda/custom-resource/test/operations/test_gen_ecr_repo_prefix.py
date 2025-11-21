#!/usr/bin/env python
# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

import json

import mock
import pytest
from lambda_func import handler
from operations.gen_ecr_repo_prefix import execute, verify_env_setup, sanitize_and_truncate_prefix
from operations.operation_types import RESOURCE, RESOURCE_PROPERTIES
from test.fixtures.gen_ecr_repo_prefix_events import lambda_event


class TestGenEcrRepoPrefix:
    def test_sanitize_and_truncate_prefix_normal_case(self):
        """Test normal stack name sanitization"""
        result = sanitize_and_truncate_prefix("DeploymentPlatformStack")
        assert result == "deploymentplatformstack"
        assert len(result) <= 30

    def test_sanitize_and_truncate_prefix_with_special_chars(self):
        """Test stack name with special characters"""
        result = sanitize_and_truncate_prefix("My-Stack@Name#123")
        assert result == "my-stack-name-123"
        assert len(result) <= 30

    def test_sanitize_and_truncate_prefix_long_name(self):
        """Test very long stack name truncation"""
        long_name = "VeryLongDeploymentPlatformStackNameThatExceedsThirtyCharacters"
        result = sanitize_and_truncate_prefix(long_name)
        assert len(result) <= 30
        assert result.startswith("verylongdeploymentplatformst")

    def test_sanitize_and_truncate_prefix_empty_after_sanitization(self):
        """Test edge case where name becomes empty after sanitization"""
        result = sanitize_and_truncate_prefix("@#$%^&*()")
        assert result == "gaab-default"

    def test_sanitize_and_truncate_prefix_leading_trailing_special_chars(self):
        """Test removal of leading/trailing special characters"""
        result = sanitize_and_truncate_prefix("-._MyStack-._")
        assert result == "mystack"
        assert not result.startswith(('-', '.', '_'))
        assert not result.endswith(('-', '.', '_'))

    @pytest.mark.parametrize("requestType", ["Create"])
    def test_gen_ecr_repo_prefix_success_stack_name(self, lambda_event, mock_lambda_context, requestType):
        """Test successful ECR repository prefix generation from stack name"""
        lambda_event["RequestType"] = requestType
        
        with mock.patch("cfn_response.http") as mocked_PoolManager:
            execute(lambda_event, mock_lambda_context)
            mocked_PoolManager.request.assert_called_once()

            call_kwargs = mocked_PoolManager.request.call_args.kwargs
            assert call_kwargs["method"] == "PUT"
            assert call_kwargs["url"] == "https://fakeurl/doesnotexist"

            body = json.loads(call_kwargs["body"])
            assert body["Status"] == "SUCCESS"
            assert body["Reason"] == "See the details in CloudWatch Log Stream: fake_logstream_name"
            assert body["PhysicalResourceId"] == "fake_logstream_name"
            assert body["StackId"] == "fakeStackId"
            assert body["RequestId"] == "fakeRequestId"
            assert body["LogicalResourceId"] == "fakeLogicalResourceId"
            assert body["NoEcho"] == False
            assert "EcrRepoPrefix" in body["Data"]
            assert isinstance(body["Data"]["EcrRepoPrefix"], str)
            assert len(body["Data"]["EcrRepoPrefix"]) <= 30

    @pytest.mark.parametrize("requestType", ["Update"])
    def test_gen_ecr_repo_prefix_success_update(self, lambda_event, mock_lambda_context, requestType):
        """Test successful ECR repository prefix generation on update (no-op)"""
        lambda_event["RequestType"] = requestType
        
        with mock.patch("cfn_response.http") as mocked_PoolManager:
            with mock.patch("operations.gen_ecr_repo_prefix.logger") as mock_logger:
                execute(lambda_event, mock_lambda_context)
                mocked_PoolManager.request.assert_called_once()

                # Verify no-op logging
                mock_logger.info.assert_called_with("Update operation is a no-op for ECR repository prefix generation")

                call_kwargs = mocked_PoolManager.request.call_args.kwargs
                body = json.loads(call_kwargs["body"])
                assert body["Status"] == "SUCCESS"
                assert body["Data"] == {}  # Update should return empty data like Delete

    @pytest.mark.parametrize("requestType", ["Delete"])
    def test_gen_ecr_repo_prefix_success_delete(self, lambda_event, mock_lambda_context, requestType):
        """Test successful ECR repository prefix generation on delete"""
        lambda_event["RequestType"] = requestType
        
        with mock.patch("cfn_response.http") as mocked_PoolManager:
            execute(lambda_event, mock_lambda_context)
            mocked_PoolManager.request.assert_called_once()

            call_kwargs = mocked_PoolManager.request.call_args.kwargs
            body = json.loads(call_kwargs["body"])
            assert body["Status"] == "SUCCESS"
            assert body["Data"] == {}

    def test_verify_env_setup_success(self, lambda_event):
        """Test successful environment setup verification"""
        verify_env_setup(lambda_event)
        # Should not raise any exception

    def test_verify_env_setup_missing_both_properties(self, lambda_event):
        """Test environment setup with missing both StackName and UseCaseShortId"""
        del lambda_event[RESOURCE_PROPERTIES]["StackName"]
        
        with pytest.raises(ValueError, match="Missing required property: either StackName or UseCaseShortId must be provided"):
            verify_env_setup(lambda_event)

    def test_verify_env_setup_with_use_case_short_id(self, lambda_event):
        """Test environment setup with UseCaseShortId instead of StackName"""
        del lambda_event[RESOURCE_PROPERTIES]["StackName"]
        lambda_event[RESOURCE_PROPERTIES]["UseCaseShortId"] = "a1b2c3d4"
        
        # Should not raise any exception
        verify_env_setup(lambda_event)

    @pytest.mark.parametrize("requestType", ["Create", "Update", "Delete"])
    def test_when_operation_type_is_invalid(self, lambda_event, mock_lambda_context, requestType):
        """Test behavior with invalid operation type"""
        lambda_event[RESOURCE_PROPERTIES][RESOURCE] = "INVALID_OPERATION"
        lambda_event["RequestType"] = requestType
        
        with pytest.raises(ValueError):
            verify_env_setup(lambda_event)

        with mock.patch("cfn_response.http") as mocked_PoolManager:
            execute(lambda_event, mock_lambda_context)
            mocked_PoolManager.request.assert_called_once()

            call_kwargs = mocked_PoolManager.request.call_args.kwargs
            body = json.loads(call_kwargs["body"])
            assert body["Status"] == "FAILED"
            assert "Operation type not available or did not match" in body["Reason"]

    @pytest.mark.parametrize("requestType", ["Create", "Update", "Delete"])
    def test_lambda_handler(self, lambda_event, mock_lambda_context, requestType):
        """Test lambda handler for all request types"""
        lambda_event["RequestType"] = requestType

        with mock.patch("cfn_response.http") as mocked_PoolManager:
            handler(lambda_event, mock_lambda_context)
            mocked_PoolManager.request.assert_called_once()

    def test_when_sanitization_fails(self, lambda_event, mock_lambda_context):
        """Test behavior when sanitization fails"""
        lambda_event["RequestType"] = "Create"
        
        with mock.patch("operations.gen_ecr_repo_prefix.sanitize_and_truncate_prefix") as sanitize_mock:
            sanitize_mock.side_effect = Exception("Fake sanitization error")

            with mock.patch("cfn_response.http") as mocked_PoolManager:
                execute(lambda_event, mock_lambda_context)

                call_kwargs = mocked_PoolManager.request.call_args.kwargs
                body = json.loads(call_kwargs["body"])
                assert body["Status"] == "FAILED"
                assert "Fake sanitization error" in body["Reason"]

    def test_update_does_not_call_generate_prefix(self, lambda_event, mock_lambda_context):
        """Test that Update operations don't call generate_prefix_from_inputs"""
        lambda_event["RequestType"] = "Update"
        
        with mock.patch("operations.gen_ecr_repo_prefix.generate_prefix_from_inputs") as generate_mock:
            with mock.patch("cfn_response.http") as mocked_PoolManager:
                execute(lambda_event, mock_lambda_context)
                
                # Verify generate_prefix_from_inputs was NOT called
                generate_mock.assert_not_called()
                
                call_kwargs = mocked_PoolManager.request.call_args.kwargs
                body = json.loads(call_kwargs["body"])
                assert body["Status"] == "SUCCESS"
                assert body["Data"] == {}