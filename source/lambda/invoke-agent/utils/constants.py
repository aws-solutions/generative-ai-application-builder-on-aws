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
