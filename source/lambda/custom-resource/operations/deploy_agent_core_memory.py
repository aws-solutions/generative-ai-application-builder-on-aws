#!/usr/bin/env python
# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

from aws_lambda_powertools import Logger
from botocore.exceptions import ClientError
from cfn_response import send_response
from operations.operation_types import FAILED, RESOURCE_PROPERTIES, SUCCESS
from operations.shared import retry_with_backoff
from utils.agent_core_utils import format_error_message, handle_client_error, validate_event_properties, initialize_bedrock_client
from helper import get_service_client

logger = Logger(utc=True)


def _extract_resource_properties(resource_properties):
    """Extract and validate required resource properties."""
    try:
        return {
            "agent_runtime_name": resource_properties["AgentRuntimeName"],
            "enable_long_term_memory": resource_properties.get("EnableLongTermMemory", "No"),
        }
    except KeyError as e:
        missing_param = str(e).strip("'")
        error_msg = f"Missing required parameter: {missing_param}"
        logger.error(error_msg)
        raise ValueError(error_msg)


def execute(event, context):
    """
    Deploy AgentCore Memory using the bedrock-agentcore service.

    Args:
        event: CloudFormation custom resource event
        context: Lambda context object
    """
    physical_resource_id = None
    operation_context = {}

    try:
        resource_properties = event.get(RESOURCE_PROPERTIES, {})
        request_type = event.get("RequestType", "Unknown")
        agent_runtime_name = resource_properties.get("AgentRuntimeName", "unknown")
        
        # For update/delete operations, get memory ID from physical resource ID
        existing_memory_id = event.get("PhysicalResourceId") if request_type in ["Update", "Delete"] else None
        physical_resource_id = existing_memory_id or f"agent-memory-{agent_runtime_name}"

        operation_context = {
            "request_type": request_type,
            "agent_runtime_name": agent_runtime_name,
            "physical_resource_id": physical_resource_id,
            "existing_memory_id": existing_memory_id,
        }

        logger.info(f"AgentCore Memory deployment operation - Request Type: {request_type}")
        logger.info(f"Resource Properties: {resource_properties}")

        validate_event_properties(event)
        props = _extract_resource_properties(resource_properties)
        operation_context.update(props)

        initialize_bedrock_client()
        memory_strategy_id = None
        if request_type == "Create":
            memory_id, memory_strategy_id = _handle_create_request(props)
            physical_resource_id = memory_id
        elif request_type == "Update":
            memory_id, memory_strategy_id = _handle_update_request(props, existing_memory_id)
            physical_resource_id = memory_id
        elif request_type == "Delete":
            memory_id = _handle_delete_request(existing_memory_id)
        else:
            error_msg = f"Unknown CloudFormation request type: {request_type}. Expected Create, Update, or Delete."
            logger.error(error_msg)
            raise ValueError(error_msg)

        response_data = {
            "MemoryId": memory_id,
            "MemoryStrategyId": memory_strategy_id if memory_strategy_id else ""
        }

        logger.info(f"Returning success response with data: {response_data}")
        send_response(event, context, SUCCESS, response_data, physical_resource_id)

    except ValueError as ve:
        error_msg = f"Configuration Error: {str(ve)}"
        logger.error(error_msg, extra={"operation_context": operation_context})
        physical_resource_id = physical_resource_id or f"agent-memory-{operation_context.get('agent_runtime_name', 'unknown')}"
        send_response(event, context, FAILED, {}, physical_resource_id, reason=error_msg)

    except ClientError as ce:
        error_code = ce.response["Error"]["Code"]
        error_message = ce.response["Error"]["Message"]
        detailed_message = f"Failed to deploy AgentCore memory: {error_code} - {error_message}"

        physical_resource_id = physical_resource_id or f"agent-memory-{operation_context.get('agent_runtime_name', 'unknown')}"
        send_response(event, context, FAILED, {}, physical_resource_id, reason=detailed_message)

    except Exception as ex:
        error_msg = f"Unexpected error in deploy_agent_core_memory operation: {str(ex)}"
        logger.error(error_msg, extra={"operation_context": operation_context, "exception_type": type(ex).__name__})
        physical_resource_id = physical_resource_id or f"agent-memory-{operation_context.get('agent_runtime_name', 'unknown')}"
        send_response(event, context, FAILED, {}, physical_resource_id, reason=f"Unexpected Error: {str(ex)}")


def _handle_create_request(props):
    """Handle CloudFormation Create request."""
    logger.info(f"Creating AgentCore Memory '{props['agent_runtime_name']}'")
    logger.info(f"Memory settings - Enable: {props['enable_long_term_memory']}")

    memory_id, memory_strategy_id = retry_with_backoff(
        create_memory_configuration, props["enable_long_term_memory"], props["agent_runtime_name"]
    )
    
    return memory_id, memory_strategy_id


def _handle_update_request(props, memory_id):
    """Handle CloudFormation Update request."""
    logger.info(f"Updating AgentCore Memory '{memory_id}'")
    logger.info(f"Memory settings - Enable: {props['enable_long_term_memory']}")

    memory_strategy_id = retry_with_backoff(
        update_memory_configuration, memory_id, props["enable_long_term_memory"]
    )
    
    return memory_id, memory_strategy_id


def _handle_delete_request(memory_id):
    """Handle CloudFormation Delete request."""
    if memory_id and not memory_id.startswith("agent-memory-"):
        logger.info(f"Deleting AgentCore Memory '{memory_id}'")
        retry_with_backoff(delete_memory_configuration, memory_id)
    else:
        logger.info("No valid memory ID found for deletion")
    
    return ""


