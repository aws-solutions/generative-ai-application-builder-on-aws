#!/usr/bin/env python
# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

import pytest
import json
from decimal import Decimal
from uuid import uuid4
from utils.data import AgentCoreUrlParser, DecimalEncoder, BuilderMetrics, MCPServerData
from utils.constants import EntityType


class TestAgentCoreUrlParser:
    
    def test_extract_runtime_id_valid_url(self):
        url = "https://bedrock-agentcore.us-east-1.amazonaws.com/runtimes/arn%3Aaws%3Abedrock-agentcore%3Aus-east-1%3A123456789012%3Aruntime%2Ftest_agentcore_id/invocations?qualifier=DEFAULT"
        result = AgentCoreUrlParser.extract_runtime_id(url)
        assert result == "test_agentcore_id"
    
    def test_extract_runtime_id_invalid_url(self):
        with pytest.raises(ValueError, match="Runtime ID could not be extracted"):
            AgentCoreUrlParser.extract_runtime_id("invalid-url")
    
    def test_extract_gateway_id_valid_url(self):
        url = "https://test-gateway.gateway.bedrock-agentcore.us-east-1.amazonaws.com/mcp"
        result = AgentCoreUrlParser.extract_gateway_id(url)
        assert result == "test-gateway"
    
    def test_extract_gateway_id_invalid_url(self):
        with pytest.raises(ValueError, match="Gateway ID could not be extracted"):
            AgentCoreUrlParser.extract_gateway_id("invalid-url")
    
    def test_extract_runtime_arn_valid_url(self):
        url = "https://bedrock-agentcore.us-east-1.amazonaws.com/runtimes/arn%3Aaws%3Abedrock-agentcore%3Aus-east-1%3A123456789012%3Aruntime%2Ftest-runtime/invocations?qualifier=DEFAULT"
        result = AgentCoreUrlParser.extract_runtime_arn(url)
        assert result == "arn:aws:bedrock-agentcore:us-east-1:123456789012:runtime/test-runtime"
    
    def test_extract_runtime_arn_invalid_url(self):
        with pytest.raises(ValueError, match="ARN could not be extracted"):
            AgentCoreUrlParser.extract_runtime_arn("invalid-url")
    
    def test_construct_gateway_arn_valid_url(self):
        url = "https://test-gateway.gateway.bedrock-agentcore.us-east-1.amazonaws.com/mcp"
        account_id = "123456789012"
        result = AgentCoreUrlParser.construct_gateway_arn(url, account_id)
        assert result == "arn:aws:bedrock-agentcore:us-east-1:123456789012:gateway/test-gateway"
    
    def test_construct_gateway_arn_invalid_url(self):
        with pytest.raises(ValueError, match="Invalid gateway URL format"):
            AgentCoreUrlParser.construct_gateway_arn("invalid-url", "123456789012")


class TestDecimalEncoder:
    
    def test_encode_decimal(self):
        data = {"value": Decimal("123.45")}
        result = json.dumps(data, cls=DecimalEncoder)
        assert result == '{"value": 123.45}'
    
    def test_encode_regular_types(self):
        data = {"string": "test", "int": 123, "float": 45.67}
        result = json.dumps(data, cls=DecimalEncoder)
        assert '"string": "test"' in result
        assert '"int": 123' in result
        assert '"float": 45.67' in result


class TestBuilderMetrics:
    
    def test_init_valid_params(self):
        test_uuid = uuid4()
        metrics = BuilderMetrics(test_uuid, "test-solution", "1.0.0", {"key": "value"})
        
        assert metrics.uuid == test_uuid
        assert metrics.solution_id == "test-solution"
        assert metrics.version == "1.0.0"
        assert metrics.data == {"key": "value"}
        assert metrics.timestamp is not None
    
    def test_init_no_data(self):
        test_uuid = uuid4()
        metrics = BuilderMetrics(test_uuid, "test-solution", "1.0.0")
        
        assert metrics.data == {}
    
    def test_post_init_invalid_solution_id(self):
        test_uuid = uuid4()
        with pytest.raises(TypeError, match="Expected .* to be a str"):
            metrics = BuilderMetrics(test_uuid, 123, "1.0.0")
            metrics.__post_init__()
    
    def test_post_init_invalid_version(self):
        test_uuid = uuid4()
        with pytest.raises(TypeError, match="Expected .* to be a str"):
            metrics = BuilderMetrics(test_uuid, "test-solution", 123)
            metrics.__post_init__()
    
    def test_post_init_invalid_data(self):
        test_uuid = uuid4()
        with pytest.raises(TypeError, match="Expected .* to be a dict"):
            metrics = BuilderMetrics(test_uuid, "test-solution", "1.0.0", "invalid")
            metrics.__post_init__()
    
    def test_post_init_invalid_uuid(self):
        with pytest.raises(TypeError, match="Expected .* to be a UUID"):
            metrics = BuilderMetrics("invalid-uuid", "test-solution", "1.0.0")
            metrics.__post_init__()


