// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

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
