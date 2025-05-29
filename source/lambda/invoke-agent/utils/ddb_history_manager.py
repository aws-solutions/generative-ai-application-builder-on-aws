# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

import os
import time
from typing import Dict, List, Optional

from aws_lambda_powertools import Logger, Tracer
from botocore.exceptions import ClientError
from helper import get_service_resource

from utils.constants import (
    CONVERSATION_TABLE_NAME_ENV_VAR,
    DEFAULT_DDB_MESSAGE_TTL,
    TRACE_ID_ENV_VAR,
)

logger = Logger(utc=True)
tracer = Tracer()


class InvalidEnvironmentSetup(Exception):
    """Custom exception class for invalid environment setup."""

    pass


class DynamoDBHistoryManager:
    """Class which handles conversation history management, storing data in AWS DynamoDB.
    This class expects that a DynamoDB table with name `table_name`
    and a partition Key of `UserId` and a sort Key of `ConversationId` are present.

    Args:
        table_name: name of the DynamoDB table
        user_id (str): Id of the user who the current chat belongs to. Used as partition key in table.
        conversation_id (str): The key that is used to store the messages of a single chat session for a given user. Used as the sort key in the table.
    """

    def __init__(
        self,
        user_id: str,
        conversation_id: str,
        table_name: Optional[str] = None,
    ) -> None:
        self._table_name = table_name or os.environ.get(CONVERSATION_TABLE_NAME_ENV_VAR)
        if not self._table_name:
            error_message = f"Table name not found in environment variables: {CONVERSATION_TABLE_NAME_ENV_VAR}"
            logger.error(error_message)
            raise InvalidEnvironmentSetup(error_message)

        ddb_resource = get_service_resource("dynamodb")
        self.table = ddb_resource.Table(self._table_name)

        self.conversation_id = conversation_id
        self.user_id = user_id

    @property
    @tracer.capture_method(capture_response=True)
    def messages(self) -> List[Dict]:
        """Retrieve the message history from DynamoDB"""

        response = None
        # fmt: off
        with tracer.provider.in_subsegment("## chat_history") as subsegment: # NOSONAR python:S1192 - subsegment name for x-ray tracing
        # fmt: on
            subsegment.put_annotation("service", "dynamodb")
            subsegment.put_annotation("operation", "get_item")

            try:
                response = self.table.get_item(
                    Key={"UserId": self.user_id, "ConversationId": self.conversation_id},
                    ProjectionExpression="History",
                    ConsistentRead=True,
                )
            except ClientError as err:
                if err.response["Error"]["Code"] == "ResourceNotFoundException":
                    logger.warning(f"No record found with user id {self.user_id} and conversation id {self.conversation_id}")
                else:
                    logger.error(err, xray_trace_id=os.environ.get(TRACE_ID_ENV_VAR, ""))

            if response and "Item" in response:
                items = response["Item"]["History"]
            else:
                items = []

            return items

    @tracer.capture_method
    def add_message(self, human_message: str, ai_message: str, message_id: str) -> bool:
        """Add a human and AI message pair to the history in DynamoDB

        Args:
            human_message: The message from the human user
            ai_message: The response from the AI agent
            message_id: The unique ID for this message pair

        Returns:
            bool: True if the message was added successfully, False otherwise
        """
        # Get current history
        messages = self.messages

        # Add new messages
        messages.append({"type": "human", "data": {"content": human_message, "id": message_id}})

        messages.append({"type": "ai", "data": {"content": ai_message, "id": message_id}})

        # fmt: off
        with tracer.provider.in_subsegment("## chat_history") as subsegment: # NOSONAR python:S1192 - subsegment name for x-ray tracing
        # fmt: on
            subsegment.put_annotation("service", "dynamodb")
            subsegment.put_annotation("operation", "update_item")
            try:
                # Calculate TTL 24 hours from now
                ttl = int(time.time()) + DEFAULT_DDB_MESSAGE_TTL
                
                # update_item will put item if key does not exist
                self.table.update_item(
                    Key={
                        "UserId": self.user_id,
                        "ConversationId": self.conversation_id,
                    },
                    UpdateExpression="SET #History = :messages, #TTL = :ttl",
                    ExpressionAttributeNames={"#History": "History", "#TTL": "TTL"},
                    ExpressionAttributeValues={":messages": messages, ":ttl": ttl},
                )
                return True
            except ClientError as err:
                logger.error(f"Failed to add message: {err}", xray_trace_id=os.environ.get(TRACE_ID_ENV_VAR, ""))
                return False

    @tracer.capture_method
    def clear(self) -> bool:
        """Clear conversation history from DynamoDB

        Returns:
            bool: True if the history was cleared successfully, False otherwise
        """

        # fmt: off
        with tracer.provider.in_subsegment("## chat_history") as subsegment: # NOSONAR python:S1192 - subsegment name for x-ray tracing
        # fmt: on
            subsegment.put_annotation("service", "dynamodb")
            subsegment.put_annotation("operation", "delete_item")

            try:
                self.table.delete_item(Key={"UserId": self.user_id, "ConversationId": self.conversation_id})
                return True
            except ClientError as err:
                logger.error(f"Failed to clear history: {err}", xray_trace_id=os.environ.get(TRACE_ID_ENV_VAR, ""))
                return False
