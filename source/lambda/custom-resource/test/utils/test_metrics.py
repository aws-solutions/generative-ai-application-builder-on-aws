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
from contextlib import nullcontext as does_not_raise

import mock
import pytest
from utils.constants import METRICS_ENDPOINT
from utils.data import BuilderMetrics
from utils.metrics import push_builder_metrics, verify_env_setup

builder_metrics = BuilderMetrics("SO0999", "v99.99.99", {"fake-metric-1": 0, "fake-metric-2": 2})


def test_when_env_variables_set(monkeypatch):
    envs = {
        "UNIT_TEST_ENV": "yes",
        "POWERTOOLS_SERVICE_NAME": "ANONYMOUS-CW-METRICS",
        "LOG_LEVEL": "DEBUG",
        "SOLUTION_ID": "SO0001",
        "SOLUTION_VERSION": "v99.99.99",
    }
    monkeypatch.setattr(os, "environ", envs)
    with does_not_raise():
        verify_env_setup()


def test_when_solution_version_not_set(monkeypatch):
    envs = {
        "UNIT_TEST_ENV": "yes",
        "POWERTOOLS_SERVICE_NAME": "ANONYMOUS-CW-METRICS",
        "LOG_LEVEL": "DEBUG",
        "SOLUTION_ID": "SO0001",
    }
    monkeypatch.setattr(os, "environ", envs)
    with pytest.raises(ValueError) as ex:
        verify_env_setup()
        assert ex == "SOLUTION_ID Lambda Environment variable not set."


def test_when_solution_id_not_set(monkeypatch):
    envs = {
        "UNIT_TEST_ENV": "yes",
        "POWERTOOLS_SERVICE_NAME": "ANONYMOUS-CW-METRICS",
        "LOG_LEVEL": "DEBUG",
        "SOLUTION_VERSION": "v99.99.99",
    }
    monkeypatch.setattr(os, "environ", envs)
    with pytest.raises(ValueError) as ex:
        verify_env_setup()
        assert ex == "SOLUTION_VERSION Lambda Environment variable not set."


def test_sending_cw_metrics():
    with mock.patch("utils.metrics.http") as metrics_mocked_PoolManager:
        push_builder_metrics(builder_metrics)

        call_kwargs = metrics_mocked_PoolManager.request.call_args.kwargs
        assert call_kwargs["method"] == "POST"
        assert call_kwargs["url"] == METRICS_ENDPOINT
        body = json.loads(call_kwargs["body"])
        assert body["Solution"] == "SO0999"
        assert body["UUID"] is None
        assert body["Version"] == "v99.99.99"
        assert body["Data"] == {"fake-metric-1": 0, "fake-metric-2": 2}


def test_sending_cw_metrics_raises():
    with mock.patch("utils.metrics.http", side_effect=Exception("mocked error")):
        with pytest.raises(Exception) as ex:
            push_builder_metrics(builder_metrics)
            assert ex == "mocked error"
