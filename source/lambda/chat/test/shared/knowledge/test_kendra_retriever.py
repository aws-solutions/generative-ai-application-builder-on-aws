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

import pytest
from botocore.exceptions import ClientError
from langchain.docstore.document import Document
from langchain.retrievers.kendra import DocumentAttribute, DocumentAttributeValue, RetrieveResultItem
from shared.knowledge.kendra_retriever import CustomKendraRetriever

KENDRA_RESPONSE = None
attribute_filter = {
    "AndAllFilters": [
        {"EqualsTo": {"Key": "user_id", "Value": {"StringValue": "12345"}}},
    ]
}


@pytest.fixture(scope="function")
def kendra_retriever(kendra_stubber):
    yield CustomKendraRetriever(
        index_id="00000000-0000-0000-0000-000000000000",
        top_k=10,
        return_source_documents=False,
        attribute_filter=attribute_filter,
        user_context={"Token": "fake-token"},
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
            "UserContext": {"Token": "fake-token"},
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
            Id="mock-result-id",
            DocumentId="AmazonS3.latest.dev.Introduction",
            DocumentURI="http://docs.aws.amazon.com/AmazonS3/latest/dev/Introduction.html",
            DocumentAttributes=[
                DocumentAttribute(
                    Key="_source_uri",
                    Value=DocumentAttributeValue(
                        DateValue=None,
                        LongValue=None,
                        StringListValue=None,
                        StringValue="http://docs.aws.amazon.com/AmazonS3/latest/dev/Introduction.html",
                    ),
                )
            ],
            DocumentTitle="Introduction to Amazon S3 - Amazon Simple Storage Service",
            Content="Document Title: Introduction to Amazon S3 - Amazon Simple Storage Service\nDocument Excerpt: \nAWSDocumentationAmazon Simple Storage Service (S3) Developer Guide Overview of Amazon S3",
            page_content="Document Title: Introduction to Amazon S3 - Amazon Simple Storage Service Document Excerpt: AWSDocumentationAmazon Simple Storage Service (S3) Developer Guide Overview of Amazon S3",
        )
    ]


def test_kendra_retriever(kendra_retriever):
    assert kendra_retriever


def test_kendra_query(kendra_retriever, kendra_stubber, setup_environment):
    kendra_stubber = get_kendra_result_stubbed(kendra_stubber)
    kendra_stubber.activate()
    response = kendra_retriever._kendra_query("sample query")
    kendra_stubber.deactivate()

    assert response == kendra_query_expected_response()
    assert len(response) == 1


def test_get_relevant_documents(kendra_retriever, kendra_stubber):
    kendra_stubber = get_kendra_result_stubbed(kendra_stubber)
    kendra_stubber.activate()
    response = kendra_retriever._get_relevant_documents("sample query")
    kendra_stubber.deactivate()

    assert len(response) == 1
    assert type(response[0]) == Document


def test_kendra_throws_client_error(kendra_retriever):
    with mock.patch("shared.knowledge.kendra_retriever.CustomKendraRetriever._kendra_query") as mocked_query:
        mocked_query.side_effect = ClientError(
            {"Error": {"Code": "InternalServerException", "Message": "fake-error"}}, "Retrieve"
        )

    response = kendra_retriever._get_relevant_documents("sample query")
    assert response == []
