// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import {
    AGENT_CORE_SYSTEM_PROMPT_MAX_LENGTH,
    AUTHENTICATION_PROVIDERS,
    CfnParameterKeys,
    CHAT_PROVIDERS
} from '../../utils/constants';
import RequestValidationError from '../../utils/error';
import { tracer } from '../../power-tools-init';
import { UseCase } from '../use-case';
import { AgentBuilderUseCaseConfiguration } from '../types';
import { UseCaseValidator } from './base-validator';
import { getCognitoDomainPrefixByUserPool } from './validation-utils';
import { ConfigMergeUtils } from './config-merge-utils';

/**
 * Validator for Agent Builder use cases (AgentCore).
 * Handles validation of agent builder specific parameters including system prompts,
 * tools, and memory configuration.
 */
export class AgentBuilderUseCaseValidator extends UseCaseValidator<AgentBuilderUseCaseConfiguration> {
    /**
     * Validates a new Agent Builder use case.
     * Ensures all required parameters are present and valid for AgentCore deployment.
     *
     * @param useCase - The Agent Builder use case to validate
     * @returns A promise that resolves to the validated use case
     * @throws RequestValidationError if validation fails
     */
    @tracer.captureMethod({ captureResponse: true, subSegmentName: '###validateNewAgentBuilderUseCase' })
    public async validateNewUseCase(useCase: UseCase): Promise<UseCase> {
        const config = this.getTypedConfiguration(useCase);

        // Validate that required AgentBuilderParams are present
        if (!config.AgentBuilderParams?.SystemPrompt) {
            throw new RequestValidationError('SystemPrompt is required for Agent Builder use cases.');
        }

        // Validate LLM provider is AgentCore
        if (config.LlmParams?.ModelProvider !== CHAT_PROVIDERS.BEDROCK) {
            throw new RequestValidationError('Agent Builder use cases must use BEDROCK as the ModelProvider.');
        }

        // Validate system prompt length
        const systemPrompt = config.AgentBuilderParams.SystemPrompt;
        if (systemPrompt.length > AGENT_CORE_SYSTEM_PROMPT_MAX_LENGTH) {
            throw new RequestValidationError(
                `SystemPrompt exceeds maximum length of ${AGENT_CORE_SYSTEM_PROMPT_MAX_LENGTH} characters.`
            );
        }

        // Validate Tools format if provided
        if (config.AgentBuilderParams.Tools) {
            this.validateTools(config.AgentBuilderParams.Tools);
        }

        // Handle authentication configuration
        await this.handleAuthenticationConfig(useCase, config);

        return useCase;
    }

    /**
     * Validates an updated Agent Builder use case.
     * Merges existing configuration with new configuration and validates the result.
     *
     * @param useCase - The Agent Builder use case to validate
     * @param oldDynamoDbRecordKey - The key of the old DynamoDB record
     * @returns A promise that resolves to the validated use case
     * @throws RequestValidationError if validation fails
     */
    @tracer.captureMethod({ captureResponse: true, subSegmentName: '###validateUpdateAgentBuilderUseCase' })
    public async validateUpdateUseCase(useCase: UseCase, oldDynamoDbRecordKey: string): Promise<UseCase> {
        // retrieve the existing config from DynamoDB using a dummy use case object
        let dummyOldUseCase = useCase.clone();
        dummyOldUseCase.setUseCaseConfigRecordKey(oldDynamoDbRecordKey);
        const existingConfigObj = await this.useCaseConfigMgmt.getUseCaseConfigFromTable(dummyOldUseCase);

        // Merge existing config with new config using Agent Builder specific merge logic
        useCase.configuration = await ConfigMergeUtils.mergeAgentBuilderConfigs(
            existingConfigObj,
            useCase.configuration
        );
        const config = this.getTypedConfiguration(useCase);

        // Validate the merged configuration
        if (!config.AgentBuilderParams?.SystemPrompt) {
            throw new RequestValidationError('SystemPrompt is required for Agent Builder use cases.');
        }

        // Validate system prompt length
        const systemPrompt = config.AgentBuilderParams.SystemPrompt;
        if (systemPrompt.length > AGENT_CORE_SYSTEM_PROMPT_MAX_LENGTH) {
            throw new RequestValidationError(
                `SystemPrompt exceeds maximum length of ${AGENT_CORE_SYSTEM_PROMPT_MAX_LENGTH} characters.`
            );
        }

        // Validate Tools format if provided
        if (config.AgentBuilderParams.Tools) {
            this.validateTools(config.AgentBuilderParams.Tools);
        }

        return useCase;
    }

    /**
     * Validates Tools array format and content.
     *
     * @param tools - Array of tool configurations
     * @throws RequestValidationError if validation fails
     */
    private validateTools(tools: Array<{ ToolId: string }>): void {
        tools.forEach((tool, index) => {
            if (!tool.ToolId || typeof tool.ToolId !== 'string' || tool.ToolId.trim().length === 0) {
                throw new RequestValidationError(`Tools[${index}].ToolId is required and must be a non-empty string.`);
            }
        });
    }

    /**
     * Handles authentication configuration for Agent Builder use cases.
     *
     * @param useCase - The use case being validated
     * @param config - The typed configuration
     */
    private async handleAuthenticationConfig(
        useCase: UseCase,
        config: AgentBuilderUseCaseConfiguration
    ): Promise<void> {
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
