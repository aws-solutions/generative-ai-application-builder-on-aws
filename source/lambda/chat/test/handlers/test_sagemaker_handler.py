#!/usr/bin/env python
# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

import json
from copy import copy
from unittest.mock import patch
from uuid import uuid4

import pytest

from sagemaker_handler import lambda_handler
from utils.constants import (
    CHAT_IDENTIFIER,
    CONTEXT_KEY,
    CONVERSATION_ID_EVENT_KEY,
    DEFAULT_SAGEMAKER_MODEL_ID,
    END_CONVERSATION_TOKEN,
    MESSAGE_ID_EVENT_KEY,
    MESSAGE_KEY,
    OUTPUT_KEY,
    RAG_CHAT_IDENTIFIER,
    REPHRASED_QUERY_KEY,
    REQUEST_CONTEXT_KEY,
)
from utils.enum_types import KnowledgeBaseTypes

from . import kendra_source_doc_responses, mocked_kendra_docs

SAGEMAKER_PROMPT = """\n\n{history}\n\n{input}"""
SAGEMAKER_RAG_PROMPT = """{context}\n\n{history}\n\n{input}"""
SAGEMAKER_MODEL_ID = DEFAULT_SAGEMAKER_MODEL_ID
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
            SAGEMAKER_PROMPT,
            False,  # is_streaming
            False,  # rag_enabled
            None,
            False,  # return_source_docs
            SAGEMAKER_MODEL_ID,
        ),
        (
            CHAT_IDENTIFIER,
            MOCK_AI_RESPONSE,
            SAGEMAKER_PROMPT,
            False,  # is_streaming
            False,  # rag_enabled
            None,
            False,  # return_source_docs
            SAGEMAKER_MODEL_ID,
        ),
        (
            RAG_CHAT_IDENTIFIER,
            {OUTPUT_KEY: MOCK_AI_RESPONSE, REPHRASED_QUERY_KEY: MOCK_REPHRASED_QUERY},
            SAGEMAKER_RAG_PROMPT,
            False,  # is_streaming
            True,  # rag_enabled
            KnowledgeBaseTypes.KENDRA.value,
            False,  # return_source_docs
            SAGEMAKER_MODEL_ID,
        ),
        (
            RAG_CHAT_IDENTIFIER,
            {OUTPUT_KEY: MOCK_AI_RESPONSE, REPHRASED_QUERY_KEY: MOCK_REPHRASED_QUERY},
            SAGEMAKER_RAG_PROMPT,
            False,  # is_streaming
            True,  # rag_enabled,
            KnowledgeBaseTypes.KENDRA.value,
            False,  # return_source_docs
            SAGEMAKER_MODEL_ID,
        ),
        (
            RAG_CHAT_IDENTIFIER,
            {
                OUTPUT_KEY: MOCK_AI_RESPONSE,
                CONTEXT_KEY: mocked_kendra_docs,
                REPHRASED_QUERY_KEY: MOCK_REPHRASED_QUERY,
            },
            SAGEMAKER_RAG_PROMPT,
            False,  # is_streaming
            True,  # rag_enabled
            KnowledgeBaseTypes.KENDRA.value,
            True,  # return_source_docs
            SAGEMAKER_MODEL_ID,
        ),
        (
            RAG_CHAT_IDENTIFIER,
            {
                OUTPUT_KEY: MOCK_AI_RESPONSE,
                CONTEXT_KEY: mocked_kendra_docs,
                REPHRASED_QUERY_KEY: MOCK_REPHRASED_QUERY,
            },
            SAGEMAKER_RAG_PROMPT,
            False,  # is_streaming
            True,  # rag_enabled
            KnowledgeBaseTypes.KENDRA.value,
            True,  # return_source_docs
            SAGEMAKER_MODEL_ID,
        ),
    ],
)
def test_sagemaker_chat_handler(
    use_case,
    is_streaming,
    return_source_docs,
    mocked_response,
    sagemaker_llm_config,
    prompt,
    rag_enabled,
    chat_event,
    apigateway_stubber,
    context,
    setup_environment,
    model_id,
    sagemaker_dynamodb_defaults_table,
):
    with patch("clients.sagemaker_client.SageMakerClient.retrieve_use_case_config") as mocked_retrieve_llm_config:
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
                post_to_gateway += (
                    kendra_source_doc_responses(MOCK_CONVERSATION_ID, MOCK_MESSAGE_ID) if return_source_docs else []
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

            if not is_streaming and rag_enabled:
                apigateway_stubber.add_response(
                    "post_to_connection",
                    {},
                    expected_params={
                        "ConnectionId": "fake-connection-id",
                        "Data": json.dumps(
                            {
                                REPHRASED_QUERY_KEY: MOCK_REPHRASED_QUERY,
                                "conversationId": "fake-conversation-id",
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
            with apigateway_stubber:
                with patch("clients.sagemaker_client.uuid4", return_value=MOCK_MESSAGE_ID):
                    with patch("langchain_core.runnables.RunnableWithMessageHistory.invoke") as mocked_predict:
                        mocked_predict.return_value = mocked_response
                        mocked_retrieve_llm_config.return_value = sagemaker_llm_config
                        response = lambda_handler(chat_event, context)
                        assert response == {"batchItemFailures": []}


@pytest.mark.parametrize(
    "use_case, mocked_response, prompt, is_streaming, rag_enabled, knowledge_base_type, return_source_docs, model_id",
    [
        (
            CHAT_IDENTIFIER,
            MOCK_AI_RESPONSE,
            SAGEMAKER_PROMPT,
            False,  # is_streaming
            False,  # rag_enabled
            None,
            False,  # return_source_docs
            SAGEMAKER_MODEL_ID,
        ),
        (
            CHAT_IDENTIFIER,
            MOCK_AI_RESPONSE,
            SAGEMAKER_PROMPT,
            False,  # is_streaming
            False,  # rag_enabled
            None,
            False,  # return_source_docs
            SAGEMAKER_MODEL_ID,
        ),
        (
            RAG_CHAT_IDENTIFIER,
            {
                OUTPUT_KEY: MOCK_AI_RESPONSE,
                REPHRASED_QUERY_KEY: MOCK_REPHRASED_QUERY,
            },
            SAGEMAKER_RAG_PROMPT,
            False,  # is_streaming
            True,  # rag_enabled
            KnowledgeBaseTypes.KENDRA.value,
            False,  # return_source_docs
            SAGEMAKER_MODEL_ID,
        ),
        (
            RAG_CHAT_IDENTIFIER,
            {
                OUTPUT_KEY: MOCK_AI_RESPONSE,
                REPHRASED_QUERY_KEY: MOCK_REPHRASED_QUERY,
            },
            SAGEMAKER_RAG_PROMPT,
            False,  # is_streaming
            True,  # rag_enabled
            KnowledgeBaseTypes.KENDRA.value,
            False,  # return_source_docs
            SAGEMAKER_MODEL_ID,
        ),
        (
            RAG_CHAT_IDENTIFIER,
            {
                OUTPUT_KEY: MOCK_AI_RESPONSE,
                CONTEXT_KEY: mocked_kendra_docs,
                REPHRASED_QUERY_KEY: MOCK_REPHRASED_QUERY,
            },
            SAGEMAKER_RAG_PROMPT,
            False,  # is_streaming
            True,  # rag_enabled
            KnowledgeBaseTypes.KENDRA.value,
            True,  # return_source_docs
            SAGEMAKER_MODEL_ID,
        ),
        (
            RAG_CHAT_IDENTIFIER,
            {
                OUTPUT_KEY: MOCK_AI_RESPONSE,
                CONTEXT_KEY: mocked_kendra_docs,
                REPHRASED_QUERY_KEY: MOCK_REPHRASED_QUERY,
            },
            SAGEMAKER_RAG_PROMPT,
            False,  # is_streaming
            True,  # rag_enabled
            KnowledgeBaseTypes.KENDRA.value,
            True,  # return_source_docs
            SAGEMAKER_MODEL_ID,
        ),
    ],
)
def test_sagemaker_chat_handler_empty_conversation(
    is_streaming,
    model_id,
    return_source_docs,
    mocked_response,
    chat_event,
    sagemaker_llm_config,
    rag_enabled,
    apigateway_stubber,
    context,
    setup_environment,
    sagemaker_dynamodb_defaults_table,
):
    # chat event with empty/no conversationId
    chat_event_conversation_empty = copy(chat_event)
    chat_event_conversation_empty["Records"][0]["body"] = json.dumps(
        {
            REQUEST_CONTEXT_KEY: {"authorizer": {"UserId": "fake-user-id"}, "connectionId": MOCK_CONNECTION_ID},
            MESSAGE_KEY: {"action": "sendMessage", "userId": "fake-user-id", "question": MOCK_USER_INPUT},
        }
    )

    with patch("clients.sagemaker_client.SageMakerClient.retrieve_use_case_config") as mocked_retrieve_llm_config:
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
                post_to_gateway += (
                    kendra_source_doc_responses(MOCK_CONVERSATION_ID, MOCK_MESSAGE_ID) if return_source_docs else []
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

            if not is_streaming and rag_enabled:
                apigateway_stubber.add_response(
                    "post_to_connection",
                    {},
                    expected_params={
                        "ConnectionId": "fake-connection-id",
                        "Data": json.dumps(
                            {
                                REPHRASED_QUERY_KEY: MOCK_REPHRASED_QUERY,
                                "conversationId": "fake-conversation-id",
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
                with patch("clients.sagemaker_client.uuid4", return_value=MOCK_MESSAGE_ID):
                    with patch("langchain_core.runnables.RunnableWithMessageHistory.invoke") as mocked_predict:
                        mocked_predict.return_value = mocked_response
                        mocked_retrieve_llm_config.return_value = sagemaker_llm_config
                        response = lambda_handler(chat_event_conversation_empty, context)
                        assert response == {"batchItemFailures": []}
            apigateway_stubber.deactivate()


@pytest.mark.parametrize(
    "use_case, prompt, is_streaming, rag_enabled, knowledge_base_type, return_source_docs, model_id",
    [
        (
            CHAT_IDENTIFIER,
            SAGEMAKER_PROMPT,
            True,
            False,
            None,
            False,
            SAGEMAKER_MODEL_ID,
        ),
        (
            CHAT_IDENTIFIER,
            SAGEMAKER_PROMPT,
            False,
            False,
            None,
            False,
            SAGEMAKER_MODEL_ID,
        ),
        (
            RAG_CHAT_IDENTIFIER,
            SAGEMAKER_RAG_PROMPT,
            True,
            True,
            KnowledgeBaseTypes.KENDRA.value,
            False,
            SAGEMAKER_MODEL_ID,
        ),
        (
            RAG_CHAT_IDENTIFIER,
            SAGEMAKER_RAG_PROMPT,
            False,
            True,
            KnowledgeBaseTypes.BEDROCK.value,
            False,
            SAGEMAKER_MODEL_ID,
        ),
        (
            RAG_CHAT_IDENTIFIER,
            SAGEMAKER_RAG_PROMPT,
            True,
            True,
            KnowledgeBaseTypes.KENDRA.value,
            True,
            SAGEMAKER_MODEL_ID,
        ),
        (
            RAG_CHAT_IDENTIFIER,
            SAGEMAKER_RAG_PROMPT,
            False,
            True,
            KnowledgeBaseTypes.BEDROCK.value,
            True,
            SAGEMAKER_MODEL_ID,
        ),
    ],
)
def test_missing_llm_config_key(
    chat_event,
    model_id,
    sagemaker_llm_config,
    rag_enabled,
    apigateway_stubber,
    context,
    return_source_docs,
    setup_environment,
    sagemaker_dynamodb_defaults_table,
):
    with patch("clients.sagemaker_client.SageMakerClient.retrieve_use_case_config") as mocked_retrieve_llm_config:
        mocked_retrieve_llm_config.return_value = sagemaker_llm_config

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

        with apigateway_stubber:
            with patch("clients.sagemaker_client.uuid4", return_value=MOCK_MESSAGE_ID):
                response = lambda_handler(chat_event, context)
                assert response == {"batchItemFailures": [{"itemIdentifier": "fake-message-id"}]}
