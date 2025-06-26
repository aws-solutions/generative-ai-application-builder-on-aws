#!/usr/bin/env python
# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

import os
from unittest import mock

import pytest
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder

from llms.bedrock import BedrockLLM
from llms.models.model_provider_inputs import BedrockInputs
from shared.defaults.model_defaults import ModelDefaults
from shared.memory.ddb_enhanced_message_history import DynamoDBChatMessageHistory
from utils.constants import CHAT_IDENTIFIER, MODEL_INFO_TABLE_NAME_ENV_VAR
from utils.custom_exceptions import LLMInvocationError
from utils.enum_types import BedrockModelProviders, LLMProviderTypes

DEFAULT_TEMPERATURE = 0.0
RAG_ENABLED = False
BEDROCK_PROMPT = """test prompt"""
DEFAULT_PROMPT_PLACEHOLDERS = []
MODEL_PROVIDER = LLMProviderTypes.BEDROCK.value
MODEL_ID = "amazon.fake-model"
PROVISIONED_ARN = "arn:aws:bedrock:us-east-1:123456789012:provisioned-model/z8g9xzoxoxmw"
model_inputs = BedrockInputs(
    **{
        "conversation_history_cls": DynamoDBChatMessageHistory,
        "conversation_history_params": {
            "table_name": "fake-table",
            "user_id": "fake-user-id",
            "conversation_id": "fake-conversation-id",
            "message_id": "fake-message-id",
        },
        "rag_enabled": False,
        "model": MODEL_ID,
        "model_family": BedrockModelProviders.AMAZON.value,
        "model_params": {
            "topP": {"Type": "float", "Value": "0.2"},
            "maxTokens": {"Type": "integer", "Value": "512"},
            "stopSequences": {"Type": "list", "Value": '["Human:"]'},
            "modelSpecific": {"Type": "string", "Value": "test"},
        },
        "prompt_template": BEDROCK_PROMPT,
        "prompt_placeholders": DEFAULT_PROMPT_PLACEHOLDERS,
        "streaming": False,
        "verbose": False,
        "temperature": DEFAULT_TEMPERATURE,
        "callbacks": None,
    }
)


@pytest.fixture
def streamless_chat(setup_environment):
    model_inputs.streaming = False
    chat = BedrockLLM(
        model_inputs=model_inputs,
        model_defaults=ModelDefaults(MODEL_PROVIDER, MODEL_ID, RAG_ENABLED),
    )
    yield chat


@pytest.fixture
def streaming_chat(setup_environment):
    model_inputs.streaming = True
    chat = BedrockLLM(
        model_inputs=model_inputs,
        model_defaults=ModelDefaults(MODEL_PROVIDER, MODEL_ID, RAG_ENABLED),
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
    output_key = "answer"
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
            "DisambiguationPrompt": """Given the following conversation and a follow up question, rephrase the follow up question to be a standalone question, in its original language.\n\nChat History:\n{history}\nFollow Up Input: {input}\nStandalone question:""",
        }
    )


@pytest.mark.parametrize(
    "use_case, prompt, is_streaming, model_id, chat_fixture",
    [
        (CHAT_IDENTIFIER, BEDROCK_PROMPT, False, MODEL_ID, "streamless_chat"),
        (CHAT_IDENTIFIER, BEDROCK_PROMPT, True, MODEL_ID, "streaming_chat"),
    ],
)
def test_implement_error_not_raised(
    use_case,
    prompt,
    is_streaming,
    chat_fixture,
    request,
    setup_environment,
    bedrock_dynamodb_defaults_table,
):
    chat = request.getfixturevalue(chat_fixture)
    try:
        assert chat.model == "amazon.fake-model"
        assert chat.model_arn is None
        assert chat.prompt_template == ChatPromptTemplate.from_messages(
            [
                ("system", prompt),
                MessagesPlaceholder("history", optional=True),
                ("human", "{input}"),
            ]
        )
        assert chat.prompt_template.input_variables == ["input"]
        assert chat.model_params == {
            "temperature": 0.0,
            "maxTokens": 512,
            "topP": 0.2,
            "stopSequences": ["Human:"],
            "modelSpecific": "test",
        }
        assert chat.verbose == False
        assert chat.conversation_history_cls == DynamoDBChatMessageHistory
        assert chat.conversation_history_params == {
            "table_name": "fake-table",
            "user_id": "fake-user-id",
            "conversation_id": "fake-conversation-id",
            "message_id": "fake-message-id",
        }
    except NotImplementedError as ex:
        raise Exception(ex)


