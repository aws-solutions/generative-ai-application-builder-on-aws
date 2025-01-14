// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import ReturnSourceDocuments from '../ReturnSourceDocuments';
import { mockFormComponentCallbacks, cloudscapeRender } from '@/utils';
import { screen } from '@testing-library/react';

describe('ReturnSourceDocuments', () => {
    afterEach(() => {
        jest.clearAllMocks();
    });

    test('renders', () => {
        const mockKnowledgeBaseData = {
            returnDocumentSource: true
        };

        const callbacks = mockFormComponentCallbacks();
        const { cloudscapeWrapper } = cloudscapeRender(
            <ReturnSourceDocuments knowledgeBaseData={mockKnowledgeBaseData} {...callbacks} />
        );

        const radioGroup = cloudscapeWrapper.findRadioGroup('[data-testid="display-document-source-radio-group"]');
        expect(screen.getByTestId('display-document-source-field')).toBeDefined();
        expect(radioGroup?.getElement()).toBeDefined();
        expect(radioGroup?.findInputByValue('Yes')?.getElement().checked).toBeTruthy();

        radioGroup?.findInputByValue('No')?.getElement().click();
        expect(callbacks.onChangeFn).toHaveBeenCalledWith({
            returnDocumentSource: false
        });
    });
});
