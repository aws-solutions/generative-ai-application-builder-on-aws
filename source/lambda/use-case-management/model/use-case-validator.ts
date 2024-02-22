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

import { StorageManagement } from '../ddb/storage-management';
import { ConfigManagement } from '../ssm/config-management';
import { UseCase } from './use-case';
import { tracer } from '../power-tools-init';
import _ from 'lodash';
import { ChatRequiredPlaceholders, RAGChatRequiredPlaceholders } from '../utils/constants';

/**
 * Class responsible for validating that use cases can be used for creations and updates,
 * while providing functionality to modify use cases to fit requirements.
 */
export class UseCaseValidator {
    storageMgmt: StorageManagement;
    configMgmt: ConfigManagement;

    constructor(storageMgmt: StorageManagement, configMgmt: ConfigManagement) {
        this.storageMgmt = storageMgmt;
        this.configMgmt = configMgmt;
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
        if (!useCase.configuration.LlmParams!.PromptTemplate) {
            useCase.configuration.LlmParams!.PromptTemplate = modelInfo.Prompt;
        }

        await UseCaseValidator.checkModelInputPayloadSchema(useCase); // NOSONAR - typescript:S4123 - await is required in tests despite seeming unnecessary
        await UseCaseValidator.checkPromptIsCompatible(useCase); // NOSONAR - typescript:S4123 - await is required in tests despite seeming unnecessary
        return useCase;
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
    public async validateUpdateUseCase(useCase: UseCase, oldSSMParamName: string): Promise<UseCase> {
        // retrieving the existing config from SSM using a dummy use case object
        const existingConfigObj = await this.configMgmt.getUseCaseConfigFromName(oldSSMParamName);
        // this await is required for this to work on lambda, despite it seeming unnecessary here
        useCase.configuration = await UseCaseValidator.mergeConfigs(existingConfigObj, useCase.configuration);

        await this.storageMgmt.getModelInfo(useCase); // will throw if provider/model id combo does not exist
        await UseCaseValidator.checkModelInputPayloadSchema(useCase); // NOSONAR - typescript:S4123 - await is required in tests despite seeming unnecessary
        await UseCaseValidator.checkPromptIsCompatible(useCase); // NOSONAR - typescript:S4123 - await is required in tests despite seeming unnecessary
        return useCase;
    }

    /**
     * Merge existing config with new config, replacing common parameters with the new values.
     * For the LlmParams.ModelParams, the values from the new config are used to overwrite the
     * existing config's ModelParms.
     * @param existingConfigObj Existing config data object
     * @param newConfigObj Config data to be updated
     * @returns
     */
    @tracer.captureMethod({ captureResponse: true, subSegmentName: '###validateUpdateUseCase' })
    private static mergeConfigs(existingConfigObj: any, newConfigObj: any): any {
        const modelParams = _.get(newConfigObj, 'LlmParams.ModelParams', undefined);

        const mergedConfig = _.merge(existingConfigObj, newConfigObj);
        if (modelParams) {
            mergedConfig.LlmParams.ModelParams = modelParams;
        }
        return mergedConfig;
    }

    /**
     * Checks that the provided prompt is valid given the configuration. Namely, correct placeholders are present for given RAG configuration.
     *
     * @param useCase use case to check
     * @throws if validation fails
     */
    @tracer.captureMethod({ captureResponse: true, subSegmentName: '###checkModelInputPayloadSchema' })
    private static checkModelInputPayloadSchema(useCase: UseCase): void {
        const modelInputPayloadSchema = useCase.configuration.LlmParams!.ModelInputPayloadSchema;
        if (modelInputPayloadSchema !== undefined) {
            // finds all the placeholders ("<<value>>") in the payload scheme
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
                        throw new Error(
                            'No model parameters were provided in the useCase despite requiring parameters in the input payload schema.'
                        );
                    } else if (modelParams[key as keyof Object] !== undefined) {
                        return;
                    } else {
                        throw new Error(
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
    @tracer.captureMethod({ captureResponse: true, subSegmentName: '###checkPromptIsCompatible' })
    private static checkPromptIsCompatible(useCase: UseCase): void {
        const promptTemplate = useCase.configuration.LlmParams!.PromptTemplate!;
        const requiredPlacholders = useCase.configuration.LlmParams!.RAGEnabled
            ? RAGChatRequiredPlaceholders
            : ChatRequiredPlaceholders;
        const result = requiredPlacholders.every((placeholder) => promptTemplate.includes(placeholder));
        if (!result) {
            throw new Error(
                `Provided prompt does not have the required placeholders (${requiredPlacholders.toString()}) for a use case with RAGEnabled=${
                    useCase.configuration.LlmParams!.RAGEnabled
                }`
            );
        }
    }
}
