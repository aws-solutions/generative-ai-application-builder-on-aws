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
'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
exports.fakeMultiGroupIdToken = exports.fakeIdToken = exports.multiGroupBatchGetItemResponse = exports.batchGetItemResponse = exports.mockInvalidRequestEvent = exports.mockValidRestRequestEvent = exports.mockValidWebsocketRequestEvent = void 0;
exports.mockValidWebsocketRequestEvent = {
    type: 'REQUEST',
    methodArn: 'mock-method-arn',
    queryStringParameters: { Authorization: 'very-secret-auth-token' }
};
exports.mockValidRestRequestEvent = {
    type: 'REQUEST',
    methodArn: 'mock-method-arn',
    headers: {
        Authorization: 'very-secret-auth-token'
    }
};
exports.mockInvalidRequestEvent = {
    type: 'REQUEST',
    methodArn: 'mock-method-arn'
};
exports.batchGetItemResponse = {
    '$metadata': {
        'httpStatusCode': 200,
        'requestId': 'fake-request-id',
        'attempts': 1,
        'totalRetryDelay': 0
    },
    'Responses': {
        'fake-table-name': [
            {
                'policy': {
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
                'group': 'admin'
            }
        ]
    },
    'UnprocessedKeys': {}
};
exports.multiGroupBatchGetItemResponse = {
    '$metadata': {
        'httpStatusCode': 200,
        'requestId': 'fake-request-id',
        'attempts': 1,
        'totalRetryDelay': 0
    },
    'Responses': {
        'fake-table-name': [
            {
                'policy': {
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
                'group': 'admin'
            },
            {
                'policy': {
                    'Version': '2012-10-17',
                    'Statement': [
                        {
                            'Resource': ['arn:aws:execute-api:us-east-1:111111111111:fake-api-id3/*/*'],
                            'Effect': 'Allow',
                            'Action': 'execute-api:Invoke',
                            'Sid': 'AnthropicChatStack-Users-policy-statement'
                        }
                    ]
                },
                'group': 'group1'
            },
            // bad policy to ensure we survive this and skip over it
            {
                'some-bad-object': {
                    'Version': '2012-10-17',
                    'Statement': []
                }
            }
        ]
    },
    'UnprocessedKeys': {}
};
exports.fakeIdToken = {
    sub: 'fake-sub',
    'cognito:groups': ['admin'],
    iss: 'https://cognito-idp.us-east-1.amazonaws.com/user-pool-id',
    'cognito:username': 'fakeuser',
    client_id: 'fake-client-id',
    origin_jti: 'fake-origin-jti',
    event_id: 'fake-event-id',
    token_use: 'access',
    scope: 'aws.cognito.signin.user.fake-sub',
    auth_time: 0,
    exp: 3600,
    iat: 0,
    jti: 'fake-jti',
    username: 'fake-username'
};
exports.fakeMultiGroupIdToken = {
    sub: 'fake-sub',
    'cognito:groups': ['admin', 'group1', 'group2'],
    iss: 'https://cognito-idp.us-east-1.amazonaws.com/user-pool-id',
    'cognito:username': 'fakeuser',
    client_id: 'fake-client-id',
    origin_jti: 'fake-origin-jti',
    event_id: 'fake-event-id',
    token_use: 'access',
    scope: 'aws.cognito.signin.user.fake-sub',
    auth_time: 0,
    exp: 3600,
    iat: 0,
    jti: 'fake-jti',
    username: 'fake-username'
};
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXZlbnQtdGVzdC1kYXRhLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vdGVzdC9ldmVudC10ZXN0LWRhdGEudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7Ozs7Ozs7O3dIQVd3SDtBQUV4SCxZQUFZLENBQUM7OztBQUtBLFFBQUEsOEJBQThCLEdBQThDO0lBQ3JGLElBQUksRUFBRSxTQUFTO0lBQ2YsU0FBUyxFQUFFLGlCQUFpQjtJQUM1QixxQkFBcUIsRUFBRSxFQUFFLGFBQWEsRUFBRSx3QkFBd0IsRUFBRTtDQUNyRSxDQUFDO0FBRVcsUUFBQSx5QkFBeUIsR0FBOEM7SUFDaEYsSUFBSSxFQUFFLFNBQVM7SUFDZixTQUFTLEVBQUUsaUJBQWlCO0lBQzVCLE9BQU8sRUFBRTtRQUNMLGFBQWEsRUFBRSx3QkFBd0I7S0FDMUM7Q0FDSixDQUFDO0FBRVcsUUFBQSx1QkFBdUIsR0FBOEM7SUFDOUUsSUFBSSxFQUFFLFNBQVM7SUFDZixTQUFTLEVBQUUsaUJBQWlCO0NBQy9CLENBQUM7QUFFVyxRQUFBLG9CQUFvQixHQUFHO0lBQ2hDLFdBQVcsRUFBRTtRQUNULGdCQUFnQixFQUFFLEdBQUc7UUFDckIsV0FBVyxFQUFFLGlCQUFpQjtRQUM5QixVQUFVLEVBQUUsQ0FBQztRQUNiLGlCQUFpQixFQUFFLENBQUM7S0FDdkI7SUFDRCxXQUFXLEVBQUU7UUFDVCxpQkFBaUIsRUFBRTtZQUNmO2dCQUNJLFFBQVEsRUFBRTtvQkFDTixTQUFTLEVBQUUsWUFBWTtvQkFDdkIsV0FBVyxFQUFFO3dCQUNUOzRCQUNJLFVBQVUsRUFBRSxDQUFDLDREQUE0RCxDQUFDOzRCQUMxRSxRQUFRLEVBQUUsT0FBTzs0QkFDakIsUUFBUSxFQUFFLG9CQUFvQjs0QkFDOUIsS0FBSyxFQUFFLGdEQUFnRDt5QkFDMUQ7d0JBQ0Q7NEJBQ0ksVUFBVSxFQUFFLENBQUMsNkRBQTZELENBQUM7NEJBQzNFLFFBQVEsRUFBRSxPQUFPOzRCQUNqQixRQUFRLEVBQUUsb0JBQW9COzRCQUM5QixLQUFLLEVBQUUsNkNBQTZDO3lCQUN2RDtxQkFDSjtpQkFDSjtnQkFDRCxPQUFPLEVBQUUsT0FBTzthQUNuQjtTQUNKO0tBQ0o7SUFDRCxpQkFBaUIsRUFBRSxFQUFFO0NBQ3hCLENBQUM7QUFFVyxRQUFBLDhCQUE4QixHQUFHO0lBQzFDLFdBQVcsRUFBRTtRQUNULGdCQUFnQixFQUFFLEdBQUc7UUFDckIsV0FBVyxFQUFFLGlCQUFpQjtRQUM5QixVQUFVLEVBQUUsQ0FBQztRQUNiLGlCQUFpQixFQUFFLENBQUM7S0FDdkI7SUFDRCxXQUFXLEVBQUU7UUFDVCxpQkFBaUIsRUFBRTtZQUNmO2dCQUNJLFFBQVEsRUFBRTtvQkFDTixTQUFTLEVBQUUsWUFBWTtvQkFDdkIsV0FBVyxFQUFFO3dCQUNUOzRCQUNJLFVBQVUsRUFBRSxDQUFDLDREQUE0RCxDQUFDOzRCQUMxRSxRQUFRLEVBQUUsT0FBTzs0QkFDakIsUUFBUSxFQUFFLG9CQUFvQjs0QkFDOUIsS0FBSyxFQUFFLGdEQUFnRDt5QkFDMUQ7d0JBQ0Q7NEJBQ0ksVUFBVSxFQUFFLENBQUMsNkRBQTZELENBQUM7NEJBQzNFLFFBQVEsRUFBRSxPQUFPOzRCQUNqQixRQUFRLEVBQUUsb0JBQW9COzRCQUM5QixLQUFLLEVBQUUsNkNBQTZDO3lCQUN2RDtxQkFDSjtpQkFDSjtnQkFDRCxPQUFPLEVBQUUsT0FBTzthQUNuQjtZQUNEO2dCQUNJLFFBQVEsRUFBRTtvQkFDTixTQUFTLEVBQUUsWUFBWTtvQkFDdkIsV0FBVyxFQUFFO3dCQUNUOzRCQUNJLFVBQVUsRUFBRSxDQUFDLDZEQUE2RCxDQUFDOzRCQUMzRSxRQUFRLEVBQUUsT0FBTzs0QkFDakIsUUFBUSxFQUFFLG9CQUFvQjs0QkFDOUIsS0FBSyxFQUFFLDJDQUEyQzt5QkFDckQ7cUJBQ0o7aUJBQ0o7Z0JBQ0QsT0FBTyxFQUFFLFFBQVE7YUFDcEI7WUFDRCx3REFBd0Q7WUFDeEQ7Z0JBQ0ksaUJBQWlCLEVBQUU7b0JBQ2YsU0FBUyxFQUFFLFlBQVk7b0JBQ3ZCLFdBQVcsRUFBRSxFQUFFO2lCQUNsQjthQUNKO1NBQ0o7S0FDSjtJQUNELGlCQUFpQixFQUFFLEVBQUU7Q0FDeEIsQ0FBQztBQUVXLFFBQUEsV0FBVyxHQUF1QztJQUMzRCxHQUFHLEVBQUUsVUFBVTtJQUNmLGdCQUFnQixFQUFFLENBQUMsT0FBTyxDQUFDO0lBQzNCLEdBQUcsRUFBRSwwREFBMEQ7SUFDL0Qsa0JBQWtCLEVBQUUsVUFBVTtJQUM5QixTQUFTLEVBQUUsZ0JBQWdCO0lBQzNCLFVBQVUsRUFBRSxpQkFBaUI7SUFDN0IsUUFBUSxFQUFFLGVBQWU7SUFDekIsU0FBUyxFQUFFLFFBQVE7SUFDbkIsS0FBSyxFQUFFLGtDQUFrQztJQUN6QyxTQUFTLEVBQUUsQ0FBQztJQUNaLEdBQUcsRUFBRSxJQUFJO0lBQ1QsR0FBRyxFQUFFLENBQUM7SUFDTixHQUFHLEVBQUUsVUFBVTtJQUNmLFFBQVEsRUFBRSxlQUFlO0NBQzVCLENBQUM7QUFFVyxRQUFBLHFCQUFxQixHQUF1QztJQUNyRSxHQUFHLEVBQUUsVUFBVTtJQUNmLGdCQUFnQixFQUFFLENBQUMsT0FBTyxFQUFFLFFBQVEsRUFBRSxRQUFRLENBQUM7SUFDL0MsR0FBRyxFQUFFLDBEQUEwRDtJQUMvRCxrQkFBa0IsRUFBRSxVQUFVO0lBQzlCLFNBQVMsRUFBRSxnQkFBZ0I7SUFDM0IsVUFBVSxFQUFFLGlCQUFpQjtJQUM3QixRQUFRLEVBQUUsZUFBZTtJQUN6QixTQUFTLEVBQUUsUUFBUTtJQUNuQixLQUFLLEVBQUUsa0NBQWtDO0lBQ3pDLFNBQVMsRUFBRSxDQUFDO0lBQ1osR0FBRyxFQUFFLElBQUk7SUFDVCxHQUFHLEVBQUUsQ0FBQztJQUNOLEdBQUcsRUFBRSxVQUFVO0lBQ2YsUUFBUSxFQUFFLGVBQWU7Q0FDNUIsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqXG4gKiAgQ29weXJpZ2h0IEFtYXpvbi5jb20sIEluYy4gb3IgaXRzIGFmZmlsaWF0ZXMuIEFsbCBSaWdodHMgUmVzZXJ2ZWQuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgKlxuICogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICpcbiAqICBMaWNlbnNlZCB1bmRlciB0aGUgQXBhY2hlIExpY2Vuc2UsIFZlcnNpb24gMi4wICh0aGUgXCJMaWNlbnNlXCIpLiBZb3UgbWF5IG5vdCB1c2UgdGhpcyBmaWxlIGV4Y2VwdCBpbiBjb21wbGlhbmNlICAgICpcbiAqICB3aXRoIHRoZSBMaWNlbnNlLiBBIGNvcHkgb2YgdGhlIExpY2Vuc2UgaXMgbG9jYXRlZCBhdCAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAqXG4gKiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgKlxuICogICAgICBodHRwOi8vd3d3LmFwYWNoZS5vcmcvbGljZW5zZXMvTElDRU5TRS0yLjAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICpcbiAqICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAqXG4gKiAgb3IgaW4gdGhlICdsaWNlbnNlJyBmaWxlIGFjY29tcGFueWluZyB0aGlzIGZpbGUuIFRoaXMgZmlsZSBpcyBkaXN0cmlidXRlZCBvbiBhbiAnQVMgSVMnIEJBU0lTLCBXSVRIT1VUIFdBUlJBTlRJRVMgKlxuICogIE9SIENPTkRJVElPTlMgT0YgQU5ZIEtJTkQsIGV4cHJlc3Mgb3IgaW1wbGllZC4gU2VlIHRoZSBMaWNlbnNlIGZvciB0aGUgc3BlY2lmaWMgbGFuZ3VhZ2UgZ292ZXJuaW5nIHBlcm1pc3Npb25zICAgICpcbiAqICBhbmQgbGltaXRhdGlvbnMgdW5kZXIgdGhlIExpY2Vuc2UuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAqXG4gKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKi9cblxuJ3VzZSBzdHJpY3QnO1xuXG5pbXBvcnQgeyBDb2duaXRvQWNjZXNzVG9rZW5QYXlsb2FkIH0gZnJvbSAnYXdzLWp3dC12ZXJpZnkvand0LW1vZGVsJztcbmltcG9ydCB7IEFQSUdhdGV3YXlSZXF1ZXN0QXV0aG9yaXplckV2ZW50IH0gZnJvbSAnYXdzLWxhbWJkYSc7XG5cbmV4cG9ydCBjb25zdCBtb2NrVmFsaWRXZWJzb2NrZXRSZXF1ZXN0RXZlbnQ6IFBhcnRpYWw8QVBJR2F0ZXdheVJlcXVlc3RBdXRob3JpemVyRXZlbnQ+ID0ge1xuICAgIHR5cGU6ICdSRVFVRVNUJyxcbiAgICBtZXRob2RBcm46ICdtb2NrLW1ldGhvZC1hcm4nLFxuICAgIHF1ZXJ5U3RyaW5nUGFyYW1ldGVyczogeyBBdXRob3JpemF0aW9uOiAndmVyeS1zZWNyZXQtYXV0aC10b2tlbicgfVxufTtcblxuZXhwb3J0IGNvbnN0IG1vY2tWYWxpZFJlc3RSZXF1ZXN0RXZlbnQ6IFBhcnRpYWw8QVBJR2F0ZXdheVJlcXVlc3RBdXRob3JpemVyRXZlbnQ+ID0ge1xuICAgIHR5cGU6ICdSRVFVRVNUJyxcbiAgICBtZXRob2RBcm46ICdtb2NrLW1ldGhvZC1hcm4nLFxuICAgIGhlYWRlcnM6IHtcbiAgICAgICAgQXV0aG9yaXphdGlvbjogJ3Zlcnktc2VjcmV0LWF1dGgtdG9rZW4nXG4gICAgfVxufTtcblxuZXhwb3J0IGNvbnN0IG1vY2tJbnZhbGlkUmVxdWVzdEV2ZW50OiBQYXJ0aWFsPEFQSUdhdGV3YXlSZXF1ZXN0QXV0aG9yaXplckV2ZW50PiA9IHtcbiAgICB0eXBlOiAnUkVRVUVTVCcsXG4gICAgbWV0aG9kQXJuOiAnbW9jay1tZXRob2QtYXJuJ1xufTtcblxuZXhwb3J0IGNvbnN0IGJhdGNoR2V0SXRlbVJlc3BvbnNlID0ge1xuICAgICckbWV0YWRhdGEnOiB7XG4gICAgICAgICdodHRwU3RhdHVzQ29kZSc6IDIwMCxcbiAgICAgICAgJ3JlcXVlc3RJZCc6ICdmYWtlLXJlcXVlc3QtaWQnLFxuICAgICAgICAnYXR0ZW1wdHMnOiAxLFxuICAgICAgICAndG90YWxSZXRyeURlbGF5JzogMFxuICAgIH0sXG4gICAgJ1Jlc3BvbnNlcyc6IHtcbiAgICAgICAgJ2Zha2UtdGFibGUtbmFtZSc6IFtcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAncG9saWN5Jzoge1xuICAgICAgICAgICAgICAgICAgICAnVmVyc2lvbic6ICcyMDEyLTEwLTE3JyxcbiAgICAgICAgICAgICAgICAgICAgJ1N0YXRlbWVudCc6IFtcbiAgICAgICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAnUmVzb3VyY2UnOiBbJ2Fybjphd3M6ZXhlY3V0ZS1hcGk6dXMtZWFzdC0xOjExMTExMTExMTExMTpmYWtlLWFwaS1pZC8qLyonXSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAnRWZmZWN0JzogJ0FsbG93JyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAnQWN0aW9uJzogJ2V4ZWN1dGUtYXBpOkludm9rZScsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgJ1NpZCc6ICd1c2UtY2FzZS1tYW5hZ2VtZW50LWFwaS1hZG1pbi1wb2xpY3ktc3RhdGVtZW50J1xuICAgICAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAnUmVzb3VyY2UnOiBbJ2Fybjphd3M6ZXhlY3V0ZS1hcGk6dXMtZWFzdC0xOjExMTExMTExMTExMTpmYWtlLWFwaS1pZDIvKi8qJ10sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgJ0VmZmVjdCc6ICdBbGxvdycsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgJ0FjdGlvbic6ICdleGVjdXRlLWFwaTpJbnZva2UnLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICdTaWQnOiAnSHVnZ2luZ0ZhY2VDaGF0U3RhY2stVXNlcnMtcG9saWN5LXN0YXRlbWVudCdcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgXVxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgJ2dyb3VwJzogJ2FkbWluJ1xuICAgICAgICAgICAgfVxuICAgICAgICBdXG4gICAgfSxcbiAgICAnVW5wcm9jZXNzZWRLZXlzJzoge31cbn07XG5cbmV4cG9ydCBjb25zdCBtdWx0aUdyb3VwQmF0Y2hHZXRJdGVtUmVzcG9uc2UgPSB7XG4gICAgJyRtZXRhZGF0YSc6IHtcbiAgICAgICAgJ2h0dHBTdGF0dXNDb2RlJzogMjAwLFxuICAgICAgICAncmVxdWVzdElkJzogJ2Zha2UtcmVxdWVzdC1pZCcsXG4gICAgICAgICdhdHRlbXB0cyc6IDEsXG4gICAgICAgICd0b3RhbFJldHJ5RGVsYXknOiAwXG4gICAgfSxcbiAgICAnUmVzcG9uc2VzJzoge1xuICAgICAgICAnZmFrZS10YWJsZS1uYW1lJzogW1xuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICdwb2xpY3knOiB7XG4gICAgICAgICAgICAgICAgICAgICdWZXJzaW9uJzogJzIwMTItMTAtMTcnLFxuICAgICAgICAgICAgICAgICAgICAnU3RhdGVtZW50JzogW1xuICAgICAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICdSZXNvdXJjZSc6IFsnYXJuOmF3czpleGVjdXRlLWFwaTp1cy1lYXN0LTE6MTExMTExMTExMTExOmZha2UtYXBpLWlkLyovKiddLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICdFZmZlY3QnOiAnQWxsb3cnLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICdBY3Rpb24nOiAnZXhlY3V0ZS1hcGk6SW52b2tlJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAnU2lkJzogJ3VzZS1jYXNlLW1hbmFnZW1lbnQtYXBpLWFkbWluLXBvbGljeS1zdGF0ZW1lbnQnXG4gICAgICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICdSZXNvdXJjZSc6IFsnYXJuOmF3czpleGVjdXRlLWFwaTp1cy1lYXN0LTE6MTExMTExMTExMTExOmZha2UtYXBpLWlkMi8qLyonXSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAnRWZmZWN0JzogJ0FsbG93JyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAnQWN0aW9uJzogJ2V4ZWN1dGUtYXBpOkludm9rZScsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgJ1NpZCc6ICdIdWdnaW5nRmFjZUNoYXRTdGFjay1Vc2Vycy1wb2xpY3ktc3RhdGVtZW50J1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBdXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAnZ3JvdXAnOiAnYWRtaW4nXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICdwb2xpY3knOiB7XG4gICAgICAgICAgICAgICAgICAgICdWZXJzaW9uJzogJzIwMTItMTAtMTcnLFxuICAgICAgICAgICAgICAgICAgICAnU3RhdGVtZW50JzogW1xuICAgICAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICdSZXNvdXJjZSc6IFsnYXJuOmF3czpleGVjdXRlLWFwaTp1cy1lYXN0LTE6MTExMTExMTExMTExOmZha2UtYXBpLWlkMy8qLyonXSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAnRWZmZWN0JzogJ0FsbG93JyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAnQWN0aW9uJzogJ2V4ZWN1dGUtYXBpOkludm9rZScsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgJ1NpZCc6ICdBbnRocm9waWNDaGF0U3RhY2stVXNlcnMtcG9saWN5LXN0YXRlbWVudCdcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgXVxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgJ2dyb3VwJzogJ2dyb3VwMSdcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAvLyBiYWQgcG9saWN5IHRvIGVuc3VyZSB3ZSBzdXJ2aXZlIHRoaXMgYW5kIHNraXAgb3ZlciBpdFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICdzb21lLWJhZC1vYmplY3QnOiB7XG4gICAgICAgICAgICAgICAgICAgICdWZXJzaW9uJzogJzIwMTItMTAtMTcnLFxuICAgICAgICAgICAgICAgICAgICAnU3RhdGVtZW50JzogW11cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIF1cbiAgICB9LFxuICAgICdVbnByb2Nlc3NlZEtleXMnOiB7fVxufTtcblxuZXhwb3J0IGNvbnN0IGZha2VJZFRva2VuOiBQYXJ0aWFsPENvZ25pdG9BY2Nlc3NUb2tlblBheWxvYWQ+ID0ge1xuICAgIHN1YjogJ2Zha2Utc3ViJyxcbiAgICAnY29nbml0bzpncm91cHMnOiBbJ2FkbWluJ10sXG4gICAgaXNzOiAnaHR0cHM6Ly9jb2duaXRvLWlkcC51cy1lYXN0LTEuYW1hem9uYXdzLmNvbS91c2VyLXBvb2wtaWQnLFxuICAgICdjb2duaXRvOnVzZXJuYW1lJzogJ2Zha2V1c2VyJyxcbiAgICBjbGllbnRfaWQ6ICdmYWtlLWNsaWVudC1pZCcsXG4gICAgb3JpZ2luX2p0aTogJ2Zha2Utb3JpZ2luLWp0aScsXG4gICAgZXZlbnRfaWQ6ICdmYWtlLWV2ZW50LWlkJyxcbiAgICB0b2tlbl91c2U6ICdhY2Nlc3MnLFxuICAgIHNjb3BlOiAnYXdzLmNvZ25pdG8uc2lnbmluLnVzZXIuZmFrZS1zdWInLFxuICAgIGF1dGhfdGltZTogMCxcbiAgICBleHA6IDM2MDAsXG4gICAgaWF0OiAwLFxuICAgIGp0aTogJ2Zha2UtanRpJyxcbiAgICB1c2VybmFtZTogJ2Zha2UtdXNlcm5hbWUnXG59O1xuXG5leHBvcnQgY29uc3QgZmFrZU11bHRpR3JvdXBJZFRva2VuOiBQYXJ0aWFsPENvZ25pdG9BY2Nlc3NUb2tlblBheWxvYWQ+ID0ge1xuICAgIHN1YjogJ2Zha2Utc3ViJyxcbiAgICAnY29nbml0bzpncm91cHMnOiBbJ2FkbWluJywgJ2dyb3VwMScsICdncm91cDInXSxcbiAgICBpc3M6ICdodHRwczovL2NvZ25pdG8taWRwLnVzLWVhc3QtMS5hbWF6b25hd3MuY29tL3VzZXItcG9vbC1pZCcsXG4gICAgJ2NvZ25pdG86dXNlcm5hbWUnOiAnZmFrZXVzZXInLFxuICAgIGNsaWVudF9pZDogJ2Zha2UtY2xpZW50LWlkJyxcbiAgICBvcmlnaW5fanRpOiAnZmFrZS1vcmlnaW4tanRpJyxcbiAgICBldmVudF9pZDogJ2Zha2UtZXZlbnQtaWQnLFxuICAgIHRva2VuX3VzZTogJ2FjY2VzcycsXG4gICAgc2NvcGU6ICdhd3MuY29nbml0by5zaWduaW4udXNlci5mYWtlLXN1YicsXG4gICAgYXV0aF90aW1lOiAwLFxuICAgIGV4cDogMzYwMCxcbiAgICBpYXQ6IDAsXG4gICAganRpOiAnZmFrZS1qdGknLFxuICAgIHVzZXJuYW1lOiAnZmFrZS11c2VybmFtZSdcbn07XG4iXX0=