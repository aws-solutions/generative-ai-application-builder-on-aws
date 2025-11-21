// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { JsonSchema, JsonSchemaType } from 'aws-cdk-lib/aws-apigateway';
import {
    AGENT_CORE_SYSTEM_PROMPT_MAX_LENGTH,
    WORKFLOW_MAX_SELECTED_AGENTS,
    WORKFLOW_ORCHESTRATION_PATTERNS,
    SUPPORTED_WORKFLOW_ORCHESTRATION_PATTERNS,
    USE_CASE_TYPES
} from '../../../../../utils/constants';
import { agentMemoryParams } from '../../../shared/agent-memory-params';
import { llmParamsSchema } from '../../../shared/llm-params';
import { agentCoreParams } from '../../agents/params/agent-core-params';
import { commonUseCaseProperties, deployUseCaseProperties } from '../../base-usecase-schema';

/**
 * JSON Schema for workflow core parameters.
 * Defines the structure for workflow-specific configuration including system prompt,
 * orchestration pattern, and selected agents.
 */
export const workflowCoreParams: JsonSchema = {
    type: JsonSchemaType.OBJECT,
    description: 'Core workflow configuration parameters',
    properties: {
        SystemPrompt: {
            type: JsonSchemaType.STRING,
            description: 'System prompt template for the client agent that orchestrates specialized agents',
            minLength: 1,
            maxLength: AGENT_CORE_SYSTEM_PROMPT_MAX_LENGTH
        },
        OrchestrationPattern: {
            type: JsonSchemaType.STRING,
            description: 'Orchestration pattern used for multi-agent coordination',
            enum: SUPPORTED_WORKFLOW_ORCHESTRATION_PATTERNS
        },
        AgentsAsToolsParams: {
            type: JsonSchemaType.OBJECT,
            description: 'Parameters related to the orchestration pattern Agents as Tools',
            properties: {
                Agents: {
                    type: JsonSchemaType.ARRAY,
                    description: 'List of agents to include in this workflow',
                    items: {
                        type: JsonSchemaType.OBJECT,
                        properties: {
                            UseCaseId: {
                                type: JsonSchemaType.STRING,
                                description: 'Unique identifier for the selected use case',
                                pattern: '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
                            },
                            UseCaseType: {
                                type: JsonSchemaType.STRING,
                                description: `Underlying use case type of this Agent. Supported types are ["${USE_CASE_TYPES.AGENT_BUILDER}"]`,
                                enum: [USE_CASE_TYPES.AGENT_BUILDER]
                            },
                            UseCaseName: deployUseCaseProperties.UseCaseName,
                            UseCaseDescription: commonUseCaseProperties.UseCaseDescription,
                            LlmParams: llmParamsSchema,
                            AgentBuilderParams: agentCoreParams
                        },
                        required: ['UseCaseId', 'UseCaseType', 'UseCaseName', 'LlmParams', 'AgentBuilderParams'],
                        additionalProperties: false
                    },
                    minItems: 1,
                    maxItems: WORKFLOW_MAX_SELECTED_AGENTS
                }
            },
            required: ['Agents'],
            additionalProperties: false
        },
        MemoryConfig: agentMemoryParams
    },
    oneOf: [
        {
            properties: {
                OrchestrationPattern: { enum: [WORKFLOW_ORCHESTRATION_PATTERNS.AGENT_AS_TOOLS] }
            },
            required: ['AgentsAsToolsParams']
        }
    ],
    required: ['SystemPrompt', 'OrchestrationPattern'],
    additionalProperties: false
};

/**
 * JSON Schema for updating workflow core parameters.
 * Uses expansion of the base schema with modified required fields.
 */
export const workflowCoreParamsUpdateSchema: JsonSchema = {
    type: workflowCoreParams.type,
    description: workflowCoreParams.description,
    properties: workflowCoreParams.properties,
    additionalProperties: false
};
