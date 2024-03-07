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
from unittest import mock
from unittest.mock import MagicMock

import pytest
from clients.builders.huggingface_builder import HuggingFaceBuilder
from llms.huggingface import HuggingFaceLLM
from llms.rag.huggingface_retrieval import HuggingFaceRetrievalLLM
from shared.memory.ddb_chat_memory import DynamoDBChatMemory
from utils.constants import (
    CHAT_IDENTIFIER,
    CONVERSATION_ID_EVENT_KEY,
    DEFAULT_HUGGINGFACE_TASK,
    DEFAULT_PLACEHOLDERS,
    DEFAULT_RAG_PLACEHOLDERS,
    KENDRA_INDEX_ID_ENV_VAR,
    RAG_CHAT_IDENTIFIER,
    USER_ID_EVENT_KEY,
)
from utils.enum_types import ConversationMemoryTypes, LLMProviderTypes

HUGGINGFACE_PROMPT = """\n\n{history}\n\n{input}"""
HUGGINGFACE_RAG_PROMPT = """{context}\n\n{chat_history}\n\n{question}"""
MEMORY_CONFIG = {
    CHAT_IDENTIFIER: {
        "history": "history",
        "input": "input",
        "context": None,
        "ai_prefix": "AI",
        "human_prefix": "Human",
        "output": None,
    },
    RAG_CHAT_IDENTIFIER: {
        "history": "chat_history",
        "input": "question",
        "context": "context",
        "ai_prefix": "AI",
        "human_prefix": "Human",
        "output": "answer",
    },
}


@pytest.mark.parametrize(
    "use_case, is_streaming, rag_enabled, return_source_docs, llm_type, prompt, placeholders, model_id",
    [
        (
            CHAT_IDENTIFIER,
            False,
            False,
            False,
            HuggingFaceLLM,
            HUGGINGFACE_PROMPT,
            DEFAULT_PLACEHOLDERS,
            "google/flan-t5-xxl",
        ),
        (
            RAG_CHAT_IDENTIFIER,
            False,
            True,
            True,
            HuggingFaceRetrievalLLM,
            HUGGINGFACE_RAG_PROMPT,
            DEFAULT_RAG_PLACEHOLDERS,
            "google/flan-t5-xxl",
        ),
        (
            RAG_CHAT_IDENTIFIER,
            False,
            True,
            True,
            HuggingFaceRetrievalLLM,
            HUGGINGFACE_RAG_PROMPT,
            DEFAULT_RAG_PLACEHOLDERS,
            "google/flan-t5-xxl",
        ),
        (
            RAG_CHAT_IDENTIFIER,
            False,
            True,
            True,
            HuggingFaceRetrievalLLM,
            HUGGINGFACE_RAG_PROMPT,
            DEFAULT_RAG_PLACEHOLDERS,
            "google/flan-t5-xxl",
        ),
    ],
)
def test_set_llm_model(
    use_case,
    model_id,
    prompt,
    is_streaming,
    rag_enabled,
    llm_type,
    placeholders,
    chat_event,
    llm_config,
    setup_environment,
    setup_secret,
    huggingface_dynamodb_defaults_table,
):
    with mock.patch("huggingface_hub.inference_api.InferenceApi") as mocked_hf_call:
        with mock.patch("huggingface_hub.login", return_value=MagicMock()):
            mock_obj = MagicMock()
            mock_obj.task = DEFAULT_HUGGINGFACE_TASK
            mocked_hf_call.return_value = mock_obj

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
            builder.set_model_defaults(LLMProviderTypes.HUGGINGFACE, "google/flan-t5-xxl")
            builder.validate_event_input_sizes(chat_event_body)
            builder.set_knowledge_base()
            builder.set_conversation_memory(user_id, chat_event_body[CONVERSATION_ID_EVENT_KEY])
            builder.set_api_key()

            builder.set_llm_model()

            assert type(builder.llm_model) == llm_type
            assert builder.llm_model.model == config["LlmParams"]["ModelId"]
            assert builder.llm_model.prompt_template.template == prompt
            assert set(builder.llm_model.prompt_template.input_variables) == set(placeholders)
            assert builder.llm_model.model_params == {
                "max_length": 100,
            }
            assert builder.llm_model.temperature == 0.2
            assert builder.llm_model.top_p == 0.2
            assert builder.llm_model.api_token == "fake-secret-value"
            assert builder.llm_model.streaming == config["LlmParams"]["Streaming"]
            assert builder.llm_model.verbose == config["LlmParams"]["Verbose"]
            if rag_enabled:
                assert builder.llm_model.knowledge_base.kendra_index_id == os.getenv(KENDRA_INDEX_ID_ENV_VAR)
            else:
                assert builder.llm_model.knowledge_base == None
            assert builder.llm_model.conversation_memory.memory_type == ConversationMemoryTypes.DynamoDB.value
            assert type(builder.llm_model.conversation_memory) == DynamoDBChatMemory
            assert builder.llm_model.conversation_memory.memory_key == MEMORY_CONFIG[use_case]["history"]
            assert builder.llm_model.conversation_memory.input_key == MEMORY_CONFIG[use_case]["input"]
            assert builder.llm_model.conversation_memory.output_key == MEMORY_CONFIG[use_case]["output"]
            assert builder.llm_model.conversation_memory.human_prefix == MEMORY_CONFIG[use_case]["human_prefix"]
            assert builder.llm_model.conversation_memory.ai_prefix == MEMORY_CONFIG[use_case]["ai_prefix"]


