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
    CONVERSATION_TABLE_NAME_ENV_VAR,
    DEFAULT_HUGGINGFACE_MODEL,
    KENDRA_INDEX_ID_ENV_VAR,
    LLM_PARAMETERS_SSM_KEY_ENV_VAR,
    LLM_PROVIDER_API_KEY_ENV_VAR,
    RAG_ENABLED_ENV_VAR,
    TRACE_ID_ENV_VAR,
    WEBSOCKET_CALLBACK_URL_ENV_VAR,
)


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
def setup_environment():
    os.environ[LLM_PARAMETERS_SSM_KEY_ENV_VAR] = "fake-ssm-param"
    os.environ[LLM_PROVIDER_API_KEY_ENV_VAR] = "fake-secret-name"
    os.environ[CONVERSATION_TABLE_NAME_ENV_VAR] = "fake-table"
    os.environ[KENDRA_INDEX_ID_ENV_VAR] = "fake-kendra-index-id"
    os.environ[WEBSOCKET_CALLBACK_URL_ENV_VAR] = "fake-url"
    os.environ[RAG_ENABLED_ENV_VAR] = "true"
    os.environ[TRACE_ID_ENV_VAR] = "fake-trace-id"
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
def llm_config(prompt, is_streaming, rag_enabled):
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
                        "ReturnSourceDocs": False,
                    },
                    "ConversationMemoryParams": {},  # TODO: check if this can be removed.
                    "LlmParams": {
                        "ModelId": DEFAULT_HUGGINGFACE_MODEL,
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
def bedrock_llm_config(prompt, is_streaming, rag_enabled, model_id="amazon.titan-text-express-v1", model_params=None):
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
                        "ReturnSourceDocs": False,
                    },
                    "ConversationMemoryParams": {},
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
