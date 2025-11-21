#!/usr/bin/env python
# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

import os
import re
from typing import Optional

from aws_lambda_powertools import Logger
from botocore.exceptions import ClientError
from cfn_response import send_response
from helper import get_service_client
from operations.operation_types import FAILED, RESOURCE_PROPERTIES, SUCCESS
from operations.shared import retry_with_backoff
from utils.agent_core_utils import (
    format_error_message,
    handle_client_error,
    initialize_bedrock_client,
    validate_event_properties,
)
from utils.constants import AGENTCORE_RUNTIME_IDLE_TIMEOUT_SECONDS


logger = Logger(utc=True)


def _ensure_ecr_image_exists(image_uri: str):
    """
    Ensure ECR image exists for AgentCore SDK validation.
    Triggers pull-through cache if image doesn't exist.

    Raises:
        ValueError: If image URI format is invalid
        ClientError: If ECR operations fail and image cannot be pulled
    """
    operation_context = {"image_uri": image_uri}

    # Parse ECR URI format: account.dkr.ecr.region.amazonaws.com/repo:tag
    match = re.match(r'(\d+)\.dkr\.ecr\.([^.]+)\.amazonaws\.com/(.+?)(?::(.+))?$', image_uri)
    if not match:
        error_msg = f"Invalid ECR URI format: {image_uri}"
        logger.error(error_msg)
        raise ValueError(error_msg)

    registry_id, region, repository_name, tag = match.groups()
    operation_context.update({"registry_id": registry_id, "region": region, "repository_name": repository_name})

    logger.info(f"Ensuring ECR image exists: {image_uri}")
    ecr_client = get_service_client("ecr", region_name=region)

    # Default to 'latest' tag if none specified (ECR standard behavior)
    image_tag = tag or "latest"
    logger.info(f"Using image tag: {image_tag}")
    ecr_params = {
        "registryId": registry_id,
        "repositoryName": repository_name,
        "imageIds": [{'imageTag': image_tag}]
    }

    try:
        # Check if image already exists
        ecr_client.describe_images(**ecr_params)
        logger.info(f"ECR image {image_uri} already exists")
    except ClientError as e:
        if e.response["Error"]["Code"] in ["RepositoryNotFoundException", "ImageNotFoundException"]:
            logger.info(f"ECR image {image_uri} does not exist, triggering pull-through cache")
            try:
                # Trigger pull-through cache
                ecr_client.batch_get_image(**ecr_params)
            except ClientError as e:
                handle_client_error(e, "batch_get_image", operation_context)

            # Wait for image to be available (up to ~2.5 minutes)
            retry_with_backoff(ecr_client.describe_images, max_attempts=10, base_delay=2, **ecr_params)
            logger.info(f"Successfully pulled image via pull-through cache: {image_uri}")
        else:
            handle_client_error(e, "describe_images", operation_context)
            raise


def _extract_resource_properties(resource_properties):
    """Extract and validate required resource properties."""
    try:
        multimodal_data_metadata_table = resource_properties.get("MultimodalDataMetadataTable", "")
        multimodal_data_bucket = resource_properties.get("MultimodalDataBucket", "")

        # Validate that both multimodal parameters are provided together or neither is provided
        has_metadata_table = bool(multimodal_data_metadata_table)
        has_bucket = bool(multimodal_data_bucket)

        if has_metadata_table != has_bucket:
            error_msg = "Both MultimodalDataBucket and MultimodalDataMetadataTable must be provided together or neither should be provided"
            logger.error(error_msg)
            raise ValueError(error_msg)

        return {
            "agent_runtime_name": resource_properties["AgentRuntimeName"],
            "agent_image_uri": resource_properties["AgentImageUri"],
            "execution_role_arn": resource_properties["ExecutionRoleArn"],
            "use_case_config_key": resource_properties["UseCaseConfigRecordKey"],
            "use_case_config_table_name": resource_properties["UseCaseConfigTableName"],
            "use_case_uuid": resource_properties["UseCaseUUID"],
            "memory_id": resource_properties.get("MemoryId"),
            "multimodal_data_metadata_table": multimodal_data_metadata_table,
            "multimodal_data_bucket": multimodal_data_bucket,
            "memory_strategy_id": resource_properties.get("MemoryStrategyId")
        }
    except KeyError as e:
        missing_param = str(e).strip("'")
        error_msg = f"Missing required parameter: {missing_param}"
        logger.error(error_msg)
        raise ValueError(error_msg)


