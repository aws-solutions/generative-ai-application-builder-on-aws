// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { JsonSchema, JsonSchemaType } from 'aws-cdk-lib/aws-apigateway';
import {
    MCP_GATEWAY_MAX_TARGETS_PER_GATEWAY,
    MCP_GATEWAY_TARGET_NAME_MAX_LENGTH,
    MCP_GATEWAY_TARGET_DESCRIPTION_MAX_LENGTH,
    MCP_GATEWAY_TARGET_NAME_PATTERN,
    MCP_GATEWAY_AUTH_TYPES,
    MCP_GATEWAY_TARGET_TYPES,
    LAMBDA_ARN_PATTERN,
    BEDROCK_AGENTCORE_OAUTH_ARN_PATTERN,
    BEDROCK_AGENTCORE_API_KEY_ARN_PATTERN,
    MCP_SCHEMA_KEY_PATTERN,
    OAUTH_SCOPE_MAX_LENGTH,
    OAUTH_SCOPES_MAX_COUNT,
    OAUTH_CUSTOM_PARAM_KEY_MAX_LENGTH,
    OAUTH_CUSTOM_PARAM_VALUE_MAX_LENGTH,
    OAUTH_CUSTOM_PARAMS_MAX_COUNT,
    API_KEY_PARAM_NAME_MAX_LENGTH,
    API_KEY_PREFIX_MAX_LENGTH
} from '../../../../../utils/constants';

/**
 * MCP Gateway parameter schemas for use case deployments and updates.
 * Supports Gateway-type MCP servers with Lambda, OpenAPI, and Smithy targets.
 */

// Additional config parameters schema for OAuth and API Key authentication
const additionalConfigParamsSchema: JsonSchema = {
    type: JsonSchemaType.OBJECT,
    description: 'Additional configuration parameters for authentication',
    properties: {
        OAuthAdditionalConfig: {
            type: JsonSchemaType.OBJECT,
            description: 'Additional OAuth configuration',
            properties: {
                scopes: {
                    type: JsonSchemaType.ARRAY,
                    description: 'OAuth scopes',
                    maxItems: OAUTH_SCOPES_MAX_COUNT,
                    items: {
                        type: JsonSchemaType.STRING,
                        maxLength: OAUTH_SCOPE_MAX_LENGTH
                    }
                },
                customParameters: {
                    type: JsonSchemaType.ARRAY,
                    description: 'Custom OAuth parameters',
                    maxItems: OAUTH_CUSTOM_PARAMS_MAX_COUNT,
                    items: {
                        type: JsonSchemaType.OBJECT,
                        properties: {
                            key: {
                                type: JsonSchemaType.STRING,
                                description: 'Parameter key',
                                maxLength: OAUTH_CUSTOM_PARAM_KEY_MAX_LENGTH
                            },
                            value: {
                                type: JsonSchemaType.STRING,
                                description: 'Parameter value',
                                maxLength: OAUTH_CUSTOM_PARAM_VALUE_MAX_LENGTH
                            }
                        },
                        additionalProperties: false
                    }
                }
            },
            additionalProperties: false
        },
        ApiKeyAdditionalConfig: {
            type: JsonSchemaType.OBJECT,
            description: 'Additional API Key configuration',
            properties: {
                location: {
                    type: JsonSchemaType.STRING,
                    description: 'Location of the API key',
                    enum: ['HEADER', 'QUERY_PARAMETER']
                },
                parameterName: {
                    type: JsonSchemaType.STRING,
                    description: 'Name of the parameter containing the API key',
                    maxLength: API_KEY_PARAM_NAME_MAX_LENGTH
                },
                prefix: {
                    type: JsonSchemaType.STRING,
                    description: 'Prefix for the API key value',
                    maxLength: API_KEY_PREFIX_MAX_LENGTH
                }
            },
            additionalProperties: false
        }
    },
    additionalProperties: false
};

// Outbound authentication parameters schema
const outboundAuthParamsSchema: JsonSchema = {
    oneOf: [
        {
            type: JsonSchemaType.OBJECT,
            description: 'OAuth authentication configuration',
            properties: {
                OutboundAuthProviderType: {
                    type: JsonSchemaType.STRING,
                    enum: ['OAUTH']
                },
                OutboundAuthProviderArn: {
                    type: JsonSchemaType.STRING,
                    description: 'ARN of the OAuth authentication provider',
                    pattern: BEDROCK_AGENTCORE_OAUTH_ARN_PATTERN,
                    minLength: 1
                },
                AdditionalConfigParams: additionalConfigParamsSchema
            },
            required: ['OutboundAuthProviderArn', 'OutboundAuthProviderType'],
            additionalProperties: false
        },
        {
            type: JsonSchemaType.OBJECT,
            description: 'API Key authentication configuration',
            properties: {
                OutboundAuthProviderType: {
                    type: JsonSchemaType.STRING,
                    enum: ['API_KEY']
                },
                OutboundAuthProviderArn: {
                    type: JsonSchemaType.STRING,
                    description: 'ARN of the API Key authentication provider',
                    pattern: BEDROCK_AGENTCORE_API_KEY_ARN_PATTERN,
                    minLength: 1
                },
                AdditionalConfigParams: additionalConfigParamsSchema
            },
            required: ['OutboundAuthProviderArn', 'OutboundAuthProviderType'],
            additionalProperties: false
        }
    ]
};

