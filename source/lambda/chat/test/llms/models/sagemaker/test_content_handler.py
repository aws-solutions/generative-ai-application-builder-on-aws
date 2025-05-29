#!/usr/bin/env python
# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

import json
from io import BytesIO
from unittest import mock

import pytest

from llms.models.sagemaker.content_handler import SageMakerContentHandler
from utils.custom_exceptions import JsonPathExtractionError

input_schema = (
    {
        "inputs": "<<prompt>>",
        "parameters": {
            "param-1": "<<param-1>>",
            "param-2": "<<param-2>>",
            "param-3": "<<param-3>>",
            "param-4": "<<param-1>>",
            "param-5": "<<param-5>>",
        },
    },
)


@pytest.mark.parametrize(
    "input_schema, placeholder_values, expected_response",
    [
        (
            {
                "a": "<<a>>",
                "b": "<<b>>",
                "level-2": {
                    "c": "<<c>>",
                    "d": "<<d>>",
                    "level-3": {"e": "<<e>>", "level-4": {"f": "<<a>>"}},
                    "g": "<<g>>",
                    "h": "<<h>>",
                },
            },
            {"a": "val-a", "c": "val-c", "d": 1.2, "e": 9.0, "f": 2000},
            {
                "a": "val-a",
                "b": None,
                "level-2": {
                    "c": "val-c",
                    "d": 1.2,
                    "level-3": {"e": 9.0, "level-4": {"f": "val-a"}},
                    "g": None,
                    "h": None,
                },
            },
        ),
        (  # schema with temperature and prompts in a nested dict
            {
                "a": "<<a>>",
                "b": "<<b>>",
                "temperature": "<<temperature>>",
                "level-2": {
                    "c": "<<c>>",
                    "d": "<<d>>",
                    "level-3": {"e": "<<e>>", "level-4": {"f": "<<a>>"}},
                    "g": "<<g>>",
                    "h": "<<h>>",
                    "prompt": "<<prompt>>",
                },
            },
            {
                "a": "val-a",
                "c": "val-c",
                "d": 1.2,
                "e": 9.0,
                "f": 2000,
                "temperature": 0.2,
                "prompt": "test-prompt",
            },
            {
                "a": "val-a",
                "b": None,
                "temperature": 0.2,
                "level-2": {
                    "c": "val-c",
                    "d": 1.2,
                    "level-3": {"e": 9.0, "level-4": {"f": "val-a"}},
                    "g": None,
                    "h": None,
                    "prompt": "test-prompt",
                },
            },
        ),
        (
            # schema with some values present in placeholder dict, some absent
            {
                "inputs": "<<prompt>>",
                "parameters": {
                    "param-1": "<<param-1>>",
                    "param-2": "<<param-2>>",
                    "param-3": "<<param-1>>",
                    "param-5": "<<param-5>>",
                },
            },
            {
                "param-1": "val-a",
                "param-2": "val-c",
                "param-3": 1.2,
                "param-4": 9.0,
            },
            {
                "inputs": None,
                "parameters": {
                    "param-1": "val-a",
                    "param-2": "val-c",
                    "param-3": "val-a",
                    "param-5": None,
                },
            },
        ),
        (
            # schema with nested list structures
            {
                "inputs": [
                    [
                        {
                            "role": "system",
                            "content": "Always reply in a poem",
                        },
                        {"role": "user", "content": "<<prompt>>"},
                    ]
                ],
                "parameters": {
                    "param-1": "<<param-1>>",
                    "param-2": "<<param-2>>",
                    "param-3": "<<param-1>>",
                    "param-5": "<<param-5>>",
                },
            },
            {
                "prompt": "test-prompt",
                "param-1": "val-a",
                "param-2": "val-c",
                "param-3": 1.2,
                "param-4": 9.0,
            },
            {
                "inputs": [
                    [
                        {
                            "role": "system",
                            "content": "Always reply in a poem",
                        },
                        {"role": "user", "content": "test-prompt"},
                    ]
                ],
                "parameters": {
                    "param-1": "val-a",
                    "param-2": "val-c",
                    "param-3": "val-a",
                    "param-5": None,
                },
            },
        ),
    ],
)
def test_replace_placeholders(input_schema, placeholder_values, expected_response):
    content_handler = SageMakerContentHandler(input_schema=input_schema, output_path_expression="some-json-path")

    content_handler.replace_placeholders(content_handler.input_schema, placeholder_values)
    assert content_handler.input_schema == expected_response


