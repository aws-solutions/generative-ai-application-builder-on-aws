// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { JsonSchema, JsonSchemaType } from 'aws-cdk-lib/aws-apigateway';
import { USE_CASE_TYPES } from '../../../../utils/constants';
import { deployUseCaseProperties } from '../base-usecase-schema';
import { llmParamsSchema } from '../../shared/llm-params';
import { agentCoreParams } from './params/agent-core-params';

export const deployAgentUseCaseBodySchema: JsonSchema = {
    type: JsonSchemaType.OBJECT,
    description: 'Schema for deploying an agent use case',
    properties: {
        ...deployUseCaseProperties,
        UseCaseType: {
            type: JsonSchemaType.STRING,
            description: 'Type of the use case to be deployed. Must be "AgentBuilder" for agent deployments.',
            enum: [USE_CASE_TYPES.AGENT_BUILDER]
        },
        LlmParams: llmParamsSchema,
        AgentParams: agentCoreParams
    },
    required: ['UseCaseName', 'UseCaseType', 'LlmParams', 'AgentParams'],
    additionalProperties: false
};
