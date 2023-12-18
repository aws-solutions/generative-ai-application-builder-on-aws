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
from typing import Any, List, Optional

from aws_lambda_powertools import Logger, Metrics
from aws_lambda_powertools.metrics import MetricUnit
from utils.constants import METRICS_SERVICE_NAME, TRACE_ID_ENV_VAR
from utils.enum_types import CloudWatchMetrics, CloudWatchNamespaces

logger = Logger(utc=True)
metrics = Metrics(namespace=CloudWatchNamespaces.LANGCHAIN_LLM.value, service=METRICS_SERVICE_NAME)

TYPE_CASTING_MAP = {
    "integer": int,
    "float": float,
    "string": str,
    "boolean": lambda value: value.lower() in ["true", "yes"],
    "list": lambda value: json.loads(value, strict=False),
    "dictionary": lambda value: json.loads(value),
}


def type_cast(value: str, data_type: str, mapping_dict: Optional[dict] = TYPE_CASTING_MAP) -> Any:
    """
    Casts the provided value to the provided type.

    Args:
        value (str): The value to cast
        type (str): The type to cast to
        mapping_dict (Optional[dict]): Mapping dictionary to use for type casting. Defaults to the TYPE_CASTING_MAP.

    Returns:
        Any: The cast value
    """
    if value is None or value == "":
        return None

    valid_types = list(mapping_dict)

    if data_type is None or data_type not in valid_types:
        logger.error(
            f"type_cast() received an unsupported type: {data_type}. Supported types are: {valid_types}",
            xray_trace_id=os.environ[TRACE_ID_ENV_VAR],
        )
        metrics.add_metric(name=CloudWatchMetrics.INCORRECT_INPUT_FAILURES.value, unit=MetricUnit.Count, value=1)
        return None

    try:
        return mapping_dict[data_type](value)
    except json.decoder.JSONDecodeError as jde:
        logger.error(
            f"type_cast() had an error parsing the provided json string. Provided input: {value} for type: {data_type}. Error: {jde}"
        )
        metrics.add_metric(name=CloudWatchMetrics.INCORRECT_INPUT_FAILURES.value, unit=MetricUnit.Count, value=1)
    except ValueError as ve:
        logger.error(
            f"type_cast() received an invalid value. Provided input: {value} for type: {data_type}. Error: {ve}",
            xray_trace_id=os.environ[TRACE_ID_ENV_VAR],
        )
        metrics.add_metric(name=CloudWatchMetrics.INCORRECT_INPUT_FAILURES.value, unit=MetricUnit.Count, value=1)

    return None


def validate_prompt_template(prompt_template: str, required_placeholders: List[str]):
    """Checks that the prompt template contains all the required placeholders. Placeholders are expected to be surrounded
      by curly braces {}, and can appear only than once.

    Args:
        prompt_template (str): Prompt template to be validated.
        required_placeholders (List[str]): List of required placeholders

    Raises:
        ValueError: When a placeholder is not present in the prompt template, or there is more than 1 occurrence of it.
    """
    if not prompt_template:
        metrics.add_metric(name=CloudWatchMetrics.INCORRECT_INPUT_FAILURES.value, unit=MetricUnit.Count, value=1)
        raise ValueError("The prompt template cannot be empty")
    for required_placeholder in required_placeholders:
        formatted_placeholder = f"{{{required_placeholder}}}"  # needed to escape the {} and resolve expression
        start = 0
        found = False
        while start < len(prompt_template):
            start = prompt_template.find(formatted_placeholder, start)
            if start == -1 and found:
                # The placeholder was found once previously, so we can move on to another placeholder.
                break
            elif start == -1:
                metrics.add_metric(
                    name=CloudWatchMetrics.INCORRECT_INPUT_FAILURES.value, unit=MetricUnit.Count, value=1
                )
                raise ValueError(
                    f"The prompt template does not contain the required placeholder: {formatted_placeholder}"
                )
            elif found:
                # we found a 2nd occurrence of the placeholder in the template
                metrics.add_metric(
                    name=CloudWatchMetrics.INCORRECT_INPUT_FAILURES.value, unit=MetricUnit.Count, value=1
                )
                raise ValueError(
                    f"The prompt template contains more than one occurrence of the required placeholder: {formatted_placeholder}"
                )
            else:
                found = True
                start += len(formatted_placeholder)
