// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { JsonSchema, JsonSchemaType } from 'aws-cdk-lib/aws-apigateway';
import { updateUseCaseProperties } from '../base-usecase-schema';
import { llmParamsUpdateSchema } from '../../shared/llm-params';
import { agentCoreParamsUpdateSchema } from './params/agent-core-params';
import { USE_CASE_TYPES } from '../../../../utils/constants';

export const updateAgentUseCaseBodySchema: JsonSchema = {
    type: JsonSchemaType.OBJECT,
    description: 'Schema for updating an agent use case',
    properties: {
        ...updateUseCaseProperties,
        UseCaseType: {
            type: JsonSchemaType.STRING,
            description: 'Type of the use case to be deployed. Must be "AgentBuilder" for agent deployments.',
            enum: [USE_CASE_TYPES.AGENT_BUILDER]
        },
        LlmParams: llmParamsUpdateSchema,
        AgentParams: agentCoreParamsUpdateSchema
    },
    additionalProperties: false
};
