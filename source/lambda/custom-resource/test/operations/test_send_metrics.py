#!/usr/bin/env python
# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

import json
import re
from copy import copy
from test.fixtures.metrics_events import (
    lambda_events,
    llm_config_value,
    setup_config_ddb,
    llm_config_value_text_with_no_rag,
    llm_config_value_with_auth,
    llm_config_value_with_agent,
    llm_config_value_with_multimodal,
    llm_config_value_with_mcp_gateway,
    llm_config_value_with_mcp_runtime,
    llm_config_value_with_agent_builder,
    llm_config_value_with_workflow,
    llm_config_value_with_provisioned_concurrency,
)

import mock
import pytest
from operations import operation_types
from freezegun import freeze_time
from lambda_func import handler
from moto import mock_aws
from operations.send_metrics import VERSION, execute, verify_env_setup
from operations.operation_types import RESOURCE, RESOURCE_PROPERTIES
from utils.constants import (
    DISAMBIGUATION_PROMPT_TEMPLATE,
    LLM_PARAMS,
    METRICS_ENDPOINT,
    PROMPT_PARAMS,
    PROMPT_TEMPLATE,
    SSM_CONFIG_KEY,
    USE_CASE_CONFIG_RECORD_KEY,
    USE_CASE_CONFIG_TABLE_NAME,
    UUID,
)

UUID_REGEX = "^[0-9a-f]{8}-[0-9a-f]{4}-[0-5][0-9a-f]{3}-[089ab][0-9a-f]{3}-[0-9a-f]{12}$"
compiled_regex_uuid = re.compile(UUID_REGEX)


@mock_aws
def test_when_operation_type_is_invalid(mock_lambda_context, lambda_events, setup_config_ddb):
    expected_response = {
        "method": "PUT",
        "url": "https://fakeurl/doesnotexist",
        "headers": {"content-type": "", "content-length": "337"},
        "body": '{"Status": "FAILED", "Reason": "Operation type not available or did not match from the request. Expecting operation type to be METRIC or ANONYMOUS_METRIC", "PhysicalResourceId": "fake_physical_resource_id", "StackId": "fakeStackId", "RequestId": "fakeRequestId", "LogicalResourceId": "fakeLogicalResourceId", "NoEcho": false, "Data": {}}',
    }

    for event in lambda_events:
        event[RESOURCE_PROPERTIES][RESOURCE] = "FAKE_RESOURCE"

        with pytest.raises(ValueError):
            verify_env_setup(event)

        with mock.patch("cfn_response.http") as mocked_PoolManager:
            execute(event, mock_lambda_context)

            mocked_PoolManager.request.assert_called_once_with(**expected_response)


@mock_aws
@pytest.mark.parametrize("requestType", ["Create", "Update", "Delete"])
def test_sending_metric(lambda_events, mock_lambda_context, requestType, setup_config_ddb):
    for idx, event in enumerate(lambda_events[:3]):
        event["RequestType"] = requestType
        with mock.patch("cfn_response.http") as cfn_mocked_PoolManager:
            with mock.patch("utils.metrics.http") as metrics_mocked_PoolManager:
                execute(event, mock_lambda_context)
                call_kwargs = metrics_mocked_PoolManager.request.call_args.kwargs
                assert call_kwargs["method"] == "POST"
                assert call_kwargs["url"] == METRICS_ENDPOINT
                body = json.loads(call_kwargs["body"])

                assert body["Solution"] == "SO0999"
                assert body.get("UUID") == "fakeuuid"
                assert body[VERSION] == "v9.9.9"

                if body["Data"]:
                    assert body["Data"] == {
                        "LlmParams": {
                            "ModelProvider": "Bedrock",
                            "BedrockLlmParams": {
                                "ModelId": "fakemodel",
                                "GuardrailEnabled": False,
                                "ProvisionedModelEnabled": False,
                            },
                            "PromptParams": {"MaxPromptTemplateLength": 100.0, "RephraseQuestion": True},
                        },
                        "UseCaseType": "Text",
                        "KnowledgeBaseParams": {
                            "KnowledgeBaseType": "Kendra",
                        },
                        "AuthenticationParams": {
                            "ClientOwnedUserPool": False,
                        },
                    }

            cfn_mocked_PoolManager.request.assert_called_once_with(
                method="PUT",
                url="https://fakeurl/doesnotexist",
                headers={"content-type": "", "content-length": "278"},
                body='{"Status": "SUCCESS", "Reason": "See the details in CloudWatch Log Stream: fake_logstream_name", "PhysicalResourceId": "fake_physical_resource_id", "StackId": "fakeStackId", "RequestId": "fakeRequestId", "LogicalResourceId": "fakeLogicalResourceId", "NoEcho": false, "Data": {}}',
            )


