# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0


class LLMBuildError(Exception):
    """Exception raised when building an LLM fails."""

    pass


class LLMInvocationError(Exception):
    """Exception raised when invoking an LLM fails."""

    pass


class JsonPathExtractionError(Exception):
    """Exception raised when JSONPath extraction fails for SageMaker"""

    pass
