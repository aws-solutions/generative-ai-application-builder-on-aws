#!/usr/bin/env python
# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

import json
from dataclasses import dataclass
from unittest.mock import patch

import pytest
from langchain_core.runnables.utils import AddableDict

from bedrock_handler import lambda_handler
from utils.constants import (
    CHAT_IDENTIFIER,
    CONTEXT_KEY,
    CONVERSATION_ID_EVENT_KEY,
    END_CONVERSATION_TOKEN,
    MESSAGE_ID_EVENT_KEY,
    OUTPUT_KEY,
    RAG_CHAT_IDENTIFIER,
    REPHRASED_QUERY_KEY,
)
from utils.enum_types import KnowledgeBaseTypes

from . import bedrock_source_doc_responses, kendra_source_doc_responses, mocked_kendra_docs

TEST_AMAZON_MODEL_ID = "amazon.test-model-id"
BEDROCK_PROMPT = """\n\n{history}\n\n{input}"""
BEDROCK_RAG_PROMPT = """{context}\n\n{history}\n\n{input}"""
MOCK_REPHRASED_QUERY = "a rephrased query"
MOCK_CONNECTION_ID = "fake-connection-id"
MOCK_CONVERSATION_ID = "fake-conversation-id"
MOCK_MESSAGE_ID = "fake-message-id"
MOCK_REPHRASED_QUERY = "a rephrased query"
MOCK_AI_RESPONSE = "I'm doing well, how are you?"


@pytest.fixture
def lambda_context():
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
            return 5000

    return LambdaContext()


