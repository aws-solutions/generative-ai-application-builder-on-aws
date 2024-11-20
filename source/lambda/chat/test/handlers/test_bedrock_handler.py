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
from copy import copy
from unittest.mock import patch
from uuid import uuid4

import pytest
from bedrock_handler import lambda_handler
from utils.constants import (
    CHAT_IDENTIFIER,
    CONVERSATION_ID_EVENT_KEY,
    END_CONVERSATION_TOKEN,
    MESSAGE_KEY,
    RAG_CHAT_IDENTIFIER,
    REPHRASED_QUERY_KEY,
    REQUEST_CONTEXT_KEY,
    CONTEXT_KEY,
    OUTPUT_KEY,
)
from utils.enum_types import KnowledgeBaseTypes

from . import bedrock_source_doc_responses, kendra_source_doc_responses, mocked_bedrock_docs, mocked_kendra_docs

BEDROCK_PROMPT = """\n\n{history}\n\n{input}"""
BEDROCK_RAG_PROMPT = """{context}\n\n{history}\n\n{input}"""


@pytest.mark.parametrize(
    "use_case, mocked_response, prompt, is_streaming, rag_enabled, knowledge_base_type, return_source_docs, model_id",
    [
        (
            CHAT_IDENTIFIER,
            "I'm doing well, how are you?",
            BEDROCK_PROMPT,
            False,
            False,
            None,
            False,
            "amazon.model-xx",
        ),
        (
            CHAT_IDENTIFIER,
            "I'm doing well, how are you?",
            BEDROCK_PROMPT,
            True,
            False,
            None,
            False,
            "amazon.model-xx",
        ),
        (
            RAG_CHAT_IDENTIFIER,
            {OUTPUT_KEY: "I'm doing well, how are you?", REPHRASED_QUERY_KEY: "rephrased query"},
            BEDROCK_RAG_PROMPT,
            False,
            True,
            KnowledgeBaseTypes.KENDRA.value,
            False,
            "amazon.model-xx",
        ),
        (
            RAG_CHAT_IDENTIFIER,
            {OUTPUT_KEY: "I'm doing well, how are you?", REPHRASED_QUERY_KEY: "rephrased query"},
            BEDROCK_RAG_PROMPT,
            True,
            True,
            KnowledgeBaseTypes.KENDRA.value,
            False,
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
            False,
            True,
            KnowledgeBaseTypes.KENDRA.value,
            True,
            "amazon.model-xx",
        ),
        (
            RAG_CHAT_IDENTIFIER,
            {
                OUTPUT_KEY: "I'm doing well, how are you?",
                CONTEXT_KEY: mocked_bedrock_docs,
                REPHRASED_QUERY_KEY: "rephrased query",
            },
            BEDROCK_RAG_PROMPT,
            True,
            True,
            KnowledgeBaseTypes.BEDROCK.value,
            True,
            "amazon.model-xx",
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
            "I'm doing well, how are you?",
            BEDROCK_PROMPT,
            False,
            False,
            None,
            False,
            "amazon.model-xx",
        ),
        (
            CHAT_IDENTIFIER,
            "I'm doing well, how are you?",
            BEDROCK_PROMPT,
            True,
            False,
            None,
            False,
            "amazon.model-xx",
        ),
        (
            RAG_CHAT_IDENTIFIER,
            {OUTPUT_KEY: "I'm doing well, how are you?", REPHRASED_QUERY_KEY: "rephrased query"},
            BEDROCK_RAG_PROMPT,
            False,
            True,
            KnowledgeBaseTypes.KENDRA.value,
            False,
            "amazon.model-xx",
        ),
        (
            RAG_CHAT_IDENTIFIER,
            {OUTPUT_KEY: "I'm doing well, how are you?", REPHRASED_QUERY_KEY: "rephrased query"},
            BEDROCK_RAG_PROMPT,
            True,
            True,
            KnowledgeBaseTypes.KENDRA.value,
            False,
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
            False,
            True,
            KnowledgeBaseTypes.KENDRA.value,
            True,
            "amazon.model-xx",
        ),
        (
            RAG_CHAT_IDENTIFIER,
            {
                OUTPUT_KEY: "I'm doing well, how are you?",
                CONTEXT_KEY: mocked_bedrock_docs,
                REPHRASED_QUERY_KEY: "rephrased query",
            },
            BEDROCK_RAG_PROMPT,
            True,
            True,
            KnowledgeBaseTypes.BEDROCK.value,
            True,
            "amazon.model-xx",
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
            REQUEST_CONTEXT_KEY: {"authorizer": {"UserId": "fake-user-id"}, "connectionId": "fake-id"},
            MESSAGE_KEY: {"action": "sendMessage", "userId": "fake-user-id", "question": "How are you?"},
        }
    )
    fake_uuid = str(uuid4())

    with patch("clients.bedrock_client.BedrockClient.retrieve_use_case_config") as mocked_retrieve_llm_config:
        with patch("clients.llm_chat_client.uuid4") as mocked_uuid:
            mocked_uuid.return_value = fake_uuid
            if not is_streaming:
                post_to_gateway = [
                    {"data": "I'm doing well, how are you?", CONVERSATION_ID_EVENT_KEY: fake_uuid},
                ]
                if return_source_docs:
                    post_to_gateway += (
                        kendra_source_doc_responses(fake_uuid)
                        if knowledge_base_type == KnowledgeBaseTypes.KENDRA.value
                        else []
                    )
                    post_to_gateway += (
                        bedrock_source_doc_responses(fake_uuid)
                        if knowledge_base_type == KnowledgeBaseTypes.BEDROCK.value
                        else []
                    )

                for payload in post_to_gateway:
                    apigateway_stubber.add_response(
                        "post_to_connection",
                        {},
                        expected_params={
                            "ConnectionId": "fake-id",
                            "Data": json.dumps(payload),
                        },
                    )

            apigateway_stubber.add_response(
                "post_to_connection",
                {},
                expected_params={
                    "ConnectionId": "fake-id",
                    "Data": json.dumps(
                        {
                            "data": END_CONVERSATION_TOKEN,
                            "conversationId": fake_uuid,
                        }
                    ),
                },
            )

            apigateway_stubber.activate()
            with patch("clients.llm_chat_client.uuid4", return_value=fake_uuid):
                with patch("langchain_core.runnables.RunnableWithMessageHistory.invoke") as mocked_predict:
                    with patch("langchain_core.runnables.RunnableWithMessageHistory.invoke") as mocked_rag_predict:
                        mocked_predict.return_value = "I'm doing well, how are you?"
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
            "amazon.model-xx",
        ),
        (
            CHAT_IDENTIFIER,
            BEDROCK_PROMPT,
            False,
            False,
            None,
            False,
            "amazon.model-xx",
        ),
        (
            RAG_CHAT_IDENTIFIER,
            BEDROCK_RAG_PROMPT,
            True,
            True,
            KnowledgeBaseTypes.BEDROCK.value,
            False,
            "amazon.model-xx",
        ),
        (
            RAG_CHAT_IDENTIFIER,
            BEDROCK_RAG_PROMPT,
            False,
            True,
            KnowledgeBaseTypes.BEDROCK.value,
            False,
            "amazon.model-xx",
        ),
        (
            RAG_CHAT_IDENTIFIER,
            BEDROCK_RAG_PROMPT,
            True,
            True,
            KnowledgeBaseTypes.BEDROCK.value,
            True,
            "amazon.model-xx",
        ),
        (
            RAG_CHAT_IDENTIFIER,
            BEDROCK_RAG_PROMPT,
            False,
            True,
            KnowledgeBaseTypes.BEDROCK.value,
            True,
            "amazon.model-xx",
        ),
    ],
)
def test_missing_llm_config_key(
    chat_event,
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
                "ConnectionId": "fake-connection-id",
                "Data": json.dumps(
                    {
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
                "ConnectionId": "fake-connection-id",
                "Data": json.dumps({"data": END_CONVERSATION_TOKEN}),
            },
        )

        apigateway_stubber.activate()
        response = lambda_handler(chat_event, context)
        assert response == {"batchItemFailures": [{"itemIdentifier": "fake-message-id"}]}
        apigateway_stubber.deactivate()
