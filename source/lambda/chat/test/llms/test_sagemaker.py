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
from unittest import mock

import pytest
from langchain.chains import ConversationChain
from llms.models.llm import LLM
from llms.sagemaker import SageMakerLLM
from shared.defaults.model_defaults import ModelDefaults
from shared.memory.ddb_chat_memory import DynamoDBChatMemory
from shared.memory.ddb_enhanced_message_history import DynamoDBChatMessageHistory
from utils.constants import CHAT_IDENTIFIER, DEFAULT_PLACEHOLDERS, DEFAULT_TEMPERATURE
from utils.custom_exceptions import LLMInvocationError
from utils.enum_types import LLMProviderTypes

RAG_ENABLED = False
SAGEMAKER_PROMPT = """\n\n{history}\n\n{input}"""
CONDENSE_QUESTION_PROMPT = """Given the following conversation and a follow up question, rephrase the follow up question to be a standalone question, in its original language.\n\nChat History:\n{chat_history}\nFollow Up Input: {question}\nStandalone question:"""
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
model_id = "default"
llm_params = LLM(
    **{
        "conversation_memory": DynamoDBChatMemory(
            DynamoDBChatMessageHistory(
                table_name="fake-table",
                user_id="fake-user-id",
                conversation_id="fake-conversation-id",
            )
        ),
        "knowledge_base": None,
        "api_token": None,
        "model": model_id,
        "model_params": {
            "topP": {"Type": "float", "Value": "0.2"},
            "maxTokenCount": {"Type": "integer", "Value": "512"},
        },
        "prompt_template": SAGEMAKER_PROMPT,
        "prompt_placeholders": DEFAULT_PLACEHOLDERS,
        "streaming": False,
        "verbose": False,
        "temperature": DEFAULT_TEMPERATURE,
        "callbacks": None,
    }
)


@pytest.fixture
def streamless_chat(model_id, setup_environment):
    llm_params.streaming = False
    chat = SageMakerLLM(
        llm_params=llm_params,
        model_defaults=ModelDefaults(model_provider, model_id, RAG_ENABLED),
        sagemaker_endpoint_name="fake-endpoint",
        input_schema=input_schema,
        response_jsonpath="$.generated_text",
        rag_enabled=False,
    )
    yield chat


@pytest.fixture
def streaming_chat(model_id, setup_environment):
    llm_params.streaming = True
    chat = SageMakerLLM(
        llm_params=llm_params,
        model_defaults=ModelDefaults(model_provider, model_id, RAG_ENABLED),
        sagemaker_endpoint_name="fake-endpoint",
        input_schema=input_schema,
        response_jsonpath="$.generated_text",
        rag_enabled=False,
    )
    yield chat


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
            True,
            model_id,
            "fake-endpoint",
            {},
            "some-path",
            "SageMaker input schema is required.",
        ),
        (
            CHAT_IDENTIFIER,
            SAGEMAKER_PROMPT,
            True,
            model_id,
            "fake-endpoint",
            None,
            "some-path",
            "SageMaker input schema is required.",
        ),
        (
            CHAT_IDENTIFIER,
            SAGEMAKER_PROMPT,
            True,
            model_id,
            "fake-endpoint",
            input_schema,
            "",
            "SageMaker response JSONPath is required.",
        ),
        (
            CHAT_IDENTIFIER,
            SAGEMAKER_PROMPT,
            True,
            model_id,
            "fake-endpoint",
            input_schema,
            None,
            "SageMaker response JSONPath is required.",
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
    with pytest.raises(ValueError) as error:
        SageMakerLLM(
            llm_params=llm_params,
            model_defaults=ModelDefaults(model_provider, model_id, RAG_ENABLED),
            sagemaker_endpoint_name=sagemaker_endpoint,
            input_schema=input_schema,
            response_jsonpath=response_jsonpath,
            rag_enabled=False,
        )

    assert error.value.args[0] == error_message


@pytest.mark.parametrize(
    "use_case, prompt, is_streaming, model_id, chat_fixture",
    [
        (CHAT_IDENTIFIER, SAGEMAKER_PROMPT, False, model_id, "streamless_chat"),
        (CHAT_IDENTIFIER, SAGEMAKER_PROMPT, True, model_id, "streaming_chat"),
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
        assert chat.api_token is None
        assert chat.prompt_template.template == prompt
        assert chat.prompt_template.input_variables == DEFAULT_PLACEHOLDERS
        assert chat.sagemaker_endpoint_name == "fake-endpoint"
        assert chat.input_schema == input_schema
        assert chat.response_jsonpath == "$.generated_text"
        assert chat.model_params["topP"] == 0.2
        assert chat.model_params["maxTokenCount"] == 512
        # when not provided, default temperature is not set
        assert chat.model_params.get("temperature") is None
        assert chat.streaming == is_streaming
        assert chat.verbose == False
        assert chat.knowledge_base == None
        assert chat.conversation_memory.chat_memory.messages == []
        assert type(chat.conversation_chain) == ConversationChain
    except NotImplementedError as ex:
        raise Exception(ex)


@pytest.mark.parametrize(
    "use_case, prompt, is_streaming, model_id, chat_fixture",
    [
        (CHAT_IDENTIFIER, SAGEMAKER_PROMPT, False, model_id, "streamless_chat"),
        (CHAT_IDENTIFIER, SAGEMAKER_PROMPT, True, model_id, "streaming_chat"),
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
        "langchain.chains.ConversationChain.predict",
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
        ),
        (CHAT_IDENTIFIER, SAGEMAKER_PROMPT, True, model_id),
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
                    "inputs": SAGEMAKER_PROMPT.replace("{history}", "").replace(
                        "{input}", "What is the weather in Seattle?"
                    )
                }
            ).encode("utf-8"),
            "ContentType": "application/json",
            "EndpointName": "fake-endpoint",
        },
    )
    llm_params.streaming = False
    endpoint_name = "fake-endpoint"
    chat = SageMakerLLM(
        llm_params=llm_params,
        model_defaults=ModelDefaults(model_provider, model_id, RAG_ENABLED),
        sagemaker_endpoint_name=endpoint_name,
        input_schema=input_schema,
        response_jsonpath="$.generated_text",
        rag_enabled=False,
    )

    with pytest.raises(LLMInvocationError) as error:
        chat.generate("What is the weather in Seattle?")

    assert error.value.args[0] == (
        f"Error occurred while invoking SageMaker endpoint: '{endpoint_name}'. "
        "Error raised by inference endpoint: An error occurred (InternalServerError) when calling the InvokeEndpoint operation: some-error"
    )


@pytest.mark.parametrize(
    "use_case, prompt, is_streaming, model_id, chat_fixture",
    [
        (CHAT_IDENTIFIER, SAGEMAKER_PROMPT, False, model_id, "streamless_chat"),
        (CHAT_IDENTIFIER, SAGEMAKER_PROMPT, True, model_id, "streaming_chat"),
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
    llm_params.streaming = is_streaming
    llm_params.model_params["stopSequences"] = {
        "Type": "list",
        "Value": '["\n\nAI:", "\n\nHuman:",  "|"]',
    }
    chat = SageMakerLLM(
        llm_params=llm_params,
        model_defaults=ModelDefaults(model_provider, model_id, RAG_ENABLED),
        sagemaker_endpoint_name="fake-endpoint",
        input_schema=input_schema,
        response_jsonpath="$.generated_text",
        rag_enabled=False,
    )
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
    ) = chat.get_clean_params(
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
