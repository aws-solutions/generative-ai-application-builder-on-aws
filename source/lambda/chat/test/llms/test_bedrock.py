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
from unittest import mock

import pytest
from langchain.chains import ConversationChain
from langchain_aws.chat_models.bedrock import BedrockChat
from langchain_aws.llms.bedrock import BedrockLLM as Bedrock
from llms.bedrock import BedrockLLM
from llms.models.llm import LLM
from shared.defaults.model_defaults import ModelDefaults
from shared.memory.ddb_chat_memory import DynamoDBChatMemory
from shared.memory.ddb_enhanced_message_history import DynamoDBChatMessageHistory
from utils.constants import CHAT_IDENTIFIER, DEFAULT_PLACEHOLDERS, DEFAULT_TEMPERATURE, MODEL_INFO_TABLE_NAME_ENV_VAR
from utils.custom_exceptions import LLMInvocationError
from utils.enum_types import BedrockModelProviders, LLMProviderTypes

RAG_ENABLED = False
BEDROCK_PROMPT = """\n\n{history}\n\n{input}"""
CONDENSE_QUESTION_PROMPT = """Given the following conversation and a follow up question, rephrase the follow up question to be a standalone question, in its original language.\n\nChat History:\n{chat_history}\nFollow Up Input: {question}\nStandalone question:"""
model_family = BedrockModelProviders.AMAZON.value

model_provider = LLMProviderTypes.BEDROCK
model_id = "amazon.model-xx"
llm_params = LLM(
    **{
        "conversation_memory": DynamoDBChatMemory(
            DynamoDBChatMessageHistory(
                table_name="fake-table", user_id="fake-user-id", conversation_id="fake-conversation-id"
            )
        ),
        "knowledge_base": None,
        "api_token": "fake-token",
        "model": model_id,
        "model_params": {
            "topP": {"Type": "float", "Value": "0.2"},
            "maxTokenCount": {"Type": "integer", "Value": "512"},
        },
        "prompt_template": BEDROCK_PROMPT,
        "prompt_placeholders": DEFAULT_PLACEHOLDERS,
        "streaming": False,
        "verbose": False,
        "temperature": DEFAULT_TEMPERATURE,
        "callbacks": None,
    }
)


@pytest.fixture
def streamless_chat(setup_environment):
    llm_params.streaming = False
    chat = BedrockLLM(
        llm_params=llm_params,
        model_defaults=ModelDefaults(model_provider, model_id, RAG_ENABLED),
        model_family=BedrockModelProviders.AMAZON.value,
        rag_enabled=False,
    )
    yield chat


@pytest.fixture
def streaming_chat(setup_environment):
    llm_params.streaming = True
    chat = BedrockLLM(
        llm_params=llm_params,
        model_defaults=ModelDefaults(model_provider, model_id, RAG_ENABLED),
        model_family=BedrockModelProviders.AMAZON.value,
        rag_enabled=False,
    )
    yield chat


@pytest.fixture
def temp_bedrock_dynamodb_defaults_table(
    dynamodb_resource,
    prompt,
    dynamodb_defaults_table,
    use_case,
    is_streaming,
    model_id,
    model_provider=LLMProviderTypes.BEDROCK.value,
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
                "ai_prefix": "Bot",
                "human_prefix": "User",
                "output": output_key,
            },
            "MinTemperature": "0",
            "ModelName": model_id,
            "ModelProviderName": model_provider,
            "Prompt": prompt,
            "DefaultStopSequences": ["\n\nUser:"],  # additional stop sequences
            "DisambiguationPrompt": CONDENSE_QUESTION_PROMPT,
        }
    )


