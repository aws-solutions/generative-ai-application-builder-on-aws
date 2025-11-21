// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { JsonSchema, JsonSchemaType } from 'aws-cdk-lib/aws-apigateway';
import { updateUseCaseProperties } from '../base-usecase-schema';
import { llmParamsUpdateSchema } from '../../shared/llm-params';
import { workflowCoreParamsUpdateSchema } from './params/workflow-core-params';
import { USE_CASE_TYPES } from '../../../../utils/constants';

/**
 * JSON Schema for updating an existing workflow use case via the REST API.
 * This schema validates the request body for PATCH /deployments/workflows/{id} operations.
 * All workflow parameters are optional to support partial updates.
 */
export const updateWorkflowUseCaseBodySchema: JsonSchema = {
    type: JsonSchemaType.OBJECT,
    description: 'Schema for updating a workflow use case',
    properties: {
        ...updateUseCaseProperties,
        UseCaseType: {
            type: JsonSchemaType.STRING,
            description: 'Type of the use case to be deployed. Must be "Workflow" for workflow deployments.',
            enum: [USE_CASE_TYPES.WORKFLOW]
        },
        LlmParams: llmParamsUpdateSchema,
        WorkflowParams: workflowCoreParamsUpdateSchema
    },
    additionalProperties: false
};
