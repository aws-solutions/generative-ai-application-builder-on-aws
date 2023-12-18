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
from copy import deepcopy
from unittest.mock import patch

import pytest
from clients.builders.bedrock_builder import BedrockBuilder
from langchain.callbacks.streaming_aiter import AsyncIteratorCallbackHandler
from llm_models.bedrock import BedrockLLM
from llm_models.rag.bedrock_retrieval import BedrockRetrievalLLM
from shared.memory.ddb_chat_memory import DynamoDBChatMemory
from utils.constants import (
    CONVERSATION_ID_EVENT_KEY,
    DEFAULT_BEDROCK_MODEL_FAMILY,
    DEFAULT_BEDROCK_PLACEHOLDERS,
    DEFAULT_BEDROCK_PROMPT,
    DEFAULT_BEDROCK_RAG_PLACEHOLDERS,
    DEFAULT_BEDROCK_RAG_PROMPT,
    KENDRA_INDEX_ID_ENV_VAR,
    MEMORY_CONFIG,
    RAG_KEY,
    USER_ID_EVENT_KEY,
)
from utils.enum_types import BedrockModelProviders, ConversationMemoryTypes, LLMProviderTypes


@pytest.mark.parametrize(
    "is_streaming, rag_enabled, llm_type, prompt, placeholders, rag_key",
    [
        (
            False,
            False,
            BedrockLLM,
            DEFAULT_BEDROCK_PROMPT[DEFAULT_BEDROCK_MODEL_FAMILY],
            DEFAULT_BEDROCK_PLACEHOLDERS,
            "",
        ),
        (
            True,
            False,
            BedrockLLM,
            DEFAULT_BEDROCK_PROMPT[DEFAULT_BEDROCK_MODEL_FAMILY],
            DEFAULT_BEDROCK_PLACEHOLDERS,
            "",
        ),
        (
            False,
            True,
            BedrockRetrievalLLM,
            DEFAULT_BEDROCK_RAG_PROMPT[DEFAULT_BEDROCK_MODEL_FAMILY],
            DEFAULT_BEDROCK_RAG_PLACEHOLDERS,
            RAG_KEY,
        ),
        (
            True,
            True,
            BedrockRetrievalLLM,
            DEFAULT_BEDROCK_RAG_PROMPT[DEFAULT_BEDROCK_MODEL_FAMILY],
            DEFAULT_BEDROCK_RAG_PLACEHOLDERS,
            RAG_KEY,
        ),
    ],
)
def test_set_llm_model(
    is_streaming,
    rag_enabled,
    llm_type,
    prompt,
    placeholders,
    rag_key,
    chat_event,
    bedrock_llm_config,
    setup_environment,
    setup_secret,
    bedrock_stubber,
):
    config = json.loads(bedrock_llm_config["Parameter"]["Value"])
    chat_event_body = json.loads(chat_event["body"])
    builder = BedrockBuilder(
        llm_config=config,
        rag_enabled=rag_enabled,
        connection_id="fake-connection-id",
        conversation_id="fake-conversation-id",
    )
    user_id = chat_event.get("requestContext", {}).get("authorizer", {}).get(USER_ID_EVENT_KEY, {})

    # Assign all the values to the builder attributes required to construct the LLMChat object
    builder.set_knowledge_base()
    builder.set_memory_constants(LLMProviderTypes.BEDROCK.value)
    builder.set_conversation_memory(user_id, chat_event_body[CONVERSATION_ID_EVENT_KEY])

    if is_streaming:
        with patch(
            "clients.builders.llm_builder.WebsocketStreamingCallbackHandler",
            return_value=AsyncIteratorCallbackHandler(),
        ):
            builder.set_llm_model()
    else:
        with patch(
            "clients.builders.llm_builder.WebsocketStreamingCallbackHandler",
            return_value=AsyncIteratorCallbackHandler(),
        ):
            builder.set_llm_model()

    assert type(builder.llm_model) == llm_type
    assert builder.llm_model.model == config["LlmParams"]["ModelId"]
    assert builder.llm_model.prompt_template.template == prompt
    assert set(builder.llm_model.prompt_template.input_variables) == set(placeholders)
    assert builder.llm_model.model_params["temperature"] == 0.2
    assert sorted(builder.llm_model.model_params["stopSequences"]) == ["|"]
    assert builder.llm_model.streaming == config["LlmParams"]["Streaming"]
    assert builder.llm_model.verbose == config["LlmParams"]["Verbose"]
    if rag_enabled:
        assert builder.llm_model.knowledge_base.kendra_index_id == os.getenv(KENDRA_INDEX_ID_ENV_VAR)
    else:
        assert builder.llm_model.knowledge_base == None
    assert builder.llm_model.conversation_memory.memory_type == ConversationMemoryTypes.DynamoDB.value
    assert type(builder.llm_model.conversation_memory) == DynamoDBChatMemory
    assert (
        builder.llm_model.conversation_memory.memory_key
        == MEMORY_CONFIG[LLMProviderTypes.BEDROCK.value + rag_key]["history"]
    )
    assert (
        builder.llm_model.conversation_memory.input_key
        == MEMORY_CONFIG[LLMProviderTypes.BEDROCK.value + rag_key]["input"]
    )
    assert (
        builder.llm_model.conversation_memory.output_key
        == MEMORY_CONFIG[LLMProviderTypes.BEDROCK.value + rag_key]["output"]
    )
    assert (
        builder.llm_model.conversation_memory.human_prefix
        == MEMORY_CONFIG[LLMProviderTypes.BEDROCK.value + rag_key]["human_prefix"][BedrockModelProviders.AMAZON.value]
    )
    assert (
        builder.llm_model.conversation_memory.ai_prefix
        == MEMORY_CONFIG[LLMProviderTypes.BEDROCK.value + rag_key]["ai_prefix"][BedrockModelProviders.AMAZON.value]
    )

    if is_streaming:
        assert builder.callbacks
    else:
        assert builder.callbacks is None


