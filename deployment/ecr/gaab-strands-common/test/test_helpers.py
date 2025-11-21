# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

"""
Tests for helper functions
"""

import pytest
from unittest.mock import patch
from gaab_strands_common.models import BedrockLlmParams
from gaab_strands_common.utils.helpers import build_guardrail_config


class TestBuildGuardrailConfig:
    """Tests for build_guardrail_config function"""

    def test_build_guardrail_config_with_both_fields(self):
        """Test guardrail config built when both fields present"""
        params = BedrockLlmParams(
            ModelId="amazon.nova-pro-v1:0",
            BedrockInferenceType="OTHER_FOUNDATION",
            GuardrailIdentifier="abc123xyz",
            GuardrailVersion="1",
        )
        config = build_guardrail_config(params)
        assert config == {"guardrail_id": "abc123xyz", "guardrail_version": "1"}

    def test_build_guardrail_config_missing_fields(self):
        """Test empty config when fields missing"""
        params = BedrockLlmParams(
            ModelId="amazon.nova-pro-v1:0",
            BedrockInferenceType="OTHER_FOUNDATION",
        )
        config = build_guardrail_config(params)
        assert config == {}

    def test_build_guardrail_config_partial_identifier_only(self):
        """Test empty config when only identifier present"""
        params = BedrockLlmParams(
            ModelId="amazon.nova-pro-v1:0",
            BedrockInferenceType="OTHER_FOUNDATION",
            GuardrailIdentifier="abc123xyz",
        )
        config = build_guardrail_config(params)
        assert config == {}

    def test_build_guardrail_config_partial_version_only(self):
        """Test empty config when only version present"""
        params = BedrockLlmParams(
            ModelId="amazon.nova-pro-v1:0",
            BedrockInferenceType="OTHER_FOUNDATION",
            GuardrailVersion="1",
        )
        config = build_guardrail_config(params)
        assert config == {}

    def test_build_guardrail_config_empty_strings(self):
        """Test empty config when fields are empty strings"""
        params = BedrockLlmParams(
            ModelId="amazon.nova-pro-v1:0",
            BedrockInferenceType="OTHER_FOUNDATION",
            GuardrailIdentifier="",
            GuardrailVersion="",
        )
        config = build_guardrail_config(params)
        assert config == {}

    def test_build_guardrail_config_with_inference_profile(self):
        """Test guardrail config works with inference profile"""
        params = BedrockLlmParams(
            InferenceProfileId="us.anthropic.claude-3-5-sonnet-20241022-v2:0",
            BedrockInferenceType="INFERENCE_PROFILE",
            GuardrailIdentifier="def456uvw",
            GuardrailVersion="2",
        )
        config = build_guardrail_config(params)
        assert config == {"guardrail_id": "def456uvw", "guardrail_version": "2"}

    def test_build_guardrail_config_with_provisioned(self):
        """Test guardrail config works with provisioned throughput"""
        params = BedrockLlmParams(
            ModelArn="arn:aws:bedrock:us-east-1:123456789012:provisioned-model/abc",
            BedrockInferenceType="PROVISIONED",
            GuardrailIdentifier="ghi789rst",
            GuardrailVersion="3",
        )
        config = build_guardrail_config(params)
        assert config == {"guardrail_id": "ghi789rst", "guardrail_version": "3"}

    @patch("gaab_strands_common.utils.helpers.logger")
    def test_build_guardrail_config_logs_debug(self, mock_logger):
        """Test that debug logging occurs when guardrails are applied"""
        params = BedrockLlmParams(
            ModelId="amazon.nova-pro-v1:0",
            BedrockInferenceType="OTHER_FOUNDATION",
            GuardrailIdentifier="test123",
            GuardrailVersion="5",
        )
        config = build_guardrail_config(params)

        # Verify debug log was called
        mock_logger.debug.assert_called_once()
        call_args = str(mock_logger.debug.call_args)
        assert "test123" in call_args
        assert "v5" in call_args

    def test_build_guardrail_config_no_logging_when_missing(self):
        """Test that no debug logging occurs when guardrails are missing"""
        params = BedrockLlmParams(
            ModelId="amazon.nova-pro-v1:0",
            BedrockInferenceType="OTHER_FOUNDATION",
        )

        with patch("gaab_strands_common.utils.helpers.logger") as mock_logger:
            config = build_guardrail_config(params)
            # Verify debug log was NOT called
            mock_logger.debug.assert_not_called()
