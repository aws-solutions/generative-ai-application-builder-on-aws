#!/usr/bin/env python
# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

from copy import copy
from decimal import Decimal

import pytest
from operations import operation_types
from operations.operation_types import PHYSICAL_RESOURCE_ID, RESOURCE, RESOURCE_PROPERTIES
from utils.constants import (
    USE_CASE_CONFIG_RECORD_KEY,
    USE_CASE_CONFIG_RECORD_KEY_ATTRIBUTE_NAME,
    USE_CASE_CONFIG_TABLE_NAME,
    UUID,
)


@pytest.fixture
def llm_config_value():
    config = {
        "LlmParams": {
            "ModelProvider": "Bedrock",
            "BedrockLlmParams": {"ModelId": "fakemodel"},
            "PromptParams": {
                "PromptTemplate": "template",
                "DisambiguationPromptTemplate": "fake",
                "MaxPromptTemplateLength": Decimal(100.0),
                "RephraseQuestion": True,
            },
        },
        "ConversationMemoryParams": {"ConversationMemoryType": "DynamoDB", "ChatHistoryLength": 10},
        "UseCaseType": "Text",
        "KnowledgeBaseParams": {
            "KnowledgeBaseType": "Kendra",
        },
    }
    yield config


@pytest.fixture
def llm_config_value_with_agent():
    config = {
        "AgentParams": {
            "AgentType": "Bedrock",
            "BedrockAgentParams": {
                "EnableTrace": True,
            },
        },
        "UseCaseType": "Agent",
    }
    yield config


@pytest.fixture
def llm_config_value_with_auth():
    config = {
        "LlmParams": {
            "ModelProvider": "Bedrock",
            "BedrockLlmParams": {"ModelId": "fakemodel"},
            "PromptParams": {
                "MaxPromptTemplateLength": 100,
                "RephraseQuestion": True,
            },
        },
        "AuthenticationParams": {
            "CognitoParams": {
                "ExistingUserPoolId": "us-west-2_fakepool",
                "ExistingUserPoolClientId": "fakeclientid",
            }
        },
        "UseCaseType": "Text",
        "KnowledgeBaseParams": {
            "KnowledgeBaseType": "Kendra",
        },
    }
    yield config


@pytest.fixture
def llm_config_value_with_multimodal():
    config = {
        "LlmParams": {
            "ModelProvider": "Bedrock",
            "BedrockLlmParams": {"ModelId": "fakemodel"},
            "MultimodalParams": {
                "MultimodalEnabled": True,
            },
        },
        "UseCaseType": "AgentBuilder",
    }
    yield config


@pytest.fixture
def llm_config_value_with_mcp_gateway():
    config = {
        "LlmParams": {
            "ModelProvider": "Bedrock",
            "BedrockLlmParams": {"ModelId": "fakemodel"},
        },
        "UseCaseType": "MCPServer",
        "MCPParams": {
            "GatewayParams": {
                "TargetParams": [
                    {
                        "TargetType": "smithyModel",
                    },
                    {
                        "TargetType": "openApiSchema",
                        "OutboundAuthParams": {
                            "OutboundAuthProviderArn": "arn:aws:bedrock-agentcore:us-east-1:123456789012:token-vault/test",
                            "OutboundAuthProviderType": "API_KEY",
                        },
                    },
                    {
                        "TargetType": "openApiSchema",
                        "OutboundAuthParams": {
                            "OutboundAuthProviderArn": "arn:aws:bedrock-agentcore:us-east-1:123456789012:token-vault/oauth",
                            "OutboundAuthProviderType": "OAUTH",
                        },
                    },
                ],
            }
        },
    }
    yield config


@pytest.fixture
def llm_config_value_with_mcp_runtime():
    config = {
        "LlmParams": {
            "ModelProvider": "Bedrock",
            "BedrockLlmParams": {"ModelId": "fakemodel"},
        },
        "UseCaseType": "MCPServer",
        "MCPParams": {
            "RuntimeParams": {
                "RuntimeName": "test-runtime",
                "RuntimeId": "runtime-123",
            }
        },
    }
    yield config


@pytest.fixture
def llm_config_value_with_agent_builder():
    config = {
        "LlmParams": {
            "ModelProvider": "Bedrock",
            "BedrockLlmParams": {"ModelId": "fakemodel"},
        },
        "UseCaseType": "AgentBuilder",
        "AgentBuilderParams": {
            "MemoryConfig": {"LongTermEnabled": False},
            "MCPServers": [
                {
                    "Type": "runtime",
                }
            ],
            "Tools": [
                {"ToolId": "calculator"},
                {"ToolId": "current_time"},
                {"ToolId": "environment"},
            ],
        },
    }
    yield config


