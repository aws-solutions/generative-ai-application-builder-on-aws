#!/usr/bin/env python
# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

import os

import pytest
from langchain_aws.retrievers.bedrock import RetrievalConfig, VectorSearchConfig
from langchain_core.documents import Document
from shared.knowledge.bedrock_knowledge_base import BedrockKnowledgeBase
from utils.constants import BEDROCK_KNOWLEDGE_BASE_ID_ENV_VAR

knowledge_base_params = {
    "KnowledgeBaseType": "Bedrock",
    "NumberOfDocs": 3,
    "ReturnSourceDocs": False,
    "ScoreThreshold": 0.75,
    "BedrockKnowledgeBaseParams": {
        "RetrievalFilter": {
            "equals": {"key": "year", "value": 2024},
        }
    },
}


def test_knowledge_base_construction_fails(setup_environment):
    os.environ.pop(BEDROCK_KNOWLEDGE_BASE_ID_ENV_VAR)
    with pytest.raises(ValueError) as error:
        BedrockKnowledgeBase(knowledge_base_params)

    assert error.value.args[0] == "Bedrock knowledge base id env variable is not set"


def test_knowledge_base_construction(setup_environment):
    knowledge_base = BedrockKnowledgeBase(knowledge_base_params)
    assert knowledge_base.knowledge_base_id == "fake-bedrock-knowledge-base-id"
    assert knowledge_base.min_score_confidence == knowledge_base_params["ScoreThreshold"]
    assert knowledge_base.number_of_docs == knowledge_base_params["NumberOfDocs"]
    assert knowledge_base.return_source_documents == knowledge_base_params["ReturnSourceDocs"]

    assert knowledge_base.retriever.knowledge_base_id == "fake-bedrock-knowledge-base-id"
    assert knowledge_base.retriever.retrieval_config == RetrievalConfig(
        **{
            "vectorSearchConfiguration": VectorSearchConfig(
                **{
                    "numberOfResults": knowledge_base_params["NumberOfDocs"],
                    "filter": {
                        "equals": {"key": "year", "value": 2024},
                    },
                }
            )
        }
    )
    assert knowledge_base.retriever.return_source_documents == knowledge_base_params["ReturnSourceDocs"]


def test_knowledge_base_construction_no_filter(setup_environment):
    del knowledge_base_params["BedrockKnowledgeBaseParams"]["RetrievalFilter"]
    knowledge_base = BedrockKnowledgeBase(knowledge_base_params)
    assert knowledge_base.knowledge_base_id == "fake-bedrock-knowledge-base-id"
    assert knowledge_base.number_of_docs == knowledge_base_params["NumberOfDocs"]
    assert knowledge_base.return_source_documents == knowledge_base_params["ReturnSourceDocs"]

    assert knowledge_base.retriever.knowledge_base_id == "fake-bedrock-knowledge-base-id"
    assert knowledge_base.retriever.retrieval_config == RetrievalConfig(
        **{
            "vectorSearchConfiguration": VectorSearchConfig(
                **{"numberOfResults": knowledge_base_params["NumberOfDocs"]}
            )
        }
    )
    assert knowledge_base.retriever.return_source_documents == knowledge_base_params["ReturnSourceDocs"]


def test_knowledge_base_construction_override_search(setup_environment):
    knowledge_base_params["BedrockKnowledgeBaseParams"]["OverrideSearchType"] = "SEMANTIC"
    knowledge_base = BedrockKnowledgeBase(knowledge_base_params)
    assert knowledge_base.knowledge_base_id == "fake-bedrock-knowledge-base-id"
    assert knowledge_base.min_score_confidence == knowledge_base_params["ScoreThreshold"]
    assert knowledge_base.number_of_docs == knowledge_base_params["NumberOfDocs"]
    assert knowledge_base.return_source_documents == knowledge_base_params["ReturnSourceDocs"]

    assert knowledge_base.retriever.knowledge_base_id == "fake-bedrock-knowledge-base-id"
    assert knowledge_base.retriever.retrieval_config == RetrievalConfig(
        **{
            "vectorSearchConfiguration": VectorSearchConfig(
                **{
                    "numberOfResults": knowledge_base_params["NumberOfDocs"],
                    "overrideSearchType": "SEMANTIC",
                }
            )
        }
    )

    assert knowledge_base.retriever.return_source_documents == knowledge_base_params["ReturnSourceDocs"]


