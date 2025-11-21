// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { JsonSchema, JsonSchemaType } from 'aws-cdk-lib/aws-apigateway';

import { deployUseCaseProperties } from '../base-usecase-schema';
import { llmParamsSchema } from '../../shared/llm-params';
import { workflowCoreParams } from './params/workflow-core-params';
import { USE_CASE_TYPES } from '../../../../utils/constants';

/**
 * JSON Schema for deploying a new workflow use case via the REST API.
 * This schema validates the request body for POST /deployments/workflows operations.
 * Supports workflow configuration with system prompt, orchestration pattern, and selected agents.
 */
export const deployWorkflowUseCaseBodySchema: JsonSchema = {
    type: JsonSchemaType.OBJECT,
    description: 'Schema for deploying a workflow use case',
    properties: {
        ...deployUseCaseProperties,
        UseCaseType: {
            type: JsonSchemaType.STRING,
            description: 'Type of the use case to be deployed. Must be "Workflow" for workflow deployments.',
            enum: [USE_CASE_TYPES.WORKFLOW]
        },
        LlmParams: llmParamsSchema,
        WorkflowParams: workflowCoreParams
    },
    required: ['UseCaseName', 'UseCaseType', 'LlmParams', 'WorkflowParams'],
    additionalProperties: false
};
