#!/usr/bin/env python
# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

import pytest
from utils.metrics_schema import MetricsSchema  # Adjust import path as needed


@pytest.mark.parametrize(
    "input_data, expected",
    [
        (
            {
                "NEW_KENDRA_INDEX_CREATED": "Yes",
                "VPC_ENABLED": "No",
                "LlmParams": {
                    "Streaming": True,
                    "PromptParams": {"RephraseQuestion": True, "MaxInputTextLength": 1024},
                    "BedrockLlmParams": {"ModelId": "anthropic.claude-3", "GuardrailEnabled": True},
                    "Verbose": False,
                    "ExtraField": 999,  # should be filtered
                },
                "ExtraKey": "value",  # should be filtered
            },
            {
                "NEW_KENDRA_INDEX_CREATED": "Yes",
                "VPC_ENABLED": "No",
                "LlmParams": {
                    "Streaming": True,
                    "Verbose": False,
                    "PromptParams": {"RephraseQuestion": True, "MaxInputTextLength": 1024},
                    "BedrockLlmParams": {"ModelId": "anthropic.claude-3", "GuardrailEnabled": True},
                },
            },
        ),
        ({}, {}),  # empty input
        (None, None),  # None input
    ],
)
def test_filter_dict_by_schema(input_data, expected):
    schema = MetricsSchema(input_data)
    result = schema.filter_dict_by_schema(schema.data, schema.metrics_schema)
    assert result == expected


@pytest.mark.parametrize(
    "input_data, expected",
    [
        (
            {"key1": None, "key2": {}, "key3": [], "key4": 1, "key5": {"subkey1": None, "subkey2": "value"}},
            {"key4": 1, "key5": {"subkey2": "value"}},
        ),
        ([None, {}, [], {"nested": None}, {"nested": "keep"}], [{"nested": "keep"}]),
    ],
)
def test_remove_empty(input_data, expected):
    schema = MetricsSchema({})
    result = schema.remove_empty(input_data)
    assert result == expected


@pytest.mark.parametrize(
    "input_data, remove_empty_flag, expected",
    [
        (
            {
                "KENDRA_EDITION": "DEV",
                "AgentParams": {
                    "AgentType": "basic",
                    "BedrockAgentParams": {"EnableTrace": True},
                    "UnusedField": "nope",
                },
                "UnusedRootKey": True,
            },
            True,
            {
                "KENDRA_EDITION": "DEV",
                "AgentParams": {"AgentType": "basic", "BedrockAgentParams": {"EnableTrace": True}},
            },
        ),
        (None, True, None),
    ],
)
def test_model_dump(input_data, remove_empty_flag, expected):
    schema = MetricsSchema(input_data)
    result = schema.model_dump(remove_empty=remove_empty_flag)
    assert result == expected
