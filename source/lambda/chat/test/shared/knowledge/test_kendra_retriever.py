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
from pathlib import Path
from unittest import mock
from unittest.mock import Mock, patch

import pytest
from botocore.exceptions import ClientError
from cognito_jwt_verifier import CognitoJWTVerifier
from langchain_aws.retrievers.kendra import (
    KENDRA_CONFIDENCE_MAPPING,
    DocumentAttribute,
    DocumentAttributeValue,
    RetrieveResultItem,
)
from langchain_core.documents import Document
from shared.knowledge.kendra_retriever import CustomKendraRetriever

KENDRA_RESPONSE = None
attribute_filter = {
    "AndAllFilters": [
        {"EqualsTo": {"Key": "user_id", "Value": {"StringValue": "12345"}}},
    ]
}


@pytest.fixture
def rag_rbac_enabled():
    return True


@pytest.fixture(scope="function")
@patch.object(CognitoJWTVerifier, "verify_jwt_token", return_value=True)
def kendra_retriever(
    kendra_stubber,
    user_context_token,
    rag_rbac_enabled,
):
    mocked_verifier = Mock(CognitoJWTVerifier)
    mocked_verifier.extract_groups_from_jwt_token.return_value = ["group1", "group2"]
    mocked_verifier.extract_username_from_jwt_token.return_value = "user1"

    return CustomKendraRetriever(
        index_id="00000000-0000-0000-0000-000000000000",
        top_k=10,
        return_source_documents=False,
        attribute_filter=attribute_filter,
        user_context_token=user_context_token,
        rag_rbac_enabled=rag_rbac_enabled,
        min_score_confidence=KENDRA_CONFIDENCE_MAPPING.get("HIGH"),
        user_context_token_verifier=mocked_verifier,
    )


def get_kendra_result_stubbed(kendra_stubber):
    responses = load_kendra_response()
    kendra_stubber.add_response(
        "retrieve",
        expected_params={
            "AttributeFilter": attribute_filter,
            "IndexId": "00000000-0000-0000-0000-000000000000",
            "PageSize": 10,
            "QueryText": "sample query",
        },
        service_response=responses,
    )
    return kendra_stubber


def load_kendra_response(file_name="mock_kendra_response.json"):
    global KENDRA_RESPONSE
    if KENDRA_RESPONSE is None:
        with open(Path(__file__).parent / file_name) as f:
            KENDRA_RESPONSE = json.load(f)
    return KENDRA_RESPONSE


def kendra_query_expected_response():
    return [
        RetrieveResultItem(
            Id="mock-medium-result-id",
            DocumentId="AmazonS3.latest.dev.Introduction",
            DocumentURI="http://docs.aws.amazon.com/AmazonS3/latest/dev/Introduction.html",
            DocumentAttributes=[
                DocumentAttribute(
                    Key="_source_uri",
                    Value=DocumentAttributeValue(
                        StringValue="http://docs.aws.amazon.com/AmazonS3/latest/dev/Introduction.html",
                    ),
                )
            ],
            DocumentTitle="Introduction to Amazon S3 - Amazon Simple Storage Service",
            Content="Document Title: Introduction to Amazon S3 - Amazon Simple Storage Service\nDocument Excerpt: \nAWSDocumentationAmazon Simple Storage Service (S3) Developer Guide Overview of Amazon S3",
            page_content="Document Title: Introduction to Amazon S3 - Amazon Simple Storage Service Document Excerpt: AWSDocumentationAmazon Simple Storage Service (S3) Developer Guide Overview of Amazon S3",
            ScoreAttributes={
                "ScoreConfidence": "MEDIUM",
            },
        ),
        RetrieveResultItem(
            Id="mock-high-result-id",
            DocumentId="AmazonS3.latest.dev.Introduction",
            DocumentURI="http://docs.aws.amazon.com/AmazonS3/latest/dev/Introduction.html",
            DocumentAttributes=[
                DocumentAttribute(
                    Key="_source_uri",
                    Value=DocumentAttributeValue(
                        StringValue="http://docs.aws.amazon.com/AmazonS3/latest/dev/Introduction.html",
                    ),
                )
            ],
            DocumentTitle="Introduction to Amazon S3 - Amazon Simple Storage Service",
            Content="Document Title: Introduction to Amazon S3 - Amazon Simple Storage Service\nDocument Excerpt: \nAWSDocumentationAmazon Simple Storage Service (S3) Developer Guide Overview of Amazon S3",
            page_content="Document Title: Introduction to Amazon S3 - Amazon Simple Storage Service Document Excerpt: AWSDocumentationAmazon Simple Storage Service (S3) Developer Guide Overview of Amazon S3",
            ScoreAttributes={
                "ScoreConfidence": "HIGH",
            },
        ),
    ]


def test_kendra_retriever(kendra_retriever):
    assert kendra_retriever


