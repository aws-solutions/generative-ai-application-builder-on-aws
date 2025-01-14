// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import AdditionalKendraOptions from '../AdditionalKendraOptions';
import { mockFormComponentCallbacks, cloudscapeRender } from '@/utils';
import { screen } from '@testing-library/react';

describe('AdditionalKendraOptions', () => {
    test('renders', () => {
        const mockKnowledgeBaseData = {
            kendraAdditionalQueryCapacity: 0,
            kendraAdditionalStorageCapacity: 0,
            kendraEdition: { value: 'developer', label: 'Developer' }
        };

        const callbacks = mockFormComponentCallbacks();

        cloudscapeRender(<AdditionalKendraOptions knowledgeBaseData={mockKnowledgeBaseData} {...callbacks} />);

        expect(screen.getByTestId('additional-kendra-options')).toBeDefined();
        expect(screen.getByTestId('kendra-edition')).toBeDefined();
        expect(screen.getByTestId('kendra-add-query-capacity')).toBeDefined();
        expect(screen.getByTestId('kendra-add-storage-capacity')).toBeDefined();
    });
});
