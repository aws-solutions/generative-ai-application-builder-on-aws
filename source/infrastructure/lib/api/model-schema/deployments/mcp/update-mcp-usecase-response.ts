// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { JsonSchema, JsonSchemaType } from 'aws-cdk-lib/aws-apigateway';

/**
 * JSON Schema for the response returned after successfully updating an existing MCP use case.
 * Contains the unique identifier of the updated MCP use case for confirmation.
 */
export const updateMcpUseCaseResponseSchema: JsonSchema = {
    type: JsonSchemaType.OBJECT,
    properties: {
        useCaseId: {
            type: JsonSchemaType.STRING,
            description: 'ID of the MCP use case that was updated'
        }
    },
    required: ['useCaseId'],
    additionalProperties: false
};