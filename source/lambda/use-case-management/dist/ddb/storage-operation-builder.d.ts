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
import { DeleteItemCommandInput, GetItemCommandInput, PutItemCommandInput, QueryCommandInput, UpdateItemCommandInput } from '@aws-sdk/client-dynamodb';
import { UseCase } from '../model/use-case';
export declare abstract class CommandInputBuilder {
    useCase: UseCase;
    stackId: string;
    constructor(useCase: UseCase);
    /**
     * Builds the CommandInput
     * @returns the CommandInput
     */
    abstract build(): PutItemCommandInput | GetItemCommandInput | QueryCommandInput | DeleteItemCommandInput;
}
/**
 * Builder class to build input to insert an item in dynamodb
 */
export declare class PutItemCommandInputBuilder extends CommandInputBuilder {
    /**
     * Method to create a record for the use case in dynamodb
     * @returns
     */
    build(): PutItemCommandInput;
}
/**
 *  Builder to build input to update a use case record from dynamodb
 */
export declare class UpdateItemCommandBuilder extends CommandInputBuilder {
    /**
     * Method to create input to update an existing record in dynamodb
     * @returns
     */
    build(): UpdateItemCommandInput;
}
/**
 * Builder to build input to mark a use case for deletion by setting the TTL
 */
export declare class MarkItemForDeletionCommandBuilder extends CommandInputBuilder {
    /**
     * Method to create input to update an existing record in dynamodb setting the TTL
     * @returns
     */
    build(): UpdateItemCommandInput;
}
/**
 * Builder to build input to delete a use case record from dynamodb
 */
export declare class DeleteItemCommandBuilder extends CommandInputBuilder {
    /**
     * Method to create input to delete an existing record in dynamodb
     *
     * @returns
     */
    build(): DeleteItemCommandInput;
}
/**
 * Builder to build input to get a use case record from dynamodb
 */
export declare class GetItemCommandInputBuilder extends CommandInputBuilder {
    /**
     * Method to create input to get an existing record in dynamodb
     *
     * @returns
     */
    build(): GetItemCommandInput;
}
