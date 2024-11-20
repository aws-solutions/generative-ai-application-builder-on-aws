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
from copy import deepcopy
from unittest.mock import patch

import pytest
from clients.bedrock_client import BedrockClient
from langchain_core.prompts import ChatPromptTemplate
from utils.constants import (
    CHAT_IDENTIFIER,
    CONVERSATION_ID_EVENT_KEY,
    MESSAGE_KEY,
    QUESTION_EVENT_KEY,
    USE_CASE_CONFIG_RECORD_KEY_ENV_VAR,
    USE_CASE_CONFIG_TABLE_NAME_ENV_VAR,
    USER_ID_EVENT_KEY,
)
from utils.enum_types import BedrockModelProviders, LLMProviderTypes

# Testing LLMChatClient using subclass
BASIC_PROMPT = """\n\n{history}\n\n{input}"""
BASIC_RAG_PROMPT = """{context}\n\n{history}\n\n{input}"""

PROMPT = """The following is a conversation between a human and an AI. The AI is talkative and provides lots of specific details from its context. If the AI does not know the answer to a question, it says "Sorry I dont know".
Current conversation:
{history}

Human: {input}

AI:"""


@pytest.fixture
def setup_test_table(dynamodb_resource, table_name):
    # Create the DynamoDB table.
    dynamodb_resource.create_table(
        TableName=table_name,
        KeySchema=[{"AttributeName": "key", "KeyType": "HASH"}],
        AttributeDefinitions=[{"AttributeName": "key", "AttributeType": "S"}],
        BillingMode="PAY_PER_REQUEST",
    )
    yield dynamodb_resource


@pytest.fixture
def simple_llm_client(basic_llm_config_parsed):
    yield BedrockClient(rag_enabled=False, connection_id="fake-connection_id", use_case_config=basic_llm_config_parsed)


@pytest.fixture
def verbose_llm_client(basic_llm_config_parsed):
    config = deepcopy(basic_llm_config_parsed)
    config["LlmParams"]["Verbose"] = True
    yield BedrockClient(rag_enabled=False, connection_id="fake-connection_id", use_case_config=config)


@pytest.fixture
def llm_client(rag_enabled, basic_llm_config_parsed):
    yield BedrockClient(
        rag_enabled=rag_enabled, connection_id="fake-connection_id", use_case_config=basic_llm_config_parsed
    )


def test_no_body(setup_environment, simple_llm_client):
    with pytest.raises(ValueError) as error:
        simple_llm_client.check_event({"connectionId": "fake-id"})

    assert error.value.args[0] == "Event body is empty"


def test_empty_body(setup_environment, simple_llm_client):
    with pytest.raises(ValueError) as error:
        simple_llm_client.check_event({"connectionId": "fake-id", "body": {}})

    assert error.value.args[0] == "Event body is empty"


def test_missing_user_id(setup_environment, simple_llm_client):
    with pytest.raises(ValueError) as error:
        simple_llm_client.check_event({"connectionId": "fake-id", "body": '{"some-key": "some-value"}'})

    assert error.value.args[0] == f"{USER_ID_EVENT_KEY} is missing from the requestContext"


def test_body_missing_required_fields(setup_environment, simple_llm_client):
    with pytest.raises(ValueError) as error:
        simple_llm_client.check_event(
            {
                "body": json.dumps(
                    {
                        "requestContext": {
                            "authorizer": {USER_ID_EVENT_KEY: "fake-user-id"},
                            "connectionId": "fake-connection-id",
                        },
                        "message": {"some-key": "some-value"},
                    }
                )
            }
        )

    assert error.value.args[0] == f"{QUESTION_EVENT_KEY} is missing from the chat event"


def test_prompt_valid_length(simple_llm_client):
    valid_prompt = "p" * 1000
    with does_not_raise():
        simple_llm_client.check_event(
            {
                "body": json.dumps(
                    {
                        "requestContext": {
                            "authorizer": {USER_ID_EVENT_KEY: "fake-user-id"},
                            "connectionId": "fake-id",
                        },
                        "message": {"question": "Hi", "promptTemplate": valid_prompt},
                    }
                )
            }
        )


