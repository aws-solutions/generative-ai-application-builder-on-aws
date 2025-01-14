#!/usr/bin/env python
# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

from typing import Any, Dict

from aws_lambda_powertools import Logger, Tracer
from aws_lambda_powertools.utilities.typing import LambdaContext
from clients.bedrock_client import BedrockClient
from handlers.use_case_handler import UseCaseHandler
from utils.enum_types import CloudWatchNamespaces
from utils.helpers import get_metrics_client

logger = Logger(utc=True)
tracer = Tracer()
metrics = get_metrics_client(CloudWatchNamespaces.COLD_STARTS)


@tracer.capture_lambda_handler
@metrics.log_metrics(capture_cold_start_metric=True)
def lambda_handler(event: Dict[str, Any], context: LambdaContext) -> Dict:
    """Create a Bedrock RAG or non-RAG LLM object based on the configuration in `event` and
    admin configuration and use it to answer user questions
    :param event (Dict): AWS Lambda Event
    :param context (LambdaContext): AWS Lambda Context
    :return: the generated response from the chatbot
    """
    handler = UseCaseHandler(BedrockClient)
    return handler.handle_event(event, context)
