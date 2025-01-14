#!/usr/bin/env python
# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

import json
import os
from contextlib import nullcontext as does_not_raise

import mock
import pytest
from utils.constants import METRICS_ENDPOINT
from utils.data import BuilderMetrics
from utils.metrics import push_builder_metrics, verify_env_setup

builder_metrics = BuilderMetrics("fake-uuid", "SO0999", "v99.99.99", {"fake-metric-1": 0, "fake-metric-2": 2})


def test_when_env_variables_set(monkeypatch):
    envs = {
        "UNIT_TEST_ENV": "yes",
        "POWERTOOLS_SERVICE_NAME": "ANONYMOUS-CW-METRICS",
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
        assert body["UUID"] == "fake-uuid"
        assert body["Version"] == "v99.99.99"
        assert body["Data"] == {"fake-metric-1": 0, "fake-metric-2": 2}


def test_sending_cw_metrics_raises():
    with mock.patch("utils.metrics.http", side_effect=Exception("mocked error")):
        with pytest.raises(Exception) as ex:
            push_builder_metrics(builder_metrics)
            assert ex == "mocked error"