@pytest.mark.parametrize(
    "use_case, prompt, is_streaming, model_id, chat_fixture",
    [
        (CHAT_IDENTIFIER, BEDROCK_PROMPT, False, model_id, "streamless_chat"),
        (CHAT_IDENTIFIER, BEDROCK_PROMPT, True, model_id, "streaming_chat"),
    ],
)
def test_implement_error_not_raised(
    use_case, prompt, is_streaming, chat_fixture, request, setup_environment, bedrock_dynamodb_defaults_table
):
    chat = request.getfixturevalue(chat_fixture)
    try:
        assert chat.api_token is None
        assert chat.model == "amazon.model-xx"
        assert chat.prompt_template.template == BEDROCK_PROMPT
        assert chat.prompt_template.input_variables == DEFAULT_PLACEHOLDERS
        assert chat.model_params["topP"] == 0.2
        assert chat.model_params["maxTokenCount"] == 512
        assert chat.model_params["temperature"] == 0.0
        assert chat.streaming == is_streaming
        assert chat.verbose == False
        assert chat.knowledge_base == None
        assert chat.conversation_memory.chat_memory.messages == []
        assert type(chat.conversation_chain) == ConversationChain
        assert chat.stop_sequences == []
    except NotImplementedError as ex:
        raise Exception(ex)


@pytest.mark.parametrize(
    "use_case, prompt, is_streaming, model_id, chat_fixture",
    [
        (CHAT_IDENTIFIER, BEDROCK_PROMPT, False, model_id, "streamless_chat"),
        (CHAT_IDENTIFIER, BEDROCK_PROMPT, True, model_id, "streaming_chat"),
    ],
)
def test_generate(use_case, prompt, is_streaming, chat_fixture, request, bedrock_dynamodb_defaults_table):
    model = request.getfixturevalue(chat_fixture)
    with mock.patch("langchain.chains.ConversationChain.predict", return_value="I'm doing well, how are you?"):
        assert model.generate("Hi there") == {"answer": "I'm doing well, how are you?"}


@pytest.mark.parametrize(
    "use_case, prompt, is_streaming, model_id",
    [
        (
            CHAT_IDENTIFIER,
            BEDROCK_PROMPT,
            False,
            model_id,
        )
    ],
)
def test_exception_for_failed_model_response(
    use_case, prompt, is_streaming, model_id, setup_environment, bedrock_stubber, bedrock_dynamodb_defaults_table
):
    bedrock_stubber.add_client_error(
        "invoke_model",
        service_error_code="InternalServerError",
        service_message="some-error",
        expected_params={
            "accept": "application/json",
            "body": json.dumps(
                {
                    "inputText": BEDROCK_PROMPT.replace("{history}", "").replace(
                        "{input}", "What is the weather in Seattle?"
                    ),
                    "textGenerationConfig": {
                        "maxTokenCount": 512,
                        "topP": 0.2,
                        "temperature": 0.0,
                    },
                }
            ),
            "contentType": "application/json",
            "modelId": model_id,
        },
    )

    with pytest.raises(LLMInvocationError) as error:
        llm_params.streaming = is_streaming
        chat = BedrockLLM(
            llm_params=llm_params,
            model_defaults=ModelDefaults(model_provider, model_id, RAG_ENABLED),
            model_family=BedrockModelProviders.AMAZON.value,
            rag_enabled=False,
        )
        chat.generate("What is the weather in Seattle?")

    print("error=", error)

    assert error.value.args[0] == (
        f"Error occurred while invoking {model_family} {model_id} model. "
        "Error raised by bedrock service: An error occurred (InternalServerError) when calling the InvokeModel operation: some-error"
    )


@pytest.mark.parametrize(
    "use_case, prompt, is_streaming, model_id, chat_fixture",
    [
        (CHAT_IDENTIFIER, BEDROCK_PROMPT, False, model_id, "streamless_chat"),
        (CHAT_IDENTIFIER, BEDROCK_PROMPT, True, model_id, "streaming_chat"),
    ],
)
def test_model_get_clean_model_params(
    use_case,
    prompt,
    is_streaming,
    chat_fixture,
    request,
    setup_environment,
    bedrock_dynamodb_defaults_table,
):
    llm_params.streaming = is_streaming
    llm_params.model_params["stopSequences"] = {
        "Type": "list",
        "Value": '["\n\nBot:", "|"]',
    }
    chat = BedrockLLM(
        llm_params=llm_params,
        model_defaults=ModelDefaults(model_provider, model_id, RAG_ENABLED),
        model_family=BedrockModelProviders.AMAZON.value,
        rag_enabled=False,
    )
    assert chat.model_params["topP"] == 0.2
    assert chat.model_params["maxTokenCount"] == 512
    assert chat.model_params["temperature"] == 0.0
    assert sorted(chat.model_params["stopSequences"]) == ["\n\nBot:", "|"]


