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

import {
    DeleteSecretCommand,
    CreateSecretCommand,
    SecretsManagerClient,
    PutSecretValueCommand
} from '@aws-sdk/client-secrets-manager';
import { customAwsConfig } from 'aws-node-user-agent-config';
import { UseCase } from '../model/use-case';
import { logger, tracer } from '../power-tools-init';
import {
    DeleteSecretCommandInputBuilder,
    CreateSecretCommandInputBuilder,
    PutSecretValueCommandInputBuilder
} from './api-key-secret-operation-builder';

/**
 * Class to store API keys in secretsmanager for deployed use cases.
 */
export class SecretManagement {
    private client: SecretsManagerClient;

    constructor() {
        this.client = new SecretsManagerClient(customAwsConfig());
    }

    /**
     * Method to create a new Secrets Manager secret for a deployed use case.
     * Also used for updates as we wish to always overwrite the existing secret.
     *
     * @param useCase
     */
    @tracer.captureMethod({ captureResponse: true, subSegmentName: '###createSecret' })
    public async createSecret(useCase: UseCase): Promise<void> {
        const input = await new CreateSecretCommandInputBuilder(useCase).build(); //NOSONAR - without await, input is empty
        try {
            await this.client.send(new CreateSecretCommand(input));
        } catch (error) {
            const errMessage = `Failed to create secret: ${error}`;
            logger.error(errMessage);
            throw error;
        }
    }

    /**
     * Method to create a new Secrets Manager secret for a deployed use case.
     * Also used for updates as we wish to always overwrite the existing secret.
     *
     * @param useCase
     */
    @tracer.captureMethod({ captureResponse: true, subSegmentName: '###updateSecret' })
    public async updateSecret(useCase: UseCase): Promise<void> {
        const input = await new PutSecretValueCommandInputBuilder(useCase).build(); //NOSONAR - without await, input is empty
        try {
            await this.client.send(new PutSecretValueCommand(input));
        } catch (error) {
            const errMessage = `Failed to put secret value: ${error}`;
            logger.error(errMessage);
            throw error;
        }
    }

    /**
     * Method to delete an existing Secrets Manager secret for a deployed use case
     *
     * @param useCase
     */
    @tracer.captureMethod({ captureResponse: true, subSegmentName: '###deleteSecret' })
    public async deleteSecret(useCase: UseCase): Promise<void> {
        const input = await new DeleteSecretCommandInputBuilder(useCase).build(); //NOSONAR - without await, input is empty
        try {
            await this.client.send(new DeleteSecretCommand(input));
        } catch (error) {
            const errMessage = `Failed to delete Use Case Config: ${error}`;
            logger.error(errMessage);
            throw error;
        }
    }
}
