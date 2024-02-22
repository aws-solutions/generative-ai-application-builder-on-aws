#!/usr/bin/env python
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

import json
import os
from datetime import datetime
from unittest.mock import MagicMock

import boto3
import pytest
from botocore.stub import Stubber
from custom_config import custom_usr_agent_config
from helper import get_service_client
from moto import mock_dynamodb, mock_secretsmanager, mock_ssm
from utils.constants import (
    CHAT_IDENTIFIER,
    CONVERSATION_TABLE_NAME_ENV_VAR,
    KENDRA_INDEX_ID_ENV_VAR,
    LLM_PARAMETERS_SSM_KEY_ENV_VAR,
    LLM_PROVIDER_API_KEY_ENV_VAR,
    MODEL_INFO_TABLE_NAME_ENV_VAR,
    RAG_CHAT_IDENTIFIER,
    RAG_ENABLED_ENV_VAR,
    TRACE_ID_ENV_VAR,
    WEBSOCKET_CALLBACK_URL_ENV_VAR,
)
from utils.enum_types import LLMProviderTypes

DEFAULT_BEDROCK_ANTHROPIC_CONDENSING_PROMPT = """\n\nHuman: Given the following conversation and a follow up question, rephrase the follow up question to be a standalone question.\n\nChat history:\n{chat_history}\n\nFollow up question: {question}\n\nAssistant: Standalone question:"""
CONDENSE_QUESTION_PROMPT = """Given the following conversation and a follow up question, rephrase the follow up question to be a standalone question, in its original language.\n\nChat History:\n{chat_history}\nFollow Up Input: {question}\nStandalone question:"""


@pytest.fixture
def context():
    yield MagicMock()


@pytest.fixture
def ssm():
    with mock_ssm():
        yield boto3.client("ssm", config=custom_usr_agent_config())


@pytest.fixture
def kendra_stubber():
    kendra_client = get_service_client("kendra")
    with Stubber(kendra_client) as stubber:
        yield stubber
        stubber.assert_no_pending_responses()


@pytest.fixture(autouse=True)
def dynamodb_resource():
    with mock_dynamodb():
        yield boto3.resource("dynamodb", config=custom_usr_agent_config())


@pytest.fixture(autouse=True)
def secretsmanager():
    with mock_secretsmanager():
        yield boto3.client("secretsmanager", config=custom_usr_agent_config())


@pytest.fixture
def apigateway_stubber():
    apigateway_client = get_service_client("apigatewaymanagementapi")
    with Stubber(apigateway_client) as stubber:
        yield stubber
        stubber.assert_no_pending_responses()


@pytest.fixture
def ssm_stubber():
    ssm_client = get_service_client("ssm")
    with Stubber(ssm_client) as stubber:
        yield stubber
        stubber.assert_no_pending_responses()


@pytest.fixture
def bedrock_stubber():
    bedrock_client = get_service_client("bedrock-runtime")
    with Stubber(bedrock_client) as stubber:
        yield stubber
        stubber.assert_no_pending_responses()


@pytest.fixture
def sagemaker_stubber():
    sagemaker_client = get_service_client("sagemaker-runtime")
    with Stubber(sagemaker_client) as stubber:
        yield stubber
        stubber.assert_no_pending_responses()


@pytest.fixture
def setup_environment():
    os.environ[LLM_PARAMETERS_SSM_KEY_ENV_VAR] = "fake-ssm-param"
    os.environ[LLM_PROVIDER_API_KEY_ENV_VAR] = "fake-secret-name"
    os.environ[CONVERSATION_TABLE_NAME_ENV_VAR] = "fake-table"
    os.environ[KENDRA_INDEX_ID_ENV_VAR] = "fake-kendra-index-id"
    os.environ[WEBSOCKET_CALLBACK_URL_ENV_VAR] = "fake-url"
    os.environ[RAG_ENABLED_ENV_VAR] = "true"
    os.environ[TRACE_ID_ENV_VAR] = "fake-trace-id"
    os.environ[MODEL_INFO_TABLE_NAME_ENV_VAR] = "fake-model-info-table-name"
    yield


@pytest.fixture
def setup_bedrock_environment(setup_environment):
    os.environ.pop(LLM_PROVIDER_API_KEY_ENV_VAR)
    yield


@pytest.fixture
def setup_secret(secretsmanager):
    secretsmanager.create_secret(Name="fake-secret-name", SecretString="fake-secret-value")
    yield


