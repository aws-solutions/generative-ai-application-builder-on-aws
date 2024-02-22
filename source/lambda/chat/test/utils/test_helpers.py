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

from typing import Dict

import pytest
from utils.helpers import count_keys, pop_null_values, type_cast, validate_prompt_placeholders


@pytest.mark.parametrize(
    "prompt_template,required_placeholders",
    [
        ("Some template with no placeholders", []),
        ("Some template with {{placeholder1}}", ["placeholder1"]),
        (
            "Some template with {{placeholder1}} and {{placeholder2}}",
            ["placeholder1", "placeholder2"],
        ),
        (
            "Some template with {{placeholder2}} and {{placeholder1}}",
            ["placeholder1", "placeholder2"],
        ),
        (
            "{{placeholder1}} and {{placeholder2}} and some more words",
            ["placeholder1", "placeholder2"],
        ),
    ],
)
def test_validate_prompt_template_valid(prompt_template, required_placeholders):
    validate_prompt_placeholders(prompt_template, required_placeholders)


def test_validate_prompt_template_invalid():
    with pytest.raises(ValueError):
        validate_prompt_placeholders(None, ["placeholder1"])
    with pytest.raises(ValueError):
        validate_prompt_placeholders("", ["placeholder1"])
    with pytest.raises(ValueError):
        validate_prompt_placeholders("Some template with no placeholders", ["placeholder1"])
    with pytest.raises(ValueError):
        validate_prompt_placeholders("Some template with {{placeholder1}}", ["placeholder2"])
    with pytest.raises(ValueError):
        validate_prompt_placeholders("Some template with {{placeholder1}}", ["placeholder2"])
    with pytest.raises(ValueError):
        validate_prompt_placeholders("Some template with {{placeholder1}}", ["placeholder1", "placeholder2"])
    with pytest.raises(ValueError):
        validate_prompt_placeholders("Some template with {{placeholder1}} and {{placeholder1}}", ["placeholder1"])


@pytest.mark.parametrize(
    "prompt_template,required_placeholders",
    [
        ("Some template with no placeholders", []),
        ("Some template with {{placeholder1}}", ["placeholder1"]),
        (
            "Some template with {{placeholder1}} and {{placeholder2}}",
            ["placeholder1", "placeholder2"],
        ),
        (
            "Some template with {{placeholder2}} and {{placeholder1}}",
            ["placeholder1", "placeholder2"],
        ),
        (
            "{{placeholder1}} and {{placeholder2}} and some more words",
            ["placeholder1", "placeholder2"],
        ),
    ],
)
def test_validate_prompt_template_valid(prompt_template, required_placeholders):
    validate_prompt_placeholders(prompt_template, required_placeholders)


@pytest.mark.parametrize(
    "value,data_type,response,response_type",
    [
        ("1", "integer", 1, int),
        ("1.2", "float", 1.2, float),
        ("test-param", "string", "test-param", str),
        ("1", "boolean", True, bool),
        ("Yes", "boolean", True, bool),
        ("yes", "boolean", True, bool),
        ("True", "boolean", True, bool),
        ("true", "boolean", True, bool),
        ("0", "boolean", False, bool),
        ("false", "boolean", False, bool),
        ('["\nHuman:", "\nAI:"]', "list", ["\nHuman:", "\nAI:"], list),
        ('["|"]', "list", ["|"], list),
        ('{"scale": 0}', "dictionary", {"scale": 0}, dict),
    ],
)
def test_valid_type_casting(value, data_type, response, response_type, setup_environment):
    response = type_cast(value, data_type)
    assert response == response
    assert type(response) == response_type


@pytest.mark.parametrize(
    "value,data_type",
    [
        ("false", "test"),
        ("test-value", "integer"),
        ('{"scale: 0}', "dict"),
        ('{"scale": xx"}', "dict"),
        ('{"scale": 0', "dict"),
        ("ai, human", "list"),
        ('["ai", "human"', "list"),
    ],
)
def test_invalid_casting(value, data_type, setup_environment):
    assert type_cast(value, data_type) is None


@pytest.mark.parametrize(
    "input_dict,expected_count",
    [
        ({"a": 1, "b": {"c": 2, "d": 3}}, 4),
        ({"a": 1, "b": {"c": 2, "d": 3, "e": None}, "f": None}, 6),
        (
            {
                "a": 1,
                "b": {"c": 2, "d": 3, "e": {"g": 4, "h": {"i": 5, "j": None}}},
                "f": None,
            },
            10,
        ),
    ],
)
def test_count_keys(input_dict, expected_count):
    assert count_keys(input_dict) == expected_count


@pytest.mark.parametrize(
    "input_dict,expected_dict",
    [
        ({"a": 1, "b": None, "c": 2}, {"a": 1, "c": 2}),
        (
            {
                "a": 1,
                "b": {"c": 2, "d": 3, "e": {"g": 4, "h": {"i": 5, "j": None}}},
                "f": None,
            },
            {
                "a": 1,
                "b": {"c": 2, "d": 3, "e": {"g": 4, "h": {"i": 5}}},
            },
        ),
    ],
)
def test_dict_pop_null_values(input_dict, expected_dict):
    assert pop_null_values(input_dict) == expected_dict
