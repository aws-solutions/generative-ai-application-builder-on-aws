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
from unittest.mock import MagicMock

import pytest
from langchain import HuggingFaceHub
from llm_models.huggingface import HuggingFaceLLM
from shared.memory.ddb_chat_memory import DynamoDBChatMemory
from shared.memory.ddb_enhanced_message_history import DynamoDBChatMessageHistory
from utils.constants import (
    DEFAULT_HUGGINGFACE_MODEL,
    DEFAULT_HUGGINGFACE_PLACEHOLDERS,
    DEFAULT_HUGGINGFACE_PROMPT,
    DEFAULT_HUGGINGFACE_TEMPERATURE,
)
from utils.custom_exceptions import LLMBuildError

STOP_SEQUENCES = [
    "\nHuman:",
    "\nAI:",
    "\n\nHuman:",
    "\n\nAI:",
]


@pytest.fixture(autouse=True)
def chat(setup_environment):
    chat = HuggingFaceLLM(
        api_token="fake-token",
        conversation_memory=DynamoDBChatMemory(
            DynamoDBChatMessageHistory("fake-table", "fake-conversation-id", "fake-user-id")
        ),
        knowledge_base=None,
        model=DEFAULT_HUGGINGFACE_MODEL,
        inference_endpoint=None,
        model_params={
            "max_length": {"Type": "integer", "Value": "100"},
            "top_p": {"Type": "float", "Value": "0.2"},
        },
        prompt_template=DEFAULT_HUGGINGFACE_PROMPT,
        streaming=False,
        verbose=False,
        temperature=DEFAULT_HUGGINGFACE_TEMPERATURE,
        rag_enabled=False,
    )
    yield chat


@pytest.fixture(autouse=False)
def inference_chat(setup_environment):
    with mock.patch(
        "llm_models.huggingface.HuggingFaceEndpoint",
        return_value=MagicMock(),
    ):
        with mock.patch(
            "llm_models.huggingface.HuggingFaceLLM.get_conversation_chain",
            return_value=MagicMock(),
        ):
            inference_chat = HuggingFaceLLM(
                api_token="fake-token",
                conversation_memory=DynamoDBChatMemory(
                    DynamoDBChatMessageHistory("fake-table", "fake-conversation-id", "fake-user-id")
                ),
                knowledge_base=None,
                model=None,
                inference_endpoint="fake-endpoint-url",
                model_params={
                    "max_length": {"Type": "integer", "Value": "100"},
                    "top_p": {"Type": "float", "Value": "0.2"},
                },
                prompt_template=DEFAULT_HUGGINGFACE_PROMPT,
                streaming=False,
                verbose=False,
                rag_enabled=False,
            )
            yield inference_chat


def test_implement_error_not_raised(chat):
    try:
        assert chat.model == DEFAULT_HUGGINGFACE_MODEL
        assert type(chat.llm) == HuggingFaceHub
        assert chat.prompt_template.template == DEFAULT_HUGGINGFACE_PROMPT
        assert chat.prompt_template.input_variables == DEFAULT_HUGGINGFACE_PLACEHOLDERS
        assert chat.model_params == {
            "max_length": 100,
            "temperature": DEFAULT_HUGGINGFACE_TEMPERATURE,
            "top_p": 0.2,
        }
        assert chat.api_token == "fake-token"
        assert chat.streaming == False
        assert chat.verbose == False
        assert chat.knowledge_base == None
        assert chat.conversation_memory.chat_memory.messages == []
        assert chat.stop_sequences == STOP_SEQUENCES
    except NotImplementedError as ex:
        raise Exception(ex)


def test_inference_error_not_raised(inference_chat):
    try:
        assert inference_chat.model == None
        assert inference_chat.inference_endpoint == "fake-endpoint-url"
        assert inference_chat.prompt_template.template == DEFAULT_HUGGINGFACE_PROMPT
        assert inference_chat.prompt_template.input_variables == DEFAULT_HUGGINGFACE_PLACEHOLDERS
        assert inference_chat.model_params == {
            "max_length": 100,
            "temperature": DEFAULT_HUGGINGFACE_TEMPERATURE,
            "top_p": 0.2,
        }
        assert inference_chat.api_token == "fake-token"
        assert inference_chat.streaming == False
        assert inference_chat.verbose == False
        assert inference_chat.knowledge_base == None
        assert inference_chat.conversation_memory.chat_memory.messages == []
        assert inference_chat.stop_sequences == STOP_SEQUENCES
    except NotImplementedError as ex:
        raise Exception(ex)


