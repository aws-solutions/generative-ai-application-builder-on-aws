// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { CognitoIdentityProviderClient, DescribeUserPoolCommand } from '@aws-sdk/client-cognito-identity-provider';
import { AWSClientManager } from 'aws-sdk-lib';
import _ from 'lodash';
import { logger, tracer } from '../../power-tools-init';
import {
    ChatRequiredPlaceholders,
    CHAT_PROVIDERS,
    DisambiguationRequiredPlaceholders,
    KnowledgeBaseTypes,
    RAGChatRequiredPlaceholders
} from '../../utils/constants';
import RequestValidationError from '../../utils/error';
import { UseCaseConfiguration } from '../types';

/**
 * Utility class containing shared validation methods used across different validators.
 * This promotes code reuse and maintains consistency in validation logic.
 */
export class ValidationUtils {
    /**
     * Checks that the provided prompt is valid given the configuration.
     * Namely, correct placeholders are present for the given RAG configuration.
     *
     * @param config configuration to check
     * @throws if validation fails
     */
    @tracer.captureMethod({ captureResponse: true, subSegmentName: '###checkModelInputPayloadSchema' })
    static checkModelInputPayloadSchema(config: UseCaseConfiguration): void {
        const modelInputPayloadSchema = config.LlmParams!.SageMakerLlmParams?.ModelInputPayloadSchema;
        if (modelInputPayloadSchema !== undefined) {
            // finds all the placeholders ("<<value>>") in the payload schema
            const regex = /<<\w+>>/g;
            const reservedPlaceholders = ['<<prompt>>', '<<temperature>>'];
            const modelInputPayloadSchemaStr = JSON.stringify(modelInputPayloadSchema);
            const matches = modelInputPayloadSchemaStr.match(regex);
            const modelParams = config.LlmParams!.ModelParams;

            if (matches) {
                // reserved placeholders aren't provided in the model parameters
                _.remove(matches as string[], (match: string) => {
                    return reservedPlaceholders.includes(match);
                });

                matches.forEach((match) => {
                    const key = match.replace('<<', '').replace('>>', '');
                    if (modelParams === undefined) {
                        throw new RequestValidationError(
                            'No model parameters were provided in the useCase despite requiring parameters in the input payload schema.'
                        );
                    } else if (modelParams[key as keyof Object] !== undefined) {
                        return;
                    } else {
                        throw new RequestValidationError(
                            `InvalidModelParameter: ${key} is not a valid model parameter present in the Model Parameters`
                        );
                    }
                });
            }
        }
    }

    /**
     * Checks that the provided prompt is valid given the configuration.
     * Namely, correct placeholders are present for given RAG configuration.
     *
     * @param config configuration to check
     * @throws if validation fails
     */
    @tracer.captureMethod({ captureResponse: true, subSegmentName: '###checkPromptsAreCompatible' })
    static checkPromptsAreCompatible(config: UseCaseConfiguration): void {
        //validate main prompt template
        const promptTemplate = config.LlmParams!.PromptParams!.PromptTemplate!;
        const chat_provider = config.LlmParams!.ModelProvider;
        const requiredPlaceholders = config.LlmParams!.RAGEnabled
            ? RAGChatRequiredPlaceholders[chat_provider as CHAT_PROVIDERS]
            : ChatRequiredPlaceholders[chat_provider as CHAT_PROVIDERS];

        requiredPlaceholders.forEach((placeholder: string) => {
            if (!promptTemplate.includes(placeholder)) {
                throw new RequestValidationError(
                    `Provided prompt template does not have the required placeholder '${placeholder}'.`
                );
            }

            if (promptTemplate.indexOf(placeholder) !== promptTemplate.lastIndexOf(placeholder)) {
                throw new RequestValidationError(
                    `Placeholder '${placeholder}' should appear only once in the prompt template.`
                );
            }
        });

        if (config.LlmParams!.RAGEnabled && config.LlmParams!.PromptParams?.DisambiguationEnabled) {
            const disambiguationPromptTemplate = config.LlmParams!.PromptParams.DisambiguationPromptTemplate!;

            DisambiguationRequiredPlaceholders.forEach((placeholder: string) => {
                if (!disambiguationPromptTemplate.includes(placeholder)) {
                    throw new RequestValidationError(
                        `Provided disambiguation prompt template does not have the required placeholder '${placeholder}'.`
                    );
                }

                if (
                    disambiguationPromptTemplate.indexOf(placeholder) !==
                    disambiguationPromptTemplate.lastIndexOf(placeholder)
                ) {
                    throw new RequestValidationError(
                        `Placeholder '${placeholder}' should appear only once in the disambiguation prompt template.`
                    );
                }
            });
        }
    }

