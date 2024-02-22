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

import { StackManagement } from '../../cfn/stack-management';
import { StackInfo } from '../../model/list-use-cases';
import { mockClient } from 'aws-sdk-client-mock';
import {
    DescribeStacksCommand,
    CloudFormationClient,
    DescribeStacksCommandOutput
} from '@aws-sdk/client-cloudformation';

describe('When performing storage management operations', () => {
    let cfnMockedClient: any;
    let stackManagement: StackManagement;
    let stackInfo: StackInfo;

    describe('When sucessfully invoking the commands', () => {
        beforeAll(() => {
            process.env.AWS_SDK_USER_AGENT = `{ "customUserAgent": "AWSSOLUTION/SO0276/v2.0.0" }`;

            stackInfo = {
                stackArn: 'arn:aws:cloudformation:us-west-2:123456789012:stack/fake-stack-name/fake-uuid',
                stackId: 'stack/fake-stack-name/fake-uuid',
                stackInstanceAccount: '123456789012',
                stackInstanceRegion: ':us-west-2'
            } as StackInfo;

            cfnMockedClient = mockClient(CloudFormationClient);
            stackManagement = new StackManagement();
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
                            },
                            {
                                ParameterKey: 'DefaultUserEmail',
                                ParameterValue: 'mock-default-user-email'
                            },
                            {
                                ParameterKey: 'UseCaseUUID',
                                ParameterValue: 'mock-use-case-uuid'
                            },
                            {
                                ParameterKey: 'RAGEnabled',
                                ParameterValue: 'true'
                            },
                            {
                                ParameterKey: 'ProviderApiKeySecret',
                                ParameterValue: 'mock-provider-api-key-secret'
                            },
                            { ParameterKey: 'VpcEnabled', ParameterValue: 'Yes' },
                            { ParameterKey: 'CreateNewVpc', ParameterValue: 'No' },
                            { ParameterKey: 'ExistingVpcId', ParameterValue: 'vpc-id' },
                            { ParameterKey: 'ExistingPrivateSubnetIds', ParameterValue: 'subnet1,subnet2' },
                            { ParameterKey: 'ExistingSecurityGroupIds', ParameterValue: 'sec1' }
                        ],
                        Outputs: [
                            {
                                OutputKey: 'WebConfigKey',
                                OutputValue: 'mock-webconfig-ssm-parameter-key'
                            },
                            {
                                OutputKey: 'CloudFrontWebUrl',
                                OutputValue: 'mock-cloudfront-url'
                            },
                            {
                                OutputKey: 'KendraIndexId',
                                OutputValue: 'mock-kendra-index'
                            },
                            {
                                OutputKey: 'CloudwatchDashboardUrl',
                                OutputValue: 'mock-cloudwatch-url'
                            },
                            {
                                OutputKey: 'PrivateSubnetIds',
                                OutputValue: 'subnet1,subnet2'
                            },
                            {
                                OutputKey: 'SecurityGroupIds',
                                OutputValue: 'sec1'
                            },
                            {
                                OutputKey: 'VpcId',
                                OutputValue: 'vpc-id'
                            }
                        ]
                    }
                ]
            } as DescribeStacksCommandOutput;

            cfnMockedClient.on(DescribeStacksCommand).resolves(expectedResponse);

            const response = await stackManagement.getStackDetails(stackInfo);

            expect(response).toBeDefined();
            expect(response).toEqual({
                status: 'CREATE_COMPLETE',
                webConfigKey: 'mock-webconfig-ssm-parameter-key',
                chatConfigSSMParameterName: 'mock-chat-config-ssm-parameter-name',
                cloudFrontWebUrl: 'mock-cloudfront-url',
                defaultUserEmail: 'mock-default-user-email',
                kendraIndexId: 'mock-kendra-index',
                cloudwatchDashboardUrl: 'mock-cloudwatch-url',
                useCaseUUID: 'mock-use-case-uuid',
                ragEnabled: 'true',
                providerApiKeySecret: 'mock-provider-api-key-secret',
                vpcEnabled: 'Yes',
                createNewVpc: 'No',
                vpcId: 'vpc-id',
                privateSubnetIds: ['subnet1', 'subnet2'],
                securityGroupIds: ['sec1']
            });
        });

        afterAll(() => {
            delete process.env.AWS_SDK_USER_AGENT;

            cfnMockedClient.restore();
        });
    });
});
