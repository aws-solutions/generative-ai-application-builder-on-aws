import json
import os
from copy import deepcopy
from typing import Any, Dict

import jsonpath_ng as jp
from aws_lambda_powertools import Logger, Tracer
from aws_lambda_powertools.metrics import MetricUnit
from langchain.llms.sagemaker_endpoint import LLMContentHandler
from utils.constants import TRACE_ID_ENV_VAR
from utils.enum_types import CloudWatchMetrics, CloudWatchNamespaces
from utils.helpers import count_keys, get_metrics_client, pop_null_values

tracer = Tracer()
logger = Logger(utc=True)
metrics = get_metrics_client(CloudWatchNamespaces.LANGCHAIN_LLM)
tracer_id = os.getenv(TRACE_ID_ENV_VAR)


class SageMakerContentHandler(LLMContentHandler):
    """
    ContentHandler for SageMaker which allows input and output transformations using user-provided
    schemas

    For example, your model takes an input of the format:
            {
                "inputs": [
                    [
                        {
                            "role": "system",
                            "content": "Always reply in a poem",
                        },
                        {"role": "user", "content": "This is a prompt to the model"},
                    ]
                ],
                "parameters": {
                    "top_p": 0.2,
                    "temperature": 0.1,
                    "max_tokens": 50
                },
            }

            The input_schema for this would look like this:

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
                    "top_p": <<top_p>>,
                    "temperature": <<temperature>>,
                    "max_tokens": <<token_size>>
                },
            }

            and the model arguments dictionary would look like this (notice placeholder values in the above schema are provided here):
            {
                "top_p": 0.2,
                "temperature": 0.1,
                "token_size": 500
            }
            and let's say the prompt is: "This is a prompt to the model"

            During the invocation of the model, the input_schema into the appropriate values using the model arguments dictionary and the prompt.
            This allows the chat lambda to replace the values appropriately.

            Similarly if your response from the model looks like:

            {
                "model_response_time": 0.22
                "response": {
                    "generated_text": "This is the response from the model",
                    "probability": 0.956
                }
            }

            Your output response JSONPath will be: "$.response.generated_text". The chat lambda extracts the response from the provided path
                each time

            The <<prompt>> and <<temperature>> are special keywords to replace prompt and temperature received from the user-inputted
            values in the UI (which are stored in the SSM config)
    """

    def __init__(self, input_schema: Dict[Any, Any], output_path_expression: str):
        super().__init__()
        self.content_type = "application/json"
        self.accepts = "application/json"
        self.input_schema = input_schema
        self.output_path_expression = jp.parse(output_path_expression)

    def transform_input(self, prompt: str, model_kwargs: Dict[str, Any]) -> bytes:
        """
        Overrides LLMContentHandler.transform_input to transform the input to a format that model
        can accept as the request body.

        """
        payload = deepcopy(self.input_schema)
        placeholders = deepcopy(model_kwargs)
        placeholders["prompt"] = prompt

        self.replace_placeholders(payload, placeholders)
        original_keys_len = count_keys(payload)
        payload = pop_null_values(payload)
        transformed_keys_len = count_keys(payload)

        if original_keys_len > transformed_keys_len:
            logger.warning(
                """The input schema contained placeholders which were not provided with actual values in model arguments. """
                """Proceeding to use this input schema without these placeholders.""",
                xray_trace_id=tracer_id,
            )
            metrics.add_metric(name=CloudWatchMetrics.INCORRECT_INPUT_FAILURES.value, unit=MetricUnit.Count, value=1)

        metrics.flush_metrics()
        return json.dumps(payload).encode("utf-8")

    def transform_output(self, output: bytes) -> str:
        """
        Overrides LLMContentHandler.transform_output to transform the output from the model to string that the
        LLM class expects.

        The JSONpath available in output_path_expression is used to extract the appropriate output.
        """
        response_json = json.loads(output.read().decode("utf-8"))
        matches = [match.value for match in self.output_path_expression.find(response_json)]
        if matches:
            return matches[0]
        else:
            raise ValueError(
                f"The JSONPath specified: {self.output_path_expression} for extracting LLM response doesn't exist in the output: {response_json}"
            )

    def replace_placeholders(self, input_schema: Dict[Any, Any], placeholders: Dict[str, Any]):
        """
        Finds the occurrence keys with placeholders of the format: <<placeholder>> and replaces the values with
        the corresponding value from `placeholders` dict.
        If `placeholders` doesn't have a key `x` for a placeholder like: <<x>>, a default value of None is
        assigned instead.
        Returns the new_value with placeholders replaced.
        Args:
            input (dict): The dictionary to replace placeholders (of type `<<placeholder>>`) in, eg
                {"param1": <<placeholder1>>, "param2": "DEFAULT"}. Placeholders are checked for all values of a
                nested dictionary recursively
            placeholders (dict): The dictionary with actual values of the placeholders, eg {"placeholder1": 0.2}
        Returns:
            None; All changes are done in-place in the input

        """
        if isinstance(input_schema, list):
            return [self.replace_placeholders(item, placeholders) for item in input_schema]

        elif isinstance(input_schema, dict):
            for key, value in input_schema.items():
                if isinstance(value, dict):
                    self.replace_placeholders(value, placeholders)
                elif isinstance(value, list):
                    self.replace_placeholders(value, placeholders)
                elif isinstance(value, str) and value.startswith("<<") and value.endswith(">>"):
                    input_schema[key] = placeholders.get(
                        value[2:-2]
                    )  # Fetch the key without the starting and ending braces