def _handle_create_request(props, operation_context):
    """Handle CloudFormation Create request."""
    logger.info(f"Creating AgentCore Runtime '{props['agent_runtime_name']}' with image '{props['agent_image_uri']}'")
    logger.info(f"Using execution role: {props['execution_role_arn']}")

    # Ensure ECR image exists before AgentCore validation
    _ensure_ecr_image_exists(props["agent_image_uri"])

    # Memory ID should be provided from the separate memory deployment
    memory_id = props.get("memory_id")
    if not memory_id:
        logger.warning("No memory ID provided, runtime will be created without memory configuration")

    memory_strategy_id = props.get("memory_strategy_id")

    agent_runtime_arn, agent_runtime_id = retry_with_backoff(
        create_agent_runtime,
        runtime_name=props["agent_runtime_name"],
        image_uri=props["agent_image_uri"],
        execution_role_arn=props["execution_role_arn"],
        config_table_name=props["use_case_config_table_name"],
        use_case_config_key=props["use_case_config_key"],
        use_case_uuid=props["use_case_uuid"],
        memory_id=memory_id,
        multimodal_data_metadata_table=props["multimodal_data_metadata_table"],
        multimodal_data_bucket=props["multimodal_data_bucket"],
        memory_strategy_id=memory_strategy_id,
        max_attempts=9,
        base_delay=2
    )

    operation_context["agent_runtime_id"] = agent_runtime_id
    operation_context["agent_memory_id"] = memory_id
    return agent_runtime_arn


def _handle_update_request(props, operation_context):
    """Handle CloudFormation Update request."""
    logger.info(f"Updating AgentCore Runtime '{props['agent_runtime_name']}' with image '{props['agent_image_uri']}'")
    logger.info(f"Using execution role: {props['execution_role_arn']}")

    # Ensure ECR image exists before AgentCore validation
    _ensure_ecr_image_exists(props["agent_image_uri"])

    # Memory ID should be provided from the separate memory deployment
    memory_id = props.get("memory_id")
    if not memory_id:
        logger.warning("No memory ID provided, runtime will be updated without memory configuration")

    memory_strategy_id = props.get("memory_strategy_id")

    agent_runtime_arn, agent_runtime_id = retry_with_backoff(
        update_agent_runtime,
        runtime_name=props["agent_runtime_name"],
        image_uri=props["agent_image_uri"],
        execution_role_arn=props["execution_role_arn"],
        config_table_name=props["use_case_config_table_name"],
        use_case_config_key=props["use_case_config_key"],
        use_case_uuid=props["use_case_uuid"],
        memory_id=memory_id,
        multimodal_data_metadata_table=props["multimodal_data_metadata_table"],
        multimodal_data_bucket=props["multimodal_data_bucket"],
        memory_strategy_id=memory_strategy_id,
        max_attempts=9,
        base_delay=2
    )
    operation_context["agent_runtime_id"] = agent_runtime_id
    operation_context["agent_memory_id"] = memory_id
    return agent_runtime_arn


def _handle_delete_request(props):
    """Handle CloudFormation Delete request."""
    logger.info(f"Deleting AgentCore Runtime '{props['agent_runtime_name']}'")
    retry_with_backoff(delete_agent_runtime, runtime_name=props["agent_runtime_name"])
    return ""


