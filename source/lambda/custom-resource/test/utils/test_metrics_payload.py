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
import os
import random
from contextlib import nullcontext as does_not_raise
from datetime import datetime, timedelta

import mock
import pytest
from botocore.exceptions import ClientError
from botocore.stub import Stubber
from freezegun import freeze_time
from helper import get_service_client
from utils.constants import (
    CLIENT_ID_ENV_VAR,
    KENDRA_INDEX_ID_ENV_VAR,
    PUBLISH_METRICS_DAYS,
    REST_API_NAME_ENV_VAR,
    USE_CASE_UUID_ENV_VAR,
    USER_POOL_ID_ENV_VAR,
    WEBSOCKET_API_ID_ENV_VAR,
)
from utils.metrics_payload import get_cloudwatch_metrics_queries, get_metrics_payload

# fmt: off
expected_metric_data_output = {
    "metric1": mock.ANY, "metric2": mock.ANY, "metric3": mock.ANY, "metric4": mock.ANY, "metric5": mock.ANY, "metric6": mock.ANY,
    "metric7": mock.ANY, "metric8": mock.ANY, "metric9": mock.ANY, "metric10": mock.ANY, "metric11": mock.ANY, "metric12": mock.ANY, 
    "metric13": mock.ANY, "metric14": mock.ANY, "metric15": mock.ANY, "metric16": mock.ANY, "metric17": mock.ANY, "metric18": mock.ANY, 
    "metric19": mock.ANY, "metric20": mock.ANY, "metric21": mock.ANY, "metric22": mock.ANY, "metric23": mock.ANY, "metric24": mock.ANY, 
    "metric25": mock.ANY, "metric26": mock.ANY, "metric27": mock.ANY, "metric28": mock.ANY, "metric29": mock.ANY, "metric30": mock.ANY,
    "metric31": mock.ANY,"metric32": mock.ANY,"metric33": mock.ANY,"metric34": mock.ANY,"metric35": mock.ANY,"metric36": mock.ANY,
    "metric37": mock.ANY,"metric38": mock.ANY,"metric39": mock.ANY,"metric40": mock.ANY,"metric41": mock.ANY,"metric42": mock.ANY,
    "metric43": mock.ANY
}
# fmt: on


@pytest.fixture(scope="function")
def cw_stub():
    cw = get_service_client("cloudwatch")
    with Stubber(cw) as stubber:
        yield stubber
        stubber.assert_no_pending_responses()


@pytest.fixture(scope="function", autouse=True)
def metric_responses():
    cw_response = []
    for metric in range(1, 44):
        cw_response.append(
            {
                "Id": "metric" + str(metric),
                "Label": "metric" + str(metric),
                "Timestamps": [datetime.now()],
                "Values": [
                    random.randint(0, 50),
                ],
                "StatusCode": "Complete",
            }
        )

    yield cw_response


@pytest.fixture(scope="function", autouse=True)
def setup_metrics_environment():
    os.environ[USE_CASE_UUID_ENV_VAR] = "1aa2bbc"
    os.environ[KENDRA_INDEX_ID_ENV_VAR] = "fake-kendra-id"
    os.environ[WEBSOCKET_API_ID_ENV_VAR] = "fake-websocket-id"
    os.environ[USER_POOL_ID_ENV_VAR] = "us-east-1_fake_id"
    os.environ[CLIENT_ID_ENV_VAR] = "fake-client-id"
    os.environ[REST_API_NAME_ENV_VAR] = "rest-api-fake-name"


def get_metric_data_stubbed(cw_stub, metric_responses):
    metric_queries = get_cloudwatch_metrics_queries()
    today = datetime.today().replace(minute=0, second=0, microsecond=0) - timedelta(hours=1)
    mock_start_timestamp = datetime.timestamp(today - timedelta(days=PUBLISH_METRICS_DAYS))
    mock_end_timestamp = datetime.timestamp(today)
    for query in range(len(metric_queries)):
        cw_stub.add_response(
            "get_metric_data",
            expected_params={
                "MetricDataQueries": metric_queries[query],
                "StartTime": mock_start_timestamp,
                "EndTime": mock_end_timestamp,
            },
            service_response={"MetricDataResults": [metric_responses[query]]},
        )
    return cw_stub


@freeze_time("2000-01-01T00:00:00")
@mock.patch("lambda_ops_metrics.push_builder_metrics", None)
def test_publish_metrics_success(cw_stub, metric_responses, setup_metrics_environment):
    with does_not_raise():
        get_metric_data_stubbed(cw_stub, metric_responses)
        cw_stub.activate()
        assert get_metrics_payload(PUBLISH_METRICS_DAYS) == expected_metric_data_output


@freeze_time("2000-01-01T00:00:00")
@mock.patch("lambda_ops_metrics.push_builder_metrics", None)
def test_publish_metrics_success_kendra_missing(cw_stub, metric_responses, setup_metrics_environment):
    total_queries = 43
    no_kendra_queries = 9
    assert len(get_cloudwatch_metrics_queries()) == total_queries
    del os.environ[KENDRA_INDEX_ID_ENV_VAR]
    assert len(get_cloudwatch_metrics_queries()) == (total_queries - no_kendra_queries)
    os.environ[KENDRA_INDEX_ID_ENV_VAR] = ""
    assert len(get_cloudwatch_metrics_queries()) == (total_queries - no_kendra_queries)


@mock.patch("lambda_ops_metrics.push_builder_metrics", None)
def test_publish_metrics_raises(cw_stub):
    cw_stub.add_client_error("get_metric_data", service_error_code="fake-code", service_message="fake-error")
    cw_stub.activate()
    with pytest.raises(ClientError) as error:
        get_metrics_payload(PUBLISH_METRICS_DAYS)

    assert error.value.args[0] == "An error occurred (fake-code) when calling the GetMetricData operation: fake-error"
