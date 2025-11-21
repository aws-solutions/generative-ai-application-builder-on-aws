// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { JsonSchema, JsonSchemaType } from 'aws-cdk-lib/aws-apigateway';

/**
 * JSON Schema for workflow update response.
 * This schema defines the structure of the response returned after successfully
 * updating a workflow use case via PATCH /deployments/workflows/{id}.
 */
export const updateWorkflowUseCaseResponseSchema: JsonSchema = {
    type: JsonSchemaType.OBJECT,
    description: 'Response schema for workflow updates',
    properties: {
        useCaseId: {
            type: JsonSchemaType.STRING,
            description: 'Unique identifier for the updated workflow use case'
        }
    }
};