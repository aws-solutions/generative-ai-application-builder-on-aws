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
const http_response_formatters_1 = require("../../utils/http-response-formatters");
describe('When formatting messages as HTTP responses', () => {
    beforeAll(() => {
        process.env.AWS_SDK_USER_AGENT = '{ "customUserAgent": "AwsSolution/SO0999/v9.9.9" }';
        process.env.AWS_REGION = 'us-east-1';
    });
    it('Should format the message into a default response correctly', () => {
        const response = (0, http_response_formatters_1.formatResponse)('Test response');
        expect(response).toEqual({
            'statusCode': 200,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Headers': 'Origin,X-Requested-With,Content-Type,Accept',
                'Access-Control-Allow-Methods': 'OPTIONS,POST,GET',
                'Access-Control-Allow-Credentials': true,
                'Access-Control-Allow-Origin': '*' // NOSONAR - javascript:S5122 - Domain not known at this point.
            },
            'isBase64Encoded': false,
            'body': 'Test response'
        });
    });
    it('Should format the message into a response correctly with extra headers', () => {
        const response = (0, http_response_formatters_1.formatResponse)({ 'test-body': 'Test response' }, { 'x-amz-testHeader': 'test-header-value' });
        expect(response).toEqual({
            'statusCode': 200,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Headers': 'Origin,X-Requested-With,Content-Type,Accept',
                'Access-Control-Allow-Methods': 'OPTIONS,POST,GET',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Credentials': true,
                'x-amz-testHeader': 'test-header-value'
            },
            'isBase64Encoded': false,
            'body': '{"test-body":"Test response"}'
        });
    });
    afterAll(() => {
        delete process.env.AWS_SDK_USER_AGENT;
        delete process.env.AWS_REGION;
    });
});
describe('When formatting error responses as HTTP responses', () => {
    beforeAll(() => {
        process.env.AWS_SDK_USER_AGENT = '{ "customUserAgent": "AwsSolution/SO0999/v9.9.9" }';
        process.env.AWS_REGION = 'us-east-1';
    });
    it('Should format the error into a default response correctly', () => {
        const response = (0, http_response_formatters_1.formatError)({
            message: 'Test Error'
        });
        expect(response).toEqual({
            'statusCode': '400',
            'headers': {
                'Content-Type': 'text/plain',
                'x-amzn-ErrorType': 'CustomExecutionError',
                'Access-Control-Allow-Origin': '*'
            },
            'isBase64Encoded': false,
            'body': 'Test Error'
        });
    });
    it('Should format a custom error response correctly', () => {
        expect((0, http_response_formatters_1.formatError)({
            message: 'Test Error',
            statusCode: '417',
            extraHeaders: { mockHeader: 'mockValue' }
        })).toEqual({
            'statusCode': '417',
            'headers': {
                'Content-Type': 'text/plain',
                'x-amzn-ErrorType': 'CustomExecutionError',
                'Access-Control-Allow-Origin': '*',
                'mockHeader': 'mockValue'
            },
            'isBase64Encoded': false,
            'body': 'Test Error'
        });
    });
    afterAll(() => {
        delete process.env.AWS_SDK_USER_AGENT;
        delete process.env.AWS_REGION;
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaHR0cC1yZXNwb25zZS1mb3JtYXR0ZXIudGVzdC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uL3Rlc3QvdXRpbHMvaHR0cC1yZXNwb25zZS1mb3JtYXR0ZXIudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUE7Ozs7Ozs7Ozs7O3dIQVd3SDs7QUFFeEgsbUZBQW1GO0FBRW5GLFFBQVEsQ0FBQyw0Q0FBNEMsRUFBRSxHQUFHLEVBQUU7SUFDeEQsU0FBUyxDQUFDLEdBQUcsRUFBRTtRQUNYLE9BQU8sQ0FBQyxHQUFHLENBQUMsa0JBQWtCLEdBQUcsb0RBQW9ELENBQUM7UUFDdEYsT0FBTyxDQUFDLEdBQUcsQ0FBQyxVQUFVLEdBQUcsV0FBVyxDQUFDO0lBQ3pDLENBQUMsQ0FBQyxDQUFDO0lBRUgsRUFBRSxDQUFDLDZEQUE2RCxFQUFFLEdBQUcsRUFBRTtRQUNuRSxNQUFNLFFBQVEsR0FBRyxJQUFBLHlDQUFjLEVBQUMsZUFBZSxDQUFDLENBQUM7UUFDakQsTUFBTSxDQUFDLFFBQVEsQ0FBQyxDQUFDLE9BQU8sQ0FBQztZQUNyQixZQUFZLEVBQUUsR0FBRztZQUNqQixTQUFTLEVBQUU7Z0JBQ1AsY0FBYyxFQUFFLGtCQUFrQjtnQkFDbEMsOEJBQThCLEVBQUUsNkNBQTZDO2dCQUM3RSw4QkFBOEIsRUFBRSxrQkFBa0I7Z0JBQ2xELGtDQUFrQyxFQUFFLElBQUk7Z0JBQ3hDLDZCQUE2QixFQUFFLEdBQUcsQ0FBQywrREFBK0Q7YUFDckc7WUFDRCxpQkFBaUIsRUFBRSxLQUFLO1lBQ3hCLE1BQU0sRUFBRSxlQUFlO1NBQzFCLENBQUMsQ0FBQztJQUNQLENBQUMsQ0FBQyxDQUFDO0lBRUgsRUFBRSxDQUFDLHdFQUF3RSxFQUFFLEdBQUcsRUFBRTtRQUM5RSxNQUFNLFFBQVEsR0FBRyxJQUFBLHlDQUFjLEVBQUMsRUFBRSxXQUFXLEVBQUUsZUFBZSxFQUFFLEVBQUUsRUFBRSxrQkFBa0IsRUFBRSxtQkFBbUIsRUFBRSxDQUFDLENBQUM7UUFDL0csTUFBTSxDQUFDLFFBQVEsQ0FBQyxDQUFDLE9BQU8sQ0FBQztZQUNyQixZQUFZLEVBQUUsR0FBRztZQUNqQixTQUFTLEVBQUU7Z0JBQ1AsY0FBYyxFQUFFLGtCQUFrQjtnQkFDbEMsOEJBQThCLEVBQUUsNkNBQTZDO2dCQUM3RSw4QkFBOEIsRUFBRSxrQkFBa0I7Z0JBQ2xELDZCQUE2QixFQUFFLEdBQUc7Z0JBQ2xDLGtDQUFrQyxFQUFFLElBQUk7Z0JBQ3hDLGtCQUFrQixFQUFFLG1CQUFtQjthQUMxQztZQUNELGlCQUFpQixFQUFFLEtBQUs7WUFDeEIsTUFBTSxFQUFFLCtCQUErQjtTQUMxQyxDQUFDLENBQUM7SUFDUCxDQUFDLENBQUMsQ0FBQztJQUVILFFBQVEsQ0FBQyxHQUFHLEVBQUU7UUFDVixPQUFPLE9BQU8sQ0FBQyxHQUFHLENBQUMsa0JBQWtCLENBQUM7UUFDdEMsT0FBTyxPQUFPLENBQUMsR0FBRyxDQUFDLFVBQVUsQ0FBQztJQUNsQyxDQUFDLENBQUMsQ0FBQztBQUNQLENBQUMsQ0FBQyxDQUFDO0FBRUgsUUFBUSxDQUFDLG1EQUFtRCxFQUFFLEdBQUcsRUFBRTtJQUMvRCxTQUFTLENBQUMsR0FBRyxFQUFFO1FBQ1gsT0FBTyxDQUFDLEdBQUcsQ0FBQyxrQkFBa0IsR0FBRyxvREFBb0QsQ0FBQztRQUN0RixPQUFPLENBQUMsR0FBRyxDQUFDLFVBQVUsR0FBRyxXQUFXLENBQUM7SUFDekMsQ0FBQyxDQUFDLENBQUM7SUFFSCxFQUFFLENBQUMsMkRBQTJELEVBQUUsR0FBRyxFQUFFO1FBQ2pFLE1BQU0sUUFBUSxHQUFHLElBQUEsc0NBQVcsRUFBQztZQUN6QixPQUFPLEVBQUUsWUFBWTtTQUN4QixDQUFDLENBQUM7UUFDSCxNQUFNLENBQUMsUUFBUSxDQUFDLENBQUMsT0FBTyxDQUFDO1lBQ3JCLFlBQVksRUFBRSxLQUFLO1lBQ25CLFNBQVMsRUFBRTtnQkFDUCxjQUFjLEVBQUUsWUFBWTtnQkFDNUIsa0JBQWtCLEVBQUUsc0JBQXNCO2dCQUMxQyw2QkFBNkIsRUFBRSxHQUFHO2FBQ3JDO1lBQ0QsaUJBQWlCLEVBQUUsS0FBSztZQUN4QixNQUFNLEVBQUUsWUFBWTtTQUN2QixDQUFDLENBQUM7SUFDUCxDQUFDLENBQUMsQ0FBQztJQUVILEVBQUUsQ0FBQyxpREFBaUQsRUFBRSxHQUFHLEVBQUU7UUFDdkQsTUFBTSxDQUNGLElBQUEsc0NBQVcsRUFBQztZQUNSLE9BQU8sRUFBRSxZQUFZO1lBQ3JCLFVBQVUsRUFBRSxLQUFLO1lBQ2pCLFlBQVksRUFBRSxFQUFFLFVBQVUsRUFBRSxXQUFXLEVBQUU7U0FDNUMsQ0FBQyxDQUNMLENBQUMsT0FBTyxDQUFDO1lBQ04sWUFBWSxFQUFFLEtBQUs7WUFDbkIsU0FBUyxFQUFFO2dCQUNQLGNBQWMsRUFBRSxZQUFZO2dCQUM1QixrQkFBa0IsRUFBRSxzQkFBc0I7Z0JBQzFDLDZCQUE2QixFQUFFLEdBQUc7Z0JBQ2xDLFlBQVksRUFBRSxXQUFXO2FBQzVCO1lBQ0QsaUJBQWlCLEVBQUUsS0FBSztZQUN4QixNQUFNLEVBQUUsWUFBWTtTQUN2QixDQUFDLENBQUM7SUFDUCxDQUFDLENBQUMsQ0FBQztJQUVILFFBQVEsQ0FBQyxHQUFHLEVBQUU7UUFDVixPQUFPLE9BQU8sQ0FBQyxHQUFHLENBQUMsa0JBQWtCLENBQUM7UUFDdEMsT0FBTyxPQUFPLENBQUMsR0FBRyxDQUFDLFVBQVUsQ0FBQztJQUNsQyxDQUFDLENBQUMsQ0FBQztBQUNQLENBQUMsQ0FBQyxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKipcbiAqICBDb3B5cmlnaHQgQW1hem9uLmNvbSwgSW5jLiBvciBpdHMgYWZmaWxpYXRlcy4gQWxsIFJpZ2h0cyBSZXNlcnZlZC4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAqXG4gKiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgKlxuICogIExpY2Vuc2VkIHVuZGVyIHRoZSBBcGFjaGUgTGljZW5zZSwgVmVyc2lvbiAyLjAgKHRoZSBcIkxpY2Vuc2VcIikuIFlvdSBtYXkgbm90IHVzZSB0aGlzIGZpbGUgZXhjZXB0IGluIGNvbXBsaWFuY2UgICAgKlxuICogIHdpdGggdGhlIExpY2Vuc2UuIEEgY29weSBvZiB0aGUgTGljZW5zZSBpcyBsb2NhdGVkIGF0ICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICpcbiAqICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAqXG4gKiAgICAgIGh0dHA6Ly93d3cuYXBhY2hlLm9yZy9saWNlbnNlcy9MSUNFTlNFLTIuMCAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgKlxuICogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICpcbiAqICBvciBpbiB0aGUgJ2xpY2Vuc2UnIGZpbGUgYWNjb21wYW55aW5nIHRoaXMgZmlsZS4gVGhpcyBmaWxlIGlzIGRpc3RyaWJ1dGVkIG9uIGFuICdBUyBJUycgQkFTSVMsIFdJVEhPVVQgV0FSUkFOVElFUyAqXG4gKiAgT1IgQ09ORElUSU9OUyBPRiBBTlkgS0lORCwgZXhwcmVzcyBvciBpbXBsaWVkLiBTZWUgdGhlIExpY2Vuc2UgZm9yIHRoZSBzcGVjaWZpYyBsYW5ndWFnZSBnb3Zlcm5pbmcgcGVybWlzc2lvbnMgICAgKlxuICogIGFuZCBsaW1pdGF0aW9ucyB1bmRlciB0aGUgTGljZW5zZS4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICpcbiAqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqL1xuXG5pbXBvcnQgeyBmb3JtYXRSZXNwb25zZSwgZm9ybWF0RXJyb3IgfSBmcm9tICcuLi8uLi91dGlscy9odHRwLXJlc3BvbnNlLWZvcm1hdHRlcnMnO1xuXG5kZXNjcmliZSgnV2hlbiBmb3JtYXR0aW5nIG1lc3NhZ2VzIGFzIEhUVFAgcmVzcG9uc2VzJywgKCkgPT4ge1xuICAgIGJlZm9yZUFsbCgoKSA9PiB7XG4gICAgICAgIHByb2Nlc3MuZW52LkFXU19TREtfVVNFUl9BR0VOVCA9ICd7IFwiY3VzdG9tVXNlckFnZW50XCI6IFwiQXdzU29sdXRpb24vU08wOTk5L3Y5LjkuOVwiIH0nO1xuICAgICAgICBwcm9jZXNzLmVudi5BV1NfUkVHSU9OID0gJ3VzLWVhc3QtMSc7XG4gICAgfSk7XG5cbiAgICBpdCgnU2hvdWxkIGZvcm1hdCB0aGUgbWVzc2FnZSBpbnRvIGEgZGVmYXVsdCByZXNwb25zZSBjb3JyZWN0bHknLCAoKSA9PiB7XG4gICAgICAgIGNvbnN0IHJlc3BvbnNlID0gZm9ybWF0UmVzcG9uc2UoJ1Rlc3QgcmVzcG9uc2UnKTtcbiAgICAgICAgZXhwZWN0KHJlc3BvbnNlKS50b0VxdWFsKHtcbiAgICAgICAgICAgICdzdGF0dXNDb2RlJzogMjAwLFxuICAgICAgICAgICAgJ2hlYWRlcnMnOiB7XG4gICAgICAgICAgICAgICAgJ0NvbnRlbnQtVHlwZSc6ICdhcHBsaWNhdGlvbi9qc29uJyxcbiAgICAgICAgICAgICAgICAnQWNjZXNzLUNvbnRyb2wtQWxsb3ctSGVhZGVycyc6ICdPcmlnaW4sWC1SZXF1ZXN0ZWQtV2l0aCxDb250ZW50LVR5cGUsQWNjZXB0JyxcbiAgICAgICAgICAgICAgICAnQWNjZXNzLUNvbnRyb2wtQWxsb3ctTWV0aG9kcyc6ICdPUFRJT05TLFBPU1QsR0VUJyxcbiAgICAgICAgICAgICAgICAnQWNjZXNzLUNvbnRyb2wtQWxsb3ctQ3JlZGVudGlhbHMnOiB0cnVlLFxuICAgICAgICAgICAgICAgICdBY2Nlc3MtQ29udHJvbC1BbGxvdy1PcmlnaW4nOiAnKicgLy8gTk9TT05BUiAtIGphdmFzY3JpcHQ6UzUxMjIgLSBEb21haW4gbm90IGtub3duIGF0IHRoaXMgcG9pbnQuXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgJ2lzQmFzZTY0RW5jb2RlZCc6IGZhbHNlLFxuICAgICAgICAgICAgJ2JvZHknOiAnVGVzdCByZXNwb25zZSdcbiAgICAgICAgfSk7XG4gICAgfSk7XG5cbiAgICBpdCgnU2hvdWxkIGZvcm1hdCB0aGUgbWVzc2FnZSBpbnRvIGEgcmVzcG9uc2UgY29ycmVjdGx5IHdpdGggZXh0cmEgaGVhZGVycycsICgpID0+IHtcbiAgICAgICAgY29uc3QgcmVzcG9uc2UgPSBmb3JtYXRSZXNwb25zZSh7ICd0ZXN0LWJvZHknOiAnVGVzdCByZXNwb25zZScgfSwgeyAneC1hbXotdGVzdEhlYWRlcic6ICd0ZXN0LWhlYWRlci12YWx1ZScgfSk7XG4gICAgICAgIGV4cGVjdChyZXNwb25zZSkudG9FcXVhbCh7XG4gICAgICAgICAgICAnc3RhdHVzQ29kZSc6IDIwMCxcbiAgICAgICAgICAgICdoZWFkZXJzJzoge1xuICAgICAgICAgICAgICAgICdDb250ZW50LVR5cGUnOiAnYXBwbGljYXRpb24vanNvbicsXG4gICAgICAgICAgICAgICAgJ0FjY2Vzcy1Db250cm9sLUFsbG93LUhlYWRlcnMnOiAnT3JpZ2luLFgtUmVxdWVzdGVkLVdpdGgsQ29udGVudC1UeXBlLEFjY2VwdCcsXG4gICAgICAgICAgICAgICAgJ0FjY2Vzcy1Db250cm9sLUFsbG93LU1ldGhvZHMnOiAnT1BUSU9OUyxQT1NULEdFVCcsXG4gICAgICAgICAgICAgICAgJ0FjY2Vzcy1Db250cm9sLUFsbG93LU9yaWdpbic6ICcqJywgLy8gTk9TT05BUiAtIGphdmFzY3JpcHQ6UzUxMjIgLSBEb21haW4gbm90IGtub3duIGF0IHRoaXMgcG9pbnQuXG4gICAgICAgICAgICAgICAgJ0FjY2Vzcy1Db250cm9sLUFsbG93LUNyZWRlbnRpYWxzJzogdHJ1ZSxcbiAgICAgICAgICAgICAgICAneC1hbXotdGVzdEhlYWRlcic6ICd0ZXN0LWhlYWRlci12YWx1ZSdcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAnaXNCYXNlNjRFbmNvZGVkJzogZmFsc2UsXG4gICAgICAgICAgICAnYm9keSc6ICd7XCJ0ZXN0LWJvZHlcIjpcIlRlc3QgcmVzcG9uc2VcIn0nXG4gICAgICAgIH0pO1xuICAgIH0pO1xuXG4gICAgYWZ0ZXJBbGwoKCkgPT4ge1xuICAgICAgICBkZWxldGUgcHJvY2Vzcy5lbnYuQVdTX1NES19VU0VSX0FHRU5UO1xuICAgICAgICBkZWxldGUgcHJvY2Vzcy5lbnYuQVdTX1JFR0lPTjtcbiAgICB9KTtcbn0pO1xuXG5kZXNjcmliZSgnV2hlbiBmb3JtYXR0aW5nIGVycm9yIHJlc3BvbnNlcyBhcyBIVFRQIHJlc3BvbnNlcycsICgpID0+IHtcbiAgICBiZWZvcmVBbGwoKCkgPT4ge1xuICAgICAgICBwcm9jZXNzLmVudi5BV1NfU0RLX1VTRVJfQUdFTlQgPSAneyBcImN1c3RvbVVzZXJBZ2VudFwiOiBcIkF3c1NvbHV0aW9uL1NPMDk5OS92OS45LjlcIiB9JztcbiAgICAgICAgcHJvY2Vzcy5lbnYuQVdTX1JFR0lPTiA9ICd1cy1lYXN0LTEnO1xuICAgIH0pO1xuXG4gICAgaXQoJ1Nob3VsZCBmb3JtYXQgdGhlIGVycm9yIGludG8gYSBkZWZhdWx0IHJlc3BvbnNlIGNvcnJlY3RseScsICgpID0+IHtcbiAgICAgICAgY29uc3QgcmVzcG9uc2UgPSBmb3JtYXRFcnJvcih7XG4gICAgICAgICAgICBtZXNzYWdlOiAnVGVzdCBFcnJvcidcbiAgICAgICAgfSk7XG4gICAgICAgIGV4cGVjdChyZXNwb25zZSkudG9FcXVhbCh7XG4gICAgICAgICAgICAnc3RhdHVzQ29kZSc6ICc0MDAnLFxuICAgICAgICAgICAgJ2hlYWRlcnMnOiB7XG4gICAgICAgICAgICAgICAgJ0NvbnRlbnQtVHlwZSc6ICd0ZXh0L3BsYWluJyxcbiAgICAgICAgICAgICAgICAneC1hbXpuLUVycm9yVHlwZSc6ICdDdXN0b21FeGVjdXRpb25FcnJvcicsXG4gICAgICAgICAgICAgICAgJ0FjY2Vzcy1Db250cm9sLUFsbG93LU9yaWdpbic6ICcqJ1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICdpc0Jhc2U2NEVuY29kZWQnOiBmYWxzZSxcbiAgICAgICAgICAgICdib2R5JzogJ1Rlc3QgRXJyb3InXG4gICAgICAgIH0pO1xuICAgIH0pO1xuXG4gICAgaXQoJ1Nob3VsZCBmb3JtYXQgYSBjdXN0b20gZXJyb3IgcmVzcG9uc2UgY29ycmVjdGx5JywgKCkgPT4ge1xuICAgICAgICBleHBlY3QoXG4gICAgICAgICAgICBmb3JtYXRFcnJvcih7XG4gICAgICAgICAgICAgICAgbWVzc2FnZTogJ1Rlc3QgRXJyb3InLFxuICAgICAgICAgICAgICAgIHN0YXR1c0NvZGU6ICc0MTcnLFxuICAgICAgICAgICAgICAgIGV4dHJhSGVhZGVyczogeyBtb2NrSGVhZGVyOiAnbW9ja1ZhbHVlJyB9XG4gICAgICAgICAgICB9KVxuICAgICAgICApLnRvRXF1YWwoe1xuICAgICAgICAgICAgJ3N0YXR1c0NvZGUnOiAnNDE3JyxcbiAgICAgICAgICAgICdoZWFkZXJzJzoge1xuICAgICAgICAgICAgICAgICdDb250ZW50LVR5cGUnOiAndGV4dC9wbGFpbicsXG4gICAgICAgICAgICAgICAgJ3gtYW16bi1FcnJvclR5cGUnOiAnQ3VzdG9tRXhlY3V0aW9uRXJyb3InLFxuICAgICAgICAgICAgICAgICdBY2Nlc3MtQ29udHJvbC1BbGxvdy1PcmlnaW4nOiAnKicsXG4gICAgICAgICAgICAgICAgJ21vY2tIZWFkZXInOiAnbW9ja1ZhbHVlJ1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICdpc0Jhc2U2NEVuY29kZWQnOiBmYWxzZSxcbiAgICAgICAgICAgICdib2R5JzogJ1Rlc3QgRXJyb3InXG4gICAgICAgIH0pO1xuICAgIH0pO1xuXG4gICAgYWZ0ZXJBbGwoKCkgPT4ge1xuICAgICAgICBkZWxldGUgcHJvY2Vzcy5lbnYuQVdTX1NES19VU0VSX0FHRU5UO1xuICAgICAgICBkZWxldGUgcHJvY2Vzcy5lbnYuQVdTX1JFR0lPTjtcbiAgICB9KTtcbn0pO1xuIl19