@mock_aws
@pytest.mark.parametrize("requestType", ["Create", "Update", "Delete"])
def test_sending_metric_no_kb(lambda_events, mock_lambda_context, requestType, setup_config_ddb):
    for idx, event in enumerate(lambda_events[3:4]):
        event["RequestType"] = requestType
        with mock.patch("cfn_response.http") as cfn_mocked_PoolManager:
            with mock.patch("utils.metrics.http") as metrics_mocked_PoolManager:
                execute(event, mock_lambda_context)

                call_kwargs = metrics_mocked_PoolManager.request.call_args.kwargs
                assert call_kwargs["method"] == "POST"
                assert call_kwargs["url"] == METRICS_ENDPOINT
                body = json.loads(call_kwargs["body"])
                assert body["Solution"] == "SO0999"
                assert body.get("UUID") == "fakeuuid"
                assert body[VERSION] == "v9.9.9"
                if body["Data"]:
                    assert body["Data"] == {
                        "LlmParams": {
                            "ModelProvider": "Bedrock",
                            "BedrockLlmParams": {
                                "ModelId": "fakemodel",
                                "GuardrailEnabled": True,
                                "ProvisionedModelEnabled": False,
                            },
                            "PromptParams": {"MaxPromptTemplateLength": 100.0, "RephraseQuestion": True},
                        },
                        "AuthenticationParams": {
                            "ClientOwnedUserPool": False,
                        },
                        "UseCaseType": "Text",
                    }

            cfn_mocked_PoolManager.request.assert_called_once_with(
                method="PUT",
                url="https://fakeurl/doesnotexist",
                headers={"content-type": "", "content-length": "278"},
                body='{"Status": "SUCCESS", "Reason": "See the details in CloudWatch Log Stream: fake_logstream_name", "PhysicalResourceId": "fake_physical_resource_id", "StackId": "fakeStackId", "RequestId": "fakeRequestId", "LogicalResourceId": "fakeLogicalResourceId", "NoEcho": false, "Data": {}}',
            )


@mock_aws
@freeze_time("2000-01-01T00:00:00")
@pytest.mark.parametrize("requestType", ["Create", "Update", "Delete"])
def test_sending_metric_missing_props(lambda_events, mock_lambda_context, requestType, setup_config_ddb):
    event = lambda_events[-1]
    event["RequestType"] = requestType
    with mock.patch("cfn_response.http") as cfn_mocked_PoolManager:
        with mock.patch("utils.metrics.http") as metrics_mocked_PoolManager:
            execute(event, mock_lambda_context)

            call_kwargs = metrics_mocked_PoolManager.request.call_args

            if event["RequestType"] == "Create" or event["RequestType"] == "Update":
                cfn_mocked_PoolManager.request.call_args.kwargs["body"] == {
                    "Status": "FAILED",
                    "Reason": "'DeployKendraIndex' has not been passed. Hence operation cannot be performed.",
                    "PhysicalResourceId": "fake_physical_resource_id",
                    "StackId": "fakeStackId",
                    "RequestId": "fakeRequestId",
                    "LogicalResourceId": "fakeLogicalResourceId",
                    "NoEcho": False,
                    "Data": {},
                }
            else:
                call_kwargs = metrics_mocked_PoolManager.request.call_args.kwargs
                assert call_kwargs["method"] == "POST"
                assert call_kwargs["url"] == METRICS_ENDPOINT
                body = json.loads(call_kwargs["body"])
                assert body["Solution"] == "SO0999"
                assert body["TimeStamp"] == "2000-01-01 00:00:00.000000"
                assert body.get("UUID") == "fakeuuid"
                assert body[VERSION] == "v9.9.9"
                assert body["Data"] == {}

                cfn_mocked_PoolManager.request.assert_called_once_with(
                    method="PUT",
                    url="https://fakeurl/doesnotexist",
                    headers={"content-type": "", "content-length": "278"},
                    body='{"Status": "SUCCESS", "Reason": "See the details in CloudWatch Log Stream: fake_logstream_name", "PhysicalResourceId": "fake_physical_resource_id", "StackId": "fakeStackId", "RequestId": "fakeRequestId", "LogicalResourceId": "fakeLogicalResourceId", "NoEcho": false, "Data": {}}',
                )


