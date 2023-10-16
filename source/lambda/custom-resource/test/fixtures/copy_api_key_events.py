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

import pytest
from operations import operation_types
from operations.copy_api_key import (
    SECRETS_MANAGER_API_KEY_NAME,
    API_KEY,
    RESOURCE,
    RESOURCE_PROPERTIES,
    PHYSICAL_RESOURCE_ID,
)


@pytest.fixture
def lambda_event(aws_credentials, custom_resource_event):
    custom_resource_event[RESOURCE_PROPERTIES] = {RESOURCE: operation_types.COPY_API_KEY}
    custom_resource_event[RESOURCE_PROPERTIES][SECRETS_MANAGER_API_KEY_NAME] = "11111111/api-key"
    custom_resource_event[RESOURCE_PROPERTIES][API_KEY] = "someapikey"
    custom_resource_event[RESOURCE_PROPERTIES]["SomeOtherParam"] = "someOtherValue"
    custom_resource_event[PHYSICAL_RESOURCE_ID] = "fake_physical_resource_id"

    yield custom_resource_event


@pytest.fixture
def setup_secretsmanager(secretsmanager, lambda_event):
    secretsmanager.create_secret(
        Name=lambda_event[RESOURCE_PROPERTIES][SECRETS_MANAGER_API_KEY_NAME],
        SecretString=lambda_event[RESOURCE_PROPERTIES][API_KEY],
    )

    assert (
        secretsmanager.get_secret_value(SecretId=lambda_event[RESOURCE_PROPERTIES][SECRETS_MANAGER_API_KEY_NAME])[
            "SecretString"
        ]
        == lambda_event[RESOURCE_PROPERTIES][API_KEY]
    )
    yield lambda_event, secretsmanager
