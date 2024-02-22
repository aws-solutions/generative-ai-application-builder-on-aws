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
from clients.anthropic_client import AnthropicClient
from llms.anthropic import AnthropicLLM
from llms.rag.anthropic_retrieval import AnthropicRetrievalLLM
from utils.constants import (
    CHAT_IDENTIFIER,
    DEFAULT_PLACEHOLDERS,
    DEFAULT_RAG_PLACEHOLDERS,
    LLM_PARAMETERS_SSM_KEY_ENV_VAR,
    RAG_CHAT_IDENTIFIER,
)

ANTHROPIC_PROMPT = """\n\n{history}\n\n{input}"""
ANTHROPIC_RAG_PROMPT = """{context}\n\n{chat_history}\n\n{question}"""


@pytest.fixture
def llm_client(rag_enabled):
    yield AnthropicClient(rag_enabled=rag_enabled, connection_id="fake-connection_id")


@pytest.mark.parametrize(
    "prompt, is_streaming, rag_enabled, return_source_docs, model_id",
    [(ANTHROPIC_PROMPT, False, False, False, "claude-1")],
)
def test_get_model(llm_config, model_id, chat_event):
    os.environ[LLM_PARAMETERS_SSM_KEY_ENV_VAR] = "fake-key"
    client = AnthropicClient(connection_id="fake-connection-id", rag_enabled=False)

    with patch("clients.anthropic_client.AnthropicClient.construct_chat_model") as mocked_chat_model_construction:
        with patch("clients.anthropic_client.AnthropicClient.get_llm_config") as mocked_get_llm_config:
            mocked_chat_model_construction.return_value = None
            mocked_get_llm_config.return_value = json.loads(llm_config["Parameter"]["Value"])
            try:
                event_body = json.loads(chat_event["body"])
                assert client.get_model(event_body, "fake-user-uuid") is None
                assert client.builder.conversation_id == "fake-conversation-id"
            except Exception as exc:
                assert False, f"'client.get_model' raised an exception {exc}"


@pytest.mark.parametrize(
    "use_case, is_streaming, rag_enabled, return_source_docs, llm_type, prompt, placeholders, model_id",
    [
        (
            CHAT_IDENTIFIER,
            False,
            False,
            False,
            AnthropicLLM,
            ANTHROPIC_PROMPT,
            DEFAULT_PLACEHOLDERS,
            "claude-1",
        ),
        (
            RAG_CHAT_IDENTIFIER,
            False,
            True,
            False,
            AnthropicRetrievalLLM,
            ANTHROPIC_RAG_PROMPT,
            DEFAULT_RAG_PLACEHOLDERS,
            "claude-1",
        ),
        (
            RAG_CHAT_IDENTIFIER,
            False,
            True,
            True,
            AnthropicRetrievalLLM,
            ANTHROPIC_RAG_PROMPT,
            DEFAULT_RAG_PLACEHOLDERS,
            "claude-1",
        ),
        (
            RAG_CHAT_IDENTIFIER,
            False,
            True,
            True,
            AnthropicRetrievalLLM,
            ANTHROPIC_RAG_PROMPT,
            DEFAULT_RAG_PLACEHOLDERS,
            "claude-1",
        ),
    ],
)
def test_construct_chat_model1(
    use_case,
    model_id,
    is_streaming,
    rag_enabled,
    return_source_docs,
    llm_type,
    prompt,
    placeholders,
    chat_event,
    llm_config,
    llm_client,
    ssm_stubber,
    setup_environment,
    setup_secret,
    anthropic_dynamodb_defaults_table,
):
    parsed_config = deepcopy(json.loads(llm_config["Parameter"]["Value"]))
    parsed_config["LlmParams"]["ModelId"] = "claude-1"
    config = {"Parameter": {"Value": json.dumps(parsed_config)}}
    chat_event_body = json.loads(chat_event["body"])
    ssm_stubber.add_response("get_parameter", config)
    ssm_stubber.activate()
    llm_client.get_model(chat_event_body, "fake-user-id")

    ssm_stubber.deactivate()

    assert type(llm_client.builder.llm_model) == llm_type
    assert llm_client.builder.llm_model.model == parsed_config["LlmParams"]["ModelId"]
    assert llm_client.builder.llm_model.api_token == "fake-secret-value"
    assert llm_client.builder.llm_model.model_params == {"max_length": 100, "top_p": 0.2, "temperature": 0.2}
    assert llm_client.builder.llm_model.prompt_template.template == parsed_config["LlmParams"]["PromptTemplate"]
    assert set(llm_client.builder.llm_model.prompt_template.input_variables) == set(placeholders)
    assert llm_client.builder.llm_model.streaming == parsed_config["LlmParams"]["Streaming"]
    assert llm_client.builder.llm_model.verbose == parsed_config["LlmParams"]["Verbose"]
