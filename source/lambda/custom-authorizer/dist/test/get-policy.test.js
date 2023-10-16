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
const get_policy_1 = require("../utils/get-policy");
const lib_dynamodb_1 = require("@aws-sdk/lib-dynamodb");
const aws_sdk_client_mock_1 = require("aws-sdk-client-mock");
const event_test_data_1 = require("./event-test-data");
describe('Policy Generator test', () => {
    let ddbMockedClient;
    beforeAll(() => {
        process.env.AWS_SDK_USER_AGENT = `{ "customUserAgent": "AwsSolution/SO0084/v2.0.0" }`;
        process.env.COGNITO_POLICY_TABLE_NAME = 'fake-table-name';
        ddbMockedClient = (0, aws_sdk_client_mock_1.mockClient)(lib_dynamodb_1.DynamoDBDocumentClient);
    });
    it('denyAllPolicy should be correctly generated', () => {
        expect((0, get_policy_1.denyAllPolicy)()).toEqual({
            principalId: '*',
            policyDocument: {
                Version: '2012-10-17',
                Statement: [
                    {
                        Action: '*',
                        Effect: 'Deny',
                        Resource: '*'
                    }
                ]
            }
        });
    });
    it('should handle retrieving the policy', async () => {
        ddbMockedClient.on(lib_dynamodb_1.BatchGetCommand).resolves(event_test_data_1.batchGetItemResponse);
        const expectedPolicy = {
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
        };
        await expect((0, get_policy_1.getPolicyDocument)(event_test_data_1.fakeIdToken)).resolves.toEqual(expectedPolicy);
    });
    it('should handle when user is in multiple groups', async () => {
        ddbMockedClient.on(lib_dynamodb_1.BatchGetCommand).resolves(event_test_data_1.multiGroupBatchGetItemResponse);
        const expectedPolicy = {
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
                    },
                    {
                        'Resource': ['arn:aws:execute-api:us-east-1:111111111111:fake-api-id3/*/*'],
                        'Effect': 'Allow',
                        'Action': 'execute-api:Invoke',
                        'Sid': 'AnthropicChatStack-Users-policy-statement'
                    }
                ]
            },
            context: {
                UserId: 'fake-sub'
            }
        };
        await expect((0, get_policy_1.getPolicyDocument)(event_test_data_1.fakeMultiGroupIdToken)).resolves.toEqual(expectedPolicy);
    });
    it('should return a deny policy if we receive no policies for the gorup', async () => {
        ddbMockedClient.on(lib_dynamodb_1.BatchGetCommand).resolves({});
        await expect((0, get_policy_1.getPolicyDocument)(event_test_data_1.fakeMultiGroupIdToken)).resolves.toEqual((0, get_policy_1.denyAllPolicy)());
    });
    afterAll(() => {
        delete process.env.AWS_SDK_USER_AGENT;
        delete process.env.COGNITO_POLICY_TABLE_NAME;
        ddbMockedClient.restore();
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2V0LXBvbGljeS50ZXN0LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vdGVzdC9nZXQtcG9saWN5LnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBOzs7Ozs7Ozs7Ozt3SEFXd0g7O0FBRXhILG9EQUF1RTtBQUN2RSx3REFBZ0Y7QUFDaEYsNkRBQWlEO0FBQ2pELHVEQUsyQjtBQUczQixRQUFRLENBQUMsdUJBQXVCLEVBQUUsR0FBRyxFQUFFO0lBQ25DLElBQUksZUFBb0IsQ0FBQztJQUV6QixTQUFTLENBQUMsR0FBRyxFQUFFO1FBQ1gsT0FBTyxDQUFDLEdBQUcsQ0FBQyxrQkFBa0IsR0FBRyxvREFBb0QsQ0FBQztRQUN0RixPQUFPLENBQUMsR0FBRyxDQUFDLHlCQUF5QixHQUFHLGlCQUFpQixDQUFDO1FBQzFELGVBQWUsR0FBRyxJQUFBLGdDQUFVLEVBQUMscUNBQXNCLENBQUMsQ0FBQztJQUN6RCxDQUFDLENBQUMsQ0FBQztJQUVILEVBQUUsQ0FBQyw2Q0FBNkMsRUFBRSxHQUFHLEVBQUU7UUFDbkQsTUFBTSxDQUFDLElBQUEsMEJBQWEsR0FBRSxDQUFDLENBQUMsT0FBTyxDQUFDO1lBQzVCLFdBQVcsRUFBRSxHQUFHO1lBQ2hCLGNBQWMsRUFBRTtnQkFDWixPQUFPLEVBQUUsWUFBWTtnQkFDckIsU0FBUyxFQUFFO29CQUNQO3dCQUNJLE1BQU0sRUFBRSxHQUFHO3dCQUNYLE1BQU0sRUFBRSxNQUFNO3dCQUNkLFFBQVEsRUFBRSxHQUFHO3FCQUNoQjtpQkFDSjthQUNKO1NBQ0osQ0FBQyxDQUFDO0lBQ1AsQ0FBQyxDQUFDLENBQUM7SUFFSCxFQUFFLENBQUMscUNBQXFDLEVBQUUsS0FBSyxJQUFJLEVBQUU7UUFDakQsZUFBZSxDQUFDLEVBQUUsQ0FBQyw4QkFBZSxDQUFDLENBQUMsUUFBUSxDQUFDLHNDQUFvQixDQUFDLENBQUM7UUFFbkUsTUFBTSxjQUFjLEdBQUc7WUFDbkIsV0FBVyxFQUFFLEdBQUc7WUFDaEIsY0FBYyxFQUFFO2dCQUNaLFNBQVMsRUFBRSxZQUFZO2dCQUN2QixXQUFXLEVBQUU7b0JBQ1Q7d0JBQ0ksVUFBVSxFQUFFLENBQUMsNERBQTRELENBQUM7d0JBQzFFLFFBQVEsRUFBRSxPQUFPO3dCQUNqQixRQUFRLEVBQUUsb0JBQW9CO3dCQUM5QixLQUFLLEVBQUUsZ0RBQWdEO3FCQUMxRDtvQkFDRDt3QkFDSSxVQUFVLEVBQUUsQ0FBQyw2REFBNkQsQ0FBQzt3QkFDM0UsUUFBUSxFQUFFLE9BQU87d0JBQ2pCLFFBQVEsRUFBRSxvQkFBb0I7d0JBQzlCLEtBQUssRUFBRSw2Q0FBNkM7cUJBQ3ZEO2lCQUNKO2FBQ0o7WUFDRCxPQUFPLEVBQUU7Z0JBQ0wsTUFBTSxFQUFFLFVBQVU7YUFDckI7U0FDSixDQUFDO1FBRUYsTUFBTSxNQUFNLENBQUMsSUFBQSw4QkFBaUIsRUFBNEIsNkJBQVcsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxjQUFjLENBQUMsQ0FBQztJQUM3RyxDQUFDLENBQUMsQ0FBQztJQUVILEVBQUUsQ0FBQywrQ0FBK0MsRUFBRSxLQUFLLElBQUksRUFBRTtRQUMzRCxlQUFlLENBQUMsRUFBRSxDQUFDLDhCQUFlLENBQUMsQ0FBQyxRQUFRLENBQUMsZ0RBQThCLENBQUMsQ0FBQztRQUU3RSxNQUFNLGNBQWMsR0FBRztZQUNuQixXQUFXLEVBQUUsR0FBRztZQUNoQixjQUFjLEVBQUU7Z0JBQ1osU0FBUyxFQUFFLFlBQVk7Z0JBQ3ZCLFdBQVcsRUFBRTtvQkFDVDt3QkFDSSxVQUFVLEVBQUUsQ0FBQyw0REFBNEQsQ0FBQzt3QkFDMUUsUUFBUSxFQUFFLE9BQU87d0JBQ2pCLFFBQVEsRUFBRSxvQkFBb0I7d0JBQzlCLEtBQUssRUFBRSxnREFBZ0Q7cUJBQzFEO29CQUNEO3dCQUNJLFVBQVUsRUFBRSxDQUFDLDZEQUE2RCxDQUFDO3dCQUMzRSxRQUFRLEVBQUUsT0FBTzt3QkFDakIsUUFBUSxFQUFFLG9CQUFvQjt3QkFDOUIsS0FBSyxFQUFFLDZDQUE2QztxQkFDdkQ7b0JBQ0Q7d0JBQ0ksVUFBVSxFQUFFLENBQUMsNkRBQTZELENBQUM7d0JBQzNFLFFBQVEsRUFBRSxPQUFPO3dCQUNqQixRQUFRLEVBQUUsb0JBQW9CO3dCQUM5QixLQUFLLEVBQUUsMkNBQTJDO3FCQUNyRDtpQkFDSjthQUNKO1lBQ0QsT0FBTyxFQUFFO2dCQUNMLE1BQU0sRUFBRSxVQUFVO2FBQ3JCO1NBQ0osQ0FBQztRQUVGLE1BQU0sTUFBTSxDQUFDLElBQUEsOEJBQWlCLEVBQTRCLHVDQUFxQixDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUM5RixjQUFjLENBQ2pCLENBQUM7SUFDTixDQUFDLENBQUMsQ0FBQztJQUVILEVBQUUsQ0FBQyxxRUFBcUUsRUFBRSxLQUFLLElBQUksRUFBRTtRQUNqRixlQUFlLENBQUMsRUFBRSxDQUFDLDhCQUFlLENBQUMsQ0FBQyxRQUFRLENBQUMsRUFBRSxDQUFDLENBQUM7UUFDakQsTUFBTSxNQUFNLENBQUMsSUFBQSw4QkFBaUIsRUFBNEIsdUNBQXFCLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQzlGLElBQUEsMEJBQWEsR0FBRSxDQUNsQixDQUFDO0lBQ04sQ0FBQyxDQUFDLENBQUM7SUFFSCxRQUFRLENBQUMsR0FBRyxFQUFFO1FBQ1YsT0FBTyxPQUFPLENBQUMsR0FBRyxDQUFDLGtCQUFrQixDQUFDO1FBQ3RDLE9BQU8sT0FBTyxDQUFDLEdBQUcsQ0FBQyx5QkFBeUIsQ0FBQztRQUU3QyxlQUFlLENBQUMsT0FBTyxFQUFFLENBQUM7SUFDOUIsQ0FBQyxDQUFDLENBQUM7QUFDUCxDQUFDLENBQUMsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqXG4gKiAgQ29weXJpZ2h0IEFtYXpvbi5jb20sIEluYy4gb3IgaXRzIGFmZmlsaWF0ZXMuIEFsbCBSaWdodHMgUmVzZXJ2ZWQuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgKlxuICogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICpcbiAqICBMaWNlbnNlZCB1bmRlciB0aGUgQXBhY2hlIExpY2Vuc2UsIFZlcnNpb24gMi4wICh0aGUgXCJMaWNlbnNlXCIpLiBZb3UgbWF5IG5vdCB1c2UgdGhpcyBmaWxlIGV4Y2VwdCBpbiBjb21wbGlhbmNlICAgICpcbiAqICB3aXRoIHRoZSBMaWNlbnNlLiBBIGNvcHkgb2YgdGhlIExpY2Vuc2UgaXMgbG9jYXRlZCBhdCAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAqXG4gKiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgKlxuICogICAgICBodHRwOi8vd3d3LmFwYWNoZS5vcmcvbGljZW5zZXMvTElDRU5TRS0yLjAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICpcbiAqICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAqXG4gKiAgb3IgaW4gdGhlICdsaWNlbnNlJyBmaWxlIGFjY29tcGFueWluZyB0aGlzIGZpbGUuIFRoaXMgZmlsZSBpcyBkaXN0cmlidXRlZCBvbiBhbiAnQVMgSVMnIEJBU0lTLCBXSVRIT1VUIFdBUlJBTlRJRVMgKlxuICogIE9SIENPTkRJVElPTlMgT0YgQU5ZIEtJTkQsIGV4cHJlc3Mgb3IgaW1wbGllZC4gU2VlIHRoZSBMaWNlbnNlIGZvciB0aGUgc3BlY2lmaWMgbGFuZ3VhZ2UgZ292ZXJuaW5nIHBlcm1pc3Npb25zICAgICpcbiAqICBhbmQgbGltaXRhdGlvbnMgdW5kZXIgdGhlIExpY2Vuc2UuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAqXG4gKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKi9cblxuaW1wb3J0IHsgZGVueUFsbFBvbGljeSwgZ2V0UG9saWN5RG9jdW1lbnQgfSBmcm9tICcuLi91dGlscy9nZXQtcG9saWN5JztcbmltcG9ydCB7IER5bmFtb0RCRG9jdW1lbnRDbGllbnQsIEJhdGNoR2V0Q29tbWFuZCB9IGZyb20gJ0Bhd3Mtc2RrL2xpYi1keW5hbW9kYic7XG5pbXBvcnQgeyBtb2NrQ2xpZW50IH0gZnJvbSAnYXdzLXNkay1jbGllbnQtbW9jayc7XG5pbXBvcnQge1xuICAgIGJhdGNoR2V0SXRlbVJlc3BvbnNlLFxuICAgIGZha2VJZFRva2VuLFxuICAgIGZha2VNdWx0aUdyb3VwSWRUb2tlbixcbiAgICBtdWx0aUdyb3VwQmF0Y2hHZXRJdGVtUmVzcG9uc2Vcbn0gZnJvbSAnLi9ldmVudC10ZXN0LWRhdGEnO1xuaW1wb3J0IHsgQ29nbml0b0FjY2Vzc1Rva2VuUGF5bG9hZCB9IGZyb20gJ2F3cy1qd3QtdmVyaWZ5L2p3dC1tb2RlbCc7XG5cbmRlc2NyaWJlKCdQb2xpY3kgR2VuZXJhdG9yIHRlc3QnLCAoKSA9PiB7XG4gICAgbGV0IGRkYk1vY2tlZENsaWVudDogYW55O1xuXG4gICAgYmVmb3JlQWxsKCgpID0+IHtcbiAgICAgICAgcHJvY2Vzcy5lbnYuQVdTX1NES19VU0VSX0FHRU5UID0gYHsgXCJjdXN0b21Vc2VyQWdlbnRcIjogXCJBd3NTb2x1dGlvbi9TTzAwODQvdjIuMC4wXCIgfWA7XG4gICAgICAgIHByb2Nlc3MuZW52LkNPR05JVE9fUE9MSUNZX1RBQkxFX05BTUUgPSAnZmFrZS10YWJsZS1uYW1lJztcbiAgICAgICAgZGRiTW9ja2VkQ2xpZW50ID0gbW9ja0NsaWVudChEeW5hbW9EQkRvY3VtZW50Q2xpZW50KTtcbiAgICB9KTtcblxuICAgIGl0KCdkZW55QWxsUG9saWN5IHNob3VsZCBiZSBjb3JyZWN0bHkgZ2VuZXJhdGVkJywgKCkgPT4ge1xuICAgICAgICBleHBlY3QoZGVueUFsbFBvbGljeSgpKS50b0VxdWFsKHtcbiAgICAgICAgICAgIHByaW5jaXBhbElkOiAnKicsXG4gICAgICAgICAgICBwb2xpY3lEb2N1bWVudDoge1xuICAgICAgICAgICAgICAgIFZlcnNpb246ICcyMDEyLTEwLTE3JyxcbiAgICAgICAgICAgICAgICBTdGF0ZW1lbnQ6IFtcbiAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgQWN0aW9uOiAnKicsXG4gICAgICAgICAgICAgICAgICAgICAgICBFZmZlY3Q6ICdEZW55JyxcbiAgICAgICAgICAgICAgICAgICAgICAgIFJlc291cmNlOiAnKidcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIF1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfSk7XG5cbiAgICBpdCgnc2hvdWxkIGhhbmRsZSByZXRyaWV2aW5nIHRoZSBwb2xpY3knLCBhc3luYyAoKSA9PiB7XG4gICAgICAgIGRkYk1vY2tlZENsaWVudC5vbihCYXRjaEdldENvbW1hbmQpLnJlc29sdmVzKGJhdGNoR2V0SXRlbVJlc3BvbnNlKTtcblxuICAgICAgICBjb25zdCBleHBlY3RlZFBvbGljeSA9IHtcbiAgICAgICAgICAgIHByaW5jaXBhbElkOiAnKicsXG4gICAgICAgICAgICBwb2xpY3lEb2N1bWVudDoge1xuICAgICAgICAgICAgICAgICdWZXJzaW9uJzogJzIwMTItMTAtMTcnLFxuICAgICAgICAgICAgICAgICdTdGF0ZW1lbnQnOiBbXG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICdSZXNvdXJjZSc6IFsnYXJuOmF3czpleGVjdXRlLWFwaTp1cy1lYXN0LTE6MTExMTExMTExMTExOmZha2UtYXBpLWlkLyovKiddLFxuICAgICAgICAgICAgICAgICAgICAgICAgJ0VmZmVjdCc6ICdBbGxvdycsXG4gICAgICAgICAgICAgICAgICAgICAgICAnQWN0aW9uJzogJ2V4ZWN1dGUtYXBpOkludm9rZScsXG4gICAgICAgICAgICAgICAgICAgICAgICAnU2lkJzogJ3VzZS1jYXNlLW1hbmFnZW1lbnQtYXBpLWFkbWluLXBvbGljeS1zdGF0ZW1lbnQnXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICdSZXNvdXJjZSc6IFsnYXJuOmF3czpleGVjdXRlLWFwaTp1cy1lYXN0LTE6MTExMTExMTExMTExOmZha2UtYXBpLWlkMi8qLyonXSxcbiAgICAgICAgICAgICAgICAgICAgICAgICdFZmZlY3QnOiAnQWxsb3cnLFxuICAgICAgICAgICAgICAgICAgICAgICAgJ0FjdGlvbic6ICdleGVjdXRlLWFwaTpJbnZva2UnLFxuICAgICAgICAgICAgICAgICAgICAgICAgJ1NpZCc6ICdIdWdnaW5nRmFjZUNoYXRTdGFjay1Vc2Vycy1wb2xpY3ktc3RhdGVtZW50J1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgXVxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGNvbnRleHQ6IHtcbiAgICAgICAgICAgICAgICBVc2VySWQ6ICdmYWtlLXN1YidcbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcblxuICAgICAgICBhd2FpdCBleHBlY3QoZ2V0UG9saWN5RG9jdW1lbnQoPENvZ25pdG9BY2Nlc3NUb2tlblBheWxvYWQ+ZmFrZUlkVG9rZW4pKS5yZXNvbHZlcy50b0VxdWFsKGV4cGVjdGVkUG9saWN5KTtcbiAgICB9KTtcblxuICAgIGl0KCdzaG91bGQgaGFuZGxlIHdoZW4gdXNlciBpcyBpbiBtdWx0aXBsZSBncm91cHMnLCBhc3luYyAoKSA9PiB7XG4gICAgICAgIGRkYk1vY2tlZENsaWVudC5vbihCYXRjaEdldENvbW1hbmQpLnJlc29sdmVzKG11bHRpR3JvdXBCYXRjaEdldEl0ZW1SZXNwb25zZSk7XG5cbiAgICAgICAgY29uc3QgZXhwZWN0ZWRQb2xpY3kgPSB7XG4gICAgICAgICAgICBwcmluY2lwYWxJZDogJyonLFxuICAgICAgICAgICAgcG9saWN5RG9jdW1lbnQ6IHtcbiAgICAgICAgICAgICAgICAnVmVyc2lvbic6ICcyMDEyLTEwLTE3JyxcbiAgICAgICAgICAgICAgICAnU3RhdGVtZW50JzogW1xuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICAnUmVzb3VyY2UnOiBbJ2Fybjphd3M6ZXhlY3V0ZS1hcGk6dXMtZWFzdC0xOjExMTExMTExMTExMTpmYWtlLWFwaS1pZC8qLyonXSxcbiAgICAgICAgICAgICAgICAgICAgICAgICdFZmZlY3QnOiAnQWxsb3cnLFxuICAgICAgICAgICAgICAgICAgICAgICAgJ0FjdGlvbic6ICdleGVjdXRlLWFwaTpJbnZva2UnLFxuICAgICAgICAgICAgICAgICAgICAgICAgJ1NpZCc6ICd1c2UtY2FzZS1tYW5hZ2VtZW50LWFwaS1hZG1pbi1wb2xpY3ktc3RhdGVtZW50J1xuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICAnUmVzb3VyY2UnOiBbJ2Fybjphd3M6ZXhlY3V0ZS1hcGk6dXMtZWFzdC0xOjExMTExMTExMTExMTpmYWtlLWFwaS1pZDIvKi8qJ10sXG4gICAgICAgICAgICAgICAgICAgICAgICAnRWZmZWN0JzogJ0FsbG93JyxcbiAgICAgICAgICAgICAgICAgICAgICAgICdBY3Rpb24nOiAnZXhlY3V0ZS1hcGk6SW52b2tlJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICdTaWQnOiAnSHVnZ2luZ0ZhY2VDaGF0U3RhY2stVXNlcnMtcG9saWN5LXN0YXRlbWVudCdcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgJ1Jlc291cmNlJzogWydhcm46YXdzOmV4ZWN1dGUtYXBpOnVzLWVhc3QtMToxMTExMTExMTExMTE6ZmFrZS1hcGktaWQzLyovKiddLFxuICAgICAgICAgICAgICAgICAgICAgICAgJ0VmZmVjdCc6ICdBbGxvdycsXG4gICAgICAgICAgICAgICAgICAgICAgICAnQWN0aW9uJzogJ2V4ZWN1dGUtYXBpOkludm9rZScsXG4gICAgICAgICAgICAgICAgICAgICAgICAnU2lkJzogJ0FudGhyb3BpY0NoYXRTdGFjay1Vc2Vycy1wb2xpY3ktc3RhdGVtZW50J1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgXVxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGNvbnRleHQ6IHtcbiAgICAgICAgICAgICAgICBVc2VySWQ6ICdmYWtlLXN1YidcbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcblxuICAgICAgICBhd2FpdCBleHBlY3QoZ2V0UG9saWN5RG9jdW1lbnQoPENvZ25pdG9BY2Nlc3NUb2tlblBheWxvYWQ+ZmFrZU11bHRpR3JvdXBJZFRva2VuKSkucmVzb2x2ZXMudG9FcXVhbChcbiAgICAgICAgICAgIGV4cGVjdGVkUG9saWN5XG4gICAgICAgICk7XG4gICAgfSk7XG5cbiAgICBpdCgnc2hvdWxkIHJldHVybiBhIGRlbnkgcG9saWN5IGlmIHdlIHJlY2VpdmUgbm8gcG9saWNpZXMgZm9yIHRoZSBnb3J1cCcsIGFzeW5jICgpID0+IHtcbiAgICAgICAgZGRiTW9ja2VkQ2xpZW50Lm9uKEJhdGNoR2V0Q29tbWFuZCkucmVzb2x2ZXMoe30pO1xuICAgICAgICBhd2FpdCBleHBlY3QoZ2V0UG9saWN5RG9jdW1lbnQoPENvZ25pdG9BY2Nlc3NUb2tlblBheWxvYWQ+ZmFrZU11bHRpR3JvdXBJZFRva2VuKSkucmVzb2x2ZXMudG9FcXVhbChcbiAgICAgICAgICAgIGRlbnlBbGxQb2xpY3koKVxuICAgICAgICApO1xuICAgIH0pO1xuXG4gICAgYWZ0ZXJBbGwoKCkgPT4ge1xuICAgICAgICBkZWxldGUgcHJvY2Vzcy5lbnYuQVdTX1NES19VU0VSX0FHRU5UO1xuICAgICAgICBkZWxldGUgcHJvY2Vzcy5lbnYuQ09HTklUT19QT0xJQ1lfVEFCTEVfTkFNRTtcblxuICAgICAgICBkZGJNb2NrZWRDbGllbnQucmVzdG9yZSgpO1xuICAgIH0pO1xufSk7XG4iXX0=