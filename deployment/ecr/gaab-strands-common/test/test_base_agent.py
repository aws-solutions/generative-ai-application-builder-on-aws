# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

"""
Tests for BaseAgent class
"""

import pytest
from unittest.mock import Mock, patch
from gaab_strands_common.base_agent import BaseAgent
from gaab_strands_common.models import LlmParams, BedrockLlmParams, UseCaseConfig


class TestBaseAgentInit:
    """Tests for BaseAgent initialization"""

    def test_init_with_region(self):
        """Test initialization with region"""
        agent = BaseAgent("us-east-1")
        assert agent.region == "us-east-1"
        assert agent.config is None

    def test_init_with_different_region(self):
        """Test initialization with different region"""
        agent = BaseAgent("us-west-2")
        assert agent.region == "us-west-2"


class TestCreateModel:
    """Tests for _create_model method"""

    @patch("gaab_strands_common.base_agent.BedrockModel")
    def test_create_model_quick_start(self, mock_bedrock_model):
        """Test creating model with QUICK_START inference type"""
        agent = BaseAgent("us-east-1")

        llm_params = LlmParams(
            ModelProvider="Bedrock",
            Temperature=0.7,
            Streaming=True,
            Verbose=False,
            BedrockLlmParams=BedrockLlmParams(ModelId="amazon.nova-pro-v1:0", BedrockInferenceType="QUICK_START"),
            ModelParams={},
        )

        agent._create_model(llm_params)

        # Verify BedrockModel was called with correct parameters
        mock_bedrock_model.assert_called_once()
        call_kwargs = mock_bedrock_model.call_args[1]
        assert call_kwargs["model_id"] == "amazon.nova-pro-v1:0"
        assert call_kwargs["region_name"] == "us-east-1"
        assert call_kwargs["temperature"] == 0.7
        assert call_kwargs["streaming"] is True

    @patch("gaab_strands_common.base_agent.BedrockModel")
    def test_create_model_inference_profile(self, mock_bedrock_model):
        """Test creating model with INFERENCE_PROFILE type"""
        agent = BaseAgent("us-west-2")

        llm_params = LlmParams(
            ModelProvider="Bedrock",
            Temperature=0.5,
            Streaming=False,
            Verbose=False,
            BedrockLlmParams=BedrockLlmParams(
                InferenceProfileId="us.anthropic.claude-3-5-sonnet-20241022-v2:0",
                BedrockInferenceType="INFERENCE_PROFILE",
            ),
            ModelParams={},
        )

        agent._create_model(llm_params)

        # Verify model_id is the inference profile ID
        call_kwargs = mock_bedrock_model.call_args[1]
        assert call_kwargs["model_id"] == "us.anthropic.claude-3-5-sonnet-20241022-v2:0"
        assert call_kwargs["region_name"] == "us-west-2"

    @patch("gaab_strands_common.base_agent.BedrockModel")
    def test_create_model_provisioned(self, mock_bedrock_model):
        """Test creating model with PROVISIONED type"""
        agent = BaseAgent("us-east-1")

        llm_params = LlmParams(
            ModelProvider="Bedrock",
            Temperature=0.3,
            Streaming=True,
            Verbose=False,
            BedrockLlmParams=BedrockLlmParams(
                ModelArn="arn:aws:bedrock:us-east-1:123456789012:provisioned-model/abc",
                BedrockInferenceType="PROVISIONED",
            ),
            ModelParams={},
        )

        agent._create_model(llm_params)

        # Verify model_id is the model ARN
        call_kwargs = mock_bedrock_model.call_args[1]
        assert call_kwargs["model_id"] == "arn:aws:bedrock:us-east-1:123456789012:provisioned-model/abc"

    @patch("gaab_strands_common.base_agent.BedrockModel")
    @patch.dict("os.environ", {"AWS_REGION": "us-west-2"})
    def test_create_model_logs_environment(self, mock_bedrock_model):
        """Test that model creation logs environment info"""
        agent = BaseAgent("us-east-1")

        llm_params = LlmParams(
            ModelProvider="Bedrock",
            Temperature=0.7,
            Streaming=True,
            Verbose=False,
            BedrockLlmParams=BedrockLlmParams(ModelId="amazon.nova-pro-v1:0", BedrockInferenceType="QUICK_START"),
            ModelParams={},
        )

        # Should not raise exception
        agent._create_model(llm_params)

    @patch("gaab_strands_common.base_agent.BedrockModel")
    def test_create_model_cross_region_profile(self, mock_bedrock_model):
        """Test creating model with cross-region inference profile"""
        agent = BaseAgent("us-east-1")

        llm_params = LlmParams(
            ModelProvider="Bedrock",
            Temperature=0.7,
            Streaming=True,
            Verbose=False,
            BedrockLlmParams=BedrockLlmParams(
                InferenceProfileId="us.anthropic.claude-3-5-sonnet-20241022-v2:0",
                BedrockInferenceType="INFERENCE_PROFILE",
            ),
            ModelParams={},
        )

        agent._create_model(llm_params)

        # Verify cross-region profile is detected and used
        call_kwargs = mock_bedrock_model.call_args[1]
        assert call_kwargs["model_id"].startswith("us.")


