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
import { UseCase } from '../model/use-case';
/**
 * Class to store API keys in secretsmanager for deployed use cases.
 */
export declare class SecretManagement {
    private client;
    constructor();
    /**
     * Method to create a new Secrets Manager secret for a deployed use case.
     * Also used for updates as we wish to always overwrite the existing secret.
     *
     * @param useCase
     */
    createSecret(useCase: UseCase): Promise<void>;
    /**
     * Method to create a new Secrets Manager secret for a deployed use case.
     * Also used for updates as we wish to always overwrite the existing secret.
     *
     * @param useCase
     */
    updateSecret(useCase: UseCase): Promise<void>;
    /**
     * Method to delete an existing Secrets Manager secret for a deployed use case
     *
     * @param useCase
     */
    deleteSecret(useCase: UseCase): Promise<void>;
}
