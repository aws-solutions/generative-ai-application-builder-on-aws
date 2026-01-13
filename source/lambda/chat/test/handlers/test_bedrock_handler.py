#!/usr/bin/env python
# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

import json
from copy import copy
from unittest.mock import patch
from uuid import uuid4

import pytest
from langchain_core.runnables.utils import AddableDict

from bedrock_handler import lambda_handler
from utils.constants import (
    CHAT_IDENTIFIER,
    CONTEXT_KEY,
    CONVERSATION_ID_EVENT_KEY,
    END_CONVERSATION_TOKEN,
    MESSAGE_ID_EVENT_KEY,
    MESSAGE_KEY,
    OUTPUT_KEY,
    RAG_CHAT_IDENTIFIER,
    REPHRASED_QUERY_KEY,
    REQUEST_CONTEXT_KEY,
)
from utils.enum_types import KnowledgeBaseTypes

from . import bedrock_source_doc_responses, kendra_source_doc_responses, mocked_kendra_docs, mocked_bedrock_docs

TEST_AMAZON_MODEL_ID = "amazon.test-model-id"
BEDROCK_PROMPT = """\n\n{history}\n\n{input}"""
BEDROCK_RAG_PROMPT = """{context}\n\n{history}\n\n{input}"""
MOCK_CONNECTION_ID = "fake-connection-id"
MOCK_CONVERSATION_ID = "fake-conversation-id"
MOCK_MESSAGE_ID = "fake-message-id"
MOCK_REPHRASED_QUERY = "a rephrased query"
MOCK_AI_RESPONSE = "I'm doing well, how are you?"
MOCK_USER_INPUT = "How are you?"


@pytest.mark.parametrize(
    "use_case, mocked_response, prompt, is_streaming, rag_enabled, knowledge_base_type, return_source_docs, model_id",
    [
        (
            CHAT_IDENTIFIER,
            MOCK_AI_RESPONSE,
            BEDROCK_PROMPT,
            False,
            False,
            None,
            False,
            TEST_AMAZON_MODEL_ID,
        ),
        (
            CHAT_IDENTIFIER,
            MOCK_AI_RESPONSE,
            BEDROCK_PROMPT,
            True,
            False,
            None,
            False,
            TEST_AMAZON_MODEL_ID,
        ),
        (
            RAG_CHAT_IDENTIFIER,
            {OUTPUT_KEY: MOCK_AI_RESPONSE, REPHRASED_QUERY_KEY: MOCK_REPHRASED_QUERY},
            BEDROCK_RAG_PROMPT,
            False,
            True,
            KnowledgeBaseTypes.KENDRA.value,
            False,
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
            True,
            True,
            KnowledgeBaseTypes.KENDRA.value,
            False,
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
            False,
            True,
            KnowledgeBaseTypes.KENDRA.value,
            True,
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
                        CONTEXT_KEY: mocked_bedrock_docs,
                        REPHRASED_QUERY_KEY: MOCK_REPHRASED_QUERY,
                    }
                ),
            ],
            BEDROCK_RAG_PROMPT,
            True,
            True,
            KnowledgeBaseTypes.BEDROCK.value,
            True,
            TEST_AMAZON_MODEL_ID,
        ),
    ],
)
def test_bedrock_chat_handler(
    use_case,
    is_streaming,
    return_source_docs,
    mocked_response,
    bedrock_llm_config,
    prompt,
    rag_enabled,
    chat_event,
    apigateway_stubber,
    context,
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
                        bedrock_source_doc_responses(MOCK_CONVERSATION_ID)
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
                            "messageId": MOCK_MESSAGE_ID,
                        }
                    ),
                },
            )
            apigateway_stubber.activate()

            with patch("clients.bedrock_client.uuid4", return_value=MOCK_MESSAGE_ID):
                if is_streaming:
                    method_name = "stream"
                else:
                    method_name = "invoke"
                with patch(f"langchain_core.runnables.RunnableWithMessageHistory.{method_name}") as mocked_predict:
                    mocked_predict.return_value = mocked_response
                    mocked_retrieve_llm_config.return_value = bedrock_llm_config
                    response = lambda_handler(chat_event, context)
                    assert response == {"batchItemFailures": []}

            apigateway_stubber.deactivate()