def execute(event, context):
    """
    Deploy AgentCore Runtime using the bedrock-agentcore service.

    Args:
        event: CloudFormation custom resource event
        context: Lambda context object
    """
    physical_resource_id = None
    operation_context = {}

    try:
        resource_properties = event.get(RESOURCE_PROPERTIES, {})
        request_type = event.get("RequestType", "Unknown")
        use_case_config_key = resource_properties.get("UseCaseConfigRecordKey", "unknown")

        operation_context = {
            "request_type": request_type,
            "use_case_config_key": use_case_config_key,
        }

        logger.info(f"AgentCore deployment operation - Request Type: {request_type}")
        logger.info(f"Resource Properties: {resource_properties}")

        validate_event_properties(event)
        props = _extract_resource_properties(resource_properties)
        operation_context.update(
            {
                "agent_runtime_name": props["agent_runtime_name"],
                "agent_image_uri": props["agent_image_uri"],
                "execution_role_arn": props["execution_role_arn"],
                "use_case_uuid": props["use_case_uuid"],
                "multimodal_data_metadata_table": props["multimodal_data_metadata_table"],
                "multimodal_data_bucket": props["multimodal_data_bucket"],
            }
        )

        initialize_bedrock_client()

        if request_type == "Create":
            agent_runtime_arn = _handle_create_request(props, operation_context)
            # Physical resource ID should be consistent throughout updates to ensure CloudFormation doesn't send a delete
            physical_resource_id = operation_context.get("agent_runtime_id")
        elif request_type == "Update":
            agent_runtime_arn = _handle_update_request(props, operation_context)
            physical_resource_id = operation_context.get("agent_runtime_id")
        elif request_type == "Delete":
            agent_runtime_arn = _handle_delete_request(props)
        else:
            error_msg = f"Unknown CloudFormation request type: {request_type}. Expected Create, Update, or Delete."
            logger.error(error_msg)
            raise ValueError(error_msg)

        response_data = {
            "AgentRuntimeArn": agent_runtime_arn,
            "AgentRuntimeName": props["agent_runtime_name"],
            "AgentRuntimeId": operation_context.get("agent_runtime_id", ""),
            "AgentMemoryId": operation_context.get("agent_memory_id", ""),
        }

        logger.info(f"Returning success response with data: {response_data}")
        send_response(event, context, SUCCESS, response_data, physical_resource_id)

    except ValueError as ve:
        error_msg = f"Configuration Error: {str(ve)}"
        logger.error(error_msg, extra={"operation_context": operation_context})
        physical_resource_id = (
            physical_resource_id or f"agent-runtime-{operation_context.get('use_case_config_key', 'unknown')}"
        )
        send_response(event, context, FAILED, {}, physical_resource_id, reason=error_msg)

    except ClientError as ce:
        try:
            handle_client_error(ce, "deploy_agent_core_main", operation_context)
        except ClientError:
            pass

        error_code = ce.response["Error"]["Code"]
        error_message = ce.response["Error"]["Message"]
        detailed_message = format_error_message(
            "deploy AgentCore runtime", error_code, error_message, operation_context
        )

        physical_resource_id = (
            physical_resource_id or f"agent-runtime-{operation_context.get('use_case_config_key', 'unknown')}"
        )
        send_response(event, context, FAILED, {}, physical_resource_id, reason=detailed_message)

    except Exception as ex:
        error_msg = f"Unexpected error in deploy_agent_core operation: {str(ex)}"
        logger.error(error_msg, extra={"operation_context": operation_context, "exception_type": type(ex).__name__})
        physical_resource_id = (
            physical_resource_id or f"agent-runtime-{operation_context.get('use_case_config_key', 'unknown')}"
        )
        send_response(event, context, FAILED, {}, physical_resource_id, reason=f"Unexpected Error: {str(ex)}")


def _build_runtime_environment_variables(
    config_table_name: str,
    use_case_config_key: str,
    use_case_uuid: str,
    memory_id: Optional[str] = None,
    multimodal_data_metadata_table: Optional[str] = None,
    multimodal_data_bucket: Optional[str] = None,
    memory_strategy_id: Optional[str] = None,
    additional_env_vars: Optional[dict] = None,
):
    """Build environment variables for runtime configuration."""
    # Extract short ID from UUID (first segment is 8 chars)
    use_case_short_id = use_case_uuid.split("-")[0]
    m2m_identity_name = f"gaab-oauth-provider-{use_case_short_id}"

    environment_variables = {
        "USE_CASE_TABLE_NAME": config_table_name,
        "USE_CASE_CONFIG_KEY": use_case_config_key,
        "USE_CASE_UUID": use_case_uuid,
        "AWS_REGION": os.getenv("AWS_REGION"),
        "M2M_IDENTITY_NAME": m2m_identity_name,
        "AWS_SDK_USER_AGENT": os.getenv("AWS_SDK_USER_AGENT", "{}"),  # pass along into runtime to attach to SDK client
    }

    if memory_id:
        environment_variables["MEMORY_ID"] = memory_id

    if memory_strategy_id:
        environment_variables["MEMORY_STRATEGY_ID"] = memory_strategy_id

    # Add multimodal data environment variables if provided
    if multimodal_data_metadata_table:
        environment_variables["MULTIMODAL_METADATA_TABLE_NAME"] = multimodal_data_metadata_table

    if multimodal_data_bucket:
        environment_variables["MULTIMODAL_DATA_BUCKET"] = multimodal_data_bucket

    # additional environment variables (for MCP runtime)
    if additional_env_vars:
        environment_variables.update(additional_env_vars)

    return environment_variables


