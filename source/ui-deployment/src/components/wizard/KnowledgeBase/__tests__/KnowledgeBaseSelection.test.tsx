// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { mockFormComponentCallbacks, renderWithProvider } from '@/utils';
import { screen } from '@testing-library/react';
import KnowledgeBaseSelection from '../KnowledgeBaseSelection';
import { KNOWLEDGE_BASE_TYPES } from '../../steps-config';
import { USECASE_TYPE_ROUTE } from '@/utils/constants';

describe('KnowledgeBaseSelection', () => {
    afterEach(() => {
        jest.clearAllMocks();
    });

    test('should render kendra knowledge base components', () => {
        const mockKnowledgeBaseData = {
            knowledgeBaseType: KNOWLEDGE_BASE_TYPES.find((kb) => kb.value === 'Kendra')
        };
        renderWithProvider(
            <KnowledgeBaseSelection {...mockFormComponentCallbacks()} knowledgeBaseData={mockKnowledgeBaseData} />,
            { route: USECASE_TYPE_ROUTE.TEXT }
        );
        expect(screen.getByTestId('kendra-container')).toBeDefined();
    });

    test('should render bedrock knowledge base components', () => {
        const mockKnowledgeBaseData = {
            knowledgeBaseType: KNOWLEDGE_BASE_TYPES.find((kb) => kb.value === 'Bedrock')
        };
        renderWithProvider(
            <KnowledgeBaseSelection {...mockFormComponentCallbacks()} knowledgeBaseData={mockKnowledgeBaseData} />,
            { route: USECASE_TYPE_ROUTE.TEXT }
        );
        expect(screen.getByTestId('bedrock-knowledgebase-container')).toBeDefined();
    });
});
