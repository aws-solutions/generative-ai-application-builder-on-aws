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

import datetime
import os
from datetime import datetime, timedelta

from helper import get_service_client
from utils.constants import (
    CLIENT_ID_ENV_VAR,
    KENDRA_INDEX_ID_ENV_VAR,
    PUBLISH_METRICS_HOURS,
    REST_API_NAME_ENV_VAR,
    USE_CASE_UUID_ENV_VAR,
    USER_POOL_ID_ENV_VAR,
    WEBSOCKET_API_ID_ENV_VAR,
    CloudWatchMetrics,
    CloudWatchNamespaces,
)


def get_cloudwatch_metrics_queries():
    USE_CASE_UUID = os.getenv(USE_CASE_UUID_ENV_VAR)
    if USE_CASE_UUID:
        METRICS_SERVICE_NAME = f"GAABUseCase-{USE_CASE_UUID}"
    else:
        METRICS_SERVICE_NAME = None
    KENDRA_INDEX_ID = os.getenv(KENDRA_INDEX_ID_ENV_VAR)
    WEBSOCKET_API_NAME = os.getenv(WEBSOCKET_API_ID_ENV_VAR)
    USER_POOL_ID = os.getenv(USER_POOL_ID_ENV_VAR)
    USER_CLIENT_ID = os.getenv(CLIENT_ID_ENV_VAR)
    USE_CASE_MANAGEMENT_SERVICE = "UseCaseManagement"
    REST_API_NAME = os.getenv(REST_API_NAME_ENV_VAR)

    usecase_metrics_queries = [
        (
            f"COUNT({CloudWatchMetrics.UC_INITIATION_SUCCESS.value})",
            f"""SELECT COUNT({CloudWatchMetrics.UC_INITIATION_SUCCESS.value}) FROM SCHEMA("{CloudWatchNamespaces.USE_CASE_DEPLOYMENTS.value}", service) WHERE service = '{USE_CASE_MANAGEMENT_SERVICE}'""",
        ),
        (
            f"COUNT({CloudWatchMetrics.UC_INITIATION_FAILURE.value})",
            f"""SELECT COUNT({CloudWatchMetrics.UC_INITIATION_FAILURE.value}) FROM SCHEMA("{CloudWatchNamespaces.USE_CASE_DEPLOYMENTS.value}", service) WHERE service = '{USE_CASE_MANAGEMENT_SERVICE}'""",
        ),
        (
            f"COUNT({CloudWatchMetrics.UC_UPDATE_SUCCESS.value})",
            f"""SELECT COUNT({CloudWatchMetrics.UC_UPDATE_SUCCESS.value}) FROM SCHEMA("{CloudWatchNamespaces.USE_CASE_DEPLOYMENTS.value}", service) WHERE service = '{USE_CASE_MANAGEMENT_SERVICE}'""",
        ),
        (
            f"COUNT({CloudWatchMetrics.UC_UPDATE_FAILURE.value})",
            f"""SELECT COUNT({CloudWatchMetrics.UC_UPDATE_FAILURE.value}) FROM SCHEMA("{CloudWatchNamespaces.USE_CASE_DEPLOYMENTS.value}", service) WHERE service = '{USE_CASE_MANAGEMENT_SERVICE}'""",
        ),
        (
            f"COUNT({CloudWatchMetrics.UC_DELETION_SUCCESS.value})",
            f"""SELECT COUNT({CloudWatchMetrics.UC_DELETION_SUCCESS.value}) FROM SCHEMA("{CloudWatchNamespaces.USE_CASE_DEPLOYMENTS.value}", service) WHERE service = '{USE_CASE_MANAGEMENT_SERVICE}'""",
        ),
        (
            f"COUNT({CloudWatchMetrics.UC_DELETION_FAILURE.value})",
            f"""SELECT COUNT({CloudWatchMetrics.UC_DELETION_FAILURE.value}) FROM SCHEMA("{CloudWatchNamespaces.USE_CASE_DEPLOYMENTS.value}", service) WHERE service = '{USE_CASE_MANAGEMENT_SERVICE}'""",
        ),
        (
            f"COUNT({CloudWatchMetrics.UC_DESCRIBE_SUCCESS.value})",
            f"""SELECT COUNT({CloudWatchMetrics.UC_DESCRIBE_SUCCESS.value}) FROM SCHEMA("{CloudWatchNamespaces.USE_CASE_DEPLOYMENTS.value}", service) WHERE service = '{USE_CASE_MANAGEMENT_SERVICE}'""",
        ),
        (
            f"COUNT({CloudWatchMetrics.UC_DESCRIBE_FAILURE.value})",
            f"""SELECT COUNT({CloudWatchMetrics.UC_DESCRIBE_FAILURE.value}) FROM SCHEMA("{CloudWatchNamespaces.USE_CASE_DEPLOYMENTS.value}", service) WHERE service = '{USE_CASE_MANAGEMENT_SERVICE}'""",
        ),
    ]

    langchain_metrics_queries = [
        (
            f"AVG({CloudWatchMetrics.LANGCHAIN_QUERY_PROCESSING_TIME.value})",
            f"""SELECT AVG({CloudWatchMetrics.LANGCHAIN_QUERY_PROCESSING_TIME.value}) FROM SCHEMA("{CloudWatchNamespaces.LANGCHAIN_LLM.value}", service) WHERE service = '{METRICS_SERVICE_NAME}'""",
        ),
        (
            f"COUNT({CloudWatchMetrics.INCORRECT_INPUT_FAILURES.value})",
            f"""SELECT COUNT({CloudWatchMetrics.INCORRECT_INPUT_FAILURES.value}) FROM SCHEMA("{CloudWatchNamespaces.LANGCHAIN_LLM.value}", service) WHERE service = '{METRICS_SERVICE_NAME}'""",
        ),
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
            f"""SELECT MAX({CloudWatchMetrics.KENDRA_FAILURES.value}) FROM SCHEMA("{CloudWatchNamespaces.AWS_KENDRA.value}", IndexId) WHERE IndexId = '{KENDRA_INDEX_ID}'""",
        ),
        (
            f"AVG({CloudWatchMetrics.KENDRA_FAILURES.value})",
            f"""SELECT AVG({CloudWatchMetrics.KENDRA_FAILURES.value}) FROM SCHEMA("{CloudWatchNamespaces.AWS_KENDRA.value}", IndexId) WHERE IndexId = '{KENDRA_INDEX_ID}'""",
        ),
        (
            f"COUNT({CloudWatchMetrics.KENDRA_QUERY.value})",
            f"""SELECT COUNT({CloudWatchMetrics.KENDRA_QUERY.value}) FROM SCHEMA("{CloudWatchNamespaces.AWS_KENDRA.value}", IndexId) WHERE IndexId = '{KENDRA_INDEX_ID}'""",
        ),
        (
            f"COUNT({CloudWatchMetrics.KENDRA_FETCHED_DOCUMENTS.value})",
            f"""SELECT COUNT({CloudWatchMetrics.KENDRA_FETCHED_DOCUMENTS.value}) FROM SCHEMA("{CloudWatchNamespaces.AWS_KENDRA.value}", IndexId) WHERE IndexId = '{KENDRA_INDEX_ID}'""",
        ),
        (
            f"AVG({CloudWatchMetrics.KENDRA_FETCHED_DOCUMENTS.value})",
            f"""SELECT AVG({CloudWatchMetrics.KENDRA_FETCHED_DOCUMENTS.value}) FROM SCHEMA("{CloudWatchNamespaces.AWS_KENDRA.value}", IndexId) WHERE IndexId = '{KENDRA_INDEX_ID}'""",
        ),
        (
            f"COUNT({CloudWatchMetrics.KENDRA_NO_HITS.value})",
            f"""SELECT COUNT({CloudWatchMetrics.KENDRA_NO_HITS.value}) FROM SCHEMA("{CloudWatchNamespaces.AWS_KENDRA.value}", IndexId) WHERE IndexId = '{KENDRA_INDEX_ID}'""",
        ),
        (
            f"AVG({CloudWatchMetrics.KENDRA_NO_HITS.value})",
            f"""SELECT AVG({CloudWatchMetrics.KENDRA_NO_HITS.value}) FROM SCHEMA("{CloudWatchNamespaces.AWS_KENDRA.value}", IndexId) WHERE IndexId = '{KENDRA_INDEX_ID}'""",
        ),
        (
            f"MAX({CloudWatchMetrics.KENDRA_QUERY_PROCESSING_TIME.value})",
            f"""SELECT MAX({CloudWatchMetrics.KENDRA_QUERY_PROCESSING_TIME.value}) FROM SCHEMA("{CloudWatchNamespaces.AWS_KENDRA.value}", IndexId) WHERE IndexId = '{KENDRA_INDEX_ID}'""",
        ),
        (
            f"MAX({CloudWatchMetrics.KENDRA_QUERY_PROCESSING_TIME.value})",
            f"""SELECT AVG({CloudWatchMetrics.KENDRA_QUERY_PROCESSING_TIME.value}) FROM SCHEMA("{CloudWatchNamespaces.AWS_KENDRA.value}", IndexId) WHERE IndexId = '{KENDRA_INDEX_ID}'""",
        ),
    ]

    websocket_metrics_queries = [
        (
            f"COUNT({CloudWatchMetrics.WEBSOCKET_CONNECTS.value})",
            f"""SELECT COUNT({CloudWatchMetrics.WEBSOCKET_CONNECTS.value}) FROM SCHEMA("{CloudWatchNamespaces.API_GATEWAY.value}", ApiId) WHERE ApiId = '{WEBSOCKET_API_NAME}'""",
        ),
        (
            f"COUNT({CloudWatchMetrics.WEBSOCKET_MESSAGES.value})",
            f"""SELECT COUNT({CloudWatchMetrics.WEBSOCKET_MESSAGES.value}) FROM SCHEMA("{CloudWatchNamespaces.API_GATEWAY.value}", ApiId) WHERE ApiId = '{WEBSOCKET_API_NAME}'""",
        ),
        (
            f"COUNT({CloudWatchMetrics.WEBSOCKET_CLIENT_ERRORS.value})",
            f"""SELECT COUNT({CloudWatchMetrics.WEBSOCKET_CLIENT_ERRORS.value}) FROM SCHEMA("{CloudWatchNamespaces.API_GATEWAY.value}", ApiId) WHERE ApiId = '{WEBSOCKET_API_NAME}'""",
        ),
        (
            f"MAX({CloudWatchMetrics.WEBSOCKET_CLIENT_ERRORS.value})",
            f"""SELECT MAX({CloudWatchMetrics.WEBSOCKET_CLIENT_ERRORS.value}) FROM SCHEMA("{CloudWatchNamespaces.API_GATEWAY.value}", ApiId) WHERE ApiId = '{WEBSOCKET_API_NAME}'""",
        ),
        (
            f"AVG({CloudWatchMetrics.WEBSOCKET_CLIENT_ERRORS.value})",
            f"""SELECT AVG({CloudWatchMetrics.WEBSOCKET_CLIENT_ERRORS.value}) FROM SCHEMA("{CloudWatchNamespaces.API_GATEWAY.value}", ApiId) WHERE ApiId = '{WEBSOCKET_API_NAME}'""",
        ),
        (
            f"AVG({CloudWatchMetrics.WEBSOCKET_EXECUTION_ERRORS.value})",
            f"""SELECT AVG({CloudWatchMetrics.WEBSOCKET_EXECUTION_ERRORS.value}) FROM SCHEMA("{CloudWatchNamespaces.API_GATEWAY.value}", ApiId) WHERE ApiId = '{WEBSOCKET_API_NAME}'""",
        ),
        (
            f"MAX({CloudWatchMetrics.WEBSOCKET_EXECUTION_ERRORS.value})",
            f"""SELECT MAX({CloudWatchMetrics.WEBSOCKET_EXECUTION_ERRORS.value}) FROM SCHEMA("{CloudWatchNamespaces.API_GATEWAY.value}", ApiId) WHERE ApiId = '{WEBSOCKET_API_NAME}'""",
        ),
        (
            f"MAX({CloudWatchMetrics.WEBSOCKET_LATENCY.value})",
            f"""SELECT MAX({CloudWatchMetrics.WEBSOCKET_LATENCY.value}) FROM SCHEMA("{CloudWatchNamespaces.API_GATEWAY.value}", ApiId) WHERE ApiId = '{WEBSOCKET_API_NAME}'""",
        ),
        (
            f"MAX({CloudWatchMetrics.WEBSOCKET_LATENCY.value})",
            f"""SELECT AVG({CloudWatchMetrics.WEBSOCKET_LATENCY.value}) FROM SCHEMA("{CloudWatchNamespaces.API_GATEWAY.value}", ApiId) WHERE ApiId = '{WEBSOCKET_API_NAME}'""",
        ),
    ]

    restapi_metrics_queries = [
        (
            f"COUNT({CloudWatchMetrics.REST_ENDPOINT_CACHE_HITS.value})",
            f"""SELECT COUNT({CloudWatchMetrics.REST_ENDPOINT_CACHE_HITS.value}) FROM SCHEMA("{CloudWatchNamespaces.API_GATEWAY.value}", ApiName) WHERE ApiName = '{REST_API_NAME}'""",
        ),
        (
            f"AVG({CloudWatchMetrics.REST_ENDPOINT_CACHE_HITS.value})",
            f"""SELECT AVG({CloudWatchMetrics.REST_ENDPOINT_CACHE_HITS.value}) FROM SCHEMA("{CloudWatchNamespaces.API_GATEWAY.value}", ApiName) WHERE ApiName = '{REST_API_NAME}'""",
        ),
        (
            f"COUNT({CloudWatchMetrics.REST_ENDPOINT_CACHE_MISSES.value})",
            f"""SELECT COUNT({CloudWatchMetrics.REST_ENDPOINT_CACHE_MISSES.value}) FROM SCHEMA("{CloudWatchNamespaces.API_GATEWAY.value}", ApiName) WHERE ApiName = '{REST_API_NAME}'""",
        ),
        (
            f"AVG({CloudWatchMetrics.REST_ENDPOINT_CACHE_MISSES.value})",
            f"""SELECT AVG({CloudWatchMetrics.REST_ENDPOINT_CACHE_MISSES.value}) FROM SCHEMA("{CloudWatchNamespaces.API_GATEWAY.value}", ApiName) WHERE ApiName = '{REST_API_NAME}'""",
        ),
        (
            f"AVG({CloudWatchMetrics.REST_ENDPOINT_CACHE_MISSES.value})",
            f"""SELECT AVG({CloudWatchMetrics.REST_ENDPOINT_CACHE_MISSES.value}) FROM SCHEMA("{CloudWatchNamespaces.API_GATEWAY.value}", ApiName) WHERE ApiName = '{REST_API_NAME}'""",
        ),
        (
            f"AVG({CloudWatchMetrics.REST_ENDPOINT_LATENCY.value})",
            f"""SELECT AVG({CloudWatchMetrics.REST_ENDPOINT_LATENCY.value}) FROM SCHEMA("{CloudWatchNamespaces.API_GATEWAY.value}", ApiName) WHERE ApiName = '{REST_API_NAME}'""",
        ),
        (
            f"COUNT({CloudWatchMetrics.REST_ENDPOINT_TOTAL_HITS.value})",
            f"""SELECT COUNT("{CloudWatchMetrics.REST_ENDPOINT_TOTAL_HITS.value}") FROM SCHEMA("{CloudWatchNamespaces.API_GATEWAY.value}", ApiName) WHERE ApiName = '{REST_API_NAME}'""",
        ),
    ]

    cognito_usecase_metrics_queries = [
        (
            f"COUNT({CloudWatchMetrics.COGNITO_SIGN_IN_SUCCESSES.value})",
            f"""SELECT COUNT({CloudWatchMetrics.COGNITO_SIGN_IN_SUCCESSES.value}) FROM SCHEMA("AWS/Cognito", UserPool,UserPoolClient) WHERE UserPool = '{USER_POOL_ID}' AND UserPoolClient = '{USER_CLIENT_ID}'""",
        ),
        (
            f"AVG({CloudWatchMetrics.COGNITO_SIGN_IN_SUCCESSES.value})",
            f"""SELECT AVG({CloudWatchMetrics.COGNITO_SIGN_IN_SUCCESSES.value}) FROM SCHEMA("AWS/Cognito", UserPool,UserPoolClient) WHERE UserPool = '{USER_POOL_ID}' AND UserPoolClient = '{USER_CLIENT_ID}'""",
        ),
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

    queries = []
    formatted_queries = []
    queries += usecase_metrics_queries
    queries += langchain_metrics_queries if METRICS_SERVICE_NAME else []
    queries += kendra_metrics_queries if KENDRA_INDEX_ID else []
    queries += websocket_metrics_queries if WEBSOCKET_API_NAME else []
    queries += restapi_metrics_queries if REST_API_NAME else []
    queries += cognito_admin_metrics_queries if USER_POOL_ID else []
    queries += cognito_usecase_metrics_queries if USER_POOL_ID and USER_CLIENT_ID else []

    for query_label_pair in queries:
        formatted_queries.append(
            [
                {
                    "Id": query_label_pair[0].replace(")", "").replace("(", "").lower(),
                    "Expression": query_label_pair[1],
                    "Period": PUBLISH_METRICS_HOURS,
                    "Label": query_label_pair[0],
                }
            ]
        )
    return formatted_queries


def get_metrics_payload(hours):
    today = datetime.today().replace(minute=0, second=0, microsecond=0)
    # fetch metrics from (hours-1) to (T-1) hours as CW metrics can be slow to trickle in
    start_time = datetime.timestamp(today - timedelta(hours + 1))
    today_timestamp = datetime.timestamp(today - timedelta(1))
    metric_data_queries = get_cloudwatch_metrics_queries()

    cloudwatch_client = get_service_client("cloudwatch")
    metric_data = {}

    # fmt: off
    for query in metric_data_queries:
        cloudwatch_response = cloudwatch_client.get_metric_data(
            MetricDataQueries=query,
            StartTime=start_time,
            EndTime=today_timestamp,
        )["MetricDataResults"][0]
        metric_data[cloudwatch_response["Id"]] = cloudwatch_response["Values"][0] if cloudwatch_response["Values"] else 0
    # fmt: on

    return metric_data
