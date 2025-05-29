#!/usr/bin/env python
# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

import json
from unittest import mock

import pytest
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.runnables.base import RunnableBinding
from langchain_core.runnables.history import RunnableWithMessageHistory

from llms.models.model_provider_inputs import SageMakerInputs
from llms.sagemaker import SageMakerLLM
from shared.defaults.model_defaults import ModelDefaults
from shared.memory.ddb_enhanced_message_history import DynamoDBChatMessageHistory
from utils.constants import CHAT_IDENTIFIER, DEFAULT_SAGEMAKER_MODEL_ID
from utils.custom_exceptions import LLMInvocationError
from utils.enum_types import LLMProviderTypes

DEFAULT_TEMPERATURE = 0.0
RAG_ENABLED = False
SAGEMAKER_PROMPT = """\n\n{history}\n\n{input}"""
DEFAULT_PROMPT_PLACEHOLDERS = ["history", "input"]
input_schema = {
    "inputs": "<<prompt>>",
    "parameters": {
        "param-1": "<<param-1>>",
        "param-2": "<<param-2>>",
        "param-3": "<<param-1>>",
        "param-5": "<<param-5>>",
    },
}

model_provider = LLMProviderTypes.SAGEMAKER
model_id = DEFAULT_SAGEMAKER_MODEL_ID
model_inputs = SageMakerInputs(
    **{
        "conversation_history_cls": DynamoDBChatMessageHistory,
        "conversation_history_params": {
            "table_name": "fake-table",
            "user_id": "fake-user-id",
            "conversation_id": "fake-conversation-id",
            "message_id": "fake-message-id"
        },
        "rag_enabled": RAG_ENABLED,
        "model": model_id,
        "model_params": {
            "topP": {"Type": "float", "Value": "0.2"},
            "maxTokenCount": {"Type": "integer", "Value": "512"},
        },
        "prompt_template": SAGEMAKER_PROMPT,
        "prompt_placeholders": DEFAULT_PROMPT_PLACEHOLDERS,
        "streaming": False,
        "verbose": False,
        "temperature": DEFAULT_TEMPERATURE,
        "callbacks": None,
        "sagemaker_endpoint_name": "fake-endpoint",
        "input_schema": input_schema,
        "response_jsonpath": "$.generated_text",
    }
)


@pytest.fixture
def streamless_chat(model_id, setup_environment):
    model_inputs.streaming = False
    chat = SageMakerLLM(model_inputs=model_inputs, model_defaults=ModelDefaults(model_provider, model_id, RAG_ENABLED))
    yield chat


@pytest.fixture
def streaming_chat(model_id, setup_environment):
    model_inputs.streaming = True
    chat = SageMakerLLM(model_inputs=model_inputs, model_defaults=ModelDefaults(model_provider, model_id, RAG_ENABLED))
    yield chat


@pytest.mark.parametrize(
    "use_case, prompt, is_streaming, model_id, chat_fixture",
    [
        (CHAT_IDENTIFIER, SAGEMAKER_PROMPT, False, model_id, "streamless_chat"),
    ],
)
def test_implement_error_not_raised(
    use_case,
    prompt,
    is_streaming,
    chat_fixture,
    request,
    setup_environment,
    sagemaker_dynamodb_defaults_table,
):
    chat = request.getfixturevalue(chat_fixture)
    try:
        assert chat.prompt_template == ChatPromptTemplate.from_template(prompt)
        assert chat.prompt_template.input_variables == ["history", "input"]
        assert chat.sagemaker_endpoint_name == "fake-endpoint"
        assert chat.input_schema == input_schema
        assert chat.response_jsonpath == "$.generated_text"
        assert chat.model_params["topP"] == 0.2
        assert chat.model_params["maxTokenCount"] == 512
        # when not provided, default temperature is not set
        assert chat.model_params.get("temperature") is None
        assert chat.streaming == is_streaming
        assert chat.verbose == False
        assert chat.conversation_history_cls == DynamoDBChatMessageHistory
        assert chat.conversation_history_params == {
            "table_name": "fake-table",
            "user_id": "fake-user-id",
            "conversation_id": "fake-conversation-id",
            "message_id": "fake-message-id"
        }
    except NotImplementedError as ex:
        raise Exception(ex)


@pytest.mark.parametrize(
    "use_case, prompt, is_streaming, model_id, chat_fixture",
    [
        (CHAT_IDENTIFIER, SAGEMAKER_PROMPT, False, model_id, "streamless_chat"),
    ],
)
def test_generate(
    use_case,
    prompt,
    is_streaming,
    chat_fixture,
    request,
    sagemaker_dynamodb_defaults_table,
):
    model = request.getfixturevalue(chat_fixture)
    with mock.patch(
        "langchain_core.runnables.RunnableWithMessageHistory.invoke",
        return_value="I'm doing well, how are you?",
    ):
        assert model.generate("Hi there") == {"answer": "I'm doing well, how are you?"}


