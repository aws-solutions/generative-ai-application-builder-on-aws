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
    DynamoDBClient,
    QueryCommand,
    QueryCommandInput,
    GetItemCommand,
    GetItemCommandInput,
    ScanCommand,
    ScanCommandInput
} from '@aws-sdk/client-dynamodb';
import { unmarshall } from '@aws-sdk/util-dynamodb';
import { customAwsConfig } from 'aws-node-user-agent-config';
import { logger, tracer } from '../power-tools-init';
import { MODEL_INFO_TABLE_NAME_ENV_VAR, ModelInfoTableKeys } from './constants';

/**
 * Class to store state information for deployed use cases.
 */
export class ModelInfoRetriever {
    private client: DynamoDBClient;
    private tableName: string;

    constructor(client: DynamoDBClient = new DynamoDBClient(customAwsConfig())) {
        this.client = client;
        this.tableName = process.env[MODEL_INFO_TABLE_NAME_ENV_VAR]!;
    }

    /**
     * Method to retrieve all available use case types
     *
     */
    @tracer.captureMethod({ captureResponse: false, subSegmentName: '###getUseCaseTypes' })
    public async getUseCaseTypes(): Promise<any[]> {
        const scanInput = {
            TableName: this.tableName,
            ProjectionExpression: `${[ModelInfoTableKeys.MODEL_INFO_TABLE_PARTITION_KEY]}`
        } as ScanCommandInput;

        try {
            const allData = await this.getAllDataForScan(scanInput);
            // array of unique use case types from ddb item results which come from query in form [{UseCase: "value"},...]
            return allData.length > 0
                ? [...new Set(allData.map((item) => item[ModelInfoTableKeys.MODEL_INFO_TABLE_PARTITION_KEY]))]
                : [];
        } catch (error) {
            const errMessage = `Failed to get use case types: ${error}`;
            logger.error(errMessage);
            throw error;
        }
    }
    /**
     * Method to retrieve all available providers for a given use case type
     *
     * @param useCaseType type of use case, e.g. 'chat'
     */
    @tracer.captureMethod({ captureResponse: false, subSegmentName: '###getModelProviders' })
    public async getModelProviders(useCaseType: string): Promise<any[]> {
        const query = {
            TableName: this.tableName,
            ProjectionExpression: `${[ModelInfoTableKeys.MODEL_INFO_TABLE_PROVIDER_NAME_KEY]}`,
            ExpressionAttributeNames: {
                '#P': ModelInfoTableKeys.MODEL_INFO_TABLE_PARTITION_KEY
            },
            ExpressionAttributeValues: {
                ':useCase': {
                    'S': useCaseType
                }
            },
            KeyConditionExpression: '#P = :useCase'
        } as QueryCommandInput;

        try {
            const allData = await this.getAllDataForQuery(query);
            // array of unique provider names from ddb item results which come from query in form [{ModelProviderName: "value"},...]
            return allData.length > 0
                ? [...new Set(allData.map((item) => item[ModelInfoTableKeys.MODEL_INFO_TABLE_PROVIDER_NAME_KEY]))]
                : [];
        } catch (error) {
            const errMessage = `Failed to get model providers: ${error}`;
            logger.error(errMessage);
            throw error;
        }
    }