@pytest.fixture(autouse=True)
def chat_event():
    yield {
        "requestContext": {
            "routeKey": "sendMessage",
            "authorizer": {"principalId": "fake-user-id", "UserId": "fake-user-id"},
            "messageId": "fake-message-id",
            "eventType": "MESSAGE",
            "extendedRequestId": "fake-erequest-id",
            "requestTime": "10/Jun/2023:15:00:00 +0000",
            "messageDirection": "IN",
            "stage": "prod",
            "connectedAt": 1686412547438,
            "requestTimeEpoch": 1686412645906,
            "identity": {"sourceIp": "1.1.1.1"},
            "requestId": "fake-request-id",
            "domainName": "fake-api-id.execute-api.us-east-1.amazonaws.com",
            "connectionId": "fake-id",
            "apiId": "fake-api-id",
        },
        "body": '{"action":"sendMessage","conversationId":"fake-conversation-id","question":"How are you?"}',
        "isBase64Encoded": False,
    }


@pytest.fixture
def llm_config(prompt, is_streaming, rag_enabled, return_source_docs, model_id):
    yield {
        "Parameter": {
            "Name": f"{os.getenv(LLM_PARAMETERS_SSM_KEY_ENV_VAR)}",
            "Type": "String",
            "Value": json.dumps(
                {
                    "ConversationMemoryType": "DynamoDB",
                    "KnowledgeBaseType": "Kendra",
                    "KnowledgeBaseParams": {
                        "NumberOfDocs": 2,
                        "ReturnSourceDocs": return_source_docs,
                    },
                    "LlmParams": {
                        "ModelId": model_id,
                        "ModelParams": {
                            "max_length": {"Type": "integer", "Value": "100"},
                            "top_p": {"Type": "float", "Value": "0.2"},
                        },
                        "PromptTemplate": prompt,
                        "Streaming": is_streaming,
                        "Verbose": True,
                        "Temperature": 0.2,
                        "RAGEnabled": rag_enabled,
                    },
                }
            ),
            "Version": 1,
            "LastModifiedDate": datetime(2023, 1, 1),
            "ARN": "fake-arn",
            "DataType": "text",
        }
    }


@pytest.fixture
def bedrock_llm_config(prompt, is_streaming, rag_enabled, return_source_docs, model_id, model_params=None):
    yield {
        "Parameter": {
            "Name": f"{os.getenv(LLM_PARAMETERS_SSM_KEY_ENV_VAR)}",
            "Type": "String",
            "Value": json.dumps(
                {
                    "ConversationMemoryType": "DynamoDB",
                    "KnowledgeBaseType": "Kendra",
                    "KnowledgeBaseParams": {
                        "NumberOfDocs": 2,
                        "ReturnSourceDocs": return_source_docs,
                    },
                    "LlmParams": {
                        "ModelId": model_id,
                        "ModelParams": model_params,
                        "PromptTemplate": prompt,
                        "Streaming": is_streaming,
                        "Verbose": True,
                        "Temperature": 0.2,
                        "RAGEnabled": rag_enabled,
                    },
                }
            ),
            "Version": 1,
            "LastModifiedDate": datetime(2023, 1, 1),
            "ARN": "fake-arn",
            "DataType": "text",
        }
    }


@pytest.fixture
def sagemaker_llm_config(
    prompt,
    is_streaming,
    rag_enabled,
    return_source_docs,
    model_params=None,
    model_id="default",
):
    yield {
        "Parameter": {
            "Name": f"{os.getenv(LLM_PARAMETERS_SSM_KEY_ENV_VAR)}",
            "Type": "String",
            "Value": json.dumps(
                {
                    "ConversationMemoryType": "DynamoDB",
                    "KnowledgeBaseType": "Kendra",
                    "KnowledgeBaseParams": {
                        "NumberOfDocs": 2,
                        "ReturnSourceDocs": return_source_docs,
                    },
                    "LlmParams": {
                        "InferenceEndpoint": "sagemaker-endpoint-name",
                        "ModelInputPayloadSchema": {"fake-key": "fake-value"},
                        "ModelOutputJSONPath": "$[0].generated_text",
                        "ModelParams": model_params,
                        "PromptTemplate": prompt,
                        "Streaming": is_streaming,
                        "Verbose": True,
                        "Temperature": 0.2,
                        "RAGEnabled": rag_enabled,
                    },
                }
            ),
            "Version": 1,
            "LastModifiedDate": datetime(2023, 1, 1),
            "ARN": "fake-arn",
            "DataType": "text",
        }
    }