@pytest.mark.parametrize(
    "use_case, prompt, is_streaming, model_id",
    [
        (
            CHAT_IDENTIFIER,
            SAGEMAKER_PROMPT,
            False,
            model_id,
        )
    ],
)
def test_exception_for_failed_model_response(
    use_case,
    prompt,
    is_streaming,
    setup_environment,
    sagemaker_stubber,
    sagemaker_dynamodb_defaults_table,
):
    sagemaker_stubber.add_client_error(
        "invoke_endpoint",
        service_error_code="InternalServerError",
        service_message="some-error",
        expected_params={
            "Accept": "application/json",
            "Body": json.dumps(
                {
                    "inputs": "Human: "
                    + SAGEMAKER_PROMPT.replace("{history}", "[]").replace("{input}", "What is the weather in Seattle?")
                }
            ).encode("utf-8"),
            "ContentType": "application/json",
            "EndpointName": "fake-endpoint",
        },
    )
    model_inputs.streaming = False
    endpoint_name = "fake-endpoint"
    chat = SageMakerLLM(model_inputs=model_inputs, model_defaults=ModelDefaults(model_provider, model_id, RAG_ENABLED))

    with pytest.raises(LLMInvocationError) as error:
        chat.generate("What is the weather in Seattle?")

    assert error.value.args[0] == (
        f"Error occurred while invoking SageMaker endpoint: '{endpoint_name}'. "
        "An error occurred (InternalServerError) when calling the InvokeEndpoint operation: some-error"
    )


@pytest.mark.parametrize(
    "use_case, prompt, is_streaming, model_id, chat_fixture",
    [
        (CHAT_IDENTIFIER, SAGEMAKER_PROMPT, False, model_id, "streamless_chat"),
    ],
)
def test_model_get_clean_model_params(
    use_case,
    prompt,
    is_streaming,
    chat_fixture,
    request,
    setup_environment,
    sagemaker_dynamodb_defaults_table,
):
    model_inputs.streaming = is_streaming
    model_inputs.model_params["stopSequences"] = {
        "Type": "list",
        "Value": '["\n\nAI:", "\n\nHuman:",  "|"]',
    }
    chat = SageMakerLLM(model_inputs=model_inputs, model_defaults=ModelDefaults(model_provider, model_id, RAG_ENABLED))
    assert chat.model_params["topP"] == 0.2
    assert chat.model_params["maxTokenCount"] == 512
    assert chat.model_params.get("temperature") is None
    assert chat.model_params["stopSequences"] == ["\n\nAI:", "\n\nHuman:", "|"]


@pytest.mark.parametrize(
    "use_case, prompt, is_streaming, model_id, chat_fixture",
    [(CHAT_IDENTIFIER, SAGEMAKER_PROMPT, False, model_id, "streamless_chat")],
)
def test_clean_model_endpoint_args(
    use_case,
    prompt,
    is_streaming,
    chat_fixture,
    request,
    setup_environment,
    sagemaker_dynamodb_defaults_table,
):
    chat = request.getfixturevalue(chat_fixture)
    (
        sanitized_model_params,
        sanitized_endpoint_params,
    ) = chat.get_clean_model_params(
        {
            "max_length": {"Type": "integer", "Value": "100"},
            "top_p": {"Type": "float", "Value": "0.2"},
            "TargetModel": {"Type": "string", "Value": "target-model-name"},
            "EnableExplanations": {"Type": "boolean", "Value": "true"},
        }
    )

    assert sanitized_model_params == {"max_length": 100, "top_p": 0.2}
    assert sanitized_endpoint_params == {
        "TargetModel": "target-model-name",
        "EnableExplanations": True,
    }


@pytest.mark.parametrize(
    "use_case, prompt, is_streaming, model_id, sagemaker_endpoint, input_schema, response_jsonpath, error_message",
    [
        (
            CHAT_IDENTIFIER,
            SAGEMAKER_PROMPT,
            False,
            model_id,
            "",
            input_schema,
            "some-path",
            "SageMaker endpoint name is required.",
        ),
        (
            CHAT_IDENTIFIER,
            SAGEMAKER_PROMPT,
            False,
            model_id,
            None,
            input_schema,
            "some-path",
            "SageMaker endpoint name is required.",
        ),
        (
            CHAT_IDENTIFIER,
            SAGEMAKER_PROMPT,
            False,
            model_id,
            "fake-endpoint",
            {},
            "some-path",
            "SageMaker input schema is required.",
        ),
    ],
)
def test_missing_values(
    use_case,
    prompt,
    is_streaming,
    model_id,
    setup_environment,
    sagemaker_endpoint,
    input_schema,
    response_jsonpath,
    error_message,
    sagemaker_dynamodb_defaults_table,
):
    model_inputs.input_schema = input_schema
    model_inputs.response_jsonpath = response_jsonpath
    model_inputs.sagemaker_endpoint_name = sagemaker_endpoint
    with pytest.raises(ValueError) as error:
        SageMakerLLM(model_inputs=model_inputs, model_defaults=ModelDefaults(model_provider, model_id, RAG_ENABLED))

    assert error.value.args[0] == error_message
