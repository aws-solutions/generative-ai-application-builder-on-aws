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
const client_cloudformation_1 = require("@aws-sdk/client-cloudformation");
const client_dynamodb_1 = require("@aws-sdk/client-dynamodb");
const client_secrets_manager_1 = require("@aws-sdk/client-secrets-manager");
const client_ssm_1 = require("@aws-sdk/client-ssm");
const aws_sdk_client_mock_1 = require("aws-sdk-client-mock");
const constants_1 = require("../utils/constants");
describe('When invoking the lambda function', () => {
    let cfnMockedClient;
    let ddbMockedClient;
    let ssmMockedClient;
    let secretsmanagerMockedClient;
    let event;
    beforeAll(() => {
        process.env.AWS_SDK_USER_AGENT = `{ "customUserAgent": "AwsSolution/SO0276/v2.0.0" }`;
        process.env[constants_1.POWERTOOLS_METRICS_NAMESPACE_ENV_VAR] = 'UnitTest';
        process.env[constants_1.USE_CASES_TABLE_NAME_ENV_VAR] = 'UseCaseTable';
        process.env[constants_1.ARTIFACT_BUCKET_ENV_VAR] = 'fake-artifact-bucket';
        process.env[constants_1.CFN_DEPLOY_ROLE_ARN_ENV_VAR] = 'arn:aws:iam::123456789012:role/fake-role';
        process.env[constants_1.USE_CASE_CONFIG_SSM_PARAMETER_PREFIX_ENV_VAR] = '/config';
        process.env[constants_1.COGNITO_POLICY_TABLE_ENV_VAR] = 'fake-table';
        process.env[constants_1.USER_POOL_ID_ENV_VAR] = 'fake-user-pool-id';
        process.env[constants_1.TEMPLATE_FILE_EXTN_ENV_VAR] = '.json';
        process.env[constants_1.USE_CASE_API_KEY_SUFFIX_ENV_VAR] = 'api-key';
        process.env[constants_1.IS_INTERNAL_USER_ENV_VAR] = 'true';
        event = {
            body: JSON.stringify({
                ConversationMemoryType: 'DDBMemoryType',
                ConversationMemoryParams: 'ConversationMemoryParams',
                KnowledgeBaseType: 'Kendra',
                KnowledgeBaseParams: {
                    NumberOfDocs: '5',
                    ReturnSourceDocs: '5'
                },
                LlmParams: {
                    ModelProvider: 'HuggingFace',
                    ModelId: 'google/flan-t5-xxl',
                    ModelParams: 'Param1',
                    PromptTemplate: 'Prompt1',
                    Streaming: true,
                    RAGEnabled: true,
                    Temperature: 0.1
                }
            })
        };
        cfnMockedClient = (0, aws_sdk_client_mock_1.mockClient)(client_cloudformation_1.CloudFormationClient);
        ddbMockedClient = (0, aws_sdk_client_mock_1.mockClient)(client_dynamodb_1.DynamoDBClient);
        ssmMockedClient = (0, aws_sdk_client_mock_1.mockClient)(client_ssm_1.SSMClient);
        secretsmanagerMockedClient = (0, aws_sdk_client_mock_1.mockClient)(client_secrets_manager_1.SecretsManagerClient);
    });
    // describe('on cfn failure', () => {
    //     beforeAll(() => {
    //         cfnMockedClient.reset();
    //         cfnMockedClient.on(CreateStackCommand).rejects(new Error('Fake error for testing'));
    //         cfnMockedClient.on(UpdateStackCommand).rejects(new Error('Fake error for testing'));
    //         cfnMockedClient.on(DeleteStackCommand).rejects(new Error('Fake error for testing'));
    //         jest.spyOn(tracer, 'getRootXrayTraceId').mockImplementation(() => 'fake-trace-id');
    //         expect(tracer.getRootXrayTraceId()).toEqual('fake-trace-id');
    //     });
    //     it('should return 500 error', async () => {
    //         let lambda = import('../index');
    //         const mockedEvent = {
    //             ...event,
    //             resource: '/deployments',
    //             httpMethod: 'POST',
    //             requestContext: { identity: { user: 'fake-user' } }
    //         };
    //         expect(await (await lambda).lambdaHandler(mockedEvent)).toEqual({ statusCode: 500 });
    //     });
    //     afterAll(() => {
    //         cfnMockedClient.reset();
    //         jest.clearAllMocks();
    //     });
    // });
    describe('on success', () => {
        beforeAll(() => {
            cfnMockedClient.on(client_cloudformation_1.CreateStackCommand).resolves({
                StackId: 'fake-stack-id'
            });
            ddbMockedClient.on(client_dynamodb_1.PutItemCommand).resolves({
                Attributes: {
                    StackId: {
                        S: 'fake-stack-id'
                    }
                }
            });
            ssmMockedClient.on(client_ssm_1.PutParameterCommand).resolves({ Version: 1, Tier: client_ssm_1.ParameterTier.INTELLIGENT_TIERING });
            cfnMockedClient.on(client_cloudformation_1.UpdateStackCommand).resolves({
                StackId: 'fake-stack-id'
            });
            ddbMockedClient.on(client_dynamodb_1.UpdateItemCommand).resolves({
                Attributes: {
                    StackId: {
                        S: 'fake-stack-id'
                    }
                }
            });
            cfnMockedClient.on(client_cloudformation_1.DeleteStackCommand).resolves({});
            ddbMockedClient.on(client_dynamodb_1.DeleteItemCommand).resolves({});
            ssmMockedClient.on(client_ssm_1.DeleteParameterCommand).resolves({});
            secretsmanagerMockedClient.on(client_secrets_manager_1.DeleteSecretCommand).resolves({});
            ssmMockedClient.on(client_ssm_1.GetParameterCommand).resolves({
                Parameter: {
                    Name: '/fake-webconfig/key',
                    Type: 'String',
                    Value: '{"ApiEndpoint": "fake.example.com","UserPoolId": "fake-user-pool","UserPoolClientId": "fake-client-id"}'
                }
            });
        });
        it('should create a stack and update ddb for create action', async () => {
            let lambda = Promise.resolve().then(() => __importStar(require('../index')));
            const mockedEvent = {
                ...event,
                resource: '/deployments',
                httpMethod: 'POST',
                requestContext: {
                    authorizer: {
                        UserId: 'fake-user-id'
                    }
                }
            };
            expect(await (await lambda).lambdaHandler(mockedEvent)).toEqual({
                'body': 'SUCCESS',
                'headers': {
                    'Access-Control-Allow-Credentials': true,
                    'Access-Control-Allow-Headers': 'Origin,X-Requested-With,Content-Type,Accept',
                    'Access-Control-Allow-Methods': 'OPTIONS,POST,GET',
                    'Access-Control-Allow-Origin': '*',
                    'Content-Type': 'application/json'
                },
                'isBase64Encoded': false,
                'statusCode': 200
            });
        });
        it('should get deployed stacks with a GET request', async () => {
            let lambda = Promise.resolve().then(() => __importStar(require('../index')));
            ddbMockedClient.on(client_dynamodb_1.ScanCommand).resolves({
                Items: [
                    {
                        'Description': { 'S': 'test case 1' },
                        'CreatedBy': { 'S': 'fake-user-id' },
                        'StackId': {
                            'S': 'arn:aws:cloudformation:us-west-2:123456789012:stack/fake-stack-name/fake-uuid-1'
                        },
                        'Name': { 'S': 'test-1' }
                    },
                    {
                        'Description': { 'S': 'test case 2' },
                        'CreatedBy': { 'S': 'fake-user-id' },
                        'StackId': {
                            'S': 'arn:aws:cloudformation:us-west-2:123456789012:stack/fake-stack-name/fake-uuid-2'
                        },
                        'Name': { 'S': 'test-2' }
                    }
                ],
                ScannedCount: 2,
                LastEvaluatedKey: {
                    'Description': { 'S': 'test case 2' },
                    'CreatedBy': { 'S': 'fake-user-id' },
                    'StackId': {
                        'S': 'arn:aws:cloudformation:us-west-2:123456789012:stack/fake-stack-name/fake-uuid-2'
                    },
                    'Name': { 'S': 'test-2' }
                }
            });
            cfnMockedClient.on(client_cloudformation_1.DescribeStacksCommand).resolves({
                Stacks: [
                    {
                        StackName: 'test',
                        StackId: 'fake-stack-id',
                        CreationTime: new Date(),
                        StackStatus: 'CREATE_COMPLETE',
                        Parameters: [
                            {
                                ParameterKey: 'ChatConfigSSMParameterName',
                                ParameterValue: '/config/fake-id'
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
            });
            ssmMockedClient.on(client_ssm_1.GetParameterCommand, { Name: '/config/fake-id' }).resolves({
                Parameter: {
                    Name: '/config/fake-id',
                    Type: 'String',
                    Value: JSON.stringify({
                        ParamKey1: 'ParamValue1'
                    })
                }
            });
            const mockedEvent = {
                ...event,
                resource: '/deployments',
                httpMethod: 'GET',
                queryStringParameters: {
                    pageSize: '10'
                },
                requestContext: { identity: { user: 'fake-user' } }
            };
            expect(await (await lambda).lambdaHandler(mockedEvent)).toEqual({
                'body': JSON.stringify({
                    'deployments': [
                        {
                            'Description': 'test case 1',
                            'CreatedBy': 'fake-user-id',
                            'StackId': 'arn:aws:cloudformation:us-west-2:123456789012:stack/fake-stack-name/fake-uuid-1',
                            'Name': 'test-1',
                            'status': 'CREATE_COMPLETE',
                            'chatConfigSSMParameterName': '/config/fake-id',
                            'webConfigKey': 'mock-webconfig-ssm-parameter-key',
                            'cloudFrontWebUrl': 'mock-cloudfront-url',
                            'ParamKey1': 'ParamValue1'
                        },
                        {
                            'Description': 'test case 2',
                            'CreatedBy': 'fake-user-id',
                            'StackId': 'arn:aws:cloudformation:us-west-2:123456789012:stack/fake-stack-name/fake-uuid-2',
                            'Name': 'test-2',
                            'status': 'CREATE_COMPLETE',
                            'chatConfigSSMParameterName': '/config/fake-id',
                            'webConfigKey': 'mock-webconfig-ssm-parameter-key',
                            'cloudFrontWebUrl': 'mock-cloudfront-url',
                            'ParamKey1': 'ParamValue1'
                        }
                    ],
                    'scannedCount': 2
                }),
                'headers': {
                    'Access-Control-Allow-Credentials': true,
                    'Access-Control-Allow-Headers': 'Origin,X-Requested-With,Content-Type,Accept',
                    'Access-Control-Allow-Methods': 'OPTIONS,POST,GET',
                    'Access-Control-Allow-Origin': '*',
                    'Content-Type': 'application/json'
                },
                'isBase64Encoded': false,
                'statusCode': 200
            });
        });
        afterAll(() => {
            cfnMockedClient.reset();
            ddbMockedClient.reset();
            ssmMockedClient.reset();
            secretsmanagerMockedClient.reset();
        });
    });
    describe('on failure from missing env vars', () => {
        beforeAll(() => {
            delete process.env[constants_1.USER_POOL_ID_ENV_VAR];
        });
        it('Should fail to invoke lambda since env is not set up correctly', async () => {
            let lambda = Promise.resolve().then(() => __importStar(require('../index')));
            const mockedEvent = {
                ...event,
                resource: '/deployments',
                httpMethod: 'POST',
                requestContext: { identity: { user: 'fake-user' } }
            };
            await expect((await lambda).lambdaHandler(mockedEvent)).rejects.toThrowError('Missing required environment variables: USER_POOL_ID. This should not happen and indicates in issue with your deployment.');
        });
        afterAll(() => {
            process.env[constants_1.USER_POOL_ID_ENV_VAR] = 'fake-user-pool-id';
        });
    });
    afterAll(() => {
        delete process.env.AWS_SDK_USER_AGENT;
        delete process.env[constants_1.POWERTOOLS_METRICS_NAMESPACE_ENV_VAR];
        delete process.env[constants_1.USE_CASES_TABLE_NAME_ENV_VAR];
        delete process.env[constants_1.ARTIFACT_BUCKET_ENV_VAR];
        delete process.env[constants_1.CFN_DEPLOY_ROLE_ARN_ENV_VAR];
        delete process.env[constants_1.USE_CASE_CONFIG_SSM_PARAMETER_PREFIX_ENV_VAR];
        delete process.env[constants_1.COGNITO_POLICY_TABLE_ENV_VAR];
        delete process.env[constants_1.USER_POOL_ID_ENV_VAR];
        delete process.env[constants_1.TEMPLATE_FILE_EXTN_ENV_VAR];
        delete process.env[constants_1.USE_CASE_API_KEY_SUFFIX_ENV_VAR];
        delete process.env[constants_1.IS_INTERNAL_USER_ENV_VAR];
        cfnMockedClient.restore();
        ddbMockedClient.restore();
        ssmMockedClient.restore();
        secretsmanagerMockedClient.restore();
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXgudGVzdC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uL3Rlc3QvaW5kZXgudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUE7Ozs7Ozs7Ozs7O3VIQVd1SDs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUV2SCwwRUFNd0M7QUFDeEMsOERBTWtDO0FBQ2xDLDRFQUE0RjtBQUM1RixvREFNNkI7QUFDN0IsNkRBQWlEO0FBQ2pELGtEQVc0QjtBQUU1QixRQUFRLENBQUMsbUNBQW1DLEVBQUUsR0FBRyxFQUFFO0lBQy9DLElBQUksZUFBb0IsQ0FBQztJQUN6QixJQUFJLGVBQW9CLENBQUM7SUFDekIsSUFBSSxlQUFvQixDQUFDO0lBQ3pCLElBQUksMEJBQStCLENBQUM7SUFDcEMsSUFBSSxLQUFVLENBQUM7SUFFZixTQUFTLENBQUMsR0FBRyxFQUFFO1FBQ1gsT0FBTyxDQUFDLEdBQUcsQ0FBQyxrQkFBa0IsR0FBRyxvREFBb0QsQ0FBQztRQUN0RixPQUFPLENBQUMsR0FBRyxDQUFDLGdEQUFvQyxDQUFDLEdBQUcsVUFBVSxDQUFDO1FBQy9ELE9BQU8sQ0FBQyxHQUFHLENBQUMsd0NBQTRCLENBQUMsR0FBRyxjQUFjLENBQUM7UUFDM0QsT0FBTyxDQUFDLEdBQUcsQ0FBQyxtQ0FBdUIsQ0FBQyxHQUFHLHNCQUFzQixDQUFDO1FBQzlELE9BQU8sQ0FBQyxHQUFHLENBQUMsdUNBQTJCLENBQUMsR0FBRywwQ0FBMEMsQ0FBQztRQUN0RixPQUFPLENBQUMsR0FBRyxDQUFDLHdEQUE0QyxDQUFDLEdBQUcsU0FBUyxDQUFDO1FBQ3RFLE9BQU8sQ0FBQyxHQUFHLENBQUMsd0NBQTRCLENBQUMsR0FBRyxZQUFZLENBQUM7UUFDekQsT0FBTyxDQUFDLEdBQUcsQ0FBQyxnQ0FBb0IsQ0FBQyxHQUFHLG1CQUFtQixDQUFDO1FBQ3hELE9BQU8sQ0FBQyxHQUFHLENBQUMsc0NBQTBCLENBQUMsR0FBRyxPQUFPLENBQUM7UUFDbEQsT0FB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LE9BQU8sQ0FBQyxHQUFHLENBQUMsZ0NBQW9CLENBQUMsQ0FBQztRQUN6QyxPQUFPLE9BQU8sQ0FBQyxHQUFHLENBQUMsc0NBQTBCLENBQUMsQ0FBQztRQUMvQyxPQUFPLE9BQU8sQ0FBQyxHQUFHLENBQUMsMkNBQStCLENBQUMsQ0FBQztRQUNwRCxPQUFPLE9BQU8sQ0FBQyxHQUFHLENBQUMsb0NBQXdCLENBQUMsQ0FBQztRQUU3QyxlQUFlLENBQUMsT0FBTyxFQUFFLENBQUM7UUFDMUIsZUFBZSxDQUFDLE9BQU8sRUFBRSxDQUFDO1FBQzFCLGVBQWUsQ0FBQyxPQUFPLEVBQUUsQ0FBQztRQUMxQiwwQkFBMEIsQ0FBQyxPQUFPLEVBQUUsQ0FBQztJQUN6QyxDQUFDLENBQUMsQ0FBQztBQUNQLENBQUMsQ0FBQyxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKipcbiAqICBDb3B5cmlnaHQgQW1hem9uLmNvbSwgSW5jLiBvciBpdHMgYWZmaWxpYXRlcy4gQWxsIFJpZ2h0cyBSZXNlcnZlZC4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAqXG4gKiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgKlxuICogIExpY2Vuc2VkIHVuZGVyIHRoZSBBcGFjaGUgTGljZW5zZSwgVmVyc2lvbiAyLjAgKHRoZSBcIkxpY2Vuc2VcIikuIFlvdSBtYXkgbm90IHVzZSB0aGlzIGZpbGUgZXhjZXB0IGluIGNvbXBsaWFuY2UgICAgKlxuICogIHdpdGggdGhlIExpY2Vuc2UuIEEgY29weSBvZiB0aGUgTGljZW5zZSBpcyBsb2NhdGVkIGF0ICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICpcbiAqICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAqXG4gKiAgICAgIGh0dHA6Ly93d3cuYXBhY2hlLm9yZy9saWNlbnNlcy9MSUNFTlNFLTIuMCAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgKlxuICogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICpcbiAqICBvciBpbiB0aGUgJ2xpY2Vuc2UnIGZpbGUgYWNjb21wYW55aW5nIHRoaXMgZmlsZS4gVGhpcyBmaWxlIGlzIGRpc3RyaWJ1dGVkIG9uIGFuICdBUyBJUycgQkFTSVMsIFdJVEhPVVQgV0FSUkFOVElFUyAqXG4gKiAgT1IgQ09ORElUSU9OUyBPRiBBTlkgS0lORCwgZXhwcmVzcyBvciBpbXBsaWVkLiBTZWUgdGhlIExpY2Vuc2UgZm9yIHRoZSBzcGVjaWZpYyBsYW5ndWFnZSBnb3Zlcm5pbmcgcGVybWlzc2lvbnMgICAgKlxuICogIGFuZCBsaW1pdGF0aW9ucyB1bmRlciB0aGUgTGljZW5zZS4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICpcbiAqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKiovXG5cbmltcG9ydCB7XG4gICAgQ2xvdWRGb3JtYXRpb25DbGllbnQsXG4gICAgQ3JlYXRlU3RhY2tDb21tYW5kLFxuICAgIERlbGV0ZVN0YWNrQ29tbWFuZCxcbiAgICBEZXNjcmliZVN0YWNrc0NvbW1hbmQsXG4gICAgVXBkYXRlU3RhY2tDb21tYW5kXG59IGZyb20gJ0Bhd3Mtc2RrL2NsaWVudC1jbG91ZGZvcm1hdGlvbic7XG5pbXBvcnQge1xuICAgIERlbGV0ZUl0ZW1Db21tYW5kLFxuICAgIER5bmFtb0RCQ2xpZW50LFxuICAgIFB1dEl0ZW1Db21tYW5kLFxuICAgIFNjYW5Db21tYW5kLFxuICAgIFVwZGF0ZUl0ZW1Db21tYW5kXG59IGZyb20gJ0Bhd3Mtc2RrL2NsaWVudC1keW5hbW9kYic7XG5pbXBvcnQgeyBEZWxldGVTZWNyZXRDb21tYW5kLCBTZWNyZXRzTWFuYWdlckNsaWVudCB9IGZyb20gJ0Bhd3Mtc2RrL2NsaWVudC1zZWNyZXRzLW1hbmFnZXInO1xuaW1wb3J0IHtcbiAgICBEZWxldGVQYXJhbWV0ZXJDb21tYW5kLFxuICAgIEdldFBhcmFtZXRlckNvbW1hbmQsXG4gICAgUHV0UGFyYW1ldGVyQ29tbWFuZCxcbiAgICBTU01DbGllbnQsXG4gICAgUGFyYW1ldGVyVGllclxufSBmcm9tICdAYXdzLXNkay9jbGllbnQtc3NtJztcbmltcG9ydCB7IG1vY2tDbGllbnQgfSBmcm9tICdhd3Mtc2RrLWNsaWVudC1tb2NrJztcbmltcG9ydCB7XG4gICAgQVJUSUZBQ1RfQlVDS0VUX0VOVl9WQVIsXG4gICAgQ0ZOX0RFUExPWV9ST0xFX0FSTl9FTlZfVkFSLFxuICAgIENPR05JVE9fUE9MSUNZX1RBQkxFX0VOVl9WQVIsXG4gICAgSVNfSU5URVJOQUxfVVNFUl9FTlZfVkFSLFxuICAgIFBPV0VSVE9PTFNfTUVUUklDU19OQU1FU1BBQ0VfRU5WX1ZBUixcbiAgICBURU1QTEFURV9GSUxFX0VYVE5fRU5WX1ZBUixcbiAgICBVU0VSX1BPT0xfSURfRU5WX1ZBUixcbiAgICBVU0VfQ0FTRVNfVEFCTEVfTkFNRV9FTlZfVkFSLFxuICAgIFVTRV9DQVNFX0FQSV9LRVlfU1VGRklYX0VOVl9WQVIsXG4gICAgVVNFX0NBU0VfQ09ORklHX1NTTV9QQVJBTUVURVJfUFJFRklYX0VOVl9WQVJcbn0gZnJvbSAnLi4vdXRpbHMvY29uc3RhbnRzJztcblxuZGVzY3JpYmUoJ1doZW4gaW52b2tpbmcgdGhlIGxhbWJkYSBmdW5jdGlvbicsICgpID0+IHtcbiAgICBsZXQgY2ZuTW9ja2VkQ2xpZW50OiBhbnk7XG4gICAgbGV0IGRkYk1vY2tlZENsaWVudDogYW55O1xuICAgIGxldCBzc21Nb2NrZWRDbGllbnQ6IGFueTtcbiAgICBsZXQgc2VjcmV0c21hbmFnZXJNb2NrZWRDbGllbnQ6IGFueTtcbiAgICBsZXQgZXZlbnQ6IGFueTtcblxuICAgIGJlZm9yZUFsbCgoKSA9PiB7XG4gICAgICAgIHByb2Nlc3MuZW52LkFXU19TREtfVVNFUl9BR0VOVCA9IGB7IFwiY3VzdG9tVXNlckFnZW50XCI6IFwiQXdzU29sdXRpb24vU08wMjc2L3YyLjAuMFwiIH1gO1xuICAgICAgICBwcm9jZXNzLmVudltQT1dFUlRPT0xTX01FVFJJQ1NfTkFNRVNQQUNFX0VOVl9WQVJdID0gJ1VuaXRUZXN0JztcbiAgICAgICAgcHJvY2Vzcy5lbnZbVVNFX0NBU0VTX1RBQkxFX05BTUVfRU5WX1ZBUl0gPSAnVXNlQ2FzZVRhYmxlJztcbiAgICAgICAgcHJvY2Vzcy5lbnZbQVJUSUZBQ1RfQlVDS0VUX0VOVl9WQVJdID0gJ2Zha2UtYXJ0aWZhY3QtYnVja2V0JztcbiAgICAgICAgcHJvY2Vzcy5lbnZbQ0ZOX0RFUExPWV9ST0xFX0FSTl9FTlZfVkFSXSA9ICdhcm46YXdzOmlhbTo6MTIzNDU2Nzg5MDEyOnJvbGUvZmFrZS1yb2xlJztcbiAgICAgICAgcHJvY2Vzcy5lbnZbVVNFX0NBU0VfQ09ORklHX1NTTV9QQVJBTUVURVJfUFJFRklYX0VOVl9WQVJdID0gJy9jb25maWcnO1xuICAgICAgICBwcm9jZXNzLmVudltDT0dOSVRPX1BPTElDWV9UQUJMRV9FTlZfVkFSXSA9ICdmYWtlLXRhYmxlJztcbiAgICAgICAgcHJvY2Vzcy5lbnZbVVNFUl9QT09MX0lEX0VOVl9WQVJdID0gJ2Zha2UtdXNlci1wb29sLWlkJztcbiAgICAgICAgcHJvY2Vzcy5lbnZbVEVNUExBVEVfRklMRV9FWFROX0VOVl9WQVJdID0gJy5qc29uJztcbiAgICAgICAgcHJvY2Vzcy5lbnZbVVNFX0NBU0VfQVBJX0tFWV9TVUZGSVhfRU5WX1ZBUl0gPSAnYXBpLWtleSc7XG4gICAgICAgIHByb2Nlc3MuZW52W0lTX0lOVEVSTkFMX1VTRVJfRU5WX1ZBUl0gPSAndHJ1ZSc7XG5cbiAgICAgICAgZXZlbnQgPSB7XG4gICAgICAgICAgICBib2R5OiBKU09OLnN0cmluZ2lmeSh7XG4gICAgICAgICAgICAgICAgQ29udmVyc2F0aW9uTWVtb3J5VHlwZTogJ0REQk1lbW9yeVR5cGUnLFxuICAgICAgICAgICAgICAgIENvbnZlcnNhdGlvbk1lbW9yeVBhcmFtczogJ0NvbnZlcnNhdGlvbk1lbW9yeVBhcmFtcycsXG4gICAgICAgICAgICAgICAgS25vd2xlZGdlQmFzZVR5cGU6ICdLZW5kcmEnLFxuICAgICAgICAgICAgICAgIEtub3dsZWRnZUJhc2VQYXJhbXM6IHtcbiAgICAgICAgICAgICAgICAgICAgTnVtYmVyT2ZEb2NzOiAnNScsXG4gICAgICAgICAgICAgICAgICAgIFJldHVyblNvdXJjZURvY3M6ICc1J1xuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgTGxtUGFyYW1zOiB7XG4gICAgICAgICAgICAgICAgICAgIE1vZGVsUHJvdmlkZXI6ICdIdWdnaW5nRmFjZScsXG4gICAgICAgICAgICAgICAgICAgIE1vZGVsSWQ6ICdnb29nbGUvZmxhbi10NS14eGwnLFxuICAgICAgICAgICAgICAgICAgICBNb2RlbFBhcmFtczogJ1BhcmFtMScsXG4gICAgICAgICAgICAgICAgICAgIFByb21wdFRlbXBsYXRlOiAnUHJvbXB0MScsXG4gICAgICAgICAgICAgICAgICAgIFN0cmVhbWluZzogdHJ1ZSxcbiAgICAgICAgICAgICAgICAgICAgUkFHRW5hYmxlZDogdHJ1ZSxcbiAgICAgICAgICAgICAgICAgICAgVGVtcGVyYXR1cmU6IDAuMVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pXG4gICAgICAgIH07XG5cbiAgICAgICAgY2ZuTW9ja2VkQ2xpZW50ID0gbW9ja0NsaWVudChDbG91ZEZvcm1hdGlvbkNsaWVudCk7XG4gICAgICAgIGRkYk1vY2tlZENsaWVudCA9IG1vY2tDbGllbnQoRHluYW1vREJDbGllbnQpO1xuICAgICAgICBzc21Nb2NrZWRDbGllbnQgPSBtb2NrQ2xpZW50KFNTTUNsaWVudCk7XG4gICAgICAgIHNlY3JldHNtYW5hZ2VyTW9ja2VkQ2xpZW50ID0gbW9ja0NsaWVudChTZWNyZXRzTWFuYWdlckNsaWVudCk7XG4gICAgfSk7XG5cbiAgICAvLyBkZXNjcmliZSgnb24gY2ZuIGZhaWx1cmUnLCAoKSA9PiB7XG4gICAgLy8gICAgIGJlZm9yZUFsbCgoKSA9PiB7XG4gICAgLy8gICAgICAgICBjZm5Nb2NrZWRDbGllbnQucmVzZXQoKTtcbiAgICAvLyAgICAgICAgIGNmbk1vY2tlZENsaWVudC5vbihDcmVhdGVTdGFja0NvbW1hbmQpLnJlamVjdHMobmV3IEVycm9yKCdGYWtlIGVycm9yIGZvciB0ZXN0aW5nJykpO1xuICAgIC8vICAgICAgICAgY2ZuTW9ja2VkQ2xpZW50Lm9uKFVwZGF0ZVN0YWNrQ29tbWFuZCkucmVqZWN0cyhuZXcgRXJyb3IoJ0Zha2UgZXJyb3IgZm9yIHRlc3RpbmcnKSk7XG4gICAgLy8gICAgICAgICBjZm5Nb2NrZWRDbGllbnQub24oRGVsZXRlU3RhY2tDb21tYW5kKS5yZWplY3RzKG5ldyBFcnJvcignRmFrZSBlcnJvciBmb3IgdGVzdGluZycpKTtcblxuICAgIC8vICAgICAgICAgamVzdC5zcHlPbih0cmFjZXIsICdnZXRSb290WHJheVRyYWNlSWQnKS5tb2NrSW1wbGVtZW50YXRpb24oKCkgPT4gJ2Zha2UtdHJhY2UtaWQnKTtcbiAgICAvLyAgICAgICAgIGV4cGVjdCh0cmFjZXIuZ2V0Um9vdFhyYXlUcmFjZUlkKCkpLnRvRXF1YWwoJ2Zha2UtdHJhY2UtaWQnKTtcbiAgICAvLyAgICAgfSk7XG5cbiAgICAvLyAgICAgaXQoJ3Nob3VsZCByZXR1cm4gNTAwIGVycm9yJywgYXN5bmMgKCkgPT4ge1xuICAgIC8vICAgICAgICAgbGV0IGxhbWJkYSA9IGltcG9ydCgnLi4vaW5kZXgnKTtcblxuICAgIC8vICAgICAgICAgY29uc3QgbW9ja2VkRXZlbnQgPSB7XG4gICAgLy8gICAgICAgICAgICAgLi4uZXZlbnQsXG4gICAgLy8gICAgICAgICAgICAgcmVzb3VyY2U6ICcvZGVwbG95bWVudHMnLFxuICAgIC8vICAgICAgICAgICAgIGh0dHBNZXRob2Q6ICdQT1NUJyxcbiAgICAvLyAgICAgICAgICAgICByZXF1ZXN0Q29udGV4dDogeyBpZGVudGl0eTogeyB1c2VyOiAnZmFrZS11c2VyJyB9IH1cbiAgICAvLyAgICAgICAgIH07XG4gICAgLy8gICAgICAgICBleHBlY3QoYXdhaXQgKGF3YWl0IGxhbWJkYSkubGFtYmRhSGFuZGxlcihtb2NrZWRFdmVudCkpLnRvRXF1YWwoeyBzdGF0dXNDb2RlOiA1MDAgfSk7XG4gICAgLy8gICAgIH0pO1xuXG4gICAgLy8gICAgIGFmdGVyQWxsKCgpID0+IHtcbiAgICAvLyAgICAgICAgIGNmbk1vY2tlZENsaWVudC5yZXNldCgpO1xuICAgIC8vICAgICAgICAgamVzdC5jbGVhckFsbE1vY2tzKCk7XG4gICAgLy8gICAgIH0pO1xuICAgIC8vIH0pO1xuXG4gICAgZGVzY3JpYmUoJ29uIHN1Y2Nlc3MnLCAoKSA9PiB7XG4gICAgICAgIGJlZm9yZUFsbCgoKSA9PiB7XG4gICAgICAgICAgICBjZm5Nb2NrZWRDbGllbnQub24oQ3JlYXRlU3RhY2tDb21tYW5kKS5yZXNvbHZlcyh7XG4gICAgICAgICAgICAgICAgU3RhY2tJZDogJ2Zha2Utc3RhY2staWQnXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIGRkYk1vY2tlZENsaWVudC5vbihQdXRJdGVtQ29tbWFuZCkucmVzb2x2ZXMoe1xuICAgICAgICAgICAgICAgIEF0dHJpYnV0ZXM6IHtcbiAgICAgICAgICAgICAgICAgICAgU3RhY2tJZDoge1xuICAgICAgICAgICAgICAgICAgICAgICAgUzogJ2Zha2Utc3RhY2staWQnXG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIHNzbU1vY2tlZENsaWVudC5vbihQdXRQYXJhbWV0ZXJDb21tYW5kKS5yZXNvbHZlcyh7IFZlcnNpb246IDEsIFRpZXI6IFBhcmFtZXRlclRpZXIuSU5URUxMSUdFTlRfVElFUklORyB9KTtcblxuICAgICAgICAgICAgY2ZuTW9ja2VkQ2xpZW50Lm9uKFVwZGF0ZVN0YWNrQ29tbWFuZCkucmVzb2x2ZXMoe1xuICAgICAgICAgICAgICAgIFN0YWNrSWQ6ICdmYWtlLXN0YWNrLWlkJ1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICBkZGJNb2NrZWRDbGllbnQub24oVXBkYXRlSXRlbUNvbW1hbmQpLnJlc29sdmVzKHtcbiAgICAgICAgICAgICAgICBBdHRyaWJ1dGVzOiB7XG4gICAgICAgICAgICAgICAgICAgIFN0YWNrSWQ6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIFM6ICdmYWtlLXN0YWNrLWlkJ1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgIGNmbk1vY2tlZENsaWVudC5vbihEZWxldGVTdGFja0NvbW1hbmQpLnJlc29sdmVzKHt9KTtcbiAgICAgICAgICAgIGRkYk1vY2tlZENsaWVudC5vbihEZWxldGVJdGVtQ29tbWFuZCkucmVzb2x2ZXMoe30pO1xuICAgICAgICAgICAgc3NtTW9ja2VkQ2xpZW50Lm9uKERlbGV0ZVBhcmFtZXRlckNvbW1hbmQpLnJlc29sdmVzKHt9KTtcbiAgICAgICAgICAgIHNlY3JldHNtYW5hZ2VyTW9ja2VkQ2xpZW50Lm9uKERlbGV0ZVNlY3JldENvbW1hbmQpLnJlc29sdmVzKHt9KTtcblxuICAgICAgICAgICAgc3NtTW9ja2VkQ2xpZW50Lm9uKEdldFBhcmFtZXRlckNvbW1hbmQpLnJlc29sdmVzKHtcbiAgICAgICAgICAgICAgICBQYXJhbWV0ZXI6IHtcbiAgICAgICAgICAgICAgICAgICAgTmFtZTogJy9mYWtlLXdlYmNvbmZpZy9rZXknLFxuICAgICAgICAgICAgICAgICAgICBUeXBlOiAnU3RyaW5nJyxcbiAgICAgICAgICAgICAgICAgICAgVmFsdWU6ICd7XCJBcGlFbmRwb2ludFwiOiBcImZha2UuZXhhbXBsZS5jb21cIixcIlVzZXJQb29sSWRcIjogXCJmYWtlLXVzZXItcG9vbFwiLFwiVXNlclBvb2xDbGllbnRJZFwiOiBcImZha2UtY2xpZW50LWlkXCJ9J1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9KTtcblxuICAgICAgICBpdCgnc2hvdWxkIGNyZWF0ZSBhIHN0YWNrIGFuZCB1cGRhdGUgZGRiIGZvciBjcmVhdGUgYWN0aW9uJywgYXN5bmMgKCkgPT4ge1xuICAgICAgICAgICAgbGV0IGxhbWJkYSA9IGltcG9ydCgnLi4vaW5kZXgnKTtcblxuICAgICAgICAgICAgY29uc3QgbW9ja2VkRXZlbnQgPSB7XG4gICAgICAgICAgICAgICAgLi4uZXZlbnQsXG4gICAgICAgICAgICAgICAgcmVzb3VyY2U6ICcvZGVwbG95bWVudHMnLFxuICAgICAgICAgICAgICAgIGh0dHBNZXRob2Q6ICdQT1NUJyxcbiAgICAgICAgICAgICAgICByZXF1ZXN0Q29udGV4dDoge1xuICAgICAgICAgICAgICAgICAgICBhdXRob3JpemVyOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBVc2VySWQ6ICdmYWtlLXVzZXItaWQnXG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9O1xuICAgICAgICAgICAgZXhwZWN0KGF3YWl0IChhd2FpdCBsYW1iZGEpLmxhbWJkYUhhbmRsZXIobW9ja2VkRXZlbnQpKS50b0VxdWFsKHtcbiAgICAgICAgICAgICAgICAnYm9keSc6ICdTVUNDRVNTJyxcbiAgICAgICAgICAgICAgICAnaGVhZGVycyc6IHtcbiAgICAgICAgICAgICAgICAgICAgJ0FjY2Vzcy1Db250cm9sLUFsbG93LUNyZWRlbnRpYWxzJzogdHJ1ZSxcbiAgICAgICAgICAgICAgICAgICAgJ0FjY2Vzcy1Db250cm9sLUFsbG93LUhlYWRlcnMnOiAnT3JpZ2luLFgtUmVxdWVzdGVkLVdpdGgsQ29udGVudC1UeXBlLEFjY2VwdCcsXG4gICAgICAgICAgICAgICAgICAgICdBY2Nlc3MtQ29udHJvbC1BbGxvdy1NZXRob2RzJzogJ09QVElPTlMsUE9TVCxHRVQnLFxuICAgICAgICAgICAgICAgICAgICAnQWNjZXNzLUNvbnRyb2wtQWxsb3ctT3JpZ2luJzogJyonLFxuICAgICAgICAgICAgICAgICAgICAnQ29udGVudC1UeXBlJzogJ2FwcGxpY2F0aW9uL2pzb24nXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAnaXNCYXNlNjRFbmNvZGVkJzogZmFsc2UsXG4gICAgICAgICAgICAgICAgJ3N0YXR1c0NvZGUnOiAyMDBcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9KTtcblxuICAgICAgICBpdCgnc2hvdWxkIGdldCBkZXBsb3llZCBzdGFja3Mgd2l0aCBhIEdFVCByZXF1ZXN0JywgYXN5bmMgKCkgPT4ge1xuICAgICAgICAgICAgbGV0IGxhbWJkYSA9IGltcG9ydCgnLi4vaW5kZXgnKTtcblxuICAgICAgICAgICAgZGRiTW9ja2VkQ2xpZW50Lm9uKFNjYW5Db21tYW5kKS5yZXNvbHZlcyh7XG4gICAgICAgICAgICAgICAgSXRlbXM6IFtcbiAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgJ0Rlc2NyaXB0aW9uJzogeyAnUyc6ICd0ZXN0IGNhc2UgMScgfSxcbiAgICAgICAgICAgICAgICAgICAgICAgICdDcmVhdGVkQnknOiB7ICdTJzogJ2Zha2UtdXNlci1pZCcgfSxcbiAgICAgICAgICAgICAgICAgICAgICAgICdTdGFja0lkJzoge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICdTJzogJ2Fybjphd3M6Y2xvdWRmb3JtYXRpb246dXMtd2VzdC0yOjEyMzQ1Njc4OTAxMjpzdGFjay9mYWtlLXN0YWNrLW5hbWUvZmFrZS11dWlkLTEnXG4gICAgICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICAgICAgJ05hbWUnOiB7ICdTJzogJ3Rlc3QtMScgfVxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICAnRGVzY3JpcHRpb24nOiB7ICdTJzogJ3Rlc3QgY2FzZSAyJyB9LFxuICAgICAgICAgICAgICAgICAgICAgICAgJ0NyZWF0ZWRCeSc6IHsgJ1MnOiAnZmFrZS11c2VyLWlkJyB9LFxuICAgICAgICAgICAgICAgICAgICAgICAgJ1N0YWNrSWQnOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgJ1MnOiAnYXJuOmF3czpjbG91ZGZvcm1hdGlvbjp1cy13ZXN0LTI6MTIzNDU2Nzg5MDEyOnN0YWNrL2Zha2Utc3RhY2stbmFtZS9mYWtlLXV1aWQtMidcbiAgICAgICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgICAgICAnTmFtZSc6IHsgJ1MnOiAndGVzdC0yJyB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBdLFxuICAgICAgICAgICAgICAgIFNjYW5uZWRDb3VudDogMixcbiAgICAgICAgICAgICAgICBMYXN0RXZhbHVhdGVkS2V5OiB7XG4gICAgICAgICAgICAgICAgICAgICdEZXNjcmlwdGlvbic6IHsgJ1MnOiAndGVzdCBjYXNlIDInIH0sXG4gICAgICAgICAgICAgICAgICAgICdDcmVhdGVkQnknOiB7ICdTJzogJ2Zha2UtdXNlci1pZCcgfSxcbiAgICAgICAgICAgICAgICAgICAgJ1N0YWNrSWQnOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAnUyc6ICdhcm46YXdzOmNsb3VkZm9ybWF0aW9uOnVzLXdlc3QtMjoxMjM0NTY3ODkwMTI6c3RhY2svZmFrZS1zdGFjay1uYW1lL2Zha2UtdXVpZC0yJ1xuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICAnTmFtZSc6IHsgJ1MnOiAndGVzdC0yJyB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgIGNmbk1vY2tlZENsaWVudC5vbihEZXNjcmliZVN0YWNrc0NvbW1hbmQpLnJlc29sdmVzKHtcbiAgICAgICAgICAgICAgICBTdGFja3M6IFtcbiAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgU3RhY2tOYW1lOiAndGVzdCcsXG4gICAgICAgICAgICAgICAgICAgICAgICBTdGFja0lkOiAnZmFrZS1zdGFjay1pZCcsXG4gICAgICAgICAgICAgICAgICAgICAgICBDcmVhdGlvblRpbWU6IG5ldyBEYXRlKCksXG4gICAgICAgICAgICAgICAgICAgICAgICBTdGFja1N0YXR1czogJ0NSRUFURV9DT01QTEVURScsXG4gICAgICAgICAgICAgICAgICAgICAgICBQYXJhbWV0ZXJzOiBbXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBQYXJhbWV0ZXJLZXk6ICdDaGF0Q29uZmlnU1NNUGFyYW1ldGVyTmFtZScsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFBhcmFtZXRlclZhbHVlOiAnL2NvbmZpZy9mYWtlLWlkJ1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIF0sXG4gICAgICAgICAgICAgICAgICAgICAgICBPdXRwdXRzOiBbXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBPdXRwdXRLZXk6ICdXZWJDb25maWdLZXknLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBPdXRwdXRWYWx1ZTogJ21vY2std2ViY29uZmlnLXNzbS1wYXJhbWV0ZXIta2V5J1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBPdXRwdXRLZXk6ICdDbG91ZEZyb250V2ViVXJsJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgT3V0cHV0VmFsdWU6ICdtb2NrLWNsb3VkZnJvbnQtdXJsJ1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIF1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIF1cbiAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICBzc21Nb2NrZWRDbGllbnQub24oR2V0UGFyYW1ldGVyQ29tbWFuZCwgeyBOYW1lOiAnL2NvbmZpZy9mYWtlLWlkJyB9KS5yZXNvbHZlcyh7XG4gICAgICAgICAgICAgICAgUGFyYW1ldGVyOiB7XG4gICAgICAgICAgICAgICAgICAgIE5hbWU6ICcvY29uZmlnL2Zha2UtaWQnLFxuICAgICAgICAgICAgICAgICAgICBUeXBlOiAnU3RyaW5nJyxcbiAgICAgICAgICAgICAgICAgICAgVmFsdWU6IEpTT04uc3RyaW5naWZ5KHtcbiAgICAgICAgICAgICAgICAgICAgICAgIFBhcmFtS2V5MTogJ1BhcmFtVmFsdWUxJ1xuICAgICAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICBjb25zdCBtb2NrZWRFdmVudCA9IHtcbiAgICAgICAgICAgICAgICAuLi5ldmVudCxcbiAgICAgICAgICAgICAgICByZXNvdXJjZTogJy9kZXBsb3ltZW50cycsXG4gICAgICAgICAgICAgICAgaHR0cE1ldGhvZDogJ0dFVCcsXG4gICAgICAgICAgICAgICAgcXVlcnlTdHJpbmdQYXJhbWV0ZXJzOiB7XG4gICAgICAgICAgICAgICAgICAgIHBhZ2VTaXplOiAnMTAnXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICByZXF1ZXN0Q29udGV4dDogeyBpZGVudGl0eTogeyB1c2VyOiAnZmFrZS11c2VyJyB9IH1cbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIGV4cGVjdChhd2FpdCAoYXdhaXQgbGFtYmRhKS5sYW1iZGFIYW5kbGVyKG1vY2tlZEV2ZW50KSkudG9FcXVhbCh7XG4gICAgICAgICAgICAgICAgJ2JvZHknOiBKU09OLnN0cmluZ2lmeSh7XG4gICAgICAgICAgICAgICAgICAgICdkZXBsb3ltZW50cyc6IFtcbiAgICAgICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAnRGVzY3JpcHRpb24nOiAndGVzdCBjYXNlIDEnLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICdDcmVhdGVkQnknOiAnZmFrZS11c2VyLWlkJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAnU3RhY2tJZCc6XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICdhcm46YXdzOmNsb3VkZm9ybWF0aW9uOnVzLXdlc3QtMjoxMjM0NTY3ODkwMTI6c3RhY2svZmFrZS1zdGFjay1uYW1lL2Zha2UtdXVpZC0xJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAnTmFtZSc6ICd0ZXN0LTEnLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICdzdGF0dXMnOiAnQ1JFQVRFX0NPTVBMRVRFJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAnY2hhdENvbmZpZ1NTTVBhcmFtZXRlck5hbWUnOiAnL2NvbmZpZy9mYWtlLWlkJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAnd2ViQ29uZmlnS2V5JzogJ21vY2std2ViY29uZmlnLXNzbS1wYXJhbWV0ZXIta2V5JyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAnY2xvdWRGcm9udFdlYlVybCc6ICdtb2NrLWNsb3VkZnJvbnQtdXJsJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAnUGFyYW1LZXkxJzogJ1BhcmFtVmFsdWUxJ1xuICAgICAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAnRGVzY3JpcHRpb24nOiAndGVzdCBjYXNlIDInLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICdDcmVhdGVkQnknOiAnZmFrZS11c2VyLWlkJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAnU3RhY2tJZCc6XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICdhcm46YXdzOmNsb3VkZm9ybWF0aW9uOnVzLXdlc3QtMjoxMjM0NTY3ODkwMTI6c3RhY2svZmFrZS1zdGFjay1uYW1lL2Zha2UtdXVpZC0yJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAnTmFtZSc6ICd0ZXN0LTInLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICdzdGF0dXMnOiAnQ1JFQVRFX0NPTVBMRVRFJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAnY2hhdENvbmZpZ1NTTVBhcmFtZXRlck5hbWUnOiAnL2NvbmZpZy9mYWtlLWlkJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAnd2ViQ29uZmlnS2V5JzogJ21vY2std2ViY29uZmlnLXNzbS1wYXJhbWV0ZXIta2V5JyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAnY2xvdWRGcm9udFdlYlVybCc6ICdtb2NrLWNsb3VkZnJvbnQtdXJsJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAnUGFyYW1LZXkxJzogJ1BhcmFtVmFsdWUxJ1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBdLFxuICAgICAgICAgICAgICAgICAgICAnc2Nhbm5lZENvdW50JzogMlxuICAgICAgICAgICAgICAgIH0pLFxuICAgICAgICAgICAgICAgICdoZWFkZXJzJzoge1xuICAgICAgICAgICAgICAgICAgICAnQWNjZXNzLUNvbnRyb2wtQWxsb3ctQ3JlZGVudGlhbHMnOiB0cnVlLFxuICAgICAgICAgICAgICAgICAgICAnQWNjZXNzLUNvbnRyb2wtQWxsb3ctSGVhZGVycyc6ICdPcmlnaW4sWC1SZXF1ZXN0ZWQtV2l0aCxDb250ZW50LVR5cGUsQWNjZXB0JyxcbiAgICAgICAgICAgICAgICAgICAgJ0FjY2Vzcy1Db250cm9sLUFsbG93LU1ldGhvZHMnOiAnT1BUSU9OUyxQT1NULEdFVCcsXG4gICAgICAgICAgICAgICAgICAgICdBY2Nlc3MtQ29udHJvbC1BbGxvdy1PcmlnaW4nOiAnKicsXG4gICAgICAgICAgICAgICAgICAgICdDb250ZW50LVR5cGUnOiAnYXBwbGljYXRpb24vanNvbidcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICdpc0Jhc2U2NEVuY29kZWQnOiBmYWxzZSxcbiAgICAgICAgICAgICAgICAnc3RhdHVzQ29kZSc6IDIwMFxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIGFmdGVyQWxsKCgpID0+IHtcbiAgICAgICAgICAgIGNmbk1vY2tlZENsaWVudC5yZXNldCgpO1xuICAgICAgICAgICAgZGRiTW9ja2VkQ2xpZW50LnJlc2V0KCk7XG4gICAgICAgICAgICBzc21Nb2NrZWRDbGllbnQucmVzZXQoKTtcbiAgICAgICAgICAgIHNlY3JldHNtYW5hZ2VyTW9ja2VkQ2xpZW50LnJlc2V0KCk7XG4gICAgICAgIH0pO1xuICAgIH0pO1xuXG4gICAgZGVzY3JpYmUoJ29uIGZhaWx1cmUgZnJvbSBtaXNzaW5nIGVudiB2YXJzJywgKCkgPT4ge1xuICAgICAgICBiZWZvcmVBbGwoKCkgPT4ge1xuICAgICAgICAgICAgZGVsZXRlIHByb2Nlc3MuZW52W1VTRVJfUE9PTF9JRF9FTlZfVkFSXTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgaXQoJ1Nob3VsZCBmYWlsIHRvIGludm9rZSBsYW1iZGEgc2luY2UgZW52IGlzIG5vdCBzZXQgdXAgY29ycmVjdGx5JywgYXN5bmMgKCkgPT4ge1xuICAgICAgICAgICAgbGV0IGxhbWJkYSA9IGltcG9ydCgnLi4vaW5kZXgnKTtcblxuICAgICAgICAgICAgY29uc3QgbW9ja2VkRXZlbnQgPSB7XG4gICAgICAgICAgICAgICAgLi4uZXZlbnQsXG4gICAgICAgICAgICAgICAgcmVzb3VyY2U6ICcvZGVwbG95bWVudHMnLFxuICAgICAgICAgICAgICAgIGh0dHBNZXRob2Q6ICdQT1NUJyxcbiAgICAgICAgICAgICAgICByZXF1ZXN0Q29udGV4dDogeyBpZGVudGl0eTogeyB1c2VyOiAnZmFrZS11c2VyJyB9IH1cbiAgICAgICAgICAgIH07XG4gICAgICAgICAgICBhd2FpdCBleHBlY3QoKGF3YWl0IGxhbWJkYSkubGFtYmRhSGFuZGxlcihtb2NrZWRFdmVudCkpLnJlamVjdHMudG9UaHJvd0Vycm9yKFxuICAgICAgICAgICAgICAgICdNaXNzaW5nIHJlcXVpcmVkIGVudmlyb25tZW50IHZhcmlhYmxlczogVVNFUl9QT09MX0lELiBUaGlzIHNob3VsZCBub3QgaGFwcGVuIGFuZCBpbmRpY2F0ZXMgaW4gaXNzdWUgd2l0aCB5b3VyIGRlcGxveW1lbnQuJ1xuICAgICAgICAgICAgKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgYWZ0ZXJBbGwoKCkgPT4ge1xuICAgICAgICAgICAgcHJvY2Vzcy5lbnZbVVNFUl9QT09MX0lEX0VOVl9WQVJdID0gJ2Zha2UtdXNlci1wb29sLWlkJztcbiAgICAgICAgfSk7XG4gICAgfSk7XG5cbiAgICBhZnRlckFsbCgoKSA9PiB7XG4gICAgICAgIGRlbGV0ZSBwcm9jZXNzLmVudi5BV1NfU0RLX1VTRVJfQUdFTlQ7XG4gICAgICAgIGRlbGV0ZSBwcm9jZXNzLmVudltQT1dFUlRPT0xTX01FVFJJQ1NfTkFNRVNQQUNFX0VOVl9WQVJdO1xuICAgICAgICBkZWxldGUgcHJvY2Vzcy5lbnZbVVNFX0NBU0VTX1RBQkxFX05BTUVfRU5WX1ZBUl07XG4gICAgICAgIGRlbGV0ZSBwcm9jZXNzLmVudltBUlRJRkFDVF9CVUNLRVRfRU5WX1ZBUl07XG4gICAgICAgIGRlbGV0ZSBwcm9jZXNzLmVudltDRk5fREVQTE9ZX1JPTEVfQVJOX0VOVl9WQVJdO1xuICAgICAgICBkZWxldGUgcHJvY2Vzcy5lbnZbVVNFX0NBU0VfQ09ORklHX1NTTV9QQVJBTUVURVJfUFJFRklYX0VOVl9WQVJdO1xuICAgICAgICBkZWxldGUgcHJvY2Vzcy5lbnZbQ09HTklUT19QT0xJQ1lfVEFCTEVfRU5WX1ZBUl07XG4gICAgICAgIGRlbGV0ZSBwcm9jZXNzLmVudltVU0VSX1BPT0xfSURfRU5WX1ZBUl07XG4gICAgICAgIGRlbGV0ZSBwcm9jZXNzLmVudltURU1QTEFURV9GSUxFX0VYVE5fRU5WX1ZBUl07XG4gICAgICAgIGRlbGV0ZSBwcm9jZXNzLmVudltVU0VfQ0FTRV9BUElfS0VZX1NVRkZJWF9FTlZfVkFSXTtcbiAgICAgICAgZGVsZXRlIHByb2Nlc3MuZW52W0lTX0lOVEVSTkFMX1VTRVJfRU5WX1ZBUl07XG5cbiAgICAgICAgY2ZuTW9ja2VkQ2xpZW50LnJlc3RvcmUoKTtcbiAgICAgICAgZGRiTW9ja2VkQ2xpZW50LnJlc3RvcmUoKTtcbiAgICAgICAgc3NtTW9ja2VkQ2xpZW50LnJlc3RvcmUoKTtcbiAgICAgICAgc2VjcmV0c21hbmFnZXJNb2NrZWRDbGllbnQucmVzdG9yZSgpO1xuICAgIH0pO1xufSk7XG4iXX0=