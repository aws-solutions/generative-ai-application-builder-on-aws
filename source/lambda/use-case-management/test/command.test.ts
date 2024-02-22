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

import {
    CloudFormationClient,
    CreateStackCommand,
    DeleteStackCommand,
    DescribeStacksCommand,
    DescribeStacksCommandOutput,
    StackNotFoundException,
    UpdateStackCommand
} from '@aws-sdk/client-cloudformation';
import {
    DeleteItemCommand,
    DynamoDBClient,
    GetItemCommand,
    PutItemCommand,
    ScanCommand,
    UpdateItemCommand
} from '@aws-sdk/client-dynamodb';
import {
    CreateSecretCommand,
    DeleteSecretCommand,
    PutSecretValueCommand,
    SecretsManagerClient
} from '@aws-sdk/client-secrets-manager';
import {
    DeleteParameterCommand,
    GetParameterCommand,
    ParameterTier,
    PutParameterCommand,
    SSMClient
} from '@aws-sdk/client-ssm';
import { APIGatewayEvent } from 'aws-lambda';
import { mockClient } from 'aws-sdk-client-mock';
import 'aws-sdk-client-mock-jest';
import {
    CreateUseCaseCommand,
    DeleteUseCaseCommand,
    ListUseCasesCommand,
    PermanentlyDeleteUseCaseCommand,
    UpdateUseCaseCommand
} from '../command';
import { ListUseCasesAdapter } from '../model/list-use-cases';
import { UseCase } from '../model/use-case';
import {
    ARTIFACT_BUCKET_ENV_VAR,
    CFN_DEPLOY_ROLE_ARN_ENV_VAR,
    CHAT_PROVIDERS,
    IS_INTERNAL_USER_ENV_VAR,
    POWERTOOLS_METRICS_NAMESPACE_ENV_VAR,
    USE_CASES_TABLE_NAME_ENV_VAR,
    USE_CASE_API_KEY_SUFFIX_ENV_VAR,
    USE_CASE_CONFIG_SSM_PARAMETER_PREFIX,
    USE_CASE_CONFIG_SSM_PARAMETER_PREFIX_ENV_VAR,
    WEBCONFIG_SSM_KEY_ENV_VAR
} from '../utils/constants';
import { createUseCaseEvent } from './event-test-data';