def create_memory_configuration(enable_long_term_memory: str, memory_name: str):
    """
    Create memory configuration for AgentCore using bedrock-agentcore create_memory API.

    Args:
        enable_long_term_memory: "Yes" or "No" to enable long-term memory
        memory_name: Name for the memory configuration

    Returns:
        str: Memory ID

    Raises:
        ClientError: If bedrock-agentcore API call fails
        ValueError: If parameters are invalid
    """

    try:
        bedrock_agentcore_client = get_service_client("bedrock-agentcore-control")

        memory_request = {
            "name": memory_name,
            "eventExpiryDuration": 90,
        }

        if enable_long_term_memory == "Yes":
            logger.info("Creating memory with semanticMemoryStrategy")
            memory_request["memoryStrategies"] = [
                {"semanticMemoryStrategy": {"name": f"{memory_name}_semantic"}}
            ]
        else:
            logger.info("Creating memory without memory strategies")

        logger.info(f"Creating memory: {memory_request}")

        response = bedrock_agentcore_client.create_memory(**memory_request)

        memory_id = response.get("memory").get("id")
        memory_strategy_id = next((strategy.get("strategyId") for strategy in response.get("memory", {}).get("strategies", []) if strategy.get("type") == "SEMANTIC"), None)
        if not memory_id:
            raise ValueError("Memory creation succeeded but no ID returned")

        logger.info(f"Memory creation initiated with ID: {memory_id}, waiting for completion...")

        try:
            waiter = bedrock_agentcore_client.get_waiter("memory_created")
            waiter.wait(
                memoryId=memory_id,
                WaiterConfig={
                    "Delay": 5,
                    "MaxAttempts": 60,
                },
            )
            logger.info(f"Successfully created and verified memory with ID: {memory_id}")
        except Exception as waiter_error:
            logger.warning(f"Memory waiter failed, but memory creation may have succeeded: {str(waiter_error)}")

        return memory_id, memory_strategy_id

    except ClientError as e:
        logger.error(f"Failed to create memory: {e.response['Error']['Code']} - {e.response['Error']['Message']}")
        raise
    except ValueError as e:
        logger.error(f"Parameter validation failed for memory creation: {str(e)}")
        raise
    except Exception as e:
        logger.error(f"Unexpected error creating memory configuration: {str(e)}")
        raise


def update_memory_configuration(memory_id: str, enable_long_term_memory: str):
    """
    Update existing memory configuration using bedrock-agentcore update_memory API.

    Args:
        memory_id: ID of the existing memory configuration to update
        enable_long_term_memory: "Yes" or "No" to enable long-term memory

    Raises:
        ClientError: If bedrock-agentcore API call fails
        ValueError: If parameters are invalid
    """
    try:
        bedrock_agentcore_client = get_service_client("bedrock-agentcore-control")
        
        # Get current memory configuration
        describe_response = bedrock_agentcore_client.get_memory(memoryId=memory_id)
        current_strategies = describe_response.get("memory", {}).get("strategies", [])
        
        memory_update_request = {"memoryId": memory_id, "memoryStrategies": {}}
        should_update = False
        memory_strategy_id = None
        if enable_long_term_memory == "Yes":
            # Add semantic memory strategy if not exists
            memory_strategy_id = next((strategy.get("strategyId") for strategy in current_strategies if strategy.get("type") == "SEMANTIC"), None)

            if not memory_strategy_id:
                memory_update_request["memoryStrategies"]["addMemoryStrategies"] = [
                    {"semanticMemoryStrategy": {"name": "semantic_memory"}}
                ]
                should_update = True
        else:
            # Remove semantic memory strategies
            semantic_strategy_ids = [
                {"memoryStrategyId": strategy.get("strategyId")}
                for strategy in current_strategies
                if strategy.get("type") == "SEMANTIC" and strategy.get("strategyId")
            ]
            if semantic_strategy_ids:
                memory_update_request["memoryStrategies"]["deleteMemoryStrategies"] = semantic_strategy_ids
                should_update = True

        if should_update:
            response = bedrock_agentcore_client.update_memory(**memory_update_request)
            memory_strategy_id = next((strategy.get("strategyId") for strategy in response.get("memory", {}).get("strategies", []) if strategy.get("type") == "SEMANTIC"), None)
            logger.info(f"Successfully updated memory configuration: {memory_id}")
        return memory_strategy_id

    except ClientError as e:
        logger.error(f"Failed to update memory: {e.response['Error']['Code']} - {e.response['Error']['Message']}")
        raise
    except Exception as e:
        logger.error(f"Unexpected error updating memory configuration: {str(e)}")
        raise


def delete_memory_configuration(memory_id: str):
    """
    Delete memory configuration using bedrock-agentcore delete_memory API.

    Args:
        memory_id: ID of the memory configuration to delete

    Raises:
        ClientError: If bedrock-agentcore API call fails
    """
    try:
        bedrock_agentcore_client = get_service_client("bedrock-agentcore-control")
        response = bedrock_agentcore_client.delete_memory(memoryId=memory_id)
        logger.info(response)
        logger.info(f"Successfully initiated deletion of memory configuration: {memory_id}")

    except ClientError as e:
        if e.response["Error"]["Code"] == "ResourceNotFoundException":
            logger.warning(f"Memory configuration '{memory_id}' not found, may already be deleted")
        else:
            logger.error(f"Failed to delete memory: {e.response['Error']['Code']} - {e.response['Error']['Message']}")
            raise
    except Exception as e:
        logger.error(f"Unexpected error deleting memory configuration: {str(e)}")
        raise

