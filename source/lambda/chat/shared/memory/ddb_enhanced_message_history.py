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

import os
import time
from typing import List, Optional

from aws_lambda_powertools import Logger, Tracer
from botocore.exceptions import ClientError
from helper import get_service_resource
from langchain.schema import _message_to_dict
from langchain_core.chat_history import BaseChatMessageHistory
from langchain_core.messages import (
    AIMessage,
    BaseMessage,
    ChatMessage,
    FunctionMessage,
    HumanMessage,
    SystemMessage,
    ToolMessage,
    messages_from_dict,
    messages_to_dict,
)
from utils.constants import DDB_MESSAGE_TTL_ENV_VAR, DEFAULT_DDB_MESSAGE_TTL, TRACE_ID_ENV_VAR

logger = Logger(utc=True)
tracer = Tracer()


class DynamoDBChatMessageHistory(BaseChatMessageHistory):
    """Class which handles both chat message history and context management, storing data in AWS DynamoDB.
    This class expects that a DynamoDB table with name `table_name`
    and a partition Key of `UserId` and a sort Key of `ConversationId` are present.

    Args:
        table_name: name of the DynamoDB table
        user_id (str): Id of the user who the current chat belongs to. Used as partition key in table.
        conversation_id (str): The key that is used to store the messages of a single chat session for a given user. Used as the sort key in the table.
    """

    def __init__(
        self,
        table_name: str,
        user_id: str,
        conversation_id: str,
        max_history_length: Optional[int] = None,
        human_prefix: Optional[str] = "Human",
        ai_prefix: Optional[str] = "AI",
    ) -> None:
        ddb_resource = get_service_resource("dynamodb")
        self.table = ddb_resource.Table(table_name)
        self.conversation_id = conversation_id
        self.user_id = user_id
        self.max_history_length = int(max_history_length) if max_history_length else None
        self.human_prefix = human_prefix
        self.ai_prefix = ai_prefix

    @property
    @tracer.capture_method(capture_response=True)
    def messages(self) -> List[BaseMessage]:  # type: ignore
        """Retrieve the messages from DynamoDB"""

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
                    logger.error(err, xray_trace_id=os.environ[TRACE_ID_ENV_VAR],)

            if response and "Item" in response:
                items = response["Item"]["History"]
            else:
                items = []

            messages = messages_from_dict(items)
            return messages

    def get_role_prepended_message(self, message: BaseMessage) -> BaseMessage:
        """Convert a message to string with pre-pended role.
        Modification of langchain_core.messages.get_buffer_string method

        Args:
            message: A BaseMessage who's content needs to be updated with its role

        Returns:
            A BaseMessage with the concatenated role as content of the BaseMessage

        Raises:
            ValueError: If an unsupported message type is encountered.
        """
        if isinstance(message, HumanMessage):
            role = self.human_prefix
        elif isinstance(message, AIMessage):
            role = self.ai_prefix
        elif isinstance(message, SystemMessage):
            role = "System"
        elif isinstance(message, FunctionMessage):
            role = "Function"
        elif isinstance(message, ToolMessage):
            role = "Tool"
        elif isinstance(message, ChatMessage):
            role = message.role
        else:
            raise ValueError(f"Got unsupported message type: {message}")

        constructed_message = f"{role}: {message.content}"
        if isinstance(message, AIMessage) and "function_call" in message.additional_kwargs:
            constructed_message += f"{message.additional_kwargs['function_call']}"

        message.content = constructed_message
        return message

    @tracer.capture_method
    def add_message(self, message: BaseMessage) -> None:
        """Append the message to the record in DynamoDB"""

        message = self.get_role_prepended_message(message)

        messages = messages_to_dict(self.messages)
        _message = _message_to_dict(message)
        messages.append(_message)

        if self.max_history_length is not None:
            messages = messages[-self.max_history_length :]

        # fmt: off
        with tracer.provider.in_subsegment("## chat_history") as subsegment: # NOSONAR python:S1192 - subsegment name for x-ray tracing
        # fmt: on
            subsegment.put_annotation("service", "dynamodb")
            subsegment.put_annotation("operation", "update_item")
            try:

                # calculate a TTL 24 hours from now
                expiry_period = int(os.getenv(DDB_MESSAGE_TTL_ENV_VAR, DEFAULT_DDB_MESSAGE_TTL))
                ttl = int(time.time()) + expiry_period
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
            except ClientError as err:
                logger.error(err, xray_trace_id=os.environ[TRACE_ID_ENV_VAR],)

    @tracer.capture_method
    def clear(self) -> None:
        """Clear session memory from DynamoDB"""
        from botocore.exceptions import ClientError

        # fmt: off
        with tracer.provider.in_subsegment("## chat_history") as subsegment: # NOSONAR python:S1192 - subsegment name for x-ray tracing
        # fmt: on
            subsegment.put_annotation("service", "dynamodb")
            subsegment.put_annotation("operation", "delete_item")

            try:
                self.table.delete_item(Key={"UserId": self.user_id, "ConversationId": self.conversation_id})
            except ClientError as err:
                logger.error(err, xray_trace_id=os.environ[TRACE_ID_ENV_VAR])
