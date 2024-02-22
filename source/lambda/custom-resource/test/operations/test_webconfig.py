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
from test.fixtures.webconfig_events import (
    lambda_event,
    lambda_event_with_additional_config,
    lambda_event_with_additional_config_internal_user,
    lambda_event_with_additional_config_external_user,
    setup_ssm,
)

import mock
import pytest
from helper import get_service_client
from lambda_func import handler
from moto import mock_ssm
from operations.webconfig import (
    API_ENDPOINT,
    RESOURCE_PROPERTIES,
    SSM_KEY,
    USER_POOL_CLIENT_ID,
    USER_POOL_ID,
    IS_INTERNAL_USER,
    create,
    delete,
    execute,
    verify_env_setup,
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


@mock_ssm
def test_create_success(lambda_event, mock_lambda_context):
    create(lambda_event, mock_lambda_context)
    ssm = get_service_client("ssm")
    # fmt: off
    web_config_value = ssm.get_parameter(
        Name=lambda_event[RESOURCE_PROPERTIES][SSM_KEY], 
        WithDecryption=True)["Parameter"]["Value"]
    # fmt: on

    assert json.loads(web_config_value) == {
        "ApiEndpoint": "https://non-existent/url/fakeapi",
        "UserPoolId": "fakepoolid",
        "UserPoolClientId": "fakeclientid",
        "AwsRegion": "us-east-1",
        "IsInternalUser": "false",
        "SomeOtherParam": "someOtherValue",
    }


@mock_ssm
def test_create_success_with_additional_config(lambda_event_with_additional_config, mock_lambda_context):
    ssm = get_service_client("ssm")
    additional_config = {"key1": "value1", "key2": "value2"}
    ssm.put_parameter(
        Name="additional-ssm-param-name",
        Value=json.dumps(additional_config),
        Type="SecureString",
        Overwrite=True,
        Tier="Intelligent-Tiering",
    )

    create(lambda_event_with_additional_config, mock_lambda_context)
    # fmt: off
    web_config_value = ssm.get_parameter(
        Name=lambda_event_with_additional_config[RESOURCE_PROPERTIES][SSM_KEY], 
        WithDecryption=True)["Parameter"]["Value"]
    # fmt: on

    assert json.loads(web_config_value) == {
        "ApiEndpoint": "https://non-existent/url/fakeapi",
        "UserPoolId": "fakepoolid",
        "UserPoolClientId": "fakeclientid",
        "AwsRegion": "us-east-1",
        "SomeOtherParam": "someOtherValue",
        "IsInternalUser": "false",
        "UseCaseConfig": {"key1": "value1", "key2": "value2"},
    }


@mock_ssm
def test_create_success_with_additional_config_marking_internal_user(
    lambda_event_with_additional_config, mock_lambda_context
):
    ssm = get_service_client("ssm")
    additional_config = {"IsInternalUser": "true", "key1": "value1", "key2": "value2"}
    ssm.put_parameter(
        Name="additional-ssm-param-name",
        Value=json.dumps(additional_config),
        Type="SecureString",
        Overwrite=True,
        Tier="Intelligent-Tiering",
    )

    create(lambda_event_with_additional_config, mock_lambda_context)
    # fmt: off
    web_config_value = ssm.get_parameter(
        Name=lambda_event_with_additional_config[RESOURCE_PROPERTIES][SSM_KEY], 
        WithDecryption=True)["Parameter"]["Value"]
    # fmt: on

    assert json.loads(web_config_value) == {
        "ApiEndpoint": "https://non-existent/url/fakeapi",
        "UserPoolId": "fakepoolid",
        "UserPoolClientId": "fakeclientid",
        "AwsRegion": "us-east-1",
        "SomeOtherParam": "someOtherValue",
        "IsInternalUser": "true",
        "UseCaseConfig": {"key1": "value1", "key2": "value2"},
    }


@mock_ssm
def test_create_success_with_additional_config_marking_external_user(
    lambda_event_with_additional_config_external_user, mock_lambda_context
):
    ssm = get_service_client("ssm")
    additional_config = {"IsInternalUser": "false", "key1": "value1", "key2": "value2"}
    ssm.put_parameter(
        Name="additional-ssm-param-name",
        Value=json.dumps(additional_config),
        Type="SecureString",
        Overwrite=True,
        Tier="Intelligent-Tiering",
    )

    create(lambda_event_with_additional_config_external_user, mock_lambda_context)
    # fmt: off
    web_config_value = ssm.get_parameter(
        Name=lambda_event_with_additional_config_external_user[RESOURCE_PROPERTIES][SSM_KEY], 
        WithDecryption=True)["Parameter"]["Value"]
    # fmt: on

    assert json.loads(web_config_value) == {
        "ApiEndpoint": "https://non-existent/url/fakeapi",
        "UserPoolId": "fakepoolid",
        "UserPoolClientId": "fakeclientid",
        "AwsRegion": "us-east-1",
        "SomeOtherParam": "someOtherValue",
        "IsInternalUser": "false",
        "UseCaseConfig": {"key1": "value1", "key2": "value2"},
    }


@mock_ssm
def test_create_success_with_additional_config_empty(lambda_event_with_additional_config, mock_lambda_context):
    ssm = get_service_client("ssm")

    create(lambda_event_with_additional_config, mock_lambda_context)
    # fmt: off
    web_config_value = ssm.get_parameter(
        Name=lambda_event_with_additional_config[RESOURCE_PROPERTIES][SSM_KEY], 
        WithDecryption=True)["Parameter"]["Value"]
    # fmt: on

    assert json.loads(web_config_value) == {
        "ApiEndpoint": "https://non-existent/url/fakeapi",
        "UserPoolId": "fakepoolid",
        "UserPoolClientId": "fakeclientid",
        "AwsRegion": "us-east-1",
        "IsInternalUser": "false",
        "SomeOtherParam": "someOtherValue",
        "UseCaseConfig": {},
    }


@mock_ssm
def test_create_success_with_additional_config_empty_marking_internal_user(
    lambda_event_with_additional_config_internal_user, mock_lambda_context
):
    ssm = get_service_client("ssm")
    create(lambda_event_with_additional_config_internal_user, mock_lambda_context)
    # fmt: off
    web_config_value = ssm.get_parameter(
        Name=lambda_event_with_additional_config_internal_user[RESOURCE_PROPERTIES][SSM_KEY], 
        WithDecryption=True)["Parameter"]["Value"]
    # fmt: on

    assert json.loads(web_config_value) == {
        "ApiEndpoint": "https://non-existent/url/fakeapi",
        "UserPoolId": "fakepoolid",
        "UserPoolClientId": "fakeclientid",
        "AwsRegion": "us-east-1",
        "IsInternalUser": "true",
        "SomeOtherParam": "someOtherValue",
        "UseCaseConfig": {},
    }


@mock_ssm
def test_create_success_with_additional_config_empty_marking_external_user(
    lambda_event_with_additional_config_external_user, mock_lambda_context
):
    ssm = get_service_client("ssm")
    create(lambda_event_with_additional_config_external_user, mock_lambda_context)
    # fmt: off
    web_config_value = ssm.get_parameter(
        Name=lambda_event_with_additional_config_external_user[RESOURCE_PROPERTIES][SSM_KEY], 
        WithDecryption=True)["Parameter"]["Value"]
    # fmt: on

    assert json.loads(web_config_value) == {
        "ApiEndpoint": "https://non-existent/url/fakeapi",
        "UserPoolId": "fakepoolid",
        "UserPoolClientId": "fakeclientid",
        "AwsRegion": "us-east-1",
        "IsInternalUser": "false",
        "SomeOtherParam": "someOtherValue",
        "UseCaseConfig": {},
    }


@mock_ssm
def test_delete_failure(monkeypatch, setup_ssm, mock_lambda_context):
    lambda_event, ssm = setup_ssm
    monkeypatch.setitem(lambda_event[RESOURCE_PROPERTIES], SSM_KEY, "/non-existent/key")
    assert None == delete(lambda_event, mock_lambda_context)


@mock_ssm
def test_delete_success(setup_ssm, mock_lambda_context):
    lambda_event, ssm = setup_ssm
    delete(lambda_event, lambda_event)

    parameter_list = ssm.describe_parameters(
        ParameterFilters=[{"Key": "Name", "Values": [lambda_event[RESOURCE_PROPERTIES][SSM_KEY]]}]
    )

    assert len(parameter_list["Parameters"]) == 0


@mock_ssm
@pytest.mark.parametrize("requestType", ["Create", "Update"])
def test_execute_create_and_update(lambda_event, mock_lambda_context, requestType):
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


@mock_ssm()
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
