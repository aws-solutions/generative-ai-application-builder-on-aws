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
import { DeleteSecretCommandInput, CreateSecretCommandInput, PutSecretValueCommandInput } from '@aws-sdk/client-secrets-manager';
import { UseCase } from '../model/use-case';
export declare abstract class CommandInputBuilder {
    useCase: UseCase;
    stackId: string;
    constructor(useCase: UseCase);
    /**
     * Builds the CommandInput
     * @returns the CommandInput
     */
    abstract build(): CreateSecretCommandInput | DeleteSecretCommandInput;
}
/**
 * Builder class to create a secret in secrets manager
 */
export declare class CreateSecretCommandInputBuilder extends CommandInputBuilder {
    /**
     * Method to create a secret in secrets manager
     * @returns
     */
    build(): CreateSecretCommandInput;
}
/**
 * Builder class to put a new value in an existing secret in secrets manager
 */
export declare class PutSecretValueCommandInputBuilder extends CommandInputBuilder {
    /**
     * Method to put a new value in an existing secret in secrets manager
     * @returns
     */
    build(): PutSecretValueCommandInput;
}
/**
 * Builder to build input to delete a secret in secrets manager
 */
export declare class DeleteSecretCommandInputBuilder extends CommandInputBuilder {
    /**
     * Method to delete a secret in secrets manager
     *
     * @returns
     */
    build(): DeleteSecretCommandInput;
}