@pytest.mark.parametrize(
    "use_case, prompt, is_streaming, model_id",
    [(CHAT_IDENTIFIER, BEDROCK_PROMPT, False, model_id)],
)
def test_model_default_stop_sequences(
    use_case,
    prompt,
    is_streaming,
    request,
    setup_environment,
    model_id,
    temp_bedrock_dynamodb_defaults_table,
):
    model_provider = LLMProviderTypes.BEDROCK.value
    llm_params.streaming = False
    llm_params.model_params = {
        "topP": {"Type": "float", "Value": "0.2"},
        "maxTokenCount": {"Type": "integer", "Value": "512"},
        "stopSequences": {"Type": "list", "Value": '["\n\nBot:"]'},
    }

    llm_params.streaming = is_streaming

    chat = BedrockLLM(
        llm_params=llm_params,
        model_defaults=ModelDefaults(model_provider, model_id, RAG_ENABLED),
        model_family=BedrockModelProviders.AMAZON.value,
        rag_enabled=False,
    )
    assert chat.model_params["topP"] == 0.2
    assert chat.model_params["maxTokenCount"] == 512
    assert chat.model_params["temperature"] == 0.0
    # default and user provided stop sequences combined
    assert sorted(chat.model_params["stopSequences"]) == ["\n\nBot:", "\n\nUser:"]


@pytest.mark.parametrize(
    "use_case, prompt, is_streaming, model_id",
    [(CHAT_IDENTIFIER, BEDROCK_PROMPT, False, model_id)],
)
def test_guardrails(
    use_case,
    prompt,
    is_streaming,
    request,
    setup_environment,
    model_id,
    temp_bedrock_dynamodb_defaults_table,
):
    model_provider = LLMProviderTypes.BEDROCK.value
    llm_params.streaming = False
    llm_params.model_params = {
        "topP": {"Type": "float", "Value": "0.2"},
        "guardrails": {"Value": '{"id": "fake-id", "version": "DRAFT"}', "Type": "dictionary"},
    }

    llm_params.streaming = is_streaming

    chat = BedrockLLM(
        llm_params=llm_params,
        model_defaults=ModelDefaults(model_provider, model_id, RAG_ENABLED),
        model_family=BedrockModelProviders.AMAZON.value,
        rag_enabled=False,
    )
    assert chat.model_params["topP"] == 0.2
    assert "guardrails" not in chat.model_params
    assert chat.guardrails == {"id": "fake-id", "version": "DRAFT"}


