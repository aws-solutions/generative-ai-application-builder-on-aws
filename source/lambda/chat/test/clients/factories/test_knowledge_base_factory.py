#!/usr/bin/env python
# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

import os
from copy import deepcopy

import pytest
from clients.factories.knowledge_base_factory import KNOWLEDGE_BASE_MAP, KnowledgeBaseFactory
from utils.constants import BEDROCK_KNOWLEDGE_BASE_ID_ENV_VAR, KENDRA_INDEX_ID_ENV_VAR
from utils.enum_types import KnowledgeBaseTypes

TEST_PROMPT = """\n\n{history}\n\n{input}"""


@pytest.mark.parametrize(
    "prompt, is_streaming, rag_enabled, knowledge_base_type, return_source_docs, model_id",
    [
        (TEST_PROMPT, False, True, KnowledgeBaseTypes.KENDRA.value, False, "google/flan-t5-xxl"),
        (TEST_PROMPT, False, True, KnowledgeBaseTypes.BEDROCK.value, False, "google/flan-t5-xxl"),
        (TEST_PROMPT, False, True, KnowledgeBaseTypes.KENDRA.value, True, "google/flan-t5-xxl"),
        (TEST_PROMPT, False, True, KnowledgeBaseTypes.BEDROCK.value, True, "google/flan-t5-xxl"),
    ],
)
def test_get_kb_memory_success(
    bedrock_llm_config, setup_environment, model_id, knowledge_base_type, return_source_docs, user_context_token
):
    config = bedrock_llm_config
    errors_list = []
    response = KnowledgeBaseFactory().get_knowledge_base(config, errors_list, user_context_token)
    assert type(response) == KNOWLEDGE_BASE_MAP.get(knowledge_base_type)
    if knowledge_base_type == KnowledgeBaseTypes.KENDRA.value:
        assert response.kendra_index_id == "fake-kendra-index-id"
    elif knowledge_base_type == KnowledgeBaseTypes.BEDROCK.value:
        assert response.knowledge_base_id == "fake-bedrock-knowledge-base-id"
    assert response.number_of_docs == 2
    assert response.return_source_documents == return_source_docs
    assert errors_list == []


@pytest.mark.parametrize(
    "prompt, is_streaming, rag_enabled, knowledge_base_type, return_source_docs, model_id",
    [(TEST_PROMPT, False, True, "FakeKnowledgeBase", False, "google/flan-t5-xxl")],
)
def test_unsupported_kb(bedrock_llm_config, model_id, user_context_token):
    errors_list = []
    config = deepcopy(bedrock_llm_config)
    response = KnowledgeBaseFactory().get_knowledge_base(config, errors_list, user_context_token)
    assert response is None
    assert errors_list == [
        "Unsupported KnowledgeBase type: FakeKnowledgeBase. Supported types are: ['Kendra', 'Bedrock']"
    ]


@pytest.mark.parametrize(
    "prompt, is_streaming, rag_enabled, knowledge_base_type, return_source_docs, model_id",
    [(TEST_PROMPT, False, True, KnowledgeBaseTypes.KENDRA.value, False, "google/flan-t5-xxl")],
)
def test_get_kb_missing_kendra_index(
    bedrock_llm_config,
    model_id,
    setup_environment,
    user_context_token,
):
    errors_list = []
    config = deepcopy(bedrock_llm_config)
    os.environ.pop(KENDRA_INDEX_ID_ENV_VAR, None)
    with pytest.raises(ValueError):
        response = KnowledgeBaseFactory().get_knowledge_base(config, errors_list, user_context_token)
        assert response is None
        assert errors_list == [
            f"Missing required environment variable {KENDRA_INDEX_ID_ENV_VAR} for Kendra knowledge base."
        ]


@pytest.mark.parametrize(
    "prompt, is_streaming, rag_enabled, knowledge_base_type, return_source_docs, model_id",
    [(TEST_PROMPT, False, True, KnowledgeBaseTypes.BEDROCK.value, False, "google/flan-t5-xxl")],
)
def test_get_kb_missing_bedrock_knowledge_base_id(
    bedrock_llm_config,
    model_id,
    setup_environment,
    user_context_token,
):
    errors_list = []
    config = deepcopy(bedrock_llm_config)
    os.environ.pop(BEDROCK_KNOWLEDGE_BASE_ID_ENV_VAR, None)
    with pytest.raises(ValueError):
        response = KnowledgeBaseFactory().get_knowledge_base(config, errors_list, user_context_token)
        assert response is None
        assert errors_list == [
            f"Missing required environment variable {BEDROCK_KNOWLEDGE_BASE_ID_ENV_VAR} for Kendra knowledge base."
        ]


@pytest.mark.parametrize(
    "prompt, is_streaming, rag_enabled, knowledge_base_type, return_source_docs, model_id",
    [
        (TEST_PROMPT, False, True, KnowledgeBaseTypes.KENDRA.value, False, "google/flan-t5-xxl"),
        (TEST_PROMPT, False, True, KnowledgeBaseTypes.BEDROCK.value, False, "google/flan-t5-xxl"),
    ],
)
def test_get_kb_missing_config(bedrock_llm_config, model_id, user_context_token):
    errors_list = []
    config = deepcopy(bedrock_llm_config)
    del config["KnowledgeBaseParams"]
    response = KnowledgeBaseFactory().get_knowledge_base(config, errors_list, user_context_token)
    assert response is None
    assert errors_list == [
        f"Missing required field (KnowledgeBaseParams) in the configuration for the specified Knowledge Base"
    ]


@pytest.mark.parametrize(
    "prompt, is_streaming, rag_enabled, knowledge_base_type, return_source_docs, model_id",
    [(TEST_PROMPT, False, True, None, False, "google/flan-t5-xxl")],
)
def test_get_kb_missing_type(bedrock_llm_config, model_id, user_context_token):
    # When KnowledgeBaseType is not supplied, logs info and returns silently.
    errors_list = []
    config = deepcopy(bedrock_llm_config)
    del config["KnowledgeBaseParams"]["KnowledgeBaseType"]

    response = KnowledgeBaseFactory().get_knowledge_base(config, errors_list, user_context_token)
    assert response is None
    assert errors_list == ["Missing required field (KnowledgeBaseType) in the configuration"]