/**
 * MCP Gateway parameter schemas for use case deployments and updates.
 * Supports Gateway-type MCP servers with Lambda, OpenAPI, and Smithy targets.
 */

// Common Gateway target schema used in both create and update operations
const gatewayTargetSchema: JsonSchema = {
    type: JsonSchemaType.OBJECT,
    description: 'Configuration for a Gateway target (Lambda, OpenAPI, or Smithy)',
    properties: {
        TargetName: {
            type: JsonSchemaType.STRING,
            description: 'Unique name for the Gateway target',
            pattern: MCP_GATEWAY_TARGET_NAME_PATTERN,
            minLength: 1,
            maxLength: MCP_GATEWAY_TARGET_NAME_MAX_LENGTH
        },
        TargetDescription: {
            type: JsonSchemaType.STRING,
            description: 'Description of the Gateway target',
            maxLength: MCP_GATEWAY_TARGET_DESCRIPTION_MAX_LENGTH
        },
        TargetType: {
            type: JsonSchemaType.STRING,
            description: 'Type of the Gateway target',
            enum: MCP_GATEWAY_TARGET_TYPES
        },
        TargetId: {
            type: JsonSchemaType.STRING,
            description: 'Unique identifier for the Gateway target (10 uppercase characters)',
            pattern: '^[A-Z0-9]{10}$',
            minLength: 10,
            maxLength: 10
        },
        LambdaArn: {
            type: JsonSchemaType.STRING,
            description: 'ARN of the Lambda function (required for lambda target type)',
            pattern: LAMBDA_ARN_PATTERN
        },
        SchemaUri: {
            type: JsonSchemaType.STRING,
            description: 'MCP schema key path for the target configuration',
            pattern: MCP_SCHEMA_KEY_PATTERN,
            minLength: 1
        },
        OutboundAuthParams: outboundAuthParamsSchema
    },
    required: ['TargetName', 'TargetType', 'SchemaUri'],
    // Conditional validation based on target type
    oneOf: [
        {
            // Lambda target validation - requires ARN and schema
            properties: {
                TargetType: { enum: ['lambda'] }
            },
            required: ['LambdaArn']
        },
        {
            // OpenAPI target validation - requires schema and outbound auth
            properties: {
                TargetType: { enum: ['openApiSchema'] }
            },
            required: ['OutboundAuthParams']
        },
        {
            // Smithy target validation - only requires schema (already in base required)
            properties: {
                TargetType: { enum: ['smithyModel'] }
            }
        }
    ],
    additionalProperties: false
};

// Gateway configuration schema for both creating and updating MCP servers
export const gatewayParams: JsonSchema = {
    type: JsonSchemaType.OBJECT,
    description: 'Gateway configuration parameters for MCP servers',
    properties: {
        GatewayArn: {
            type: JsonSchemaType.STRING,
            description: 'ARN of the MCP Gateway',
            pattern: '^arn:aws:bedrock-agentcore:[a-z0-9-]+:[0-9]{12}:gateway/[a-zA-Z0-9-]+$'
        },
        GatewayUrl: {
            type: JsonSchemaType.STRING,
            description: 'URL of the MCP Gateway',
            pattern: '^https://[a-zA-Z0-9-]+\\.gateway\\.bedrock-agentcore\\.[a-z0-9-]+\\.amazonaws\\.com/mcp$'
        },
        GatewayName: {
            type: JsonSchemaType.STRING,
            description: 'Name of the MCP Gateway'
        },
        GatewayId: {
            type: JsonSchemaType.STRING,
            description: 'Unique identifier for the MCP Gateway',
            pattern: '^[a-zA-Z0-9]+(-[a-zA-Z0-9]+)+$'
        },
        TargetParams: {
            type: JsonSchemaType.ARRAY,
            description: 'Array of Gateway targets (Lambda, OpenAPI, Smithy)',
            items: gatewayTargetSchema,
            minItems: 1,
            maxItems: MCP_GATEWAY_MAX_TARGETS_PER_GATEWAY
        }
    },
    required: ['TargetParams'],
    additionalProperties: false
};
