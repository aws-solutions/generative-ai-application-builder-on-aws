// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { AUTHENTICATION_PROVIDERS, CfnParameterKeys } from '../../utils/constants';
import { tracer } from '../../power-tools-init';
import { UseCase } from '../use-case';
import { UseCaseConfiguration } from '../types';
import { UseCaseValidator } from './base-validator';
import { ConfigMergeUtils } from './config-merge-utils';
import { ValidationUtils, getCognitoDomainPrefixByUserPool } from './validation-utils';

/**
 * Validator for Text/Chat use cases.
 * Handles validation of LLM parameters, prompts, knowledge base configuration,
 * and authentication settings specific to text-based use cases.
 */
export class TextUseCaseValidator extends UseCaseValidator<UseCaseConfiguration> {
    /**
     * Validates a use case meant for a new text deployment fills in values as required. Will:
     * - Check the model info database to ensure provider/modelid combination is valid
     * - Populate a default prompt if none is provided
     *
     * @param useCase a use case to validate
     * @returns validated use case with values filled in where needed
     * @throws if the use case is invalid or cannot be validated for some reason
     */
    @tracer.captureMethod({ captureResponse: true, subSegmentName: '###validateNewTextUseCase' })
    public async validateNewUseCase(useCase: UseCase): Promise<UseCase> {
        const config = this.getTypedConfiguration(useCase);
        const modelInfo = await this.storageMgmt.getModelInfo(useCase); // will throw if provider/model id combo does not exist

        if (!config.LlmParams!.PromptParams) {
            config.LlmParams!.PromptParams = {};
        }
        if (!config.LlmParams!.PromptParams.PromptTemplate) {
            config.LlmParams!.PromptParams.PromptTemplate = modelInfo.Prompt;
        }
        if (!config.LlmParams!.PromptParams.DisambiguationPromptTemplate) {
            config.LlmParams!.PromptParams.DisambiguationPromptTemplate = modelInfo.DisambiguationPrompt;
        }

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
                        throw new Error('CFNParameters are not available yet for setting Cognito Domain Prefix.');
                    }

                    useCase.cfnParameters.set(CfnParameterKeys.CognitoDomainPrefix, cognitoDomainPrefix);

                    break;
            }
        }

        ValidationUtils.checkModelInputPayloadSchema(config);
        ValidationUtils.checkPromptsAreCompatible(config);
        ValidationUtils.checkPromptIsEscaped(config);
        ValidationUtils.checkKnowledgeBaseTypeMatchesParams(config);

        return useCase;
    }

    /**
     * Validates a use case meant for an update fills in values as required. Will:
     * - Check the model info database to ensure provider/modelid combination is valid
     *
     * @param useCase a use case to validate
     * @param oldDynamoDbRecordKey the key of the old DynamoDB record. Used to retrieve the existing config and merge with the new one.
     * @returns validated use case with values filled in where needed
     * @throws if the use case is invalid or cannot be validated for some reason
     */
    @tracer.captureMethod({ captureResponse: true, subSegmentName: '###validateUpdateTextUseCase' })
    public async validateUpdateUseCase(useCase: UseCase, oldDynamoDbRecordKey: string): Promise<UseCase> {
        // retrieve the existing config from DynamoDB using a dummy use case object
        let dummyOldUseCase = useCase.clone();
        dummyOldUseCase.setUseCaseConfigRecordKey(oldDynamoDbRecordKey);
        const existingConfigObj = await this.useCaseConfigMgmt.getUseCaseConfigFromTable(dummyOldUseCase);
        // this await is required for this to work on lambda, despite it seeming unnecessary here
        useCase.configuration = await ConfigMergeUtils.mergeConfigs(existingConfigObj, useCase.configuration);
        const config = this.getTypedConfiguration(useCase);

        await this.storageMgmt.getModelInfo(useCase); // will throw if provider/model id combo does not exist
        ValidationUtils.checkModelInputPayloadSchema(config);
        ValidationUtils.checkPromptsAreCompatible(config);
        ValidationUtils.checkPromptIsEscaped(config);
        ValidationUtils.checkKnowledgeBaseTypeMatchesParams(config);

        return useCase;
    }

    // Static methods for backward compatibility with tests
    public static mergeConfigs = ConfigMergeUtils.mergeConfigs;
    public static resolveBedrockModelSourceOnUpdate = ConfigMergeUtils.resolveBedrockModelSourceOnUpdate;
    public static resolveKnowledgeBaseParamsOnUpdate = ConfigMergeUtils.resolveKnowledgeBaseParamsOnUpdate;
}
