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
from contextlib import nullcontext as does_not_raise

import mock
from lambda_ops_metrics import handler


@mock.patch("lambda_ops_metrics.get_metrics_payload", {"fake-metric-1": 5, "fake-metric-2": 10})
@mock.patch("lambda_ops_metrics.push_builder_metrics", None)
def test_lambda_handler_success(mock_lambda_context, monkeypatch):
    envs = {
        "UNIT_TEST_ENV": "yes",
        "POWERTOOLS_SERVICE_NAME": "ANONYMOUS-CW-METRICS",
        "LOG_LEVEL": "DEBUG",
        "SOLUTION_ID": "SO0999",
        "SOLUTION_VERSION": "v99.99.99",
    }
    monkeypatch.setattr(os, "environ", envs)
    assert handler({}, mock_lambda_context) == None


@mock.patch("lambda_ops_metrics.get_metrics_payload", return_value={"fake-metric-1": 5, "fake-metric-2": 10})
@mock.patch("lambda_ops_metrics.push_builder_metrics", return_value=None)
def test_lambda_handler_on_exception(mock_lambda_context, monkeypatch):
    # When error is thrown for env variables not set, it doesn't raise Exception
    envs = {}
    monkeypatch.setattr(os, "environ", envs)
    with does_not_raise():
        assert handler({}, mock_lambda_context) == None
