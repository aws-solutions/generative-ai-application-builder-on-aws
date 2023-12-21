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

from unittest import mock

import pytest
from anthropic import AuthenticationError
from httpx import Request, Response
from langchain.chains import ConversationChain
from llm_models.anthropic import AnthropicLLM
from shared.memory.ddb_chat_memory import DynamoDBChatMemory
from shared.memory.ddb_enhanced_message_history import DynamoDBChatMessageHistory
from utils.constants import (
    DEFAULT_ANTHROPIC_MODEL,
    DEFAULT_ANTHROPIC_PLACEHOLDERS,
    DEFAULT_ANTHROPIC_PROMPT,
    DEFAULT_ANTHROPIC_TEMPERATURE,
)
from utils.custom_exceptions import LLMBuildError

STOP_SEQUENCES = ["\n\nHuman:", "\n\nAssistant:", "\nHuman:", "\nAssistant:", r"\\n"]


@pytest.fixture(autouse=True)
def streamless_chat(setup_environment):
    chat = AnthropicLLM(
        api_token="fake-token",
        conversation_memory=DynamoDBChatMemory(
            DynamoDBChatMessageHistory("fake-table", "fake-conversation-id", "fake-user-id")
        ),
        knowledge_base=None,
        model=DEFAULT_ANTHROPIC_MODEL,
        model_params={
            "top_p": {"Type": "float", "Value": "0.2"},
            "max_tokens_to_sample": {"Type": "integer", "Value": "200"},
        },
        prompt_template=DEFAULT_ANTHROPIC_PROMPT,
        streaming=False,
        verbose=False,
        temperature=DEFAULT_ANTHROPIC_TEMPERATURE,
        callbacks=None,
        rag_enabled=False,
    )
    yield chat


@pytest.fixture(autouse=True)
def streaming_chat(setup_environment):
    chat = AnthropicLLM(
        api_token="fake-token",
        conversation_memory=DynamoDBChatMemory(
            DynamoDBChatMessageHistory("fake-table", "fake-conversation-id", "fake-user-id")
        ),
        knowledge_base=None,
        model=DEFAULT_ANTHROPIC_MODEL,
        model_params={
            "top_p": {"Type": "float", "Value": "0.2"},
            "max_tokens_to_sample": {"Type": "integer", "Value": "200"},
        },
        prompt_template=DEFAULT_ANTHROPIC_PROMPT,
        streaming=True,
        verbose=False,
        temperature=DEFAULT_ANTHROPIC_TEMPERATURE,
        callbacks=None,
        rag_enabled=False,
    )
    yield chat


@pytest.mark.parametrize("chat_fixture, expected_response", [("streamless_chat", False), ("streaming_chat", True)])
def test_implement_error_not_raised(chat_fixture, expected_response, request):
    chat = request.getfixturevalue(chat_fixture)
    try:
        assert chat.model == DEFAULT_ANTHROPIC_MODEL
        assert chat.prompt_template.template == DEFAULT_ANTHROPIC_PROMPT
        assert chat.prompt_template.input_variables == DEFAULT_ANTHROPIC_PLACEHOLDERS
        assert chat.model_params == {
            "temperature": DEFAULT_ANTHROPIC_TEMPERATURE,
            "max_tokens_to_sample": 200,
            "top_p": 0.2,
        }
        assert chat.api_token == "fake-token"
        assert chat.streaming == expected_response
        assert chat.verbose == False
        assert chat.knowledge_base == None
        assert chat.conversation_memory.chat_memory.messages == []
        assert type(chat.conversation_chain) == ConversationChain
        assert chat.stop_sequences == STOP_SEQUENCES
    except NotImplementedError as ex:
        raise Exception(ex)


@mock.patch("langchain.chains.ConversationChain.predict")
@pytest.mark.parametrize("chat_fixture", ["streamless_chat", "streaming_chat"])
def test_generate(mocked_predict, chat_fixture, request):
    model = request.getfixturevalue(chat_fixture)
    mocked_predict.return_value = "I'm doing well, how are you?"
    assert model.generate("Hi there") == {"answer": "I'm doing well, how are you?"}


@pytest.mark.parametrize("is_streaming", [False, True])
def test_exception_for_failed_model_incorrect_key(setup_environment, is_streaming):
    with pytest.raises(LLMBuildError) as error:
        chat = AnthropicLLM(
            api_token="fake-token",
            conversation_memory=DynamoDBChatMemory(
                DynamoDBChatMessageHistory("fake-table", "fake-conversation-id", "fake-user-id")
            ),
            knowledge_base=None,
            model=DEFAULT_ANTHROPIC_MODEL,
            model_params={
                "top_p": {"Type": "float", "Value": "0.2"},
                "max_tokens_to_sample": {"Type": "integer", "Value": "200"},
            },
            prompt_template=DEFAULT_ANTHROPIC_PROMPT,
            streaming=False,
            verbose=False,
            temperature=DEFAULT_ANTHROPIC_TEMPERATURE,
            callbacks=None,
            rag_enabled=False,
        )
        with mock.patch("langchain.chat_models.ChatAnthropic._generate") as mocked_hub_call:
            mocked_hub_call.side_effect = AuthenticationError(
                message="Error 401: Wrong API key",
                body={},
                response=Response(401, json={"id": "fake-id"}),
                request=Request(method="some-method", url="fake-url"),
            )
            chat.generate("What is the weather in Seattle?")

    error.value.args[
        0
    ] == "ChatAnthropic model construction failed. API key was incorrect. Error: Error 401: Wrong API key"


@pytest.mark.parametrize("chat_fixture", ["streamless_chat", "streaming_chat"])
def test_model_get_clean_model_params(chat_fixture, request):
    chat = request.getfixturevalue(chat_fixture)
    model_params = {
        "top_p": {"Type": "float", "Value": "0.2"},
        "max_tokens_to_sample": {"Type": "integer", "Value": "200"},
    }
    chat.get_clean_model_params(model_params)
    assert chat.model_params == {
        "temperature": DEFAULT_ANTHROPIC_TEMPERATURE,
        "max_tokens_to_sample": 200,
        "top_p": 0.2,
    }
