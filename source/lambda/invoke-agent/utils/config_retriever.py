# *********************************************************************************************************************
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
# ********************************************************************************************************************#
import os

import boto3
from aws_lambda_powertools import Logger, Tracer
from boto3.dynamodb.types import TypeDeserializer
from botocore.exceptions import ClientError
from helper import get_service_client
from utils.constants import USE_CASE_CONFIG_RECORD_KEY_ENV_VAR, USE_CASE_CONFIG_TABLE_NAME_ENV_VAR

logger = Logger(utc=True)
tracer = Tracer()


class UseCaseConfigRetriever:
    def __init__(self, dynamodb_client=None):
        self._cache = None
        self._table_name = None
        self._record_key = None
        self._dynamodb_client = dynamodb_client or get_service_client("dynamodb")

    def _get_env_variables(self):
        """
        Retrieve and validate the required environment variables.

        Raises:
            ValueError: If any of the required environment variables are missing.
        """
        self._table_name = os.environ.get(USE_CASE_CONFIG_TABLE_NAME_ENV_VAR)
        self._record_key = os.environ.get(USE_CASE_CONFIG_RECORD_KEY_ENV_VAR)

        if not self._table_name or not self._record_key:
            error_message = f"Missing required environment variables: {USE_CASE_CONFIG_TABLE_NAME_ENV_VAR} or {USE_CASE_CONFIG_RECORD_KEY_ENV_VAR}"
            logger.error(error_message)
            raise ValueError(error_message)

    @tracer.capture_method
    def retrieve_use_case_config(self):
        """
        Retrieve the use case configuration from DynamoDB or cache.

        Returns:
            dict: The use case configuration.

        Raises:
            ValueError: If the config is not found in DynamoDB.
            RuntimeError: If there's an error retrieving the config from DynamoDB.
        """
        # If the config is already in cache, return it
        if self._cache is not None:
            logger.debug("Returning use case config from cache")
            return self._cache

        self._get_env_variables()

        try:
            response = self._dynamodb_client.get_item(
                TableName=self._table_name, Key={"key": {"S": self._record_key}}, ProjectionExpression="config"
            )

            if "Item" not in response:
                error_message = f"No config found for key: {self._record_key} in table: {self._table_name}"
                logger.error(error_message)
                raise ValueError(error_message)

            # Extract the config from the response
            config = response["Item"].get("config", {})

            # Deserialize the config
            deserializer = TypeDeserializer()
            use_case_config = deserializer.deserialize(config)

            # Cache the config for subsequent invocations
            self._cache = use_case_config

            logger.info(f"Successfully retrieved and cached use case config for key: {self._record_key}")
            return use_case_config

        except ClientError as e:
            error_message = f"Error retrieving use case config: {str(e)}"
            logger.error(error_message)
            raise RuntimeError(error_message)

    def clear_cache(self):
        """Clear the cached configuration."""
        self._cache = None
        logger.info("Use case config cache cleared")
