#!/usr/bin/env python
# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

import json
import os

import pytest
from operations import operation_types
from operations.webconfig import (
    API_ENDPOINT,
    IS_INTERNAL_USER,
    PHYSICAL_RESOURCE_ID,
    RESOURCE,
    RESOURCE_PROPERTIES,
    SERVICE_TOKEN,
    SSM_KEY,
    USER_POOL_CLIENT_ID,
    USER_POOL_ID,
)


@pytest.fixture
def lambda_event(aws_credentials, custom_resource_event):
    custom_resource_event[RESOURCE_PROPERTIES] = {RESOURCE: operation_types.WEBCONFIG}
    custom_resource_event[RESOURCE_PROPERTIES][SSM_KEY] = "/gaab/new/keypath"
    custom_resource_event[RESOURCE_PROPERTIES][API_ENDPOINT] = "https://non-existent/url/fakeapi"
    custom_resource_event[RESOURCE_PROPERTIES][USER_POOL_CLIENT_ID] = "fakeclientid"
    custom_resource_event[RESOURCE_PROPERTIES][USER_POOL_ID] = "fakepoolid"
    custom_resource_event[RESOURCE_PROPERTIES][SERVICE_TOKEN] = "fake-lambda-arn"
    custom_resource_event[RESOURCE_PROPERTIES][IS_INTERNAL_USER] = "false"
    custom_resource_event[RESOURCE_PROPERTIES]["SomeOtherParam"] = "someOtherValue"
    custom_resource_event[PHYSICAL_RESOURCE_ID] = "/gaab/old/keypath"

    yield custom_resource_event


@pytest.fixture
def setup_ssm(ssm, lambda_event):
    ssm_key = lambda_event[RESOURCE_PROPERTIES][SSM_KEY]
    ssm.put_parameter(
        Name=ssm_key,
        Value=json.dumps(
            {
                "RestApiEndpoint": lambda_event[RESOURCE_PROPERTIES][API_ENDPOINT],
                "UserPoolId": lambda_event[RESOURCE_PROPERTIES][USER_POOL_ID],
                "UserPoolClientId": lambda_event[RESOURCE_PROPERTIES][USER_POOL_CLIENT_ID],
                "AwsRegion": os.environ["AWS_REGION"],
                "SomeOtherParam": lambda_event[RESOURCE_PROPERTIES]["SomeOtherParam"],
            }
        ),
        Type="SecureString",
        Tier="Intelligent-Tiering",
    )

    # fmt: off
    assert ssm.get_parameter(
        Name=lambda_event[RESOURCE_PROPERTIES][SSM_KEY], 
        WithDecryption=True)["Parameter"]["Value"] == json.dumps({
            "RestApiEndpoint": "https://non-existent/url/fakeapi",
            "UserPoolId": "fakepoolid",
            "UserPoolClientId": "fakeclientid",
            "AwsRegion": "us-east-1",
            "SomeOtherParam": "someOtherValue",
        })
    # fmt: on

    yield lambda_event, ssm


@pytest.fixture
def setup_cognito(cognito, lambda_event):
    # create a user pool with a domain
    result = cognito.create_user_pool(PoolName="fake-user-pool", AutoVerifiedAttributes=["email"])
    user_pool_id = result["UserPool"]["Id"]
    cognito.create_user_pool_domain(UserPoolId=user_pool_id, Domain="fake-domain")
    lambda_event[RESOURCE_PROPERTIES][USER_POOL_ID] = user_pool_id

    yield lambda_event, cognito
