#!/usr/bin/env python
# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

import pytest
from operations import operation_types
from operations.operation_types import PHYSICAL_RESOURCE_ID, RESOURCE, RESOURCE_PROPERTIES


@pytest.fixture
def lambda_event(aws_credentials, custom_resource_event):
    custom_resource_event[RESOURCE_PROPERTIES] = {
        RESOURCE: operation_types.AGENTCORE_OAUTH_CLIENT,
        "CLIENT_ID": "test-client-id",
        "CLIENT_SECRET": "test-client-secret",
        "DISCOVERY_URL": "https://example.com/.well-known/openid_configuration",
        "PROVIDER_NAME": "test-provider",
        "AWS_REGION": "us-east-1"
    }
    custom_resource_event[PHYSICAL_RESOURCE_ID] = "fake_physical_resource_id"

    yield custom_resource_event
