// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import RetrieveDocumentCount from '../RetrieveDocumentCount';
import { mockFormComponentCallbacks, cloudscapeRender } from '@/utils';
import { screen } from '@testing-library/react';

describe('RetrieveDocumentCount', () => {
    afterEach(() => {
        jest.clearAllMocks();
    });

    test('renders with default value and handles changes', () => {
        const mockKnowledgeBaseData = {
            maxNumDocs: '2',
            knowledgeBaseType: { value: 'Kendra', label: 'Kendra' }
        };

        const callbacks = mockFormComponentCallbacks();
        const { cloudscapeWrapper } = cloudscapeRender(
            <RetrieveDocumentCount knowledgeBaseData={mockKnowledgeBaseData} {...callbacks} />
        );
        expect(screen.getByTestId('input-max-num-docs')).toBeDefined();
        expect(cloudscapeWrapper.findInput()).toBeDefined();

        const input = cloudscapeWrapper.findInput();
        input?.setInputValue('3');
        expect(callbacks.onChangeFn).toHaveBeenCalledWith({
            maxNumDocs: '3'
        });
    });

    test('renders with error', () => {
        const mockKnowledgeBaseData = {
            maxNumDocs: 2,
            knowledgeBaseType: { value: 'Kendra', label: 'Kendra' }
        };
        const callbacks = mockFormComponentCallbacks();
        const { cloudscapeWrapper } = cloudscapeRender(
            <RetrieveDocumentCount knowledgeBaseData={mockKnowledgeBaseData} {...callbacks} />
        );
        const input = cloudscapeWrapper.findInput();
        input?.setInputValue('3000');
        expect(callbacks.setNumFieldsInError).toHaveBeenCalled();
    });
});
