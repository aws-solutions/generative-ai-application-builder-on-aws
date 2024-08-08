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
from llms.bedrock import BedrockLLM
from llms.rag.bedrock_retrieval import BedrockRetrievalLLM
from shared.memory.ddb_chat_memory import DynamoDBChatMemory
from utils.constants import (
    CHAT_IDENTIFIER,
    CONVERSATION_ID_EVENT_KEY,
    DEFAULT_BEDROCK_MODEL_FAMILY,
    DEFAULT_BEDROCK_MODELS_MAP,
    DEFAULT_PROMPT_PLACEHOLDERS,
    DEFAULT_PROMPT_RAG_PLACEHOLDERS,
    KENDRA_INDEX_ID_ENV_VAR,
    MESSAGE_KEY,
    RAG_CHAT_IDENTIFIER,
    USER_ID_EVENT_KEY,
)
from utils.enum_types import ConversationMemoryTypes, KnowledgeBaseTypes, LLMProviderTypes

BEDROCK_PROMPT = """\n\n{history}\n\n{input}"""
BEDROCK_RAG_PROMPT = """{context}\n\n{chat_history}\n\n{question}"""
MEMORY_CONFIG = {
    CHAT_IDENTIFIER: {
        "history": "history",
        "input": "input",
        "context": None,
        "output": None,
    },
    RAG_CHAT_IDENTIFIER: {
        "history": "chat_history",
        "input": "question",
        "context": "context",
        "output": "answer",
    },
}


model_id = DEFAULT_BEDROCK_MODELS_MAP[DEFAULT_BEDROCK_MODEL_FAMILY]


