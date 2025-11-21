# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

import os
from enum import Enum

USE_CASE_UUID_ENV_VAR = "USE_CASE_UUID"
WEBSOCKET_CALLBACK_URL_ENV_VAR = "WEBSOCKET_CALLBACK_URL"
TRACE_ID_ENV_VAR = "_X_AMZN_TRACE_ID"
AGENT_RUNTIME_ARN_ENV_VAR = "AGENT_RUNTIME_ARN"

USE_CASE_UUID_SHORT = os.getenv(USE_CASE_UUID_ENV_VAR).split('-')[0]
METRICS_SERVICE_NAME = f"GAABUseCase-{USE_CASE_UUID_SHORT}"

REQUEST_CONTEXT_KEY = "requestContext"
CONNECTION_ID_KEY = "connectionId"
MESSAGE_KEY = "message"
AUTH_TOKEN_KEY = "authToken"
CONVERSATION_ID_KEY = "conversationId"
INPUT_TEXT_KEY = "inputText"
USER_ID_KEY = "userId"
MESSAGE_ID_KEY = "messageId"
FILES_KEY = "files"

END_CONVERSATION_TOKEN = "##END_CONVERSATION##"
KEEP_ALIVE_TOKEN = "##KEEP_ALIVE##"
PROCESSING_TOKEN = "##PROCESSING##"

LAMBDA_REMAINING_TIME_THRESHOLD_MS = 20000
KEEP_ALIVE_INTERVAL_SECONDS = 30
PROCESSING_UPDATE_INTERVAL_SECONDS = 10
MAX_STREAMING_DURATION_SECONDS = 300

AGENTCORE_REQUIRED_ENV_VARS = [
    USE_CASE_UUID_ENV_VAR,
    WEBSOCKET_CALLBACK_URL_ENV_VAR,
    TRACE_ID_ENV_VAR,
    AGENT_RUNTIME_ARN_ENV_VAR,
]


class CloudWatchNamespaces(str, Enum):
    """Supported CloudWatch Namespaces"""

    API_GATEWAY = "AWS/ApiGateway"
    AWS_COGNITO = "AWS/Cognito"
    AWS_BEDROCK_AGENT = "AWS/Bedrock/Agent"
    COLD_STARTS = "Solution/ColdStarts"
    AGENTCORE_INVOCATION = "Solution/AgentCoreInvocation"
    AWS_BEDROCK = "AWS/Bedrock"


class CloudWatchMetrics(str, Enum):
    """Supported Cloudwatch Metrics"""

    LLM_INPUT_TOKEN_COUNT = "InputTokenCount"
    LLM_OUTPUT_TOKEN_COUNT = "OutputTokenCount"
    LLM_TOTAL_TOKEN_COUNT = "TotalTokenCount"
