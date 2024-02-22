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
from unittest import mock

import pytest
from anthropic import AuthenticationError
from httpx import Request, Response
from langchain.chains import ConversationChain
from llms.anthropic import AnthropicLLM
from llms.models.llm import LLM
from shared.defaults.model_defaults import ModelDefaults
from shared.memory.ddb_chat_memory import DynamoDBChatMemory
from shared.memory.ddb_enhanced_message_history import DynamoDBChatMessageHistory
from utils.constants import (
    CHAT_IDENTIFIER,
    DEFAULT_MODELS_MAP,
    DEFAULT_PLACEHOLDERS,
    DEFAULT_TEMPERATURE,
    MODEL_INFO_TABLE_NAME_ENV_VAR,
)
from utils.custom_exceptions import LLMInvocationError
from utils.enum_types import LLMProviderTypes

RAG_ENABLED = False
ANTHROPIC_PROMPT = """\n\n{history}\n\n{input}"""
DEFAULT_BEDROCK_ANTHROPIC_CONDENSING_PROMPT = """\n\nHuman: Given the following conversation and a follow up question, rephrase the follow up question to be a standalone question.\n\nChat history:\n{chat_history}\n\nFollow up question: {question}\n\nAssistant: Standalone question:"""
llm_params = LLM(
    **{
        "conversation_memory": DynamoDBChatMemory(
            DynamoDBChatMessageHistory(
                table_name="fake-table", user_id="fake-user-id", conversation_id="fake-conversation-id"
            )
        ),
        "knowledge_base": None,
        "api_token": "fake-token",
        "model": DEFAULT_MODELS_MAP[LLMProviderTypes.ANTHROPIC.value],
        "model_params": {
            "top_p": {"Type": "float", "Value": "0.2"},
            "max_tokens_to_sample": {"Type": "integer", "Value": "200"},
        },
        "prompt_template": ANTHROPIC_PROMPT,
        "prompt_placeholders": DEFAULT_PLACEHOLDERS,
        "streaming": False,
        "verbose": False,
        "temperature": DEFAULT_TEMPERATURE,
        "callbacks": None,
    }
)


@pytest.fixture
def streamless_chat(setup_environment, model_id):
    llm_params.streaming = False
    llm_params.model = model_id
    chat = AnthropicLLM(
        llm_params=llm_params,
        model_defaults=ModelDefaults("Anthropic", model_id, RAG_ENABLED),
        rag_enabled=False,
    )
    yield chat


@pytest.fixture
def streaming_chat(setup_environment, model_id):
    llm_params.streaming = True
    llm_params.model = model_id
    chat = AnthropicLLM(
        llm_params=llm_params,
        model_defaults=ModelDefaults("Anthropic", model_id, RAG_ENABLED),
        rag_enabled=False,
    )
    yield chat


@pytest.fixture
def temp_anthropic_dynamodb_defaults_table(
    dynamodb_resource,
    dynamodb_defaults_table,
    prompt,
    use_case,
    is_streaming,
    model_provider=LLMProviderTypes.ANTHROPIC.value,
    model_id="claude-1",
):
    table_name = os.getenv(MODEL_INFO_TABLE_NAME_ENV_VAR)
    output_key = None
    context_key = None
    input_key = "input"
    history_key = "history"

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
                "ai_prefix": "A",
                "human_prefix": "H",
                "output": output_key,
            },
            "MinTemperature": "0",
            "ModelName": model_id,
            "ModelProviderName": {model_provider},
            "Prompt": prompt,
            "DefaultStopSequences": ["\n\n"],  # added additional stop_sequence
            "DisambiguationPrompt": DEFAULT_BEDROCK_ANTHROPIC_CONDENSING_PROMPT,
        }
    )


@pytest.mark.parametrize(
    "use_case, model_id, prompt, is_streaming, chat_fixture, expected_response",
    [
        (CHAT_IDENTIFIER, "claude-1", ANTHROPIC_PROMPT, False, "streamless_chat", False),
        (CHAT_IDENTIFIER, "claude-2", ANTHROPIC_PROMPT, True, "streaming_chat", True),
    ],
)
def test_implement_error_not_raised(
    use_case,
    model_id,
    prompt,
    is_streaming,
    setup_environment,
    expected_response,
    request,
    chat_fixture,
    anthropic_dynamodb_defaults_table,
):
    chat = request.getfixturevalue(chat_fixture)
    try:
        assert chat.model == model_id
        assert chat.prompt_template.template == ANTHROPIC_PROMPT
        assert chat.prompt_template.input_variables == DEFAULT_PLACEHOLDERS
        assert chat.model_params == {
            "temperature": DEFAULT_TEMPERATURE,
            "max_tokens_to_sample": 200,
            "top_p": 0.2,
        }
        assert chat.api_token == "fake-token"
        assert chat.streaming == expected_response
        assert chat.verbose == False
        assert chat.knowledge_base == None
        assert chat.conversation_memory.chat_memory.messages == []
        assert type(chat.conversation_chain) == ConversationChain
        assert chat.stop_sequences == []
    except NotImplementedError as ex:
        raise Exception(ex)


