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
Object.defineProperty(exports, "__esModule", { value: true });
const client_cloudformation_1 = require("@aws-sdk/client-cloudformation");
const client_dynamodb_1 = require("@aws-sdk/client-dynamodb");
const client_secrets_manager_1 = require("@aws-sdk/client-secrets-manager");
const client_ssm_1 = require("@aws-sdk/client-ssm");
const aws_sdk_client_mock_1 = require("aws-sdk-client-mock");
require("aws-sdk-client-mock-jest");
const command_1 = require("../command");
const list_use_cases_1 = require("../model/list-use-cases");
const use_case_1 = require("../model/use-case");
const constants_1 = require("../utils/constants");
const event_test_data_1 = require("./event-test-data");
describe('When testing Use Case Commands', () => {
    let event;
    let cfnParameters;
    let cfnMockedClient;
    let ddbMockedClient;
    let ssmMockedClient;
    let secretsmanagerMockedClient;
    beforeAll(() => {
        event = event_test_data_1.createUseCaseEvent;
        cfnParameters = new Map();
        cfnParameters.set('ChatConfigSSMParameterName', '/config/fake-uuid/new');
        cfnParameters.set('ExistingCognitoUserPoolId', 'fake-user-pool');
        cfnParameters.set('ExistingCognitoGroupPolicyTableName', 'fake-table-name');
        process.env.AWS_SDK_USER_AGENT = `{ "customUserAgent": "AwsSolution/SO0276/v2.0.0" }`;
        process.env[constants_1.POWERTOOLS_METRICS_NAMESPACE_ENV_VAR] = 'UnitTest';
        process.env[constants_1.USE_CASES_TABLE_NAME_ENV_VAR] = 'UseCaseTable';
        process.env[constants_1.ARTIFACT_BUCKET_ENV_VAR] = 'fake-artifact-bucket';
        process.env[constants_1.CFN_DEPLOY_ROLE_ARN_ENV_VAR] = 'arn:aws:iam::123456789012:role/fake-role';
        process.env[constants_1.USE_CASE_CONFIG_SSM_PARAMETER_PREFIX] = '/config';
        process.env[constants_1.WEBCONFIG_SSM_KEY_ENV_VAR] = '/fake-webconfig/key';
        process.env[constants_1.USE_CASE_CONFIG_SSM_PARAMETER_PREFIX_ENV_VAR] = '/config';
        process.env[constants_1.USE_CASE_API_KEY_SUFFIX_ENV_VAR] = 'api-key';
        process.env[constants_1.IS_INTERNAL_USER_ENV_VAR] = 'true';
        cfnMockedClient = (0, aws_sdk_client_mock_1.mockClient)(client_cloudformation_1.CloudFormationClient);
        ddbMockedClient = (0, aws_sdk_client_mock_1.mockClient)(client_dynamodb_1.DynamoDBClient);
        ssmMockedClient = (0, aws_sdk_client_mock_1.mockClient)(client_ssm_1.SSMClient);
        secretsmanagerMockedClient = (0, aws_sdk_client_mock_1.mockClient)(client_secrets_manager_1.SecretsManagerClient);
    });
    describe('When successfully invoking Commands', () => {
        beforeEach(() => {
            cfnMockedClient.on(client_cloudformation_1.CreateStackCommand).resolves({
                UseCaseId: 'fake-id'
            });
            cfnMockedClient.on(client_cloudformation_1.UpdateStackCommand).resolves({
                UseCaseId: 'fake-id'
            });
            cfnMockedClient.on(client_cloudformation_1.DeleteStackCommand).resolves({});
            ddbMockedClient.on(client_dynamodb_1.PutItemCommand).resolves({
                Attributes: {
                    UseCaseId: {
                        S: 'fake-id'
                    }
                }
            });
            ddbMockedClient.on(client_dynamodb_1.UpdateItemCommand).resolves({
                Attributes: {
                    UseCaseId: {
                        S: 'fake-id'
                    }
                }
            });
            ddbMockedClient.on(client_dynamodb_1.DeleteItemCommand).resolves({});
            ddbMockedClient.on(client_dynamodb_1.GetItemCommand).resolves({
                Item: {
                    UseCaseId: {
                        S: 'fake-id'
                    },
                    StackId: {
                        S: 'fake-stack-id'
                    },
                    SSMParameterKey: {
                        S: '/config/fake-uuid/old'
                    }
                }
            });
            ssmMockedClient
                .on(client_ssm_1.GetParameterCommand, {
                Name: '/fake-webconfig/key'
            })
                .resolves({
                Parameter: {
                    Name: '/fake-webconfig/key',
                    Type: 'String',
                    Value: '{"ApiEndpoint": "fake.example.com","UserPoolId": "fake-user-pool","UserPoolClientId": "fake-client-id"}'
                }
            })
                .on(client_ssm_1.GetParameterCommand, {
                Name: '/config/fake-uuid/new'
            })
                .resolves({
                Parameter: {
                    Name: '/config/fake-uuid/new',
                    Type: 'String',
                    Value: '{}'
                }
            })
                .on(client_ssm_1.GetParameterCommand, {
                Name: '/config/fake-uuid/old'
            })
                .resolves({
                Parameter: {
                    Name: '/config/fake-uuid/old',
                    Type: 'String',
                    Value: '{"ParamKey1":"OldParamValue"}'
                }
            })
                .on(client_ssm_1.GetParameterCommand, {
                Name: '/config/fake-id'
            });
            ssmMockedClient.on(client_ssm_1.PutParameterCommand).resolves({ Version: 1, Tier: client_ssm_1.ParameterTier.INTELLIGENT_TIERING });
            ssmMockedClient.on(client_ssm_1.DeleteParameterCommand).resolves({});
        });
        it('should call create stack on Stack Management', async () => {
            const createStackCommand = new command_1.CreateUseCaseCommand();
            expect(await createStackCommand.execute(new use_case_1.UseCase('fake-id', 'fake-test', 'Create a stack for test', cfnParameters, event.body, 'test-user', "HuggingFace" /* CHAT_PROVIDERS.HUGGING_FACE */, 'Chat'))).toEqual('SUCCESS');
            expect(cfnMockedClient).toHaveReceivedCommand(client_cloudformation_1.CreateStackCommand);
            expect(ddbMockedClient).toHaveReceivedCommand(client_dynamodb_1.PutItemCommand);
            expect(ssmMockedClient).toHaveReceivedCommand(client_ssm_1.PutParameterCommand);
            expect(secretsmanagerMockedClient).toHaveReceivedCommand(client_secrets_manager_1.CreateSecretCommand);
        });
        it('should call update stack on Stack Management', async () => {
            const updateStackCommand = new command_1.UpdateUseCaseCommand();
            expect(await updateStackCommand.execute(new use_case_1.UseCase('fake-id', 'fake-test', 'Update a stack for test', cfnParameters, event.body, 'test-user', "HuggingFace" /* CHAT_PROVIDERS.HUGGING_FACE */, 'Chat'))).toEqual('SUCCESS');
            expect(cfnMockedClient).toHaveReceivedCommand(client_cloudformation_1.UpdateStackCommand);
            expect(ddbMockedClient).toHaveReceivedCommand(client_dynamodb_1.GetItemCommand);
            expect(ddbMockedClient).toHaveReceivedCommand(client_dynamodb_1.UpdateItemCommand);
            expect(ssmMockedClient).toHaveReceivedCommand(client_ssm_1.PutParameterCommand);
            expect(secretsmanagerMockedClient).toHaveReceivedCommand(client_secrets_manager_1.PutSecretValueCommand);
        });
        it('should call delete stack on Stack Management', async () => {
            const deleteStackCommand = new command_1.DeleteUseCaseCommand();
            expect(await deleteStackCommand.execute(new use_case_1.UseCase('fake-id', 'fake-test', 'Delete a stack for test', undefined, event.body, 'test-user', "HuggingFace" /* CHAT_PROVIDERS.HUGGING_FACE */, 'Chat'))).toEqual('SUCCESS');
            expect(cfnMockedClient).toHaveReceivedCommand(client_cloudformation_1.DeleteStackCommand);
            expect(ddbMockedClient).toHaveReceivedCommand(client_dynamodb_1.UpdateItemCommand);
            expect(secretsmanagerMockedClient).toHaveReceivedCommand(client_secrets_manager_1.DeleteSecretCommand);
        });
        it('should call delete stack on Stack Management', async () => {
            const deleteStackCommand = new command_1.PermanentlyDeleteUseCaseCommand();
            expect(await deleteStackCommand.execute(new use_case_1.UseCase('fake-id', 'fake-test', 'Permanently delete a stack for test', undefined, event.body, 'test-user', "HuggingFace" /* CHAT_PROVIDERS.HUGGING_FACE */, 'Chat'))).toEqual('SUCCESS');
            expect(cfnMockedClient).toHaveReceivedCommand(client_cloudformation_1.DeleteStackCommand);
            expect(ddbMockedClient).toHaveReceivedCommand(client_dynamodb_1.DeleteItemCommand);
            expect(ssmMockedClient).toHaveReceivedCommand(client_ssm_1.DeleteParameterCommand);
            expect(secretsmanagerMockedClient).toHaveReceivedCommand(client_secrets_manager_1.DeleteSecretCommand);
        });
        it('should call create stack on Stack Management, not calling secrets manager', async () => {
            const createStackCommand = new command_1.CreateUseCaseCommand();
            expect(await createStackCommand.execute(new use_case_1.UseCase('fake-id', 'fake-test', 'Create a stack for test', cfnParameters, event.body, 'test-user', "Bedrock" /* CHAT_PROVIDERS.BEDROCK */, 'Chat'))).toEqual('SUCCESS');
            expect(cfnMockedClient).toHaveReceivedCommand(client_cloudformation_1.CreateStackCommand);
            expect(ddbMockedClient).toHaveReceivedCommand(client_dynamodb_1.PutItemCommand);
            expect(ssmMockedClient).toHaveReceivedCommand(client_ssm_1.PutParameterCommand);
            expect(secretsmanagerMockedClient).toHaveReceivedCommandTimes(client_secrets_manager_1.PutSecretValueCommand, 0);
        });
        it('should call update stack on Stack Management, not calling secrets manager', async () => {
            const updateStackCommand = new command_1.UpdateUseCaseCommand();
            expect(await updateStackCommand.execute(new use_case_1.UseCase('fake-id', 'fake-test', 'Update a stack for test', cfnParameters, event.body, 'test-user', "Bedrock" /* CHAT_PROVIDERS.BEDROCK */, 'Chat'))).toEqual('SUCCESS');
            expect(cfnMockedClient).toHaveReceivedCommand(client_cloudformation_1.UpdateStackCommand);
            expect(ddbMockedClient).toHaveReceivedCommand(client_dynamodb_1.GetItemCommand);
            expect(ddbMockedClient).toHaveReceivedCommand(client_dynamodb_1.UpdateItemCommand);
            expect(ssmMockedClient).toHaveReceivedCommand(client_ssm_1.PutParameterCommand);
            expect(secretsmanagerMockedClient).toHaveReceivedCommandTimes(client_secrets_manager_1.PutSecretValueCommand, 0);
        });
        it('should call delete stack on Stack Management, not calling secrets manager', async () => {
            const deleteStackCommand = new command_1.DeleteUseCaseCommand();
            expect(await deleteStackCommand.execute(new use_case_1.UseCase('fake-id', 'fake-test', 'Delete a stack for test', undefined, event.body, 'test-user', "Bedrock" /* CHAT_PROVIDERS.BEDROCK */, 'Chat'))).toEqual('SUCCESS');
            expect(cfnMockedClient).toHaveReceivedCommand(client_cloudformation_1.DeleteStackCommand);
            expect(ddbMockedClient).toHaveReceivedCommand(client_dynamodb_1.UpdateItemCommand);
            expect(secretsmanagerMockedClient).toHaveReceivedCommandTimes(client_secrets_manager_1.DeleteSecretCommand, 0);
        });
        it('should call delete stack on Stack Management, not calling secrets manager', async () => {
            const deleteStackCommand = new command_1.PermanentlyDeleteUseCaseCommand();
            expect(await deleteStackCommand.execute(new use_case_1.UseCase('fake-id', 'fake-test', 'Permanently delete a stack for test', undefined, event.body, 'test-user', "Bedrock" /* CHAT_PROVIDERS.BEDROCK */, 'Chat'))).toEqual('SUCCESS');
            expect(cfnMockedClient).toHaveReceivedCommand(client_cloudformation_1.DeleteStackCommand);
            expect(ddbMockedClient).toHaveReceivedCommand(client_dynamodb_1.DeleteItemCommand);
            expect(ssmMockedClient).toHaveReceivedCommand(client_ssm_1.DeleteParameterCommand);
            expect(secretsmanagerMockedClient).toHaveReceivedCommandTimes(client_secrets_manager_1.DeleteSecretCommand, 0);
        });
        afterEach(() => {
            cfnMockedClient.reset();
            ddbMockedClient.reset();
            ssmMockedClient.reset();
            secretsmanagerMockedClient.reset();
        });
    });
    describe('When listing the deployed use case stacks', () => {
        let adaptedEvent;
        beforeAll(() => {
            cfnMockedClient = (0, aws_sdk_client_mock_1.mockClient)(client_cloudformation_1.CloudFormationClient);
            ddbMockedClient = (0, aws_sdk_client_mock_1.mockClient)(client_dynamodb_1.DynamoDBClient);
            ssmMockedClient = (0, aws_sdk_client_mock_1.mockClient)(client_ssm_1.SSMClient);
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
            const expectedResponse = {
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
                            },
                            {
                                ParameterKey: 'ProviderApiKeySecret',
                                ParameterValue: '11111111/api-key'
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
            ssmMockedClient.on(client_ssm_1.GetParameterCommand, { Name: '/config/fake-id' }).resolves({
                Parameter: {
                    Name: '/config/fake-id',
                    Type: 'String',
                    Value: JSON.stringify({
                        ParamKey1: 'ParamValue1'
                    })
                }
            });
            const event = {
                queryStringParameters: {
                    pageSize: '10'
                }
            };
            adaptedEvent = new list_use_cases_1.ListUseCasesAdapter(event);
        });
        it('should return the list of deployed stacks', async () => {
            const listUseCaseCommand = new command_1.ListUseCasesCommand();
            const listCasesResponse = await listUseCaseCommand.execute(adaptedEvent);
            expect(listCasesResponse.deployments.length).toEqual(2);
            expect(listCasesResponse.deployments[0]).toEqual(expect.objectContaining({
                CreatedBy: 'fake-user-id',
                Description: 'test case 1',
                Name: 'test-1',
                ParamKey1: 'ParamValue1',
                StackId: 'arn:aws:cloudformation:us-west-2:123456789012:stack/fake-stack-name/fake-uuid-1',
                chatConfigSSMParameterName: '/config/fake-id',
                cloudFrontWebUrl: 'mock-cloudfront-url',
                providerApiKeySecret: '11111111/api-key',
                status: 'CREATE_COMPLETE',
                webConfigKey: 'mock-webconfig-ssm-parameter-key'
            }));
            expect(listCasesResponse.deployments[1]).toEqual(expect.objectContaining({
                CreatedBy: 'fake-user-id',
                Description: 'test case 2',
                Name: 'test-2',
                ParamKey1: 'ParamValue1',
                StackId: 'arn:aws:cloudformation:us-west-2:123456789012:stack/fake-stack-name/fake-uuid-2',
                status: 'CREATE_COMPLETE',
                cloudFrontWebUrl: 'mock-cloudfront-url'
            }));
            expect(listCasesResponse.scannedCount).toEqual(2);
        });
        it('should not fail, if ssm config key does not exist in parameter store', () => {
            ssmMockedClient
                .on(client_ssm_1.GetParameterCommand, { Name: '/config/fake-id' })
                .rejects(new Error('Fake error for testing'));
            const listUseCaseCommand = new command_1.ListUseCasesCommand();
            return expect(listUseCaseCommand.execute(adaptedEvent)).resolves.not.toThrow();
        });
        it('should throw an error, if call to get stack details fails', () => {
            cfnMockedClient.on(client_cloudformation_1.DescribeStacksCommand).rejects(new Error('Fake error for testing'));
            const listUseCaseCommand = new command_1.ListUseCasesCommand();
            return expect(listUseCaseCommand.execute(adaptedEvent)).rejects.toThrow();
        });
        it('should not throw error, if stack details does not contain ssm parameter store name', () => {
            cfnMockedClient.on(client_cloudformation_1.DescribeStacksCommand).resolves({
                Stacks: [
                    {
                        StackName: 'test',
                        StackId: 'fake-stack-id',
                        CreationTime: new Date(),
                        StackStatus: 'CREATE_COMPLETE',
                        Parameters: [
                            {
                                ParameterKey: 'ProviderApiKeySecret',
                                ParameterValue: '11111111/api-key'
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
            const listUseCaseCommand = new command_1.ListUseCasesCommand();
            return expect(listUseCaseCommand.execute(adaptedEvent)).resolves.not.toThrow();
        });
        it('should throw an error, if fetching list of use case records fails', () => {
            ddbMockedClient.on(client_dynamodb_1.ScanCommand).rejects(new Error('Fake error for testing'));
            const listUseCaseCommand = new command_1.ListUseCasesCommand();
            return expect(listUseCaseCommand.execute(adaptedEvent)).rejects.toThrow();
        });
        afterAll(() => {
            cfnMockedClient.reset();
            ddbMockedClient.reset();
            ssmMockedClient.reset();
            secretsmanagerMockedClient.reset();
        });
    });
    describe('When create stack errors out', () => {
        describe('When cfn errors out', () => {
            beforeAll(() => {
                cfnMockedClient.on(client_cloudformation_1.CreateStackCommand).rejects(new Error('Fake error for testing'));
                cfnMockedClient.on(client_cloudformation_1.UpdateStackCommand).rejects(new Error('Fake error for testing'));
                cfnMockedClient.on(client_cloudformation_1.DeleteStackCommand).rejects(new Error('Fake error for testing'));
            });
            it('should return error for create', async () => {
                const createStackCommand = new command_1.CreateUseCaseCommand();
                expect(await createStackCommand.execute(new use_case_1.UseCase('fake-id', 'fake-test', 'Create a stack for test', cfnParameters, event.body, 'test-user', "HuggingFace" /* CHAT_PROVIDERS.HUGGING_FACE */, 'Chat'))).toEqual('FAILED');
            });
            it('should return error for update', async () => {
                const updateStackCommand = new command_1.UpdateUseCaseCommand();
                expect(await updateStackCommand.execute(new use_case_1.UseCase('fake-id', 'fake-test', 'Create a stack for test', cfnParameters, event.body, 'test-user', "HuggingFace" /* CHAT_PROVIDERS.HUGGING_FACE */, 'Chat'))).toEqual('FAILED');
            });
            it('should return error for delete', async () => {
                const deleteStackCommand = new command_1.DeleteUseCaseCommand();
                expect(await deleteStackCommand.execute(new use_case_1.UseCase('fake-id', 'fake-test', 'Create a stack for test', undefined, event.body, 'test-user', "HuggingFace" /* CHAT_PROVIDERS.HUGGING_FACE */, ''))).toEqual('FAILED');
            });
        });
        afterAll(() => {
            cfnMockedClient.reset();
            ddbMockedClient.reset();
            ssmMockedClient.reset();
            secretsmanagerMockedClient.reset();
        });
    });
    describe('When delete stack errors out during a permanent delete', () => {
        describe('When cfn errors out with StackNotFound', () => {
            beforeAll(() => {
                cfnMockedClient
                    .on(client_cloudformation_1.DeleteStackCommand)
                    .rejects(new client_cloudformation_1.StackNotFoundException({ 'message': 'Fake error', '$metadata': {} }));
                ddbMockedClient.on(client_dynamodb_1.DeleteItemCommand).resolves({});
                ddbMockedClient.on(client_dynamodb_1.GetItemCommand).resolves({
                    Item: {
                        UseCaseId: {
                            S: 'fake-id'
                        },
                        StackId: {
                            S: 'fake-stack-id'
                        }
                    }
                });
                ssmMockedClient.on(client_ssm_1.DeleteParameterCommand).resolves({});
            });
            it('should continue successfully', async () => {
                const permanentlyDeleteUseCaseCommand = new command_1.PermanentlyDeleteUseCaseCommand();
                expect(await permanentlyDeleteUseCaseCommand.execute(new use_case_1.UseCase('fake-id', 'fake-test', 'Create a stack for test', cfnParameters, event.body, 'test-user', "HuggingFace" /* CHAT_PROVIDERS.HUGGING_FACE */, 'Chat'))).toEqual('SUCCESS');
            });
        });
        describe('When cfn errors out with other errors', () => {
            beforeAll(() => {
                cfnMockedClient.on(client_cloudformation_1.DeleteStackCommand).rejects(new Error());
                ddbMockedClient.on(client_dynamodb_1.DeleteItemCommand).resolves({});
                ddbMockedClient.on(client_dynamodb_1.GetItemCommand).resolves({
                    Item: {
                        UseCaseId: {
                            S: 'fake-id'
                        },
                        StackId: {
                            S: 'fake-stack-id'
                        }
                    }
                });
                ssmMockedClient.on(client_ssm_1.DeleteParameterCommand).resolves({});
            });
            it('should fail', async () => {
                const permanentlyDeleteUseCaseCommand = new command_1.PermanentlyDeleteUseCaseCommand();
                expect(await permanentlyDeleteUseCaseCommand.execute(new use_case_1.UseCase('fake-id', 'fake-test', 'Create a stack for test', cfnParameters, event.body, 'test-user', "HuggingFace" /* CHAT_PROVIDERS.HUGGING_FACE */, 'Chat'))).toEqual('FAILED');
            });
        });
        afterAll(() => {
            cfnMockedClient.reset();
            ddbMockedClient.reset();
            ssmMockedClient.reset();
            secretsmanagerMockedClient.reset();
        });
    });
    describe('When ddb errors out', () => {
        beforeAll(() => {
            cfnMockedClient.reset();
            cfnMockedClient.on(client_cloudformation_1.UpdateStackCommand).resolves({
                UseCaseId: 'fake-id'
            });
            ddbMockedClient.on(client_dynamodb_1.PutItemCommand).rejects(new Error('Fake put item error for testing'));
            ddbMockedClient.on(client_dynamodb_1.UpdateItemCommand).rejects(new Error('Fake update item error for testing'));
            ddbMockedClient.on(client_dynamodb_1.DeleteItemCommand).rejects(new Error('Fake delete item error for testing'));
        });
        it('should return error if ddb update fails', async () => {
            const updateStackCommand = new command_1.UpdateUseCaseCommand();
            expect(await updateStackCommand
                .execute(new use_case_1.UseCase('fake-id', 'fake-test', 'Create a stack for test', cfnParameters, event.body, 'test-user', "HuggingFace" /* CHAT_PROVIDERS.HUGGING_FACE */, 'Chat'))
                .catch((error) => {
                expect(error).toBeInstanceOf(Error);
                expect(error.message).toEqual('Fake update item error for testing');
            }));
        });
        it('should return an error if ddb put item fails', () => {
            const createStackCommand = new command_1.CreateUseCaseCommand();
            expect(createStackCommand
                .execute(new use_case_1.UseCase('fake-id', 'fake-test', 'Create a stack for test', cfnParameters, event.body, 'test-user', "HuggingFace" /* CHAT_PROVIDERS.HUGGING_FACE */, 'Chat'))
                .catch((error) => {
                expect(error).toBeInstanceOf(Error);
                expect(error.message).toEqual('Fake put item error for testing');
            }));
        });
        it('should return an error if ddb delete item fails', () => {
            const deleteStackCommand = new command_1.DeleteUseCaseCommand();
            expect(deleteStackCommand
                .execute(new use_case_1.UseCase('fake-id', 'fake-test', 'Create a stack for test', undefined, event.body, 'test-user', "HuggingFace" /* CHAT_PROVIDERS.HUGGING_FACE */, 'Chat'))
                .catch((error) => {
                expect(error).toBeInstanceOf(Error);
                expect(error.message).toEqual('Fake delete item error for testing');
            }));
        });
        afterAll(() => {
            cfnMockedClient.reset();
            ddbMockedClient.reset();
            ssmMockedClient.reset();
            secretsmanagerMockedClient.reset();
        });
    });
    describe('When ssm errors out', () => {
        beforeAll(() => {
            cfnMockedClient.reset();
            cfnMockedClient.on(client_cloudformation_1.UpdateStackCommand).resolves({
                UseCaseId: 'fake-id'
            });
            ddbMockedClient.on(client_dynamodb_1.PutItemCommand).resolves({
                Attributes: {
                    UseCaseId: {
                        S: 'fake-id'
                    }
                }
            });
            ddbMockedClient.on(client_dynamodb_1.UpdateItemCommand).resolves({
                Attributes: {
                    UseCaseId: {
                        S: 'fake-id'
                    }
                }
            });
            ddbMockedClient.on(client_dynamodb_1.DeleteItemCommand).resolves({});
            ssmMockedClient.on(client_ssm_1.GetParameterCommand).rejects(new Error('Fake ssm error for testing'));
            ssmMockedClient.on(client_ssm_1.PutParameterCommand).rejects(new Error('Fake ssm error for testing'));
            ssmMockedClient.on(client_ssm_1.DeleteParameterCommand).rejects(new Error('Fake ssm error for testing'));
        });
        it('should return error if ssm update fails', async () => {
            const updateStackCommand = new command_1.UpdateUseCaseCommand();
            expect(await updateStackCommand
                .execute(new use_case_1.UseCase('fake-id', 'fake-test', 'Create a stack for test', cfnParameters, event.body, 'test-user', "HuggingFace" /* CHAT_PROVIDERS.HUGGING_FACE */, 'Chat'))
                .catch((error) => {
                expect(error).toBeInstanceOf(Error);
                expect(error.message).toEqual('Fake ssm error for testing');
            }));
        });
        it('should return an error if ddb put item fails', () => {
            const createStackCommand = new command_1.CreateUseCaseCommand();
            expect(createStackCommand
                .execute(new use_case_1.UseCase('fake-id', 'fake-test', 'Create a stack for test', cfnParameters, event.body, 'test-user', "HuggingFace" /* CHAT_PROVIDERS.HUGGING_FACE */, 'Chat'))
                .catch((error) => {
                expect(error).toBeInstanceOf(Error);
                expect(error.message).toEqual('Fake ssm error for testing');
            }));
        });
        it('should return an error if ddb delete item fails', () => {
            const deleteStackCommand = new command_1.DeleteUseCaseCommand();
            expect(deleteStackCommand
                .execute(new use_case_1.UseCase('fake-id', 'fake-test', 'Create a stack for test', undefined, event.body, 'test-user', "HuggingFace" /* CHAT_PROVIDERS.HUGGING_FACE */, 'Chat'))
                .catch((error) => {
                expect(error).toBeInstanceOf(Error);
                expect(error.message).toEqual('Fake ssm error for testing');
            }));
        });
        afterAll(() => {
            cfnMockedClient.reset();
            ddbMockedClient.reset();
            ssmMockedClient.reset();
            secretsmanagerMockedClient.reset();
        });
    });
    afterAll(() => {
        delete process.env.AWS_SDK_USER_AGENT;
        delete process.env[constants_1.POWERTOOLS_METRICS_NAMESPACE_ENV_VAR];
        delete process.env[constants_1.USE_CASES_TABLE_NAME_ENV_VAR];
        delete process.env[constants_1.ARTIFACT_BUCKET_ENV_VAR];
        delete process.env[constants_1.CFN_DEPLOY_ROLE_ARN_ENV_VAR];
        delete process.env[constants_1.USE_CASE_CONFIG_SSM_PARAMETER_PREFIX_ENV_VAR];
        delete process.env[constants_1.WEBCONFIG_SSM_KEY_ENV_VAR];
        delete process.env[constants_1.USE_CASE_API_KEY_SUFFIX_ENV_VAR];
        delete process.env[constants_1.IS_INTERNAL_USER_ENV_VAR];
        cfnMockedClient.restore();
        ddbMockedClient.restore();
        ssmMockedClient.restore();
        secretsmanagerMockedClient.restore();
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29tbWFuZC50ZXN0LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vdGVzdC9jb21tYW5kLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBOzs7Ozs7Ozs7Ozt1SEFXdUg7O0FBRXZILDBFQVF3QztBQUN4Qyw4REFPa0M7QUFDbEMsNEVBS3lDO0FBQ3pDLG9EQU02QjtBQUU3Qiw2REFBaUQ7QUFDakQsb0NBQWtDO0FBQ2xDLHdDQU1vQjtBQUNwQiw0REFBOEQ7QUFDOUQsZ0RBQTRDO0FBQzVDLGtEQVc0QjtBQUM1Qix1REFBdUQ7QUFFdkQsUUFBUSxDQUFDLGdDQUFnQyxFQUFFLEdBQUcsRUFBRTtJQUM1QyxJQUFJLEtBQVUsQ0FBQztJQUNmLElBQUksYUFBa0MsQ0FBQztJQUN2QyxJQUFJLGVBQW9CLENBQUM7SUFDekIsSUFBSSxlQUFvQixDQUFDO0lBQ3pCLElBQUksZUFBb0IsQ0FBQztJQUN6QixJQUFJLDBCQUErQixDQUFDO0lBRXBDLFNBQVMsQ0FBQyxHQUFHLEVBQUU7UUFDWCxLQUFLLEdBQUcsb0NBQWtCLENBQUM7UUFDM0IsYUFBYSxHQUFHLElBQUksR0FBRyxFQUFrQixDQUFDO1FBQzFDLGFBQWEsQ0FBQyxHQUFHLENBQUMsNEJBQTRCLEVBQUUsdUJBQXVCLENBQUMsQ0FBQztRQUN6RSxhQUFhLENBQUMsR0FBRyxDQUFDLDJCQUEyQixFQUFFLGdCQUFnQixDQUFDLENBQUM7UUFDakUsYUFBYSxDQUFDLEdBQUcsQ0FBQyxxQ0FBcUMsRUFBRSxpQkFBaUIsQ0FBQyxDQUFDO1FBRTVFLE9BQU8sQ0FBQyxHQUFHLENBQUMsa0JBQWtCLEdBQUcsb0RBQW9ELENBQUM7UUFDdEYsT0FBTyxDQUFDLEdBQUcsQ0FBQyxnREFBb0MsQ0FBQyxHQUFHLFVBQVUsQ0FBQztRQUMvRCxPQUFPLENBQUMsR0FBRyxDQUFDLHdDQUE0QixDQUFDLEdBQUcsY0FBYyxDQUFDO1FBQzNELE9BQU8sQ0FBQyxHQUFHLENBQUMsbUNBQXVCLENB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QUFDO1FBQ3RDLE9BQU8sT0FBTyxDQUFDLEdBQUcsQ0FBQyxnREFBb0MsQ0FBQyxDQUFDO1FBQ3pELE9BQU8sT0FBTyxDQUFDLEdBQUcsQ0FBQyx3Q0FBNEIsQ0FBQyxDQUFDO1FBQ2pELE9BQU8sT0FBTyxDQUFDLEdBQUcsQ0FBQyxtQ0FBdUIsQ0FBQyxDQUFDO1FBQzVDLE9BQU8sT0FBTyxDQUFDLEdBQUcsQ0FBQyx1Q0FBMkIsQ0FBQyxDQUFDO1FBQ2hELE9BQU8sT0FBTyxDQUFDLEdBQUcsQ0FBQyx3REFBNEMsQ0FBQyxDQUFDO1FBQ2pFLE9BQU8sT0FBTyxDQUFDLEdBQUcsQ0FBQyxxQ0FBeUIsQ0FBQyxDQUFDO1FBQzlDLE9BQU8sT0FBTyxDQUFDLEdBQUcsQ0FBQywyQ0FBK0IsQ0FBQyxDQUFDO1FBQ3BELE9BQU8sT0FBTyxDQUFDLEdBQUcsQ0FBQyxvQ0FBd0IsQ0FBQyxDQUFDO1FBRTdDLGVBQWUsQ0FBQyxPQUFPLEVBQUUsQ0FBQztRQUMxQixlQUFlLENBQUMsT0FBTyxFQUFFLENBQUM7UUFDMUIsZUFBZSxDQUFDLE9BQU8sRUFBRSxDQUFDO1FBQzFCLDBCQUEwQixDQUFDLE9BQU8sRUFBRSxDQUFDO0lBQ3pDLENBQUMsQ0FBQyxDQUFDO0FBQ1AsQ0FBQyxDQUFDLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKlxuICogIENvcHlyaWdodCBBbWF6b24uY29tLCBJbmMuIG9yIGl0cyBhZmZpbGlhdGVzLiBBbGwgUmlnaHRzIFJlc2VydmVkLiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICpcbiAqICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAqXG4gKiAgTGljZW5zZWQgdW5kZXIgdGhlIEFwYWNoZSBMaWNlbnNlLCBWZXJzaW9uIDIuMCAodGhlIFwiTGljZW5zZVwiKS4gWW91IG1heSBub3QgdXNlIHRoaXMgZmlsZSBleGNlcHQgaW4gY29tcGxpYW5jZSAgICAqXG4gKiAgd2l0aCB0aGUgTGljZW5zZS4gQSBjb3B5IG9mIHRoZSBMaWNlbnNlIGlzIGxvY2F0ZWQgYXQgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgKlxuICogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICpcbiAqICAgICAgaHR0cDovL3d3dy5hcGFjaGUub3JnL2xpY2Vuc2VzL0xJQ0VOU0UtMi4wICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAqXG4gKiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgKlxuICogIG9yIGluIHRoZSAnbGljZW5zZScgZmlsZSBhY2NvbXBhbnlpbmcgdGhpcyBmaWxlLiBUaGlzIGZpbGUgaXMgZGlzdHJpYnV0ZWQgb24gYW4gJ0FTIElTJyBCQVNJUywgV0lUSE9VVCBXQVJSQU5USUVTICpcbiAqICBPUiBDT05ESVRJT05TIE9GIEFOWSBLSU5ELCBleHByZXNzIG9yIGltcGxpZWQuIFNlZSB0aGUgTGljZW5zZSBmb3IgdGhlIHNwZWNpZmljIGxhbmd1YWdlIGdvdmVybmluZyBwZXJtaXNzaW9ucyAgICAqXG4gKiAgYW5kIGxpbWl0YXRpb25zIHVuZGVyIHRoZSBMaWNlbnNlLiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgKlxuICoqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKi9cblxuaW1wb3J0IHtcbiAgICBDbG91ZEZvcm1hdGlvbkNsaWVudCxcbiAgICBDcmVhdGVTdGFja0NvbW1hbmQsXG4gICAgRGVsZXRlU3RhY2tDb21tYW5kLFxuICAgIERlc2NyaWJlU3RhY2tzQ29tbWFuZCxcbiAgICBEZXNjcmliZVN0YWNrc0NvbW1hbmRPdXRwdXQsXG4gICAgU3RhY2tOb3RGb3VuZEV4Y2VwdGlvbixcbiAgICBVcGRhdGVTdGFja0NvbW1hbmRcbn0gZnJvbSAnQGF3cy1zZGsvY2xpZW50LWNsb3VkZm9ybWF0aW9uJztcbmltcG9ydCB7XG4gICAgRGVsZXRlSXRlbUNvbW1hbmQsXG4gICAgRHluYW1vREJDbGllbnQsXG4gICAgR2V0SXRlbUNvbW1hbmQsXG4gICAgUHV0SXRlbUNvbW1hbmQsXG4gICAgU2NhbkNvbW1hbmQsXG4gICAgVXBkYXRlSXRlbUNvbW1hbmRcbn0gZnJvbSAnQGF3cy1zZGsvY2xpZW50LWR5bmFtb2RiJztcbmltcG9ydCB7XG4gICAgQ3JlYXRlU2VjcmV0Q29tbWFuZCxcbiAgICBEZWxldGVTZWNyZXRDb21tYW5kLFxuICAgIFB1dFNlY3JldFZhbHVlQ29tbWFuZCxcbiAgICBTZWNyZXRzTWFuYWdlckNsaWVudFxufSBmcm9tICdAYXdzLXNkay9jbGllbnQtc2VjcmV0cy1tYW5hZ2VyJztcbmltcG9ydCB7XG4gICAgRGVsZXRlUGFyYW1ldGVyQ29tbWFuZCxcbiAgICBHZXRQYXJhbWV0ZXJDb21tYW5kLFxuICAgIFBhcmFtZXRlclRpZXIsXG4gICAgUHV0UGFyYW1ldGVyQ29tbWFuZCxcbiAgICBTU01DbGllbnRcbn0gZnJvbSAnQGF3cy1zZGsvY2xpZW50LXNzbSc7XG5pbXBvcnQgeyBBUElHYXRld2F5RXZlbnQgfSBmcm9tICdhd3MtbGFtYmRhJztcbmltcG9ydCB7IG1vY2tDbGllbnQgfSBmcm9tICdhd3Mtc2RrLWNsaWVudC1tb2NrJztcbmltcG9ydCAnYXdzLXNkay1jbGllbnQtbW9jay1qZXN0JztcbmltcG9ydCB7XG4gICAgQ3JlYXRlVXNlQ2FzZUNvbW1hbmQsXG4gICAgRGVsZXRlVXNlQ2FzZUNvbW1hbmQsXG4gICAgTGlzdFVzZUNhc2VzQ29tbWFuZCxcbiAgICBQZXJtYW5lbnRseURlbGV0ZVVzZUNhc2VDb21tYW5kLFxuICAgIFVwZGF0ZVVzZUNhc2VDb21tYW5kXG59IGZyb20gJy4uL2NvbW1hbmQnO1xuaW1wb3J0IHsgTGlzdFVzZUNhc2VzQWRhcHRlciB9IGZyb20gJy4uL21vZGVsL2xpc3QtdXNlLWNhc2VzJztcbmltcG9ydCB7IFVzZUNhc2UgfSBmcm9tICcuLi9tb2RlbC91c2UtY2FzZSc7XG5pbXBvcnQge1xuICAgIEFSVElGQUNUX0JVQ0tFVF9FTlZfVkFSLFxuICAgIENGTl9ERVBMT1lfUk9MRV9BUk5fRU5WX1ZBUixcbiAgICBDSEFUX1BST1ZJREVSUyxcbiAgICBJU19JTlRFUk5BTF9VU0VSX0VOVl9WQVIsXG4gICAgUE9XRVJUT09MU19NRVRSSUNTX05BTUVTUEFDRV9FTlZfVkFSLFxuICAgIFVTRV9DQVNFU19UQUJMRV9OQU1FX0VOVl9WQVIsXG4gICAgVVNFX0NBU0VfQVBJX0tFWV9TVUZGSVhfRU5WX1ZBUixcbiAgICBVU0VfQ0FTRV9DT05GSUdfU1NNX1BBUkFNRVRFUl9QUkVGSVgsXG4gICAgVVNFX0NBU0VfQ09ORklHX1NTTV9QQVJBTUVURVJfUFJFRklYX0VOVl9WQVIsXG4gICAgV0VCQ09ORklHX1NTTV9LRVlfRU5WX1ZBUlxufSBmcm9tICcuLi91dGlscy9jb25zdGFudHMnO1xuaW1wb3J0IHsgY3JlYXRlVXNlQ2FzZUV2ZW50IH0gZnJvbSAnLi9ldmVudC10ZXN0LWRhdGEnO1xuXG5kZXNjcmliZSgnV2hlbiB0ZXN0aW5nIFVzZSBDYXNlIENvbW1hbmRzJywgKCkgPT4ge1xuICAgIGxldCBldmVudDogYW55O1xuICAgIGxldCBjZm5QYXJhbWV0ZXJzOiBNYXA8c3RyaW5nLCBzdHJpbmc+O1xuICAgIGxldCBjZm5Nb2NrZWRDbGllbnQ6IGFueTtcbiAgICBsZXQgZGRiTW9ja2VkQ2xpZW50OiBhbnk7XG4gICAgbGV0IHNzbU1vY2tlZENsaWVudDogYW55O1xuICAgIGxldCBzZWNyZXRzbWFuYWdlck1vY2tlZENsaWVudDogYW55O1xuXG4gICAgYmVmb3JlQWxsKCgpID0+IHtcbiAgICAgICAgZXZlbnQgPSBjcmVhdGVVc2VDYXNlRXZlbnQ7XG4gICAgICAgIGNmblBhcmFtZXRlcnMgPSBuZXcgTWFwPHN0cmluZywgc3RyaW5nPigpO1xuICAgICAgICBjZm5QYXJhbWV0ZXJzLnNldCgnQ2hhdENvbmZpZ1NTTVBhcmFtZXRlck5hbWUnLCAnL2NvbmZpZy9mYWtlLXV1aWQvbmV3Jyk7XG4gICAgICAgIGNmblBhcmFtZXRlcnMuc2V0KCdFeGlzdGluZ0NvZ25pdG9Vc2VyUG9vbElkJywgJ2Zha2UtdXNlci1wb29sJyk7XG4gICAgICAgIGNmblBhcmFtZXRlcnMuc2V0KCdFeGlzdGluZ0NvZ25pdG9Hcm91cFBvbGljeVRhYmxlTmFtZScsICdmYWtlLXRhYmxlLW5hbWUnKTtcblxuICAgICAgICBwcm9jZXNzLmVudi5BV1NfU0RLX1VTRVJfQUdFTlQgPSBgeyBcImN1c3RvbVVzZXJBZ2VudFwiOiBcIkF3c1NvbHV0aW9uL1NPMDI3Ni92Mi4wLjBcIiB9YDtcbiAgICAgICAgcHJvY2Vzcy5lbnZbUE9XRVJUT09MU19NRVRSSUNTX05BTUVTUEFDRV9FTlZfVkFSXSA9ICdVbml0VGVzdCc7XG4gICAgICAgIHByb2Nlc3MuZW52W1VTRV9DQVNFU19UQUJMRV9OQU1FX0VOVl9WQVJdID0gJ1VzZUNhc2VUYWJsZSc7XG4gICAgICAgIHByb2Nlc3MuZW52W0FSVElGQUNUX0JVQ0tFVF9FTlZfVkFSXSA9ICdmYWtlLWFydGlmYWN0LWJ1Y2tldCc7XG4gICAgICAgIHByb2Nlc3MuZW52W0NGTl9ERVBMT1lfUk9MRV9BUk5fRU5WX1ZBUl0gPSAnYXJuOmF3czppYW06OjEyMzQ1Njc4OTAxMjpyb2xlL2Zha2Utcm9sZSc7XG4gICAgICAgIHByb2Nlc3MuZW52W1VTRV9DQVNFX0NPTkZJR19TU01fUEFSQU1FVEVSX1BSRUZJWF0gPSAnL2NvbmZpZyc7XG4gICAgICAgIHByb2Nlc3MuZW52W1dFQkNPTkZJR19TU01fS0VZX0VOVl9WQVJdID0gJy9mYWtlLXdlYmNvbmZpZy9rZXknO1xuICAgICAgICBwcm9jZXNzLmVudltVU0VfQ0FTRV9DT05GSUdfU1NNX1BBUkFNRVRFUl9QUkVGSVhfRU5WX1ZBUl0gPSAnL2NvbmZpZyc7XG4gICAgICAgIHByb2Nlc3MuZW52W1VTRV9DQVNFX0FQSV9LRVlfU1VGRklYX0VOVl9WQVJdID0gJ2FwaS1rZXknO1xuICAgICAgICBwcm9jZXNzLmVudltJU19JTlRFUk5BTF9VU0VSX0VOVl9WQVJdID0gJ3RydWUnO1xuXG4gICAgICAgIGNmbk1vY2tlZENsaWVudCA9IG1vY2tDbGllbnQoQ2xvdWRGb3JtYXRpb25DbGllbnQpO1xuICAgICAgICBkZGJNb2NrZWRDbGllbnQgPSBtb2NrQ2xpZW50KER5bmFtb0RCQ2xpZW50KTtcbiAgICAgICAgc3NtTW9ja2VkQ2xpZW50ID0gbW9ja0NsaWVudChTU01DbGllbnQpO1xuICAgICAgICBzZWNyZXRzbWFuYWdlck1vY2tlZENsaWVudCA9IG1vY2tDbGllbnQoU2VjcmV0c01hbmFnZXJDbGllbnQpO1xuICAgIH0pO1xuXG4gICAgZGVzY3JpYmUoJ1doZW4gc3VjY2Vzc2Z1bGx5IGludm9raW5nIENvbW1hbmRzJywgKCkgPT4ge1xuICAgICAgICBiZWZvcmVFYWNoKCgpID0+IHtcbiAgICAgICAgICAgIGNmbk1vY2tlZENsaWVudC5vbihDcmVhdGVTdGFja0NvbW1hbmQpLnJlc29sdmVzKHtcbiAgICAgICAgICAgICAgICBVc2VDYXNlSWQ6ICdmYWtlLWlkJ1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICBjZm5Nb2NrZWRDbGllbnQub24oVXBkYXRlU3RhY2tDb21tYW5kKS5yZXNvbHZlcyh7XG4gICAgICAgICAgICAgICAgVXNlQ2FzZUlkOiAnZmFrZS1pZCdcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgY2ZuTW9ja2VkQ2xpZW50Lm9uKERlbGV0ZVN0YWNrQ29tbWFuZCkucmVzb2x2ZXMoe30pO1xuXG4gICAgICAgICAgICBkZGJNb2NrZWRDbGllbnQub24oUHV0SXRlbUNvbW1hbmQpLnJlc29sdmVzKHtcbiAgICAgICAgICAgICAgICBBdHRyaWJ1dGVzOiB7XG4gICAgICAgICAgICAgICAgICAgIFVzZUNhc2VJZDoge1xuICAgICAgICAgICAgICAgICAgICAgICAgUzogJ2Zha2UtaWQnXG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIGRkYk1vY2tlZENsaWVudC5vbihVcGRhdGVJdGVtQ29tbWFuZCkucmVzb2x2ZXMoe1xuICAgICAgICAgICAgICAgIEF0dHJpYnV0ZXM6IHtcbiAgICAgICAgICAgICAgICAgICAgVXNlQ2FzZUlkOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBTOiAnZmFrZS1pZCdcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgZGRiTW9ja2VkQ2xpZW50Lm9uKERlbGV0ZUl0ZW1Db21tYW5kKS5yZXNvbHZlcyh7fSk7XG4gICAgICAgICAgICBkZGJNb2NrZWRDbGllbnQub24oR2V0SXRlbUNvbW1hbmQpLnJlc29sdmVzKHtcbiAgICAgICAgICAgICAgICBJdGVtOiB7XG4gICAgICAgICAgICAgICAgICAgIFVzZUNhc2VJZDoge1xuICAgICAgICAgICAgICAgICAgICAgICAgUzogJ2Zha2UtaWQnXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIFN0YWNrSWQ6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIFM6ICdmYWtlLXN0YWNrLWlkJ1xuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICBTU01QYXJhbWV0ZXJLZXk6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIFM6ICcvY29uZmlnL2Zha2UtdXVpZC9vbGQnXG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgc3NtTW9ja2VkQ2xpZW50XG4gICAgICAgICAgICAgICAgLm9uKEdldFBhcmFtZXRlckNvbW1hbmQsIHtcbiAgICAgICAgICAgICAgICAgICAgTmFtZTogJy9mYWtlLXdlYmNvbmZpZy9rZXknXG4gICAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgICAgICAucmVzb2x2ZXMoe1xuICAgICAgICAgICAgICAgICAgICBQYXJhbWV0ZXI6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIE5hbWU6ICcvZmFrZS13ZWJjb25maWcva2V5JyxcbiAgICAgICAgICAgICAgICAgICAgICAgIFR5cGU6ICdTdHJpbmcnLFxuICAgICAgICAgICAgICAgICAgICAgICAgVmFsdWU6ICd7XCJBcGlFbmRwb2ludFwiOiBcImZha2UuZXhhbXBsZS5jb21cIixcIlVzZXJQb29sSWRcIjogXCJmYWtlLXVzZXItcG9vbFwiLFwiVXNlclBvb2xDbGllbnRJZFwiOiBcImZha2UtY2xpZW50LWlkXCJ9J1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgICAgICAub24oR2V0UGFyYW1ldGVyQ29tbWFuZCwge1xuICAgICAgICAgICAgICAgICAgICBOYW1lOiAnL2NvbmZpZy9mYWtlLXV1aWQvbmV3J1xuICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAgICAgLnJlc29sdmVzKHtcbiAgICAgICAgICAgICAgICAgICAgUGFyYW1ldGVyOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBOYW1lOiAnL2NvbmZpZy9mYWtlLXV1aWQvbmV3JyxcbiAgICAgICAgICAgICAgICAgICAgICAgIFR5cGU6ICdTdHJpbmcnLFxuICAgICAgICAgICAgICAgICAgICAgICAgVmFsdWU6ICd7fSdcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAgICAgLm9uKEdldFBhcmFtZXRlckNvbW1hbmQsIHtcbiAgICAgICAgICAgICAgICAgICAgTmFtZTogJy9jb25maWcvZmFrZS11dWlkL29sZCdcbiAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgICAgIC5yZXNvbHZlcyh7XG4gICAgICAgICAgICAgICAgICAgIFBhcmFtZXRlcjoge1xuICAgICAgICAgICAgICAgICAgICAgICAgTmFtZTogJy9jb25maWcvZmFrZS11dWlkL29sZCcsXG4gICAgICAgICAgICAgICAgICAgICAgICBUeXBlOiAnU3RyaW5nJyxcbiAgICAgICAgICAgICAgICAgICAgICAgIFZhbHVlOiAne1wiUGFyYW1LZXkxXCI6XCJPbGRQYXJhbVZhbHVlXCJ9J1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgICAgICAub24oR2V0UGFyYW1ldGVyQ29tbWFuZCwge1xuICAgICAgICAgICAgICAgICAgICBOYW1lOiAnL2NvbmZpZy9mYWtlLWlkJ1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgc3NtTW9ja2VkQ2xpZW50Lm9uKFB1dFBhcmFtZXRlckNvbW1hbmQpLnJlc29sdmVzKHsgVmVyc2lvbjogMSwgVGllcjogUGFyYW1ldGVyVGllci5JTlRFTExJR0VOVF9USUVSSU5HIH0pO1xuICAgICAgICAgICAgc3NtTW9ja2VkQ2xpZW50Lm9uKERlbGV0ZVBhcmFtZXRlckNvbW1hbmQpLnJlc29sdmVzKHt9KTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgaXQoJ3Nob3VsZCBjYWxsIGNyZWF0ZSBzdGFjayBvbiBTdGFjayBNYW5hZ2VtZW50JywgYXN5bmMgKCkgPT4ge1xuICAgICAgICAgICAgY29uc3QgY3JlYXRlU3RhY2tDb21tYW5kID0gbmV3IENyZWF0ZVVzZUNhc2VDb21tYW5kKCk7XG4gICAgICAgICAgICBleHBlY3QoXG4gICAgICAgICAgICAgICAgYXdhaXQgY3JlYXRlU3RhY2tDb21tYW5kLmV4ZWN1dGUoXG4gICAgICAgICAgICAgICAgICAgIG5ldyBVc2VDYXNlKFxuICAgICAgICAgICAgICAgICAgICAgICAgJ2Zha2UtaWQnLFxuICAgICAgICAgICAgICAgICAgICAgICAgJ2Zha2UtdGVzdCcsXG4gICAgICAgICAgICAgICAgICAgICAgICAnQ3JlYXRlIGEgc3RhY2sgZm9yIHRlc3QnLFxuICAgICAgICAgICAgICAgICAgICAgICAgY2ZuUGFyYW1ldGVycyxcbiAgICAgICAgICAgICAgICAgICAgICAgIGV2ZW50LmJvZHksXG4gICAgICAgICAgICAgICAgICAgICAgICAndGVzdC11c2VyJyxcbiAgICAgICAgICAgICAgICAgICAgICAgIENIQVRfUFJPVklERVJTLkhVR0dJTkdfRkFDRSxcbiAgICAgICAgICAgICAgICAgICAgICAgICdDaGF0J1xuICAgICAgICAgICAgICAgICAgICApXG4gICAgICAgICAgICAgICAgKVxuICAgICAgICAgICAgKS50b0VxdWFsKCdTVUNDRVNTJyk7XG4gICAgICAgICAgICBleHBlY3QoY2ZuTW9ja2VkQ2xpZW50KS50b0hhdmVSZWNlaXZlZENvbW1hbmQoQ3JlYXRlU3RhY2tDb21tYW5kKTtcbiAgICAgICAgICAgIGV4cGVjdChkZGJNb2NrZWRDbGllbnQpLnRvSGF2ZVJlY2VpdmVkQ29tbWFuZChQdXRJdGVtQ29tbWFuZCk7XG4gICAgICAgICAgICBleHBlY3Qoc3NtTW9ja2VkQ2xpZW50KS50b0hhdmVSZWNlaXZlZENvbW1hbmQoUHV0UGFyYW1ldGVyQ29tbWFuZCk7XG4gICAgICAgICAgICBleHBlY3Qoc2VjcmV0c21hbmFnZXJNb2NrZWRDbGllbnQpLnRvSGF2ZVJlY2VpdmVkQ29tbWFuZChDcmVhdGVTZWNyZXRDb21tYW5kKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgaXQoJ3Nob3VsZCBjYWxsIHVwZGF0ZSBzdGFjayBvbiBTdGFjayBNYW5hZ2VtZW50JywgYXN5bmMgKCkgPT4ge1xuICAgICAgICAgICAgY29uc3QgdXBkYXRlU3RhY2tDb21tYW5kID0gbmV3IFVwZGF0ZVVzZUNhc2VDb21tYW5kKCk7XG4gICAgICAgICAgICBleHBlY3QoXG4gICAgICAgICAgICAgICAgYXdhaXQgdXBkYXRlU3RhY2tDb21tYW5kLmV4ZWN1dGUoXG4gICAgICAgICAgICAgICAgICAgIG5ldyBVc2VDYXNlKFxuICAgICAgICAgICAgICAgICAgICAgICAgJ2Zha2UtaWQnLFxuICAgICAgICAgICAgICAgICAgICAgICAgJ2Zha2UtdGVzdCcsXG4gICAgICAgICAgICAgICAgICAgICAgICAnVXBkYXRlIGEgc3RhY2sgZm9yIHRlc3QnLFxuICAgICAgICAgICAgICAgICAgICAgICAgY2ZuUGFyYW1ldGVycyxcbiAgICAgICAgICAgICAgICAgICAgICAgIGV2ZW50LmJvZHksXG4gICAgICAgICAgICAgICAgICAgICAgICAndGVzdC11c2VyJyxcbiAgICAgICAgICAgICAgICAgICAgICAgIENIQVRfUFJPVklERVJTLkhVR0dJTkdfRkFDRSxcbiAgICAgICAgICAgICAgICAgICAgICAgICdDaGF0J1xuICAgICAgICAgICAgICAgICAgICApXG4gICAgICAgICAgICAgICAgKVxuICAgICAgICAgICAgKS50b0VxdWFsKCdTVUNDRVNTJyk7XG4gICAgICAgICAgICBleHBlY3QoY2ZuTW9ja2VkQ2xpZW50KS50b0hhdmVSZWNlaXZlZENvbW1hbmQoVXBkYXRlU3RhY2tDb21tYW5kKTtcbiAgICAgICAgICAgIGV4cGVjdChkZGJNb2NrZWRDbGllbnQpLnRvSGF2ZVJlY2VpdmVkQ29tbWFuZChHZXRJdGVtQ29tbWFuZCk7XG4gICAgICAgICAgICBleHBlY3QoZGRiTW9ja2VkQ2xpZW50KS50b0hhdmVSZWNlaXZlZENvbW1hbmQoVXBkYXRlSXRlbUNvbW1hbmQpO1xuICAgICAgICAgICAgZXhwZWN0KHNzbU1vY2tlZENsaWVudCkudG9IYXZlUmVjZWl2ZWRDb21tYW5kKFB1dFBhcmFtZXRlckNvbW1hbmQpO1xuICAgICAgICAgICAgZXhwZWN0KHNlY3JldHNtYW5hZ2VyTW9ja2VkQ2xpZW50KS50b0hhdmVSZWNlaXZlZENvbW1hbmQoUHV0U2VjcmV0VmFsdWVDb21tYW5kKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgaXQoJ3Nob3VsZCBjYWxsIGRlbGV0ZSBzdGFjayBvbiBTdGFjayBNYW5hZ2VtZW50JywgYXN5bmMgKCkgPT4ge1xuICAgICAgICAgICAgY29uc3QgZGVsZXRlU3RhY2tDb21tYW5kID0gbmV3IERlbGV0ZVVzZUNhc2VDb21tYW5kKCk7XG4gICAgICAgICAgICBleHBlY3QoXG4gICAgICAgICAgICAgICAgYXdhaXQgZGVsZXRlU3RhY2tDb21tYW5kLmV4ZWN1dGUoXG4gICAgICAgICAgICAgICAgICAgIG5ldyBVc2VDYXNlKFxuICAgICAgICAgICAgICAgICAgICAgICAgJ2Zha2UtaWQnLFxuICAgICAgICAgICAgICAgICAgICAgICAgJ2Zha2UtdGVzdCcsXG4gICAgICAgICAgICAgICAgICAgICAgICAnRGVsZXRlIGEgc3RhY2sgZm9yIHRlc3QnLFxuICAgICAgICAgICAgICAgICAgICAgICAgdW5kZWZpbmVkLFxuICAgICAgICAgICAgICAgICAgICAgICAgZXZlbnQuYm9keSxcbiAgICAgICAgICAgICAgICAgICAgICAgICd0ZXN0LXVzZXInLFxuICAgICAgICAgICAgICAgICAgICAgICAgQ0hBVF9QUk9WSURFUlMuSFVHR0lOR19GQUNFLFxuICAgICAgICAgICAgICAgICAgICAgICAgJ0NoYXQnXG4gICAgICAgICAgICAgICAgICAgIClcbiAgICAgICAgICAgICAgICApXG4gICAgICAgICAgICApLnRvRXF1YWwoJ1NVQ0NFU1MnKTtcbiAgICAgICAgICAgIGV4cGVjdChjZm5Nb2NrZWRDbGllbnQpLnRvSGF2ZVJlY2VpdmVkQ29tbWFuZChEZWxldGVTdGFja0NvbW1hbmQpO1xuICAgICAgICAgICAgZXhwZWN0KGRkYk1vY2tlZENsaWVudCkudG9IYXZlUmVjZWl2ZWRDb21tYW5kKFVwZGF0ZUl0ZW1Db21tYW5kKTtcbiAgICAgICAgICAgIGV4cGVjdChzZWNyZXRzbWFuYWdlck1vY2tlZENsaWVudCkudG9IYXZlUmVjZWl2ZWRDb21tYW5kKERlbGV0ZVNlY3JldENvbW1hbmQpO1xuICAgICAgICB9KTtcblxuICAgICAgICBpdCgnc2hvdWxkIGNhbGwgZGVsZXRlIHN0YWNrIG9uIFN0YWNrIE1hbmFnZW1lbnQnLCBhc3luYyAoKSA9PiB7XG4gICAgICAgICAgICBjb25zdCBkZWxldGVTdGFja0NvbW1hbmQgPSBuZXcgUGVybWFuZW50bHlEZWxldGVVc2VDYXNlQ29tbWFuZCgpO1xuICAgICAgICAgICAgZXhwZWN0KFxuICAgICAgICAgICAgICAgIGF3YWl0IGRlbGV0ZVN0YWNrQ29tbWFuZC5leGVjdXRlKFxuICAgICAgICAgICAgICAgICAgICBuZXcgVXNlQ2FzZShcbiAgICAgICAgICAgICAgICAgICAgICAgICdmYWtlLWlkJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICdmYWtlLXRlc3QnLFxuICAgICAgICAgICAgICAgICAgICAgICAgJ1Blcm1hbmVudGx5IGRlbGV0ZSBhIHN0YWNrIGZvciB0ZXN0JyxcbiAgICAgICAgICAgICAgICAgICAgICAgIHVuZGVmaW5lZCxcbiAgICAgICAgICAgICAgICAgICAgICAgIGV2ZW50LmJvZHksXG4gICAgICAgICAgICAgICAgICAgICAgICAndGVzdC11c2VyJyxcbiAgICAgICAgICAgICAgICAgICAgICAgIENIQVRfUFJPVklERVJTLkhVR0dJTkdfRkFDRSxcbiAgICAgICAgICAgICAgICAgICAgICAgICdDaGF0J1xuICAgICAgICAgICAgICAgICAgICApXG4gICAgICAgICAgICAgICAgKVxuICAgICAgICAgICAgKS50b0VxdWFsKCdTVUNDRVNTJyk7XG4gICAgICAgICAgICBleHBlY3QoY2ZuTW9ja2VkQ2xpZW50KS50b0hhdmVSZWNlaXZlZENvbW1hbmQoRGVsZXRlU3RhY2tDb21tYW5kKTtcbiAgICAgICAgICAgIGV4cGVjdChkZGJNb2NrZWRDbGllbnQpLnRvSGF2ZVJlY2VpdmVkQ29tbWFuZChEZWxldGVJdGVtQ29tbWFuZCk7XG4gICAgICAgICAgICBleHBlY3Qoc3NtTW9ja2VkQ2xpZW50KS50b0hhdmVSZWNlaXZlZENvbW1hbmQoRGVsZXRlUGFyYW1ldGVyQ29tbWFuZCk7XG4gICAgICAgICAgICBleHBlY3Qoc2VjcmV0c21hbmFnZXJNb2NrZWRDbGllbnQpLnRvSGF2ZVJlY2VpdmVkQ29tbWFuZChEZWxldGVTZWNyZXRDb21tYW5kKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgaXQoJ3Nob3VsZCBjYWxsIGNyZWF0ZSBzdGFjayBvbiBTdGFjayBNYW5hZ2VtZW50LCBub3QgY2FsbGluZyBzZWNyZXRzIG1hbmFnZXInLCBhc3luYyAoKSA9PiB7XG4gICAgICAgICAgICBjb25zdCBjcmVhdGVTdGFja0NvbW1hbmQgPSBuZXcgQ3JlYXRlVXNlQ2FzZUNvbW1hbmQoKTtcbiAgICAgICAgICAgIGV4cGVjdChcbiAgICAgICAgICAgICAgICBhd2FpdCBjcmVhdGVTdGFja0NvbW1hbmQuZXhlY3V0ZShcbiAgICAgICAgICAgICAgICAgICAgbmV3IFVzZUNhc2UoXG4gICAgICAgICAgICAgICAgICAgICAgICAnZmFrZS1pZCcsXG4gICAgICAgICAgICAgICAgICAgICAgICAnZmFrZS10ZXN0JyxcbiAgICAgICAgICAgICAgICAgICAgICAgICdDcmVhdGUgYSBzdGFjayBmb3IgdGVzdCcsXG4gICAgICAgICAgICAgICAgICAgICAgICBjZm5QYXJhbWV0ZXJzLFxuICAgICAgICAgICAgICAgICAgICAgICAgZXZlbnQuYm9keSxcbiAgICAgICAgICAgICAgICAgICAgICAgICd0ZXN0LXVzZXInLFxuICAgICAgICAgICAgICAgICAgICAgICAgQ0hBVF9QUk9WSURFUlMuQkVEUk9DSyxcbiAgICAgICAgICAgICAgICAgICAgICAgICdDaGF0J1xuICAgICAgICAgICAgICAgICAgICApXG4gICAgICAgICAgICAgICAgKVxuICAgICAgICAgICAgKS50b0VxdWFsKCdTVUNDRVNTJyk7XG4gICAgICAgICAgICBleHBlY3QoY2ZuTW9ja2VkQ2xpZW50KS50b0hhdmVSZWNlaXZlZENvbW1hbmQoQ3JlYXRlU3RhY2tDb21tYW5kKTtcbiAgICAgICAgICAgIGV4cGVjdChkZGJNb2NrZWRDbGllbnQpLnRvSGF2ZVJlY2VpdmVkQ29tbWFuZChQdXRJdGVtQ29tbWFuZCk7XG4gICAgICAgICAgICBleHBlY3Qoc3NtTW9ja2VkQ2xpZW50KS50b0hhdmVSZWNlaXZlZENvbW1hbmQoUHV0UGFyYW1ldGVyQ29tbWFuZCk7XG4gICAgICAgICAgICBleHBlY3Qoc2VjcmV0c21hbmFnZXJNb2NrZWRDbGllbnQpLnRvSGF2ZVJlY2VpdmVkQ29tbWFuZFRpbWVzKFB1dFNlY3JldFZhbHVlQ29tbWFuZCwgMCk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIGl0KCdzaG91bGQgY2FsbCB1cGRhdGUgc3RhY2sgb24gU3RhY2sgTWFuYWdlbWVudCwgbm90IGNhbGxpbmcgc2VjcmV0cyBtYW5hZ2VyJywgYXN5bmMgKCkgPT4ge1xuICAgICAgICAgICAgY29uc3QgdXBkYXRlU3RhY2tDb21tYW5kID0gbmV3IFVwZGF0ZVVzZUNhc2VDb21tYW5kKCk7XG4gICAgICAgICAgICBleHBlY3QoXG4gICAgICAgICAgICAgICAgYXdhaXQgdXBkYXRlU3RhY2tDb21tYW5kLmV4ZWN1dGUoXG4gICAgICAgICAgICAgICAgICAgIG5ldyBVc2VDYXNlKFxuICAgICAgICAgICAgICAgICAgICAgICAgJ2Zha2UtaWQnLFxuICAgICAgICAgICAgICAgICAgICAgICAgJ2Zha2UtdGVzdCcsXG4gICAgICAgICAgICAgICAgICAgICAgICAnVXBkYXRlIGEgc3RhY2sgZm9yIHRlc3QnLFxuICAgICAgICAgICAgICAgICAgICAgICAgY2ZuUGFyYW1ldGVycyxcbiAgICAgICAgICAgICAgICAgICAgICAgIGV2ZW50LmJvZHksXG4gICAgICAgICAgICAgICAgICAgICAgICAndGVzdC11c2VyJyxcbiAgICAgICAgICAgICAgICAgICAgICAgIENIQVRfUFJPVklERVJTLkJFRFJPQ0ssXG4gICAgICAgICAgICAgICAgICAgICAgICAnQ2hhdCdcbiAgICAgICAgICAgICAgICAgICAgKVxuICAgICAgICAgICAgICAgIClcbiAgICAgICAgICAgICkudG9FcXVhbCgnU1VDQ0VTUycpO1xuICAgICAgICAgICAgZXhwZWN0KGNmbk1vY2tlZENsaWVudCkudG9IYXZlUmVjZWl2ZWRDb21tYW5kKFVwZGF0ZVN0YWNrQ29tbWFuZCk7XG4gICAgICAgICAgICBleHBlY3QoZGRiTW9ja2VkQ2xpZW50KS50b0hhdmVSZWNlaXZlZENvbW1hbmQoR2V0SXRlbUNvbW1hbmQpO1xuICAgICAgICAgICAgZXhwZWN0KGRkYk1vY2tlZENsaWVudCkudG9IYXZlUmVjZWl2ZWRDb21tYW5kKFVwZGF0ZUl0ZW1Db21tYW5kKTtcbiAgICAgICAgICAgIGV4cGVjdChzc21Nb2NrZWRDbGllbnQpLnRvSGF2ZVJlY2VpdmVkQ29tbWFuZChQdXRQYXJhbWV0ZXJDb21tYW5kKTtcbiAgICAgICAgICAgIGV4cGVjdChzZWNyZXRzbWFuYWdlck1vY2tlZENsaWVudCkudG9IYXZlUmVjZWl2ZWRDb21tYW5kVGltZXMoUHV0U2VjcmV0VmFsdWVDb21tYW5kLCAwKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgaXQoJ3Nob3VsZCBjYWxsIGRlbGV0ZSBzdGFjayBvbiBTdGFjayBNYW5hZ2VtZW50LCBub3QgY2FsbGluZyBzZWNyZXRzIG1hbmFnZXInLCBhc3luYyAoKSA9PiB7XG4gICAgICAgICAgICBjb25zdCBkZWxldGVTdGFja0NvbW1hbmQgPSBuZXcgRGVsZXRlVXNlQ2FzZUNvbW1hbmQoKTtcbiAgICAgICAgICAgIGV4cGVjdChcbiAgICAgICAgICAgICAgICBhd2FpdCBkZWxldGVTdGFja0NvbW1hbmQuZXhlY3V0ZShcbiAgICAgICAgICAgICAgICAgICAgbmV3IFVzZUNhc2UoXG4gICAgICAgICAgICAgICAgICAgICAgICAnZmFrZS1pZCcsXG4gICAgICAgICAgICAgICAgICAgICAgICAnZmFrZS10ZXN0JyxcbiAgICAgICAgICAgICAgICAgICAgICAgICdEZWxldGUgYSBzdGFjayBmb3IgdGVzdCcsXG4gICAgICAgICAgICAgICAgICAgICAgICB1bmRlZmluZWQsXG4gICAgICAgICAgICAgICAgICAgICAgICBldmVudC5ib2R5LFxuICAgICAgICAgICAgICAgICAgICAgICAgJ3Rlc3QtdXNlcicsXG4gICAgICAgICAgICAgICAgICAgICAgICBDSEFUX1BST1ZJREVSUy5CRURST0NLLFxuICAgICAgICAgICAgICAgICAgICAgICAgJ0NoYXQnXG4gICAgICAgICAgICAgICAgICAgIClcbiAgICAgICAgICAgICAgICApXG4gICAgICAgICAgICApLnRvRXF1YWwoJ1NVQ0NFU1MnKTtcbiAgICAgICAgICAgIGV4cGVjdChjZm5Nb2NrZWRDbGllbnQpLnRvSGF2ZVJlY2VpdmVkQ29tbWFuZChEZWxldGVTdGFja0NvbW1hbmQpO1xuICAgICAgICAgICAgZXhwZWN0KGRkYk1vY2tlZENsaWVudCkudG9IYXZlUmVjZWl2ZWRDb21tYW5kKFVwZGF0ZUl0ZW1Db21tYW5kKTtcbiAgICAgICAgICAgIGV4cGVjdChzZWNyZXRzbWFuYWdlck1vY2tlZENsaWVudCkudG9IYXZlUmVjZWl2ZWRDb21tYW5kVGltZXMoRGVsZXRlU2VjcmV0Q29tbWFuZCwgMCk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIGl0KCdzaG91bGQgY2FsbCBkZWxldGUgc3RhY2sgb24gU3RhY2sgTWFuYWdlbWVudCwgbm90IGNhbGxpbmcgc2VjcmV0cyBtYW5hZ2VyJywgYXN5bmMgKCkgPT4ge1xuICAgICAgICAgICAgY29uc3QgZGVsZXRlU3RhY2tDb21tYW5kID0gbmV3IFBlcm1hbmVudGx5RGVsZXRlVXNlQ2FzZUNvbW1hbmQoKTtcbiAgICAgICAgICAgIGV4cGVjdChcbiAgICAgICAgICAgICAgICBhd2FpdCBkZWxldGVTdGFja0NvbW1hbmQuZXhlY3V0ZShcbiAgICAgICAgICAgICAgICAgICAgbmV3IFVzZUNhc2UoXG4gICAgICAgICAgICAgICAgICAgICAgICAnZmFrZS1pZCcsXG4gICAgICAgICAgICAgICAgICAgICAgICAnZmFrZS10ZXN0JyxcbiAgICAgICAgICAgICAgICAgICAgICAgICdQZXJtYW5lbnRseSBkZWxldGUgYSBzdGFjayBmb3IgdGVzdCcsXG4gICAgICAgICAgICAgICAgICAgICAgICB1bmRlZmluZWQsXG4gICAgICAgICAgICAgICAgICAgICAgICBldmVudC5ib2R5LFxuICAgICAgICAgICAgICAgICAgICAgICAgJ3Rlc3QtdXNlcicsXG4gICAgICAgICAgICAgICAgICAgICAgICBDSEFUX1BST1ZJREVSUy5CRURST0NLLFxuICAgICAgICAgICAgICAgICAgICAgICAgJ0NoYXQnXG4gICAgICAgICAgICAgICAgICAgIClcbiAgICAgICAgICAgICAgICApXG4gICAgICAgICAgICApLnRvRXF1YWwoJ1NVQ0NFU1MnKTtcbiAgICAgICAgICAgIGV4cGVjdChjZm5Nb2NrZWRDbGllbnQpLnRvSGF2ZVJlY2VpdmVkQ29tbWFuZChEZWxldGVTdGFja0NvbW1hbmQpO1xuICAgICAgICAgICAgZXhwZWN0KGRkYk1vY2tlZENsaWVudCkudG9IYXZlUmVjZWl2ZWRDb21tYW5kKERlbGV0ZUl0ZW1Db21tYW5kKTtcbiAgICAgICAgICAgIGV4cGVjdChzc21Nb2NrZWRDbGllbnQpLnRvSGF2ZVJlY2VpdmVkQ29tbWFuZChEZWxldGVQYXJhbWV0ZXJDb21tYW5kKTtcbiAgICAgICAgICAgIGV4cGVjdChzZWNyZXRzbWFuYWdlck1vY2tlZENsaWVudCkudG9IYXZlUmVjZWl2ZWRDb21tYW5kVGltZXMoRGVsZXRlU2VjcmV0Q29tbWFuZCwgMCk7XG4gICAgICAgIH0pO1xuICAgICAgICBhZnRlckVhY2goKCkgPT4ge1xuICAgICAgICAgICAgY2ZuTW9ja2VkQ2xpZW50LnJlc2V0KCk7XG4gICAgICAgICAgICBkZGJNb2NrZWRDbGllbnQucmVzZXQoKTtcbiAgICAgICAgICAgIHNzbU1vY2tlZENsaWVudC5yZXNldCgpO1xuICAgICAgICAgICAgc2VjcmV0c21hbmFnZXJNb2NrZWRDbGllbnQucmVzZXQoKTtcbiAgICAgICAgfSk7XG4gICAgfSk7XG5cbiAgICBkZXNjcmliZSgnV2hlbiBsaXN0aW5nIHRoZSBkZXBsb3llZCB1c2UgY2FzZSBzdGFja3MnLCAoKSA9PiB7XG4gICAgICAgIGxldCBhZGFwdGVkRXZlbnQ6IExpc3RVc2VDYXNlc0FkYXB0ZXI7XG4gICAgICAgIGJlZm9yZUFsbCgoKSA9PiB7XG4gICAgICAgICAgICBjZm5Nb2NrZWRDbGllbnQgPSBtb2NrQ2xpZW50KENsb3VkRm9ybWF0aW9uQ2xpZW50KTtcbiAgICAgICAgICAgIGRkYk1vY2tlZENsaWVudCA9IG1vY2tDbGllbnQoRHluYW1vREJDbGllbnQpO1xuICAgICAgICAgICAgc3NtTW9ja2VkQ2xpZW50ID0gbW9ja0NsaWVudChTU01DbGllbnQpO1xuXG4gICAgICAgICAgICBkZGJNb2NrZWRDbGllbnQub24oU2NhbkNvbW1hbmQpLnJlc29sdmVzKHtcbiAgICAgICAgICAgICAgICBJdGVtczogW1xuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICAnRGVzY3JpcHRpb24nOiB7ICdTJzogJ3Rlc3QgY2FzZSAxJyB9LFxuICAgICAgICAgICAgICAgICAgICAgICAgJ0NyZWF0ZWRCeSc6IHsgJ1MnOiAnZmFrZS11c2VyLWlkJyB9LFxuICAgICAgICAgICAgICAgICAgICAgICAgJ1N0YWNrSWQnOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgJ1MnOiAnYXJuOmF3czpjbG91ZGZvcm1hdGlvbjp1cy13ZXN0LTI6MTIzNDU2Nzg5MDEyOnN0YWNrL2Zha2Utc3RhY2stbmFtZS9mYWtlLXV1aWQtMSdcbiAgICAgICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgICAgICAnTmFtZSc6IHsgJ1MnOiAndGVzdC0xJyB9XG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICdEZXNjcmlwdGlvbic6IHsgJ1MnOiAndGVzdCBjYXNlIDInIH0sXG4gICAgICAgICAgICAgICAgICAgICAgICAnQ3JlYXRlZEJ5JzogeyAnUyc6ICdmYWtlLXVzZXItaWQnIH0sXG4gICAgICAgICAgICAgICAgICAgICAgICAnU3RhY2tJZCc6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAnUyc6ICdhcm46YXdzOmNsb3VkZm9ybWF0aW9uOnVzLXdlc3QtMjoxMjM0NTY3ODkwMTI6c3RhY2svZmFrZS1zdGFjay1uYW1lL2Zha2UtdXVpZC0yJ1xuICAgICAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgICAgICdOYW1lJzogeyAnUyc6ICd0ZXN0LTInIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIF0sXG4gICAgICAgICAgICAgICAgU2Nhbm5lZENvdW50OiAyLFxuICAgICAgICAgICAgICAgIExhc3RFdmFsdWF0ZWRLZXk6IHtcbiAgICAgICAgICAgICAgICAgICAgJ0Rlc2NyaXB0aW9uJzogeyAnUyc6ICd0ZXN0IGNhc2UgMicgfSxcbiAgICAgICAgICAgICAgICAgICAgJ0NyZWF0ZWRCeSc6IHsgJ1MnOiAnZmFrZS11c2VyLWlkJyB9LFxuICAgICAgICAgICAgICAgICAgICAnU3RhY2tJZCc6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICdTJzogJ2Fybjphd3M6Y2xvdWRmb3JtYXRpb246dXMtd2VzdC0yOjEyMzQ1Njc4OTAxMjpzdGFjay9mYWtlLXN0YWNrLW5hbWUvZmFrZS11dWlkLTInXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgICdOYW1lJzogeyAnUyc6ICd0ZXN0LTInIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgY29uc3QgZXhwZWN0ZWRSZXNwb25zZSA9IHtcbiAgICAgICAgICAgICAgICBTdGFja3M6IFtcbiAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgU3RhY2tOYW1lOiAndGVzdCcsXG4gICAgICAgICAgICAgICAgICAgICAgICBTdGFja0lkOiAnZmFrZS1zdGFjay1pZCcsXG4gICAgICAgICAgICAgICAgICAgICAgICBDcmVhdGlvblRpbWU6IG5ldyBEYXRlKCksXG4gICAgICAgICAgICAgICAgICAgICAgICBTdGFja1N0YXR1czogJ0NSRUFURV9DT01QTEVURScsXG4gICAgICAgICAgICAgICAgICAgICAgICBQYXJhbWV0ZXJzOiBbXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBQYXJhbWV0ZXJLZXk6ICdDaGF0Q29uZmlnU1NNUGFyYW1ldGVyTmFtZScsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFBhcmFtZXRlclZhbHVlOiAnL2NvbmZpZy9mYWtlLWlkJ1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBQYXJhbWV0ZXJLZXk6ICdQcm92aWRlckFwaUtleVNlY3JldCcsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFBhcmFtZXRlclZhbHVlOiAnMTExMTExMTEvYXBpLWtleSdcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICBdLFxuICAgICAgICAgICAgICAgICAgICAgICAgT3V0cHV0czogW1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgT3V0cHV0S2V5OiAnV2ViQ29uZmlnS2V5JyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgT3V0cHV0VmFsdWU6ICdtb2NrLXdlYmNvbmZpZy1zc20tcGFyYW1ldGVyLWtleSdcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgT3V0cHV0S2V5OiAnQ2xvdWRGcm9udFdlYlVybCcsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIE91dHB1dFZhbHVlOiAnbW9jay1jbG91ZGZyb250LXVybCdcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICBdXG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBdXG4gICAgICAgICAgICB9IGFzIERlc2NyaWJlU3RhY2tzQ29tbWFuZE91dHB1dDtcblxuICAgICAgICAgICAgY2ZuTW9ja2VkQ2xpZW50Lm9uKERlc2NyaWJlU3RhY2tzQ29tbWFuZCkucmVzb2x2ZXMoZXhwZWN0ZWRSZXNwb25zZSk7XG5cbiAgICAgICAgICAgIHNzbU1vY2tlZENsaWVudC5vbihHZXRQYXJhbWV0ZXJDb21tYW5kLCB7IE5hbWU6ICcvY29uZmlnL2Zha2UtaWQnIH0pLnJlc29sdmVzKHtcbiAgICAgICAgICAgICAgICBQYXJhbWV0ZXI6IHtcbiAgICAgICAgICAgICAgICAgICAgTmFtZTogJy9jb25maWcvZmFrZS1pZCcsXG4gICAgICAgICAgICAgICAgICAgIFR5cGU6ICdTdHJpbmcnLFxuICAgICAgICAgICAgICAgICAgICBWYWx1ZTogSlNPTi5zdHJpbmdpZnkoe1xuICAgICAgICAgICAgICAgICAgICAgICAgUGFyYW1LZXkxOiAnUGFyYW1WYWx1ZTEnXG4gICAgICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgIGNvbnN0IGV2ZW50ID0ge1xuICAgICAgICAgICAgICAgIHF1ZXJ5U3RyaW5nUGFyYW1ldGVyczoge1xuICAgICAgICAgICAgICAgICAgICBwYWdlU2l6ZTogJzEwJ1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gYXMgUGFydGlhbDxBUElHYXRld2F5RXZlbnQ+O1xuXG4gICAgICAgICAgICBhZGFwdGVkRXZlbnQgPSBuZXcgTGlzdFVzZUNhc2VzQWRhcHRlcihldmVudCBhcyBBUElHYXRld2F5RXZlbnQpO1xuICAgICAgICB9KTtcblxuICAgICAgICBpdCgnc2hvdWxkIHJldHVybiB0aGUgbGlzdCBvZiBkZXBsb3llZCBzdGFja3MnLCBhc3luYyAoKSA9PiB7XG4gICAgICAgICAgICBjb25zdCBsaXN0VXNlQ2FzZUNvbW1hbmQgPSBuZXcgTGlzdFVzZUNhc2VzQ29tbWFuZCgpO1xuICAgICAgICAgICAgY29uc3QgbGlzdENhc2VzUmVzcG9uc2UgPSBhd2FpdCBsaXN0VXNlQ2FzZUNvbW1hbmQuZXhlY3V0ZShhZGFwdGVkRXZlbnQpO1xuXG4gICAgICAgICAgICBleHBlY3QobGlzdENhc2VzUmVzcG9uc2UuZGVwbG95bWVudHMubGVuZ3RoKS50b0VxdWFsKDIpO1xuICAgICAgICAgICAgZXhwZWN0KGxpc3RDYXNlc1Jlc3BvbnNlLmRlcGxveW1lbnRzWzBdKS50b0VxdWFsKFxuICAgICAgICAgICAgICAgIGV4cGVjdC5vYmplY3RDb250YWluaW5nKHtcbiAgICAgICAgICAgICAgICAgICAgQ3JlYXRlZEJ5OiAnZmFrZS11c2VyLWlkJyxcbiAgICAgICAgICAgICAgICAgICAgRGVzY3JpcHRpb246ICd0ZXN0IGNhc2UgMScsXG4gICAgICAgICAgICAgICAgICAgIE5hbWU6ICd0ZXN0LTEnLFxuICAgICAgICAgICAgICAgICAgICBQYXJhbUtleTE6ICdQYXJhbVZhbHVlMScsXG4gICAgICAgICAgICAgICAgICAgIFN0YWNrSWQ6ICdhcm46YXdzOmNsb3VkZm9ybWF0aW9uOnVzLXdlc3QtMjoxMjM0NTY3ODkwMTI6c3RhY2svZmFrZS1zdGFjay1uYW1lL2Zha2UtdXVpZC0xJyxcbiAgICAgICAgICAgICAgICAgICAgY2hhdENvbmZpZ1NTTVBhcmFtZXRlck5hbWU6ICcvY29uZmlnL2Zha2UtaWQnLFxuICAgICAgICAgICAgICAgICAgICBjbG91ZEZyb250V2ViVXJsOiAnbW9jay1jbG91ZGZyb250LXVybCcsXG4gICAgICAgICAgICAgICAgICAgIHByb3ZpZGVyQXBpS2V5U2VjcmV0OiAnMTExMTExMTEvYXBpLWtleScsXG4gICAgICAgICAgICAgICAgICAgIHN0YXR1czogJ0NSRUFURV9DT01QTEVURScsXG4gICAgICAgICAgICAgICAgICAgIHdlYkNvbmZpZ0tleTogJ21vY2std2ViY29uZmlnLXNzbS1wYXJhbWV0ZXIta2V5J1xuICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICApO1xuICAgICAgICAgICAgZXhwZWN0KGxpc3RDYXNlc1Jlc3BvbnNlLmRlcGxveW1lbnRzWzFdKS50b0VxdWFsKFxuICAgICAgICAgICAgICAgIGV4cGVjdC5vYmplY3RDb250YWluaW5nKHtcbiAgICAgICAgICAgICAgICAgICAgQ3JlYXRlZEJ5OiAnZmFrZS11c2VyLWlkJyxcbiAgICAgICAgICAgICAgICAgICAgRGVzY3JpcHRpb246ICd0ZXN0IGNhc2UgMicsXG4gICAgICAgICAgICAgICAgICAgIE5hbWU6ICd0ZXN0LTInLFxuICAgICAgICAgICAgICAgICAgICBQYXJhbUtleTE6ICdQYXJhbVZhbHVlMScsXG4gICAgICAgICAgICAgICAgICAgIFN0YWNrSWQ6ICdhcm46YXdzOmNsb3VkZm9ybWF0aW9uOnVzLXdlc3QtMjoxMjM0NTY3ODkwMTI6c3RhY2svZmFrZS1zdGFjay1uYW1lL2Zha2UtdXVpZC0yJyxcbiAgICAgICAgICAgICAgICAgICAgc3RhdHVzOiAnQ1JFQVRFX0NPTVBMRVRFJyxcbiAgICAgICAgICAgICAgICAgICAgY2xvdWRGcm9udFdlYlVybDogJ21vY2stY2xvdWRmcm9udC11cmwnXG4gICAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgICk7XG4gICAgICAgICAgICBleHBlY3QobGlzdENhc2VzUmVzcG9uc2Uuc2Nhbm5lZENvdW50KS50b0VxdWFsKDIpO1xuICAgICAgICB9KTtcblxuICAgICAgICBpdCgnc2hvdWxkIG5vdCBmYWlsLCBpZiBzc20gY29uZmlnIGtleSBkb2VzIG5vdCBleGlzdCBpbiBwYXJhbWV0ZXIgc3RvcmUnLCAoKSA9PiB7XG4gICAgICAgICAgICBzc21Nb2NrZWRDbGllbnRcbiAgICAgICAgICAgICAgICAub24oR2V0UGFyYW1ldGVyQ29tbWFuZCwgeyBOYW1lOiAnL2NvbmZpZy9mYWtlLWlkJyB9KVxuICAgICAgICAgICAgICAgIC5yZWplY3RzKG5ldyBFcnJvcignRmFrZSBlcnJvciBmb3IgdGVzdGluZycpKTtcbiAgICAgICAgICAgIGNvbnN0IGxpc3RVc2VDYXNlQ29tbWFuZCA9IG5ldyBMaXN0VXNlQ2FzZXNDb21tYW5kKCk7XG4gICAgICAgICAgICByZXR1cm4gZXhwZWN0KGxpc3RVc2VDYXNlQ29tbWFuZC5leGVjdXRlKGFkYXB0ZWRFdmVudCkpLnJlc29sdmVzLm5vdC50b1Rocm93KCk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIGl0KCdzaG91bGQgdGhyb3cgYW4gZXJyb3IsIGlmIGNhbGwgdG8gZ2V0IHN0YWNrIGRldGFpbHMgZmFpbHMnLCAoKSA9PiB7XG4gICAgICAgICAgICBjZm5Nb2NrZWRDbGllbnQub24oRGVzY3JpYmVTdGFja3NDb21tYW5kKS5yZWplY3RzKG5ldyBFcnJvcignRmFrZSBlcnJvciBmb3IgdGVzdGluZycpKTtcbiAgICAgICAgICAgIGNvbnN0IGxpc3RVc2VDYXNlQ29tbWFuZCA9IG5ldyBMaXN0VXNlQ2FzZXNDb21tYW5kKCk7XG4gICAgICAgICAgICByZXR1cm4gZXhwZWN0KGxpc3RVc2VDYXNlQ29tbWFuZC5leGVjdXRlKGFkYXB0ZWRFdmVudCkpLnJlamVjdHMudG9UaHJvdygpO1xuICAgICAgICB9KTtcblxuICAgICAgICBpdCgnc2hvdWxkIG5vdCB0aHJvdyBlcnJvciwgaWYgc3RhY2sgZGV0YWlscyBkb2VzIG5vdCBjb250YWluIHNzbSBwYXJhbWV0ZXIgc3RvcmUgbmFtZScsICgpID0+IHtcbiAgICAgICAgICAgIGNmbk1vY2tlZENsaWVudC5vbihEZXNjcmliZVN0YWNrc0NvbW1hbmQpLnJlc29sdmVzKHtcbiAgICAgICAgICAgICAgICBTdGFja3M6IFtcbiAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgU3RhY2tOYW1lOiAndGVzdCcsXG4gICAgICAgICAgICAgICAgICAgICAgICBTdGFja0lkOiAnZmFrZS1zdGFjay1pZCcsXG4gICAgICAgICAgICAgICAgICAgICAgICBDcmVhdGlvblRpbWU6IG5ldyBEYXRlKCksXG4gICAgICAgICAgICAgICAgICAgICAgICBTdGFja1N0YXR1czogJ0NSRUFURV9DT01QTEVURScsXG4gICAgICAgICAgICAgICAgICAgICAgICBQYXJhbWV0ZXJzOiBbXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBQYXJhbWV0ZXJLZXk6ICdQcm92aWRlckFwaUtleVNlY3JldCcsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFBhcmFtZXRlclZhbHVlOiAnMTExMTExMTEvYXBpLWtleSdcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICBdLFxuICAgICAgICAgICAgICAgICAgICAgICAgT3V0cHV0czogW1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgT3V0cHV0S2V5OiAnV2ViQ29uZmlnS2V5JyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgT3V0cHV0VmFsdWU6ICdtb2NrLXdlYmNvbmZpZy1zc20tcGFyYW1ldGVyLWtleSdcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgT3V0cHV0S2V5OiAnQ2xvdWRGcm9udFdlYlVybCcsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIE91dHB1dFZhbHVlOiAnbW9jay1jbG91ZGZyb250LXVybCdcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICBdXG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBdXG4gICAgICAgICAgICB9IGFzIERlc2NyaWJlU3RhY2tzQ29tbWFuZE91dHB1dCk7XG4gICAgICAgICAgICBjb25zdCBsaXN0VXNlQ2FzZUNvbW1hbmQgPSBuZXcgTGlzdFVzZUNhc2VzQ29tbWFuZCgpO1xuICAgICAgICAgICAgcmV0dXJuIGV4cGVjdChsaXN0VXNlQ2FzZUNvbW1hbmQuZXhlY3V0ZShhZGFwdGVkRXZlbnQpKS5yZXNvbHZlcy5ub3QudG9UaHJvdygpO1xuICAgICAgICB9KTtcblxuICAgICAgICBpdCgnc2hvdWxkIHRocm93IGFuIGVycm9yLCBpZiBmZXRjaGluZyBsaXN0IG9mIHVzZSBjYXNlIHJlY29yZHMgZmFpbHMnLCAoKSA9PiB7XG4gICAgICAgICAgICBkZGJNb2NrZWRDbGllbnQub24oU2NhbkNvbW1hbmQpLnJlamVjdHMobmV3IEVycm9yKCdGYWtlIGVycm9yIGZvciB0ZXN0aW5nJykpO1xuICAgICAgICAgICAgY29uc3QgbGlzdFVzZUNhc2VDb21tYW5kID0gbmV3IExpc3RVc2VDYXNlc0NvbW1hbmQoKTtcbiAgICAgICAgICAgIHJldHVybiBleHBlY3QobGlzdFVzZUNhc2VDb21tYW5kLmV4ZWN1dGUoYWRhcHRlZEV2ZW50KSkucmVqZWN0cy50b1Rocm93KCk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIGFmdGVyQWxsKCgpID0+IHtcbiAgICAgICAgICAgIGNmbk1vY2tlZENsaWVudC5yZXNldCgpO1xuICAgICAgICAgICAgZGRiTW9ja2VkQ2xpZW50LnJlc2V0KCk7XG4gICAgICAgICAgICBzc21Nb2NrZWRDbGllbnQucmVzZXQoKTtcbiAgICAgICAgICAgIHNlY3JldHNtYW5hZ2VyTW9ja2VkQ2xpZW50LnJlc2V0KCk7XG4gICAgICAgIH0pO1xuICAgIH0pO1xuXG4gICAgZGVzY3JpYmUoJ1doZW4gY3JlYXRlIHN0YWNrIGVycm9ycyBvdXQnLCAoKSA9PiB7XG4gICAgICAgIGRlc2NyaWJlKCdXaGVuIGNmbiBlcnJvcnMgb3V0JywgKCkgPT4ge1xuICAgICAgICAgICAgYmVmb3JlQWxsKCgpID0+IHtcbiAgICAgICAgICAgICAgICBjZm5Nb2NrZWRDbGllbnQub24oQ3JlYXRlU3RhY2tDb21tYW5kKS5yZWplY3RzKG5ldyBFcnJvcignRmFrZSBlcnJvciBmb3IgdGVzdGluZycpKTtcbiAgICAgICAgICAgICAgICBjZm5Nb2NrZWRDbGllbnQub24oVXBkYXRlU3RhY2tDb21tYW5kKS5yZWplY3RzKG5ldyBFcnJvcignRmFrZSBlcnJvciBmb3IgdGVzdGluZycpKTtcbiAgICAgICAgICAgICAgICBjZm5Nb2NrZWRDbGllbnQub24oRGVsZXRlU3RhY2tDb21tYW5kKS5yZWplY3RzKG5ldyBFcnJvcignRmFrZSBlcnJvciBmb3IgdGVzdGluZycpKTtcbiAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICBpdCgnc2hvdWxkIHJldHVybiBlcnJvciBmb3IgY3JlYXRlJywgYXN5bmMgKCkgPT4ge1xuICAgICAgICAgICAgICAgIGNvbnN0IGNyZWF0ZVN0YWNrQ29tbWFuZCA9IG5ldyBDcmVhdGVVc2VDYXNlQ29tbWFuZCgpO1xuICAgICAgICAgICAgICAgIGV4cGVjdChcbiAgICAgICAgICAgICAgICAgICAgYXdhaXQgY3JlYXRlU3RhY2tDb21tYW5kLmV4ZWN1dGUoXG4gICAgICAgICAgICAgICAgICAgICAgICBuZXcgVXNlQ2FzZShcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAnZmFrZS1pZCcsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgJ2Zha2UtdGVzdCcsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgJ0NyZWF0ZSBhIHN0YWNrIGZvciB0ZXN0JyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjZm5QYXJhbWV0ZXJzLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGV2ZW50LmJvZHksXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgJ3Rlc3QtdXNlcicsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgQ0hBVF9QUk9WSURFUlMuSFVHR0lOR19GQUNFLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICdDaGF0J1xuICAgICAgICAgICAgICAgICAgICAgICAgKVxuICAgICAgICAgICAgICAgICAgICApXG4gICAgICAgICAgICAgICAgKS50b0VxdWFsKCdGQUlMRUQnKTtcbiAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICBpdCgnc2hvdWxkIHJldHVybiBlcnJvciBmb3IgdXBkYXRlJywgYXN5bmMgKCkgPT4ge1xuICAgICAgICAgICAgICAgIGNvbnN0IHVwZGF0ZVN0YWNrQ29tbWFuZCA9IG5ldyBVcGRhdGVVc2VDYXNlQ29tbWFuZCgpO1xuICAgICAgICAgICAgICAgIGV4cGVjdChcbiAgICAgICAgICAgICAgICAgICAgYXdhaXQgdXBkYXRlU3RhY2tDb21tYW5kLmV4ZWN1dGUoXG4gICAgICAgICAgICAgICAgICAgICAgICBuZXcgVXNlQ2FzZShcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAnZmFrZS1pZCcsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgJ2Zha2UtdGVzdCcsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgJ0NyZWF0ZSBhIHN0YWNrIGZvciB0ZXN0JyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjZm5QYXJhbWV0ZXJzLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGV2ZW50LmJvZHksXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgJ3Rlc3QtdXNlcicsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgQ0hBVF9QUk9WSURFUlMuSFVHR0lOR19GQUNFLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICdDaGF0J1xuICAgICAgICAgICAgICAgICAgICAgICAgKVxuICAgICAgICAgICAgICAgICAgICApXG4gICAgICAgICAgICAgICAgKS50b0VxdWFsKCdGQUlMRUQnKTtcbiAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICBpdCgnc2hvdWxkIHJldHVybiBlcnJvciBmb3IgZGVsZXRlJywgYXN5bmMgKCkgPT4ge1xuICAgICAgICAgICAgICAgIGNvbnN0IGRlbGV0ZVN0YWNrQ29tbWFuZCA9IG5ldyBEZWxldGVVc2VDYXNlQ29tbWFuZCgpO1xuICAgICAgICAgICAgICAgIGV4cGVjdChcbiAgICAgICAgICAgICAgICAgICAgYXdhaXQgZGVsZXRlU3RhY2tDb21tYW5kLmV4ZWN1dGUoXG4gICAgICAgICAgICAgICAgICAgICAgICBuZXcgVXNlQ2FzZShcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAnZmFrZS1pZCcsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgJ2Zha2UtdGVzdCcsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgJ0NyZWF0ZSBhIHN0YWNrIGZvciB0ZXN0JyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB1bmRlZmluZWQsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZXZlbnQuYm9keSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAndGVzdC11c2VyJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBDSEFUX1BST1ZJREVSUy5IVUdHSU5HX0ZBQ0UsXG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAnJ1xuICAgICAgICAgICAgICAgICAgICAgICAgKVxuICAgICAgICAgICAgICAgICAgICApXG4gICAgICAgICAgICAgICAgKS50b0VxdWFsKCdGQUlMRUQnKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9KTtcblxuICAgICAgICBhZnRlckFsbCgoKSA9PiB7XG4gICAgICAgICAgICBjZm5Nb2NrZWRDbGllbnQucmVzZXQoKTtcbiAgICAgICAgICAgIGRkYk1vY2tlZENsaWVudC5yZXNldCgpO1xuICAgICAgICAgICAgc3NtTW9ja2VkQ2xpZW50LnJlc2V0KCk7XG4gICAgICAgICAgICBzZWNyZXRzbWFuYWdlck1vY2tlZENsaWVudC5yZXNldCgpO1xuICAgICAgICB9KTtcbiAgICB9KTtcblxuICAgIGRlc2NyaWJlKCdXaGVuIGRlbGV0ZSBzdGFjayBlcnJvcnMgb3V0IGR1cmluZyBhIHBlcm1hbmVudCBkZWxldGUnLCAoKSA9PiB7XG4gICAgICAgIGRlc2NyaWJlKCdXaGVuIGNmbiBlcnJvcnMgb3V0IHdpdGggU3RhY2tOb3RGb3VuZCcsICgpID0+IHtcbiAgICAgICAgICAgIGJlZm9yZUFsbCgoKSA9PiB7XG4gICAgICAgICAgICAgICAgY2ZuTW9ja2VkQ2xpZW50XG4gICAgICAgICAgICAgICAgICAgIC5vbihEZWxldGVTdGFja0NvbW1hbmQpXG4gICAgICAgICAgICAgICAgICAgIC5yZWplY3RzKG5ldyBTdGFja05vdEZvdW5kRXhjZXB0aW9uKHsgJ21lc3NhZ2UnOiAnRmFrZSBlcnJvcicsICckbWV0YWRhdGEnOiB7fSB9KSk7XG4gICAgICAgICAgICAgICAgZGRiTW9ja2VkQ2xpZW50Lm9uKERlbGV0ZUl0ZW1Db21tYW5kKS5yZXNvbHZlcyh7fSk7XG4gICAgICAgICAgICAgICAgZGRiTW9ja2VkQ2xpZW50Lm9uKEdldEl0ZW1Db21tYW5kKS5yZXNvbHZlcyh7XG4gICAgICAgICAgICAgICAgICAgIEl0ZW06IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIFVzZUNhc2VJZDoge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIFM6ICdmYWtlLWlkJ1xuICAgICAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgICAgIFN0YWNrSWQ6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBTOiAnZmFrZS1zdGFjay1pZCdcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIHNzbU1vY2tlZENsaWVudC5vbihEZWxldGVQYXJhbWV0ZXJDb21tYW5kKS5yZXNvbHZlcyh7fSk7XG4gICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgaXQoJ3Nob3VsZCBjb250aW51ZSBzdWNjZXNzZnVsbHknLCBhc3luYyAoKSA9PiB7XG4gICAgICAgICAgICAgICAgY29uc3QgcGVybWFuZW50bHlEZWxldGVVc2VDYXNlQ29tbWFuZCA9IG5ldyBQZXJtYW5lbnRseURlbGV0ZVVzZUNhc2VDb21tYW5kKCk7XG4gICAgICAgICAgICAgICAgZXhwZWN0KFxuICAgICAgICAgICAgICAgICAgICBhd2FpdCBwZXJtYW5lbnRseURlbGV0ZVVzZUNhc2VDb21tYW5kLmV4ZWN1dGUoXG4gICAgICAgICAgICAgICAgICAgICAgICBuZXcgVXNlQ2FzZShcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAnZmFrZS1pZCcsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgJ2Zha2UtdGVzdCcsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgJ0NyZWF0ZSBhIHN0YWNrIGZvciB0ZXN0JyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjZm5QYXJhbWV0ZXJzLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGV2ZW50LmJvZHksXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgJ3Rlc3QtdXNlcicsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgQ0hBVF9QUk9WSURFUlMuSFVHR0lOR19GQUNFLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICdDaGF0J1xuICAgICAgICAgICAgICAgICAgICAgICAgKVxuICAgICAgICAgICAgICAgICAgICApXG4gICAgICAgICAgICAgICAgKS50b0VxdWFsKCdTVUNDRVNTJyk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgZGVzY3JpYmUoJ1doZW4gY2ZuIGVycm9ycyBvdXQgd2l0aCBvdGhlciBlcnJvcnMnLCAoKSA9PiB7XG4gICAgICAgICAgICBiZWZvcmVBbGwoKCkgPT4ge1xuICAgICAgICAgICAgICAgIGNmbk1vY2tlZENsaWVudC5vbihEZWxldGVTdGFja0NvbW1hbmQpLnJlamVjdHMobmV3IEVycm9yKCkpO1xuICAgICAgICAgICAgICAgIGRkYk1vY2tlZENsaWVudC5vbihEZWxldGVJdGVtQ29tbWFuZCkucmVzb2x2ZXMoe30pO1xuICAgICAgICAgICAgICAgIGRkYk1vY2tlZENsaWVudC5vbihHZXRJdGVtQ29tbWFuZCkucmVzb2x2ZXMoe1xuICAgICAgICAgICAgICAgICAgICBJdGVtOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBVc2VDYXNlSWQ6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBTOiAnZmFrZS1pZCdcbiAgICAgICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgICAgICBTdGFja0lkOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgUzogJ2Zha2Utc3RhY2staWQnXG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICBzc21Nb2NrZWRDbGllbnQub24oRGVsZXRlUGFyYW1ldGVyQ29tbWFuZCkucmVzb2x2ZXMoe30pO1xuICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgIGl0KCdzaG91bGQgZmFpbCcsIGFzeW5jICgpID0+IHtcbiAgICAgICAgICAgICAgICBjb25zdCBwZXJtYW5lbnRseURlbGV0ZVVzZUNhc2VDb21tYW5kID0gbmV3IFBlcm1hbmVudGx5RGVsZXRlVXNlQ2FzZUNvbW1hbmQoKTtcbiAgICAgICAgICAgICAgICBleHBlY3QoXG4gICAgICAgICAgICAgICAgICAgIGF3YWl0IHBlcm1hbmVudGx5RGVsZXRlVXNlQ2FzZUNvbW1hbmQuZXhlY3V0ZShcbiAgICAgICAgICAgICAgICAgICAgICAgIG5ldyBVc2VDYXNlKFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICdmYWtlLWlkJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAnZmFrZS10ZXN0JyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAnQ3JlYXRlIGEgc3RhY2sgZm9yIHRlc3QnLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNmblBhcmFtZXRlcnMsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZXZlbnQuYm9keSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAndGVzdC11c2VyJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBDSEFUX1BST1ZJREVSUy5IVUdHSU5HX0ZBQ0UsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgJ0NoYXQnXG4gICAgICAgICAgICAgICAgICAgICAgICApXG4gICAgICAgICAgICAgICAgICAgIClcbiAgICAgICAgICAgICAgICApLnRvRXF1YWwoJ0ZBSUxFRCcpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIGFmdGVyQWxsKCgpID0+IHtcbiAgICAgICAgICAgIGNmbk1vY2tlZENsaWVudC5yZXNldCgpO1xuICAgICAgICAgICAgZGRiTW9ja2VkQ2xpZW50LnJlc2V0KCk7XG4gICAgICAgICAgICBzc21Nb2NrZWRDbGllbnQucmVzZXQoKTtcbiAgICAgICAgICAgIHNlY3JldHNtYW5hZ2VyTW9ja2VkQ2xpZW50LnJlc2V0KCk7XG4gICAgICAgIH0pO1xuICAgIH0pO1xuXG4gICAgZGVzY3JpYmUoJ1doZW4gZGRiIGVycm9ycyBvdXQnLCAoKSA9PiB7XG4gICAgICAgIGJlZm9yZUFsbCgoKSA9PiB7XG4gICAgICAgICAgICBjZm5Nb2NrZWRDbGllbnQucmVzZXQoKTtcbiAgICAgICAgICAgIGNmbk1vY2tlZENsaWVudC5vbihVcGRhdGVTdGFja0NvbW1hbmQpLnJlc29sdmVzKHtcbiAgICAgICAgICAgICAgICBVc2VDYXNlSWQ6ICdmYWtlLWlkJ1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICBkZGJNb2NrZWRDbGllbnQub24oUHV0SXRlbUNvbW1hbmQpLnJlamVjdHMobmV3IEVycm9yKCdGYWtlIHB1dCBpdGVtIGVycm9yIGZvciB0ZXN0aW5nJykpO1xuICAgICAgICAgICAgZGRiTW9ja2VkQ2xpZW50Lm9uKFVwZGF0ZUl0ZW1Db21tYW5kKS5yZWplY3RzKG5ldyBFcnJvcignRmFrZSB1cGRhdGUgaXRlbSBlcnJvciBmb3IgdGVzdGluZycpKTtcbiAgICAgICAgICAgIGRkYk1vY2tlZENsaWVudC5vbihEZWxldGVJdGVtQ29tbWFuZCkucmVqZWN0cyhuZXcgRXJyb3IoJ0Zha2UgZGVsZXRlIGl0ZW0gZXJyb3IgZm9yIHRlc3RpbmcnKSk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIGl0KCdzaG91bGQgcmV0dXJuIGVycm9yIGlmIGRkYiB1cGRhdGUgZmFpbHMnLCBhc3luYyAoKSA9PiB7XG4gICAgICAgICAgICBjb25zdCB1cGRhdGVTdGFja0NvbW1hbmQgPSBuZXcgVXBkYXRlVXNlQ2FzZUNvbW1hbmQoKTtcbiAgICAgICAgICAgIGV4cGVjdChcbiAgICAgICAgICAgICAgICBhd2FpdCB1cGRhdGVTdGFja0NvbW1hbmRcbiAgICAgICAgICAgICAgICAgICAgLmV4ZWN1dGUoXG4gICAgICAgICAgICAgICAgICAgICAgICBuZXcgVXNlQ2FzZShcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAnZmFrZS1pZCcsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgJ2Zha2UtdGVzdCcsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgJ0NyZWF0ZSBhIHN0YWNrIGZvciB0ZXN0JyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjZm5QYXJhbWV0ZXJzLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGV2ZW50LmJvZHksXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgJ3Rlc3QtdXNlcicsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgQ0hBVF9QUk9WSURFUlMuSFVHR0lOR19GQUNFLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICdDaGF0J1xuICAgICAgICAgICAgICAgICAgICAgICAgKVxuICAgICAgICAgICAgICAgICAgICApXG4gICAgICAgICAgICAgICAgICAgIC5jYXRjaCgoZXJyb3IpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGV4cGVjdChlcnJvcikudG9CZUluc3RhbmNlT2YoRXJyb3IpO1xuICAgICAgICAgICAgICAgICAgICAgICAgZXhwZWN0KGVycm9yLm1lc3NhZ2UpLnRvRXF1YWwoJ0Zha2UgdXBkYXRlIGl0ZW0gZXJyb3IgZm9yIHRlc3RpbmcnKTtcbiAgICAgICAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgICk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIGl0KCdzaG91bGQgcmV0dXJuIGFuIGVycm9yIGlmIGRkYiBwdXQgaXRlbSBmYWlscycsICgpID0+IHtcbiAgICAgICAgICAgIGNvbnN0IGNyZWF0ZVN0YWNrQ29tbWFuZCA9IG5ldyBDcmVhdGVVc2VDYXNlQ29tbWFuZCgpO1xuICAgICAgICAgICAgZXhwZWN0KFxuICAgICAgICAgICAgICAgIGNyZWF0ZVN0YWNrQ29tbWFuZFxuICAgICAgICAgICAgICAgICAgICAuZXhlY3V0ZShcbiAgICAgICAgICAgICAgICAgICAgICAgIG5ldyBVc2VDYXNlKFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICdmYWtlLWlkJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAnZmFrZS10ZXN0JyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAnQ3JlYXRlIGEgc3RhY2sgZm9yIHRlc3QnLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNmblBhcmFtZXRlcnMsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZXZlbnQuYm9keSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAndGVzdC11c2VyJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBDSEFUX1BST1ZJREVSUy5IVUdHSU5HX0ZBQ0UsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgJ0NoYXQnXG4gICAgICAgICAgICAgICAgICAgICAgICApXG4gICAgICAgICAgICAgICAgICAgIClcbiAgICAgICAgICAgICAgICAgICAgLmNhdGNoKChlcnJvcikgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgZXhwZWN0KGVycm9yKS50b0JlSW5zdGFuY2VPZihFcnJvcik7XG4gICAgICAgICAgICAgICAgICAgICAgICBleHBlY3QoZXJyb3IubWVzc2FnZSkudG9FcXVhbCgnRmFrZSBwdXQgaXRlbSBlcnJvciBmb3IgdGVzdGluZycpO1xuICAgICAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgaXQoJ3Nob3VsZCByZXR1cm4gYW4gZXJyb3IgaWYgZGRiIGRlbGV0ZSBpdGVtIGZhaWxzJywgKCkgPT4ge1xuICAgICAgICAgICAgY29uc3QgZGVsZXRlU3RhY2tDb21tYW5kID0gbmV3IERlbGV0ZVVzZUNhc2VDb21tYW5kKCk7XG4gICAgICAgICAgICBleHBlY3QoXG4gICAgICAgICAgICAgICAgZGVsZXRlU3RhY2tDb21tYW5kXG4gICAgICAgICAgICAgICAgICAgIC5leGVjdXRlKFxuICAgICAgICAgICAgICAgICAgICAgICAgbmV3IFVzZUNhc2UoXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgJ2Zha2UtaWQnLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICdmYWtlLXRlc3QnLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICdDcmVhdGUgYSBzdGFjayBmb3IgdGVzdCcsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdW5kZWZpbmVkLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGV2ZW50LmJvZHksXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgJ3Rlc3QtdXNlcicsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgQ0hBVF9QUk9WSURFUlMuSFVHR0lOR19GQUNFLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICdDaGF0J1xuICAgICAgICAgICAgICAgICAgICAgICAgKVxuICAgICAgICAgICAgICAgICAgICApXG4gICAgICAgICAgICAgICAgICAgIC5jYXRjaCgoZXJyb3IpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGV4cGVjdChlcnJvcikudG9CZUluc3RhbmNlT2YoRXJyb3IpO1xuICAgICAgICAgICAgICAgICAgICAgICAgZXhwZWN0KGVycm9yLm1lc3NhZ2UpLnRvRXF1YWwoJ0Zha2UgZGVsZXRlIGl0ZW0gZXJyb3IgZm9yIHRlc3RpbmcnKTtcbiAgICAgICAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgICk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIGFmdGVyQWxsKCgpID0+IHtcbiAgICAgICAgICAgIGNmbk1vY2tlZENsaWVudC5yZXNldCgpO1xuICAgICAgICAgICAgZGRiTW9ja2VkQ2xpZW50LnJlc2V0KCk7XG4gICAgICAgICAgICBzc21Nb2NrZWRDbGllbnQucmVzZXQoKTtcbiAgICAgICAgICAgIHNlY3JldHNtYW5hZ2VyTW9ja2VkQ2xpZW50LnJlc2V0KCk7XG4gICAgICAgIH0pO1xuICAgIH0pO1xuXG4gICAgZGVzY3JpYmUoJ1doZW4gc3NtIGVycm9ycyBvdXQnLCAoKSA9PiB7XG4gICAgICAgIGJlZm9yZUFsbCgoKSA9PiB7XG4gICAgICAgICAgICBjZm5Nb2NrZWRDbGllbnQucmVzZXQoKTtcbiAgICAgICAgICAgIGNmbk1vY2tlZENsaWVudC5vbihVcGRhdGVTdGFja0NvbW1hbmQpLnJlc29sdmVzKHtcbiAgICAgICAgICAgICAgICBVc2VDYXNlSWQ6ICdmYWtlLWlkJ1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICBkZGJNb2NrZWRDbGllbnQub24oUHV0SXRlbUNvbW1hbmQpLnJlc29sdmVzKHtcbiAgICAgICAgICAgICAgICBBdHRyaWJ1dGVzOiB7XG4gICAgICAgICAgICAgICAgICAgIFVzZUNhc2VJZDoge1xuICAgICAgICAgICAgICAgICAgICAgICAgUzogJ2Zha2UtaWQnXG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIGRkYk1vY2tlZENsaWVudC5vbihVcGRhdGVJdGVtQ29tbWFuZCkucmVzb2x2ZXMoe1xuICAgICAgICAgICAgICAgIEF0dHJpYnV0ZXM6IHtcbiAgICAgICAgICAgICAgICAgICAgVXNlQ2FzZUlkOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBTOiAnZmFrZS1pZCdcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgZGRiTW9ja2VkQ2xpZW50Lm9uKERlbGV0ZUl0ZW1Db21tYW5kKS5yZXNvbHZlcyh7fSk7XG5cbiAgICAgICAgICAgIHNzbU1vY2tlZENsaWVudC5vbihHZXRQYXJhbWV0ZXJDb21tYW5kKS5yZWplY3RzKG5ldyBFcnJvcignRmFrZSBzc20gZXJyb3IgZm9yIHRlc3RpbmcnKSk7XG4gICAgICAgICAgICBzc21Nb2NrZWRDbGllbnQub24oUHV0UGFyYW1ldGVyQ29tbWFuZCkucmVqZWN0cyhuZXcgRXJyb3IoJ0Zha2Ugc3NtIGVycm9yIGZvciB0ZXN0aW5nJykpO1xuICAgICAgICAgICAgc3NtTW9ja2VkQ2xpZW50Lm9uKERlbGV0ZVBhcmFtZXRlckNvbW1hbmQpLnJlamVjdHMobmV3IEVycm9yKCdGYWtlIHNzbSBlcnJvciBmb3IgdGVzdGluZycpKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgaXQoJ3Nob3VsZCByZXR1cm4gZXJyb3IgaWYgc3NtIHVwZGF0ZSBmYWlscycsIGFzeW5jICgpID0+IHtcbiAgICAgICAgICAgIGNvbnN0IHVwZGF0ZVN0YWNrQ29tbWFuZCA9IG5ldyBVcGRhdGVVc2VDYXNlQ29tbWFuZCgpO1xuICAgICAgICAgICAgZXhwZWN0KFxuICAgICAgICAgICAgICAgIGF3YWl0IHVwZGF0ZVN0YWNrQ29tbWFuZFxuICAgICAgICAgICAgICAgICAgICAuZXhlY3V0ZShcbiAgICAgICAgICAgICAgICAgICAgICAgIG5ldyBVc2VDYXNlKFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICdmYWtlLWlkJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAnZmFrZS10ZXN0JyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAnQ3JlYXRlIGEgc3RhY2sgZm9yIHRlc3QnLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNmblBhcmFtZXRlcnMsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZXZlbnQuYm9keSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAndGVzdC11c2VyJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBDSEFUX1BST1ZJREVSUy5IVUdHSU5HX0ZBQ0UsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgJ0NoYXQnXG4gICAgICAgICAgICAgICAgICAgICAgICApXG4gICAgICAgICAgICAgICAgICAgIClcbiAgICAgICAgICAgICAgICAgICAgLmNhdGNoKChlcnJvcikgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgZXhwZWN0KGVycm9yKS50b0JlSW5zdGFuY2VPZihFcnJvcik7XG4gICAgICAgICAgICAgICAgICAgICAgICBleHBlY3QoZXJyb3IubWVzc2FnZSkudG9FcXVhbCgnRmFrZSBzc20gZXJyb3IgZm9yIHRlc3RpbmcnKTtcbiAgICAgICAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgICk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIGl0KCdzaG91bGQgcmV0dXJuIGFuIGVycm9yIGlmIGRkYiBwdXQgaXRlbSBmYWlscycsICgpID0+IHtcbiAgICAgICAgICAgIGNvbnN0IGNyZWF0ZVN0YWNrQ29tbWFuZCA9IG5ldyBDcmVhdGVVc2VDYXNlQ29tbWFuZCgpO1xuICAgICAgICAgICAgZXhwZWN0KFxuICAgICAgICAgICAgICAgIGNyZWF0ZVN0YWNrQ29tbWFuZFxuICAgICAgICAgICAgICAgICAgICAuZXhlY3V0ZShcbiAgICAgICAgICAgICAgICAgICAgICAgIG5ldyBVc2VDYXNlKFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICdmYWtlLWlkJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAnZmFrZS10ZXN0JyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAnQ3JlYXRlIGEgc3RhY2sgZm9yIHRlc3QnLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNmblBhcmFtZXRlcnMsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZXZlbnQuYm9keSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAndGVzdC11c2VyJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBDSEFUX1BST1ZJREVSUy5IVUdHSU5HX0ZBQ0UsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgJ0NoYXQnXG4gICAgICAgICAgICAgICAgICAgICAgICApXG4gICAgICAgICAgICAgICAgICAgIClcbiAgICAgICAgICAgICAgICAgICAgLmNhdGNoKChlcnJvcikgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgZXhwZWN0KGVycm9yKS50b0JlSW5zdGFuY2VPZihFcnJvcik7XG4gICAgICAgICAgICAgICAgICAgICAgICBleHBlY3QoZXJyb3IubWVzc2FnZSkudG9FcXVhbCgnRmFrZSBzc20gZXJyb3IgZm9yIHRlc3RpbmcnKTtcbiAgICAgICAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgICk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIGl0KCdzaG91bGQgcmV0dXJuIGFuIGVycm9yIGlmIGRkYiBkZWxldGUgaXRlbSBmYWlscycsICgpID0+IHtcbiAgICAgICAgICAgIGNvbnN0IGRlbGV0ZVN0YWNrQ29tbWFuZCA9IG5ldyBEZWxldGVVc2VDYXNlQ29tbWFuZCgpO1xuICAgICAgICAgICAgZXhwZWN0KFxuICAgICAgICAgICAgICAgIGRlbGV0ZVN0YWNrQ29tbWFuZFxuICAgICAgICAgICAgICAgICAgICAuZXhlY3V0ZShcbiAgICAgICAgICAgICAgICAgICAgICAgIG5ldyBVc2VDYXNlKFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICdmYWtlLWlkJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAnZmFrZS10ZXN0JyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAnQ3JlYXRlIGEgc3RhY2sgZm9yIHRlc3QnLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHVuZGVmaW5lZCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBldmVudC5ib2R5LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICd0ZXN0LXVzZXInLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIENIQVRfUFJPVklERVJTLkhVR0dJTkdfRkFDRSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAnQ2hhdCdcbiAgICAgICAgICAgICAgICAgICAgICAgIClcbiAgICAgICAgICAgICAgICAgICAgKVxuICAgICAgICAgICAgICAgICAgICAuY2F0Y2goKGVycm9yKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBleHBlY3QoZXJyb3IpLnRvQmVJbnN0YW5jZU9mKEVycm9yKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGV4cGVjdChlcnJvci5tZXNzYWdlKS50b0VxdWFsKCdGYWtlIHNzbSBlcnJvciBmb3IgdGVzdGluZycpO1xuICAgICAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgYWZ0ZXJBbGwoKCkgPT4ge1xuICAgICAgICAgICAgY2ZuTW9ja2VkQ2xpZW50LnJlc2V0KCk7XG4gICAgICAgICAgICBkZGJNb2NrZWRDbGllbnQucmVzZXQoKTtcbiAgICAgICAgICAgIHNzbU1vY2tlZENsaWVudC5yZXNldCgpO1xuICAgICAgICAgICAgc2VjcmV0c21hbmFnZXJNb2NrZWRDbGllbnQucmVzZXQoKTtcbiAgICAgICAgfSk7XG4gICAgfSk7XG5cbiAgICBhZnRlckFsbCgoKSA9PiB7XG4gICAgICAgIGRlbGV0ZSBwcm9jZXNzLmVudi5BV1NfU0RLX1VTRVJfQUdFTlQ7XG4gICAgICAgIGRlbGV0ZSBwcm9jZXNzLmVudltQT1dFUlRPT0xTX01FVFJJQ1NfTkFNRVNQQUNFX0VOVl9WQVJdO1xuICAgICAgICBkZWxldGUgcHJvY2Vzcy5lbnZbVVNFX0NBU0VTX1RBQkxFX05BTUVfRU5WX1ZBUl07XG4gICAgICAgIGRlbGV0ZSBwcm9jZXNzLmVudltBUlRJRkFDVF9CVUNLRVRfRU5WX1ZBUl07XG4gICAgICAgIGRlbGV0ZSBwcm9jZXNzLmVudltDRk5fREVQTE9ZX1JPTEVfQVJOX0VOVl9WQVJdO1xuICAgICAgICBkZWxldGUgcHJvY2Vzcy5lbnZbVVNFX0NBU0VfQ09ORklHX1NTTV9QQVJBTUVURVJfUFJFRklYX0VOVl9WQVJdO1xuICAgICAgICBkZWxldGUgcHJvY2Vzcy5lbnZbV0VCQ09ORklHX1NTTV9LRVlfRU5WX1ZBUl07XG4gICAgICAgIGRlbGV0ZSBwcm9jZXNzLmVudltVU0VfQ0FTRV9BUElfS0VZX1NVRkZJWF9FTlZfVkFSXTtcbiAgICAgICAgZGVsZXRlIHByb2Nlc3MuZW52W0lTX0lOVEVSTkFMX1VTRVJfRU5WX1ZBUl07XG5cbiAgICAgICAgY2ZuTW9ja2VkQ2xpZW50LnJlc3RvcmUoKTtcbiAgICAgICAgZGRiTW9ja2VkQ2xpZW50LnJlc3RvcmUoKTtcbiAgICAgICAgc3NtTW9ja2VkQ2xpZW50LnJlc3RvcmUoKTtcbiAgICAgICAgc2VjcmV0c21hbmFnZXJNb2NrZWRDbGllbnQucmVzdG9yZSgpO1xuICAgIH0pO1xufSk7XG4iXX0=