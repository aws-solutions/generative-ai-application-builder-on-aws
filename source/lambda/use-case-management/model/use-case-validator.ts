/**********************************************************************************************************************
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.                                                *
 *                                                                                                                    *
 *  Licensed under the Apache License, Version 2.0 (the "License"). You may not use this file except in compliance    *
 *  with the License. A copy of the License is located at                                                             *
 *                                                                                                                    *
 *      http://www.apache.org/licenses/LICENSE-2.0                                                                    *
 *                                                                                                                    *
 *  or in the 'license' file accompanying this file. This file is distributed on an 'AS IS' BASIS, WITHOUT WARRANTIES *
 *  OR CONDITIONS OF ANY KIND, express or implied. See the License for the specific language governing permissions    *
 *  and limitations under the License.                                                                                *
 **********************************************************************************************************************/

import _ from 'lodash';
import { CognitoIdentityProviderClient, DescribeUserPoolCommand } from "@aws-sdk/client-cognito-identity-provider";;
import { StorageManagement } from '../ddb/storage-management';
import { UseCaseConfigManagement } from '../ddb/use-case-config-management';
import { tracer } from '../power-tools-init';
import {
    AUTHENTICATION_PROVIDERS,
    CfnParameterKeys,
    ChatRequiredPlaceholders,
    DisambiguationRequiredPlaceholders,
    KnowledgeBaseTypes,
    RAGChatRequiredPlaceholders
} from '../utils/constants';
import RequestValidationError from '../utils/error';
import { UseCase } from './use-case';
import { customAwsConfig } from 'aws-node-user-agent-config';

/**
 * Class responsible for validating that use cases can be used for creations and updates,
 * while providing functionality to modify use cases to fit requirements.
 */
export class UseCaseValidator {
    storageMgmt: StorageManagement;
    useCaseConfigMgmt: UseCaseConfigManagement;

    constructor(storageMgmt: StorageManagement, useCaseConfigMgmt: UseCaseConfigManagement) {
        this.storageMgmt = storageMgmt;
        this.useCaseConfigMgmt = useCaseConfigMgmt;
    }

    /**
     * Validates a use case meant for a new deployment fills in values as required. Will:
     * - Check the model info database to ensure provider/modelid combination is valid
     * - Populate a default prompt if none is provided
     *
     * @param config a config to validate
     * @returns validated config with values filled in where needed
     * @throws if the config is invalid or cannot be validated for some reason
     */
    @tracer.captureMethod({ captureResponse: true, subSegmentName: '###validateNewUseCase' })
    public async validateNewUseCase(useCase: UseCase): Promise<UseCase> {
        const modelInfo = await this.storageMgmt.getModelInfo(useCase); // will throw if provider/model id combo does not exist
        if (!useCase.configuration.LlmParams!.PromptParams) {
            useCase.configuration.LlmParams!.PromptParams = {};
        }
        if (!useCase.configuration.LlmParams!.PromptParams.PromptTemplate) {
            useCase.configuration.LlmParams!.PromptParams.PromptTemplate = modelInfo.Prompt;
        }
        if (!useCase.configuration.LlmParams!.PromptParams.DisambiguationPromptTemplate) {
            useCase.configuration.LlmParams!.PromptParams.DisambiguationPromptTemplate = modelInfo.DisambiguationPrompt;
        }


        if (useCase.configuration.AuthenticationParams) {
            switch (useCase.configuration.AuthenticationParams.AuthenticationProvider) {
                case AUTHENTICATION_PROVIDERS.COGNITO:
                    // overriding the previously set CognitoDomainPrefix parameter 
                    // by fetching it dynamically based on the set user pool

                    const existingUserPoolId = useCase.cfnParameters?.get(CfnParameterKeys.ExistingCognitoUserPoolId);
                    if (!existingUserPoolId) {
                        throw new Error(`Undefined user pool provided for the cognito authentication provider.`)
                    }

                    const cognitoDomainPrefix = await this.getCognitoDomainPrefixByUserPool(existingUserPoolId);

                    if (!useCase.cfnParameters) {
                        throw new Error(`CFNParameters are not available yet for setting Cognito Domain Prefix.`)
                    }

                    useCase.cfnParameters.set(CfnParameterKeys.CognitoDomainPrefix, cognitoDomainPrefix);

                    break;
            }
        }

        await UseCaseValidator.checkModelInputPayloadSchema(useCase); // NOSONAR - typescript:S4123 - await is required in tests despite seeming unnecessary
        await UseCaseValidator.checkPromptsAreCompatible(useCase); // NOSONAR - typescript:S4123 - await is required in tests despite seeming unnecessary
        await UseCaseValidator.checkKnowledgeBaseTypeMatchesParams(useCase); // NOSONAR - typescript:S4123 - await is required in tests despite seeming unnecessary
        return useCase;
    }

