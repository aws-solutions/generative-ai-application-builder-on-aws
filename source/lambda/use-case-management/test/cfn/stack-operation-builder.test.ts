// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

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
import { UseCase } from '../../model/use-case';

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
    STACK_DEPLOYMENT_SOURCE_USE_CASE,
    TEMPLATE_FILE_EXTN_ENV_VAR,
    USER_POOL_ID_ENV_VAR,
    USE_CASE_CONFIG_TABLE_NAME_ENV_VAR
} from '../../utils/constants';

import { AgentUseCaseDeploymentAdapter } from '../../model/adapters/agent-use-case-adapter';
import { ChatUseCaseDeploymentAdapter, ChatUseCaseInfoAdapter } from '../../model/adapters/chat-use-case-adapter';
import {
    createAgentWithCognitoConfig,
    createUseCaseEvent,
    createUseCaseEventAuthenticationParams,
    createUseCaseEventInferenceProfile,
    createUseCaseEventVPC,
    deleteUseCaseEvent,
    updateUseCaseEvent,
    updateUseCaseVPCEvent
} from '../event-test-data';

jest.mock('crypto', () => {
    return {
        ...jest.requireActual('crypto'),
        randomUUID: jest.fn().mockReturnValue('11111111-2222-2222-3333-333344444444')
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
                '11111111-2222-2222-3333-333344444444',
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

        it('should add RoleARN on create if CFN deploy role env var is set', async () => {
            process.env[CFN_DEPLOY_ROLE_ARN_ENV_VAR] = 'fake-role-arn';

            const cfnParameters = new Map<string, string>();
            cfnParameters.set(CfnParameterKeys.DefaultUserEmail, 'fake-email');
            const useCase = new UseCase(
                '11111111-2222-2222-3333-333344444444',
                'fake-test',
                'Create a stack for test',
                cfnParameters,
                JSON.parse(createEvent.body),
                'test-user',
                'fake-template-name',
                'Chat'
            );
            useCase.templateName = 'fake-template-file-name';

            const input = await new CreateStackCommandInputBuilder(useCase).build();
            expect(input.RoleARN).toEqual('fake-role-arn');

            delete process.env[CFN_DEPLOY_ROLE_ARN_ENV_VAR];
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
                { ParameterKey: CfnParameterKeys.FeedbackEnabled, ParameterValue: 'Yes' },
                { ParameterKey: CfnParameterKeys.ProvisionedConcurrencyValue, ParameterValue: '0' },
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
                    ParameterKey: CfnParameterKeys.ExistingCognitoGroupPolicyTableName,
                    ParameterValue: 'fake-table-name'
                },
                { ParameterKey: CfnParameterKeys.ExistingModelInfoTableName, ParameterValue: 'model-info-table-name' },
                { ParameterKey: CfnParameterKeys.UseCaseUUID, ParameterValue: '11111111-2222-2222-3333-333344444444' },
                { ParameterKey: CfnParameterKeys.StackDeploymentSource, ParameterValue: STACK_DEPLOYMENT_SOURCE_USE_CASE }
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
                { ParameterKey: CfnParameterKeys.FeedbackEnabled, ParameterValue: 'Yes' },
                { ParameterKey: CfnParameterKeys.ProvisionedConcurrencyValue, ParameterValue: '0' },
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
                    ParameterKey: CfnParameterKeys.ExistingCognitoGroupPolicyTableName,
                    ParameterValue: 'fake-table-name'
                },
                { ParameterKey: CfnParameterKeys.ExistingModelInfoTableName, ParameterValue: 'model-info-table-name' },
                { ParameterKey: CfnParameterKeys.UseCaseUUID, ParameterValue: '11111111-2222-2222-3333-333344444444' },
                { ParameterKey: CfnParameterKeys.StackDeploymentSource, ParameterValue: STACK_DEPLOYMENT_SOURCE_USE_CASE }
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

        it('should create a CreateStackCommandInputBuilder with the correct properties for bedrock with inference profile', async () => {
            let bedrockEvent = { ...createUseCaseEventInferenceProfile } as any;
            bedrockEvent.body.LlmParams.ModelProvider = CHAT_PROVIDERS.BEDROCK;
            delete bedrockEvent.body.LlmParams.BedrockLlmParams.ModelId;
            bedrockEvent.body.LlmParams.BedrockLlmParams.InferenceProfileId = 'fakeprofile';
            bedrockEvent.body = JSON.stringify(bedrockEvent.body);

            const useCase = new ChatUseCaseDeploymentAdapter(bedrockEvent);
            useCase.templateName = 'fake-template-file-name';
            const createStackInputBuilder = new CreateStackCommandInputBuilder(useCase);

            try {
                createStackCommandInput = await createStackInputBuilder.build();
            } catch (error) {
                console.error(`Error occurred, error is ${error}`);
            }

            expect(createStackCommandInput.Parameters).toEqual([
                { ParameterKey: CfnParameterKeys.KnowledgeBaseType, ParameterValue: KnowledgeBaseTypes.KENDRA },
                { ParameterKey: CfnParameterKeys.NewKendraIndexName, ParameterValue: 'fake-index-name' },
                { ParameterKey: CfnParameterKeys.RAGEnabled, ParameterValue: 'true' },
                { ParameterKey: CfnParameterKeys.DefaultUserEmail, ParameterValue: 'fake-email@example.com' },
                { ParameterKey: CfnParameterKeys.DeployUI, ParameterValue: 'Yes' },
                { ParameterKey: CfnParameterKeys.UseInferenceProfile, ParameterValue: 'Yes' },
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
                    ParameterKey: CfnParameterKeys.ExistingCognitoGroupPolicyTableName,
                    ParameterValue: 'fake-table-name'
                },
                { ParameterKey: CfnParameterKeys.ExistingModelInfoTableName, ParameterValue: 'model-info-table-name' },
                { ParameterKey: CfnParameterKeys.UseCaseUUID, ParameterValue: '11111111-2222-2222-3333-333344444444' },
                { ParameterKey: CfnParameterKeys.StackDeploymentSource, ParameterValue: STACK_DEPLOYMENT_SOURCE_USE_CASE }
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
                {
                    ParameterKey: CfnParameterKeys.ExistingCognitoGroupPolicyTableName,
                    ParameterValue: 'fake-table-name'
                },
                { ParameterKey: CfnParameterKeys.ExistingModelInfoTableName, ParameterValue: 'model-info-table-name' },
                { ParameterKey: CfnParameterKeys.UseCaseUUID, ParameterValue: '11111111-2222-2222-3333-333344444444' },
                { ParameterKey: CfnParameterKeys.StackDeploymentSource, ParameterValue: STACK_DEPLOYMENT_SOURCE_USE_CASE }
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

    describe('When creating CreateStackCommandInputBuilder with a UseCaseAdapter from createEvent with AuthenticationParams', () => {
        let createStackCommandInput: CreateStackCommandInput;

        beforeAll(async () => {
            let event = { ...createUseCaseEventAuthenticationParams } as any;
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

        it('should create a CreateStackCommandInputBuilder with the correct properties', () => {
            expect(createStackCommandInput.Parameters).toEqual([
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
                {
                    ParameterKey: CfnParameterKeys.ExistingCognitoUserPoolId,
                    ParameterValue: 'us-east-1_11111111111111111111'
                },
                {
                    ParameterKey: CfnParameterKeys.ExistingCognitoUserPoolClient,
                    ParameterValue: 'fake-client-id'
                },
                {
                    ParameterKey: CfnParameterKeys.ExistingCognitoGroupPolicyTableName,
                    ParameterValue: 'fake-table-name'
                },
                { ParameterKey: CfnParameterKeys.ExistingModelInfoTableName, ParameterValue: 'model-info-table-name' },
                { ParameterKey: CfnParameterKeys.UseCaseUUID, ParameterValue: '11111111-2222-2222-3333-333344444444' },
                { ParameterKey: CfnParameterKeys.StackDeploymentSource, ParameterValue: STACK_DEPLOYMENT_SOURCE_USE_CASE }
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
                { ParameterKey: CfnParameterKeys.FeedbackEnabled, ParameterValue: 'Yes' },
                { ParameterKey: CfnParameterKeys.ProvisionedConcurrencyValue, ParameterValue: '0' },
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
                    ParameterKey: CfnParameterKeys.ExistingCognitoGroupPolicyTableName,
                    ParameterValue: 'fake-table-name'
                },
                { ParameterKey: CfnParameterKeys.ExistingModelInfoTableName, ParameterValue: 'model-info-table-name' },
                { ParameterKey: CfnParameterKeys.UseCaseUUID, ParameterValue: '11111111-2222-2222-3333-333344444444' },
                { ParameterKey: CfnParameterKeys.StackDeploymentSource, ParameterValue: STACK_DEPLOYMENT_SOURCE_USE_CASE }
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

    describe('When creating UpdateStackCommandInputBuilder with a UseCase', () => {
        let updateStackInput: UpdateStackCommandInput;
        let useCase: UseCase;
        beforeAll(async () => {
            const cfnParameters = new Map<string, string>();
            cfnParameters.set(CfnParameterKeys.DefaultUserEmail, 'fake-email');
            useCase = new UseCase(
                '11111111-2222-2222-3333-333344444444',
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
                {
                    ParameterKey: CfnParameterKeys.ExistingCognitoGroupPolicyTableName,
                    ParameterValue: 'fake-table-name'
                },
                { ParameterKey: CfnParameterKeys.ExistingModelInfoTableName, ParameterValue: 'model-info-table-name' },
                { ParameterKey: CfnParameterKeys.UseCaseUUID, ParameterValue: '11111111-2222-2222-3333-333344444444' },
                { ParameterKey: CfnParameterKeys.StackDeploymentSource, ParameterValue: STACK_DEPLOYMENT_SOURCE_USE_CASE },
                { ParameterKey: CfnParameterKeys.VpcEnabled, UsePreviousValue: true },
                { ParameterKey: CfnParameterKeys.CreateNewVpc, UsePreviousValue: true },
                { ParameterKey: CfnParameterKeys.ExistingVpcId, UsePreviousValue: true },
                { ParameterKey: CfnParameterKeys.ExistingPrivateSubnetIds, UsePreviousValue: true },
                { ParameterKey: CfnParameterKeys.ExistingSecurityGroupIds, UsePreviousValue: true },
                { ParameterKey: CfnParameterKeys.ExistingCognitoUserPoolClient, UsePreviousValue: true },
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
                {
                    ParameterKey: CfnParameterKeys.ExistingCognitoGroupPolicyTableName,
                    ParameterValue: 'fake-table-name'
                },
                { ParameterKey: CfnParameterKeys.ExistingModelInfoTableName, ParameterValue: 'model-info-table-name' },
                { ParameterKey: CfnParameterKeys.UseCaseUUID, ParameterValue: '11111111-2222-2222-3333-333344444444' },
                { ParameterKey: CfnParameterKeys.StackDeploymentSource, ParameterValue: STACK_DEPLOYMENT_SOURCE_USE_CASE },
                { ParameterKey: CfnParameterKeys.VpcEnabled, UsePreviousValue: true },
                { ParameterKey: CfnParameterKeys.CreateNewVpc, UsePreviousValue: true },
                { ParameterKey: CfnParameterKeys.ExistingVpcId, UsePreviousValue: true },
                { ParameterKey: CfnParameterKeys.ExistingCognitoUserPoolClient, UsePreviousValue: true }
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
                '11111111-2222-2222-3333-333344444444',
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

describe('create stack builder with agent use case', () => {
    let createEvent: any;

    beforeAll(() => {
        process.env[ARTIFACT_BUCKET_ENV_VAR] = 'fake-bucket';
        process.env[USER_POOL_ID_ENV_VAR] = 'fake-user-pool';
        process.env[CLIENT_ID_ENV_VAR] = 'fake-user-pool-client';
        process.env[COGNITO_DOMAIN_PREFIX_VAR] = 'fake-domain-prefix';
        process.env[COGNITO_POLICY_TABLE_ENV_VAR] = 'fake-table-name';
        process.env[TEMPLATE_FILE_EXTN_ENV_VAR] = '.template.json';
        process.env[IS_INTERNAL_USER_ENV_VAR] = 'true';
        process.env[USE_CASE_CONFIG_TABLE_NAME_ENV_VAR] = 'use-case-config-table-name';

        createEvent = { ...createAgentWithCognitoConfig };
        createEvent.body = JSON.stringify(createAgentWithCognitoConfig.body);
    });

    describe('When creating CreateStackCommandInputBuilder with a UseCaseAdapter from createEvent for agent stack', () => {
        let createStackCommandInput: CreateStackCommandInput;

        beforeAll(async () => {
            const useCase = new AgentUseCaseDeploymentAdapter(createEvent);
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
                { ParameterKey: CfnParameterKeys.DefaultUserEmail, ParameterValue: 'fake-email@example.com' },
                { ParameterKey: CfnParameterKeys.DeployUI, ParameterValue: 'Yes' },
                { ParameterKey: 'BedrockAgentId', ParameterValue: 'fake-agent-id' },
                { ParameterKey: 'BedrockAgentAliasId', ParameterValue: 'fake-alias-id' },
                { ParameterKey: CfnParameterKeys.FeedbackEnabled, ParameterValue: 'Yes' },
                {
                    ParameterKey: CfnParameterKeys.UseCaseConfigRecordKey,
                    ParameterValue: '11111111-11111111'
                },
                { ParameterKey: CfnParameterKeys.ExistingCognitoUserPoolId, ParameterValue: 'fake-user-pool-id' },
                {
                    ParameterKey: CfnParameterKeys.ExistingCognitoUserPoolClient,
                    ParameterValue: 'fake-user-pool-client-id'
                },
                {
                    ParameterKey: CfnParameterKeys.UseCaseConfigTableName,
                    ParameterValue: process.env[USE_CASE_CONFIG_TABLE_NAME_ENV_VAR]
                },
                {
                    ParameterKey: CfnParameterKeys.ExistingCognitoGroupPolicyTableName,
                    ParameterValue: 'fake-table-name'
                },
                { ParameterKey: CfnParameterKeys.UseCaseUUID, ParameterValue: '11111111-2222-2222-3333-333344444444' },
                { ParameterKey: CfnParameterKeys.StackDeploymentSource, ParameterValue: STACK_DEPLOYMENT_SOURCE_USE_CASE }
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
