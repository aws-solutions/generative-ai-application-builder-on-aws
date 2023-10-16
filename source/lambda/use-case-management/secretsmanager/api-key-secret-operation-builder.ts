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
    DeleteSecretCommandInput,
    CreateSecretCommandInput,
    PutSecretValueCommandInput
} from '@aws-sdk/client-secrets-manager';

import { UseCase } from '../model/use-case';
import { logger, tracer } from '../power-tools-init';
import { USE_CASE_API_KEY_SUFFIX_ENV_VAR } from '../utils/constants';

export abstract class CommandInputBuilder {
    useCase: UseCase;
    stackId: string;

    constructor(useCase: UseCase) {
        this.useCase = useCase;
    }

    /**
     * Builds the CommandInput
     * @returns the CommandInput
     */
    abstract build(): CreateSecretCommandInput | DeleteSecretCommandInput;
}

/**
 * Builder class to create a secret in secrets manager
 */
export class CreateSecretCommandInputBuilder extends CommandInputBuilder {
    /**
     * Method to create a secret in secrets manager
     * @returns
     */
    @tracer.captureMethod({ captureResponse: false, subSegmentName: '###createSecret' })
    public build(): CreateSecretCommandInput {
        logger.debug('Building CreateSecretCommandInput');
        return {
            Name: `${this.useCase.shortUUID}/${process.env[USE_CASE_API_KEY_SUFFIX_ENV_VAR]}`,
            Description: `3rd party API key for use case with ID ${this.useCase.shortUUID}`,
            SecretString: this.useCase.apiKey,
            ForceOverwriteReplicaSecret: true
        } as CreateSecretCommandInput;
    }
}

/**
 * Builder class to put a new value in an existing secret in secrets manager
 */
export class PutSecretValueCommandInputBuilder extends CommandInputBuilder {
    /**
     * Method to put a new value in an existing secret in secrets manager
     * @returns
     */
    @tracer.captureMethod({ captureResponse: false, subSegmentName: '###putSecretValue' })
    public build(): PutSecretValueCommandInput {
        logger.debug('Building PutSecretValueCommandInput');
        return {
            SecretId: `${this.useCase.shortUUID}/${process.env[USE_CASE_API_KEY_SUFFIX_ENV_VAR]}`,
            SecretString: this.useCase.apiKey
        } as PutSecretValueCommandInput;
    }
}

/**
 * Builder to build input to delete a secret in secrets manager
 */
export class DeleteSecretCommandInputBuilder extends CommandInputBuilder {
    /**
     * Method to delete a secret in secrets manager
     *
     * @returns
     */
    @tracer.captureMethod({ captureResponse: false, subSegmentName: '###deleteSecret' })
    public build(): DeleteSecretCommandInput {
        logger.debug('Building DeleteSecretCommandInput');
        return {
            SecretId: `${this.useCase.shortUUID}/${process.env[USE_CASE_API_KEY_SUFFIX_ENV_VAR]}`,
            ForceDeleteWithoutRecovery: true
        } as DeleteSecretCommandInput;
    }
}
