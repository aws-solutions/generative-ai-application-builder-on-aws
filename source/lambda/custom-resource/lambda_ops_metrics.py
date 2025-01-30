#!/usr/bin/env python
# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0
import os

from aws_lambda_powertools import Logger, Metrics, Tracer
from custom_config import DEFAULT_APP_NAME
from utils.constants import PUBLISH_METRICS_PERIOD_IN_SECONDS, USE_CASE_UUID_ENV_VAR
from utils.data import BuilderMetrics
from utils.metrics import push_builder_metrics, verify_env_setup
from utils.metrics_payload import get_metrics_payload

logger = Logger(utc=True)
tracer = Tracer()
metrics = Metrics(namespace=os.environ.get("STACK_NAME", DEFAULT_APP_NAME))
USE_CASE_UUID = os.getenv(USE_CASE_UUID_ENV_VAR)


@metrics.log_metrics(capture_cold_start_metric=True)  # type: ignore
@tracer.capture_lambda_handler
@logger.inject_lambda_context
def handler(*_):
    try:
        verify_env_setup()
        metric_data = get_metrics_payload(PUBLISH_METRICS_PERIOD_IN_SECONDS)
        builder_metrics = BuilderMetrics(
            USE_CASE_UUID, os.environ["SOLUTION_ID"], os.environ["SOLUTION_VERSION"], metric_data
        )
        push_builder_metrics(builder_metrics)
    except Exception as ex:
        logger.error(f"Error occurred when sending cloudwatch anonymous metrics, Error is {ex}")
