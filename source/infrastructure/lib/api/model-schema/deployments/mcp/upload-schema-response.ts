// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { JsonSchema, JsonSchemaType, JsonSchemaVersion } from 'aws-cdk-lib/aws-apigateway';

/**
 * JSON Schema for the response returned after successfully requesting MCP schema uploads.
 * Contains an array of presigned POST URLs and associated metadata for uploading schema files to S3.
 */
export const uploadMcpSchemaResponseSchema: JsonSchema = {
    schema: JsonSchemaVersion.DRAFT7,
    type: JsonSchemaType.OBJECT,
    properties: {
        uploads: {
            type: JsonSchemaType.ARRAY,
            description: 'Array of presigned POST responses for uploading schema files',
            items: {
                type: JsonSchemaType.OBJECT,
                properties: {
                    uploadUrl: {
                        type: JsonSchemaType.STRING,
                        description: 'The S3 presigned POST URL for uploading the file',
                        format: 'uri'
                    },
                    formFields: {
                        type: JsonSchemaType.OBJECT,
                        description: 'Form fields required for the S3 presigned POST request',
                        additionalProperties: {
                            type: JsonSchemaType.STRING
                        }
                    },
                    fileName: {
                        type: JsonSchemaType.STRING,
                        description: 'Original name of the file to be uploaded'
                    },
                    expiresIn: {
                        type: JsonSchemaType.INTEGER,
                        description: 'Number of seconds until the presigned URL expires',
                        minimum: 1
                    },
                    createdAt: {
                        type: JsonSchemaType.STRING,
                        description: 'ISO 8601 timestamp when the presigned URL was created',
                        format: 'date-time'
                    }
                },
                required: ['uploadUrl', 'formFields', 'fileName', 'expiresIn', 'createdAt'],
                additionalProperties: false
            }
        }
    },
    required: ['uploads'],
    additionalProperties: false
};
