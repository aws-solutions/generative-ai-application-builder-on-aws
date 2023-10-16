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
const stack_view_builder_1 = require("../../cfn/stack-view-builder");
const constants_1 = require("../../utils/constants");
const event_test_data_1 = require("../event-test-data");
describe('When creating StackCommandBuilders', () => {
    let event;
    beforeAll(() => {
        process.env[constants_1.ARTIFACT_BUCKET_ENV_VAR] = 'fake-bucket';
        process.env[constants_1.CFN_DEPLOY_ROLE_ARN_ENV_VAR] = 'arn:aws:iam::fake-account:role/FakeRole';
        event = event_test_data_1.createUseCaseEvent;
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
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3RhY2stdmlldy1idWlsZGVyLnRlc3QuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi90ZXN0L2Nmbi9zdGFjay12aWV3LWJ1aWxkZXIudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUE7Ozs7Ozs7Ozs7O3VIQVd1SDs7QUFHdkgscUVBQWlGO0FBQ2pGLHFEQUE2RjtBQUM3Rix3REFBd0Q7QUFFeEQsUUFBUSxDQUFDLG9DQUFvQyxFQUFFLEdBQUcsRUFBRTtJQUNoRCxJQUFJLEtBQVUsQ0FBQztJQUNmLFNBQVMsQ0FBQyxHQUFHLEVBQUU7UUFDWCxPQUFPLENBQUMsR0FBRyxDQUFDLG1DQUF1QixDQUFDLEdBQUcsYUFBYSxDQUFDO1FBQ3JELE9BQU8sQ0FBQyxHQUFHLENBQUMsdUNBQTJCLENBQUMsR0FBRyx5Q0FBeUMsQ0FBQztRQUNyRixLQUFLLEdBQUcsb0NBQWtCLENBQUM7SUFDL0IsQ0FBQyxDQUFDLENBQUM7SUFFSCxRQUFRLENBQUMsa0VBQWtFLEVBQUUsR0FBRyxFQUFFO1FBQzlFLElBQUksa0JBQThDLENBQUM7UUFFbkQsU0FBUyxDQUFDLEtBQUssSUFBSSxFQUFFO1lBQ2pCLE1BQU0sU0FBUyxHQUFHO2dCQUNkLFFBQVEsRUFBRSwrRUFBK0U7Z0JBQ3pGLFNBQVMsRUFBRSxpQkFBaUI7Z0JBQzVCLE9BQU8sRUFBRSxpQ0FBaUM7Z0JBQzFDLG9CQUFvQixFQUFFLGNBQWM7Z0JBQ3BDLG1CQUFtQixFQUFFLFlBQVk7YUFDcEMsQ0FBQztZQUVGLElBQUk7Z0JBQ0Esa0JBQWtCLEdBQUcsTUFBTSxJQUFJLHNEQUFpQyxDQUFDLFNBQVMsQ0FBQyxDQUFDLEtBQUssRUFBRSxDQUFDO2FBQ3ZGO1lBQUMsT0FBTyxLQUFLLEVBQUU7Z0JBQ1osT0FBTyxDQUFDLEtBQUssQ0FBQyw0QkFBNEIsS0FBSyxFQUFFLENBQUMsQ0FBQzthQUN0RDtRQUNMLENBQUMsQ0FBQyxDQUFDO1FBRUgsRUFBRSxDQUFDLHNDQUFzQyxFQUFFLEdBQUcsRUFBRTtZQUM1QyxNQUFNLENBQUMsa0JBQWtCLENBQUMsU0FBUyxDQUFDLENBQUMsT0FBTyxDQUN4QywrRUFBK0UsQ0FDbEYsQ0FBQztRQUNOLENBQUMsQ0FBQyxDQUFDO0lBQ1AsQ0FBQyxDQUFDLENBQUM7SUFFSCxRQUFRLENBQUMsR0FBRyxFQUFFO1FBQ1YsT0FBTyxPQUFPLENBQUMsR0FBRyxDQUFDLG1DQUF1QixDQUFDLENBQUM7UUFDNUMsT0FBTyxPQUFPLENBQUMsR0FBRyxDQUFDLHVDQUEyQixDQUFDLENBQUM7SUFDcEQsQ0FBQyxDQUFDLENBQUM7QUFDUCxDQUFDLENBQUMsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqXG4gKiAgQ29weXJpZ2h0IEFtYXpvbi5jb20sIEluYy4gb3IgaXRzIGFmZmlsaWF0ZXMuIEFsbCBSaWdodHMgUmVzZXJ2ZWQuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgKlxuICogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICpcbiAqICBMaWNlbnNlZCB1bmRlciB0aGUgQXBhY2hlIExpY2Vuc2UsIFZlcnNpb24gMi4wICh0aGUgXCJMaWNlbnNlXCIpLiBZb3UgbWF5IG5vdCB1c2UgdGhpcyBmaWxlIGV4Y2VwdCBpbiBjb21wbGlhbmNlICAgICpcbiAqICB3aXRoIHRoZSBMaWNlbnNlLiBBIGNvcHkgb2YgdGhlIExpY2Vuc2UgaXMgbG9jYXRlZCBhdCAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAqXG4gKiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgKlxuICogICAgICBodHRwOi8vd3d3LmFwYWNoZS5vcmcvbGljZW5zZXMvTElDRU5TRS0yLjAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICpcbiAqICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAqXG4gKiAgb3IgaW4gdGhlICdsaWNlbnNlJyBmaWxlIGFjY29tcGFueWluZyB0aGlzIGZpbGUuIFRoaXMgZmlsZSBpcyBkaXN0cmlidXRlZCBvbiBhbiAnQVMgSVMnIEJBU0lTLCBXSVRIT1VUIFdBUlJBTlRJRVMgKlxuICogIE9SIENPTkRJVElPTlMgT0YgQU5ZIEtJTkQsIGV4cHJlc3Mgb3IgaW1wbGllZC4gU2VlIHRoZSBMaWNlbnNlIGZvciB0aGUgc3BlY2lmaWMgbGFuZ3VhZ2UgZ292ZXJuaW5nIHBlcm1pc3Npb25zICAgICpcbiAqICBhbmQgbGltaXRhdGlvbnMgdW5kZXIgdGhlIExpY2Vuc2UuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAqXG4gKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqL1xuXG5pbXBvcnQgeyBEZXNjcmliZVN0YWNrc0NvbW1hbmRJbnB1dCB9IGZyb20gJ0Bhd3Mtc2RrL2NsaWVudC1jbG91ZGZvcm1hdGlvbic7XG5pbXBvcnQgeyBEZXNjcmliZVN0YWNrc0NvbW1hbmRJbnB1dEJ1aWxkZXIgfSBmcm9tICcuLi8uLi9jZm4vc3RhY2stdmlldy1idWlsZGVyJztcbmltcG9ydCB7IEFSVElGQUNUX0JVQ0tFVF9FTlZfVkFSLCBDRk5fREVQTE9ZX1JPTEVfQVJOX0VOVl9WQVIgfSBmcm9tICcuLi8uLi91dGlscy9jb25zdGFudHMnO1xuaW1wb3J0IHsgY3JlYXRlVXNlQ2FzZUV2ZW50IH0gZnJvbSAnLi4vZXZlbnQtdGVzdC1kYXRhJztcblxuZGVzY3JpYmUoJ1doZW4gY3JlYXRpbmcgU3RhY2tDb21tYW5kQnVpbGRlcnMnLCAoKSA9PiB7XG4gICAgbGV0IGV2ZW50OiBhbnk7XG4gICAgYmVmb3JlQWxsKCgpID0+IHtcbiAgICAgICAgcHJvY2Vzcy5lbnZbQVJUSUZBQ1RfQlVDS0VUX0VOVl9WQVJdID0gJ2Zha2UtYnVja2V0JztcbiAgICAgICAgcHJvY2Vzcy5lbnZbQ0ZOX0RFUExPWV9ST0xFX0FSTl9FTlZfVkFSXSA9ICdhcm46YXdzOmlhbTo6ZmFrZS1hY2NvdW50OnJvbGUvRmFrZVJvbGUnO1xuICAgICAgICBldmVudCA9IGNyZWF0ZVVzZUNhc2VFdmVudDtcbiAgICB9KTtcblxuICAgIGRlc2NyaWJlKCdXaGVuIGNyZWF0aW5nIERlc2NyaWJlU3RhY2tzQ29tbWFuZElucHV0QnVpbGRlciB3aXRoIGEgc3RhY2tJbmZvJywgKCkgPT4ge1xuICAgICAgICBsZXQgZGVzY3JpYmVTdGFja0lucHV0OiBEZXNjcmliZVN0YWNrc0NvbW1hbmRJbnB1dDtcblxuICAgICAgICBiZWZvcmVBbGwoYXN5bmMgKCkgPT4ge1xuICAgICAgICAgICAgY29uc3Qgc3RhY2tJbmZvID0ge1xuICAgICAgICAgICAgICAgIHN0YWNrQXJuOiAnYXJuOmF3czpjbG91ZGZvcm1hdGlvbjp1cy13ZXN0LTI6MTIzNDU2Nzg5MDEyOnN0YWNrL2Zha2Utc3RhY2stbmFtZS9mYWtlLXV1aWQnLFxuICAgICAgICAgICAgICAgIHN0YWNrTmFtZTogJ2Zha2Utc3RhY2stbmFtZScsXG4gICAgICAgICAgICAgICAgc3RhY2tJZDogJ3N0YWNrL2Zha2Utc3RhY2stbmFtZS9mYWtlLXV1aWQnLFxuICAgICAgICAgICAgICAgIHN0YWNrSW5zdGFuY2VBY2NvdW50OiAnMTIzNDU2Nzg5MDEyJyxcbiAgICAgICAgICAgICAgICBzdGFja0luc3RhbmNlUmVnaW9uOiAnOnVzLXdlc3QtMidcbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgZGVzY3JpYmVTdGFja0lucHV0ID0gYXdhaXQgbmV3IERlc2NyaWJlU3RhY2tzQ29tbWFuZElucHV0QnVpbGRlcihzdGFja0luZm8pLmJ1aWxkKCk7XG4gICAgICAgICAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoYEVycm9yIG9jY3VycmVkLCBlcnJvciBpcyAke2Vycm9yfWApO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcblxuICAgICAgICBpdCgnc2hvdWxkIGhhdmUgdGhlIGZvbGxvd2luZyBwcm9wZXJ0aWVzJywgKCkgPT4ge1xuICAgICAgICAgICAgZXhwZWN0KGRlc2NyaWJlU3RhY2tJbnB1dC5TdGFja05hbWUpLnRvRXF1YWwoXG4gICAgICAgICAgICAgICAgJ2Fybjphd3M6Y2xvdWRmb3JtYXRpb246dXMtd2VzdC0yOjEyMzQ1Njc4OTAxMjpzdGFjay9mYWtlLXN0YWNrLW5hbWUvZmFrZS11dWlkJ1xuICAgICAgICAgICAgKTtcbiAgICAgICAgfSk7XG4gICAgfSk7XG5cbiAgICBhZnRlckFsbCgoKSA9PiB7XG4gICAgICAgIGRlbGV0ZSBwcm9jZXNzLmVudltBUlRJRkFDVF9CVUNLRVRfRU5WX1ZBUl07XG4gICAgICAgIGRlbGV0ZSBwcm9jZXNzLmVudltDRk5fREVQTE9ZX1JPTEVfQVJOX0VOVl9WQVJdO1xuICAgIH0pO1xufSk7XG4iXX0=