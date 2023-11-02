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
from contextlib import nullcontext as does_not_raise
from unittest.mock import patch

import pytest
from botocore.exceptions import ClientError
from clients.builders.huggingface_builder import HuggingFaceBuilder
from clients.huggingface_client import HuggingFaceClient
from llm_models.huggingface import HuggingFaceLLM
from utils.constants import (
    CONVERSATION_ID_EVENT_KEY,
    DEFAULT_HUGGINGFACE_PLACEHOLDERS,
    DEFAULT_HUGGINGFACE_PROMPT,
    LLM_PARAMETERS_SSM_KEY_ENV_VAR,
    PROMPT_LENGTH,
    QUESTION_EVENT_KEY,
    RAG_ENABLED_ENV_VAR,
    USER_ID_EVENT_KEY,
    USER_QUERY_LENGTH,
)
from utils.enum_types import LLMProviderTypes

# Testing LLMChatClient using subclass

PROMPT = """The following is a conversation between a human and an AI. The AI is talkative and provides lots of specific details from its context. If the AI does not know the answer to a question, it says "Sorry I dont know".
Current conversation:
{history}

Human: {input}

AI:"""


@pytest.fixture(autouse=True)
def llm_client():
    yield HuggingFaceClient(rag_enabled=False, connection_id="fake-connection_id")


def test_no_body(setup_environment, llm_client):
    with pytest.raises(ValueError) as error:
        llm_client.check_event({"connectionId": "fake-id"})

    assert error.value.args[0] == "Event body is empty"


def test_empty_body(setup_environment, llm_client):
    with pytest.raises(ValueError) as error:
        llm_client.check_event({"connectionId": "fake-id", "body": {}})

    assert error.value.args[0] == "Event body is empty"


def test_missing_user_id(setup_environment, llm_client):
    with pytest.raises(ValueError) as error:
        llm_client.check_event({"connectionId": "fake-id", "body": '{"some-key": "some-value"}'})

    assert error.value.args[0] == f"{USER_ID_EVENT_KEY} is missing from the requestContext"


def test_body_missing_required_fields(setup_environment, llm_client):
    with pytest.raises(ValueError) as error:
        llm_client.check_event(
            {
                "requestContext": {"authorizer": {USER_ID_EVENT_KEY: "fake-user-id"}},
                "connectionId": "fake-id",
                "body": '{"some-key": "some-value"}',
            }
        )

    assert error.value.args[0] == f"{QUESTION_EVENT_KEY} is missing from the chat event"


def test_prompt_valid_length(llm_client):
    valid_prompt = "p" * PROMPT_LENGTH
    with does_not_raise():
        llm_client.check_event(
            {
                "requestContext": {"authorizer": {USER_ID_EVENT_KEY: "fake-user-id"}},
                "connectionId": "fake-id",
                "body": json.dumps({"question": "Hi", "promptTemplate": valid_prompt}),
            }
        )


def test_prompt_invalid_length(setup_environment, llm_client):
    invalid_prompt = "p" * (PROMPT_LENGTH + 1)
    with pytest.raises(ValueError) as error:
        llm_client.check_event(
            {
                "requestContext": {"authorizer": {USER_ID_EVENT_KEY: "fake-user-id"}},
                "connectionId": "fake-id",
                "body": json.dumps({"question": "Hi", "promptTemplate": invalid_prompt}),
            }
        )

    assert (
        error.value.args[0]
        == f"Prompt shouldn't be empty and should be less than {PROMPT_LENGTH} characters. Provided prompt length has length: {len(invalid_prompt)}"
    )


def test_question_valid_length(llm_client):
    valid_question = "q" * USER_QUERY_LENGTH

    with does_not_raise():
        llm_client.check_event(
            {
                "requestContext": {"authorizer": {USER_ID_EVENT_KEY: "fake-user-id"}},
                "connectionId": "fake-id",
                "body": json.dumps({"question": valid_question}),
            }
        )