def _build_runtime_request(runtime_name: str, image_uri: str, execution_role_arn: str, environment_variables: dict):
    """Build the runtime creation request."""
    return {
        "agentRuntimeName": runtime_name,
        "agentRuntimeArtifact": {"containerConfiguration": {"containerUri": image_uri}},
        "roleArn": execution_role_arn,
        "networkConfiguration": {"networkMode": "PUBLIC"},
        "protocolConfiguration": {"serverProtocol": "HTTP"},
        "environmentVariables": environment_variables,
        "lifecycleConfiguration": {"idleRuntimeSessionTimeout": AGENTCORE_RUNTIME_IDLE_TIMEOUT_SECONDS},
    }


def _validate_runtime_response(response):
    """Validate runtime creation response and extract ARN and ID."""
    runtime_arn = response.get("agentRuntimeArn")
    runtime_id = response.get("agentRuntimeId")

    if not runtime_arn:
        raise ValueError("Runtime creation succeeded but no ARN returned")
    if not runtime_id:
        raise ValueError("Runtime creation succeeded but no ID returned")

    return runtime_arn, runtime_id


def create_agent_runtime(
    runtime_name: str,
    image_uri: str,
    execution_role_arn: str,
    config_table_name: str,
    use_case_config_key: str,
    use_case_uuid: str,
    memory_id: str = None,
    multimodal_data_metadata_table: str = None,
    multimodal_data_bucket: str = None,
    memory_strategy_id: str = None,
    additional_env_vars: dict = None,
):
    """
    Create a new AgentCore Runtime using bedrock-agentcore CreateAgentRuntime API.

    Args:
        runtime_name: Unique name for the AgentCore Runtime
        image_uri: ECR image URI for the agent container
        execution_role_arn: IAM role ARN for runtime execution
        config_table_name: DynamoDB table name for configuration storage
        use_case_config_key: Use case identifier
        use_case_uuid: Use case UUID for generating M2M identity name
        memory_id: Memory configuration ID (required for both short and long term memory)
        multimodal_data_metadata_table: Multimodal data metadata table name
        multimodal_data_bucket: Multimodal data bucket name
        additional_env_vars: Additional environment variables to include (for MCP runtime)

    Returns:
        tuple: (AgentCore Runtime ARN, Runtime ID)

    Raises:
        ClientError: If bedrock-agentcore API call fails
        ValueError: If required parameters are missing
    """
    operation_context = {
        "runtime_name": runtime_name,
        "image_uri": image_uri,
        "execution_role_arn": execution_role_arn,
        "use_case_config_key": use_case_config_key,
        "use_case_uuid": use_case_uuid,
        "memory_id": memory_id,
        "multimodal_data_metadata_table": multimodal_data_metadata_table,
        "multimodal_data_bucket": multimodal_data_bucket,
    }

    try:
        bedrock_agentcore_client = get_service_client("bedrock-agentcore-control")

        environment_variables = _build_runtime_environment_variables(
            config_table_name,
            use_case_config_key,
            use_case_uuid,
            memory_id,
            multimodal_data_metadata_table,
            multimodal_data_bucket,
            memory_strategy_id,
            additional_env_vars,
        )
        logger.info(f"Creating AgentCore Runtime '{runtime_name}' with environment variables: {environment_variables}")

        runtime_request = _build_runtime_request(runtime_name, image_uri, execution_role_arn, environment_variables)
        logger.info(f"Creating runtime with request: {runtime_request}")
        response = bedrock_agentcore_client.create_agent_runtime(**runtime_request)
        runtime_arn, runtime_id = _validate_runtime_response(response)

        logger.info(f"Successfully created AgentCore Runtime with ARN: {runtime_arn}, ID: {runtime_id}")
        return runtime_arn, runtime_id

    except ClientError as e:
        handle_client_error(e, "create_agent_runtime", operation_context)
        raise
    except ValueError as e:
        logger.error(f"Parameter validation failed for runtime creation: {str(e)}")
        raise
    except Exception as e:
        logger.error(f"Unexpected error creating AgentCore Runtime: {str(e)}")
        raise


