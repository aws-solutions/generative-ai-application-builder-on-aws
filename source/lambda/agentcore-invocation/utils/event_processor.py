# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

import json
from typing import Any, Dict, List, Optional
from uuid import uuid4

from aws_lambda_powertools import Logger, Tracer
from utils.constants import (
    CONNECTION_ID_KEY,
    CONVERSATION_ID_KEY,
    FILES_KEY,
    INPUT_TEXT_KEY,
    MESSAGE_ID_KEY,
    MESSAGE_KEY,
    REQUEST_CONTEXT_KEY,
    USER_ID_KEY,
)

logger = Logger(utc=True)
tracer = Tracer()


class EventProcessorError(Exception):
    """Base exception class for EventProcessor errors"""

    pass


class InvalidEventError(EventProcessorError):
    """Exception raised when the event is invalid"""

    pass


class MissingDataError(EventProcessorError):
    """Exception raised when required data is missing"""

    pass


class EventProcessor:
    """This class is used to process a sqs event record whose body contains the requestContext and message
    from the websocket route invocation
    """

    def __init__(self, event: Dict):
        self.event = event
        try:
            self.event_body = json.loads(event.get("body", "{}"))
        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse event body: {e}")
            raise InvalidEventError("Invalid JSON in event body") from e

        if not isinstance(self.event_body, dict):
            raise InvalidEventError("Event body must be a JSON object")

    def get_connection_id(self) -> Optional[str]:
        """
        Retrieve the connection ID from the event.

        Returns:
            Optional[str]: The connection ID, or None if not found in the event.

        Raises:
            InvalidEventError: If the connection ID is not found in the event.
        """
        try:
            return self.event_body[REQUEST_CONTEXT_KEY][CONNECTION_ID_KEY]
        except KeyError as e:
            logger.error("Connection ID not found in event")
            raise InvalidEventError("Connection ID not found in event") from e

    def get_message(self) -> Dict:
        """
        Retrieve the message from the event body.

        Returns:
            Dict: The message dictionary.

        Raises:
            MissingDataError: If the message is not found in the event body.
        """
        message = self.event_body.get(MESSAGE_KEY)
        if not message:
            logger.error("Message not found in event body")
            raise MissingDataError("Message is required but not found in event body")
        return message

    def get_input_text(self) -> str:
        """
        Retrieve the input text from the message.

        Returns:
            str: The input text, or an empty string if not found in the message.
        """
        input_text = self.get_message().get(INPUT_TEXT_KEY, "")
        return input_text if input_text is not None else ""

    def get_conversation_id(self) -> str:
        """
        Retrieve the conversation ID from the message, or generate a new one if not found.

        Returns:
            str: The conversation ID.
        """
        conversation_id = self.get_message().get(CONVERSATION_ID_KEY, "")
        if not conversation_id or (isinstance(conversation_id, str) and conversation_id.strip() == ""):
            return str(uuid4())
        return conversation_id

    def get_user_id(self) -> Optional[str]:
        """
        Retrieve the user ID from the event.

        Returns:
            str: The user ID
        """
        user_id = self.event_body.get(REQUEST_CONTEXT_KEY, {}).get("authorizer", {}).get("UserId")
        if user_id is None:
            logger.error("User ID not found in event")
            raise InvalidEventError("User ID not found in event")
        else:
            return user_id

    def get_files(self) -> List[Dict[str, Any]]:
        """
        Retrieve the files from the message.

        Returns:
            List[Dict[str, Any]]: The files list.
        """
        return self.get_message().get(FILES_KEY, [])

    def get_message_id(self) -> str:
        """
        Retrieve the message ID from the WebSocket message payload.

        Returns:
            str: The message ID from the event payload, or generates a new UUID if not found.
        """
        message_id = self.get_message().get(MESSAGE_ID_KEY)
        if not message_id:
            return str(uuid4())
        return message_id

    @tracer.capture_method
    def process(self) -> Dict:
        """
        Process the event and return relevant information.

        Returns:
            Dict: A dictionary containing the connection ID, conversation ID,
            input text, user ID, and message ID

        Raises:
            EventProcessorError: If any error occurs during event processing.
        """
        try:
            result = {
                CONNECTION_ID_KEY: self.get_connection_id(),
                CONVERSATION_ID_KEY: self.get_conversation_id(),
                INPUT_TEXT_KEY: self.get_input_text(),
                USER_ID_KEY: self.get_user_id(),
                MESSAGE_ID_KEY: self.get_message_id(),
                FILES_KEY: self.get_files(),
            }

            return result
        except EventProcessorError as e:
            logger.error(f"Error processing event: {e}")
            raise
