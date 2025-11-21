// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { JsonSchema, JsonSchemaType } from 'aws-cdk-lib/aws-apigateway';

/**
 * JSON Schema for workflow deployment response.
 * This schema defines the structure of the response returned after successfully
 * deploying a workflow use case via POST /deployments/workflows.
 */
export const deployWorkflowUseCaseResponseSchema: JsonSchema = {
    type: JsonSchemaType.OBJECT,
    description: 'Response schema for workflow deployment',
    properties: {
        useCaseId: {
            type: JsonSchemaType.STRING,
            description: 'Unique identifier for the deployed workflow use case'
        },
    }
};