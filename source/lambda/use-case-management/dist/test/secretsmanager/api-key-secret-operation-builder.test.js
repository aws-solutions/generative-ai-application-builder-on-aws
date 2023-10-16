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
const api_key_secret_operation_builder_1 = require("../../secretsmanager/api-key-secret-operation-builder");
const constants_1 = require("../../utils/constants");
describe('When creating secrets manager CommandBuilder', () => {
    let config;
    beforeAll(() => {
        process.env[constants_1.USE_CASE_API_KEY_SUFFIX_ENV_VAR] = 'api-key';
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
    describe('When creating CreateSecretCommandInputBuilder with a UseCase', () => {
        let createSecretCommandInput;
        beforeAll(async () => {
            const cfnParameters = new Map();
            cfnParameters.set('LLMProviderName', 'HuggingFace');
            const useCase = new use_case_1.UseCase('fake-id', 'fake-test', 'Create a stack for test', cfnParameters, config, 'test-user', 'fake-template-name', 'Chat', 'fake-key');
            useCase.stackId = 'fake-stack-id';
            const createSecreteInputBuilder = new api_key_secret_operation_builder_1.CreateSecretCommandInputBuilder(useCase);
            try {
                createSecretCommandInput = await createSecreteInputBuilder.build();
            }
            catch (error) {
                console.error(`Error occurred, error is ${error}`);
            }
        });
        it('should create a CreateSecretCommandInputBuilder with the correct properties', () => {
            expect(createSecretCommandInput.Name).toEqual('fake-id/api-key');
            expect(createSecretCommandInput.SecretString).toEqual('fake-key');
        });
    });
    describe('When creating PutParameterCommandBuilder with a UseCase', () => {
        let putSecretCommandInput;
        beforeAll(async () => {
            const cfnParameters = new Map();
            cfnParameters.set('LLMProviderName', 'HuggingFace');
            const useCase = new use_case_1.UseCase('fake-id', 'fake-test', 'Create a stack for test', cfnParameters, config, 'test-user', 'fake-template-name', 'Chat', 'fake-key');
            useCase.stackId = 'fake-stack-id';
            try {
                putSecretCommandInput = await new api_key_secret_operation_builder_1.PutSecretValueCommandInputBuilder(useCase).build();
            }
            catch (error) {
                console.error(`Error occurred, error is ${error}`);
            }
        });
        it('should have the following properties', () => {
            expect(putSecretCommandInput.SecretId).toEqual('fake-id/api-key');
            expect(putSecretCommandInput.SecretString).toEqual('fake-key');
        });
    });
    describe('When creating DeleteStackCommandInputBuilder with a UseCase', () => {
        let deleteParameterCommandInput;
        beforeAll(async () => {
            const useCase = new use_case_1.UseCase('fake-id', 'fake-test', 'Create a stack for test', new Map(), config, 'test-user', 'fake-template-name', 'Chat', 'fake-key');
            useCase.stackId = 'fake-stack-id';
            try {
                deleteParameterCommandInput = await new api_key_secret_operation_builder_1.DeleteSecretCommandInputBuilder(useCase).build();
            }
            catch (error) {
                console.error(`Error occurred, error is ${error}`);
            }
        });
        it('should have the following properties', () => {
            expect(deleteParameterCommandInput.SecretId).toEqual('fake-id/api-key');
        });
    });
    afterAll(() => {
        delete process.env[constants_1.USE_CASE_API_KEY_SUFFIX_ENV_VAR];
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXBpLWtleS1zZWNyZXQtb3BlcmF0aW9uLWJ1aWxkZXIudGVzdC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uL3Rlc3Qvc2VjcmV0c21hbmFnZXIvYXBpLWtleS1zZWNyZXQtb3BlcmF0aW9uLWJ1aWxkZXIudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUE7Ozs7Ozs7Ozs7O3VIQVd1SDs7QUFPdkgsbURBQStDO0FBQy9DLDRHQUkrRDtBQUMvRCxxREFBd0U7QUFFeEUsUUFBUSxDQUFDLDhDQUE4QyxFQUFFLEdBQUcsRUFBRTtJQUMxRCxJQUFJLE1BQVcsQ0FBQztJQUNoQixTQUFTLENBQUMsR0FBRyxFQUFFO1FBQ1gsT0FBTyxDQUFDLEdBQUcsQ0FBQywyQ0FBK0IsQ0FBQyxHQUFHLFNBQVMsQ0FBQztRQUN6RCxNQUFNLEdBQUc7WUFDTCxzQkFBc0IsRUFBRSxlQUFlO1lBQ3ZDLHdCQUF3QixFQUFFLDBCQUEwQjtZQUNwRCxpQkFBaUIsRUFBRSxRQUFRO1lBQzNCLG1CQUFtQixFQUFFO2dCQUNqQixZQUFZLEVBQUUsR0FBRztnQkFDakIsZ0JBQWdCLEVBQUUsR0FBRzthQUN4QjtZQUNELFNBQVMsRUFBRTtnQkFDUCxPQUFPLEVBQUUsb0JBQW9CO2dCQUM3QixXQUFXLEVBQUUsUUFBUTtnQkFDckIsY0FBYyxFQUFFLFNBQVM7Z0JBQ3pCLFNBQVMsRUFBRSxJQUFJO2dCQUNmLFdBQVcsRUFBRSxHQUFHO2FBQ25CO1NBQ0osQ0FBQztJQUNOLENBQUMsQ0FBQyxDQUFDO0lBRUgsUUFBUSxDQUFDLDhEQUE4RCxFQUFFLEdBQUcsRUFBRTtRQUMxRSxJQUFJLHdCQUFrRCxDQUFDO1FBRXZELFNBQVMsQ0FBQyxLQUFLLElBQUksRUFBRTtZQUNqQixNQUFNLGFBQWEsR0FBRyxJQUFJLEdBQUcsRUFBa0IsQ0FBQztZQUNoRCxhQUFhLENBQUMsR0FBRyxDQUFDLGlCQUFpQixFQUFFLGFBQWEsQ0FBQyxDQUFDO1lBQ3BELE1BQU0s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QUN0RDtRQUNMLENBQUMsQ0FBQyxDQUFDO1FBRUgsRUFBRSxDQUFDLHNDQUFzQyxFQUFFLEdBQUcsRUFBRTtZQUM1QyxNQUFNLENBQUMsMkJBQTJCLENBQUMsUUFBUSxDQUFDLENBQUMsT0FBTyxDQUFDLGlCQUFpQixDQUFDLENBQUM7UUFDNUUsQ0FBQyxDQUFDLENBQUM7SUFDUCxDQUFDLENBQUMsQ0FBQztJQUVILFFBQVEsQ0FBQyxHQUFHLEVBQUU7UUFDVixPQUFPLE9BQU8sQ0FBQyxHQUFHLENBQUMsMkNBQStCLENBQUMsQ0FBQztJQUN4RCxDQUFDLENBQUMsQ0FBQztBQUNQLENBQUMsQ0FBQyxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKipcbiAqICBDb3B5cmlnaHQgQW1hem9uLmNvbSwgSW5jLiBvciBpdHMgYWZmaWxpYXRlcy4gQWxsIFJpZ2h0cyBSZXNlcnZlZC4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAqXG4gKiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgKlxuICogIExpY2Vuc2VkIHVuZGVyIHRoZSBBcGFjaGUgTGljZW5zZSwgVmVyc2lvbiAyLjAgKHRoZSBcIkxpY2Vuc2VcIikuIFlvdSBtYXkgbm90IHVzZSB0aGlzIGZpbGUgZXhjZXB0IGluIGNvbXBsaWFuY2UgICAgKlxuICogIHdpdGggdGhlIExpY2Vuc2UuIEEgY29weSBvZiB0aGUgTGljZW5zZSBpcyBsb2NhdGVkIGF0ICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICpcbiAqICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAqXG4gKiAgICAgIGh0dHA6Ly93d3cuYXBhY2hlLm9yZy9saWNlbnNlcy9MSUNFTlNFLTIuMCAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgKlxuICogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICpcbiAqICBvciBpbiB0aGUgJ2xpY2Vuc2UnIGZpbGUgYWNjb21wYW55aW5nIHRoaXMgZmlsZS4gVGhpcyBmaWxlIGlzIGRpc3RyaWJ1dGVkIG9uIGFuICdBUyBJUycgQkFTSVMsIFdJVEhPVVQgV0FSUkFOVElFUyAqXG4gKiAgT1IgQ09ORElUSU9OUyBPRiBBTlkgS0lORCwgZXhwcmVzcyBvciBpbXBsaWVkLiBTZWUgdGhlIExpY2Vuc2UgZm9yIHRoZSBzcGVjaWZpYyBsYW5ndWFnZSBnb3Zlcm5pbmcgcGVybWlzc2lvbnMgICAgKlxuICogIGFuZCBsaW1pdGF0aW9ucyB1bmRlciB0aGUgTGljZW5zZS4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICpcbiAqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKiovXG5cbmltcG9ydCB7XG4gICAgQ3JlYXRlU2VjcmV0Q29tbWFuZElucHV0LFxuICAgIERlbGV0ZVNlY3JldENvbW1hbmRJbnB1dCxcbiAgICBQdXRTZWNyZXRWYWx1ZUNvbW1hbmRJbnB1dFxufSBmcm9tICdAYXdzLXNkay9jbGllbnQtc2VjcmV0cy1tYW5hZ2VyJztcbmltcG9ydCB7IFVzZUNhc2UgfSBmcm9tICcuLi8uLi9tb2RlbC91c2UtY2FzZSc7XG5pbXBvcnQge1xuICAgIENyZWF0ZVNlY3JldENvbW1hbmRJbnB1dEJ1aWxkZXIsXG4gICAgRGVsZXRlU2VjcmV0Q29tbWFuZElucHV0QnVpbGRlcixcbiAgICBQdXRTZWNyZXRWYWx1ZUNvbW1hbmRJbnB1dEJ1aWxkZXJcbn0gZnJvbSAnLi4vLi4vc2VjcmV0c21hbmFnZXIvYXBpLWtleS1zZWNyZXQtb3BlcmF0aW9uLWJ1aWxkZXInO1xuaW1wb3J0IHsgVVNFX0NBU0VfQVBJX0tFWV9TVUZGSVhfRU5WX1ZBUiB9IGZyb20gJy4uLy4uL3V0aWxzL2NvbnN0YW50cyc7XG5cbmRlc2NyaWJlKCdXaGVuIGNyZWF0aW5nIHNlY3JldHMgbWFuYWdlciBDb21tYW5kQnVpbGRlcicsICgpID0+IHtcbiAgICBsZXQgY29uZmlnOiBhbnk7XG4gICAgYmVmb3JlQWxsKCgpID0+IHtcbiAgICAgICAgcHJvY2Vzcy5lbnZbVVNFX0NBU0VfQVBJX0tFWV9TVUZGSVhfRU5WX1ZBUl0gPSAnYXBpLWtleSc7XG4gICAgICAgIGNvbmZpZyA9IHtcbiAgICAgICAgICAgIENvbnZlcnNhdGlvbk1lbW9yeVR5cGU6ICdEREJNZW1vcnlUeXBlJyxcbiAgICAgICAgICAgIENvbnZlcnNhdGlvbk1lbW9yeVBhcmFtczogJ0NvbnZlcnNhdGlvbk1lbW9yeVBhcmFtcycsXG4gICAgICAgICAgICBLbm93bGVkZ2VCYXNlVHlwZTogJ0tlbmRyYScsXG4gICAgICAgICAgICBLbm93bGVkZ2VCYXNlUGFyYW1zOiB7XG4gICAgICAgICAgICAgICAgTnVtYmVyT2ZEb2NzOiAnNScsXG4gICAgICAgICAgICAgICAgUmV0dXJuU291cmNlRG9jczogJzUnXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgTGxtUGFyYW1zOiB7XG4gICAgICAgICAgICAgICAgTW9kZWxJZDogJ2dvb2dsZS9mbGFuLXQ1LXh4bCcsXG4gICAgICAgICAgICAgICAgTW9kZWxQYXJhbXM6ICdQYXJhbTEnLFxuICAgICAgICAgICAgICAgIFByb21wdFRlbXBsYXRlOiAnUHJvbXB0MScsXG4gICAgICAgICAgICAgICAgU3RyZWFtaW5nOiB0cnVlLFxuICAgICAgICAgICAgICAgIFRlbXBlcmF0dXJlOiAwLjFcbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcbiAgICB9KTtcblxuICAgIGRlc2NyaWJlKCdXaGVuIGNyZWF0aW5nIENyZWF0ZVNlY3JldENvbW1hbmRJbnB1dEJ1aWxkZXIgd2l0aCBhIFVzZUNhc2UnLCAoKSA9PiB7XG4gICAgICAgIGxldCBjcmVhdGVTZWNyZXRDb21tYW5kSW5wdXQ6IENyZWF0ZVNlY3JldENvbW1hbmRJbnB1dDtcblxuICAgICAgICBiZWZvcmVBbGwoYXN5bmMgKCkgPT4ge1xuICAgICAgICAgICAgY29uc3QgY2ZuUGFyYW1ldGVycyA9IG5ldyBNYXA8c3RyaW5nLCBzdHJpbmc+KCk7XG4gICAgICAgICAgICBjZm5QYXJhbWV0ZXJzLnNldCgnTExNUHJvdmlkZXJOYW1lJywgJ0h1Z2dpbmdGYWNlJyk7XG4gICAgICAgICAgICBjb25zdCB1c2VDYXNlID0gbmV3IFVzZUNhc2UoXG4gICAgICAgICAgICAgICAgJ2Zha2UtaWQnLFxuICAgICAgICAgICAgICAgICdmYWtlLXRlc3QnLFxuICAgICAgICAgICAgICAgICdDcmVhdGUgYSBzdGFjayBmb3IgdGVzdCcsXG4gICAgICAgICAgICAgICAgY2ZuUGFyYW1ldGVycyxcbiAgICAgICAgICAgICAgICBjb25maWcsXG4gICAgICAgICAgICAgICAgJ3Rlc3QtdXNlcicsXG4gICAgICAgICAgICAgICAgJ2Zha2UtdGVtcGxhdGUtbmFtZScsXG4gICAgICAgICAgICAgICAgJ0NoYXQnLFxuICAgICAgICAgICAgICAgICdmYWtlLWtleSdcbiAgICAgICAgICAgICk7XG4gICAgICAgICAgICB1c2VDYXNlLnN0YWNrSWQgPSAnZmFrZS1zdGFjay1pZCc7XG4gICAgICAgICAgICBjb25zdCBjcmVhdGVTZWNyZXRlSW5wdXRCdWlsZGVyID0gbmV3IENyZWF0ZVNlY3JldENvbW1hbmRJbnB1dEJ1aWxkZXIodXNlQ2FzZSk7XG4gICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgIGNyZWF0ZVNlY3JldENvbW1hbmRJbnB1dCA9IGF3YWl0IGNyZWF0ZVNlY3JldGVJbnB1dEJ1aWxkZXIuYnVpbGQoKTtcbiAgICAgICAgICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICAgICAgICAgICAgY29uc29sZS5lcnJvcihgRXJyb3Igb2NjdXJyZWQsIGVycm9yIGlzICR7ZXJyb3J9YCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuXG4gICAgICAgIGl0KCdzaG91bGQgY3JlYXRlIGEgQ3JlYXRlU2VjcmV0Q29tbWFuZElucHV0QnVpbGRlciB3aXRoIHRoZSBjb3JyZWN0IHByb3BlcnRpZXMnLCAoKSA9PiB7XG4gICAgICAgICAgICBleHBlY3QoY3JlYXRlU2VjcmV0Q29tbWFuZElucHV0Lk5hbWUpLnRvRXF1YWwoJ2Zha2UtaWQvYXBpLWtleScpO1xuICAgICAgICAgICAgZXhwZWN0KGNyZWF0ZVNlY3JldENvbW1hbmRJbnB1dC5TZWNyZXRTdHJpbmcpLnRvRXF1YWwoJ2Zha2Uta2V5Jyk7XG4gICAgICAgIH0pO1xuICAgIH0pO1xuXG4gICAgZGVzY3JpYmUoJ1doZW4gY3JlYXRpbmcgUHV0UGFyYW1ldGVyQ29tbWFuZEJ1aWxkZXIgd2l0aCBhIFVzZUNhc2UnLCAoKSA9PiB7XG4gICAgICAgIGxldCBwdXRTZWNyZXRDb21tYW5kSW5wdXQ6IFB1dFNlY3JldFZhbHVlQ29tbWFuZElucHV0O1xuICAgICAgICBiZWZvcmVBbGwoYXN5bmMgKCkgPT4ge1xuICAgICAgICAgICAgY29uc3QgY2ZuUGFyYW1ldGVycyA9IG5ldyBNYXA8c3RyaW5nLCBzdHJpbmc+KCk7XG4gICAgICAgICAgICBjZm5QYXJhbWV0ZXJzLnNldCgnTExNUHJvdmlkZXJOYW1lJywgJ0h1Z2dpbmdGYWNlJyk7XG4gICAgICAgICAgICBjb25zdCB1c2VDYXNlID0gbmV3IFVzZUNhc2UoXG4gICAgICAgICAgICAgICAgJ2Zha2UtaWQnLFxuICAgICAgICAgICAgICAgICdmYWtlLXRlc3QnLFxuICAgICAgICAgICAgICAgICdDcmVhdGUgYSBzdGFjayBmb3IgdGVzdCcsXG4gICAgICAgICAgICAgICAgY2ZuUGFyYW1ldGVycyxcbiAgICAgICAgICAgICAgICBjb25maWcsXG4gICAgICAgICAgICAgICAgJ3Rlc3QtdXNlcicsXG4gICAgICAgICAgICAgICAgJ2Zha2UtdGVtcGxhdGUtbmFtZScsXG4gICAgICAgICAgICAgICAgJ0NoYXQnLFxuICAgICAgICAgICAgICAgICdmYWtlLWtleSdcbiAgICAgICAgICAgICk7XG4gICAgICAgICAgICB1c2VDYXNlLnN0YWNrSWQgPSAnZmFrZS1zdGFjay1pZCc7XG4gICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgIHB1dFNlY3JldENvbW1hbmRJbnB1dCA9IGF3YWl0IG5ldyBQdXRTZWNyZXRWYWx1ZUNvbW1hbmRJbnB1dEJ1aWxkZXIodXNlQ2FzZSkuYnVpbGQoKTtcbiAgICAgICAgICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICAgICAgICAgICAgY29uc29sZS5lcnJvcihgRXJyb3Igb2NjdXJyZWQsIGVycm9yIGlzICR7ZXJyb3J9YCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuXG4gICAgICAgIGl0KCdzaG91bGQgaGF2ZSB0aGUgZm9sbG93aW5nIHByb3BlcnRpZXMnLCAoKSA9PiB7XG4gICAgICAgICAgICBleHBlY3QocHV0U2VjcmV0Q29tbWFuZElucHV0LlNlY3JldElkKS50b0VxdWFsKCdmYWtlLWlkL2FwaS1rZXknKTtcbiAgICAgICAgICAgIGV4cGVjdChwdXRTZWNyZXRDb21tYW5kSW5wdXQuU2VjcmV0U3RyaW5nKS50b0VxdWFsKCdmYWtlLWtleScpO1xuICAgICAgICB9KTtcbiAgICB9KTtcblxuICAgIGRlc2NyaWJlKCdXaGVuIGNyZWF0aW5nIERlbGV0ZVN0YWNrQ29tbWFuZElucHV0QnVpbGRlciB3aXRoIGEgVXNlQ2FzZScsICgpID0+IHtcbiAgICAgICAgbGV0IGRlbGV0ZVBhcmFtZXRlckNvbW1hbmRJbnB1dDogRGVsZXRlU2VjcmV0Q29tbWFuZElucHV0O1xuXG4gICAgICAgIGJlZm9yZUFsbChhc3luYyAoKSA9PiB7XG4gICAgICAgICAgICBjb25zdCB1c2VDYXNlID0gbmV3IFVzZUNhc2UoXG4gICAgICAgICAgICAgICAgJ2Zha2UtaWQnLFxuICAgICAgICAgICAgICAgICdmYWtlLXRlc3QnLFxuICAgICAgICAgICAgICAgICdDcmVhdGUgYSBzdGFjayBmb3IgdGVzdCcsXG4gICAgICAgICAgICAgICAgbmV3IE1hcDxzdHJpbmcsIHN0cmluZz4oKSxcbiAgICAgICAgICAgICAgICBjb25maWcsXG4gICAgICAgICAgICAgICAgJ3Rlc3QtdXNlcicsXG4gICAgICAgICAgICAgICAgJ2Zha2UtdGVtcGxhdGUtbmFtZScsXG4gICAgICAgICAgICAgICAgJ0NoYXQnLFxuICAgICAgICAgICAgICAgICdmYWtlLWtleSdcbiAgICAgICAgICAgICk7XG4gICAgICAgICAgICB1c2VDYXNlLnN0YWNrSWQgPSAnZmFrZS1zdGFjay1pZCc7XG4gICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgIGRlbGV0ZVBhcmFtZXRlckNvbW1hbmRJbnB1dCA9IGF3YWl0IG5ldyBEZWxldGVTZWNyZXRDb21tYW5kSW5wdXRCdWlsZGVyKHVzZUNhc2UpLmJ1aWxkKCk7XG4gICAgICAgICAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoYEVycm9yIG9jY3VycmVkLCBlcnJvciBpcyAke2Vycm9yfWApO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcblxuICAgICAgICBpdCgnc2hvdWxkIGhhdmUgdGhlIGZvbGxvd2luZyBwcm9wZXJ0aWVzJywgKCkgPT4ge1xuICAgICAgICAgICAgZXhwZWN0KGRlbGV0ZVBhcmFtZXRlckNvbW1hbmRJbnB1dC5TZWNyZXRJZCkudG9FcXVhbCgnZmFrZS1pZC9hcGkta2V5Jyk7XG4gICAgICAgIH0pO1xuICAgIH0pO1xuXG4gICAgYWZ0ZXJBbGwoKCkgPT4ge1xuICAgICAgICBkZWxldGUgcHJvY2Vzcy5lbnZbVVNFX0NBU0VfQVBJX0tFWV9TVUZGSVhfRU5WX1ZBUl07XG4gICAgfSk7XG59KTtcbiJdfQ==