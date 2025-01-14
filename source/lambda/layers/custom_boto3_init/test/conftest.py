#!/usr/bin/env python
# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

import os

import pytest


@pytest.fixture(autouse=True)
def aws_credentials():
    """Mocked AWS Credentials and general environment variables as required by python based lambda functions"""
    os.environ["AWS_ACCESS_KEY_ID"] = "fakeId"
    os.environ["AWS_SECRET_ACCESS_KEY"] = "fakeAccessKey"  # nosec B105
    os.environ["AWS_REGION"] = "us-east-1"  # must be a valid region
