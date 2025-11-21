# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

from test.fixtures.get_arns_for_inference_profile_events import lambda_event, setup_use_case_config
from unittest.mock import MagicMock, patch

import pytest
from boto3.dynamodb.types import TypeSerializer
from botocore.exceptions import ClientError
from moto import mock_aws
from operations.get_arns_for_inference_profile import (
    LLM_CONFIG_RECORD_FIELD_NAME,
    USE_CASE_CONFIG_RECORD_KEY,
    USE_CASE_CONFIG_TABLE_NAME,
    execute,
    get_inference_identifier_from_ddb,
    get_model_arns,
    verify_env_setup,
)
from operations.operation_types import RESOURCE, RESOURCE_PROPERTIES


@pytest.fixture
def mock_bedrock_client(ddb_client):
    with patch("operations.get_arns_for_inference_profile.get_service_client") as mock_get_client:
        mock_client = MagicMock()
        mock_get_client.return_value = mock_client
        yield mock_client


@mock_aws
@pytest.fixture
def insert_llm_config(setup_use_case_config):
    lambda_event, ddb = setup_use_case_config

    expected_identifier = "test-profile-identifier"
    table_name = lambda_event[RESOURCE_PROPERTIES][USE_CASE_CONFIG_TABLE_NAME]
    record_key = lambda_event[RESOURCE_PROPERTIES][USE_CASE_CONFIG_RECORD_KEY]

    python_obj_to_be_inserted = {
        LLM_CONFIG_RECORD_FIELD_NAME: record_key,
        "config": {"LlmParams": {"BedrockLlmParams": {"InferenceProfileId": expected_identifier}}},
    }
    serializer = TypeSerializer()

    # serialize python_obj_to_inserted as dynamodb object using TypeSerializer
    ddb.put_item(TableName=table_name, Item={k: serializer.serialize(v) for k, v in python_obj_to_be_inserted.items()})
    yield lambda_event, ddb


def test_verify_env_setup_success(lambda_event):
    assert verify_env_setup(lambda_event) is None


def test_verify_env_setup_missing_resource(lambda_event):
    lambda_event[RESOURCE_PROPERTIES][RESOURCE] = "SOME_INVALID_OPERATION"
    with pytest.raises(ValueError, match="Operation type not available or did not match"):
        verify_env_setup(lambda_event)


def test_verify_env_setup_missing_resource_properties(lambda_event, monkeypatch):
    with pytest.raises(ValueError, match="has not been passed"):
        monkeypatch.delitem(lambda_event[RESOURCE_PROPERTIES], USE_CASE_CONFIG_TABLE_NAME)
        verify_env_setup(lambda_event)

    with pytest.raises(ValueError, match="has not been passed"):
        monkeypatch.delitem(lambda_event[RESOURCE_PROPERTIES], USE_CASE_CONFIG_RECORD_KEY)
        verify_env_setup(lambda_event)


@mock_aws
def test_get_inference_identifier_success(insert_llm_config):
    lambda_event, _ = insert_llm_config

    expected_identifier = "test-profile-identifier"
    table_name = lambda_event[RESOURCE_PROPERTIES][USE_CASE_CONFIG_TABLE_NAME]
    record_key = lambda_event[RESOURCE_PROPERTIES][USE_CASE_CONFIG_RECORD_KEY]

    result = get_inference_identifier_from_ddb(table_name, record_key)
    assert result == [expected_identifier]


@mock_aws
def test_get_inference_identifier_not_found(insert_llm_config):
    lambda_event, _ = insert_llm_config

    table_name = lambda_event[RESOURCE_PROPERTIES][USE_CASE_CONFIG_TABLE_NAME]
    result = get_inference_identifier_from_ddb(table_name, "non-existent-key")
    assert result is None


@mock_aws
def test_get_inference_identifier_table_not_found(insert_llm_config):
    _, _ = insert_llm_config
    with pytest.raises(ClientError):
        get_inference_identifier_from_ddb("non-existent-table", "non-existent-key")


