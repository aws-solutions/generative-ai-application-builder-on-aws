# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

"""
Pytest plugin to mock decorators before module imports
"""

import sys
from unittest.mock import MagicMock


# Mock the requires_access_token decorator before any imports
def identity_decorator(**kwargs):
    """Mock decorator that just returns the function unchanged"""

    def decorator(func):
        return func

    return decorator


# Create mock module
mock_auth = MagicMock()
mock_auth.requires_access_token = identity_decorator

# Inject into sys.modules before imports
sys.modules["bedrock_agentcore"] = MagicMock()
sys.modules["bedrock_agentcore.identity"] = MagicMock()
sys.modules["bedrock_agentcore.identity.auth"] = mock_auth
