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
from unittest import mock
from unittest.mock import MagicMock, patch

import pytest
from clients.huggingface_client import HuggingFaceClient
from llms.huggingface import HuggingFaceLLM
from llms.rag.huggingface_retrieval import HuggingFaceRetrievalLLM
from utils.constants import (
    CHAT_IDENTIFIER,
    DEFAULT_HUGGINGFACE_TASK,
    DEFAULT_PLACEHOLDERS,
    DEFAULT_RAG_PLACEHOLDERS,
    LLM_PARAMETERS_SSM_KEY_ENV_VAR,
    RAG_CHAT_IDENTIFIER,
)

HUGGINGFACE_PROMPT = """\n\n{history}\n\n{input}"""
HUGGINGFACE_RAG_PROMPT = """{context}\n\n{chat_history}\n\n{question}"""


@pytest.fixture
def llm_client(rag_enabled):
    yield HuggingFaceClient(rag_enabled=rag_enabled, connection_id="fake-connection_id")


@pytest.mark.parametrize(
    "prompt, is_streaming, rag_enabled, return_source_docs, model_id",
    [(HUGGINGFACE_PROMPT, False, False, False, "google/flan-t5-xxl")],
)
def test_parent_get_llm_config(llm_config, chat_event, model_id):
    os.environ[LLM_PARAMETERS_SSM_KEY_ENV_VAR] = "fake-key"
    client = HuggingFaceClient(rag_enabled=False, connection_id="fake-connection-id")

    with patch("clients.huggingface_client.HuggingFaceClient.construct_chat_model") as mocked_chat_model_construction:
        with patch("clients.huggingface_client.HuggingFaceClient.get_llm_config") as mocked_get_llm_config:
            mocked_chat_model_construction.return_value = None
            mocked_get_llm_config.return_value = json.loads(llm_config["Parameter"]["Value"])
            try:
                event_body = json.loads(chat_event["body"])
                assert client.get_model(event_body, "fake-user-uuid") is None
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
            HuggingFaceLLM,
            HUGGINGFACE_PROMPT,
            DEFAULT_PLACEHOLDERS,
            "google/flan-t5-xxl",
        ),
        (
            RAG_CHAT_IDENTIFIER,
            False,
            True,
            False,
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
    huggingface_dynamodb_defaults_table,
):
    with mock.patch("huggingface_hub.inference_api.InferenceApi") as mocked_hf_call:
        mock_obj = MagicMock()
        mock_obj.task = DEFAULT_HUGGINGFACE_TASK
        mocked_hf_call.return_value = mock_obj

        config = json.loads(llm_config["Parameter"]["Value"])
        chat_event_body = json.loads(chat_event["body"])
        ssm_stubber.add_response("get_parameter", llm_config)
        ssm_stubber.activate()
        llm_client.get_model(chat_event_body, "fake-user-id")
        ssm_stubber.deactivate()

        assert type(llm_client.builder.llm_model) == llm_type
        assert llm_client.builder.llm_model.model == config["LlmParams"]["ModelId"]
        assert llm_client.builder.llm_model.api_token == "fake-secret-value"
        assert llm_client.builder.llm_model.model_params == {"max_length": 100, "top_p": 0.2, "temperature": 0.2}
        assert llm_client.builder.llm_model.prompt_template.template == config["LlmParams"]["PromptTemplate"]
        assert set(llm_client.builder.llm_model.prompt_template.input_variables) == set(placeholders)
        assert llm_client.builder.llm_model.streaming == config["LlmParams"]["Streaming"]
        assert llm_client.builder.llm_model.verbose == config["LlmParams"]["Verbose"]
