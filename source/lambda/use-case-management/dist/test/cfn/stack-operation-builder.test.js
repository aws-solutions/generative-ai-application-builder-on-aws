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
const stack_operation_builder_1 = require("../../cfn/stack-operation-builder");
const stack_view_builder_1 = require("../../cfn/stack-view-builder");
const use_case_1 = require("../../model/use-case");
const constants_1 = require("../../utils/constants");
const event_test_data_1 = require("../event-test-data");
jest.mock('crypto', () => {
    return {
        ...jest.requireActual('crypto'),
        randomUUID: jest.fn().mockReturnValue('11111111-222222222-33333333-44444444-55555555')
    };
});
describe('When creating StackCommandBuilders', () => {
    let createEvent;
    let updateEvent;
    let deleteEvent;
    beforeAll(() => {
        process.env[constants_1.ARTIFACT_BUCKET_ENV_VAR] = 'fake-bucket';
        process.env[constants_1.CFN_DEPLOY_ROLE_ARN_ENV_VAR] = 'arn:aws:iam::fake-account:role/FakeRole';
        process.env[constants_1.USER_POOL_ID_ENV_VAR] = 'fake-user-pool';
        process.env[constants_1.COGNITO_POLICY_TABLE_ENV_VAR] = 'fake-table-name';
        process.env[constants_1.USE_CASE_CONFIG_SSM_PARAMETER_PREFIX_ENV_VAR] = 'fake-config-name';
        process.env[constants_1.TEMPLATE_FILE_EXTN_ENV_VAR] = '.template.json';
        process.env[constants_1.USE_CASE_API_KEY_SUFFIX_ENV_VAR] = 'api-key';
        process.env[constants_1.IS_INTERNAL_USER_ENV_VAR] = 'true';
        createEvent = { ...event_test_data_1.createUseCaseEvent };
        createEvent.body = JSON.stringify(event_test_data_1.createUseCaseEvent.body);
        updateEvent = event_test_data_1.updateUseCaseEvent;
        updateEvent.body = JSON.stringify(event_test_data_1.updateUseCaseEvent.body);
        deleteEvent = event_test_data_1.deleteUseCaseEvent;
    });
    describe('When creating CreateStackCommandInputBuilder with a UseCase', () => {
        let createStackCommandInput;
        beforeAll(async () => {
            const cfnParameters = new Map();
            cfnParameters.set('LLMProviderName', 'HuggingFace');
            cfnParameters.set('LLMProviderModelId', 'google/flan-t5-xxl');
            const useCase = new use_case_1.UseCase('11111111-222222222-33333333-44444444-55555555', 'fake-test', 'Create a stack for test', cfnParameters, JSON.parse(createEvent.body), 'test-user', 'fake-template-name', 'Chat');
            useCase.templateName = 'fake-template-file-name';
            const createStackInputBuilder = new stack_operation_builder_1.CreateStackCommandInputBuilder(useCase);
            try {
                createStackCommandInput = await createStackInputBuilder.build();
            }
            catch (error) {
                console.error(`Error occurred, error is ${error}`);
            }
        });
        it('should create a CreateStackCommandInputBuilder with the correct properties', () => {
            expect(createStackCommandInput.StackName).toEqual('fake-test-11111111');
            expect(createStackCommandInput.TemplateURL).toEqual('https://fake-bucket.s3.amazonaws.com/fake-template-file-name.template.json');
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
        let createStackCommandInput;
        beforeAll(async () => {
            const useCase = new use_case_1.ChatUseCaseDeploymentAdapter(createEvent);
            useCase.templateName = 'fake-template-file-name';
            const createStackInputBuilder = new stack_operation_builder_1.CreateStackCommandInputBuilder(useCase);
            try {
                createStackCommandInput = await createStackInputBuilder.build();
            }
            catch (error) {
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
        let createStackCommandInput;
        beforeAll(async () => {
            let bedrockEvent = { ...event_test_data_1.createUseCaseEvent };
            bedrockEvent.body.LlmParams.ModelProvider = "Bedrock" /* CHAT_PROVIDERS.BEDROCK */;
            bedrockEvent.body = JSON.stringify(bedrockEvent.body);
            const useCase = new use_case_1.ChatUseCaseDeploymentAdapter(bedrockEvent);
            useCase.templateName = 'fake-template-file-name';
            const createStackInputBuilder = new stack_operation_builder_1.CreateStackCommandInputBuilder(useCase);
            try {
                createStackCommandInput = await createStackInputBuilder.build();
            }
            catch (error) {
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
        let updateStackInput;
        beforeAll(async () => {
            const cfnParameters = new Map();
            cfnParameters.set('LLMProviderName', 'HuggingFace');
            cfnParameters.set('LLMProviderModelId', 'google/flan-t5-xxl');
            const useCase = new use_case_1.UseCase('11111111-222222222-33333333-44444444-55555555', 'fake-test', 'Create a stack for test', cfnParameters, JSON.parse(updateEvent.body), 'test-user', 'fake-template-name', 'Chat');
            useCase.stackId = 'fake-stack-id';
            try {
                updateStackInput = await new stack_operation_builder_1.UpdateStackCommandInputBuilder(useCase).build();
            }
            catch (error) {
                console.error(`Error occurred, error is ${error}`);
            }
        });
        it('should have the following properties', () => {
            expect(updateStackInput.StackName).toEqual('fake-stack-id');
        });
    });
    describe('When creating UpdateStackCommandInputBuilder with a UseCaseAdapter from updateEvent', () => {
        let updateStackInput;
        beforeAll(async () => {
            const useCase = new use_case_1.ChatUseCaseDeploymentAdapter(updateEvent);
            useCase.templateName = 'fake-template-file-name';
            try {
                updateStackInput = await new stack_operation_builder_1.UpdateStackCommandInputBuilder(useCase).build();
            }
            catch (error) {
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
        let deleteStackInput;
        beforeAll(async () => {
            const useCase = new use_case_1.UseCase('11111111-222222222-33333333-44444444-55555555', 'fake-test', 'Create a stack for test', new Map(), {}, 'test-user', 'fake-template-name', 'Chat');
            useCase.stackId = 'fake-stack-id';
            try {
                deleteStackInput = await new stack_operation_builder_1.DeleteStackCommandInputBuilder(useCase).build();
            }
            catch (error) {
                console.error(`Error occurred, error is ${error}`);
            }
        });
        it('should have the following properties', () => {
            expect(deleteStackInput.StackName).toEqual('fake-stack-id');
        });
    });
    describe('When creating DeleteStackCommandInputBuilder with a UseCaseAdapter from event', () => {
        let deleteStackInput;
        beforeAll(async () => {
            deleteEvent.pathParameters = { useCaseId: '33333333' };
            const useCase = new use_case_1.ChatUseCaseInfoAdapter(deleteEvent);
            useCase.templateName = 'fake-template-file-name';
            useCase.stackId = 'fake-stack-id';
            try {
                deleteStackInput = await new stack_operation_builder_1.DeleteStackCommandInputBuilder(useCase).build();
            }
            catch (error) {
                console.error(`Error occurred, error is ${error}`);
            }
        });
        it('should create a CreateStackCommandInputBuilder with the correct properties', () => {
            expect(deleteStackInput.StackName).toEqual('fake-stack-id');
        });
    });
    describe('When creating DescribeStacksCommandInputBuilder with a stackInfo', () => {
        let describeStackInput;
        beforeAll(async () => {
            const stackInfo = {
                stackArn: 'arn:aws:cloudformation:us-west-2:123456789012:stack/fake-stack-name/fake-uuid',
                stackName: 'fake-stack-name',
                stackId: 'stack/fake-stack-name/fake-uuid',
                stackInstanceAccount: '123456789012',
                stackInstanceRegion: ':us-west-2'
            };
            try {
                describeStackInput = await new stack_view_builder_1.DescribeStacksCommandInputBuilder(stackInfo).build();
            }
            catch (error) {
                console.error(`Error occurred, error is ${error}`);
            }
        });
        it('should have the following properties', () => {
            expect(describeStackInput.StackName).toEqual('arn:aws:cloudformation:us-west-2:123456789012:stack/fake-stack-name/fake-uuid');
        });
    });
    afterAll(() => {
        delete process.env[constants_1.ARTIFACT_BUCKET_ENV_VAR];
        delete process.env[constants_1.CFN_DEPLOY_ROLE_ARN_ENV_VAR];
        delete process.env[constants_1.USER_POOL_ID_ENV_VAR];
        delete process.env[constants_1.COGNITO_POLICY_TABLE_ENV_VAR];
        delete process.env[constants_1.USE_CASE_CONFIG_SSM_PARAMETER_PREFIX_ENV_VAR];
        delete process.env[constants_1.TEMPLATE_FILE_EXTN_ENV_VAR];
        delete process.env[constants_1.USE_CASE_API_KEY_SUFFIX_ENV_VAR];
        delete process.env[constants_1.IS_INTERNAL_USER_ENV_VAR];
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3RhY2stb3BlcmF0aW9uLWJ1aWxkZXIudGVzdC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uL3Rlc3QvY2ZuL3N0YWNrLW9wZXJhdGlvbi1idWlsZGVyLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBOzs7Ozs7Ozs7Ozt1SEFXdUg7O0FBUXZILCtFQUkyQztBQUMzQyxxRUFBaUY7QUFDakYsbURBQXFHO0FBQ3JHLHFEQVUrQjtBQUUvQix3REFBZ0c7QUFDaEcsSUFBSSxDQUFDLElBQUksQ0FBQyxRQUFRLEVBQUUsR0FBRyxFQUFFO0lBQ3JCLE9BQU87UUFDSCxHQUFHLElBQUksQ0FBQyxhQUFhLENBQUMsUUFBUSxDQUFDO1FBQy9CLFVBQVUsRUFBRSxJQUFJLENBQUMsRUFBRSxFQUFFLENBQUMsZUFBZSxDQUFDLCtDQUErQyxDQUFDO0tBQ3pGLENBQUM7QUFDTixDQUFDLENBQUMsQ0FBQztBQUVILFFBQVEsQ0FBQyxvQ0FBb0MsRUFBRSxHQUFHLEVBQUU7SUFDaEQsSUFBSSxXQUFnQixDQUFDO0lBQ3JCLElBQUksV0FBZ0IsQ0FBQztJQUNyQixJQUFJLFdBQWdCLENBQUM7SUFFckIsU0FBUyxDQUFDLEdBQUcsRUFBRTtRQUNYLE9BQU8sQ0FBQyxHQUFHLENBQUMsbUNBQXVCLENBQUMsR0FBRyxhQUFhLENBQUM7UUFDckQsT0FBTyxDQUFDLEdBQUcsQ0FBQyx1Q0FBMkIsQ0FBQyxHQUFHLHlDQUF5QyxDQUFDO1FBQ3JGLE9BQU8sQ0FBQyxHQUFHLENBQUMsZ0NBQW9CLENBQUMsR0FBRyxnQkFBZ0IsQ0FBQztRQUNyRCxPQUFPLENBQUMsR0FBRyxDQUFDLHdDQUE0QixDQUFDLEdBQUcsaUJBQWlCLENBQUM7UUFDOUQsT0FBTyxDQUFDLEdBQUcsQ0FBQyx3REFBNEMsQ0FBQyxHQUFHLGtCQUFrQixDQUFDO1FBQy9FLE9BQU8sQ0FBQyxHQUFHLENBQUMsc0NBQTBCLENBQUMsR0FBRyxnQkFBZ0IsQ0FBQztRQUMzRCxP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K0IsQ0FBQyxDQUFDO1FBQ3BELE9BQU8sT0FBTyxDQUFDLEdBQUcsQ0FBQyxvQ0FBd0IsQ0FBQyxDQUFDO0lBQ2pELENBQUMsQ0FBQyxDQUFDO0FBQ1AsQ0FBQyxDQUFDLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKlxuICogIENvcHlyaWdodCBBbWF6b24uY29tLCBJbmMuIG9yIGl0cyBhZmZpbGlhdGVzLiBBbGwgUmlnaHRzIFJlc2VydmVkLiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICpcbiAqICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAqXG4gKiAgTGljZW5zZWQgdW5kZXIgdGhlIEFwYWNoZSBMaWNlbnNlLCBWZXJzaW9uIDIuMCAodGhlIFwiTGljZW5zZVwiKS4gWW91IG1heSBub3QgdXNlIHRoaXMgZmlsZSBleGNlcHQgaW4gY29tcGxpYW5jZSAgICAqXG4gKiAgd2l0aCB0aGUgTGljZW5zZS4gQSBjb3B5IG9mIHRoZSBMaWNlbnNlIGlzIGxvY2F0ZWQgYXQgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgKlxuICogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICpcbiAqICAgICAgaHR0cDovL3d3dy5hcGFjaGUub3JnL2xpY2Vuc2VzL0xJQ0VOU0UtMi4wICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAqXG4gKiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgKlxuICogIG9yIGluIHRoZSAnbGljZW5zZScgZmlsZSBhY2NvbXBhbnlpbmcgdGhpcyBmaWxlLiBUaGlzIGZpbGUgaXMgZGlzdHJpYnV0ZWQgb24gYW4gJ0FTIElTJyBCQVNJUywgV0lUSE9VVCBXQVJSQU5USUVTICpcbiAqICBPUiBDT05ESVRJT05TIE9GIEFOWSBLSU5ELCBleHByZXNzIG9yIGltcGxpZWQuIFNlZSB0aGUgTGljZW5zZSBmb3IgdGhlIHNwZWNpZmljIGxhbmd1YWdlIGdvdmVybmluZyBwZXJtaXNzaW9ucyAgICAqXG4gKiAgYW5kIGxpbWl0YXRpb25zIHVuZGVyIHRoZSBMaWNlbnNlLiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgKlxuICoqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKi9cblxuaW1wb3J0IHtcbiAgICBDcmVhdGVTdGFja0NvbW1hbmRJbnB1dCxcbiAgICBEZWxldGVTdGFja0NvbW1hbmRJbnB1dCxcbiAgICBEZXNjcmliZVN0YWNrc0NvbW1hbmRJbnB1dCxcbiAgICBVcGRhdGVTdGFja0NvbW1hbmRJbnB1dFxufSBmcm9tICdAYXdzLXNkay9jbGllbnQtY2xvdWRmb3JtYXRpb24nO1xuaW1wb3J0IHtcbiAgICBDcmVhdGVTdGFja0NvbW1hbmRJbnB1dEJ1aWxkZXIsXG4gICAgRGVsZXRlU3RhY2tDb21tYW5kSW5wdXRCdWlsZGVyLFxuICAgIFVwZGF0ZVN0YWNrQ29tbWFuZElucHV0QnVpbGRlclxufSBmcm9tICcuLi8uLi9jZm4vc3RhY2stb3BlcmF0aW9uLWJ1aWxkZXInO1xuaW1wb3J0IHsgRGVzY3JpYmVTdGFja3NDb21tYW5kSW5wdXRCdWlsZGVyIH0gZnJvbSAnLi4vLi4vY2ZuL3N0YWNrLXZpZXctYnVpbGRlcic7XG5pbXBvcnQgeyBDaGF0VXNlQ2FzZURlcGxveW1lbnRBZGFwdGVyLCBDaGF0VXNlQ2FzZUluZm9BZGFwdGVyLCBVc2VDYXNlIH0gZnJvbSAnLi4vLi4vbW9kZWwvdXNlLWNhc2UnO1xuaW1wb3J0IHtcbiAgICBBUlRJRkFDVF9CVUNLRVRfRU5WX1ZBUixcbiAgICBDRk5fREVQTE9ZX1JPTEVfQVJOX0VOVl9WQVIsXG4gICAgQ0hBVF9QUk9WSURFUlMsXG4gICAgQ09HTklUT19QT0xJQ1lfVEFCTEVfRU5WX1ZBUixcbiAgICBJU19JTlRFUk5BTF9VU0VSX0VOVl9WQVIsXG4gICAgVEVNUExBVEVfRklMRV9FWFROX0VOVl9WQVIsXG4gICAgVVNFUl9QT09MX0lEX0VOVl9WQVIsXG4gICAgVVNFX0NBU0VfQVBJX0tFWV9TVUZGSVhfRU5WX1ZBUixcbiAgICBVU0VfQ0FTRV9DT05GSUdfU1NNX1BBUkFNRVRFUl9QUkVGSVhfRU5WX1ZBUlxufSBmcm9tICcuLi8uLi91dGlscy9jb25zdGFudHMnO1xuXG5pbXBvcnQgeyBjcmVhdGVVc2VDYXNlRXZlbnQsIGRlbGV0ZVVzZUNhc2VFdmVudCwgdXBkYXRlVXNlQ2FzZUV2ZW50IH0gZnJvbSAnLi4vZXZlbnQtdGVzdC1kYXRhJztcbmplc3QubW9jaygnY3J5cHRvJywgKCkgPT4ge1xuICAgIHJldHVybiB7XG4gICAgICAgIC4uLmplc3QucmVxdWlyZUFjdHVhbCgnY3J5cHRvJyksXG4gICAgICAgIHJhbmRvbVVVSUQ6IGplc3QuZm4oKS5tb2NrUmV0dXJuVmFsdWUoJzExMTExMTExLTIyMjIyMjIyMi0zMzMzMzMzMy00NDQ0NDQ0NC01NTU1NTU1NScpXG4gICAgfTtcbn0pO1xuXG5kZXNjcmliZSgnV2hlbiBjcmVhdGluZyBTdGFja0NvbW1hbmRCdWlsZGVycycsICgpID0+IHtcbiAgICBsZXQgY3JlYXRlRXZlbnQ6IGFueTtcbiAgICBsZXQgdXBkYXRlRXZlbnQ6IGFueTtcbiAgICBsZXQgZGVsZXRlRXZlbnQ6IGFueTtcblxuICAgIGJlZm9yZUFsbCgoKSA9PiB7XG4gICAgICAgIHByb2Nlc3MuZW52W0FSVElGQUNUX0JVQ0tFVF9FTlZfVkFSXSA9ICdmYWtlLWJ1Y2tldCc7XG4gICAgICAgIHByb2Nlc3MuZW52W0NGTl9ERVBMT1lfUk9MRV9BUk5fRU5WX1ZBUl0gPSAnYXJuOmF3czppYW06OmZha2UtYWNjb3VudDpyb2xlL0Zha2VSb2xlJztcbiAgICAgICAgcHJvY2Vzcy5lbnZbVVNFUl9QT09MX0lEX0VOVl9WQVJdID0gJ2Zha2UtdXNlci1wb29sJztcbiAgICAgICAgcHJvY2Vzcy5lbnZbQ09HTklUT19QT0xJQ1lfVEFCTEVfRU5WX1ZBUl0gPSAnZmFrZS10YWJsZS1uYW1lJztcbiAgICAgICAgcHJvY2Vzcy5lbnZbVVNFX0NBU0VfQ09ORklHX1NTTV9QQVJBTUVURVJfUFJFRklYX0VOVl9WQVJdID0gJ2Zha2UtY29uZmlnLW5hbWUnO1xuICAgICAgICBwcm9jZXNzLmVudltURU1QTEFURV9GSUxFX0VYVE5fRU5WX1ZBUl0gPSAnLnRlbXBsYXRlLmpzb24nO1xuICAgICAgICBwcm9jZXNzLmVudltVU0VfQ0FTRV9BUElfS0VZX1NVRkZJWF9FTlZfVkFSXSA9ICdhcGkta2V5JztcbiAgICAgICAgcHJvY2Vzcy5lbnZbSVNfSU5URVJOQUxfVVNFUl9FTlZfVkFSXSA9ICd0cnVlJztcblxuICAgICAgICBjcmVhdGVFdmVudCA9IHsgLi4uY3JlYXRlVXNlQ2FzZUV2ZW50IH07XG4gICAgICAgIGNyZWF0ZUV2ZW50LmJvZHkgPSBKU09OLnN0cmluZ2lmeShjcmVhdGVVc2VDYXNlRXZlbnQuYm9keSk7XG5cbiAgICAgICAgdXBkYXRlRXZlbnQgPSB1cGRhdGVVc2VDYXNlRXZlbnQ7XG4gICAgICAgIHVwZGF0ZUV2ZW50LmJvZHkgPSBKU09OLnN0cmluZ2lmeSh1cGRhdGVVc2VDYXNlRXZlbnQuYm9keSk7XG5cbiAgICAgICAgZGVsZXRlRXZlbnQgPSBkZWxldGVVc2VDYXNlRXZlbnQ7XG4gICAgfSk7XG5cbiAgICBkZXNjcmliZSgnV2hlbiBjcmVhdGluZyBDcmVhdGVTdGFja0NvbW1hbmRJbnB1dEJ1aWxkZXIgd2l0aCBhIFVzZUNhc2UnLCAoKSA9PiB7XG4gICAgICAgIGxldCBjcmVhdGVTdGFja0NvbW1hbmRJbnB1dDogQ3JlYXRlU3RhY2tDb21tYW5kSW5wdXQ7XG5cbiAgICAgICAgYmVmb3JlQWxsKGFzeW5jICgpID0+IHtcbiAgICAgICAgICAgIGNvbnN0IGNmblBhcmFtZXRlcnMgPSBuZXcgTWFwPHN0cmluZywgc3RyaW5nPigpO1xuICAgICAgICAgICAgY2ZuUGFyYW1ldGVycy5zZXQoJ0xMTVByb3ZpZGVyTmFtZScsICdIdWdnaW5nRmFjZScpO1xuICAgICAgICAgICAgY2ZuUGFyYW1ldGVycy5zZXQoJ0xMTVByb3ZpZGVyTW9kZWxJZCcsICdnb29nbGUvZmxhbi10NS14eGwnKTtcbiAgICAgICAgICAgIGNvbnN0IHVzZUNhc2UgPSBuZXcgVXNlQ2FzZShcbiAgICAgICAgICAgICAgICAnMTExMTExMTEtMjIyMjIyMjIyLTMzMzMzMzMzLTQ0NDQ0NDQ0LTU1NTU1NTU1JyxcbiAgICAgICAgICAgICAgICAnZmFrZS10ZXN0JyxcbiAgICAgICAgICAgICAgICAnQ3JlYXRlIGEgc3RhY2sgZm9yIHRlc3QnLFxuICAgICAgICAgICAgICAgIGNmblBhcmFtZXRlcnMsXG4gICAgICAgICAgICAgICAgSlNPTi5wYXJzZShjcmVhdGVFdmVudC5ib2R5KSxcbiAgICAgICAgICAgICAgICAndGVzdC11c2VyJyxcbiAgICAgICAgICAgICAgICAnZmFrZS10ZW1wbGF0ZS1uYW1lJyxcbiAgICAgICAgICAgICAgICAnQ2hhdCdcbiAgICAgICAgICAgICk7XG4gICAgICAgICAgICB1c2VDYXNlLnRlbXBsYXRlTmFtZSA9ICdmYWtlLXRlbXBsYXRlLWZpbGUtbmFtZSc7XG4gICAgICAgICAgICBjb25zdCBjcmVhdGVTdGFja0lucHV0QnVpbGRlciA9IG5ldyBDcmVhdGVTdGFja0NvbW1hbmRJbnB1dEJ1aWxkZXIodXNlQ2FzZSk7XG4gICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgIGNyZWF0ZVN0YWNrQ29tbWFuZElucHV0ID0gYXdhaXQgY3JlYXRlU3RhY2tJbnB1dEJ1aWxkZXIuYnVpbGQoKTtcbiAgICAgICAgICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICAgICAgICAgICAgY29uc29sZS5lcnJvcihgRXJyb3Igb2NjdXJyZWQsIGVycm9yIGlzICR7ZXJyb3J9YCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuXG4gICAgICAgIGl0KCdzaG91bGQgY3JlYXRlIGEgQ3JlYXRlU3RhY2tDb21tYW5kSW5wdXRCdWlsZGVyIHdpdGggdGhlIGNvcnJlY3QgcHJvcGVydGllcycsICgpID0+IHtcbiAgICAgICAgICAgIGV4cGVjdChjcmVhdGVTdGFja0NvbW1hbmRJbnB1dC5TdGFja05hbWUpLnRvRXF1YWwoJ2Zha2UtdGVzdC0xMTExMTExMScpO1xuICAgICAgICAgICAgZXhwZWN0KGNyZWF0ZVN0YWNrQ29tbWFuZElucHV0LlRlbXBsYXRlVVJMKS50b0VxdWFsKFxuICAgICAgICAgICAgICAgICdodHRwczovL2Zha2UtYnVja2V0LnMzLmFtYXpvbmF3cy5jb20vZmFrZS10ZW1wbGF0ZS1maWxlLW5hbWUudGVtcGxhdGUuanNvbidcbiAgICAgICAgICAgICk7XG4gICAgICAgICAgICBleHBlY3QoY3JlYXRlU3RhY2tDb21tYW5kSW5wdXQuUGFyYW1ldGVycykudG9FcXVhbChbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICBQYXJhbWV0ZXJLZXk6ICdMTE1Qcm92aWRlck5hbWUnLFxuICAgICAgICAgICAgICAgICAgICBQYXJhbWV0ZXJWYWx1ZTogJ0h1Z2dpbmdGYWNlJ1xuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICBQYXJhbWV0ZXJLZXk6ICdMTE1Qcm92aWRlck1vZGVsSWQnLFxuICAgICAgICAgICAgICAgICAgICBQYXJhbWV0ZXJWYWx1ZTogJ2dvb2dsZS9mbGFuLXQ1LXh4bCdcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICBdKTtcbiAgICAgICAgICAgIGV4cGVjdChjcmVhdGVTdGFja0NvbW1hbmRJbnB1dC5Sb2xlQVJOKS50b0VxdWFsKCdhcm46YXdzOmlhbTo6ZmFrZS1hY2NvdW50OnJvbGUvRmFrZVJvbGUnKTtcbiAgICAgICAgICAgIGV4cGVjdChjcmVhdGVTdGFja0NvbW1hbmRJbnB1dC5DYXBhYmlsaXRpZXMpLnRvRXF1YWwoW1xuICAgICAgICAgICAgICAgICdDQVBBQklMSVRZX0lBTScsXG4gICAgICAgICAgICAgICAgJ0NBUEFCSUxJVFlfQVVUT19FWFBBTkQnLFxuICAgICAgICAgICAgICAgICdDQVBBQklMSVRZX05BTUVEX0lBTSdcbiAgICAgICAgICAgIF0pO1xuICAgICAgICAgICAgZXhwZWN0KGNyZWF0ZVN0YWNrQ29tbWFuZElucHV0LlRhZ3MpLnRvRXF1YWwoW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgS2V5OiAnY3JlYXRlZFZpYScsXG4gICAgICAgICAgICAgICAgICAgIFZhbHVlOiAnZGVwbG95bWVudFBsYXRmb3JtJ1xuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICBLZXk6ICd1c2VySWQnLFxuICAgICAgICAgICAgICAgICAgICBWYWx1ZTogJ3Rlc3QtdXNlcidcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICBdKTtcbiAgICAgICAgfSk7XG4gICAgfSk7XG5cbiAgICBkZXNjcmliZSgnV2hlbiBjcmVhdGluZyBDcmVhdGVTdGFja0NvbW1hbmRJbnB1dEJ1aWxkZXIgd2l0aCBhIFVzZUNhc2VBZGFwdGVyIGZyb20gY3JlYXRlRXZlbnQnLCAoKSA9PiB7XG4gICAgICAgIGxldCBjcmVhdGVTdGFja0NvbW1hbmRJbnB1dDogQ3JlYXRlU3RhY2tDb21tYW5kSW5wdXQ7XG5cbiAgICAgICAgYmVmb3JlQWxsKGFzeW5jICgpID0+IHtcbiAgICAgICAgICAgIGNvbnN0IHVzZUNhc2UgPSBuZXcgQ2hhdFVzZUNhc2VEZXBsb3ltZW50QWRhcHRlcihjcmVhdGVFdmVudCk7XG4gICAgICAgICAgICB1c2VDYXNlLnRlbXBsYXRlTmFtZSA9ICdmYWtlLXRlbXBsYXRlLWZpbGUtbmFtZSc7XG4gICAgICAgICAgICBjb25zdCBjcmVhdGVTdGFja0lucHV0QnVpbGRlciA9IG5ldyBDcmVhdGVTdGFja0NvbW1hbmRJbnB1dEJ1aWxkZXIodXNlQ2FzZSk7XG4gICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgIGNyZWF0ZVN0YWNrQ29tbWFuZElucHV0ID0gYXdhaXQgY3JlYXRlU3RhY2tJbnB1dEJ1aWxkZXIuYnVpbGQoKTtcbiAgICAgICAgICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICAgICAgICAgICAgY29uc29sZS5lcnJvcihgRXJyb3Igb2NjdXJyZWQsIGVycm9yIGlzICR7ZXJyb3J9YCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuXG4gICAgICAgIGl0KCdzaG91bGQgY3JlYXRlIGEgQ3JlYXRlU3RhY2tDb21tYW5kSW5wdXRCdWlsZGVyIHdpdGggdGhlIGNvcnJlY3QgcHJvcGVydGllcycsICgpID0+IHtcbiAgICAgICAgICAgIGV4cGVjdChjcmVhdGVTdGFja0NvbW1hbmRJbnB1dC5QYXJhbWV0ZXJzKS50b0VxdWFsKFtcbiAgICAgICAgICAgICAgICB7IFBhcmFtZXRlcktleTogJ05ld0tlbmRyYUluZGV4TmFtZScsIFBhcmFtZXRlclZhbHVlOiAnZmFrZS1pbmRleC1uYW1lJyB9LFxuICAgICAgICAgICAgICAgIHsgUGFyYW1ldGVyS2V5OiAnUkFHRW5hYmxlZCcsIFBhcmFtZXRlclZhbHVlOiAndHJ1ZScgfSxcbiAgICAgICAgICAgICAgICB7IFBhcmFtZXRlcktleTogJ0RlZmF1bHRVc2VyRW1haWwnLCBQYXJhbWV0ZXJWYWx1ZTogJ2Zha2UtZW1haWxAZXhhbXBsZS5jb20nIH0sXG4gICAgICAgICAgICAgICAgeyBQYXJhbWV0ZXJLZXk6ICdDaGF0Q29uZmlnU1NNUGFyYW1ldGVyTmFtZScsIFBhcmFtZXRlclZhbHVlOiAnZmFrZS1jb25maWctbmFtZS8xMTExMTExMS8xMTExMTExMScgfSxcbiAgICAgICAgICAgICAgICB7IFBhcmFtZXRlcktleTogJ0V4aXN0aW5nQ29nbml0b1VzZXJQb29sSWQnLCBQYXJhbWV0ZXJWYWx1ZTogJ2Zha2UtdXNlci1wb29sJyB9LFxuICAgICAgICAgICAgICAgIHsgUGFyYW1ldGVyS2V5OiAnRXhpc3RpbmdDb2duaXRvR3JvdXBQb2xpY3lUYWJsZU5hbWUnLCBQYXJhbWV0ZXJWYWx1ZTogJ2Zha2UtdGFibGUtbmFtZScgfSxcbiAgICAgICAgICAgICAgICB7IFBhcmFtZXRlcktleTogJ1VzZUNhc2VVVUlEJywgUGFyYW1ldGVyVmFsdWU6ICcxMTExMTExMScgfSxcbiAgICAgICAgICAgICAgICB7IFBhcmFtZXRlcktleTogJ1Byb3ZpZGVyQXBpS2V5U2VjcmV0JywgUGFyYW1ldGVyVmFsdWU6ICcxMTExMTExMS9hcGkta2V5JyB9LFxuICAgICAgICAgICAgICAgIHsgUGFyYW1ldGVyS2V5OiAnQ29uc2VudFRvRGF0YUxlYXZpbmdBV1MnLCBQYXJhbWV0ZXJWYWx1ZTogJ1llcycgfVxuICAgICAgICAgICAgXSk7XG4gICAgICAgICAgICBleHBlY3QoY3JlYXRlU3RhY2tDb21tYW5kSW5wdXQuUm9sZUFSTikudG9FcXVhbCgnYXJuOmF3czppYW06OmZha2UtYWNjb3VudDpyb2xlL0Zha2VSb2xlJyk7XG4gICAgICAgICAgICBleHBlY3QoY3JlYXRlU3RhY2tDb21tYW5kSW5wdXQuQ2FwYWJpbGl0aWVzKS50b0VxdWFsKFtcbiAgICAgICAgICAgICAgICAnQ0FQQUJJTElUWV9JQU0nLFxuICAgICAgICAgICAgICAgICdDQVBBQklMSVRZX0FVVE9fRVhQQU5EJyxcbiAgICAgICAgICAgICAgICAnQ0FQQUJJTElUWV9OQU1FRF9JQU0nXG4gICAgICAgICAgICBdKTtcbiAgICAgICAgICAgIGV4cGVjdChjcmVhdGVTdGFja0NvbW1hbmRJbnB1dC5UYWdzKS50b0VxdWFsKFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIEtleTogJ2NyZWF0ZWRWaWEnLFxuICAgICAgICAgICAgICAgICAgICBWYWx1ZTogJ2RlcGxveW1lbnRQbGF0Zm9ybSdcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgS2V5OiAndXNlcklkJyxcbiAgICAgICAgICAgICAgICAgICAgVmFsdWU6ICdmYWtlLXVzZXItaWQnXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgXSk7XG4gICAgICAgIH0pO1xuICAgIH0pO1xuXG4gICAgZGVzY3JpYmUoJ1doZW4gY3JlYXRpbmcgQ3JlYXRlU3RhY2tDb21tYW5kSW5wdXRCdWlsZGVyIHdpdGggYSBVc2VDYXNlQWRhcHRlciBmcm9tIGNyZWF0ZUV2ZW50IGZvciBiZWRyb2NrJywgKCkgPT4ge1xuICAgICAgICBsZXQgY3JlYXRlU3RhY2tDb21tYW5kSW5wdXQ6IENyZWF0ZVN0YWNrQ29tbWFuZElucHV0O1xuXG4gICAgICAgIGJlZm9yZUFsbChhc3luYyAoKSA9PiB7XG4gICAgICAgICAgICBsZXQgYmVkcm9ja0V2ZW50ID0geyAuLi5jcmVhdGVVc2VDYXNlRXZlbnQgfSBhcyBhbnk7XG4gICAgICAgICAgICBiZWRyb2NrRXZlbnQuYm9keS5MbG1QYXJhbXMuTW9kZWxQcm92aWRlciA9IENIQVRfUFJPVklERVJTLkJFRFJPQ0s7XG4gICAgICAgICAgICBiZWRyb2NrRXZlbnQuYm9keSA9IEpTT04uc3RyaW5naWZ5KGJlZHJvY2tFdmVudC5ib2R5KTtcblxuICAgICAgICAgICAgY29uc3QgdXNlQ2FzZSA9IG5ldyBDaGF0VXNlQ2FzZURlcGxveW1lbnRBZGFwdGVyKGJlZHJvY2tFdmVudCk7XG4gICAgICAgICAgICB1c2VDYXNlLnRlbXBsYXRlTmFtZSA9ICdmYWtlLXRlbXBsYXRlLWZpbGUtbmFtZSc7XG4gICAgICAgICAgICBjb25zdCBjcmVhdGVTdGFja0lucHV0QnVpbGRlciA9IG5ldyBDcmVhdGVTdGFja0NvbW1hbmRJbnB1dEJ1aWxkZXIodXNlQ2FzZSk7XG5cbiAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgY3JlYXRlU3RhY2tDb21tYW5kSW5wdXQgPSBhd2FpdCBjcmVhdGVTdGFja0lucHV0QnVpbGRlci5idWlsZCgpO1xuICAgICAgICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmVycm9yKGBFcnJvciBvY2N1cnJlZCwgZXJyb3IgaXMgJHtlcnJvcn1gKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG5cbiAgICAgICAgaXQoJ3Nob3VsZCBjcmVhdGUgYSBDcmVhdGVTdGFja0NvbW1hbmRJbnB1dEJ1aWxkZXIgd2l0aCB0aGUgY29ycmVjdCBwcm9wZXJ0aWVzIGZvciBiZWRyb2NrJywgKCkgPT4ge1xuICAgICAgICAgICAgZXhwZWN0KGNyZWF0ZVN0YWNrQ29tbWFuZElucHV0LlBhcmFtZXRlcnMpLnRvRXF1YWwoW1xuICAgICAgICAgICAgICAgIHsgUGFyYW1ldGVyS2V5OiAnTmV3S2VuZHJhSW5kZXhOYW1lJywgUGFyYW1ldGVyVmFsdWU6ICdmYWtlLWluZGV4LW5hbWUnIH0sXG4gICAgICAgICAgICAgICAgeyBQYXJhbWV0ZXJLZXk6ICdSQUdFbmFibGVkJywgUGFyYW1ldGVyVmFsdWU6ICd0cnVlJyB9LFxuICAgICAgICAgICAgICAgIHsgUGFyYW1ldGVyS2V5OiAnRGVmYXVsdFVzZXJFbWFpbCcsIFBhcmFtZXRlclZhbHVlOiAnZmFrZS1lbWFpbEBleGFtcGxlLmNvbScgfSxcbiAgICAgICAgICAgICAgICB7IFBhcmFtZXRlcktleTogJ0NoYXRDb25maWdTU01QYXJhbWV0ZXJOYW1lJywgUGFyYW1ldGVyVmFsdWU6ICdmYWtlLWNvbmZpZy1uYW1lLzExMTExMTExLzExMTExMTExJyB9LFxuICAgICAgICAgICAgICAgIHsgUGFyYW1ldGVyS2V5OiAnRXhpc3RpbmdDb2duaXRvVXNlclBvb2xJZCcsIFBhcmFtZXRlclZhbHVlOiAnZmFrZS11c2VyLXBvb2wnIH0sXG4gICAgICAgICAgICAgICAgeyBQYXJhbWV0ZXJLZXk6ICdFeGlzdGluZ0NvZ25pdG9Hcm91cFBvbGljeVRhYmxlTmFtZScsIFBhcmFtZXRlclZhbHVlOiAnZmFrZS10YWJsZS1uYW1lJyB9LFxuICAgICAgICAgICAgICAgIHsgUGFyYW1ldGVyS2V5OiAnVXNlQ2FzZVVVSUQnLCBQYXJhbWV0ZXJWYWx1ZTogJzExMTExMTExJyB9LFxuICAgICAgICAgICAgICAgIHsgUGFyYW1ldGVyS2V5OiAnUHJvdmlkZXJBcGlLZXlTZWNyZXQnLCBQYXJhbWV0ZXJWYWx1ZTogJzExMTExMTExL2FwaS1rZXknIH1cbiAgICAgICAgICAgIF0pO1xuICAgICAgICAgICAgZXhwZWN0KGNyZWF0ZVN0YWNrQ29tbWFuZElucHV0LlJvbGVBUk4pLnRvRXF1YWwoJ2Fybjphd3M6aWFtOjpmYWtlLWFjY291bnQ6cm9sZS9GYWtlUm9sZScpO1xuICAgICAgICAgICAgZXhwZWN0KGNyZWF0ZVN0YWNrQ29tbWFuZElucHV0LkNhcGFiaWxpdGllcykudG9FcXVhbChbXG4gICAgICAgICAgICAgICAgJ0NBUEFCSUxJVFlfSUFNJyxcbiAgICAgICAgICAgICAgICAnQ0FQQUJJTElUWV9BVVRPX0VYUEFORCcsXG4gICAgICAgICAgICAgICAgJ0NBUEFCSUxJVFlfTkFNRURfSUFNJ1xuICAgICAgICAgICAgXSk7XG4gICAgICAgICAgICBleHBlY3QoY3JlYXRlU3RhY2tDb21tYW5kSW5wdXQuVGFncykudG9FcXVhbChbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICBLZXk6ICdjcmVhdGVkVmlhJyxcbiAgICAgICAgICAgICAgICAgICAgVmFsdWU6ICdkZXBsb3ltZW50UGxhdGZvcm0nXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIEtleTogJ3VzZXJJZCcsXG4gICAgICAgICAgICAgICAgICAgIFZhbHVlOiAnZmFrZS11c2VyLWlkJ1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIF0pO1xuICAgICAgICB9KTtcbiAgICB9KTtcblxuICAgIGRlc2NyaWJlKCdXaGVuIGNyZWF0aW5nIFVwZGF0ZVN0YWNrQ29tbWFuZElucHV0QnVpbGRlciB3aXRoIGEgVXNlQ2FzZScsICgpID0+IHtcbiAgICAgICAgbGV0IHVwZGF0ZVN0YWNrSW5wdXQ6IFVwZGF0ZVN0YWNrQ29tbWFuZElucHV0O1xuICAgICAgICBiZWZvcmVBbGwoYXN5bmMgKCkgPT4ge1xuICAgICAgICAgICAgY29uc3QgY2ZuUGFyYW1ldGVycyA9IG5ldyBNYXA8c3RyaW5nLCBzdHJpbmc+KCk7XG4gICAgICAgICAgICBjZm5QYXJhbWV0ZXJzLnNldCgnTExNUHJvdmlkZXJOYW1lJywgJ0h1Z2dpbmdGYWNlJyk7XG4gICAgICAgICAgICBjZm5QYXJhbWV0ZXJzLnNldCgnTExNUHJvdmlkZXJNb2RlbElkJywgJ2dvb2dsZS9mbGFuLXQ1LXh4bCcpO1xuICAgICAgICAgICAgY29uc3QgdXNlQ2FzZSA9IG5ldyBVc2VDYXNlKFxuICAgICAgICAgICAgICAgICcxMTExMTExMS0yMjIyMjIyMjItMzMzMzMzMzMtNDQ0NDQ0NDQtNTU1NTU1NTUnLFxuICAgICAgICAgICAgICAgICdmYWtlLXRlc3QnLFxuICAgICAgICAgICAgICAgICdDcmVhdGUgYSBzdGFjayBmb3IgdGVzdCcsXG4gICAgICAgICAgICAgICAgY2ZuUGFyYW1ldGVycyxcbiAgICAgICAgICAgICAgICBKU09OLnBhcnNlKHVwZGF0ZUV2ZW50LmJvZHkpLFxuICAgICAgICAgICAgICAgICd0ZXN0LXVzZXInLFxuICAgICAgICAgICAgICAgICdmYWtlLXRlbXBsYXRlLW5hbWUnLFxuICAgICAgICAgICAgICAgICdDaGF0J1xuICAgICAgICAgICAgKTtcbiAgICAgICAgICAgIHVzZUNhc2Uuc3RhY2tJZCA9ICdmYWtlLXN0YWNrLWlkJztcbiAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgdXBkYXRlU3RhY2tJbnB1dCA9IGF3YWl0IG5ldyBVcGRhdGVTdGFja0NvbW1hbmRJbnB1dEJ1aWxkZXIodXNlQ2FzZSkuYnVpbGQoKTtcbiAgICAgICAgICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICAgICAgICAgICAgY29uc29sZS5lcnJvcihgRXJyb3Igb2NjdXJyZWQsIGVycm9yIGlzICR7ZXJyb3J9YCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuXG4gICAgICAgIGl0KCdzaG91bGQgaGF2ZSB0aGUgZm9sbG93aW5nIHByb3BlcnRpZXMnLCAoKSA9PiB7XG4gICAgICAgICAgICBleHBlY3QodXBkYXRlU3RhY2tJbnB1dC5TdGFja05hbWUpLnRvRXF1YWwoJ2Zha2Utc3RhY2staWQnKTtcbiAgICAgICAgfSk7XG4gICAgfSk7XG5cbiAgICBkZXNjcmliZSgnV2hlbiBjcmVhdGluZyBVcGRhdGVTdGFja0NvbW1hbmRJbnB1dEJ1aWxkZXIgd2l0aCBhIFVzZUNhc2VBZGFwdGVyIGZyb20gdXBkYXRlRXZlbnQnLCAoKSA9PiB7XG4gICAgICAgIGxldCB1cGRhdGVTdGFja0lucHV0OiBVcGRhdGVTdGFja0NvbW1hbmRJbnB1dDtcblxuICAgICAgICBiZWZvcmVBbGwoYXN5bmMgKCkgPT4ge1xuICAgICAgICAgICAgY29uc3QgdXNlQ2FzZSA9IG5ldyBDaGF0VXNlQ2FzZURlcGxveW1lbnRBZGFwdGVyKHVwZGF0ZUV2ZW50KTtcbiAgICAgICAgICAgIHVzZUNhc2UudGVtcGxhdGVOYW1lID0gJ2Zha2UtdGVtcGxhdGUtZmlsZS1uYW1lJztcbiAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgdXBkYXRlU3RhY2tJbnB1dCA9IGF3YWl0IG5ldyBVcGRhdGVTdGFja0NvbW1hbmRJbnB1dEJ1aWxkZXIodXNlQ2FzZSkuYnVpbGQoKTtcbiAgICAgICAgICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICAgICAgICAgICAgY29uc29sZS5lcnJvcihgRXJyb3Igb2NjdXJyZWQsIGVycm9yIGlzICR7ZXJyb3J9YCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuXG4gICAgICAgIGl0KCdzaG91bGQgY3JlYXRlIGEgQ3JlYXRlU3RhY2tDb21tYW5kSW5wdXRCdWlsZGVyIHdpdGggdGhlIGNvcnJlY3QgcHJvcGVydGllcycsICgpID0+IHtcbiAgICAgICAgICAgIGV4cGVjdCh1cGRhdGVTdGFja0lucHV0LlBhcmFtZXRlcnMpLnRvRXF1YWwoW1xuICAgICAgICAgICAgICAgIHsgUGFyYW1ldGVyS2V5OiAnTmV3S2VuZHJhSW5kZXhOYW1lJywgUGFyYW1ldGVyVmFsdWU6ICdmYWtlLWluZGV4LW5hbWUnIH0sXG4gICAgICAgICAgICAgICAgeyBQYXJhbWV0ZXJLZXk6ICdSQUdFbmFibGVkJywgUGFyYW1ldGVyVmFsdWU6ICd0cnVlJyB9LFxuICAgICAgICAgICAgICAgIHsgUGFyYW1ldGVyS2V5OiAnRGVmYXVsdFVzZXJFbWFpbCcsIFBhcmFtZXRlclZhbHVlOiAnZmFrZS1lbWFpbEBleGFtcGxlLmNvbScgfSxcbiAgICAgICAgICAgICAgICB7IFBhcmFtZXRlcktleTogJ0NoYXRDb25maWdTU01QYXJhbWV0ZXJOYW1lJywgUGFyYW1ldGVyVmFsdWU6ICdmYWtlLWNvbmZpZy1uYW1lLzExMTExMTExLzExMTExMTExJyB9LFxuICAgICAgICAgICAgICAgIHsgUGFyYW1ldGVyS2V5OiAnRXhpc3RpbmdDb2duaXRvVXNlclBvb2xJZCcsIFBhcmFtZXRlclZhbHVlOiAnZmFrZS11c2VyLXBvb2wnIH0sXG4gICAgICAgICAgICAgICAgeyBQYXJhbWV0ZXJLZXk6ICdFeGlzdGluZ0NvZ25pdG9Hcm91cFBvbGljeVRhYmxlTmFtZScsIFBhcmFtZXRlclZhbHVlOiAnZmFrZS10YWJsZS1uYW1lJyB9LFxuICAgICAgICAgICAgICAgIHsgUGFyYW1ldGVyS2V5OiAnVXNlQ2FzZVVVSUQnLCBQYXJhbWV0ZXJWYWx1ZTogJzExMTExMTExJyB9LFxuICAgICAgICAgICAgICAgIHsgUGFyYW1ldGVyS2V5OiAnUHJvdmlkZXJBcGlLZXlTZWNyZXQnLCBQYXJhbWV0ZXJWYWx1ZTogJzExMTExMTExL2FwaS1rZXknIH0sXG4gICAgICAgICAgICAgICAgeyBQYXJhbWV0ZXJLZXk6ICdDb25zZW50VG9EYXRhTGVhdmluZ0FXUycsIFBhcmFtZXRlclZhbHVlOiAnTm8nIH1cbiAgICAgICAgICAgIF0pO1xuICAgICAgICAgICAgZXhwZWN0KHVwZGF0ZVN0YWNrSW5wdXQuUm9sZUFSTikudG9FcXVhbCgnYXJuOmF3czppYW06OmZha2UtYWNjb3VudDpyb2xlL0Zha2VSb2xlJyk7XG4gICAgICAgICAgICBleHBlY3QodXBkYXRlU3RhY2tJbnB1dC5DYXBhYmlsaXRpZXMpLnRvRXF1YWwoW1xuICAgICAgICAgICAgICAgICdDQVBBQklMSVRZX0lBTScsXG4gICAgICAgICAgICAgICAgJ0NBUEFCSUxJVFlfQVVUT19FWFBBTkQnLFxuICAgICAgICAgICAgICAgICdDQVBBQklMSVRZX05BTUVEX0lBTSdcbiAgICAgICAgICAgIF0pO1xuICAgICAgICAgICAgZXhwZWN0KHVwZGF0ZVN0YWNrSW5wdXQuVGFncykudG9FcXVhbChbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICBLZXk6ICdjcmVhdGVkVmlhJyxcbiAgICAgICAgICAgICAgICAgICAgVmFsdWU6ICdkZXBsb3ltZW50UGxhdGZvcm0nXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIEtleTogJ3VzZXJJZCcsXG4gICAgICAgICAgICAgICAgICAgIFZhbHVlOiAnZmFrZS11c2VyLWlkJ1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIF0pO1xuICAgICAgICB9KTtcbiAgICB9KTtcblxuICAgIGRlc2NyaWJlKCdXaGVuIGNyZWF0aW5nIERlbGV0ZVN0YWNrQ29tbWFuZElucHV0QnVpbGRlciB3aXRoIGEgVXNlQ2FzZScsICgpID0+IHtcbiAgICAgICAgbGV0IGRlbGV0ZVN0YWNrSW5wdXQ6IERlbGV0ZVN0YWNrQ29tbWFuZElucHV0O1xuXG4gICAgICAgIGJlZm9yZUFsbChhc3luYyAoKSA9PiB7XG4gICAgICAgICAgICBjb25zdCB1c2VDYXNlID0gbmV3IFVzZUNhc2UoXG4gICAgICAgICAgICAgICAgJzExMTExMTExLTIyMjIyMjIyMi0zMzMzMzMzMy00NDQ0NDQ0NC01NTU1NTU1NScsXG4gICAgICAgICAgICAgICAgJ2Zha2UtdGVzdCcsXG4gICAgICAgICAgICAgICAgJ0NyZWF0ZSBhIHN0YWNrIGZvciB0ZXN0JyxcbiAgICAgICAgICAgICAgICBuZXcgTWFwPHN0cmluZywgc3RyaW5nPigpLFxuICAgICAgICAgICAgICAgIHt9LFxuICAgICAgICAgICAgICAgICd0ZXN0LXVzZXInLFxuICAgICAgICAgICAgICAgICdmYWtlLXRlbXBsYXRlLW5hbWUnLFxuICAgICAgICAgICAgICAgICdDaGF0J1xuICAgICAgICAgICAgKTtcbiAgICAgICAgICAgIHVzZUNhc2Uuc3RhY2tJZCA9ICdmYWtlLXN0YWNrLWlkJztcbiAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgZGVsZXRlU3RhY2tJbnB1dCA9IGF3YWl0IG5ldyBEZWxldGVTdGFja0NvbW1hbmRJbnB1dEJ1aWxkZXIodXNlQ2FzZSkuYnVpbGQoKTtcbiAgICAgICAgICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICAgICAgICAgICAgY29uc29sZS5lcnJvcihgRXJyb3Igb2NjdXJyZWQsIGVycm9yIGlzICR7ZXJyb3J9YCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuXG4gICAgICAgIGl0KCdzaG91bGQgaGF2ZSB0aGUgZm9sbG93aW5nIHByb3BlcnRpZXMnLCAoKSA9PiB7XG4gICAgICAgICAgICBleHBlY3QoZGVsZXRlU3RhY2tJbnB1dC5TdGFja05hbWUpLnRvRXF1YWwoJ2Zha2Utc3RhY2staWQnKTtcbiAgICAgICAgfSk7XG4gICAgfSk7XG5cbiAgICBkZXNjcmliZSgnV2hlbiBjcmVhdGluZyBEZWxldGVTdGFja0NvbW1hbmRJbnB1dEJ1aWxkZXIgd2l0aCBhIFVzZUNhc2VBZGFwdGVyIGZyb20gZXZlbnQnLCAoKSA9PiB7XG4gICAgICAgIGxldCBkZWxldGVTdGFja0lucHV0OiBVcGRhdGVTdGFja0NvbW1hbmRJbnB1dDtcblxuICAgICAgICBiZWZvcmVBbGwoYXN5bmMgKCkgPT4ge1xuICAgICAgICAgICAgZGVsZXRlRXZlbnQucGF0aFBhcmFtZXRlcnMgPSB7IHVzZUNhc2VJZDogJzMzMzMzMzMzJyB9O1xuICAgICAgICAgICAgY29uc3QgdXNlQ2FzZSA9IG5ldyBDaGF0VXNlQ2FzZUluZm9BZGFwdGVyKGRlbGV0ZUV2ZW50KTtcbiAgICAgICAgICAgIHVzZUNhc2UudGVtcGxhdGVOYW1lID0gJ2Zha2UtdGVtcGxhdGUtZmlsZS1uYW1lJztcbiAgICAgICAgICAgIHVzZUNhc2Uuc3RhY2tJZCA9ICdmYWtlLXN0YWNrLWlkJztcbiAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgZGVsZXRlU3RhY2tJbnB1dCA9IGF3YWl0IG5ldyBEZWxldGVTdGFja0NvbW1hbmRJbnB1dEJ1aWxkZXIodXNlQ2FzZSkuYnVpbGQoKTtcbiAgICAgICAgICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICAgICAgICAgICAgY29uc29sZS5lcnJvcihgRXJyb3Igb2NjdXJyZWQsIGVycm9yIGlzICR7ZXJyb3J9YCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuXG4gICAgICAgIGl0KCdzaG91bGQgY3JlYXRlIGEgQ3JlYXRlU3RhY2tDb21tYW5kSW5wdXRCdWlsZGVyIHdpdGggdGhlIGNvcnJlY3QgcHJvcGVydGllcycsICgpID0+IHtcbiAgICAgICAgICAgIGV4cGVjdChkZWxldGVTdGFja0lucHV0LlN0YWNrTmFtZSkudG9FcXVhbCgnZmFrZS1zdGFjay1pZCcpO1xuICAgICAgICB9KTtcbiAgICB9KTtcblxuICAgIGRlc2NyaWJlKCdXaGVuIGNyZWF0aW5nIERlc2NyaWJlU3RhY2tzQ29tbWFuZElucHV0QnVpbGRlciB3aXRoIGEgc3RhY2tJbmZvJywgKCkgPT4ge1xuICAgICAgICBsZXQgZGVzY3JpYmVTdGFja0lucHV0OiBEZXNjcmliZVN0YWNrc0NvbW1hbmRJbnB1dDtcblxuICAgICAgICBiZWZvcmVBbGwoYXN5bmMgKCkgPT4ge1xuICAgICAgICAgICAgY29uc3Qgc3RhY2tJbmZvID0ge1xuICAgICAgICAgICAgICAgIHN0YWNrQXJuOiAnYXJuOmF3czpjbG91ZGZvcm1hdGlvbjp1cy13ZXN0LTI6MTIzNDU2Nzg5MDEyOnN0YWNrL2Zha2Utc3RhY2stbmFtZS9mYWtlLXV1aWQnLFxuICAgICAgICAgICAgICAgIHN0YWNrTmFtZTogJ2Zha2Utc3RhY2stbmFtZScsXG4gICAgICAgICAgICAgICAgc3RhY2tJZDogJ3N0YWNrL2Zha2Utc3RhY2stbmFtZS9mYWtlLXV1aWQnLFxuICAgICAgICAgICAgICAgIHN0YWNrSW5zdGFuY2VBY2NvdW50OiAnMTIzNDU2Nzg5MDEyJyxcbiAgICAgICAgICAgICAgICBzdGFja0luc3RhbmNlUmVnaW9uOiAnOnVzLXdlc3QtMidcbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgZGVzY3JpYmVTdGFja0lucHV0ID0gYXdhaXQgbmV3IERlc2NyaWJlU3RhY2tzQ29tbWFuZElucHV0QnVpbGRlcihzdGFja0luZm8pLmJ1aWxkKCk7XG4gICAgICAgICAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoYEVycm9yIG9jY3VycmVkLCBlcnJvciBpcyAke2Vycm9yfWApO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcblxuICAgICAgICBpdCgnc2hvdWxkIGhhdmUgdGhlIGZvbGxvd2luZyBwcm9wZXJ0aWVzJywgKCkgPT4ge1xuICAgICAgICAgICAgZXhwZWN0KGRlc2NyaWJlU3RhY2tJbnB1dC5TdGFja05hbWUpLnRvRXF1YWwoXG4gICAgICAgICAgICAgICAgJ2Fybjphd3M6Y2xvdWRmb3JtYXRpb246dXMtd2VzdC0yOjEyMzQ1Njc4OTAxMjpzdGFjay9mYWtlLXN0YWNrLW5hbWUvZmFrZS11dWlkJ1xuICAgICAgICAgICAgKTtcbiAgICAgICAgfSk7XG4gICAgfSk7XG5cbiAgICBhZnRlckFsbCgoKSA9PiB7XG4gICAgICAgIGRlbGV0ZSBwcm9jZXNzLmVudltBUlRJRkFDVF9CVUNLRVRfRU5WX1ZBUl07XG4gICAgICAgIGRlbGV0ZSBwcm9jZXNzLmVudltDRk5fREVQTE9ZX1JPTEVfQVJOX0VOVl9WQVJdO1xuICAgICAgICBkZWxldGUgcHJvY2Vzcy5lbnZbVVNFUl9QT09MX0lEX0VOVl9WQVJdO1xuICAgICAgICBkZWxldGUgcHJvY2Vzcy5lbnZbQ09HTklUT19QT0xJQ1lfVEFCTEVfRU5WX1ZBUl07XG4gICAgICAgIGRlbGV0ZSBwcm9jZXNzLmVudltVU0VfQ0FTRV9DT05GSUdfU1NNX1BBUkFNRVRFUl9QUkVGSVhfRU5WX1ZBUl07XG4gICAgICAgIGRlbGV0ZSBwcm9jZXNzLmVudltURU1QTEFURV9GSUxFX0VYVE5fRU5WX1ZBUl07XG4gICAgICAgIGRlbGV0ZSBwcm9jZXNzLmVudltVU0VfQ0FTRV9BUElfS0VZX1NVRkZJWF9FTlZfVkFSXTtcbiAgICAgICAgZGVsZXRlIHByb2Nlc3MuZW52W0lTX0lOVEVSTkFMX1VTRVJfRU5WX1ZBUl07XG4gICAgfSk7XG59KTtcbiJdfQ==