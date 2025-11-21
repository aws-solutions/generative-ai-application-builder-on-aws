# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

"""
Data models using Pydantic with auto-parsing
Includes workflow-specific extensions for agent orchestration
"""
import logging
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field, field_validator, model_validator

logger = logging.getLogger(__name__)


class FileReference(BaseModel):
    """Reference to a file in multimodal request"""

    file_reference: str = Field(alias="fileReference")
    file_name: str = Field(alias="fileName")


class MemoryConfig(BaseModel):
    """Memory configuration"""

    long_term_enabled: bool = Field(default=False, alias="LongTermEnabled")


# Tool and MCP Server Reference Models


class StrandsToolReference(BaseModel):
    """Reference to a built-in Strands tool"""

    tool_id: str = Field(alias="ToolId")


class CustomToolReference(BaseModel):
    """Reference to a custom tool"""

    tool_id: str = Field(alias="ToolId")


class MCPServerReference(BaseModel):
    """Reference to an MCP server with complete connection details"""

    use_case_id: str = Field(alias="UseCaseId")
    url: str = Field(alias="Url")
    type: str = Field(alias="Type")

    @field_validator("type")
    @classmethod
    def validate_type(cls, v):
        """Validate type is either 'gateway' or 'runtime'"""
        if v not in ["gateway", "runtime"]:
            raise ValueError(f"Type must be 'gateway' or 'runtime', got '{v}'")
        return v


# MCP Server Configuration Models


class OutboundAuthParams(BaseModel):
    """OAuth authentication parameters for Gateway MCP servers"""

    outbound_auth_provider_arn: str = Field(alias="OutboundAuthProviderArn")
    outbound_auth_provider_type: str = Field(alias="OutboundAuthProviderType")


class TargetParams(BaseModel):
    """Gateway target configuration"""

    target_name: str = Field(alias="TargetName")
    target_type: str = Field(alias="TargetType")
    target_description: Optional[str] = Field(default="", alias="TargetDescription")
    schema_uri: Optional[str] = Field(default=None, alias="SchemaUri")
    outbound_auth_params: Optional[OutboundAuthParams] = Field(default=None, alias="OutboundAuthParams")


class GatewayMCPParams(BaseModel):
    """Gateway MCP server parameters"""

    gateway_url: str = Field(alias="GatewayUrl")
    gateway_arn: str = Field(alias="GatewayArn")
    gateway_id: str = Field(alias="GatewayId")
    gateway_name: str = Field(alias="GatewayName")
    target_params: List[TargetParams] = Field(default_factory=list, alias="TargetParams")


class RuntimeMCPParams(BaseModel):
    """Runtime MCP server parameters"""

    ecr_uri: str = Field(alias="EcrUri")
    runtime_arn: str = Field(alias="RuntimeArn")
    runtime_url: str = Field(alias="RuntimeUrl")


class MCPParams(BaseModel):
    """MCP server parameters (Gateway or Runtime)"""

    gateway_params: Optional[GatewayMCPParams] = Field(default=None, alias="GatewayParams")
    runtime_params: Optional[RuntimeMCPParams] = Field(default=None, alias="RuntimeParams")


class MCPServerConfig(BaseModel):
    """Complete MCP server configuration from DynamoDB"""

    use_case_name: str = Field(alias="UseCaseName")
    use_case_type: str = Field(alias="UseCaseType")
    mcp_params: MCPParams = Field(alias="MCPParams")


# Workflow-specific Models


class AgentParams(BaseModel):
    """Parameters for a selected agent in workflow"""

    system_prompt: Optional[str] = Field(default=None, alias="SystemPrompt")
    tools: Optional[List[StrandsToolReference]] = Field(default=None, alias="Tools")
    mcp_servers: Optional[List[MCPServerReference]] = Field(default=None, alias="MCPServers")
    memory_config: Optional[MemoryConfig] = Field(default=None, alias="MemoryConfig")
    llm_params: Optional["LlmParams"] = Field(default=None, alias="LlmParams")

    @field_validator("tools", mode="before")
    @classmethod
    def parse_tools(cls, v):
        """Parse tools field - supports dict, string, and StrandsToolReference formats"""
        if v is None:
            return None
        if isinstance(v, list):
            result = []
            for tool in v:
                if isinstance(tool, dict):
                    result.append(StrandsToolReference(**tool))
                elif isinstance(tool, str):
                    # Support backward compatibility with string format
                    result.append(StrandsToolReference(ToolId=tool))
                elif isinstance(tool, StrandsToolReference):
                    result.append(tool)
            return result
        return []

    @field_validator("mcp_servers", mode="before")
    @classmethod
    def parse_mcp_servers(cls, v):
        """Parse mcp_servers field to handle dict format"""
        if v is None:
            return None
        if isinstance(v, list):
            result = []
            for server in v:
                if isinstance(server, dict):
                    result.append(MCPServerReference(**server))
                elif isinstance(server, MCPServerReference):
                    result.append(server)
            return result
        return []


