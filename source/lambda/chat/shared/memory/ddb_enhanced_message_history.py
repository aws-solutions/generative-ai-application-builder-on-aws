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
from typing import List

from aws_lambda_powertools import Logger, Tracer
from botocore.exceptions import ClientError
from helper import get_service_resource
from langchain.schema import _message_to_dict
from langchain_core.chat_history import BaseChatMessageHistory
from langchain_core.messages import BaseMessage, messages_from_dict, messages_to_dict
from utils.constants import DDB_MESSAGE_TTL_ENV_VAR, DEFAULT_DDB_MESSAGE_TTL, TRACE_ID_ENV_VAR
from utils.enum_types import ConversationMemoryTypes

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

    memory_type: ConversationMemoryTypes = ConversationMemoryTypes.DynamoDB.value

    def __init__(self, table_name: str, user_id: str, conversation_id: str) -> None:
        ddb_resource = get_service_resource("dynamodb")
        self.table = ddb_resource.Table(table_name)
        self.conversation_id = conversation_id
        self.user_id = user_id

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

    @tracer.capture_method
    def add_message(self, message: BaseMessage) -> None:
        """Append the message to the record in DynamoDB"""
        from botocore.exceptions import ClientError

        messages = messages_to_dict(self.messages)
        _message = _message_to_dict(message)
        messages.append(_message)

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
