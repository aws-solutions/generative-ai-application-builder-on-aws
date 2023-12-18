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
from typing import Any, Dict

from aws_lambda_powertools import Logger, Metrics, Tracer
from aws_lambda_powertools.utilities.typing import LambdaContext
from clients.huggingface_client import HuggingFaceClient
from shared.callbacks.websocket_error_handler import WebsocketErrorHandler
from shared.callbacks.websocket_handler import WebsocketHandler
from utils.constants import (
    DEFAULT_HUGGINGFACE_RAG_ENABLED_MODE,
    RAG_ENABLED_ENV_VAR,
    TRACE_ID_ENV_VAR,
    USER_ID_EVENT_KEY,
)
from utils.enum_types import CloudWatchNamespaces
from utils.handler_response_formatter import format_response

logger = Logger(utc=True)
metrics = Metrics(namespace=CloudWatchNamespaces.COLD_STARTS.value)
tracer = Tracer()


@tracer.capture_lambda_handler
@metrics.log_metrics(capture_cold_start_metric=True)
def lambda_handler(event: Dict[str, Any], context: LambdaContext) -> Dict:
    """Create a HuggingFaceLLM object based on the configuration in `event` and admin configuration
    :param event (Dict): AWS Lambda Event
    :param context (LambdaContext): AWS Lambda Context
    :return: the generated response from the chatbot
    """

    try:
        huggingface_client = HuggingFaceClient(
            connection_id=event["requestContext"]["connectionId"],
            rag_enabled=os.getenv(RAG_ENABLED_ENV_VAR, DEFAULT_HUGGINGFACE_RAG_ENABLED_MODE),
        )
        huggingface_client.check_env()
        event_body = huggingface_client.check_event(event)
        huggingface_chat = huggingface_client.get_model(
            event_body, event["requestContext"]["authorizer"][USER_ID_EVENT_KEY]
        )
        ai_response = huggingface_chat.generate(event_body["question"])

        socket_handler = WebsocketHandler(
            connection_id=event["requestContext"]["connectionId"],
            conversation_id=huggingface_client.builder.conversation_id,
        )
        socket_handler.post_token_to_connection(ai_response["answer"])

        logger.debug(f"LLM response {ai_response}")
        return format_response({"response": ai_response})

    except Exception as ex:
        tracer_id = os.getenv(TRACE_ID_ENV_VAR)
        logger.error(f"An exception occurred in the processing of HF chat: {ex}", xray_trace_id=tracer_id)
        error_handler = WebsocketErrorHandler(connection_id=event["requestContext"]["connectionId"], trace_id=tracer_id)
        error_handler.post_token_to_connection(
            f"Chat service failed to respond. Please contact your administrator for support and quote the following trace id: {tracer_id}"
        )
        return format_response(
            {
                "errorMessage": f"Chat service failed to respond. Please contact your administrator for support and quote the following trace id: {tracer_id}"
            },
            {},
            400,
        )
