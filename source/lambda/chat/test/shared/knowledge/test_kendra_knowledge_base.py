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

import os
from unittest.mock import patch

import pytest
from langchain_core.documents import Document
from shared.knowledge.kendra_knowledge_base import KendraKnowledgeBase
from shared.knowledge.kendra_retriever import CustomKendraRetriever
from utils.constants import KENDRA_INDEX_ID_ENV_VAR

knowledge_base_params = {
    "NumberOfDocs": 3,
    "ReturnSourceDocs": False,
    "ScoreThreshold": 0.75,
    "KendraKnowledgeBaseParams": {
        "AttributeFilter": {
            "AndAllFilters": [
                {"EqualsTo": {"Key": "user_id", "Value": {"StringValue": "12345"}}},
            ]
        },
        "RoleBasedAccessControlEnabled": True,
    },
    "UserContext": None,
}


def test_knowledge_base_construction_fails(setup_environment):
    os.environ.pop(KENDRA_INDEX_ID_ENV_VAR)
    with pytest.raises(ValueError) as error:
        KendraKnowledgeBase(knowledge_base_params)

    assert error.value.args[0] == "Kendra index id env variable is not set"


@patch.object(CustomKendraRetriever, "_add_user_context_to_attribute_filter")
def test_knowledge_base_construction(mock_add_user_context_to_attribute_filter, setup_environment, user_context_token):
    mock_add_user_context_to_attribute_filter.return_value = knowledge_base_params.get("KendraKnowledgeBaseParams").get(
        "AttributeFilter"
    )

    knowledge_base = KendraKnowledgeBase(
        knowledge_base_params,
        user_context_token,
    )
    assert knowledge_base.kendra_index_id == "fake-kendra-index-id"
    assert knowledge_base.number_of_docs == knowledge_base_params["NumberOfDocs"]
    assert knowledge_base.return_source_documents == knowledge_base_params["ReturnSourceDocs"]
    assert knowledge_base.attribute_filter == knowledge_base_params["KendraKnowledgeBaseParams"]["AttributeFilter"]
    assert (
        knowledge_base.rag_rbac_enabled
        == knowledge_base_params["KendraKnowledgeBaseParams"]["RoleBasedAccessControlEnabled"]
    )

    assert knowledge_base.retriever.index_id == "fake-kendra-index-id"
    assert knowledge_base.retriever.top_k == knowledge_base_params["NumberOfDocs"]
    assert knowledge_base.retriever.return_source_documents == knowledge_base_params["ReturnSourceDocs"]
    assert knowledge_base.retriever.min_score_confidence == knowledge_base_params["ScoreThreshold"]
    assert (
        knowledge_base.retriever.attribute_filter
        == knowledge_base_params["KendraKnowledgeBaseParams"]["AttributeFilter"]
    )


@patch.object(CustomKendraRetriever, "_add_user_context_to_attribute_filter")
def test_source_docs_formatter(mock_add_user_context_to_attribute_filter, user_context_token):
    kendra_results = [
        Document(
            page_content="this is an excerpt from a fake kendra knowledge base",
            metadata={
                "result_id": "fakeid1",
                "document_id": "some.doc.1",
                "source": "http://fakeurl1.html",
                "title": "Fake Doc Title 1",
                "excerpt": "this is an excerpt from a fake kendra knowledge base",
                "document_attributes": {"_source_uri": "http://fakeurl1.html"},
                "score": "HIGH",
            },
        ),
        Document(
            page_content="this is a second excerpt",
            metadata={
                "result_id": "fakeid2",
                "document_id": "some.doc.2",
                "source": "http://fakeurl2.html",
                "title": "Fake Doc Title 2",
                "excerpt": "this is a second excerpt",
                "document_attributes": {"_source_uri": "http://fakeurl2.html"},
                "score": "VERY_HIGH",
            },
        ),
    ]
    knowledge_base = KendraKnowledgeBase(knowledge_base_params, user_context_token)
    formatted_docs = knowledge_base.source_docs_formatter(kendra_results)
    assert formatted_docs == [
        {
            "additional_attributes": {
                "_source_uri": "http://fakeurl1.html",
            },
            "document_title": "Fake Doc Title 1",
            "excerpt": "this is an excerpt from a fake kendra knowledge base",
            "document_id": "some.doc.1",
            "location": "http://fakeurl1.html",
            "score": "HIGH",
        },
        {
            "additional_attributes": {
                "_source_uri": "http://fakeurl2.html",
            },
            "document_title": "Fake Doc Title 2",
            "excerpt": "this is a second excerpt",
            "document_id": "some.doc.2",
            "location": "http://fakeurl2.html",
            "score": "VERY_HIGH",
        },
    ]
