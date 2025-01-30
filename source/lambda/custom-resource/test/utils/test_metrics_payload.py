#!/usr/bin/env python
# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0
import os

import mock
import pytest
from botocore.exceptions import ClientError
from moto import mock_aws
from utils.constants import (
    CLIENT_ID_ENV_VAR,
    KENDRA_INDEX_ID_ENV_VAR,
    PUBLISH_METRICS_PERIOD_IN_SECONDS,
    REST_API_NAME_ENV_VAR,
    USE_CASE_UUID_ENV_VAR,
    USER_POOL_ID_ENV_VAR,
    WEBSOCKET_API_ID_ENV_VAR,
)
from utils.metrics_payload import get_cloudwatch_metrics_queries, get_metrics_payload


@pytest.fixture(scope="function", autouse=True)
def setup_metrics_environment():
    os.environ[USE_CASE_UUID_ENV_VAR] = "1aa2bbc"
    os.environ[KENDRA_INDEX_ID_ENV_VAR] = "fake-kendra-id"
    os.environ[WEBSOCKET_API_ID_ENV_VAR] = "fake-websocket-id"
    os.environ[USER_POOL_ID_ENV_VAR] = "us-east-1_fake_id"
    os.environ[CLIENT_ID_ENV_VAR] = "fake-client-id"
    os.environ[REST_API_NAME_ENV_VAR] = "rest-api-fake-name"


def test_get_cloudwatch_metrics_queries():
    total_queries = 43
    number_of_kendra_queries = 9

    assert len(get_cloudwatch_metrics_queries()) == total_queries

    del os.environ[KENDRA_INDEX_ID_ENV_VAR]
    assert len(get_cloudwatch_metrics_queries()) == (total_queries - number_of_kendra_queries)

    os.environ[KENDRA_INDEX_ID_ENV_VAR] = ""
    assert len(get_cloudwatch_metrics_queries()) == (total_queries - number_of_kendra_queries)


@mock_aws
@mock.patch("utils.metrics_payload.get_cloudwatch_metrics_queries", return_value=[mock.ANY])
def test_get_metrics_payload_success(mock_queries):

    metric_key, metric_value = ["metric1", mock.ANY]
    expected_metrics = {metric_key: metric_value}
    mock_response = {"MetricDataResults": [{"Id": metric_key, "Values": [metric_value]}]}

    with mock.patch("utils.metrics_payload.get_session") as mock_session:
        # Configure mock response
        mock_client = mock_session().client.return_value
        mock_client.get_metric_data.return_value = mock_response

        # Call function under test
        result = get_metrics_payload(PUBLISH_METRICS_PERIOD_IN_SECONDS)

        # Verify client creation
        mock_session().client.assert_called_once_with("cloudwatch")

        # Verify get_metric_data calls
        assert mock_client.get_metric_data.call_count == len(mock_queries())

        # Verify parameters passed to get_metric_data
        _, kwargs = mock_client.get_metric_data.call_args
        assert "MetricDataQueries" in kwargs
        assert "StartTime" in kwargs
        assert "EndTime" in kwargs

        # Verify time period
        start_time = kwargs["StartTime"]
        end_time = kwargs["EndTime"]
        assert end_time - start_time == PUBLISH_METRICS_PERIOD_IN_SECONDS

        # Verify return value
        assert result == expected_metrics


def test_get_metrics_payload_error():
    with mock.patch("utils.metrics_payload.get_session") as mock_session:
        mock_session().client().get_metric_data.side_effect = ClientError(
            {"Error": {"Code": "fake-code", "Message": "fake-error"}}, "GetMetricData"
        )
        with pytest.raises(ClientError) as error:
            get_metrics_payload(PUBLISH_METRICS_PERIOD_IN_SECONDS)

        assert (
            error.value.args[0] == "An error occurred (fake-code) when calling the GetMetricData operation: fake-error"
        )
