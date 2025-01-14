#!/usr/bin/env python
# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0


import json

import pytest
from botocore.stub import Stubber
from helper import get_service_client
from operations.operation_types import (
    LOGGING_BUCKET_NAME,
    PHYSICAL_RESOURCE_ID,
    RESOURCE,
    RESOURCE_PROPERTIES,
    SOURCE_BUCKET_NAME,
    SOURCE_PREFIX,
    UPDATE_BUCKET_POLICY,
)
from operations.update_s3_policy import POLICY_SID


@pytest.fixture
def lambda_event(aws_credentials, custom_resource_event):
    custom_resource_event[RESOURCE_PROPERTIES] = {RESOURCE: UPDATE_BUCKET_POLICY}
    custom_resource_event[RESOURCE_PROPERTIES][SOURCE_BUCKET_NAME] = "fake_source_bucket"
    custom_resource_event[RESOURCE_PROPERTIES][SOURCE_PREFIX] = "fake_prefix"
    custom_resource_event[RESOURCE_PROPERTIES][LOGGING_BUCKET_NAME] = "fake_logging_bucket"
    custom_resource_event[PHYSICAL_RESOURCE_ID] = "fake_physical_resource_id"

    yield custom_resource_event


@pytest.fixture
def s3_stub():
    s3 = get_service_client("s3")
    with Stubber(s3) as stubber:
        yield stubber
        stubber.assert_no_pending_responses()


def put_public_access_block_as_false(s3_stub):
    s3_stub.add_response(
        "put_public_access_block",
        expected_params={
            "Bucket": "fake_logging_bucket",
            "PublicAccessBlockConfiguration": {
                "BlockPublicAcls": True,
                "IgnorePublicAcls": True,
                "BlockPublicPolicy": False,
                "RestrictPublicBuckets": True,
            },
            "ExpectedBucketOwner": "123456789012",
        },
        service_response={},
    )
    return s3_stub


httpOnlyAccess = {
    "Action": "s3:*",
    "Effect": "Deny",
    "Principal": "*",
    "Resource": "arn:aws:s3:::fake_logging_bucket",
    "Sid": "HttpOnlyAccess",
}


def put_public_access_block_as_true(s3_stub):
    s3_stub.add_response(
        "put_public_access_block",
        expected_params={
            "Bucket": "fake_logging_bucket",
            "PublicAccessBlockConfiguration": {
                "BlockPublicAcls": True,
                "IgnorePublicAcls": True,
                "BlockPublicPolicy": True,
                "RestrictPublicBuckets": True,
            },
            "ExpectedBucketOwner": "123456789012",
        },
        service_response={},
    )
    return s3_stub


@pytest.fixture
def s3_stub_success(s3_stub):
    s3_stub = put_public_access_block_as_false(s3_stub)
    s3_stub.add_response(
        "get_bucket_policy",
        expected_params={
            "Bucket": "fake_logging_bucket",
        },
        service_response={"Policy": json.dumps({"Statement": [httpOnlyAccess]})},
    )
    s3_stub.add_response(
        "put_bucket_policy",
        expected_params={
            "Bucket": "fake_logging_bucket",
            "Policy": json.dumps(
                {
                    "Statement": [
                        httpOnlyAccess,
                        {
                            "Action": "s3:PutObject",
                            "Condition": {
                                "ArnLike": {"aws:SourceArn": ["arn:aws:s3:::fake_source_bucket"]},
                                "StringEquals": {"aws:SourceAccount": "123456789012"},
                            },
                            "Effect": "Allow",
                            "Principal": {"Service": "logging.s3.amazonaws.com"},
                            "Resource": "arn:aws:s3:::fake_logging_bucket/fake_prefix/*",
                            "Sid": f"{POLICY_SID}Forfake_prefix",
                        },
                    ]
                }
            ),
        },
        service_response={},
    )

    s3_stub = put_public_access_block_as_true(s3_stub)
    yield s3_stub


