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
from typing import Any
from unittest import mock
from unittest.mock import MagicMock

import pytest
from huggingface_hub.utils import RepositoryNotFoundError
from langchain_community.llms.huggingface_hub import HuggingFaceHub
from llms.huggingface import HuggingFaceLLM
from llms.models.llm import LLM
from shared.defaults.model_defaults import ModelDefaults
from shared.memory.ddb_chat_memory import DynamoDBChatMemory
from shared.memory.ddb_enhanced_message_history import DynamoDBChatMessageHistory
from utils.constants import (
    CHAT_IDENTIFIER,
    DEFAULT_HUGGINGFACE_TASK,
    DEFAULT_MODELS_MAP,
    DEFAULT_PLACEHOLDERS,
    DEFAULT_TEMPERATURE,
    MODEL_INFO_TABLE_NAME_ENV_VAR,
)
from utils.custom_exceptions import LLMBuildError, LLMInvocationError
from utils.enum_types import LLMProviderTypes

RAG_ENABLED = False
CONDENSE_QUESTION_PROMPT = """Given the following conversation and a follow up question, rephrase the follow up question to be a standalone question, in its original language.\n\nChat History:\n{chat_history}\nFollow Up Input: {question}\nStandalone question:"""
HUGGINGFACE_PROMPT = """\n\n{history}\n\n{input}"""
model_id = "google/flan-t5-xxl"
provider_name = "HuggingFace"
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
            "top_p": {"Type": "float", "Value": "0.2"},
            "max_length": {"Type": "integer", "Value": "100"},
        },
        "prompt_template": HUGGINGFACE_PROMPT,
        "prompt_placeholders": DEFAULT_PLACEHOLDERS,
        "streaming": False,
        "verbose": False,
        "temperature": DEFAULT_TEMPERATURE,
        "callbacks": None,
    }
)


@pytest.fixture
def chat(setup_environment, model_id):
    llm_params.model = model_id
    llm_params.streaming = False
    inference_endpoint = None
    chat = HuggingFaceLLM(
        llm_params=llm_params,
        model_defaults=ModelDefaults(provider_name, model_id, RAG_ENABLED),
        inference_endpoint=inference_endpoint,
        rag_enabled=RAG_ENABLED,
    )
    yield chat


@pytest.fixture
def inference_chat(setup_environment, expected_response, model_id):
    llm_params.model = model_id  # this value is used to retrieve appropriate model-info defaults
    inference_endpoint = "fake-endpoint-url"

    class MockConversationChainClass:
        def predict(self, *args: Any, **kwargs: Any) -> Any:
            return expected_response

    with mock.patch(
        "llms.huggingface.HuggingFaceEndpoint",
        return_value=MagicMock(),
    ):
        with mock.patch("llms.huggingface.HuggingFaceLLM.get_conversation_chain") as mocked_chain:
            mocked_chain.return_value = MockConversationChainClass()
            inference_chat = HuggingFaceLLM(
                llm_params=llm_params,
                model_defaults=ModelDefaults(provider_name, llm_params.model, RAG_ENABLED),
                inference_endpoint=inference_endpoint,
                rag_enabled=RAG_ENABLED,
            )
            yield inference_chat


@pytest.fixture
def temp_huggingface_dynamodb_defaults_table(
    dynamodb_resource,
    dynamodb_defaults_table,
    prompt,
    use_case,
    is_streaming,
    model_provider,
    model_id,
):
    model_provider = model_provider
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
                "ai_prefix": "AI",
                "human_prefix": "Human",
                "output": output_key,
            },
            "MinTemperature": "0",
            "ModelName": model_id,
            "ModelProviderName": model_provider,
            "Prompt": prompt,
            "DefaultStopSequences": ["\n\n"],
            "DisambiguationPrompt": CONDENSE_QUESTION_PROMPT,
        }
    )


@pytest.mark.parametrize(
    "use_case, model_id, prompt, is_streaming, chat_fixture",
    [(CHAT_IDENTIFIER, "google/flan-t5-xxl-extra", HUGGINGFACE_PROMPT, False, "chat")],
)
def test_implement_error_not_raised(
    use_case,
    model_id,
    prompt,
    is_streaming,
    setup_environment,
    request,
    chat_fixture,
    huggingface_dynamodb_defaults_table,
):
    with mock.patch("huggingface_hub.inference_api.InferenceApi") as mocked_hf_call:
        mock_obj = MagicMock()
        mock_obj.task = DEFAULT_HUGGINGFACE_TASK
        mocked_hf_call.return_value = mock_obj
        chat = request.getfixturevalue(chat_fixture)
        try:
            assert chat.model == model_id
            assert type(chat.llm) == HuggingFaceHub
            assert chat.prompt_template.template == HUGGINGFACE_PROMPT
            assert chat.prompt_template.input_variables == DEFAULT_PLACEHOLDERS
            assert chat.model_params == {
                "max_length": 100,
                "temperature": DEFAULT_TEMPERATURE,
                "top_p": 0.2,
            }
            assert chat.api_token == "fake-token"
            assert chat.streaming == False
            assert chat.verbose == False
            assert chat.knowledge_base == None
            assert chat.conversation_memory.chat_memory.messages == []
            assert chat.stop_sequences == []
            assert chat.model_params["top_p"] == 0.2
            assert chat.model_params["max_length"] == 100
            assert chat.model_params["temperature"] == 0.0
        except NotImplementedError as ex:
            raise Exception(ex)


