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

import os
from dataclasses import dataclass
from unittest.mock import Mock

import boto3
import pytest
from botocore.stub import Stubber
from cognito_jwt_verifier import CognitoJWTVerifier
from custom_config import custom_usr_agent_config
from helper import get_service_client
from jwt import PyJWKClient
from moto import mock_aws
from utils.constants import (
    BEDROCK_KNOWLEDGE_BASE_ID_ENV_VAR,
    CLIENT_ID_ENV_VAR,
    CONVERSATION_TABLE_NAME_ENV_VAR,
    KENDRA_INDEX_ID_ENV_VAR,
    MODEL_INFO_TABLE_NAME_ENV_VAR,
    RAG_CHAT_IDENTIFIER,
    TRACE_ID_ENV_VAR,
    USE_CASE_CONFIG_RECORD_KEY_ENV_VAR,
    USE_CASE_CONFIG_TABLE_NAME_ENV_VAR,
    USER_POOL_ID_ENV_VAR,
    WEBSOCKET_CALLBACK_URL_ENV_VAR,
)
from utils.enum_types import BedrockModelProviders, LLMProviderTypes

DEFAULT_BEDROCK_ANTHROPIC_DISAMBIGUATION_PROMPT = """\n\nHuman: Given the following conversation and a follow up question, rephrase the follow up question to be a standalone question.\n\nChat history:\n{history}\n\nFollow up question: {input}\n\nAssistant: Standalone question:"""
DISAMBIGUATION_PROMPT = """Given the following conversation and a follow up question, rephrase the follow up question to be a standalone question, in its original language.\n\nChat History:\n{history}\nFollow Up Input: {input}\nStandalone question:"""
human_prefix = "human"
ai_prefix = "ai"
provisioned_arn = "arn:aws:bedrock:us-east-1:123456789012:provisioned-model/z8g9xzoxoxmw"


@pytest.fixture
def test_human():
    return human_prefix


@pytest.fixture
def test_ai():
    return ai_prefix


@pytest.fixture
def test_provisioned_arn():
    return provisioned_arn


@pytest.fixture
def context():
    """
    Mock AWS LambdaContext
    """

    @dataclass
    class LambdaContext:
        function_name: str = "fake-function"
        memory_limit_in_mb: int = 128
        invoked_function_arn: str = "arn:aws:lambda:us-east-1:fake-account-id:function:fake-function"
        aws_request_id: str = "fake-request-id"
        log_group_name: str = "test-log-group-name"
        log_stream_name: str = "test-log-stream"

        def get_remaining_time_in_millis(self):
            return 900000  # 15 mins

    return LambdaContext()


@pytest.fixture
def kendra_stubber():
    kendra_client = get_service_client("kendra")
    with Stubber(kendra_client) as stubber:
        yield stubber
        stubber.assert_no_pending_responses()


@pytest.fixture(autouse=True)
def dynamodb_resource():
    with mock_aws():
        yield boto3.resource("dynamodb", config=custom_usr_agent_config())


@pytest.fixture(autouse=True)
def secretsmanager():
    with mock_aws():
        yield boto3.client("secretsmanager", config=custom_usr_agent_config())


@pytest.fixture
def apigateway_stubber():
    apigateway_client = get_service_client("apigatewaymanagementapi")
    with Stubber(apigateway_client) as stubber:
        yield stubber
        stubber.assert_no_pending_responses()


@pytest.fixture
def bedrock_stubber():
    bedrock_client = get_service_client("bedrock-runtime")
    with Stubber(bedrock_client) as stubber:
        yield stubber
        stubber.assert_no_pending_responses()


