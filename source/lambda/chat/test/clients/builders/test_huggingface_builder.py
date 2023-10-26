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

import pytest
from clients.builders.huggingface_builder import HuggingFaceBuilder
from llm_models.huggingface import HuggingFaceLLM
from llm_models.rag.huggingface_retrieval import HuggingFaceRetrievalLLM
from shared.memory.ddb_chat_memory import DynamoDBChatMemory
from utils.constants import (
    CONVERSATION_ID_EVENT_KEY,
    DEFAULT_HUGGINGFACE_PLACEHOLDERS,
    DEFAULT_HUGGINGFACE_PROMPT,
    DEFAULT_HUGGINGFACE_RAG_PLACEHOLDERS,
    DEFAULT_HUGGINGFACE_RAG_PROMPT,
    KENDRA_INDEX_ID_ENV_VAR,
    MEMORY_CONFIG,
    RAG_KEY,
    USER_ID_EVENT_KEY,
)
from utils.enum_types import ConversationMemoryTypes, LLMProviderTypes


@pytest.mark.parametrize(
    "is_streaming, rag_enabled, llm_type, prompt, placeholders, rag_key",
    [
        (False, False, HuggingFaceLLM, DEFAULT_HUGGINGFACE_PROMPT, DEFAULT_HUGGINGFACE_PLACEHOLDERS, ""),
        (
            False,
            True,
            HuggingFaceRetrievalLLM,
            DEFAULT_HUGGINGFACE_RAG_PROMPT,
            DEFAULT_HUGGINGFACE_RAG_PLACEHOLDERS,
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
    llm_config,
    setup_environment,
    setup_secret,
):
    config = json.loads(llm_config["Parameter"]["Value"])
    chat_event_body = json.loads(chat_event["body"])
    builder = HuggingFaceBuilder(
        llm_config=config,
        rag_enabled=rag_enabled,
        connection_id="fake-connection-id",
        conversation_id="fake-conversation-id",
    )
    user_id = chat_event.get("requestContext", {}).get("authorizer", {}).get(USER_ID_EVENT_KEY, {})

    # Assign all the values to the builder attributes required to construct the LLMChat object
    builder.set_knowledge_base()
    builder.set_memory_constants(LLMProviderTypes.HUGGING_FACE.value)
    builder.set_conversation_memory(user_id, chat_event_body[CONVERSATION_ID_EVENT_KEY])
    builder.set_api_key()

    builder.set_llm_model()

    assert type(builder.llm_model) == llm_type
    assert builder.llm_model.model == config["LlmParams"]["ModelId"]
    assert builder.llm_model.prompt_template.template == prompt
    assert set(builder.llm_model.prompt_template.input_variables) == set(placeholders)
    assert builder.llm_model.model_params == {
        "max_length": 100,
        "temperature": 0.2,
        "top_p": 0.2,
    }
    assert builder.llm_model.api_token == "fake-secret-value"
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
        == MEMORY_CONFIG[LLMProviderTypes.HUGGING_FACE.value + rag_key]["history"]
    )
    assert (
        builder.llm_model.conversation_memory.input_key
        == MEMORY_CONFIG[LLMProviderTypes.HUGGING_FACE.value + rag_key]["input"]
    )
    assert (
        builder.llm_model.conversation_memory.output_key
        == MEMORY_CONFIG[LLMProviderTypes.HUGGING_FACE.value + rag_key]["output"]
    )
    assert (
        builder.llm_model.conversation_memory.human_prefix
        == MEMORY_CONFIG[LLMProviderTypes.HUGGING_FACE.value + rag_key]["human_prefix"]
    )
    assert (
        builder.llm_model.conversation_memory.ai_prefix
        == MEMORY_CONFIG[LLMProviderTypes.HUGGING_FACE.value]["ai_prefix"]
    )


@pytest.mark.parametrize(
    "prompt,  is_streaming, rag_enabled",
    [(DEFAULT_HUGGINGFACE_PROMPT, False, False), (DEFAULT_HUGGINGFACE_RAG_PROMPT, False, True)],
)
def test_set_llm_model_with_errors(llm_config):
    config = json.loads(llm_config["Parameter"]["Value"])
    builder = HuggingFaceBuilder(
        llm_config=config,
        rag_enabled=False,
        connection_id="fake-connection-id",
        conversation_id="fake-conversation-id",
    )
    builder.errors = ["some-error-1", "some-error-2"]

    with pytest.raises(ValueError) as error:
        builder.set_llm_model()

    assert (
        error.value.args[0] == "There are errors in the following configuration parameters:\nsome-error-1\nsome-error-2"
    )


@pytest.mark.parametrize(
    "prompt, is_streaming, rag_enabled",
    [(DEFAULT_HUGGINGFACE_PROMPT, False, False), (DEFAULT_HUGGINGFACE_RAG_PROMPT, False, True)],
)
def test_set_llm_model_with_missing_config_fields(llm_config):
    config = deepcopy(json.loads(llm_config["Parameter"]["Value"]))
    del config["LlmParams"]
    builder = HuggingFaceBuilder(
        llm_config=config,
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
    "prompt,  is_streaming, rag_enabled, model",
    [
        (DEFAULT_HUGGINGFACE_PROMPT, False, False, HuggingFaceLLM),
        (DEFAULT_HUGGINGFACE_RAG_PROMPT, False, True, HuggingFaceRetrievalLLM),
    ],
)
def test_returned_huggingface_model(llm_config, chat_event, rag_enabled, model, setup_environment, setup_secret):
    config = json.loads(llm_config["Parameter"]["Value"])
    chat_event_body = json.loads(chat_event["body"])
    builder = HuggingFaceBuilder(
        llm_config=config,
        rag_enabled=rag_enabled,
        connection_id="fake-connection-id",
        conversation_id="fake-conversation-id",
    )
    user_id = chat_event.get("requestContext", {}).get("authorizer", {}).get(USER_ID_EVENT_KEY, {})

    builder.set_knowledge_base()
    builder.set_memory_constants(LLMProviderTypes.HUGGING_FACE.value)
    builder.set_conversation_memory(user_id, chat_event_body[CONVERSATION_ID_EVENT_KEY])
    builder.set_api_key()
    builder.set_llm_model()
    assert type(builder.llm_model) == model
