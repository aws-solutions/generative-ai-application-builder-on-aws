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
    CreateStackCommandInput,
    DeleteStackCommandInput,
    DescribeStacksCommandInput,
    UpdateStackCommandInput
} from '@aws-sdk/client-cloudformation';
import {
    CreateStackCommandInputBuilder,
    DeleteStackCommandInputBuilder,
    UpdateStackCommandInputBuilder
} from '../../cfn/stack-operation-builder';
import { DescribeStacksCommandInputBuilder } from '../../cfn/stack-view-builder';
import { ChatUseCaseDeploymentAdapter, ChatUseCaseInfoAdapter, UseCase } from '../../model/use-case';
import {
    ARTIFACT_BUCKET_ENV_VAR,
    CFN_DEPLOY_ROLE_ARN_ENV_VAR,
    CHAT_PROVIDERS,
    CLIENT_ID_ENV_VAR,
    COGNITO_DOMAIN_PREFIX_VAR,
    COGNITO_POLICY_TABLE_ENV_VAR,
    CfnParameterKeys,
    IS_INTERNAL_USER_ENV_VAR,
    KnowledgeBaseTypes,
    MODEL_INFO_TABLE_NAME_ENV_VAR,
    TEMPLATE_FILE_EXTN_ENV_VAR,
    USER_POOL_ID_ENV_VAR,
    USE_CASE_CONFIG_TABLE_NAME_ENV_VAR,
    USE_EXISTING_USER_POOL_CLIENT_ENV_VAR
} from '../../utils/constants';

import {
    createUseCaseEvent,
    createUseCaseEventVPC,
    deleteUseCaseEvent,
    updateUseCaseEvent,
    updateUseCaseVPCEvent
} from '../event-test-data';

jest.mock('crypto', () => {
    return {
        ...jest.requireActual('crypto'),
        randomUUID: jest.fn().mockReturnValue('11111111-222222222-33333333-44444444-55555555')
    };
});

