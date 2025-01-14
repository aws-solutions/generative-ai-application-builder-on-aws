// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import KendraEdition from '../KendraEdition';
import { mockFormComponentCallbacks, cloudscapeRender } from '@/utils';
import { cleanup, screen } from '@testing-library/react';

describe('KendraEdition', () => {
    afterEach(() => {
        vi.clearAllMocks();
    });

    test('renders', () => {
        const mockKnowledgeBaseData = {
            kendraEdition: { value: 'developer', label: 'Developer' }
        };

        const callbacks = mockFormComponentCallbacks();

        const { cloudscapeWrapper } = cloudscapeRender(
            <KendraEdition knowledgeBaseData={mockKnowledgeBaseData} {...callbacks} />
        );
        expect(screen.getByTestId('kendra-edition')).toBeDefined();

        const select = cloudscapeWrapper.findSelect();
        select?.openDropdown();
        expect(select?.findDropdown().findOptions().length).toBe(2);
        expect(select?.findDropdown().findOptionByValue('enterprise')).toBeTruthy();
        expect(select?.findDropdown().findOptionByValue('developer')).toBeTruthy();

        cleanup();
    });
});