class AgentReference(BaseModel):
    """Reference to an agent with its parameters

    This represents a full agent configuration within a workflow, including:
    - UseCaseId for unique identification
    - UseCaseType, UseCaseName, UseCaseDescription for identification
    - AgentBuilderParams for agent configuration (system prompt, tools, etc.)
    - LlmParams for model configuration (optional, can override workflow default)
    """

    model_config = {"populate_by_name": True}

    use_case_id: str = Field(alias="UseCaseId")
    use_case_type: str = Field(alias="UseCaseType")
    use_case_name: str = Field(alias="UseCaseName")
    use_case_description: Optional[str] = Field(default=None, alias="UseCaseDescription")
    agent_builder_params: "AgentBuilderParams" = Field(alias="AgentBuilderParams")
    llm_params: Optional["LlmParams"] = Field(default=None, alias="LlmParams")


class AgentsAsToolsParams(BaseModel):
    """Parameters for agents-as-tools orchestration"""

    model_config = {"populate_by_name": True}

    agents: List[AgentReference] = Field(default_factory=list, alias="Agents")


class WorkflowParams(BaseModel):
    """Workflow-specific parameters"""

    orchestration_pattern: Optional[str] = Field(default=None, alias="OrchestrationPattern")
    system_prompt: Optional[str] = Field(default=None, alias="SystemPrompt")
    memory_config: Optional[MemoryConfig] = Field(default=None, alias="MemoryConfig")
    agents_as_tools_params: Optional[AgentsAsToolsParams] = Field(default=None, alias="AgentsAsToolsParams")
    custom_tools: List[CustomToolReference] = Field(default_factory=list, alias="CustomTools")


class WorkflowConfig(BaseModel):
    """Workflow configuration"""

    workflow_type: str = Field(alias="WorkflowType")
    workflow_params: WorkflowParams = Field(alias="WorkflowParams")

    @classmethod
    def from_ddb_config(cls, config: Dict[str, Any]) -> "WorkflowConfig":
        """Create WorkflowConfig from DDB config dict"""
        try:
            return cls(**config)
        except Exception as e:
            logger.error(f"Error parsing workflow config: {e}")
            raise ValueError(f"Error parsing workflow configuration: {e}") from e


class AgentBuilderParams(BaseModel):
    """Agent builder parameters"""

    system_prompt: str = Field(alias="SystemPrompt")
    tools: List[StrandsToolReference] = Field(default_factory=list, alias="Tools")
    custom_tools: List[CustomToolReference] = Field(default_factory=list, alias="CustomTools")
    mcp_servers: List[MCPServerReference] = Field(default_factory=list, alias="MCPServers")
    memory_config: MemoryConfig = Field(default_factory=MemoryConfig, alias="MemoryConfig")
    llm_params: Optional["LlmParams"] = Field(default=None, alias="LlmParams")

    @field_validator("tools", mode="before")
    @classmethod
    def parse_tools(cls, v):
        """Parse tools field - supports dict, string, and StrandsToolReference formats"""
        if isinstance(v, list):
            result = []
            for tool in v:
                if isinstance(tool, dict):
                    result.append(StrandsToolReference(**tool))
                elif isinstance(tool, str):
                    # Support backward compatibility with string format
                    result.append(StrandsToolReference(ToolId=tool))
                elif isinstance(tool, StrandsToolReference):
                    result.append(tool)
            return result
        return []

    @field_validator("custom_tools", mode="before")
    @classmethod
    def parse_custom_tools(cls, v):
        """Parse custom_tools field to handle dict format"""
        if isinstance(v, list):
            result = []
            for tool in v:
                if isinstance(tool, dict):
                    result.append(CustomToolReference(**tool))
                elif isinstance(tool, CustomToolReference):
                    result.append(tool)
            return result
        return []

    @field_validator("mcp_servers", mode="before")
    @classmethod
    def parse_mcp_servers(cls, v):
        """Parse mcp_servers field to handle dict format"""
        if isinstance(v, list):
            result = []
            for server in v:
                if isinstance(server, dict):
                    result.append(MCPServerReference(**server))
                elif isinstance(server, MCPServerReference):
                    result.append(server)
            return result
        return []

    def get_tool_ids(self) -> List[str]:
        """Extract tool IDs from tool references"""
        return [tool.tool_id for tool in self.tools]

    def get_mcp_servers(self) -> List[Dict[str, str]]:
        """
        Extract MCP server details as dictionaries for tool loading.

        Returns:
            List of dicts with keys: use_case_id, url, type
        """
        return [
            {"use_case_id": server.use_case_id, "url": server.url, "type": server.type} for server in self.mcp_servers
        ]

    def get_custom_tool_ids(self) -> List[str]:
        """Extract custom tool IDs"""
        return [tool.tool_id for tool in self.custom_tools]

    def get_mcp_server_ids(self) -> List[str]:
        """
        DEPRECATED: Use get_mcp_servers() instead.
        Extract MCP server IDs from MCP server references.
        """
        logger.warning("get_mcp_server_ids() is deprecated, use get_mcp_servers() instead")
        return [server.use_case_id for server in self.mcp_servers]