def _find_runtime_id_by_name(bedrock_agentcore_client, runtime_name: str):
    """Find runtime ID by runtime name."""
    # Paginate response
    list_response = bedrock_agentcore_client.list_agent_runtimes()
    while True:
        for runtime in list_response.get("agentRuntimes", []):
            if runtime.get("agentRuntimeName") == runtime_name:
                runtime_id = runtime.get("agentRuntimeId")
                logger.info(f"Found runtime ID '{runtime_id}' for runtime name '{runtime_name}'")
                return runtime_id

        if list_response.get("nextToken"):
            list_response = bedrock_agentcore_client.list_agent_runtimes(nextToken=list_response.get("nextToken"))
        else:
            break

    raise ValueError(f"AgentCore Runtime '{runtime_name}' not found for update")


def _get_runtime_description(bedrock_agentcore_client, runtime_id: str, runtime_name: str):
    """Get runtime description with error handling."""
    try:
        describe_response = bedrock_agentcore_client.get_agent_runtime(agentRuntimeId=runtime_id)
        logger.info(f"Current runtime configuration: {describe_response}")
        return describe_response
    except ClientError as e:
        if e.response["Error"]["Code"] == "ResourceNotFoundException":
            raise ValueError(f"AgentCore Runtime '{runtime_name}' not found for update")
        raise


def _build_update_request(
    runtime_id: str, image_uri: str, execution_role_arn: str, describe_response: dict, environment_variables: dict
):
    """Build the runtime update request."""
    return {
        "agentRuntimeId": runtime_id,
        "agentRuntimeArtifact": {"containerConfiguration": {"containerUri": image_uri}},
        "roleArn": execution_role_arn,
        "networkConfiguration": describe_response.get("networkConfiguration", {}),
        "environmentVariables": environment_variables,
    }


def _log_configuration_changes(describe_response: dict, image_uri: str, execution_role_arn: str):
    """Log configuration changes being made."""
    current_image_uri = (
        describe_response.get("agentRuntimeArtifact", {}).get("containerConfiguration", {}).get("containerUri")
    )
    current_role_arn = describe_response.get("roleArn")

    if image_uri != current_image_uri:
        logger.info(f"Updating image URI from '{current_image_uri}' to '{image_uri}'")
    if execution_role_arn != current_role_arn:
        logger.info(f"Updating execution role from '{current_role_arn}' to '{execution_role_arn}'")


def update_agent_runtime(
    runtime_name: str,
    image_uri: str,
    execution_role_arn: str,
    config_table_name: str,
    use_case_config_key: str,
    use_case_uuid: str,
    memory_id: str,
    multimodal_data_metadata_table: str = None,
    multimodal_data_bucket: str = None,
    memory_strategy_id: str = None,
):
    """
    Update an existing AgentCore Runtime using bedrock-agentcore UpdateAgentRuntime API.

    Args:
        runtime_name: Unique name for the AgentCore Runtime
        image_uri: ECR image URI for the agent container
        execution_role_arn: IAM role ARN for runtime execution
        config_table_name: DynamoDB table name for configuration storage
        use_case_config_key: Use case identifier
        use_case_uuid: Use case UUID for generating M2M identity name
        memory_id: AgentCore memory instance ID
        multimodal_data_metadata_table: Multimodal data metadata table name
        multimodal_data_bucket: Multimodal data bucket name

    Returns:
        str: Updated AgentCore Runtime ARN

    Raises:
        ClientError: If bedrock-agentcore API call fails
        ValueError: If required parameters are missing or runtime doesn't exist
    """
    operation_context = {
        "runtime_name": runtime_name,
        "image_uri": image_uri,
        "execution_role_arn": execution_role_arn,
        "use_case_config_key": use_case_config_key,
        "use_case_uuid": use_case_uuid,
        "memory_id": memory_id,
        "multimodal_data_metadata_table": multimodal_data_metadata_table,
        "multimodal_data_bucket": multimodal_data_bucket,
    }

    try:
        bedrock_agentcore_client = get_service_client("bedrock-agentcore-control")

        try:
            runtime_id = _find_runtime_id_by_name(bedrock_agentcore_client, runtime_name)
        except ClientError as e:
            handle_client_error(e, "list_agent_runtimes", operation_context)
            raise

        logger.info(f"Describing existing AgentCore Runtime '{runtime_name}' (ID: {runtime_id}) before update")
        describe_response = _get_runtime_description(bedrock_agentcore_client, runtime_id, runtime_name)

        environment_variables = _build_runtime_environment_variables(
            config_table_name,
            use_case_config_key,
            use_case_uuid,
            memory_id,
            multimodal_data_metadata_table,
            multimodal_data_bucket,
            memory_strategy_id
        )

        logger.info(f"Updating AgentCore Runtime '{runtime_name}' with environment variables: {environment_variables}")

        update_request = _build_update_request(
            runtime_id, image_uri, execution_role_arn, describe_response, environment_variables
        )
        _log_configuration_changes(describe_response, image_uri, execution_role_arn)

        logger.info(f"Updating environment variables: {environment_variables}")
        logger.info(f"Updating runtime with request: {update_request}")
        response = bedrock_agentcore_client.update_agent_runtime(**update_request)

        runtime_arn = response.get("agentRuntimeArn")
        if not runtime_arn:
            raise ValueError("Runtime update succeeded but no ARN returned")

        logger.info(f"Successfully updated AgentCore Runtime with ARN: {runtime_arn}")
        return runtime_arn, runtime_id

    except ClientError as e:
        handle_client_error(e, "update_agent_runtime", operation_context)
        raise
    except ValueError as e:
        logger.error(f"Parameter validation failed for runtime update: {str(e)}")
        raise
    except Exception as e:
        logger.error(f"Unexpected error updating AgentCore Runtime: {str(e)}")
        raise


