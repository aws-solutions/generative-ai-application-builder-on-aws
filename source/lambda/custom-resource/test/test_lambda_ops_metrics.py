#!/usr/bin/env python
# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

import os
from contextlib import nullcontext as does_not_raise

import mock
from lambda_ops_metrics import handler


@mock.patch("lambda_ops_metrics.get_metrics_payload", return_value={"fake-metric-1": 5, "fake-metric-2": 0})
@mock.patch("lambda_ops_metrics.push_builder_metrics", return_value=None)
def test_lambda_handler_success(mock_lambda_context, monkeypatch, caplog):
    envs = {
        "UNIT_TEST_ENV": "yes",
        "POWERTOOLS_SERVICE_NAME": "ANONYMOUS-CW-METRICS",
        "SOLUTION_ID": "SO0999",
        "SOLUTION_VERSION": "v99.99.99",
    }
    monkeypatch.setattr(os, "environ", envs)
    assert handler({}, mock_lambda_context) == None
    assert "Skipping metrics publishing — all metric values are empty." not in caplog.text


@mock.patch("lambda_ops_metrics.get_metrics_payload", return_value={"fake-metric-1": 5, "fake-metric-2": 10})
@mock.patch("lambda_ops_metrics.push_builder_metrics", return_value=None)
def test_lambda_handler_on_exception(mock_lambda_context, monkeypatch):
    # When error is thrown for env variables not set, it doesn't raise Exception
    envs = {}
    monkeypatch.setattr(os, "environ", envs)
    with does_not_raise():
        assert handler({}, mock_lambda_context) == None


@mock.patch("lambda_ops_metrics.get_metrics_payload", return_value={"fake-metric-1": 0, "fake-metric-2": 0})
def test_lambda_handler_empty_metrics(mock_lambda_context, monkeypatch, caplog):
    # When error is thrown for env variables not set, it doesn't raise Exception
    envs = {
        "UNIT_TEST_ENV": "yes",
        "POWERTOOLS_SERVICE_NAME": "ANONYMOUS-CW-METRICS",
        "SOLUTION_ID": "SO0999",
        "SOLUTION_VERSION": "v99.99.99",
    }
    monkeypatch.setattr(os, "environ", envs)
    with caplog.at_level("INFO"):
        assert handler({}, mock_lambda_context) == None
        # Making sure to log NOT publishing the metrics
        assert "Skipping metrics publishing — all metric values are empty." in caplog.text