@mock_aws
@freeze_time("2000-01-01T00:00:00")
@pytest.mark.parametrize("requestType", ["Create", "Update"])
def test_lambda_handler(lambda_events, mock_lambda_context, requestType, setup_config_ddb):
    expected_body = [("Yes", "default"), ("No", "default")]

    for idx, event in enumerate(lambda_events[:-1]):
        event["RequestType"] = requestType
        with mock.patch("cfn_response.http") as cfn_mocked_PoolManager:
            with mock.patch("utils.metrics.http") as metrics_mocked_PoolManager:
                handler(event, mock_lambda_context)
                call_kwargs = metrics_mocked_PoolManager.request.call_args.kwargs

                assert call_kwargs["method"] == "POST"
                assert call_kwargs["url"] == METRICS_ENDPOINT
                body = json.loads(call_kwargs["body"])
                assert body["Solution"] == "SO0999"
                assert body["TimeStamp"] == "2000-01-01 00:00:00.000000"
                assert body.get("UUID") == "fakeuuid"
                assert body[VERSION] == "v9.9.9"


@mock_aws
@freeze_time("2000-01-01T00:00:00")
@pytest.mark.parametrize("requestType", ["Create", "Update", "Delete"])
def test_sending_metric_with_agent_params(lambda_events, mock_lambda_context, requestType, setup_config_ddb):
    event = copy(lambda_events[4])
    event["RequestType"] = requestType

    with mock.patch("cfn_response.http") as cfn_mocked_PoolManager:
        with mock.patch("utils.metrics.http") as metrics_mocked_PoolManager:
            execute(event, mock_lambda_context)
            call_kwargs = metrics_mocked_PoolManager.request.call_args.kwargs
            assert call_kwargs["method"] == "POST"
            assert call_kwargs["url"] == METRICS_ENDPOINT
            body = json.loads(call_kwargs["body"])
            assert body["Solution"] == "SO0999"
            assert body.get("UUID") == "fakeuuid"
            if body["Data"]:
                assert body["Data"]["AgentParams"] == {
                    "AgentType": "Bedrock",
                    "BedrockAgentParams": {
                        "EnableTrace": True,
                    },
                }


@pytest.mark.parametrize("requestType", ["Create", "Update", "Delete"])
def test_sending_metric_with_auth_params(lambda_events, mock_lambda_context, requestType, setup_config_ddb):
    event = copy(lambda_events[5])
    event["RequestType"] = requestType

    with mock.patch("cfn_response.http") as cfn_mocked_PoolManager:
        with mock.patch("utils.metrics.http") as metrics_mocked_PoolManager:
            execute(event, mock_lambda_context)

            call_kwargs = metrics_mocked_PoolManager.request.call_args.kwargs
            assert call_kwargs["method"] == "POST"
            assert call_kwargs["url"] == METRICS_ENDPOINT
            body = json.loads(call_kwargs["body"])
            assert body["Solution"] == "SO0999"
            assert body.get("UUID") == "fakeuuid"
            if body["Data"]:
                assert body["Data"] == {
                    "AuthenticationParams": {
                        "ClientOwnedUserPool": True,
                    },
                    "UseCaseType": "Text",
                    "KnowledgeBaseParams": {"KnowledgeBaseType": "Kendra"},
                    "LlmParams": {
                        "ModelProvider": "Bedrock",
                        "BedrockLlmParams": {
                            "GuardrailEnabled": False,
                            "ModelId": "fakemodel",
                            "ProvisionedModelEnabled": False,
                        },
                        "PromptParams": {"RephraseQuestion": True, "MaxPromptTemplateLength": 100},
                    },
                }


