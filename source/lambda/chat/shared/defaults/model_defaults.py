#!/usr/bin/env python
# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

import os

from aws_lambda_powertools import Logger, Tracer
from botocore.exceptions import ClientError
from helper import get_service_resource
from utils.constants import CHAT_IDENTIFIER, MODEL_INFO_TABLE_NAME_ENV_VAR, RAG_CHAT_IDENTIFIER, TRACE_ID_ENV_VAR
from utils.enum_types import LLMProviderTypes

logger = Logger(utc=True)
tracer = Tracer()


class ModelDefaults:
    """
    This class sets the default values for the model.
    """

    def __init__(self, model_provider: LLMProviderTypes, model_name: str, rag_enabled: bool = False):
        if model_provider and model_name:
            self.model_provider = model_provider if type(model_provider) == str else model_provider.value
            self.model_name = model_name
            self.use_case = RAG_CHAT_IDENTIFIER if rag_enabled else CHAT_IDENTIFIER
            self.set_model_defaults()
        else:
            error_message = f"model_provider and model_name cannot be null. Provided values for model_provider: '{model_provider}' and model_name: '{model_name}'"
            logger.error(error_message, xray_trace_id=os.environ[TRACE_ID_ENV_VAR])
            raise ValueError(error_message)

    def set_model_defaults(self) -> None:
        # This method fetches dynamodb records for the provided model_provider and model_name
        table_name = os.environ[MODEL_INFO_TABLE_NAME_ENV_VAR]
        record_not_found_error = f"No records found for UseCase: '{self.use_case}' and SortKey: '{self.model_provider}#{self.model_name}' in the DynamoDB defaults table."

        try:
            ddb_resource = get_service_resource("dynamodb")
            defaults_table = ddb_resource.Table(table_name)
            model_defaults = defaults_table.get_item(
                Key={"UseCase": self.use_case, "SortKey": self.model_provider + "#" + self.model_name},
            ).get("Item", {})

            if not model_defaults:
                logger.error(record_not_found_error, xray_trace_id=os.environ[TRACE_ID_ENV_VAR])
                raise ValueError(record_not_found_error)

            self.allows_streaming = model_defaults.get("AllowsStreaming")
            self.default_temperature = float(model_defaults.get("DefaultTemperature"))
            self.min_temperature = float(model_defaults.get("MinTemperature"))
            self.max_temperature = float(model_defaults.get("MaxTemperature"))
            self.memory_config = model_defaults.get("MemoryConfig")
            self.prompt = model_defaults.get("Prompt")
            self.max_chat_message_size = int(model_defaults.get("MaxChatMessageSize"))
            self.max_prompt_size = int(model_defaults.get("MaxPromptSize"))
            self.stop_sequences = model_defaults.get("DefaultStopSequences", [])
            self.disambiguation_prompt = model_defaults.get("DisambiguationPrompt")

            if (
                any(
                    key is None
                    for key in [
                        self.allows_streaming,
                        self.default_temperature,
                        self.min_temperature,
                        self.memory_config,
                        self.prompt,
                        self.max_chat_message_size,
                        self.max_prompt_size,
                    ]
                )
                or self.prompt is None
                or not (len(self.prompt))
            ):
                error_message = f"DynamoDB defaults missing for UseCase: '{self.use_case}' and SortKey: '{self.model_provider}#{self.model_name}'"
                logger.error(
                    error_message,
                    xray_trace_id=os.environ[TRACE_ID_ENV_VAR],
                )
                raise ValueError(error_message)

            if self.use_case == RAG_CHAT_IDENTIFIER and (
                self.disambiguation_prompt is None or not len(self.disambiguation_prompt)
            ):
                error_message = f"DynamoDB defaults RAG disambiguation model prompt missing for UseCase: '{self.use_case}' and SortKey: '{self.model_provider}#{self.model_name}'"
                logger.error(
                    error_message,
                    xray_trace_id=os.environ[TRACE_ID_ENV_VAR],
                )
                raise ValueError(error_message)

        except ClientError as err:
            if err.response["Error"]["Code"] == "ResourceNotFoundException":
                logger.error(f"Model defaults table '{os.environ[MODEL_INFO_TABLE_NAME_ENV_VAR]}' not found.")
                raise ValueError(f"Model defaults table '{os.environ[MODEL_INFO_TABLE_NAME_ENV_VAR]}' not found.")
            else:
                logger.error(err, ray_trace_id=os.environ[TRACE_ID_ENV_VAR])
                raise ValueError(
                    f"Records not found for UseCase: '{self.use_case}' and SortKey: '{self.model_provider}#{self.model_name}'."
                )
