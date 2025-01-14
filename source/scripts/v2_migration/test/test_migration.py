# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

from decimal import Decimal
import pytest
import boto3
from moto import mock_aws
from gaab_v2_migration import (
    get_use_cases_to_migrate,
    get_old_config,
    convert_config_format,
    write_new_config,
    update_use_case_table_record,
    delete_ssm_parameter,
    migrate_use_case,
)
import json

SSM_PARAM_NAME_1 = "/param1/something/00000000/11111111"
SSM_PARAM_NAME_2 = "/param2/something/22222222/33333333"
CONFIG_TABLE_NAME = "ConfigTable"
USE_CASE_TABLE_NAME = "UseCaseTable"


@pytest.fixture(autouse=True)
def use_cases_table():
    with mock_aws():
        ddb = boto3.resource("dynamodb")
        table = ddb.create_table(
            TableName="UseCaseTable",
            KeySchema=[{"AttributeName": "UseCaseId", "KeyType": "HASH"}],
            AttributeDefinitions=[{"AttributeName": "UseCaseId", "AttributeType": "S"}],
            BillingMode="PAY_PER_REQUEST",
        )
        table.put_item(Item={"UseCaseId": "uuid1", "SSMParameterKey": SSM_PARAM_NAME_1})
        table.put_item(Item={"UseCaseId": "uuid2", "SSMParameterKey": SSM_PARAM_NAME_2})
        table.put_item(Item={"UseCaseId": "uuid3"})
        yield table


@pytest.fixture(autouse=True)
def config_table():
    with mock_aws():
        ddb = boto3.resource("dynamodb")
        table = ddb.create_table(
            TableName="ConfigTable",
            KeySchema=[{"AttributeName": "key", "KeyType": "HASH"}],
            AttributeDefinitions=[{"AttributeName": "key", "AttributeType": "S"}],
            BillingMode="PAY_PER_REQUEST",
        )
        yield table


@pytest.fixture(autouse=True)
def ssm():
    with mock_aws():
        ssm = boto3.client("ssm")
        ssm.put_parameter(
            Name=SSM_PARAM_NAME_1,
            Value=json.dumps(
                {
                    "UseCaseName": "sampleUseCase1",
                    "ConversationMemoryType": "DynamoDB",
                    "KnowledgeBaseType": "Kendra",
                    "KnowledgeBaseParams": {"NumberOfDocs": 2, "ReturnSourceDocs": False},
                    "LlmParams": {
                        "ModelProvider": "Bedrock",
                        "ModelId": "model",
                        "ModelParams": {"param1": {"Value": "some value", "Type": "string"}},
                        "PromptTemplate": "{history}\n\n{context}\n\n{input}",
                        "Streaming": True,
                        "Verbose": False,
                        "Temperature": 0.1,
                        "RAGEnabled": True,
                    },
                }
            ),
            Type="String",
        )
        ssm.put_parameter(
            Name=SSM_PARAM_NAME_2,
            Value=json.dumps(
                {
                    "UseCaseName": "sampleUseCase2",
                    "ConversationMemoryType": "DynamoDB",
                    "LlmParams": {
                        "ModelProvider": "SageMaker",
                        "ModelId": "default",
                        "InferenceEndpoint": "endpoint",
                        "ModelParams": {"param1": {"Value": "some value", "Type": "string"}},
                        "PromptTemplate": "{history}\n\n{context}\n\n{input}",
                        "Streaming": True,
                        "Verbose": False,
                        "RAGEnabled": False,
                        "ModelInputPayloadSchema": {
                            "input": "<<prompt>>",
                            "parameters": {"temperature": "<<temperature>>", "someParam": "<<param1>>"},
                        },
                        "ModelOutputJSONPath": "$output",
                    },
                }
            ),
            Type="String",
        )
        yield ssm


# Test cases
@mock_aws
def test_get_use_cases_to_migrate(use_cases_table):
    # Add some test data
    use_cases = get_use_cases_to_migrate("UseCaseTable")
    assert use_cases == {"uuid1": SSM_PARAM_NAME_1, "uuid2": SSM_PARAM_NAME_2}


@mock_aws
def test_get_old_config(ssm):
    old_config = get_old_config(SSM_PARAM_NAME_1)
    assert old_config["UseCaseName"] == "sampleUseCase1"


def test_convert_config_format_sagemaker():
    old_config = {
        "UseCaseName": "Test Use Case",
        "LlmParams": {
            "ModelProvider": "SageMaker",
            "InferenceEndpoint": "test-endpoint",
            "ModelInputPayloadSchema": {
                "input": "<<prompt>>",
                "parameters": {"temperature": "<<temperature>>", "someParam": "<<param1>>"},
            },
            "ModelOutputJSONPath": "$output",
        },
    }
    new_config = convert_config_format(old_config)
    assert new_config["UseCaseName"] == "Test Use Case"
    assert new_config["LlmParams"]["ModelProvider"] == "SageMaker"
    assert new_config["LlmParams"]["SageMakerLlmParams"]["EndpointName"] == "test-endpoint"
    assert new_config["LlmParams"]["SageMakerLlmParams"]["ModelInputPayloadSchema"] == {
        "input": "<<prompt>>",
        "parameters": {"temperature": "<<temperature>>", "someParam": "<<param1>>"},
    }
    assert new_config["LlmParams"]["SageMakerLlmParams"]["ModelOutputJSONPath"] == "$output"


