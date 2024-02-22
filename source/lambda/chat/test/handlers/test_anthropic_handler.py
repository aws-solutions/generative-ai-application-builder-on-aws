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
from copy import copy
from unittest.mock import patch
from uuid import uuid4

import pytest
from anthropic_handler import lambda_handler
from langchain.schema import Document
from utils.constants import (
    CHAT_IDENTIFIER,
    CONVERSATION_ID_EVENT_KEY,
    END_CONVERSATION_TOKEN,
    LLM_PARAMETERS_SSM_KEY_ENV_VAR,
    RAG_CHAT_IDENTIFIER,
    RAG_ENABLED_ENV_VAR,
)
from utils.helpers import format_lambda_response

mocked_docs = [
    Document(**{"page_content": "some-page-content-1", "metadata": {"source": "fake-url-1"}}),
    Document(**{"page_content": "some-page-content-2", "metadata": {"source": "fake-url-2"}}),
]
ANTHROPIC_PROMPT = """\n\n{history}\n\n{input}"""
ANTHROPIC_RAG_PROMPT = """{context}\n\n{chat_history}\n\n{question}"""


@pytest.mark.parametrize(
    "use_case, mocked_response, prompt, is_streaming, rag_enabled, return_source_docs, model_id",
    [
        (
            CHAT_IDENTIFIER,
            {"answer": "I'm doing well, how are you?"},
            ANTHROPIC_PROMPT,
            False,  # is_streaming
            "False",  # rag_enabled
            False,  # return_source_docs
            "claude-1",
        ),
        (
            CHAT_IDENTIFIER,
            {"answer": "I'm doing well, how are you?"},
            ANTHROPIC_PROMPT,
            True,  # is_streaming
            "False",  # rag_enabled
            False,  # return_source_docs
            "claude-1",
        ),
        (
            RAG_CHAT_IDENTIFIER,
            {"answer": "I'm doing well, how are you?"},
            ANTHROPIC_RAG_PROMPT,
            False,  # is_streaming
            "True",  # rag_enabled
            False,  # return_source_docs
            "claude-1",
        ),
        (
            RAG_CHAT_IDENTIFIER,
            {"answer": "I'm doing well, how are you?"},
            ANTHROPIC_RAG_PROMPT,
            True,  # is_streaming
            "True",  # rag_enabled
            False,  # return_source_docs
            "claude-1",
        ),
        (
            RAG_CHAT_IDENTIFIER,
            {
                "answer": "I'm doing well, how are you?",
                "source_documents": mocked_docs,
            },
            ANTHROPIC_RAG_PROMPT,
            False,  # is_streaming
            "True",  # rag_enabled
            True,  # return_source_docs
            "claude-1",
        ),
        (
            RAG_CHAT_IDENTIFIER,
            {
                "answer": "I'm doing well, how are you?",
                "source_documents": mocked_docs,
            },
            ANTHROPIC_RAG_PROMPT,
            True,  # is_streaming
            "True",  # rag_enabled
            True,  # return_source_docs
            "claude-1",
        ),
    ],
)
def test_anthropic_chat_handler(
    use_case,
    prompt,
    is_streaming,
    return_source_docs,
    mocked_response,
    llm_config,
    model_id,
    rag_enabled,
    chat_event,
    apigateway_stubber,
    context,
    setup_environment,
    setup_secret,
    anthropic_dynamodb_defaults_table,
):
    os.environ[RAG_ENABLED_ENV_VAR] = rag_enabled

    with patch("clients.anthropic_client.AnthropicClient.get_llm_config") as mocked_get_llm_config:
        with patch(
            "shared.knowledge.kendra_knowledge_base.CustomKendraRetriever.get_relevant_documents"
        ) as mocked_kendra_docs:
            mocked_kendra_docs.return_value = mocked_docs

            if not is_streaming:
                post_to_gateway = [
                    {"data": "I'm doing well, how are you?", CONVERSATION_ID_EVENT_KEY: "fake-conversation-id"},
                ]
                if return_source_docs:
                    post_to_gateway += [
                        {"sourceDocument": {"source": "fake-url-1"}, "conversationId": "fake-conversation-id"},
                        {"sourceDocument": {"source": "fake-url-2"}, "conversationId": "fake-conversation-id"},
                    ]

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
                            "conversationId": "fake-conversation-id",
                        }
                    ),
                },
            )
            apigateway_stubber.activate()

            with patch("clients.anthropic_client.AnthropicClient.get_llm_config") as mocked_get_llm_config:
                with patch("langchain.chains.ConversationChain.predict") as mocked_predict:
                    with patch("langchain.chains.ConversationalRetrievalChain.invoke") as mocked_rag_predict:
                        mocked_predict.return_value = "I'm doing well, how are you?"
                        mocked_rag_predict.return_value = mocked_response
                        mocked_get_llm_config.return_value = json.loads(llm_config["Parameter"]["Value"])
                        assert lambda_handler(chat_event, context) == format_lambda_response(
                            {"response": mocked_response}
                        )

            apigateway_stubber.deactivate()


