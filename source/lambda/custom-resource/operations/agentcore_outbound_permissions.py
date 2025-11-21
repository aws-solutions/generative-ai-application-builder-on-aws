#!/usr/bin/env python
# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

from typing import List
import uuid

from aws_lambda_powertools import Logger, Tracer
from cfn_response import send_response
from operations import operation_types
from utils.auth_manager import AuthManager
from operations.operation_types import FAILED, PHYSICAL_RESOURCE_ID, RESOURCE, RESOURCE_PROPERTIES, SUCCESS

from utils.lambda_context_parser import get_invocation_account_id

from helper import get_service_resource
from utils.constants import (
    USE_CASE_CONFIG_RECORD_CONFIG_ATTRIBUTE_NAME,
    USE_CASE_CONFIG_RECORD_KEY,
    USE_CASE_CONFIG_RECORD_KEY_ATTRIBUTE_NAME,
    USE_CASE_CONFIG_TABLE_NAME,
)
from utils.data import MCPServerData

logger = Logger(utc=True)
tracer = Tracer()

# Required keys in the incoming event object
USE_CASE_ID = "USE_CASE_ID"
USE_CASE_CLIENT_ID = "USE_CASE_CLIENT_ID"

# Config keys
AGENT_BUILDER_PARAMS = "AgentBuilderParams"
MCP_SERVERS = "MCPServers"
WORKFLOW_PARAMS = "WorkflowParams"
AGENTS_AS_TOOLS_PARAMS = "AgentsAsToolsParams"
AGENTS = "Agents"

# other constants
OPERATION_TYPE = operation_types.AGENTCORE_OUTBOUND_PERMISSIONS


@tracer.capture_method
def verify_env_setup(event):
    """Verifies if all necessary properties are correctly set in the event object.

    Args:
        event (LambdaEvent): Event received by the lambda function handler

    Raises:
        ValueError: If any required properties are missing or invalid
    """
    if event[RESOURCE_PROPERTIES][RESOURCE] != OPERATION_TYPE:
        err_msg = f"Operation type not available or did not match from the request. Expecting operation type to be {OPERATION_TYPE}"
        logger.error(err_msg)
        raise ValueError(err_msg)

    required_fields = [USE_CASE_ID, USE_CASE_CLIENT_ID, USE_CASE_CONFIG_TABLE_NAME, USE_CASE_CONFIG_RECORD_KEY]
    for field in required_fields:
        if event[RESOURCE_PROPERTIES].get(field, None) in ["", None]:
            err_msg = f"{field} has not been passed. Hence operation cannot be performed"
            logger.error(err_msg)
            raise ValueError(err_msg)


def _extract_properties(event):
    """Extract common properties from event."""
    return (
        event[RESOURCE_PROPERTIES][USE_CASE_ID],
        event[RESOURCE_PROPERTIES][USE_CASE_CLIENT_ID],
        event[RESOURCE_PROPERTIES][USE_CASE_CONFIG_TABLE_NAME],
        event[RESOURCE_PROPERTIES][USE_CASE_CONFIG_RECORD_KEY],
    )


def _manage_permissions(auth_manager, mcp_servers: List[MCPServerData], operation):
    """Manage permissions for a list of MCP server IDs.

    Args:
        auth_manager: AuthManager instance
        use_case_id: Use case identifier
        mcp_server_ids: List of MCP server IDs
        operation: 'add' or 'remove'

    Returns:
        List of processed MCP server IDs
    """
    processed = []
    for mcp_server in mcp_servers:
        if operation == "add":
            auth_manager.add_permission(mcp_server)
        elif operation == "remove":
            auth_manager.remove_permission(mcp_server)
        processed.append(mcp_server.agentcore_id)
    return processed


@tracer.capture_method
def create(event, context):
    """Creates outbound permissions for AgentCore MCP servers.

    Args:
        event (LambdaEvent): Event object from lambda handler
        context (LambdaContext): Context object from lambda handler

    Returns:
        list: List of added MCP server IDs
    """
    use_case_id, client_id, use_case_config_table_name, use_case_config_record_key = _extract_properties(event)

    auth_manager = AuthManager(client_id, use_case_id)
    mcp_servers = get_mcp_servers(use_case_config_table_name, use_case_config_record_key, context)
    added_permissions = _manage_permissions(auth_manager, mcp_servers, "add")

    return added_permissions


