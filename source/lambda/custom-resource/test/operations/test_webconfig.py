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
from test.fixtures.webconfig_events import lambda_event, setup_ssm, setup_cognito

import mock
import pytest
from helper import get_service_client
from lambda_func import handler
from moto import mock_aws
from operations.webconfig import (
    API_ENDPOINT,
    RESOURCE_PROPERTIES,
    PHYSICAL_RESOURCE_ID,
    SSM_KEY,
    USER_POOL_CLIENT_ID,
    USER_POOL_ID,
    create,
    delete,
    execute,
    verify_env_setup,
    retrieve_cognito_hosted_url,
)


@pytest.mark.parametrize("requestType", ["Create", "Update", "Delete"])
def test_verify_env_setup_success(lambda_event, requestType):
    lambda_event["RequestType"] = requestType
    assert None == verify_env_setup(lambda_event)


def test_env_setup_with_no_ssm_key(monkeypatch, lambda_event):
    with pytest.raises(ValueError):
        monkeypatch.delitem(lambda_event[RESOURCE_PROPERTIES], SSM_KEY)
        verify_env_setup(lambda_event)


@pytest.mark.parametrize("requestType", ["Create", "Update"])
def test_env_setup_with_no_api_endpoint(monkeypatch, lambda_event, requestType):
    lambda_event["RequestType"] = requestType
    with pytest.raises(ValueError):
        monkeypatch.delitem(lambda_event[RESOURCE_PROPERTIES], API_ENDPOINT)
        verify_env_setup(lambda_event)


@pytest.mark.parametrize("requestType", ["Create", "Update"])
def test_env_setup_with_no_usr_pool_id(monkeypatch, lambda_event, requestType):
    lambda_event["RequestType"] = requestType
    with pytest.raises(ValueError):
        monkeypatch.setitem(lambda_event[RESOURCE_PROPERTIES], USER_POOL_ID, "")
        verify_env_setup(lambda_event)


@pytest.mark.parametrize("requestType", ["Create", "Update"])
def test_env_setup_with_no_usr_pool_client_id(monkeypatch, lambda_event, requestType):
    lambda_event["RequestType"] = requestType
    with pytest.raises(ValueError):
        monkeypatch.delitem(lambda_event[RESOURCE_PROPERTIES], USER_POOL_CLIENT_ID)
        verify_env_setup(lambda_event)


@mock_aws
def test_retrieve_cognito_hosted_url(setup_cognito, mock_lambda_context):
    lambda_event, cognito = setup_cognito
    domain = retrieve_cognito_hosted_url(lambda_event)
    assert domain == "fake-domain.auth.us-east-1.amazoncognito.com"


@mock_aws
def test_retrieve_cognito_hosted_url_none(setup_cognito, mock_lambda_context):
    lambda_event, cognito = setup_cognito
    lambda_event[RESOURCE_PROPERTIES][USER_POOL_ID] = cognito.create_user_pool(
        PoolName="fake-user-pool", AutoVerifiedAttributes=["email"]
    )["UserPool"]["Id"]
    domain = retrieve_cognito_hosted_url(lambda_event)
    assert domain == None


@mock_aws
def test_create_success(setup_cognito, mock_lambda_context):
    lambda_event, _ = setup_cognito
    create(lambda_event, mock_lambda_context)
    ssm = get_service_client("ssm")
    # fmt: off
    web_config_value = ssm.get_parameter(
        Name=lambda_event[RESOURCE_PROPERTIES][SSM_KEY], 
        WithDecryption=True)["Parameter"]["Value"]
    # fmt: on

    assert json.loads(web_config_value) == {
        "ApiEndpoint": "https://non-existent/url/fakeapi",
        "UserPoolId": lambda_event[RESOURCE_PROPERTIES][USER_POOL_ID],
        "UserPoolClientId": "fakeclientid",
        "AwsRegion": "us-east-1",
        "CognitoDomain": "fake-domain.auth.us-east-1.amazoncognito.com",
        "IsInternalUser": "false",
        "SomeOtherParam": "someOtherValue",
    }