def test_question_invalid_length(setup_environment, llm_client):
    invalid_question = "q" * (USER_QUERY_LENGTH + 1)
    with pytest.raises(ValueError) as error:
        llm_client.check_event(
            {
                "requestContext": {"authorizer": {USER_ID_EVENT_KEY: "fake-user-id"}},
                "connectionId": "fake-id",
                "body": json.dumps({"question": invalid_question}),
            }
        )

    assert (
        error.value.args[0]
        == f"User query should be less than {USER_QUERY_LENGTH} characters. Provided query has length: {len(invalid_question)}"
    )


def test_empty_question(setup_environment, llm_client):
    with pytest.raises(ValueError) as error:
        llm_client.check_event(
            {
                "requestContext": {"authorizer": {USER_ID_EVENT_KEY: "fake-user-id"}},
                "connectionId": "fake-id",
                "body": json.dumps({"question": ""}),
            }
        )

    assert error.value.args[0] == f"{QUESTION_EVENT_KEY} is missing from the chat event"


def test_multiple_length_issues(setup_environment, llm_client):
    invalid_question = "q" * (USER_QUERY_LENGTH + 1)
    invalid_prompt = "p" * (PROMPT_LENGTH + 1)

    with pytest.raises(ValueError) as error:
        llm_client.check_event(
            {
                "requestContext": {"authorizer": {USER_ID_EVENT_KEY: "fake-user-id"}},
                "connectionId": "fake-id",
                "body": json.dumps({"question": invalid_question, "promptTemplate": invalid_prompt}),
            }
        )

    assert error.value.args[0] == (
        f"Prompt shouldn't be empty and should be less than {PROMPT_LENGTH} characters. Provided prompt length has length: {len(invalid_prompt)}\n"
        f"User query should be less than {USER_QUERY_LENGTH} characters. Provided query has length: {len(invalid_question)}"
    )


def test_get_event_conversation_id(llm_client):
    event_body = {"some-key": "some-value"}

    with patch("clients.llm_chat_client.uuid4") as mocked_uuid:
        mocked_uuid.return_value = "mock-uuid-str"
        response = llm_client.get_event_conversation_id(event_body)
        assert response == "mock-uuid-str"


def test_env_not_set(setup_environment, llm_client):
    os.environ.pop(LLM_PARAMETERS_SSM_KEY_ENV_VAR, None)
    os.environ.pop(RAG_ENABLED_ENV_VAR, None)
    with pytest.raises(ValueError) as error:
        llm_client.check_env()

    assert (
        error.value.args[0]
        == f"Missing required environment variable {LLM_PARAMETERS_SSM_KEY_ENV_VAR}.\nMissing required environment variable {RAG_ENABLED_ENV_VAR}."
    )


def test_env_set(setup_environment, llm_client):
    assert llm_client.check_env() is None


@pytest.mark.parametrize("prompt, is_streaming, rag_enabled", [(DEFAULT_HUGGINGFACE_PROMPT, False, False)])
def test_parent_get_llm_config(ssm_stubber, llm_config, setup_environment, llm_client):
    ssm_stubber.add_response("get_parameter", llm_config)
    ssm_stubber.activate()
    assert llm_client.get_llm_config() == json.loads(llm_config["Parameter"]["Value"])
    ssm_stubber.deactivate()


def test_parent_get_llm_config_missing_env(setup_environment, llm_client):
    os.environ.pop(LLM_PARAMETERS_SSM_KEY_ENV_VAR, None)
    with pytest.raises(ValueError) as error:
        llm_client.get_llm_config()
    assert error.value.args[0] == f"Missing required environment variable {LLM_PARAMETERS_SSM_KEY_ENV_VAR}."


def test_parent_get_llm_config_parameter_not_found(ssm_stubber, setup_environment, llm_client):
    os.environ[LLM_PARAMETERS_SSM_KEY_ENV_VAR] = "/chat/admin-uuid/HuggingFace"
    error_msg = f"SSM Parameter {os.environ[LLM_PARAMETERS_SSM_KEY_ENV_VAR]} not found."

    with pytest.raises(ValueError) as error:
        ssm_stubber.add_client_error(
            "get_parameter",
            service_error_code="ParameterNotFound",
            service_message=error_msg,
            expected_params={"Name": "/chat/admin-uuid/HuggingFace", "WithDecryption": True},
        )
        ssm_stubber.activate()
        llm_client.get_llm_config()
        ssm_stubber.deactivate()

    assert error.value.args[0] == error_msg