def test_empty_prompt(simple_llm_client, setup_environment):
    empty_prompt = ""
    with pytest.raises(ValueError) as error:
        simple_llm_client.check_event(
            {
                "body": json.dumps(
                    {
                        "requestContext": {
                            "authorizer": {USER_ID_EVENT_KEY: "fake-user-id"},
                            "connectionId": "fake-id",
                        },
                        "message": {"question": "Hi", "promptTemplate": empty_prompt},
                    }
                )
            }
        )

        assert error.value.args[0] == "Event prompt shouldn't be empty."


def test_prompt_too_long(setup_environment, simple_llm_client):
    invalid_prompt = "p" * 1001
    with pytest.raises(ValueError) as error:
        simple_llm_client.check_event(
            {
                "body": json.dumps(
                    {
                        "requestContext": {
                            "authorizer": {USER_ID_EVENT_KEY: "fake-user-id"},
                            "connectionId": "fake-id",
                        },
                        "message": {"question": "Hi", "promptTemplate": invalid_prompt},
                    }
                )
            }
        )

    assert error.value.args[0] == "Prompt provided in the event shouldn't be greater than 1000 characters long."


def test_prompt_editing_not_allowed(setup_environment, simple_llm_client):
    simple_llm_client.use_case_config["LlmParams"]["PromptParams"]["UserPromptEditingEnabled"] = False
    with pytest.raises(ValueError) as error:
        simple_llm_client.check_event(
            {
                "body": json.dumps(
                    {
                        "requestContext": {
                            "authorizer": {USER_ID_EVENT_KEY: "fake-user-id"},
                            "connectionId": "fake-id",
                        },
                        "message": {"question": ""},
                    }
                )
            }
        )

    assert error.value.args[0] == "User query provided in the event shouldn't be empty."


def test_question_too_long(setup_environment, simple_llm_client):
    invalid_question = "p" * 1001
    with pytest.raises(ValueError) as error:
        simple_llm_client.check_event(
            {
                "body": json.dumps(
                    {
                        "requestContext": {
                            "authorizer": {USER_ID_EVENT_KEY: "fake-user-id"},
                            "connectionId": "fake-id",
                        },
                        "message": {"question": invalid_question},
                    }
                )
            }
        )

    assert error.value.args[0] == "User query provided in the event shouldn't be greater than 1000 characters long."


def test_multiple_length_issues(setup_environment, simple_llm_client):
    invalid_question = ""
    invalid_prompt = ""

    with pytest.raises(ValueError) as error:
        simple_llm_client.check_event(
            {
                "body": json.dumps(
                    {
                        "requestContext": {
                            "authorizer": {USER_ID_EVENT_KEY: "fake-user-id"},
                            "connectionId": "fake-id",
                        },
                        "message": {"question": invalid_question, "promptTemplate": invalid_prompt},
                    }
                )
            }
        )

    assert (
        error.value.args[0]
        == "User query provided in the event shouldn't be empty.\nPrompt provided in the event shouldn't be empty."
    )


def test_get_event_conversation_id(simple_llm_client):
    event_body = {"some-key": "some-value"}

    with patch("clients.llm_chat_client.uuid4") as mocked_uuid:
        mocked_uuid.return_value = "mock-uuid-str"
        response = simple_llm_client.get_event_conversation_id(event_body)
        assert response == "mock-uuid-str"


def test_env_not_set(setup_environment, simple_llm_client):
    os.environ.pop(USE_CASE_CONFIG_TABLE_NAME_ENV_VAR, None)
    with pytest.raises(ValueError) as error:
        simple_llm_client.check_env()
    assert error.value.args[0] == f"Missing required environment variable {USE_CASE_CONFIG_TABLE_NAME_ENV_VAR}."

    os.environ[USE_CASE_CONFIG_TABLE_NAME_ENV_VAR] = "fake-table"
    os.environ.pop(USE_CASE_CONFIG_RECORD_KEY_ENV_VAR, None)
    with pytest.raises(ValueError) as error:
        simple_llm_client.check_env()
    assert error.value.args[0] == f"Missing required environment variable {USE_CASE_CONFIG_RECORD_KEY_ENV_VAR}."


