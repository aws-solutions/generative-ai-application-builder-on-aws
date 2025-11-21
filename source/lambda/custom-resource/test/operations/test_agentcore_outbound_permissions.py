#!/usr/bin/env python
# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

import pytest
from unittest.mock import Mock, patch
from operations.agentcore_outbound_permissions import (
    execute,
    verify_env_setup,
    create,
    update,
    delete,
    _extract_properties,
    _manage_permissions,
    get_usecase_config,
    get_mcp_servers,
)
from operations.operation_types import RESOURCE_PROPERTIES
from test.fixtures.agentcore_outbound_permissions_events import lambda_event
from utils.data import MCPServerData
from utils.constants import EntityType


class TestAgentcoreOutboundPermissions:
    def test_verify_env_setup_success(self, lambda_event):
        verify_env_setup(lambda_event)

    def test_verify_env_setup_missing_use_case_id(self, lambda_event):
        lambda_event[RESOURCE_PROPERTIES]["USE_CASE_ID"] = ""
        with pytest.raises(ValueError, match="USE_CASE_ID has not been passed"):
            verify_env_setup(lambda_event)

    def test_verify_env_setup_missing_client_id(self, lambda_event):
        lambda_event[RESOURCE_PROPERTIES]["USE_CASE_CLIENT_ID"] = ""
        with pytest.raises(ValueError, match="USE_CASE_CLIENT_ID has not been passed"):
            verify_env_setup(lambda_event)

    def test_extract_properties(self, lambda_event):
        use_case_id, client_id, table_name, record_key = _extract_properties(lambda_event)
        assert use_case_id == "test-use-case-123"
        assert client_id == "fake-client-id"
        assert table_name == "fake-table-name"
        assert record_key == "fake-record-key"

    def test_manage_permissions_add(self):
        mock_auth_manager = Mock()
        mcp_servers = [
            MCPServerData(
                EntityType.RUNTIME.value,
                "arn:aws:bedrock-agentcore:us-east-1:123456789012:runtime/test-runtime/invocations",
                "use-case-1",
                "name-1",
                "123456789012",
            ),
            MCPServerData(
                EntityType.GATEWAY.value,
                "https://test.gateway.bedrock-agentcore.us-east-1",
                "use-case-2",
                "name-2",
                "123456789012",
            ),
        ]

        result = _manage_permissions(mock_auth_manager, mcp_servers, "add")

        assert len(result) == 2
        assert mock_auth_manager.add_permission.call_count == 2

    def test_manage_permissions_remove(self):
        mock_auth_manager = Mock()
        mcp_servers = [
            MCPServerData(
                EntityType.RUNTIME.value,
                "arn:aws:bedrock-agentcore:us-east-1:123456789012:runtime/test-runtime/invocations",
                "use-case-1",
                "name-1",
                "123456789012",
            )
        ]

        result = _manage_permissions(mock_auth_manager, mcp_servers, "remove")

        assert len(result) == 1
        mock_auth_manager.remove_permission.assert_called_once()

    @patch("operations.agentcore_outbound_permissions.get_mcp_servers")
    @patch("operations.agentcore_outbound_permissions.AuthManager")
    def test_create(self, mock_auth_manager_class, mock_get_mcp_servers, lambda_event):
        mock_auth_manager = Mock()
        mock_auth_manager_class.return_value = mock_auth_manager
        mock_mcp_servers = [Mock()]
        mock_mcp_servers[0].agentcore_id = "test-id"
        mock_get_mcp_servers.return_value = mock_mcp_servers

        result = create(lambda_event, Mock())

        assert result == ["test-id"]
        mock_auth_manager.add_permission.assert_called_once()

    @patch("operations.agentcore_outbound_permissions.get_mcp_servers")
    @patch("operations.agentcore_outbound_permissions.AuthManager")
    def test_update(self, mock_auth_manager_class, mock_get_mcp_servers, lambda_event):
        lambda_event["OldResourceProperties"] = {
            "USE_CASE_CONFIG_RECORD_KEY": "old-key",
            "USE_CASE_CONFIG_TABLE_NAME": "old-table",
        }

        mock_auth_manager = Mock()
        mock_auth_manager_class.return_value = mock_auth_manager

        # Mock current and old servers
        current_server = Mock()
        current_server.agentcore_id = "current-id"
        old_server = Mock()
        old_server.agentcore_id = "old-id"

        mock_get_mcp_servers.side_effect = [[current_server], [old_server]]

        added, removed = update(lambda_event, Mock())

        assert added == ["current-id"]
        assert removed == ["old-id"]

    @patch("operations.agentcore_outbound_permissions.get_mcp_servers")
    @patch("operations.agentcore_outbound_permissions.AuthManager")
    def test_delete(self, mock_auth_manager_class, mock_get_mcp_servers, lambda_event):
        mock_auth_manager = Mock()
        mock_auth_manager_class.return_value = mock_auth_manager
        mock_mcp_servers = [Mock()]
        mock_mcp_servers[0].agentcore_id = "test-id"
        mock_get_mcp_servers.return_value = mock_mcp_servers

        result = delete(lambda_event, Mock())

        assert result == ["test-id"]
        mock_auth_manager.remove_permission.assert_called_once()

    @patch("operations.agentcore_outbound_permissions.get_service_resource")
    def test_get_usecase_config(self, mock_get_service_resource):
        mock_table = Mock()
        mock_get_service_resource.return_value.Table.return_value = mock_table
        mock_table.get_item.return_value = {"Item": {"config": {"test": "data"}}}

        result = get_usecase_config("test-table", "test-key")

        assert result == {"test": "data"}

    @patch("operations.agentcore_outbound_permissions.get_usecase_config")
    @patch("operations.agentcore_outbound_permissions.get_invocation_account_id")
    def test_get_mcp_servers_agent_builder(self, mock_get_account_id, mock_get_config):
        mock_get_account_id.return_value = "123456789012"
        mock_get_config.return_value = {
            "AgentBuilderParams": {
                "MCPServers": [
                    {
                        "Type": "runtime",
                        "Url": "arn:aws:bedrock-agentcore:us-east-1:123456789012:runtime/test-runtime/invocations",
                        "UseCaseId": "test-use-case",
                        "UseCaseName": "test-name",
                    }
                ]
            }
        }

        result = get_mcp_servers("test-table", "test-key", Mock())

        assert len(result) == 1
        assert result[0].type == "runtime"
        assert result[0].use_case_id == "test-use-case"

    @patch("operations.agentcore_outbound_permissions.get_usecase_config")
    @patch("operations.agentcore_outbound_permissions.get_invocation_account_id")
    def test_get_mcp_servers_workflow(self, mock_get_account_id, mock_get_config):
        mock_get_account_id.return_value = "123456789012"
        mock_get_config.return_value = {
            "WorkflowParams": {
                "AgentsAsToolsParams": {
                    "Agents": [
                        {
                            "UseCaseId": "agent-1",
                            "UseCaseName": "Agent 1",
                            "AgentBuilderParams": {
                                "MCPServers": [
                                    {
                                        "Type": "gateway",
                                        "Url": "https://gaab-mcp-c8ed4e33-eipz5dmpyt.gateway.bedrock-agentcore.us-east-1.amazonaws.com/mcp",
                                        "UseCaseId": "mcp-use-case-1",
                                        "UseCaseName": "MCP Server 1",
                                    }
                                ]
                            },
                        },
                        {
                            "UseCaseId": "agent-2",
                            "UseCaseName": "Agent 2",
                            "AgentBuilderParams": {
                                "MCPServers": [
                                    {
                                        "Type": "runtime",
                                        "Url": "https://bedrock-agentcore.us-east-1.amazonaws.com/runtimes/arn%3Aaws%3Abedrock-agentcore%3Aus-east-1%3A123456789012%3Aruntime%2Ftest-runtime/invocations?qualifier=DEFAULT",
                                        "UseCaseId": "mcp-use-case-2",
                                        "UseCaseName": "MCP Server 2",
                                    }
                                ]
                            },
                        },
                    ]
                }
            }
        }

        result = get_mcp_servers("test-table", "test-key", Mock())

        assert len(result) == 2
        assert result[0].type == "gateway"
        assert result[0].use_case_id == "mcp-use-case-1"
        assert result[1].type == "runtime"
        assert result[1].use_case_id == "mcp-use-case-2"

    @patch("operations.agentcore_outbound_permissions.get_usecase_config")
    @patch("operations.agentcore_outbound_permissions.get_invocation_account_id")
    def test_get_mcp_servers_workflow_mixed(self, mock_get_account_id, mock_get_config):
        """Test workflow with agents that have and don't have MCP servers"""
        mock_get_account_id.return_value = "123456789012"
        mock_get_config.return_value = {
            "WorkflowParams": {
                "AgentsAsToolsParams": {
                    "Agents": [
                        {
                            "UseCaseId": "agent-1",
                            "UseCaseName": "Agent 1",
                            "AgentBuilderParams": {
                                "MCPServers": [
                                    {
                                        "Type": "gateway",
                                        "Url": "https://gaab-mcp-89e05838-b8anlovrme.gateway.bedrock-agentcore.us-east-1.amazonaws.com/mcp",
                                        "UseCaseId": "mcp-use-case-1",
                                        "UseCaseName": "MCP Server 1",
                                    }
                                ]
                            },
                        },
                        {
                            "UseCaseId": "agent-2",
                            "UseCaseName": "Agent 2",
                            "AgentBuilderParams": {"Tools": [{"ToolId": "calculator"}]},
                        },
                    ]
                }
            }
        }

        result = get_mcp_servers("test-table", "test-key", Mock())

        assert len(result) == 1
        assert result[0].type == "gateway"
        assert result[0].use_case_id == "mcp-use-case-1"

    @patch("operations.agentcore_outbound_permissions.get_usecase_config")
    @patch("operations.agentcore_outbound_permissions.get_invocation_account_id")
    def test_get_mcp_servers_empty_workflow(self, mock_get_account_id, mock_get_config):
        """Test workflow with no MCP servers"""
        mock_get_account_id.return_value = "123456789012"
        mock_get_config.return_value = {"WorkflowParams": {"AgentsAsToolsParams": {"Agents": []}}}

        result = get_mcp_servers("test-table", "test-key", Mock())

        assert len(result) == 0

    @patch("operations.agentcore_outbound_permissions.send_response")
    @patch("operations.agentcore_outbound_permissions.create")
    def test_execute_create(self, mock_create, mock_send_response, lambda_event):
        lambda_event["RequestType"] = "Create"
        mock_create.return_value = ["test-id"]

        execute(lambda_event, Mock())

        mock_send_response.assert_called_once()
        args = mock_send_response.call_args[0]
        assert args[2] == "SUCCESS"
        assert args[3] == {"Added": ["test-id"], "Removed": []}

    @patch("operations.agentcore_outbound_permissions.send_response")
    @patch("operations.agentcore_outbound_permissions.update")
    def test_execute_update(self, mock_update, mock_send_response, lambda_event):
        lambda_event["RequestType"] = "Update"
        mock_update.return_value = (["added-id"], ["removed-id"])

        execute(lambda_event, Mock())

        mock_send_response.assert_called_once()
        args = mock_send_response.call_args[0]
        assert args[2] == "SUCCESS"
        assert args[3] == {"Added": ["added-id"], "Removed": ["removed-id"]}

    @patch("operations.agentcore_outbound_permissions.send_response")
    @patch("operations.agentcore_outbound_permissions.delete")
    def test_execute_delete(self, mock_delete, mock_send_response, lambda_event):
        lambda_event["RequestType"] = "Delete"
        mock_delete.return_value = ["removed-id"]

        execute(lambda_event, Mock())

        mock_send_response.assert_called_once()
        args = mock_send_response.call_args[0]
        assert args[2] == "SUCCESS"
        assert args[3] == {"Added": [], "Removed": ["removed-id"]}