    private async getCognitoDomainPrefixByUserPool(userPoolId: string) {

        const client = new CognitoIdentityProviderClient(customAwsConfig());

        try {
            const command = new DescribeUserPoolCommand({ UserPoolId: userPoolId });
            const response = await client.send(command);

            if (response.UserPool && response.UserPool.Domain) {
                return response.UserPool.Domain;
            } else {
                throw new Error(`No domain found for this user pool.`);
            }
        } catch (error) {
            console.log(`Error fetching user pool details. Error: ${error}`)
            throw error;
        }
    }

    /**
     * Validates a use case meant for an update fills in values as required. Will:
     * - Check the model info database to ensure provider/modelid combination is valid
     *
     * @param config a config to validate
     * @param oldSSMParamName the name of the SSM parameter previously used by this use case. Used to retrieve the existing config and merge with the new one.
     * @returns validated config with values filled in where needed
     * @throws if the config is invalid or cannot be validated for some reason
     */
    @tracer.captureMethod({ captureResponse: true, subSegmentName: '###validateUpdateUseCase' })
    public async validateUpdateUseCase(useCase: UseCase, oldDynamoDbRecordKey: string): Promise<UseCase> {
        // retrieve the existing config from DynamoDB using a dummy use case object
        let dummyOldUseCase = useCase.clone();
        dummyOldUseCase.setUseCaseConfigRecordKey(oldDynamoDbRecordKey);
        const existingConfigObj = await this.useCaseConfigMgmt.getUseCaseConfigFromTable(dummyOldUseCase);

        // this await is required for this to work on lambda, despite it seeming unnecessary here
        useCase.configuration = await UseCaseValidator.mergeConfigs(existingConfigObj, useCase.configuration);

        await this.storageMgmt.getModelInfo(useCase); // will throw if provider/model id combo does not exist
        await UseCaseValidator.checkModelInputPayloadSchema(useCase); // NOSONAR - typescript:S4123 - await is required in tests despite seeming unnecessary
        await UseCaseValidator.checkPromptsAreCompatible(useCase); // NOSONAR - typescript:S4123 - await is required in tests despite seeming unnecessary
        await UseCaseValidator.checkKnowledgeBaseTypeMatchesParams(useCase); // NOSONAR - typescript:S4123 - await is required in tests despite seeming unnecessary
        return useCase;
    }

    /**
     * Merge existing config with new config, replacing common parameters with the new values.
     * For the LlmParams.ModelParams, the values from the new config are used to overwrite the
     * existing config's ModelParams.
     * @param existingConfigObj Existing config data object
     * @param newConfigObj Config data to be updated
     * @returns
     */
    @tracer.captureMethod({ captureResponse: true, subSegmentName: '###checkMergeConfigs' })
    private static mergeConfigs(existingConfigObj: any, newConfigObj: any): any {
        const modelParams = _.get(newConfigObj, 'LlmParams.ModelParams', undefined);
        const sageMakerModelInputPayloadSchema = _.get(
            newConfigObj,
            'LlmParams.SageMakerLlmParams.ModelInputPayloadSchema',
            undefined
        );
        const mergedConfig = _.merge(existingConfigObj, newConfigObj);

        if (modelParams) {
            mergedConfig.LlmParams.ModelParams = modelParams;
        }
        if (sageMakerModelInputPayloadSchema) {
            mergedConfig.LlmParams.SageMakerLlmParams.ModelInputPayloadSchema = sageMakerModelInputPayloadSchema;
        }
        return mergedConfig;
    }

