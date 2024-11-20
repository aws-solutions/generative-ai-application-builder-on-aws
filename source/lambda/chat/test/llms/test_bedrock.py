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
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.runnables.base import RunnableBinding
from langchain_core.runnables.history import RunnableWithMessageHistory
from llms.bedrock import BedrockLLM
from llms.models.model_provider_inputs import BedrockInputs
from shared.defaults.model_defaults import ModelDefaults
from shared.memory.ddb_enhanced_message_history import DynamoDBChatMessageHistory
from utils.constants import CHAT_IDENTIFIER, DEFAULT_PROMPT_PLACEHOLDERS, MODEL_INFO_TABLE_NAME_ENV_VAR
from utils.custom_exceptions import LLMInvocationError
from utils.enum_types import BedrockModelProviders, LLMProviderTypes

DEFAULT_TEMPERATURE = 0.0
RAG_ENABLED = False
BEDROCK_PROMPT = """\n\n{history}\n\n{input}"""
MODEL_PROVIDER = LLMProviderTypes.BEDROCK.value
MODEL_ID = "amazon.model-xx"
PROVISIONED_ARN = "arn:aws:bedrock:us-east-1:123456789012:provisioned-model/z8g9xzoxoxmw"
model_inputs = BedrockInputs(
    **{
        "conversation_history_cls": DynamoDBChatMessageHistory,
        "conversation_history_params": {
            "table_name": "fake-table",
            "user_id": "fake-user-id",
            "conversation_id": "fake-conversation-id",
        },
        "rag_enabled": False,
        "model": MODEL_ID,
        "model_family": BedrockModelProviders.AMAZON.value,
        "model_params": {
            "topP": {"Type": "float", "Value": "0.2"},
            "maxTokenCount": {"Type": "integer", "Value": "512"},
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
    "use_case, prompt, is_streaming, model_id, chat_fixture, expected_runnable_type",
    [
        (CHAT_IDENTIFIER, BEDROCK_PROMPT, False, MODEL_ID, "streamless_chat", RunnableWithMessageHistory),
        (CHAT_IDENTIFIER, BEDROCK_PROMPT, True, MODEL_ID, "streaming_chat", RunnableBinding),
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
    expected_runnable_type,
):
    chat = request.getfixturevalue(chat_fixture)
    try:
        assert chat.model == "amazon.model-xx"
        assert chat.model_arn is None
        assert chat.prompt_template == ChatPromptTemplate.from_template(BEDROCK_PROMPT)
        assert chat.prompt_template.input_variables == DEFAULT_PROMPT_PLACEHOLDERS
        assert chat.model_params == {"temperature": 0.0, "maxTokenCount": 512, "topP": 0.2}
        assert chat.streaming == is_streaming
        assert chat.verbose == False
        assert chat.conversation_history_cls == DynamoDBChatMessageHistory
        assert chat.conversation_history_params == {
            "table_name": "fake-table",
            "user_id": "fake-user-id",
            "conversation_id": "fake-conversation-id",
        }
        assert type(chat.runnable_with_history) == expected_runnable_type
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
    with mock.patch(
        "langchain_core.runnables.RunnableWithMessageHistory.invoke", return_value="I'm doing well, how are you?"
    ):
        assert model.generate("Hi there") == {"answer": "I'm doing well, how are you?"}


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
        "invoke_model",
        service_error_code="InternalServerError",
        service_message="some-error",
        expected_params={
            "accept": "application/json",
            "body": json.dumps(
                {
                    "inputText": "\n\nUser: "
                    + BEDROCK_PROMPT.replace("{history}", "[]").replace(
                        "{input}", "What is the weather in Seattle?\n\nBot:"
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
        model_inputs.streaming = False
        chat = BedrockLLM(
            model_inputs=model_inputs,
            model_defaults=ModelDefaults(MODEL_PROVIDER, model_id, RAG_ENABLED),
        )
        chat.generate("What is the weather in Seattle?")

    assert error.value.args[0] == (
        f"Error occurred while invoking Bedrock model family 'amazon' model '{model_id}'. "
        "An error occurred (InternalServerError) when calling the InvokeModel operation: some-error"
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