def test_exception_for_failed_model_incorrect_repo(setup_environment):
    with pytest.raises(LLMBuildError) as error:
        HuggingFaceLLM(
            api_token="fake-token",
            conversation_memory=DynamoDBChatMemory(
                DynamoDBChatMessageHistory("fake-table", "fake-conversation-id", "fake-user-id")
            ),
            knowledge_base=None,
            model="fake-model",
            inference_endpoint=None,
            model_params={
                "max_length": {"Type": "integer", "Value": "100"},
                "top_p": {"Type": "float", "Value": "0.2"},
            },
            prompt_template=DEFAULT_HUGGINGFACE_PROMPT,
            streaming=False,
            verbose=False,
        )

    assert "HuggingFace model construction failed. Ensure fake-model is correct repo name." in error.value.args[0]
    assert "Repository Not Found for url: https://huggingface.co/api/models/fake-model.\nPlease make sure you specified the correct `repo_id` and `repo_type`.\nIf you are trying to access a private or gated repo, make sure you are authenticated."


def test_huggingface_incorrect_api_key(chat):
    with pytest.raises(LLMBuildError) as error:
        with mock.patch("langchain.llms.huggingface_hub.HuggingFaceHub._call") as mocked_hub_call:
            mocked_hub_call.side_effect = ValueError(
                "Error raised by inference API: Authorization header is correct, but the token seems invalid"
            )
            chat.generate("Hello")

        assert (
            error.value.args[0]
            == "Error raised by inference API: Authorization header is correct, but the token seems invalid"
        )


def test_huggingface_inference_incorrect_api_key():
    with pytest.raises(LLMBuildError) as error:
        HuggingFaceLLM(
            api_token="fake-token",
            conversation_memory=DynamoDBChatMemory(
                DynamoDBChatMessageHistory("fake-table", "fake-conversation-id", "fake-user-id")
            ),
            knowledge_base=None,
            model=None,
            inference_endpoint="fake-endpoint-url",
            model_params={
                "max_length": {"Type": "integer", "Value": "100"},
                "top_p": {"Type": "float", "Value": "0.2"},
            },
            prompt_template=DEFAULT_HUGGINGFACE_PROMPT,
            streaming=False,
            verbose=False,
        )

    assert error.value.args[0] == (
        "HuggingFace model construction failed due to incorrect model params or endpoint URL (HuggingFaceEndpoint) passed to the model. "
        "Error: 1 validation error for HuggingFaceEndpoint\n__root__\n  Could not authenticate with huggingface_hub. Please check your API token. (type=value_error)"
    )


def test_generate_huggingface(chat):
    with mock.patch("langchain.chains.ConversationChain.predict") as mocked_predict:
        mocked_predict.return_value = "I'm doing well, how are you?"
        assert chat.generate("Hi there") == {"answer": "I'm doing well, how are you?"}


def test_model_get_clean_model_params(chat):
    model_params = {
        "max_length": {"Type": "integer", "Value": "100"},
        "top_p": {"Type": "float", "Value": "0.2"},
    }
    response = chat.get_clean_model_params(model_params)
    assert response == {"top_p": 0.2, "temperature": DEFAULT_HUGGINGFACE_TEMPERATURE, "max_length": 100}


def test_huggingface_inference_get_clean_model_params(inference_chat):
    model_params = {
        "max_length": {"Type": "integer", "Value": "100"},
        "top_k": {"Type": "integer", "Value": "1"},
    }
    response = inference_chat.get_clean_model_params(model_params)
    assert response == {
        "top_k": 1,
        "temperature": DEFAULT_HUGGINGFACE_TEMPERATURE,
        "max_length": 100,
    }
