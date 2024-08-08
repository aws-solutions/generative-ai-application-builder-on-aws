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