@pytest.mark.parametrize(
    "use_case, mocked_response, prompt, is_streaming, rag_enabled, knowledge_base_type, return_source_docs, model_id",
    [
        (
            CHAT_IDENTIFIER,
            MOCK_AI_RESPONSE,
            BEDROCK_PROMPT,
            False,
            False,
            None,
            False,
            TEST_AMAZON_MODEL_ID,
        ),
        (
            CHAT_IDENTIFIER,
            MOCK_AI_RESPONSE,
            BEDROCK_PROMPT,
            True,
            False,
            None,
            False,
            TEST_AMAZON_MODEL_ID,
        ),
        (
            RAG_CHAT_IDENTIFIER,
            {OUTPUT_KEY: MOCK_AI_RESPONSE, REPHRASED_QUERY_KEY: MOCK_REPHRASED_QUERY},
            BEDROCK_RAG_PROMPT,
            False,
            True,
            KnowledgeBaseTypes.KENDRA.value,
            False,
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
            True,
            True,
            KnowledgeBaseTypes.KENDRA.value,
            False,
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
            False,
            True,
            KnowledgeBaseTypes.KENDRA.value,
            True,
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
                        CONTEXT_KEY: mocked_bedrock_docs,
                        REPHRASED_QUERY_KEY: MOCK_REPHRASED_QUERY,
                    }
                ),
            ],
            BEDROCK_RAG_PROMPT,
            True,
            True,
            KnowledgeBaseTypes.BEDROCK.value,
            True,
            TEST_AMAZON_MODEL_ID,
        ),
    ],
)
def test_bedrock_chat_handler_empty_conversation(
    is_streaming,
    model_id,
    return_source_docs,
    mocked_response,
    chat_event,
    bedrock_llm_config,
    rag_enabled,
    apigateway_stubber,
    context,
    setup_environment,
    bedrock_dynamodb_defaults_table,
    knowledge_base_type,
):
    # chat event with empty/no conversationId
    chat_event_conversation_empty = copy(chat_event)
    chat_event_conversation_empty["Records"][0]["body"] = json.dumps(
        {
            REQUEST_CONTEXT_KEY: {"authorizer": {"UserId": "fake-user-id"}, "connectionId": MOCK_CONNECTION_ID},
            MESSAGE_KEY: {"action": "sendMessage", "userId": "fake-user-id", "question": MOCK_USER_INPUT},
        }
    )
    with patch("clients.bedrock_client.BedrockClient.retrieve_use_case_config") as mocked_retrieve_llm_config:
        with patch("clients.llm_chat_client.uuid4") as mocked_uuid:
            mocked_uuid.return_value = MOCK_CONVERSATION_ID
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
                            "messageId": MOCK_MESSAGE_ID,
                        }
                    ),
                },
            )

            apigateway_stubber.activate()
            with patch("clients.llm_chat_client.uuid4", return_value=MOCK_CONVERSATION_ID):
                with patch("clients.bedrock_client.uuid4", return_value=MOCK_MESSAGE_ID):
                    with patch("langchain_core.runnables.RunnableWithMessageHistory.invoke") as mocked_predict:
                        if is_streaming:
                            method_name = "stream"
                        else:
                            method_name = "invoke"
                        with patch(
                            f"langchain_core.runnables.RunnableWithMessageHistory.{method_name}"
                        ) as mocked_rag_predict:
                            mocked_predict.return_value = MOCK_AI_RESPONSE
                            mocked_rag_predict.return_value = mocked_response
                            mocked_retrieve_llm_config.return_value = bedrock_llm_config
                            response = lambda_handler(chat_event_conversation_empty, context)
                            assert response == {"batchItemFailures": []}
            apigateway_stubber.deactivate()


@pytest.mark.parametrize(
    "use_case, prompt, is_streaming, rag_enabled, knowledge_base_type, return_source_docs, model_id",
    [
        (
            CHAT_IDENTIFIER,
            BEDROCK_PROMPT,
            True,
            False,
            None,
            False,
            TEST_AMAZON_MODEL_ID,
        ),
        (
            CHAT_IDENTIFIER,
            BEDROCK_PROMPT,
            False,
            False,
            None,
            False,
            TEST_AMAZON_MODEL_ID,
        ),
        (
            RAG_CHAT_IDENTIFIER,
            BEDROCK_RAG_PROMPT,
            True,
            True,
            KnowledgeBaseTypes.BEDROCK.value,
            False,
            TEST_AMAZON_MODEL_ID,
        ),
        (
            RAG_CHAT_IDENTIFIER,
            BEDROCK_RAG_PROMPT,
            False,
            True,
            KnowledgeBaseTypes.BEDROCK.value,
            False,
            TEST_AMAZON_MODEL_ID,
        ),
        (
            RAG_CHAT_IDENTIFIER,
            BEDROCK_RAG_PROMPT,
            True,
            True,
            KnowledgeBaseTypes.BEDROCK.value,
            True,
            TEST_AMAZON_MODEL_ID,
        ),
        (
            RAG_CHAT_IDENTIFIER,
            BEDROCK_RAG_PROMPT,
            False,
            True,
            KnowledgeBaseTypes.BEDROCK.value,
            True,
            TEST_AMAZON_MODEL_ID,
        ),
    ],
)
def test_missing_llm_config_key(
    chat_event,
    is_streaming,
    model_id,
    bedrock_llm_config,
    rag_enabled,
    apigateway_stubber,
    context,
    return_source_docs,
    setup_environment,
    bedrock_dynamodb_defaults_table,
):
    with patch("clients.bedrock_client.BedrockClient.retrieve_use_case_config") as mocked_retrieve_llm_config:
        mocked_retrieve_llm_config.return_value = bedrock_llm_config

        apigateway_stubber.add_response(
            "post_to_connection",
            {},
            expected_params={
                "ConnectionId": MOCK_CONNECTION_ID,
                "Data": json.dumps(
                    {
                        "conversationId": MOCK_CONVERSATION_ID,
                        "messageId": None,
                        "errorMessage": "Chat service failed to respond. Please contact your administrator for support and quote the following trace id: fake-trace-id",
                        "traceId": "fake-trace-id",
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
                        "conversationId": MOCK_CONVERSATION_ID,
                        "messageId": None,
                        "data": END_CONVERSATION_TOKEN,
                    }
                ),
            },
        )

        apigateway_stubber.activate()
        with patch("clients.bedrock_client.uuid4", return_value=MOCK_MESSAGE_ID):
            response = lambda_handler(chat_event, context)
            assert response == {"batchItemFailures": [{"itemIdentifier": "fake-message-id"}]}
        apigateway_stubber.deactivate()
