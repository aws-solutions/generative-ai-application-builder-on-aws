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
import { StackInfo, UseCaseRecord } from '../../model/list-use-cases';
import { mockClient } from 'aws-sdk-client-mock';
import {
    DescribeStacksCommand,
    CloudFormationClient,
    DescribeStacksCommandOutput
} from '@aws-sdk/client-cloudformation';
import { CfnOutputKeys, CfnParameterKeys, KnowledgeBaseTypes } from '../../utils/constants';

describe('When performing storage management operations', () => {
    let cfnMockedClient: any;
    let stackManagement: StackManagement;
    let stackInfo: StackInfo;

    describe('When sucessfully invoking the commands', () => {
        beforeAll(() => {
            process.env.AWS_SDK_USER_AGENT = `{ "customUserAgent": "AWSSOLUTION/SO0276/v2.1.0" }`;

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
                                ParameterKey: CfnParameterKeys.KnowledgeBaseType,
                                ParameterValue: KnowledgeBaseTypes.BEDROCK
                            },
                            { ParameterKey: CfnParameterKeys.BedrockKnowledgeBaseId, ParameterValue: 'fakeid' },
                            {
                                ParameterKey: CfnParameterKeys.UseCaseConfigRecordKey,
                                ParameterValue: 'mock-chat-config-ssm-parameter-name'
                            },
                            {
                                ParameterKey: CfnParameterKeys.DefaultUserEmail,
                                ParameterValue: 'mock-default-user-email'
                            },
                            {
                                ParameterKey: CfnParameterKeys.UseCaseUUID,
                                ParameterValue: 'mock-use-case-uuid'
                            },
                            {
                                ParameterKey: CfnParameterKeys.RAGEnabled,
                                ParameterValue: 'true'
                            },
                            {
                                ParameterKey: CfnParameterKeys.DeployUI,
                                ParameterValue: 'Yes'
                            },
                            { ParameterKey: CfnParameterKeys.VpcEnabled, ParameterValue: 'Yes' },
                            { ParameterKey: CfnParameterKeys.CreateNewVpc, ParameterValue: 'No' },
                            { ParameterKey: CfnParameterKeys.ExistingVpcId, ParameterValue: 'vpc-id' },
                            {
                                ParameterKey: CfnParameterKeys.ExistingPrivateSubnetIds,
                                ParameterValue: 'subnet1,subnet2'
                            },
                            { ParameterKey: CfnParameterKeys.ExistingSecurityGroupIds, ParameterValue: 'sec1' }
                        ],
                        Outputs: [
                            {
                                OutputKey: CfnOutputKeys.WebConfigKey,
                                OutputValue: 'mock-webconfig-ssm-parameter-key'
                            },
                            {
                                OutputKey: CfnOutputKeys.CloudFrontWebUrl,
                                OutputValue: 'mock-cloudfront-url'
                            },
                            {
                                OutputKey: CfnOutputKeys.KendraIndexId,
                                OutputValue: 'mock-kendra-index'
                            },
                            {
                                OutputKey: CfnOutputKeys.CloudwatchDashboardUrl,
                                OutputValue: 'mock-cloudwatch-url'
                            },
                            {
                                OutputKey: CfnOutputKeys.PrivateSubnetIds,
                                OutputValue: 'subnet1,subnet2'
                            },
                            {
                                OutputKey: CfnOutputKeys.SecurityGroupIds,
                                OutputValue: 'sec1'
                            },
                            {
                                OutputKey: CfnOutputKeys.VpcId,
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
                cloudFrontWebUrl: 'mock-cloudfront-url',
                defaultUserEmail: 'mock-default-user-email',
                kendraIndexId: 'mock-kendra-index',
                cloudwatchDashboardUrl: 'mock-cloudwatch-url',
                useCaseUUID: 'mock-use-case-uuid',
                knowledgeBaseType: KnowledgeBaseTypes.BEDROCK,
                bedrockKnowledgeBaseId: 'fakeid',
                ragEnabled: 'true',
                deployUI: 'Yes',
                vpcEnabled: 'Yes',
                createNewVpc: 'No',
                vpcId: 'vpc-id',
                privateSubnetIds: ['subnet1', 'subnet2'],
                securityGroupIds: ['sec1']
            });
        });

        it('should get the stack role arn with a describe stacks call', async () => {
            const expectedResponse = {
                Stacks: [
                    {
                        StackName: 'test-1',
                        StackId: 'fake-stack-id',
                        CreationTime: new Date(),
                        StackStatus: 'CREATE_COMPLETE',
                        RoleARN: 'fake-role-arn'
                    }
                ]
            } as DescribeStacksCommandOutput;

            cfnMockedClient.on(DescribeStacksCommand).resolves(expectedResponse);
            const mockUseCaseRecord = {
                StackId: 'arn:aws:cloudformation:us-west-2:123456789012:stack/fake-stack-name/fake-uuid'
            } as UseCaseRecord;
            const response = await stackManagement.getStackRoleArnIfExists(mockUseCaseRecord);

            expect(response).toBeDefined();
            expect(response).toEqual('fake-role-arn');
        });

        it('should return undefined for role arn if it does not exist', async () => {
            const expectedResponse = {
                Stacks: [
                    {
                        StackName: 'test-1',
                        StackId: 'fake-stack-id',
                        CreationTime: new Date(),
                        StackStatus: 'CREATE_COMPLETE'
                    }
                ]
            } as DescribeStacksCommandOutput;

            cfnMockedClient.on(DescribeStacksCommand).resolves(expectedResponse);
            const mockUseCaseRecord = {
                StackId: 'arn:aws:cloudformation:us-west-2:123456789012:stack/fake-stack-name/fake-uuid'
            } as UseCaseRecord;
            const response = await stackManagement.getStackRoleArnIfExists(mockUseCaseRecord);

            expect(response).toBeUndefined();
        });

        afterAll(() => {
            delete process.env.AWS_SDK_USER_AGENT;

            cfnMockedClient.restore();
        });
    });
});
