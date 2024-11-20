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
from typing import Any, Dict

from aws_lambda_powertools import Logger, Tracer
from aws_lambda_powertools.utilities.typing import LambdaContext
from invoker.bedrock_agent_invoker import BedrockAgentInvoker
from utils import EventProcessor, WebSocketHandler, get_metrics_client
from utils.constants import (
    CONNECTION_ID_KEY,
    CONVERSATION_ID_KEY,
    INPUT_TEXT_KEY,
    LAMBA_REMAINING_TIME_THRESHOLD_MS,
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

    websocket_handler: WebSocketHandler = None

    index = 0
    while index < len(records):
        record = records[index]

        if context.get_remaining_time_in_millis() < LAMBA_REMAINING_TIME_THRESHOLD_MS:
            batch_item_failures.update(r["messageId"] for r in records[index:])
            break

        processed_event = EventProcessor(record).process()
        connection_id = processed_event[CONNECTION_ID_KEY]
        conversation_id = processed_event[CONVERSATION_ID_KEY]
        input_text = processed_event[INPUT_TEXT_KEY]

        if websocket_handler is None or websocket_handler.connection_id != connection_id:
            websocket_handler = WebSocketHandler(connection_id=connection_id, conversation_id=conversation_id)

        try:
            bedrock_agent_invoker = BedrockAgentInvoker(conversation_id=conversation_id)
            response = bedrock_agent_invoker.invoke_agent(input_text=input_text)

            # only send the output_text to the client
            websocket_handler.send_message(response.get("output_text", ""))

            processed_records += 1
            index += 1  # Move to the next record only if successful
        except Exception as ex:
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
