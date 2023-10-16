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

import { DeleteParameterCommand, GetParameterCommand, PutParameterCommand, SSMClient } from '@aws-sdk/client-ssm';
import { customAwsConfig } from 'aws-node-user-agent-config';
import { UseCase } from '../model/use-case';
import { logger, tracer } from '../power-tools-init';
import {
    DeleteParameterCommandInputBuilder,
    GetParameterCommandBuilder,
    PutParameterCommandInputBuilder
} from './use-case-config-operation-builder';

import { merge, get } from 'lodash';
import { GetParameterFromNameCommandInputBuilder } from './use-case-config-view-builder';

/**
 * Class to store configs for deployed use cases.
 */
export class ConfigManagement {
    private client: SSMClient;

    constructor() {
        this.client = new SSMClient(customAwsConfig());
    }

    /**
     * Method to create a new SSM parameter for a deployed use case
     *
     * @param useCase
     */
    @tracer.captureMethod({ captureResponse: true, subSegmentName: '###createUseCaseConfig' })
    public async createUseCaseConfig(useCase: UseCase): Promise<void> {
        const input = await new PutParameterCommandInputBuilder(useCase).build(); //NOSONAR - without await, input is empty
        try {
            await this.client.send(new PutParameterCommand(input));
        } catch (error) {
            const errMessage = `Failed to create Use Case Config: ${error}`;
            logger.error(errMessage);
            throw error;
        }
    }

    /**
     * Method to update an existing SSM parameter for a deployed use case
     *
     * @param useCase
     */
    @tracer.captureMethod({ captureResponse: true, subSegmentName: '###updateUseCaseConfig' })
    public async updateUseCaseConfig(useCase: UseCase, oldSSMParamName: string): Promise<void> {
        // retrieving the existing config from SSM using a dummy use case object
        let existingConfigObj = {};
        let existingConfigUseCase = useCase.clone();
        existingConfigUseCase.setSSMParameterKey(oldSSMParamName);
        try {
            const getInput = await new GetParameterCommandBuilder(existingConfigUseCase).build(); //NOSONAR - without await, input is empty
            const existingConfig = await this.client.send(new GetParameterCommand(getInput));
            existingConfigObj = JSON.parse(existingConfig.Parameter!.Value!);
        } catch (error) {
            const errMessage = `Failed to retrieve existing Use Case Config during update: ${error}.`;
            logger.error(errMessage);
            throw error;
        }

        // merges existing config with new config, replacing common parameters with the new values
        // all ModelParams must be overwritten by the input values
        try {
            useCase.configuration = ConfigManagement.mergeConfigs(existingConfigObj, useCase.configuration);
            const putInput = await new PutParameterCommandInputBuilder(useCase).build(); //NOSONAR - without await, input is empty
            await this.client.send(new PutParameterCommand(putInput));
        } catch (error) {
            const errMessage = `Failed to update Use Case Config during update: ${error}.`;
            logger.error(errMessage);
            throw error;
        }

        // deletes the old SSM parameter
        try {
            const input = await new DeleteParameterCommandInputBuilder(existingConfigUseCase).build(); //NOSONAR - without await, input is empty
            await this.client.send(new DeleteParameterCommand(input));
        } catch (error) {
            const errMessage = `Failed to delete Use Case Config: ${error}`;
            logger.error(errMessage);
            throw error;
        }
    }

    /**
     * Merge existing config with new config, replacing common parameters with the new values.
     * For the LlmParams.ModelParams, the values from the new config are used to overwrite the
     * existing config's ModelParms.
     * @param existingConfigObj Existing config data object
     * @param newConfigObj Config data to be updated
     * @returns
     */
    private static mergeConfigs(existingConfigObj: any, newConfigObj: any): any {
        const modelParams = get(newConfigObj, 'LlmParams.ModelParams', undefined);

        const mergedConfig = merge(existingConfigObj, newConfigObj);
        if (modelParams) {
            mergedConfig.LlmParams.ModelParams = modelParams;
        }
        return mergedConfig;
    }

    /**
     * Method to delete an existing SSM parameter for a deployed use case
     *
     * @param useCase
     */
    @tracer.captureMethod({ captureResponse: true, subSegmentName: '###deleteUseCaseConfig' })
    public async deleteUseCaseConfig(useCase: UseCase): Promise<void> {
        const input = await new DeleteParameterCommandInputBuilder(useCase).build(); //NOSONAR - without await, input is empty
        try {
            await this.client.send(new DeleteParameterCommand(input));
        } catch (error) {
            const errMessage = `Failed to delete Use Case Config: ${error}`;
            logger.error(errMessage);
            throw error;
        }
    }

    /**
     * Method to retrieve an existing SSM parameter for a deployed use case
     */
    @tracer.captureMethod({ captureResponse: true, subSegmentName: '###getUseCaseConfig' })
    public async getUseCaseConfig(useCase: UseCase): Promise<void> {
        const input = await new GetParameterCommandBuilder(useCase).build(); //NOSONAR - without await, input is empty
        try {
            await this.client.send(new GetParameterCommand(input));
        } catch (error) {
            const errMessage = `Failed to retrieve Use Case Config: ${error}`;
            logger.error(errMessage);
            throw error;
        }
    }

    public async getUseCaseConfigFromName(configName: string): Promise<string> {
        const input = await new GetParameterFromNameCommandInputBuilder(configName).build(); //NOSONAR - without await, input is empty
        try {
            const response = await this.client.send(new GetParameterCommand(input));
            return response.Parameter!.Value!;
        } catch (error) {
            const errMessage = `Failed to retrieve Use Case Config for name "${configName}": ${error}`;
            logger.error(errMessage);
            throw error;
        }
    }
}