@pytest.mark.parametrize(
    "use_case, is_streaming, rag_enabled, knowledge_base_type, return_source_docs, llm_type, prompt, placeholders, model_id",
    [
        (
            CHAT_IDENTIFIER,
            False,
            False,
            None,
            False,
            BedrockLLM,
            BEDROCK_PROMPT,
            DEFAULT_PROMPT_PLACEHOLDERS,
            "amazon.model-xx",
        ),
        (
            CHAT_IDENTIFIER,
            True,
            False,
            None,
            False,
            BedrockLLM,
            BEDROCK_PROMPT,
            DEFAULT_PROMPT_PLACEHOLDERS,
            "amazon.model-xx",
        ),
        (
            RAG_CHAT_IDENTIFIER,
            False,
            True,
            KnowledgeBaseTypes.KENDRA.value,
            False,
            BedrockRetrievalLLM,
            BEDROCK_RAG_PROMPT,
            DEFAULT_PROMPT_RAG_PLACEHOLDERS,
            model_id,
        ),
        (
            RAG_CHAT_IDENTIFIER,
            True,
            True,
            KnowledgeBaseTypes.KENDRA.value,
            False,
            BedrockRetrievalLLM,
            BEDROCK_RAG_PROMPT,
            DEFAULT_PROMPT_RAG_PLACEHOLDERS,
            model_id,
        ),
        (
            RAG_CHAT_IDENTIFIER,
            False,
            True,
            KnowledgeBaseTypes.KENDRA.value,
            True,
            BedrockRetrievalLLM,
            BEDROCK_RAG_PROMPT,
            DEFAULT_PROMPT_RAG_PLACEHOLDERS,
            model_id,
        ),
        (
            RAG_CHAT_IDENTIFIER,
            True,
            True,
            KnowledgeBaseTypes.KENDRA.value,
            True,
            BedrockRetrievalLLM,
            BEDROCK_RAG_PROMPT,
            DEFAULT_PROMPT_RAG_PLACEHOLDERS,
            model_id,
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
    bedrock_llm_config,
    test_ai,
    test_human,
    return_source_docs,
    setup_environment,
    bedrock_stubber,
    bedrock_dynamodb_defaults_table,
):
    config = bedrock_llm_config
    chat_event_body = json.loads(chat_event["Records"][0]["body"])
    builder = BedrockBuilder(
        use_case_config=config,
        rag_enabled=rag_enabled,
        connection_id="fake-connection-id",
        conversation_id="fake-conversation-id",
    )
    user_id = chat_event_body.get("requestContext", {}).get("authorizer", {}).get(USER_ID_EVENT_KEY, {})

    # Assign all the values to the builder attributes required to construct the LLMChat object
    builder.set_model_defaults(LLMProviderTypes.BEDROCK, model_id)
    builder.validate_event_input_sizes(chat_event_body[MESSAGE_KEY])
    builder.set_knowledge_base()
    builder.set_conversation_memory(user_id, chat_event_body[MESSAGE_KEY][CONVERSATION_ID_EVENT_KEY])

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
    assert builder.llm_model.model == model_id
    assert builder.llm_model.prompt_template.template == prompt
    assert set(builder.llm_model.prompt_template.input_variables) == set(placeholders)
    assert builder.llm_model.model_params["temperature"] == 0.2
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
    assert builder.llm_model.conversation_memory.human_prefix == test_human
    assert builder.llm_model.conversation_memory.ai_prefix == test_ai

    if is_streaming:
        assert builder.callbacks
    else:
        assert builder.callbacks is None


@pytest.mark.parametrize(
    "use_case, prompt, is_streaming, rag_enabled, knowledge_base_type, return_source_docs, model_id",
    [
        (CHAT_IDENTIFIER, BEDROCK_PROMPT, False, False, None, False, model_id),
        (CHAT_IDENTIFIER, BEDROCK_PROMPT, True, False, None, False, model_id),
        (RAG_CHAT_IDENTIFIER, BEDROCK_RAG_PROMPT, True, True, KnowledgeBaseTypes.KENDRA.value, False, model_id),
        (RAG_CHAT_IDENTIFIER, BEDROCK_RAG_PROMPT, False, True, KnowledgeBaseTypes.KENDRA.value, False, model_id),
        (RAG_CHAT_IDENTIFIER, BEDROCK_RAG_PROMPT, True, True, KnowledgeBaseTypes.KENDRA.value, True, model_id),
        (RAG_CHAT_IDENTIFIER, BEDROCK_RAG_PROMPT, False, True, KnowledgeBaseTypes.KENDRA.value, True, model_id),
    ],
)
def test_set_llm_model_throws_error_missing_memory(
    use_case,
    model_id,
    prompt,
    rag_enabled,
    bedrock_llm_config,
    return_source_docs,
    chat_event,
    setup_environment,
    bedrock_dynamodb_defaults_table,
):
    config = bedrock_llm_config
    builder = BedrockBuilder(
        use_case_config=config,
        rag_enabled=rag_enabled,
        connection_id="fake-connection-id",
        conversation_id="fake-conversation-id",
    )

    chat_event_body = json.loads(chat_event["Records"][0]["body"])
    builder.set_model_defaults(LLMProviderTypes.BEDROCK, model_id)
    builder.validate_event_input_sizes(chat_event_body[MESSAGE_KEY])
    builder.set_knowledge_base()
    with patch(
        "clients.builders.llm_builder.WebsocketStreamingCallbackHandler",
        return_value=AsyncIteratorCallbackHandler(),
    ):
        with pytest.raises(ValueError) as error:
            builder.set_llm_model()

        assert error.value.args[0] == "Conversation Memory was set to null."


@pytest.mark.parametrize(
    "use_case, prompt, is_streaming, rag_enabled, knowledge_base_type, return_source_docs, model_id",
    [
        (CHAT_IDENTIFIER, BEDROCK_PROMPT, False, False, None, False, model_id),
        (CHAT_IDENTIFIER, BEDROCK_PROMPT, True, False, None, False, model_id),
        (RAG_CHAT_IDENTIFIER, BEDROCK_RAG_PROMPT, True, True, KnowledgeBaseTypes.KENDRA.value, False, model_id),
        (RAG_CHAT_IDENTIFIER, BEDROCK_RAG_PROMPT, False, True, KnowledgeBaseTypes.KENDRA.value, False, model_id),
        (RAG_CHAT_IDENTIFIER, BEDROCK_RAG_PROMPT, True, True, KnowledgeBaseTypes.KENDRA.value, True, model_id),
        (RAG_CHAT_IDENTIFIER, BEDROCK_RAG_PROMPT, False, True, KnowledgeBaseTypes.KENDRA.value, True, model_id),
    ],
)
def test_set_llm_model_with_errors(
    use_case,
    model_id,
    prompt,
    bedrock_llm_config,
    rag_enabled,
    return_source_docs,
    setup_environment,
    bedrock_dynamodb_defaults_table,
):
    parsed_config = bedrock_llm_config
    builder = BedrockBuilder(
        use_case_config=parsed_config,
        rag_enabled=rag_enabled,
        connection_id="fake-connection-id",
        conversation_id="fake-conversation-id",
    )
    builder.errors = ["some-error-1", "some-error-2"]
    builder.set_model_defaults(LLMProviderTypes.BEDROCK, model_id)
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
    "prompt, is_streaming, rag_enabled, knowledge_base_type, return_source_docs, model_id",
    [
        (BEDROCK_PROMPT, False, False, None, False, model_id),
        (BEDROCK_PROMPT, True, False, None, False, model_id),
        (BEDROCK_RAG_PROMPT, False, True, KnowledgeBaseTypes.KENDRA.value, False, model_id),
        (BEDROCK_RAG_PROMPT, True, True, KnowledgeBaseTypes.KENDRA.value, False, model_id),
        (BEDROCK_RAG_PROMPT, False, True, KnowledgeBaseTypes.KENDRA.value, True, model_id),
        (BEDROCK_RAG_PROMPT, True, True, KnowledgeBaseTypes.KENDRA.value, True, model_id),
    ],
)
def test_set_llm_model_with_missing_config_fields(bedrock_llm_config, model_id, return_source_docs, setup_environment):
    parsed_config = deepcopy(bedrock_llm_config)
    del parsed_config["LlmParams"]
    builder = BedrockBuilder(
        use_case_config=parsed_config,
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
    "use_case, prompt, is_streaming, rag_enabled, knowledge_base_type, return_source_docs, model, model_id",
    [
        (CHAT_IDENTIFIER, BEDROCK_PROMPT, False, False, None, False, BedrockLLM, model_id),
        (CHAT_IDENTIFIER, BEDROCK_PROMPT, True, False, None, False, BedrockLLM, model_id),
        (
            RAG_CHAT_IDENTIFIER,
            BEDROCK_RAG_PROMPT,
            False,
            True,
            KnowledgeBaseTypes.KENDRA.value,
            False,
            BedrockRetrievalLLM,
            model_id,
        ),
        (
            RAG_CHAT_IDENTIFIER,
            BEDROCK_RAG_PROMPT,
            True,
            True,
            KnowledgeBaseTypes.KENDRA.value,
            False,
            BedrockRetrievalLLM,
            model_id,
        ),
        (
            RAG_CHAT_IDENTIFIER,
            BEDROCK_RAG_PROMPT,
            False,
            True,
            KnowledgeBaseTypes.KENDRA.value,
            True,
            BedrockRetrievalLLM,
            model_id,
        ),
        (
            RAG_CHAT_IDENTIFIER,
            BEDROCK_RAG_PROMPT,
            True,
            True,
            KnowledgeBaseTypes.KENDRA.value,
            True,
            BedrockRetrievalLLM,
            model_id,
        ),
    ],
)
def test_returned_bedrock_model(
    use_case,
    model_id,
    prompt,
    bedrock_llm_config,
    chat_event,
    rag_enabled,
    return_source_docs,
    model,
    setup_environment,
    bedrock_dynamodb_defaults_table,
):
    config = bedrock_llm_config
    chat_event_body = json.loads(chat_event["Records"][0]["body"])
    builder = BedrockBuilder(
        connection_id="fake-connection-id",
        conversation_id="fake-conversation-id",
        use_case_config=config,
        rag_enabled=rag_enabled,
    )
    user_id = chat_event.get("requestContext", {}).get("authorizer", {}).get(USER_ID_EVENT_KEY, {})

    builder.set_model_defaults(LLMProviderTypes.BEDROCK, model_id)
    builder.set_knowledge_base()
    builder.set_conversation_memory(user_id, chat_event_body[MESSAGE_KEY][CONVERSATION_ID_EVENT_KEY])
    with patch(
        "clients.builders.llm_builder.WebsocketStreamingCallbackHandler",
        return_value=AsyncIteratorCallbackHandler(),
    ):
        builder.set_llm_model()
        assert type(builder.llm_model) == model


@pytest.mark.parametrize(
    "use_case, prompt, is_streaming, rag_enabled, knowledge_base_type, return_source_docs, model, model_id",
    [
        (CHAT_IDENTIFIER, BEDROCK_PROMPT, False, False, None, False, BedrockLLM, model_id),
        (CHAT_IDENTIFIER, BEDROCK_PROMPT, True, False, None, False, BedrockLLM, model_id),
        (
            RAG_CHAT_IDENTIFIER,
            BEDROCK_RAG_PROMPT,
            False,
            True,
            KnowledgeBaseTypes.KENDRA.value,
            False,
            BedrockRetrievalLLM,
            model_id,
        ),
        (
            RAG_CHAT_IDENTIFIER,
            BEDROCK_RAG_PROMPT,
            True,
            True,
            KnowledgeBaseTypes.KENDRA.value,
            False,
            BedrockRetrievalLLM,
            model_id,
        ),
        (
            RAG_CHAT_IDENTIFIER,
            BEDROCK_RAG_PROMPT,
            False,
            True,
            KnowledgeBaseTypes.KENDRA.value,
            True,
            BedrockRetrievalLLM,
            model_id,
        ),
        (
            RAG_CHAT_IDENTIFIER,
            BEDROCK_RAG_PROMPT,
            True,
            True,
            KnowledgeBaseTypes.KENDRA.value,
            True,
            BedrockRetrievalLLM,
            model_id,
        ),
    ],
)
def test_returned_bedrock_provisioned_model(
    use_case,
    model_id,
    prompt,
    bedrock_provisioned_llm_config,
    chat_event,
    rag_enabled,
    return_source_docs,
    model,
    test_provisioned_arn,
    setup_environment,
    bedrock_dynamodb_defaults_table,
):
    config = bedrock_provisioned_llm_config
    chat_event_body = json.loads(chat_event["Records"][0]["body"])
    builder = BedrockBuilder(
        connection_id="fake-connection-id",
        conversation_id="fake-conversation-id",
        use_case_config=config,
        rag_enabled=rag_enabled,
    )
    user_id = chat_event.get("requestContext", {}).get("authorizer", {}).get(USER_ID_EVENT_KEY, {})

    builder.set_model_defaults(LLMProviderTypes.BEDROCK, model_id)
    builder.set_knowledge_base()
    builder.set_conversation_memory(user_id, chat_event_body[MESSAGE_KEY][CONVERSATION_ID_EVENT_KEY])
    with patch(
        "clients.builders.llm_builder.WebsocketStreamingCallbackHandler",
        return_value=AsyncIteratorCallbackHandler(),
    ):
        builder.set_llm_model()
        assert type(builder.llm_model) == model
        assert builder.llm_model.model == model_id
        assert builder.llm_model.model_arn == test_provisioned_arn
