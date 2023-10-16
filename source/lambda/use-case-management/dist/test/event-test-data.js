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
exports.permanentlyDeleteUseCaseEvent = exports.deleteUseCaseEvent = exports.updateUseCaseEvent = exports.createUseCaseEvent = void 0;
exports.createUseCaseEvent = {
    body: {
        ConsentToDataLeavingAWS: true,
        UseCaseName: 'fake-name',
        UseCaseDescription: 'fake-description',
        DefaultUserEmail: 'fake-email@example.com',
        ConversationMemoryType: 'DDBMemoryType',
        ConversationMemoryParams: {},
        KnowledgeBaseType: 'Kendra',
        KnowledgeBaseParams: {
            KendraIndexName: 'fake-index-name',
            NumberOfDocs: '5',
            ReturnSourceDocs: '5'
        },
        LlmParams: {
            ModelProvider: 'HuggingFace',
            ApiKey: 'some-fake-key',
            ModelId: 'google/flan-t5-xxl',
            ModelParams: { 'Param1': 'value1' },
            PromptTemplate: 'Prompt1',
            Streaming: true,
            RAGEnabled: true,
            Temperature: 0.1
        }
    },
    requestContext: {
        authorizer: {
            UserId: 'fake-user-id'
        }
    }
};
exports.updateUseCaseEvent = {
    body: {
        ConsentToDataLeavingAWS: false,
        UseCaseName: 'fake-name',
        UseCaseDescription: 'fake-description',
        DefaultUserEmail: 'fake-email@example.com',
        ConversationMemoryType: 'DDBMemoryType',
        ConversationMemoryParams: {},
        KnowledgeBaseType: 'Kendra',
        KnowledgeBaseParams: {
            KendraIndexName: 'fake-index-name',
            NumberOfDocs: '5',
            ReturnSourceDocs: '5'
        },
        LlmParams: {
            ModelProvider: 'HuggingFace',
            ApiKey: 'some-fake-key',
            ModelId: 'google/flan-t5-xxl',
            ModelParams: { 'Param1': 'value1' },
            PromptTemplate: 'Prompt1',
            Streaming: true,
            RAGEnabled: true,
            Temperature: 0.1
        }
    },
    pathParameters: {
        useCaseId: '11111111-222222222-33333333-44444444-55555555'
    },
    requestContext: {
        authorizer: {
            UserId: 'fake-user-id'
        }
    }
};
exports.deleteUseCaseEvent = {
    pathParameters: {
        useCaseId: '11111111-222222222-33333333-44444444-55555555'
    },
    requestContext: {
        authorizer: {
            UserId: 'fake-user-id'
        }
    },
    queryStringParameters: {
        permanent: false
    }
};
exports.permanentlyDeleteUseCaseEvent = {
    pathParameters: {
        useCaseId: '11111111-222222222-33333333-44444444-55555555'
    },
    requestContext: {
        authorizer: {
            UserId: 'fake-user-id'
        }
    },
    queryStringParameters: {
        permanent: true
    }
};
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXZlbnQtdGVzdC1kYXRhLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vdGVzdC9ldmVudC10ZXN0LWRhdGEudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBOzs7Ozs7Ozs7Ozt1SEFXdUg7OztBQUUxRyxRQUFBLGtCQUFrQixHQUFHO0lBQzlCLElBQUksRUFBRTtRQUNGLHVCQUF1QixFQUFFLElBQUk7UUFDN0IsV0FBVyxFQUFFLFdBQVc7UUFDeEIsa0JBQWtCLEVBQUUsa0JBQWtCO1FBQ3RDLGdCQUFnQixFQUFFLHdCQUF3QjtRQUMxQyxzQkFBc0IsRUFBRSxlQUFlO1FBQ3ZDLHdCQUF3QixFQUFFLEVBQUU7UUFDNUIsaUJBQWlCLEVBQUUsUUFBUTtRQUMzQixtQkFBbUIsRUFBRTtZQUNqQixlQUFlLEVBQUUsaUJBQWlCO1lBQ2xDLFlBQVksRUFBRSxHQUFHO1lBQ2pCLGdCQUFnQixFQUFFLEdBQUc7U0FDeEI7UUFDRCxTQUFTLEVBQUU7WUFDUCxhQUFhLEVBQUUsYUFBYTtZQUM1QixNQUFNLEVBQUUsZUFBZTtZQUN2QixPQUFPLEVBQUUsb0JBQW9CO1lBQzdCLFdBQVcsRUFBRSxFQUFFLFFBQVEsRUFBRSxRQUFRLEVBQUU7WUFDbkMsY0FBYyxFQUFFLFNBQVM7WUFDekIsU0FBUyxFQUFFLElBQUk7WUFDZixVQUFVLEVBQUUsSUFBSTtZQUNoQixXQUFXLEVBQUUsR0FBRztTQUNuQjtLQUNKO0lBQ0QsY0FBYyxFQUFFO1FBQ1osVUFBVSxFQUFFO1lBQ1IsTUFBTSxFQUFFLGNBQWM7U0FDekI7S0FDSjtDQUNKLENBQUM7QUFFVyxRQUFBLGtCQUFrQixHQUFHO0lBQzlCLElBQUksRUFBRTtRQUNGLHVCQUF1QixFQUFFLEtBQUs7UUFDOUIsV0FBVyxFQUFFLFdBQVc7UUFDeEIsa0JBQWtCLEVBQUUsa0JBQWtCO1FBQ3RDLGdCQUFnQixFQUFFLHdCQUF3QjtRQUMxQyxzQkFBc0IsRUFBRSxlQUFlO1FBQ3ZDLHdCQUF3QixFQUFFLEVBQUU7UUFDNUIsaUJBQWlCLEVBQUUsUUFBUTtRQUMzQixtQkFBbUIsRUFBRTtZQUNqQixlQUFlLEVBQUUsaUJBQWlCO1lBQ2xDLFlBQVksRUFBRSxHQUFHO1lBQ2pCLGdCQUFnQixFQUFFLEdBQUc7U0FDeEI7UUFDRCxTQUFTLEVBQUU7WUFDUCxhQUFhLEVBQUUsYUFBYTtZQUM1QixNQUFNLEVBQUUsZUFBZTtZQUN2QixPQUFPLEVBQUUsb0JBQW9CO1lBQzdCLFdBQVcsRUFBRSxFQUFFLFFBQVEsRUFBRSxRQUFRLEVBQUU7WUFDbkMsY0FBYyxFQUFFLFNBQVM7WUFDekIsU0FBUyxFQUFFLElBQUk7WUFDZixVQUFVLEVBQUUsSUFBSTtZQUNoQixXQUFXLEVBQUUsR0FBRztTQUNuQjtLQUNKO0lBQ0QsY0FBYyxFQUFFO1FBQ1osU0FBUyxFQUFFLCtDQUErQztLQUM3RDtJQUNELGNBQWMsRUFBRTtRQUNaLFVBQVUsRUFBRTtZQUNSLE1BQU0sRUFBRSxjQUFjO1NBQ3pCO0tBQ0o7Q0FDSixDQUFDO0FBRVcsUUFBQSxrQkFBa0IsR0FBRztJQUM5QixjQUFjLEVBQUU7UUFDWixTQUFTLEVBQUUsK0NBQStDO0tBQzdEO0lBQ0QsY0FBYyxFQUFFO1FBQ1osVUFBVSxFQUFFO1lBQ1IsTUFBTSxFQUFFLGNBQWM7U0FDekI7S0FDSjtJQUNELHFCQUFxQixFQUFFO1FBQ25CLFNBQVMsRUFBRSxLQUFLO0tBQ25CO0NBQ0osQ0FBQztBQUVXLFFBQUEsNkJBQTZCLEdBQUc7SUFDekMsY0FBYyxFQUFFO1FBQ1osU0FBUyxFQUFFLCtDQUErQztLQUM3RDtJQUNELGNBQWMsRUFBRTtRQUNaLFVBQVUsRUFBRTtZQUNSLE1BQU0sRUFBRSxjQUFjO1NBQ3pCO0tBQ0o7SUFDRCxxQkFBcUIsRUFBRTtRQUNuQixTQUFTLEVBQUUsSUFBSTtLQUNsQjtDQUNKLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKlxuICogIENvcHlyaWdodCBBbWF6b24uY29tLCBJbmMuIG9yIGl0cyBhZmZpbGlhdGVzLiBBbGwgUmlnaHRzIFJlc2VydmVkLiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICpcbiAqICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAqXG4gKiAgTGljZW5zZWQgdW5kZXIgdGhlIEFwYWNoZSBMaWNlbnNlLCBWZXJzaW9uIDIuMCAodGhlIFwiTGljZW5zZVwiKS4gWW91IG1heSBub3QgdXNlIHRoaXMgZmlsZSBleGNlcHQgaW4gY29tcGxpYW5jZSAgICAqXG4gKiAgd2l0aCB0aGUgTGljZW5zZS4gQSBjb3B5IG9mIHRoZSBMaWNlbnNlIGlzIGxvY2F0ZWQgYXQgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgKlxuICogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICpcbiAqICAgICAgaHR0cDovL3d3dy5hcGFjaGUub3JnL2xpY2Vuc2VzL0xJQ0VOU0UtMi4wICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAqXG4gKiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgKlxuICogIG9yIGluIHRoZSAnbGljZW5zZScgZmlsZSBhY2NvbXBhbnlpbmcgdGhpcyBmaWxlLiBUaGlzIGZpbGUgaXMgZGlzdHJpYnV0ZWQgb24gYW4gJ0FTIElTJyBCQVNJUywgV0lUSE9VVCBXQVJSQU5USUVTICpcbiAqICBPUiBDT05ESVRJT05TIE9GIEFOWSBLSU5ELCBleHByZXNzIG9yIGltcGxpZWQuIFNlZSB0aGUgTGljZW5zZSBmb3IgdGhlIHNwZWNpZmljIGxhbmd1YWdlIGdvdmVybmluZyBwZXJtaXNzaW9ucyAgICAqXG4gKiAgYW5kIGxpbWl0YXRpb25zIHVuZGVyIHRoZSBMaWNlbnNlLiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgKlxuICoqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKi9cblxuZXhwb3J0IGNvbnN0IGNyZWF0ZVVzZUNhc2VFdmVudCA9IHtcbiAgICBib2R5OiB7XG4gICAgICAgIENvbnNlbnRUb0RhdGFMZWF2aW5nQVdTOiB0cnVlLFxuICAgICAgICBVc2VDYXNlTmFtZTogJ2Zha2UtbmFtZScsXG4gICAgICAgIFVzZUNhc2VEZXNjcmlwdGlvbjogJ2Zha2UtZGVzY3JpcHRpb24nLFxuICAgICAgICBEZWZhdWx0VXNlckVtYWlsOiAnZmFrZS1lbWFpbEBleGFtcGxlLmNvbScsXG4gICAgICAgIENvbnZlcnNhdGlvbk1lbW9yeVR5cGU6ICdEREJNZW1vcnlUeXBlJyxcbiAgICAgICAgQ29udmVyc2F0aW9uTWVtb3J5UGFyYW1zOiB7fSxcbiAgICAgICAgS25vd2xlZGdlQmFzZVR5cGU6ICdLZW5kcmEnLFxuICAgICAgICBLbm93bGVkZ2VCYXNlUGFyYW1zOiB7XG4gICAgICAgICAgICBLZW5kcmFJbmRleE5hbWU6ICdmYWtlLWluZGV4LW5hbWUnLFxuICAgICAgICAgICAgTnVtYmVyT2ZEb2NzOiAnNScsXG4gICAgICAgICAgICBSZXR1cm5Tb3VyY2VEb2NzOiAnNSdcbiAgICAgICAgfSxcbiAgICAgICAgTGxtUGFyYW1zOiB7XG4gICAgICAgICAgICBNb2RlbFByb3ZpZGVyOiAnSHVnZ2luZ0ZhY2UnLFxuICAgICAgICAgICAgQXBpS2V5OiAnc29tZS1mYWtlLWtleScsXG4gICAgICAgICAgICBNb2RlbElkOiAnZ29vZ2xlL2ZsYW4tdDUteHhsJyxcbiAgICAgICAgICAgIE1vZGVsUGFyYW1zOiB7ICdQYXJhbTEnOiAndmFsdWUxJyB9LFxuICAgICAgICAgICAgUHJvbXB0VGVtcGxhdGU6ICdQcm9tcHQxJyxcbiAgICAgICAgICAgIFN0cmVhbWluZzogdHJ1ZSxcbiAgICAgICAgICAgIFJBR0VuYWJsZWQ6IHRydWUsXG4gICAgICAgICAgICBUZW1wZXJhdHVyZTogMC4xXG4gICAgICAgIH1cbiAgICB9LFxuICAgIHJlcXVlc3RDb250ZXh0OiB7XG4gICAgICAgIGF1dGhvcml6ZXI6IHtcbiAgICAgICAgICAgIFVzZXJJZDogJ2Zha2UtdXNlci1pZCdcbiAgICAgICAgfVxuICAgIH1cbn07XG5cbmV4cG9ydCBjb25zdCB1cGRhdGVVc2VDYXNlRXZlbnQgPSB7XG4gICAgYm9keToge1xuICAgICAgICBDb25zZW50VG9EYXRhTGVhdmluZ0FXUzogZmFsc2UsXG4gICAgICAgIFVzZUNhc2VOYW1lOiAnZmFrZS1uYW1lJyxcbiAgICAgICAgVXNlQ2FzZURlc2NyaXB0aW9uOiAnZmFrZS1kZXNjcmlwdGlvbicsXG4gICAgICAgIERlZmF1bHRVc2VyRW1haWw6ICdmYWtlLWVtYWlsQGV4YW1wbGUuY29tJyxcbiAgICAgICAgQ29udmVyc2F0aW9uTWVtb3J5VHlwZTogJ0REQk1lbW9yeVR5cGUnLFxuICAgICAgICBDb252ZXJzYXRpb25NZW1vcnlQYXJhbXM6IHt9LFxuICAgICAgICBLbm93bGVkZ2VCYXNlVHlwZTogJ0tlbmRyYScsXG4gICAgICAgIEtub3dsZWRnZUJhc2VQYXJhbXM6IHtcbiAgICAgICAgICAgIEtlbmRyYUluZGV4TmFtZTogJ2Zha2UtaW5kZXgtbmFtZScsXG4gICAgICAgICAgICBOdW1iZXJPZkRvY3M6ICc1JyxcbiAgICAgICAgICAgIFJldHVyblNvdXJjZURvY3M6ICc1J1xuICAgICAgICB9LFxuICAgICAgICBMbG1QYXJhbXM6IHtcbiAgICAgICAgICAgIE1vZGVsUHJvdmlkZXI6ICdIdWdnaW5nRmFjZScsXG4gICAgICAgICAgICBBcGlLZXk6ICdzb21lLWZha2Uta2V5JyxcbiAgICAgICAgICAgIE1vZGVsSWQ6ICdnb29nbGUvZmxhbi10NS14eGwnLFxuICAgICAgICAgICAgTW9kZWxQYXJhbXM6IHsgJ1BhcmFtMSc6ICd2YWx1ZTEnIH0sXG4gICAgICAgICAgICBQcm9tcHRUZW1wbGF0ZTogJ1Byb21wdDEnLFxuICAgICAgICAgICAgU3RyZWFtaW5nOiB0cnVlLFxuICAgICAgICAgICAgUkFHRW5hYmxlZDogdHJ1ZSxcbiAgICAgICAgICAgIFRlbXBlcmF0dXJlOiAwLjFcbiAgICAgICAgfVxuICAgIH0sXG4gICAgcGF0aFBhcmFtZXRlcnM6IHtcbiAgICAgICAgdXNlQ2FzZUlkOiAnMTExMTExMTEtMjIyMjIyMjIyLTMzMzMzMzMzLTQ0NDQ0NDQ0LTU1NTU1NTU1J1xuICAgIH0sXG4gICAgcmVxdWVzdENvbnRleHQ6IHtcbiAgICAgICAgYXV0aG9yaXplcjoge1xuICAgICAgICAgICAgVXNlcklkOiAnZmFrZS11c2VyLWlkJ1xuICAgICAgICB9XG4gICAgfVxufTtcblxuZXhwb3J0IGNvbnN0IGRlbGV0ZVVzZUNhc2VFdmVudCA9IHtcbiAgICBwYXRoUGFyYW1ldGVyczoge1xuICAgICAgICB1c2VDYXNlSWQ6ICcxMTExMTExMS0yMjIyMjIyMjItMzMzMzMzMzMtNDQ0NDQ0NDQtNTU1NTU1NTUnXG4gICAgfSxcbiAgICByZXF1ZXN0Q29udGV4dDoge1xuICAgICAgICBhdXRob3JpemVyOiB7XG4gICAgICAgICAgICBVc2VySWQ6ICdmYWtlLXVzZXItaWQnXG4gICAgICAgIH1cbiAgICB9LFxuICAgIHF1ZXJ5U3RyaW5nUGFyYW1ldGVyczoge1xuICAgICAgICBwZXJtYW5lbnQ6IGZhbHNlXG4gICAgfVxufTtcblxuZXhwb3J0IGNvbnN0IHBlcm1hbmVudGx5RGVsZXRlVXNlQ2FzZUV2ZW50ID0ge1xuICAgIHBhdGhQYXJhbWV0ZXJzOiB7XG4gICAgICAgIHVzZUNhc2VJZDogJzExMTExMTExLTIyMjIyMjIyMi0zMzMzMzMzMy00NDQ0NDQ0NC01NTU1NTU1NSdcbiAgICB9LFxuICAgIHJlcXVlc3RDb250ZXh0OiB7XG4gICAgICAgIGF1dGhvcml6ZXI6IHtcbiAgICAgICAgICAgIFVzZXJJZDogJ2Zha2UtdXNlci1pZCdcbiAgICAgICAgfVxuICAgIH0sXG4gICAgcXVlcnlTdHJpbmdQYXJhbWV0ZXJzOiB7XG4gICAgICAgIHBlcm1hbmVudDogdHJ1ZVxuICAgIH1cbn07XG4iXX0=