def test_get_model_arns_success(mock_bedrock_client):
    mock_bedrock_client.get_inference_profile.return_value = {
        "inferenceProfileArn": "arn:aws:bedrock:us-east-1:123456789012:inference-profile/test-profile-identifier",
        "models": [
            {"modelArn": "arn:aws:bedrock:us-west-2:123456789012:model/model1"},
            {"modelArn": "arn:aws:bedrock:us-west-2:123456789012:model/model2"},
        ],
    }

    result = get_model_arns(["test-profile-identifier"])

    # Check that all expected ARNs are present (order doesn't matter due to set)
    expected_arns = {
        "arn:aws:bedrock:us-west-2:123456789012:model/model1",
        "arn:aws:bedrock:us-west-2:123456789012:model/model2",
        "arn:aws:bedrock:us-east-1:123456789012:inference-profile/test-profile-identifier",
    }
    result_arns = set(result.split(","))
    assert result_arns == expected_arns
    mock_bedrock_client.get_inference_profile.assert_called_once_with(
        inferenceProfileIdentifier="test-profile-identifier"
    )


def test_get_model_arns_empty_response(mock_bedrock_client):
    mock_bedrock_client.get_inference_profile.return_value = {}
    result = get_model_arns(["test-profile-identifier"])
    assert result == ""


def test_get_model_arns_client_error(mock_bedrock_client):
    mock_bedrock_client.get_inference_profile.side_effect = ClientError(
        {"Error": {"Code": "TestException", "Message": "Test error message"}}, "GetInferenceProfile"
    )

    with pytest.raises(ClientError):
        get_model_arns(["test-profile-identifier"])


def test_get_model_arns_multiple_profiles(mock_bedrock_client):
    # Mock responses for different profiles
    def mock_get_inference_profile(inferenceProfileIdentifier):
        if inferenceProfileIdentifier == "profile1":
            return {
                "inferenceProfileArn": "arn:aws:bedrock:us-east-1:123456789012:inference-profile/profile1",
                "models": [
                    {"modelArn": "arn:aws:bedrock:us-west-2:123456789012:model/model1"},
                    {"modelArn": "arn:aws:bedrock:us-west-2:123456789012:model/model2"},
                ],
            }
        elif inferenceProfileIdentifier == "profile2":
            return {
                "inferenceProfileArn": "arn:aws:bedrock:us-east-1:123456789012:inference-profile/profile2",
                "models": [
                    {"modelArn": "arn:aws:bedrock:us-west-2:123456789012:model/model3"},
                ],
            }
        return {}

    mock_bedrock_client.get_inference_profile.side_effect = mock_get_inference_profile

    result = get_model_arns(["profile1", "profile2"])

    expected_arns = {
        "arn:aws:bedrock:us-west-2:123456789012:model/model1",
        "arn:aws:bedrock:us-west-2:123456789012:model/model2",
        "arn:aws:bedrock:us-west-2:123456789012:model/model3",
        "arn:aws:bedrock:us-east-1:123456789012:inference-profile/profile1",
        "arn:aws:bedrock:us-east-1:123456789012:inference-profile/profile2",
    }
    result_arns = set(result.split(","))
    assert result_arns == expected_arns
    assert mock_bedrock_client.get_inference_profile.call_count == 2


def test_get_model_arns_deduplication(mock_bedrock_client):
    # Mock responses with duplicate ARNs
    def mock_get_inference_profile(inferenceProfileIdentifier):
        return {
            "inferenceProfileArn": f"arn:aws:bedrock:us-east-1:123456789012:inference-profile/{inferenceProfileIdentifier}",
            "models": [
                {"modelArn": "arn:aws:bedrock:us-west-2:123456789012:model/shared-model"},
                {"modelArn": f"arn:aws:bedrock:us-west-2:123456789012:model/{inferenceProfileIdentifier}-model"},
            ],
        }

    mock_bedrock_client.get_inference_profile.side_effect = mock_get_inference_profile

    result = get_model_arns(["profile1", "profile2"])

    # Should deduplicate the shared-model ARN
    expected_arns = {
        "arn:aws:bedrock:us-west-2:123456789012:model/shared-model",  # Only appears once despite being in both profiles
        "arn:aws:bedrock:us-west-2:123456789012:model/profile1-model",
        "arn:aws:bedrock:us-west-2:123456789012:model/profile2-model",
        "arn:aws:bedrock:us-east-1:123456789012:inference-profile/profile1",
        "arn:aws:bedrock:us-east-1:123456789012:inference-profile/profile2",
    }
    result_arns = set(result.split(","))
    assert result_arns == expected_arns
    assert mock_bedrock_client.get_inference_profile.call_count == 2