@tracer.capture_method
def update(event, context):
    """Updates outbound permissions for AgentCore MCP servers.

    Args:
        event (LambdaEvent): Event object from lambda handler
        context (LambdaContext): Context object from lambda handler

    Returns:
        tuple: (added_permissions, removed_permissions)
    """
    use_case_id, client_id, use_case_config_table_name, use_case_config_record_key = _extract_properties(event)

    # Get current MCP servers from config
    current_mcp_servers = get_mcp_servers(use_case_config_table_name, use_case_config_record_key, context)

    # Get old MCP servers from old config
    old_properties = event.get("OldResourceProperties", {})
    if not old_properties:
        raise ValueError("OldResourceProperties not found in update event")

    old_config_key = old_properties.get(USE_CASE_CONFIG_RECORD_KEY)
    old_config_table = old_properties.get(USE_CASE_CONFIG_TABLE_NAME)

    if not old_config_key or not old_config_table:
        raise ValueError("Old config key or table name not found in OldResourceProperties")

    old_mcp_servers = get_mcp_servers(old_config_table, old_config_key, context)

    # Calculate differences by comparing agentcore_ids
    current_ids = {server.agentcore_id for server in current_mcp_servers}
    old_ids = {server.agentcore_id for server in old_mcp_servers}

    new_servers = [server for server in current_mcp_servers if server.agentcore_id not in old_ids]
    removed_servers = [server for server in old_mcp_servers if server.agentcore_id not in current_ids]

    auth_manager = AuthManager(client_id, use_case_id)

    # Add new permissions
    added_permissions = _manage_permissions(auth_manager, new_servers, "add")

    # Remove old permissions
    removed_permissions = _manage_permissions(auth_manager, removed_servers, "remove")

    return added_permissions, removed_permissions


@tracer.capture_method
def delete(event, context):
    """Deletes outbound permissions for AgentCore MCP servers.

    Args:
        event (LambdaEvent): Event object from lambda handler
        context (LambdaContext): Context object from lambda handler

    Returns:
        list: List of removed MCP server IDs
    """
    use_case_id, client_id, use_case_config_table_name, use_case_config_record_key = _extract_properties(event)

    auth_manager = AuthManager(client_id, use_case_id)
    mcp_servers = get_mcp_servers(use_case_config_table_name, use_case_config_record_key, context)
    removed_permissions = _manage_permissions(auth_manager, mcp_servers, "remove")

    return removed_permissions


@tracer.capture_method
def execute(event, context):
    """Manages AgentCore outbound permissions based on CloudFormation request type.

    Args:
        event (LambdaEvent): Event object from lambda handler
        context (LambdaContext): Context object from lambda handler
    """
    physical_resource_id = event.get(PHYSICAL_RESOURCE_ID, uuid.uuid4().hex[:8])
    try:
        verify_env_setup(event)

        added, removed = [], []

        if event["RequestType"] == "Create":
            added = create(event, context)
        elif event["RequestType"] == "Update":
            added, removed = update(event, context)
        elif event["RequestType"] == "Delete":
            removed = delete(event, context)
        else:
            logger.info(f"Operation type {event['RequestType']} is a no-op operation.")
            send_response(event, context, FAILED, {}, physical_resource_id)
            return

        response = {"Added": added, "Removed": removed}
        send_response(event, context, SUCCESS, response, physical_resource_id)

    except Exception as ex:
        logger.error(f"Error occurred when managing outbound permissions. Error is {ex}")
        send_response(event, context, FAILED, {}, physical_resource_id=physical_resource_id, reason=str(ex))


@tracer.capture_method
def get_usecase_config(table_name: str, key: str) -> dict:
    ddb_resource = get_service_resource("dynamodb")
    config_table = ddb_resource.Table(table_name)
    usecase_config = (
        config_table.get_item(
            Key={USE_CASE_CONFIG_RECORD_KEY_ATTRIBUTE_NAME: key},
        )
        .get("Item", {})
        .get(USE_CASE_CONFIG_RECORD_CONFIG_ATTRIBUTE_NAME)
    )

    if usecase_config is None:
        raise ValueError(f"No record found in the table {table_name} for the key {key}")

    return usecase_config


@tracer.capture_method
def get_mcp_servers(table_name: str, key: str, context) -> list[MCPServerData]:
    config = get_usecase_config(table_name, key)
    account_id = get_invocation_account_id(context)

    all_mcp_servers = []

    # Check for AgentBuilder use case - MCP servers directly in AgentBuilderParams
    agent_builder_mcp_configs = config.get(AGENT_BUILDER_PARAMS, {}).get(MCP_SERVERS, [])
    if agent_builder_mcp_configs:
        for mcp_config in agent_builder_mcp_configs:
            all_mcp_servers.append(
                MCPServerData(
                    type=mcp_config.get("Type"),
                    url=mcp_config.get("Url"),
                    use_case_id=mcp_config.get("UseCaseId"),
                    use_case_name=mcp_config.get("UseCaseName"),
                    account_id=account_id,
                )
            )

    # Check for Workflow use case - MCP servers nested in agents
    workflow_params = config.get("WorkflowParams", {})
    agents_as_tools = workflow_params.get("AgentsAsToolsParams", {})
    agents = agents_as_tools.get("Agents", [])

    for agent in agents:
        agent_mcp_configs = agent.get(AGENT_BUILDER_PARAMS, {}).get(MCP_SERVERS, [])
        if agent_mcp_configs:
            for mcp_config in agent_mcp_configs:
                all_mcp_servers.append(
                    MCPServerData(
                        type=mcp_config.get("Type"),
                        url=mcp_config.get("Url"),
                        use_case_id=mcp_config.get("UseCaseId"),
                        use_case_name=mcp_config.get("UseCaseName"),
                        account_id=account_id,
                    )
                )

    return all_mcp_servers
