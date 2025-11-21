// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { DynamoDBClient, GetItemCommand } from '@aws-sdk/client-dynamodb';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';
import { logger, tracer } from '../power-tools-init';
import { USE_CASE_CONFIG_TABLE_NAME_ENV_VAR, USE_CASES_TABLE_NAME_ENV_VAR } from '../utils/constants';
import { AWSClientManager } from 'aws-sdk-lib';
import { retryWithBackoff, getRetrySettings } from '../utils/utils';

/**
 * Service for fetching configuration data from DynamoDB tables
 */
export class DdbConfigService {
    private dynamoClient: DynamoDBClient;
    private llmConfigTable: string;
    private useCasesTable: string;

    constructor() {
        this.dynamoClient = AWSClientManager.getServiceClient<DynamoDBClient>('dynamodb');
        this.llmConfigTable = process.env[USE_CASE_CONFIG_TABLE_NAME_ENV_VAR]!;
        this.useCasesTable = process.env[USE_CASES_TABLE_NAME_ENV_VAR]!;
    }

    /**
     * Fetches multimodal configuration for the given use case record key
     * @param useCaseRecordKey - The use case record key to fetch config for
     * @returns Promise<boolean> - True if multimodal is enabled, false otherwise
     */
    @tracer.captureMethod({ captureResponse: true, subSegmentName: '###fetchUseCaseMultimodalityConfig' })
    public async fetchUseCaseMultimodalityConfig(useCaseRecordKey: string): Promise<boolean> {
        try {
            const operation = async () => {
                const command = new GetItemCommand({
                    TableName: this.llmConfigTable,
                    Key: marshall({
                        key: useCaseRecordKey
                    }),
                    ProjectionExpression: 'config.LlmParams.MultimodalParams'
                });

                return await this.dynamoClient.send(command);
            };

            const ddbResult = await retryWithBackoff(operation, getRetrySettings());

            if (!ddbResult.Item) {
                const errorMsg = `Failed to get LLM config from table: ${this.llmConfigTable}, recordKey: ${useCaseRecordKey}`;
                logger.error(errorMsg);
                throw new Error('Failed due to unexpected error.');
            }

            const llmConfig = unmarshall(ddbResult.Item);
            const multimodalEnabled = llmConfig.config?.LlmParams?.MultimodalParams?.MultimodalEnabled === true;
            logger.debug(
                `Fetched multimodal config for useCaseRecordKey: ${useCaseRecordKey}, multimodalEnabled: ${multimodalEnabled}`
            );
            return multimodalEnabled;
        } catch (error) {
            logger.error(
                `Failed to fetch multimodal config for useCaseRecordKey: ${useCaseRecordKey}, error: ${(error as Error).message}`
            );
            throw new Error('Failed due to unexpected error.');
        }
    }

    /**
     * Fetches use case configuration record key from the use case config table
     * @param useCaseId - The use case ID to fetch config for
     * @returns Promise<string> - The LLM config record key
     * @throws Error if use case config is not found or invalid
     */
    @tracer.captureMethod({ captureResponse: true, subSegmentName: '###fetchUseCaseConfigRecordKey' })
    public async fetchUseCaseConfigRecordKey(useCaseId: string): Promise<string> {
        try {
            const operation = async () => {
                const useCaseConfigCommand = new GetItemCommand({
                    TableName: this.useCasesTable,
                    Key: marshall({
                        UseCaseId: useCaseId
                    }),
                    ProjectionExpression: 'UseCaseConfigRecordKey'
                });

                return await this.dynamoClient.send(useCaseConfigCommand);
            };

            const useCaseConfigResult = await retryWithBackoff(operation, getRetrySettings());

            if (!useCaseConfigResult.Item) {
                logger.error(`Use case configuration not found for useCaseId: ${useCaseId}`);
                throw new Error('Failed due to unexpected error.');
            }

            const useCaseConfig = unmarshall(useCaseConfigResult.Item);
            const useCaseConfigRecordKey = useCaseConfig.UseCaseConfigRecordKey;

            if (!useCaseConfigRecordKey) {
                logger.error(`UseCaseConfigRecordKey not found in use case config for useCaseId: ${useCaseId}`);
                throw new Error('Failed due to unexpected error.');
            }

            logger.debug(`Retrieved use case config record key: ${useCaseConfigRecordKey} for useCaseId: ${useCaseId}`);
            return useCaseConfigRecordKey;
        } catch (error) {
            logger.error(
                `Failed to fetch use case config for useCaseId: ${useCaseId}, error: ${(error as Error).message}`
            );
            throw new Error('Failed due to unexpected error.');
        }
    }
}
