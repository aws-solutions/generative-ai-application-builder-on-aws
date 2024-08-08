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

import { BEDROCK_KNOWLEDGE_BASE_OVERRIDE_SEARCH_TYPES, KNOWLEDGE_BASE_TYPES } from '@/components/wizard/steps-config';
import { OverrideSearchType } from '../OverrideSearchType';
import { cloudscapeRender, mockFormComponentCallbacks } from '@/utils';
import { screen } from '@testing-library/react';

describe('OverrideSearchType', () => {
    afterEach(() => {
        vi.clearAllMocks();
    });

    test('renders component with default value of no override', () => {
        const mockKnowledgeBaseData = { knowledgeBaseType: KNOWLEDGE_BASE_TYPES[1] };

        const callbacks = mockFormComponentCallbacks();

        const { cloudscapeWrapper } = cloudscapeRender(
            <OverrideSearchType knowledgeBaseData={mockKnowledgeBaseData} {...callbacks} />
        );

        expect(screen.getByTestId('input-bedrock-knowledge-base-override-search-type')).toBeDefined();
        const radio = cloudscapeWrapper.findRadioGroup();
        radio?.findInputByValue('true')?.click();
        expect(cloudscapeWrapper.findSelect()).toBeDefined();
        expect(callbacks.onChangeFn).toHaveBeenCalledWith({
            bedrockOverrideSearchType: BEDROCK_KNOWLEDGE_BASE_OVERRIDE_SEARCH_TYPES[0]
        });
    });

    test('renders with a valid override passed in', () => {
        const mockKnowledgeBaseData = {
            knowledgeBaseType: KNOWLEDGE_BASE_TYPES[1],
            bedrockOverrideSearchType: BEDROCK_KNOWLEDGE_BASE_OVERRIDE_SEARCH_TYPES[0]
        };

        const callbacks = mockFormComponentCallbacks();

        const { cloudscapeWrapper } = cloudscapeRender(
            <OverrideSearchType knowledgeBaseData={mockKnowledgeBaseData} {...callbacks} />
        );

        expect(screen.getByTestId('input-bedrock-knowledge-base-override-search-type')).toBeDefined();
        expect(cloudscapeWrapper.findSelect()).toBeDefined();

        const input = cloudscapeWrapper.findSelect();
        input?.openDropdown();
        input?.selectOptionByValue('SEMANTIC');
        expect(callbacks.onChangeFn).toHaveBeenCalledWith({
            bedrockOverrideSearchType: BEDROCK_KNOWLEDGE_BASE_OVERRIDE_SEARCH_TYPES[1]
        });
    });
});
