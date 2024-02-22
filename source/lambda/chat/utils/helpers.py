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
import re
from typing import Any, Dict, List, Optional, Union

from aws_lambda_powertools import Logger, Metrics, Tracer
from aws_lambda_powertools.metrics import MetricUnit
from utils.constants import METRICS_SERVICE_NAME, TRACE_ID_ENV_VAR
from utils.enum_types import CloudWatchMetrics, CloudWatchNamespaces

logger = Logger(utc=True)
tracer = Tracer()
_metrics_var = dict()

TYPE_CASTING_MAP = {
    "integer": int,
    "float": float,
    "string": str,
    "boolean": lambda value: value.lower() in ["true", "yes"],
    "list": lambda value: json.loads(value, strict=False),
    "dictionary": lambda value: json.loads(value),
}


@tracer.capture_method
def get_metrics_client(metric_namespace: CloudWatchNamespaces) -> Metrics:
    global _metrics_var

    if metric_namespace not in _metrics_var:
        logger.debug(f"Cache miss for {metric_namespace}. Creating a new one and cache it")
        _metrics_var[metric_namespace] = Metrics(namespace=metric_namespace.value, service=METRICS_SERVICE_NAME)

    return _metrics_var[metric_namespace]


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
    metrics = get_metrics_client(CloudWatchNamespaces.LANGCHAIN_LLM)
    try:
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
    finally:
        metrics.flush_metrics()


def validate_prompt_placeholders(prompt_template: str, required_placeholders: List[str]):
    """Checks that the prompt template contains all the required placeholders. Placeholders are expected to be surrounded
      by curly braces {}, and can appear only once.

    Args:
        prompt_template (str): Prompt template to be validated.
        required_placeholders (List[str]): List of required placeholders

    Raises:
        ValueError: When a placeholder is not present in the prompt template, or there is more than 1 occurrence of it.
    """
    metrics = get_metrics_client(CloudWatchNamespaces.LANGCHAIN_LLM)
    try:
        if not prompt_template:
            metrics.add_metric(
                name=CloudWatchMetrics.INCORRECT_INPUT_FAILURES.value,
                unit=MetricUnit.Count,
                value=1,
            )
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
    finally:
        metrics.flush_metrics()


def format_lambda_response(body: dict, extra_headers: Dict[str, str] = {}, status_code: int = 200) -> dict:
    """
    Utility function to correctly format an HTTP response that will be accepted by APIGateway

    Args:
        body (dict): The body which will be stringified in the response
        extra_headers (Dict[str, str], optional): Additional headers to add. Defaults to {}.

    Returns:
        dict: response object that can be accepted by APIGateway lambda proxy
    """
    headers = {
        "Content-Type": "application/json",
    }
    headers.update(extra_headers)
    stringified_body = ""
    try:
        stringified_body = json.dumps(body, default=str)
    except TypeError as e:
        logger.error(
            f"Unable to stringify body: {body}. Got error {e}",
            xray_trace_id=os.environ[TRACE_ID_ENV_VAR],
        )

    return {"statusCode": status_code, "headers": headers, "isBase64Encoded": False, "body": stringified_body}


def enforce_stop_tokens(text: str, stop: List[str]) -> str:
    """Cut off the text as soon as any stop words occur."""
    if not stop:
        return text
    return re.split("|".join(stop), text, maxsplit=1)[0]


def count_keys(input_dict: Dict) -> int:
    """
    Counts the number of keys in a nested dictionary recursively
    Args:
        input_dict (dict): The dictionary to count the number of keys in.
    Returns:
        int: The number of keys in the dictionary.
    """
    return (
        0 if not isinstance(input_dict, dict) else len(input_dict) + sum(count_keys(val) for val in input_dict.values())
    )


def pop_null_values(input_dict: Union[Dict[Any, Any], List[Dict[Any, Any]]]):
    """
    Recursively pops null values from a nested dictionary or a list of dictionaries
    Args:
        input_dict (dict): The dictionary to recursively pop null values from.
    Returns:
        dict: The dictionary with null values popped.
    """
    if isinstance(input_dict, dict):
        return {
            key: value for key, value in ((key, pop_null_values(value)) for key, value in input_dict.items()) if value
        }
    if isinstance(input_dict, list):
        return [value for value in map(pop_null_values, input_dict) if value]
    return input_dict