describe('When testing Use Case Commands', () => {
    let event: any;
    let cfnParameters: Map<string, string>;
    let cfnMockedClient: any;
    let ddbMockedClient: any;
    let ssmMockedClient: any;
    let secretsmanagerMockedClient: any;

    beforeAll(() => {
        event = createUseCaseEvent;
        cfnParameters = new Map<string, string>();
        cfnParameters.set('ChatConfigSSMParameterName', '/config/fake-uuid/new');
        cfnParameters.set('ExistingCognitoUserPoolId', 'fake-user-pool');
        cfnParameters.set('ExistingCognitoGroupPolicyTableName', 'fake-table-name');

        process.env.AWS_SDK_USER_AGENT = `{ "customUserAgent": "AWSSOLUTION/SO0276/v2.0.0" }`;
        process.env[POWERTOOLS_METRICS_NAMESPACE_ENV_VAR] = 'UnitTest';
        process.env[USE_CASES_TABLE_NAME_ENV_VAR] = 'UseCaseTable';
        process.env[ARTIFACT_BUCKET_ENV_VAR] = 'fake-artifact-bucket';
        process.env[CFN_DEPLOY_ROLE_ARN_ENV_VAR] = 'arn:aws:iam::123456789012:role/fake-role';
        process.env[USE_CASE_CONFIG_SSM_PARAMETER_PREFIX] = '/config';
        process.env[WEBCONFIG_SSM_KEY_ENV_VAR] = '/fake-webconfig/key';
        process.env[USE_CASE_CONFIG_SSM_PARAMETER_PREFIX_ENV_VAR] = '/config';
        process.env[USE_CASE_API_KEY_SUFFIX_ENV_VAR] = 'api-key';
        process.env[IS_INTERNAL_USER_ENV_VAR] = 'true';

        cfnMockedClient = mockClient(CloudFormationClient);
        ddbMockedClient = mockClient(DynamoDBClient);
        ssmMockedClient = mockClient(SSMClient);
        secretsmanagerMockedClient = mockClient(SecretsManagerClient);
    });

    describe('When successfully invoking Commands', () => {
        beforeEach(() => {
            cfnMockedClient.on(CreateStackCommand).resolves({
                UseCaseId: 'fake-id'
            });
            cfnMockedClient.on(UpdateStackCommand).resolves({
                UseCaseId: 'fake-id'
            });
            cfnMockedClient.on(DeleteStackCommand).resolves({});

            ddbMockedClient.on(PutItemCommand).resolves({
                Attributes: {
                    UseCaseId: {
                        S: 'fake-id'
                    }
                }
            });
            ddbMockedClient.on(UpdateItemCommand).resolves({
                Attributes: {
                    UseCaseId: {
                        S: 'fake-id'
                    }
                }
            });
            ddbMockedClient.on(DeleteItemCommand).resolves({});
            ddbMockedClient.on(GetItemCommand).resolves({
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
                .on(GetParameterCommand, {
                    Name: '/fake-webconfig/key'
                })
                .resolves({
                    Parameter: {
                        Name: '/fake-webconfig/key',
                        Type: 'String',
                        Value: '{"ApiEndpoint": "fake.example.com","UserPoolId": "fake-user-pool","UserPoolClientId": "fake-client-id"}'
                    }
                })
                .on(GetParameterCommand, {
                    Name: '/config/fake-uuid/new'
                })
                .resolves({
                    Parameter: {
                        Name: '/config/fake-uuid/new',
                        Type: 'String',
                        Value: '{}'
                    }
                })
                .on(GetParameterCommand, {
                    Name: '/config/fake-uuid/old'
                })
                .resolves({
                    Parameter: {
                        Name: '/config/fake-uuid/old',
                        Type: 'String',
                        Value: '{"ParamKey1":"OldParamValue"}'
                    }
                })
                .on(GetParameterCommand, {
                    Name: '/config/fake-id'
                });
            ssmMockedClient.on(PutParameterCommand).resolves({ Version: 1, Tier: ParameterTier.INTELLIGENT_TIERING });
            ssmMockedClient.on(DeleteParameterCommand).resolves({});
        });

        it('should call create stack on Stack Management', async () => {
            const createStackCommand = new CreateUseCaseCommand();
            expect(
                await createStackCommand.execute(
                    new UseCase(
                        'fake-id',
                        'fake-test',
                        'Create a stack for test',
                        cfnParameters,
                        event.body,
                        'test-user',
                        CHAT_PROVIDERS.HUGGING_FACE,
                        'Chat'
                    )
                )
            ).toEqual('SUCCESS');
            expect(cfnMockedClient).toHaveReceivedCommand(CreateStackCommand);
            expect(ddbMockedClient).toHaveReceivedCommand(PutItemCommand);
            expect(ssmMockedClient).toHaveReceivedCommand(PutParameterCommand);
            expect(secretsmanagerMockedClient).toHaveReceivedCommand(CreateSecretCommand);
        });

        it('should call update stack on Stack Management', async () => {
            const updateStackCommand = new UpdateUseCaseCommand();
            expect(
                await updateStackCommand.execute(
                    new UseCase(
                        'fake-id',
                        'fake-test',
                        'Update a stack for test',
                        cfnParameters,
                        event.body,
                        'test-user',
                        CHAT_PROVIDERS.HUGGING_FACE,
                        'Chat'
                    )
                )
            ).toEqual('SUCCESS');
            expect(cfnMockedClient).toHaveReceivedCommand(UpdateStackCommand);
            expect(ddbMockedClient).toHaveReceivedCommand(GetItemCommand);
            expect(ddbMockedClient).toHaveReceivedCommand(UpdateItemCommand);
            expect(ssmMockedClient).toHaveReceivedCommand(PutParameterCommand);
            expect(secretsmanagerMockedClient).toHaveReceivedCommand(PutSecretValueCommand);
        });

        it('should call delete stack on Stack Management', async () => {
            const deleteStackCommand = new DeleteUseCaseCommand();
            expect(
                await deleteStackCommand.execute(
                    new UseCase(
                        'fake-id',
                        'fake-test',
                        'Delete a stack for test',
                        undefined,
                        event.body,
                        'test-user',
                        CHAT_PROVIDERS.HUGGING_FACE,
                        'Chat'
                    )
                )
            ).toEqual('SUCCESS');
            expect(cfnMockedClient).toHaveReceivedCommand(DeleteStackCommand);
            expect(ddbMockedClient).toHaveReceivedCommand(UpdateItemCommand);
            expect(secretsmanagerMockedClient).toHaveReceivedCommand(DeleteSecretCommand);
        });

        it('should call delete stack on Stack Management', async () => {
            const deleteStackCommand = new PermanentlyDeleteUseCaseCommand();
            expect(
                await deleteStackCommand.execute(
                    new UseCase(
                        'fake-id',
                        'fake-test',
                        'Permanently delete a stack for test',
                        undefined,
                        event.body,
                        'test-user',
                        CHAT_PROVIDERS.HUGGING_FACE,
                        'Chat'
                    )
                )
            ).toEqual('SUCCESS');
            expect(cfnMockedClient).toHaveReceivedCommand(DeleteStackCommand);
            expect(ddbMockedClient).toHaveReceivedCommand(DeleteItemCommand);
            expect(ssmMockedClient).toHaveReceivedCommand(DeleteParameterCommand);
            expect(secretsmanagerMockedClient).toHaveReceivedCommand(DeleteSecretCommand);
        });

        it('should call create stack on Stack Management, not calling secrets manager', async () => {
            const createStackCommand = new CreateUseCaseCommand();
            expect(
                await createStackCommand.execute(
                    new UseCase(
                        'fake-id',
                        'fake-test',
                        'Create a stack for test',
                        cfnParameters,
                        event.body,
                        'test-user',
                        CHAT_PROVIDERS.BEDROCK,
                        'Chat'
                    )
                )
            ).toEqual('SUCCESS');
            expect(cfnMockedClient).toHaveReceivedCommand(CreateStackCommand);
            expect(ddbMockedClient).toHaveReceivedCommand(PutItemCommand);
            expect(ssmMockedClient).toHaveReceivedCommand(PutParameterCommand);
            expect(secretsmanagerMockedClient).toHaveReceivedCommandTimes(PutSecretValueCommand, 0);
        });

        it('should call update stack on Stack Management, not calling secrets manager', async () => {
            const updateStackCommand = new UpdateUseCaseCommand();
            expect(
                await updateStackCommand.execute(
                    new UseCase(
                        'fake-id',
                        'fake-test',
                        'Update a stack for test',
                        cfnParameters,
                        event.body,
                        'test-user',
                        CHAT_PROVIDERS.BEDROCK,
                        'Chat'
                    )
                )
            ).toEqual('SUCCESS');
            expect(cfnMockedClient).toHaveReceivedCommand(UpdateStackCommand);
            expect(ddbMockedClient).toHaveReceivedCommand(GetItemCommand);
            expect(ddbMockedClient).toHaveReceivedCommand(UpdateItemCommand);
            expect(ssmMockedClient).toHaveReceivedCommand(PutParameterCommand);
            expect(secretsmanagerMockedClient).toHaveReceivedCommandTimes(PutSecretValueCommand, 0);
        });

        it('should call delete stack on Stack Management, not calling secrets manager', async () => {
            const deleteStackCommand = new DeleteUseCaseCommand();
            expect(
                await deleteStackCommand.execute(
                    new UseCase(
                        'fake-id',
                        'fake-test',
                        'Delete a stack for test',
                        undefined,
                        event.body,
                        'test-user',
                        CHAT_PROVIDERS.BEDROCK,
                        'Chat'
                    )
                )
            ).toEqual('SUCCESS');
            expect(cfnMockedClient).toHaveReceivedCommand(DeleteStackCommand);
            expect(ddbMockedClient).toHaveReceivedCommand(UpdateItemCommand);
            expect(secretsmanagerMockedClient).toHaveReceivedCommandTimes(DeleteSecretCommand, 0);
        });

        it('should call delete stack on Stack Management, not calling secrets manager', async () => {
            const deleteStackCommand = new PermanentlyDeleteUseCaseCommand();
            expect(
                await deleteStackCommand.execute(
                    new UseCase(
                        'fake-id',
                        'fake-test',
                        'Permanently delete a stack for test',
                        undefined,
                        event.body,
                        'test-user',
                        CHAT_PROVIDERS.BEDROCK,
                        'Chat'
                    )
                )
            ).toEqual('SUCCESS');
            expect(cfnMockedClient).toHaveReceivedCommand(DeleteStackCommand);
            expect(ddbMockedClient).toHaveReceivedCommand(DeleteItemCommand);
            expect(ssmMockedClient).toHaveReceivedCommand(DeleteParameterCommand);
            expect(secretsmanagerMockedClient).toHaveReceivedCommandTimes(DeleteSecretCommand, 0);
        });
        afterEach(() => {
            cfnMockedClient.reset();
            ddbMockedClient.reset();
            ssmMockedClient.reset();
            secretsmanagerMockedClient.reset();
        });
    });

    describe('When listing the deployed use case stacks', () => {
        let adaptedEvent: ListUseCasesAdapter;
        beforeAll(() => {
            cfnMockedClient = mockClient(CloudFormationClient);
            ddbMockedClient = mockClient(DynamoDBClient);
            ssmMockedClient = mockClient(SSMClient);

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
            } as DescribeStacksCommandOutput;

            cfnMockedClient.on(DescribeStacksCommand).resolves(expectedResponse);

            ssmMockedClient.on(GetParameterCommand, { Name: '/config/fake-id' }).resolves({
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
            } as Partial<APIGatewayEvent>;

            adaptedEvent = new ListUseCasesAdapter(event as APIGatewayEvent);
        });

        it('should return the list of deployed stacks', async () => {
            const listUseCaseCommand = new ListUseCasesCommand();
            const listCasesResponse = await listUseCaseCommand.execute(adaptedEvent);

            expect(listCasesResponse.deployments.length).toEqual(2);
            expect(listCasesResponse.deployments[0]).toEqual(
                expect.objectContaining({
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
                })
            );
            expect(listCasesResponse.deployments[1]).toEqual(
                expect.objectContaining({
                    CreatedBy: 'fake-user-id',
                    Description: 'test case 2',
                    Name: 'test-2',
                    ParamKey1: 'ParamValue1',
                    StackId: 'arn:aws:cloudformation:us-west-2:123456789012:stack/fake-stack-name/fake-uuid-2',
                    status: 'CREATE_COMPLETE',
                    cloudFrontWebUrl: 'mock-cloudfront-url'
                })
            );
            expect(listCasesResponse.scannedCount).toEqual(2);
        });

        it('should not fail, if ssm config key does not exist in parameter store', () => {
            ssmMockedClient
                .on(GetParameterCommand, { Name: '/config/fake-id' })
                .rejects(new Error('Fake error for testing'));
            const listUseCaseCommand = new ListUseCasesCommand();
            return expect(listUseCaseCommand.execute(adaptedEvent)).resolves.not.toThrow();
        });

        it('should throw an error, if call to get stack details fails', () => {
            cfnMockedClient.on(DescribeStacksCommand).rejects(new Error('Fake error for testing'));
            const listUseCaseCommand = new ListUseCasesCommand();
            return expect(listUseCaseCommand.execute(adaptedEvent)).rejects.toThrow();
        });

        it('should not throw error, if stack details does not contain ssm parameter store name', () => {
            cfnMockedClient.on(DescribeStacksCommand).resolves({
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
            } as DescribeStacksCommandOutput);
            const listUseCaseCommand = new ListUseCasesCommand();
            return expect(listUseCaseCommand.execute(adaptedEvent)).resolves.not.toThrow();
        });

        it('should throw an error, if fetching list of use case records fails', () => {
            ddbMockedClient.on(ScanCommand).rejects(new Error('Fake error for testing'));
            const listUseCaseCommand = new ListUseCasesCommand();
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
                cfnMockedClient.on(CreateStackCommand).rejects(new Error('Fake error for testing'));
                cfnMockedClient.on(UpdateStackCommand).rejects(new Error('Fake error for testing'));
                cfnMockedClient.on(DeleteStackCommand).rejects(new Error('Fake error for testing'));
            });

            it('should return error for create', async () => {
                const createStackCommand = new CreateUseCaseCommand();
                expect(
                    await createStackCommand.execute(
                        new UseCase(
                            'fake-id',
                            'fake-test',
                            'Create a stack for test',
                            cfnParameters,
                            event.body,
                            'test-user',
                            CHAT_PROVIDERS.HUGGING_FACE,
                            'Chat'
                        )
                    )
                ).toEqual('FAILED');
            });

            it('should return error for update', async () => {
                const updateStackCommand = new UpdateUseCaseCommand();
                expect(
                    await updateStackCommand.execute(
                        new UseCase(
                            'fake-id',
                            'fake-test',
                            'Create a stack for test',
                            cfnParameters,
                            event.body,
                            'test-user',
                            CHAT_PROVIDERS.HUGGING_FACE,
                            'Chat'
                        )
                    )
                ).toEqual('FAILED');
            });

            it('should return error for delete', async () => {
                const deleteStackCommand = new DeleteUseCaseCommand();
                expect(
                    await deleteStackCommand.execute(
                        new UseCase(
                            'fake-id',
                            'fake-test',
                            'Create a stack for test',
                            undefined,
                            event.body,
                            'test-user',
                            CHAT_PROVIDERS.HUGGING_FACE,

                            ''
                        )
                    )
                ).toEqual('FAILED');
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
                    .on(DeleteStackCommand)
                    .rejects(new StackNotFoundException({ 'message': 'Fake error', '$metadata': {} }));
                ddbMockedClient.on(DeleteItemCommand).resolves({});
                ddbMockedClient.on(GetItemCommand).resolves({
                    Item: {
                        UseCaseId: {
                            S: 'fake-id'
                        },
                        StackId: {
                            S: 'fake-stack-id'
                        }
                    }
                });
                ssmMockedClient.on(DeleteParameterCommand).resolves({});
            });

            it('should continue successfully', async () => {
                const permanentlyDeleteUseCaseCommand = new PermanentlyDeleteUseCaseCommand();
                expect(
                    await permanentlyDeleteUseCaseCommand.execute(
                        new UseCase(
                            'fake-id',
                            'fake-test',
                            'Create a stack for test',
                            cfnParameters,
                            event.body,
                            'test-user',
                            CHAT_PROVIDERS.HUGGING_FACE,
                            'Chat'
                        )
                    )
                ).toEqual('SUCCESS');
            });
        });

        describe('When cfn errors out with other errors', () => {
            beforeAll(() => {
                cfnMockedClient.on(DeleteStackCommand).rejects(new Error());
                ddbMockedClient.on(DeleteItemCommand).resolves({});
                ddbMockedClient.on(GetItemCommand).resolves({
                    Item: {
                        UseCaseId: {
                            S: 'fake-id'
                        },
                        StackId: {
                            S: 'fake-stack-id'
                        }
                    }
                });
                ssmMockedClient.on(DeleteParameterCommand).resolves({});
            });

            it('should fail', async () => {
                const permanentlyDeleteUseCaseCommand = new PermanentlyDeleteUseCaseCommand();
                expect(
                    await permanentlyDeleteUseCaseCommand.execute(
                        new UseCase(
                            'fake-id',
                            'fake-test',
                            'Create a stack for test',
                            cfnParameters,
                            event.body,
                            'test-user',
                            CHAT_PROVIDERS.HUGGING_FACE,
                            'Chat'
                        )
                    )
                ).toEqual('FAILED');
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
            cfnMockedClient.on(UpdateStackCommand).resolves({
                UseCaseId: 'fake-id'
            });
            ddbMockedClient.on(PutItemCommand).rejects(new Error('Fake put item error for testing'));
            ddbMockedClient.on(UpdateItemCommand).rejects(new Error('Fake update item error for testing'));
            ddbMockedClient.on(DeleteItemCommand).rejects(new Error('Fake delete item error for testing'));
        });

        it('should return error if ddb update fails', async () => {
            const updateStackCommand = new UpdateUseCaseCommand();
            expect(
                await updateStackCommand
                    .execute(
                        new UseCase(
                            'fake-id',
                            'fake-test',
                            'Create a stack for test',
                            cfnParameters,
                            event.body,
                            'test-user',
                            CHAT_PROVIDERS.HUGGING_FACE,
                            'Chat'
                        )
                    )
                    .catch((error) => {
                        expect(error).toBeInstanceOf(Error);
                        expect(error.message).toEqual('Fake update item error for testing');
                    })
            );
        });

        it('should return an error if ddb put item fails', () => {
            const createStackCommand = new CreateUseCaseCommand();
            expect(
                createStackCommand
                    .execute(
                        new UseCase(
                            'fake-id',
                            'fake-test',
                            'Create a stack for test',
                            cfnParameters,
                            event.body,
                            'test-user',
                            CHAT_PROVIDERS.HUGGING_FACE,
                            'Chat'
                        )
                    )
                    .catch((error) => {
                        expect(error).toBeInstanceOf(Error);
                        expect(error.message).toEqual('Fake put item error for testing');
                    })
            );
        });

        it('should return an error if ddb delete item fails', () => {
            const deleteStackCommand = new DeleteUseCaseCommand();
            expect(
                deleteStackCommand
                    .execute(
                        new UseCase(
                            'fake-id',
                            'fake-test',
                            'Create a stack for test',
                            undefined,
                            event.body,
                            'test-user',
                            CHAT_PROVIDERS.HUGGING_FACE,
                            'Chat'
                        )
                    )
                    .catch((error) => {
                        expect(error).toBeInstanceOf(Error);
                        expect(error.message).toEqual('Fake delete item error for testing');
                    })
            );
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
            cfnMockedClient.on(UpdateStackCommand).resolves({
                UseCaseId: 'fake-id'
            });
            ddbMockedClient.on(PutItemCommand).resolves({
                Attributes: {
                    UseCaseId: {
                        S: 'fake-id'
                    }
                }
            });
            ddbMockedClient.on(UpdateItemCommand).resolves({
                Attributes: {
                    UseCaseId: {
                        S: 'fake-id'
                    }
                }
            });
            ddbMockedClient.on(DeleteItemCommand).resolves({});

            ssmMockedClient.on(GetParameterCommand).rejects(new Error('Fake ssm error for testing'));
            ssmMockedClient.on(PutParameterCommand).rejects(new Error('Fake ssm error for testing'));
            ssmMockedClient.on(DeleteParameterCommand).rejects(new Error('Fake ssm error for testing'));
        });

        it('should return error if ssm update fails', async () => {
            const updateStackCommand = new UpdateUseCaseCommand();
            expect(
                await updateStackCommand
                    .execute(
                        new UseCase(
                            'fake-id',
                            'fake-test',
                            'Create a stack for test',
                            cfnParameters,
                            event.body,
                            'test-user',
                            CHAT_PROVIDERS.HUGGING_FACE,
                            'Chat'
                        )
                    )
                    .catch((error) => {
                        expect(error).toBeInstanceOf(Error);
                        expect(error.message).toEqual('Fake ssm error for testing');
                    })
            );
        });

        it('should return an error if ddb put item fails', () => {
            const createStackCommand = new CreateUseCaseCommand();
            expect(
                createStackCommand
                    .execute(
                        new UseCase(
                            'fake-id',
                            'fake-test',
                            'Create a stack for test',
                            cfnParameters,
                            event.body,
                            'test-user',
                            CHAT_PROVIDERS.HUGGING_FACE,
                            'Chat'
                        )
                    )
                    .catch((error) => {
                        expect(error).toBeInstanceOf(Error);
                        expect(error.message).toEqual('Fake ssm error for testing');
                    })
            );
        });

        it('should return an error if ddb delete item fails', () => {
            const deleteStackCommand = new DeleteUseCaseCommand();
            expect(
                deleteStackCommand
                    .execute(
                        new UseCase(
                            'fake-id',
                            'fake-test',
                            'Create a stack for test',
                            undefined,
                            event.body,
                            'test-user',
                            CHAT_PROVIDERS.HUGGING_FACE,
                            'Chat'
                        )
                    )
                    .catch((error) => {
                        expect(error).toBeInstanceOf(Error);
                        expect(error.message).toEqual('Fake ssm error for testing');
                    })
            );
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
        delete process.env[POWERTOOLS_METRICS_NAMESPACE_ENV_VAR];
        delete process.env[USE_CASES_TABLE_NAME_ENV_VAR];
        delete process.env[ARTIFACT_BUCKET_ENV_VAR];
        delete process.env[CFN_DEPLOY_ROLE_ARN_ENV_VAR];
        delete process.env[USE_CASE_CONFIG_SSM_PARAMETER_PREFIX_ENV_VAR];
        delete process.env[WEBCONFIG_SSM_KEY_ENV_VAR];
        delete process.env[USE_CASE_API_KEY_SUFFIX_ENV_VAR];
        delete process.env[IS_INTERNAL_USER_ENV_VAR];

        cfnMockedClient.restore();
        ddbMockedClient.restore();
        ssmMockedClient.restore();
        secretsmanagerMockedClient.restore();
    });
});