@mock_aws
@freeze_time("2000-01-01T00:00:00")
@pytest.mark.parametrize("requestType", ["Create", "Update", "Delete"])
def test_lambda_handler_for_missing_props(lambda_events, mock_lambda_context, requestType, setup_config_ddb):
    event = lambda_events[-1]
    event["RequestType"] = requestType

    with mock.patch("cfn_response.http") as cfn_mocked_PoolManager:
        with mock.patch("utils.metrics.http") as metrics_mocked_PoolManager:
            handler(event, mock_lambda_context)
            call_kwargs = metrics_mocked_PoolManager.request.call_args
            if event["RequestType"] == "Create" or event["RequestType"] == "Update":
                cfn_mocked_PoolManager.request.call_args.kwargs["body"] == {
                    "Status": "FAILED",
                    "Reason": "'DeployKendraIndex' has not been passed. Hence operation cannot be performed.",
                    "PhysicalResourceId": "fake_physical_resource_id",
                    "StackId": "fakeStackId",
                    "RequestId": "fakeRequestId",
                    "LogicalResourceId": "fakeLogicalResourceId",
                    "NoEcho": False,
                    "Data": {},
                }
            else:
                call_kwargs = metrics_mocked_PoolManager.request.call_args.kwargs
                assert call_kwargs["method"] == "POST"
                assert call_kwargs["url"] == METRICS_ENDPOINT
                body = json.loads(call_kwargs["body"])
                assert body["Solution"] == "SO0999"
                assert body["TimeStamp"] == "2000-01-01 00:00:00.000000"
                assert body.get("UUID") == "fakeuuid"
                assert body[VERSION] == "v9.9.9"
                assert body["Data"] == {}

                cfn_mocked_PoolManager.request.assert_called_once_with(
                    method="PUT",
                    url="https://fakeurl/doesnotexist",
                    headers={"content-type": "", "content-length": "278"},
                    body='{"Status": "SUCCESS", "Reason": "See the details in CloudWatch Log Stream: fake_logstream_name", "PhysicalResourceId": "fake_physical_resource_id", "StackId": "fakeStackId", "RequestId": "fakeRequestId", "LogicalResourceId": "fakeLogicalResourceId", "NoEcho": false, "Data": {}}',
                )


@mock_aws
@freeze_time("2000-01-01T00:00:00")
@pytest.mark.parametrize("requestType", ["Create", "Update", "Delete"])
def test_sending_metric_with_multimodal_params(mock_lambda_context, requestType, setup_config_ddb):
    event = {
        "RequestType": requestType,
        "ResponseURL": "https://fakeurl/doesnotexist",
        "StackId": "fakeStackId",
        "RequestId": "fakeRequestId",
        "ResourceType": "Custom::AnonymousMetric",
        "LogicalResourceId": "fakeLogicalResourceId",
        "PhysicalResourceId": "fake_physical_resource_id",
        RESOURCE_PROPERTIES: {
            RESOURCE: operation_types.ANONYMOUS_METRIC,
            "SolutionId": "SO0999",
            "Version": "v9.9.9",
            USE_CASE_CONFIG_TABLE_NAME: "fake_ddb_table",
            USE_CASE_CONFIG_RECORD_KEY: "fake_ddb_table_hash_key_5",
            UUID: "fakeuuid",
        },
    }

    with mock.patch("cfn_response.http") as cfn_mocked_PoolManager:
        with mock.patch("utils.metrics.http") as metrics_mocked_PoolManager:
            execute(event, mock_lambda_context)
            call_kwargs = metrics_mocked_PoolManager.request.call_args.kwargs
            assert call_kwargs["method"] == "POST"
            assert call_kwargs["url"] == METRICS_ENDPOINT
            body = json.loads(call_kwargs["body"])
            assert body["Solution"] == "SO0999"
            assert body.get("UUID") == "fakeuuid"
            if body["Data"]:
                # Verify multimodal params are captured in LlmParams
                assert "LlmParams" in body["Data"]
                assert "MultimodalParams" in body["Data"]["LlmParams"]
                assert body["Data"]["LlmParams"]["MultimodalParams"] == {"MultimodalEnabled": True}
                assert body["Data"]["UseCaseType"] == "AgentBuilder"


