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
from typing import Any, Dict

from aws_lambda_powertools import Logger, Tracer
from aws_lambda_powertools.utilities.typing import LambdaContext
from clients.llm_chat_client import LLMChatClient
from shared.callbacks.websocket_error_handler import WebsocketErrorHandler
from shared.callbacks.websocket_handler import WebsocketHandler
from utils.constants import (
    DEFAULT_RAG_ENABLED_MODE,
    END_CONVERSATION_TOKEN,
    MESSAGE_KEY,
    REQUEST_CONTEXT_KEY,
    TRACE_ID_ENV_VAR,
    USER_ID_EVENT_KEY,
)

logger = Logger(utc=True)
tracer = Tracer()


class UseCaseHandler:
    """
    Abstract class for lambda handlers that use LLMs.

    Methods:
        handle_event(event: Dict[str, Any], context: LambdaContext) -> Dict[str, Any]:
        get_llm_client(event: Dict[str, Any]) -> LLMClient: abstract method who
    """

    def __init__(self, llm_client_type: LLMChatClient.__class__):
        self.llm_client_type = llm_client_type

    def handle_event(self, event: Dict[str, Any], context: LambdaContext) -> Dict:
        """
        Create a LLMChatClient concrete object type based on the configuration in `event` and
        admin configuration and use it to answer user questions
        :param event (Dict): AWS Lambda Event
        :param context (LambdaContext): AWS Lambda Context
        :return: the generated response from the chatbot
        """
        batch_item_failures = []

        loop_index = 0
        total_records = len(event["Records"])
        logger.debug(f"Total records received in the event: {total_records}")
        sqs_batch_response = {}

        while loop_index < total_records:
            logger.debug(f"Processing record number {loop_index}")
            connection_id = None
            record = event["Records"][loop_index]

            try:
                event_body = json.loads(record["body"])
                request_context = event_body[REQUEST_CONTEXT_KEY]
                connection_id = request_context["connectionId"]

                llm_client = self.llm_client_type(
                    connection_id=connection_id,
                )
                llm_client.check_env()
                event_body = llm_client.check_event(record)
                event_message = event_body[MESSAGE_KEY]
                llm_client.rag_enabled = llm_client.use_case_config.get("LlmParams", {}).get(
                    "RAGEnabled", DEFAULT_RAG_ENABLED_MODE
                )
                llm_chat = llm_client.get_model(
                    event_message,
                    request_context["authorizer"][USER_ID_EVENT_KEY],
                )
                ai_response = llm_chat.generate(event_message["question"])

                socket_handler = WebsocketHandler(
                    connection_id=connection_id,
                    conversation_id=llm_client.builder.conversation_id,
                )
                if not llm_client.builder.is_streaming:
                    socket_handler.post_response_to_connection(ai_response)
                socket_handler.post_token_to_connection(END_CONVERSATION_TOKEN)
                loop_index = loop_index + 1

                # check if under 20 seconds remaining, proceed with aborting processing of records
                while context.get_remaining_time_in_millis() < 20000 and loop_index < total_records:
                    logger.debug(
                        f"Lambda reaching timeout and hence adding {loop_index}th message to batch_item_failures"
                    )
                    batch_item_failures.append({"itemIdentifier": event["Records"][loop_index]["messageId"]})
                    loop_index = loop_index + 1
            except Exception as ex:
                tracer_id = os.getenv(TRACE_ID_ENV_VAR)
                chat_error = f"Chat service failed to respond. Please contact your administrator for support and quote the following trace id: {tracer_id}"
                logger.error(f"An exception occurred in the processing of chat: {ex}", xray_trace_id=tracer_id)
                error_handler = WebsocketErrorHandler(connection_id=connection_id, trace_id=tracer_id)
                error_handler.post_token_to_connection(chat_error)

                # append error records with the same connection id
                # fmt:off
                while (
                    loop_index < total_records
                    and event["Records"][loop_index]["messageAttributes"]["connectionId"]["stringValue"] == connection_id
                ):
                # fmt:on
                    logger.debug(
                        f"Record with {loop_index} has the same connectionId, hence to maintain FIFO sequence, pushing them back to the queue"
                    )
                    batch_item_failures.append({"itemIdentifier": event["Records"][loop_index]["messageId"]})
                    loop_index = loop_index + 1

        sqs_batch_response["batchItemFailures"] = batch_item_failures
        return sqs_batch_response
