#!/usr/bin/env python
# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

import json
from dataclasses import dataclass
from datetime import datetime, timezone
from decimal import Decimal
from uuid import UUID
from urllib.parse import unquote
import re
import urllib3
from aws_lambda_powertools import Logger, Tracer
from utils.constants import METRICS_TIMESTAMP_FORMAT, EntityType

logger = Logger(utc=True)
tracer = Tracer()

http = urllib3.PoolManager()
UUID_VERSION = 4

# URL parsing constants
RUNTIME_URL_PATTERN = r"runtime/(.+?)/invocations"
GATEWAY_URL_PATTERN = r"https://([^.]+)\.gateway\.bedrock-agentcore"
RUNTIME_ARN_PATTERN = r"arn:[^:]+:bedrock-agentcore:[^:]+:[^:]+:runtime/[^/]+"
GATEWAY_ARN_PATTERN = r"https://([^.]+)\.gateway\.bedrock-agentcore\.([-\w]+)"


class AgentCoreUrlParser:
    """Utility class for parsing AgentCore URLs and constructing ARNs."""

    @staticmethod
    def extract_runtime_id(url: str) -> str:
        decoded_url = unquote(url)
        match = re.search(RUNTIME_URL_PATTERN, decoded_url)
        if match:
            return match.group(1)
        raise ValueError(f"Runtime ID could not be extracted from URL: {url}")

    @staticmethod
    def extract_gateway_id(url: str) -> str:
        match = re.search(GATEWAY_URL_PATTERN, url)
        if match:
            return match.group(1)
        raise ValueError(f"Gateway ID could not be extracted from URL: {url}")

    @staticmethod
    def extract_runtime_arn(url: str) -> str:
        decoded_url = unquote(url)
        match = re.search(RUNTIME_ARN_PATTERN, decoded_url)
        if match:
            return match.group(0)
        raise ValueError(f"ARN could not be extracted from runtime URL: {url}")

    @staticmethod
    def construct_gateway_arn(url: str, account_id: str) -> str:
        match = re.search(GATEWAY_ARN_PATTERN, url)
        if not match:
            raise ValueError("Invalid gateway URL format")

        gateway_id = match.group(1)
        region = match.group(2)
        return f"arn:aws:bedrock-agentcore:{region}:{account_id}:gateway/{gateway_id}"


class DecimalEncoder(json.JSONEncoder):
    def default(self, o):
        if isinstance(o, Decimal):
            return float(o)
        return super().default(o)


@dataclass
class BuilderMetrics:
    solution_id: str
    version: str
    data: dict
    timestamp: datetime
    uuid: UUID
    account_id: str

    def __init__(self, uuid: UUID, solution_id: str, version: str, data: dict = None, account_id: str = None):
        self.uuid = uuid
        self.solution_id = solution_id
        self.version = version
        self.data = data if data else {}
        self.timestamp = datetime.now(timezone.utc).strftime(METRICS_TIMESTAMP_FORMAT)
        self.account_id = account_id if account_id else "unknown"

    def __post_init__(self):
        if not isinstance(self.solution_id, str):
            raise TypeError(f"Expected {self.solution_id} to be a str")

        if not isinstance(self.version, str):
            raise TypeError(f"Expected {self.version} to be a str")

        if not isinstance(self.data, dict):
            raise TypeError(f"Expected {self.data} to be a dict")

        try:
            if self.uuid is not None:
                UUID(self.uuid, version=UUID_VERSION)
        except ValueError:
            raise TypeError(f"Expected {self.uuid} to be a UUID")


@dataclass
class MCPServerData:
    type: EntityType
    url: str
    use_case_id: str
    use_case_name: str
    agentcore_id: str
    agentcore_arn: str

    def __init__(self, type: EntityType, url: str, use_case_id: str, use_case_name: str, account_id: str = None):
        self.type = type
        self.url = url
        self.use_case_id = use_case_id
        self.use_case_name = use_case_name
        self.agentcore_id = self._extract_id()
        self.agentcore_arn = self._construct_arn(account_id)

    def _extract_id(self) -> str:
        if self.type == EntityType.RUNTIME.value:
            return AgentCoreUrlParser.extract_runtime_id(self.url)
        elif self.type == EntityType.GATEWAY.value:
            return AgentCoreUrlParser.extract_gateway_id(self.url)
        else:
            raise ValueError(f"Invalid type {self.type}")

    def _construct_arn(self, account_id: str | None) -> str:
        if self.type == EntityType.RUNTIME.value:
            return AgentCoreUrlParser.extract_runtime_arn(self.url)
        elif self.type == EntityType.GATEWAY.value:
            if not account_id:
                raise ValueError("Account ID is required to construct ARN for gateway")
            return AgentCoreUrlParser.construct_gateway_arn(self.url, account_id)
        else:
            raise ValueError(f"Invalid type {self.type}")
