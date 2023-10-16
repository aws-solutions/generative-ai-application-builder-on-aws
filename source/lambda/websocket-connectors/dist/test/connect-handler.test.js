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
const connect_handler = __importStar(require("../connect-handler"));
describe('when calling connect-handler', () => {
    it('should return 200', async () => {
        let mockedEvent = {
            body: 'empty body for test',
            headers: {},
            multiValueHeaders: {},
            httpMethod: 'POST',
            isBase64Encoded: true,
            path: '/connect',
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
        expect(await connect_handler.handler(mockedEvent)).toEqual({
            statusCode: 200,
            body: 'Connected'
        });
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29ubmVjdC1oYW5kbGVyLnRlc3QuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi90ZXN0L2Nvbm5lY3QtaGFuZGxlci50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQTs7Ozs7Ozs7Ozs7dUhBV3VIOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBR3ZILG9FQUFzRDtBQUV0RCxRQUFRLENBQUMsOEJBQThCLEVBQUUsR0FBRyxFQUFFO0lBQzFDLEVBQUUsQ0FBQyxtQkFBbUIsRUFBRSxLQUFLLElBQUksRUFBRTtRQUMvQixJQUFJLFdBQVcsR0FBeUI7WUFDcEMsSUFBSSxFQUFFLHFCQUFxQjtZQUMzQixPQUFPLEVBQUUsRUFBRTtZQUNYLGlCQUFpQixFQUFFLEVBQUU7WUFDckIsVUFBVSxFQUFFLE1BQU07WUFDbEIsZUFBZSxFQUFFLElBQUk7WUFDckIsSUFBSSxFQUFFLFVBQVU7WUFDaEIsY0FBYyxFQUFFLElBQUk7WUFDcEIscUJBQXFCLEVBQUUsSUFBSTtZQUMzQiwrQkFBK0IsRUFBRSxJQUFJO1lBQ3JDLGNBQWMsRUFBRSxJQUFJO1lBQ3BCLGNBQWMsRUFBRTtnQkFDWixTQUFTLEVBQUUsRUFBRTtnQkFDYixLQUFLLEVBQUUsRUFBRTtnQkFDVCxVQUFVLEVBQUUsU0FBUztnQkFDckIsUUFBUSxFQUFFLEVBQUU7Z0JBQ1osVUFBVSxFQUFFLEVBQUU7Z0JBQ2QsUUFBUSxFQUFFO29CQUNOLFVBQVUsRUFBRSxJQUFJO29CQUNoQixTQUFTLEVBQUUsSUFBSTtvQkFDZixPQUFPLEVBQUUsSUFBSTtvQkFDYixTQUFTLEVBQUUsSUFBSTtvQkFDZixTQUFTLEVBQUUsSUFBSTtvQkFDZixNQUFNLEVBQUUsSUFBSTtvQkFDWixRQUFRLEVBQUUsSUFBSTtvQkFDZCxNQUFNLEVBQUUsSUFBSTtvQkFDWiw2QkFBNkIsRUFBRSxJQUFJO29CQUNuQyx5QkFBeUIsRUFBRSxJQUFJO29CQUMvQixpQkFBaUIsRUFBRSxJQUFJO29CQUN2QixxQkFBcUIsRUFBRSxJQUFJO29CQUMzQixjQUFjLEVBQUUsSUFBSTtvQkFDcEIsUUFBUSxFQUFFLEVBQUU7b0JBQ1osSUFBSSxFQUFFLElBQUk7aUJBQ2I7Z0JBQ0QsSUFBSSxFQUFFLEVBQUU7Z0JBQ1IsS0FBSyxFQUFFLEVBQUU7Z0JBQ1QsU0FBUyxFQUFFLEVBQUU7Z0JBQ2IsZ0JBQWdCLEVBQUUsQ0FBQztnQkFDbkIsVUFBVSxFQUFFLEVBQUU7Z0JBQ2QsWUFBWSxFQUFFLEVBQUU7YUFDbkI7WUFDRCxRQUFRLEVBQUUsY0FBYztTQUMzQixDQUFDO1FBQ0YsTUFBTSxDQUFDLE1BQU0sZUFBZSxDQUFDLE9BQU8sQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQztZQUN2RCxVQUFVLEVBQUUsR0FBRztZQUNmLElBQUksRUFBRSxXQUFXO1NBQ3BCLENBQUMsQ0FBQztJQUNQLENBQUMsQ0FBQyxDQUFDO0FBQ1AsQ0FBQyxDQUFDLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKlxuICogIENvcHlyaWdodCBBbWF6b24uY29tLCBJbmMuIG9yIGl0cyBhZmZpbGlhdGVzLiBBbGwgUmlnaHRzIFJlc2VydmVkLiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICpcbiAqICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAqXG4gKiAgTGljZW5zZWQgdW5kZXIgdGhlIEFwYWNoZSBMaWNlbnNlLCBWZXJzaW9uIDIuMCAodGhlIFwiTGljZW5zZVwiKS4gWW91IG1heSBub3QgdXNlIHRoaXMgZmlsZSBleGNlcHQgaW4gY29tcGxpYW5jZSAgICAqXG4gKiAgd2l0aCB0aGUgTGljZW5zZS4gQSBjb3B5IG9mIHRoZSBMaWNlbnNlIGlzIGxvY2F0ZWQgYXQgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgKlxuICogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICpcbiAqICAgICAgaHR0cDovL3d3dy5hcGFjaGUub3JnL2xpY2Vuc2VzL0xJQ0VOU0UtMi4wICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAqXG4gKiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgKlxuICogIG9yIGluIHRoZSAnbGljZW5zZScgZmlsZSBhY2NvbXBhbnlpbmcgdGhpcyBmaWxlLiBUaGlzIGZpbGUgaXMgZGlzdHJpYnV0ZWQgb24gYW4gJ0FTIElTJyBCQVNJUywgV0lUSE9VVCBXQVJSQU5USUVTICpcbiAqICBPUiBDT05ESVRJT05TIE9GIEFOWSBLSU5ELCBleHByZXNzIG9yIGltcGxpZWQuIFNlZSB0aGUgTGljZW5zZSBmb3IgdGhlIHNwZWNpZmljIGxhbmd1YWdlIGdvdmVybmluZyBwZXJtaXNzaW9ucyAgICAqXG4gKiAgYW5kIGxpbWl0YXRpb25zIHVuZGVyIHRoZSBMaWNlbnNlLiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgKlxuICoqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKi9cblxuaW1wb3J0IHsgQVBJR2F0ZXdheVByb3h5RXZlbnQgfSBmcm9tICdhd3MtbGFtYmRhJztcbmltcG9ydCAqIGFzIGNvbm5lY3RfaGFuZGxlciBmcm9tICcuLi9jb25uZWN0LWhhbmRsZXInO1xuXG5kZXNjcmliZSgnd2hlbiBjYWxsaW5nIGNvbm5lY3QtaGFuZGxlcicsICgpID0+IHtcbiAgICBpdCgnc2hvdWxkIHJldHVybiAyMDAnLCBhc3luYyAoKSA9PiB7XG4gICAgICAgIGxldCBtb2NrZWRFdmVudDogQVBJR2F0ZXdheVByb3h5RXZlbnQgPSB7XG4gICAgICAgICAgICBib2R5OiAnZW1wdHkgYm9keSBmb3IgdGVzdCcsXG4gICAgICAgICAgICBoZWFkZXJzOiB7fSxcbiAgICAgICAgICAgIG11bHRpVmFsdWVIZWFkZXJzOiB7fSxcbiAgICAgICAgICAgIGh0dHBNZXRob2Q6ICdQT1NUJyxcbiAgICAgICAgICAgIGlzQmFzZTY0RW5jb2RlZDogdHJ1ZSxcbiAgICAgICAgICAgIHBhdGg6ICcvY29ubmVjdCcsXG4gICAgICAgICAgICBwYXRoUGFyYW1ldGVyczogbnVsbCxcbiAgICAgICAgICAgIHF1ZXJ5U3RyaW5nUGFyYW1ldGVyczogbnVsbCxcbiAgICAgICAgICAgIG11bHRpVmFsdWVRdWVyeVN0cmluZ1BhcmFtZXRlcnM6IG51bGwsXG4gICAgICAgICAgICBzdGFnZVZhcmlhYmxlczogbnVsbCxcbiAgICAgICAgICAgIHJlcXVlc3RDb250ZXh0OiB7XG4gICAgICAgICAgICAgICAgYWNjb3VudElkOiAnJyxcbiAgICAgICAgICAgICAgICBhcGlJZDogJycsXG4gICAgICAgICAgICAgICAgYXV0aG9yaXplcjogdW5kZWZpbmVkLFxuICAgICAgICAgICAgICAgIHByb3RvY29sOiAnJyxcbiAgICAgICAgICAgICAgICBodHRwTWV0aG9kOiAnJyxcbiAgICAgICAgICAgICAgICBpZGVudGl0eToge1xuICAgICAgICAgICAgICAgICAgICBjbGllbnRDZXJ0OiBudWxsLFxuICAgICAgICAgICAgICAgICAgICB1c2VyQWdlbnQ6IG51bGwsXG4gICAgICAgICAgICAgICAgICAgIHVzZXJBcm46IG51bGwsXG4gICAgICAgICAgICAgICAgICAgIGFjY2Vzc0tleTogbnVsbCxcbiAgICAgICAgICAgICAgICAgICAgYWNjb3VudElkOiBudWxsLFxuICAgICAgICAgICAgICAgICAgICBhcGlLZXk6IG51bGwsXG4gICAgICAgICAgICAgICAgICAgIGFwaUtleUlkOiBudWxsLFxuICAgICAgICAgICAgICAgICAgICBjYWxsZXI6IG51bGwsXG4gICAgICAgICAgICAgICAgICAgIGNvZ25pdG9BdXRoZW50aWNhdGlvblByb3ZpZGVyOiBudWxsLFxuICAgICAgICAgICAgICAgICAgICBjb2duaXRvQXV0aGVudGljYXRpb25UeXBlOiBudWxsLFxuICAgICAgICAgICAgICAgICAgICBjb2duaXRvSWRlbnRpdHlJZDogbnVsbCxcbiAgICAgICAgICAgICAgICAgICAgY29nbml0b0lkZW50aXR5UG9vbElkOiBudWxsLFxuICAgICAgICAgICAgICAgICAgICBwcmluY2lwYWxPcmdJZDogbnVsbCxcbiAgICAgICAgICAgICAgICAgICAgc291cmNlSXA6ICcnLFxuICAgICAgICAgICAgICAgICAgICB1c2VyOiBudWxsXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICBwYXRoOiAnJyxcbiAgICAgICAgICAgICAgICBzdGFnZTogJycsXG4gICAgICAgICAgICAgICAgcmVxdWVzdElkOiAnJyxcbiAgICAgICAgICAgICAgICByZXF1ZXN0VGltZUVwb2NoOiAwLFxuICAgICAgICAgICAgICAgIHJlc291cmNlSWQ6ICcnLFxuICAgICAgICAgICAgICAgIHJlc291cmNlUGF0aDogJydcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICByZXNvdXJjZTogJ2Zha2VSZXNvdXJjZSdcbiAgICAgICAgfTtcbiAgICAgICAgZXhwZWN0KGF3YWl0IGNvbm5lY3RfaGFuZGxlci5oYW5kbGVyKG1vY2tlZEV2ZW50KSkudG9FcXVhbCh7XG4gICAgICAgICAgICBzdGF0dXNDb2RlOiAyMDAsXG4gICAgICAgICAgICBib2R5OiAnQ29ubmVjdGVkJ1xuICAgICAgICB9KTtcbiAgICB9KTtcbn0pO1xuIl19