    /**
     * In order for a prompt to contain curly braces (e.g. providing code or JSON data in the prompt),
     * LangChain requires they are escaped by being doubled ({{ }} rather than {}),
     * so as to not interfere with the placeholders (e.g. history, etc.)
     *
     * @param config configuration to check
     * @throws if validation fails
     */
    @tracer.captureMethod({ captureResponse: true, subSegmentName: '###checkPromptIsEscaped' })
    static checkPromptIsEscaped(config: UseCaseConfiguration): void {
        // removes all the placeholders, which are valid uses of unescaped curly braces
        let promptTemplate = config.LlmParams!.PromptParams!.PromptTemplate!;
        const chat_provider = config.LlmParams!.ModelProvider!;
        const requiredPlaceholders = config.LlmParams!.RAGEnabled
            ? RAGChatRequiredPlaceholders[chat_provider as CHAT_PROVIDERS]
            : ChatRequiredPlaceholders[chat_provider as CHAT_PROVIDERS];

        requiredPlaceholders.forEach((placeholder: string) => {
            promptTemplate = promptTemplate.replace(placeholder, '');
        });

        // ensure both types of braces are escaped (doubled), per langchain standards
        const escapableCharacters = ['{', '}'];
        escapableCharacters.forEach((char) => {
            let index = 0;
            while (index < promptTemplate.length) {
                const charIndex = promptTemplate.indexOf(char, index);

                if (charIndex === -1) {
                    // No more curly braces found
                    break;
                }

                if (promptTemplate.charAt(charIndex + 1) !== char) {
                    throw new RequestValidationError(`Prompt template contains an unescaped curly brace '${char}'`);
                } else {
                    index = charIndex + 2;
                }
            }
        });
    }

    /**
     * Checks that the selected KnowledgeBaseType is compatible with the KnowledgeBaseParams provided
     *
     * @param config configuration to check
     * @throws if validation fails
     */
    @tracer.captureMethod({ captureResponse: true, subSegmentName: '###checkKnowledgeBaseTypeMatchesParams' })
    static checkKnowledgeBaseTypeMatchesParams(config: UseCaseConfiguration): void {
        if (config.LlmParams?.RAGEnabled) {
            const knowledgeBaseType = config.KnowledgeBaseParams!.KnowledgeBaseType!;

            let typeSpecificRequiredParamsObject: string = '';

            switch (knowledgeBaseType) {
                case KnowledgeBaseTypes.KENDRA:
                    if (config.KnowledgeBaseParams!.KendraKnowledgeBaseParams !== undefined) {
                        return;
                    } else {
                        typeSpecificRequiredParamsObject = 'KendraKnowledgeBaseParams';
                    }
                    break;
                case KnowledgeBaseTypes.BEDROCK:
                    if (config.KnowledgeBaseParams!.BedrockKnowledgeBaseParams !== undefined) {
                        return;
                    } else {
                        typeSpecificRequiredParamsObject = 'BedrockKnowledgeBaseParams';
                    }
                    break;
                default:
                    throw new RequestValidationError(
                        `Provided knowledge base type ${knowledgeBaseType} is not supported. You should not get this error.`
                    );
            }

            throw new RequestValidationError(
                `Provided knowledge base type ${knowledgeBaseType} requires ${typeSpecificRequiredParamsObject} to be present in KnowledgeBaseParams.`
            );
        }
    }
}

/**
 * Utility function to get Cognito domain prefix by user pool ID.
 * Separated from the main validator classes for reusability.
 *
 * @param userPoolId - The Cognito User Pool ID
 * @returns The domain prefix for the user pool
 * @throws Error if the user pool is not found or has no domain
 */
export async function getCognitoDomainPrefixByUserPool(userPoolId: string): Promise<string> {
    const client = AWSClientManager.getServiceClient<CognitoIdentityProviderClient>('cognito', tracer);

    try {
        const command = new DescribeUserPoolCommand({ UserPoolId: userPoolId });
        const response = await client.send(command);

        if (response?.UserPool?.Domain) {
            return response.UserPool.Domain;
        } else {
            throw new Error('No domain found for this user pool.');
        }
    } catch (error) {
        logger.error(`Error fetching user pool details. Error: ${error}`);
        throw error;
    }
}