@pytest.fixture
def bedrock_agent_stubber():
    bedrock_agent_client = get_service_client("bedrock-agent-runtime")
    with Stubber(bedrock_agent_client) as stubber:
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
    os.environ[CONVERSATION_TABLE_NAME_ENV_VAR] = "fake-table"
    os.environ[KENDRA_INDEX_ID_ENV_VAR] = "fake-kendra-index-id"
    os.environ[BEDROCK_KNOWLEDGE_BASE_ID_ENV_VAR] = "fake-bedrock-knowledge-base-id"
    os.environ[WEBSOCKET_CALLBACK_URL_ENV_VAR] = "fake-url"
    os.environ[TRACE_ID_ENV_VAR] = "fake-trace-id"
    os.environ[MODEL_INFO_TABLE_NAME_ENV_VAR] = "fake-model-info-table-name"
    os.environ[USE_CASE_CONFIG_TABLE_NAME_ENV_VAR] = "fake-table"
    os.environ[USE_CASE_CONFIG_RECORD_KEY_ENV_VAR] = "fake-key"
    os.environ[CLIENT_ID_ENV_VAR] = "fakeClientId"
    os.environ[USER_POOL_ID_ENV_VAR] = "fakeUserPoolId"
    yield


@pytest.fixture(autouse=True)
def chat_event():
    yield {
        "Records": [
            {
                "messageId": "fake-message-id",
                "receiptHandle": "fake-receipt-handle",
                "body": '{"requestContext": {"authorizer": {"UserId": "fake-user-id"}, "connectionId": "fake-connection-id"}, "message": {"action":"sendMessage","question":"fake_message","conversationId":"fake-conversation-id","promptTemplate":"\\n\\nHuman: You are a friendly AI assistant that is helpful, honest, and harmless.\\n\\nHere is the current conversation:\\n{history}\\n\\n{input}\\n\\nAssistant:"}}',
                "attributes": {
                    "ApproximateReceiveCount": "1",
                    "AWSTraceHeader": "Root=fake-tracer-id",
                    "SentTimestamp": "1714352244002",
                    "SequenceNumber": "18885618248174063616",
                    "MessageGroupId": "fake-message_group_id",
                    "SenderId": "fake_sender_id",
                    "MessageDeduplicationId": "fake-connection-id",
                    "ApproximateFirstReceiveTimestamp": "123456789012",
                },
                "messageAttributes": {
                    "requestId": {
                        "stringValue": "fake-request-id",
                        "stringListValues": [],
                        "binaryListValues": [],
                        "dataType": "String",
                    },
                    "connectionId": {
                        "stringValue": "fake-connection-id",
                        "stringListValues": [],
                        "binaryListValues": [],
                        "dataType": "String",
                    },
                },
                "md5OfMessageAttributes": "fake-md5-attributes",
                "md5OfBody": "fake_md5_attributes",
                "eventSource": "aws:sqs",
                "eventSourceARN": "arn:aws:sqs:us-east-1:123456789012:fake-queue_bane.fifo",
                "awsRegion": "us-east-1",
            }
        ]
    }


@pytest.fixture
def bedrock_llm_config(
    prompt, is_streaming, rag_enabled, knowledge_base_type, return_source_docs, model_id, model_params=None
):
    yield {
        "ConversationMemoryParams": {
            "ConversationMemoryType": "DynamoDB",
            "HumanPrefix": human_prefix,
            "AiPrefix": ai_prefix,
            "ChatHistoryLength": 10,
        },
        "KnowledgeBaseParams": {
            "KnowledgeBaseType": knowledge_base_type,
            "NumberOfDocs": 2,
            "ReturnSourceDocs": return_source_docs,
        },
        "LlmParams": {
            "ModelProvider": LLMProviderTypes.BEDROCK.value,
            "BedrockLlmParams": {
                "ModelId": model_id,
            },
            "ModelParams": model_params,
            "PromptParams": {
                "PromptTemplate": prompt,
                "UserPromptEditingEnabled": True,
                "MaxPromptTemplateLength": 1000,
                "MaxInputTextLength": 1000,
                "RephraseQuestion": True,
                "DisambiguationPromptTemplate": DISAMBIGUATION_PROMPT,
                "DisambiguationEnabled": True,
            },
            "Streaming": is_streaming,
            "Verbose": True,
            "Temperature": 0.2,
            "RAGEnabled": rag_enabled,
        },
    }


@pytest.fixture
def bedrock_provisioned_llm_config(
    prompt,
    is_streaming,
    rag_enabled,
    knowledge_base_type,
    return_source_docs,
    model_id,
    bedrock_llm_config,
    model_params=None,
):
    use_case_config = bedrock_llm_config.copy()
    provisioned_llm_config = use_case_config
    provisioned_llm_config["LlmParams"]["BedrockLlmParams"]["ModelArn"] = provisioned_arn
    use_case_config = provisioned_llm_config
    yield use_case_config


