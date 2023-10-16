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

import boto3
import pytest
from aws_lambda_powertools import Metrics
from aws_lambda_powertools.metrics import metrics as metrics_global
from custom_config import custom_usr_agent_config
from moto import mock_dynamodb, mock_logs, mock_s3, mock_secretsmanager, mock_ssm


@pytest.fixture(autouse=True)
def aws_credentials():
    """Mocked AWS Credentials and general environment variables as required by python based lambda functions"""
    os.environ["AWS_ACCESS_KEY_ID"] = "fakeId"
    os.environ["AWS_SECRET_ACCESS_KEY"] = "fakeAccessKey"  # nosec B105
    os.environ["AWS_REGION"] = "us-east-1"  # must be a valid region
    os.environ["AWS_SDK_USER_AGENT"] = '{ "user_agent_extra": "AwsSolution/SO000/v0.0.0" }'
    os.environ["POWERTOOLS_SERVICE_NAME"] = "test-custom-resource"


@pytest.fixture
def s3():
    with mock_s3():
        yield boto3.resource("s3", config=custom_usr_agent_config())


@pytest.fixture
def ddb():
    with mock_dynamodb():
        yield boto3.resource("dynamodb", config=custom_usr_agent_config())


@pytest.fixture
def cw_logs():
    with mock_logs():
        yield boto3.client("logs", config=custom_usr_agent_config())


@pytest.fixture
def ssm():
    with mock_ssm():
        yield boto3.client("ssm", config=custom_usr_agent_config())


@pytest.fixture
def secretsmanager():
    with mock_secretsmanager():
        yield boto3.client("secretsmanager", config=custom_usr_agent_config())


@pytest.fixture
def custom_resource_event():
    """This event object mocks values that the lambda event object contains when invoked as a CloudFormation custom resource"""
    return {
        "StackId": "fakeStackId",
        "RequestId": "fakeRequestId",
        "ResponseURL": "https://fakeurl/doesnotexist",
        "LogicalResourceId": "fakeLogicalResourceId",
    }


@pytest.fixture
def mock_lambda_context():
    """Create a mock LambdaContext object that can be passed to a lambda function invocation"""

    class FakeLambdaContext(object):
        def __init__(self):
            self.log_stream_name = "fake_logstream_name"
            self.aws_request_id = "fake_request_id"
            self.invoked_function_arn = "arn:aws:lambda:us-us-east-1:123456789012:function:fakefunctionarn"
            self.client_context = None
            self.log_group_name = "/aws/lambda/fakefunctionloggroupname"
            self.function_name = "fakefunctionname"
            self.function_version = "$LATEST"
            self.identity = "fakeIdentity"
            self.memory_limit_in_mb = "128"

    return FakeLambdaContext()


@pytest.fixture(scope="function", autouse=True)
def reset_metric_set():
    """Clear out every metric data prior to every test"""
    metrics = Metrics()
    metrics.clear_metrics()
    metrics_global.is_cold_start = True  # ensure each test has cold start
    metrics.clear_default_dimensions()  # remove persisted default dimensions, if any
    yield
