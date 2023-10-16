"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
const event_test_data_1 = require("./event-test-data");
const lib_dynamodb_1 = require("@aws-sdk/lib-dynamodb");
const websocket_authorizer_1 = require("../websocket-authorizer");
const rest_authorizer_1 = require("../rest-authorizer");
const aws_sdk_client_mock_1 = require("aws-sdk-client-mock");
jest.mock('aws-jwt-verify', () => {
    return {
        CognitoJwtVerifier: {
            create: () => {
                return {
                    verify: () => {
                        return event_test_data_1.fakeIdToken;
                    }
                };
            }
        }
    };
});
describe('When the websocket handler receives an authorization event', () => {
    let ddbMockedClient;
    beforeAll(() => {
        process.env.AWS_SDK_USER_AGENT = `{ "customUserAgent": "AwsSolution/SO0084/v2.0.0" }`;
        process.env.COGNITO_POLICY_TABLE_NAME = 'fake-table-name';
        ddbMockedClient = (0, aws_sdk_client_mock_1.mockClient)(lib_dynamodb_1.DynamoDBDocumentClient);
    });
    it('should return an allow policy', async () => {
        ddbMockedClient.on(lib_dynamodb_1.BatchGetCommand).resolves(event_test_data_1.batchGetItemResponse);
        const response = await (0, websocket_authorizer_1.handler)(event_test_data_1.mockValidWebsocketRequestEvent);
        expect(response).toEqual({
            principalId: '*',
            policyDocument: {
                'Version': '2012-10-17',
                'Statement': [
                    {
                        'Resource': ['arn:aws:execute-api:us-east-1:111111111111:fake-api-id/*/*'],
                        'Effect': 'Allow',
                        'Action': 'execute-api:Invoke',
                        'Sid': 'use-case-management-api-admin-policy-statement'
                    },
                    {
                        'Resource': ['arn:aws:execute-api:us-east-1:111111111111:fake-api-id2/*/*'],
                        'Effect': 'Allow',
                        'Action': 'execute-api:Invoke',
                        'Sid': 'HuggingFaceChatStack-Users-policy-statement'
                    }
                ]
            },
            context: {
                UserId: 'fake-sub'
            }
        });
    });
    it('should return a deny policy due to jwt verification failure', async () => {
        jest.unmock('aws-jwt-verify');
        jest.mock('aws-jwt-verify', () => {
            return {
                CognitoJwtVerifier: {
                    create: () => {
                        return {
                            verify: () => {
                                throw new Error('Mock-jwt-error');
                            }
                        };
                    }
                }
            };
        });
        try {
            await (0, websocket_authorizer_1.handler)(event_test_data_1.mockValidWebsocketRequestEvent);
        }
        catch (error) {
            expect(error.message).toEqual('Unauthorized');
        }
    });
    it('should return a deny policy when event payload is bad', async () => {
        try {
            await (0, websocket_authorizer_1.handler)(event_test_data_1.mockInvalidRequestEvent);
        }
        catch (error) {
            expect(error.message).toEqual('Unauthorized');
        }
    });
    afterAll(() => {
        delete process.env.AWS_SDK_USER_AGENT;
        delete process.env.COGNITO_POLICY_TABLE_NAME;
        ddbMockedClient.restore();
    });
    afterEach(() => jest.clearAllMocks());
});
describe('When the rest handler receives an authorization event', () => {
    let ddbMockedClient;
    beforeAll(() => {
        process.env.AWS_SDK_USER_AGENT = `{ "customUserAgent": "AwsSolution/SO0084/v2.0.0" }`;
        process.env.COGNITO_POLICY_TABLE_NAME = 'fake-table-name';
        ddbMockedClient = (0, aws_sdk_client_mock_1.mockClient)(lib_dynamodb_1.DynamoDBDocumentClient);
    });
    it('should return an allow policy', async () => {
        ddbMockedClient.on(lib_dynamodb_1.BatchGetCommand).resolves(event_test_data_1.batchGetItemResponse);
        const response = await (0, rest_authorizer_1.handler)(event_test_data_1.mockValidRestRequestEvent);
        expect(response).toEqual({
            principalId: '*',
            policyDocument: {
                'Version': '2012-10-17',
                'Statement': [
                    {
                        'Resource': ['arn:aws:execute-api:us-east-1:111111111111:fake-api-id/*/*'],
                        'Effect': 'Allow',
                        'Action': 'execute-api:Invoke',
                        'Sid': 'use-case-management-api-admin-policy-statement'
                    },
                    {
                        'Resource': ['arn:aws:execute-api:us-east-1:111111111111:fake-api-id2/*/*'],
                        'Effect': 'Allow',
                        'Action': 'execute-api:Invoke',
                        'Sid': 'HuggingFaceChatStack-Users-policy-statement'
                    }
                ]
            },
            context: {
                UserId: 'fake-sub'
            }
        });
    });
    it('should return a deny policy when verification fails', async () => {
        jest.unmock('aws-jwt-verify');
        jest.mock('aws-jwt-verify', () => {
            return {
                CognitoJwtVerifier: {
                    create: () => {
                        return {
                            verify: () => {
                                throw new Error('Mock-jwt-error');
                            }
                        };
                    }
                }
            };
        });
        try {
            await (0, rest_authorizer_1.handler)(event_test_data_1.mockValidRestRequestEvent);
        }
        catch (error) {
            expect(error.message).toEqual('Unauthorized');
        }
    });
    it('should return a deny policy when event payload is bad', async () => {
        try {
            await (0, rest_authorizer_1.handler)(event_test_data_1.mockInvalidRequestEvent);
        }
        catch (error) {
            expect(error.message).toEqual('Unauthorized');
        }
    });
    afterEach(() => jest.clearAllMocks());
    afterAll(() => {
        delete process.env.AWS_SDK_USER_AGENT;
        delete process.env.COGNITO_POLICY_TABLE_NAME;
        ddbMockedClient.restore();
    });
});
jest.clearAllMocks();
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXV0aG9yaXplci50ZXN0LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vdGVzdC9hdXRob3JpemVyLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBOzs7Ozs7Ozs7Ozt3SEFXd0g7O0FBR3hILHVEQU0yQjtBQUMzQix3REFBZ0Y7QUFDaEYsa0VBQXNFO0FBQ3RFLHdEQUE0RDtBQUM1RCw2REFBaUQ7QUFFakQsSUFBSSxDQUFDLElBQUksQ0FBQyxnQkFBZ0IsRUFBRSxHQUFHLEVBQUU7SUFDN0IsT0FBTztRQUNILGtCQUFrQixFQUFFO1lBQ2hCLE1BQU0sRUFBRSxHQUFHLEVBQUU7Z0JBQ1QsT0FBTztvQkFDSCxNQUFNLEVBQUUsR0FBRyxFQUFFO3dCQUNULE9BQU8sNkJBQVcsQ0FBQztvQkFDdkIsQ0FBQztpQkFDSixDQUFDO1lBQ04sQ0FBQztTQUNKO0tBQ0osQ0FBQztBQUNOLENBQUMsQ0FBQyxDQUFDO0FBRUgsUUFBUSxDQUFDLDREQUE0RCxFQUFFLEdBQUcsRUFBRTtJQUN4RSxJQUFJLGVBQW9CLENBQUM7SUFFekIsU0FBUyxDQUFDLEdBQUcsRUFBRTtRQUNYLE9BQU8sQ0FBQyxHQUFHLENBQUMsa0JBQWtCLEdBQUcsb0RBQW9ELENBQUM7UUFDdEYsT0FBTyxDQUFDLEdBQUcsQ0FBQyx5QkFBeUIsR0FBRyxpQkFBaUIsQ0FBQztRQUMxRCxlQUFlLEdBQUcsSUFBQSxnQ0FBVSxFQUFDLHFDQUFzQixDQUFDLENBQUM7SUFDekQsQ0FBQyxDQUFDLENBQUM7SUFFSCxFQUFFLENBQUMsK0JBQStCLEVBQUUsS0FBSyxJQUFJLEVBQUU7UUFDM0MsZUFBZSxDQUFDLEVBQUUsQ0FBQyw4QkFBZSxDQUFDLENBQUMsUUFBUSxDQUFDLHNDQUFvQixDQUFDLENBQUM7UUFDbkUsTUFBTSxRQUFRLEdBQUcsTUFBTSxJQUFBLDhCQUFnQixFQUFDLGdEQUFrRSxDQUFDLENBQUM7UUFDNUcsTUFBTSxDQUFDLFFBQVEsQ0FBQyxDQUFDLE9B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LGNBQWMsQ0FBQyxDQUFDO1NBQ2pEO0lBQ0wsQ0FBQyxDQUFDLENBQUM7SUFFSCxFQUFFLENBQUMsdURBQXVELEVBQUUsS0FBSyxJQUFJLEVBQUU7UUFDbkUsSUFBSTtZQUNBLE1BQU0sSUFBQSx5QkFBVyxFQUFDLHlDQUEyRCxDQUFDLENBQUM7U0FDbEY7UUFBQyxPQUFPLEtBQVUsRUFBRTtZQUNqQixNQUFNLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxDQUFDLE9BQU8sQ0FBQyxjQUFjLENBQUMsQ0FBQztTQUNqRDtJQUNMLENBQUMsQ0FBQyxDQUFDO0lBRUgsU0FBUyxDQUFDLEdBQUcsRUFBRSxDQUFDLElBQUksQ0FBQyxhQUFhLEVBQUUsQ0FBQyxDQUFDO0lBQ3RDLFFBQVEsQ0FBQyxHQUFHLEVBQUU7UUFDVixPQUFPLE9BQU8sQ0FBQyxHQUFHLENBQUMsa0JBQWtCLENBQUM7UUFDdEMsT0FBTyxPQUFPLENBQUMsR0FBRyxDQUFDLHlCQUF5QixDQUFDO1FBRTdDLGVBQWUsQ0FBQyxPQUFPLEVBQUUsQ0FBQztJQUM5QixDQUFDLENBQUMsQ0FBQztBQUNQLENBQUMsQ0FBQyxDQUFDO0FBRUgsSUFBSSxDQUFDLGFBQWEsRUFBRSxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKipcbiAqICBDb3B5cmlnaHQgQW1hem9uLmNvbSwgSW5jLiBvciBpdHMgYWZmaWxpYXRlcy4gQWxsIFJpZ2h0cyBSZXNlcnZlZC4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAqXG4gKiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgKlxuICogIExpY2Vuc2VkIHVuZGVyIHRoZSBBcGFjaGUgTGljZW5zZSwgVmVyc2lvbiAyLjAgKHRoZSBcIkxpY2Vuc2VcIikuIFlvdSBtYXkgbm90IHVzZSB0aGlzIGZpbGUgZXhjZXB0IGluIGNvbXBsaWFuY2UgICAgKlxuICogIHdpdGggdGhlIExpY2Vuc2UuIEEgY29weSBvZiB0aGUgTGljZW5zZSBpcyBsb2NhdGVkIGF0ICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICpcbiAqICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAqXG4gKiAgICAgIGh0dHA6Ly93d3cuYXBhY2hlLm9yZy9saWNlbnNlcy9MSUNFTlNFLTIuMCAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgKlxuICogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICpcbiAqICBvciBpbiB0aGUgJ2xpY2Vuc2UnIGZpbGUgYWNjb21wYW55aW5nIHRoaXMgZmlsZS4gVGhpcyBmaWxlIGlzIGRpc3RyaWJ1dGVkIG9uIGFuICdBUyBJUycgQkFTSVMsIFdJVEhPVVQgV0FSUkFOVElFUyAqXG4gKiAgT1IgQ09ORElUSU9OUyBPRiBBTlkgS0lORCwgZXhwcmVzcyBvciBpbXBsaWVkLiBTZWUgdGhlIExpY2Vuc2UgZm9yIHRoZSBzcGVjaWZpYyBsYW5ndWFnZSBnb3Zlcm5pbmcgcGVybWlzc2lvbnMgICAgKlxuICogIGFuZCBsaW1pdGF0aW9ucyB1bmRlciB0aGUgTGljZW5zZS4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICpcbiAqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqL1xuXG5pbXBvcnQgeyBBUElHYXRld2F5UmVxdWVzdEF1dGhvcml6ZXJFdmVudCB9IGZyb20gJ2F3cy1sYW1iZGEnO1xuaW1wb3J0IHtcbiAgICBtb2NrVmFsaWRXZWJzb2NrZXRSZXF1ZXN0RXZlbnQsXG4gICAgbW9ja0ludmFsaWRSZXF1ZXN0RXZlbnQsXG4gICAgbW9ja1ZhbGlkUmVzdFJlcXVlc3RFdmVudCxcbiAgICBiYXRjaEdldEl0ZW1SZXNwb25zZSxcbiAgICBmYWtlSWRUb2tlblxufSBmcm9tICcuL2V2ZW50LXRlc3QtZGF0YSc7XG5pbXBvcnQgeyBEeW5hbW9EQkRvY3VtZW50Q2xpZW50LCBCYXRjaEdldENvbW1hbmQgfSBmcm9tICdAYXdzLXNkay9saWItZHluYW1vZGInO1xuaW1wb3J0IHsgaGFuZGxlciBhcyB3ZWJzb2NrZXRIYW5kbGVyIH0gZnJvbSAnLi4vd2Vic29ja2V0LWF1dGhvcml6ZXInO1xuaW1wb3J0IHsgaGFuZGxlciBhcyByZXN0SGFuZGxlciB9IGZyb20gJy4uL3Jlc3QtYXV0aG9yaXplcic7XG5pbXBvcnQgeyBtb2NrQ2xpZW50IH0gZnJvbSAnYXdzLXNkay1jbGllbnQtbW9jayc7XG5cbmplc3QubW9jaygnYXdzLWp3dC12ZXJpZnknLCAoKSA9PiB7XG4gICAgcmV0dXJuIHtcbiAgICAgICAgQ29nbml0b0p3dFZlcmlmaWVyOiB7XG4gICAgICAgICAgICBjcmVhdGU6ICgpID0+IHtcbiAgICAgICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgICAgICB2ZXJpZnk6ICgpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBmYWtlSWRUb2tlbjtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9O1xufSk7XG5cbmRlc2NyaWJlKCdXaGVuIHRoZSB3ZWJzb2NrZXQgaGFuZGxlciByZWNlaXZlcyBhbiBhdXRob3JpemF0aW9uIGV2ZW50JywgKCkgPT4ge1xuICAgIGxldCBkZGJNb2NrZWRDbGllbnQ6IGFueTtcblxuICAgIGJlZm9yZUFsbCgoKSA9PiB7XG4gICAgICAgIHByb2Nlc3MuZW52LkFXU19TREtfVVNFUl9BR0VOVCA9IGB7IFwiY3VzdG9tVXNlckFnZW50XCI6IFwiQXdzU29sdXRpb24vU08wMDg0L3YyLjAuMFwiIH1gO1xuICAgICAgICBwcm9jZXNzLmVudi5DT0dOSVRPX1BPTElDWV9UQUJMRV9OQU1FID0gJ2Zha2UtdGFibGUtbmFtZSc7XG4gICAgICAgIGRkYk1vY2tlZENsaWVudCA9IG1vY2tDbGllbnQoRHluYW1vREJEb2N1bWVudENsaWVudCk7XG4gICAgfSk7XG5cbiAgICBpdCgnc2hvdWxkIHJldHVybiBhbiBhbGxvdyBwb2xpY3knLCBhc3luYyAoKSA9PiB7XG4gICAgICAgIGRkYk1vY2tlZENsaWVudC5vbihCYXRjaEdldENvbW1hbmQpLnJlc29sdmVzKGJhdGNoR2V0SXRlbVJlc3BvbnNlKTtcbiAgICAgICAgY29uc3QgcmVzcG9uc2UgPSBhd2FpdCB3ZWJzb2NrZXRIYW5kbGVyKG1vY2tWYWxpZFdlYnNvY2tldFJlcXVlc3RFdmVudCBhcyBBUElHYXRld2F5UmVxdWVzdEF1dGhvcml6ZXJFdmVudCk7XG4gICAgICAgIGV4cGVjdChyZXNwb25zZSkudG9FcXVhbCh7XG4gICAgICAgICAgICBwcmluY2lwYWxJZDogJyonLFxuICAgICAgICAgICAgcG9saWN5RG9jdW1lbnQ6IHtcbiAgICAgICAgICAgICAgICAnVmVyc2lvbic6ICcyMDEyLTEwLTE3JyxcbiAgICAgICAgICAgICAgICAnU3RhdGVtZW50JzogW1xuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICAnUmVzb3VyY2UnOiBbJ2Fybjphd3M6ZXhlY3V0ZS1hcGk6dXMtZWFzdC0xOjExMTExMTExMTExMTpmYWtlLWFwaS1pZC8qLyonXSxcbiAgICAgICAgICAgICAgICAgICAgICAgICdFZmZlY3QnOiAnQWxsb3cnLFxuICAgICAgICAgICAgICAgICAgICAgICAgJ0FjdGlvbic6ICdleGVjdXRlLWFwaTpJbnZva2UnLFxuICAgICAgICAgICAgICAgICAgICAgICAgJ1NpZCc6ICd1c2UtY2FzZS1tYW5hZ2VtZW50LWFwaS1hZG1pbi1wb2xpY3ktc3RhdGVtZW50J1xuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICAnUmVzb3VyY2UnOiBbJ2Fybjphd3M6ZXhlY3V0ZS1hcGk6dXMtZWFzdC0xOjExMTExMTExMTExMTpmYWtlLWFwaS1pZDIvKi8qJ10sXG4gICAgICAgICAgICAgICAgICAgICAgICAnRWZmZWN0JzogJ0FsbG93JyxcbiAgICAgICAgICAgICAgICAgICAgICAgICdBY3Rpb24nOiAnZXhlY3V0ZS1hcGk6SW52b2tlJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICdTaWQnOiAnSHVnZ2luZ0ZhY2VDaGF0U3RhY2stVXNlcnMtcG9saWN5LXN0YXRlbWVudCdcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIF1cbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBjb250ZXh0OiB7XG4gICAgICAgICAgICAgICAgVXNlcklkOiAnZmFrZS1zdWInXG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH0pO1xuXG4gICAgaXQoJ3Nob3VsZCByZXR1cm4gYSBkZW55IHBvbGljeSBkdWUgdG8gand0IHZlcmlmaWNhdGlvbiBmYWlsdXJlJywgYXN5bmMgKCkgPT4ge1xuICAgICAgICBqZXN0LnVubW9jaygnYXdzLWp3dC12ZXJpZnknKTtcblxuICAgICAgICBqZXN0Lm1vY2soJ2F3cy1qd3QtdmVyaWZ5JywgKCkgPT4ge1xuICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICBDb2duaXRvSnd0VmVyaWZpZXI6IHtcbiAgICAgICAgICAgICAgICAgICAgY3JlYXRlOiAoKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZlcmlmeTogKCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ01vY2stand0LWVycm9yJyk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH07XG4gICAgICAgIH0pO1xuXG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICBhd2FpdCB3ZWJzb2NrZXRIYW5kbGVyKG1vY2tWYWxpZFdlYnNvY2tldFJlcXVlc3RFdmVudCBhcyBBUElHYXRld2F5UmVxdWVzdEF1dGhvcml6ZXJFdmVudCk7XG4gICAgICAgIH0gY2F0Y2ggKGVycm9yOiBhbnkpIHtcbiAgICAgICAgICAgIGV4cGVjdChlcnJvci5tZXNzYWdlKS50b0VxdWFsKCdVbmF1dGhvcml6ZWQnKTtcbiAgICAgICAgfVxuICAgIH0pO1xuXG4gICAgaXQoJ3Nob3VsZCByZXR1cm4gYSBkZW55IHBvbGljeSB3aGVuIGV2ZW50IHBheWxvYWQgaXMgYmFkJywgYXN5bmMgKCkgPT4ge1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgYXdhaXQgd2Vic29ja2V0SGFuZGxlcihtb2NrSW52YWxpZFJlcXVlc3RFdmVudCBhcyBBUElHYXRld2F5UmVxdWVzdEF1dGhvcml6ZXJFdmVudCk7XG4gICAgICAgIH0gY2F0Y2ggKGVycm9yOiBhbnkpIHtcbiAgICAgICAgICAgIGV4cGVjdChlcnJvci5tZXNzYWdlKS50b0VxdWFsKCdVbmF1dGhvcml6ZWQnKTtcbiAgICAgICAgfVxuICAgIH0pO1xuXG4gICAgYWZ0ZXJBbGwoKCkgPT4ge1xuICAgICAgICBkZWxldGUgcHJvY2Vzcy5lbnYuQVdTX1NES19VU0VSX0FHRU5UO1xuICAgICAgICBkZWxldGUgcHJvY2Vzcy5lbnYuQ09HTklUT19QT0xJQ1lfVEFCTEVfTkFNRTtcblxuICAgICAgICBkZGJNb2NrZWRDbGllbnQucmVzdG9yZSgpO1xuICAgIH0pO1xuXG4gICAgYWZ0ZXJFYWNoKCgpID0+IGplc3QuY2xlYXJBbGxNb2NrcygpKTtcbn0pO1xuXG5kZXNjcmliZSgnV2hlbiB0aGUgcmVzdCBoYW5kbGVyIHJlY2VpdmVzIGFuIGF1dGhvcml6YXRpb24gZXZlbnQnLCAoKSA9PiB7XG4gICAgbGV0IGRkYk1vY2tlZENsaWVudDogYW55O1xuXG4gICAgYmVmb3JlQWxsKCgpID0+IHtcbiAgICAgICAgcHJvY2Vzcy5lbnYuQVdTX1NES19VU0VSX0FHRU5UID0gYHsgXCJjdXN0b21Vc2VyQWdlbnRcIjogXCJBd3NTb2x1dGlvbi9TTzAwODQvdjIuMC4wXCIgfWA7XG4gICAgICAgIHByb2Nlc3MuZW52LkNPR05JVE9fUE9MSUNZX1RBQkxFX05BTUUgPSAnZmFrZS10YWJsZS1uYW1lJztcbiAgICAgICAgZGRiTW9ja2VkQ2xpZW50ID0gbW9ja0NsaWVudChEeW5hbW9EQkRvY3VtZW50Q2xpZW50KTtcbiAgICB9KTtcblxuICAgIGl0KCdzaG91bGQgcmV0dXJuIGFuIGFsbG93IHBvbGljeScsIGFzeW5jICgpID0+IHtcbiAgICAgICAgZGRiTW9ja2VkQ2xpZW50Lm9uKEJhdGNoR2V0Q29tbWFuZCkucmVzb2x2ZXMoYmF0Y2hHZXRJdGVtUmVzcG9uc2UpO1xuICAgICAgICBjb25zdCByZXNwb25zZSA9IGF3YWl0IHJlc3RIYW5kbGVyKG1vY2tWYWxpZFJlc3RSZXF1ZXN0RXZlbnQgYXMgQVBJR2F0ZXdheVJlcXVlc3RBdXRob3JpemVyRXZlbnQpO1xuICAgICAgICBleHBlY3QocmVzcG9uc2UpLnRvRXF1YWwoe1xuICAgICAgICAgICAgcHJpbmNpcGFsSWQ6ICcqJyxcbiAgICAgICAgICAgIHBvbGljeURvY3VtZW50OiB7XG4gICAgICAgICAgICAgICAgJ1ZlcnNpb24nOiAnMjAxMi0xMC0xNycsXG4gICAgICAgICAgICAgICAgJ1N0YXRlbWVudCc6IFtcbiAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgJ1Jlc291cmNlJzogWydhcm46YXdzOmV4ZWN1dGUtYXBpOnVzLWVhc3QtMToxMTExMTExMTExMTE6ZmFrZS1hcGktaWQvKi8qJ10sXG4gICAgICAgICAgICAgICAgICAgICAgICAnRWZmZWN0JzogJ0FsbG93JyxcbiAgICAgICAgICAgICAgICAgICAgICAgICdBY3Rpb24nOiAnZXhlY3V0ZS1hcGk6SW52b2tlJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICdTaWQnOiAndXNlLWNhc2UtbWFuYWdlbWVudC1hcGktYWRtaW4tcG9saWN5LXN0YXRlbWVudCdcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgJ1Jlc291cmNlJzogWydhcm46YXdzOmV4ZWN1dGUtYXBpOnVzLWVhc3QtMToxMTExMTExMTExMTE6ZmFrZS1hcGktaWQyLyovKiddLFxuICAgICAgICAgICAgICAgICAgICAgICAgJ0VmZmVjdCc6ICdBbGxvdycsXG4gICAgICAgICAgICAgICAgICAgICAgICAnQWN0aW9uJzogJ2V4ZWN1dGUtYXBpOkludm9rZScsXG4gICAgICAgICAgICAgICAgICAgICAgICAnU2lkJzogJ0h1Z2dpbmdGYWNlQ2hhdFN0YWNrLVVzZXJzLXBvbGljeS1zdGF0ZW1lbnQnXG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBdXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgY29udGV4dDoge1xuICAgICAgICAgICAgICAgIFVzZXJJZDogJ2Zha2Utc3ViJ1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9KTtcblxuICAgIGl0KCdzaG91bGQgcmV0dXJuIGEgZGVueSBwb2xpY3kgd2hlbiB2ZXJpZmljYXRpb24gZmFpbHMnLCBhc3luYyAoKSA9PiB7XG4gICAgICAgIGplc3QudW5tb2NrKCdhd3Mtand0LXZlcmlmeScpO1xuXG4gICAgICAgIGplc3QubW9jaygnYXdzLWp3dC12ZXJpZnknLCAoKSA9PiB7XG4gICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgIENvZ25pdG9Kd3RWZXJpZmllcjoge1xuICAgICAgICAgICAgICAgICAgICBjcmVhdGU6ICgpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdmVyaWZ5OiAoKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcignTW9jay1qd3QtZXJyb3InKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIGF3YWl0IHJlc3RIYW5kbGVyKG1vY2tWYWxpZFJlc3RSZXF1ZXN0RXZlbnQgYXMgQVBJR2F0ZXdheVJlcXVlc3RBdXRob3JpemVyRXZlbnQpO1xuICAgICAgICB9IGNhdGNoIChlcnJvcjogYW55KSB7XG4gICAgICAgICAgICBleHBlY3QoZXJyb3IubWVzc2FnZSkudG9FcXVhbCgnVW5hdXRob3JpemVkJyk7XG4gICAgICAgIH1cbiAgICB9KTtcblxuICAgIGl0KCdzaG91bGQgcmV0dXJuIGEgZGVueSBwb2xpY3kgd2hlbiBldmVudCBwYXlsb2FkIGlzIGJhZCcsIGFzeW5jICgpID0+IHtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIGF3YWl0IHJlc3RIYW5kbGVyKG1vY2tJbnZhbGlkUmVxdWVzdEV2ZW50IGFzIEFQSUdhdGV3YXlSZXF1ZXN0QXV0aG9yaXplckV2ZW50KTtcbiAgICAgICAgfSBjYXRjaCAoZXJyb3I6IGFueSkge1xuICAgICAgICAgICAgZXhwZWN0KGVycm9yLm1lc3NhZ2UpLnRvRXF1YWwoJ1VuYXV0aG9yaXplZCcpO1xuICAgICAgICB9XG4gICAgfSk7XG5cbiAgICBhZnRlckVhY2goKCkgPT4gamVzdC5jbGVhckFsbE1vY2tzKCkpO1xuICAgIGFmdGVyQWxsKCgpID0+IHtcbiAgICAgICAgZGVsZXRlIHByb2Nlc3MuZW52LkFXU19TREtfVVNFUl9BR0VOVDtcbiAgICAgICAgZGVsZXRlIHByb2Nlc3MuZW52LkNPR05JVE9fUE9MSUNZX1RBQkxFX05BTUU7XG5cbiAgICAgICAgZGRiTW9ja2VkQ2xpZW50LnJlc3RvcmUoKTtcbiAgICB9KTtcbn0pO1xuXG5qZXN0LmNsZWFyQWxsTW9ja3MoKTtcbiJdfQ==