@pytest.mark.parametrize(
    "prompt, is_streaming, rag_enabled",
    [
        (DEFAULT_BEDROCK_PROMPT[DEFAULT_BEDROCK_MODEL_FAMILY], False, False),
        (DEFAULT_BEDROCK_PROMPT[DEFAULT_BEDROCK_MODEL_FAMILY], True, False),
        (DEFAULT_BEDROCK_RAG_PROMPT[DEFAULT_BEDROCK_MODEL_FAMILY], True, True),
        (DEFAULT_BEDROCK_RAG_PROMPT[DEFAULT_BEDROCK_MODEL_FAMILY], False, True),
    ],
)
def test_set_llm_model_throws_error_missing_memory(bedrock_llm_config, chat_event, setup_environment, setup_secret):
    config = json.loads(bedrock_llm_config["Parameter"]["Value"])
    builder = BedrockBuilder(
        llm_config=config,
        rag_enabled=False,
        connection_id="fake-connection-id",
        conversation_id="fake-conversation-id",
    )

    builder.set_knowledge_base()
    with patch(
        "clients.builders.llm_builder.WebsocketStreamingCallbackHandler",
        return_value=AsyncIteratorCallbackHandler(),
    ):
        with pytest.raises(ValueError) as error:
            builder.set_llm_model()

        assert error.value.args[0] == "Conversation Memory was set to null."


