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
 *********************************************************************************************************************/
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const disconnect_handler = __importStar(require("../disconnect-handler"));
describe('when calling disconnect-handler', () => {
    it('should return 200', async () => {
        let mockedEvent = {
            body: 'empty body for test',
            headers: {},
            multiValueHeaders: {},
            httpMethod: 'POST',
            isBase64Encoded: true,
            path: '/disconnect',
            pathParameters: null,
            queryStringParameters: null,
            multiValueQueryStringParameters: null,
            stageVariables: null,
            requestContext: {
                accountId: '',
                apiId: '',
                authorizer: undefined,
                protocol: '',
                httpMethod: '',
                identity: {
                    clientCert: null,
                    userAgent: null,
                    userArn: null,
                    accessKey: null,
                    accountId: null,
                    apiKey: null,
                    apiKeyId: null,
                    caller: null,
                    cognitoAuthenticationProvider: null,
                    cognitoAuthenticationType: null,
                    cognitoIdentityId: null,
                    cognitoIdentityPoolId: null,
                    principalOrgId: null,
                    sourceIp: '',
                    user: null
                },
                path: '',
                stage: '',
                requestId: '',
                requestTimeEpoch: 0,
                resourceId: '',
                resourcePath: ''
            },
            resource: 'fakeResource'
        };
        expect(await disconnect_handler.handler(mockedEvent)).toEqual({
            statusCode: 200,
            body: 'Disconnected'
        });
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGlzY29ubmVjdC1oYW5kbGVyLnRlc3QuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi90ZXN0L2Rpc2Nvbm5lY3QtaGFuZGxlci50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQTs7Ozs7Ozs7Ozs7dUhBV3VIOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBR3ZILDBFQUE0RDtBQUU1RCxRQUFRLENBQUMsaUNBQWlDLEVBQUUsR0FBRyxFQUFFO0lBQzdDLEVBQUUsQ0FBQyxtQkFBbUIsRUFBRSxLQUFLLElBQUksRUFBRTtRQUMvQixJQUFJLFdBQVcsR0FBeUI7WUFDcEMsSUFBSSxFQUFFLHFCQUFxQjtZQUMzQixPQUFPLEVBQUUsRUFBRTtZQUNYLGlCQUFpQixFQUFFLEVBQUU7WUFDckIsVUFBVSxFQUFFLE1BQU07WUFDbEIsZUFBZSxFQUFFLElBQUk7WUFDckIsSUFBSSxFQUFFLGFBQWE7WUFDbkIsY0FBYyxFQUFFLElBQUk7WUFDcEIscUJBQXFCLEVBQUUsSUFBSTtZQUMzQiwrQkFBK0IsRUFBRSxJQUFJO1lBQ3JDLGNBQWMsRUFBRSxJQUFJO1lBQ3BCLGNBQWMsRUFBRTtnQkFDWixTQUFTLEVBQUUsRUFBRTtnQkFDYixLQUFLLEVBQUUsRUFBRTtnQkFDVCxVQUFVLEVBQUUsU0FBUztnQkFDckIsUUFBUSxFQUFFLEVBQUU7Z0JBQ1osVUFBVSxFQUFFLEVBQUU7Z0JBQ2QsUUFBUSxFQUFFO29CQUNOLFVBQVUsRUFBRSxJQUFJO29CQUNoQixTQUFTLEVBQUUsSUFBSTtvQkFDZixPQUFPLEVBQUUsSUFBSTtvQkFDYixTQUFTLEVBQUUsSUFBSTtvQkFDZixTQUFTLEVBQUUsSUFBSTtvQkFDZixNQUFNLEVBQUUsSUFBSTtvQkFDWixRQUFRLEVBQUUsSUFBSTtvQkFDZCxNQUFNLEVBQUUsSUFBSTtvQkFDWiw2QkFBNkIsRUFBRSxJQUFJO29CQUNuQyx5QkFBeUIsRUFBRSxJQUFJO29CQUMvQixpQkFBaUIsRUFBRSxJQUFJO29CQUN2QixxQkFBcUIsRUFBRSxJQUFJO29CQUMzQixjQUFjLEVBQUUsSUFBSTtvQkFDcEIsUUFBUSxFQUFFLEVBQUU7b0JBQ1osSUFBSSxFQUFFLElBQUk7aUJBQ2I7Z0JBQ0QsSUFBSSxFQUFFLEVBQUU7Z0JBQ1IsS0FBSyxFQUFFLEVBQUU7Z0JBQ1QsU0FBUyxFQUFFLEVBQUU7Z0JBQ2IsZ0JBQWdCLEVBQUUsQ0FBQztnQkFDbkIsVUFBVSxFQUFFLEVBQUU7Z0JBQ2QsWUFBWSxFQUFFLEVBQUU7YUFDbkI7WUFDRCxRQUFRLEVBQUUsY0FBYztTQUMzQixDQUFDO1FBQ0YsTUFBTSxDQUFDLE1BQU0sa0JBQWtCLENBQUMsT0FBTyxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDO1lBQzFELFVBQVUsRUFBRSxHQUFHO1lBQ2YsSUFBSSxFQUFFLGNBQWM7U0FDdkIsQ0FBQyxDQUFDO0lBQ1AsQ0FBQyxDQUFDLENBQUM7QUFDUCxDQUFDLENBQUMsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqXG4gKiAgQ29weXJpZ2h0IEFtYXpvbi5jb20sIEluYy4gb3IgaXRzIGFmZmlsaWF0ZXMuIEFsbCBSaWdodHMgUmVzZXJ2ZWQuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgKlxuICogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICpcbiAqICBMaWNlbnNlZCB1bmRlciB0aGUgQXBhY2hlIExpY2Vuc2UsIFZlcnNpb24gMi4wICh0aGUgXCJMaWNlbnNlXCIpLiBZb3UgbWF5IG5vdCB1c2UgdGhpcyBmaWxlIGV4Y2VwdCBpbiBjb21wbGlhbmNlICAgICpcbiAqICB3aXRoIHRoZSBMaWNlbnNlLiBBIGNvcHkgb2YgdGhlIExpY2Vuc2UgaXMgbG9jYXRlZCBhdCAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAqXG4gKiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgKlxuICogICAgICBodHRwOi8vd3d3LmFwYWNoZS5vcmcvbGljZW5zZXMvTElDRU5TRS0yLjAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICpcbiAqICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAqXG4gKiAgb3IgaW4gdGhlICdsaWNlbnNlJyBmaWxlIGFjY29tcGFueWluZyB0aGlzIGZpbGUuIFRoaXMgZmlsZSBpcyBkaXN0cmlidXRlZCBvbiBhbiAnQVMgSVMnIEJBU0lTLCBXSVRIT1VUIFdBUlJBTlRJRVMgKlxuICogIE9SIENPTkRJVElPTlMgT0YgQU5ZIEtJTkQsIGV4cHJlc3Mgb3IgaW1wbGllZC4gU2VlIHRoZSBMaWNlbnNlIGZvciB0aGUgc3BlY2lmaWMgbGFuZ3VhZ2UgZ292ZXJuaW5nIHBlcm1pc3Npb25zICAgICpcbiAqICBhbmQgbGltaXRhdGlvbnMgdW5kZXIgdGhlIExpY2Vuc2UuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAqXG4gKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqL1xuXG5pbXBvcnQgeyBBUElHYXRld2F5UHJveHlFdmVudCB9IGZyb20gJ2F3cy1sYW1iZGEnO1xuaW1wb3J0ICogYXMgZGlzY29ubmVjdF9oYW5kbGVyIGZyb20gJy4uL2Rpc2Nvbm5lY3QtaGFuZGxlcic7XG5cbmRlc2NyaWJlKCd3aGVuIGNhbGxpbmcgZGlzY29ubmVjdC1oYW5kbGVyJywgKCkgPT4ge1xuICAgIGl0KCdzaG91bGQgcmV0dXJuIDIwMCcsIGFzeW5jICgpID0+IHtcbiAgICAgICAgbGV0IG1vY2tlZEV2ZW50OiBBUElHYXRld2F5UHJveHlFdmVudCA9IHtcbiAgICAgICAgICAgIGJvZHk6ICdlbXB0eSBib2R5IGZvciB0ZXN0JyxcbiAgICAgICAgICAgIGhlYWRlcnM6IHt9LFxuICAgICAgICAgICAgbXVsdGlWYWx1ZUhlYWRlcnM6IHt9LFxuICAgICAgICAgICAgaHR0cE1ldGhvZDogJ1BPU1QnLFxuICAgICAgICAgICAgaXNCYXNlNjRFbmNvZGVkOiB0cnVlLFxuICAgICAgICAgICAgcGF0aDogJy9kaXNjb25uZWN0JyxcbiAgICAgICAgICAgIHBhdGhQYXJhbWV0ZXJzOiBudWxsLFxuICAgICAgICAgICAgcXVlcnlTdHJpbmdQYXJhbWV0ZXJzOiBudWxsLFxuICAgICAgICAgICAgbXVsdGlWYWx1ZVF1ZXJ5U3RyaW5nUGFyYW1ldGVyczogbnVsbCxcbiAgICAgICAgICAgIHN0YWdlVmFyaWFibGVzOiBudWxsLFxuICAgICAgICAgICAgcmVxdWVzdENvbnRleHQ6IHtcbiAgICAgICAgICAgICAgICBhY2NvdW50SWQ6ICcnLFxuICAgICAgICAgICAgICAgIGFwaUlkOiAnJyxcbiAgICAgICAgICAgICAgICBhdXRob3JpemVyOiB1bmRlZmluZWQsXG4gICAgICAgICAgICAgICAgcHJvdG9jb2w6ICcnLFxuICAgICAgICAgICAgICAgIGh0dHBNZXRob2Q6ICcnLFxuICAgICAgICAgICAgICAgIGlkZW50aXR5OiB7XG4gICAgICAgICAgICAgICAgICAgIGNsaWVudENlcnQ6IG51bGwsXG4gICAgICAgICAgICAgICAgICAgIHVzZXJBZ2VudDogbnVsbCxcbiAgICAgICAgICAgICAgICAgICAgdXNlckFybjogbnVsbCxcbiAgICAgICAgICAgICAgICAgICAgYWNjZXNzS2V5OiBudWxsLFxuICAgICAgICAgICAgICAgICAgICBhY2NvdW50SWQ6IG51bGwsXG4gICAgICAgICAgICAgICAgICAgIGFwaUtleTogbnVsbCxcbiAgICAgICAgICAgICAgICAgICAgYXBpS2V5SWQ6IG51bGwsXG4gICAgICAgICAgICAgICAgICAgIGNhbGxlcjogbnVsbCxcbiAgICAgICAgICAgICAgICAgICAgY29nbml0b0F1dGhlbnRpY2F0aW9uUHJvdmlkZXI6IG51bGwsXG4gICAgICAgICAgICAgICAgICAgIGNvZ25pdG9BdXRoZW50aWNhdGlvblR5cGU6IG51bGwsXG4gICAgICAgICAgICAgICAgICAgIGNvZ25pdG9JZGVudGl0eUlkOiBudWxsLFxuICAgICAgICAgICAgICAgICAgICBjb2duaXRvSWRlbnRpdHlQb29sSWQ6IG51bGwsXG4gICAgICAgICAgICAgICAgICAgIHByaW5jaXBhbE9yZ0lkOiBudWxsLFxuICAgICAgICAgICAgICAgICAgICBzb3VyY2VJcDogJycsXG4gICAgICAgICAgICAgICAgICAgIHVzZXI6IG51bGxcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHBhdGg6ICcnLFxuICAgICAgICAgICAgICAgIHN0YWdlOiAnJyxcbiAgICAgICAgICAgICAgICByZXF1ZXN0SWQ6ICcnLFxuICAgICAgICAgICAgICAgIHJlcXVlc3RUaW1lRXBvY2g6IDAsXG4gICAgICAgICAgICAgICAgcmVzb3VyY2VJZDogJycsXG4gICAgICAgICAgICAgICAgcmVzb3VyY2VQYXRoOiAnJ1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHJlc291cmNlOiAnZmFrZVJlc291cmNlJ1xuICAgICAgICB9O1xuICAgICAgICBleHBlY3QoYXdhaXQgZGlzY29ubmVjdF9oYW5kbGVyLmhhbmRsZXIobW9ja2VkRXZlbnQpKS50b0VxdWFsKHtcbiAgICAgICAgICAgIHN0YXR1c0NvZGU6IDIwMCxcbiAgICAgICAgICAgIGJvZHk6ICdEaXNjb25uZWN0ZWQnXG4gICAgICAgIH0pO1xuICAgIH0pO1xufSk7XG4iXX0=