def test_get_model_arns_empty_list(mock_bedrock_client):
    result = get_model_arns([])
    assert result == ""
    mock_bedrock_client.get_inference_profile.assert_not_called()


@mock_aws
def test_get_inference_identifier_workflow_agent_as_tool(setup_use_case_config):
    lambda_event, ddb = setup_use_case_config

    table_name = lambda_event[RESOURCE_PROPERTIES][USE_CASE_CONFIG_TABLE_NAME]
    record_key = lambda_event[RESOURCE_PROPERTIES][USE_CASE_CONFIG_RECORD_KEY]

    # Create a workflow configuration with agents-as-tools orchestration
    python_obj_to_be_inserted = {
        LLM_CONFIG_RECORD_FIELD_NAME: record_key,
        "config": {
            "UseCaseType": "Workflow",
            "LlmParams": {
                "BedrockLlmParams": {"InferenceProfileId": "workflow-profile"}
            },  # Workflow-level inference profile
            "WorkflowParams": {
                "OrchestrationPattern": "agents-as-tools",
                "AgentsAsToolsParams": {
                    "Agents": [
                        {"UseCaseId": "agent1", "LlmParams": {"BedrockLlmParams": {"InferenceProfileId": "profile-1"}}},
                        {"UseCaseId": "agent2", "LlmParams": {"BedrockLlmParams": {"InferenceProfileId": "profile-2"}}},
                        {
                            "UseCaseId": "agent3",
                            "LlmParams": {"BedrockLlmParams": {"ModelId": "some-model"}},  # No InferenceProfileId
                        },
                    ]
                },
            },
        },
    }
    serializer = TypeSerializer()
    ddb.put_item(TableName=table_name, Item={k: serializer.serialize(v) for k, v in python_obj_to_be_inserted.items()})

    result = get_inference_identifier_from_ddb(table_name, record_key)
    assert set(result) == {"workflow-profile", "profile-1", "profile-2"}  # Should include workflow and agent profiles


@mock_aws
def test_get_inference_identifier_workflow_non_agent_as_tool(setup_use_case_config):
    lambda_event, ddb = setup_use_case_config

    table_name = lambda_event[RESOURCE_PROPERTIES][USE_CASE_CONFIG_TABLE_NAME]
    record_key = lambda_event[RESOURCE_PROPERTIES][USE_CASE_CONFIG_RECORD_KEY]

    # Create a workflow configuration with different orchestration pattern
    python_obj_to_be_inserted = {
        LLM_CONFIG_RECORD_FIELD_NAME: record_key,
        "config": {
            "UseCaseType": "Workflow",
            "WorkflowParams": {"OrchestrationPattern": "sequential"},  # Not agents-as-tools
            "LlmParams": {"BedrockLlmParams": {"InferenceProfileId": "main-profile"}},
        },
    }
    serializer = TypeSerializer()
    ddb.put_item(TableName=table_name, Item={k: serializer.serialize(v) for k, v in python_obj_to_be_inserted.items()})

    result = get_inference_identifier_from_ddb(table_name, record_key)
    assert result == ["main-profile"]  # Should return the main LlmParams profile