@pytest.fixture
def s3_stub_existing_non_matching_policy(s3_stub):
    s3_stub = put_public_access_block_as_false(s3_stub)
    s3_stub.add_response(
        "get_bucket_policy",
        expected_params={
            "Bucket": "fake_logging_bucket",
        },
        service_response={
            "Policy": json.dumps(
                {
                    "Statement": [
                        httpOnlyAccess,
                        {
                            "Action": "s3:PutObject",
                            "Condition": {
                                "ArnLike": {"aws:SourceArn": ["arn:aws:s3:::fake_other_bucket"]},
                                "StringEquals": {"aws:SourceAccount": "123456789012"},
                            },
                            "Effect": "Allow",
                            "Principal": {"Service": "logging.s3.amazonaws.com"},
                            "Resource": "arn:aws:s3:::fake_logging_bucket/fake_prefix/*",
                            "Sid": f"{POLICY_SID}Forfake_prefix",
                        },
                    ]
                }
            )
        },
    )

    s3_stub.add_response(
        "put_bucket_policy",
        expected_params={
            "Bucket": "fake_logging_bucket",
            "Policy": json.dumps(
                {
                    "Statement": [
                        httpOnlyAccess,
                        {
                            "Action": "s3:PutObject",
                            "Condition": {
                                "ArnLike": {"aws:SourceArn": ["arn:aws:s3:::fake_source_bucket"]},
                                "StringEquals": {"aws:SourceAccount": "123456789012"},
                            },
                            "Effect": "Allow",
                            "Principal": {"Service": "logging.s3.amazonaws.com"},
                            "Resource": "arn:aws:s3:::fake_logging_bucket/fake_prefix/*",
                            "Sid": f"{POLICY_SID}Forfake_prefix",
                        },
                    ]
                }
            ),
        },
        service_response={},
    )

    s3_stub = put_public_access_block_as_true(s3_stub)
    yield s3_stub


@pytest.fixture
def s3_stub_existing_policy(s3_stub):
    s3_stub = put_public_access_block_as_false(s3_stub)
    s3_stub.add_response(
        "get_bucket_policy",
        expected_params={
            "Bucket": "fake_logging_bucket",
        },
        service_response={
            "Policy": json.dumps(
                {
                    "Statement": [
                        httpOnlyAccess,
                        {
                            "Action": "s3:PutObject",
                            "Condition": {
                                "ArnLike": {"aws:SourceArn": ["arn:aws:s3:::fake_source_bucket"]},
                                "StringEquals": {"aws:SourceAccount": "123456789012"},
                            },
                            "Effect": "Allow",
                            "Principal": {"Service": "logging.s3.amazonaws.com"},
                            "Resource": "arn:aws:s3:::fake_logging_bucket/fake_prefix/*",
                            "Sid": f"{POLICY_SID}Forfake_prefix",
                        },
                    ]
                }
            )
        },
    )

    s3_stub = put_public_access_block_as_true(s3_stub)
    yield s3_stub


@pytest.fixture
def s3_stub_existing_policy_for_different_prefix(s3_stub):
    s3_stub = put_public_access_block_as_false(s3_stub)
    s3_stub.add_response(
        "get_bucket_policy",
        expected_params={
            "Bucket": "fake_logging_bucket",
        },
        service_response={
            "Policy": json.dumps(
                {
                    "Statement": [
                        httpOnlyAccess,
                        {
                            "Action": "s3:PutObject",
                            "Condition": {
                                "ArnLike": {"aws:SourceArn": ["arn:aws:s3:::fake_other_bucket"]},
                                "StringEquals": {"aws:SourceAccount": "123456789012"},
                            },
                            "Effect": "Allow",
                            "Principal": {"Service": "logging.s3.amazonaws.com"},
                            "Resource": "arn:aws:s3:::fake_logging_bucket/fake_other_prefix/*",
                            "Sid": f"{POLICY_SID}Forfake_other_prefix",
                        },
                    ]
                }
            )
        },
    )

    s3_stub.add_response(
        "put_bucket_policy",
        expected_params={
            "Bucket": "fake_logging_bucket",
            "Policy": json.dumps(
                {
                    "Statement": [
                        httpOnlyAccess,
                        {
                            "Action": "s3:PutObject",
                            "Condition": {
                                "ArnLike": {"aws:SourceArn": ["arn:aws:s3:::fake_other_bucket"]},
                                "StringEquals": {"aws:SourceAccount": "123456789012"},
                            },
                            "Effect": "Allow",
                            "Principal": {"Service": "logging.s3.amazonaws.com"},
                            "Resource": "arn:aws:s3:::fake_logging_bucket/fake_other_prefix/*",
                            "Sid": f"{POLICY_SID}Forfake_other_prefix",
                        },
                        {
                            "Action": "s3:PutObject",
                            "Condition": {
                                "ArnLike": {"aws:SourceArn": ["arn:aws:s3:::fake_source_bucket"]},
                                "StringEquals": {"aws:SourceAccount": "123456789012"},
                            },
                            "Effect": "Allow",
                            "Principal": {"Service": "logging.s3.amazonaws.com"},
                            "Resource": "arn:aws:s3:::fake_logging_bucket/fake_prefix/*",
                            "Sid": f"{POLICY_SID}Forfake_prefix",
                        },
                    ]
                }
            ),
        },
        service_response={},
    )

    s3_stub = put_public_access_block_as_true(s3_stub)
    yield s3_stub
