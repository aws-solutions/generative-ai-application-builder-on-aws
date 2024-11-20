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

import json
import os
from typing import Dict, Optional
from uuid import uuid4

from aws_lambda_powertools import Logger, Tracer
from helper import get_cognito_jwt_verifier
from utils.constants import (
    AUTH_TOKEN_KEY,
    CONNECTION_ID_KEY,
    CONVERSATION_ID_KEY,
    INPUT_TEXT_KEY,
    MESSAGE_KEY,
    REQUEST_CONTEXT_KEY,
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

    def get_auth_token(self) -> Optional[str]:
        """
        Retrieve and validate the Cognito JWT token received in the message if present.

        This method retrieves the Cognito JWT token from the incoming message. If the token
        is present, it validates it using the `_validate_auth_token` method. If the token
        is valid, it is returned. If no token is found, it returns None.

        Returns:
            Optional[str]: The validated Cognito JWT token, or None if no token is found.

        Raises:
            CognitoJWTVerifierError: If the token is present but invalid or any other error
                occurs during validation. The specific error message will be included in the exception.
        """
        event_auth_token = self.get_message().get(AUTH_TOKEN_KEY)
        if event_auth_token:
            self._validate_auth_token(event_auth_token)
            return event_auth_token
        return None

    def get_input_text(self) -> str:
        """
        Retrieve the input text from the message.

        Returns:
            str: The input text, or an empty string if not found in the message.
        """
        return self.get_message().get(INPUT_TEXT_KEY, "")

    def get_conversation_id(self) -> str:
        """
        Retrieve the conversation ID from the message, or generate a new one if not found.

        Returns:
            str: The conversation ID.
        """
        conversation_id = self.get_message().get(CONVERSATION_ID_KEY, "")
        if conversation_id.strip() == "":
            return str(uuid4())
        return conversation_id

    def _validate_auth_token(self, auth_token: str) -> None:
        """
        Validate the Cognito JWT token using the configured verifier.

        This method attempts to verify the provided Cognito JWT token. If the token
        is invalid, expired, or fails verification for any reason, an exception is raised.
        If the token is valid, a log message is printed.

        Args:
            auth_token (str): The Cognito JWT token to be validated.

        Raises:
            CognitoJWTVerifierError: If the token is invalid, expired, or fails verification.
                The specific reason for the failure will be included in the exception message.

        Note:
            This method does not return a boolean. Instead, it will raise an exception
            if the token is invalid, and will complete silently (except for the log message)
            if the token is valid.
        """
        jwt_verifier = get_cognito_jwt_verifier(
            user_pool_id=os.environ.get("USER_POOL_ID"), app_client_id=os.environ.get("APP_CLIENT_ID")
        )
        try:
            jwt_verifier.verify_jwt_token(auth_token)
            logger.info("Token validation successful")
        except Exception as e:
            logger.error(f"Token validation failed: {e}")
            raise e

    @tracer.capture_method
    def process(self) -> Dict:
        """
        Process the event and return relevant information.

        Returns:
            Dict: A dictionary containing the connection ID, conversation ID,
            input text, and auth token (if present).

        Raises:
            EventProcessorError: If any error occurs during event processing.
        """
        try:
            result = {
                CONNECTION_ID_KEY: self.get_connection_id(),
                CONVERSATION_ID_KEY: self.get_conversation_id(),
                INPUT_TEXT_KEY: self.get_input_text(),
            }

            if auth_token := self.get_auth_token():
                result[AUTH_TOKEN_KEY] = auth_token

            return result
        except EventProcessorError as e:
            logger.error(f"Error processing event: {e}")
            raise
