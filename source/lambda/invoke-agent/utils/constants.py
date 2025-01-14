# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

import os
from enum import Enum

# env variables keys
USE_CASE_UUID_ENV_VAR = "USE_CASE_UUID"
WEBSOCKET_CALLBACK_URL_ENV_VAR = "WEBSOCKET_CALLBACK_URL"
TRACE_ID_ENV_VAR = "_X_AMZN_TRACE_ID"

# metrics
METRICS_SERVICE_NAME = f"GAABUseCase-{os.getenv(USE_CASE_UUID_ENV_VAR)}"

# Event Keys
REQUEST_CONTEXT_KEY = "requestContext"
CONNECTION_ID_KEY = "connectionId"
MESSAGE_KEY = "message"
AUTH_TOKEN_KEY = "authToken"
CONVERSATION_ID_KEY = "conversationId"
INPUT_TEXT_KEY = "inputText"

# chat related constants
END_CONVERSATION_TOKEN = "##END_CONVERSATION##"

# threshold for aborting lambda processing
LAMBA_REMAINING_TIME_THRESHOLD_MS = 20000


class CloudWatchNamespaces(str, Enum):
    """Supported Cloudwatch Namespaces"""

    API_GATEWAY = "AWS/ApiGateway"
    AWS_COGNITO = "AWS/Cognito"
    AWS_BEDROCK_AGENT = "AWS/Bedrock/Agent"
    COLD_STARTS = "Solution/ColdStarts"


# citation location maps
class LocationType(Enum):
    CONFLUENCE = "CONFLUENCE"
    S3 = "S3"
    SALESFORCE = "SALESFORCE"
    SHAREPOINT = "SHAREPOINT"
    WEB = "WEB"


LOCATION_TYPE_MAP = {
    LocationType.CONFLUENCE: "confluenceLocation",
    LocationType.S3: "s3Location",
    LocationType.SALESFORCE: "salesforceLocation",
    LocationType.SHAREPOINT: "sharePointLocation",
    LocationType.WEB: "webLocation",
}

USE_CASE_CONFIG_TABLE_NAME_ENV_VAR = "USE_CASE_CONFIG_TABLE_NAME"
USE_CASE_CONFIG_RECORD_KEY_ENV_VAR = "USE_CASE_CONFIG_RECORD_KEY"
