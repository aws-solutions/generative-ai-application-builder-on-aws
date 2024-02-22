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

import { cloudscapeRender } from '@/utils';
import InvalidPromptWarning from '../InvalidPromptWarning';
import { screen } from '@testing-library/react';

describe('InvalidPromptWarning', () => {
    test('should render', () => {
        const { cloudscapeWrapper } = cloudscapeRender(<InvalidPromptWarning />);
        expect(screen.getByTestId('invalid-prompt-alert')).toBeDefined();
        expect(cloudscapeWrapper.findAlert()?.findContent()?.getElement().textContent?.trim()).toEqual(
            `Ensure all required prompt placeholders are present in the prompt. If RAG is enabled, the "{context}" placeholder is required.`
        );
    });
});