@pytest.mark.parametrize(
    "use_case, mocked_response, prompt, is_streaming, rag_enabled, return_source_docs, model_id",
    [
        (
            CHAT_IDENTIFIER,
            {"answer": "I'm doing well, how are you?"},
            ANTHROPIC_PROMPT,
            False,  # is_streaming
            "False",  # rag_enabled
            False,  # return_source_docs
            "claude-1",
        ),
        (
            CHAT_IDENTIFIER,
            {"answer": "I'm doing well, how are you?"},
            ANTHROPIC_PROMPT,
            True,  # is_streaming
            "False",  # rag_enabled
            False,  # return_source_docs
            "claude-1",
        ),
        (
            RAG_CHAT_IDENTIFIER,
            {"answer": "I'm doing well, how are you?"},
            ANTHROPIC_RAG_PROMPT,
            False,  # is_streaming
            "True",  # rag_enabled
            False,  # return_source_docs
            "claude-1",
        ),
        (
            RAG_CHAT_IDENTIFIER,
            {"answer": "I'm doing well, how are you?"},
            ANTHROPIC_RAG_PROMPT,
            True,  # is_streaming
            "True",  # rag_enabled
            False,  # return_source_docs
            "claude-1",
        ),
        (
            RAG_CHAT_IDENTIFIER,
            {
                "answer": "I'm doing well, how are you?",
                "source_documents": mocked_docs,
            },
            ANTHROPIC_RAG_PROMPT,
            False,  # is_streaming
            "True",  # rag_enabled
            True,  # return_source_docs
            "claude-1",
        ),
        (
            RAG_CHAT_IDENTIFIER,
            {
                "answer": "I'm doing well, how are you?",
                "source_documents": mocked_docs,
            },
            ANTHROPIC_RAG_PROMPT,
            True,  # is_streaming
            "True",  # rag_enabled
            True,  # return_source_docs
            "claude-1",
        ),
    ],
)
def test_anthropic_chat_handler_empty_conversation(
    use_case,
    model_id,
    is_streaming,
    return_source_docs,
    mocked_response,
    chat_event,
    llm_config,
    rag_enabled,
    apigateway_stubber,
    context,
    setup_environment,
    setup_secret,
    anthropic_dynamodb_defaults_table,
):
    os.environ[RAG_ENABLED_ENV_VAR] = rag_enabled

    # chat event with empty/no conversationId
    chat_event_conversation_empty = copy(chat_event)
    chat_event_conversation_empty["body"] = '{"action":"sendMessage","userId":"fake-user-id","question":"How are you?"}'
    fake_uuid = str(uuid4())
    with patch("clients.anthropic_client.AnthropicClient.get_llm_config") as mocked_get_llm_config:
        with patch(
            "shared.knowledge.kendra_knowledge_base.CustomKendraRetriever.get_relevant_documents"
        ) as mocked_kendra_docs:
            mocked_kendra_docs.return_value = mocked_docs
            with patch("clients.llm_chat_client.uuid4") as mocked_uuid:
                mocked_uuid.return_value = fake_uuid

                if not is_streaming:
                    post_to_gateway = [
                        {"data": "I'm doing well, how are you?", CONVERSATION_ID_EVENT_KEY: fake_uuid},
                    ]
                    if return_source_docs:
                        post_to_gateway += [
                            {"sourceDocument": {"source": "fake-url-1"}, "conversationId": fake_uuid},
                            {"sourceDocument": {"source": "fake-url-2"}, "conversationId": fake_uuid},
                        ]

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

                with patch("clients.anthropic_client.AnthropicClient.get_llm_config") as mocked_get_llm_config:
                    with patch("langchain.chains.ConversationChain.predict") as mocked_predict:
                        with patch("langchain.chains.ConversationalRetrievalChain.invoke") as mocked_rag_predict:
                            mocked_predict.return_value = "I'm doing well, how are you?"
                            mocked_rag_predict.return_value = mocked_response
                            mocked_get_llm_config.return_value = json.loads(llm_config["Parameter"]["Value"])
                            assert lambda_handler(chat_event_conversation_empty, context) == format_lambda_response(
                                {"response": mocked_response}
                            )

                apigateway_stubber.deactivate()


