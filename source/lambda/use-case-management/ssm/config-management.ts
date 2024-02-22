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
    PutParameterCommandInputBuilder
} from './use-case-config-operation-builder';

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
     * @param useCase new use case, expected to be validated and merged with old already
     */
    @tracer.captureMethod({ captureResponse: true, subSegmentName: '###updateUseCaseConfig' })
    public async updateUseCaseConfig(useCase: UseCase, oldSSMParamName: string): Promise<void> {
        await this.createUseCaseConfig(useCase);

        let existingConfigUseCase = useCase.clone();
        existingConfigUseCase.setSSMParameterKey(oldSSMParamName);
        await this.deleteUseCaseConfig(existingConfigUseCase);
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
     * Retrieves a config SSM param by name
     *
     * @param configName name of the ssm parameter to retrieve. Value is expected to be a JSON string
     * @returns The parsed config object
     */
    @tracer.captureMethod({ captureResponse: true, subSegmentName: '###getUseCaseConfigFromName' })
    public async getUseCaseConfigFromName(configName: string): Promise<any> {
        const input = await new GetParameterFromNameCommandInputBuilder(configName).build(); //NOSONAR - without await, input is empty
        try {
            const response = await this.client.send(new GetParameterCommand(input));
            return JSON.parse(response.Parameter!.Value!);
        } catch (error) {
            const errMessage = `Failed to retrieve Use Case Config for name "${configName}": ${error}`;
            logger.error(errMessage);
            throw error;
        }
    }
}
