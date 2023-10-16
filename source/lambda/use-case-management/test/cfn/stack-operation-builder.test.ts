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
    COGNITO_POLICY_TABLE_ENV_VAR,
    IS_INTERNAL_USER_ENV_VAR,
    TEMPLATE_FILE_EXTN_ENV_VAR,
    USER_POOL_ID_ENV_VAR,
    USE_CASE_API_KEY_SUFFIX_ENV_VAR,
    USE_CASE_CONFIG_SSM_PARAMETER_PREFIX_ENV_VAR
} from '../../utils/constants';

import { createUseCaseEvent, deleteUseCaseEvent, updateUseCaseEvent } from '../event-test-data';
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
        process.env[CFN_DEPLOY_ROLE_ARN_ENV_VAR] = 'arn:aws:iam::fake-account:role/FakeRole';
        process.env[USER_POOL_ID_ENV_VAR] = 'fake-user-pool';
        process.env[COGNITO_POLICY_TABLE_ENV_VAR] = 'fake-table-name';
        process.env[USE_CASE_CONFIG_SSM_PARAMETER_PREFIX_ENV_VAR] = 'fake-config-name';
        process.env[TEMPLATE_FILE_EXTN_ENV_VAR] = '.template.json';
        process.env[USE_CASE_API_KEY_SUFFIX_ENV_VAR] = 'api-key';
        process.env[IS_INTERNAL_USER_ENV_VAR] = 'true';

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
            cfnParameters.set('LLMProviderName', 'HuggingFace');
            cfnParameters.set('LLMProviderModelId', 'google/flan-t5-xxl');
            const useCase = new UseCase(
                '11111111-222222222-33333333-44444444-55555555',
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
                    ParameterKey: 'LLMProviderName',
                    ParameterValue: 'HuggingFace'
                },
                {
                    ParameterKey: 'LLMProviderModelId',
                    ParameterValue: 'google/flan-t5-xxl'
                }
            ]);
            expect(createStackCommandInput.RoleARN).toEqual('arn:aws:iam::fake-account:role/FakeRole');
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
                { ParameterKey: 'NewKendraIndexName', ParameterValue: 'fake-index-name' },
                { ParameterKey: 'RAGEnabled', ParameterValue: 'true' },
                { ParameterKey: 'DefaultUserEmail', ParameterValue: 'fake-email@example.com' },
                { ParameterKey: 'ChatConfigSSMParameterName', ParameterValue: 'fake-config-name/11111111/11111111' },
                { ParameterKey: 'ExistingCognitoUserPoolId', ParameterValue: 'fake-user-pool' },
                { ParameterKey: 'ExistingCognitoGroupPolicyTableName', ParameterValue: 'fake-table-name' },
                { ParameterKey: 'UseCaseUUID', ParameterValue: '11111111' },
                { ParameterKey: 'ProviderApiKeySecret', ParameterValue: '11111111/api-key' },
                { ParameterKey: 'ConsentToDataLeavingAWS', ParameterValue: 'Yes' }
            ]);
            expect(createStackCommandInput.RoleARN).toEqual('arn:aws:iam::fake-account:role/FakeRole');
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
                { ParameterKey: 'NewKendraIndexName', ParameterValue: 'fake-index-name' },
                { ParameterKey: 'RAGEnabled', ParameterValue: 'true' },
                { ParameterKey: 'DefaultUserEmail', ParameterValue: 'fake-email@example.com' },
                { ParameterKey: 'ChatConfigSSMParameterName', ParameterValue: 'fake-config-name/11111111/11111111' },
                { ParameterKey: 'ExistingCognitoUserPoolId', ParameterValue: 'fake-user-pool' },
                { ParameterKey: 'ExistingCognitoGroupPolicyTableName', ParameterValue: 'fake-table-name' },
                { ParameterKey: 'UseCaseUUID', ParameterValue: '11111111' },
                { ParameterKey: 'ProviderApiKeySecret', ParameterValue: '11111111/api-key' }
            ]);
            expect(createStackCommandInput.RoleARN).toEqual('arn:aws:iam::fake-account:role/FakeRole');
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
        beforeAll(async () => {
            const cfnParameters = new Map<string, string>();
            cfnParameters.set('LLMProviderName', 'HuggingFace');
            cfnParameters.set('LLMProviderModelId', 'google/flan-t5-xxl');
            const useCase = new UseCase(
                '11111111-222222222-33333333-44444444-55555555',
                'fake-test',
                'Create a stack for test',
                cfnParameters,
                JSON.parse(updateEvent.body),
                'test-user',
                'fake-template-name',
                'Chat'
            );
            useCase.stackId = 'fake-stack-id';
            try {
                updateStackInput = await new UpdateStackCommandInputBuilder(useCase).build();
            } catch (error) {
                console.error(`Error occurred, error is ${error}`);
            }
        });

        it('should have the following properties', () => {
            expect(updateStackInput.StackName).toEqual('fake-stack-id');
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
                { ParameterKey: 'NewKendraIndexName', ParameterValue: 'fake-index-name' },
                { ParameterKey: 'RAGEnabled', ParameterValue: 'true' },
                { ParameterKey: 'DefaultUserEmail', ParameterValue: 'fake-email@example.com' },
                { ParameterKey: 'ChatConfigSSMParameterName', ParameterValue: 'fake-config-name/11111111/11111111' },
                { ParameterKey: 'ExistingCognitoUserPoolId', ParameterValue: 'fake-user-pool' },
                { ParameterKey: 'ExistingCognitoGroupPolicyTableName', ParameterValue: 'fake-table-name' },
                { ParameterKey: 'UseCaseUUID', ParameterValue: '11111111' },
                { ParameterKey: 'ProviderApiKeySecret', ParameterValue: '11111111/api-key' },
                { ParameterKey: 'ConsentToDataLeavingAWS', ParameterValue: 'No' }
            ]);
            expect(updateStackInput.RoleARN).toEqual('arn:aws:iam::fake-account:role/FakeRole');
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
    });

    describe('When creating DeleteStackCommandInputBuilder with a UseCase', () => {
        let deleteStackInput: DeleteStackCommandInput;

        beforeAll(async () => {
            const useCase = new UseCase(
                '11111111-222222222-33333333-44444444-55555555',
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
        delete process.env[CFN_DEPLOY_ROLE_ARN_ENV_VAR];
        delete process.env[USER_POOL_ID_ENV_VAR];
        delete process.env[COGNITO_POLICY_TABLE_ENV_VAR];
        delete process.env[USE_CASE_CONFIG_SSM_PARAMETER_PREFIX_ENV_VAR];
        delete process.env[TEMPLATE_FILE_EXTN_ENV_VAR];
        delete process.env[USE_CASE_API_KEY_SUFFIX_ENV_VAR];
        delete process.env[IS_INTERNAL_USER_ENV_VAR];
    });
});
