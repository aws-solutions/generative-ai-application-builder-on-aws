// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { GetItemCommandInputBuilder } from '../../ddb/use-case-config-view-builder';
import { UseCaseRecord } from '../../model/list-use-cases';
import { USE_CASE_CONFIG_TABLE_NAME_ENV_VAR } from '../../utils/constants';

describe('When creating the use case config ddb view builder commands', () => {
    let mockUseCaseRecord: UseCaseRecord;

    beforeAll(() => {
        process.env[USE_CASE_CONFIG_TABLE_NAME_ENV_VAR] = 'fake-table-name';
        mockUseCaseRecord = {
            UseCaseId: '11111111-2222',
            StackId: 'mockStackId',
            Name: 'mockName',
            UseCaseConfigRecordKey: 'mockUseCaseConfigRecordKey'
        } as UseCaseRecord;
    });

    afterAll(() => {
        delete process.env[USE_CASE_CONFIG_TABLE_NAME_ENV_VAR];
    });

    it('should build the get item commands', async () => {
        const getItemCommandInput = new GetItemCommandInputBuilder(mockUseCaseRecord).build();
        expect(await getItemCommandInput).toEqual({
            TableName: process.env[USE_CASE_CONFIG_TABLE_NAME_ENV_VAR],
            Key: {
                key: { S: 'mockUseCaseConfigRecordKey' }
            }
        });
    });
});