def test_env_set(setup_environment, simple_llm_client):
    with does_not_raise():
        simple_llm_client.check_env()


@pytest.mark.parametrize(
    "prompt, is_streaming, rag_enabled, knowledge_base_type, return_source_docs, model_id, table_name",
    [(BASIC_PROMPT, False, False, "Kendra", False, "google/flan-t5-xxl", "fake-table")],
)
def test_retrieve_usecase_key_not_found(
    table_name,
    setup_test_table,
    dynamodb_resource,
    rag_enabled,
    model_id,
    bedrock_llm_config,
    setup_environment,
    llm_client,
):
    with pytest.raises(ValueError) as error:
        llm_client.retrieve_use_case_config()
    assert error.value.args[0] == "No usecase config found with key fake-key."


@pytest.mark.parametrize(
    "prompt, is_streaming, rag_enabled, knowledge_base_type, return_source_docs, model_id, table_name",
    [(BASIC_PROMPT, False, False, "Kendra", False, "google/flan-t5-xxl", "fake-table")],
)
def test_user_editing_not_allowed(
    table_name,
    setup_test_table,
    dynamodb_resource,
    rag_enabled,
    model_id,
    bedrock_llm_config,
    setup_environment,
    llm_client,
):
    prompt = "fake prompt"
    question = "fake question"
    llm_client.use_case_config["LlmParams"]["PromptParams"]["UserPromptEditingEnabled"] = False

    with pytest.raises(ValueError) as error:
        llm_client.check_event(
            {
                "body": json.dumps(
                    {
                        "requestContext": {
                            "authorizer": {USER_ID_EVENT_KEY: "fake-user-id"},
                            "connectionId": "fake-id",
                        },
                        "message": {"question": question, "promptTemplate": prompt, "conversationId": "fake-id"},
                    }
                )
            }
        )

    assert error.value.args[0] == "Prompt provided in the event when this use case has been configured to forbid this."
    llm_client.use_case_config["LlmParams"]["PromptParams"]["UserPromptEditingEnabled"] = True


@pytest.mark.parametrize(
    "prompt, is_streaming, rag_enabled, knowledge_base_type, return_source_docs, model_id, table_name",
    [(BASIC_PROMPT, False, False, "Kendra", False, "google/flan-t5-xxl", "fake-table")],
)
def test_retrieve_llm_config_success(
    table_name,
    setup_test_table,
    dynamodb_resource,
    rag_enabled,
    model_id,
    bedrock_llm_config,
    setup_environment,
    llm_client,
):

    mock_table = dynamodb_resource.Table(table_name)
    mock_table.put_item(
        Item={
            "key": "fake-key",
            "config": {"key": "value"},
        }
    )

    response = llm_client.retrieve_use_case_config()
    assert response == {"key": "value"}


@pytest.mark.parametrize(
    "prompt, is_streaming, rag_enabled, knowledge_base_type, return_source_docs, model_id, table_name",
    [(BASIC_PROMPT, False, False, "Kendra", False, "google/flan-t5-xxl", "fake-table")],
)
def test_retrieve_usecase_empty_config(
    table_name,
    setup_test_table,
    dynamodb_resource,
    rag_enabled,
    model_id,
    bedrock_llm_config,
    setup_environment,
    llm_client,
):

    mock_table = dynamodb_resource.Table(table_name)
    mock_table.put_item(
        Item={
            "key": "fake-key",
            "config": {},
        }
    )

    with pytest.raises(ValueError) as error:
        llm_client.retrieve_use_case_config()
    assert error.value.args[0] == "No usecase config found with key fake-key."


def test_parent_retrieve_llm_config_missing_env(setup_environment, simple_llm_client):
    os.environ.pop(USE_CASE_CONFIG_RECORD_KEY_ENV_VAR, None)
    with pytest.raises(ValueError) as error:
        simple_llm_client.retrieve_use_case_config()
    assert (
        error.value.args[0]
        == f"Missing required environment variable {USE_CASE_CONFIG_TABLE_NAME_ENV_VAR} or {USE_CASE_CONFIG_RECORD_KEY_ENV_VAR}."
    )


