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

import { ScanCommandInput } from '@aws-sdk/client-dynamodb';
import { ListUseCasesAdapter } from '../model/list-use-cases';
import { logger, tracer } from '../power-tools-init';
import { DDB_SCAN_RECORDS_LIMIT, USE_CASES_TABLE_NAME_ENV_VAR } from '../utils/constants';

export abstract class CommandInputBuilder {
    listUseCasesEvent: ListUseCasesAdapter;
    constructor(useCase: ListUseCasesAdapter) {
        this.listUseCasesEvent = useCase;
    }

    /**
     * Builds the CommandInput
     * @returns the CommandInput
     */
    abstract build(): ScanCommandInput;
}

export class ScanCaseTableCommandBuilder {
    eventParams: any;

    constructor(listUseCasesEvent: ListUseCasesAdapter) {
        this.eventParams = listUseCasesEvent.event.queryStringParameters;
    }
    /**
     * Method to create input to scan a table in dynamodb
     *
     * @returns
     */
    @tracer.captureMethod({ captureResponse: false, subSegmentName: '###scanTable' })
    public build(): ScanCommandInput {
        logger.debug('Building ScanCommandInput');
        return {
            TableName: process.env[USE_CASES_TABLE_NAME_ENV_VAR],
            Limit: DDB_SCAN_RECORDS_LIMIT
        } as ScanCommandInput;
    }
}