@pytest.fixture
def dynamodb_defaults_table(dynamodb_resource, setup_environment):
    # Create the DynamoDB table.
    dynamodb_resource.create_table(
        TableName=os.getenv(MODEL_INFO_TABLE_NAME_ENV_VAR),
        KeySchema=[
            {"AttributeName": "UseCase", "KeyType": "HASH"},
            {"AttributeName": "SortKey", "KeyType": "RANGE"},
        ],
        AttributeDefinitions=[
            {"AttributeName": "UseCase", "AttributeType": "S"},
            {"AttributeName": "SortKey", "AttributeType": "S"},
        ],
        BillingMode="PAY_PER_REQUEST",
    )
    yield dynamodb_resource


@pytest.fixture
def huggingface_dynamodb_defaults_table(
    dynamodb_resource,
    dynamodb_defaults_table,
    prompt,
    use_case,
    is_streaming,
    model_id,
    model_provider=LLMProviderTypes.HUGGINGFACE.value,
):
    model_provider = model_provider
    model_id = model_id
    table_name = os.getenv(MODEL_INFO_TABLE_NAME_ENV_VAR)
    if use_case == CHAT_IDENTIFIER:
        output_key = None
        context_key = None
        input_key = "input"
        history_key = "history"
    elif use_case == RAG_CHAT_IDENTIFIER:
        output_key = "answer"
        context_key = "context"
        input_key = "question"
        history_key = "chat_history"
    else:
        raise Exception(f"Not a supported use-case {use_case}")

    table = dynamodb_resource.Table(table_name)
    table.put_item(
        Item={
            "UseCase": use_case,
            "SortKey": f"{model_provider}#{model_id}",
            "AllowsStreaming": is_streaming,
            "DefaultTemperature": "0.5",
            "MaxChatMessageSize": "2500",
            "MaxPromptSize": "2000",
            "MaxTemperature": "1",
            "MemoryConfig": {
                "history": history_key,
                "input": input_key,
                "context": context_key,
                "ai_prefix": "AI",
                "human_prefix": "Human",
                "output": output_key,
            },
            "MinTemperature": "0",
            "ModelName": model_id,
            "ModelProviderName": model_provider,
            "Prompt": prompt,
            "DefaultStopSequences": [],
            "DisambiguationPrompt": CONDENSE_QUESTION_PROMPT,
        }
    )


@pytest.fixture
def huggingface_endpoint_dynamodb_defaults_table(
    dynamodb_resource,
    dynamodb_defaults_table,
    prompt,
    use_case,
    is_streaming,
    model_provider=LLMProviderTypes.HUGGINGFACE_ENDPOINT.value,
    model_id="google/flan-t5-xxl",
):
    table_name = os.getenv(MODEL_INFO_TABLE_NAME_ENV_VAR)
    if use_case == CHAT_IDENTIFIER:
        output_key = None
        context_key = None
        input_key = "input"
        history_key = "history"
    elif use_case == RAG_CHAT_IDENTIFIER:
        output_key = "answer"
        context_key = "context"
        input_key = "question"
        history_key = "chat_history"
    else:
        raise Exception(f"Not a supported use-case {use_case}")

    table = dynamodb_resource.Table(table_name)
    table.put_item(
        Item={
            "UseCase": use_case,
            "SortKey": f"{model_provider}#{model_id}",
            "AllowsStreaming": is_streaming,
            "DefaultTemperature": "0.5",
            "MaxChatMessageSize": "2500",
            "MaxPromptSize": "2000",
            "MaxTemperature": "1",
            "MemoryConfig": {
                "history": history_key,
                "input": input_key,
                "context": context_key,
                "ai_prefix": "AI",
                "human_prefix": "Human",
                "output": output_key,
            },
            "MinTemperature": "0",
            "ModelName": model_id,
            "ModelProviderName": model_provider,
            "Prompt": prompt,
            "DefaultStopSequences": [],
            "DisambiguationPrompt": CONDENSE_QUESTION_PROMPT,
        }
    )


