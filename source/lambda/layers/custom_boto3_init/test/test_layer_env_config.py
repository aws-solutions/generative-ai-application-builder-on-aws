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

import custom_boto3_init
import unittest.mock as mock
import pytest


@mock.patch.dict(os.environ, {}, clear=True)
def test_when_usr_agent_not_set(aws_credentials):
    with pytest.raises(ValueError) as error:
        custom_boto3_init.custom_usr_agent_config()
    assert str(error.value) == "User-agent for boto3 not set as environment variables"


@mock.patch.dict(
    os.environ,
    {"AWS_SDK_USER_AGENT": '{ "user_agent_extra": "AWSSOLUTION/SO000/v0.0.0" }'},
)
def test_custom_usr_agent_config(aws_credentials):
    with mock.patch("botocore.config.Config") as mocked_config:
        custom_config = custom_boto3_init.custom_usr_agent_config()
        mocked_config.assert_called_once_with(
            region_name="us-east-1",
            retries={"max_attempts": 5, "mode": "standard"},
            user_agent_extra="AWSSOLUTION/SO000/v0.0.0",
        )


user_agent_scenarios = [
    '{ "user_agent": "AWSSOLUTION/SO000/v0.0.0" }',
    '{ "user_agent_extra": "FakeName/SO000/v0.0.0" }',
    '{ "user_agent_extra": "AWSSOLUTION/A9999/v0.0.0" }',
]


@pytest.mark.parametrize(
    "aws_credentials",
    [
        "aws_credentials",
    ],
    indirect=True,
)
@pytest.mark.parametrize("scenario", user_agent_scenarios)
def test_with_wrong_usr_agent_key_value(aws_credentials, scenario):
    with mock.patch.dict(os.environ, {"AWS_SDK_USER_AGENT": scenario}):
        with pytest.raises(ValueError) as error:
            custom_config = custom_boto3_init.custom_usr_agent_config()
            assert (
                str(error.value)
                == "User-agent for boto3 did not match the required pattern. Allowed pattern is AWSSOLUTION/SO<id>/v<version>, where id is a numeric value and version is a semver version numbering pattern"
            )