def test_parent_get_llm_config_client_exceptions(ssm_stubber, setup_environment, llm_client):
    with pytest.raises(ClientError) as error:
        ssm_stubber.add_client_error(
            "get_parameter",
            service_error_code="InternalServerError",
            service_message="some-error",
            expected_params={"Name": "fake-ssm-param", "WithDecryption": True},
        )
        ssm_stubber.activate()
        llm_client.get_llm_config()
        ssm_stubber.deactivate()

    assert (
        error.value.args[0]
        == "An error occurred (InternalServerError) when calling the GetParameter operation: some-error"
    )


def test_construct_chat_model(llm_config, llm_client):
    config = json.loads(llm_config["Parameter"]["Value"])
    llm_client.builder = HuggingFaceBuilder(llm_config=config, rag_enabled=False)
    llm_client.construct_chat_model("fake-user-id", "fake-conversation-id", LLMProviderTypes.HUGGING_FACE.value)

    # assert that HuggingFaceLLM is returned with the values passed in config
    assert type(llm_client.builder.llm_model) == HuggingFaceLLM
    assert llm_client.builder.llm_model.model == config["LlmParams"]["ModelId"]
    assert llm_client.builder.llm_model.api_token == "fake-secret-value"
    assert llm_client.builder.llm_model.model_params == config["LlmParams"]["ModelParams"]
    assert llm_client.builder.llm_model.prompt_template.template == config["LlmParams"]["PromptTemplate"]
    assert llm_client.builder.llm_model.prompt_template.input_variables == DEFAULT_HUGGINGFACE_PLACEHOLDERS
    assert llm_client.builder.llm_model.streaming == config["LlmParams"]["Streaming"]
    assert llm_client.builder.llm_model.verbose == config["LlmParams"]["Verbose"]


def test_construct_chat_model(llm_client):
    with pytest.raises(ValueError) as error:
        llm_client.construct_chat_model("fake-user-id", "fake-conversation-id", LLMProviderTypes.HUGGING_FACE.value)

    assert error.value.args[0] == "Builder is not set for this LLMChatClient."


@pytest.mark.parametrize("prompt, is_streaming, rag_enabled", [(DEFAULT_HUGGINGFACE_PROMPT, False, False)])
def test_construct_chat_model_missing_params(llm_config, llm_client):
    with pytest.raises(ValueError) as user_error:
        llm_client.construct_chat_model(None, "fake-conversation-id", LLMProviderTypes.HUGGING_FACE.value)

    assert (
        user_error.value.args[0]
        == f"Missing required parameters {USER_ID_EVENT_KEY}, {CONVERSATION_ID_EVENT_KEY} in the event."
    )

    with pytest.raises(ValueError) as conversation_error:
        llm_client.construct_chat_model("user-id", None, LLMProviderTypes.HUGGING_FACE.value)

    assert (
        conversation_error.value.args[0]
        == f"Missing required parameters {USER_ID_EVENT_KEY}, {CONVERSATION_ID_EVENT_KEY} in the event."
    )


@pytest.mark.parametrize("prompt, is_streaming, rag_enabled", [(DEFAULT_HUGGINGFACE_PROMPT, False, False)])
def test_construct_chat_model_new_prompt(llm_config, ssm_stubber, setup_environment, setup_secret, llm_client):
    chat_body = {
        "action": "sendMessage",
        "conversationId": "fake-conversation-id",
        "question": "How are you?",
        "promptTemplate": PROMPT,
    }

    ssm_stubber.add_response("get_parameter", llm_config)
    ssm_stubber.activate()

    llm_client.get_model(chat_body, "fake-user-uuid")

    assert llm_client.llm_config["LlmParams"]["PromptTemplate"] == PROMPT
    assert llm_client.builder.llm_model.prompt_template.template == PROMPT

    ssm_stubber.deactivate()
