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
import { APIGatewayEvent } from 'aws-lambda';
import {
    CloudFormationClient,
    CreateStackCommand,
    DeleteStackCommand,
    DescribeStacksCommand,
    UpdateStackCommand
} from '@aws-sdk/client-cloudformation';
import {
    DeleteItemCommand,
    DynamoDBClient,
    PutItemCommand,
    ScanCommand,
    GetItemCommand,
    UpdateItemCommand
} from '@aws-sdk/client-dynamodb';
import { DeleteSecretCommand, SecretsManagerClient } from '@aws-sdk/client-secrets-manager';
import {
    DeleteParameterCommand,
    GetParameterCommand,
    PutParameterCommand,
    SSMClient,
    ParameterTier
} from '@aws-sdk/client-ssm';
import { mockClient } from 'aws-sdk-client-mock';
import {
    ARTIFACT_BUCKET_ENV_VAR,
    CFN_DEPLOY_ROLE_ARN_ENV_VAR,
    COGNITO_POLICY_TABLE_ENV_VAR,
    IS_INTERNAL_USER_ENV_VAR,
    MODEL_INFO_TABLE_NAME_ENV_VAR,
    POWERTOOLS_METRICS_NAMESPACE_ENV_VAR,
    TEMPLATE_FILE_EXTN_ENV_VAR,
    USER_POOL_ID_ENV_VAR,
    USE_CASES_TABLE_NAME_ENV_VAR,
    USE_CASE_API_KEY_SUFFIX_ENV_VAR,
    USE_CASE_CONFIG_SSM_PARAMETER_PREFIX_ENV_VAR
} from '../utils/constants';

import { marshall } from '@aws-sdk/util-dynamodb';
import {
    createUseCaseApiEvent,
    createUseCaseApiEventNoPrompt,
    getUseCaseApiEvent,
    updateUseCaseApiEvent
} from './event-test-data';

