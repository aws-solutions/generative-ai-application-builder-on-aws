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
from datetime import datetime

import urllib3
from aws_lambda_powertools import Logger, Tracer
from utils.constants import METRICS_ENDPOINT
from utils.data import BuilderMetrics

logger = Logger(utc=True)
tracer = Tracer()

http = urllib3.PoolManager()


@tracer.capture_method
def verify_env_setup():
    """
    This method verifies the mandatory environment variables 'SOLUTION_ID' and 'SOLUTION_VERSION'.
    """
    if os.getenv("SOLUTION_ID") is None:
        err_msg = "SOLUTION_ID Lambda Environment variable not set."
        raise ValueError(err_msg)

    if os.getenv("SOLUTION_VERSION") is None:
        err_msg = "SOLUTION_VERSION Lambda Environment variable not set."
        raise ValueError(err_msg)


@tracer.capture_method
def push_builder_metrics(builder_metrics: BuilderMetrics):
    try:
        headers = {"Content-Type": "application/json"}
        payload = json.dumps(
            {
                "Solution": builder_metrics.solution_id,
                "Version": builder_metrics.version,
                "TimeStamp": datetime.utcnow().isoformat(),
                "Data": builder_metrics.data,
                "UUID": builder_metrics.uuid,
            }
        )
        logger.debug(f"Metrics payload is {payload}")
        http.request(method="POST", url=METRICS_ENDPOINT, headers=headers, body=payload)
    except Exception as ex:
        logger.error(f"Error occurred when making the http request to the metrics endpoint, Error is {ex}")
        raise ex