@mock_aws
@freeze_time("2000-01-01T00:00:00")
@pytest.mark.parametrize("requestType", ["Create", "Update", "Delete"])
def test_sending_metric_with_mcp_gateway_params(mock_lambda_context, requestType, setup_config_ddb):
    event = {
        "RequestType": requestType,
        "ResponseURL": "https://fakeurl/doesnotexist",
        "StackId": "fakeStackId",
        "RequestId": "fakeRequestId",
        "ResourceType": "Custom::AnonymousMetric",
        "LogicalResourceId": "fakeLogicalResourceId",
        "PhysicalResourceId": "fake_physical_resource_id",
        RESOURCE_PROPERTIES: {
            RESOURCE: operation_types.ANONYMOUS_METRIC,
            "SolutionId": "SO0999",
            "Version": "v9.9.9",
            USE_CASE_CONFIG_TABLE_NAME: "fake_ddb_table",
            USE_CASE_CONFIG_RECORD_KEY: "fake_ddb_table_hash_key_6",
            UUID: "fakeuuid",
        },
    }

    with mock.patch("cfn_response.http") as cfn_mocked_PoolManager:
        with mock.patch("utils.metrics.http") as metrics_mocked_PoolManager:
            execute(event, mock_lambda_context)
            call_kwargs = metrics_mocked_PoolManager.request.call_args.kwargs
            assert call_kwargs["method"] == "POST"
            assert call_kwargs["url"] == METRICS_ENDPOINT
            body = json.loads(call_kwargs["body"])
            assert body["Solution"] == "SO0999"
            assert body.get("UUID") == "fakeuuid"
            if body["Data"]:
                assert "MCPParams" in body["Data"]
                assert body["Data"]["MCPParams"]["MCPType"] == "Gateway"
                assert "GatewayParams" in body["Data"]["MCPParams"]
                gateway_params = body["Data"]["MCPParams"]["GatewayParams"]
                # Verify target count and types are captured
                assert gateway_params["TargetCount"] == 3
                assert "TargetParams" in gateway_params
                assert len(gateway_params["TargetParams"]) == 3

                target_types = [t["TargetType"] for t in gateway_params["TargetParams"]]
                assert "smithyModel" in target_types
                assert target_types.count("openApiSchema") == 2

                # Verify outbound auth types are captured for OpenAPI targets
                openapi_targets = [t for t in gateway_params["TargetParams"] if t["TargetType"] == "openApiSchema"]
                assert len(openapi_targets) == 2
                auth_types = [t.get("OutboundAuthProviderType") for t in openapi_targets]
                assert "API_KEY" in auth_types
                assert "OAUTH" in auth_types

                for target in gateway_params["TargetParams"]:
                    assert "TargetName" not in target
                    assert "TargetId" not in target
                    assert "OutboundAuthProviderArn" not in target

                assert "GatewayArn" not in gateway_params
                assert "GatewayUrl" not in gateway_params
                assert "GatewayId" not in gateway_params
                assert body["Data"]["UseCaseType"] == "MCPServer"


