// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0
import KendraQueryCapacity from '../KendraQueryCapacity';
import { mockFormComponentCallbacks, cloudscapeRender } from '@/utils';
import { screen } from '@testing-library/react';

describe('KendraIndexId', () => {
    afterEach(() => {
        jest.clearAllMocks();
    });

    test('renders', () => {
        const mockKnowledgeBaseData = {
            kendraAdditionalQueryCapacity: 0
        };

        const callbacks = mockFormComponentCallbacks();

        const { cloudscapeWrapper } = cloudscapeRender(
            <KendraQueryCapacity knowledgeBaseData={mockKnowledgeBaseData} {...callbacks} />
        );

        expect(screen.getByTestId('kendra-add-query-capacity')).toBeDefined();

        expect(cloudscapeWrapper.findInput()).toBeDefined();

        const input = cloudscapeWrapper.findInput();
        input?.setInputValue('3');
        expect(callbacks.onChangeFn).toHaveBeenCalledWith({
            kendraAdditionalQueryCapacity: '3'
        });
    });
});