@pytest.fixture
def anthropic_dynamodb_defaults_table(
    dynamodb_resource,
    dynamodb_defaults_table,
    prompt,
    use_case,
    is_streaming,
    model_id,
    model_provider=LLMProviderTypes.ANTHROPIC.value,
):
    table_name = os.getenv(MODEL_INFO_TABLE_NAME_ENV_VAR)
    if use_case == CHAT_IDENTIFIER:
        output_key = None
        context_key = None
        input_key = "input"
        history_key = "history"
    elif use_case == RAG_CHAT_IDENTIFIER:
        output_key = "answer"
        context_key = "context"
        input_key = "question"
        history_key = "chat_history"
    else:
        raise Exception(f"Not a supported use-case {use_case}")

    table = dynamodb_resource.Table(table_name)
    table.put_item(
        Item={
            "UseCase": use_case,
            "SortKey": f"{model_provider}#{model_id}",
            "AllowsStreaming": is_streaming,
            "DefaultTemperature": "0.5",
            "MaxChatMessageSize": "2500",
            "MaxPromptSize": "2000",
            "MaxTemperature": "1",
            "MemoryConfig": {
                "history": history_key,
                "input": input_key,
                "context": context_key,
                "ai_prefix": "A",
                "human_prefix": "H",
                "output": output_key,
            },
            "MinTemperature": "0",
            "ModelName": model_id,
            "ModelProviderName": {model_provider},
            "Prompt": prompt,
            "DefaultStopSequences": [],
            "DisambiguationPrompt": DEFAULT_BEDROCK_ANTHROPIC_CONDENSING_PROMPT,
        }
    )


@pytest.fixture
def bedrock_dynamodb_defaults_table(
    dynamodb_resource,
    prompt,
    dynamodb_defaults_table,
    use_case,
    is_streaming,
    model_id,
    model_provider=LLMProviderTypes.BEDROCK.value,
):
    table_name = os.getenv(MODEL_INFO_TABLE_NAME_ENV_VAR)
    if use_case == CHAT_IDENTIFIER:
        output_key = None
        context_key = None
        input_key = "input"
        history_key = "history"
    elif use_case == RAG_CHAT_IDENTIFIER:
        output_key = "answer"
        context_key = "context"
        input_key = "question"
        history_key = "chat_history"
    else:
        raise Exception(f"Not a supported use-case {use_case}")

    table = dynamodb_resource.Table(table_name)
    table.put_item(
        Item={
            "UseCase": use_case,
            "SortKey": f"{model_provider}#{model_id}",
            "AllowsStreaming": is_streaming,
            "DefaultTemperature": "0.5",
            "MaxChatMessageSize": "2500",
            "MaxPromptSize": "2000",
            "MaxTemperature": "1",
            "MemoryConfig": {
                "history": history_key,
                "input": input_key,
                "context": context_key,
                "ai_prefix": "Bot",
                "human_prefix": "User",
                "output": output_key,
            },
            "MinTemperature": "0",
            "ModelName": model_id,
            "ModelProviderName": model_provider,
            "Prompt": prompt,
            "DefaultStopSequences": [],
            "DisambiguationPrompt": CONDENSE_QUESTION_PROMPT,
        }
    )


@pytest.fixture
def sagemaker_dynamodb_defaults_table(
    dynamodb_resource,
    prompt,
    dynamodb_defaults_table,
    use_case,
    is_streaming,
    model_id,
    model_provider=LLMProviderTypes.SAGEMAKER.value,
):
    table_name = os.getenv(MODEL_INFO_TABLE_NAME_ENV_VAR)
    if use_case == CHAT_IDENTIFIER:
        output_key = None
        context_key = None
        input_key = "input"
        history_key = "history"
    elif use_case == RAG_CHAT_IDENTIFIER:
        output_key = "answer"
        context_key = "context"
        input_key = "question"
        history_key = "chat_history"
    else:
        raise Exception(f"Not a supported use-case {use_case}")

    table = dynamodb_resource.Table(table_name)
    table.put_item(
        Item={
            "UseCase": use_case,
            "SortKey": f"{model_provider}#{model_id}",
            "AllowsStreaming": is_streaming,
            "DefaultTemperature": "0.5",
            "MaxChatMessageSize": "2500",
            "MaxPromptSize": "2000",
            "MaxTemperature": "1",
            "MemoryConfig": {
                "history": history_key,
                "input": input_key,
                "context": context_key,
                "ai_prefix": "Bot",
                "human_prefix": "User",
                "output": output_key,
            },
            "MinTemperature": "0",
            "ModelName": model_id,
            "ModelProviderName": model_provider,
            "Prompt": prompt,
            "DefaultStopSequences": [],
            "DisambiguationPrompt": CONDENSE_QUESTION_PROMPT,
        }
    )
