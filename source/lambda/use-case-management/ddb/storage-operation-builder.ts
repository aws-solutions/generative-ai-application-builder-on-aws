// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import {
    DeleteItemCommandInput,
    GetItemCommandInput,
    PutItemCommandInput,
    QueryCommandInput,
    UpdateItemCommandInput
} from '@aws-sdk/client-dynamodb';
import { UseCase } from '../model/use-case';
import { AgentBuilderUseCaseConfiguration, UseCaseConfiguration } from '../model/types';
import { logger, tracer } from '../power-tools-init';
import {
    CfnParameterKeys,
    CHAT_PROVIDERS,
    DYNAMODB_TTL_ATTRIBUTE_NAME,
    INFERENCE_PROFILE,
    MODEL_INFO_TABLE_NAME_ENV_VAR,
    TTL_SECONDS,
    USE_CASE_CONFIG_TABLE_NAME_ENV_VAR,
    USE_CASES_TABLE_NAME_ENV_VAR,
    UseCaseTypes
} from '../utils/constants';

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
    abstract build(): PutItemCommandInput | GetItemCommandInput | QueryCommandInput | DeleteItemCommandInput;
}

/**
 * Builder class to build input to insert an item in dynamodb
 */
export class PutItemCommandInputBuilder extends CommandInputBuilder {
    /**
     * Method to create a record for the use case in dynamodb
     * @returns
     */
    @tracer.captureMethod({ captureResponse: false, subSegmentName: '###createUseCaseRecord' })
    public build(): PutItemCommandInput {
        logger.debug('Building PutItemCommandInput');
        return {
            TableName: process.env[USE_CASES_TABLE_NAME_ENV_VAR],
            Item: {
                UseCaseId: { S: this.useCase.useCaseId },
                ...(this.useCase.tenantId && { TenantId: { S: this.useCase.tenantId } }),
                UseCaseType: { S: this.useCase.useCaseType },
                StackId: { S: this.useCase.stackId },
                Name: { S: this.useCase.name },
                ...(this.useCase.description && {
                    Description: { S: this.useCase.description }
                }),
                CreatedBy: { S: this.useCase.userId },
                CreatedDate: { S: new Date().toISOString() },
                UseCaseConfigRecordKey: { S: this.useCase.getUseCaseConfigRecordKey() },
                UseCaseConfigTableName: { S: process.env[USE_CASE_CONFIG_TABLE_NAME_ENV_VAR] }
            }
        } as PutItemCommandInput;
    }
}

/**
 *  Builder to build input to update a use case record from dynamodb
 */
export class UpdateItemCommandBuilder extends CommandInputBuilder {
    /**
     * Method to create input to update an existing record in dynamodb
     * @returns
     */
    @tracer.captureMethod({ captureResponse: false, subSegmentName: '###updateUseCaseRecord' })
    public build(): UpdateItemCommandInput {
        logger.debug('Building UpdateItemCommandInput');
        return {
            TableName: process.env[USE_CASES_TABLE_NAME_ENV_VAR],
            Key: {
                UseCaseId: { S: this.useCase.useCaseId }
            },
            UpdateExpression:
                'SET #Description = :description, #UpdatedDate = :date, #UpdatedBy = :user, #UseCaseConfigRecordKey = :dynamo_db_record_key',
            ExpressionAttributeNames: {
                ['#Description']: 'Description',
                ['#UpdatedDate']: 'UpdatedDate',
                ['#UpdatedBy']: 'UpdatedBy',
                ['#UseCaseConfigRecordKey']: 'UseCaseConfigRecordKey'
            },
            ExpressionAttributeValues: {
                [':description']: { S: this.useCase.description ?? '' },
                [':date']: { S: new Date().toISOString() },
                [':user']: { S: this.useCase.userId },
                [':dynamo_db_record_key']: {
                    S: this.useCase.cfnParameters?.get(CfnParameterKeys.UseCaseConfigRecordKey)
                }
            }
        } as UpdateItemCommandInput;
    }
}

/**
 * Builder to build input to mark a use case for deletion by setting the TTL
 */