@pytest.mark.parametrize(
    "use_case, prompt, is_streaming, rag_enabled, return_source_docs, model_id",
    [
        (
            CHAT_IDENTIFIER,
            HUGGINGFACE_PROMPT,
            False,
            False,
            False,
            "google/flan-t5-xxl",
        ),
        (
            RAG_CHAT_IDENTIFIER,
            HUGGINGFACE_RAG_PROMPT,
            False,
            True,
            False,
            "google/flan-t5-xxl",
        ),
        (
            RAG_CHAT_IDENTIFIER,
            HUGGINGFACE_RAG_PROMPT,
            False,
            True,
            True,
            "google/flan-t5-xxl",
        ),
    ],
)
def test_set_llm_model_with_errors(
    use_case,
    model_id,
    prompt,
    is_streaming,
    rag_enabled,
    llm_config,
    chat_event,
    setup_environment,
    huggingface_dynamodb_defaults_table,
):
    config = json.loads(llm_config["Parameter"]["Value"])
    builder = HuggingFaceBuilder(
        llm_config=config,
        rag_enabled=rag_enabled,
        connection_id="fake-connection-id",
        conversation_id="fake-conversation-id",
    )
    chat_event_body = json.loads(chat_event["body"])
    builder.errors = ["some-error-1", "some-error-2"]
    builder.set_model_defaults(LLMProviderTypes.HUGGINGFACE, "google/flan-t5-xxl")
    builder.validate_event_input_sizes(chat_event_body)
    with pytest.raises(ValueError) as error:
        builder.set_llm_model()

    assert (
        error.value.args[0] == "There are errors in the following configuration parameters:\nsome-error-1\nsome-error-2"
    )


@pytest.mark.parametrize(
    "use_case, prompt, is_streaming, rag_enabled, return_source_docs, model_id",
    [
        (
            CHAT_IDENTIFIER,
            HUGGINGFACE_PROMPT,
            False,
            False,
            False,
            "google/flan-t5-xxl",
        ),
        (
            RAG_CHAT_IDENTIFIER,
            HUGGINGFACE_RAG_PROMPT,
            False,
            True,
            False,
            "google/flan-t5-xxl",
        ),
        (
            RAG_CHAT_IDENTIFIER,
            HUGGINGFACE_RAG_PROMPT,
            False,
            True,
            True,
            "google/flan-t5-xxl",
        ),
    ],
)
def test_set_llm_model_with_missing_config_fields(
    use_case, model_id, prompt, llm_config, rag_enabled, setup_environment, huggingface_dynamodb_defaults_table
):
    config = deepcopy(json.loads(llm_config["Parameter"]["Value"]))
    del config["LlmParams"]
    builder = HuggingFaceBuilder(
        llm_config=config,
        rag_enabled=rag_enabled,
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
    "prompt, is_streaming, rag_enabled, return_source_docs, model_id",
    [
        (
            HUGGINGFACE_PROMPT,
            False,
            False,
            False,
            "google/flan-t5-xxl",
        ),
        (
            HUGGINGFACE_RAG_PROMPT,
            False,
            True,
            False,
            "google/flan-t5-xxl",
        ),
        (
            HUGGINGFACE_RAG_PROMPT,
            False,
            True,
            True,
            "google/flan-t5-xxl",
        ),
    ],
)
def test_set_llm_model_with_missing_config_fields(
    rag_enabled, model_id, llm_config, return_source_docs, setup_environment
):
    config = deepcopy(json.loads(llm_config["Parameter"]["Value"]))
    del config["LlmParams"]
    builder = HuggingFaceBuilder(
        llm_config=config,
        rag_enabled=rag_enabled,
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
    "use_case, prompt, is_streaming, rag_enabled, return_source_docs, model, model_id",
    [
        (
            CHAT_IDENTIFIER,
            HUGGINGFACE_PROMPT,
            False,
            False,
            False,
            HuggingFaceLLM,
            "google/flan-t5-xxl",
        ),
        (
            RAG_CHAT_IDENTIFIER,
            HUGGINGFACE_RAG_PROMPT,
            False,
            True,
            False,
            HuggingFaceRetrievalLLM,
            "google/flan-t5-xxl",
        ),
        (
            RAG_CHAT_IDENTIFIER,
            HUGGINGFACE_RAG_PROMPT,
            False,
            True,
            True,
            HuggingFaceRetrievalLLM,
            "google/flan-t5-xxl",
        ),
    ],
)
def test_returned_huggingface_model(
    use_case,
    model_id,
    prompt,
    llm_config,
    chat_event,
    rag_enabled,
    model,
    setup_environment,
    setup_secret,
    huggingface_dynamodb_defaults_table,
):
    with mock.patch("huggingface_hub.inference_api.InferenceApi") as mocked_hf_call:
        with mock.patch("huggingface_hub.login", return_value=MagicMock()):
            mock_obj = MagicMock()
            mock_obj.task = DEFAULT_HUGGINGFACE_TASK
            mocked_hf_call.return_value = mock_obj

            config = json.loads(llm_config["Parameter"]["Value"])
            chat_event_body = json.loads(chat_event["body"])
            builder = HuggingFaceBuilder(
                llm_config=config,
                rag_enabled=rag_enabled,
                connection_id="fake-connection-id",
                conversation_id="fake-conversation-id",
            )
            user_id = chat_event.get("requestContext", {}).get("authorizer", {}).get(USER_ID_EVENT_KEY, {})

            builder.set_model_defaults(LLMProviderTypes.HUGGINGFACE, "google/flan-t5-xxl")
            builder.set_knowledge_base()
            builder.set_conversation_memory(user_id, chat_event_body[CONVERSATION_ID_EVENT_KEY])
            builder.set_api_key()
            builder.set_llm_model()
            assert type(builder.llm_model) == model