@pytest.mark.parametrize(
    "input_schema, placeholder_values, expected_response",
    [
        (
            {
                "inputs": "<<prompt>>",
                "parameters": {
                    "param-1": "<<param-1>>",
                    "param-2": "<<param-2>>",
                    "param-3": "<<param-3>>",
                    "param-4": "<<param-1>>",
                    "param-5": "<<param-5>>",
                },
            },
            {
                "param-1": "val-a",
                "param-2": "val-c",
                "param-3": 1.2,
                "param-4": 9.0,
            },
            b'{"inputs": "test-prompt1", "parameters": {"param-1": "val-a", "param-2": "val-c", "param-3": 1.2, "param-4": "val-a"}}',
        ),
    ],
)
def test_transform_input(input_schema, placeholder_values, expected_response):
    content_handler = SageMakerContentHandler(input_schema=input_schema, output_path_expression="some-json-path")

    response = content_handler.transform_input("test-prompt1", placeholder_values)
    assert response == expected_response


@pytest.mark.parametrize(
    "output_jsonpath, output, expected_response",
    [
        (
            "$.generated_text",
            '{"outputs": "test-prompt1", "generated_text": "This is generated text"}',
            "This is generated text",
        ),
        (
            "$[0].generated_text",
            '[{"outputs": "test-prompt1", "generated_text": "This is generated text"}]',
            "This is generated text",
        ),
    ],
)
def test_transform_output(output, output_jsonpath, expected_response):
    output = BytesIO(bytes(output, encoding="utf-8"))
    content_handler = SageMakerContentHandler(input_schema=input_schema, output_path_expression=output_jsonpath)

    response = content_handler.transform_output(output)
    assert response == expected_response


@pytest.mark.parametrize(
    "output_jsonpath, output",
    [
        (
            "$.outputs._generated_text_",
            '{"outputs": {"user_prompt": "test-prompt1", "generated_text": "This is generated text"}}',
        ),
        (
            "$.generated_text",
            '{"outputs": {"user_prompt": "test-prompt1", "generated_text": "This is generated text"}}',
        ),
    ],
)
def test_transform_output_raises_for_incorrect_path(output, output_jsonpath):
    response_json = json.loads(output)
    output = BytesIO(bytes(output, encoding="utf-8"))

    content_handler = SageMakerContentHandler(input_schema=input_schema, output_path_expression=output_jsonpath)

    with pytest.raises(JsonPathExtractionError) as error:
        with mock.patch("llms.models.sagemaker.content_handler.metrics.add_metric") as mock_metrics:
            content_handler.transform_output(output)

    assert (
        error.value.args[0]
        == f"There were no matches for the specified for the output JSONPath {output_jsonpath} in the LLM output received: {repr(response_json)}"
    )
    mock_metrics.assert_called_once()


def test_transform_output_matches_raises_keyerror():
    response_json = {"response": "test response"}
    output_path_expression = "$.nonexistent.path"
    response_bytes = BytesIO(json.dumps(response_json).encode("utf-8"))

    content_handler = SageMakerContentHandler(input_schema=input_schema, output_path_expression=output_path_expression)

    # Mock the find method to raise KeyError
    with mock.patch.object(content_handler.output_path_expression, "find", side_effect=KeyError("Key not found")):
        with mock.patch("llms.models.sagemaker.content_handler.metrics.add_metric") as mock_metrics:
            # The function should raise KeyError when no matches are found
            with pytest.raises(JsonPathExtractionError) as error:
                content_handler.transform_output(response_bytes)

        print(f"error={error.value.args[0]}")
        assert (
            error.value.args[0]
            == f"The output JSONPath specified: $.nonexistent.path for extracting LLM response text doesn't exist in the LLM output received: {repr(response_json)}\nError: 'Key not found'"
        )
    mock_metrics.assert_called_once()


def test_transform_output_general_exception():
    response_json = {"response": "test response"}
    output_path_expression = "$.response"
    response_bytes = BytesIO(json.dumps(response_json).encode("utf-8"))
    content_handler = SageMakerContentHandler(input_schema=input_schema, output_path_expression=output_path_expression)

    # Mock the find method to raise a general Exception
    with mock.patch.object(content_handler.output_path_expression, "find", side_effect=Exception("General error")):
        with mock.patch("llms.models.sagemaker.content_handler.metrics.add_metric") as mock_metrics:
            with pytest.raises(JsonPathExtractionError) as error:
                content_handler.transform_output(response_bytes)

            assert (
                error.value.args[0]
                == f"There was an error parsing the output using the provided JSONPath: {output_path_expression}. Received LLM Output: {repr(response_json)}\nError: General error"
            )
            mock_metrics.assert_called_once()