export class MarkItemForDeletionCommandBuilder extends CommandInputBuilder {
    /**
     * Method to create input to update an existing record in dynamodb setting the TTL
     * @returns
     */
    @tracer.captureMethod({ captureResponse: false, subSegmentName: '###updateUseCaseRecordForStackDelete' })
    public build(): UpdateItemCommandInput {
        logger.debug('Building UpdateItemCommandInput');
        const currentTime = new Date();
        const expiryTime = Math.floor(currentTime.getTime() / 1000) + TTL_SECONDS;
        return {
            TableName: process.env[USE_CASES_TABLE_NAME_ENV_VAR],
            Key: {
                UseCaseId: { S: this.useCase.useCaseId }
            },
            UpdateExpression: 'SET #TTL = :expiry_time, #DeletedBy = :user, #DeletedDate = :deletion_date',
            ExpressionAttributeNames: {
                ['#TTL']: DYNAMODB_TTL_ATTRIBUTE_NAME,
                ['#DeletedBy']: 'DeletedBy',
                ['#DeletedDate']: 'DeletedDate'
            },
            ExpressionAttributeValues: {
                [':expiry_time']: { N: expiryTime.toString() },
                [':user']: { S: this.useCase.userId },
                [':deletion_date']: { S: currentTime.toISOString() }
            }
        } as UpdateItemCommandInput;
    }
}

/**
 * Builder to build input to delete a use case record from dynamodb
 */
export class DeleteItemCommandBuilder extends CommandInputBuilder {
    /**
     * Method to create input to delete an existing record in dynamodb
     *
     * @returns
     */
    @tracer.captureMethod({ captureResponse: false, subSegmentName: '###deleteUseCaseRecord' })
    public build(): DeleteItemCommandInput {
        logger.debug('Building DeleteItemCommandInput');
        return {
            TableName: process.env[USE_CASES_TABLE_NAME_ENV_VAR],
            Key: {
                UseCaseId: { S: this.useCase.useCaseId }
            }
        } as DeleteItemCommandInput;
    }
}

/**
 * Builder to build input to get a use case record from dynamodb
 */
export class GetItemCommandInputBuilder extends CommandInputBuilder {
    /**
     * Method to create input to get an existing record in the use cases dynamodb table
     *
     * @returns
     */
    @tracer.captureMethod({ captureResponse: false, subSegmentName: '###getUseCaseRecord' })
    public build(): GetItemCommandInput {
        logger.debug('Building GetItemCommandInput');
        return {
            TableName: process.env[USE_CASES_TABLE_NAME_ENV_VAR],
            Key: {
                UseCaseId: { S: this.useCase.useCaseId }
            }
        } as GetItemCommandInput;
    }
}

/**
 * Builder to build input to get a model info record from dynamodb
 */
export class GetModelInfoCommandInputBuilder extends CommandInputBuilder {
    /**
     * Method to create input to get an existing record in model info dynamodb table
     *
     * @returns
     */
    @tracer.captureMethod({ captureResponse: false, subSegmentName: '###getModelInfoRecord' })
    public build(): GetItemCommandInput {
        logger.debug('Building GetItemCommandInput');

        // Handle different configuration types
        let modelProvider: string;
        let modelId: string | undefined;
        let ragEnabled: boolean = false;

        if (this.useCase.useCaseType === UseCaseTypes.AGENT_BUILDER) {
            const config = this.useCase.configuration as AgentBuilderUseCaseConfiguration;
            modelProvider = config.LlmParams?.ModelProvider || CHAT_PROVIDERS.AGENT_CORE;
            modelId = config.LlmParams?.BedrockLlmParams?.ModelId;
            ragEnabled = config.LlmParams?.RAGEnabled || false;
        } else if (this.useCase.useCaseType === UseCaseTypes.AGENT) {
            modelProvider = CHAT_PROVIDERS.BEDROCK_AGENT;
            modelId = 'default';
        } else {
            // Text/Chat use cases
            const config = this.useCase.configuration as UseCaseConfiguration;
            modelProvider = config.LlmParams!.ModelProvider!;
            modelId = config.LlmParams!.BedrockLlmParams?.ModelId;
            ragEnabled = config.LlmParams!.RAGEnabled || false;
        }

        const sortKey = `${modelProvider}#${
            modelProvider === CHAT_PROVIDERS.BEDROCK ? (modelId ?? INFERENCE_PROFILE) : 'default'
        }`;

        return {
            TableName: process.env[MODEL_INFO_TABLE_NAME_ENV_VAR],
            Key: {
                UseCase: {
                    S: ragEnabled ? UseCaseTypes.RAGChat : UseCaseTypes.CHAT
                },
                SortKey: {
                    S: sortKey
                }
            }
        } as GetItemCommandInput;
    }
}