def test_knowledge_base_construction_override_search_nullified(setup_environment):
    knowledge_base_params["BedrockKnowledgeBaseParams"]["OverrideSearchType"] = None
    knowledge_base = BedrockKnowledgeBase(knowledge_base_params)
    assert knowledge_base.knowledge_base_id == "fake-bedrock-knowledge-base-id"
    assert knowledge_base.min_score_confidence == knowledge_base_params["ScoreThreshold"]
    assert knowledge_base.number_of_docs == knowledge_base_params["NumberOfDocs"]
    assert knowledge_base.return_source_documents == knowledge_base_params["ReturnSourceDocs"]

    assert knowledge_base.retriever.knowledge_base_id == "fake-bedrock-knowledge-base-id"
    assert knowledge_base.retriever.retrieval_config == RetrievalConfig(
        **{
            "vectorSearchConfiguration": VectorSearchConfig(
                **{"numberOfResults": knowledge_base_params["NumberOfDocs"]}
            )
        }
    )
    assert knowledge_base.retriever.return_source_documents == knowledge_base_params["ReturnSourceDocs"]


def test_source_docs_formatter():
    bedrock_kb_results = [
        Document(
            page_content="this is an excerpt from a fake bedrock knowledge base",
            metadata={"location": {"type": "S3", "s3Location": {"uri": "s3://fakepath1"}}, "score": 0.25},
        ),
        Document(
            page_content="this is a second excerpt",
            metadata={"location": {"type": "other"}, "score": 0.9},
        ),
        Document(
            page_content="this is a third excerpt",
            metadata={"location": {"type": "WEB", "webLocation": {"url": "https://example.com/1"}}, "score": 0.9},
        ),
        Document(
            page_content="this is a fourth excerpt",
            metadata={
                "location": {"type": "CONFLUENCE", "confluenceLocation": {"url": "https://example.com/2"}},
                "score": 0.9,
            },
        ),
        Document(
            page_content="this is a fifth excerpt",
            metadata={
                "location": {"type": "SALESFORCE", "salesforceLocation": {"url": "https://example.com/3"}},
                "score": 0.9,
            },
        ),
        Document(
            page_content="this is a sixth excerpt",
            metadata={
                "location": {"type": "SHAREPOINT", "sharePointLocation": {"url": "https://example.com/4"}},
                "score": 0.9,
            },
        ),
    ]
    knowledge_base = BedrockKnowledgeBase(knowledge_base_params)
    formatted_docs = knowledge_base.source_docs_formatter(bedrock_kb_results)
    assert formatted_docs == [
        {
            "additional_attributes": None,
            "document_title": None,
            "excerpt": "this is an excerpt from a fake bedrock knowledge base",
            "document_id": None,
            "location": "s3://fakepath1",
            "score": 0.25,
        },
        {
            "additional_attributes": None,
            "document_title": None,
            "excerpt": "this is a second excerpt",
            "document_id": None,
            "location": None,
            "score": 0.9,
        },
        {
            "additional_attributes": None,
            "document_title": None,
            "excerpt": "this is a third excerpt",
            "document_id": None,
            "location": "https://example.com/1",
            "score": 0.9,
        },
        {
            "additional_attributes": None,
            "document_title": None,
            "excerpt": "this is a fourth excerpt",
            "document_id": None,
            "location": "https://example.com/2",
            "score": 0.9,
        },
        {
            "additional_attributes": None,
            "document_title": None,
            "excerpt": "this is a fifth excerpt",
            "document_id": None,
            "location": "https://example.com/3",
            "score": 0.9,
        },
        {
            "additional_attributes": None,
            "document_title": None,
            "excerpt": "this is a sixth excerpt",
            "document_id": None,
            "location": "https://example.com/4",
            "score": 0.9,
        },
    ]
