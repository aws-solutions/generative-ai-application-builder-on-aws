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

import pytest
from operations import operation_types
from operations.webconfig import (
    API_ENDPOINT,
    RESOURCE,
    RESOURCE_PROPERTIES,
    SSM_KEY,
    USER_POOL_CLIENT_ID,
    USER_POOL_ID,
    PHYSICAL_RESOURCE_ID,
    SERVICE_TOKEN,
    EXISTING_CONFIG_SSM_PARAMETER,
    IS_INTERNAL_USER,
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
def lambda_event_with_additional_config(lambda_event):
    lambda_event[RESOURCE_PROPERTIES][EXISTING_CONFIG_SSM_PARAMETER] = "additional-ssm-param-name"
    yield lambda_event


@pytest.fixture
def lambda_event_with_additional_config_internal_user(lambda_event_with_additional_config):
    lambda_event_with_additional_config[RESOURCE_PROPERTIES][IS_INTERNAL_USER] = "true"
    yield lambda_event_with_additional_config


@pytest.fixture
def lambda_event_with_additional_config_external_user(lambda_event_with_additional_config):
    lambda_event_with_additional_config[RESOURCE_PROPERTIES][IS_INTERNAL_USER] = "false"
    yield lambda_event_with_additional_config


@pytest.fixture
def setup_ssm(ssm, lambda_event):
    ssm_key = lambda_event[RESOURCE_PROPERTIES][SSM_KEY]
    ssm.put_parameter(
        Name=ssm_key,
        Value=json.dumps(
            {
                "ApiEndpoint": lambda_event[RESOURCE_PROPERTIES][API_ENDPOINT],
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
            "ApiEndpoint": "https://non-existent/url/fakeapi",
            "UserPoolId": "fakepoolid",
            "UserPoolClientId": "fakeclientid",
            "AwsRegion": "us-east-1",
            "SomeOtherParam": "someOtherValue",
        })
    # fmt: on

    yield lambda_event, ssm
