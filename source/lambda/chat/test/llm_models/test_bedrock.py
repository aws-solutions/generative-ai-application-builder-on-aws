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
from llm_models.bedrock import BedrockLLM
from shared.knowledge.kendra_knowledge_base import KendraKnowledgeBase
from shared.memory.ddb_chat_memory import DynamoDBChatMemory
from shared.memory.ddb_enhanced_message_history import DynamoDBChatMessageHistory
from utils.constants import (
    BEDROCK_MODEL_MAP,
    DEFAULT_BEDROCK_PLACEHOLDERS,
    DEFAULT_BEDROCK_PROMPT,
    DEFAULT_BEDROCK_TEMPERATURE_MAP,
    DEFAULT_BEDROCK_MODEL_FAMILY,
)
from utils.custom_exceptions import LLMBuildError
from utils.enum_types import BedrockModelProviders

STOP_SEQUENCES = ["|"]


@pytest.fixture(autouse=True)
def streamless_chat(setup_environment):
    chat = BedrockLLM(
        conversation_memory=DynamoDBChatMemory(
            DynamoDBChatMessageHistory("fake-table", "fake-conversation-id", "fake-user-id")
        ),
        knowledge_base=None,
        model=BEDROCK_MODEL_MAP[BedrockModelProviders.AMAZON]["DEFAULT"],
        model_family=BedrockModelProviders.AMAZON,
        model_params={
            "topP": {"Type": "float", "Value": "0.2"},
            "maxTokenCount": {"Type": "integer", "Value": "512"},
        },
        prompt_template=DEFAULT_BEDROCK_PROMPT[BedrockModelProviders.AMAZON],
        streaming=False,
        verbose=False,
        temperature=DEFAULT_BEDROCK_TEMPERATURE_MAP[BedrockModelProviders.AMAZON],
        callbacks=None,
        rag_enabled=False,
    )
    yield chat


@pytest.fixture(autouse=True)
def streaming_chat(setup_environment):
    chat = BedrockLLM(
        conversation_memory=DynamoDBChatMemory(
            DynamoDBChatMessageHistory("fake-table", "fake-conversation-id", "fake-user-id")
        ),
        knowledge_base=None,
        model_family=BedrockModelProviders.AMAZON,
        model=BEDROCK_MODEL_MAP[BedrockModelProviders.AMAZON]["DEFAULT"],
        model_params={
            "topP": {"Type": "float", "Value": "0.2"},
            "maxTokenCount": {"Type": "integer", "Value": "512"},
        },
        prompt_template=DEFAULT_BEDROCK_PROMPT[BedrockModelProviders.AMAZON],
        streaming=True,
        verbose=False,
        temperature=DEFAULT_BEDROCK_TEMPERATURE_MAP[BedrockModelProviders.AMAZON],
        callbacks=None,
        rag_enabled=False,
    )
    yield chat


@pytest.mark.parametrize("chat_fixture, streaming", [("streamless_chat", False), ("streaming_chat", True)])
def test_implement_error_not_raised(chat_fixture, streaming, request):
    chat = request.getfixturevalue(chat_fixture)
    try:
        assert chat.model == BEDROCK_MODEL_MAP[BedrockModelProviders.AMAZON]["DEFAULT"]
        assert chat.prompt_template.template == DEFAULT_BEDROCK_PROMPT[BedrockModelProviders.AMAZON]
        assert chat.prompt_template.input_variables == DEFAULT_BEDROCK_PLACEHOLDERS
        assert chat.model_params["topP"] == 0.2
        assert chat.model_params["maxTokenCount"] == 512
        assert chat.model_params["temperature"] == 0.0
        assert sorted(chat.model_params["stopSequences"]) == STOP_SEQUENCES
        assert chat.streaming == streaming
        assert chat.verbose == False
        assert chat.knowledge_base == None
        assert chat.conversation_memory.chat_memory.messages == []
        assert type(chat.conversation_chain) == ConversationChain
        assert chat.stop_sequences == STOP_SEQUENCES
    except NotImplementedError as ex:
        raise Exception(ex)


@mock.patch("langchain.chains.ConversationChain.predict")
@pytest.mark.parametrize("chat_fixture", ["streamless_chat", "streaming_chat"])
def test_generate(mocked_predict, chat_fixture, request):
    model = request.getfixturevalue(chat_fixture)
    mocked_predict.return_value = "I'm doing well, how are you?"
    assert model.generate("Hi there") == {"answer": "I'm doing well, how are you?"}


@pytest.mark.parametrize("is_streaming", [False, True])
def test_exception_for_failed_model_incorrect_key(setup_environment, is_streaming, bedrock_stubber):
    bedrock_stubber.add_client_error(
        "invoke_model",
        service_error_code="InternalServerError",
        service_message="some-error",
        expected_params={
            "accept": "application/json",
            "body": json.dumps(
                {
                    "inputText": DEFAULT_BEDROCK_PROMPT[DEFAULT_BEDROCK_MODEL_FAMILY]
                    .replace("{history}", "")
                    .replace("{input}", "What is the weather in Seattle?"),
                    "textGenerationConfig": {
                        "maxTokenCount": 512,
                        "stopSequences": STOP_SEQUENCES,
                        "topP": 0.2,
                        "temperature": 0.0,
                    },
                }
            ),
            "contentType": "application/json",
            "modelId": "amazon.titan-text-express-v1",
        },
    )

    with pytest.raises(LLMBuildError) as error:
        chat = BedrockLLM(
            conversation_memory=DynamoDBChatMemory(
                DynamoDBChatMessageHistory("fake-table", "fake-conversation-id", "fake-user-id")
            ),
            knowledge_base=None,
            model_family=BedrockModelProviders.AMAZON,
            model=BEDROCK_MODEL_MAP[BedrockModelProviders.AMAZON]["DEFAULT"],
            model_params={
                "topP": {"Type": "float", "Value": "0.2"},
                "maxTokenCount": {"Type": "integer", "Value": "512"},
            },
            prompt_template=DEFAULT_BEDROCK_PROMPT[BedrockModelProviders.AMAZON],
            streaming=False,
            verbose=False,
            temperature=DEFAULT_BEDROCK_TEMPERATURE_MAP[BedrockModelProviders.AMAZON],
            callbacks=None,
            rag_enabled=False,
        )
        chat.generate("What is the weather in Seattle?")

    assert (
        error.value.args[0]
        == "Error raised by bedrock service while building AMAZON_TITAN Model. Error raised by bedrock service: An error occurred (InternalServerError) when calling the InvokeModel operation: some-error"
    )


@pytest.mark.parametrize("chat_fixture, streaming", [("streamless_chat", False), ("streaming_chat", True)])
def test_model_get_clean_model_params(chat_fixture, request, streaming):
    chat = request.getfixturevalue(chat_fixture)
    model_params = {
        "topP": {"Type": "float", "Value": "0.2"},
        "maxTokenCount": {"Type": "integer", "Value": "512"},
    }
    chat.get_clean_model_params(model_params)
    chat.streaming = streaming
    assert chat.model_params["topP"] == 0.2
    assert chat.model_params["maxTokenCount"] == 512
    assert chat.model_params["temperature"] == 0.0
    assert sorted(chat.model_params["stopSequences"]) == STOP_SEQUENCES
