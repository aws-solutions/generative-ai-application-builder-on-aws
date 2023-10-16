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
    DeleteItemCommand,
    DynamoDBClient,
    GetItemCommand,
    PutItemCommand,
    ScanCommand,
    UpdateItemCommand
} from '@aws-sdk/client-dynamodb';
import { unmarshall } from '@aws-sdk/util-dynamodb';
import { customAwsConfig } from 'aws-node-user-agent-config';
import { ListUseCasesAdapter, UseCaseRecord } from '../model/list-use-cases';
import { UseCase } from '../model/use-case';
import { logger, tracer } from '../power-tools-init';
import {
    DeleteItemCommandBuilder,
    GetItemCommandInputBuilder,
    MarkItemForDeletionCommandBuilder,
    PutItemCommandInputBuilder,
    UpdateItemCommandBuilder
} from './storage-operation-builder';
import { ScanCaseTableCommandBuilder } from './storage-view-builder';

export type ListUseCasesRecords = {
    useCaseRecords: UseCaseRecord[];
    scannedCount?: number;
};

/**
 * Class to store state information for deployed use cases.
 */
export class StorageManagement {
    private client: DynamoDBClient;

    constructor() {
        this.client = new DynamoDBClient(customAwsConfig());
    }

    /**
     * Method to create a new record for a deployed use case in DynamoDB
     *
     * @param useCase
     */
    @tracer.captureMethod({ captureResponse: false, subSegmentName: '###createUseCaseRecord' })
    public async createUseCaseRecord(useCase: UseCase): Promise<void> {
        const input = await new PutItemCommandInputBuilder(useCase).build(); //NOSONAR - without await, input is empty
        try {
            await this.client.send(new PutItemCommand(input));
        } catch (error) {
            const errMessage = `Failed to create Use Case Record: ${error}`;
            logger.error(errMessage);
            throw error;
        }
    }

    /**
     * Method to update an existing record for a deployed use case in DynamoDB using
     * stackId as the hash key
     *
     * @param useCase
     */
    @tracer.captureMethod({ captureResponse: false, subSegmentName: '###updateUseCaseRecord' })
    public async updateUseCaseRecord(useCase: UseCase): Promise<void> {
        const input = await new UpdateItemCommandBuilder(useCase).build(); //NOSONAR - without await, input is empty
        try {
            await this.client.send(new UpdateItemCommand(input));
        } catch (error) {
            const errMessage = `Failed to update Use Case Record: ${error}`;
            logger.error(errMessage);
            throw error;
        }
    }

    /**
     * Method for setting the TTL of a use case in the use cases table
     *
     * @param useCase
     */
    @tracer.captureMethod({ captureResponse: false, subSegmentName: '###markUseCaseRecordForDeletion' })
    public async markUseCaseRecordForDeletion(useCase: UseCase): Promise<void> {
        const input = await new MarkItemForDeletionCommandBuilder(useCase).build(); //NOSONAR - without await, input is empty
        try {
            await this.client.send(new UpdateItemCommand(input));
        } catch (error) {
            const errMessage = `Failed to update Use Case Record: ${error}`;
            logger.error(errMessage);
            throw error;
        }
    }

    /**
     * Method to permanently delete a record from the use cases table
     *
     * @param useCase
     */
    @tracer.captureMethod({ captureResponse: false, subSegmentName: '###deleteUseCaseRecord' })
    public async deleteUseCaseRecord(useCase: UseCase): Promise<void> {
        const input = await new DeleteItemCommandBuilder(useCase).build(); //NOSONAR - without await, input is empty
        try {
            await this.client.send(new DeleteItemCommand(input));
        } catch (error) {
            const errMessage = `Failed to delete Use Case Record: ${error}`;
            logger.error(errMessage);
            throw error;
        }
    }

    /**
     * Method to get a single record from the use cases table
     *
     * @param useCase
     */
    @tracer.captureMethod({ captureResponse: false, subSegmentName: '###getUseCaseRecord' })
    public async getUseCaseRecord(useCase: UseCase): Promise<UseCaseRecord> {
        const input = await new GetItemCommandInputBuilder(useCase).build(); //NOSONAR - without await, input is empty
        try {
            const response = await this.client.send(new GetItemCommand(input));
            logger.debug(`Got DDB response: ${JSON.stringify(response)}`);
            return unmarshall(response.Item!) as UseCaseRecord;
        } catch (error) {
            const errMessage = `Failed to get Use Case Record: ${error}`;
            logger.error(errMessage);
            throw error;
        }
    }

    /**
     * method to view all cases in DynamoDB
     */
    @tracer.captureMethod({ captureResponse: false, subSegmentName: '###viewAllCases' })
    public async getAllCaseRecords(listUseCasesEvent: ListUseCasesAdapter): Promise<ListUseCasesRecords> {
        const useCases: UseCaseRecord[] = [];
        try {
            const input = await new ScanCaseTableCommandBuilder(listUseCasesEvent).build(); //NOSONAR - without await, input is empty
            const response = await this.client.send(new ScanCommand(input));

            const itemCount = response.ScannedCount;
            // need to unmarshall the ddb response to get the actual data
            response.Items?.forEach((item) => {
                useCases.push(unmarshall(item) as UseCaseRecord);
            });

            logger.debug(`Unmarshalled useCases: ${JSON.stringify(useCases)}`);
            return {
                useCaseRecords: useCases,
                scannedCount: itemCount
            };
        } catch (error) {
            const errMessage = `Failed to fetch cases: ${error}`;
            logger.error(errMessage);
            throw error;
        }
    }
}