@pytest.mark.parametrize(
    "use_case, prompt, is_streaming, guardrails, model_id, bedrock_class, model_family",
    [
        (
            CHAT_IDENTIFIER,
            BEDROCK_PROMPT,
            False,
            None,
            "anthropic.fake-claude-2",
            BedrockChat,
            BedrockModelProviders.ANTHROPIC,
        ),
        (
            CHAT_IDENTIFIER,
            BEDROCK_PROMPT,
            False,
            None,
            "anthropic.fake-claude-3",
            BedrockChat,
            BedrockModelProviders.ANTHROPIC,
        ),
        (
            CHAT_IDENTIFIER,
            BEDROCK_PROMPT,
            False,
            None,
            "cohere.fake-command-text",
            Bedrock,
            BedrockModelProviders.COHERE,
        ),
        (
            CHAT_IDENTIFIER,
            BEDROCK_PROMPT,
            False,
            None,
            "cohere.fake-command-text",
            Bedrock,
            BedrockModelProviders.COHERE,
        ),
        (
            CHAT_IDENTIFIER,
            BEDROCK_PROMPT,
            False,
            None,
            "anthropic.fake-claude-2",
            BedrockChat,
            BedrockModelProviders.ANTHROPIC,
        ),
        (
            CHAT_IDENTIFIER,
            BEDROCK_PROMPT,
            False,
            {"Value": '{"id": "fake-id", "version": "DRAFT"}', "Type": "dictionary"},
            "cohere",
            Bedrock,
            BedrockModelProviders.COHERE,
        ),
        (
            CHAT_IDENTIFIER,
            BEDROCK_PROMPT,
            False,
            {"Value": '{"id": "fake-id", "version": "DRAFT"}', "Type": "dictionary"},
            "anthropic.fake-claude-2",
            BedrockChat,
            BedrockModelProviders.ANTHROPIC,
        ),
        (
            CHAT_IDENTIFIER,
            BEDROCK_PROMPT,
            False,
            None,
            "anthropic.fake-claude-3",
            BedrockChat,
            BedrockModelProviders.ANTHROPIC,
        ),
        (
            CHAT_IDENTIFIER,
            BEDROCK_PROMPT,
            False,
            {"Value": '{"id": "fake-id", "version": "DRAFT"}', "Type": "dictionary"},
            "anthropic.fake-claude-3",
            BedrockChat,
            BedrockModelProviders.ANTHROPIC,
        ),
        (
            CHAT_IDENTIFIER,
            BEDROCK_PROMPT,
            False,
            None,
            "cohere.fake-command-text",
            Bedrock,
            BedrockModelProviders.COHERE,
        ),
        (
            CHAT_IDENTIFIER,
            BEDROCK_PROMPT,
            False,
            {"Value": '{"id": "fake-id", "version": "DRAFT"}', "Type": "dictionary"},
            "cohere.fake-command-text",
            Bedrock,
            BedrockModelProviders.COHERE,
        ),
    ],
)
def test_bedrock_get_llm_class(guardrails, model_id, bedrock_class, temp_bedrock_dynamodb_defaults_table, model_family):
    # BedrockChat vs Bedrock class as output
    RAG_ENABLED = False
    llm_params.model = model_id
    llm_params.model_params = {}

    if guardrails:
        llm_params.model_params["guardrails"] = guardrails

    chat = BedrockLLM(
        llm_params=llm_params,
        model_defaults=ModelDefaults(model_provider, model_id, RAG_ENABLED),
        model_family=model_family.value,
        rag_enabled=False,
    )

    assert type(chat.llm) == bedrock_class


@pytest.mark.parametrize(
    "use_case, prompt, is_streaming, guardrails, model_id, bedrock_class, model_family",
    [
        (
            CHAT_IDENTIFIER,
            BEDROCK_PROMPT,
            False,
            None,
            "anthropic.fake-claude-2",
            BedrockChat,
            BedrockModelProviders.ANTHROPIC,
        ),
        (
            CHAT_IDENTIFIER,
            BEDROCK_PROMPT,
            False,
            None,
            "anthropic.fake-claude-3",
            BedrockChat,
            BedrockModelProviders.ANTHROPIC,
        ),
        (
            CHAT_IDENTIFIER,
            BEDROCK_PROMPT,
            False,
            None,
            "cohere.fake-command-text",
            Bedrock,
            BedrockModelProviders.COHERE,
        ),
        (
            CHAT_IDENTIFIER,
            BEDROCK_PROMPT,
            False,
            {"Value": '{"id": "fake-id", "version": "DRAFT"}', "Type": "dictionary"},
            "anthropic.fake-claude-2",
            BedrockChat,
            BedrockModelProviders.ANTHROPIC,
        ),
        (
            CHAT_IDENTIFIER,
            BEDROCK_PROMPT,
            False,
            {"Value": '{"id": "fake-id", "version": "DRAFT"}', "Type": "dictionary"},
            "anthropic.fake-claude-3",
            BedrockChat,
            BedrockModelProviders.ANTHROPIC,
        ),
        (
            CHAT_IDENTIFIER,
            BEDROCK_PROMPT,
            False,
            {"Value": '{"id": "fake-id", "version": "DRAFT"}', "Type": "dictionary"},
            "cohere.fake-command-text",
            Bedrock,
            BedrockModelProviders.COHERE,
        ),
    ],
)
def test_bedrock_get_llm_class_no_env(
    guardrails, model_id, bedrock_class, temp_bedrock_dynamodb_defaults_table, model_family
):
    RAG_ENABLED = False
    llm_params.model = model_id
    llm_params.model_params = {}

    if guardrails:
        llm_params.model_params["guardrails"] = guardrails

    chat = BedrockLLM(
        llm_params=llm_params,
        model_defaults=ModelDefaults(model_provider, model_id, RAG_ENABLED),
        model_family=model_family.value,
        rag_enabled=False,
    )

    assert type(chat.llm) == bedrock_class
