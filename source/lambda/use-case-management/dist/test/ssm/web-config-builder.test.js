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
const web_config_builder_1 = require("../../ssm/web-config-builder");
const constants_1 = require("../../utils/constants");
describe('When creating webconfig SSM ComandBuilders', () => {
    let getParameterCommandInput;
    beforeAll(async () => {
        process.env[constants_1.WEBCONFIG_SSM_KEY_ENV_VAR] = '/fake-webconfig/key';
        const config = {
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
        const cfnParameters = new Map();
        cfnParameters.set('LLMProviderName', 'HuggingFace');
        const useCase = new use_case_1.UseCase('fake-id', 'fake-test', 'Create a stack for test', cfnParameters, config, 'test-user', 'fake-template-name', 'Chat');
        const getParameterInputBuilder = new web_config_builder_1.GetParameterCommandBuilder(useCase);
        try {
            getParameterCommandInput = await getParameterInputBuilder.build();
        }
        catch (error) {
            console.error(`Error occurred, error is ${error}`);
        }
    });
    it('should create a GetParameterCommandBuilder with the correct properties', () => {
        expect(getParameterCommandInput.Name).toBe('/fake-webconfig/key');
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid2ViLWNvbmZpZy1idWlsZGVyLnRlc3QuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi90ZXN0L3NzbS93ZWItY29uZmlnLWJ1aWxkZXIudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUE7Ozs7Ozs7Ozs7O3VIQVd1SDs7QUFHdkgsbURBQStDO0FBQy9DLHFFQUEwRTtBQUMxRSxxREFBa0U7QUFFbEUsUUFBUSxDQUFDLDRDQUE0QyxFQUFFLEdBQUcsRUFBRTtJQUN4RCxJQUFJLHdCQUFrRCxDQUFDO0lBRXZELFNBQVMsQ0FBQyxLQUFLLElBQUksRUFBRTtRQUNqQixPQUFPLENBQUMsR0FBRyxDQUFDLHFDQUF5QixDQUFDLEdBQUcscUJBQXFCLENBQUM7UUFFL0QsTUFBTSxNQUFNLEdBQUc7WUFDWCxzQkFBc0IsRUFBRSxlQUFlO1lBQ3ZDLHdCQUF3QixFQUFFLDBCQUEwQjtZQUNwRCxpQkFBaUIsRUFBRSxRQUFRO1lBQzNCLG1CQUFtQixFQUFFO2dCQUNqQixZQUFZLEVBQUUsR0FBRztnQkFDakIsZ0JBQWdCLEVBQUUsR0FBRzthQUN4QjtZQUNELFNBQVMsRUFBRTtnQkFDUCxPQUFPLEVBQUUsb0JBQW9CO2dCQUM3QixXQUFXLEVBQUUsUUFBUTtnQkFDckIsY0FBYyxFQUFFLFNBQVM7Z0JBQ3pCLFNBQVMsRUFBRSxJQUFJO2dCQUNmLFdBQVcsRUFBRSxHQUFHO2FBQ25CO1NBQ0osQ0FBQztRQUVGLE1BQU0sYUFBYSxHQUFHLElBQUksR0FBRyxFQUFrQixDQUFDO1FBQ2hELGFBQWEsQ0FBQyxHQUFHLENBQUMsaUJBQWlCLEVBQUUsYUFBYSxDQUFDLENBQUM7UUFDcEQsTUFBTSxPQUFPLEdBQUcsSUFBSSxrQkFBTyxDQUN2QixTQUFTLEVBQ1QsV0FBVyxFQUNYLHlCQUF5QixFQUN6QixhQUFhLEVBQ2IsTUFBTSxFQUNOLFdBQVcsRUFDWCxvQkFBb0IsRUFDcEIsTUFBTSxDQUNULENBQUM7UUFFRixNQUFNLHdCQUF3QixHQUFHLElBQUksK0NBQTBCLENBQUMsT0FBTyxDQUFDLENBQUM7UUFDekUsSUFBSTtZQUNBLHdCQUF3QixHQUFHLE1BQU0sd0JBQXdCLENBQUMsS0FBSyxFQUFFLENBQUM7U0FDckU7UUFBQyxPQUFPLEtBQUssRUFBRTtZQUNaLE9BQU8sQ0FBQyxLQUFLLENBQUMsNEJBQTRCLEtBQUssRUFBRSxDQUFDLENBQUM7U0FDdEQ7SUFDTCxDQUFDLENBQUMsQ0FBQztJQUVILEVBQUUsQ0FBQyx3RUFBd0UsRUFBRSxHQUFHLEVBQUU7UUFDOUUsTUFBTSxDQUFDLHdCQUF3QixDQUFDLElBQUksQ0FBQyxDQUFDLElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxDQUFDO0lBQ3RFLENBQUMsQ0FBQyxDQUFDO0FBQ1AsQ0FBQyxDQUFDLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKlxuICogIENvcHlyaWdodCBBbWF6b24uY29tLCBJbmMuIG9yIGl0cyBhZmZpbGlhdGVzLiBBbGwgUmlnaHRzIFJlc2VydmVkLiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICpcbiAqICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAqXG4gKiAgTGljZW5zZWQgdW5kZXIgdGhlIEFwYWNoZSBMaWNlbnNlLCBWZXJzaW9uIDIuMCAodGhlIFwiTGljZW5zZVwiKS4gWW91IG1heSBub3QgdXNlIHRoaXMgZmlsZSBleGNlcHQgaW4gY29tcGxpYW5jZSAgICAqXG4gKiAgd2l0aCB0aGUgTGljZW5zZS4gQSBjb3B5IG9mIHRoZSBMaWNlbnNlIGlzIGxvY2F0ZWQgYXQgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgKlxuICogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICpcbiAqICAgICAgaHR0cDovL3d3dy5hcGFjaGUub3JnL2xpY2Vuc2VzL0xJQ0VOU0UtMi4wICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAqXG4gKiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgKlxuICogIG9yIGluIHRoZSAnbGljZW5zZScgZmlsZSBhY2NvbXBhbnlpbmcgdGhpcyBmaWxlLiBUaGlzIGZpbGUgaXMgZGlzdHJpYnV0ZWQgb24gYW4gJ0FTIElTJyBCQVNJUywgV0lUSE9VVCBXQVJSQU5USUVTICpcbiAqICBPUiBDT05ESVRJT05TIE9GIEFOWSBLSU5ELCBleHByZXNzIG9yIGltcGxpZWQuIFNlZSB0aGUgTGljZW5zZSBmb3IgdGhlIHNwZWNpZmljIGxhbmd1YWdlIGdvdmVybmluZyBwZXJtaXNzaW9ucyAgICAqXG4gKiAgYW5kIGxpbWl0YXRpb25zIHVuZGVyIHRoZSBMaWNlbnNlLiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgKlxuICoqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKi9cblxuaW1wb3J0IHsgR2V0UGFyYW1ldGVyQ29tbWFuZElucHV0IH0gZnJvbSAnQGF3cy1zZGsvY2xpZW50LXNzbSc7XG5pbXBvcnQgeyBVc2VDYXNlIH0gZnJvbSAnLi4vLi4vbW9kZWwvdXNlLWNhc2UnO1xuaW1wb3J0IHsgR2V0UGFyYW1ldGVyQ29tbWFuZEJ1aWxkZXIgfSBmcm9tICcuLi8uLi9zc20vd2ViLWNvbmZpZy1idWlsZGVyJztcbmltcG9ydCB7IFdFQkNPTkZJR19TU01fS0VZX0VOVl9WQVIgfSBmcm9tICcuLi8uLi91dGlscy9jb25zdGFudHMnO1xuXG5kZXNjcmliZSgnV2hlbiBjcmVhdGluZyB3ZWJjb25maWcgU1NNIENvbWFuZEJ1aWxkZXJzJywgKCkgPT4ge1xuICAgIGxldCBnZXRQYXJhbWV0ZXJDb21tYW5kSW5wdXQ6IEdldFBhcmFtZXRlckNvbW1hbmRJbnB1dDtcblxuICAgIGJlZm9yZUFsbChhc3luYyAoKSA9PiB7XG4gICAgICAgIHByb2Nlc3MuZW52W1dFQkNPTkZJR19TU01fS0VZX0VOVl9WQVJdID0gJy9mYWtlLXdlYmNvbmZpZy9rZXknO1xuXG4gICAgICAgIGNvbnN0IGNvbmZpZyA9IHtcbiAgICAgICAgICAgIENvbnZlcnNhdGlvbk1lbW9yeVR5cGU6ICdEREJNZW1vcnlUeXBlJyxcbiAgICAgICAgICAgIENvbnZlcnNhdGlvbk1lbW9yeVBhcmFtczogJ0NvbnZlcnNhdGlvbk1lbW9yeVBhcmFtcycsXG4gICAgICAgICAgICBLbm93bGVkZ2VCYXNlVHlwZTogJ0tlbmRyYScsXG4gICAgICAgICAgICBLbm93bGVkZ2VCYXNlUGFyYW1zOiB7XG4gICAgICAgICAgICAgICAgTnVtYmVyT2ZEb2NzOiAnNScsXG4gICAgICAgICAgICAgICAgUmV0dXJuU291cmNlRG9jczogJzUnXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgTGxtUGFyYW1zOiB7XG4gICAgICAgICAgICAgICAgTW9kZWxJZDogJ2dvb2dsZS9mbGFuLXQ1LXh4bCcsXG4gICAgICAgICAgICAgICAgTW9kZWxQYXJhbXM6ICdQYXJhbTEnLFxuICAgICAgICAgICAgICAgIFByb21wdFRlbXBsYXRlOiAnUHJvbXB0MScsXG4gICAgICAgICAgICAgICAgU3RyZWFtaW5nOiB0cnVlLFxuICAgICAgICAgICAgICAgIFRlbXBlcmF0dXJlOiAwLjFcbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcblxuICAgICAgICBjb25zdCBjZm5QYXJhbWV0ZXJzID0gbmV3IE1hcDxzdHJpbmcsIHN0cmluZz4oKTtcbiAgICAgICAgY2ZuUGFyYW1ldGVycy5zZXQoJ0xMTVByb3ZpZGVyTmFtZScsICdIdWdnaW5nRmFjZScpO1xuICAgICAgICBjb25zdCB1c2VDYXNlID0gbmV3IFVzZUNhc2UoXG4gICAgICAgICAgICAnZmFrZS1pZCcsXG4gICAgICAgICAgICAnZmFrZS10ZXN0JyxcbiAgICAgICAgICAgICdDcmVhdGUgYSBzdGFjayBmb3IgdGVzdCcsXG4gICAgICAgICAgICBjZm5QYXJhbWV0ZXJzLFxuICAgICAgICAgICAgY29uZmlnLFxuICAgICAgICAgICAgJ3Rlc3QtdXNlcicsXG4gICAgICAgICAgICAnZmFrZS10ZW1wbGF0ZS1uYW1lJyxcbiAgICAgICAgICAgICdDaGF0J1xuICAgICAgICApO1xuXG4gICAgICAgIGNvbnN0IGdldFBhcmFtZXRlcklucHV0QnVpbGRlciA9IG5ldyBHZXRQYXJhbWV0ZXJDb21tYW5kQnVpbGRlcih1c2VDYXNlKTtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIGdldFBhcmFtZXRlckNvbW1hbmRJbnB1dCA9IGF3YWl0IGdldFBhcmFtZXRlcklucHV0QnVpbGRlci5idWlsZCgpO1xuICAgICAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgICAgICAgY29uc29sZS5lcnJvcihgRXJyb3Igb2NjdXJyZWQsIGVycm9yIGlzICR7ZXJyb3J9YCk7XG4gICAgICAgIH1cbiAgICB9KTtcblxuICAgIGl0KCdzaG91bGQgY3JlYXRlIGEgR2V0UGFyYW1ldGVyQ29tbWFuZEJ1aWxkZXIgd2l0aCB0aGUgY29ycmVjdCBwcm9wZXJ0aWVzJywgKCkgPT4ge1xuICAgICAgICBleHBlY3QoZ2V0UGFyYW1ldGVyQ29tbWFuZElucHV0Lk5hbWUpLnRvQmUoJy9mYWtlLXdlYmNvbmZpZy9rZXknKTtcbiAgICB9KTtcbn0pO1xuIl19