@pytest.mark.parametrize(
    "prompt, is_streaming, rag_enabled",
    [
        (DEFAULT_BEDROCK_PROMPT[DEFAULT_BEDROCK_MODEL_FAMILY], False, False),
        (DEFAULT_BEDROCK_PROMPT[DEFAULT_BEDROCK_MODEL_FAMILY], True, False),
        (DEFAULT_BEDROCK_RAG_PROMPT[DEFAULT_BEDROCK_MODEL_FAMILY], True, True),
        (DEFAULT_BEDROCK_RAG_PROMPT[DEFAULT_BEDROCK_MODEL_FAMILY], False, True),
    ],
)
def test_set_llm_model_with_errors(bedrock_llm_config):
    parsed_config = json.loads(bedrock_llm_config["Parameter"]["Value"])
    builder = BedrockBuilder(
        llm_config=parsed_config,
        rag_enabled=False,
        connection_id="fake-connection-id",
        conversation_id="fake-conversation-id",
    )
    builder.errors = ["some-error-1", "some-error-2"]
    builder.conversation_memory = ""

    with patch(
        "clients.builders.llm_builder.WebsocketStreamingCallbackHandler",
        return_value=AsyncIteratorCallbackHandler(),
    ):
        with pytest.raises(ValueError) as error:
            builder.set_llm_model()

    assert (
        error.value.args[0] == "There are errors in the following configuration parameters:\nsome-error-1\nsome-error-2"
    )


@pytest.mark.parametrize(
    "prompt, is_streaming, rag_enabled",
    [
        (DEFAULT_BEDROCK_PROMPT[DEFAULT_BEDROCK_MODEL_FAMILY], False, False),
        (DEFAULT_BEDROCK_PROMPT[DEFAULT_BEDROCK_MODEL_FAMILY], True, False),
        (DEFAULT_BEDROCK_RAG_PROMPT[DEFAULT_BEDROCK_MODEL_FAMILY], False, True),
        (DEFAULT_BEDROCK_RAG_PROMPT[DEFAULT_BEDROCK_MODEL_FAMILY], True, True),
    ],
)
def test_set_llm_model_with_missing_config_fields(bedrock_llm_config):
    parsed_config = deepcopy(json.loads(bedrock_llm_config["Parameter"]["Value"]))
    del parsed_config["LlmParams"]
    builder = BedrockBuilder(
        llm_config=parsed_config,
        rag_enabled=False,
        connection_id="fake-connection-id",
        conversation_id="fake-conversation-id",
    )

    with pytest.raises(ValueError) as error:
        builder.set_llm_model()

    assert (
        error.value.args[0]
        == "There are errors in the following configuration parameters:\nMissing required field (LlmParams) containing LLM configuration in the config which is required to construct the LLM."
    )


@pytest.mark.parametrize(
    "prompt, is_streaming, rag_enabled, model, rag_key",
    [
        (DEFAULT_BEDROCK_PROMPT[DEFAULT_BEDROCK_MODEL_FAMILY], False, False, BedrockLLM, ""),
        (DEFAULT_BEDROCK_PROMPT[DEFAULT_BEDROCK_MODEL_FAMILY], True, False, BedrockLLM, ""),
        (DEFAULT_BEDROCK_RAG_PROMPT[DEFAULT_BEDROCK_MODEL_FAMILY], False, True, BedrockRetrievalLLM, RAG_KEY),
        (DEFAULT_BEDROCK_RAG_PROMPT[DEFAULT_BEDROCK_MODEL_FAMILY], True, True, BedrockRetrievalLLM, RAG_KEY),
    ],
)
def test_returned_bedrock_model(
    bedrock_llm_config, chat_event, rag_enabled, model, rag_key, setup_environment, setup_secret
):
    config = json.loads(bedrock_llm_config["Parameter"]["Value"])
    chat_event_body = json.loads(chat_event["body"])
    builder = BedrockBuilder(
        connection_id="fake-connection-id",
        conversation_id="fake-conversation-id",
        llm_config=config,
        rag_enabled=rag_enabled,
    )
    user_id = chat_event.get("requestContext", {}).get("authorizer", {}).get(USER_ID_EVENT_KEY, {})

    builder.set_knowledge_base()
    builder.set_memory_constants(LLMProviderTypes.BEDROCK.value)
    builder.set_conversation_memory(user_id, chat_event_body[CONVERSATION_ID_EVENT_KEY])
    with patch(
        "clients.builders.llm_builder.WebsocketStreamingCallbackHandler",
        return_value=AsyncIteratorCallbackHandler(),
    ):
        builder.set_llm_model()
        assert type(builder.llm_model) == model