@pytest.mark.parametrize(
    "use_case, prompt, is_streaming, rag_enabled, return_source_docs, model_id",
    [
        (
            CHAT_IDENTIFIER,
            ANTHROPIC_PROMPT,
            True,
            "False",
            False,
            "claude-1",
        ),
        (
            CHAT_IDENTIFIER,
            ANTHROPIC_PROMPT,
            False,
            "False",
            False,
            "claude-1",
        ),
        (
            RAG_CHAT_IDENTIFIER,
            ANTHROPIC_RAG_PROMPT,
            True,
            "True",
            False,
            "claude-1",
        ),
        (
            RAG_CHAT_IDENTIFIER,
            ANTHROPIC_RAG_PROMPT,
            False,
            "True",
            False,
            "claude-1",
        ),
        (
            RAG_CHAT_IDENTIFIER,
            ANTHROPIC_RAG_PROMPT,
            True,
            "True",
            True,
            "claude-1",
        ),
        (
            RAG_CHAT_IDENTIFIER,
            ANTHROPIC_RAG_PROMPT,
            False,
            "True",
            True,
            "claude-1",
        ),
    ],
)
def test_missing_llm_config_key(
    use_case,
    chat_event,
    model_id,
    llm_config,
    rag_enabled,
    apigateway_stubber,
    context,
    setup_environment,
    anthropic_dynamodb_defaults_table,
):
    os.environ.pop(LLM_PARAMETERS_SSM_KEY_ENV_VAR)  # Removed env variable to trigger error
    os.environ[RAG_ENABLED_ENV_VAR] = rag_enabled
    with patch("clients.anthropic_client.AnthropicClient.get_llm_config") as mocked_get_llm_config:
        mocked_get_llm_config.return_value = json.loads(llm_config["Parameter"]["Value"])

        apigateway_stubber.add_response(
            "post_to_connection",
            {},
            expected_params={
                "ConnectionId": "fake-id",
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
                "ConnectionId": "fake-id",
                "Data": json.dumps({"data": END_CONVERSATION_TOKEN}),
            },
        )
        apigateway_stubber.activate()
        response = lambda_handler(chat_event, context)
        assert response == {
            "statusCode": 400,
            "headers": {"Content-Type": "application/json"},
            "isBase64Encoded": False,
            "body": '{"errorMessage": "Chat service failed to respond. Please contact your administrator for support and quote the following trace id: fake-trace-id"}',
        }
        apigateway_stubber.deactivate()
