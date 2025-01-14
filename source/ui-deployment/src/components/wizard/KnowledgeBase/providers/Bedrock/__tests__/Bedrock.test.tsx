// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { BedrockKnowledgeBase } from '../Bedrock';
import { mockFormComponentCallbacks, renderWithProvider } from '@/utils';
import { screen } from '@testing-library/react';

describe('Bedrock', () => {
    afterEach(() => {
        vi.clearAllMocks();
    });

    test('renders on state to show kendra config', () => {
        const mockKnowledgeBaseData = {
            bedrockKnowledgeBaseId: ''
        };
        renderWithProvider(
            <BedrockKnowledgeBase knowledgeBaseData={mockKnowledgeBaseData} {...mockFormComponentCallbacks()} />,
            {
                route: '/mockPage'
            }
        );
        expect(screen.getByTestId('bedrock-knowledgebase-container')).toBeDefined();
        expect(screen.getByTestId('input-bedrock-knowledge-base-id')).toBeDefined();
    });
});