@pytest.fixture
def sagemaker_llm_config(
    prompt,
    is_streaming,
    rag_enabled,
    knowledge_base_type,
    return_source_docs,
    model_params=None,
    model_id="default",
):
    yield {
        "ConversationMemoryParams": {
            "ConversationMemoryType": "DynamoDB",
            "HumanPrefix": human_prefix,
            "AiPrefix": ai_prefix,
            "ChatHistoryLength": 10,
        },
        "KnowledgeBaseParams": {
            "KnowledgeBaseType": knowledge_base_type,
            "NumberOfDocs": 2,
            "ReturnSourceDocs": return_source_docs,
        },
        "LlmParams": {
            "ModelProvider": LLMProviderTypes.SAGEMAKER.value,
            "SageMakerLlmParams": {
                "EndpointName": "sagemaker-endpoint-name",
                "ModelInputPayloadSchema": {"fake-key": "fake-value"},
                "ModelOutputJSONPath": "$[0].generated_text",
            },
            "ModelParams": model_params,
            "PromptParams": {
                "PromptTemplate": prompt,
                "UserPromptEditingEnabled": True,
                "MaxPromptTemplateLength": 1000,
                "MaxInputTextLength": 1000,
                "DisambiguationPromptTemplate": DISAMBIGUATION_PROMPT,
                "DisambiguationEnabled": True,
            },
            "Streaming": is_streaming,
            "Verbose": True,
            "Temperature": 0.2,
            "RAGEnabled": rag_enabled,
        },
    }


@pytest.fixture
def basic_llm_config_parsed():
    yield {
        "ConversationMemoryParams": {
            "ConversationMemoryType": "DynamoDB",
            "HumanPrefix": human_prefix,
            "AiPrefix": ai_prefix,
            "ChatHistoryLength": 10,
        },
        "KnowledgeBaseParams": {},
        "LlmParams": {
            "ModelProvider": LLMProviderTypes.BEDROCK.value,
            "BedrockLlmParams": {"ModelId": f"{BedrockModelProviders.ANTHROPIC.value}.fake-model"},
            "ModelParams": {},
            "PromptParams": {
                "PromptTemplate": "{history} {input}",
                "UserPromptEditingEnabled": True,
                "MaxPromptTemplateLength": 1000,
                "MaxInputTextLength": 1000,
                "DisambiguationPromptTemplate": DISAMBIGUATION_PROMPT,
                "DisambiguationEnabled": True,
            },
            "Streaming": True,
            "Verbose": False,
            "Temperature": 0.2,
            "RAGEnabled": False,
        },
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
    input_key = "input"
    history_key = "history"
    output_key = "answer"
    context_key = "context" if use_case == RAG_CHAT_IDENTIFIER else None

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
            "DisambiguationPrompt": DISAMBIGUATION_PROMPT,
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
    input_key = "input"
    history_key = "history"
    output_key = "answer"
    context_key = "context" if use_case == RAG_CHAT_IDENTIFIER else None

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
            "DisambiguationPrompt": DISAMBIGUATION_PROMPT,
        }
    )


@pytest.fixture
def mocked_jwks_client():
    mocked_client = Mock(spec=PyJWKClient)
    mocked_signing_key = Mock()
    mocked_signing_key.key = "mock_signing_key"
    mocked_client.get_signing_key_from_jwt.return_value = mocked_signing_key
    yield mocked_client


@pytest.fixture(autouse=True)
def jwt_verifier(mocked_jwks_client, monkeypatch):
    user_pool_id = "test_user_pool_id"
    app_client_id = "test_app_client_id"
    verifier = CognitoJWTVerifier(user_pool_id, app_client_id)
    monkeypatch.setattr(verifier, "_create_jwks_client", lambda: mocked_jwks_client)
    yield verifier


@pytest.fixture
def valid_jwt_token():
    yield "valid_jwt_token"


@pytest.fixture
def invalid_jwt_token():
    yield "invalid_jwt_token"


@pytest.fixture
def expired_jwt_token():
    yield "expired_jwt_token"


@pytest.fixture
def user_context_token():
    return "mock_user_context_token"