@mock_aws
def test_get_inference_identifier_workflow_empty_agents(setup_use_case_config):
    lambda_event, ddb = setup_use_case_config

    table_name = lambda_event[RESOURCE_PROPERTIES][USE_CASE_CONFIG_TABLE_NAME]
    record_key = lambda_event[RESOURCE_PROPERTIES][USE_CASE_CONFIG_RECORD_KEY]

    # Create a workflow configuration with agents-as-tools but no agents with InferenceProfileId
    python_obj_to_be_inserted = {
        LLM_CONFIG_RECORD_FIELD_NAME: record_key,
        "config": {
            "UseCaseType": "Workflow",
            "WorkflowParams": {
                "OrchestrationPattern": "agents-as-tools",
                "AgentsAsToolsParams": {
                    "Agents": [
                        {
                            "UseCaseId": "agent1",
                            "LlmParams": {"BedrockLlmParams": {"ModelId": "some-model"}},  # No InferenceProfileId
                        }
                    ]
                },
            },
        },
    }
    serializer = TypeSerializer()
    ddb.put_item(TableName=table_name, Item={k: serializer.serialize(v) for k, v in python_obj_to_be_inserted.items()})

    result = get_inference_identifier_from_ddb(table_name, record_key)
    assert result is None  # Should return None when no agents have InferenceProfileId


@mock_aws
def test_get_inference_identifier_workflow_deduplication(setup_use_case_config):
    lambda_event, ddb = setup_use_case_config

    table_name = lambda_event[RESOURCE_PROPERTIES][USE_CASE_CONFIG_TABLE_NAME]
    record_key = lambda_event[RESOURCE_PROPERTIES][USE_CASE_CONFIG_RECORD_KEY]

    # Create a workflow configuration with duplicate inference profile IDs
    python_obj_to_be_inserted = {
        LLM_CONFIG_RECORD_FIELD_NAME: record_key,
        "config": {
            "UseCaseType": "Workflow",
            "LlmParams": {"BedrockLlmParams": {"InferenceProfileId": "shared-profile"}},  # Same as agent1
            "WorkflowParams": {
                "OrchestrationPattern": "agents-as-tools",
                "AgentsAsToolsParams": {
                    "Agents": [
                        {
                            "UseCaseId": "agent1",
                            "LlmParams": {"BedrockLlmParams": {"InferenceProfileId": "shared-profile"}},
                        },  # Duplicate
                        {
                            "UseCaseId": "agent2",
                            "LlmParams": {"BedrockLlmParams": {"InferenceProfileId": "unique-profile"}},
                        },
                        {
                            "UseCaseId": "agent3",
                            "LlmParams": {"BedrockLlmParams": {"InferenceProfileId": "shared-profile"}},
                        },  # Another duplicate
                    ]
                },
            },
        },
    }
    serializer = TypeSerializer()
    ddb.put_item(TableName=table_name, Item={k: serializer.serialize(v) for k, v in python_obj_to_be_inserted.items()})

    result = get_inference_identifier_from_ddb(table_name, record_key)
    assert set(result) == {"shared-profile", "unique-profile"}  # Should deduplicate shared-profile
    assert len(result) == 2  # Should only have 2 unique profiles


@mock_aws
def test_get_inference_identifier_non_workflow_use_case(setup_use_case_config):
    lambda_event, ddb = setup_use_case_config

    table_name = lambda_event[RESOURCE_PROPERTIES][USE_CASE_CONFIG_TABLE_NAME]
    record_key = lambda_event[RESOURCE_PROPERTIES][USE_CASE_CONFIG_RECORD_KEY]

    # Create a non-workflow configuration (e.g., Chat use case)
    python_obj_to_be_inserted = {
        LLM_CONFIG_RECORD_FIELD_NAME: record_key,
        "config": {
            "UseCaseType": "Chat",
            "LlmParams": {"BedrockLlmParams": {"InferenceProfileId": "chat-profile"}},
        },
    }
    serializer = TypeSerializer()
    ddb.put_item(TableName=table_name, Item={k: serializer.serialize(v) for k, v in python_obj_to_be_inserted.items()})

    result = get_inference_identifier_from_ddb(table_name, record_key)
    assert result == ["chat-profile"]  # Should return the single inference profile