class BedrockLlmParams(BaseModel):
    """Bedrock LLM parameters with support for all inference types"""

    model_id: Optional[str] = Field(default=None, alias="ModelId")
    model_arn: Optional[str] = Field(default=None, alias="ModelArn")
    inference_profile_id: Optional[str] = Field(default=None, alias="InferenceProfileId")
    bedrock_inference_type: Optional[str] = Field(default=None, alias="BedrockInferenceType")
    guardrail_identifier: Optional[str] = Field(default=None, alias="GuardrailIdentifier")
    guardrail_version: Optional[str] = Field(default=None, alias="GuardrailVersion")

    @model_validator(mode="after")
    def validate_inference_type_requirements(self):
        """Validate that the correct fields are present based on inference type"""
        inference_type = self.bedrock_inference_type

        if inference_type in ["QUICK_START", "OTHER_FOUNDATION"] and not self.model_id:
            raise ValueError(f"ModelId is required for inference type {inference_type}")
        elif inference_type == "INFERENCE_PROFILE" and not self.inference_profile_id:
            raise ValueError(f"InferenceProfileId is required for inference type {inference_type}")
        elif inference_type == "PROVISIONED" and not self.model_arn:
            raise ValueError(f"ModelArn is required for inference type {inference_type}")

        return self

    @property
    def model_identifier(self) -> str:
        """Get the appropriate model identifier based on inference type"""
        if self.bedrock_inference_type == "INFERENCE_PROFILE":
            return self.inference_profile_id
        elif self.bedrock_inference_type == "PROVISIONED":
            return self.model_arn
        else:
            return self.model_id


class MultimodalParams(BaseModel):
    """Multimodal parameters"""

    multimodal_enabled: bool = Field(default=False, alias="MultimodalEnabled")


class LlmParams(BaseModel):
    """LLM parameters"""

    model_provider: str = Field(alias="ModelProvider")
    temperature: float = Field(default=0.7, alias="Temperature")
    streaming: bool = Field(default=True, alias="Streaming")
    verbose: bool = Field(default=False, alias="Verbose")
    bedrock_llm_params: BedrockLlmParams = Field(alias="BedrockLlmParams")
    model_params: Dict[str, Any] = Field(default_factory=dict, alias="ModelParams")
    multimodal_params: Optional[MultimodalParams] = Field(default=None, alias="MultimodalParams")


class UseCaseConfig(BaseModel):
    """Complete use case configuration following DDB structure

    Supports both AgentBuilder and WorkflowBuilder use case types:
    - AgentBuilder: Has agent_builder_params
    - WorkflowBuilder: Has workflow_config
    """

    use_case_name: str = Field(alias="UseCaseName")
    use_case_type: str = Field(alias="UseCaseType")
    agent_builder_params: Optional[AgentBuilderParams] = Field(default=None, alias="AgentBuilderParams")
    workflow_params: Optional[WorkflowParams] = Field(default=None, alias="WorkflowParams")
    llm_params: LlmParams = Field(alias="LlmParams")

    model_config = {"populate_by_name": True}

    @classmethod
    def from_ddb_config(cls, config: Dict[str, Any]) -> "UseCaseConfig":
        """Create UseCaseConfig directly from DDB config dict"""
        try:
            return cls(**config)
        except Exception as e:
            logger.error(f"Error parsing DDB config: {e}")
            raise ValueError(f"Error parsing configuration: {e}") from e
