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
from dataclasses import dataclass
from unittest.mock import patch

import pytest
from bedrock_handler import lambda_handler
from utils.constants import (
    CHAT_IDENTIFIER,
    CONTEXT_KEY,
    CONVERSATION_ID_EVENT_KEY,
    END_CONVERSATION_TOKEN,
    OUTPUT_KEY,
    RAG_CHAT_IDENTIFIER,
    REPHRASED_QUERY_KEY,
)
from utils.enum_types import KnowledgeBaseTypes

from . import bedrock_source_doc_responses, kendra_source_doc_responses, mocked_kendra_docs

BEDROCK_PROMPT = """\n\n{history}\n\n{input}"""
BEDROCK_RAG_PROMPT = """{context}\n\n{history}\n\n{input}"""


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
                            "connectionId": "fake-connection-id",
                        },
                        "message": {
                            "action": "sendMessage",
                            "question": "fake_message",
                            "conversationId": "fake-conversation-id",
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
            },
            {
                "messageId": "fake-message-id-1",
                "receiptHandle": "fake-receipt-handle",
                "body": json.dumps(
                    {
                        "requestContext": {
                            "authorizer": {"UserId": "fake-user-id"},
                            "connectionId": "fake-connection-id",
                        },
                        "message": {
                            "action": "sendMessage",
                            "question": "fake_message",
                            "conversationId": "fake-conversation-id",
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
            },
        ]
    }


@pytest.mark.parametrize(
    "use_case, mocked_response, prompt, is_streaming, rag_enabled, knowledge_base_type, return_source_docs, model_id",
    [
        (
            CHAT_IDENTIFIER,
            "I'm doing well, how are you?",
            BEDROCK_PROMPT,
            False,  # is_streaming
            False,  # rag_enabled
            None,
            False,  # return_source_docs
            "amazon.model-xx",
        ),
        (
            CHAT_IDENTIFIER,
            "I'm doing well, how are you?",
            BEDROCK_PROMPT,
            True,  # is_streaming
            False,  # rag_enabled
            None,
            False,  # return_source_docs
            "amazon.model-xx",
        ),
        (
            RAG_CHAT_IDENTIFIER,
            {
                OUTPUT_KEY: "I'm doing well, how are you?",
                REPHRASED_QUERY_KEY: "rephrased query",
            },
            BEDROCK_RAG_PROMPT,
            False,  # is_streaming
            True,  # rag_enabled
            KnowledgeBaseTypes.KENDRA.value,
            False,  # return_source_docs
            "amazon.model-xx",
        ),
        (
            RAG_CHAT_IDENTIFIER,
            {
                OUTPUT_KEY: "I'm doing well, how are you?",
                REPHRASED_QUERY_KEY: "rephrased query",
            },
            BEDROCK_RAG_PROMPT,
            True,  # is_streaming
            True,  # rag_enabled
            KnowledgeBaseTypes.KENDRA.value,
            False,  # return_source_docs
            "amazon.model-xx",
        ),
        (
            RAG_CHAT_IDENTIFIER,
            {
                OUTPUT_KEY: "I'm doing well, how are you?",
                CONTEXT_KEY: mocked_kendra_docs,
                REPHRASED_QUERY_KEY: "rephrased query",
            },
            BEDROCK_RAG_PROMPT,
            False,  # is_streaming
            True,  # rag_enabled
            KnowledgeBaseTypes.KENDRA.value,
            True,  # return_source_docs
            "amazon.model-xx",
        ),
        (
            RAG_CHAT_IDENTIFIER,
            {
                OUTPUT_KEY: "I'm doing well, how are you?",
                CONTEXT_KEY: mocked_kendra_docs,
                REPHRASED_QUERY_KEY: "rephrased query",
            },
            BEDROCK_RAG_PROMPT,
            True,  # is_streaming
            True,  # rag_enabled
            KnowledgeBaseTypes.KENDRA.value,
            True,  # return_source_docs
            "amazon.model-xx",
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
            "shared.knowledge.kendra_knowledge_base.CustomKendraRetriever.get_relevant_documents"
        ) as mocked_kendra_docs:
            mocked_kendra_docs.return_value = mocked_kendra_docs

            if not is_streaming:
                post_to_gateway = [
                    {"data": "I'm doing well, how are you?", CONVERSATION_ID_EVENT_KEY: "fake-conversation-id"},
                ]
                if return_source_docs:
                    post_to_gateway += (
                        kendra_source_doc_responses("fake-conversation-id")
                        if knowledge_base_type == KnowledgeBaseTypes.KENDRA.value
                        else []
                    )
                    post_to_gateway += (
                        bedrock_source_doc_responses("fake-conversation-id")
                        if knowledge_base_type == KnowledgeBaseTypes.BEDROCK.value
                        else []
                    )

                for payload in post_to_gateway:
                    apigateway_stubber.add_response(
                        "post_to_connection",
                        {},
                        expected_params={
                            "ConnectionId": "fake-connection-id",
                            "Data": json.dumps(payload),
                        },
                    )

            apigateway_stubber.add_response(
                "post_to_connection",
                {},
                expected_params={
                    "ConnectionId": "fake-connection-id",
                    "Data": json.dumps(
                        {
                            "data": END_CONVERSATION_TOKEN,
                            "conversationId": "fake-conversation-id",
                        }
                    ),
                },
            )
            apigateway_stubber.activate()

            with patch("clients.bedrock_client.BedrockClient.retrieve_use_case_config") as mocked_retrieve_llm_config:
                with patch("langchain_core.runnables.RunnableWithMessageHistory.invoke") as mocked_predict:
                    mocked_predict.return_value = mocked_response  # "I'm doing well, how are you?"
                    # mocked_rag_predict.return_value = mocked_response
                    mocked_retrieve_llm_config.return_value = bedrock_llm_config
                    response = lambda_handler(chat_event_with_array, lambda_context)

                    assert response["batchItemFailures"] is not None
                    assert response["batchItemFailures"][0]["itemIdentifier"] == "fake-message-id-1"