@patch("operations.get_arns_for_inference_profile.send_response")
@pytest.mark.parametrize("requestType", ["Create", "Update"])
def test_execute_success(mock_send_response, lambda_event, mock_lambda_context, mock_bedrock_client, requestType):
    lambda_event["RequestType"] = requestType

    expected_identifier = "test-profile-identifier"
    record_key = lambda_event[RESOURCE_PROPERTIES][USE_CASE_CONFIG_RECORD_KEY]

    python_obj_to_be_inserted = {
        LLM_CONFIG_RECORD_FIELD_NAME: record_key,
        "config": {"LlmParams": {"BedrockLlmParams": {"InferenceProfileId": expected_identifier}}},
    }
    serializer = TypeSerializer()

    mock_bedrock_client.get_item.return_value = {
        "Item": {k: serializer.serialize(v) for k, v in python_obj_to_be_inserted.items()}
    }

    mock_bedrock_client.get_inference_profile.return_value = {
        "inferenceProfileArn": f"arn:aws:bedrock:us-east-1:123456789012:inference-profile/{expected_identifier}",
        "models": [
            {"modelArn": "arn:aws:bedrock:us-west-2:123456789012:model/model1"},
            {"modelArn": "arn:aws:bedrock:us-west-2:123456789012:model/model2"},
        ],
    }

    table_name = lambda_event[RESOURCE_PROPERTIES][USE_CASE_CONFIG_TABLE_NAME]
    record_key = lambda_event[RESOURCE_PROPERTIES][USE_CASE_CONFIG_RECORD_KEY]
    assert get_inference_identifier_from_ddb(table_name, record_key) == ["test-profile-identifier"]
    execute(lambda_event, mock_lambda_context)

    # Check that the response contains the expected ARNs (order doesn't matter)
    expected_arns = {
        "arn:aws:bedrock:us-west-2:123456789012:model/model1",
        "arn:aws:bedrock:us-west-2:123456789012:model/model2",
        "arn:aws:bedrock:us-east-1:123456789012:inference-profile/test-profile-identifier",
    }

    # Get the actual call arguments
    call_args = mock_send_response.call_args
    actual_arns_string = call_args[0][3]["Arns"]  # The "Arns" value from the data dictionary
    actual_arns = set(actual_arns_string.split(","))

    assert actual_arns == expected_arns
    mock_send_response.assert_called_once()


@patch("operations.get_arns_for_inference_profile.send_response")
@pytest.mark.parametrize("requestType", ["Create", "Update"])
def test_execute_with_no_inference_id(
    mock_send_response, insert_llm_config, mock_bedrock_client, mock_lambda_context, requestType
):
    lambda_event, _ = insert_llm_config
    lambda_event["RequestType"] = requestType
    execute(lambda_event, mock_lambda_context)
    mock_send_response.assert_called_once_with(
        lambda_event,
        mock_lambda_context,
        "FAILED",
        {},
        physical_resource_id="fake_physical_resource_id",
        reason="Inference Profile ID not found in LLM config",
    )
    mock_bedrock_client.assert_not_called()


@mock_aws
@patch("operations.get_arns_for_inference_profile.send_response")
def test_execute_delete(mock_send_response, insert_llm_config, mock_lambda_context):
    lambda_event, _ = insert_llm_config
    lambda_event["RequestType"] = "Delete"

    execute(lambda_event, mock_lambda_context)

    mock_send_response.assert_called_once_with(
        lambda_event, mock_lambda_context, "SUCCESS", {}, "fake_physical_resource_id"
    )


@pytest.mark.parametrize("requestType", ["Create", "Update"])
@patch("operations.get_arns_for_inference_profile.send_response")
def test_execute_error(mock_send_response, insert_llm_config, mock_bedrock_client, mock_lambda_context, requestType):
    lambda_event, _ = insert_llm_config
    mock_bedrock_client.get_inference_profile.side_effect = Exception("Test error")
    lambda_event["RequestType"] = requestType
    execute(lambda_event, mock_lambda_context)

    mock_send_response.assert_called_once_with(
        lambda_event,
        mock_lambda_context,
        "FAILED",
        {},
        physical_resource_id="fake_physical_resource_id",
        reason="Inference Profile ID not found in LLM config",
    )
