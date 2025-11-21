// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { JsonSchema, JsonSchemaType, JsonSchemaVersion } from 'aws-cdk-lib/aws-apigateway';
import {
    MCP_GATEWAY_TARGET_TYPES,
    MCP_SCHEMA_FILE_NAME_PATTERN,
    UPLOADED_FILE_NAME_MIN_LENGTH,
    UPLOADED_FILE_NAME_MAX_LENGTH,
    MCP_GATEWAY_MAX_TARGETS_PER_GATEWAY
} from '../../../../utils/constants';

/**
 * JSON Schema for uploading MCP schemas via the REST API.
 * This schema validates the request body for POST /deployments/mcp/upload-schema operations.
 * Validates the API Gateway event body structure expected by the mcp-handler.
 * The handler expects a 'files' array containing file upload information.
 */
export const uploadMcpSchemaBodySchema: JsonSchema = {
    schema: JsonSchemaVersion.DRAFT7,
    type: JsonSchemaType.OBJECT,
    properties: {
        files: {
            type: JsonSchemaType.ARRAY,
            description: 'Array of files to be uploaded for MCP schema processing',
            minItems: 1,
            maxItems: MCP_GATEWAY_MAX_TARGETS_PER_GATEWAY,
            items: {
                type: JsonSchemaType.OBJECT,
                properties: {
                    schemaType: {
                        type: JsonSchemaType.STRING,
                        description:
                            'Type of schema being uploaded. Determines allowed file extensions and validation rules.',
                        enum: MCP_GATEWAY_TARGET_TYPES
                    },
                    fileName: {
                        type: JsonSchemaType.STRING,
                        description:
                            'Name of the file being uploaded. Must have appropriate extension for the schema type. Detailed validation is performed at the Lambda level.',
                        pattern: MCP_SCHEMA_FILE_NAME_PATTERN,
                        minLength: UPLOADED_FILE_NAME_MIN_LENGTH,
                        maxLength: UPLOADED_FILE_NAME_MAX_LENGTH
                    }
                },
                required: ['schemaType', 'fileName'],
                additionalProperties: false
            }
        }
    },
    required: ['files'],
    additionalProperties: false
};
