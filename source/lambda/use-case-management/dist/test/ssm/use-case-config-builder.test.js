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
const use_case_1 = require("../../model/use-case");
const use_case_config_operation_builder_1 = require("../../ssm/use-case-config-operation-builder");
const use_case_config_view_builder_1 = require("../../ssm/use-case-config-view-builder");
const constants_1 = require("../../utils/constants");
describe('When creating SSM use case config CommandBuilder', () => {
    let config;
    beforeAll(() => {
        process.env[constants_1.USE_CASE_CONFIG_SSM_PARAMETER_PREFIX_ENV_VAR] = '/config';
        config = {
            ConversationMemoryType: 'DDBMemoryType',
            ConversationMemoryParams: 'ConversationMemoryParams',
            KnowledgeBaseType: 'Kendra',
            KnowledgeBaseParams: {
                NumberOfDocs: '5',
                ReturnSourceDocs: '5'
            },
            LlmParams: {
                ModelId: 'google/flan-t5-xxl',
                ModelParams: 'Param1',
                PromptTemplate: 'Prompt1',
                Streaming: true,
                Temperature: 0.1
            }
        };
    });
    describe('When creating GetParameterCommandBuilder with a UseCase', () => {
        let getParameterCommandInput;
        beforeAll(async () => {
            const cfnParameters = new Map();
            cfnParameters.set('LLMProviderName', 'HuggingFace');
            const useCase = new use_case_1.UseCase('fake-id', 'fake-test', 'Create a stack for test', cfnParameters, config, 'test-user', 'fake-template-name', 'Chat');
            useCase.setSSMParameterKey('/config/fake-id');
            useCase.stackId = 'fake-stack-id';
            const getParameterInputBuilder = new use_case_config_operation_builder_1.GetParameterCommandBuilder(useCase);
            try {
                getParameterCommandInput = await getParameterInputBuilder.build();
            }
            catch (error) {
                console.error(`Error occurred, error is ${error}`);
            }
        });
        it('should create a GetParameterCommandBuilder with the correct properties', () => {
            expect(getParameterCommandInput.Name).toEqual('/config/fake-id');
        });
    });
    describe('When creating PutParameterCommandBuilder with a UseCase', () => {
        let putParameterCommandInput;
        beforeAll(async () => {
            const cfnParameters = new Map();
            cfnParameters.set('LLMProviderName', 'HuggingFace');
            const useCase = new use_case_1.UseCase('fake-id', 'fake-test', 'Create a stack for test', cfnParameters, config, 'test-user', 'fake-template-name', 'Chat');
            useCase.setSSMParameterKey('/config/fake-id');
            useCase.stackId = 'fake-stack-id';
            try {
                putParameterCommandInput = await new use_case_config_operation_builder_1.PutParameterCommandInputBuilder(useCase).build();
            }
            catch (error) {
                console.error(`Error occurred, error is ${error}`);
            }
        });
        it('should have the following properties', () => {
            expect(putParameterCommandInput.Name).toEqual('/config/fake-id');
            expect(putParameterCommandInput.Description).toEqual('Configuration for the use case with ID fake-id');
            expect(putParameterCommandInput.Value).toEqual(JSON.stringify(config));
            expect(putParameterCommandInput.Type).toEqual('SecureString');
            expect(putParameterCommandInput.Overwrite).toEqual(true);
        });
    });
    describe('When creating DeleteStackCommandInputBuilder with a UseCase', () => {
        let deleteParameterCommandInput;
        beforeAll(async () => {
            const useCase = new use_case_1.UseCase('fake-id', 'fake-test', 'Create a stack for test', new Map(), config, 'test-user', 'fake-template-name', 'Chat');
            useCase.stackId = 'fake-stack-id';
            useCase.setSSMParameterKey('/config/fake-id');
            try {
                deleteParameterCommandInput = await new use_case_config_operation_builder_1.DeleteParameterCommandInputBuilder(useCase).build();
            }
            catch (error) {
                console.error(`Error occurred, error is ${error}`);
            }
        });
        it('should have the following properties', () => {
            expect(deleteParameterCommandInput.Name).toEqual('/config/fake-id');
        });
    });
    describe('When creating GetParameterFromNameCommandInputBuilder with a UseCase', () => {
        let getParameterCommandInput;
        beforeAll(async () => {
            const configName = '/config/fake-id';
            getParameterCommandInput = await new use_case_config_view_builder_1.GetParameterFromNameCommandInputBuilder(configName).build();
        });
        it('should have the following properties', () => {
            expect(getParameterCommandInput.Name).toEqual('/config/fake-id');
        });
    });
    afterAll(() => {
        delete process.env[constants_1.USE_CASES_TABLE_NAME_ENV_VAR];
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXNlLWNhc2UtY29uZmlnLWJ1aWxkZXIudGVzdC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uL3Rlc3Qvc3NtL3VzZS1jYXNlLWNvbmZpZy1idWlsZGVyLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBOzs7Ozs7Ozs7Ozt1SEFXdUg7O0FBR3ZILG1EQUErQztBQUMvQyxtR0FJcUQ7QUFDckQseUZBQWlHO0FBQ2pHLHFEQUFtSDtBQUVuSCxRQUFRLENBQUMsa0RBQWtELEVBQUUsR0FBRyxFQUFFO0lBQzlELElBQUksTUFBVyxDQUFDO0lBQ2hCLFNBQVMsQ0FBQyxHQUFHLEVBQUU7UUFDWCxPQUFPLENBQUMsR0FBRyxDQUFDLHdEQUE0QyxDQUFDLEdBQUcsU0FBUyxDQUFDO1FBQ3RFLE1BQU0sR0FBRztZQUNMLHNCQUFzQixFQUFFLGVBQWU7WUFDdkMsd0JBQXdCLEVBQUUsMEJBQTBCO1lBQ3BELGlCQUFpQixFQUFFLFFBQVE7WUFDM0IsbUJBQW1CLEVBQUU7Z0JBQ2pCLFlBQVksRUFBRSxHQUFHO2dCQUNqQixnQkFBZ0IsRUFBRSxHQUFHO2FBQ3hCO1lBQ0QsU0FBUyxFQUFFO2dCQUNQLE9BQU8sRUFBRSxvQkFBb0I7Z0JBQzdCLFdBQVcsRUFBRSxRQUFRO2dCQUNyQixjQUFjLEVBQUUsU0FBUztnQkFDekIsU0FBUyxFQUFFLElBQUk7Z0JBQ2YsV0FBVyxFQUFFLEdBQUc7YUFDbkI7U0FDSixDQUFDO0lBQ04sQ0FBQyxDQUFDLENBQUM7SUFFSCxRQUFRLENBQUMseURBQXlELEVBQUUsR0FBRyxFQUFFO1FBQ3JFLElBQUksd0JBQWtELENBQUM7UUFFdkQsU0FBUyxDQUFDLEtBQUssSUFBSSxFQUFFO1lBQ2pCLE1BQU0sYUFBYSxHQUFHLElBQUksR0FBRyxFQUFrQixDQUFDO1lBQ2hELGFBQWEsQ0FBQyxHQUFHLENBQUMsaUJBQWlCLEVBQUUsYUFBYSxDQUFDLENBQUM7WUFDcEQsTUFBTSxPQUFPLEdBQUcsSUFBSSxr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Iiwic291cmNlc0NvbnRlbnQiOlsiLyoqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKipcbiAqICBDb3B5cmlnaHQgQW1hem9uLmNvbSwgSW5jLiBvciBpdHMgYWZmaWxpYXRlcy4gQWxsIFJpZ2h0cyBSZXNlcnZlZC4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAqXG4gKiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgKlxuICogIExpY2Vuc2VkIHVuZGVyIHRoZSBBcGFjaGUgTGljZW5zZSwgVmVyc2lvbiAyLjAgKHRoZSBcIkxpY2Vuc2VcIikuIFlvdSBtYXkgbm90IHVzZSB0aGlzIGZpbGUgZXhjZXB0IGluIGNvbXBsaWFuY2UgICAgKlxuICogIHdpdGggdGhlIExpY2Vuc2UuIEEgY29weSBvZiB0aGUgTGljZW5zZSBpcyBsb2NhdGVkIGF0ICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICpcbiAqICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAqXG4gKiAgICAgIGh0dHA6Ly93d3cuYXBhY2hlLm9yZy9saWNlbnNlcy9MSUNFTlNFLTIuMCAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgKlxuICogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICpcbiAqICBvciBpbiB0aGUgJ2xpY2Vuc2UnIGZpbGUgYWNjb21wYW55aW5nIHRoaXMgZmlsZS4gVGhpcyBmaWxlIGlzIGRpc3RyaWJ1dGVkIG9uIGFuICdBUyBJUycgQkFTSVMsIFdJVEhPVVQgV0FSUkFOVElFUyAqXG4gKiAgT1IgQ09ORElUSU9OUyBPRiBBTlkgS0lORCwgZXhwcmVzcyBvciBpbXBsaWVkLiBTZWUgdGhlIExpY2Vuc2UgZm9yIHRoZSBzcGVjaWZpYyBsYW5ndWFnZSBnb3Zlcm5pbmcgcGVybWlzc2lvbnMgICAgKlxuICogIGFuZCBsaW1pdGF0aW9ucyB1bmRlciB0aGUgTGljZW5zZS4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICpcbiAqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKiovXG5cbmltcG9ydCB7IERlbGV0ZVBhcmFtZXRlckNvbW1hbmRJbnB1dCwgR2V0UGFyYW1ldGVyQ29tbWFuZElucHV0LCBQdXRQYXJhbWV0ZXJDb21tYW5kSW5wdXQgfSBmcm9tICdAYXdzLXNkay9jbGllbnQtc3NtJztcbmltcG9ydCB7IFVzZUNhc2UgfSBmcm9tICcuLi8uLi9tb2RlbC91c2UtY2FzZSc7XG5pbXBvcnQge1xuICAgIERlbGV0ZVBhcmFtZXRlckNvbW1hbmRJbnB1dEJ1aWxkZXIsXG4gICAgR2V0UGFyYW1ldGVyQ29tbWFuZEJ1aWxkZXIsXG4gICAgUHV0UGFyYW1ldGVyQ29tbWFuZElucHV0QnVpbGRlclxufSBmcm9tICcuLi8uLi9zc20vdXNlLWNhc2UtY29uZmlnLW9wZXJhdGlvbi1idWlsZGVyJztcbmltcG9ydCB7IEdldFBhcmFtZXRlckZyb21OYW1lQ29tbWFuZElucHV0QnVpbGRlciB9IGZyb20gJy4uLy4uL3NzbS91c2UtY2FzZS1jb25maWctdmlldy1idWlsZGVyJztcbmltcG9ydCB7IFVTRV9DQVNFU19UQUJMRV9OQU1FX0VOVl9WQVIsIFVTRV9DQVNFX0NPTkZJR19TU01fUEFSQU1FVEVSX1BSRUZJWF9FTlZfVkFSIH0gZnJvbSAnLi4vLi4vdXRpbHMvY29uc3RhbnRzJztcblxuZGVzY3JpYmUoJ1doZW4gY3JlYXRpbmcgU1NNIHVzZSBjYXNlIGNvbmZpZyBDb21tYW5kQnVpbGRlcicsICgpID0+IHtcbiAgICBsZXQgY29uZmlnOiBhbnk7XG4gICAgYmVmb3JlQWxsKCgpID0+IHtcbiAgICAgICAgcHJvY2Vzcy5lbnZbVVNFX0NBU0VfQ09ORklHX1NTTV9QQVJBTUVURVJfUFJFRklYX0VOVl9WQVJdID0gJy9jb25maWcnO1xuICAgICAgICBjb25maWcgPSB7XG4gICAgICAgICAgICBDb252ZXJzYXRpb25NZW1vcnlUeXBlOiAnRERCTWVtb3J5VHlwZScsXG4gICAgICAgICAgICBDb252ZXJzYXRpb25NZW1vcnlQYXJhbXM6ICdDb252ZXJzYXRpb25NZW1vcnlQYXJhbXMnLFxuICAgICAgICAgICAgS25vd2xlZGdlQmFzZVR5cGU6ICdLZW5kcmEnLFxuICAgICAgICAgICAgS25vd2xlZGdlQmFzZVBhcmFtczoge1xuICAgICAgICAgICAgICAgIE51bWJlck9mRG9jczogJzUnLFxuICAgICAgICAgICAgICAgIFJldHVyblNvdXJjZURvY3M6ICc1J1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIExsbVBhcmFtczoge1xuICAgICAgICAgICAgICAgIE1vZGVsSWQ6ICdnb29nbGUvZmxhbi10NS14eGwnLFxuICAgICAgICAgICAgICAgIE1vZGVsUGFyYW1zOiAnUGFyYW0xJyxcbiAgICAgICAgICAgICAgICBQcm9tcHRUZW1wbGF0ZTogJ1Byb21wdDEnLFxuICAgICAgICAgICAgICAgIFN0cmVhbWluZzogdHJ1ZSxcbiAgICAgICAgICAgICAgICBUZW1wZXJhdHVyZTogMC4xXG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG4gICAgfSk7XG5cbiAgICBkZXNjcmliZSgnV2hlbiBjcmVhdGluZyBHZXRQYXJhbWV0ZXJDb21tYW5kQnVpbGRlciB3aXRoIGEgVXNlQ2FzZScsICgpID0+IHtcbiAgICAgICAgbGV0IGdldFBhcmFtZXRlckNvbW1hbmRJbnB1dDogR2V0UGFyYW1ldGVyQ29tbWFuZElucHV0O1xuXG4gICAgICAgIGJlZm9yZUFsbChhc3luYyAoKSA9PiB7XG4gICAgICAgICAgICBjb25zdCBjZm5QYXJhbWV0ZXJzID0gbmV3IE1hcDxzdHJpbmcsIHN0cmluZz4oKTtcbiAgICAgICAgICAgIGNmblBhcmFtZXRlcnMuc2V0KCdMTE1Qcm92aWRlck5hbWUnLCAnSHVnZ2luZ0ZhY2UnKTtcbiAgICAgICAgICAgIGNvbnN0IHVzZUNhc2UgPSBuZXcgVXNlQ2FzZShcbiAgICAgICAgICAgICAgICAnZmFrZS1pZCcsXG4gICAgICAgICAgICAgICAgJ2Zha2UtdGVzdCcsXG4gICAgICAgICAgICAgICAgJ0NyZWF0ZSBhIHN0YWNrIGZvciB0ZXN0JyxcbiAgICAgICAgICAgICAgICBjZm5QYXJhbWV0ZXJzLFxuICAgICAgICAgICAgICAgIGNvbmZpZyxcbiAgICAgICAgICAgICAgICAndGVzdC11c2VyJyxcbiAgICAgICAgICAgICAgICAnZmFrZS10ZW1wbGF0ZS1uYW1lJyxcbiAgICAgICAgICAgICAgICAnQ2hhdCdcbiAgICAgICAgICAgICk7XG4gICAgICAgICAgICB1c2VDYXNlLnNldFNTTVBhcmFtZXRlcktleSgnL2NvbmZpZy9mYWtlLWlkJyk7XG4gICAgICAgICAgICB1c2VDYXNlLnN0YWNrSWQgPSAnZmFrZS1zdGFjay1pZCc7XG4gICAgICAgICAgICBjb25zdCBnZXRQYXJhbWV0ZXJJbnB1dEJ1aWxkZXIgPSBuZXcgR2V0UGFyYW1ldGVyQ29tbWFuZEJ1aWxkZXIodXNlQ2FzZSk7XG4gICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgIGdldFBhcmFtZXRlckNvbW1hbmRJbnB1dCA9IGF3YWl0IGdldFBhcmFtZXRlcklucHV0QnVpbGRlci5idWlsZCgpO1xuICAgICAgICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmVycm9yKGBFcnJvciBvY2N1cnJlZCwgZXJyb3IgaXMgJHtlcnJvcn1gKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG5cbiAgICAgICAgaXQoJ3Nob3VsZCBjcmVhdGUgYSBHZXRQYXJhbWV0ZXJDb21tYW5kQnVpbGRlciB3aXRoIHRoZSBjb3JyZWN0IHByb3BlcnRpZXMnLCAoKSA9PiB7XG4gICAgICAgICAgICBleHBlY3QoZ2V0UGFyYW1ldGVyQ29tbWFuZElucHV0Lk5hbWUpLnRvRXF1YWwoJy9jb25maWcvZmFrZS1pZCcpO1xuICAgICAgICB9KTtcbiAgICB9KTtcblxuICAgIGRlc2NyaWJlKCdXaGVuIGNyZWF0aW5nIFB1dFBhcmFtZXRlckNvbW1hbmRCdWlsZGVyIHdpdGggYSBVc2VDYXNlJywgKCkgPT4ge1xuICAgICAgICBsZXQgcHV0UGFyYW1ldGVyQ29tbWFuZElucHV0OiBQdXRQYXJhbWV0ZXJDb21tYW5kSW5wdXQ7XG4gICAgICAgIGJlZm9yZUFsbChhc3luYyAoKSA9PiB7XG4gICAgICAgICAgICBjb25zdCBjZm5QYXJhbWV0ZXJzID0gbmV3IE1hcDxzdHJpbmcsIHN0cmluZz4oKTtcbiAgICAgICAgICAgIGNmblBhcmFtZXRlcnMuc2V0KCdMTE1Qcm92aWRlck5hbWUnLCAnSHVnZ2luZ0ZhY2UnKTtcbiAgICAgICAgICAgIGNvbnN0IHVzZUNhc2UgPSBuZXcgVXNlQ2FzZShcbiAgICAgICAgICAgICAgICAnZmFrZS1pZCcsXG4gICAgICAgICAgICAgICAgJ2Zha2UtdGVzdCcsXG4gICAgICAgICAgICAgICAgJ0NyZWF0ZSBhIHN0YWNrIGZvciB0ZXN0JyxcbiAgICAgICAgICAgICAgICBjZm5QYXJhbWV0ZXJzLFxuICAgICAgICAgICAgICAgIGNvbmZpZyxcbiAgICAgICAgICAgICAgICAndGVzdC11c2VyJyxcbiAgICAgICAgICAgICAgICAnZmFrZS10ZW1wbGF0ZS1uYW1lJyxcbiAgICAgICAgICAgICAgICAnQ2hhdCdcbiAgICAgICAgICAgICk7XG4gICAgICAgICAgICB1c2VDYXNlLnNldFNTTVBhcmFtZXRlcktleSgnL2NvbmZpZy9mYWtlLWlkJyk7XG4gICAgICAgICAgICB1c2VDYXNlLnN0YWNrSWQgPSAnZmFrZS1zdGFjay1pZCc7XG4gICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgIHB1dFBhcmFtZXRlckNvbW1hbmRJbnB1dCA9IGF3YWl0IG5ldyBQdXRQYXJhbWV0ZXJDb21tYW5kSW5wdXRCdWlsZGVyKHVzZUNhc2UpLmJ1aWxkKCk7XG4gICAgICAgICAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoYEVycm9yIG9jY3VycmVkLCBlcnJvciBpcyAke2Vycm9yfWApO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcblxuICAgICAgICBpdCgnc2hvdWxkIGhhdmUgdGhlIGZvbGxvd2luZyBwcm9wZXJ0aWVzJywgKCkgPT4ge1xuICAgICAgICAgICAgZXhwZWN0KHB1dFBhcmFtZXRlckNvbW1hbmRJbnB1dC5OYW1lKS50b0VxdWFsKCcvY29uZmlnL2Zha2UtaWQnKTtcbiAgICAgICAgICAgIGV4cGVjdChwdXRQYXJhbWV0ZXJDb21tYW5kSW5wdXQuRGVzY3JpcHRpb24pLnRvRXF1YWwoJ0NvbmZpZ3VyYXRpb24gZm9yIHRoZSB1c2UgY2FzZSB3aXRoIElEIGZha2UtaWQnKTtcbiAgICAgICAgICAgIGV4cGVjdChwdXRQYXJhbWV0ZXJDb21tYW5kSW5wdXQuVmFsdWUpLnRvRXF1YWwoSlNPTi5zdHJpbmdpZnkoY29uZmlnKSk7XG4gICAgICAgICAgICBleHBlY3QocHV0UGFyYW1ldGVyQ29tbWFuZElucHV0LlR5cGUhKS50b0VxdWFsKCdTZWN1cmVTdHJpbmcnKTtcbiAgICAgICAgICAgIGV4cGVjdChwdXRQYXJhbWV0ZXJDb21tYW5kSW5wdXQuT3ZlcndyaXRlKS50b0VxdWFsKHRydWUpO1xuICAgICAgICB9KTtcbiAgICB9KTtcblxuICAgIGRlc2NyaWJlKCdXaGVuIGNyZWF0aW5nIERlbGV0ZVN0YWNrQ29tbWFuZElucHV0QnVpbGRlciB3aXRoIGEgVXNlQ2FzZScsICgpID0+IHtcbiAgICAgICAgbGV0IGRlbGV0ZVBhcmFtZXRlckNvbW1hbmRJbnB1dDogRGVsZXRlUGFyYW1ldGVyQ29tbWFuZElucHV0O1xuXG4gICAgICAgIGJlZm9yZUFsbChhc3luYyAoKSA9PiB7XG4gICAgICAgICAgICBjb25zdCB1c2VDYXNlID0gbmV3IFVzZUNhc2UoXG4gICAgICAgICAgICAgICAgJ2Zha2UtaWQnLFxuICAgICAgICAgICAgICAgICdmYWtlLXRlc3QnLFxuICAgICAgICAgICAgICAgICdDcmVhdGUgYSBzdGFjayBmb3IgdGVzdCcsXG4gICAgICAgICAgICAgICAgbmV3IE1hcDxzdHJpbmcsIHN0cmluZz4oKSxcbiAgICAgICAgICAgICAgICBjb25maWcsXG4gICAgICAgICAgICAgICAgJ3Rlc3QtdXNlcicsXG4gICAgICAgICAgICAgICAgJ2Zha2UtdGVtcGxhdGUtbmFtZScsXG4gICAgICAgICAgICAgICAgJ0NoYXQnXG4gICAgICAgICAgICApO1xuICAgICAgICAgICAgdXNlQ2FzZS5zdGFja0lkID0gJ2Zha2Utc3RhY2staWQnO1xuICAgICAgICAgICAgdXNlQ2FzZS5zZXRTU01QYXJhbWV0ZXJLZXkoJy9jb25maWcvZmFrZS1pZCcpO1xuICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICBkZWxldGVQYXJhbWV0ZXJDb21tYW5kSW5wdXQgPSBhd2FpdCBuZXcgRGVsZXRlUGFyYW1ldGVyQ29tbWFuZElucHV0QnVpbGRlcih1c2VDYXNlKS5idWlsZCgpO1xuICAgICAgICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmVycm9yKGBFcnJvciBvY2N1cnJlZCwgZXJyb3IgaXMgJHtlcnJvcn1gKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG5cbiAgICAgICAgaXQoJ3Nob3VsZCBoYXZlIHRoZSBmb2xsb3dpbmcgcHJvcGVydGllcycsICgpID0+IHtcbiAgICAgICAgICAgIGV4cGVjdChkZWxldGVQYXJhbWV0ZXJDb21tYW5kSW5wdXQuTmFtZSkudG9FcXVhbCgnL2NvbmZpZy9mYWtlLWlkJyk7XG4gICAgICAgIH0pO1xuICAgIH0pO1xuXG4gICAgZGVzY3JpYmUoJ1doZW4gY3JlYXRpbmcgR2V0UGFyYW1ldGVyRnJvbU5hbWVDb21tYW5kSW5wdXRCdWlsZGVyIHdpdGggYSBVc2VDYXNlJywgKCkgPT4ge1xuICAgICAgICBsZXQgZ2V0UGFyYW1ldGVyQ29tbWFuZElucHV0OiBHZXRQYXJhbWV0ZXJDb21tYW5kSW5wdXQ7XG5cbiAgICAgICAgYmVmb3JlQWxsKGFzeW5jICgpID0+IHtcbiAgICAgICAgICAgIGNvbnN0IGNvbmZpZ05hbWUgPSAnL2NvbmZpZy9mYWtlLWlkJztcbiAgICAgICAgICAgIGdldFBhcmFtZXRlckNvbW1hbmRJbnB1dCA9IGF3YWl0IG5ldyBHZXRQYXJhbWV0ZXJGcm9tTmFtZUNvbW1hbmRJbnB1dEJ1aWxkZXIoY29uZmlnTmFtZSkuYnVpbGQoKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgaXQoJ3Nob3VsZCBoYXZlIHRoZSBmb2xsb3dpbmcgcHJvcGVydGllcycsICgpID0+IHtcbiAgICAgICAgICAgIGV4cGVjdChnZXRQYXJhbWV0ZXJDb21tYW5kSW5wdXQuTmFtZSkudG9FcXVhbCgnL2NvbmZpZy9mYWtlLWlkJyk7XG4gICAgICAgIH0pO1xuICAgIH0pO1xuXG4gICAgYWZ0ZXJBbGwoKCkgPT4ge1xuICAgICAgICBkZWxldGUgcHJvY2Vzcy5lbnZbVVNFX0NBU0VTX1RBQkxFX05BTUVfRU5WX1ZBUl07XG4gICAgfSk7XG59KTtcbiJdfQ==