@pytest.mark.parametrize(
    "use_case, model_id, prompt, is_streaming, chat_fixture, expected_response",
    [(CHAT_IDENTIFIER, model_id, HUGGINGFACE_PROMPT, False, "inference_chat", None)],
)
def test_inference_error_not_raised(
    use_case,
    model_id,
    prompt,
    is_streaming,
    request,
    chat_fixture,
    expected_response,
    setup_environment,
    huggingface_dynamodb_defaults_table,
):
    with mock.patch("huggingface_hub.inference_api.InferenceApi") as mocked_hf_call:
        mock_obj = MagicMock()
        mock_obj.task = DEFAULT_HUGGINGFACE_TASK
        mocked_hf_call.return_value = mock_obj
        inference_chat = request.getfixturevalue(chat_fixture)
        try:
            assert inference_chat.model is None
            assert inference_chat.inference_endpoint == "fake-endpoint-url"
            assert inference_chat.prompt_template.template == HUGGINGFACE_PROMPT
            assert inference_chat.prompt_template.input_variables == DEFAULT_PLACEHOLDERS
            assert inference_chat.model_params == {
                "max_length": 100,
                "temperature": DEFAULT_TEMPERATURE,
                "top_p": 0.2,
            }
            assert inference_chat.api_token == "fake-token"
            assert inference_chat.streaming == False
            assert inference_chat.verbose == False
            assert inference_chat.knowledge_base == None
            assert inference_chat.conversation_memory.chat_memory.messages == []
            assert inference_chat.stop_sequences == []
        except NotImplementedError as ex:
            raise Exception(ex)


@pytest.mark.parametrize(
    "use_case, model_id, prompt, is_streaming",
    [(CHAT_IDENTIFIER, "google/flan-t5-xxl", HUGGINGFACE_PROMPT, False)],
)
def test_exception_for_failed_model_incorrect_repo(
    use_case, model_id, prompt, is_streaming, setup_environment, huggingface_dynamodb_defaults_table
):
    with mock.patch("huggingface_hub.inference_api.InferenceApi") as mocked_hf_call:
        mocked_hf_call.side_effect = RepositoryNotFoundError(
            "Repository Not Found for url: https://huggingface.co/api/models/fake-model.\nPlease make sure you specified the correct `repo_id` and `repo_type`.\nIf you are trying to access a private or gated repo, make sure you are authenticated."
        )
        with pytest.raises(LLMBuildError) as error:
            llm_params.model = model_id
            inference_endpoint = None
            HuggingFaceLLM(
                llm_params=llm_params,
                model_defaults=ModelDefaults(provider_name, model_id, False),
                inference_endpoint=inference_endpoint,
                rag_enabled=False,
            )

        assert f"HuggingFace model construction failed. Ensure {model_id} is correct repo name." in error.value.args[0]
        assert "Repository Not Found for url: https://huggingface.co/api/models/fake-model.\nPlease make sure you specified the correct `repo_id` and `repo_type`.\nIf you are trying to access a private or gated repo, make sure you are authenticated."


@pytest.mark.parametrize(
    "use_case, model_id, prompt, is_streaming, chat_fixture",
    [(CHAT_IDENTIFIER, "google/flan-t5-xxl", HUGGINGFACE_PROMPT, False, "chat")],
)
def test_huggingface_model_api_error(
    use_case,
    model_id,
    prompt,
    chat_fixture,
    request,
    is_streaming,
    setup_environment,
    huggingface_dynamodb_defaults_table,
):
    with mock.patch("huggingface_hub.inference_api.InferenceApi") as mocked_hf_call:
        mocked_hf_call.side_effect = ValueError(
            "Error raised by inference API: Authorization header is correct, but the token seems invalid"
        )
        with pytest.raises(LLMBuildError) as error:
            HuggingFaceLLM(
                llm_params=llm_params,
                model_defaults=ModelDefaults(provider_name, model_id, RAG_ENABLED),
                inference_endpoint=None,
                rag_enabled=False,
            )

        assert (
            "Error raised by inference API: Authorization header is correct, but the token seems invalid"
            in error.value.args[0]
        )