@pytest.fixture
def llm_config_value_with_workflow():
    config = {
        "LlmParams": {
            "ModelProvider": "Bedrock",
            "BedrockLlmParams": {"ModelId": "fakemodel"},
        },
        "UseCaseType": "Workflow",
        "WorkflowParams": {
            "AgentsAsToolsParams": {
                "Agents": [
                    {
                        "UseCaseType": "AgentBuilder",
                    },
                    {
                        "UseCaseType": "AgentBuilder",
                    },
                ]
            },
            "MemoryConfig": {"LongTermEnabled": False},
            "OrchestrationPattern": "agents-as-tools",
        },
    }
    yield config


@pytest.fixture
def llm_config_value_text_with_no_rag():
    config = {
        "LlmParams": {
            "ModelProvider": "Bedrock",
            "BedrockLlmParams": {
                "ModelId": "fakemodel",
                "GuardrailIdentifier": "GuardrailIdentifier",
                "GuardrailVersion": "v1.2.3",
            },
            "PromptParams": {
                "PromptTemplate": "template",
                "DisambiguationPromptTemplate": "fake",
                "MaxPromptTemplateLength": 100,
                "RephraseQuestion": True,
            },
        },
        "ConversationMemoryParams": {
            "ConversationMemoryType": "DynamoDB",
            "ChatHistoryLength": 10,
        },
        "UseCaseType": "Text",
        "KnowledgeBaseParams": {},
    }
    yield config


@pytest.fixture
def llm_config_value_with_provisioned_concurrency():
    config = {
        "LlmParams": {
            "ModelProvider": "Bedrock",
            "BedrockLlmParams": {"ModelId": "fakemodel"},
        },
        "UseCaseType": "Text",
        "ProvisionedConcurrencyValue": 10,
    }
    yield config


@pytest.fixture
def lambda_events(aws_credentials, custom_resource_event):
    events_list = []
    payloads = [
        {
            RESOURCE: operation_types.METRIC,
            "SolutionId": "SO0999",
            "Version": "v9.9.9",
            "ServiceToken": "arn:aws:lambda:us-east-1:123456789012:function:fakefunction:1",
            USE_CASE_CONFIG_TABLE_NAME: "fake_ddb_table",
            USE_CASE_CONFIG_RECORD_KEY: "fake_ddb_table_hash_key",
            UUID: "fakeuuid",
        },
        {
            RESOURCE: operation_types.METRIC,
            "SolutionId": "SO0999",
            "Version": "v9.9.9",
            "ServiceToken": "arn:aws:lambda:us-east-1:123456789012:function:fakefunction:1",
            UUID: "fakeuuid",
        },
        {
            RESOURCE: operation_types.METRIC,
            "SolutionId": "SO0999",
            "Version": "v9.9.9",
            "ServiceToken": "arn:aws:lambda:us-east-1:123456789012:function:fakefunction:1",
            UUID: "fakeuuid",
        },
        {
            RESOURCE: operation_types.METRIC,
            "SolutionId": "SO0999",
            "Version": "v9.9.9",
            "ServiceToken": "arn:aws:lambda:us-east-1:123456789012:function:fakefunction:1",
            USE_CASE_CONFIG_TABLE_NAME: "fake_ddb_table",
            USE_CASE_CONFIG_RECORD_KEY: "fake_ddb_table_hash_key_2",  # Second mock table to simulate config value with no knowledge base
            UUID: "fakeuuid",
        },
        {
            RESOURCE: operation_types.METRIC,
            "SolutionId": "SO0999",
            "Version": "v9.9.9",
            "ServiceToken": "arn:aws:lambda:us-east-1:123456789012:function:fakefunction:1",
            USE_CASE_CONFIG_TABLE_NAME: "fake_ddb_table",
            USE_CASE_CONFIG_RECORD_KEY: "fake_ddb_table_hash_key_3",  # Second mock table to simulate config value with no knowledge base
            UUID: "fakeuuid",
        },
        {
            RESOURCE: operation_types.METRIC,
            "SolutionId": "SO0999",
            "Version": "v9.9.9",
            "ServiceToken": "arn:aws:lambda:us-east-1:123456789012:function:fakefunction:1",
            USE_CASE_CONFIG_TABLE_NAME: "fake_ddb_table",
            USE_CASE_CONFIG_RECORD_KEY: "fake_ddb_table_hash_key_4",
            UUID: "fakeuuid",
        },
        {
            RESOURCE: operation_types.ANONYMOUS_METRIC,
            "SolutionId": "SO0999",
            "Version": "v9.9.9",
            "ServiceToken": "arn:aws:lambda:us-east-1:123456789012:function:fakefunction:1",
            USE_CASE_CONFIG_TABLE_NAME: "fake_ddb_table",
            USE_CASE_CONFIG_RECORD_KEY: "fake_ddb_table_hash_key_8",
            UUID: "fakeuuid",
        },
        {
            RESOURCE: operation_types.ANONYMOUS_METRIC,
            "SolutionId": "SO0999",
            "Version": "v9.9.9",
            "ServiceToken": "arn:aws:lambda:us-east-1:123456789012:function:fakefunction:1",
            USE_CASE_CONFIG_TABLE_NAME: "fake_ddb_table",
            USE_CASE_CONFIG_RECORD_KEY: "fake_ddb_table_hash_key_9",
            UUID: "fakeuuid",
        },
    ]
    custom_resource_event[PHYSICAL_RESOURCE_ID] = "fake_physical_resource_id"

    for payload_item in payloads:
        custom_resource_event[RESOURCE_PROPERTIES] = payload_item
        events_list.append(copy(custom_resource_event))

    yield events_list


