######################################################################################################################
#  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.                                                #
#                                                                                                                    #
#  Licensed under the Apache License, Version 2.0 (the "License"). You may not use this file except in compliance    #
#  with the License. A copy of the License is located at                                                             #
#                                                                                                                    #
#      http://www.apache.org/licenses/LICENSE-2.0                                                                    #
#                                                                                                                    #
#  or in the 'license' file accompanying this file. This file is distributed on an 'AS IS' BASIS, WITHOUT WARRANTIES #
#  OR CONDITIONS OF ANY KIND, express or implied. See the License for the specific language governing permissions    #
#  and limitations under the License.                                                                                #
######################################################################################################################

import pytest
from moto import mock_aws
from botocore.exceptions import ClientError
from unittest.mock import MagicMock, patch
from test.fixtures.get_arns_for_inference_profile_events import lambda_event, setup_use_case_config

from operations.operation_types import RESOURCE, RESOURCE_PROPERTIES
from operations.get_arns_for_inference_profile import (
    execute,
    get_model_arns,
    get_inference_identifier_from_ddb,
    verify_env_setup,
    USE_CASE_CONFIG_TABLE_NAME,
    USE_CASE_CONFIG_RECORD_KEY,
    LLM_CONFIG_RECORD_FIELD_NAME,
)
from boto3.dynamodb.types import TypeSerializer


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
    assert result == expected_identifier


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

    result = get_model_arns("test-profile-identifier")

    assert result == ",".join(
        [
            "arn:aws:bedrock:us-west-2:123456789012:model/model1",
            "arn:aws:bedrock:us-west-2:123456789012:model/model2",
            "arn:aws:bedrock:us-east-1:123456789012:inference-profile/test-profile-identifier",
        ]
    )
    mock_bedrock_client.get_inference_profile.assert_called_once_with(
        inferenceProfileIdentifier="test-profile-identifier"
    )


def test_get_model_arns_empty_response(mock_bedrock_client):
    mock_bedrock_client.get_inference_profile.return_value = {}
    result = get_model_arns("test-profile-identifier")
    assert result == ""


def test_get_model_arns_client_error(mock_bedrock_client):
    mock_bedrock_client.get_inference_profile.side_effect = ClientError(
        {"Error": {"Code": "TestException", "Message": "Test error message"}}, "GetInferenceProfile"
    )

    with pytest.raises(ClientError):
        get_model_arns("test-profile-identifier")


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
    assert get_inference_identifier_from_ddb(table_name, record_key) == "test-profile-identifier"
    execute(lambda_event, mock_lambda_context)

    mock_send_response.assert_called_once_with(
        lambda_event,
        mock_lambda_context,
        "SUCCESS",
        {
            "Arns": ",".join(
                [
                    "arn:aws:bedrock:us-west-2:123456789012:model/model1",
                    "arn:aws:bedrock:us-west-2:123456789012:model/model2",
                    "arn:aws:bedrock:us-east-1:123456789012:inference-profile/test-profile-identifier",
                ]
            ),
        },
        "fake_physical_resource_id",
    )


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