@mock_aws
@freeze_time("2000-01-01T00:00:00")
@pytest.mark.parametrize("requestType", ["Create", "Update", "Delete"])
def test_sending_metric_with_mcp_runtime_params(mock_lambda_context, requestType, setup_config_ddb):
    event = {
        "RequestType": requestType,
        "ResponseURL": "https://fakeurl/doesnotexist",
        "StackId": "fakeStackId",
        "RequestId": "fakeRequestId",
        "ResourceType": "Custom::AnonymousMetric",
        "LogicalResourceId": "fakeLogicalResourceId",
        "PhysicalResourceId": "fake_physical_resource_id",
        RESOURCE_PROPERTIES: {
            RESOURCE: operation_types.ANONYMOUS_METRIC,
            "SolutionId": "SO0999",
            "Version": "v9.9.9",
            USE_CASE_CONFIG_TABLE_NAME: "fake_ddb_table",
            USE_CASE_CONFIG_RECORD_KEY: "fake_ddb_table_hash_key_7",
            UUID: "fakeuuid",
        },
    }

    with mock.patch("cfn_response.http") as cfn_mocked_PoolManager:
        with mock.patch("utils.metrics.http") as metrics_mocked_PoolManager:
            execute(event, mock_lambda_context)
            call_kwargs = metrics_mocked_PoolManager.request.call_args.kwargs
            assert call_kwargs["method"] == "POST"
            assert call_kwargs["url"] == METRICS_ENDPOINT
            body = json.loads(call_kwargs["body"])
            assert body["Solution"] == "SO0999"
            assert body.get("UUID") == "fakeuuid"
            if body["Data"]:
                assert "MCPParams" in body["Data"]
                assert body["Data"]["MCPParams"]["MCPType"] == "Runtime"
                assert "RuntimeArn" not in body["Data"]["MCPParams"]
                assert "RuntimeUrl" not in body["Data"]["MCPParams"]
                assert "RuntimeId" not in body["Data"]["MCPParams"]
                assert body["Data"]["UseCaseType"] == "MCPServer"


@mock_aws
@freeze_time("2000-01-01T00:00:00")
@pytest.mark.parametrize("requestType", ["Create", "Update", "Delete"])
def test_sending_metric_with_agent_builder_params(mock_lambda_context, requestType, setup_config_ddb):
    event = {
        "RequestType": requestType,
        "ResponseURL": "https://fakeurl/doesnotexist",
        "StackId": "fakeStackId",
        "RequestId": "fakeRequestId",
        "ResourceType": "Custom::AnonymousMetric",
        "LogicalResourceId": "fakeLogicalResourceId",
        "PhysicalResourceId": "fake_physical_resource_id",
        RESOURCE_PROPERTIES: {
            RESOURCE: operation_types.ANONYMOUS_METRIC,
            "SolutionId": "SO0999",
            "Version": "v9.9.9",
            USE_CASE_CONFIG_TABLE_NAME: "fake_ddb_table",
            USE_CASE_CONFIG_RECORD_KEY: "fake_ddb_table_hash_key_8",
            UUID: "fakeuuid",
        },
    }

    with mock.patch("cfn_response.http") as cfn_mocked_PoolManager:
        with mock.patch("utils.metrics.http") as metrics_mocked_PoolManager:
            execute(event, mock_lambda_context)
            call_kwargs = metrics_mocked_PoolManager.request.call_args.kwargs
            assert call_kwargs["method"] == "POST"
            assert call_kwargs["url"] == METRICS_ENDPOINT
            body = json.loads(call_kwargs["body"])
            assert body["Solution"] == "SO0999"
            assert body.get("UUID") == "fakeuuid"
            if body["Data"]:
                assert "AgentBuilderParams" in body["Data"]
                agent_builder_params = body["Data"]["AgentBuilderParams"]

                assert "MemoryConfig" in agent_builder_params
                assert agent_builder_params["MemoryConfig"]["LongTermEnabled"] == False

                assert "BuiltInToolsCount" in agent_builder_params
                assert agent_builder_params["BuiltInToolsCount"] == 3
                assert "BuiltInTools" in agent_builder_params
                assert set(agent_builder_params["BuiltInTools"]) == {"calculator", "current_time", "environment"}

                assert "MCPServersCount" in agent_builder_params
                assert agent_builder_params["MCPServersCount"] == 1
                assert "MCPServers" in agent_builder_params
                assert len(agent_builder_params["MCPServers"]) == 1
                mcp_server = agent_builder_params["MCPServers"][0]
                assert mcp_server["Type"] == "runtime"

                assert "SystemPrompt" not in agent_builder_params
                assert "Url" not in mcp_server

                assert body["Data"]["UseCaseType"] == "AgentBuilder"


