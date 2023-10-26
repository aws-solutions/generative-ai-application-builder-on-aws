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
from utils.constants import (
    CONVERSATION_ID_EVENT_KEY,
    DEFAULT_ANTHROPIC_PROMPT,
    DEFAULT_ANTHROPIC_RAG_PROMPT,
    END_CONVERSATION_TOKEN,
    LLM_PARAMETERS_SSM_KEY_ENV_VAR,
    RAG_ENABLED_ENV_VAR,
)
from utils.handler_response_formatter import format_response

mocked_doc = {"page_content": "some-page-content-1", "metadata": {"source": "fake-url-1"}}


@pytest.mark.parametrize(
    "response, prompt, is_streaming, rag_enabled",
    [
        (
            {
                "response": {
                    "answer": "I'm doing well, how are you?",
                    "source_documents": [{"page_content": "some-page-content-1", "metadata": {"source": "fake-url-1"}}],
                },
            },
            DEFAULT_ANTHROPIC_RAG_PROMPT,
            True,
            "True",
        ),
        (
            {
                "response": {
                    "answer": "I'm doing well, how are you?",
                    "source_documents": [{"page_content": "some-page-content-1", "metadata": {"source": "fake-url-1"}}],
                },
            },
            DEFAULT_ANTHROPIC_RAG_PROMPT,
            False,
            "True",
        ),
        (
            {"response": {"answer": "I'm doing well, how are you?"}},
            DEFAULT_ANTHROPIC_PROMPT,
            True,
            "False",
        ),
        (
            {"response": {"answer": "I'm doing well, how are you?"}},
            DEFAULT_ANTHROPIC_PROMPT,
            False,
            "False",
        ),
    ],
)
def test_anthropic_chat_handler(
    is_streaming,
    response,
    llm_config,
    rag_enabled,
    chat_event,
    apigateway_stubber,
    context,
    setup_environment,
    setup_secret,
):
    os.environ[RAG_ENABLED_ENV_VAR] = rag_enabled

    with patch("clients.anthropic_client.AnthropicClient.get_llm_config") as mocked_get_llm_config:
        with patch(
            "shared.knowledge.kendra_knowledge_base.CustomKendraRetriever.get_relevant_documents"
        ) as mocked_kendra_docs:
            mocked_kendra_docs.return_value = mocked_doc

            if not is_streaming:
                apigateway_stubber.add_response(
                    "post_to_connection",
                    {},
                    expected_params={
                        "ConnectionId": "fake-id",
                        "Data": json.dumps(
                            {"data": "I'm doing well, how are you?", CONVERSATION_ID_EVENT_KEY: "fake-conversation-id"}
                        ),
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
                    with patch("langchain.chains.ConversationalRetrievalChain.__call__") as mocked_rag_predict:
                        mocked_predict.return_value = "I'm doing well, how are you?"
                        mocked_rag_predict.return_value = {
                            "answer": "I'm doing well, how are you?",
                            "source_documents": [mocked_doc],
                        }
                        mocked_get_llm_config.return_value = json.loads(llm_config["Parameter"]["Value"])
                        assert lambda_handler(chat_event, context) == format_response(response)

            apigateway_stubber.deactivate()


@pytest.mark.parametrize(
    "response, prompt, is_streaming, rag_enabled",
    [
        (
            {
                "response": {
                    "answer": "I'm doing well, how are you?",
                    "source_documents": [{"page_content": "some-page-content-1", "metadata": {"source": "fake-url-1"}}],
                },
            },
            DEFAULT_ANTHROPIC_RAG_PROMPT,
            True,
            "True",
        ),
        (
            {
                "response": {
                    "answer": "I'm doing well, how are you?",
                    "source_documents": [{"page_content": "some-page-content-1", "metadata": {"source": "fake-url-1"}}],
                },
            },
            DEFAULT_ANTHROPIC_RAG_PROMPT,
            False,
            "True",
        ),
        (
            {"response": {"answer": "I'm doing well, how are you?"}},
            DEFAULT_ANTHROPIC_PROMPT,
            True,
            "False",
        ),
        (
            {"response": {"answer": "I'm doing well, how are you?"}},
            DEFAULT_ANTHROPIC_PROMPT,
            False,
            "False",
        ),
    ],
)
def test_anthropic_chat_handler_empty_conversation(
    is_streaming,
    response,
    chat_event,
    llm_config,
    rag_enabled,
    apigateway_stubber,
    context,
    setup_environment,
    setup_secret,
):
    os.environ[RAG_ENABLED_ENV_VAR] = rag_enabled

    # chat event with empty/no conversationId
    chat_event_conversation_empty = copy(chat_event)
    chat_event_conversation_empty["body"] = '{"action":"sendMessage","userId":"fake-user-id","question":"How are you?"}'
    fake_uuid = uuid4()

    with patch("clients.anthropic_client.AnthropicClient.get_llm_config") as mocked_get_llm_config:
        if not is_streaming:
            apigateway_stubber.add_response(
                "post_to_connection",
                {},
                expected_params={
                    "ConnectionId": "fake-id",
                    "Data": json.dumps({"data": "I'm doing well, how are you?", "conversationId": str(fake_uuid)}),
                },
            )
            apigateway_stubber.add_response(
                "post_to_connection",
                {},
                expected_params={
                    "ConnectionId": "fake-id",
                    "Data": json.dumps({"data": END_CONVERSATION_TOKEN, "conversationId": str(fake_uuid)}),
                },
            )
        apigateway_stubber.activate()
        with patch("clients.llm_chat_client.uuid4", return_value=fake_uuid):
            with patch("langchain.chains.ConversationChain.predict") as mocked_predict:
                with patch("langchain.chains.ConversationalRetrievalChain.__call__") as mocked_rag_predict:
                    mocked_predict.return_value = "I'm doing well, how are you?"
                    mocked_rag_predict.return_value = {
                        "answer": "I'm doing well, how are you?",
                        "source_documents": [mocked_doc],
                    }
                    mocked_get_llm_config.return_value = json.loads(llm_config["Parameter"]["Value"])
                    assert lambda_handler(chat_event_conversation_empty, context) == format_response(response)
        apigateway_stubber.deactivate()


def test_missing_llm_config_key(chat_event, apigateway_stubber, context, setup_environment, setup_secret):
    os.environ.pop(LLM_PARAMETERS_SSM_KEY_ENV_VAR)
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


@pytest.mark.parametrize(
    "prompt, is_streaming, rag_enabled",
    [
        (DEFAULT_ANTHROPIC_RAG_PROMPT, True, "True"),
        (DEFAULT_ANTHROPIC_RAG_PROMPT, False, "True"),
        (DEFAULT_ANTHROPIC_PROMPT, True, "False"),
        (DEFAULT_ANTHROPIC_PROMPT, False, "False"),
    ],
)
def test_missing_api_key_causes_error(
    chat_event, llm_config, rag_enabled, apigateway_stubber, context, setup_environment
):
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