describe('When creating StackCommandBuilders', () => {
    let createEvent: any;
    let updateEvent: any;
    let deleteEvent: any;

    beforeAll(() => {
        process.env[ARTIFACT_BUCKET_ENV_VAR] = 'fake-bucket';
        process.env[USER_POOL_ID_ENV_VAR] = 'fake-user-pool';
        process.env[COGNITO_DOMAIN_PREFIX_VAR] = 'fake-domain-prefix';
        process.env[COGNITO_POLICY_TABLE_ENV_VAR] = 'fake-table-name';
        process.env[TEMPLATE_FILE_EXTN_ENV_VAR] = '.template.json';
        process.env[IS_INTERNAL_USER_ENV_VAR] = 'true';
        process.env[MODEL_INFO_TABLE_NAME_ENV_VAR] = 'model-info-table-name';
        process.env[USE_CASE_CONFIG_TABLE_NAME_ENV_VAR] = 'use-case-config-table-name';

        createEvent = { ...createUseCaseEvent };
        createEvent.body = JSON.stringify(createUseCaseEvent.body);

        updateEvent = updateUseCaseEvent;
        updateEvent.body = JSON.stringify(updateUseCaseEvent.body);

        deleteEvent = deleteUseCaseEvent;
    });

    describe('When creating CreateStackCommandInputBuilder with a UseCase', () => {
        let createStackCommandInput: CreateStackCommandInput;

        beforeAll(async () => {
            const cfnParameters = new Map<string, string>();
            cfnParameters.set(CfnParameterKeys.DefaultUserEmail, 'fake-email');
            const useCase = new UseCase(
                '11111111',
                'fake-test',
                'Create a stack for test',
                cfnParameters,
                JSON.parse(createEvent.body),
                'test-user',
                'fake-template-name',
                'Chat'
            );
            useCase.templateName = 'fake-template-file-name';
            const createStackInputBuilder = new CreateStackCommandInputBuilder(useCase);
            try {
                createStackCommandInput = await createStackInputBuilder.build();
            } catch (error) {
                console.error(`Error occurred, error is ${error}`);
            }
        });

        it('should create a CreateStackCommandInputBuilder with the correct properties', () => {
            expect(createStackCommandInput.StackName).toEqual('fake-test-11111111');
            expect(createStackCommandInput.TemplateURL).toEqual(
                'https://fake-bucket.s3.amazonaws.com/fake-template-file-name.template.json'
            );
            expect(createStackCommandInput.Parameters).toEqual([
                {
                    ParameterKey: CfnParameterKeys.DefaultUserEmail,
                    ParameterValue: 'fake-email'
                }
            ]);
            expect(createStackCommandInput.Capabilities).toEqual([
                'CAPABILITY_IAM',
                'CAPABILITY_AUTO_EXPAND',
                'CAPABILITY_NAMED_IAM'
            ]);
            expect(createStackCommandInput.Tags).toEqual([
                {
                    Key: 'createdVia',
                    Value: 'deploymentPlatform'
                },
                {
                    Key: 'userId',
                    Value: 'test-user'
                }
            ]);
        });
    });

    describe('When creating CreateStackCommandInputBuilder with a UseCaseAdapter from createEvent', () => {
        let createStackCommandInput: CreateStackCommandInput;

        beforeAll(async () => {
            const useCase = new ChatUseCaseDeploymentAdapter(createEvent);
            useCase.templateName = 'fake-template-file-name';
            const createStackInputBuilder = new CreateStackCommandInputBuilder(useCase);
            try {
                createStackCommandInput = await createStackInputBuilder.build();
            } catch (error) {
                console.error(`Error occurred, error is ${error}`);
            }
        });

        it('should create a CreateStackCommandInputBuilder with the correct properties', () => {
            expect(createStackCommandInput.Parameters).toEqual([
                { ParameterKey: CfnParameterKeys.KnowledgeBaseType, ParameterValue: KnowledgeBaseTypes.KENDRA },
                { ParameterKey: CfnParameterKeys.NewKendraIndexName, ParameterValue: 'fake-index-name' },
                { ParameterKey: CfnParameterKeys.RAGEnabled, ParameterValue: 'true' },
                { ParameterKey: CfnParameterKeys.DefaultUserEmail, ParameterValue: 'fake-email@example.com' },
                { ParameterKey: CfnParameterKeys.DeployUI, ParameterValue: 'Yes' },
                {
                    ParameterKey: CfnParameterKeys.UseCaseConfigRecordKey,
                    ParameterValue: '11111111-11111111'
                },
                {
                    ParameterKey: CfnParameterKeys.UseCaseConfigTableName,
                    ParameterValue: process.env[USE_CASE_CONFIG_TABLE_NAME_ENV_VAR]
                },
                { ParameterKey: CfnParameterKeys.ExistingCognitoUserPoolId, ParameterValue: 'fake-user-pool' },
                { ParameterKey: CfnParameterKeys.CognitoDomainPrefix, ParameterValue: 'fake-domain-prefix' },
                {
                    ParameterKey: CfnParameterKeys.ExistingCognitoGroupPolicyTableName,
                    ParameterValue: 'fake-table-name'
                },
                { ParameterKey: CfnParameterKeys.ExistingModelInfoTableName, ParameterValue: 'model-info-table-name' },
                { ParameterKey: CfnParameterKeys.UseCaseUUID, ParameterValue: '11111111' }
            ]);
            expect(createStackCommandInput.Capabilities).toEqual([
                'CAPABILITY_IAM',
                'CAPABILITY_AUTO_EXPAND',
                'CAPABILITY_NAMED_IAM'
            ]);
            expect(createStackCommandInput.Tags).toEqual([
                {
                    Key: 'createdVia',
                    Value: 'deploymentPlatform'
                },
                {
                    Key: 'userId',
                    Value: 'fake-user-id'
                }
            ]);
        });
    });

    describe('When creating CreateStackCommandInputBuilder with a UseCaseAdapter from createEvent for bedrock', () => {
        let createStackCommandInput: CreateStackCommandInput;

        beforeAll(async () => {
            let bedrockEvent = { ...createUseCaseEvent } as any;
            bedrockEvent.body.LlmParams.ModelProvider = CHAT_PROVIDERS.BEDROCK;
            bedrockEvent.body = JSON.stringify(bedrockEvent.body);

            const useCase = new ChatUseCaseDeploymentAdapter(bedrockEvent);
            useCase.templateName = 'fake-template-file-name';
            const createStackInputBuilder = new CreateStackCommandInputBuilder(useCase);

            try {
                createStackCommandInput = await createStackInputBuilder.build();
            } catch (error) {
                console.error(`Error occurred, error is ${error}`);
            }
        });

        it('should create a CreateStackCommandInputBuilder with the correct properties for bedrock', () => {
            expect(createStackCommandInput.Parameters).toEqual([
                { ParameterKey: CfnParameterKeys.KnowledgeBaseType, ParameterValue: KnowledgeBaseTypes.KENDRA },
                { ParameterKey: CfnParameterKeys.NewKendraIndexName, ParameterValue: 'fake-index-name' },
                { ParameterKey: CfnParameterKeys.RAGEnabled, ParameterValue: 'true' },
                { ParameterKey: CfnParameterKeys.DefaultUserEmail, ParameterValue: 'fake-email@example.com' },
                { ParameterKey: CfnParameterKeys.DeployUI, ParameterValue: 'Yes' },
                {
                    ParameterKey: CfnParameterKeys.UseCaseConfigRecordKey,
                    ParameterValue: '11111111-11111111'
                },
                {
                    ParameterKey: CfnParameterKeys.UseCaseConfigTableName,
                    ParameterValue: process.env[USE_CASE_CONFIG_TABLE_NAME_ENV_VAR]
                },
                { ParameterKey: CfnParameterKeys.ExistingCognitoUserPoolId, ParameterValue: 'fake-user-pool' },
                { ParameterKey: CfnParameterKeys.CognitoDomainPrefix, ParameterValue: 'fake-domain-prefix' },
                {
                    ParameterKey: CfnParameterKeys.ExistingCognitoGroupPolicyTableName,
                    ParameterValue: 'fake-table-name'
                },
                { ParameterKey: CfnParameterKeys.ExistingModelInfoTableName, ParameterValue: 'model-info-table-name' },
                { ParameterKey: CfnParameterKeys.UseCaseUUID, ParameterValue: '11111111' }
            ]);
            expect(createStackCommandInput.Capabilities).toEqual([
                'CAPABILITY_IAM',
                'CAPABILITY_AUTO_EXPAND',
                'CAPABILITY_NAMED_IAM'
            ]);
            expect(createStackCommandInput.Tags).toEqual([
                {
                    Key: 'createdVia',
                    Value: 'deploymentPlatform'
                },
                {
                    Key: 'userId',
                    Value: 'fake-user-id'
                }
            ]);
        });
    });

    describe('When creating CreateStackCommandInputBuilder with a UseCaseAdapter from createEvent with VPC settings', () => {
        let createStackCommandInput: CreateStackCommandInput;

        beforeAll(async () => {
            let event = { ...createUseCaseEventVPC } as any;
            event.body.LlmParams.ModelProvider = CHAT_PROVIDERS.BEDROCK;
            event.body = JSON.stringify(event.body);

            const useCase = new ChatUseCaseDeploymentAdapter(event);
            useCase.templateName = 'fake-template-file-name';
            const createStackInputBuilder = new CreateStackCommandInputBuilder(useCase);

            try {
                createStackCommandInput = await createStackInputBuilder.build();
            } catch (error) {
                console.error(`Error occurred, error is ${error}`);
            }
        });

        it('should create a CreateStackCommandInputBuilder with the correct properties for bedrock', () => {
            expect(createStackCommandInput.Parameters).toEqual([
                { ParameterKey: CfnParameterKeys.KnowledgeBaseType, ParameterValue: KnowledgeBaseTypes.KENDRA },
                { ParameterKey: CfnParameterKeys.NewKendraIndexName, ParameterValue: 'fake-index-name' },
                { ParameterKey: CfnParameterKeys.RAGEnabled, ParameterValue: 'true' },
                { ParameterKey: CfnParameterKeys.DefaultUserEmail, ParameterValue: 'fake-email@example.com' },
                { ParameterKey: CfnParameterKeys.VpcEnabled, ParameterValue: 'Yes' },
                { ParameterKey: CfnParameterKeys.CreateNewVpc, ParameterValue: 'No' },
                { ParameterKey: CfnParameterKeys.ExistingVpcId, ParameterValue: 'vpc-id' },
                { ParameterKey: CfnParameterKeys.ExistingPrivateSubnetIds, ParameterValue: 'subnet-id-1,subnet-id-2' },
                { ParameterKey: CfnParameterKeys.ExistingSecurityGroupIds, ParameterValue: 'sg-id-1' },
                {
                    ParameterKey: CfnParameterKeys.UseCaseConfigRecordKey,
                    ParameterValue: '11111111-11111111'
                },
                {
                    ParameterKey: CfnParameterKeys.UseCaseConfigTableName,
                    ParameterValue: process.env[USE_CASE_CONFIG_TABLE_NAME_ENV_VAR]
                },
                { ParameterKey: CfnParameterKeys.ExistingCognitoUserPoolId, ParameterValue: 'fake-user-pool' },
                { ParameterKey: CfnParameterKeys.CognitoDomainPrefix, ParameterValue: 'fake-domain-prefix' },
                {
                    ParameterKey: CfnParameterKeys.ExistingCognitoGroupPolicyTableName,
                    ParameterValue: 'fake-table-name'
                },
                { ParameterKey: CfnParameterKeys.ExistingModelInfoTableName, ParameterValue: 'model-info-table-name' },
                { ParameterKey: CfnParameterKeys.UseCaseUUID, ParameterValue: '11111111' }
            ]);
            expect(createStackCommandInput.Capabilities).toEqual([
                'CAPABILITY_IAM',
                'CAPABILITY_AUTO_EXPAND',
                'CAPABILITY_NAMED_IAM'
            ]);
            expect(createStackCommandInput.Tags).toEqual([
                {
                    Key: 'createdVia',
                    Value: 'deploymentPlatform'
                },
                {
                    Key: 'userId',
                    Value: 'fake-user-id'
                }
            ]);
        });
    });

    describe('When creating CreateStackCommandInputBuilder with a UseCaseAdapter from createEvent for a SageMaker endpoint', () => {
        it('should create a CreateStackCommandInputBuilder with the correct properties for sagemaker', async () => {
            let event = { ...createUseCaseEvent } as any;
            event.body.LlmParams.ModelProvider = CHAT_PROVIDERS.SAGEMAKER;
            event.body.LlmParams.ModelId = undefined;
            event.body = JSON.stringify(event.body);
            const useCaseSagemaker = new ChatUseCaseDeploymentAdapter(event);
            const createStackInputBuilder = new CreateStackCommandInputBuilder(useCaseSagemaker);
            const createStackCommandInput = await createStackInputBuilder.build();

            expect(createStackCommandInput.Parameters).toEqual([
                { ParameterKey: CfnParameterKeys.KnowledgeBaseType, ParameterValue: KnowledgeBaseTypes.KENDRA },
                { ParameterKey: CfnParameterKeys.NewKendraIndexName, ParameterValue: 'fake-index-name' },
                { ParameterKey: CfnParameterKeys.RAGEnabled, ParameterValue: 'true' },
                { ParameterKey: CfnParameterKeys.DefaultUserEmail, ParameterValue: 'fake-email@example.com' },
                { ParameterKey: CfnParameterKeys.DeployUI, ParameterValue: 'Yes' },
                {
                    ParameterKey: CfnParameterKeys.UseCaseConfigRecordKey,
                    ParameterValue: '11111111-11111111'
                },
                {
                    ParameterKey: CfnParameterKeys.UseCaseConfigTableName,
                    ParameterValue: process.env[USE_CASE_CONFIG_TABLE_NAME_ENV_VAR]
                },
                { ParameterKey: CfnParameterKeys.ExistingCognitoUserPoolId, ParameterValue: 'fake-user-pool' },
                { ParameterKey: CfnParameterKeys.CognitoDomainPrefix, ParameterValue: 'fake-domain-prefix' },
                {
                    ParameterKey: CfnParameterKeys.ExistingCognitoGroupPolicyTableName,
                    ParameterValue: 'fake-table-name'
                },
                { ParameterKey: CfnParameterKeys.ExistingModelInfoTableName, ParameterValue: 'model-info-table-name' },
                { ParameterKey: CfnParameterKeys.UseCaseUUID, ParameterValue: '11111111' }
            ]);
            expect(createStackCommandInput.Capabilities).toEqual([
                'CAPABILITY_IAM',
                'CAPABILITY_AUTO_EXPAND',
                'CAPABILITY_NAMED_IAM'
            ]);
            expect(createStackCommandInput.Tags).toEqual([
                {
                    Key: 'createdVia',
                    Value: 'deploymentPlatform'
                },
                {
                    Key: 'userId',
                    Value: 'fake-user-id'
                }
            ]);
        });
    });

    describe('When creating CreateStackCommandInputBuilder', () => {
        describe('when POOL_ID env variable is not set', () => {
            it('should not set POOL_ID when env variable is not set', async () => {
                let event = { ...createUseCaseEvent } as any;
                event.body.LlmParams.ModelProvider = CHAT_PROVIDERS.BEDROCK;
                event.body.LlmParams.BedrockLlmParams = { ModelId: 'fake-model' };
                event.body = JSON.stringify(event.body);
                const useCaseWithoutPoolID = new ChatUseCaseDeploymentAdapter(event);
                const createStackInputBuilder = new CreateStackCommandInputBuilder(useCaseWithoutPoolID);
                const createStackCommandInput = await createStackInputBuilder.build();

                expect(createStackCommandInput.Parameters).not.toContainEqual({
                    ParameterKey: CfnParameterKeys.ExistingCognitoUserPoolClient,
                    ParameterValue: expect.any(String)
                });
                expect(createStackCommandInput.Parameters).toEqual([
                    { ParameterKey: CfnParameterKeys.KnowledgeBaseType, ParameterValue: KnowledgeBaseTypes.KENDRA },
                    { ParameterKey: CfnParameterKeys.NewKendraIndexName, ParameterValue: 'fake-index-name' },
                    { ParameterKey: CfnParameterKeys.RAGEnabled, ParameterValue: 'true' },
                    { ParameterKey: CfnParameterKeys.DefaultUserEmail, ParameterValue: 'fake-email@example.com' },
                    { ParameterKey: CfnParameterKeys.DeployUI, ParameterValue: 'Yes' },
                    {
                        ParameterKey: CfnParameterKeys.UseCaseConfigRecordKey,
                        ParameterValue: '11111111-11111111'
                    },
                    {
                        ParameterKey: CfnParameterKeys.UseCaseConfigTableName,
                        ParameterValue: process.env[USE_CASE_CONFIG_TABLE_NAME_ENV_VAR]
                    },
                    { ParameterKey: CfnParameterKeys.ExistingCognitoUserPoolId, ParameterValue: 'fake-user-pool' },
                    { ParameterKey: CfnParameterKeys.CognitoDomainPrefix, ParameterValue: 'fake-domain-prefix' },
                    {
                        ParameterKey: CfnParameterKeys.ExistingCognitoGroupPolicyTableName,
                        ParameterValue: 'fake-table-name'
                    },
                    {
                        ParameterKey: CfnParameterKeys.ExistingModelInfoTableName,
                        ParameterValue: 'model-info-table-name'
                    },
                    { ParameterKey: CfnParameterKeys.UseCaseUUID, ParameterValue: '11111111' }
                ]);
                expect(useCaseWithoutPoolID.configuration.LlmParams?.BedrockLlmParams?.ModelId).toEqual('fake-model');
                expect(createStackCommandInput.Capabilities).toEqual([
                    'CAPABILITY_IAM',
                    'CAPABILITY_AUTO_EXPAND',
                    'CAPABILITY_NAMED_IAM'
                ]);
                expect(createStackCommandInput.Tags).toEqual([
                    {
                        Key: 'createdVia',
                        Value: 'deploymentPlatform'
                    },
                    {
                        Key: 'userId',
                        Value: 'fake-user-id'
                    }
                ]);
            });
        });

        describe('when POOL_ID env variable is set', () => {
            beforeAll(() => {
                process.env[USE_EXISTING_USER_POOL_CLIENT_ENV_VAR] = 'true';
                process.env[CLIENT_ID_ENV_VAR] = 'fake-pool-id';
            });

            afterAll(() => {
                delete process.env[USE_EXISTING_USER_POOL_CLIENT_ENV_VAR];
                delete process.env[CLIENT_ID_ENV_VAR];
            });

            it('should set POOL_ID when env variable is set', async () => {
                let event = { ...createUseCaseEvent } as any;
                event.body.LlmParams.ModelProvider = CHAT_PROVIDERS.BEDROCK;
                event.body.LlmParams.BedrockLlmParams = { ModelId: 'fake-model' };
                event.body = JSON.stringify(event.body);

                const useCaseWithoutPoolID = new ChatUseCaseDeploymentAdapter(event);
                const createStackInputBuilder = new CreateStackCommandInputBuilder(useCaseWithoutPoolID);
                const createStackCommandInput = await createStackInputBuilder.build();

                expect(createStackCommandInput.Parameters).toEqual([
                    { ParameterKey: CfnParameterKeys.KnowledgeBaseType, ParameterValue: KnowledgeBaseTypes.KENDRA },
                    { ParameterKey: CfnParameterKeys.NewKendraIndexName, ParameterValue: 'fake-index-name' },
                    { ParameterKey: CfnParameterKeys.RAGEnabled, ParameterValue: 'true' },
                    { ParameterKey: CfnParameterKeys.DefaultUserEmail, ParameterValue: 'fake-email@example.com' },
                    { ParameterKey: CfnParameterKeys.DeployUI, ParameterValue: 'Yes' },
                    {
                        ParameterKey: CfnParameterKeys.UseCaseConfigRecordKey,
                        ParameterValue: '11111111-11111111'
                    },
                    {
                        ParameterKey: CfnParameterKeys.UseCaseConfigTableName,
                        ParameterValue: process.env[USE_CASE_CONFIG_TABLE_NAME_ENV_VAR]
                    },
                    { ParameterKey: CfnParameterKeys.ExistingCognitoUserPoolId, ParameterValue: 'fake-user-pool' },
                    {
                        ParameterKey: CfnParameterKeys.ExistingCognitoUserPoolClient,
                        ParameterValue: 'fake-pool-id'
                    },
                    { ParameterKey: CfnParameterKeys.CognitoDomainPrefix, ParameterValue: 'fake-domain-prefix' },
                    {
                        ParameterKey: CfnParameterKeys.ExistingCognitoGroupPolicyTableName,
                        ParameterValue: 'fake-table-name'
                    },
                    {
                        ParameterKey: CfnParameterKeys.ExistingModelInfoTableName,
                        ParameterValue: 'model-info-table-name'
                    },
                    { ParameterKey: CfnParameterKeys.UseCaseUUID, ParameterValue: '11111111' }
                ]);
                expect(useCaseWithoutPoolID.configuration.LlmParams?.BedrockLlmParams?.ModelId).toEqual('fake-model');
                expect(createStackCommandInput.Capabilities).toEqual([
                    'CAPABILITY_IAM',
                    'CAPABILITY_AUTO_EXPAND',
                    'CAPABILITY_NAMED_IAM'
                ]);
                expect(createStackCommandInput.Tags).toEqual([
                    {
                        Key: 'createdVia',
                        Value: 'deploymentPlatform'
                    },
                    {
                        Key: 'userId',
                        Value: 'fake-user-id'
                    }
                ]);
            });
        });
    });

    describe('When creating UpdateStackCommandInputBuilder with a UseCase', () => {
        let updateStackInput: UpdateStackCommandInput;
        let useCase: UseCase;
        beforeAll(async () => {
            const cfnParameters = new Map<string, string>();
            cfnParameters.set(CfnParameterKeys.DefaultUserEmail, 'fake-email');
            useCase = new UseCase(
                '11111111',
                'fake-test',
                'Create a stack for test',
                cfnParameters,
                JSON.parse(updateEvent.body),
                'test-user',
                'fake-template-name',
                'Chat'
            );
            useCase.stackId = 'fake-stack-id';
        });

        it('should have the following properties', async () => {
            try {
                updateStackInput = await new UpdateStackCommandInputBuilder(useCase).build();
            } catch (error) {
                console.error(`Error occurred, error is ${error}`);
            }
            expect(updateStackInput.StackName).toEqual('fake-stack-id');
        });

        it('should add the role arn if present in builder', async () => {
            process.env[CFN_DEPLOY_ROLE_ARN_ENV_VAR] = 'fake-role-arn';
            const updateStackInputBuilder = new UpdateStackCommandInputBuilder(useCase);
            updateStackInputBuilder.setRoleArn('fake-role-arn');

            const updateStackInput = await updateStackInputBuilder.build();

            expect(updateStackInput.RoleARN).toEqual('fake-role-arn');
        });

        it('should throw error if role arn in builder does not match env variable role arn', () => {
            process.env[CFN_DEPLOY_ROLE_ARN_ENV_VAR] = 'fake-role-arn';

            expect(() => {
                const updateStackInputBuilder = new UpdateStackCommandInputBuilder(useCase);
                updateStackInputBuilder.setRoleArn('different-role-arn');
            }).toThrow(Error);
        });

        it('should not throw error if roleArn is undefined and different from env variable role arn', async () => {
            process.env[CFN_DEPLOY_ROLE_ARN_ENV_VAR] = 'fake-role-arn';

            const updateStackInputBuilder = new UpdateStackCommandInputBuilder(useCase);
            expect(() => {
                updateStackInputBuilder.setRoleArn(undefined);
            }).not.toThrow(Error);

            const updateStackInput = await updateStackInputBuilder.build();
            expect(updateStackInput.RoleARN).toBeUndefined();
        });

        afterEach(() => {
            delete process.env[CFN_DEPLOY_ROLE_ARN_ENV_VAR];
        });
    });

    describe('When creating UpdateStackCommandInputBuilder with a UseCaseAdapter from updateEvent', () => {
        let updateStackInput: UpdateStackCommandInput;

        beforeAll(async () => {
            const useCase = new ChatUseCaseDeploymentAdapter(updateEvent);
            useCase.templateName = 'fake-template-file-name';
            try {
                updateStackInput = await new UpdateStackCommandInputBuilder(useCase).build();
            } catch (error) {
                console.error(`Error occurred, error is ${error}`);
            }
        });

        it('should create a CreateStackCommandInputBuilder with the correct properties', () => {
            expect(updateStackInput.Parameters).toEqual([
                { ParameterKey: CfnParameterKeys.KnowledgeBaseType, ParameterValue: KnowledgeBaseTypes.KENDRA },
                { ParameterKey: CfnParameterKeys.NewKendraIndexName, ParameterValue: 'fake-index-name' },
                { ParameterKey: CfnParameterKeys.RAGEnabled, ParameterValue: 'true' },
                { ParameterKey: CfnParameterKeys.DefaultUserEmail, ParameterValue: 'fake-email@example.com' },
                {
                    ParameterKey: CfnParameterKeys.UseCaseConfigRecordKey,
                    ParameterValue: '11111111-11111111'
                },
                {
                    ParameterKey: CfnParameterKeys.UseCaseConfigTableName,
                    ParameterValue: process.env[USE_CASE_CONFIG_TABLE_NAME_ENV_VAR]
                },
                { ParameterKey: CfnParameterKeys.ExistingCognitoUserPoolId, ParameterValue: 'fake-user-pool' },
                { ParameterKey: CfnParameterKeys.CognitoDomainPrefix, ParameterValue: 'fake-domain-prefix' },
                {
                    ParameterKey: CfnParameterKeys.ExistingCognitoGroupPolicyTableName,
                    ParameterValue: 'fake-table-name'
                },
                { ParameterKey: CfnParameterKeys.ExistingModelInfoTableName, ParameterValue: 'model-info-table-name' },
                { ParameterKey: CfnParameterKeys.UseCaseUUID, ParameterValue: '11111111' },
                { ParameterKey: CfnParameterKeys.VpcEnabled, UsePreviousValue: true },
                { ParameterKey: CfnParameterKeys.CreateNewVpc, UsePreviousValue: true },
                { ParameterKey: CfnParameterKeys.ExistingVpcId, UsePreviousValue: true },
                { ParameterKey: CfnParameterKeys.ExistingPrivateSubnetIds, UsePreviousValue: true },
                { ParameterKey: CfnParameterKeys.ExistingSecurityGroupIds, UsePreviousValue: true }
            ]);
            expect(updateStackInput.Capabilities).toEqual([
                'CAPABILITY_IAM',
                'CAPABILITY_AUTO_EXPAND',
                'CAPABILITY_NAMED_IAM'
            ]);
            expect(updateStackInput.Tags).toEqual([
                {
                    Key: 'createdVia',
                    Value: 'deploymentPlatform'
                },
                {
                    Key: 'userId',
                    Value: 'fake-user-id'
                }
            ]);
        });

        it('should create a CreateStackCommandInputBuilder with the correct properties if some retained values are passed', async () => {
            let vpcEvent: any = updateUseCaseVPCEvent;
            vpcEvent.body = JSON.stringify(vpcEvent.body);
            const useCase2 = new ChatUseCaseDeploymentAdapter(vpcEvent);
            const updateStackInput2 = await new UpdateStackCommandInputBuilder(useCase2).build();

            expect(updateStackInput2.Parameters).toEqual([
                { ParameterKey: CfnParameterKeys.KnowledgeBaseType, ParameterValue: KnowledgeBaseTypes.KENDRA },
                { ParameterKey: CfnParameterKeys.NewKendraIndexName, ParameterValue: 'fake-index-name' },
                { ParameterKey: CfnParameterKeys.RAGEnabled, ParameterValue: 'true' },
                { ParameterKey: CfnParameterKeys.DefaultUserEmail, ParameterValue: 'fake-email@example.com' },
                {
                    ParameterKey: CfnParameterKeys.ExistingPrivateSubnetIds,
                    ParameterValue: 'subnet-id-1,subnet-id-2,subnet-id-3'
                },
                { ParameterKey: CfnParameterKeys.ExistingSecurityGroupIds, ParameterValue: 'sg-id-1,sg-id-2' },
                {
                    ParameterKey: CfnParameterKeys.UseCaseConfigRecordKey,
                    ParameterValue: '11111111-11111111'
                },
                {
                    ParameterKey: CfnParameterKeys.UseCaseConfigTableName,
                    ParameterValue: process.env[USE_CASE_CONFIG_TABLE_NAME_ENV_VAR]
                },
                { ParameterKey: CfnParameterKeys.ExistingCognitoUserPoolId, ParameterValue: 'fake-user-pool' },
                { ParameterKey: CfnParameterKeys.CognitoDomainPrefix, ParameterValue: 'fake-domain-prefix' },
                {
                    ParameterKey: CfnParameterKeys.ExistingCognitoGroupPolicyTableName,
                    ParameterValue: 'fake-table-name'
                },
                { ParameterKey: CfnParameterKeys.ExistingModelInfoTableName, ParameterValue: 'model-info-table-name' },
                { ParameterKey: CfnParameterKeys.UseCaseUUID, ParameterValue: '11111111' },
                { ParameterKey: CfnParameterKeys.VpcEnabled, UsePreviousValue: true },
                { ParameterKey: CfnParameterKeys.CreateNewVpc, UsePreviousValue: true },
                { ParameterKey: CfnParameterKeys.ExistingVpcId, UsePreviousValue: true }
            ]);
            expect(updateStackInput2.Capabilities).toEqual([
                'CAPABILITY_IAM',
                'CAPABILITY_AUTO_EXPAND',
                'CAPABILITY_NAMED_IAM'
            ]);
            expect(updateStackInput2.Tags).toEqual([
                {
                    Key: 'createdVia',
                    Value: 'deploymentPlatform'
                },
                {
                    Key: 'userId',
                    Value: 'fake-user-id'
                }
            ]);
        });
    });

    describe('When creating DeleteStackCommandInputBuilder with a UseCase', () => {
        let deleteStackInput: DeleteStackCommandInput;
        let useCase: UseCase;
        beforeAll(async () => {
            useCase = new UseCase(
                '11111111',
                'fake-test',
                'Create a stack for test',
                new Map<string, string>(),
                {},
                'test-user',
                'fake-template-name',
                'Chat'
            );
            useCase.stackId = 'fake-stack-id';
            try {
                deleteStackInput = await new DeleteStackCommandInputBuilder(useCase).build();
            } catch (error) {
                console.error(`Error occurred, error is ${error}`);
            }
        });

        it('should have the following properties', () => {
            expect(deleteStackInput.StackName).toEqual('fake-stack-id');
            expect(deleteStackInput.RoleARN).toBeUndefined();
        });

        it('should add the role arn if present in builder', async () => {
            process.env[CFN_DEPLOY_ROLE_ARN_ENV_VAR] = 'fake-role-arn';
            const updateStackInputBuilder = new DeleteStackCommandInputBuilder(useCase);
            updateStackInputBuilder.setRoleArn('fake-role-arn');

            const updateStackInput = await updateStackInputBuilder.build();

            expect(updateStackInput.RoleARN).toEqual('fake-role-arn');
            expect(deleteStackInput.StackName).toEqual('fake-stack-id');
        });

        afterEach(() => {
            delete process.env[CFN_DEPLOY_ROLE_ARN_ENV_VAR];
        });
    });

    describe('When creating DeleteStackCommandInputBuilder with a UseCaseAdapter from event', () => {
        let deleteStackInput: UpdateStackCommandInput;

        beforeAll(async () => {
            deleteEvent.pathParameters = { useCaseId: '33333333' };
            const useCase = new ChatUseCaseInfoAdapter(deleteEvent);
            useCase.templateName = 'fake-template-file-name';
            useCase.stackId = 'fake-stack-id';
            try {
                deleteStackInput = await new DeleteStackCommandInputBuilder(useCase).build();
            } catch (error) {
                console.error(`Error occurred, error is ${error}`);
            }
        });

        it('should create a CreateStackCommandInputBuilder with the correct properties', () => {
            expect(deleteStackInput.StackName).toEqual('fake-stack-id');
        });
    });

    describe('When creating DescribeStacksCommandInputBuilder with a stackInfo', () => {
        let describeStackInput: DescribeStacksCommandInput;

        beforeAll(async () => {
            const stackInfo = {
                stackArn: 'arn:aws:cloudformation:us-west-2:123456789012:stack/fake-stack-name/fake-uuid',
                stackName: 'fake-stack-name',
                stackId: 'stack/fake-stack-name/fake-uuid',
                stackInstanceAccount: '123456789012',
                stackInstanceRegion: ':us-west-2'
            };

            try {
                describeStackInput = await new DescribeStacksCommandInputBuilder(stackInfo).build();
            } catch (error) {
                console.error(`Error occurred, error is ${error}`);
            }
        });

        it('should have the following properties', () => {
            expect(describeStackInput.StackName).toEqual(
                'arn:aws:cloudformation:us-west-2:123456789012:stack/fake-stack-name/fake-uuid'
            );
        });
    });

    afterAll(() => {
        delete process.env[ARTIFACT_BUCKET_ENV_VAR];
        delete process.env[USER_POOL_ID_ENV_VAR];
        delete process.env[COGNITO_POLICY_TABLE_ENV_VAR];
        delete process.env[TEMPLATE_FILE_EXTN_ENV_VAR];
        delete process.env[IS_INTERNAL_USER_ENV_VAR];
        delete process.env[MODEL_INFO_TABLE_NAME_ENV_VAR];
        delete process.env[USE_CASE_CONFIG_TABLE_NAME_ENV_VAR];
    });
});