    /**
     * Checks that the provided prompt is valid given the configuration.
     * Namely, correct placeholders are present for the given RAG configuration.
     *
     * @param useCase use case to check
     * @throws if validation fails
     */
    @tracer.captureMethod({ captureResponse: true, subSegmentName: '###checkModelInputPayloadSchema' })
    private static checkModelInputPayloadSchema(useCase: UseCase): void {
        const modelInputPayloadSchema = useCase.configuration.LlmParams!.SageMakerLlmParams?.ModelInputPayloadSchema;
        if (modelInputPayloadSchema !== undefined) {
            // finds all the placeholders ("<<value>>") in the payload schema
            const regex = /<<\w+>>/g;
            const reservedPlaceholders = ['<<prompt>>', '<<temperature>>'];
            const modelInputPayloadSchemaStr = JSON.stringify(modelInputPayloadSchema);
            const matches = modelInputPayloadSchemaStr.match(regex);
            const modelParams = useCase.configuration.LlmParams!.ModelParams;

            if (matches) {
                // reserved placeholders aren't provided in the model parameters
                _.remove(matches, (match: string) => {
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
     * Checks that the provided prompt is valid given the configuration. Namely, correct placeholders are present for given RAG configuration.
     *
     * @param useCase use case to check
     * @throws if validation fails
     */
    @tracer.captureMethod({ captureResponse: true, subSegmentName: '###checkPromptsAreCompatible' })
    private static checkPromptsAreCompatible(useCase: UseCase): void {
        //validate main prompt template
        const promptTemplate = useCase.configuration.LlmParams!.PromptParams!.PromptTemplate!;
        const requiredPlaceholders = useCase.configuration.LlmParams!.RAGEnabled
            ? RAGChatRequiredPlaceholders
            : ChatRequiredPlaceholders;

        requiredPlaceholders.forEach((placeholder) => {
            //placeholder must exist
            if (!promptTemplate.includes(placeholder)) {
                throw new RequestValidationError(
                    `Provided prompt template does not have the required placeholder '${placeholder}'.`
                );
            }

            //placeholder must exist only once
            if (promptTemplate.indexOf(placeholder) !== promptTemplate.lastIndexOf(placeholder)) {
                throw new RequestValidationError(
                    `Placeholder '${placeholder}' should appear only once in the prompt template.`
                );
            }
        });

        //validate disambiguation prompt template
        if (
            useCase.configuration.LlmParams!.RAGEnabled &&
            useCase.configuration.LlmParams!.PromptParams?.DisambiguationEnabled
        ) {
            const disambiguationPromptTemplate =
                useCase.configuration.LlmParams!.PromptParams.DisambiguationPromptTemplate!;

            DisambiguationRequiredPlaceholders.forEach((placeholder) => {
                //placeholder must exist
                if (!disambiguationPromptTemplate.includes(placeholder)) {
                    throw new RequestValidationError(
                        `Provided disambiguation prompt template does not have the required placeholder '${placeholder}'.`
                    );
                }

                //placeholder must exist only once
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
     * Checks that the selected KnowledgeBaseType is compatible with the KnowledgeBaseParams provided
     *
     * @param useCase use case to check
     * @throws if validation fails
     */
    @tracer.captureMethod({ captureResponse: true, subSegmentName: '###checkPromptIsCompatible' })
    private static checkKnowledgeBaseTypeMatchesParams(useCase: UseCase): void {
        if (useCase.configuration.LlmParams?.RAGEnabled) {
            const knowledgeBaseType = useCase.configuration.KnowledgeBaseParams!.KnowledgeBaseType!;

            let typeSpecificRequiredParamsObject: string = '';

            switch (knowledgeBaseType) {
                case KnowledgeBaseTypes.KENDRA:
                    if (useCase.configuration.KnowledgeBaseParams!.KendraKnowledgeBaseParams !== undefined) {
                        return;
                    } else {
                        typeSpecificRequiredParamsObject = 'KendraKnowledgeBaseParams';
                    }
                    break;
                case KnowledgeBaseTypes.BEDROCK:
                    if (useCase.configuration.KnowledgeBaseParams!.BedrockKnowledgeBaseParams !== undefined) {
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