def test_kendra_query(kendra_retriever, kendra_stubber, setup_environment, user_context_token, rag_rbac_enabled):
    kendra_stubber = get_kendra_result_stubbed(kendra_stubber)
    kendra_stubber.activate()
    response = kendra_retriever._kendra_query("sample query")
    kendra_stubber.deactivate()

    assert response == kendra_query_expected_response()


def test_get_relevant_documents(
    kendra_retriever, kendra_stubber, user_context_token, rag_rbac_enabled, setup_environment
):
    kendra_stubber = get_kendra_result_stubbed(kendra_stubber)
    kendra_stubber.activate()
    response = kendra_retriever._get_relevant_documents("sample query")
    kendra_stubber.deactivate()

    assert len(response) == len(
        [
            item
            for item in kendra_query_expected_response()
            if (item.get_score_attribute() == "HIGH" or item.get_score_attribute() == "VERY_HIGH")
        ]
    )
    assert type(response[0]) == Document


def test_kendra_throws_client_error(kendra_retriever, user_context_token, rag_rbac_enabled, setup_environment):
    with mock.patch("shared.knowledge.kendra_retriever.CustomKendraRetriever._kendra_query") as mocked_query:
        mocked_query.side_effect = ClientError(
            {"Error": {"Code": "InternalServerException", "Message": "fake-error"}}, "Retrieve"
        )

    response = kendra_retriever._get_relevant_documents("sample query")
    assert response == []


def test_create_user_context_attribute_filter_valid(
    kendra_retriever,
    rag_rbac_enabled,
    valid_jwt_token,
):

    result = kendra_retriever._create_user_context_attribute_filter(valid_jwt_token, rag_rbac_enabled)
    expected_result = [
        {
            "EqualsTo": {
                "Key": "_user_id",
                "Value": {"StringValue": "user1"},
            }
        },
        {
            "EqualsTo": {
                "Key": "_group_ids",
                "Value": {"StringListValue": ["group1", "group2"]},
            }
        },
    ]

    assert result == expected_result


def test_create_user_context_attribute_filter_rag_rbac_disabled(
    kendra_retriever, user_context_token, rag_rbac_enabled=False
):
    result = kendra_retriever._create_user_context_attribute_filter(user_context_token, rag_rbac_enabled)

    assert result is None


def test_create_user_context_attribute_filter_no_token(kendra_retriever, rag_rbac_enabled=True):
    with pytest.raises(ValueError, match="user_context_token is required for RAG with user context filtering"):
        kendra_retriever._create_user_context_attribute_filter(None, rag_rbac_enabled)


def test_kendra_retriever_instantiation_missing_verifier(user_context_token, rag_rbac_enabled=True):
    with pytest.raises(
        ValueError,
        match="user_context_token_verifier is required for RAG with user context filtering, and must be an instance of CognitoJWTVerifier",
    ):
        kendra_retriever = CustomKendraRetriever(
            index_id="00000000-0000-0000-0000-000000000000",
            top_k=10,
            return_source_documents=False,
            attribute_filter=attribute_filter,
            user_context_token=user_context_token,
            rag_rbac_enabled=rag_rbac_enabled,
            min_score_confidence=KENDRA_CONFIDENCE_MAPPING.get("HIGH"),
        )
        kendra_retriever._create_user_context_attribute_filter(user_context_token, rag_rbac_enabled)


def test_kendra_retriever_instantiation(rag_rbac_enabled=False):
    kendra_retriever = CustomKendraRetriever(
        index_id="00000000-0000-0000-0000-000000000000",
        top_k=10,
        return_source_documents=False,
        attribute_filter=attribute_filter,
        rag_rbac_enabled=rag_rbac_enabled,
        min_score_confidence=KENDRA_CONFIDENCE_MAPPING.get("HIGH"),
    )
    assert kendra_retriever


@patch.object(CustomKendraRetriever, "_create_user_context_attribute_filter")
def test_add_user_context_to_attribute_filter_valid(
    mock_create_user_context_attribute_filter, kendra_retriever, rag_rbac_enabled, user_context_token
):
    existing_attribute_filter = {"OrAllFilters": [{"Key": "existing_filter"}]}
    mock_create_user_context_attribute_filter.return_value = [{"Key": "user_filter"}]

    result = kendra_retriever._add_user_context_to_attribute_filter(
        existing_attribute_filter, user_context_token, rag_rbac_enabled
    )

    expected_result = {
        "OrAllFilters": [
            {"Key": "existing_filter"},
            {"Key": "user_filter"},
        ]
    }

    assert result == expected_result


@patch.object(CustomKendraRetriever, "_create_user_context_attribute_filter")
def test_add_user_context_to_attribute_filter_no_existing_filter(
    mock_create_user_context_attribute_filter, kendra_retriever, rag_rbac_enabled, user_context_token
):
    existing_attribute_filter = {}
    mock_create_user_context_attribute_filter.return_value = [{"Key": "user_filter"}]

    result = kendra_retriever._add_user_context_to_attribute_filter(
        existing_attribute_filter, user_context_token, rag_rbac_enabled
    )

    expected_result = {"OrAllFilters": [{"Key": "user_filter"}]}

    assert result == expected_result
