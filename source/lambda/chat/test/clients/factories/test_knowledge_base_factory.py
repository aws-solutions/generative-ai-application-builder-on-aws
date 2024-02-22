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
from clients.factories.knowledge_base_factory import KnowledgeBaseFactory
from shared.knowledge.kendra_knowledge_base import KendraKnowledgeBase
from utils.constants import KENDRA_INDEX_ID_ENV_VAR

HUGGINGFACE_PROMPT = """\n\n{history}\n\n{input}"""


@pytest.mark.parametrize(
    "prompt, is_streaming, rag_enabled, return_source_docs, model_id",
    [(HUGGINGFACE_PROMPT, False, False, False, "google/flan-t5-xxl")],
)
def test_get_kb_memory_success(llm_config, setup_environment, model_id):
    config = json.loads(llm_config["Parameter"]["Value"])
    errors_list = []
    response = KnowledgeBaseFactory().get_knowledge_base(config, errors_list)
    assert type(response) == KendraKnowledgeBase
    assert response.kendra_index_id == "fake-kendra-index-id"
    assert response.number_of_docs == 2
    assert response.return_source_documents == False
    assert errors_list == []


@pytest.mark.parametrize(
    "prompt, is_streaming, rag_enabled, return_source_docs, model_id",
    [(HUGGINGFACE_PROMPT, False, False, False, "google/flan-t5-xxl")],
)
def test_unsupported_kb(llm_config, model_id):
    errors_list = []
    config = deepcopy(json.loads(llm_config["Parameter"]["Value"]))
    config["KnowledgeBaseType"] = "OpenSearch"
    response = KnowledgeBaseFactory().get_knowledge_base(config, errors_list)
    assert response is None
    assert errors_list == ["Unsupported KnowledgeBase type: OpenSearch. Supported types are: ['Kendra']"]


@pytest.mark.parametrize(
    "prompt, is_streaming, rag_enabled, return_source_docs, model_id",
    [(HUGGINGFACE_PROMPT, False, False, False, "google/flan-t5-xxl")],
)
def test_get_kb_missing_kendra_index(llm_config, model_id, setup_environment):
    errors_list = []
    config = deepcopy(json.loads(llm_config["Parameter"]["Value"]))
    os.environ.pop(KENDRA_INDEX_ID_ENV_VAR, None)
    with pytest.raises(ValueError):
        response = KnowledgeBaseFactory().get_knowledge_base(config, errors_list)
        assert response is None
        assert errors_list == [
            f"Missing required environment variable {KENDRA_INDEX_ID_ENV_VAR} for Kendra knowledge base."
        ]


@pytest.mark.parametrize(
    "prompt, is_streaming, rag_enabled, return_source_docs, model_id",
    [(HUGGINGFACE_PROMPT, False, False, False, "google/flan-t5-xxl")],
)
def test_get_kb_missing_config(llm_config, model_id):
    errors_list = []
    config = deepcopy(json.loads(llm_config["Parameter"]["Value"]))
    del config["KnowledgeBaseParams"]
    response = KnowledgeBaseFactory().get_knowledge_base(config, errors_list)
    assert response is None
    assert errors_list == [
        f"Missing required field (KnowledgeBaseParams) in the configuration for the specified Knowledge Base {config['KnowledgeBaseType']}"
    ]


@pytest.mark.parametrize(
    "prompt, is_streaming, rag_enabled, return_source_docs, model_id",
    [(HUGGINGFACE_PROMPT, False, False, False, "google/flan-t5-xxl")],
)
def test_get_kb_missing_type(llm_config, model_id):
    # When KnowledgeBaseType is not supplied, logs info and returns silently.
    errors_list = []
    config = deepcopy(json.loads(llm_config["Parameter"]["Value"]))
    del config["KnowledgeBaseType"]

    response = KnowledgeBaseFactory().get_knowledge_base(config, errors_list)
    assert response is None
    assert errors_list == ["Missing required field (KnowledgeBaseType) in the configuration"]
