// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0
import KendraIndexName from '../KendraIndexName';
import { mockFormComponentCallbacks, cloudscapeRender } from '@/utils';
import { screen } from '@testing-library/react';

describe('KendraIndexId', () => {
    afterEach(() => {
        jest.clearAllMocks();
    });

    test('renders', () => {
        const mockKnowledgeBaseData = {
            kendraIndexName: ''
        };

        const callbacks = mockFormComponentCallbacks();

        const { cloudscapeWrapper } = cloudscapeRender(
            <KendraIndexName knowledgeBaseData={mockKnowledgeBaseData} {...callbacks} />
        );

        expect(screen.getByTestId('input-kendra-index-name')).toBeDefined();

        expect(cloudscapeWrapper.findInput()).toBeDefined();

        const input = cloudscapeWrapper.findInput();
        input?.setInputValue('fake-kendra-idx-name');
        expect(callbacks.onChangeFn).toHaveBeenCalledWith({
            kendraIndexName: 'fake-kendra-idx-name'
        });
    });
});
