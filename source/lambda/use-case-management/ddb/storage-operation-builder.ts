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
    DeleteItemCommandInput,
    GetItemCommandInput,
    PutItemCommandInput,
    QueryCommandInput,
    UpdateItemCommandInput
} from '@aws-sdk/client-dynamodb';
import { UseCase } from '../model/use-case';
import { logger, tracer } from '../power-tools-init';
import {
    CfnParameterKeys,
    CHAT_PROVIDERS,
    DYNAMODB_TTL_ATTRIBUTE_NAME,
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
                StackId: { S: this.useCase.stackId },
                Name: { S: this.useCase.name },
                ...(this.useCase.description && {
                    Description: { S: this.useCase.description }
                }),
                CreatedBy: { S: this.useCase.userId },
                CreatedDate: { S: new Date().toISOString() },
                UseCaseConfigRecordKey: { S: this.useCase.getUseCaseConfigRecordKey() },
                UseCaseConfigTableName: { S: process.env[USE_CASE_CONFIG_TABLE_NAME_ENV_VAR], }
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
        let sortKey = `${this.useCase.configuration.LlmParams!.ModelProvider}#`;
        switch (this.useCase.configuration.LlmParams!.ModelProvider) {
            case CHAT_PROVIDERS.BEDROCK:
                sortKey += this.useCase.configuration.LlmParams!.BedrockLlmParams!.ModelId;
                break;
            case CHAT_PROVIDERS.SAGEMAKER:
                sortKey += 'default';
                break;
            default:
                logger.error(`Unknown model provider: ${this.useCase.configuration.LlmParams!.ModelProvider}`);
                break;
        }
        return {
            TableName: process.env[MODEL_INFO_TABLE_NAME_ENV_VAR],
            Key: {
                UseCase: {
                    S: this.useCase.configuration.LlmParams!.RAGEnabled ? UseCaseTypes.RAGChat : UseCaseTypes.CHAT
                },
                SortKey: {
                    S: sortKey
                }
            }
        } as GetItemCommandInput;
    }
}