@pytest.mark.parametrize(
    "use_case, model_id, prompt, is_streaming, chat_fixture",
    [
        (CHAT_IDENTIFIER, "claude-instant-v1", ANTHROPIC_PROMPT, False, "streamless_chat"),
        (CHAT_IDENTIFIER, "claude-1", ANTHROPIC_PROMPT, True, "streaming_chat"),
    ],
)
def test_generate(
    use_case,
    model_id,
    prompt,
    is_streaming,
    chat_fixture,
    request,
    setup_environment,
    anthropic_dynamodb_defaults_table,
):
    model = request.getfixturevalue(chat_fixture)
    with mock.patch("langchain.chains.ConversationChain.predict", return_value="I'm doing well, how are you?"):
        assert model.generate("Hi there") == {"answer": "I'm doing well, how are you?"}


@pytest.mark.parametrize(
    "use_case, model_id, prompt, is_streaming, chat_fixture",
    [
        (CHAT_IDENTIFIER, "claude-instant-v1", ANTHROPIC_PROMPT, False, "streamless_chat"),
        (CHAT_IDENTIFIER, "claude-instant-v1", ANTHROPIC_PROMPT, True, "streaming_chat"),
    ],
)
def test_model_get_clean_model_params(
    use_case, model_id, prompt, is_streaming, chat_fixture, request, anthropic_dynamodb_defaults_table
):
    chat = request.getfixturevalue(chat_fixture)
    model_params = {
        "top_p": {"Type": "float", "Value": "0.2"},
        "max_tokens_to_sample": {"Type": "integer", "Value": "200"},
    }
    chat.get_clean_model_params(model_params)
    assert chat.model_params == {
        "temperature": DEFAULT_TEMPERATURE,
        "max_tokens_to_sample": 200,
        "top_p": 0.2,
    }


@pytest.mark.parametrize(
    "use_case, model_id, prompt, is_streaming",
    [(CHAT_IDENTIFIER, "claude-instant-v1", ANTHROPIC_PROMPT, False)],
)
def test_model_default_stop_sequences(
    use_case,
    model_id,
    prompt,
    is_streaming,
    request,
    setup_environment,
    temp_anthropic_dynamodb_defaults_table,
):
    model_provider = LLMProviderTypes.ANTHROPIC.value
    model_id = "claude-1"
    llm_params.streaming = is_streaming
    llm_params.model_params = {
        "top_p": {"Type": "float", "Value": "0.04"},
        "max_tokens_to_sample": {"Type": "integer", "Value": "512"},
        "stop_sequences": {"Type": "list", "Value": '["\n\nAssistant:", "\n\nHuman:"]'},
    }

    chat = AnthropicLLM(
        llm_params=llm_params,
        model_defaults=ModelDefaults(model_provider, model_id, RAG_ENABLED),
        rag_enabled=False,
    )

    assert chat.model_params["top_p"] == 0.04
    assert chat.model_params["max_tokens_to_sample"] == 512
    assert chat.model_params["temperature"] == DEFAULT_TEMPERATURE
    # default and user provided stop sequences combined
    assert sorted(chat.model_params["stop_sequences"]) == ["\n\n", "\n\nAssistant:", "\n\nHuman:"]


@pytest.mark.parametrize(
    "use_case, model_id, prompt, is_streaming",
    [
        (CHAT_IDENTIFIER, "claude-instant-v1", ANTHROPIC_PROMPT, False),
        (CHAT_IDENTIFIER, "claude-instant-1", ANTHROPIC_PROMPT, True),
    ],
)
def test_exception_for_failed_model_incorrect_key(
    use_case,
    model_id,
    prompt,
    is_streaming,
    request,
    setup_environment,
    anthropic_dynamodb_defaults_table,
):
    model_provider = "Anthropic"
    llm_params.streaming = is_streaming
    llm_params.model = model_id

    with pytest.raises(LLMInvocationError) as error:
        chat = AnthropicLLM(
            llm_params=llm_params,
            model_defaults=ModelDefaults(model_provider, model_id, RAG_ENABLED),
            rag_enabled=False,
        )
        with mock.patch("langchain_community.chat_models.ChatAnthropic._generate") as mocked_hub_call:
            mocked_hub_call.side_effect = AuthenticationError(
                message="Error 401: Wrong API key",
                body={},
                response=Response(
                    401,
                    json={"id": "fake-id"},
                    request=Request(method="some-method", url="fake-url"),
                ),
            )
            chat.generate("What is the weather in Seattle?")

    assert (
        error.value.args[0]
        == f"Error occurred while invoking Anthropic {model_id} model. Please check that the API key is correct. Error 401: Wrong API key"
    )
