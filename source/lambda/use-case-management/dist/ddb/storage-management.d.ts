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
import { ListUseCasesAdapter, UseCaseRecord } from '../model/list-use-cases';
import { UseCase } from '../model/use-case';
export type ListUseCasesRecords = {
    useCaseRecords: UseCaseRecord[];
    scannedCount?: number;
};
/**
 * Class to store state information for deployed use cases.
 */
export declare class StorageManagement {
    private client;
    constructor();
    /**
     * Method to create a new record for a deployed use case in DynamoDB
     *
     * @param useCase
     */
    createUseCaseRecord(useCase: UseCase): Promise<void>;
    /**
     * Method to update an existing record for a deployed use case in DynamoDB using
     * stackId as the hash key
     *
     * @param useCase
     */
    updateUseCaseRecord(useCase: UseCase): Promise<void>;
    /**
     * Method for setting the TTL of a use case in the use cases table
     *
     * @param useCase
     */
    markUseCaseRecordForDeletion(useCase: UseCase): Promise<void>;
    /**
     * Method to permanently delete a record from the use cases table
     *
     * @param useCase
     */
    deleteUseCaseRecord(useCase: UseCase): Promise<void>;
    /**
     * Method to get a single record from the use cases table
     *
     * @param useCase
     */
    getUseCaseRecord(useCase: UseCase): Promise<UseCaseRecord>;
    /**
     * method to view all cases in DynamoDB
     */
    getAllCaseRecords(listUseCasesEvent: ListUseCasesAdapter): Promise<ListUseCasesRecords>;
}