@pytest.mark.parametrize(
    "use_case, prompt, is_streaming, model_id, chat_fixture",
    [
        (
            CHAT_IDENTIFIER,
            BEDROCK_PROMPT,
            False,
            MODEL_ID,
            "streamless_chat",
        ),
        (CHAT_IDENTIFIER, BEDROCK_PROMPT, True, MODEL_ID, "streaming_chat"),
    ],
)
def test_generate(use_case, prompt, is_streaming, chat_fixture, request, bedrock_dynamodb_defaults_table):
    model = request.getfixturevalue(chat_fixture)
    # bedrock non-RAG has been moved to Converse class which will use the stream method
    if is_streaming:
        method_name = "stream"
    else:
        method_name = "invoke"
    with mock.patch(
        f"langchain_core.runnables.RunnableWithMessageHistory.{method_name}",
        return_value="I'm doing well, how are you?",
    ):
        assert model.generate("Hi there") == {"answer": "I'm doing well, how are you?"}


@pytest.mark.parametrize(
    "use_case, prompt, is_streaming, model_id",
    [
        (CHAT_IDENTIFIER, BEDROCK_PROMPT, False, MODEL_ID),
    ],
)
def test_model_params_configuration(
    use_case,
    prompt,
    is_streaming,
    model_id,
    setup_environment,
    bedrock_stubber,
    bedrock_dynamodb_defaults_table,
):
    """Test that successful Bedrock model invocations pass correct parameters"""
    # Successful Bedrock response
    bedrock_stubber.add_response(
        "converse",
        expected_params={
            "additionalModelRequestFields": {"modelSpecific": "test"},
            "inferenceConfig": {"temperature": 0.0, "topP": 0.2, "maxTokens": 512, "stopSequences": ["Human:"]},
            "messages": [
                {
                    "content": [{"text": "What is the weather in Seattle?"}],
                    "role": "user",
                }
            ],
            "modelId": model_id,
            "system": [{"text": BEDROCK_PROMPT.replace("{input}", "What is the weather in Seattle?")}],
        },
        service_response={
            "output": {
                "message": {
                    "content": [{"text": "Rainy today, carry an umbrella!"}],
                    "role": "assistant",
                }
            },
            "stopReason": "end_turn",
            "usage": {
                "inputTokens": 10,
                "outputTokens": 8,
                "totalTokens": 18,
            },
            "metrics": {
                "latencyMs": 500,
            },
        },
    )

    model_inputs.streaming = False
    chat = BedrockLLM(
        model_inputs=model_inputs,
        model_defaults=ModelDefaults(MODEL_PROVIDER, model_id, RAG_ENABLED),
    )

    # Test the actual Bedrock call through the stubber
    response = chat.generate("What is the weather in Seattle?")
    assert response == {"answer": "Rainy today, carry an umbrella!"}


@pytest.mark.parametrize(
    "use_case, prompt, is_streaming, model_id",
    [
        (
            CHAT_IDENTIFIER,
            BEDROCK_PROMPT,
            False,
            MODEL_ID,
        ),
        (CHAT_IDENTIFIER, BEDROCK_PROMPT, True, MODEL_ID),
    ],
)
def test_exception_for_failed_model_response(
    use_case, prompt, is_streaming, model_id, setup_environment, bedrock_stubber, bedrock_dynamodb_defaults_table
):
    bedrock_stubber.add_client_error(
        "converse",
        service_error_code="InternalServerError",
        service_message="some-error",
        expected_params={
            "additionalModelRequestFields": {"modelSpecific": "test"},
            "inferenceConfig": {"temperature": 0.0, "topP": 0.2, "maxTokens": 512, "stopSequences": ["Human:"]},
            "messages": [
                {
                    "content": [{"text": "What is the weather in Seattle?"}],
                    "role": "user",
                }
            ],
            "modelId": model_id,
            "system": [{"text": BEDROCK_PROMPT.replace("{input}", "What is the weather in Seattle?")}],
        },
    )

    with pytest.raises(LLMInvocationError) as error:
        model_inputs.streaming = False
        chat = BedrockLLM(
            model_inputs=model_inputs,
            model_defaults=ModelDefaults(MODEL_PROVIDER, model_id, RAG_ENABLED),
        )
        chat.generate("What is the weather in Seattle?")

    assert error.value.args[0] == (
        f"Error occurred while invoking Bedrock model family 'amazon' model '{model_id}'. "
        "An error occurred (InternalServerError) when calling the Converse operation: some-error"
    )


@pytest.mark.parametrize(
    "use_case, prompt, is_streaming, model_id",
    [(CHAT_IDENTIFIER, BEDROCK_PROMPT, False, MODEL_ID)],
)
def test_bedrock_provisioned_model(
    use_case,
    prompt,
    is_streaming,
    request,
    setup_environment,
    model_id,
    temp_bedrock_dynamodb_defaults_table,
    test_provisioned_arn,
):
    model_inputs.model_arn = test_provisioned_arn
    model_provider = LLMProviderTypes.BEDROCK.value
    model_inputs.streaming = is_streaming
    model_inputs.model = model_id

    chat = BedrockLLM(
        model_inputs=model_inputs,
        model_defaults=ModelDefaults(model_provider, model_id, RAG_ENABLED),
    )
    assert chat.model == model_id
    assert chat.model_arn == test_provisioned_arn
    assert chat.model_family == BedrockModelProviders.AMAZON.value