def _find_runtime_for_deletion(bedrock_agentcore_client, runtime_name: str):
    """Find runtime for deletion."""
    list_response = bedrock_agentcore_client.list_agent_runtimes()

    for runtime in list_response.get("agentRuntimes", []):
        if runtime.get("agentRuntimeName") == runtime_name:
            runtime_id = runtime.get("agentRuntimeId")
            logger.info(f"Found runtime ID '{runtime_id}' for runtime name '{runtime_name}'")
            return runtime_id

    logger.warning(f"AgentCore Runtime '{runtime_name}' not found in list, may already be deleted")
    return None


def _delete_runtime_resource(bedrock_agentcore_client, runtime_id: str, runtime_name: str, operation_context: dict):
    """Delete the runtime resource."""
    try:
        logger.info(f"Deleting AgentCore Runtime '{runtime_name}' with ID '{runtime_id}'")
        bedrock_agentcore_client.delete_agent_runtime(agentRuntimeId=runtime_id)
        logger.info(f"Successfully initiated deletion of AgentCore Runtime '{runtime_id}'")
    except ClientError as e:
        if e.response["Error"]["Code"] == "ResourceNotFoundException":
            logger.warning(f"AgentCore Runtime '{runtime_id}' not found, may already be deleted")
        else:
            handle_client_error(e, "delete_agent_runtime", operation_context)
            raise


def delete_agent_runtime(runtime_name: str):
    """
    Delete an AgentCore Runtime using bedrock-agentcore API.

    Args:
        runtime_name: Unique name for the AgentCore Runtime to delete

    Raises:
        ClientError: If bedrock-agentcore API call fails
        Exception: For unexpected errors during deletion
    """
    operation_context = {"runtime_name": runtime_name}

    try:
        bedrock_agentcore_client = get_service_client("bedrock-agentcore-control")
        logger.info(f"Starting deletion of AgentCore Runtime '{runtime_name}'")

        try:
            runtime_id = _find_runtime_for_deletion(bedrock_agentcore_client, runtime_name)

            if not runtime_id:
                return  # Runtime not found, already deleted

        except ClientError as e:
            if e.response["Error"]["Code"] == "ResourceNotFoundException":
                logger.warning(f"AgentCore Runtime '{runtime_name}' not found, may already be deleted")
                return
            else:
                handle_client_error(e, "get_agent_runtime", operation_context)
        except Exception as e:
            logger.warning(f"Unexpected error describing runtime before deletion: {str(e)}")

        if runtime_id:
            _delete_runtime_resource(bedrock_agentcore_client, runtime_id, runtime_name, operation_context)

        logger.info(f"Completed cleanup operations for AgentCore Runtime '{runtime_name}'")

    except ClientError as e:
        handle_client_error(e, "delete_agent_runtime", operation_context)
        raise
    except Exception as e:
        logger.error(f"Unexpected error in delete_agent_runtime: {str(e)}")
        raise
