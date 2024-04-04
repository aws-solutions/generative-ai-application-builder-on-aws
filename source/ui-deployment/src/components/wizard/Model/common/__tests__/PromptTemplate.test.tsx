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

import { PromptTemplate } from '../PromptTemplate';
import { cloudscapeRender, mockFormComponentCallbacks } from '@/utils';
import { screen } from '@testing-library/react';
import * as QueryHooks from 'hooks/useQueries';

describe('PromptTemplate', () => {
    afterEach(() => {
        jest.clearAllMocks();
    });

    it('renders', () => {
        const maxPromptTemplateLength = 50;
        jest.spyOn(QueryHooks, 'useModelInfoQuery').mockReturnValue({
            isSuccess: true,
            isError: false,
            data: { MaxPromptSize: maxPromptTemplateLength }
        } as any);

        const mockModelData = {
            promptTemplate: 'fake prompt template',
            modelProvider: {
                label: 'Bedrock',
                value: 'Bedrock'
            },
            modelName: 'amazon.titan-text-lite-v1'
        };
        const callbacks = mockFormComponentCallbacks();

        const { cloudscapeWrapper } = cloudscapeRender(
            <PromptTemplate {...callbacks} modelData={mockModelData} isRagEnabled />
        );
        const textArea = cloudscapeWrapper.findTextarea();

        expect(screen.getByTestId('model-system-prompt-field')).toBeTruthy();
        expect(textArea?.getTextareaValue()).toEqual('fake prompt template');

        textArea?.focus();
        textArea?.setTextareaValue('updating the prompt template');
        textArea?.blur();

        expect(callbacks.onChangeFn).toHaveBeenCalledTimes(1);
        expect(callbacks.onChangeFn).toHaveBeenCalledWith({
            promptTemplate: 'updating the prompt template'
        });

        textArea?.focus();
        textArea?.setTextareaValue('updating the prompt template beyond max prompt limit');
        textArea?.blur();

        expect(callbacks.onChangeFn).toHaveBeenCalledTimes(2);
        expect(callbacks.onChangeFn).toHaveBeenCalledWith({
            promptTemplate: 'updating the prompt template'
        });
        let errorField = cloudscapeWrapper.findFormField('[data-testid="model-system-prompt-field"]')?.findError();
        expect(errorField?.getElement().innerHTML).toContain(
            `Prompt template can have a maximum of ${maxPromptTemplateLength} characters`
        );
    });
});
