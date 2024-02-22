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
import re
from botocore import config

from aws_lambda_powertools import Logger, Tracer

logger = Logger(utc=True)
tracer = Tracer()

USER_AGENT = r"^(?P<category>AWSSOLUTION)\/SO(?P<id>\d+)(?P<component>[a-zA-Z]*)\/v(?P<major>0|[1-9]\d*)\.(?P<minor>0|[1-9]\d*)\.(?P<patch>0|[1-9]\d*)(?:-(?P<prerelease>(?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*)(?:\.(?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*))*))?(?:\+(?P<buildmetadata>[0-9a-zA-Z-]+(?:\.[0-9a-zA-Z-]+)*))?$"  # NOSONAR - python:S4784
user_agent_re = re.compile(USER_AGENT)  # NOSONAR - python:S4784

DEFAULT_APP_NAME = "gen-ai-app-builder"


@tracer.capture_method
def custom_usr_agent_config():
    check_env_setup()

    return config.Config(
        region_name=os.environ["AWS_REGION"],
        retries={"max_attempts": 5, "mode": "standard"},
        **json.loads(os.environ["AWS_SDK_USER_AGENT"]),
    )


@tracer.capture_method
def check_env_setup():
    if not os.environ.get("AWS_SDK_USER_AGENT"):
        err_msg = "User-agent for boto3 not set as environment variables"
        logger.error(err_msg)
        raise ValueError(err_msg)

    usr_agent_json = json.loads(os.environ["AWS_SDK_USER_AGENT"])

    if "user_agent_extra" not in usr_agent_json or (
        "user_agent_extra" in usr_agent_json and user_agent_re.match(usr_agent_json["user_agent_extra"]) is None
    ):
        err_msg = "User-agent for boto3 did not match the required pattern. Allowed pattern is AWSSOLUTION/SO<id>/v<version>, where id is a numeric value and version is a semver version numbering pattern"
        logger.error(err_msg)
        raise ValueError(err_msg)
