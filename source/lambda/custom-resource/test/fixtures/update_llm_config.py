#!/usr/bin/env python
# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

import pytest
from operations import operation_types
from operations.operation_types import PHYSICAL_RESOURCE_ID, RESOURCE, RESOURCE_PROPERTIES
from operations.update_llm_config import (
    USE_CASE_CONFIG_TABLE_NAME,
    USE_CASE_CONFIG_RECORD_KEY,
    USE_CASE_UUID,
    CONVERSATION_TABLE_NAME,
)


@pytest.fixture
def lambda_event(aws_credentials, custom_resource_event):
    custom_resource_event[RESOURCE_PROPERTIES] = {RESOURCE: operation_types.UPDATE_LLM_CONFIG}
    custom_resource_event[RESOURCE_PROPERTIES][USE_CASE_CONFIG_TABLE_NAME] = "fake_config_table_name"
    custom_resource_event[RESOURCE_PROPERTIES][USE_CASE_CONFIG_RECORD_KEY] = "fake_config_record_key"
    custom_resource_event[RESOURCE_PROPERTIES][USE_CASE_UUID] = "fake_use_case_uuid"
    custom_resource_event[RESOURCE_PROPERTIES][CONVERSATION_TABLE_NAME] = "fake_conversation_table_name"
    custom_resource_event[PHYSICAL_RESOURCE_ID] = "fake_physical_resource_id"

    yield custom_resource_event
