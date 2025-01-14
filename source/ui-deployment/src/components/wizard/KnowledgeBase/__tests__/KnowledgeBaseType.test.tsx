// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import KnowledgeBaseType from '../KnowledgeBaseType';
import { mockFormComponentCallbacks, cloudscapeRender } from '@/utils';
import { cleanup, screen, waitFor } from '@testing-library/react';

describe('KnowledgeBaseType', () => {
    afterEach(() => {
        vi.clearAllMocks();
    });

    afterEach(() => {
        cleanup();
    });

    test('renders', () => {
        const mockKnowledgeBaseData = {
            knowledgeBaseType: { value: 'Kendra', label: 'Kendra' }
        };

        const { cloudscapeWrapper } = cloudscapeRender(
            <KnowledgeBaseType {...mockFormComponentCallbacks()} knowledgeBaseData={mockKnowledgeBaseData} />
        );

        expect(screen.getByTestId('select-knowledgebase-type-container')).toBeDefined();
        const select = cloudscapeWrapper.findSelect();
        select?.openDropdown();
        expect(select?.findDropdown().findOptions().length).toBe(2);
        expect(select?.findDropdown().findOptionByValue('Kendra')).toBeTruthy();
        expect(select?.findDropdown().findOptionByValue('Bedrock')).toBeTruthy();
    });
});