@pytest.fixture
def chat_event_with_array(rag_enabled):
    if rag_enabled:
        prompt = "\\n\\nHuman: You are a friendly AI assistant that is helpful, honest, and harmless. Use the context to answer questions. {context} \\n\\nHere is the current conversation:\\n{history}\\n\\n{input}\\n\\nAssistant:"
    else:
        prompt = "\\n\\nHuman: You are a friendly AI assistant that is helpful, honest, and harmless.\\n\\nHere is the current conversation:\\n{history}\\n\\n{input}\\n\\nAssistant:"
    yield {
        "Records": [
            {
                "messageId": "fake-message-id-0",
                "receiptHandle": "fake-receipt-handle",
                "body": json.dumps(
                    {
                        "requestContext": {
                            "authorizer": {"UserId": "fake-user-id"},
                            "connectionId": MOCK_CONNECTION_ID,
                        },
                        "message": {
                            "action": "sendMessage",
                            "question": "fake_message",
                            "conversationId": MOCK_CONVERSATION_ID,
                            "promptTemplate": prompt,
                        },
                    }
                ),
                "attributes": {
                    "ApproximateReceiveCount": "1",
                    "AWSTraceHeader": "Root=fake-tracer-id",
                    "SentTimestamp": "1714352244002",
                    "SequenceNumber": "18885618248174063616",
                    "MessageGroupId": "fake-message_group_id",
                    "SenderId": "fake_sender_id",
                    "MessageDeduplicationId": MOCK_CONNECTION_ID,
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
                        "stringValue": MOCK_CONNECTION_ID,
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
            },
            {
                "messageId": "fake-message-id-1",
                "receiptHandle": "fake-receipt-handle",
                "body": json.dumps(
                    {
                        "requestContext": {
                            "authorizer": {"UserId": "fake-user-id"},
                            "connectionId": MOCK_CONNECTION_ID,
                        },
                        "message": {
                            "action": "sendMessage",
                            "question": "fake_message",
                            "conversationId": MOCK_CONVERSATION_ID,
                            "promptTemplate": prompt,
                        },
                    }
                ),
                "attributes": {
                    "ApproximateReceiveCount": "1",
                    "AWSTraceHeader": "Root=fake-tracer-id",
                    "SentTimestamp": "1714352244002",
                    "SequenceNumber": "18885618248174063616",
                    "MessageGroupId": "fake-message_group_id",
                    "SenderId": "fake_sender_id",
                    "MessageDeduplicationId": MOCK_CONNECTION_ID,
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
                        "stringValue": MOCK_CONNECTION_ID,
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
            },
        ]
    }


@pytest.mark.parametrize(
    "use_case, mocked_response, prompt, is_streaming, rag_enabled, knowledge_base_type, return_source_docs, model_id",
    [
        (
            CHAT_IDENTIFIER,
            MOCK_AI_RESPONSE,
            BEDROCK_PROMPT,
            False,  # is_streaming
            False,  # rag_enabled
            None,
            False,  # return_source_docs
            TEST_AMAZON_MODEL_ID,
        ),
        (
            CHAT_IDENTIFIER,
            MOCK_AI_RESPONSE,
            BEDROCK_PROMPT,
            True,  # is_streaming
            False,  # rag_enabled
            None,
            False,  # return_source_docs
            TEST_AMAZON_MODEL_ID,
        ),
        (
            RAG_CHAT_IDENTIFIER,
            {
                OUTPUT_KEY: MOCK_AI_RESPONSE,
                REPHRASED_QUERY_KEY: MOCK_REPHRASED_QUERY,
            },
            BEDROCK_RAG_PROMPT,
            False,  # is_streaming
            True,  # rag_enabled
            KnowledgeBaseTypes.KENDRA.value,
            False,  # return_source_docs
            TEST_AMAZON_MODEL_ID,
        ),
        (
            RAG_CHAT_IDENTIFIER,
            [
                AddableDict(
                    {
                        OUTPUT_KEY: "I'm doing ",
                    }
                ),
                AddableDict(
                    {
                        OUTPUT_KEY: "well, how",
                    }
                ),
                AddableDict(
                    {
                        OUTPUT_KEY: " are you?",
                    }
                ),
                AddableDict(
                    {
                        CONTEXT_KEY: mocked_kendra_docs,
                        REPHRASED_QUERY_KEY: MOCK_REPHRASED_QUERY,
                    }
                ),
            ],
            BEDROCK_RAG_PROMPT,
            True,  # is_streaming
            True,  # rag_enabled
            KnowledgeBaseTypes.KENDRA.value,
            False,  # return_source_docs
            TEST_AMAZON_MODEL_ID,
        ),
        (
            RAG_CHAT_IDENTIFIER,
            {
                OUTPUT_KEY: MOCK_AI_RESPONSE,
                CONTEXT_KEY: mocked_kendra_docs,
                REPHRASED_QUERY_KEY: MOCK_REPHRASED_QUERY,
            },
            BEDROCK_RAG_PROMPT,
            False,  # is_streaming
            True,  # rag_enabled
            KnowledgeBaseTypes.KENDRA.value,
            True,  # return_source_docs
            TEST_AMAZON_MODEL_ID,
        ),
        (
            RAG_CHAT_IDENTIFIER,
            [
                AddableDict(
                    {
                        OUTPUT_KEY: "I'm doing ",
                    }
                ),
                AddableDict(
                    {
                        OUTPUT_KEY: "well, how",
                    }
                ),
                AddableDict(
                    {
                        OUTPUT_KEY: " are you?",
                    }
                ),
                AddableDict(
                    {
                        CONTEXT_KEY: mocked_kendra_docs,
                        REPHRASED_QUERY_KEY: MOCK_REPHRASED_QUERY,
                    }
                ),
            ],
            BEDROCK_RAG_PROMPT,
            True,  # is_streaming
            True,  # rag_enabled
            KnowledgeBaseTypes.KENDRA.value,
            True,  # return_source_docs
            TEST_AMAZON_MODEL_ID,
        ),
    ],
)
def test_lambda_timeout_behavior(
    use_case,
    is_streaming,
    return_source_docs,
    mocked_response,
    bedrock_llm_config,
    prompt,
    rag_enabled,
    chat_event_with_array,
    apigateway_stubber,
    lambda_context,
    setup_environment,
    model_id,
    bedrock_dynamodb_defaults_table,
    knowledge_base_type,
):
    with patch("clients.bedrock_client.BedrockClient.retrieve_use_case_config") as mocked_retrieve_llm_config:
        with patch(
            "shared.knowledge.kendra_knowledge_base.CustomKendraRetriever._get_relevant_documents"
        ) as mocked_kendra_docs:
            with patch("clients.bedrock_client.uuid4", return_value=MOCK_MESSAGE_ID):
                mocked_kendra_docs.return_value = mocked_kendra_docs

                if not is_streaming:
                    post_to_gateway = [
                        {
                            "data": MOCK_AI_RESPONSE,
                            CONVERSATION_ID_EVENT_KEY: MOCK_CONVERSATION_ID,
                            MESSAGE_ID_EVENT_KEY: MOCK_MESSAGE_ID,
                        },
                    ]
                    if return_source_docs:
                        post_to_gateway += (
                            kendra_source_doc_responses(MOCK_CONVERSATION_ID, MOCK_MESSAGE_ID)
                            if knowledge_base_type == KnowledgeBaseTypes.KENDRA.value
                            else []
                        )
                        post_to_gateway += (
                            bedrock_source_doc_responses(MOCK_CONVERSATION_ID, MOCK_MESSAGE_ID)
                            if knowledge_base_type == KnowledgeBaseTypes.BEDROCK.value
                            else []
                        )

                    for payload in post_to_gateway:
                        apigateway_stubber.add_response(
                            "post_to_connection",
                            {},
                            expected_params={
                                "ConnectionId": MOCK_CONNECTION_ID,
                                "Data": json.dumps(payload),
                            },
                        )
                else:
                    # For streaming tests, expect fallback response when streaming fails
                    apigateway_stubber.add_response(
                        "post_to_connection",
                        {},
                        expected_params={
                            "ConnectionId": MOCK_CONNECTION_ID,
                            "Data": json.dumps(
                                {
                                    "data": MOCK_AI_RESPONSE,
                                    CONVERSATION_ID_EVENT_KEY: MOCK_CONVERSATION_ID,
                                    MESSAGE_ID_EVENT_KEY: MOCK_MESSAGE_ID,
                                }
                            ),
                        },
                    )

                    # For streaming RAG tests with source docs, expect source document responses
                    if rag_enabled and return_source_docs:
                        source_doc_responses = (
                            kendra_source_doc_responses(MOCK_CONVERSATION_ID, MOCK_MESSAGE_ID)
                            if knowledge_base_type == KnowledgeBaseTypes.KENDRA.value
                            else []
                        )
                        source_doc_responses += (
                            bedrock_source_doc_responses(MOCK_CONVERSATION_ID, MOCK_MESSAGE_ID)
                            if knowledge_base_type == KnowledgeBaseTypes.BEDROCK.value
                            else []
                        )

                        for payload in source_doc_responses:
                            apigateway_stubber.add_response(
                                "post_to_connection",
                                {},
                                expected_params={
                                    "ConnectionId": MOCK_CONNECTION_ID,
                                    "Data": json.dumps(payload),
                                },
                            )

                    # For streaming RAG tests, expect rephrased query response
                    if rag_enabled:
                        apigateway_stubber.add_response(
                            "post_to_connection",
                            {},
                            expected_params={
                                "ConnectionId": MOCK_CONNECTION_ID,
                                "Data": json.dumps(
                                    {
                                        REPHRASED_QUERY_KEY: MOCK_REPHRASED_QUERY,
                                        "conversationId": MOCK_CONVERSATION_ID,
                                        MESSAGE_ID_EVENT_KEY: MOCK_MESSAGE_ID,
                                    }
                                ),
                            },
                        )

                if not is_streaming and rag_enabled:
                    apigateway_stubber.add_response(
                        "post_to_connection",
                        {},
                        expected_params={
                            "ConnectionId": MOCK_CONNECTION_ID,
                            "Data": json.dumps(
                                {
                                    REPHRASED_QUERY_KEY: MOCK_REPHRASED_QUERY,
                                    "conversationId": MOCK_CONVERSATION_ID,
                                    MESSAGE_ID_EVENT_KEY: MOCK_MESSAGE_ID,
                                }
                            ),
                        },
                    )

                apigateway_stubber.add_response(
                    "post_to_connection",
                    {},
                    expected_params={
                        "ConnectionId": MOCK_CONNECTION_ID,
                        "Data": json.dumps(
                            {
                                "data": END_CONVERSATION_TOKEN,
                                "conversationId": MOCK_CONVERSATION_ID,
                                MESSAGE_ID_EVENT_KEY: MOCK_MESSAGE_ID,
                            }
                        ),
                    },
                )
                apigateway_stubber.activate()

                with patch(
                    "clients.bedrock_client.BedrockClient.retrieve_use_case_config"
                ) as mocked_retrieve_llm_config:
                    if is_streaming:
                        method_name = "stream"
                    else:
                        method_name = "invoke"
                    with patch(f"langchain_core.runnables.RunnableWithMessageHistory.{method_name}") as mocked_predict:
                        mocked_predict.return_value = mocked_response
                        mocked_retrieve_llm_config.return_value = bedrock_llm_config
                        response = lambda_handler(chat_event_with_array, lambda_context)

                        assert response["batchItemFailures"] is not None
                        assert response["batchItemFailures"][0]["itemIdentifier"] == "fake-message-id-1"
