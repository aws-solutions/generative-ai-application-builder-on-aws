#!/usr/bin/env python
# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

from typing import Dict, Any
from aws_lambda_powertools import Logger, Tracer
from utils.agentcore_mcp import AgentcoreMCP
from utils.mcp_factory import MCPGatewayFactory
from utils.policy_manager import GatewayPolicyManager
from utils.lambda_target_creator import LambdaTargetCreator
from utils.smithy_target_creator import SmithyTargetCreator
from utils.openapi_target_creator import OpenAPITargetCreator
import uuid
import time
from operations.shared import retry_with_backoff

logger = Logger()
tracer = Tracer()

# Register target creators for the factory
MCPGatewayFactory.register_target_creator("lambda", LambdaTargetCreator)
MCPGatewayFactory.register_target_creator("smithyModel", SmithyTargetCreator)
MCPGatewayFactory.register_target_creator("openApiSchema", OpenAPITargetCreator)


class GatewayMCP(AgentcoreMCP):
    """
    MCP Gateway resource manager.

    Handles the lifecycle of MCP gateways including creation, updates, and deletion
    of gateways and their associated targets.
    """

    def __init__(
        self,
        config: Dict[str, Any],
        cognito_user_pool_id,
        gateway_role_arn,
        gateway_name,
        schema_bucket_name,
        gateway_id = None
    ):
        """
        Initialize the Gateway MCP manager.

        Args:
            config: Gateway configuration from MCPConfigManager
            agentcore_client: AWS Bedrock AgentCore client
            gateway_id: Optional gateway identifier for updates/deletes
        """
        super().__init__(config, cognito_user_pool_id)
        self.gateway_role_arn = gateway_role_arn
        self.gateway_name = gateway_name
        self.schema_bucket_name = schema_bucket_name
        self.gateway_id = gateway_id
        self.gateway_arn = None
        self.gateway_url = None
        self.targets = []
        # Extract role name from ARN (format: arn:aws:iam::account:role/role-name)
        role_name = self.gateway_role_arn.split("/")[-1]
        self.policy_manager = GatewayPolicyManager(role_name, self.agentcore_client)

    @property
    def update_gateway_params(self):
        gateway_params = self.base_gateway_params
        gateway_params["gatewayIdentifier"] = self.gateway_id
        return gateway_params

    @property
    def create_gateway_params(self):
        gateway_params = self.base_gateway_params
        gateway_params["clientToken"] = str(uuid.uuid4())
        return gateway_params

    @property
    def base_gateway_params(self):
        return {
            "name": self.gateway_name,
            "roleArn": self.gateway_role_arn,
            "protocolType": "MCP",
            "exceptionLevel": "DEBUG",
            **(
                {}
                if not self.config.get("use_case_description")
                else {"description": self.config.get("use_case_description")}
            ),
            **self.gateway_auth_config,
        }

    @property
    def gateway_auth_config(self):
        auth_config = self.base_auth_config
        auth_config["authorizerType"] = "CUSTOM_JWT"
        return auth_config

    @tracer.capture_method
    def create(self):
        """
        Create MCP gateway and its targets.

        Raises:
            RuntimeError: If gateway creation fails
        """

        try:
            response = retry_with_backoff(self.agentcore_client.create_gateway, **self.create_gateway_params)

            self.gateway_id = response.get("gatewayId")
            self.gateway_arn = response.get("gatewayArn")
            self.gateway_url = response.get("gatewayUrl")
            logger.info(f"Gateway created successfully - ID: {self.gateway_id}")

            # Wait for gateway to become ACTIVE before creating targets
            self._wait_for_gateway_active()

            self.create_targets()

        except Exception as e:
            logger.error(f"Error in creating a gateway: {str(e)}")
            raise

    def create_targets(self):
        target_params = self.config.get("target_params", [])

        for target in target_params:
            target_name = target.get("TargetName")
            target_type = target.get("TargetType")
            target_creator = MCPGatewayFactory.create_target_creator(target, self.schema_bucket_name)

            try:
                response = retry_with_backoff(
                    self.agentcore_client.create_gateway_target,
                    **{
                        "gatewayIdentifier": self.gateway_id,
                        "name": target_name,
                        "clientToken": str(uuid.uuid4()),
                        **(
                            {}
                            if not target.get("TargetDescription")
                            else {"description": target.get("TargetDescription")}
                        ),
                        "targetConfiguration": {"mcp": target_creator.create_target_configuration()},
                        "credentialProviderConfigurations": target_creator.build_credential_provider_configurations(),
                    },
                )

                target_id = response.get("targetId")

                self.targets.append(
                    {
                        "targetId": target_id,
                        "targetArn": response.get("targetArn"),
                        "targetName": target_name,
                        "targetType": target_type,
                        "status": response.get("status", "ACTIVE"),
                    } 
                )
                logger.info(f"Created ${target_name} with id: ${target_id}")

                # Add IAM policies based on target type
                self.policy_manager.gateway_policy_factory(target_type, target)

            except Exception as error:
                error_msg = f"Failed to create target {target_name}: {str(error)}"
                logger.error(error_msg)
                raise RuntimeError(error_msg)

        logger.info(f"Created {len(self.targets)}/{len(target_params)} target{'s' if len(self.targets) > 1 else ''}")

    def delete_targets(self):

        response = self.agentcore_client.list_gateway_targets(gatewayIdentifier=self.gateway_id)
        target_params = response["items"]

        for target in target_params:
            target_id = target.get("targetId")
            target_name = target.get("name")

            try:
                response = retry_with_backoff(
                    self.agentcore_client.delete_gateway_target,
                    **{
                        "gatewayIdentifier": self.gateway_id,
                        "targetId": target_id,
                    },
                )

                logger.info(f"Deleted Target ID: {target_id}")

            except Exception as error:
                error_msg = f"Failed to delete target {target_name}: {str(error)}"
                logger.error(error_msg)
                raise RuntimeError(error_msg)
        
        # Wait for all targets to be fully deleted
        if target_params:
            self._wait_for_targets_cleared()

    @tracer.capture_method
    def update(self):
        """
        Update MCP gateway.

        Raises:
            RuntimeError: If gateway update fails
        """

        try:
            if not self.gateway_id:
                raise ValueError("Gateway ID is required for update operation")

            response = self.agentcore_client.get_gateway(gatewayIdentifier=self.gateway_id)
            self.gateway_arn = response["gatewayArn"]
            self.gateway_url = response["gatewayUrl"]
            self.allowed_clients = response["authorizerConfiguration"]["customJWTAuthorizer"]["allowedClients"]
            if response.get("description") != self.config.get("use_case_description"):
                response = retry_with_backoff(self.agentcore_client.update_gateway, **self.update_gateway_params)
                # Wait for gateway to become ACTIVE before creating targets
                self._wait_for_gateway_active()
                logger.info(f"Gateway Description Updated successfully - ID: {self.gateway_id}")

            logger.info(f"Updating MCP gateway Targets: {self.gateway_id}")
            self.delete_targets()
            self.create_targets()
            logger.info(f"Gateway updated successfully - ID: {self.gateway_id}")


        except Exception as e:
            error_msg = f"Failed to update MCP gateway {self.gateway_id}: {str(e)}"
            logger.error(error_msg)
            raise RuntimeError(error_msg)

    @tracer.capture_method
    def delete(self):
        """
        Delete MCP gateway and its targets.

        Raises:
            RuntimeError: If gateway deletion fails
        """

        try:
            if self.gateway_id == 'unknown':
                logger.warning("No gateway ID provided - gateway was never created, skipping deletion")
            else:
                logger.info(f"Deleting MCP gateway: {self.gateway_id}")
                self.delete_targets()
                self.agentcore_client.delete_gateway(gatewayIdentifier=self.gateway_id)
            
            # Clean up all custom IAM policies
            self.policy_manager.destroy_all_custom_policies()
        except Exception as e:
            error_msg = f"Failed to delete MCP gateway {self.gateway_id}: {str(e)}"
            logger.error(error_msg)
            raise RuntimeError(error_msg)

    def to_dict(self):
        return {
            "GatewayId": self.gateway_id,
            "GatewayArn": self.gateway_arn,
            "GatewayUrl": self.gateway_url,
            "GatewayName": self.gateway_name,
            "Targets": self.targets,
            "TargetCount": len(self.targets)
        }


    def _wait_for_gateway_active(self, max_wait_time=300, poll_interval=5):
        """
        Wait for gateway to reach READY status.
        
        Args:
            max_wait_time: Maximum time to wait in seconds (default: 300)
            poll_interval: Time between status checks in seconds (default: 5)
            
        Raises:
            RuntimeError: If gateway enters a terminal failure state
            TimeoutError: If gateway doesn't become READY within max_wait_time
        """
        start_time = time.time()
        
        while time.time() - start_time < max_wait_time:
            response = self.agentcore_client.get_gateway(gatewayIdentifier=self.gateway_id)
            status = response.get("status")
            
            logger.info(f"Gateway status: {status}")
            
            if status == "READY":
                logger.info(f"Gateway {self.gateway_id} is now READY")
                return True
            elif status in ["FAILED", "DELETING", "DELETED"]:
                raise RuntimeError(f"Gateway entered terminal state: {status}")
            
            time.sleep(poll_interval)
        
        raise TimeoutError(f"Gateway did not become READY within {max_wait_time} seconds")

    def _wait_for_targets_cleared(self, max_wait_time=120, poll_interval=10):
        """
        Wait until gateway has no targets.
        
        Args:
            max_wait_time: Maximum time to wait in seconds (default: 120)
            poll_interval: Time between status checks in seconds (default: 10)
            
        Raises:
            TimeoutError: If targets still present after max_wait_time
        """
        start_time = time.time()
        
        while time.time() - start_time < max_wait_time:

            response = self.agentcore_client.list_gateway_targets(gatewayIdentifier=self.gateway_id)
            targets = response.get("items", [])

            logger.info(f"Waiting for {len(targets)} targets to delete")
            time.sleep(poll_interval)                            

            if not targets:
                logger.info("All targets deleted")
                return True
        
        raise TimeoutError("Targets still present after timeout")