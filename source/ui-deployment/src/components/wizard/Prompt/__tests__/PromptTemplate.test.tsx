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
 **********************************************************************************************************************/

import { renderWithProvider } from '@/utils';
import { screen } from '@testing-library/react';
import PromptTemplate from '../PromptTemplate';
import { USECASE_TYPE_ROUTE } from '@/utils/constants';

describe('PromptTemplate', () => {
    const dataTestId = 'testid';
    const promptExperienceProps = {
        'defaultPromptTemplate': '{history}{input}',
        'maxPromptTemplateLength': 10000,
        'rephraseQuestion': true,
        'disambiguationEnabled': true,
        'isRag': false,
        'setPromptTemplateInError': vi.fn() as React.Dispatch<React.SetStateAction<boolean>>,
        'data-testid': dataTestId,
        'onChangeFn': vi.fn(),
        'setNumFieldsInError': vi.fn()
    };

    afterEach(() => {
        vi.clearAllMocks();
    });

    test('render prompt template', async () => {
        const promptTemplate = '{history}{input}';
        const { cloudscapeWrapper } = renderWithProvider(
            <PromptTemplate {...promptExperienceProps} promptTemplate={promptTemplate} />,
            {
                route: USECASE_TYPE_ROUTE.TEXT
            }
        );
        expect(screen.getByTestId(dataTestId)).toBeDefined();
        const textArea = cloudscapeWrapper.findTextarea();
        expect(textArea?.getTextareaValue()).toEqual(promptTemplate);
        textArea?.setTextareaValue('new value');
    });

    test('render prompt template with extra } showing an error', async () => {
        const promptTemplate = '{history}{input}}';
        const { cloudscapeWrapper } = renderWithProvider(
            <PromptTemplate {...promptExperienceProps} promptTemplate={promptTemplate} />,
            {
                route: USECASE_TYPE_ROUTE.TEXT
            }
        );
        expect(screen.getByTestId(dataTestId)).toBeDefined();
        const promptTemplateFormField = cloudscapeWrapper.findFormField();
        const textArea = cloudscapeWrapper.findTextarea();
        expect(textArea?.getTextareaValue()).toEqual(promptTemplate);
        expect(promptTemplateFormField?.findError()).toBeDefined();
    });
});