@mock_aws
@freeze_time("2000-01-01T00:00:00")
@pytest.mark.parametrize("requestType", ["Create", "Update", "Delete"])
def test_sending_metric_with_workflow_params(mock_lambda_context, requestType, setup_config_ddb):
    event = {
        "RequestType": requestType,
        "ResponseURL": "https://fakeurl/doesnotexist",
        "StackId": "fakeStackId",
        "RequestId": "fakeRequestId",
        "ResourceType": "Custom::AnonymousMetric",
        "LogicalResourceId": "fakeLogicalResourceId",
        "PhysicalResourceId": "fake_physical_resource_id",
        RESOURCE_PROPERTIES: {
            RESOURCE: operation_types.ANONYMOUS_METRIC,
            "SolutionId": "SO0999",
            "Version": "v9.9.9",
            USE_CASE_CONFIG_TABLE_NAME: "fake_ddb_table",
            USE_CASE_CONFIG_RECORD_KEY: "fake_ddb_table_hash_key_9",
            UUID: "fakeuuid",
        },
    }

    with mock.patch("cfn_response.http") as cfn_mocked_PoolManager:
        with mock.patch("utils.metrics.http") as metrics_mocked_PoolManager:
            execute(event, mock_lambda_context)
            call_kwargs = metrics_mocked_PoolManager.request.call_args.kwargs
            assert call_kwargs["method"] == "POST"
            assert call_kwargs["url"] == METRICS_ENDPOINT
            body = json.loads(call_kwargs["body"])
            assert body["Solution"] == "SO0999"
            assert body.get("UUID") == "fakeuuid"
            if body["Data"]:
                assert "WorkflowParams" in body["Data"]
                workflow_params = body["Data"]["WorkflowParams"]

                assert "OrchestrationPattern" in workflow_params
                assert workflow_params["OrchestrationPattern"] == "agents-as-tools"

                assert "AgentsCount" in workflow_params
                assert workflow_params["AgentsCount"] == 2
                assert "Agents" in workflow_params
                assert len(workflow_params["Agents"]) == 2
                for agent in workflow_params["Agents"]:
                    assert "Type" in agent
                    assert agent["Type"] == "AgentBuilder"

                assert "MemoryConfig" in workflow_params
                assert workflow_params["MemoryConfig"]["LongTermEnabled"] == False

                assert "SystemPrompt" not in workflow_params
                assert "AgentsAsToolsParams" not in workflow_params

                assert body["Data"]["UseCaseType"] == "Workflow"


@mock_aws
@freeze_time("2000-01-01T00:00:00")
@pytest.mark.parametrize("requestType", ["Create", "Update"])
def test_sending_metric_with_provisioned_concurrency(mock_lambda_context, requestType, setup_config_ddb, llm_config_value_with_provisioned_concurrency):
    event = {
        "RequestType": requestType,
        "ResponseURL": "https://fakeurl/doesnotexist",
        "StackId": "arn:aws:cloudformation:us-east-1:123456789012:stack/teststack/51af3dc0-da77-11e4-872e-1234567db123",
        "RequestId": "5d478078-13e9-baf0-464a-7ef285ecc786",
        "LogicalResourceId": "MyTestResource",
        "ResourceType": "AWS::CloudFormation::CustomResource",
        RESOURCE_PROPERTIES: {
            RESOURCE: operation_types.METRIC,
            "SolutionId": "SO0999",
            "Version": "v9.9.9",
            "ServiceToken": "arn:aws:lambda:us-east-1:123456789012:function:fakefunction:1",
            USE_CASE_CONFIG_TABLE_NAME: "fake_ddb_table",
            USE_CASE_CONFIG_RECORD_KEY: "fake_ddb_table_hash_key_10",
            UUID: "fakeuuid",
        },
    }

    with mock.patch("cfn_response.http") as cfn_mocked_PoolManager:
        with mock.patch("utils.metrics.http") as metrics_mocked_PoolManager:
            execute(event, mock_lambda_context)
            call_kwargs = metrics_mocked_PoolManager.request.call_args.kwargs
            assert call_kwargs["method"] == "POST"
            assert call_kwargs["url"] == METRICS_ENDPOINT
            body = json.loads(call_kwargs["body"])
            assert body["Solution"] == "SO0999"
            assert body.get("UUID") == "fakeuuid"
            if body["Data"]:
                assert body["Data"]["ProvisionedConcurrencyValue"] == 10
