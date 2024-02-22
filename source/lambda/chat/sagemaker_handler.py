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

from aws_lambda_powertools import Logger, Tracer
from aws_lambda_powertools.utilities.typing import LambdaContext
from clients.sagemaker_client import SageMakerClient
from shared.callbacks.websocket_error_handler import WebsocketErrorHandler
from shared.callbacks.websocket_handler import WebsocketHandler
from utils.constants import (
    DEFAULT_RAG_ENABLED_MODE,
    END_CONVERSATION_TOKEN,
    RAG_ENABLED_ENV_VAR,
    TRACE_ID_ENV_VAR,
    USER_ID_EVENT_KEY,
)
from utils.enum_types import CloudWatchNamespaces
from utils.helpers import format_lambda_response, get_metrics_client

logger = Logger(utc=True)
tracer = Tracer()
metrics = get_metrics_client(CloudWatchNamespaces.COLD_STARTS)


@tracer.capture_lambda_handler
@metrics.log_metrics(capture_cold_start_metric=True)
def lambda_handler(event: Dict[str, Any], context: LambdaContext) -> Dict:
    """Create a SageMaker RAG or non-RAG LLM object based on the configuration in `event` and
    admin configuration and use it to answer user questions
    :param event (Dict): AWS Lambda Event
    :param context (LambdaContext): AWS Lambda Context
    :return: the generated response from the chatbot
    """
    try:
        sagemaker_client = SageMakerClient(
            connection_id=event["requestContext"]["connectionId"],
            rag_enabled=os.getenv(RAG_ENABLED_ENV_VAR, DEFAULT_RAG_ENABLED_MODE),
        )
        sagemaker_client.check_env()
        event_body = sagemaker_client.check_event(event)
        sagemaker_chat = sagemaker_client.get_model(
            event_body, event["requestContext"]["authorizer"][USER_ID_EVENT_KEY]
        )

        source_docs_formatter = (
            sagemaker_client.builder.knowledge_base.source_docs_formatter
            if sagemaker_client.builder.knowledge_base
            else None
        )

        ai_response = sagemaker_chat.generate(event_body["question"])

        socket_handler = WebsocketHandler(
            connection_id=event["requestContext"]["connectionId"],
            conversation_id=sagemaker_client.builder.conversation_id,
            source_docs_formatter=source_docs_formatter,
        )
        if not sagemaker_client.builder.is_streaming:
            socket_handler.post_response_to_connection(ai_response)
        socket_handler.post_token_to_connection(END_CONVERSATION_TOKEN)
        return format_lambda_response({"response": ai_response})
    except Exception as ex:
        tracer_id = os.getenv(TRACE_ID_ENV_VAR)
        chat_error = f"Chat service failed to respond. Please contact your administrator for support and quote the following trace id: {tracer_id}"
        logger.error(f"An exception occurred in the processing of SageMaker chat: {ex}", xray_trace_id=tracer_id)
        error_handler = WebsocketErrorHandler(connection_id=event["requestContext"]["connectionId"], trace_id=tracer_id)
        error_handler.post_token_to_connection(chat_error)
        return format_lambda_response(
            {"errorMessage": chat_error},
            {},
            400,
        )
