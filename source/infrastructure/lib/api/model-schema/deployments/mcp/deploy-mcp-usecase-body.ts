// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { JsonSchema, JsonSchemaType, JsonSchemaVersion } from 'aws-cdk-lib/aws-apigateway';
import { USE_CASE_TYPES, MCP_RUNTIME_ENV_VARS_MAX_COUNT, ECR_URI_PATTERN } from '../../../../utils/constants';
import { gatewayParams } from './params/mcp-gateway-params';
import { deployUseCaseProperties } from '../base-usecase-schema';

/**
 * JSON Schema for deploying a new MCP use case via the REST API.
 * This schema validates the request body for POST /deployments operations for MCP servers.
 * Supports both Gateway-type and Runtime-type MCP servers with conditional validation.
 */
export const deployMcpUseCaseBodySchema: JsonSchema = {
    schema: JsonSchemaVersion.DRAFT7,
    type: JsonSchemaType.OBJECT,
    properties: {
        ...deployUseCaseProperties,
        UseCaseType: {
            type: JsonSchemaType.STRING,
            description: 'Type of the use case to be deployed. Must be "MCPServer" for MCP deployments.',
            enum: [USE_CASE_TYPES.MCP_SERVER]
        },
        MCPParams: {
            type: JsonSchemaType.OBJECT,
            description: 'Parameters for MCP server configuration.',
            properties: {
                GatewayParams: gatewayParams,
                RuntimeParams: {
                    type: JsonSchemaType.OBJECT,
                    description: 'Runtime-specific configuration (required for RUNTIME type)',
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
                    required: ['EcrUri'],
                    additionalProperties: false
                }
            },
            additionalProperties: false
        }
    },
    // Conditional validation based on MCP server type
    oneOf: [
        {
            // Gateway-type MCP server
            properties: {
                MCPParams: {
                    properties: {
                        RuntimeParams: { not: {} }
                    },
                    required: ['GatewayParams']
                }
            }
        },
        {
            // Runtime-type MCP server
            properties: {
                MCPParams: {
                    properties: {
                        GatewayParams: { not: {} }
                    },
                    required: ['RuntimeParams']
                }
            }
        }
    ],
    required: ['UseCaseName', 'UseCaseType', 'MCPParams'],
    additionalProperties: false
};
