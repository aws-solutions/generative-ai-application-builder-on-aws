# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

import json
from typing import Any, Dict

from aws_lambda_powertools import Logger, Tracer
from aws_lambda_powertools.utilities.typing import LambdaContext

from invoker.bedrock_agent_invoker import BedrockAgentInvoker
from utils import EventProcessor, WebSocketHandler, get_metrics_client
from utils.constants import (
    CONNECTION_ID_KEY,
    CONVERSATION_ID_KEY,
    INPUT_TEXT_KEY,
    LAMBDA_REMAINING_TIME_THRESHOLD_MS,
    USER_ID_KEY,
    CloudWatchNamespaces,
)

logger = Logger(utc=True)
tracer = Tracer()
metrics = get_metrics_client(CloudWatchNamespaces.COLD_STARTS)


@tracer.capture_lambda_handler
@metrics.log_metrics(capture_cold_start_metric=True)
def lambda_handler(event: Dict[str, Any], context: LambdaContext) -> Dict:
    records = event["Records"]
    total_records = len(records)
    logger.debug(f"Total records received in the event: {total_records}")

    processed_records = 0
    batch_item_failures = set()  # Use a set to avoid duplicates
    sqs_batch_response = {}

    index = 0
    while index < len(records):
        record = records[index]

        if context.get_remaining_time_in_millis() < LAMBDA_REMAINING_TIME_THRESHOLD_MS:
            batch_item_failures.update(r["messageId"] for r in records[index:])
            break

        processed_event = EventProcessor(record).process()
        connection_id = processed_event[CONNECTION_ID_KEY]
        conversation_id = processed_event[CONVERSATION_ID_KEY]
        input_text = processed_event[INPUT_TEXT_KEY]
        user_id = processed_event[USER_ID_KEY]

        try:
            bedrock_agent_invoker = BedrockAgentInvoker(
                conversation_id=conversation_id, connection_id=connection_id, user_id=user_id
            )

            bedrock_agent_invoker.invoke_agent(input_text=input_text)

            processed_records += 1
            index += 1  # Move to the next record only if successful
        except Exception as ex:
            # Create a WebSocket handler for sending the error
            websocket_handler = WebSocketHandler(connection_id=connection_id, conversation_id=conversation_id)
            websocket_handler.send_error_message(ex)

            # Add current and subsequent records with the same connection_id to failures
            while (
                index < len(records)
                and records[index]["messageAttributes"]["connectionId"]["stringValue"] == connection_id
            ):
                batch_item_failures.add(records[index]["messageId"])
                index += 1

    sqs_batch_response["batchItemFailures"] = [{"itemIdentifier": message_id} for message_id in batch_item_failures]
    logger.debug(
        f"Processed {processed_records} out of {total_records} records. SQS Batch Response: {json.dumps(sqs_batch_response)}"
    )
    return sqs_batch_response
