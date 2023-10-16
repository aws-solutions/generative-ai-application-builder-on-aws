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
const stack_management_1 = require("../../cfn/stack-management");
const aws_sdk_client_mock_1 = require("aws-sdk-client-mock");
const client_cloudformation_1 = require("@aws-sdk/client-cloudformation");
describe('When performing storage management operations', () => {
    let cfnMockedClient;
    let stackManagement;
    let stackInfo;
    describe('When sucessfully invoking the commands', () => {
        beforeAll(() => {
            process.env.AWS_SDK_USER_AGENT = `{ "customUserAgent": "AwsSolution/SO0276/v2.0.0" }`;
            stackInfo = {
                stackArn: 'arn:aws:cloudformation:us-west-2:123456789012:stack/fake-stack-name/fake-uuid',
                stackId: 'stack/fake-stack-name/fake-uuid',
                stackInstanceAccount: '123456789012',
                stackInstanceRegion: ':us-west-2'
            };
            cfnMockedClient = (0, aws_sdk_client_mock_1.mockClient)(client_cloudformation_1.CloudFormationClient);
            stackManagement = new stack_management_1.StackManagement();
        });
        it('should return a list of use cases', async () => {
            const expectedResponse = {
                Stacks: [
                    {
                        StackName: 'test-1',
                        StackId: 'fake-stack-id',
                        CreationTime: new Date(),
                        StackStatus: 'CREATE_COMPLETE',
                        Parameters: [
                            {
                                ParameterKey: 'ChatConfigSSMParameterName',
                                ParameterValue: 'mock-chat-config-ssm-parameter-name'
                            }
                        ],
                        Outputs: [
                            {
                                OutputKey: 'WebConfigKey',
                                OutputValue: 'mock-webconfig-ssm-parameter-key'
                            },
                            {
                                OutputKey: 'CloudFrontWebUrl',
                                OutputValue: 'mock-cloudfront-url'
                            }
                        ]
                    }
                ]
            };
            cfnMockedClient.on(client_cloudformation_1.DescribeStacksCommand).resolves(expectedResponse);
            const response = await stackManagement.getStackDetails(stackInfo);
            expect(response).toBeDefined();
            expect(response).toEqual({
                status: 'CREATE_COMPLETE',
                webConfigKey: 'mock-webconfig-ssm-parameter-key',
                chatConfigSSMParameterName: 'mock-chat-config-ssm-parameter-name',
                cloudFrontWebUrl: 'mock-cloudfront-url'
            });
        });
        afterAll(() => {
            delete process.env.AWS_SDK_USER_AGENT;
            cfnMockedClient.restore();
        });
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3RhY2stbWFuYWdlbWVudC50ZXN0LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vdGVzdC9jZm4vc3RhY2stbWFuYWdlbWVudC50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQTs7Ozs7Ozs7Ozs7d0hBV3dIOztBQUV4SCxpRUFBNkQ7QUFFN0QsNkRBQWlEO0FBQ2pELDBFQUl3QztBQUV4QyxRQUFRLENBQUMsK0NBQStDLEVBQUUsR0FBRyxFQUFFO0lBQzNELElBQUksZUFBb0IsQ0FBQztJQUN6QixJQUFJLGVBQWdDLENBQUM7SUFDckMsSUFBSSxTQUFvQixDQUFDO0lBRXpCLFFBQVEsQ0FBQyx3Q0FBd0MsRUFBRSxHQUFHLEVBQUU7UUFDcEQsU0FBUyxDQUFDLEdBQUcsRUFBRTtZQUNYLE9BQU8sQ0FBQyxHQUFHLENBQUMsa0JBQWtCLEdBQUcsb0RBQW9ELENBQUM7WUFFdEYsU0FBUyxHQUFHO2dCQUNSLFFBQVEsRUFBRSwrRUFBK0U7Z0JBQ3pGLE9BQU8sRUFBRSxpQ0FBaUM7Z0JBQzFDLG9CQUFvQixFQUFFLGNBQWM7Z0JBQ3BDLG1CQUFtQixFQUFFLFlBQVk7YUFDdkIsQ0FBQztZQUVmLGVBQWUsR0FBRyxJQUFBLGdDQUFVLEVBQUMsNENBQW9CLENBQUMsQ0FBQztZQUNuRCxlQUFlLEdBQUcsSUFBSSxrQ0FBZSxFQUFFLENBQUM7UUFDNUMsQ0FBQyxDQUFDLENBQUM7UUFFSCxFQUFFLENBQUMsbUNBQW1DLEVBQUUsS0FBSyxJQUFJLEVBQUU7WUFDL0MsTUFBTSxnQkFBZ0IsR0FBRztnQkFDckIsTUFBTSxFQUFFO29CQUNKO3dCQUNJLFNBQVMsRUFBRSxRQUFRO3dCQUNuQixPQUFPLEVBQUUsZUFBZTt3QkFDeEIsWUFBWSxFQUFFLElBQUksSUFBSSxFQUFFO3dCQUN4QixXQUFXLEVBQUUsaUJBQWlCO3dCQUM5QixVQUFVLEVBQUU7NEJBQ1I7Z0NBQ0ksWUFBWSxFQUFFLDRCQUE0QjtnQ0FDMUMsY0FBYyxFQUFFLHFDQUFxQzs2QkFDeEQ7eUJBQ0o7d0JBQ0QsT0FBTyxFQUFFOzRCQUNMO2dDQUNJLFNBQVMsRUFBRSxjQUFjO2dDQUN6QixXQUFXLEVBQUUsa0NBQWtDOzZCQUNsRDs0QkFDRDtnQ0FDSSxTQUFTLEVBQUUsa0JBQWtCO2dDQUM3QixXQUFXLEVBQUUscUJBQXFCOzZCQUNyQzt5QkFDSjtxQkFDSjtpQkFDSjthQUMyQixDQUFDO1lBRWpDLGVBQWUsQ0FBQyxFQUFFLENBQUMsNkNBQXFCLENBQUMsQ0FBQyxRQUFRLENBQUMsZ0JBQWdCLENBQUMsQ0FBQztZQUVyRSxNQUFNLFFBQVEsR0FBRyxNQUFNLGVBQWUsQ0FBQyxlQUFlLENBQUMsU0FBUyxDQUFDLENBQUM7WUFFbEUsTUFBTSxDQUFDLFFBQVEsQ0FBQyxDQUFDLFdBQVcsRUFBRSxDQUFDO1lBQy9CLE1BQU0sQ0FBQyxRQUFRLENBQUMsQ0FBQyxPQUFPLENBQUM7Z0JBQ3JCLE1BQU0sRUFBRSxpQkFBaUI7Z0JBQ3pCLFlBQVksRUFBRSxrQ0FBa0M7Z0JBQ2hELDBCQUEwQixFQUFFLHFDQUFxQztnQkFDakUsZ0JBQWdCLEVBQUUscUJBQXFCO2FBQzFDLENBQUMsQ0FBQztRQUNQLENBQUMsQ0FBQyxDQUFDO1FBRUgsUUFBUSxDQUFDLEdBQUcsRUFBRTtZQUNWLE9BQU8sT0FBTyxDQUFDLEdBQUcsQ0FBQyxrQkFBa0IsQ0FBQztZQUV0QyxlQUFlLENBQUMsT0FBTyxFQUFFLENBQUM7UUFDOUIsQ0FBQyxDQUFDLENBQUM7SUFDUCxDQUFDLENBQUMsQ0FBQztBQUNQLENBQUMsQ0FBQyxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKipcbiAqICBDb3B5cmlnaHQgQW1hem9uLmNvbSwgSW5jLiBvciBpdHMgYWZmaWxpYXRlcy4gQWxsIFJpZ2h0cyBSZXNlcnZlZC4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAqXG4gKiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgKlxuICogIExpY2Vuc2VkIHVuZGVyIHRoZSBBcGFjaGUgTGljZW5zZSwgVmVyc2lvbiAyLjAgKHRoZSBcIkxpY2Vuc2VcIikuIFlvdSBtYXkgbm90IHVzZSB0aGlzIGZpbGUgZXhjZXB0IGluIGNvbXBsaWFuY2UgICAgKlxuICogIHdpdGggdGhlIExpY2Vuc2UuIEEgY29weSBvZiB0aGUgTGljZW5zZSBpcyBsb2NhdGVkIGF0ICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICpcbiAqICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAqXG4gKiAgICAgIGh0dHA6Ly93d3cuYXBhY2hlLm9yZy9saWNlbnNlcy9MSUNFTlNFLTIuMCAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgKlxuICogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICpcbiAqICBvciBpbiB0aGUgJ2xpY2Vuc2UnIGZpbGUgYWNjb21wYW55aW5nIHRoaXMgZmlsZS4gVGhpcyBmaWxlIGlzIGRpc3RyaWJ1dGVkIG9uIGFuICdBUyBJUycgQkFTSVMsIFdJVEhPVVQgV0FSUkFOVElFUyAqXG4gKiAgT1IgQ09ORElUSU9OUyBPRiBBTlkgS0lORCwgZXhwcmVzcyBvciBpbXBsaWVkLiBTZWUgdGhlIExpY2Vuc2UgZm9yIHRoZSBzcGVjaWZpYyBsYW5ndWFnZSBnb3Zlcm5pbmcgcGVybWlzc2lvbnMgICAgKlxuICogIGFuZCBsaW1pdGF0aW9ucyB1bmRlciB0aGUgTGljZW5zZS4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICpcbiAqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqL1xuXG5pbXBvcnQgeyBTdGFja01hbmFnZW1lbnQgfSBmcm9tICcuLi8uLi9jZm4vc3RhY2stbWFuYWdlbWVudCc7XG5pbXBvcnQgeyBTdGFja0luZm8gfSBmcm9tICcuLi8uLi9tb2RlbC9saXN0LXVzZS1jYXNlcyc7XG5pbXBvcnQgeyBtb2NrQ2xpZW50IH0gZnJvbSAnYXdzLXNkay1jbGllbnQtbW9jayc7XG5pbXBvcnQge1xuICAgIERlc2NyaWJlU3RhY2tzQ29tbWFuZCxcbiAgICBDbG91ZEZvcm1hdGlvbkNsaWVudCxcbiAgICBEZXNjcmliZVN0YWNrc0NvbW1hbmRPdXRwdXRcbn0gZnJvbSAnQGF3cy1zZGsvY2xpZW50LWNsb3VkZm9ybWF0aW9uJztcblxuZGVzY3JpYmUoJ1doZW4gcGVyZm9ybWluZyBzdG9yYWdlIG1hbmFnZW1lbnQgb3BlcmF0aW9ucycsICgpID0+IHtcbiAgICBsZXQgY2ZuTW9ja2VkQ2xpZW50OiBhbnk7XG4gICAgbGV0IHN0YWNrTWFuYWdlbWVudDogU3RhY2tNYW5hZ2VtZW50O1xuICAgIGxldCBzdGFja0luZm86IFN0YWNrSW5mbztcblxuICAgIGRlc2NyaWJlKCdXaGVuIHN1Y2Vzc2Z1bGx5IGludm9raW5nIHRoZSBjb21tYW5kcycsICgpID0+IHtcbiAgICAgICAgYmVmb3JlQWxsKCgpID0+IHtcbiAgICAgICAgICAgIHByb2Nlc3MuZW52LkFXU19TREtfVVNFUl9BR0VOVCA9IGB7IFwiY3VzdG9tVXNlckFnZW50XCI6IFwiQXdzU29sdXRpb24vU08wMjc2L3YyLjAuMFwiIH1gO1xuXG4gICAgICAgICAgICBzdGFja0luZm8gPSB7XG4gICAgICAgICAgICAgICAgc3RhY2tBcm46ICdhcm46YXdzOmNsb3VkZm9ybWF0aW9uOnVzLXdlc3QtMjoxMjM0NTY3ODkwMTI6c3RhY2svZmFrZS1zdGFjay1uYW1lL2Zha2UtdXVpZCcsXG4gICAgICAgICAgICAgICAgc3RhY2tJZDogJ3N0YWNrL2Zha2Utc3RhY2stbmFtZS9mYWtlLXV1aWQnLFxuICAgICAgICAgICAgICAgIHN0YWNrSW5zdGFuY2VBY2NvdW50OiAnMTIzNDU2Nzg5MDEyJyxcbiAgICAgICAgICAgICAgICBzdGFja0luc3RhbmNlUmVnaW9uOiAnOnVzLXdlc3QtMidcbiAgICAgICAgICAgIH0gYXMgU3RhY2tJbmZvO1xuXG4gICAgICAgICAgICBjZm5Nb2NrZWRDbGllbnQgPSBtb2NrQ2xpZW50KENsb3VkRm9ybWF0aW9uQ2xpZW50KTtcbiAgICAgICAgICAgIHN0YWNrTWFuYWdlbWVudCA9IG5ldyBTdGFja01hbmFnZW1lbnQoKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgaXQoJ3Nob3VsZCByZXR1cm4gYSBsaXN0IG9mIHVzZSBjYXNlcycsIGFzeW5jICgpID0+IHtcbiAgICAgICAgICAgIGNvbnN0IGV4cGVjdGVkUmVzcG9uc2UgPSB7XG4gICAgICAgICAgICAgICAgU3RhY2tzOiBbXG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIFN0YWNrTmFtZTogJ3Rlc3QtMScsXG4gICAgICAgICAgICAgICAgICAgICAgICBTdGFja0lkOiAnZmFrZS1zdGFjay1pZCcsXG4gICAgICAgICAgICAgICAgICAgICAgICBDcmVhdGlvblRpbWU6IG5ldyBEYXRlKCksXG4gICAgICAgICAgICAgICAgICAgICAgICBTdGFja1N0YXR1czogJ0NSRUFURV9DT01QTEVURScsXG4gICAgICAgICAgICAgICAgICAgICAgICBQYXJhbWV0ZXJzOiBbXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBQYXJhbWV0ZXJLZXk6ICdDaGF0Q29uZmlnU1NNUGFyYW1ldGVyTmFtZScsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFBhcmFtZXRlclZhbHVlOiAnbW9jay1jaGF0LWNvbmZpZy1zc20tcGFyYW1ldGVyLW5hbWUnXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgXSxcbiAgICAgICAgICAgICAgICAgICAgICAgIE91dHB1dHM6IFtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIE91dHB1dEtleTogJ1dlYkNvbmZpZ0tleScsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIE91dHB1dFZhbHVlOiAnbW9jay13ZWJjb25maWctc3NtLXBhcmFtZXRlci1rZXknXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIE91dHB1dEtleTogJ0Nsb3VkRnJvbnRXZWJVcmwnLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBPdXRwdXRWYWx1ZTogJ21vY2stY2xvdWRmcm9udC11cmwnXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgXVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgXVxuICAgICAgICAgICAgfSBhcyBEZXNjcmliZVN0YWNrc0NvbW1hbmRPdXRwdXQ7XG5cbiAgICAgICAgICAgIGNmbk1vY2tlZENsaWVudC5vbihEZXNjcmliZVN0YWNrc0NvbW1hbmQpLnJlc29sdmVzKGV4cGVjdGVkUmVzcG9uc2UpO1xuXG4gICAgICAgICAgICBjb25zdCByZXNwb25zZSA9IGF3YWl0IHN0YWNrTWFuYWdlbWVudC5nZXRTdGFja0RldGFpbHMoc3RhY2tJbmZvKTtcblxuICAgICAgICAgICAgZXhwZWN0KHJlc3BvbnNlKS50b0JlRGVmaW5lZCgpO1xuICAgICAgICAgICAgZXhwZWN0KHJlc3BvbnNlKS50b0VxdWFsKHtcbiAgICAgICAgICAgICAgICBzdGF0dXM6ICdDUkVBVEVfQ09NUExFVEUnLFxuICAgICAgICAgICAgICAgIHdlYkNvbmZpZ0tleTogJ21vY2std2ViY29uZmlnLXNzbS1wYXJhbWV0ZXIta2V5JyxcbiAgICAgICAgICAgICAgICBjaGF0Q29uZmlnU1NNUGFyYW1ldGVyTmFtZTogJ21vY2stY2hhdC1jb25maWctc3NtLXBhcmFtZXRlci1uYW1lJyxcbiAgICAgICAgICAgICAgICBjbG91ZEZyb250V2ViVXJsOiAnbW9jay1jbG91ZGZyb250LXVybCdcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9KTtcblxuICAgICAgICBhZnRlckFsbCgoKSA9PiB7XG4gICAgICAgICAgICBkZWxldGUgcHJvY2Vzcy5lbnYuQVdTX1NES19VU0VSX0FHRU5UO1xuXG4gICAgICAgICAgICBjZm5Nb2NrZWRDbGllbnQucmVzdG9yZSgpO1xuICAgICAgICB9KTtcbiAgICB9KTtcbn0pO1xuIl19