    /**
     * Method to retrieve all available models for a given provider/use case
     *
     * @param useCaseType type of use case, e.g. 'chat'
     * @param providerName the name of the provider to retrieve models for
     */
    @tracer.captureMethod({ captureResponse: false, subSegmentName: '###getModels' })
    public async getModels(useCaseType: string, providerName: string): Promise<any[]> {
        const query = {
            TableName: this.tableName,
            ProjectionExpression: `${[ModelInfoTableKeys.MODEL_INFO_TABLE_MODEL_NAME_KEY]}`,
            ExpressionAttributeNames: {
                '#P': ModelInfoTableKeys.MODEL_INFO_TABLE_PARTITION_KEY,
                '#S': ModelInfoTableKeys.MODEL_INFO_TABLE_SORT_KEY
            },
            ExpressionAttributeValues: {
                ':useCase': {
                    'S': useCaseType
                },
                ':provider': { 'S': `${providerName}#` }
            },
            KeyConditionExpression: '#P = :useCase AND begins_with(#S, :provider)'
        } as QueryCommandInput;

        try {
            const allData = await this.getAllDataForQuery(query);
            // array of model names from ddb item results which come from query in form [{ModelName: "value"},...]
            return allData.length > 0
                ? allData.map((item) => item[ModelInfoTableKeys.MODEL_INFO_TABLE_MODEL_NAME_KEY])
                : [];
        } catch (error) {
            const errMessage = `Failed to get models: ${error}`;
            logger.error(errMessage);
            throw error;
        }
    }

    /**
     * Method to retrieve the model info for the given model
     *
     * @param useCaseType type of use case, e.g. 'chat'
     * @param providerName the name of the provider to retrieve models for
     * @param modelName the name of the model to retrieve info for.
     * @returns the model info for the given model. If the model name is not found, an error will be thrown.
     */
    @tracer.captureMethod({ captureResponse: false, subSegmentName: '###getModelInfo' })
    public async getModelInfo(useCaseType: string, providerName: string, modelName: string): Promise<any> {
        const command = {
            TableName: this.tableName,
            Key: {
                [ModelInfoTableKeys.MODEL_INFO_TABLE_PARTITION_KEY]: { 'S': useCaseType },
                [ModelInfoTableKeys.MODEL_INFO_TABLE_SORT_KEY]: { 'S': `${providerName}#${modelName}` }
            }
        } as GetItemCommandInput;

        try {
            const resp = await this.client.send(new GetItemCommand(command));
            if (resp.Item === undefined) {
                logger.warn(`No items returned for GetItemCommand: ${JSON.stringify(command)}`);
                return {};
            } else {
                return unmarshall(resp.Item!);
            }
        } catch (error) {
            const errMessage = `Failed to get model info: ${error}`;
            logger.error(errMessage);
            throw error;
        }
    }

    /**
     * Recursive function to retrieve items for a given query
     *
     * @param query current query input
     * @param allData accumulator to collect query results across multiple response
     * @returns
     */
    @tracer.captureMethod({ captureResponse: false, subSegmentName: '####sendQuery' })
    private async getAllDataForQuery(query: QueryCommandInput, allData: any[] = []): Promise<any[]> {
        let response = await this.client.send(new QueryCommand(query));

        if (response.Items === undefined && allData.length == 0) {
            logger.warn(`No items returned for query: ${JSON.stringify(query)}`);
        } else if (response.Items?.length! > 0) {
            allData = [...allData, ...response.Items!.map((item) => unmarshall(item))];
        }

        if (response.LastEvaluatedKey) {
            query.ExclusiveStartKey = response.LastEvaluatedKey;
            return await this.getAllDataForQuery(query, allData);
        } else {
            return allData;
        }
    }

    /**
     * Recursive function to retrieve items for a given scan
     *
     * @param scan current scan input
     * @param allData accumulator to collect scan results across multiple response
     * @returns
     */
    @tracer.captureMethod({ captureResponse: false, subSegmentName: '####sendscan' })
    private async getAllDataForScan(scan: ScanCommandInput, allData: any[] = []): Promise<any[]> {
        let response = await this.client.send(new ScanCommand(scan));

        if (response.Items === undefined && allData.length == 0) {
            logger.warn(`No items returned for scan: ${JSON.stringify(scan)}`);
        } else if (response.Items?.length! > 0) {
            allData = [...allData, ...response.Items!.map((item) => unmarshall(item))];
        }

        if (response.LastEvaluatedKey) {
            scan.ExclusiveStartKey = response.LastEvaluatedKey;
            return await this.getAllDataForScan(scan, allData);
        } else {
            return allData;
        }
    }
}