def test_construct_chat_model_failure(simple_llm_client, chat_event):
    chat_event_body = json.loads(chat_event["Records"][0]["body"])[MESSAGE_KEY]
    with pytest.raises(ValueError) as error:
        simple_llm_client.construct_chat_model(
            "fake-user-id", chat_event_body, LLMProviderTypes.BEDROCK.value, "google/flan-t5-xxl"
        )

    assert error.value.args[0] == "Builder is not set for this LLMChatClient."


@pytest.mark.parametrize(
    "prompt, is_streaming, rag_enabled, knowledge_base_type, return_source_docs, model_id",
    [
        (
            BASIC_PROMPT,
            False,
            False,
            None,
            False,
            "google/flan-t5-xxl",
        )
    ],
)
def test_construct_chat_model_missing_params(rag_enabled, model_id, bedrock_llm_config, llm_client, setup_environment):
    with pytest.raises(ValueError) as user_error:
        llm_client.construct_chat_model(
            None,
            {CONVERSATION_ID_EVENT_KEY: "fake-conversation-id"},
            LLMProviderTypes.BEDROCK.value,
            "google/flan-t5-xxl",
        )
    assert (
        user_error.value.args[0]
        == f"Missing required parameters {USER_ID_EVENT_KEY}, {CONVERSATION_ID_EVENT_KEY} in the event."
    )

    with pytest.raises(ValueError) as conversation_error:
        llm_client.construct_chat_model("user-id", {}, LLMProviderTypes.BEDROCK.value, "google/flan-t5-xxl")

    assert (
        conversation_error.value.args[0]
        == f"Missing required parameters {USER_ID_EVENT_KEY}, {CONVERSATION_ID_EVENT_KEY} in the event."
    )

    with pytest.raises(ValueError) as conversation_error:
        llm_client.construct_chat_model(
            "user-id", {CONVERSATION_ID_EVENT_KEY: None}, LLMProviderTypes.BEDROCK.value, "google/flan-t5-xxl"
        )

    assert (
        conversation_error.value.args[0]
        == f"Missing required parameters {USER_ID_EVENT_KEY}, {CONVERSATION_ID_EVENT_KEY} in the event."
    )


@pytest.mark.parametrize(
    "use_case, prompt, is_streaming, rag_enabled, knowledge_base_type, return_source_docs, model_id",
    [
        (
            CHAT_IDENTIFIER,
            BASIC_PROMPT,
            False,
            False,
            None,
            False,
            f"{BedrockModelProviders.ANTHROPIC.value}.fake-model",
        )
    ],
)
def test_construct_chat_model_new_prompt(
    use_case,
    rag_enabled,
    model_id,
    bedrock_llm_config,
    setup_environment,
    llm_client,
    bedrock_dynamodb_defaults_table,
    apigateway_stubber,
):
    chat_body = {
        "action": "sendMessage",
        "conversationId": "fake-conversation-id",
        "question": "How are you?",
        "promptTemplate": PROMPT,
    }

    llm_client.get_model(chat_body, "fake-user-uuid")

    assert llm_client.use_case_config["LlmParams"]["PromptParams"]["PromptTemplate"] == PROMPT
    assert llm_client.builder.llm.prompt_template == ChatPromptTemplate.from_template(PROMPT)


@pytest.mark.parametrize(
    "use_case, prompt, is_streaming, rag_enabled, knowledge_base_type, return_source_docs, model_id",
    [
        (
            CHAT_IDENTIFIER,
            BASIC_PROMPT,
            False,
            False,
            None,
            False,
            f"{BedrockModelProviders.ANTHROPIC.value}.fake-model",
        )
    ],
)
def test_construct_chat_model_new_prompt(
    use_case,
    rag_enabled,
    model_id,
    bedrock_llm_config,
    setup_environment,
    verbose_llm_client,
    bedrock_dynamodb_defaults_table,
    apigateway_stubber,
):
    chat_body = {
        "action": "sendMessage",
        "conversationId": "fake-conversation-id",
        "question": "How are you?",
        "promptTemplate": PROMPT,
    }
    verbose_llm_client.get_model(chat_body, "fake-user-uuid")
    assert os.environ["LOG_LEVEL"] == "DEBUG"