@mock_aws
def test_delete_failure(monkeypatch, setup_ssm, mock_lambda_context):
    lambda_event, _ = setup_ssm
    monkeypatch.setitem(lambda_event[RESOURCE_PROPERTIES], SSM_KEY, "/non-existent/key")
    assert None == delete(lambda_event, mock_lambda_context)


@mock_aws
def test_delete_success(monkeypatch, setup_ssm, mock_lambda_context):
    lambda_event, ssm = setup_ssm
    monkeypatch.setitem(lambda_event, PHYSICAL_RESOURCE_ID, "/gaab/new/keypath")
    delete(lambda_event, mock_lambda_context)
    parameter_list = ssm.describe_parameters(
        ParameterFilters=[{"Key": "Name", "Values": [lambda_event[RESOURCE_PROPERTIES][SSM_KEY]]}]
    )
    assert len(parameter_list["Parameters"]) == 0


@mock_aws
@pytest.mark.parametrize("requestType", ["Create", "Update"])
def test_execute_create_and_update(setup_cognito, mock_lambda_context, requestType):
    lambda_event, _ = setup_cognito
    lambda_event["RequestType"] = requestType
    with mock.patch("cfn_response.http") as mocked_PoolManager:
        mocked_PoolManager.return_value = {"status": 200}

        if lambda_event["RequestType"] == "Create" or lambda_event["RequestType"] == "Update":
            assert None == execute(lambda_event, mock_lambda_context)
            mocked_PoolManager.request.assert_called_once_with(
                method="PUT",
                url="https://fakeurl/doesnotexist",
                headers={"content-type": "", "content-length": "270"},
                body='{"Status": "SUCCESS", "Reason": "See the details in CloudWatch Log Stream: fake_logstream_name", "PhysicalResourceId": "/gaab/new/keypath", "StackId": "fakeStackId", "RequestId": "fakeRequestId", "LogicalResourceId": "fakeLogicalResourceId", "NoEcho": false, "Data": {}}',
            )


@mock_aws()
def test_execute_delete(setup_ssm, mock_lambda_context):
    lambda_event, ssm = setup_ssm
    lambda_event["RequestType"] = "Delete"

    with mock.patch("cfn_response.http") as mocked_PoolManager:
        mocked_PoolManager.return_value = {"status": 200}

        assert None == execute(lambda_event, mock_lambda_context)
        mocked_PoolManager.request.assert_called_once_with(
            method="PUT",
            url="https://fakeurl/doesnotexist",
            headers={"content-type": "", "content-length": "270"},
            body='{"Status": "SUCCESS", "Reason": "See the details in CloudWatch Log Stream: fake_logstream_name", "PhysicalResourceId": "/gaab/old/keypath", "StackId": "fakeStackId", "RequestId": "fakeRequestId", "LogicalResourceId": "fakeLogicalResourceId", "NoEcho": false, "Data": {}}',
        )


@pytest.mark.parametrize("requestType", ["Create", "Update", "Delete"])
def test_execute_failure(monkeypatch, lambda_event, mock_lambda_context, requestType):
    lambda_event["RequestType"] = requestType
    monkeypatch.delitem(lambda_event[RESOURCE_PROPERTIES], SSM_KEY)

    with mock.patch("cfn_response.http") as mocked_PoolManager:
        mocked_PoolManager.return_value = {"status": 200}
        execute(lambda_event, mock_lambda_context)
        mocked_PoolManager.request.assert_called_once_with(
            method="PUT",
            url="https://fakeurl/doesnotexist",
            headers={"content-type": "", "content-length": "315"},
            body='{"Status": "FAILED", "Reason": "Any of SSMKey, ApiEndpoint, UserPoolId, UserPoolClientId has not been passed. Operation cannot be performed", "PhysicalResourceId": "/gaab/old/keypath", "StackId": "fakeStackId", "RequestId": "fakeRequestId", "LogicalResourceId": "fakeLogicalResourceId", "NoEcho": false, "Data": {}}',
        )
