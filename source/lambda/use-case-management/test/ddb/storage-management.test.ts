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
import { DynamoDBClient, ScanCommand } from '@aws-sdk/client-dynamodb';
import { mockClient } from 'aws-sdk-client-mock';

import { StorageManagement } from '../../ddb/storage-management';
import { APIGatewayEvent } from 'aws-lambda';
import { ListUseCasesAdapter } from '../../model/list-use-cases';

describe('When performing storage management operations', () => {
    let ddbMockedClient: any;
    let storageManagement: StorageManagement;
    let adaptedEvent: ListUseCasesAdapter;

    describe('When sucessfully invoking the commands', () => {
        beforeAll(() => {
            process.env.AWS_SDK_USER_AGENT = `{ "customUserAgent": "AwsSolution/SO0276/v2.0.0" }`;

            const inputLastEvaluatedKey = {
                'Description': { 'S': 'test case 1' },
                'CreatedBy': { 'S': 'fake-user-id' },
                'StackId': { 'S': 'fake-stack-id' },
                'Name': { 'S': 'test-1' }
            };

            const event = {
                queryStringParameters: {
                    pageSize: '10'
                },
                headers: {
                    Authorization: 'Bearer 123',
                    'last-evaluated-key': JSON.stringify(inputLastEvaluatedKey)
                }
            } as Partial<APIGatewayEvent>;

            adaptedEvent = new ListUseCasesAdapter(event as APIGatewayEvent);
            ddbMockedClient = mockClient(DynamoDBClient);
            storageManagement = new StorageManagement();
        });

        it('should return a list of use cases', async () => {
            const expectedResponse = {
                Items: [
                    {
                        'Description': { 'S': 'test case 1' },
                        'CreatedBy': { 'S': 'fake-user-id' },
                        'StackId': { 'S': 'fake-stack-id' },
                        'Name': { 'S': 'test-1' }
                    }
                ],
                LastEvaluatedKey: null,
                ScannedCount: 1
            };

            ddbMockedClient.on(ScanCommand).resolves(expectedResponse);

            const { useCaseRecords, scannedCount } = await storageManagement.getAllCaseRecords(adaptedEvent);

            expect(useCaseRecords.length).toEqual(1);
            expect(scannedCount).toEqual(1);
            expect(useCaseRecords[0].Description).toEqual('test case 1');
            expect(useCaseRecords[0].CreatedBy).toEqual('fake-user-id');
            expect(useCaseRecords[0].StackId).toEqual('fake-stack-id');
            expect(useCaseRecords[0].Name).toEqual('test-1');
        });

        afterAll(() => {
            delete process.env.AWS_SDK_USER_AGENT;

            ddbMockedClient.restore();
        });
    });
});
