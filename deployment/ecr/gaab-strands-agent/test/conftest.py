# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

"""
Pytest configuration for test suite
"""

import os
import pytest
from unittest.mock import patch


def mock_requires_access_token(*args, **kwargs):
    """Mock decorator that just returns the function unchanged"""

    def decorator(func):
        return func

    return decorator


# Apply the patch at module level before any imports
patcher = patch("bedrock_agentcore.identity.auth.requires_access_token", mock_requires_access_token)
patcher.start()


def pytest_sessionfinish(session, exitstatus):
    """Called after whole test run finished"""
    patcher.stop()


@pytest.fixture(autouse=True)
def mock_environment():
    """Mock environment variables for all tests"""
    with patch.dict(
        os.environ,
        {
            "AWS_REGION": "us-east-1",
            "AWS_SDK_USER_AGENT": '{"user_agent_extra": "test-agent"}',
        },
        clear=False,
    ):
        yield
