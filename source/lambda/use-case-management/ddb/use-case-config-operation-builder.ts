// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import {
    DeleteItemCommandInput,
    GetItemCommandInput,
    PutItemCommandInput,
    QueryCommandInput,
    UpdateItemCommandInput
} from '@aws-sdk/client-dynamodb';
import { marshall } from '@aws-sdk/util-dynamodb';
import { UseCase } from '../model/use-case';
import { logger, tracer } from '../power-tools-init';
import {
    DYNAMODB_TTL_ATTRIBUTE_NAME,
    TTL_SECONDS,
    USE_CASE_CONFIG_RECORD_KEY_ATTRIBUTE_NAME,
    USE_CASE_CONFIG_TABLE_NAME_ENV_VAR
} from '../utils/constants';

type BuildCommandTypes =
    | PutItemCommandInput
    | GetItemCommandInput
    | QueryCommandInput
    | DeleteItemCommandInput
    | UpdateItemCommandInput;

export abstract class CommandInputBuilder {
    useCase: UseCase;

    constructor(useCase: UseCase) {
        this.useCase = useCase;
    }

    /**
     * Builds the CommandInput
     * @returns the CommandInput
     */
    abstract build(): BuildCommandTypes;
}

export class GetConfigItemBuilder extends CommandInputBuilder {
    @tracer.captureMethod({ captureResponse: false, subSegmentName: '###getUseCaseConfigRecord' })
    public build(): GetItemCommandInput {
        console.debug('Building GetConfigItemBuilder');
        return {
            TableName: process.env[USE_CASE_CONFIG_TABLE_NAME_ENV_VAR],
            Key: {
                [USE_CASE_CONFIG_RECORD_KEY_ATTRIBUTE_NAME]: { S: this.useCase.getUseCaseConfigRecordKey() }
            }
        } as GetItemCommandInput;
    }
}

export class PutConfigItemBuilder extends CommandInputBuilder {
    @tracer.captureMethod({ captureResponse: false, subSegmentName: '###putUseCaseConfigRecord' })
    public build(): PutItemCommandInput {
        logger.debug('Building PutItemCommandInput');
        const recordKey = this.useCase.getUseCaseConfigRecordKey();
        return {
            TableName: process.env[USE_CASE_CONFIG_TABLE_NAME_ENV_VAR],
            Item: marshall(
                {
                    [USE_CASE_CONFIG_RECORD_KEY_ATTRIBUTE_NAME]: recordKey,
                    config: this.useCase.configuration
                },
                { removeUndefinedValues: true }
            )
        } as PutItemCommandInput;
    }
}

export class DeleteConfigItemBuilder extends CommandInputBuilder {
    @tracer.captureMethod({ captureResponse: false, subSegmentName: '###deleteUseCaseConfigRecord' })
    public build(): DeleteItemCommandInput {
        console.debug('Building DeleteConfigItemBuilder');
        return {
            TableName: process.env[USE_CASE_CONFIG_TABLE_NAME_ENV_VAR],
            Key: {
                [USE_CASE_CONFIG_RECORD_KEY_ATTRIBUTE_NAME]: { S: this.useCase.getUseCaseConfigRecordKey() }
            }
        } as DeleteItemCommandInput;
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
            TableName: process.env[USE_CASE_CONFIG_TABLE_NAME_ENV_VAR],
            Key: {
                [USE_CASE_CONFIG_RECORD_KEY_ATTRIBUTE_NAME]: { S: this.useCase.getUseCaseConfigRecordKey() }
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
