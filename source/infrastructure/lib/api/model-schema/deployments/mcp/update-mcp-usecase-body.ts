// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { JsonSchema, JsonSchemaType, JsonSchemaVersion } from 'aws-cdk-lib/aws-apigateway';
import { gatewayParams } from './params/mcp-gateway-params';
import { updateUseCaseProperties } from '../base-usecase-schema';
import { USE_CASE_TYPES, MCP_RUNTIME_ENV_VARS_MAX_COUNT, ECR_URI_PATTERN } from '../../../../utils/constants';

/**
 * JSON Schema for updating an existing MCP use case via the REST API.
 * This schema validates the request body for PUT /deployments/{useCaseId} operations for MCP servers.
 * Supports partial updates for both Gateway-type and Runtime-type MCP servers.
 */
export const updateMcpUseCaseBodySchema: JsonSchema = {
    schema: JsonSchemaVersion.DRAFT7,
    type: JsonSchemaType.OBJECT,
    properties: {
        ...updateUseCaseProperties,
        UseCaseType: {
            type: JsonSchemaType.STRING,
            description: 'Type of the use case to be uploaded. Must be "MCPServer" for MCP deployments.',
            enum: [USE_CASE_TYPES.MCP_SERVER]
        },
        MCPParams: {
            type: JsonSchemaType.OBJECT,
            description: 'Parameters for MCP server configuration updates.',
            properties: {
                GatewayParams: gatewayParams,
                RuntimeParams: {
                    type: JsonSchemaType.OBJECT,
                    description: 'Runtime-specific configuration updates (only for RUNTIME type)',
                    properties: {
                        EcrUri: {
                            type: JsonSchemaType.STRING,
                            description: 'ECR Docker image URI for the MCP server runtime',
                            pattern: ECR_URI_PATTERN
                        },
                        EnvironmentVariables: {
                            type: JsonSchemaType.OBJECT,
                            description: 'Environment variables to pass to the MCP server runtime container',
                            maxProperties: MCP_RUNTIME_ENV_VARS_MAX_COUNT,
                            patternProperties: {
                                '^[a-zA-Z_][a-zA-Z0-9_]*$': {
                                    type: JsonSchemaType.STRING,
                                    description: 'Environment variable value'
                                }
                            },
                            additionalProperties: false
                        }
                    },
                    additionalProperties: false
                }
            },
            // Ensure at least one field is provided for update to prevent empty update requests
            anyOf: [{ required: ['GatewayParams'] }, { required: ['RuntimeParams'] }],
            additionalProperties: false
        }
    },
    // Conditional validation based on MCP server type - inferred from which params are present
    oneOf: [
        {
            // Gateway-type MCP server updates
            properties: {
                MCPParams: {
                    properties: {
                        RuntimeParams: { not: {} }
                    }
                }
            }
        },
        {
            // Runtime-type MCP server updates
            properties: {
                MCPParams: {
                    properties: {
                        GatewayParams: { not: {} }
                    }
                }
            }
        }
    ],
    required: ['MCPParams'],
    additionalProperties: false
};