@pytest.mark.parametrize(
    "use_case, model_id, prompt, is_streaming",
    [(CHAT_IDENTIFIER, "google/flan-t5-xxl", HUGGINGFACE_PROMPT, False)],
)
def test_huggingface_inference_api_error(
    use_case, model_id, prompt, is_streaming, setup_environment, huggingface_dynamodb_defaults_table
):
    with mock.patch("llms.huggingface.HuggingFaceEndpoint") as mocked_model:
        mocked_model.side_effect = ValueError("some-error")
        with pytest.raises(LLMBuildError) as error:
            llm_params.model = None
            inference_endpoint = "fake-endpoint-url"

            # creation of the 'HuggingFaceEndpoint' class itself throws an error
            HuggingFaceLLM(
                llm_params=llm_params,
                model_defaults=ModelDefaults(provider_name, model_id, RAG_ENABLED),
                inference_endpoint=inference_endpoint,
                rag_enabled=False,
            )

    assert (
        error.value.args[0]
        == "HuggingFace model construction failed due to incorrect model params or endpoint URL (HuggingFaceEndpoint) passed to the model. some-error"
    )


@pytest.mark.parametrize(
    "use_case, model_id, prompt, is_streaming, chat_fixture, expected_response",
    [
        (CHAT_IDENTIFIER, "google/flan-t5-xxl", HUGGINGFACE_PROMPT, False, "chat", "I'm doing well, how are you?"),
        (
            CHAT_IDENTIFIER,
            "google/flan-t5-xxl",
            HUGGINGFACE_PROMPT,
            False,
            "inference_chat",
            "I'm doing well, how are you?",
        ),
    ],
)
def test_generate_huggingface(
    use_case,
    model_id,
    prompt,
    is_streaming,
    setup_environment,
    chat_fixture,
    request,
    expected_response,
    huggingface_dynamodb_defaults_table,
):
    with mock.patch("huggingface_hub.inference_api.InferenceApi") as mocked_hf_call:
        with mock.patch("langchain.chains.ConversationChain.predict", return_value=expected_response):
            mock_obj = MagicMock()
            mock_obj.task = DEFAULT_HUGGINGFACE_TASK
            mocked_hf_call.return_value = mock_obj
            chat = request.getfixturevalue(chat_fixture)
            assert chat.generate("Hi there") == {"answer": "I'm doing well, how are you?"}


@pytest.mark.parametrize(
    "use_case, model_id, prompt, is_streaming, chat_fixture",
    [(CHAT_IDENTIFIER, "google/flan-t5-xxl-extra", HUGGINGFACE_PROMPT, False, "chat")],
)
def test_exception_in_generate(
    use_case,
    model_id,
    prompt,
    is_streaming,
    setup_environment,
    request,
    chat_fixture,
    huggingface_dynamodb_defaults_table,
):
    with mock.patch("huggingface_hub.inference_api.InferenceApi") as mocked_hf_call:
        mock_obj = MagicMock()
        mock_obj.task = DEFAULT_HUGGINGFACE_TASK
        mocked_hf_call.return_value = mock_obj
        chat = request.getfixturevalue(chat_fixture)

        with mock.patch("langchain.chains.ConversationChain.predict") as mocked_predict:
            mocked_predict.side_effect = ValueError("AuthenticationError: Incorrect API key.")
            with pytest.raises(LLMInvocationError) as error:
                chat.generate("What's the capital of France?")

            assert (
                f"Error occurred while invoking Hugging Face {model_id} model. Ensure that the API key supplied is correct. AuthenticationError: Incorrect API key."
                in error.value.args[0]
            )


@pytest.mark.parametrize(
    "use_case, model_id, prompt, is_streaming, chat_fixture",
    [(CHAT_IDENTIFIER, "google/flan-t5-xxl", HUGGINGFACE_PROMPT, False, "chat")],
)
def test_model_get_clean_model_params(
    use_case,
    model_id,
    prompt,
    is_streaming,
    setup_environment,
    chat_fixture,
    request,
    huggingface_dynamodb_defaults_table,
):
    with mock.patch("huggingface_hub.inference_api.InferenceApi") as mocked_hf_call:
        mock_obj = MagicMock()
        mock_obj.task = DEFAULT_HUGGINGFACE_TASK
        mocked_hf_call.return_value = mock_obj
        chat = request.getfixturevalue(chat_fixture)
        model_params = {
            "max_length": {"Type": "integer", "Value": "100"},
            "top_p": {"Type": "float", "Value": "0.2"},
        }
        response = chat.get_clean_model_params(model_params)
        assert response == {"top_p": 0.2, "temperature": DEFAULT_TEMPERATURE, "max_length": 100}