class TestMCPServerData:
    
    def test_init_runtime_valid(self):
        server = MCPServerData(
            EntityType.RUNTIME.value,
            "https://bedrock-agentcore.us-east-1.amazonaws.com/runtimes/arn%3Aaws%3Abedrock-agentcore%3Aus-east-1%3A123456789012%3Aruntime%2Ftest-runtime/invocations?qualifier=DEFAULT",
            "test-use-case",
            "test-name",
            "123456789012"
        )
        
        assert server.type == EntityType.RUNTIME.value
        assert server.agentcore_id == "test-runtime"
        assert server.agentcore_arn == "arn:aws:bedrock-agentcore:us-east-1:123456789012:runtime/test-runtime"
    
    def test_init_gateway_valid(self):
        server = MCPServerData(
            EntityType.GATEWAY.value,
            "https://test-gateway.gateway.bedrock-agentcore.us-east-1.amazonaws.com/mcp",
            "test-use-case",
            "test-name",
            "123456789012"
        )
        
        assert server.type == EntityType.GATEWAY.value
        assert server.agentcore_id == "test-gateway"
        assert server.agentcore_arn == "arn:aws:bedrock-agentcore:us-east-1:123456789012:gateway/test-gateway"
    
    def test_init_gateway_no_account_id(self):
        with pytest.raises(ValueError, match="Account ID is required"):
            MCPServerData(
                EntityType.GATEWAY.value,
                "https://test-gateway.gateway.bedrock-agentcore.us-east-1.amazonaws.com/mcp",
                "test-use-case",
                "test-name"
            )
    
    def test_init_invalid_type(self):
        with pytest.raises(ValueError, match="Invalid type"):
            MCPServerData(
                "invalid-type",
                "test-url",
                "test-use-case",
                "test-name",
                "123456789012"
            )
    
    def test_extract_id_runtime(self):
        server = MCPServerData(
            EntityType.RUNTIME.value,
            "https://bedrock-agentcore.us-east-1.amazonaws.com/runtimes/arn%3Aaws%3Abedrock-agentcore%3Aus-east-1%3A123456789012%3Aruntime%2Ftest-runtime/invocations?qualifier=DEFAULT",
            "test-use-case",
            "test-name",
            "123456789012"
        )
        assert server._extract_id() == "test-runtime"
    
    def test_extract_id_gateway(self):
        server = MCPServerData(
            EntityType.GATEWAY.value,
            "https://test-gateway.gateway.bedrock-agentcore.us-east-1.amazonaws.com/mcp",
            "test-use-case",
            "test-name",
            "123456789012"
        )
        assert server._extract_id() == "test-gateway"
    
    def test_construct_arn_runtime(self):
        server = MCPServerData(
            EntityType.RUNTIME.value,
            "https://bedrock-agentcore.us-east-1.amazonaws.com/runtimes/arn%3Aaws%3Abedrock-agentcore%3Aus-east-1%3A123456789012%3Aruntime%2Ftest-runtime/invocations?qualifier=DEFAULT",
            "test-use-case",
            "test-name",
            "123456789012"
        )
        result = server._construct_arn("123456789012")
        assert result == "arn:aws:bedrock-agentcore:us-east-1:123456789012:runtime/test-runtime"
    
    def test_construct_arn_gateway(self):
        server = MCPServerData(
            EntityType.GATEWAY.value,
            "https://test-gateway.gateway.bedrock-agentcore.us-east-1.amazonaws.com/mcp",
            "test-use-case",
            "test-name",
            "123456789012"
        )
        result = server._construct_arn("123456789012")
        assert result == "arn:aws:bedrock-agentcore:us-east-1:123456789012:gateway/test-gateway"
