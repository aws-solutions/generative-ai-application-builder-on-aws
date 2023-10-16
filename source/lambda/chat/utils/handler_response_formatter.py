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
from typing import Dict

from aws_lambda_powertools import Logger
from utils.constants import TRACE_ID_ENV_VAR

logger = Logger(utc=True)


def format_response(body: dict, extra_headers: Dict[str, str] = {}, status_code: int = 200) -> dict:
    """
    Utility function to correctly format an HTTP response that will be accepted by APIGateway

    Args:
        body (dict): The body which will be stringified in the response
        extra_headers (Dict[str, str], optional): Additional headers to add. Defaults to {}.

    Returns:
        dict: response object that can be accepted by APIGateway lambda proxy
    """
    headers = {
        "Content-Type": "application/json",
    }
    headers.update(extra_headers)
    stringified_body = ""
    try:
        stringified_body = json.dumps(body, skipkeys=True, default=str)
    except TypeError as e:
        logger.error(
            f"Unable to stringify body: {body}. Got error {e}",
            xray_trace_id=os.environ[TRACE_ID_ENV_VAR],
        )

    return {"statusCode": status_code, "headers": headers, "isBase64Encoded": False, "body": stringified_body}
