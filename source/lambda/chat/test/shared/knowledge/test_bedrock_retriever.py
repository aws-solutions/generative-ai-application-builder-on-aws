#!/usr/bin/env python
# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

import json
from pathlib import Path

import pytest
from langchain_core.documents import Document
from shared.knowledge.bedrock_retriever import CustomBedrockRetriever

BEDROCK_KNOWLEDGE_BASE_RESPONSE = None


@pytest.fixture(scope="function")
def bedrock_retriever(bedrock_agent_stubber):
    yield CustomBedrockRetriever(
        knowledge_base_id="fakeBedrockKB",
        retrieval_config={
            "vectorSearchConfiguration": {
                "numberOfResults": 3,
                "filter": {
                    "equals": {"key": "year", "value": 2024},
                },
            }
        },
        return_source_documents=False,
        min_score_confidence=0.75,
    )


def get_bedrock_result_stubbed(bedrock_agent_stubber):
    responses = load_bedrock_response()
    bedrock_agent_stubber.add_response(
        "retrieve",
        expected_params={
            "retrievalQuery": {"text": "sample query"},
            "knowledgeBaseId": "fakeBedrockKB",
            "retrievalConfiguration": {
                "vectorSearchConfiguration": {
                    "numberOfResults": 3,
                    "filter": {
                        "equals": {"key": "year", "value": 2024},
                    },
                }
            },
        },
        service_response=responses,
    )
    return bedrock_agent_stubber


def load_bedrock_response(file_name="mock_bedrock_response.json"):
    global BEDROCK_KNOWLEDGE_BASE_RESPONSE
    if BEDROCK_KNOWLEDGE_BASE_RESPONSE is None:
        with open(Path(__file__).parent / file_name) as f:
            BEDROCK_KNOWLEDGE_BASE_RESPONSE = json.load(f)
    return BEDROCK_KNOWLEDGE_BASE_RESPONSE


def bedrock_query_expected_response():
    return {
        "retrievalResults": [
            {
                "content": {"text": "this is an excerpt from a fake bedrock knowledge base"},
                "location": {"type": "S3", "s3Location": {"uri": "s3://fakepath1"}},
                "score": 0.25,
            },
            {
                "content": {"text": "this is another excerpt from a fake bedrock knowledge base"},
                "location": {"type": "S3", "s3Location": {"uri": "s3://fakepath2"}},
                "score": 0.9,
            },
        ]
    }


def test_bedrock_retriever(bedrock_retriever):
    assert bedrock_retriever


def test_get_relevant_documents(bedrock_retriever, bedrock_agent_stubber):
    bedrock_agent_stubber = get_bedrock_result_stubbed(bedrock_agent_stubber)
    with bedrock_agent_stubber:
        response = bedrock_retriever._get_relevant_documents("sample query")

    assert len(response) == len(
        [item for item in bedrock_query_expected_response()["retrievalResults"] if (item["score"] >= 0.75)]
    )
    assert type(response[0]) == Document


def test_bedrock_throws_client_error(bedrock_retriever, bedrock_agent_stubber, setup_environment):
    bedrock_agent_stubber.add_client_error(
        "retrieve",
    )
    with bedrock_agent_stubber:
        response = bedrock_retriever._get_relevant_documents("sample query")
    assert response == []
