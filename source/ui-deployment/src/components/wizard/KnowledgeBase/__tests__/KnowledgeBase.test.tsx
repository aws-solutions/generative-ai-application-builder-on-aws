// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { mockFormComponentCallbacks, renderWithProvider } from '@/utils';
import { screen } from '@testing-library/react';
import KnowledgeBase from '../KnowledgeBase';
import { USECASE_TYPE_ROUTE } from '@/utils/constants';

describe('KnowledgeBase', () => {
    test('renders with rag not enabled', () => {
        const mockKnowledgeBaseData = {
            knowledgeBase: { knowledgeBaseType: { value: 'Kendra', label: 'Kendra' }, isRagRequired: false }
        };
        renderWithProvider(<KnowledgeBase info={mockKnowledgeBaseData} {...mockFormComponentCallbacks()} />, {
            route: USECASE_TYPE_ROUTE.TEXT
        });
        expect(screen.getByTestId('rag-required-dropdown')).toBeDefined();
        expect(() => {
            screen.getByTestId('select-knowledgebase-type-container');
        }).toThrow();
    });

    test('renders with rag enabled', () => {
        const mockKnowledgeBaseData = {
            knowledgeBase: {
                knowledgeBaseType: { value: 'Kendra', label: 'Kendra' },
                isRagRequired: true,
                existingKendraIndex: 'Yes',
                kendraIndexId: 'fake-id',
                kendraAdditionalQueryCapacity: 0,
                kendraAdditionalStorageCapacity: 0,
                kendraEdition: { label: 'developer', value: 'developer' },
                maxNumDocs: 2,
                inError: false,
                kendraIndexName: '',
                returnDocumentSource: false
            }
        };
        renderWithProvider(<KnowledgeBase info={mockKnowledgeBaseData} {...mockFormComponentCallbacks()} />, {
            route: USECASE_TYPE_ROUTE.TEXT
        });
        expect(screen.getByTestId('rag-required-dropdown')).toBeDefined();
        expect(screen.getByTestId('kendra-container')).toBeDefined();
        expect(screen.getByTestId('advanced-knowledgebase-config-container')).toBeDefined();
        expect(screen.getByTestId('select-knowledgebase-type-container')).toBeDefined();
    });
});
