// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import {
    AGENT_CORE_SYSTEM_PROMPT_MAX_LENGTH,
    AUTHENTICATION_PROVIDERS,
    CfnParameterKeys,
    CHAT_PROVIDERS,
    SUPPORTED_WORKFLOW_ORCHESTRATION_PATTERNS,
    UseCaseTypes,
    WORKFLOW_ORCHESTRATION_PATTERNS
} from '../../utils/constants';
import RequestValidationError from '../../utils/error';
import { tracer } from '../../power-tools-init';
import { UseCase } from '../use-case';
import { WorkflowUseCaseConfiguration, AgentBuilderUseCaseConfiguration } from '../types';
import { UseCaseValidator } from './base-validator';
import { ConfigMergeUtils } from './config-merge-utils';
import { getCognitoDomainPrefixByUserPool } from './validation-utils';

/**
 * Validator for Workflow use cases.
 * Handles validation of workflow specific parameters including orchestration patterns,
 * system prompts, and selected agents.
 */
export class WorkflowUseCaseValidator extends UseCaseValidator<WorkflowUseCaseConfiguration> {
    /**
     * Validates a new Workflow use case.
     * Ensures all required parameters are present and valid for workflow deployment.
     *
     * @param useCase - The Workflow use case to validate
     * @returns A promise that resolves to the validated use case
     * @throws RequestValidationError if validation fails
     */
    @tracer.captureMethod({ captureResponse: true, subSegmentName: '###validateNewWorkflowUseCase' })
    public async validateNewUseCase(useCase: UseCase): Promise<UseCase> {
        const config = this.getTypedConfiguration(useCase);

        // Validate that required WorkflowParams are present
        if (!config.WorkflowParams?.OrchestrationPattern) {
            throw new RequestValidationError('OrchestrationPattern is required for Workflow use cases.');
        }

        // Validate LLM provider is Bedrock
        if (config.LlmParams?.ModelProvider !== CHAT_PROVIDERS.BEDROCK) {
            throw new RequestValidationError('Workflow use cases must use BEDROCK as the ModelProvider.');
        }

        // Validate system prompt is provided and within length limits
        if (!config.WorkflowParams?.SystemPrompt) {
            throw new RequestValidationError('SystemPrompt is required for Workflow use cases.');
        }
        if (config.WorkflowParams.SystemPrompt.length > AGENT_CORE_SYSTEM_PROMPT_MAX_LENGTH) {
            throw new RequestValidationError(
                `SystemPrompt exceeds maximum length of ${AGENT_CORE_SYSTEM_PROMPT_MAX_LENGTH} characters.`
            );
        }

        // Validate orchestration pattern
        this.validateOrchestrationPattern(config.WorkflowParams.OrchestrationPattern);

        // Validate agents as tools if provided
        if (config.WorkflowParams.AgentsAsToolsParams?.Agents) {
            this.validateAgentsAsTools(config.WorkflowParams.AgentsAsToolsParams.Agents);
        }

        // Handle authentication configuration
        await this.handleAuthenticationConfig(useCase, config);

        return useCase;
    }

    /**
     * Validates an updated Workflow use case.
     * Merges existing configuration with new configuration and validates the result.
     *
     * @param useCase - The Workflow use case to validate
     * @param oldDynamoDbRecordKey - The key of the old DynamoDB record
     * @returns A promise that resolves to the validated use case
     * @throws RequestValidationError if validation fails
     */
    @tracer.captureMethod({ captureResponse: true, subSegmentName: '###validateUpdateWorkflowUseCase' })
    public async validateUpdateUseCase(useCase: UseCase, oldDynamoDbRecordKey: string): Promise<UseCase> {
        // retrieve the existing config from DynamoDB using a dummy use case object
        let dummyOldUseCase = useCase.clone();
        dummyOldUseCase.setUseCaseConfigRecordKey(oldDynamoDbRecordKey);
        const existingConfigObj = await this.useCaseConfigMgmt.getUseCaseConfigFromTable(dummyOldUseCase);

        // Merge existing config with new config using Workflow specific merge logic
        useCase.configuration = await ConfigMergeUtils.mergeWorkflowConfigs(existingConfigObj, useCase.configuration);
        const config = this.getTypedConfiguration(useCase);

        // Validate system prompt is provided and within length limits
        if (!config.WorkflowParams?.SystemPrompt) {
            throw new RequestValidationError('SystemPrompt is required for Workflow use cases.');
        }
        if (config.WorkflowParams.SystemPrompt.length > AGENT_CORE_SYSTEM_PROMPT_MAX_LENGTH) {
            throw new RequestValidationError(
                `SystemPrompt exceeds maximum length of ${AGENT_CORE_SYSTEM_PROMPT_MAX_LENGTH} characters.`
            );
        }

        // Validate orchestration pattern
        if (!config.WorkflowParams?.OrchestrationPattern) {
            throw new RequestValidationError('OrchestrationPattern is required for Workflow use cases.');
        }
        this.validateOrchestrationPattern(config.WorkflowParams.OrchestrationPattern);

        // Validate agents as tools if provided
        if (config.WorkflowParams.OrchestrationPattern === WORKFLOW_ORCHESTRATION_PATTERNS.AGENTS_AS_TOOLS) {
            if (!config.WorkflowParams.AgentsAsToolsParams?.Agents) {
                throw new RequestValidationError('AgentsAsToolsParams.Agents is required for Workflow use cases.');
            }
            this.validateAgentsAsTools(config.WorkflowParams.AgentsAsToolsParams.Agents);
        }

        return useCase;
    }

