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

    # Multimodal metrics queries
    multimodal_metrics_queries = [
        (
            f"COUNT({CloudWatchMetrics.FILES_UPLOADED.value})",
            f"""SELECT COUNT({CloudWatchMetrics.FILES_UPLOADED.value}) FROM "{CloudWatchNamespaces.FILE_HANDLING.value}" WHERE UseCaseId = '{USE_CASE_UUID}' AND service = 'FilesManagement'""",
        ),
        (
            f"COUNT({CloudWatchMetrics.FILE_DELETE.value})",
            f"""SELECT COUNT({CloudWatchMetrics.FILE_DELETE.value}) FROM SCHEMA("{CloudWatchNamespaces.FILE_HANDLING.value}", UseCaseId, service) WHERE UseCaseId = '{USE_CASE_UUID}' AND service = 'FilesManagement'""",
        ),
        (
            f"COUNT({CloudWatchMetrics.FILE_DOWNLOAD.value})",
            f"""SELECT COUNT({CloudWatchMetrics.FILE_DOWNLOAD.value}) FROM SCHEMA("{CloudWatchNamespaces.FILE_HANDLING.value}", UseCaseId, service) WHERE UseCaseId = '{USE_CASE_UUID}' AND service = 'FilesManagement'""",
        ),
        (
            f"AVG({CloudWatchMetrics.FILE_SIZE.value})",
            f"""SELECT AVG({CloudWatchMetrics.FILE_SIZE.value}) FROM SCHEMA("{CloudWatchNamespaces.FILE_HANDLING.value}", UseCaseId, service) WHERE UseCaseId = '{USE_CASE_UUID}' AND service = 'FilesManagement'""",
        ),
        # File extensions
        (
            f"COUNT({CloudWatchMetrics.FILES_UPLOADED_WITH_EXTENSION.value}_gif)",
            f"""SELECT COUNT({CloudWatchMetrics.FILES_UPLOADED_WITH_EXTENSION.value}) FROM SCHEMA("{CloudWatchNamespaces.FILE_HANDLING.value}", UseCaseId, service, FileExtension) WHERE UseCaseId = '{USE_CASE_UUID}' AND service = 'FilesManagement' AND FileExtension = 'gif'""",
        ),
        (
            f"COUNT({CloudWatchMetrics.FILES_UPLOADED_WITH_EXTENSION.value}_jpg)",
            f"""SELECT COUNT({CloudWatchMetrics.FILES_UPLOADED_WITH_EXTENSION.value}) FROM SCHEMA("{CloudWatchNamespaces.FILE_HANDLING.value}", UseCaseId, service, FileExtension) WHERE UseCaseId = '{USE_CASE_UUID}' AND service = 'FilesManagement' AND FileExtension = 'jpg'""",
        ),
        (
            f"COUNT({CloudWatchMetrics.FILES_UPLOADED_WITH_EXTENSION.value}_jpeg)",
            f"""SELECT COUNT({CloudWatchMetrics.FILES_UPLOADED_WITH_EXTENSION.value}) FROM SCHEMA("{CloudWatchNamespaces.FILE_HANDLING.value}", UseCaseId, service, FileExtension) WHERE UseCaseId = '{USE_CASE_UUID}' AND service = 'FilesManagement' AND FileExtension = 'jpeg'""",
        ),
        (
            f"COUNT({CloudWatchMetrics.FILES_UPLOADED_WITH_EXTENSION.value}_png)",
            f"""SELECT COUNT({CloudWatchMetrics.FILES_UPLOADED_WITH_EXTENSION.value}) FROM SCHEMA("{CloudWatchNamespaces.FILE_HANDLING.value}", UseCaseId, service, FileExtension) WHERE UseCaseId = '{USE_CASE_UUID}' AND service = 'FilesManagement' AND FileExtension = 'png'""",
        ),
        (
            f"COUNT({CloudWatchMetrics.FILES_UPLOADED_WITH_EXTENSION.value}_webp)",
            f"""SELECT COUNT({CloudWatchMetrics.FILES_UPLOADED_WITH_EXTENSION.value}) FROM SCHEMA("{CloudWatchNamespaces.FILE_HANDLING.value}", UseCaseId, service, FileExtension) WHERE UseCaseId = '{USE_CASE_UUID}' AND service = 'FilesManagement' AND FileExtension = 'webp'""",
        ),
        (
            f"COUNT({CloudWatchMetrics.FILES_UPLOADED_WITH_EXTENSION.value}_pdf)",
            f"""SELECT COUNT({CloudWatchMetrics.FILES_UPLOADED_WITH_EXTENSION.value}) FROM SCHEMA("{CloudWatchNamespaces.FILE_HANDLING.value}", UseCaseId, service, FileExtension) WHERE UseCaseId = '{USE_CASE_UUID}' AND service = 'FilesManagement' AND FileExtension = 'pdf'""",
        ),
        (
            f"COUNT({CloudWatchMetrics.FILES_UPLOADED_WITH_EXTENSION.value}_csv)",
            f"""SELECT COUNT({CloudWatchMetrics.FILES_UPLOADED_WITH_EXTENSION.value}) FROM SCHEMA("{CloudWatchNamespaces.FILE_HANDLING.value}", UseCaseId, service, FileExtension) WHERE UseCaseId = '{USE_CASE_UUID}' AND service = 'FilesManagement' AND FileExtension = 'csv'""",
        ),
        (
            f"COUNT({CloudWatchMetrics.FILES_UPLOADED_WITH_EXTENSION.value}_doc)",
            f"""SELECT COUNT({CloudWatchMetrics.FILES_UPLOADED_WITH_EXTENSION.value}) FROM SCHEMA("{CloudWatchNamespaces.FILE_HANDLING.value}", UseCaseId, service, FileExtension) WHERE UseCaseId = '{USE_CASE_UUID}' AND service = 'FilesManagement' AND FileExtension = 'doc'""",
        ),
        (
            f"COUNT({CloudWatchMetrics.FILES_UPLOADED_WITH_EXTENSION.value}_docx)",
            f"""SELECT COUNT({CloudWatchMetrics.FILES_UPLOADED_WITH_EXTENSION.value}) FROM SCHEMA("{CloudWatchNamespaces.FILE_HANDLING.value}", UseCaseId, service, FileExtension) WHERE UseCaseId = '{USE_CASE_UUID}' AND service = 'FilesManagement' AND FileExtension = 'docx'""",
        ),
        (
            f"COUNT({CloudWatchMetrics.FILES_UPLOADED_WITH_EXTENSION.value}_xls)",
            f"""SELECT COUNT({CloudWatchMetrics.FILES_UPLOADED_WITH_EXTENSION.value}) FROM SCHEMA("{CloudWatchNamespaces.FILE_HANDLING.value}", UseCaseId, service, FileExtension) WHERE UseCaseId = '{USE_CASE_UUID}' AND service = 'FilesManagement' AND FileExtension = 'xls'""",
        ),
        (
            f"COUNT({CloudWatchMetrics.FILES_UPLOADED_WITH_EXTENSION.value}_xlsx)",
            f"""SELECT COUNT({CloudWatchMetrics.FILES_UPLOADED_WITH_EXTENSION.value}) FROM SCHEMA("{CloudWatchNamespaces.FILE_HANDLING.value}", UseCaseId, service, FileExtension) WHERE UseCaseId = '{USE_CASE_UUID}' AND service = 'FilesManagement' AND FileExtension = 'xlsx'""",
        ),
        (
            f"COUNT({CloudWatchMetrics.FILES_UPLOADED_WITH_EXTENSION.value}_html)",
            f"""SELECT COUNT({CloudWatchMetrics.FILES_UPLOADED_WITH_EXTENSION.value}) FROM SCHEMA("{CloudWatchNamespaces.FILE_HANDLING.value}", UseCaseId, service, FileExtension) WHERE UseCaseId = '{USE_CASE_UUID}' AND service = 'FilesManagement' AND FileExtension = 'html'""",
        ),
        (
            f"COUNT({CloudWatchMetrics.FILES_UPLOADED_WITH_EXTENSION.value}_txt)",
            f"""SELECT COUNT({CloudWatchMetrics.FILES_UPLOADED_WITH_EXTENSION.value}) FROM SCHEMA("{CloudWatchNamespaces.FILE_HANDLING.value}", UseCaseId, service, FileExtension) WHERE UseCaseId = '{USE_CASE_UUID}' AND service = 'FilesManagement' AND FileExtension = 'txt'""",
        ),
        (
            f"COUNT({CloudWatchMetrics.FILES_UPLOADED_WITH_EXTENSION.value}_md)",
            f"""SELECT COUNT({CloudWatchMetrics.FILES_UPLOADED_WITH_EXTENSION.value}) FROM SCHEMA("{CloudWatchNamespaces.FILE_HANDLING.value}", UseCaseId, service, FileExtension) WHERE UseCaseId = '{USE_CASE_UUID}' AND service = 'FilesManagement' AND FileExtension = 'md'""",
        ),
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
    queries += multimodal_metrics_queries if USE_CASE_UUID else []

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
