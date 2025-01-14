// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

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