describe('When invoking the lambda function', () => {
    let cfnMockedClient: any;
    let ddbMockedClient: any;
    let ssmMockedClient: any;
    let secretsmanagerMockedClient: any;

    beforeAll(() => {
        process.env.AWS_SDK_USER_AGENT = `{ "customUserAgent": "AWSSOLUTION/SO0276/v2.0.0" }`;
        process.env[POWERTOOLS_METRICS_NAMESPACE_ENV_VAR] = 'UnitTest';
        process.env[USE_CASES_TABLE_NAME_ENV_VAR] = 'UseCaseTable';
        process.env[ARTIFACT_BUCKET_ENV_VAR] = 'fake-artifact-bucket';
        process.env[CFN_DEPLOY_ROLE_ARN_ENV_VAR] = 'arn:aws:iam::123456789012:role/fake-role';
        process.env[USE_CASE_CONFIG_SSM_PARAMETER_PREFIX_ENV_VAR] = '/config';
        process.env[COGNITO_POLICY_TABLE_ENV_VAR] = 'fake-table';
        process.env[USER_POOL_ID_ENV_VAR] = 'fake-user-pool-id';
        process.env[TEMPLATE_FILE_EXTN_ENV_VAR] = '.json';
        process.env[USE_CASE_API_KEY_SUFFIX_ENV_VAR] = 'api-key';
        process.env[IS_INTERNAL_USER_ENV_VAR] = 'true';
        process.env[MODEL_INFO_TABLE_NAME_ENV_VAR] = 'fake-model-table';

        cfnMockedClient = mockClient(CloudFormationClient);
        ddbMockedClient = mockClient(DynamoDBClient);
        ssmMockedClient = mockClient(SSMClient);
        secretsmanagerMockedClient = mockClient(SecretsManagerClient);
    });

    describe('on success', () => {
        beforeAll(() => {
            cfnMockedClient.on(CreateStackCommand).resolves({
                StackId: 'fake-stack-id'
            });
            ddbMockedClient.on(PutItemCommand).resolves({
                Attributes: {
                    StackId: {
                        S: 'fake-stack-id'
                    }
                }
            });
            ssmMockedClient.on(PutParameterCommand).resolves({ Version: 1, Tier: ParameterTier.INTELLIGENT_TIERING });

            cfnMockedClient.on(UpdateStackCommand).resolves({
                StackId: 'fake-stack-id'
            });
            ddbMockedClient.on(UpdateItemCommand).resolves({
                Attributes: {
                    StackId: {
                        S: 'fake-stack-id'
                    }
                }
            });

            cfnMockedClient.on(DeleteStackCommand).resolves({});
            ddbMockedClient.on(DeleteItemCommand).resolves({});
            ssmMockedClient.on(DeleteParameterCommand).resolves({});
            secretsmanagerMockedClient.on(DeleteSecretCommand).resolves({});

            ssmMockedClient.on(GetParameterCommand).resolves({
                Parameter: {
                    Name: '/fake-webconfig/key',
                    Type: 'String',
                    Value: '{"ApiEndpoint": "fake.example.com","UserPoolId": "fake-user-pool","UserPoolClientId": "fake-client-id"}'
                }
            });

            ddbMockedClient
                .on(GetItemCommand, {
                    TableName: 'fake-model-table',
                    Key: { SortKey: { S: 'HuggingFace#google/flan-t5-xxl' }, UseCase: { S: 'RAGChat' } }
                })
                .resolves({
                    Item: marshall({
                        'UseCase': 'RAGChat',
                        'SortKey': 'HuggingFace#google/flan-t5-xxl',
                        'ModelProviderName': 'HuggingFace-InferenceEndpoint',
                        'ModelName': 'google/flan-t5-xxl',
                        'AllowsStreaming': false,
                        'Prompt': 'Prompt2 {input}\n\n{history}\n\n{context}',
                        'MaxTemperature': '100',
                        'DefaultTemperature': '0.1',
                        'MinTemperature': '0',
                        'DefaultStopSequences': [],
                        'MemoryConfig': {
                            'history': 'chat_history',
                            'input': 'question',
                            'context': 'context',
                            'ai_prefix': 'AI',
                            'human_prefix': 'Human',
                            'output': 'answer'
                        },
                        'MaxPromptSize': 2000,
                        'MaxChatMessageSize': 2500
                    })
                });
            ddbMockedClient
                .on(GetItemCommand, {
                    TableName: 'UseCaseTable',
                    Key: { UseCaseId: { S: '11111111-222222222-33333333-44444444-55555555' } }
                })
                .resolves({
                    Item: marshall({
                        UseCaseId: 'fake-id',
                        StackId: 'fake-stack-id',
                        SSMParameterKey: '/config/fake-uuid/old'
                    })
                });
            ssmMockedClient.on(GetParameterCommand).resolves({
                Parameter: {
                    Name: '/config/fake-uuid/old',
                    Type: 'String',
                    Value: '{"ParamKey1":"OldParamValue"}'
                }
            });
        });

        it('should create a stack and update ddb for create action', async () => {
            let lambda = import('../index');

            expect(await (await lambda).lambdaHandler(createUseCaseApiEvent as unknown as APIGatewayEvent)).toEqual({
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

        it('should create a stack, filling in a prompt template and update ddb for create action', async () => {
            let lambda = import('../index');

            expect(
                await (await lambda).lambdaHandler(createUseCaseApiEventNoPrompt as unknown as APIGatewayEvent)
            ).toEqual({
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

        it('should allow update to a stack', async () => {
            let lambda = import('../index');

            expect(await (await lambda).lambdaHandler(updateUseCaseApiEvent as unknown as APIGatewayEvent)).toEqual({
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
            let lambda = import('../index');

            ddbMockedClient.on(ScanCommand).resolves({
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

            cfnMockedClient.on(DescribeStacksCommand).resolves({
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

            ssmMockedClient.on(GetParameterCommand, { Name: '/config/fake-id' }).resolves({
                Parameter: {
                    Name: '/config/fake-id',
                    Type: 'String',
                    Value: JSON.stringify({
                        ParamKey1: 'ParamValue1'
                    })
                }
            });

            expect(await (await lambda).lambdaHandler(getUseCaseApiEvent as unknown as APIGatewayEvent)).toEqual({
                'body': JSON.stringify({
                    'deployments': [
                        {
                            'Description': 'test case 1',
                            'CreatedBy': 'fake-user-id',
                            'StackId':
                                'arn:aws:cloudformation:us-west-2:123456789012:stack/fake-stack-name/fake-uuid-1',
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
                            'StackId':
                                'arn:aws:cloudformation:us-west-2:123456789012:stack/fake-stack-name/fake-uuid-2',
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
            delete process.env[USER_POOL_ID_ENV_VAR];
        });

        it('Should fail to invoke lambda since env is not set up correctly', async () => {
            let lambda = import('../index');

            await expect(
                (await lambda).lambdaHandler(createUseCaseApiEvent as unknown as APIGatewayEvent)
            ).rejects.toThrowError(
                'Missing required environment variables: USER_POOL_ID. This should not happen and indicates in issue with your deployment.'
            );
        });

        afterAll(() => {
            process.env[USER_POOL_ID_ENV_VAR] = 'fake-user-pool-id';
        });
    });

    afterAll(() => {
        delete process.env.AWS_SDK_USER_AGENT;
        delete process.env[POWERTOOLS_METRICS_NAMESPACE_ENV_VAR];
        delete process.env[USE_CASES_TABLE_NAME_ENV_VAR];
        delete process.env[ARTIFACT_BUCKET_ENV_VAR];
        delete process.env[CFN_DEPLOY_ROLE_ARN_ENV_VAR];
        delete process.env[USE_CASE_CONFIG_SSM_PARAMETER_PREFIX_ENV_VAR];
        delete process.env[COGNITO_POLICY_TABLE_ENV_VAR];
        delete process.env[USER_POOL_ID_ENV_VAR];
        delete process.env[TEMPLATE_FILE_EXTN_ENV_VAR];
        delete process.env[USE_CASE_API_KEY_SUFFIX_ENV_VAR];
        delete process.env[IS_INTERNAL_USER_ENV_VAR];
        delete process.env[MODEL_INFO_TABLE_NAME_ENV_VAR];

        cfnMockedClient.restore();
        ddbMockedClient.restore();
        ssmMockedClient.restore();
        secretsmanagerMockedClient.restore();
    });
});
