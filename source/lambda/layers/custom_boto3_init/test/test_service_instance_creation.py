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
import pytest
import mock
from custom_boto3_init import get_service_client, get_service_resource
from helper import get_session


@pytest.fixture
def user_agent():
    """Mocked user agent for python boto3 calls"""
    os.environ["AWS_SDK_USER_AGENT"] = '{ "user_agent_extra": "AWSSOLUTION/SO000/v0.0.0" }'


def test_get_session():
    assert not None == get_session()


@mock.patch.dict(
    os.environ,
    {"AWS_SDK_USER_AGENT": '{ "user_agent_extra": "FakeName/SO000/v0.0.0" }'},
)
def test_get_service_resource():
    with pytest.raises(ValueError) as error:
        get_service_client("s3")
        assert (
            str(error.value)
            == "User-agent for boto3 did not match the required pattern. Allowed pattern is AWSSOLUTION/SO<id>/v<version>, where id is a numeric value and version is a semver version numbering pattern"
        )

        get_service_resource("s3")
        assert (
            str(error.value)
            == "User-agent for boto3 did not match the required pattern. Allowed pattern is AWSSOLUTION/SO<id>/v<version>, where id is a numeric value and version is a semver version numbering pattern"
        )


@pytest.mark.parametrize(
    "aws_credentials, user_agent",
    [
        ("aws_credentials", "user_agent"),
    ],
    indirect=["aws_credentials", "user_agent"],
)
@pytest.mark.parametrize("service_name", ["s3", "dynamodb", "sqs"])
def test_get_service_client(aws_credentials, user_agent, service_name):
    assert not None == get_service_client(service_name)


@pytest.mark.parametrize(
    "aws_credentials, user_agent",
    [
        ("aws_credentials", "user_agent"),
    ],
    indirect=["aws_credentials", "user_agent"],
)
@pytest.mark.parametrize("service_name", ["s3", "dynamodb", "sqs"])
def test_get_service_resource(aws_credentials, user_agent, service_name):
    assert not None == get_service_resource(service_name)
