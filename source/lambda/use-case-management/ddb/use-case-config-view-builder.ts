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

import { GetItemCommandInput } from '@aws-sdk/client-dynamodb';
import { UseCaseRecord } from '../model/list-use-cases';
import { logger, tracer } from '../power-tools-init';
import { USE_CASE_CONFIG_RECORD_KEY_ATTRIBUTE_NAME, USE_CASE_CONFIG_TABLE_NAME_ENV_VAR } from '../utils/constants';

/**
 * Abstract base class for building input parameters for DynamoDB commands related to use case configurations.
 *
 * This class provides a common foundation for building input parameters for various DynamoDB commands, such as
 * `GetItem`, `PutItem`, and `UpdateItem`, that are used to manage use case configurations.
 *
 * The class has the following properties:
 *
 * - `useCaseRecord`: An instance of the `UseCaseRecord` class, which represents a use case record.
 * - `useCaseId`: The unique identifier of the use case.
 * - `shortUseCaseId`: A shortened version of the use case ID, typically the first 8 characters.
 *
 * The `constructor` initializes these properties based on the provided `useCaseRecord`.
 *
 * The `build()` method is an abstract method that must be implemented by concrete subclasses. This method is
 * responsible for constructing the specific input parameters required for a DynamoDB command, such as the
 * `GetItemCommandInput` object.
 *
 * The class also provides the following utility methods:
 *
 * - `getUseCaseConfigRecordKey()`: Returns the key of the use case configuration record, based on the `useCaseRecord`.
 */
export abstract class ViewCommandInputBuilder {
    useCaseRecord: UseCaseRecord;
    useCaseId: string;
    shortUseCaseId: string;

    constructor(useCaseRecord: UseCaseRecord) {
        this.useCaseRecord = useCaseRecord;
        this.useCaseId = useCaseRecord.UseCaseId;
        this.shortUseCaseId = this.useCaseId.substring(0, 8);
    }

    abstract build(): GetItemCommandInput;

    public getUseCaseConfigRecordKey(): string {
        return this.useCaseRecord.UseCaseConfigRecordKey;
    }
}

/**
 * Builds the input for a DynamoDB GetItem command to retrieve a use case configuration record.
 *
 * This class extends the `ViewCommandInputBuilder` and is responsible for constructing the necessary
 * input parameters for a DynamoDB GetItem command to fetch a specific use case configuration record.
 *
 * The `build()` method returns a `GetItemCommandInput` object, which contains the following properties:
 *
 * - `TableName`: The name of the DynamoDB table where the use case configuration records are stored.
 * - `Key`: An object that specifies the primary key attribute and its value for the record to be retrieved.
 *   The key is determined by `getUseCaseConfigRecordKey()` method.
 *
 */
export class GetItemCommandInputBuilder extends ViewCommandInputBuilder {
    @tracer.captureMethod({ captureResponse: false, subSegmentName: '###getConfigRecordCommand' })
    public build(): GetItemCommandInput {
        logger.debug('Building GetItemCommandInput');
        return {
            TableName: process.env[USE_CASE_CONFIG_TABLE_NAME_ENV_VAR],
            Key: {
                [USE_CASE_CONFIG_RECORD_KEY_ATTRIBUTE_NAME]: {
                    S: this.getUseCaseConfigRecordKey()
                }
            }
        };
    }
}
