// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0
import { DynamoDBClient, ScanCommand } from '@aws-sdk/client-dynamodb';
import { mockClient } from 'aws-sdk-client-mock';

import { StorageManagement } from '../../ddb/storage-management';
import { APIGatewayEvent } from 'aws-lambda';
import { ListUseCasesAdapter } from '../../model/list-use-cases';

describe('When performing storage management operations', () => {
    let ddbMockedClient: any;
    let storageManagement: StorageManagement;
    let adaptedEvent: ListUseCasesAdapter;

    describe('When successfully invoking the commands', () => {
        beforeAll(() => {
            process.env.AWS_SDK_USER_AGENT = `{ "customUserAgent": "AWSSOLUTION/SO0276/v2.1.0" }`;

            const event = {
                queryStringParameters: {
                    pageNumber: '1'
                },
                headers: {
                    Authorization: 'Bearer 123'
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
                        'UseCaseId': { 'S': 'fake-usecase-id' },
                        'CreatedBy': { 'S': 'fake-user-id' },
                        'CreatedDate': { 'S': 'fake-date' },
                        'StackId': { 'S': 'fake-stack-id' },
                        'Name': { 'S': 'test-1' },
                        'UseCaseConfigRecordKey': { 'S': 'fake-record-key' },
                        'UseCaseConfigTableName': { 'S': 'fake-table-name' },
                        'Description': { 'S': 'test case 1' }
                    }
                ],
                LastEvaluatedKey: null,
                ScannedCount: 1
            };

            ddbMockedClient.on(ScanCommand).resolves(expectedResponse);

            const { useCaseRecords, scannedCount } = await storageManagement.getAllCaseRecords(adaptedEvent);

            expect(useCaseRecords.length).toEqual(1);
            expect(scannedCount).toEqual(1);
            expect(useCaseRecords[0].UseCaseId).toEqual('fake-usecase-id');
            expect(useCaseRecords[0].CreatedBy).toEqual('fake-user-id');
            expect(useCaseRecords[0].CreatedDate).toEqual('fake-date');
            expect(useCaseRecords[0].StackId).toEqual('fake-stack-id');
            expect(useCaseRecords[0].Name).toEqual('test-1');
            expect(useCaseRecords[0].Description).toEqual('test case 1');
        });

        afterAll(() => {
            delete process.env.AWS_SDK_USER_AGENT;

            ddbMockedClient.restore();
        });
    });
});
