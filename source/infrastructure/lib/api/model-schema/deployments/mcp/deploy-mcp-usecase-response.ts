// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { JsonSchema, JsonSchemaType } from 'aws-cdk-lib/aws-apigateway';

/**
 * JSON Schema for the response returned after successfully deploying a new MCP use case.
 * Contains the unique identifier for the newly created MCP use case.
 */
export const deployMcpUseCaseResponseSchema: JsonSchema = {
    type: JsonSchemaType.OBJECT,
    properties: {
        useCaseId: {
            type: JsonSchemaType.STRING,
            description: 'ID of the MCP use case that was created'
        }
    },
    required: ['useCaseId'],
    additionalProperties: false
};