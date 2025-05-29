#!/usr/bin/env python
# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

import datetime
import os
from datetime import datetime, timedelta

from helper import get_session

from utils.constants import (
    CLIENT_ID_ENV_VAR,
    PUBLISH_METRICS_PERIOD_IN_SECONDS,
    USE_CASE_UUID_ENV_VAR,
    USER_POOL_ID_ENV_VAR,
    WEBSOCKET_API_ID_ENV_VAR,
    CloudWatchMetrics,
    CloudWatchNamespaces,
)


def get_cloudwatch_metrics_queries():
    USE_CASE_UUID = os.getenv(USE_CASE_UUID_ENV_VAR)
    if USE_CASE_UUID:
        METRICS_SERVICE_NAME = f"GAABUseCase-{USE_CASE_UUID.split('-')[0]}"
    else:
        METRICS_SERVICE_NAME = None
    WEBSOCKET_API_NAME = os.getenv(WEBSOCKET_API_ID_ENV_VAR)
    USER_POOL_ID = os.getenv(USER_POOL_ID_ENV_VAR)
    USER_CLIENT_ID = os.getenv(CLIENT_ID_ENV_VAR)
    FEEDBACK_ENABLED = True if os.getenv("FEEDBACK_ENABLED", "No") == "Yes" else False

    langchain_metrics_queries = [
        (
            f"COUNT({CloudWatchMetrics.LANGCHAIN_FAILURES.value})",
            f"""SELECT COUNT({CloudWatchMetrics.LANGCHAIN_FAILURES.value}) FROM SCHEMA("{CloudWatchNamespaces.LANGCHAIN_LLM.value}", service) WHERE service = '{METRICS_SERVICE_NAME}'""",
        ),
        (
            f"COUNT({CloudWatchMetrics.LANGCHAIN_QUERY.value})",
            f"""SELECT COUNT({CloudWatchMetrics.LANGCHAIN_QUERY.value}) FROM SCHEMA("{CloudWatchNamespaces.LANGCHAIN_LLM.value}", service) WHERE service = '{METRICS_SERVICE_NAME}'""",
        ),
    ]

    kendra_metrics_queries = [
        (
            f"MAX({CloudWatchMetrics.KENDRA_FAILURES.value})",
            f"""SELECT MAX({CloudWatchMetrics.KENDRA_FAILURES.value}) FROM SCHEMA("{CloudWatchNamespaces.AWS_KENDRA.value}", service) WHERE service = '{METRICS_SERVICE_NAME}'""",
        ),
        (
            f"AVG({CloudWatchMetrics.KENDRA_FAILURES.value})",
            f"""SELECT AVG({CloudWatchMetrics.KENDRA_FAILURES.value}) FROM SCHEMA("{CloudWatchNamespaces.AWS_KENDRA.value}", service) WHERE service = '{METRICS_SERVICE_NAME}'""",
        ),
        (
            f"COUNT({CloudWatchMetrics.KENDRA_QUERY.value})",
            f"""SELECT COUNT({CloudWatchMetrics.KENDRA_QUERY.value}) FROM SCHEMA("{CloudWatchNamespaces.AWS_KENDRA.value}", service) WHERE service = '{METRICS_SERVICE_NAME}'""",
        ),
    ]

    websocket_metrics_queries = [
        (
            f"COUNT({CloudWatchMetrics.WEBSOCKET_MESSAGES.value})",
            f"""SELECT COUNT({CloudWatchMetrics.WEBSOCKET_MESSAGES.value}) FROM SCHEMA("{CloudWatchNamespaces.API_GATEWAY.value}", ApiId) WHERE ApiId = '{WEBSOCKET_API_NAME}'""",
        ),
    ]

    cognito_usecase_metrics_queries = [
        (
            f"COUNT({CloudWatchMetrics.COGNITO_SIGN_UP_SUCCESSES.value})",
            f"""SELECT COUNT({CloudWatchMetrics.COGNITO_SIGN_UP_SUCCESSES.value}) FROM SCHEMA("AWS/Cognito", UserPool,UserPoolClient) WHERE UserPool = '{USER_POOL_ID}' AND UserPoolClient = '{USER_CLIENT_ID}'""",
        ),
        (
            f"AVG({CloudWatchMetrics.COGNITO_SIGN_UP_SUCCESSES.value})",
            f"""SELECT AVG({CloudWatchMetrics.COGNITO_SIGN_UP_SUCCESSES.value}) FROM SCHEMA("AWS/Cognito", UserPool,UserPoolClient) WHERE UserPool = '{USER_POOL_ID}' AND UserPoolClient = '{USER_CLIENT_ID}'""",
        ),
    ]

    cognito_admin_metrics_queries = [
        (
            f"COUNT({CloudWatchMetrics.COGNITO_SIGN_UP_SUCCESSES.value})",
            f"""SELECT COUNT({CloudWatchMetrics.COGNITO_SIGN_UP_SUCCESSES.value}) FROM SCHEMA("AWS/Cognito", UserPool,UserPoolClient) WHERE UserPool = '{USER_POOL_ID}' AND UserPoolClient = 'Admin'""",
        ),
        (
            f"AVG({CloudWatchMetrics.COGNITO_SIGN_UP_SUCCESSES.value})",
            f"""SELECT AVG({CloudWatchMetrics.COGNITO_SIGN_UP_SUCCESSES.value}) FROM SCHEMA("AWS/Cognito", UserPool,UserPoolClient) WHERE UserPool = '{USER_POOL_ID}' AND UserPoolClient = 'Admin'""",
        ),
    ]

    bedrock_metrics_queries = [
        (
            f"SUM({CloudWatchMetrics.LLM_INPUT_TOKEN_COUNT.value})",
            f"""SELECT SUM({CloudWatchMetrics.LLM_INPUT_TOKEN_COUNT.value}) FROM SCHEMA("{CloudWatchNamespaces.AWS_BEDROCK.value}", service) WHERE service = '{METRICS_SERVICE_NAME}'""",
        ),
        (
            f"SUM({CloudWatchMetrics.LLM_OUTPUT_TOKEN_COUNT.value})",
            f"""SELECT SUM({CloudWatchMetrics.LLM_OUTPUT_TOKEN_COUNT.value}) FROM SCHEMA("{CloudWatchNamespaces.AWS_BEDROCK.value}", service) WHERE service = '{METRICS_SERVICE_NAME}'""",
        ),
    ]

    feedback_metrics_queries = [
        (
            CloudWatchMetrics.FEEDBACK_SUBMITTED_COUNT.value,
            f"""SELECT COUNT({CloudWatchMetrics.FEEDBACK_SUBMITTED_COUNT.value}) FROM "Solution/FeedbackManagement" WHERE UseCaseId = '{USE_CASE_UUID}'""",
        )
    ]

    queries = []
    formatted_queries = []
    queries += langchain_metrics_queries if METRICS_SERVICE_NAME else []
    queries += kendra_metrics_queries if METRICS_SERVICE_NAME else []
    queries += websocket_metrics_queries if WEBSOCKET_API_NAME else []
    queries += cognito_admin_metrics_queries if USER_POOL_ID else []
    queries += cognito_usecase_metrics_queries if USER_POOL_ID and USER_CLIENT_ID else []
    queries += bedrock_metrics_queries if METRICS_SERVICE_NAME else []
    queries += feedback_metrics_queries if FEEDBACK_ENABLED and USE_CASE_UUID else []

    for query_label_pair in queries:
        formatted_queries.append(
            [
                {
                    "Id": query_label_pair[0].replace(")", "").replace("(", "").lower(),
                    "Expression": query_label_pair[1],
                    "Period": PUBLISH_METRICS_PERIOD_IN_SECONDS,
                    "Label": query_label_pair[0],
                }
            ]
        )
    return formatted_queries


def get_metrics_payload(time_period_in_seconds):
    metric_data_queries = get_cloudwatch_metrics_queries()

    # fetch for (T-1) hours as CW metrics can be slow to trickle in
    today = datetime.today().replace(minute=0, second=0, microsecond=0) - timedelta(hours=1)
    start_timestamp = datetime.timestamp(today - timedelta(seconds=time_period_in_seconds))
    end_timestamp = datetime.timestamp(today)

    cloudwatch_client = get_session().client("cloudwatch")
    metric_data = {}

    # fmt: off
    for query in metric_data_queries:
        cloudwatch_response = cloudwatch_client.get_metric_data(
            MetricDataQueries=query,
            StartTime=start_timestamp,
            EndTime=end_timestamp,
        )["MetricDataResults"][0]
        metric_data[cloudwatch_response["Id"]] = cloudwatch_response["Values"][0] if cloudwatch_response["Values"] else 0
    # fmt: on

    return metric_data
