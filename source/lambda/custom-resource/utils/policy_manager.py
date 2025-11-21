#!/usr/bin/env python
# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

"""
Policy Manager for MCP Gateway IAM role policies.

Handles creation, validation, and deletion of IAM inline policies
for MCP Gateway roles based on target configurations.
"""
import os 
import json
import urllib.parse
from typing import Dict, Any, List
from aws_lambda_powertools import Logger
from helper import get_service_client

logger = Logger()
AWS_REGION = os.environ.get("AWS_REGION")


class GatewayPolicyManager:
    """
    Manages IAM inline policies for MCP Gateway roles.
    
    Responsibilities:
    - Create Lambda invoke policies
    - Create OpenAPI authentication policies
    - Check for duplicate policies
    - Delete custom policies on cleanup
    
    Note: GatewayPolicyManager only handles IAM inline policies. CDK-managed policies
    are attached as managed policies (not inline), so they won't appear in
    list_role_policies() and are automatically safe from deletion.
    """

    def __init__(self, role_name: str, agentcore_client):
        """
        Initialize the Policy Manager.

        Args:
            role_name: Name of the IAM role to manage policies for
        """
        
        self.role_name = role_name
        self.agentcore_client = agentcore_client
        
        try:
            self.iam_client = get_service_client("iam", region_name=AWS_REGION)
        except Exception as error:
            logger.warning(f"Failed to initialize IAM client: {error}")
            self.iam_client = get_service_client("iam", region_name=AWS_REGION)

    def gateway_policy_factory(self, target_type, target):
        """
        Factory method to add IAM policies based on target type.
        
        Args:
            target_type: Type of the target (lambda, openApiSchema, etc.)
            target: Target configuration dictionary
        """
        target_name = target.get("TargetName")
        if not target_name:
            raise ValueError("TargetName is required in target configuration")
            
        # Add IAM policies based on target type
        if target_type == "lambda":
            self.add_lambda_policy(target_name, target["LambdaArn"])
        elif target_type == "openApiSchema":
            self._add_openapi_policy_for_target(
                target_name=target_name,
                outbound_auth_params=target.get("OutboundAuthParams", {})
            )

    def add_lambda_policy(self, target_name: str, lambda_arn: str) -> None:
        """
        Add a policy to allow Lambda function invocation.

        Args:
            target_name: Name of the target
            lambda_arn: ARN of the Lambda function

        Raises:
            RuntimeError: If policy creation fails
        """
        try:
            policy_name = f"{target_name}-lambda-access-policy"
            
            policy_document = {
                "Version": "2012-10-17",
                "Statement": [
                    {
                        "Effect": "Allow",
                        "Action": ["lambda:InvokeFunction"],
                        "Resource": [lambda_arn]
                    }
                ]
            }
            
            if self.is_duplicate_policy(policy_document, policy_name):
                logger.info(f"Policy {policy_name} already exists, skipping")
                return
            
            self.iam_client.put_role_policy(
                RoleName=self.role_name,
                PolicyName=policy_name,
                PolicyDocument=json.dumps(policy_document)
            )
            
            logger.info(f"Successfully added Lambda policy {policy_name} to role {self.role_name}")
            
        except Exception as e:
            error_msg = f"Failed to add Lambda policy for {target_name}: {str(e)}"
            logger.error(error_msg)
            raise RuntimeError(error_msg)

    def add_openapi_policy(
        self, 
        target_name: str, 
        provider_arn: str, 
        auth_policy_action: str, 
        secret_arn: str
    ) -> None:
        """
        Add a policy to allow OpenAPI target authentication.

        Args:
            target_name: Name of the target
            provider_arn: ARN of the credential provider
            auth_policy_action: IAM action for the auth type (GetResourceOauth2Token or GetResourceApiKey)
            secret_arn: ARN of the secret in Secrets Manager

        Raises:
            RuntimeError: If policy creation fails
        """
        try:
            provider_name = provider_arn.split("/")[-1]
            policy_name = f"{target_name}-{provider_name}-access-policy"
            
            policy_document = {
                "Version": "2012-10-17",
                "Statement": [
                    {
                        "Effect": "Allow",
                        "Action": [auth_policy_action],
                        "Resource": [
                            "/".join(provider_arn.split("/")[0:2]),  # Token vault ARN
                            provider_arn  # Credential provider ARN
                        ]
                    },
                    {
                        "Effect": "Allow",
                        "Action": ["secretsmanager:GetSecretValue"],
                        "Resource": [secret_arn]
                    }
                ]
            }
            
            if self.is_duplicate_policy(policy_document, policy_name):
                logger.info(f"Policy {policy_name} already exists, skipping")
                return
            
            self.iam_client.put_role_policy(
                RoleName=self.role_name,
                PolicyName=policy_name,
                PolicyDocument=json.dumps(policy_document)
            )
            
            logger.info(f"Successfully added OpenAPI policy {policy_name} to role {self.role_name}")
            
        except Exception as e:
            error_msg = f"Failed to add OpenAPI policy for {target_name}: {str(e)}"
            logger.error(error_msg)
            raise RuntimeError(error_msg)

    def is_duplicate_policy(self, policy_document: Dict[str, Any], policy_name: str) -> bool:
        """
        Check if a policy with the same name and content already exists.

        Args:
            policy_document: The policy document to compare
            policy_name: Name of the policy

        Returns:
            True if policy exists with identical content, False otherwise
        """
        try:
            existing_policy = self.iam_client.get_role_policy(
                RoleName=self.role_name,
                PolicyName=policy_name
            )
            
            # Boto3 typically returns PolicyDocument as a dict, but handle both cases
            policy_doc = existing_policy['PolicyDocument']
            
            if isinstance(policy_doc, dict):
                existing_doc = policy_doc
            elif isinstance(policy_doc, str):
                # Fallback: handle URL-encoded JSON string (older boto3 versions or edge cases)
                existing_doc = json.loads(urllib.parse.unquote(policy_doc))
            else:
                logger.warning(f"Unexpected PolicyDocument type: {type(policy_doc)}")
                return False

            # Compare with new policy_document
            if existing_doc == policy_document:
                logger.debug(f"Policy {policy_name} already exists with identical permissions")
                return True
            else:
                logger.info(f"Policy {policy_name} exists but differs, will update")
                return False
                
        except self.iam_client.exceptions.NoSuchEntityException:
            logger.debug(f"Policy {policy_name} does not exist")
            return False
        except Exception as e:
            logger.warning(f"Error checking for duplicate policy {policy_name}: {e}")
            return False

    def destroy_all_custom_policies(self) -> None:
        """
        Delete all inline policies from the role.
        
        This is called during stack deletion to clean up policies created
        by the custom resource. CDK-managed policies are safe because they
        are managed policies (not inline) and won't appear in this list.
        """
        try:
            # List all inline policies on the role
            response = self.iam_client.list_role_policies(RoleName=self.role_name)
            policy_names = response.get("PolicyNames", [])
            
            if not policy_names:
                logger.info(f"No inline policies to delete for role {self.role_name}")
                return
            
            logger.info(f"Deleting {len(policy_names)} inline policies from role {self.role_name}")
            
            for policy_name in policy_names:
                try:
                    self.iam_client.delete_role_policy(
                        RoleName=self.role_name,
                        PolicyName=policy_name
                    )
                    logger.info(f"Deleted policy: {policy_name}")
                except self.iam_client.exceptions.NoSuchEntityException:
                    logger.warning(f"Policy {policy_name} already deleted")
                except Exception as e:
                    logger.error(f"Failed to delete policy {policy_name}: {e}")
                    # Continue deleting other policies even if one fails
            
            logger.info(f"Completed policy cleanup for role {self.role_name}")
            
        except Exception as e:
            error_msg = f"Failed to destroy policies for role {self.role_name}: {str(e)}"
            logger.error(error_msg)
            # Don't raise - we want stack deletion to proceed even if policy cleanup fails
            logger.warning("Continuing with stack deletion despite policy cleanup failure")



    def _add_openapi_policy_for_target(
        self, 
        target_name: str, 
        outbound_auth_params: Dict[str, Any]
    ) -> None:
        """
        Add IAM policy for OpenAPI target by fetching credential provider details.
        
        This method handles AgentCore operations to get secret ARNs, then delegates
        to GatewayPolicyManager for IAM policy creation.
        
        Args:
            target_name: Name of the target
            outbound_auth_params: Authentication parameters containing provider ARN and type
        """
        auth_type = outbound_auth_params.get("OutboundAuthProviderType")
        provider_arn = outbound_auth_params.get("OutboundAuthProviderArn")
        if not provider_arn: 
            raise ValueError("OutboundAuthProviderArn is required")
        provider_name = provider_arn.split("/")[-1]
        
        try:
            # Fetch credential provider details from AgentCore
            if auth_type == "OAUTH":
                auth_policy_action = "bedrock-agentcore:GetResourceOauth2Token"
                response = self.agentcore_client.get_oauth2_credential_provider(name=provider_name)
                secret_arn = response["clientSecretArn"]["secretArn"]
            else:  # API_KEY
                auth_policy_action = "bedrock-agentcore:GetResourceApiKey"
                response = self.agentcore_client.get_api_key_credential_provider(name=provider_name)
                secret_arn = response["apiKeySecretArn"]["secretArn"]
            
            # Delegate IAM policy creation to GatewayPolicyManager
            self.add_openapi_policy(
                target_name=target_name,
                provider_arn=provider_arn,
                auth_policy_action=auth_policy_action,
                secret_arn=secret_arn
            )
            
        except Exception as e:
            logger.error(f"Failed to add OpenAPI policy for target {target_name}: {e}")
            raise