@pytest.fixture(autouse=True)
def setup_config_ddb(
    ddb,
    llm_config_value,
    llm_config_value_text_with_no_rag,
    llm_config_value_with_auth,
    llm_config_value_with_agent,
    llm_config_value_with_multimodal,
    llm_config_value_with_mcp_gateway,
    llm_config_value_with_mcp_runtime,
    llm_config_value_with_agent_builder,
    llm_config_value_with_workflow,
    llm_config_value_with_provisioned_concurrency,
):
    table = ddb.create_table(
        TableName="fake_ddb_table",
        KeySchema=[
            {"AttributeName": USE_CASE_CONFIG_RECORD_KEY_ATTRIBUTE_NAME, "KeyType": "HASH"},
        ],
        AttributeDefinitions=[
            {"AttributeName": USE_CASE_CONFIG_RECORD_KEY_ATTRIBUTE_NAME, "AttributeType": "S"},
        ],
        BillingMode="PAY_PER_REQUEST",
    )
    table.put_item(
        TableName="fake_ddb_table",
        Item={
            USE_CASE_CONFIG_RECORD_KEY_ATTRIBUTE_NAME: "fake_ddb_table_hash_key",
            "config": llm_config_value,
        },
    )
    table.put_item(
        TableName="fake_ddb_table",
        Item={
            USE_CASE_CONFIG_RECORD_KEY_ATTRIBUTE_NAME: "fake_ddb_table_hash_key_2",
            "config": llm_config_value_text_with_no_rag,
        },
    )

    table.put_item(
        TableName="fake_ddb_table",
        Item={
            USE_CASE_CONFIG_RECORD_KEY_ATTRIBUTE_NAME: "fake_ddb_table_hash_key_3",
            "config": llm_config_value_with_agent,
        },
    )

    table.put_item(
        TableName="fake_ddb_table",
        Item={
            USE_CASE_CONFIG_RECORD_KEY_ATTRIBUTE_NAME: "fake_ddb_table_hash_key_4",
            "config": llm_config_value_with_auth,
        },
    )

    table.put_item(
        TableName="fake_ddb_table",
        Item={
            USE_CASE_CONFIG_RECORD_KEY_ATTRIBUTE_NAME: "fake_ddb_table_hash_key_5",
            "config": llm_config_value_with_multimodal,
        },
    )

    table.put_item(
        TableName="fake_ddb_table",
        Item={
            USE_CASE_CONFIG_RECORD_KEY_ATTRIBUTE_NAME: "fake_ddb_table_hash_key_6",
            "config": llm_config_value_with_mcp_gateway,
        },
    )

    table.put_item(
        TableName="fake_ddb_table",
        Item={
            USE_CASE_CONFIG_RECORD_KEY_ATTRIBUTE_NAME: "fake_ddb_table_hash_key_7",
            "config": llm_config_value_with_mcp_runtime,
        },
    )

    table.put_item(
        TableName="fake_ddb_table",
        Item={
            USE_CASE_CONFIG_RECORD_KEY_ATTRIBUTE_NAME: "fake_ddb_table_hash_key_8",
            "config": llm_config_value_with_agent_builder,
        },
    )

    table.put_item(
        TableName="fake_ddb_table",
        Item={
            USE_CASE_CONFIG_RECORD_KEY_ATTRIBUTE_NAME: "fake_ddb_table_hash_key_9",
            "config": llm_config_value_with_workflow,
        },
    )

    table.put_item(
        TableName="fake_ddb_table",
        Item={
            USE_CASE_CONFIG_RECORD_KEY_ATTRIBUTE_NAME: "fake_ddb_table_hash_key_10",
            "config": llm_config_value_with_provisioned_concurrency,
        },
    )

    yield ddb
