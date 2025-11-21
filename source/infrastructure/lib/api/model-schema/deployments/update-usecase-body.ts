// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { JsonSchema, JsonSchemaType, JsonSchemaVersion } from 'aws-cdk-lib/aws-apigateway';
import {
    DEFAULT_CONVERSATION_MEMORY_TYPE,
    SUPPORTED_AGENT_TYPES,
    SUPPORTED_CONVERSATION_MEMORY_TYPES,
    USE_CASE_TYPES
} from '../../../utils/constants';
import { updateUseCaseProperties } from './base-usecase-schema';
import { llmParamsUpdateSchema } from '../shared/llm-params';
import { knowledgeBaseParamsUpdateSchema } from '../shared/knowledge-base-params';

/**
 * JSON Schema for updating an existing use case via the REST API.
 * This schema validates the request body for PUT /deployments/{useCaseId} operations.
 * Requires at least one field to be updated to ensure meaningful changes.
 */
export const updateUseCaseBodySchema: JsonSchema = {
    schema: JsonSchemaVersion.DRAFT7,
    type: JsonSchemaType.OBJECT,
    properties: {
        ...updateUseCaseProperties,
        UseCaseType: {
            type: JsonSchemaType.STRING,
            description: 'Type of the use case to be deployed. Either "Text" or "Agent".',
            enum: [USE_CASE_TYPES.TEXT, USE_CASE_TYPES.AGENT]
        },
        ConversationMemoryParams: {
            type: JsonSchemaType.OBJECT,
            description: 'Parameters related to storing and using the chat history',
            properties: {
                ConversationMemoryType: {
                    type: JsonSchemaType.STRING,
                    default: DEFAULT_CONVERSATION_MEMORY_TYPE,
                    enum: SUPPORTED_CONVERSATION_MEMORY_TYPES
                },
                HumanPrefix: {
                    type: JsonSchemaType.STRING,
                    description: 'Prefix used in the history when storing messages sent by the user'
                },
                AiPrefix: {
                    type: JsonSchemaType.STRING,
                    description: 'Prefix used in the history when storing responses from the LLM'
                },
                ChatHistoryLength: {
                    type: JsonSchemaType.INTEGER,
                    description: 'Number of messages to store in the history',
                    minimum: 0
                }
            },
            additionalProperties: false
        },
        KnowledgeBaseParams: knowledgeBaseParamsUpdateSchema,
        LlmParams: llmParamsUpdateSchema,
        AgentParams: {
            type: JsonSchemaType.OBJECT,
            description: 'Parameters for Bedrock agent invocation workflow.',
            properties: {
                AgentType: {
                    type: JsonSchemaType.STRING,
                    description: 'The type of agent to use. Required.',
                    enum: SUPPORTED_AGENT_TYPES
                },
                BedrockAgentParams: {
                    type: JsonSchemaType.OBJECT,
                    properties: {
                        AgentId: {
                            type: JsonSchemaType.STRING,
                            description: 'ID of the Bedrock agent to be invoked.',
                            pattern: '^[0-9a-zA-Z]+$',
                            maxLength: 10
                        },
                        AgentAliasId: {
                            type: JsonSchemaType.STRING,
                            description: 'Alias ID of the Bedrock agent to be invoked.',
                            pattern: '^[0-9a-zA-Z]+$',
                            maxLength: 10
                        },
                        EnableTrace: {
                            type: JsonSchemaType.BOOLEAN,
                            description: 'Whether to enable tracing for the agent invocation.',
                            default: false
                        }
                    },
                    required: ['AgentId', 'AgentAliasId'],
                    additionalProperties: false
                }
            },
            additionalProperties: false
        }
    },
    // Ensure at least one field is provided for update to prevent empty update requests
    anyOf: [
        { required: ['UseCaseDescription'] },
        { required: ['DefaultUserEmail'] },
        { required: ['VpcParams'] },
        { required: ['ConversationMemoryParams'] },
        { required: ['KnowledgeBaseParams'] },
        { required: ['LlmParams'] },
        { required: ['AgentParams'] },
        { required: ['AuthenticationParams'] },
        { required: ['ProvisionedConcurrencyValue'] }
    ],
    required: ['UseCaseType'],
    additionalProperties: false
};