"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
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
const client_dynamodb_1 = require("@aws-sdk/client-dynamodb");
const aws_sdk_client_mock_1 = require("aws-sdk-client-mock");
const storage_management_1 = require("../../ddb/storage-management");
const list_use_cases_1 = require("../../model/list-use-cases");
describe('When performing storage management operations', () => {
    let ddbMockedClient;
    let storageManagement;
    let adaptedEvent;
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
            };
            adaptedEvent = new list_use_cases_1.ListUseCasesAdapter(event);
            ddbMockedClient = (0, aws_sdk_client_mock_1.mockClient)(client_dynamodb_1.DynamoDBClient);
            storageManagement = new storage_management_1.StorageManagement();
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
            ddbMockedClient.on(client_dynamodb_1.ScanCommand).resolves(expectedResponse);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3RvcmFnZS1tYW5hZ2VtZW50LnRlc3QuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi90ZXN0L2RkYi9zdG9yYWdlLW1hbmFnZW1lbnQudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOztBQUFBOzs7Ozs7Ozs7Ozt3SEFXd0g7QUFDeEgsOERBQXVFO0FBQ3ZFLDZEQUFpRDtBQUVqRCxxRUFBaUU7QUFFakUsK0RBQWlFO0FBRWpFLFFBQVEsQ0FBQywrQ0FBK0MsRUFBRSxHQUFHLEVBQUU7SUFDM0QsSUFBSSxlQUFvQixDQUFDO0lBQ3pCLElBQUksaUJBQW9DLENBQUM7SUFDekMsSUFBSSxZQUFpQyxDQUFDO0lBRXRDLFFBQVEsQ0FBQyx3Q0FBd0MsRUFBRSxHQUFHLEVBQUU7UUFDcEQsU0FBUyxDQUFDLEdBQUcsRUFBRTtZQUNYLE9BQU8sQ0FBQyxHQUFHLENBQUMsa0JBQWtCLEdBQUcsb0RBQW9ELENBQUM7WUFFdEYsTUFBTSxxQkFBcUIsR0FBRztnQkFDMUIsYUFBYSxFQUFFLEVBQUUsR0FBRyxFQUFFLGFBQWEsRUFBRTtnQkFDckMsV0FBVyxFQUFFLEVBQUUsR0FBRyxFQUFFLGNBQWMsRUFBRTtnQkFDcEMsU0FBUyxFQUFFLEVBQUUsR0FBRyxFQUFFLGVBQWUsRUFBRTtnQkFDbkMsTUFBTSxFQUFFLEVBQUUsR0FBRyxFQUFFLFFBQVEsRUFBRTthQUM1QixDQUFDO1lBRUYsTUFBTSxLQUFLLEdBQUc7Z0JBQ1YscUJBQXFCLEVBQUU7b0JBQ25CLFFBQVEsRUFBRSxJQUFJO2lCQUNqQjtnQkFDRCxPQUFPLEVBQUU7b0JBQ0wsYUFBYSxFQUFFLFlBQVk7b0JBQzNCLG9CQUFvQixFQUFFLElBQUksQ0FBQyxTQUFTLENBQUMscUJBQXFCLENBQUM7aUJBQzlEO2FBQ3dCLENBQUM7WUFFOUIsWUFBWSxHQUFHLElBQUksb0NBQW1CLENBQUMsS0FBd0IsQ0FBQyxDQUFDO1lBQ2pFLGVBQWUsR0FBRyxJQUFBLGdDQUFVLEVBQUMsZ0NBQWMsQ0FBQyxDQUFDO1lBQzdDLGlCQUFpQixHQUFHLElBQUksc0NBQWlCLEVBQUUsQ0FBQztRQUNoRCxDQUFDLENBQUMsQ0FBQztRQUVILEVBQUUsQ0FBQyxtQ0FBbUMsRUFBRSxLQUFLLElBQUksRUFBRTtZQUMvQyxNQUFNLGdCQUFnQixHQUFHO2dCQUNyQixLQUFLLEVBQUU7b0JBQ0g7d0JBQ0ksYUFBYSxFQUFFLEVBQUUsR0FBRyxFQUFFLGFBQWEsRUFBRTt3QkFDckMsV0FBVyxFQUFFLEVBQUUsR0FBRyxFQUFFLGNBQWMsRUFBRTt3QkFDcEMsU0FBUyxFQUFFLEVBQUUsR0FBRyxFQUFFLGVBQWUsRUFBRTt3QkFDbkMsTUFBTSxFQUFFLEVBQUUsR0FBRyxFQUFFLFFBQVEsRUFBRTtxQkFDNUI7aUJBQ0o7Z0JBQ0QsZ0JBQWdCLEVBQUUsSUFBSTtnQkFDdEIsWUFBWSxFQUFFLENBQUM7YUFDbEIsQ0FBQztZQUVGLGVBQWUsQ0FBQyxFQUFFLENBQUMsNkJBQVcsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDO1lBRTNELE1BQU0sRUFBRSxjQUFjLEVBQUUsWUFBWSxFQUFFLEdBQUcsTUFBTSxpQkFBaUIsQ0FBQyxpQkFBaUIsQ0FBQyxZQUFZLENBQUMsQ0FBQztZQUVqRyxNQUFNLENBQUMsY0FBYyxDQUFDLE1BQU0sQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUN6QyxNQUFNLENBQUMsWUFBWSxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQ2hDLE1BQU0sQ0FBQyxjQUFjLENBQUMsQ0FBQyxDQUFDLENBQUMsV0FBVyxDQUFDLENBQUMsT0FBTyxDQUFDLGFBQWEsQ0FBQyxDQUFDO1lBQzdELE1BQU0sQ0FBQyxjQUFjLENBQUMsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLENBQUMsT0FBTyxDQUFDLGNBQWMsQ0FBQyxDQUFDO1lBQzVELE1BQU0sQ0FBQyxjQUFjLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsT0FBTyxDQUFDLGVBQWUsQ0FBQyxDQUFDO1lBQzNELE1BQU0sQ0FBQyxjQUFjLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsT0FBTyxDQUFDLFFBQVEsQ0FBQyxDQUFDO1FBQ3JELENBQUMsQ0FBQyxDQUFDO1FBRUgsUUFBUSxDQUFDLEdBQUcsRUFBRTtZQUNWLE9BQU8sT0FBTyxDQUFDLEdBQUcsQ0FBQyxrQkFBa0IsQ0FBQztZQUV0QyxlQUFlLENBQUMsT0FBTyxFQUFFLENBQUM7UUFDOUIsQ0FBQyxDQUFDLENBQUM7SUFDUCxDQUFDLENBQUMsQ0FBQztBQUNQLENBQUMsQ0FBQyxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKipcbiAqICBDb3B5cmlnaHQgQW1hem9uLmNvbSwgSW5jLiBvciBpdHMgYWZmaWxpYXRlcy4gQWxsIFJpZ2h0cyBSZXNlcnZlZC4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAqXG4gKiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgKlxuICogIExpY2Vuc2VkIHVuZGVyIHRoZSBBcGFjaGUgTGljZW5zZSwgVmVyc2lvbiAyLjAgKHRoZSBcIkxpY2Vuc2VcIikuIFlvdSBtYXkgbm90IHVzZSB0aGlzIGZpbGUgZXhjZXB0IGluIGNvbXBsaWFuY2UgICAgKlxuICogIHdpdGggdGhlIExpY2Vuc2UuIEEgY29weSBvZiB0aGUgTGljZW5zZSBpcyBsb2NhdGVkIGF0ICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICpcbiAqICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAqXG4gKiAgICAgIGh0dHA6Ly93d3cuYXBhY2hlLm9yZy9saWNlbnNlcy9MSUNFTlNFLTIuMCAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgKlxuICogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICpcbiAqICBvciBpbiB0aGUgJ2xpY2Vuc2UnIGZpbGUgYWNjb21wYW55aW5nIHRoaXMgZmlsZS4gVGhpcyBmaWxlIGlzIGRpc3RyaWJ1dGVkIG9uIGFuICdBUyBJUycgQkFTSVMsIFdJVEhPVVQgV0FSUkFOVElFUyAqXG4gKiAgT1IgQ09ORElUSU9OUyBPRiBBTlkgS0lORCwgZXhwcmVzcyBvciBpbXBsaWVkLiBTZWUgdGhlIExpY2Vuc2UgZm9yIHRoZSBzcGVjaWZpYyBsYW5ndWFnZSBnb3Zlcm5pbmcgcGVybWlzc2lvbnMgICAgKlxuICogIGFuZCBsaW1pdGF0aW9ucyB1bmRlciB0aGUgTGljZW5zZS4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICpcbiAqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqL1xuaW1wb3J0IHsgRHluYW1vREJDbGllbnQsIFNjYW5Db21tYW5kIH0gZnJvbSAnQGF3cy1zZGsvY2xpZW50LWR5bmFtb2RiJztcbmltcG9ydCB7IG1vY2tDbGllbnQgfSBmcm9tICdhd3Mtc2RrLWNsaWVudC1tb2NrJztcblxuaW1wb3J0IHsgU3RvcmFnZU1hbmFnZW1lbnQgfSBmcm9tICcuLi8uLi9kZGIvc3RvcmFnZS1tYW5hZ2VtZW50JztcbmltcG9ydCB7IEFQSUdhdGV3YXlFdmVudCB9IGZyb20gJ2F3cy1sYW1iZGEnO1xuaW1wb3J0IHsgTGlzdFVzZUNhc2VzQWRhcHRlciB9IGZyb20gJy4uLy4uL21vZGVsL2xpc3QtdXNlLWNhc2VzJztcblxuZGVzY3JpYmUoJ1doZW4gcGVyZm9ybWluZyBzdG9yYWdlIG1hbmFnZW1lbnQgb3BlcmF0aW9ucycsICgpID0+IHtcbiAgICBsZXQgZGRiTW9ja2VkQ2xpZW50OiBhbnk7XG4gICAgbGV0IHN0b3JhZ2VNYW5hZ2VtZW50OiBTdG9yYWdlTWFuYWdlbWVudDtcbiAgICBsZXQgYWRhcHRlZEV2ZW50OiBMaXN0VXNlQ2FzZXNBZGFwdGVyO1xuXG4gICAgZGVzY3JpYmUoJ1doZW4gc3VjZXNzZnVsbHkgaW52b2tpbmcgdGhlIGNvbW1hbmRzJywgKCkgPT4ge1xuICAgICAgICBiZWZvcmVBbGwoKCkgPT4ge1xuICAgICAgICAgICAgcHJvY2Vzcy5lbnYuQVdTX1NES19VU0VSX0FHRU5UID0gYHsgXCJjdXN0b21Vc2VyQWdlbnRcIjogXCJBd3NTb2x1dGlvbi9TTzAyNzYvdjIuMC4wXCIgfWA7XG5cbiAgICAgICAgICAgIGNvbnN0IGlucHV0TGFzdEV2YWx1YXRlZEtleSA9IHtcbiAgICAgICAgICAgICAgICAnRGVzY3JpcHRpb24nOiB7ICdTJzogJ3Rlc3QgY2FzZSAxJyB9LFxuICAgICAgICAgICAgICAgICdDcmVhdGVkQnknOiB7ICdTJzogJ2Zha2UtdXNlci1pZCcgfSxcbiAgICAgICAgICAgICAgICAnU3RhY2tJZCc6IHsgJ1MnOiAnZmFrZS1zdGFjay1pZCcgfSxcbiAgICAgICAgICAgICAgICAnTmFtZSc6IHsgJ1MnOiAndGVzdC0xJyB9XG4gICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICBjb25zdCBldmVudCA9IHtcbiAgICAgICAgICAgICAgICBxdWVyeVN0cmluZ1BhcmFtZXRlcnM6IHtcbiAgICAgICAgICAgICAgICAgICAgcGFnZVNpemU6ICcxMCdcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIGhlYWRlcnM6IHtcbiAgICAgICAgICAgICAgICAgICAgQXV0aG9yaXphdGlvbjogJ0JlYXJlciAxMjMnLFxuICAgICAgICAgICAgICAgICAgICAnbGFzdC1ldmFsdWF0ZWQta2V5JzogSlNPTi5zdHJpbmdpZnkoaW5wdXRMYXN0RXZhbHVhdGVkS2V5KVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gYXMgUGFydGlhbDxBUElHYXRld2F5RXZlbnQ+O1xuXG4gICAgICAgICAgICBhZGFwdGVkRXZlbnQgPSBuZXcgTGlzdFVzZUNhc2VzQWRhcHRlcihldmVudCBhcyBBUElHYXRld2F5RXZlbnQpO1xuICAgICAgICAgICAgZGRiTW9ja2VkQ2xpZW50ID0gbW9ja0NsaWVudChEeW5hbW9EQkNsaWVudCk7XG4gICAgICAgICAgICBzdG9yYWdlTWFuYWdlbWVudCA9IG5ldyBTdG9yYWdlTWFuYWdlbWVudCgpO1xuICAgICAgICB9KTtcblxuICAgICAgICBpdCgnc2hvdWxkIHJldHVybiBhIGxpc3Qgb2YgdXNlIGNhc2VzJywgYXN5bmMgKCkgPT4ge1xuICAgICAgICAgICAgY29uc3QgZXhwZWN0ZWRSZXNwb25zZSA9IHtcbiAgICAgICAgICAgICAgICBJdGVtczogW1xuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICAnRGVzY3JpcHRpb24nOiB7ICdTJzogJ3Rlc3QgY2FzZSAxJyB9LFxuICAgICAgICAgICAgICAgICAgICAgICAgJ0NyZWF0ZWRCeSc6IHsgJ1MnOiAnZmFrZS11c2VyLWlkJyB9LFxuICAgICAgICAgICAgICAgICAgICAgICAgJ1N0YWNrSWQnOiB7ICdTJzogJ2Zha2Utc3RhY2staWQnIH0sXG4gICAgICAgICAgICAgICAgICAgICAgICAnTmFtZSc6IHsgJ1MnOiAndGVzdC0xJyB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBdLFxuICAgICAgICAgICAgICAgIExhc3RFdmFsdWF0ZWRLZXk6IG51bGwsXG4gICAgICAgICAgICAgICAgU2Nhbm5lZENvdW50OiAxXG4gICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICBkZGJNb2NrZWRDbGllbnQub24oU2NhbkNvbW1hbmQpLnJlc29sdmVzKGV4cGVjdGVkUmVzcG9uc2UpO1xuXG4gICAgICAgICAgICBjb25zdCB7IHVzZUNhc2VSZWNvcmRzLCBzY2FubmVkQ291bnQgfSA9IGF3YWl0IHN0b3JhZ2VNYW5hZ2VtZW50LmdldEFsbENhc2VSZWNvcmRzKGFkYXB0ZWRFdmVudCk7XG5cbiAgICAgICAgICAgIGV4cGVjdCh1c2VDYXNlUmVjb3Jkcy5sZW5ndGgpLnRvRXF1YWwoMSk7XG4gICAgICAgICAgICBleHBlY3Qoc2Nhbm5lZENvdW50KS50b0VxdWFsKDEpO1xuICAgICAgICAgICAgZXhwZWN0KHVzZUNhc2VSZWNvcmRzWzBdLkRlc2NyaXB0aW9uKS50b0VxdWFsKCd0ZXN0IGNhc2UgMScpO1xuICAgICAgICAgICAgZXhwZWN0KHVzZUNhc2VSZWNvcmRzWzBdLkNyZWF0ZWRCeSkudG9FcXVhbCgnZmFrZS11c2VyLWlkJyk7XG4gICAgICAgICAgICBleHBlY3QodXNlQ2FzZVJlY29yZHNbMF0uU3RhY2tJZCkudG9FcXVhbCgnZmFrZS1zdGFjay1pZCcpO1xuICAgICAgICAgICAgZXhwZWN0KHVzZUNhc2VSZWNvcmRzWzBdLk5hbWUpLnRvRXF1YWwoJ3Rlc3QtMScpO1xuICAgICAgICB9KTtcblxuICAgICAgICBhZnRlckFsbCgoKSA9PiB7XG4gICAgICAgICAgICBkZWxldGUgcHJvY2Vzcy5lbnYuQVdTX1NES19VU0VSX0FHRU5UO1xuXG4gICAgICAgICAgICBkZGJNb2NrZWRDbGllbnQucmVzdG9yZSgpO1xuICAgICAgICB9KTtcbiAgICB9KTtcbn0pO1xuIl19