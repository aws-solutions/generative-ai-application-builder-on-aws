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

describe('PromptTemplate', () => {
    afterEach(() => {
        jest.clearAllMocks();
    });

    it('renders', () => {
        const mockModelData = {
            promptTemplate: 'fake prompt template'
        };
        const callbacks = mockFormComponentCallbacks();

        const { cloudscapeWrapper } = cloudscapeRender(<PromptTemplate {...callbacks} modelData={mockModelData} />);
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
    });
});