@pytest.mark.parametrize(
    "use_case, model_id, prompt, is_streaming, chat_fixture, expected_response",
    [(CHAT_IDENTIFIER, "google/flan-t5-xxl", HUGGINGFACE_PROMPT, False, "inference_chat", None)],
)
def test_endpoint_get_clean_model_params(
    use_case,
    model_id,
    prompt,
    is_streaming,
    setup_environment,
    chat_fixture,
    request,
    expected_response,
    huggingface_dynamodb_defaults_table,
):
    inference_chat = request.getfixturevalue(chat_fixture)
    model_params = {
        "max_length": {"Type": "integer", "Value": "100"},
        "top_k": {"Type": "integer", "Value": "1"},
    }
    response = inference_chat.get_clean_model_params(model_params)
    assert response == {
        "top_k": 1,
        "temperature": DEFAULT_TEMPERATURE,
        "max_length": 100,
    }


@pytest.mark.parametrize(
    "use_case, model_provider, model_id, prompt, is_streaming, ",
    [(CHAT_IDENTIFIER, "HuggingFace", "google/flan-t5-xxl", HUGGINGFACE_PROMPT, False)],
)
def test_model_default_stop_sequences(
    use_case,
    model_id,
    prompt,
    is_streaming,
    request,
    setup_environment,
    model_provider,
    temp_huggingface_dynamodb_defaults_table,
):
    with mock.patch(
        "llms.huggingface.HuggingFaceLLM.get_conversation_chain",
        return_value=MagicMock(),
    ):
        with mock.patch("huggingface_hub.inference_api.InferenceApi") as mocked_hf_call:
            mock_obj = MagicMock()
            mock_obj.task = DEFAULT_HUGGINGFACE_TASK
            mocked_hf_call.return_value = mock_obj
            llm_params.streaming = False
            llm_params.model_params = {
                "top_p": {"Type": "float", "Value": "0.04"},
                "max_tokens_to_sample": {"Type": "integer", "Value": "512"},
                "stop": {"Type": "list", "Value": '["\n\nAssistant:", "\n\nHuman:"]'},
            }

            chat = HuggingFaceLLM(
                llm_params=llm_params,
                model_defaults=ModelDefaults(model_provider, model_id, RAG_ENABLED),
                inference_endpoint=None,
                rag_enabled=False,
            )

            assert chat.model_params["top_p"] == 0.04
            assert chat.model_params["max_tokens_to_sample"] == 512
            assert chat.model_params["temperature"] == 0.0
            # default and user provided stop sequences combined
            assert sorted(chat.model_params["stop"]) == ["\n\n", "\n\nAssistant:", "\n\nHuman:"]


@pytest.mark.parametrize(
    "use_case, model_provider, model_id, prompt, is_streaming",
    [
        (CHAT_IDENTIFIER, "HuggingFace-InferenceEndpoint", "google/flan-t5-xxl", HUGGINGFACE_PROMPT, False),
        (
            CHAT_IDENTIFIER,
            "HuggingFace-InferenceEndpoint",
            DEFAULT_MODELS_MAP[LLMProviderTypes.HUGGINGFACE_ENDPOINT.value],
            HUGGINGFACE_PROMPT,
            False,
        ),
    ],
)
def test_endpoint_default_stop_sequences(
    use_case,
    model_provider,
    model_id,
    prompt,
    is_streaming,
    request,
    setup_environment,
    temp_huggingface_dynamodb_defaults_table,
):
    with mock.patch("llms.huggingface.HuggingFaceEndpoint") as mocked_model:
        with mock.patch(
            "llms.huggingface.HuggingFaceLLM.get_conversation_chain",
            return_value=MagicMock(),
        ):
            mocked_model.return_value = MagicMock()
            llm_params.streaming = False
            llm_params.model_params = {
                "top_p": {"Type": "float", "Value": "0.04"},
                "max_tokens_to_sample": {"Type": "integer", "Value": "512"},
                "stop": {"Type": "list", "Value": '["\n\nAssistant:", "\n\nHuman:"]'},
            }

            chat = HuggingFaceLLM(
                llm_params=llm_params,
                model_defaults=ModelDefaults(model_provider, model_id, RAG_ENABLED),
                inference_endpoint="fake-endpoint",
                rag_enabled=False,
            )

            assert chat.model_params["top_p"] == 0.04
            assert chat.model_params["max_tokens_to_sample"] == 512
            assert chat.model_params["temperature"] == 0.0
            # default and user provided stop sequences combined
            assert sorted(chat.model_params["stop"]) == ["\n\n", "\n\nAssistant:", "\n\nHuman:"]