class TestValidateUseCaseType:
    """Tests for _validate_use_case_type method"""

    def test_validate_correct_type(self):
        """Test validation passes with correct type"""
        agent = BaseAgent("us-east-1")
        config_dict = {"UseCaseType": "Agent"}

        # Should not raise exception
        agent._validate_use_case_type(config_dict, "Agent")

    def test_validate_incorrect_type(self):
        """Test validation fails with incorrect type"""
        agent = BaseAgent("us-east-1")
        config_dict = {"UseCaseType": "Workflow"}

        with pytest.raises(ValueError, match="Expected Agent, got Workflow"):
            agent._validate_use_case_type(config_dict, "Agent")

    def test_validate_missing_type(self):
        """Test validation with missing UseCaseType"""
        agent = BaseAgent("us-east-1")
        config_dict = {}

        with pytest.raises(ValueError, match="Expected Agent, got None"):
            agent._validate_use_case_type(config_dict, "Agent")


class TestGetConfig:
    """Tests for get_config method"""

    def test_get_config_when_loaded(self):
        """Test getting config when it's loaded"""
        agent = BaseAgent("us-east-1")

        # Create mock config
        mock_config = Mock(spec=UseCaseConfig)
        agent.config = mock_config

        config = agent.get_config()
        assert config is mock_config

    def test_get_config_when_not_loaded(self):
        """Test getting config when not loaded"""
        agent = BaseAgent("us-east-1")

        with pytest.raises(ValueError, match="Configuration not loaded"):
            agent.get_config()

    def test_get_config_returns_same_instance(self):
        """Test that get_config returns the same instance"""
        agent = BaseAgent("us-east-1")
        mock_config = Mock(spec=UseCaseConfig)
        agent.config = mock_config

        config1 = agent.get_config()
        config2 = agent.get_config()
        assert config1 is config2


class TestBaseAgentIntegration:
    """Integration tests for BaseAgent"""

    @patch("gaab_strands_common.base_agent.BedrockModel")
    def test_full_workflow(self, mock_bedrock_model):
        """Test full workflow of creating agent and model"""
        # Create agent
        agent = BaseAgent("us-east-1")

        # Validate use case type
        config_dict = {"UseCaseType": "Agent"}
        agent._validate_use_case_type(config_dict, "Agent")

        # Create model
        llm_params = LlmParams(
            ModelProvider="Bedrock",
            Temperature=0.7,
            Streaming=True,
            Verbose=False,
            BedrockLlmParams=BedrockLlmParams(ModelId="amazon.nova-pro-v1:0", BedrockInferenceType="QUICK_START"),
            ModelParams={},
        )

        model = agent._create_model(llm_params)

        # Verify model was created
        mock_bedrock_model.assert_called_once()

    def test_region_consistency(self):
        """Test that region is used consistently"""
        agent = BaseAgent("eu-west-1")
        assert agent.region == "eu-west-1"

        # Region should be used in model creation
        llm_params = LlmParams(
            ModelProvider="Bedrock",
            Temperature=0.7,
            Streaming=True,
            Verbose=False,
            BedrockLlmParams=BedrockLlmParams(ModelId="amazon.nova-pro-v1:0", BedrockInferenceType="QUICK_START"),
            ModelParams={},
        )

        with patch("gaab_strands_common.base_agent.BedrockModel") as mock_model:
            agent._create_model(llm_params)
            call_kwargs = mock_model.call_args[1]
            assert call_kwargs["region_name"] == "eu-west-1"
