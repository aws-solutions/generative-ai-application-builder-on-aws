// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

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
