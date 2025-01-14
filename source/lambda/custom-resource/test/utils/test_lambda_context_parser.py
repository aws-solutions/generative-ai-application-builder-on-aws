# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

from utils.lambda_context_parser import get_invocation_account_id


def test_get_invocation_account_id(mock_lambda_context):
    account_id = get_invocation_account_id(mock_lambda_context)
    assert account_id == "123456789012"
