// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { JsonSchema, JsonSchemaType } from 'aws-cdk-lib/aws-apigateway';
import { AGENT_CORE_SYSTEM_PROMPT_MAX_LENGTH } from '../../../../../utils/constants';
import { agentMemoryParams } from '../../../shared/agent-memory-params';

export const agentCoreParams: JsonSchema = {
    type: JsonSchemaType.OBJECT,
    description: 'Core agent configuration parameters',
    properties: {
        SystemPrompt: {
            type: JsonSchemaType.STRING,
            description: 'System prompt template for the agent',
            minLength: 1,
            maxLength: AGENT_CORE_SYSTEM_PROMPT_MAX_LENGTH
        },
        MCPServers: {
            type: JsonSchemaType.ARRAY,
            description: 'MCP servers to integrate with the agent (no AWS service limits)',
            items: {
                type: JsonSchemaType.OBJECT,
                properties: {
                    UseCaseId: {
                        type: JsonSchemaType.STRING,
                        description: 'MCP server deployment use case ID',
                        minLength: 1
                    },
                    UseCaseName: {
                        type: JsonSchemaType.STRING,
                        description: 'Human-readable name of the MCP server',
                        minLength: 1
                    },
                    Url: {
                        type: JsonSchemaType.STRING,
                        description: 'MCP server endpoint URL',
                        minLength: 1
                    },
                    Type: {
                        type: JsonSchemaType.STRING,
                        description: 'MCP server type',
                        enum: ['gateway', 'runtime']
                    }
                },
                required: ['UseCaseId', 'UseCaseName', 'Url', 'Type'],
                additionalProperties: false
            }
        },
        Tools: {
            type: JsonSchemaType.ARRAY,
            description: 'Built-in Strands tools for the agent (no AWS service limits)',
            items: {
                type: JsonSchemaType.OBJECT,
                properties: {
                    ToolId: {
                        type: JsonSchemaType.STRING,
                        description: 'Tool identifier',
                        minLength: 1
                    }
                },
                required: ['ToolId'],
                additionalProperties: false
            }
        },
        MemoryConfig: agentMemoryParams
    },
    required: ['SystemPrompt'],
    additionalProperties: false
};

//exclude `required` property at top level to allowa for partial patch updates
export const agentCoreParamsUpdateSchema: JsonSchema = {
    type: agentCoreParams.type,
    description: agentCoreParams.description,
    properties: agentCoreParams.properties,
    additionalProperties: false
};