def test_convert_config_format_bedrock():
    old_config = {
        "UseCaseName": "Test Use Case",
        "LlmParams": {
            "ModelProvider": "Bedrock",
            "ModelId": "test-model",
            "ModelParams": {"param1": {"Value": "some value", "Type": "string"}},
            "PromptTemplate": "{history}\n\n{context}\n\n{input}",
            "Streaming": True,
            "Verbose": False,
            "Temperature": 0.1,
            "RAGEnabled": False,
        },
    }
    new_config = convert_config_format(old_config)
    assert new_config["UseCaseName"] == "Test Use Case"
    assert new_config["LlmParams"]["ModelProvider"] == "Bedrock"
    assert new_config["LlmParams"]["ModelParams"] == {"param1": {"Value": "some value", "Type": "string"}}
    assert new_config["LlmParams"]["BedrockLlmParams"]["ModelId"] == "test-model"
    assert new_config["LlmParams"]["PromptParams"]["PromptTemplate"] == "{history}\n\n{context}\n\n{input}"
    assert new_config["LlmParams"]["Streaming"] == True
    assert new_config["LlmParams"]["Verbose"] == False
    assert new_config["LlmParams"]["Temperature"] == 0.1
    assert new_config["LlmParams"]["RAGEnabled"] == False


def test_convert_config_format_kendra():
    old_config = {
        "UseCaseName": "Test Use Case",
        "KnowledgeBaseType": "Kendra",
        "KnowledgeBaseParams": {"NumberOfDocs": 2, "ReturnSourceDocs": False},
        "LlmParams": {
            "ModelProvider": "Bedrock",
            "ModelId": "test-model",
            "RAGEnabled": True,
        },
    }
    new_config = convert_config_format(old_config)
    assert new_config["UseCaseName"] == "Test Use Case"
    assert new_config["KnowledgeBaseParams"]["KnowledgeBaseType"] == "Kendra"
    assert new_config["KnowledgeBaseParams"]["NumberOfDocs"] == 2
    assert new_config["KnowledgeBaseParams"]["ReturnSourceDocs"] == False


@mock_aws
def test_write_new_config(config_table):
    new_config = {"UseCaseName": "Test Use Case"}
    write_new_config("ConfigTable", "test-key", new_config)
    response = config_table.get_item(Key={"key": "test-key"})
    assert response["Item"]["config"]["UseCaseName"] == "Test Use Case"


@mock_aws
def test_update_use_case_table_record(use_cases_table):
    use_cases_table.put_item(Item={"UseCaseId": "test-uuid", "SSMParameterKey": "/old/param"})
    update_use_case_table_record("UseCaseTable", "test-uuid", "ConfigTable", "new-key")
    response = use_cases_table.get_item(Key={"UseCaseId": "test-uuid"})
    assert "SSMParameterKey" not in response["Item"]
    assert response["Item"]["UseCaseConfigTableName"] == "ConfigTable"
    assert response["Item"]["UseCaseConfigRecordKey"] == "new-key"


@mock_aws
def test_delete_ssm_parameter(ssm):
    delete_ssm_parameter(SSM_PARAM_NAME_1)
    with pytest.raises(ssm.exceptions.ParameterNotFound):
        ssm.get_parameter(Name=SSM_PARAM_NAME_1)


@mock_aws
def test_migrate_use_case(use_cases_table, config_table, ssm):
    migrate_use_case("UseCaseTable", "ConfigTable", "uuid1", SSM_PARAM_NAME_1, True)
    response = use_cases_table.get_item(Key={"UseCaseId": "uuid1"})
    assert "SSMParameterKey" not in response["Item"]
    assert response["Item"]["UseCaseConfigTableName"] == "ConfigTable"
    assert response["Item"]["UseCaseConfigRecordKey"] == "00000000-11111111"
    response = config_table.get_item(Key={"key": "00000000-11111111"})
    assert response["Item"]["config"] == {
        "UseCaseName": "sampleUseCase1",
        "ConversationMemoryParams": {"ConversationMemoryType": "DynamoDB"},
        "LlmParams": {
            "ModelProvider": "Bedrock",
            "PromptParams": {"PromptTemplate": "{history}\n\n{context}\n\n{input}"},
            "ModelParams": {"param1": {"Value": "some value", "Type": "string"}},
            "Temperature": Decimal("0.1"),
            "RAGEnabled": True,
            "Streaming": True,
            "Verbose": False,
            "BedrockLlmParams": {"ModelId": "model"},
        },
        "IsInternalUser": False,
        "KnowledgeBaseParams": {
            "KnowledgeBaseType": "Kendra",
            "NumberOfDocs": Decimal("2"),
            "ReturnSourceDocs": False,
            "KendraKnowledgeBaseParams": {"RoleBasedAccessControlEnabled": False},
        },
    }
    with pytest.raises(ssm.exceptions.ParameterNotFound):
        ssm.get_parameter(Name=SSM_PARAM_NAME_1)
