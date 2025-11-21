# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

import re
import logging
from typing import Dict

from utils.constants import EntityType

from helper import get_service_client

from aws_lambda_powertools import Logger, Tracer
from utils.data import MCPServerData

logger = Logger(utc=True)
tracer = Tracer()

class AuthManager:
    """Manages authentication metadata and permissions for AgentCore components."""
    
    def __init__(self, client_id: str, use_case_id: str, bedrock_client=None):
        self.client_id = client_id
        self.use_case_id = use_case_id
        self.bedrock = bedrock_client or get_service_client('bedrock-agentcore-control')
        self.logger = logging.getLogger(__name__)


    @classmethod
    @tracer.capture_method
    def extract_values_regex(cls, arn: str) -> tuple[str, str]:
        pattern = r"arn:aws:bedrock-agentcore:[^:]+:[^:]+:(\w+)/(.+)"
        match = re.match(pattern, arn)
        if match:
            return match.group(1), match.group(2)
        raise ValueError("Invalid ARN format")
    
    @tracer.capture_method
    def _get_resource_tags(self, agentcore_arn: str) -> Dict[str, str]:
        """Get resource tags as a dictionary."""
        response = self.bedrock.list_tags_for_resource(resourceArn=agentcore_arn)
        return response.get('tags', {})

    @tracer.capture_method
    def _update_allowed_clients(self, mcp_server: MCPServerData, add: bool) -> None:
        """Add client ID to agentcore resource."""
        if mcp_server.type == EntityType.GATEWAY.value:
            self._update_gateway_permissions(mcp_server.agentcore_id, add)
        elif mcp_server.type == EntityType.RUNTIME.value:
            self._update_runtime_permissions(mcp_server.agentcore_id, add)
        else:
            logger.error(f"Invalid agentcore type: {mcp_server.type}")
            raise ValueError("Invalid ARN. Type must be gateway or runtime.")

        
    @tracer.capture_method
    def _update_gateway_permissions(self, agentcore_id: str, add: bool) -> None:
        """Update gateway with new client permissions."""
        response = self.bedrock.get_gateway(gatewayIdentifier=agentcore_id)
        
        allowed_clients = response['authorizerConfiguration']['customJWTAuthorizer'].get('allowedClients', [])
        if add and self.client_id not in allowed_clients:
            allowed_clients.append(self.client_id)
        elif not add and self.client_id in allowed_clients:
            allowed_clients.remove(self.client_id)
        else:
            logger.info("Permission already exists.")
        
        response['authorizerConfiguration']['customJWTAuthorizer']['allowedClients'] = allowed_clients
        params = {
            "gatewayIdentifier": agentcore_id,
            "name": response['name'],
            "description": response.get('description'),
            "roleArn": response['roleArn'],
            "protocolType": response['protocolType'],
            "protocolConfiguration": response.get('protocolConfiguration'),
            "authorizerType": response['authorizerType'],
            "authorizerConfiguration": response['authorizerConfiguration'],
            "kmsKeyArn": response.get('kmsKeyArn'),
            "exceptionLevel": response.get('exceptionLevel')
        }
        return self.bedrock.update_gateway(
            **{k: v for k, v in params.items() if v is not None}
        )

    @tracer.capture_method
    def _update_runtime_permissions(self, agentcore_id: str, add: bool) -> None:
        """Update agent runtime with new client permissions."""
        response = self.bedrock.get_agent_runtime(agentRuntimeId=agentcore_id)
        allowed_clients = response['authorizerConfiguration']['customJWTAuthorizer'].get('allowedClients', [])
        if add and self.client_id not in allowed_clients:
            allowed_clients.append(self.client_id)
        else:
            logger.info("Permission already exists.")
        
        if not add and self.client_id in allowed_clients:
            allowed_clients.remove(self.client_id)
        else:
            logger.info("Permission has already been removed.")
            
            
        response['authorizerConfiguration']['customJWTAuthorizer']['allowedClients'] = allowed_clients
        
        params = {
            "agentRuntimeId":agentcore_id,
            "description":response.get('description'),
            "agentRuntimeArtifact":response['agentRuntimeArtifact'],
            "roleArn":response['roleArn'],
            "networkConfiguration":response['networkConfiguration'],
            "protocolConfiguration":response.get('protocolConfiguration'),
            "environmentVariables": response.get('environmentVariables'),
            "authorizerConfiguration": response['authorizerConfiguration'],
            "requestHeaderConfiguration":response.get('requestHeaderConfiguration')
        }
        
        return self.bedrock.update_agent_runtime(
            **{k: v for k, v in params.items() if v is not None}
        )

    @tracer.capture_method
    def add_permission(self, mcp_server: MCPServerData):
        tags = self._get_resource_tags(mcp_server.agentcore_arn)
        client_tag = tags.get(self.client_id, '')
        if client_tag:
            # Update existing client tag
            use_case_ids = client_tag.split(':')
            if self.use_case_id not in use_case_ids:
                use_case_ids.append(self.use_case_id)
                self.bedrock.tag_resource(
                    resourceArn=mcp_server.agentcore_arn,
                    tags={self.client_id: ':'.join(use_case_ids)}
                )
        else:
            # Add new client tag and update authorizer configuration
            self.bedrock.tag_resource(
                resourceArn=mcp_server.agentcore_arn,
                tags={self.client_id: self.use_case_id}
            )
            self._update_allowed_clients(mcp_server, True)

    @tracer.capture_method
    def remove_permission(self, mcp_server: MCPServerData):
        tags = self._get_resource_tags(mcp_server.agentcore_arn)
        client_tag = tags.get(self.client_id, '')
        if client_tag:
            # Update existing client tag
            use_case_ids = client_tag.split(':')
            if self.use_case_id in use_case_ids:
                use_case_ids.remove(self.use_case_id)
                if use_case_ids:
                    self.bedrock.tag_resource(
                        resourceArn=mcp_server.agentcore_arn,
                        tags={self.client_id: ':'.join(use_case_ids)}
                    )
                else:
                    self.bedrock.untag_resource(
                        resourceArn=mcp_server.agentcore_arn,
                        tagKeys=[self.client_id]
                    )
                    self._update_allowed_clients(mcp_server, False)