    /**
     * Validates orchestration pattern format and content.
     *
     * @param orchestrationPattern - The orchestration pattern string
     * @throws RequestValidationError if validation fails
     */
    private validateOrchestrationPattern(orchestrationPattern: string): void {
        if (typeof orchestrationPattern !== 'string' || orchestrationPattern.trim().length === 0) {
            throw new RequestValidationError('OrchestrationPattern must be a non-empty string.');
        }

        if (!SUPPORTED_WORKFLOW_ORCHESTRATION_PATTERNS.includes(orchestrationPattern)) {
            throw new RequestValidationError(
                `Unsupported OrchestrationPattern: ${orchestrationPattern}. Supported patterns: ${SUPPORTED_WORKFLOW_ORCHESTRATION_PATTERNS.join(', ')}`
            );
        }
    }

    /**
     * Validates agents as tools array format and content.
     *
     * @param agents - Array of agent configurations for use as tools
     * @throws RequestValidationError if validation fails
     */
    private validateAgentsAsTools(
        agents: Array<
            Pick<
                AgentBuilderUseCaseConfiguration,
                'UseCaseType' | 'UseCaseName' | 'UseCaseDescription' | 'AgentBuilderParams' | 'LlmParams'
            >
        >
    ): void {
        if (!Array.isArray(agents) || agents.length === 0) {
            throw new RequestValidationError('Agents must be a non-empty array.');
        }

        agents.forEach((agent, index) => {
            if (!agent.UseCaseName || typeof agent.UseCaseName !== 'string' || agent.UseCaseName.trim().length === 0) {
                throw new RequestValidationError(
                    `Agents[${index}].UseCaseName is required and must be a non-empty string.`
                );
            }

            if (!agent.UseCaseType || typeof agent.UseCaseType !== 'string' || agent.UseCaseType.trim().length === 0) {
                throw new RequestValidationError(
                    `Agents[${index}].UseCaseType is required and must be a non-empty string.`
                );
            }

            //currently only support for other agents
            if (agent.UseCaseType !== UseCaseTypes.AGENT_BUILDER) {
                throw new RequestValidationError(
                    `Agents[${index}].UseCaseType must be '${UseCaseTypes.AGENT_BUILDER}'`
                );
            }
        });
    }

    /**
     * Handles authentication configuration for Workflow use cases.
     *
     * @param useCase - The use case being validated
     * @param config - The typed configuration
     */
    private async handleAuthenticationConfig(useCase: UseCase, config: WorkflowUseCaseConfiguration): Promise<void> {
        if (config.AuthenticationParams) {
            // prettier-ignore
            switch (config.AuthenticationParams.AuthenticationProvider) { //NOSONAR - typescript:S1301, switch statement used for ease of future extensions
                case AUTHENTICATION_PROVIDERS.COGNITO:
                    // overriding the previously set CognitoDomainPrefix parameter
                    // by fetching it dynamically based on the set user pool

                    const existingUserPoolId = useCase.cfnParameters?.get(CfnParameterKeys.ExistingCognitoUserPoolId);
                    if (!existingUserPoolId) {
                        throw new Error('Undefined user pool provided for the cognito authentication provider.');
                    }

                    const cognitoDomainPrefix = await getCognitoDomainPrefixByUserPool(existingUserPoolId);

                    if (!useCase.cfnParameters) {
                        throw new Error('CfnParameters are not available yet for setting Cognito Domain Prefix.');
                    }

                    useCase.cfnParameters.set(CfnParameterKeys.CognitoDomainPrefix, cognitoDomainPrefix);
                    break;
            }
        }
    }
}
