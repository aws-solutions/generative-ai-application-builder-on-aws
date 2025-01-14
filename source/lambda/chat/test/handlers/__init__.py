#!/usr/bin/env python
# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

from langchain_core.documents import Document

mocked_kendra_docs = [
    Document(
        **{
            "page_content": "this is an excerpt from a fake bedrock knowledge base",
            "metadata": {
                "result_id": "fakeid1",
                "document_id": "some.doc.1",
                "source": "http://fakeurl1.html",
                "title": "Fake Doc Title 1",
                "excerpt": "this is an excerpt from a fake kendra knowledge base",
                "document_attributes": {"_source_uri": "http://fakeurl1.html"},
                "score": "HIGH",
            },
        }
    ),
    Document(
        **{
            "page_content": "this is a second excerpt",
            "metadata": {
                "result_id": "fakeid2",
                "document_id": "some.doc.2",
                "source": "http://fakeurl2.html",
                "title": "Fake Doc Title 2",
                "excerpt": "this is a second excerpt",
                "document_attributes": {"_source_uri": "http://fakeurl2.html"},
                "score": "VERY_HIGH",
            },
        }
    ),
]


def kendra_source_doc_responses(conversation_id):
    return [
        {
            "sourceDocument": {
                "excerpt": "this is an excerpt from a fake kendra knowledge base",
                "location": "http://fakeurl1.html",
                "score": "HIGH",
                "document_title": "Fake Doc Title 1",
                "document_id": "some.doc.1",
                "additional_attributes": {"_source_uri": "http://fakeurl1.html"},
            },
            "conversationId": conversation_id,
        },
        {
            "sourceDocument": {
                "excerpt": "this is a second excerpt",
                "location": "http://fakeurl2.html",
                "score": "VERY_HIGH",
                "document_title": "Fake Doc Title 2",
                "document_id": "some.doc.2",
                "additional_attributes": {"_source_uri": "http://fakeurl2.html"},
            },
            "conversationId": conversation_id,
        },
    ]


mocked_bedrock_docs = [
    Document(
        page_content="this is an excerpt from a fake bedrock knowledge base",
        metadata={"location": {"type": "S3", "s3Location": {"uri": "s3://fakepath1"}}, "score": 123.0},
    ),
    Document(
        page_content="this is a second excerpt",
        metadata={"location": {"type": "other"}, "score": 456.0},
    ),
]


def bedrock_source_doc_responses(conversation_id):
    return [
        {
            "sourceDocument": {
                "excerpt": "this is an excerpt from a fake bedrock knowledge base",
                "location": "s3://fakepath1",
                "score": 123.0,
                "document_title": None,
                "document_id": None,
                "additional_attributes": None,
            },
            "conversationId": conversation_id,
        },
        {
            "sourceDocument": {
                "excerpt": "this is a second excerpt",
                "location": None,
                "score": 456.0,
                "document_title": None,
                "document_id": None,
                "additional_attributes": None,
            },
            "conversationId": conversation_id,
        },
    ]
